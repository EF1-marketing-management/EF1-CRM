import { createClient } from '@/lib/supabase/server';
import SettingsForm from './SettingsForm';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div>
      <h1 className="text-2xl font-bold">Nastavení</h1>
      <p className="mt-1 text-sm text-muted">Správa účtu a hesla</p>

      <div className="mt-6 max-w-lg">
        {/* User info */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Účet</h2>
          <p className="mt-2 text-sm text-muted">
            Přihlášen/a jako <span className="font-medium text-foreground">{user?.email}</span>
          </p>
        </div>

        {/* Password change */}
        <div className="mt-4 rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Změna hesla</h2>
          <p className="mt-1 text-sm text-muted">
            Zadejte nové heslo (minimálně 6 znaků)
          </p>
          <div className="mt-4">
            <SettingsForm />
          </div>
        </div>
      </div>
    </div>
  );
}
