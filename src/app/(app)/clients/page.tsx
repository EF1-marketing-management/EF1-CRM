import { createClient } from '@/lib/supabase/server';
import ClientsList from './ClientsList';
import type { ClientWithStats } from '@/lib/types';

interface PageProps {
  searchParams: Promise<{
    search?: string;
    type?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 50;

export default async function ClientsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const page = parseInt(params.page ?? '1', 10);
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from('clients_with_stats')
    .select('*', { count: 'exact' });

  if (params.search) {
    query = query.ilike('name', `%${params.search}%`);
  }

  if (params.type) {
    query = query.eq('client_type', params.type);
  }

  const { data: clients, count } = await query
    .order('name', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  return (
    <ClientsList
      clients={(clients as ClientWithStats[]) ?? []}
      totalCount={count ?? 0}
      currentPage={page}
      pageSize={PAGE_SIZE}
      filters={params}
    />
  );
}
