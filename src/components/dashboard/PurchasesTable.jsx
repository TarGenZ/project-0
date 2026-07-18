import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const STATUS_STYLES = {
  paid: { label: 'Success', className: 'bg-green-500/10 text-green-400 border-green-500/30' },
  pending: { label: 'Processing', className: 'bg-amber/10 text-amber border-amber/30' },
  failed: { label: 'Failed', className: 'bg-red-500/10 text-red-400 border-red-500/30' },
  refunded: { label: 'Refunded', className: 'bg-white/10 text-white/60 border-white/20' },
};

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PurchasesTable({ userId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase
      .from('purchases')
      .select('id, product, plan_name, amount_paise, status, created_at, valid_till')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setOrders(data || []);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <p className="text-sm text-white/50">Loading your purchases…</p>;
  if (error) return <p className="text-sm text-red-400">{error}</p>;

  if (orders.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-panel/50 px-5 py-6 text-sm text-white/45">
        No purchases yet — once you get a plan, it'll show up here.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-white/40">
            <th className="whitespace-nowrap px-4 py-3 font-medium">Plan</th>
            <th className="whitespace-nowrap px-4 py-3 font-medium">Amount</th>
            <th className="whitespace-nowrap px-4 py-3 font-medium">Bought on</th>
            <th className="whitespace-nowrap px-4 py-3 font-medium">Valid till</th>
            <th className="whitespace-nowrap px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const s = STATUS_STYLES[o.status] || STATUS_STYLES.pending;
            return (
              <tr key={o.id} className="border-b border-line/60 last:border-0">
                <td className="whitespace-nowrap px-4 py-3 text-white">
                  {o.plan_name}
                  <span className="ml-1.5 text-[10px] uppercase text-white/25">{o.product}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-white/70">
                  ₹{(o.amount_paise / 100).toLocaleString('en-IN')}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-white/60">{fmtDate(o.created_at)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-white/60">
                  {o.valid_till ? fmtDate(o.valid_till) : '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className={`rounded-full border px-2.5 py-1 text-xs ${s.className}`}>{s.label}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
