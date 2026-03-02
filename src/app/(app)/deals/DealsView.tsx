'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, List, LayoutGrid } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';
import DealForm from './DealForm';
import KanbanBoard from './KanbanBoard';
import type { DealWithRelations } from '@/lib/types';
import { DEAL_PIPELINE_STATUSES, DEAL_CLOSED_STATUSES, DEAL_STATUS_COLORS } from '@/lib/types';
import Badge from '@/components/ui/Badge';

interface DealsViewProps {
  deals: DealWithRelations[];
}

export default function DealsView({ deals }: DealsViewProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [filterAssigned, setFilterAssigned] = useState<string>('');

  // Lazy-loaded form data
  const [formClients, setFormClients] = useState<Array<{ id: string; name: string }>>([]);
  const [formContacts, setFormContacts] = useState<Array<{ id: string; name: string; client_id: string | null }>>([]);
  const [formDataLoaded, setFormDataLoaded] = useState(false);

  const loadFormData = useCallback(async () => {
    if (formDataLoaded) return;
    const supabase = createClient();

    const [{ data: clients }, { data: contacts }] = await Promise.all([
      supabase.from('clients').select('id, name').order('name'),
      supabase.from('contacts').select('id, first_name, last_name, client_id').order('last_name'),
    ]);

    setFormClients(clients ?? []);
    setFormContacts(
      contacts?.map((c) => ({
        id: c.id,
        name: `${c.first_name} ${c.last_name}`,
        client_id: c.client_id,
      })) ?? []
    );
    setFormDataLoaded(true);
  }, [formDataLoaded]);

  const handleOpenForm = async () => {
    setShowForm(true);
    await loadFormData();
  };

  const handleStatusChange = async (dealId: string, newStatus: string) => {
    const supabase = createClient();
    await supabase
      .from('deals')
      .update({ status: newStatus })
      .eq('id', dealId);
    router.refresh();
  };

  // Filter deals
  const filteredDeals = filterAssigned
    ? deals.filter((d) => d.assigned_to?.includes(filterAssigned))
    : deals;

  // Get unique assigned people
  const assignedPeople = Array.from(
    new Set(deals.flatMap((d) => d.assigned_to ?? []).filter(Boolean))
  ).sort();

  // Group deals into pipeline and closed
  const pipelineColumns = DEAL_PIPELINE_STATUSES.map((status) => ({
    status,
    deals: filteredDeals.filter((d) => d.status === status),
  }));

  const closedColumns = DEAL_CLOSED_STATUSES.map((status) => ({
    status,
    deals: filteredDeals.filter((d) => d.status === status),
  }));

  // Count active (pipeline) deals
  const activeDealCount = pipelineColumns.reduce(
    (sum, col) => sum + col.deals.length,
    0
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Deals</h1>
          <p className="mt-1 text-sm text-muted">
            {activeDealCount} aktivních · {filteredDeals.length} celkem
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filter by assigned */}
          <select
            value={filterAssigned}
            onChange={(e) => setFilterAssigned(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="">Všichni</option>
            {assignedPeople.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* View toggle */}
          <div className="flex rounded-lg border border-border">
            <button
              onClick={() => setView('kanban')}
              className={`rounded-l-lg p-2 ${
                view === 'kanban'
                  ? 'bg-accent text-white'
                  : 'text-muted hover:text-foreground'
              }`}
              title="Kanban"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`rounded-r-lg p-2 ${
                view === 'list'
                  ? 'bg-accent text-white'
                  : 'text-muted hover:text-foreground'
              }`}
              title="Seznam"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleOpenForm}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" />
            Nový deal
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6">
        {view === 'kanban' ? (
          <KanbanBoard
            pipelineColumns={pipelineColumns}
            closedColumns={closedColumns}
            onStatusChange={handleStatusChange}
            onDealClick={(id) => router.push(`/deals/${id}`)}
          />
        ) : (
          <DealsListView
            deals={filteredDeals}
            onDealClick={(id) => router.push(`/deals/${id}`)}
          />
        )}
      </div>

      {/* New Deal Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Nový deal"
        size="lg"
      >
        {formDataLoaded ? (
          <DealForm
            clients={formClients}
            contacts={formContacts}
            onSuccess={() => {
              setShowForm(false);
              router.refresh();
            }}
          />
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <span className="ml-3 text-sm text-muted">Načítám data...</span>
          </div>
        )}
      </Modal>
    </div>
  );
}

// Simple list/table view for deals
function DealsListView({
  deals,
  onDealClick,
}: {
  deals: DealWithRelations[];
  onDealClick: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted">
            <th className="px-4 py-3">Deal</th>
            <th className="px-4 py-3">Klient</th>
            <th className="px-4 py-3">Typ</th>
            <th className="px-4 py-3">Stav</th>
            <th className="px-4 py-3">Přiřazeno</th>
            <th className="px-4 py-3 text-right">Hodnota</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {deals.map((deal) => (
            <tr
              key={deal.id}
              onClick={() => onDealClick(deal.id)}
              className="cursor-pointer transition-colors hover:bg-background"
            >
              <td className="px-4 py-3 font-medium">{deal.name}</td>
              <td className="px-4 py-3 text-muted">
                {deal.client_name ?? '—'}
              </td>
              <td className="px-4 py-3">
                {deal.inquiry_type ? (
                  <Badge variant="muted">{deal.inquiry_type}</Badge>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    DEAL_STATUS_COLORS[deal.status] ?? 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {deal.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  {deal.assigned_to?.length ? (
                    deal.assigned_to.map((person) => (
                      <span
                        key={person}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent"
                        title={person}
                      >
                        {person
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                {deal.value
                  ? `${deal.value.toLocaleString('cs-CZ')} Kč`
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {deals.length === 0 && (
        <p className="py-8 text-center text-sm text-muted">
          Žádné deals neodpovídají filtru
        </p>
      )}
    </div>
  );
}
