import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseEmailFull, detectInquiryType } from '@/lib/email-signature-parser';
import { upsertContact, upsertClient } from '@/lib/contact-upsert';

/**
 * POST /api/parse-email
 * Parse email data → find/create client + find/create contact + create deal
 * Nikdy neduplikuje kontakty — aktualizuje existující.
 * Extrahuje maximum info z podpisu emailu.
 *
 * Body:
 * {
 *   "from_name": "Jan Novák",
 *   "from_email": "jan.novak@firma.cz",
 *   "subject": "Poptávka školení",
 *   "body": "Dobrý den...\n--\nJan Novák | HR Manager\nFirma s.r.o.\n+420 123 456 789",
 *   "company_name": "Firma s.r.o."  // optional
 * }
 *
 * Nebo raw_text:
 * {
 *   "raw_text": "From: Jan Novák <jan@firma.cz>\nSubject: ...\n\nDobrý den..."
 * }
 */
export async function POST(req: NextRequest) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  const body = await req.json();
  let fromName: string;
  let fromEmail: string;
  let subject: string;
  let emailBody: string;
  let explicitCompany: string;

  // ──── Parse input ────
  if (body.raw_text) {
    const parsed = parseRawEmail(body.raw_text);
    fromName = parsed.fromName;
    fromEmail = parsed.fromEmail;
    subject = parsed.subject;
    emailBody = parsed.body;
    explicitCompany = body.company_name || '';
  } else if (body.from_email) {
    fromName = body.from_name || '';
    fromEmail = body.from_email;
    subject = body.subject || 'Nový deal z emailu';
    emailBody = body.body || '';
    explicitCompany = body.company_name || '';
  } else {
    return NextResponse.json(
      { error: 'Zadejte buď "from_email" + "subject", nebo "raw_text"' },
      { status: 400 }
    );
  }

  // ──── Smart parsing (včetně detekce přeposlaných emailů) ────
  const parsed = parseEmailFull(fromName, fromEmail, emailBody, subject);
  const companyName =
    explicitCompany ||
    parsed.signature.company_name ||
    parsed.companyFromDomain;

  const supabase = createAdminClient();
  const results: Record<string, unknown> = {};

  // ──── 1. Find or create Client ────
  let clientId: string | null = null;
  if (companyName) {
    try {
      const clientResult = await upsertClient(supabase, companyName);
      clientId = clientResult.client.id as string;
      results.client = { ...clientResult.client, created: clientResult.created };
    } catch (err) {
      return NextResponse.json(
        { error: (err as Error).message },
        { status: 500 }
      );
    }
  }

  // ──── 2. Find or create Contact (s deduplikací) ────
  let contactId: string | null = null;
  try {
    const contactResult = await upsertContact(supabase, {
      first_name: parsed.firstName,
      last_name: parsed.lastName,
      primary_email: parsed.email,
      phone: parsed.signature.phone || null,
      linkedin_url: parsed.signature.linkedin_url || null,
      client_id: clientId,
      company_name: companyName || null,
      position: parsed.signature.position || null,
      email_status: 'Aktivní',
    });
    contactId = contactResult.contact.id as string;
    results.contact = {
      ...contactResult.contact,
      created: contactResult.created,
      updated: contactResult.updated,
    };
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }

  // ──── 3. Create Deal ────
  // Pro přeposlaný email použijeme skutečný předmět (bez "Fwd:")
  const effectiveSubject = parsed.isForwarded
    ? subject.replace(/^(fwd?|přep|fw):\s*/i, '').trim()
    : subject;

  const dealName = buildDealName(companyName, effectiveSubject);
  const inquiryType = detectInquiryType(effectiveSubject + ' ' + emailBody);

  const noteLines = [
    `📧 Vytvořeno z emailu`,
    parsed.isForwarded
      ? `Přeposláno přes: ${fromName || fromEmail} <${fromEmail}>`
      : '',
    `Od: ${parsed.firstName} ${parsed.lastName} <${parsed.email}>`,
    `Předmět: ${effectiveSubject}`,
    parsed.signature.position ? `Pozice: ${parsed.signature.position}` : '',
    parsed.signature.phone ? `Telefon: ${parsed.signature.phone}` : '',
    parsed.signature.linkedin_url ? `LinkedIn: ${parsed.signature.linkedin_url}` : '',
    '',
    emailBody ? `--- Obsah emailu ---\n${emailBody.substring(0, 1500)}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const { data: newDeal, error: dealError } = await supabase
    .from('deals')
    .insert({
      name: dealName,
      client_id: clientId,
      contact_id: contactId,
      inquiry_type: inquiryType,
      status: 'Nový',
      note: noteLines,
      assigned_to: [],
    })
    .select()
    .single();

  if (dealError) {
    return NextResponse.json(
      { error: `Chyba při vytváření dealu: ${dealError.message}` },
      { status: 500 }
    );
  }

  results.deal = { ...newDeal, created: true };

  // ──── 4. Airtable sync (pokud je nakonfigurovaný) ────
  const airtableResult = await syncToAirtable(results);
  if (airtableResult) results.airtable_sync = airtableResult;

  return NextResponse.json(
    {
      message: '✅ Email zpracován',
      ...results,
    },
    { status: 201 }
  );
}

// ──── Helpers ────

function parseRawEmail(raw: string) {
  const lines = raw.split('\n');
  let fromName = '';
  let fromEmail = '';
  let subject = '';
  let bodyStartIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') {
      bodyStartIndex = i + 1;
      break;
    }

    const fromMatch = line.match(
      /^From:\s*(?:"?([^"<]*)"?\s*)?<?([^\s>]+@[^\s>]+)>?/i
    );
    if (fromMatch) {
      fromName = (fromMatch[1] || '').trim();
      fromEmail = (fromMatch[2] || '').trim().toLowerCase();
    }

    const subjectMatch = line.match(/^Subject:\s*(.+)/i);
    if (subjectMatch) {
      subject = subjectMatch[1].trim();
    }
  }

  const body = lines.slice(bodyStartIndex).join('\n').trim();
  return { fromName, fromEmail, subject, body };
}

function buildDealName(company: string, subject: string): string {
  const cleanSubject = subject
    .replace(/^(Re|Fwd|Fw|Odp|Přep):\s*/gi, '')
    .trim();

  if (company && cleanSubject) return `${company} | ${cleanSubject}`;
  if (cleanSubject) return cleanSubject;
  if (company) return `${company} | Nová poptávka`;
  return 'Nový deal z emailu';
}

/**
 * Sync nového kontaktu do Airtable (pokud jsou env vars nastavené)
 */
async function syncToAirtable(
  results: Record<string, unknown>
): Promise<string | null> {
  const airtableKey = process.env.AIRTABLE_API_KEY;
  const airtableBase = process.env.AIRTABLE_BASE_ID;
  const airtableTable = process.env.AIRTABLE_CONTACTS_TABLE || 'Contacts';

  if (!airtableKey || !airtableBase) return null;

  const contact = results.contact as Record<string, unknown>;
  if (!contact || !contact.created) return 'skipped (existing contact)';

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${airtableBase}/${encodeURIComponent(airtableTable)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${airtableKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [
            {
              fields: {
                'Jméno': contact.first_name,
                'Příjmení': contact.last_name,
                'Email': contact.primary_email,
                'Telefon': contact.phone || '',
                'Firma': contact.company_name || '',
                'Pozice': contact.position || '',
              },
            },
          ],
        }),
      }
    );

    if (response.ok) return 'synced';
    return `error: ${response.status}`;
  } catch {
    return 'error: network';
  }
}
