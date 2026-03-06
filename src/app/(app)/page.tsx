import { createClient } from '@/lib/supabase/server';
import { Users, Building2, Handshake, TrendingUp, Bell } from 'lucide-react';
import Link from 'next/link';
import { DEAL_PIPELINE_STATUSES } from '@/lib/types';

const ACTIVE_STATUSES = DEAL_PIPELINE_STATUSES.filter((s) => s !== 'Deal');

export default async function DashboardPage() {
  const supabase = await createClient();

  // Compute "today" and "+14 days" date strings for follow-up query
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const in14Days = new Date(today);
  in14Days.setDate(in14Days.getDate() + 14);
  const in14DaysStr = in14Days.toISOString().slice(0, 10);

  const [
    { count: contactCount },
    { count: clientCount },
    { count: dealCount },
    { count: activeDealCount },
    { data: recentDeals },
    { data: recentContacts },
    followupResult,
  ] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('deals').select('*', { count: 'exact', head: true }),
    supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .in('status', ACTIVE_STATUSES as unknown as string[]),
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
    // Follow-up: contacts with next_followup_at today or within 14 days
    supabase
      .from('contacts_with_client')
      .select('id, first_name, last_name, full_name, company_name, client_name, position, next_followup_at')
      .lte('next_followup_at', in14DaysStr)
      .gte('next_followup_at', todayStr)
      .order('next_followup_at', { ascending: true })
      .limit(10),
  ]);

  // followup contacts — gracefully handle missing column (null data)
  const followupContacts = (followupResult.data ?? []) as Array<{
    id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    company_name: string | null;
    client_name: string | null;
    position: string | null;
    next_followup_at: string;
  }>;

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
      value: activeDealCount ?? 0,
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

      {/* Follow-up widget */}
      {followupContacts.length > 0 && (
        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50">
          <div className="flex items-center justify-between border-b border-amber-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-600" />
              <h2 className="font-semibold text-amber-900">
                Follow-up – dalších 14 dní
              </h2>
              <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800">
                {followupContacts.length}
              </span>
            </div>
            <Link href="/contacts" className="text-sm text-amber-700 hover:underline">
              Zobrazit vše →
            </Link>
          </div>
          <div className="divide-y divide-amber-100">
            {followupContacts.map((contact) => {
              const followupDate = new Date(contact.next_followup_at);
              const isToday =
                followupDate.toISOString().slice(0, 10) === todayStr;
              const diffDays = Math.ceil(
                (followupDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
              );
              return (
                <Link
                  key={contact.id}
                  href={`/contacts/${contact.id}`}
                  className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-amber-100/50"
                >
                  <div>
                    <p className="text-sm font-medium text-amber-900">
                      {contact.full_name || `${contact.first_name} ${contact.last_name}`}
                    </p>
                    <p className="text-xs text-amber-700">
                      {contact.client_name ?? contact.company_name ?? '—'}
                      {contact.position ? ` · ${contact.position}` : ''}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      isToday
                        ? 'bg-red-100 text-red-700'
                        : diffDays <= 3
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {isToday
                      ? 'Dnes!'
                      : `za ${diffDays} ${diffDays === 1 ? 'den' : diffDays < 5 ? 'dny' : 'dní'}`}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

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
