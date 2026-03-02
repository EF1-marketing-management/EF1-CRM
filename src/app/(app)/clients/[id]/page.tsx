import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ClientDetail from './ClientDetail';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();

  if (!client) return notFound();

  // Get contacts for this client
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('client_id', id)
    .order('last_name');

  // Get deals for this client
  const { data: deals } = await supabase
    .from('deals_with_relations')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false });

  // Get deals where this client is end_client
  const { data: agencyDeals } = await supabase
    .from('deals_with_relations')
    .select('*')
    .eq('end_client_id', id)
    .order('created_at', { ascending: false });

  return (
    <ClientDetail
      client={client}
      contacts={contacts ?? []}
      deals={deals ?? []}
      agencyDeals={agencyDeals ?? []}
    />
  );
}
