import { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertCircle, Clock3, RefreshCw } from 'lucide-react';
import { getPredictionHistory } from '../services/api';
import { useAuth } from '../auth/useAuth';
import type { PredictionHistoryItem } from '../types';

const PAGE_SIZE = 25;

export default function PredictionHistory() {
  const { user } = useAuth();
  const [items, setItems] = useState<PredictionHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loadedOffset, setLoadedOffset] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loading = loadedOffset !== offset;

  useEffect(() => {
    let active = true;
    getPredictionHistory(PAGE_SIZE, offset)
      .then((history) => {
        if (!active) return;
        setItems(history.items);
        setTotal(history.total);
        setError(null);
        setLoadedOffset(offset);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        const message = axios.isAxiosError<{ detail?: string }>(reason)
          ? reason.response?.data?.detail ?? 'Unable to load prediction history.'
          : 'Unable to load prediction history.';
        setError(message);
        setLoadedOffset(offset);
      });
    return () => {
      active = false;
    };
  }, [offset]);

  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-700">Audit history</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Prediction history</h1>
        <p className="mt-2 max-w-3xl leading-7 text-slate-600">
          {user && user.role !== 'staff'
            ? 'You can review prediction summaries from every account.'
            : 'You can review only the prediction summaries created by your account.'}
          {' '}Submitted feature values are not shown in this history view.
        </p>
      </header>
      {error && (
        <div className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
          <AlertCircle aria-hidden="true" className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">Loading saved predictions…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Clock3 aria-hidden="true" className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-3 font-bold text-slate-900">No saved predictions yet</h2>
          <p className="mt-1 text-sm text-slate-600">After an authorized user runs a prediction, its summary will appear here.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold text-slate-900">{total} saved {total === 1 ? 'prediction' : 'predictions'}</h2>
            <RefreshCw aria-hidden="true" className="h-4 w-4 text-slate-400" />
          </div>
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li className="grid gap-3 px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-center" key={item.id}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      item.predicted_class ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>{item.churn_risk} risk · {item.predicted_class ? 'Churn' : 'Stay'}</span>
                    <span className="text-sm font-semibold text-slate-900">{(item.churn_probability * 100).toFixed(1)}% estimated churn probability</span>
                    {user && user.role !== 'staff' && item.username && (
                      <span className="text-xs text-slate-500">by {item.username}</span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {new Date(item.created_at).toLocaleString()} · {item.model_name} · threshold {item.decision_threshold.toFixed(3)}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    Main factors: {[...item.top_positive_drivers, ...item.top_negative_drivers]
                      .slice(0, 4)
                      .map((driver) => driver.feature)
                      .join(', ') || 'No prominent factors returned'}
                  </p>
                </div>
                <code className="text-[10px] text-slate-400">{item.id.slice(0, 8)}</code>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
            <p className="text-xs text-slate-500">Showing {offset + 1}–{Math.min(offset + items.length, total)} of {total}</p>
            <div className="flex gap-2">
              <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} type="button">Previous</button>
              <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)} type="button">Next</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
