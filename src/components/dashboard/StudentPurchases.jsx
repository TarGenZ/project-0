import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const STATUS_STYLES = {
  paid: { label: 'Success', className: 'bg-green-500/10 text-green-400 border-green-500/30' },
  pending: { label: 'Processing', className: 'bg-amber/10 text-amber border-amber/30' },
  failed: { label: 'Failed', className: 'bg-red-500/10 text-red-400 border-red-500/30' },
  refunded: { label: 'Refunded', className: 'bg-white/10 text-white/60 border-white/20' },
};

export default function StudentPurchases({ userId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase
      .from('purchases')
      .select('id, product, plan_name, amount_paise, status, created_at, scheduled_date, scheduled_slot, weekly_day, weekly_slot')
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
        No purchases yet — once you book a session or grab a resource bundle, it'll show up here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((o) => {
        const s = STATUS_STYLES[o.status] || STATUS_STYLES.pending;
        return (
          <div
            key={o.id}
            className="flex items-center justify-between rounded-xl border border-line bg-panel/60 px-5 py-4"
          >
            <div>
              <p className="font-medium text-white">{o.plan_name}</p>
              <p className="mt-0.5 text-xs text-white/40">
                {new Date(o.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
                {o.scheduled_date &&
                  ` · session ${new Date(o.scheduled_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/70">₹{(o.amount_paise / 100).toLocaleString('en-IN')}</span>
              <span className={`rounded-full border px-2.5 py-1 text-xs ${s.className}`}>{s.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
