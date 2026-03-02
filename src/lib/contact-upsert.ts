import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Find or create contact — NIKDY neduplikuje.
 * Hledá podle: primary_email → secondary_email → jméno+firma
 * Pokud existuje, aktualizuje chybějící pole a přidá štítky.
 */
export async function upsertContact(
  supabase: SupabaseClient,
  data: {
    first_name: string;
    last_name: string;
    primary_email?: string | null;
    secondary_email?: string | null;
    phone?: string | null;
    linkedin_url?: string | null;
    client_id?: string | null;
    company_name?: string | null;
    position?: string | null;
    departments?: string[];
    programs?: string[];
    email_status?: string;
    note?: string | null;
    salutation?: string | null;
  }
): Promise<{
  contact: Record<string, unknown>;
  created: boolean;
  updated: boolean;
}> {
  // ──── 1. Hledání existujícího kontaktu ────

  let existing: Record<string, unknown> | null = null;

  // Hledej podle primary emailu
  if (data.primary_email) {
    const { data: byEmail } = await supabase
      .from('contacts')
      .select('*')
      .or(`primary_email.eq.${data.primary_email},secondary_email.eq.${data.primary_email}`)
      .limit(1);
    if (byEmail && byEmail.length > 0) existing = byEmail[0];
  }

  // Hledej podle jména + firmy
  if (!existing && data.first_name && data.last_name) {
    const query = supabase
      .from('contacts')
      .select('*')
      .ilike('first_name', data.first_name.trim())
      .ilike('last_name', data.last_name.trim());

    if (data.company_name) {
      query.ilike('company_name', data.company_name.trim());
    }

    const { data: byName } = await query.limit(1);
    if (byName && byName.length > 0) existing = byName[0];
  }

  // ──── 2. Update existujícího ────
  if (existing) {
    const updates: Record<string, unknown> = {};

    // Doplň chybějící pole (nemaž existující)
    if (!existing.phone && data.phone) updates.phone = data.phone;
    if (!existing.position && data.position) updates.position = data.position;
    if (!existing.linkedin_url && data.linkedin_url) updates.linkedin_url = data.linkedin_url;
    if (!existing.client_id && data.client_id) updates.client_id = data.client_id;
    if (!existing.company_name && data.company_name) updates.company_name = data.company_name;
    if (!existing.salutation && data.salutation) updates.salutation = data.salutation;
    if (!existing.secondary_email && data.secondary_email) updates.secondary_email = data.secondary_email;

    // Přidej nové departments (merguj, neduplikuj)
    if (data.departments && data.departments.length > 0) {
      const currentDepts = (existing.departments as string[]) || [];
      const merged = [...new Set([...currentDepts, ...data.departments])];
      if (merged.length > currentDepts.length) updates.departments = merged;
    }

    // Přidej nové programs (merguj, neduplikuj)
    if (data.programs && data.programs.length > 0) {
      const currentProgs = (existing.programs as string[]) || [];
      const merged = [...new Set([...currentProgs, ...data.programs])];
      if (merged.length > currentProgs.length) updates.programs = merged;
    }

    // Přidej poznámku (append)
    if (data.note && data.note.trim()) {
      const currentNote = (existing.note as string) || '';
      if (!currentNote.includes(data.note.trim())) {
        updates.note = currentNote
          ? `${currentNote}\n\n---\n${data.note.trim()}`
          : data.note.trim();
      }
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      const { data: updated, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw new Error(`Chyba při aktualizaci kontaktu: ${error.message}`);
      return { contact: updated, created: false, updated: true };
    }

    return { contact: existing, created: false, updated: false };
  }

  // ──── 3. Vytvoř nový ────
  const payload = {
    first_name: data.first_name.trim(),
    last_name: data.last_name.trim(),
    salutation: data.salutation || null,
    primary_email: data.primary_email?.toLowerCase() || null,
    secondary_email: data.secondary_email?.toLowerCase() || null,
    phone: data.phone || null,
    linkedin_url: data.linkedin_url || null,
    client_id: data.client_id || null,
    company_name: data.company_name || null,
    position: data.position || null,
    departments: data.departments || [],
    programs: data.programs || [],
    email_status: data.email_status || 'Aktivní',
    note: data.note || null,
  };

  const { data: newContact, error } = await supabase
    .from('contacts')
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(`Chyba při vytváření kontaktu: ${error.message}`);
  return { contact: newContact, created: true, updated: false };
}

/**
 * Find or create client by name
 */
export async function upsertClient(
  supabase: SupabaseClient,
  name: string,
  extra?: { client_type?: string; employee_count?: string; note?: string }
): Promise<{ client: Record<string, unknown>; created: boolean }> {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error('Název klienta je povinný');

  const { data: existing } = await supabase
    .from('clients')
    .select('*')
    .ilike('name', trimmedName)
    .limit(1);

  if (existing && existing.length > 0) {
    return { client: existing[0], created: false };
  }

  const { data: newClient, error } = await supabase
    .from('clients')
    .insert({
      name: trimmedName,
      client_type: extra?.client_type || null,
      employee_count: extra?.employee_count || null,
      note: extra?.note || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Chyba při vytváření klienta: ${error.message}`);
  return { client: newClient, created: true };
}
