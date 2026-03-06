'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Deal } from '@/lib/types';
import {
  INQUIRY_TYPES,
  DEAL_STATUSES,
  ASSIGNED_PEOPLE,
} from '@/lib/types';

interface DealFormProps {
  deal?: Deal;
  clients: Array<{ id: string; name: string }>;
  contacts: Array<{ id: string; name: string; client_id: string | null }>;
  onSuccess: () => void;
}

export default function DealForm({
  deal,
  clients,
  contacts,
  onSuccess,
}: DealFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: deal?.name ?? '',
    client_id: deal?.client_id ?? '',
    contact_id: deal?.contact_id ?? '',
    inquiry_type: deal?.inquiry_type ?? '',
    assigned_to: deal?.assigned_to ?? [],
    status: deal?.status ?? 'Nový',
    note: deal?.note ?? '',
    end_client_id: deal?.end_client_id ?? '',
    value: deal?.value?.toString() ?? '',
    event_date: deal?.event_date ?? '',
  });

  // Filter contacts by selected client
  const filteredContacts = formData.client_id
    ? contacts.filter(
        (c) => c.client_id === formData.client_id || !c.client_id
      )
    : contacts;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();

    const payload = {
      name: formData.name,
      client_id: formData.client_id || null,
      contact_id: formData.contact_id || null,
      inquiry_type: formData.inquiry_type || null,
      assigned_to: formData.assigned_to,
      status: formData.status,
      note: formData.note || null,
      end_client_id: formData.end_client_id || null,
      value: formData.value ? parseFloat(formData.value) : null,
      event_date: formData.event_date || null,
    };

    let result;
    if (deal) {
      result = await supabase
        .from('deals')
        .update(payload)
        .eq('id', deal.id);
    } else {
      result = await supabase.from('deals').insert(payload);
    }

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    onSuccess();
  };

  const toggleAssigned = (person: string) => {
    setFormData((prev) => ({
      ...prev,
      assigned_to: prev.assigned_to.includes(person)
        ? prev.assigned_to.filter((p) => p !== person)
        : [...prev.assigned_to, person],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium">
          Název dealu <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="např. ČSOB | Školení"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Klient</label>
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
          <label className="mb-1.5 block text-sm font-medium">
            Kontaktní osoba
          </label>
          <select
            value={formData.contact_id}
            onChange={(e) =>
              setFormData({ ...formData, contact_id: e.target.value })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="">— vyberte —</option>
            {filteredContacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Co poptávali
          </label>
          <select
            value={formData.inquiry_type}
            onChange={(e) =>
              setFormData({ ...formData, inquiry_type: e.target.value })
            }
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
        <div>
          <label className="mb-1.5 block text-sm font-medium">Stav</label>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          >
            {DEAL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">
          Komu určeno / Nabídnuto
        </label>
        <div className="flex flex-wrap gap-2">
          {ASSIGNED_PEOPLE.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => toggleAssigned(p)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                formData.assigned_to.includes(p)
                  ? 'bg-accent text-white'
                  : 'bg-background text-muted hover:text-foreground'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Koncový klient (přes agenturu)
          </label>
          <select
            value={formData.end_client_id}
            onChange={(e) =>
              setFormData({ ...formData, end_client_id: e.target.value })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="">— žádný —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Hodnota (Kč)
          </label>
          <input
            type="number"
            value={formData.value}
            onChange={(e) =>
              setFormData({ ...formData, value: e.target.value })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">
          📅 Datum akce / realizace
        </label>
        <input
          type="date"
          value={formData.event_date}
          onChange={(e) =>
            setFormData({ ...formData, event_date: e.target.value })
          }
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">
          Poznámka / Detaily
        </label>
        <textarea
          value={formData.note}
          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
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
          {loading ? 'Ukládám...' : deal ? 'Uložit změny' : 'Vytvořit deal'}
        </button>
      </div>
    </form>
  );
}
