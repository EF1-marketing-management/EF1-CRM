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
  Download,
  CheckSquare,
  Tag,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import ContactForm from './ContactForm';
import type { ContactWithClient } from '@/lib/types';
import { PROGRAMS, DEPARTMENTS } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

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

  // Bulk select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkProgram, setShowBulkProgram] = useState(false);
  const [bulkProgram, setBulkProgram] = useState('');
  const [showBulkDept, setShowBulkDept] = useState(false);
  const [bulkDept, setBulkDept] = useState('');

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

  // ── Bulk select logic ──
  const allVisibleSelected =
    contacts.length > 0 && contacts.every((c) => selectedIds.has(c.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Bulk add program ──
  const handleBulkAddProgram = async () => {
    if (!bulkProgram || selectedIds.size === 0) return;
    setBulkLoading(true);
    const supabase = createClient();
    const selectedContacts = contacts.filter((c) => selectedIds.has(c.id));
    const updates = selectedContacts.map((c) => {
      const programs = c.programs ?? [];
      if (programs.includes(bulkProgram)) return null;
      return supabase
        .from('contacts')
        .update({ programs: [...programs, bulkProgram] })
        .eq('id', c.id);
    });
    await Promise.all(updates.filter(Boolean));
    setBulkLoading(false);
    setShowBulkProgram(false);
    setBulkProgram('');
    setSelectedIds(new Set());
    router.refresh();
  };

  // ── Bulk add department ──
  const handleBulkAddDept = async () => {
    if (!bulkDept || selectedIds.size === 0) return;
    setBulkLoading(true);
    const supabase = createClient();
    const selectedContacts = contacts.filter((c) => selectedIds.has(c.id));
    const updates = selectedContacts.map((c) => {
      const departments = c.departments ?? [];
      if (departments.includes(bulkDept)) return null;
      return supabase
        .from('contacts')
        .update({ departments: [...departments, bulkDept] })
        .eq('id', c.id);
    });
    await Promise.all(updates.filter(Boolean));
    setBulkLoading(false);
    setShowBulkDept(false);
    setBulkDept('');
    setSelectedIds(new Set());
    router.refresh();
  };

  // ── Export CSV ──
  const handleExportCSV = async () => {
    const supabase = createClient();

    let query = supabase
      .from('contacts_with_client')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5000);

    if (filters.search) {
      query = query.or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,primary_email.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%,position.ilike.%${filters.search}%`
      );
    }
    if (filters.department) {
      query = query.contains('departments', [filters.department]);
    }
    if (filters.program) {
      query = query.contains('programs', [filters.program]);
    }
    if (filters.email_status) {
      query = query.eq('email_status', filters.email_status);
    }

    const { data } = await query;
    if (!data || data.length === 0) return;

    const headers = [
      'Jméno', 'Příjmení', 'Email', 'Telefon', 'Firma', 'Pozice',
      'Oddělení', 'Programy', 'Stav emailu', 'LinkedIn', 'Poznámka',
      'Follow-up datum', 'Vytvořen',
    ];

    const rows = data.map((c) => [
      c.first_name ?? '',
      c.last_name ?? '',
      c.primary_email ?? '',
      c.phone ?? '',
      c.client_name ?? c.company_name ?? '',
      c.position ?? '',
      (c.departments ?? []).join('; '),
      (c.programs ?? []).join('; '),
      c.email_status ?? '',
      c.linkedin_url ?? '',
      (c.note ?? '').replace(/\n/g, ' '),
      c.next_followup_at ?? '',
      c.created_at ? new Date(c.created_at).toLocaleDateString('cs-CZ') : '',
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kontakty-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            title="Exportovat do CSV"
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" />
            Nový kontakt
          </button>
        </div>
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

      {/* Bulk action toolbar */}
      {selectedIds.size > 0 && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-2.5">
          <CheckSquare className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium text-accent">
            Vybráno {selectedIds.size} kontaktů
          </span>
          <div className="ml-2 flex items-center gap-2">
            {/* Add program */}
            {showBulkProgram ? (
              <div className="flex items-center gap-2">
                <select
                  value={bulkProgram}
                  onChange={(e) => setBulkProgram(e.target.value)}
                  className="rounded border border-border bg-background px-2 py-1 text-xs outline-none"
                >
                  <option value="">— vyberte program —</option>
                  {PROGRAMS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <button
                  onClick={handleBulkAddProgram}
                  disabled={!bulkProgram || bulkLoading}
                  className="rounded bg-accent px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                >
                  {bulkLoading ? 'Ukládám...' : 'Přidat'}
                </button>
                <button
                  onClick={() => { setShowBulkProgram(false); setBulkProgram(''); }}
                  className="rounded px-2 py-1 text-xs text-muted hover:text-foreground"
                >
                  Zrušit
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setShowBulkProgram(true); setShowBulkDept(false); }}
                className="flex items-center gap-1.5 rounded border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-background"
              >
                <Tag className="h-3.5 w-3.5" />
                Přidat program
              </button>
            )}

            {/* Add department */}
            {showBulkDept ? (
              <div className="flex items-center gap-2">
                <select
                  value={bulkDept}
                  onChange={(e) => setBulkDept(e.target.value)}
                  className="rounded border border-border bg-background px-2 py-1 text-xs outline-none"
                >
                  <option value="">— vyberte oddělení —</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <button
                  onClick={handleBulkAddDept}
                  disabled={!bulkDept || bulkLoading}
                  className="rounded bg-accent px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                >
                  {bulkLoading ? 'Ukládám...' : 'Přidat'}
                </button>
                <button
                  onClick={() => { setShowBulkDept(false); setBulkDept(''); }}
                  className="rounded px-2 py-1 text-xs text-muted hover:text-foreground"
                >
                  Zrušit
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setShowBulkDept(true); setShowBulkProgram(false); }}
                className="flex items-center gap-1.5 rounded border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-background"
              >
                <Tag className="h-3.5 w-3.5" />
                Přidat oddělení
              </button>
            )}
          </div>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-muted hover:text-foreground"
          >
            Zrušit výběr
          </button>
        </div>
      )}

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background/50">
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 cursor-pointer rounded border-border accent-accent"
                  title="Vybrat vše"
                />
              </th>
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
                className={`transition-colors hover:bg-background/50 cursor-pointer ${
                  selectedIds.has(contact.id) ? 'bg-accent/5' : ''
                }`}
                onClick={() => router.push(`/contacts/${contact.id}`)}
              >
                <td
                  className="px-4 py-3"
                  onClick={(e) => { e.stopPropagation(); toggleSelectOne(contact.id); }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(contact.id)}
                    onChange={() => toggleSelectOne(contact.id)}
                    className="h-4 w-4 cursor-pointer rounded border-border accent-accent"
                  />
                </td>
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
                <td colSpan={8} className="px-4 py-12 text-center text-muted">
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
