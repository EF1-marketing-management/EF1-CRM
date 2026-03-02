'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Mail,
  Linkedin,
  Users,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import ClientForm from '../ClientForm';
import { createClient } from '@/lib/supabase/client';
import type { Client, Contact, DealWithRelations } from '@/lib/types';

interface ClientDetailProps {
  client: Client;
  contacts: Contact[];
  deals: DealWithRelations[];
  agencyDeals: DealWithRelations[];
}

export default function ClientDetail({
  client,
  contacts,
  deals,
  agencyDeals,
}: ClientDetailProps) {
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const handleDelete = async () => {
    const supabase = createClient();
    await supabase.from('clients').delete().eq('id', client.id);
    router.push('/clients');
    router.refresh();
  };

  const hrContacts = contacts.filter((c) =>
    c.departments?.includes('HR')
  );

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Zpět na klienty
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            {client.client_type && (
              <Badge variant="info">{client.client_type}</Badge>
            )}
            {client.employee_count && (
              <Badge variant="muted">{client.employee_count} zaměstnanců</Badge>
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
          {/* Contacts */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-semibold">
                <Users className="mr-2 inline h-4 w-4" />
                Kontakty ({contacts.length})
              </h2>
            </div>
            {contacts.length > 0 ? (
              <div className="divide-y divide-border">
                {contacts.map((contact) => (
                  <Link
                    key={contact.id}
                    href={`/contacts/${contact.id}`}
                    className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-background"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {contact.first_name} {contact.last_name}
                      </p>
                      <p className="text-xs text-muted">
                        {contact.position ?? '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {contact.departments?.map((d) => (
                          <Badge key={d} variant="info">
                            {d}
                          </Badge>
                        ))}
                      </div>
                      {contact.primary_email && (
                        <Mail className="h-3.5 w-3.5 text-muted" />
                      )}
                      {contact.linkedin_url &&
                        contact.linkedin_url !== '-' && (
                          <Linkedin className="h-3.5 w-3.5 text-muted" />
                        )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-muted">
                Žádné kontakty
              </p>
            )}
          </div>

          {/* HR Contacts (if any) */}
          {hrContacts.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/50">
              <div className="border-b border-blue-200 px-5 py-4">
                <h2 className="font-semibold text-blue-800">
                  HR Kontakty ({hrContacts.length})
                </h2>
              </div>
              <div className="divide-y divide-blue-200">
                {hrContacts.map((contact) => (
                  <Link
                    key={contact.id}
                    href={`/contacts/${contact.id}`}
                    className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-blue-100/50"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {contact.first_name} {contact.last_name}
                      </p>
                      <p className="text-xs text-muted">
                        {contact.position ?? '—'}
                      </p>
                    </div>
                    <span className="text-xs text-muted">
                      {contact.primary_email}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Deals */}
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-semibold">Deals ({deals.length})</h2>
            </div>
            {deals.length > 0 ? (
              <div className="divide-y divide-border">
                {deals.map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/deals/${deal.id}`}
                    className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-background"
                  >
                    <div>
                      <p className="text-sm font-medium">{deal.name}</p>
                      <p className="text-xs text-muted">
                        {deal.contact_name ?? '—'} · {deal.inquiry_type ?? '—'}
                      </p>
                    </div>
                    <Badge
                      variant={
                        deal.status === 'Deal'
                          ? 'success'
                          : deal.status === 'Nevyšlo' ||
                            deal.status === 'Malý budget'
                          ? 'danger'
                          : 'info'
                      }
                    >
                      {deal.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-muted">
                Žádné deals
              </p>
            )}
          </div>

          {/* Agency deals */}
          {agencyDeals.length > 0 && (
            <div className="rounded-xl border border-border bg-card">
              <div className="border-b border-border px-5 py-4">
                <h2 className="font-semibold">
                  Deals přes agenturu ({agencyDeals.length})
                </h2>
              </div>
              <div className="divide-y divide-border">
                {agencyDeals.map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/deals/${deal.id}`}
                    className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-background"
                  >
                    <div>
                      <p className="text-sm font-medium">{deal.name}</p>
                      <p className="text-xs text-muted">
                        Přes: {deal.client_name ?? '—'}
                      </p>
                    </div>
                    <Badge
                      variant={deal.status === 'Deal' ? 'success' : 'info'}
                    >
                      {deal.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {client.note && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-2 text-sm font-semibold text-muted">
                Poznámka
              </h3>
              <p className="text-sm whitespace-pre-wrap">{client.note}</p>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold text-muted">Metadata</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Vytvořeno</span>
                <span>
                  {new Date(client.created_at).toLocaleDateString('cs-CZ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Aktualizováno</span>
                <span>
                  {new Date(client.updated_at).toLocaleDateString('cs-CZ')}
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
        title="Upravit klienta"
      >
        <ClientForm
          client={client}
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
        title="Smazat klienta"
      >
        <p className="text-sm">
          Opravdu chcete smazat klienta{' '}
          <strong>{client.name}</strong>?
          {contacts.length > 0 && (
            <span className="mt-2 block text-amber-600">
              ⚠️ Tento klient má {contacts.length} kontaktů, které budou
              odpojeny.
            </span>
          )}
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
