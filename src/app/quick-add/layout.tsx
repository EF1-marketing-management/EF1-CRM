import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function QuickAddLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Quick-add still requires login (uses Supabase session)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">{children}</div>
    </div>
  );
}
