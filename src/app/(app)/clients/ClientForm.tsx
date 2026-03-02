'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Client } from '@/lib/types';
import { CLIENT_TYPES, EMPLOYEE_COUNTS } from '@/lib/types';

interface ClientFormProps {
  client?: Client;
  onSuccess: () => void;
}

export default function ClientForm({ client, onSuccess }: ClientFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: client?.name ?? '',
    client_type: client?.client_type ?? '',
    employee_count: client?.employee_count ?? '',
    note: client?.note ?? '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();

    const payload = {
      ...formData,
      client_type: formData.client_type || null,
      employee_count: formData.employee_count || null,
      note: formData.note || null,
    };

    let result;
    if (client) {
      result = await supabase
        .from('clients')
        .update(payload)
        .eq('id', client.id);
    } else {
      result = await supabase.from('clients').insert(payload);
    }

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    onSuccess();
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
          Název firmy <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Typ klienta</label>
          <select
            value={formData.client_type}
            onChange={(e) =>
              setFormData({ ...formData, client_type: e.target.value })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="">— vyberte —</option>
            {CLIENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Počet zaměstnanců</label>
          <select
            value={formData.employee_count}
            onChange={(e) =>
              setFormData({ ...formData, employee_count: e.target.value })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="">— vyberte —</option>
            {EMPLOYEE_COUNTS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Poznámka</label>
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
          {loading
            ? 'Ukládám...'
            : client
            ? 'Uložit změny'
            : 'Vytvořit klienta'}
        </button>
      </div>
    </form>
  );
}
