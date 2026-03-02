import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Users, Building2, Handshake, Search } from 'lucide-react';
import Badge from '@/components/ui/Badge';

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams;

  if (!q) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Search className="h-12 w-12 text-muted" />
        <p className="mt-4 text-muted">Zadejte hledaný výraz</p>
      </div>
    );
  }

  const supabase = await createClient();
  const searchTerm = `%${q}%`;

  const [
    { data: contacts },
    { data: clients },
    { data: deals },
  ] = await Promise.all([
    supabase
      .from('contacts_with_client')
      .select('*')
      .or(
        `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},primary_email.ilike.${searchTerm},company_name.ilike.${searchTerm}`
      )
      .limit(20),
    supabase
      .from('clients')
      .select('*')
      .ilike('name', searchTerm)
      .limit(20),
    supabase
      .from('deals_with_relations')
      .select('*')
      .or(
        `name.ilike.${searchTerm},note.ilike.${searchTerm},client_name.ilike.${searchTerm}`
      )
      .limit(20),
  ]);

  const totalResults =
    (contacts?.length ?? 0) + (clients?.length ?? 0) + (deals?.length ?? 0);

  return (
    <div>
      <h1 className="text-2xl font-bold">
        Výsledky hledání: &quot;{q}&quot;
      </h1>
      <p className="mt-1 text-sm text-muted">
        {totalResults} výsledků
      </p>

      <div className="mt-6 space-y-6">
        {/* Contacts */}
        {contacts && contacts.length > 0 && (
          <div>
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Users className="h-4 w-4" />
              Kontakty ({contacts.length})
            </h2>
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {contacts.map((contact) => (
                <Link
                  key={contact.id}
                  href={`/contacts/${contact.id}`}
                  className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-background"
                >
                  <div>
                    <p className="text-sm font-medium">{contact.full_name}</p>
                    <p className="text-xs text-muted">
                      {contact.client_name ?? contact.company_name ?? '—'} ·{' '}
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

        {/* Clients */}
        {clients && clients.length > 0 && (
          <div>
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Building2 className="h-4 w-4" />
              Klienti ({clients.length})
            </h2>
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {clients.map((client) => (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-background"
                >
                  <p className="text-sm font-medium">{client.name}</p>
                  {client.client_type && (
                    <Badge variant="muted">{client.client_type}</Badge>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Deals */}
        {deals && deals.length > 0 && (
          <div>
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Handshake className="h-4 w-4" />
              Deals ({deals.length})
            </h2>
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {deals.map((deal) => (
                <Link
                  key={deal.id}
                  href={`/deals/${deal.id}`}
                  className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-background"
                >
                  <div>
                    <p className="text-sm font-medium">{deal.name}</p>
                    <p className="text-xs text-muted">
                      {deal.client_name ?? '—'} · {deal.inquiry_type ?? '—'}
                    </p>
                  </div>
                  <Badge
                    variant={
                      deal.status === 'Deal'
                        ? 'success'
                        : deal.status === 'Nevyšlo'
                        ? 'danger'
                        : 'info'
                    }
                  >
                    {deal.status}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}

        {totalResults === 0 && (
          <div className="py-12 text-center">
            <Search className="mx-auto h-12 w-12 text-muted" />
            <p className="mt-4 text-muted">
              Pro &quot;{q}&quot; nebyly nalezeny žádné výsledky
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
