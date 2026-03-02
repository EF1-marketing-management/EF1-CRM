'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PROGRAMS, DEPARTMENTS } from '@/lib/types';

interface ImportResult {
  message: string;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  airtable_synced: number;
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState('');
  const [defaultProgram, setDefaultProgram] = useState('');
  const [defaultDepartment, setDefaultDepartment] = useState('');
  const [syncAirtable, setSyncAirtable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string[][]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError('');
    setResult(null);

    const text = await selectedFile.text();
    setCsvText(text);

    // Preview prvních 5 řádků
    const lines = text.split('\n').filter(Boolean);
    const previewRows = lines.slice(0, 6).map((line) => {
      return line.split(/[,;]/).map((cell) => cell.replace(/^["']|["']$/g, '').trim());
    });
    setPreview(previewRows);
  };

  const handleSubmit = async () => {
    if (!csvText.trim()) {
      setError('Nahrajte CSV soubor nebo vložte CSV text');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/import-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRM_API_KEY}`,
        },
        body: JSON.stringify({
          csv_text: csvText,
          default_program: defaultProgram || undefined,
          default_department: defaultDepartment || undefined,
          sync_to_airtable: syncAirtable,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Chyba při importu');
      }

      setResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link
          href="/contacts"
          className="mb-2 flex items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Zpět na kontakty
        </Link>
        <h1 className="text-2xl font-bold">Import kontaktů z CSV</h1>
        <p className="mt-1 text-muted">
          Nahrajte CSV soubor s kontakty. Existující kontakty (podle emailu)
          budou aktualizovány, ne duplikovány.
        </p>
      </div>

      {/* Success result */}
      {result && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-800">{result.message}</h3>
              <div className="mt-2 grid grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-medium text-green-800">{result.total}</div>
                  <div className="text-green-600">Celkem</div>
                </div>
                <div>
                  <div className="font-medium text-green-800">{result.created}</div>
                  <div className="text-green-600">Vytvořeno</div>
                </div>
                <div>
                  <div className="font-medium text-green-800">{result.updated}</div>
                  <div className="text-green-600">Aktualizováno</div>
                </div>
                <div>
                  <div className="font-medium text-green-800">{result.skipped}</div>
                  <div className="text-green-600">Přeskočeno</div>
                </div>
              </div>
              {result.airtable_synced > 0 && (
                <p className="mt-2 text-sm text-green-600">
                  ✅ {result.airtable_synced} kontaktů synchronizováno do Airtable
                </p>
              )}
              {result.errors.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-red-600">
                    {result.errors.length} chyb
                  </summary>
                  <ul className="mt-2 list-inside list-disc text-sm text-red-600">
                    {result.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              setResult(null);
              setCsvText('');
              setFile(null);
              setPreview([]);
            }}
            className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Importovat další
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {!result && (
        <div className="space-y-6">
          {/* Upload area */}
          <div className="rounded-xl border-2 border-dashed border-border bg-card p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="mx-auto h-12 w-12 text-muted" />
            <h3 className="mt-3 font-medium">Nahrát CSV soubor</h3>
            <p className="mt-1 text-sm text-muted">
              Přetáhněte soubor sem nebo klikněte pro výběr
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Vybrat soubor
            </button>
            {file && (
              <p className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-accent">
                <FileText className="h-4 w-4" />
                {file.name} ({(file.size / 1024).toFixed(1)} kB)
              </p>
            )}
          </div>

          {/* Or paste CSV */}
          <div className="text-center text-sm text-muted">nebo vložte CSV text:</div>
          <textarea
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              setFile(null);
              // Update preview
              const lines = e.target.value.split('\n').filter(Boolean);
              const previewRows = lines.slice(0, 6).map((line) =>
                line.split(/[,;]/).map((cell) => cell.replace(/^["']|["']$/g, '').trim())
              );
              setPreview(previewRows);
            }}
            rows={6}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-accent"
            placeholder="Jméno;Příjmení;Email;Telefon;Firma;Pozice&#10;Jan;Novák;jan@firma.cz;+420 123 456 789;Firma s.r.o.;HR Manager"
          />

          {/* Preview */}
          {preview.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-medium">
                Náhled ({preview.length - 1} řádků):
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      {preview[0]?.map((header, i) => (
                        <th
                          key={i}
                          className="border-b border-border px-2 py-1.5 text-left font-medium text-muted"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(1).map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-background-hover">
                        {row.map((cell, cellIdx) => (
                          <td
                            key={cellIdx}
                            className="border-b border-border/50 px-2 py-1"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Výchozí program (volitelné)
              </label>
              <select
                value={defaultProgram}
                onChange={(e) => setDefaultProgram(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="">— žádný —</option>
                {PROGRAMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Výchozí oddělení (volitelné)
              </label>
              <select
                value={defaultDepartment}
                onChange={(e) => setDefaultDepartment(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="">— žádné —</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={syncAirtable}
              onChange={(e) => setSyncAirtable(e.target.checked)}
              className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
            />
            <span className="text-sm">Synchronizovat nové kontakty do Airtable</span>
          </label>

          {/* Formát nápověda */}
          <details className="rounded-lg border border-border bg-card/50 p-4">
            <summary className="cursor-pointer text-sm font-medium">
              📋 Podporované formáty a sloupce
            </summary>
            <div className="mt-3 text-sm text-muted">
              <p>
                CSV soubor s oddělovačem čárkou (<code>,</code>) nebo středníkem (
                <code>;</code>). Podporované hlavičky:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>
                  <strong>Jméno / first_name / Křestní</strong> — křestní jméno
                </li>
                <li>
                  <strong>Příjmení / last_name</strong> — příjmení
                </li>
                <li>
                  <strong>Email / e-mail / primary_email</strong> — email
                </li>
                <li>
                  <strong>Telefon / phone / tel</strong> — telefon
                </li>
                <li>
                  <strong>Firma / company / společnost</strong> — firma
                </li>
                <li>
                  <strong>Pozice / position / role</strong> — pracovní pozice
                </li>
                <li>
                  <strong>Oddělení / department</strong> — oddělení
                </li>
                <li>
                  <strong>LinkedIn / linkedin_url</strong> — LinkedIn profil
                </li>
                <li>
                  <strong>Poznámka / note / notes</strong> — poznámka
                </li>
                <li>
                  <strong>Program</strong> — program (FAIL apod.)
                </li>
              </ul>
              <p className="mt-3 text-xs">
                💡 Kontakty se párují podle emailu — existující záznamy se aktualizují
                (přidá se program, oddělení), nové se vytvoří.
              </p>
            </div>
          </details>

          {/* Submit */}
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={loading || !csvText.trim()}
              className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? 'Importuji...' : 'Importovat kontakty'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
