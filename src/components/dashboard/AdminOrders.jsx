import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const STATUS_STYLES = {
  paid: { label: 'Success', className: 'bg-green-500/10 text-green-400 border-green-500/30' },
  pending: { label: 'Processing', className: 'bg-amber/10 text-amber border-amber/30' },
  failed: { label: 'Failed', className: 'bg-red-500/10 text-red-400 border-red-500/30' },
  refunded: { label: 'Refunded', className: 'bg-white/10 text-white/60 border-white/20' },
};

const FILTERS = ['all', 'paid', 'pending', 'failed', 'refunded'];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    supabase
      .from('purchases')
      .select('id, product, plan_name, amount_paise, status, created_at, profiles(full_name, email)')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setOrders(data || []);
        setLoading(false);
      });
  }, []);

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  if (loading) return <p className="text-sm text-white/50">Loading orders…</p>;
  if (error) return <p className="text-sm text-red-400">{error}</p>;

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1.5 text-xs capitalize transition ${
              filter === s
                ? 'border-violet bg-violet/10 text-lavender'
                : 'border-line text-white/50 hover:text-white'
            }`}
          >
            {s === 'all' ? 'All' : STATUS_STYLES[s]?.label || s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-line bg-panel/50 px-5 py-6 text-sm text-white/45">
          No orders match this filter.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-panel text-xs uppercase tracking-wide text-white/40">
                <th className="whitespace-nowrap px-4 py-3">Student</th>
                <th className="whitespace-nowrap px-4 py-3">Plan</th>
                <th className="whitespace-nowrap px-4 py-3">Amount</th>
                <th className="whitespace-nowrap px-4 py-3">Status</th>
                <th className="whitespace-nowrap px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const s = STATUS_STYLES[o.status] || STATUS_STYLES.pending;
                return (
                  <tr key={o.id} className="border-b border-line/60 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3">
                      <p className="text-white">{o.profiles?.full_name || '—'}</p>
                      <p className="text-xs text-white/40">{o.profiles?.email}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-white/70">
                      {o.plan_name}
                      <span className="ml-1.5 text-[10px] uppercase text-white/25">{o.product}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-white/70">
                      ₹{(o.amount_paise / 100).toLocaleString('en-IN')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`rounded-full border px-2.5 py-1 text-xs ${s.className}`}>{s.label}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-white/40">
                      {new Date(o.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
