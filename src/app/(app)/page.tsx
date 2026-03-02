import { createClient } from '@/lib/supabase/server';
import { Users, Building2, Handshake, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: contactCount },
    { count: clientCount },
    { count: dealCount },
    { data: recentDeals },
    { data: recentContacts },
  ] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('deals').select('*', { count: 'exact', head: true }),
    supabase
      .from('deals_with_relations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('contacts_with_client')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const stats = [
    {
      name: 'Kontakty',
      value: contactCount ?? 0,
      icon: Users,
      href: '/contacts',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      name: 'Klienti',
      value: clientCount ?? 0,
      icon: Building2,
      href: '/clients',
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      name: 'Deals',
      value: dealCount ?? 0,
      icon: Handshake,
      href: '/deals',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      name: 'Aktivní deals',
      value:
        recentDeals?.filter(
          (d) => !['Deal', 'Nevyšlo', 'Malý budget', 'Bez odpovědi'].includes(d.status)
        ).length ?? 0,
      icon: TrendingUp,
      href: '/deals',
      color: 'bg-amber-50 text-amber-600',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-sm text-muted">Přehled CRM systému</p>

      {/* Stats Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">{stat.name}</p>
                <p className="mt-1 text-3xl font-bold">{stat.value}</p>
              </div>
              <div className={`rounded-lg p-3 ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Deals */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-semibold">Poslední deals</h2>
            <Link
              href="/deals"
              className="text-sm text-accent hover:underline"
            >
              Zobrazit vše →
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentDeals?.map((deal) => (
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
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    deal.status === 'Deal'
                      ? 'bg-green-100 text-green-700'
                      : deal.status === 'Nevyšlo' || deal.status === 'Malý budget'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {deal.status}
                </span>
              </Link>
            )) ?? (
              <p className="px-5 py-8 text-center text-sm text-muted">
                Zatím žádné deals
              </p>
            )}
          </div>
        </div>

        {/* Recent Contacts */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-semibold">Poslední kontakty</h2>
            <Link
              href="/contacts"
              className="text-sm text-accent hover:underline"
            >
              Zobrazit vše →
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentContacts?.map((contact) => (
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
                  {contact.primary_email ?? '—'}
                </span>
              </Link>
            )) ?? (
              <p className="px-5 py-8 text-center text-sm text-muted">
                Zatím žádné kontakty
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
