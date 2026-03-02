import { Suspense } from 'react';
import QuickAddForm from './QuickAddForm';

export const metadata = {
  title: 'Rychlé přidání | EF1 CRM',
};

export default function QuickAddPage() {
  return (
    <div>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-white text-lg font-bold">
          EF
        </div>
        <h1 className="text-2xl font-bold">Rychlé přidání</h1>
        <p className="mt-1 text-sm text-muted">
          Přidejte kontakt, deal, nebo obojí najednou
        </p>
      </div>

      <Suspense fallback={<div className="text-center text-muted text-sm">Načítám...</div>}>
        <QuickAddForm />
      </Suspense>
    </div>
  );
}
