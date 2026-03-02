import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { upsertContact, upsertClient } from '@/lib/contact-upsert';
import { extractCompanyFromEmail } from '@/lib/email-signature-parser';

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
 * Create or update contact (s deduplikací).
 *
 * Body: {
 *   first_name, last_name, primary_email?,
 *   company_name? / company?, position?,
 *   phone?, linkedin_url?, departments?, programs?,
 *   note?
 * }
 *
 * Automaticky:
 * - Najde nebo vytvoří klienta z company_name
 * - Kontakt s existujícím emailem = aktualizace (ne duplikát)
 * - Přidá programy / oddělení bez mazání stávajících
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

  // ──── Resolve Client ────
  let clientId: string | null = body.client_id || null;
  const companyName = body.company_name || body.company || '';

  if (!clientId && companyName) {
    try {
      const { client } = await upsertClient(supabase, companyName);
      clientId = client.id as string;
    } catch {
      // Client creation failed, continue without
    }
  }

  // Try to extract company from email if not provided
  if (!clientId && !companyName && body.primary_email) {
    const fromDomain = extractCompanyFromEmail(body.primary_email);
    if (fromDomain) {
      try {
        const { client } = await upsertClient(supabase, fromDomain);
        clientId = client.id as string;
      } catch {
        // Ignore
      }
    }
  }

  // ──── Upsert Contact ────
  try {
    const result = await upsertContact(supabase, {
      first_name: body.first_name,
      last_name: body.last_name,
      primary_email: body.primary_email || null,
      secondary_email: body.secondary_email || null,
      phone: body.phone || null,
      linkedin_url: body.linkedin_url || null,
      client_id: clientId,
      company_name: companyName || null,
      position: body.position || null,
      departments: body.departments || [],
      programs: body.programs || [],
      email_status: body.email_status || 'Aktivní',
      salutation: body.salutation || null,
      note: body.note || null,
    });

    const status = result.created ? 201 : 200;
    return NextResponse.json(
      {
        contact: result.contact,
        created: result.created,
        updated: result.updated,
        message: result.created
          ? 'Kontakt vytvořen'
          : result.updated
            ? 'Existující kontakt aktualizován'
            : 'Kontakt již existuje (beze změn)',
      },
      { status }
    );
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
