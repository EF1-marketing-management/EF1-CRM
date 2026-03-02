import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ContactDetail from './ContactDetail';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .single();

  if (!contact) return notFound();

  // Get client info if linked
  let client = null;
  if (contact.client_id) {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('id', contact.client_id)
      .single();
    client = data;
  }

  // Get deals for this contact
  const { data: deals } = await supabase
    .from('deals_with_relations')
    .select('*')
    .eq('contact_id', id)
    .order('created_at', { ascending: false });

  return (
    <ContactDetail
      contact={contact}
      client={client}
      deals={deals ?? []}
    />
  );
}
