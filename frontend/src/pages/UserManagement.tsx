import { useCallback, useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle2, UserPlus, Users, UserX } from 'lucide-react';
import { createUser, deactivateUser, getManagedUsers } from '../services/api';
import { useAuth } from '../auth/useAuth';
import type { ManagedUser, UserRole } from '../types';

type ErrorBody = {
  detail?: string;
};

const roleLabels: Record<UserRole, string> = {
  staff: 'Staff',
  manager: 'Manager',
  professor: 'Professor',
};

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [deactivatingUserId, setDeactivatingUserId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refreshUsers = useCallback(async () => {
    setLoadingUsers(true);
    setUsersError(null);
    try {
      const result = await getManagedUsers();
      setUsers(result.items);
      setTotalUsers(result.total);
      setActiveUsers(result.active_total);
    } catch (reason: unknown) {
      const detail = axios.isAxiosError<ErrorBody>(reason)
        ? reason.response?.data?.detail
        : undefined;
      setUsersError(detail ?? 'Unable to load the user list.');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getManagedUsers()
      .then((result) => {
        if (!active) return;
        setUsers(result.items);
        setTotalUsers(result.total);
        setActiveUsers(result.active_total);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        const detail = axios.isAxiosError<ErrorBody>(reason)
          ? reason.response?.data?.detail
          : undefined;
        setUsersError(detail ?? 'Unable to load the user list.');
      })
      .finally(() => {
        if (active) setLoadingUsers(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createUser({ username, password, role });
      setMessage(`${roleLabels[created.role]} account "${created.username}" was created.`);
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      await refreshUsers();
    } catch (reason: unknown) {
      const detail = axios.isAxiosError<ErrorBody>(reason)
        ? reason.response?.data?.detail
        : undefined;
      setError(detail ?? 'The account could not be created. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(account: ManagedUser) {
    const confirmed = window.confirm(
      `Deactivate "${account.username}"? They will no longer be able to sign in. Their prediction history will be preserved.`,
    );
    if (!confirmed) return;

    setUsersError(null);
    setDeactivatingUserId(account.id);
    try {
      await deactivateUser(account.id);
      setMessage(`Account "${account.username}" was deactivated. Its prediction history was preserved.`);
      await refreshUsers();
    } catch (reason: unknown) {
      const detail = axios.isAxiosError<ErrorBody>(reason)
        ? reason.response?.data?.detail
        : undefined;
      setUsersError(detail ?? 'The account could not be deactivated.');
    } finally {
      setDeactivatingUserId(null);
    }
  }

  return (
    <section className="space-y-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-700">Manager tools</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Manage user accounts</h1>
        <p className="mt-2 max-w-2xl leading-7 text-slate-600">
          View the account count, create accounts, or deactivate access. Deactivated users cannot sign in,
          but their prediction history remains available for auditing.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <form className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" onSubmit={handleSubmit}>
        <div className="flex items-center gap-2">
          <UserPlus aria-hidden="true" className="h-5 w-5 text-teal-700" />
          <h2 className="text-lg font-bold text-slate-900">Create account</h2>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="new-username">
            Username
          </label>
          <input
            autoComplete="off"
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            id="new-username"
            maxLength={64}
            minLength={3}
            onChange={(event) => setUsername(event.target.value)}
            pattern="[A-Za-z0-9_.-]+"
            placeholder="e.g. staff2"
            required
            value={username}
          />
          <p className="mt-1 text-xs text-slate-500">3–64 letters, numbers, dots, underscores, or hyphens.</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="new-role">
            Account role
          </label>
          <select
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            id="new-role"
            onChange={(event) => setRole(event.target.value as UserRole)}
            value={role}
          >
            <option value="staff">Staff — prediction and own history</option>
            <option value="manager">Manager — super-admin</option>
            <option value="professor">Professor — full project access</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="new-password">
            Temporary password
          </label>
          <input
            autoComplete="new-password"
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            id="new-password"
            minLength={12}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
          <p className="mt-1 text-xs text-slate-500">At least 12 characters. Share it privately and ask the user to change it.</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="confirm-password">
            Confirm password
          </label>
          <input
            autoComplete="new-password"
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            id="confirm-password"
            minLength={12}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            type="password"
            value={confirmPassword}
          />
        </div>

        {error && (
          <div className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
            <AlertCircle aria-hidden="true" className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}
        {message && (
          <div className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">
            <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0" />
            {message}
          </div>
        )}

        <button
          className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          <UserPlus aria-hidden="true" className="h-4 w-4" />
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Users aria-hidden="true" className="h-5 w-5 text-teal-700" />
            <h2 className="text-lg font-bold text-slate-900">All user accounts</h2>
          </div>
          <div className="flex gap-2 text-xs font-semibold">
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">{totalUsers} total</span>
            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-800">{activeUsers} active</span>
          </div>
        </header>

        {usersError && (
          <div className="m-4 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
            <AlertCircle aria-hidden="true" className="h-5 w-5 shrink-0" />
            {usersError}
          </div>
        )}

        {loadingUsers ? (
          <p className="p-8 text-center text-sm text-slate-600">Loading accounts…</p>
        ) : users.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-600">No accounts have been created.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3"><span className="sr-only">Account actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((account) => (
                  <tr key={account.id}>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {account.username}
                      {account.id === currentUser?.id && <span className="ml-1 text-xs font-normal text-slate-500">(you)</span>}
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600">{account.role}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        account.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {account.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(account.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      {account.is_active && account.id !== currentUser?.id && (
                        <button
                          aria-label={`Deactivate ${account.username}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                          disabled={deactivatingUserId === account.id}
                          onClick={() => void handleDeactivate(account)}
                          type="button"
                        >
                          <UserX aria-hidden="true" className="h-3.5 w-3.5" />
                          {deactivatingUserId === account.id ? 'Deactivating…' : 'Deactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      </div>
    </section>
  );
}
