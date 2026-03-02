/**
 * Migrační skript: Airtable CSV → Supabase
 * Spuštění: npx tsx scripts/migrate-from-airtable.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing env vars. Run from project root with dotenv.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// =============================================
// CSV Parser (handles quoted fields, commas inside quotes)
// =============================================
function parseCSV(content: string): Record<string, string>[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of content) {
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === '\n' && !inQuotes) {
      lines.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) lines.push(current);

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      // Trim header names (some have trailing spaces in Airtable export)
      row[header.trim()] = (values[idx] ?? '').trim();
    });
    rows.push(row);
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
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else if (char === '\r') {
      // skip carriage return
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// =============================================
// Department classification
// =============================================
function classifyDepartment(position: string): string[] {
  if (!position) return [];
  const pos = position.toLowerCase();
  const departments: string[] = [];

  if (/\b(hr|human resource|people|talent|recruiting|personalist|lidské zdroje|nábor|l&d|people\s*&?\s*culture)\b/i.test(pos)) {
    departments.push('HR');
  }
  if (/\b(ceo|cfo|coo|cto|cmo|chief|generální ředitel|finanční ředitel|managing director|ředitel|director)\b/i.test(pos)) {
    departments.push('C-level Manager');
  }
  if (/\b(founder|co-founder|co founder|owner|zakladatel|majitel|vlastník|spoluzakladatel)\b/i.test(pos)) {
    departments.push('Owner');
  }
  if (/\b(developer|software|engineer|programmer|devops|data|architect|vývojář|it manager|it director)\b/i.test(pos)) {
    departments.push('IT');
  }

  return departments;
}

// =============================================
// Map deal status from Airtable to our Kanban
// =============================================
function mapDealStatus(raw: string): string {
  if (!raw) return 'Nový';
  const s = raw.toLowerCase();
  if (s === 'deal') return 'Deal';
  if (s.includes('nevyšlo') || s.includes('nevy')) return 'Nevyšlo';
  if (s.includes('malý budget') || s.includes('maly budget')) return 'Malý budget';
  if (s.includes('bez odpovědi') || s.includes('without') || s.includes('nereaguje')) return 'Bez odpovědi';
  if (s.includes('jednáme') || s.includes('jedname')) return 'Jednáme';
  if (s.includes('nabídka') || s.includes('nabidka')) return 'Nabídka odeslaná';
  return raw; // Keep original if no match
}

// =============================================
// MAIN MIGRATION
// =============================================
async function migrate() {
  console.log('🚀 Starting migration from Airtable CSV...\n');

  // =============================================
  // 1. Load and parse CSVs
  // =============================================
  const contactsPath = resolve(__dirname, 'data/kontakty.csv');
  const dealsPath = resolve(__dirname, 'data/deals.csv');

  let contactsData: Record<string, string>[];
  try {
    contactsData = parseCSV(readFileSync(contactsPath, 'utf-8'));
    console.log(`📋 Loaded ${contactsData.length} contacts from CSV`);
  } catch {
    console.error(`❌ Cannot read ${contactsPath}`);
    process.exit(1);
  }

  let dealsData: Record<string, string>[] = [];
  try {
    dealsData = parseCSV(readFileSync(dealsPath, 'utf-8'));
    console.log(`📋 Loaded ${dealsData.length} deals from CSV`);
  } catch {
    console.log('⚠️  No deals CSV found, skipping deals import');
  }

  // =============================================
  // 2. Extract unique companies → create Clients
  // =============================================
  const companyNames = new Set<string>();
  contactsData.forEach((row) => {
    const company = row['Klient'] || row['Firma'] || '';
    if (company) companyNames.add(company);
  });
  // Also from deals
  dealsData.forEach((row) => {
    const company = row['Klient'] || '';
    if (company) companyNames.add(company);
  });

  console.log(`\n🏢 Creating ${companyNames.size} clients...`);
  const clientMap = new Map<string, string>(); // name → id
  let clientErrors = 0;

  // Batch insert clients (10 at a time)
  const companyArray = Array.from(companyNames);
  for (let i = 0; i < companyArray.length; i += 50) {
    const batch = companyArray.slice(i, i + 50).map((name) => ({ name }));
    const { data, error } = await supabase
      .from('clients')
      .insert(batch)
      .select('id, name');

    if (error) {
      console.error(`  ❌ Batch error: ${error.message}`);
      clientErrors++;
    } else if (data) {
      data.forEach((c) => clientMap.set(c.name, c.id));
    }
  }
  console.log(`  ✅ Created ${clientMap.size} clients (${clientErrors} errors)`);

  // =============================================
  // 3. Import Contacts
  // =============================================
  console.log(`\n👤 Importing ${contactsData.length} contacts...`);
  let contactsInserted = 0;
  let contactErrors = 0;
  const contactMap = new Map<string, string>(); // "Name - Company" → id

  // Process in batches of 50
  for (let i = 0; i < contactsData.length; i += 50) {
    const batch = contactsData.slice(i, i + 50);
    const records = [];

    for (const row of batch) {
      const firstName = row['Jméno'] ?? '';
      const lastName = row['Příjmení'] ?? '';
      if (!firstName && !lastName) continue;

      const companyName = row['Klient'] || row['Firma'] || '';
      const clientId = companyName ? clientMap.get(companyName) ?? null : null;
      const position = row['Pracovní pozice'] ?? '';

      // Parse departments - from CSV or classify from position
      const deptRaw = row['Oddělení'] ?? '';
      const departments = deptRaw
        ? deptRaw.split(',').map((d: string) => d.trim()).filter(Boolean)
        : classifyDepartment(position);

      // Parse programs
      const programsRaw = row['Programy'] ?? '';
      const programs = programsRaw
        ? programsRaw.split(',').map((p: string) => p.trim()).filter(Boolean)
        : [];

      const linkedinUrl = row['LI profil'] ?? '';
      const phone = row['Telefon'] ?? '';

      records.push({
        first_name: firstName,
        last_name: lastName,
        salutation: row['Oslovení'] || null,
        primary_email: row['Email'] || null,
        secondary_email: row['Sekundární email'] || null,
        phone: phone && phone !== '#ERROR!' ? phone : null,
        linkedin_url: linkedinUrl && linkedinUrl !== '-' && linkedinUrl !== '' ? linkedinUrl : null,
        client_id: clientId,
        company_name: companyName || null,
        position: position || null,
        departments,
        email_status: 'Aktivní',
        programs,
        note: null,
      });
    }

    if (records.length === 0) continue;

    const { data, error } = await supabase
      .from('contacts')
      .insert(records)
      .select('id, first_name, last_name, company_name');

    if (error) {
      console.error(`  ❌ Batch ${i}-${i + 50} error: ${error.message}`);
      contactErrors++;
    } else if (data) {
      contactsInserted += data.length;
      data.forEach((c) => {
        const key = `${c.first_name} ${c.last_name} - ${c.company_name ?? ''}`.trim();
        contactMap.set(key, c.id);
      });
    }

    // Progress
    if ((i + 50) % 200 === 0 || i + 50 >= contactsData.length) {
      console.log(`  ... ${Math.min(i + 50, contactsData.length)}/${contactsData.length}`);
    }
  }
  console.log(`  ✅ Inserted ${contactsInserted} contacts (${contactErrors} batch errors)`);

  // =============================================
  // 4. Import Deals
  // =============================================
  if (dealsData.length > 0) {
    console.log(`\n🤝 Importing ${dealsData.length} deals...`);
    let dealsInserted = 0;
    let dealErrors = 0;

    for (let i = 0; i < dealsData.length; i += 50) {
      const batch = dealsData.slice(i, i + 50);
      const records = [];

      for (const row of batch) {
        const name = row['Deal'] ?? '';
        if (!name) continue;

        const clientName = row['Klient'] ?? '';
        const clientId = clientName ? clientMap.get(clientName) ?? null : null;

        // Try to find contact by "Name - Company" key
        const contactKey = row['Kontaktní osoba'] ?? '';
        const contactId = contactKey ? contactMap.get(contactKey) ?? null : null;

        const rawStatus = row['Reakce / Výsledek'] ?? '';
        const status = mapDealStatus(rawStatus);

        const assignedTo = (row['Komu určeno / Nabídnuto pro realizaci'] ?? '')
          .split(',')
          .map((p: string) => p.trim())
          .filter(Boolean);

        records.push({
          name,
          client_id: clientId,
          contact_id: contactId,
          inquiry_type: row['Co poptávali'] || null,
          assigned_to: assignedTo,
          status,
          note: row['Poznámka / Detaily'] || null,
        });
      }

      if (records.length === 0) continue;

      const { error, data } = await supabase
        .from('deals')
        .insert(records)
        .select('id');

      if (error) {
        console.error(`  ❌ Deals batch error: ${error.message}`);
        dealErrors++;
      } else if (data) {
        dealsInserted += data.length;
      }
    }
    console.log(`  ✅ Inserted ${dealsInserted} deals (${dealErrors} batch errors)`);
  }

  // =============================================
  // Summary
  // =============================================
  console.log('\n' + '='.repeat(50));
  console.log('✅ Migration complete!');
  console.log(`   🏢 ${clientMap.size} clients`);
  console.log(`   👤 ${contactsInserted} contacts`);
  console.log(`   🤝 ${dealsData.length} deals processed`);
  console.log('='.repeat(50));
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
