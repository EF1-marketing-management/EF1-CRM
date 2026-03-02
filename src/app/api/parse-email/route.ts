import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/parse-email
 * Parse email data and create/find contact + create deal
 *
 * Body options:
 * 
 * Option A — Structured (preferred):
 * {
 *   "from_name": "Jan Novák",
 *   "from_email": "jan.novak@firma.cz",
 *   "subject": "Poptávka školení pro tým",
 *   "body": "Dobrý den, chtěli bychom objednat školení...",
 *   "company_name": "Firma s.r.o."    // optional, extracted from email domain if missing
 * }
 *
 * Option B — Raw (simpler, we parse it):
 * {
 *   "raw_text": "From: Jan Novák <jan.novak@firma.cz>\nSubject: Poptávka školení\n\nDobrý den..."
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
  let companyName: string;

  // ──── Parse input ────
  if (body.raw_text) {
    const parsed = parseRawEmail(body.raw_text);
    fromName = parsed.fromName;
    fromEmail = parsed.fromEmail;
    subject = parsed.subject;
    emailBody = parsed.body;
    companyName = body.company_name || extractCompanyFromEmail(fromEmail);
  } else if (body.from_email) {
    fromName = body.from_name || '';
    fromEmail = body.from_email;
    subject = body.subject || 'Nový deal z emailu';
    emailBody = body.body || '';
    companyName = body.company_name || extractCompanyFromEmail(fromEmail);
  } else {
    return NextResponse.json(
      {
        error:
          'Zadejte buď "from_email" + "subject", nebo "raw_text" s celým emailem',
      },
      { status: 400 }
    );
  }

  // Split name
  const nameParts = splitName(fromName || fromEmail.split('@')[0]);

  const supabase = createAdminClient();
  const results: Record<string, unknown> = {};

  // ──── 1. Find or create Client ────
  let clientId: string | null = null;
  if (companyName) {
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id, name')
      .ilike('name', companyName.trim())
      .limit(1);

    if (existingClient && existingClient.length > 0) {
      clientId = existingClient[0].id;
      results.client = { ...existingClient[0], created: false };
    } else {
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({ name: companyName.trim() })
        .select()
        .single();

      if (clientError) {
        return NextResponse.json(
          { error: `Chyba při vytváření klienta: ${clientError.message}` },
          { status: 500 }
        );
      }
      clientId = newClient.id;
      results.client = { ...newClient, created: true };
    }
  }

  // ──── 2. Find or create Contact ────
  let contactId: string | null = null;
  if (fromEmail) {
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, primary_email')
      .eq('primary_email', fromEmail.toLowerCase())
      .limit(1);

    if (existingContact && existingContact.length > 0) {
      contactId = existingContact[0].id;
      results.contact = { ...existingContact[0], created: false };
    } else {
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          first_name: nameParts.firstName,
          last_name: nameParts.lastName,
          primary_email: fromEmail.toLowerCase(),
          client_id: clientId,
          company_name: companyName || null,
          email_status: 'Aktivní',
        })
        .select()
        .single();

      if (contactError) {
        return NextResponse.json(
          { error: `Chyba při vytváření kontaktu: ${contactError.message}` },
          { status: 500 }
        );
      }
      contactId = newContact.id;
      results.contact = { ...newContact, created: true };
    }
  }

  // ──── 3. Create Deal ────
  const dealName = buildDealName(companyName, subject);
  const inquiryType = detectInquiryType(subject + ' ' + emailBody);

  const noteLines = [
    `📧 Vytvořeno z emailu`,
    `Od: ${fromName} <${fromEmail}>`,
    `Předmět: ${subject}`,
    '',
    emailBody ? `--- Obsah emailu ---\n${emailBody.substring(0, 1000)}` : '',
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

  return NextResponse.json(
    {
      message: '✅ Email zpracován — vytvořen kontakt + deal',
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

function splitName(fullName: string): { firstName: string; lastName: string } {
  // Handle email-like names: "jan.novak" → "Jan Novak"
  const cleaned = fullName
    .replace(/[._-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const parts = cleaned.split(' ');

  if (parts.length === 0) return { firstName: 'Neznámý', lastName: 'Kontakt' };
  if (parts.length === 1)
    return {
      firstName: capitalize(parts[0]),
      lastName: '',
    };

  return {
    firstName: capitalize(parts[0]),
    lastName: parts
      .slice(1)
      .map(capitalize)
      .join(' '),
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function extractCompanyFromEmail(email: string): string {
  if (!email) return '';
  const domain = email.split('@')[1];
  if (!domain) return '';

  // Skip generic email providers
  const generic = [
    'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.cz',
    'outlook.com', 'hotmail.com', 'live.com',
    'seznam.cz', 'email.cz', 'centrum.cz', 'post.cz',
    'icloud.com', 'me.com', 'mac.com',
    'protonmail.com', 'proton.me',
  ];

  if (generic.includes(domain.toLowerCase())) return '';

  // Use domain without TLD as company name
  const parts = domain.split('.');
  return capitalize(parts[0]);
}

function buildDealName(company: string, subject: string): string {
  const cleanSubject = subject
    .replace(/^(Re|Fwd|Fw|Odp|Přep):\s*/gi, '')
    .trim();

  if (company && cleanSubject) {
    return `${company} | ${cleanSubject}`;
  }
  if (cleanSubject) return cleanSubject;
  if (company) return `${company} | Nová poptávka`;
  return 'Nový deal z emailu';
}

function detectInquiryType(text: string): string | null {
  const lower = text.toLowerCase();

  if (lower.includes('keynote') || lower.includes('přednášk'))
    return 'Přednáška / keynote';
  if (lower.includes('školení') || lower.includes('training'))
    return 'Školení';
  if (lower.includes('workshop')) return 'Workshop';
  if (lower.includes('program')) return 'Program';
  if (
    lower.includes('interní') ||
    lower.includes('masterclass') ||
    lower.includes('konzultac')
  )
    return 'Jiné (interní program apod.)';

  return null;
}
