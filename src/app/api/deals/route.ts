import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/deals?search=...&status=Nový&limit=50
 * List / search deals
 */
export async function GET(req: NextRequest) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

  const supabase = createAdminClient();

  let query = supabase
    .from('deals_with_relations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,client_name.ilike.%${search}%,contact_name.ilike.%${search}%`
    );
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deals: data, count: data?.length ?? 0 });
}

/**
 * POST /api/deals
 * Create a new deal
 * Body: { name, client_id?, contact_id?, inquiry_type?, assigned_to?, status?, note?, value? }
 */
export async function POST(req: NextRequest) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  const body = await req.json();

  if (!body.name) {
    return NextResponse.json(
      { error: 'Povinné pole: name' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const payload = {
    name: body.name,
    client_id: body.client_id || null,
    contact_id: body.contact_id || null,
    inquiry_type: body.inquiry_type || null,
    assigned_to: body.assigned_to || [],
    status: body.status || 'Nový',
    note: body.note || null,
    end_client_id: body.end_client_id || null,
    value: body.value ? parseFloat(body.value) : null,
  };

  const { data, error } = await supabase
    .from('deals')
    .insert(payload)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deal: data, created: true }, { status: 201 });
}
