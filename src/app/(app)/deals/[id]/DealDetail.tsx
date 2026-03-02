'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Building2,
  User,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import DealForm from '../DealForm';
import { createClient } from '@/lib/supabase/client';
import type { DealWithRelations } from '@/lib/types';
import { DEAL_STATUSES } from '@/lib/types';

interface DealDetailProps {
  deal: DealWithRelations;
  clients: Array<{ id: string; name: string }>;
  contacts: Array<{ id: string; name: string; client_id: string | null }>;
}

export default function DealDetail({
  deal,
  clients,
  contacts,
}: DealDetailProps) {
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const handleDelete = async () => {
    const supabase = createClient();
    await supabase.from('deals').delete().eq('id', deal.id);
    router.push('/deals');
    router.refresh();
  };

  const handleStatusChange = async (newStatus: string) => {
    const supabase = createClient();
    await supabase
      .from('deals')
      .update({ status: newStatus })
      .eq('id', deal.id);
    router.refresh();
  };

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Zpět na deals
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{deal.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge
              variant={
                deal.status === 'Deal'
                  ? 'success'
                  : deal.status === 'Nevyšlo' || deal.status === 'Malý budget'
                  ? 'danger'
                  : deal.status === 'Jednáme' ||
                    deal.status === 'Nabídka odeslaná'
                  ? 'warning'
                  : 'info'
              }
            >
              {deal.status}
            </Badge>
            {deal.inquiry_type && (
              <Badge variant="muted">{deal.inquiry_type}</Badge>
            )}
            {deal.value && (
              <span className="text-sm font-semibold text-green-600">
                {deal.value.toLocaleString('cs-CZ')} Kč
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-background"
          >
            <Pencil className="h-4 w-4" />
            Upravit
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
            Smazat
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Status Change */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 font-semibold">Změnit stav</h2>
            <div className="flex flex-wrap gap-2">
              {DEAL_STATUSES.map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    deal.status === status
                      ? 'bg-accent text-white'
                      : 'bg-background text-muted hover:text-foreground'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 font-semibold">Detaily</h2>
            <div className="space-y-4">
              <div>
                <span className="text-xs font-medium uppercase text-muted">
                  Komu určeno / Nabídnuto
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {deal.assigned_to?.length > 0 ? (
                    deal.assigned_to.map((p) => (
                      <Badge key={p} variant="info">
                        {p}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted">—</span>
                  )}
                </div>
              </div>

              {deal.note && (
                <div>
                  <span className="text-xs font-medium uppercase text-muted">
                    Poznámka / Detaily
                  </span>
                  <p className="mt-1 text-sm whitespace-pre-wrap">
                    {deal.note}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Client */}
          {deal.client_id && deal.client_name && (
            <Link
              href={`/clients/${deal.client_id}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted">Klient</p>
                <p className="font-medium">{deal.client_name}</p>
              </div>
            </Link>
          )}

          {/* Contact */}
          {deal.contact_id && deal.contact_name && (
            <Link
              href={`/contacts/${deal.contact_id}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted">Kontaktní osoba</p>
                <p className="font-medium">{deal.contact_name}</p>
                {deal.contact_email && (
                  <p className="text-xs text-muted">{deal.contact_email}</p>
                )}
              </div>
            </Link>
          )}

          {/* End Client */}
          {deal.end_client_id && deal.end_client_name && (
            <Link
              href={`/clients/${deal.end_client_id}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted">Koncový klient</p>
                <p className="font-medium">{deal.end_client_name}</p>
              </div>
            </Link>
          )}

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold text-muted">Metadata</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Vytvořeno</span>
                <span>
                  {new Date(deal.created_at).toLocaleDateString('cs-CZ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Aktualizováno</span>
                <span>
                  {new Date(deal.updated_at).toLocaleDateString('cs-CZ')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title="Upravit deal"
        size="lg"
      >
        <DealForm
          deal={deal}
          clients={clients}
          contacts={contacts}
          onSuccess={() => {
            setShowEdit(false);
            router.refresh();
          }}
        />
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title="Smazat deal"
      >
        <p className="text-sm">
          Opravdu chcete smazat deal <strong>{deal.name}</strong>?
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={() => setShowDelete(false)}
            className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-background"
          >
            Zrušit
          </button>
          <button
            onClick={handleDelete}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Smazat
          </button>
        </div>
      </Modal>
    </div>
  );
}
