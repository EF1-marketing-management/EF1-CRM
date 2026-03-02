import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/clients?search=...&limit=50
 * List / search clients
 */
export async function GET(req: NextRequest) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

  const supabase = createAdminClient();

  let query = supabase
    .from('clients')
    .select('*')
    .order('name')
    .limit(limit);

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ clients: data, count: data?.length ?? 0 });
}

/**
 * POST /api/clients
 * Create a new client, or find existing by name
 * Body: { name, client_type?, employee_count?, note? }
 * Query: ?find_or_create=true  → returns existing if name matches
 */
export async function POST(req: NextRequest) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  const body = await req.json();
  const findOrCreate =
    new URL(req.url).searchParams.get('find_or_create') === 'true';

  if (!body.name) {
    return NextResponse.json(
      { error: 'Povinné pole: name' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Check for existing client with same name
  if (findOrCreate) {
    const { data: existing } = await supabase
      .from('clients')
      .select('*')
      .ilike('name', body.name.trim())
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({
        client: existing[0],
        created: false,
        message: 'Klient s tímto názvem už existuje',
      });
    }
  }

  const payload = {
    name: body.name.trim(),
    client_type: body.client_type || null,
    employee_count: body.employee_count || null,
    note: body.note || null,
  };

  const { data, error } = await supabase
    .from('clients')
    .insert(payload)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ client: data, created: true }, { status: 201 });
}
