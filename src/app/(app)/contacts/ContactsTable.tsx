'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Mail,
  Filter,
  X,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import ContactForm from './ContactForm';
import type { ContactWithClient } from '@/lib/types';

interface ContactsTableProps {
  contacts: ContactWithClient[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  filters: Record<string, string | undefined>;
  availablePrograms: string[];
  availableDepartments: string[];
}

export default function ContactsTable({
  contacts,
  totalCount,
  currentPage,
  pageSize,
  filters,
  availablePrograms,
  availableDepartments,
}: ContactsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.search ?? '');
  const [showFilters, setShowFilters] = useState(
    !!(filters.department || filters.program || filters.email_status)
  );

  const totalPages = Math.ceil(totalCount / pageSize);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    router.push(`/contacts?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter('search', searchValue);
  };

  const clearFilters = () => {
    setSearchValue('');
    router.push('/contacts');
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/contacts?${params.toString()}`);
  };

  const hasActiveFilters = !!(
    filters.search ||
    filters.department ||
    filters.program ||
    filters.email_status
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kontakty</h1>
          <p className="mt-1 text-sm text-muted">
            {totalCount} kontaktů celkem
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          Nový kontakt
        </button>
      </div>

      {/* Search + Filters */}
      <div className="mt-5 space-y-3">
        <div className="flex gap-3">
          <form onSubmit={handleSearch} className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Hledat podle jména, emailu, firmy, pozice..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-3 text-sm outline-none transition-colors focus:border-accent"
            />
          </form>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
              showFilters || hasActiveFilters
                ? 'border-accent bg-accent/5 text-accent'
                : 'border-border bg-card text-muted hover:text-foreground'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filtry
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs text-white">
                {[filters.department, filters.program, filters.email_status].filter(Boolean).length}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-muted transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Resetovat
            </button>
          )}
        </div>

        {showFilters && (
          <div className="flex gap-3 rounded-lg border border-border bg-card p-3">
            <select
              value={filters.department ?? ''}
              onChange={(e) => updateFilter('department', e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            >
              <option value="">Všechna oddělení</option>
              {availableDepartments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={filters.program ?? ''}
              onChange={(e) => updateFilter('program', e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            >
              <option value="">Všechny programy</option>
              {availablePrograms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <select
              value={filters.email_status ?? ''}
              onChange={(e) => updateFilter('email_status', e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            >
              <option value="">Všechny stavy emailu</option>
              <option value="Aktivní">Aktivní</option>
              <option value="Chybí - kontaktovat přes Li">Chybí - kontaktovat přes Li</option>
              <option value="Bounce">Bounce</option>
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background/50">
              <th className="px-4 py-3 text-left font-medium text-muted">Jméno</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Firma</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Pozice</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Oddělení</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Programy</th>
              <th className="w-10 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {contacts.map((contact) => (
              <tr
                key={contact.id}
                className="transition-colors hover:bg-background/50 cursor-pointer"
                onClick={() => router.push(`/contacts/${contact.id}`)}
              >
                <td className="px-4 py-3">
                  <div>
                    <span className="font-medium">
                      {contact.first_name} {contact.last_name}
                    </span>
                    {contact.salutation && (
                      <span className="ml-1.5 text-xs text-muted">
                        ({contact.salutation})
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {contact.client_id ? (
                    <Link
                      href={`/clients/${contact.client_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-accent hover:underline"
                    >
                      {contact.client_name}
                    </Link>
                  ) : (
                    <span className="text-muted">
                      {contact.company_name ?? '—'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">
                  {contact.position ?? '—'}
                </td>
                <td className="px-4 py-3">
                  {contact.primary_email ? (
                    <a
                      href={`mailto:${contact.primary_email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-accent hover:underline"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {contact.primary_email}
                    </a>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {contact.departments?.map((d) => (
                      <Badge key={d} variant="info">
                        {d}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {contact.programs?.slice(0, 2).map((p) => (
                      <Badge key={p} variant="muted">
                        {p}
                      </Badge>
                    ))}
                    {contact.programs?.length > 2 && (
                      <Badge variant="muted">
                        +{contact.programs.length - 2}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {contact.linkedin_url &&
                    contact.linkedin_url !== '-' && (
                      <a
                        href={contact.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted hover:text-accent"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted">
                  {hasActiveFilters
                    ? 'Žádné kontakty neodpovídají filtrům'
                    : 'Zatím žádné kontakty. Přidejte první!'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted">
            Zobrazeno {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, totalCount)} z {totalCount}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-card disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className={`h-8 w-8 rounded-lg text-sm transition-colors ${
                    currentPage === pageNum
                      ? 'bg-accent text-white'
                      : 'text-muted hover:bg-card'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-card disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* New Contact Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Nový kontakt"
        size="lg"
      >
        <ContactForm
          onSuccess={() => {
            setShowForm(false);
            router.refresh();
          }}
        />
      </Modal>
    </div>
  );
}
