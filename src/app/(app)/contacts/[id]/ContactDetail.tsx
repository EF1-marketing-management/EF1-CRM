'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Mail,
  Phone,
  Linkedin,
  Building2,
  Pencil,
  Trash2,
  Briefcase,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import ContactForm from '../ContactForm';
import { createClient } from '@/lib/supabase/client';
import type { Contact, Client, DealWithRelations } from '@/lib/types';

interface ContactDetailProps {
  contact: Contact;
  client: Client | null;
  deals: DealWithRelations[];
}

export default function ContactDetail({
  contact,
  client,
  deals,
}: ContactDetailProps) {
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const handleDelete = async () => {
    const supabase = createClient();
    await supabase.from('contacts').delete().eq('id', contact.id);
    router.push('/contacts');
    router.refresh();
  };

  const fullName = `${contact.first_name} ${contact.last_name}`;

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Zpět na kontakty
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{fullName}</h1>
          {contact.salutation && (
            <p className="mt-0.5 text-sm text-muted">
              Oslovení: {contact.salutation}
            </p>
          )}
          {contact.position && (
            <p className="mt-1 text-sm text-muted">
              <Briefcase className="mr-1 inline h-3.5 w-3.5" />
              {contact.position}
              {(client || contact.company_name) && (
                <> · {client?.name ?? contact.company_name}</>
              )}
            </p>
          )}
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
        {/* Contact Info Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 font-semibold">Kontaktní údaje</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow
                icon={<Mail className="h-4 w-4" />}
                label="Primární email"
                value={contact.primary_email}
                isLink={contact.primary_email ? `mailto:${contact.primary_email}` : undefined}
              />
              <InfoRow
                icon={<Mail className="h-4 w-4" />}
                label="Sekundární email"
                value={contact.secondary_email}
                isLink={contact.secondary_email ? `mailto:${contact.secondary_email}` : undefined}
              />
              <InfoRow
                icon={<Phone className="h-4 w-4" />}
                label="Telefon"
                value={contact.phone}
                isLink={contact.phone ? `tel:${contact.phone}` : undefined}
              />
              <InfoRow
                icon={<Linkedin className="h-4 w-4" />}
                label="LinkedIn"
                value={
                  contact.linkedin_url && contact.linkedin_url !== '-'
                    ? 'Zobrazit profil'
                    : null
                }
                isLink={
                  contact.linkedin_url && contact.linkedin_url !== '-'
                    ? contact.linkedin_url
                    : undefined
                }
                external
              />
            </div>
          </div>

          {/* Details */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 font-semibold">Detaily</h2>
            <div className="space-y-3">
              <div>
                <span className="text-xs font-medium uppercase text-muted">
                  Oddělení
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {contact.departments?.length > 0 ? (
                    contact.departments.map((d) => (
                      <Badge key={d} variant="info">
                        {d}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted">—</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-xs font-medium uppercase text-muted">
                  Programy
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {contact.programs?.length > 0 ? (
                    contact.programs.map((p) => (
                      <Badge key={p} variant="muted">
                        {p}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted">—</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-xs font-medium uppercase text-muted">
                  Stav emailu
                </span>
                <div className="mt-1">
                  <Badge
                    variant={
                      contact.email_status === 'Aktivní'
                        ? 'success'
                        : contact.email_status === 'Bounce'
                        ? 'danger'
                        : 'warning'
                    }
                  >
                    {contact.email_status ?? '—'}
                  </Badge>
                </div>
              </div>
              {contact.note && (
                <div>
                  <span className="text-xs font-medium uppercase text-muted">
                    Poznámka
                  </span>
                  <p className="mt-1 text-sm whitespace-pre-wrap">
                    {contact.note}
                  </p>
                </div>
              )}
            </div>
          </div>

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
                        {deal.inquiry_type ?? '—'} ·{' '}
                        {deal.client_name ?? '—'}
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
        </div>

        {/* Right Sidebar - Client */}
        <div className="space-y-6">
          {client && (
            <Link
              href={`/clients/${client.id}`}
              className="block rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{client.name}</p>
                  <p className="text-xs text-muted">
                    {client.client_type ?? 'Klient'}
                  </p>
                </div>
              </div>
            </Link>
          )}

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold text-muted">Metadata</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Vytvořeno</span>
                <span>
                  {new Date(contact.created_at).toLocaleDateString('cs-CZ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Aktualizováno</span>
                <span>
                  {new Date(contact.updated_at).toLocaleDateString('cs-CZ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Ověřeno</span>
                <span>{contact.is_verified ? '✅ Ano' : '❌ Ne'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title="Upravit kontakt"
        size="lg"
      >
        <ContactForm
          contact={contact}
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
        title="Smazat kontakt"
      >
        <p className="text-sm">
          Opravdu chcete smazat kontakt{' '}
          <strong>{fullName}</strong>? Tato akce je nevratná.
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

function InfoRow({
  icon,
  label,
  value,
  isLink,
  external,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  isLink?: string;
  external?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted">{icon}</div>
      <div>
        <p className="text-xs text-muted">{label}</p>
        {value && isLink ? (
          <a
            href={isLink}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className="text-sm text-accent hover:underline"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm">{value ?? '—'}</p>
        )}
      </div>
    </div>
  );
}
