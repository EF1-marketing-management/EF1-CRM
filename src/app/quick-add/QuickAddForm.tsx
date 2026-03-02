'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { INQUIRY_TYPES, ASSIGNED_PEOPLE } from '@/lib/types';
import { CheckCircle2, Plus, Mail, Handshake, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type Mode = 'contact' | 'deal' | 'both' | 'email';

export default function QuickAddForm() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>(
    []
  );

  // Contact fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [position, setPosition] = useState('');

  // Deal fields
  const [dealName, setDealName] = useState('');
  const [clientId, setClientId] = useState('');
  const [inquiryType, setInquiryType] = useState('');
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [dealNote, setDealNote] = useState('');

  // Email parsing fields
  const [emailFrom, setEmailFrom] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  useEffect(() => {
    const fetchClients = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      if (data) setClients(data);
    };
    fetchClients();
  }, []);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setCompanyName('');
    setPosition('');
    setDealName('');
    setClientId('');
    setInquiryType('');
    setAssignedTo([]);
    setDealNote('');
    setEmailFrom('');
    setEmailSubject('');
    setEmailBody('');
    setError('');
  };

  const handleSubmitContact = async () => {
    if (!firstName || !lastName) {
      setError('Jméno a příjmení jsou povinné');
      return;
    }

    const supabase = createClient();

    // Find or create client if company name provided
    let resolvedClientId = clientId || null;
    if (!resolvedClientId && companyName) {
      const { data: existingClients } = await supabase
        .from('clients')
        .select('id')
        .ilike('name', companyName.trim())
        .limit(1);

      if (existingClients && existingClients.length > 0) {
        resolvedClientId = existingClients[0].id;
      } else {
        const { data: newClient } = await supabase
          .from('clients')
          .insert({ name: companyName.trim() })
          .select('id')
          .single();
        if (newClient) resolvedClientId = newClient.id;
      }
    }

    const { error: insertError } = await supabase.from('contacts').insert({
      first_name: firstName,
      last_name: lastName,
      primary_email: email || null,
      phone: phone || null,
      company_name: companyName || null,
      position: position || null,
      client_id: resolvedClientId,
      email_status: 'Aktivní',
    });

    if (insertError) throw new Error(insertError.message);
    return `Kontakt ${firstName} ${lastName} vytvořen`;
  };

  const handleSubmitDeal = async () => {
    if (!dealName) {
      setError('Název dealu je povinný');
      return;
    }

    const supabase = createClient();

    const { error: insertError } = await supabase.from('deals').insert({
      name: dealName,
      client_id: clientId || null,
      inquiry_type: inquiryType || null,
      assigned_to: assignedTo,
      status: 'Nový',
      note: dealNote || null,
    });

    if (insertError) throw new Error(insertError.message);
    return `Deal "${dealName}" vytvořen`;
  };

  const handleSubmitBoth = async () => {
    if (!firstName || !lastName) {
      setError('Jméno a příjmení kontaktu jsou povinné');
      return;
    }

    const supabase = createClient();

    // Find or create client
    let resolvedClientId = clientId || null;
    if (!resolvedClientId && companyName) {
      const { data: existingClients } = await supabase
        .from('clients')
        .select('id')
        .ilike('name', companyName.trim())
        .limit(1);

      if (existingClients && existingClients.length > 0) {
        resolvedClientId = existingClients[0].id;
      } else {
        const { data: newClient } = await supabase
          .from('clients')
          .insert({ name: companyName.trim() })
          .select('id')
          .single();
        if (newClient) resolvedClientId = newClient.id;
      }
    }

    // Create contact
    const { data: newContact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        first_name: firstName,
        last_name: lastName,
        primary_email: email || null,
        phone: phone || null,
        company_name: companyName || null,
        position: position || null,
        client_id: resolvedClientId,
        email_status: 'Aktivní',
      })
      .select('id')
      .single();

    if (contactError) throw new Error(contactError.message);

    // Create deal linked to contact
    const finalDealName =
      dealName || `${companyName || firstName + ' ' + lastName} | Nová poptávka`;
    const { error: dealError } = await supabase.from('deals').insert({
      name: finalDealName,
      client_id: resolvedClientId,
      contact_id: newContact?.id || null,
      inquiry_type: inquiryType || null,
      assigned_to: assignedTo,
      status: 'Nový',
      note: dealNote || null,
    });

    if (dealError) throw new Error(dealError.message);
    return `Kontakt ${firstName} ${lastName} + deal "${finalDealName}" vytvořeny`;
  };

  const handleSubmitEmail = async () => {
    if (!emailFrom) {
      setError('Email odesílatele je povinný');
      return;
    }

    const supabase = createClient();

    // Parse from field: "Jan Novák <jan@firma.cz>" or just "jan@firma.cz"
    let parsedName = '';
    let parsedEmail = emailFrom;

    const emailMatch = emailFrom.match(
      /^(?:"?([^"<]*)"?\s*)?<?([^\s>]+@[^\s>]+)>?$/
    );
    if (emailMatch) {
      parsedName = (emailMatch[1] || '').trim();
      parsedEmail = (emailMatch[2] || emailFrom).trim().toLowerCase();
    }

    // Split name
    const nameParts = parsedName
      ? parsedName.split(/\s+/)
      : parsedEmail.split('@')[0].replace(/[._-]/g, ' ').split(/\s+/);
    const fName =
      nameParts[0]?.charAt(0).toUpperCase() + nameParts[0]?.slice(1) || '';
    const lName =
      nameParts
        .slice(1)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ') || '';

    // Extract company from email domain
    const domain = parsedEmail.split('@')[1] || '';
    const genericDomains = [
      'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
      'seznam.cz', 'email.cz', 'centrum.cz', 'icloud.com',
    ];
    const autoCompany = genericDomains.includes(domain)
      ? ''
      : domain.split('.')[0].charAt(0).toUpperCase() +
        domain.split('.')[0].slice(1);

    // Find or create client
    let resolvedClientId: string | null = null;
    if (autoCompany) {
      const { data: existingClients } = await supabase
        .from('clients')
        .select('id')
        .ilike('name', autoCompany)
        .limit(1);

      if (existingClients && existingClients.length > 0) {
        resolvedClientId = existingClients[0].id;
      } else {
        const { data: newClient } = await supabase
          .from('clients')
          .insert({ name: autoCompany })
          .select('id')
          .single();
        if (newClient) resolvedClientId = newClient.id;
      }
    }

    // Find or create contact
    let contactId: string | null = null;
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('primary_email', parsedEmail)
      .limit(1);

    if (existingContact && existingContact.length > 0) {
      contactId = existingContact[0].id;
    } else {
      const { data: newContact } = await supabase
        .from('contacts')
        .insert({
          first_name: fName,
          last_name: lName,
          primary_email: parsedEmail,
          client_id: resolvedClientId,
          company_name: autoCompany || null,
          email_status: 'Aktivní',
        })
        .select('id')
        .single();
      if (newContact) contactId = newContact.id;
    }

    // Create deal
    const subject = emailSubject || 'Nová poptávka';
    const finalDealName = autoCompany
      ? `${autoCompany} | ${subject}`
      : subject;

    const note = [
      '📧 Vytvořeno z emailu',
      `Od: ${parsedName || fName} <${parsedEmail}>`,
      `Předmět: ${emailSubject}`,
      emailBody ? `\n--- Obsah ---\n${emailBody.substring(0, 1000)}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const { error: dealError } = await supabase.from('deals').insert({
      name: finalDealName,
      client_id: resolvedClientId,
      contact_id: contactId,
      status: 'Nový',
      note,
    });

    if (dealError) throw new Error(dealError.message);
    return `Z emailu vytvořen kontakt + deal "${finalDealName}"`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      let msg: string | undefined;
      switch (mode) {
        case 'contact':
          msg = await handleSubmitContact();
          break;
        case 'deal':
          msg = await handleSubmitDeal();
          break;
        case 'both':
          msg = await handleSubmitBoth();
          break;
        case 'email':
          msg = await handleSubmitEmail();
          break;
      }
      if (msg) {
        setSuccess(msg);
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba');
    } finally {
      setLoading(false);
    }
  };

  // ──── Mode Selection ────
  if (!mode) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setMode('both')}
          className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-accent hover:shadow-sm"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <Plus className="h-5 w-5 text-accent" />
          </div>
          <div>
            <div className="font-semibold">Kontakt + Deal</div>
            <div className="text-sm text-muted">
              Vytvořit kontakt i deal najednou (nejčastější)
            </div>
          </div>
        </button>

        <button
          onClick={() => setMode('email')}
          className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-accent hover:shadow-sm"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <Mail className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <div className="font-semibold">Z emailu</div>
            <div className="text-sm text-muted">
              Vložte údaje z emailu — automaticky se vytvoří kontakt + deal
            </div>
          </div>
        </button>

        <button
          onClick={() => setMode('contact')}
          className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-accent hover:shadow-sm"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
            <Plus className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <div className="font-semibold">Jen kontakt</div>
            <div className="text-sm text-muted">
              Přidat nový kontakt bez dealu
            </div>
          </div>
        </button>

        <button
          onClick={() => setMode('deal')}
          className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-accent hover:shadow-sm"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
            <Handshake className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <div className="font-semibold">Jen deal</div>
            <div className="text-sm text-muted">
              Přidat nový deal k existujícímu klientovi
            </div>
          </div>
        </button>

        <div className="pt-4 text-center">
          <Link
            href="/"
            className="text-sm text-muted hover:text-accent transition-colors"
          >
            ← Zpět do CRM
          </Link>
        </div>
      </div>
    );
  }

  // ──── Success ────
  if (success) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Hotovo!</h2>
          <p className="mt-1 text-sm text-muted">{success}</p>
        </div>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => {
              setSuccess(null);
              setMode(null);
            }}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Přidat další
          </button>
          <Link
            href="/"
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-background"
          >
            Zpět do CRM
          </Link>
        </div>
      </div>
    );
  }

  // ──── Form ────
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <button
        type="button"
        onClick={() => {
          setMode(null);
          resetForm();
        }}
        className="flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zpět na výběr
      </button>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ── Email mode ── */}
      {mode === 'email' && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-600" />
            Údaje z emailu
          </h3>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Od (odesílatel) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={emailFrom}
              onChange={(e) => setEmailFrom(e.target.value)}
              placeholder='Jan Novák <jan.novak@firma.cz> nebo jen email'
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Předmět emailu
            </label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Poptávka školení pro tým"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Text emailu (volitelné)
            </label>
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              rows={4}
              placeholder="Dobrý den, chtěli bychom objednat..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>
      )}

      {/* ── Contact fields ── */}
      {(mode === 'contact' || mode === 'both') && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold">Kontakt</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Jméno <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Příjmení <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Telefon</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Firma</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Pozice</label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Deal fields ── */}
      {(mode === 'deal' || mode === 'both') && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold">Deal</h3>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Název dealu{' '}
              {mode === 'deal' && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={dealName}
              onChange={(e) => setDealName(e.target.value)}
              placeholder={
                mode === 'both'
                  ? 'Automaticky z firmy, nebo zadejte vlastní'
                  : 'např. ČSOB | Školení'
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              required={mode === 'deal'}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Klient</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="">— vyberte —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Co poptávali
              </label>
              <select
                value={inquiryType}
                onChange={(e) => setInquiryType(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="">— vyberte —</option>
                {INQUIRY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Komu přiřadit
            </label>
            <div className="flex flex-wrap gap-2">
              {ASSIGNED_PEOPLE.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() =>
                    setAssignedTo((prev) =>
                      prev.includes(p)
                        ? prev.filter((x) => x !== p)
                        : [...prev, p]
                    )
                  }
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    assignedTo.includes(p)
                      ? 'bg-accent text-white'
                      : 'bg-background text-muted hover:text-foreground'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Poznámka</label>
            <textarea
              value={dealNote}
              onChange={(e) => setDealNote(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>
      )}

      {/* ── Submit ── */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-accent py-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? 'Ukládám...' : 'Uložit'}
        </button>
      </div>

      <div className="text-center">
        <Link
          href="/"
          className="text-sm text-muted hover:text-accent transition-colors"
        >
          ← Zpět do CRM
        </Link>
      </div>
    </form>
  );
}
