import { createClient } from '@/lib/supabase/server';
import DealsView from './DealsView';
import type { DealWithRelations } from '@/lib/types';

export default async function DealsPage() {
  const supabase = await createClient();

  const { data: deals } = await supabase
    .from('deals_with_relations')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <DealsView
      deals={(deals as DealWithRelations[]) ?? []}
    />
  );
}
