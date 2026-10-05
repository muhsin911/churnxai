import { useState, type FormEvent } from 'react';
import axios from 'axios';
import { Activity, AlertCircle, LockKeyhole } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

type ErrorBody = {
  detail?: string;
};

export default function Login() {
  const { signIn, isLoading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const authenticatedUser = await signIn(username, password);
      navigate(authenticatedUser.role === 'professor' ? '/guide' : '/', { replace: true });
    } catch (reason: unknown) {
      const message = axios.isAxiosError<ErrorBody>(reason)
        ? reason.response?.data?.detail ?? 'Unable to sign in. Please try again.'
        : 'Unable to sign in. Please try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700">
            <Activity aria-hidden="true" className="h-7 w-7 text-white" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-950">ChurnXAI</p>
            <p className="text-sm text-slate-500">Sign in to your project account</p>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-950">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Accounts are created by the project administrator. There is no public sign-up.
        </p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="username">Username</label>
            <input
              autoComplete="username"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              id="username"
              onChange={(event) => setUsername(event.target.value)}
              required
              value={username}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="password">Password</label>
            <input
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              id="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>
          {error && (
            <div className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
              <AlertCircle aria-hidden="true" className="h-5 w-5 shrink-0" />
              {error}
            </div>
          )}
          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting || isLoading}
            type="submit"
          >
            <LockKeyhole aria-hidden="true" className="h-4 w-4" />
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-5 text-xs leading-5 text-slate-500">
          Staff can predict and see their own history. Managers and professors have full project access; only managers can create accounts.
        </p>
      </section>
    </main>
  );
}
