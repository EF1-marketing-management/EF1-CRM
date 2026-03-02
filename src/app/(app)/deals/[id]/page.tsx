import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import DealDetail from './DealDetail';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DealDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: deal } = await supabase
    .from('deals_with_relations')
    .select('*')
    .eq('id', id)
    .single();

  if (!deal) return notFound();

  // Get clients and contacts for editing
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .order('name');

  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, client_id')
    .order('last_name');

  return (
    <DealDetail
      deal={deal}
      clients={clients ?? []}
      contacts={
        contacts?.map((c) => ({
          id: c.id,
          name: `${c.first_name} ${c.last_name}`,
          client_id: c.client_id,
        })) ?? []
      }
    />
  );
}
