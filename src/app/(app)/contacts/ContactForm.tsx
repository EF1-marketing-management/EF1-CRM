'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Contact } from '@/lib/types';
import {
  DEPARTMENTS,
  EMAIL_STATUSES,
  PROGRAMS,
} from '@/lib/types';

interface ContactFormProps {
  contact?: Contact;
  onSuccess: () => void;
}

export default function ContactForm({ contact, onSuccess }: ContactFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);

  const [formData, setFormData] = useState({
    first_name: contact?.first_name ?? '',
    last_name: contact?.last_name ?? '',
    salutation: contact?.salutation ?? '',
    primary_email: contact?.primary_email ?? '',
    secondary_email: contact?.secondary_email ?? '',
    phone: contact?.phone ?? '',
    linkedin_url: contact?.linkedin_url ?? '',
    client_id: contact?.client_id ?? '',
    company_name: contact?.company_name ?? '',
    position: contact?.position ?? '',
    departments: contact?.departments ?? [],
    email_status: contact?.email_status ?? 'Aktivní',
    programs: contact?.programs ?? [],
    note: contact?.note ?? '',
    next_followup_at: contact?.next_followup_at ?? '',
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();

    const payload = {
      ...formData,
      client_id: formData.client_id || null,
      next_followup_at: formData.next_followup_at || null,
    };

    let result;
    if (contact) {
      result = await supabase
        .from('contacts')
        .update(payload)
        .eq('id', contact.id);
    } else {
      result = await supabase.from('contacts').insert(payload);
    }

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    onSuccess();
  };

  const toggleArrayValue = (
    field: 'departments' | 'programs',
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Jméno <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.first_name}
            onChange={(e) =>
              setFormData({ ...formData, first_name: e.target.value })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Příjmení <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.last_name}
            onChange={(e) =>
              setFormData({ ...formData, last_name: e.target.value })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Oslovení</label>
          <input
            type="text"
            value={formData.salutation}
            onChange={(e) =>
              setFormData({ ...formData, salutation: e.target.value })
            }
            placeholder="např. Honzo, Petře"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Telefon</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Primární email</label>
          <input
            type="email"
            value={formData.primary_email}
            onChange={(e) =>
              setFormData({ ...formData, primary_email: e.target.value })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Sekundární email</label>
          <input
            type="email"
            value={formData.secondary_email}
            onChange={(e) =>
              setFormData({ ...formData, secondary_email: e.target.value })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">LinkedIn profil</label>
        <input
          type="url"
          value={formData.linkedin_url}
          onChange={(e) =>
            setFormData({ ...formData, linkedin_url: e.target.value })
          }
          placeholder="https://www.linkedin.com/in/..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Klient (firma)</label>
          <select
            value={formData.client_id}
            onChange={(e) =>
              setFormData({ ...formData, client_id: e.target.value })
            }
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
          <label className="mb-1.5 block text-sm font-medium">Firma (text)</label>
          <input
            type="text"
            value={formData.company_name}
            onChange={(e) =>
              setFormData({ ...formData, company_name: e.target.value })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Pracovní pozice</label>
          <input
            type="text"
            value={formData.position}
            onChange={(e) =>
              setFormData({ ...formData, position: e.target.value })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Stav emailu</label>
          <select
            value={formData.email_status}
            onChange={(e) =>
              setFormData({ ...formData, email_status: e.target.value })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          >
            {EMAIL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Oddělení</label>
        <div className="flex flex-wrap gap-2">
          {DEPARTMENTS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleArrayValue('departments', d)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                formData.departments.includes(d)
                  ? 'bg-accent text-white'
                  : 'bg-background text-muted hover:text-foreground'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Programy</label>
        <div className="flex flex-wrap gap-2">
          {PROGRAMS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => toggleArrayValue('programs', p)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                formData.programs.includes(p)
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
        <label className="mb-1.5 block text-sm font-medium">📅 Follow-up datum</label>
        <input
          type="date"
          value={formData.next_followup_at}
          onChange={(e) =>
            setFormData({ ...formData, next_followup_at: e.target.value })
          }
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Poznámka</label>
        <textarea
          value={formData.note}
          onChange={(e) =>
            setFormData({ ...formData, note: e.target.value })
          }
          rows={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {loading
            ? 'Ukládám...'
            : contact
            ? 'Uložit změny'
            : 'Vytvořit kontakt'}
        </button>
      </div>
    </form>
  );
}
