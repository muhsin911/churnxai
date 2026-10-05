import { Fragment, useCallback, useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  RotateCcw,
  Trash2,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react';
import {
  createUser,
  deactivateUser,
  getManagedUsers,
  permanentlyDeleteUser,
  reactivateUser,
  resetUserPassword,
} from '../services/api';
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
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [removalUserId, setRemovalUserId] = useState<string | null>(null);
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
    setBusyUserId(account.id);
    try {
      await deactivateUser(account.id);
      setMessage(`Account "${account.username}" was deactivated. Its history is preserved and the account can be reactivated.`);
      setRemovalUserId(null);
      await refreshUsers();
    } catch (reason: unknown) {
      const detail = axios.isAxiosError<ErrorBody>(reason)
        ? reason.response?.data?.detail
        : undefined;
      setUsersError(detail ?? 'The account could not be deactivated.');
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleReactivate(account: ManagedUser) {
    setUsersError(null);
    setBusyUserId(account.id);
    try {
      await reactivateUser(account.id);
      setMessage(`Account "${account.username}" was reactivated.`);
      await refreshUsers();
    } catch (reason: unknown) {
      const detail = axios.isAxiosError<ErrorBody>(reason)
        ? reason.response?.data?.detail
        : undefined;
      setUsersError(detail ?? 'The account could not be reactivated.');
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>, account: ManagedUser) {
    event.preventDefault();
    setUsersError(null);
    if (resetPassword !== confirmResetPassword) {
      setUsersError('The new passwords do not match.');
      return;
    }

    setBusyUserId(account.id);
    try {
      await resetUserPassword(account.id, resetPassword);
      setMessage(`Password reset for "${account.username}". Share the new password securely.`);
      setResetUserId(null);
      setResetPassword('');
      setConfirmResetPassword('');
    } catch (reason: unknown) {
      const detail = axios.isAxiosError<ErrorBody>(reason)
        ? reason.response?.data?.detail
        : undefined;
      setUsersError(detail ?? 'The password could not be reset.');
    } finally {
      setBusyUserId(null);
    }
  }

  async function handlePermanentDelete(
    account: ManagedUser,
    historyAction: 'anonymize' | 'delete',
  ) {
    const historyDescription = historyAction === 'anonymize'
      ? 'Keep prediction history, but remove the account link and username.'
      : 'Permanently delete this account and all its prediction history.';
    if (!window.confirm(`Permanently remove "${account.username}"? ${historyDescription} This cannot be undone.`)) {
      return;
    }

    setUsersError(null);
    setBusyUserId(account.id);
    try {
      await permanentlyDeleteUser(account.id, historyAction);
      setMessage(
        historyAction === 'anonymize'
          ? `Account "${account.username}" was deleted; its history was anonymized.`
          : `Account "${account.username}" and its prediction history were permanently deleted.`,
      );
      setRemovalUserId(null);
      await refreshUsers();
    } catch (reason: unknown) {
      const detail = axios.isAxiosError<ErrorBody>(reason)
        ? reason.response?.data?.detail
        : undefined;
      setUsersError(detail ?? 'The account could not be permanently deleted.');
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <section className="space-y-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-700">Manager tools</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Manage user accounts</h1>
        <p className="mt-2 max-w-2xl leading-7 text-slate-600">
          Create accounts, reset passwords, reactivate accounts, or remove accounts. Permanent removal
          can anonymize history or delete it entirely.
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
                  <Fragment key={account.id}>
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
                        {account.id !== currentUser?.id && (
                          <div className="flex flex-wrap justify-end gap-2">
                            {account.is_active ? (
                              <button
                                aria-label={`Deactivate ${account.username}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                                disabled={busyUserId === account.id}
                                onClick={() => void handleDeactivate(account)}
                                type="button"
                              >
                                <UserX aria-hidden="true" className="h-3.5 w-3.5" />
                                Deactivate
                              </button>
                            ) : (
                              <button
                                aria-label={`Reactivate ${account.username}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                                disabled={busyUserId === account.id}
                                onClick={() => void handleReactivate(account)}
                                type="button"
                              >
                                <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
                                Reactivate
                              </button>
                            )}
                            <button
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              onClick={() => {
                                setResetUserId(resetUserId === account.id ? null : account.id);
                                setResetPassword('');
                                setConfirmResetPassword('');
                              }}
                              type="button"
                            >
                              <KeyRound aria-hidden="true" className="h-3.5 w-3.5" />
                              Reset password
                            </button>
                            <button
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-50"
                              onClick={() => setRemovalUserId(removalUserId === account.id ? null : account.id)}
                              type="button"
                            >
                              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                              Delete…
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {resetUserId === account.id && (
                      <tr key={`${account.id}-reset`}>
                        <td className="bg-slate-50 px-4 py-4" colSpan={5}>
                          <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => void handleResetPassword(event, account)}>
                            <label className="grid gap-1 text-xs font-semibold text-slate-700">
                              New password
                              <input
                                autoComplete="new-password"
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                minLength={12}
                                onChange={(event) => setResetPassword(event.target.value)}
                                required
                                type="password"
                                value={resetPassword}
                              />
                            </label>
                            <label className="grid gap-1 text-xs font-semibold text-slate-700">
                              Confirm password
                              <input
                                autoComplete="new-password"
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                minLength={12}
                                onChange={(event) => setConfirmResetPassword(event.target.value)}
                                required
                                type="password"
                                value={confirmResetPassword}
                              />
                            </label>
                            <button
                              className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                              disabled={busyUserId === account.id}
                              type="submit"
                            >
                              {busyUserId === account.id ? 'Resetting…' : 'Set new password'}
                            </button>
                            <span className="text-xs text-slate-500">Minimum 12 characters; existing sessions are signed out.</span>
                          </form>
                        </td>
                      </tr>
                    )}
                    {removalUserId === account.id && (
                      <tr key={`${account.id}-delete`}>
                        <td className="bg-rose-50 px-4 py-4" colSpan={5}>
                          <div className="space-y-3">
                            <p className="font-semibold text-rose-950">Choose how to delete {account.username}:</p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                className="rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
                                disabled={busyUserId === account.id}
                                onClick={() => void handleDeactivate(account)}
                                type="button"
                              >
                                Deactivate (can reactivate)
                              </button>
                              <button
                                className="rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-800"
                                disabled={busyUserId === account.id}
                                onClick={() => void handlePermanentDelete(account, 'anonymize')}
                                type="button"
                              >
                                Delete account, anonymize history
                              </button>
                              <button
                                className="rounded-lg bg-rose-700 px-3 py-2 text-sm font-semibold text-white"
                                disabled={busyUserId === account.id}
                                onClick={() => void handlePermanentDelete(account, 'delete')}
                                type="button"
                              >
                                Delete account and all history
                              </button>
                              <button
                                className="px-3 py-2 text-sm font-semibold text-slate-600"
                                onClick={() => setRemovalUserId(null)}
                                type="button"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
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
