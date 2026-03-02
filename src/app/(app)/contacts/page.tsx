import { createClient } from '@/lib/supabase/server';
import ContactsTable from './ContactsTable';
import type { ContactWithClient } from '@/lib/types';

interface PageProps {
  searchParams: Promise<{
    search?: string;
    department?: string;
    program?: string;
    email_status?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 50;

export default async function ContactsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const page = parseInt(params.page ?? '1', 10);
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from('contacts_with_client')
    .select('*', { count: 'exact' });

  // Search filter
  if (params.search) {
    const s = `%${params.search}%`;
    query = query.or(
      `first_name.ilike.${s},last_name.ilike.${s},primary_email.ilike.${s},company_name.ilike.${s},position.ilike.${s}`
    );
  }

  // Department filter
  if (params.department) {
    query = query.contains('departments', [params.department]);
  }

  // Program filter
  if (params.program) {
    query = query.contains('programs', [params.program]);
  }

  // Email status filter
  if (params.email_status) {
    query = query.eq('email_status', params.email_status);
  }

  const { data: contacts, count } = await query
    .order('last_name', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  // Get unique programs and departments for filter dropdowns
  const { data: allContacts } = await supabase
    .from('contacts')
    .select('programs, departments');

  const allPrograms = new Set<string>();
  const allDepartments = new Set<string>();
  allContacts?.forEach((c) => {
    c.programs?.forEach((p: string) => allPrograms.add(p));
    c.departments?.forEach((d: string) => allDepartments.add(d));
  });

  return (
    <ContactsTable
      contacts={(contacts as ContactWithClient[]) ?? []}
      totalCount={count ?? 0}
      currentPage={page}
      pageSize={PAGE_SIZE}
      filters={params}
      availablePrograms={Array.from(allPrograms).sort()}
      availableDepartments={Array.from(allDepartments).sort()}
    />
  );
}
