import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates API key from Authorization header.
 * Accepts: "Bearer <API_KEY>" or just "<API_KEY>"
 * Returns null if valid, or a NextResponse 401 error.
 */
export function validateApiKey(req: NextRequest): NextResponse | null {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const expectedKey = process.env.CRM_API_KEY;

  if (!expectedKey) {
    return NextResponse.json(
      { error: 'API key not configured on server' },
      { status: 500 }
    );
  }

  if (!token || token !== expectedKey) {
    return NextResponse.json(
      { error: 'Neplatný API klíč. Použijte header: Authorization: Bearer <CRM_API_KEY>' },
      { status: 401 }
    );
  }

  return null; // valid
}
