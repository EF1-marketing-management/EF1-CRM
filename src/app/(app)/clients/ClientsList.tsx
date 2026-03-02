'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  Handshake,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import ClientForm from './ClientForm';
import type { ClientWithStats } from '@/lib/types';
import { CLIENT_TYPES } from '@/lib/types';

interface ClientsListProps {
  clients: ClientWithStats[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  filters: Record<string, string | undefined>;
}

export default function ClientsList({
  clients,
  totalCount,
  currentPage,
  pageSize,
  filters,
}: ClientsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.search ?? '');

  const totalPages = Math.ceil(totalCount / pageSize);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    router.push(`/clients?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter('search', searchValue);
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/clients?${params.toString()}`);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Klienti</h1>
          <p className="mt-1 text-sm text-muted">
            {totalCount} klientů celkem
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          Nový klient
        </button>
      </div>

      {/* Search + Filters */}
      <div className="mt-5 flex gap-3">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Hledat podle názvu firmy..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-3 text-sm outline-none transition-colors focus:border-accent"
          />
        </form>
        <select
          value={filters.type ?? ''}
          onChange={(e) => updateFilter('type', e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none"
        >
          <option value="">Všechny typy</option>
          {CLIENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Grid */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {clients.map((client) => (
          <div
            key={client.id}
            onClick={() => router.push(`/clients/${client.id}`)}
            className="cursor-pointer rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{client.name}</h3>
                {client.client_type && (
                  <Badge variant="muted" className="mt-1">
                    {client.client_type}
                  </Badge>
                )}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-muted">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {client.contact_count} kontaktů
              </span>
              <span className="flex items-center gap-1">
                <Handshake className="h-3.5 w-3.5" />
                {client.deal_count} dealů
              </span>
              {client.hr_contact_count > 0 && (
                <Badge variant="info">
                  {client.hr_contact_count} HR
                </Badge>
              )}
            </div>
          </div>
        ))}
        {clients.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-muted">
            {filters.search || filters.type
              ? 'Žádní klienti neodpovídají filtrům'
              : 'Zatím žádní klienti. Přidejte prvního!'}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted">
            Strana {currentPage} z {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-card disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
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

      {/* New Client Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Nový klient"
      >
        <ClientForm
          onSuccess={() => {
            setShowForm(false);
            router.refresh();
          }}
        />
      </Modal>
    </div>
  );
}
