import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/contacts?search=...&limit=50
 * List / search contacts
 */
export async function GET(req: NextRequest) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

  const supabase = createAdminClient();

  let query = supabase
    .from('contacts_with_client')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,primary_email.ilike.%${search}%,company_name.ilike.%${search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ contacts: data, count: data?.length ?? 0 });
}

/**
 * POST /api/contacts
 * Create a new contact
 * Body: { first_name, last_name, primary_email?, company_name?, position?, ... }
 */
export async function POST(req: NextRequest) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  const body = await req.json();

  if (!body.first_name || !body.last_name) {
    return NextResponse.json(
      { error: 'Povinná pole: first_name, last_name' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Check if contact with same email already exists
  if (body.primary_email) {
    const { data: existing } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, primary_email')
      .eq('primary_email', body.primary_email)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        {
          message: 'Kontakt s tímto emailem už existuje',
          existing_contact: existing[0],
          created: false,
        },
        { status: 200 }
      );
    }
  }

  const payload = {
    first_name: body.first_name,
    last_name: body.last_name,
    salutation: body.salutation || null,
    primary_email: body.primary_email || null,
    secondary_email: body.secondary_email || null,
    phone: body.phone || null,
    linkedin_url: body.linkedin_url || null,
    client_id: body.client_id || null,
    company_name: body.company_name || null,
    position: body.position || null,
    departments: body.departments || [],
    email_status: body.email_status || 'Aktivní',
    programs: body.programs || [],
    note: body.note || null,
  };

  const { data, error } = await supabase
    .from('contacts')
    .insert(payload)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ contact: data, created: true }, { status: 201 });
}
