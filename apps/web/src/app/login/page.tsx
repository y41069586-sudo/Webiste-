import { Brand } from '@/components/brand';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import { LoginForm } from './login-form';

export const metadata = { title: 'Anmelden' };

export default async function LoginPage() {
  if (await getAdminSession()) redirect('/admin');
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Brand className="mb-6" />
        <h1 className="mb-1 text-xl font-semibold">Admin-Anmeldung</h1>
        <p className="mb-6 text-sm text-slate-600">Passwort und Code aus der Authenticator-App.</p>
        <LoginForm />
      </div>
    </main>
  );
}
