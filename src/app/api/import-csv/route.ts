import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { upsertContact, upsertClient } from '@/lib/contact-upsert';

/**
 * POST /api/import-csv
 * Import kontaktů z CSV (JSON array).
 *
 * Body:
 * {
 *   "contacts": [
 *     {
 *       "first_name": "Jan",
 *       "last_name": "Novák",
 *       "email": "jan@firma.cz",
 *       "phone": "+420123456789",
 *       "company": "Firma s.r.o.",
 *       "position": "HR Manager",
 *       "department": "HR",
 *       "program": "FAIL - jaro 2026",
 *       "linkedin": "https://linkedin.com/in/jan-novak",
 *       "note": "Poznámka"
 *     }
 *   ],
 *   "default_program": "FAIL - jaro 2026",    // optional, přidá se ke všem
 *   "default_department": "HR",                 // optional
 *   "sync_to_airtable": true                    // optional
 * }
 *
 * Nebo CSV text přímo:
 * {
 *   "csv_text": "Jméno,Příjmení,Email,Telefon,Firma,Pozice\nJan,Novák,jan@firma.cz,...",
 *   "default_program": "FAIL - jaro 2026"
 * }
 */
export async function POST(req: NextRequest) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  const body = await req.json();
  const supabase = createAdminClient();

  let rows: ImportRow[];

  if (body.csv_text) {
    rows = parseCsvText(body.csv_text);
  } else if (body.contacts && Array.isArray(body.contacts)) {
    rows = body.contacts;
  } else {
    return NextResponse.json(
      { error: 'Zadejte "contacts" (JSON array) nebo "csv_text" (CSV string)' },
      { status: 400 }
    );
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Žádné kontakty k importu' }, { status: 400 });
  }

  const defaultProgram = body.default_program || null;
  const defaultDepartment = body.default_department || null;
  const syncToAirtable = body.sync_to_airtable === true;
  const airtableKey = process.env.AIRTABLE_API_KEY;
  const airtableBase = process.env.AIRTABLE_BASE_ID;
  const airtableTable = process.env.AIRTABLE_CONTACTS_TABLE || 'Contacts';

  const results = {
    total: rows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [] as string[],
    airtable_synced: 0,
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      if (!row.first_name && !row.last_name && !row.email) {
        results.skipped++;
        continue;
      }

      // ──── Resolve Client ────
      let clientId: string | null = null;
      if (row.company) {
        try {
          const { client } = await upsertClient(supabase, row.company);
          clientId = client.id as string;
        } catch {
          // Client creation failed, continue without client
        }
      }

      // ──── Upsert Contact ────
      const programs: string[] = [];
      if (defaultProgram) programs.push(defaultProgram);
      if (row.program) programs.push(row.program);

      const departments: string[] = [];
      if (defaultDepartment) departments.push(defaultDepartment);
      if (row.department) departments.push(row.department);

      const contactResult = await upsertContact(supabase, {
        first_name: row.first_name || 'Neznámé',
        last_name: row.last_name || 'Jméno',
        primary_email: row.email || null,
        phone: row.phone || null,
        linkedin_url: row.linkedin || null,
        client_id: clientId,
        company_name: row.company || null,
        position: row.position || null,
        departments: departments.length > 0 ? departments : [],
        programs: programs.length > 0 ? programs : [],
        email_status: 'Aktivní',
        note: row.note || null,
      });

      if (contactResult.created) {
        results.created++;
      } else if (contactResult.updated) {
        results.updated++;
      } else {
        results.skipped++;
      }

      // ──── Airtable sync ────
      if (syncToAirtable && contactResult.created && airtableKey && airtableBase) {
        try {
          await fetch(
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
                      'Jméno': row.first_name || '',
                      'Příjmení': row.last_name || '',
                      'Email': row.email || '',
                      'Telefon': row.phone || '',
                      'Firma': row.company || '',
                      'Pozice': row.position || '',
                    },
                  },
                ],
              }),
            }
          );
          results.airtable_synced++;
        } catch {
          // Airtable sync failed, continue
        }
      }
    } catch (err) {
      results.errors.push(`Řádek ${i + 1}: ${(err as Error).message}`);
    }
  }

  return NextResponse.json(
    {
      message: `✅ Import hotov: ${results.created} vytvořeno, ${results.updated} aktualizováno, ${results.skipped} přeskočeno`,
      ...results,
    },
    { status: 200 }
  );
}

// ──── CSV Parser ────

interface ImportRow {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  department?: string;
  program?: string;
  linkedin?: string;
  note?: string;
}

function parseCsvText(csvText: string): ImportRow[] {
  const lines = csvText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map(normalizeHeader);

  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h && values[idx]) row[h] = values[idx].trim();
    });

    rows.push({
      first_name: row.first_name || row.name?.split(' ')[0] || '',
      last_name: row.last_name || row.name?.split(' ').slice(1).join(' ') || '',
      email: row.email || row.primary_email || '',
      phone: row.phone || row.telefon || '',
      company: row.company || row.firma || row.company_name || '',
      position: row.position || row.pozice || '',
      department: row.department || row.oddeleni || '',
      program: row.program || '',
      linkedin: row.linkedin || row.linkedin_url || '',
      note: row.note || row.poznamka || '',
    });
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === ',' || char === ';') && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function normalizeHeader(h: string): string {
  const mapping: Record<string, string> = {
    'jméno': 'first_name',
    'jmeno': 'first_name',
    'first_name': 'first_name',
    'křestní': 'first_name',
    'krestni': 'first_name',
    'name': 'name',
    'celé jméno': 'name',
    'příjmení': 'last_name',
    'prijmeni': 'last_name',
    'last_name': 'last_name',
    'email': 'email',
    'e-mail': 'email',
    'primary_email': 'email',
    'telefon': 'phone',
    'phone': 'phone',
    'tel': 'phone',
    'firma': 'company',
    'company': 'company',
    'společnost': 'company',
    'company_name': 'company',
    'pozice': 'position',
    'position': 'position',
    'role': 'position',
    'funkce': 'position',
    'oddělení': 'department',
    'oddeleni': 'department',
    'department': 'department',
    'program': 'program',
    'linkedin': 'linkedin',
    'linkedin_url': 'linkedin',
    'poznámka': 'note',
    'poznamka': 'note',
    'note': 'note',
    'notes': 'note',
  };

  const cleaned = h.toLowerCase().replace(/['"]/g, '').trim();
  return mapping[cleaned] || cleaned;
}
