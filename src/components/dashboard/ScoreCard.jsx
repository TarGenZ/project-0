import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';

export default function ScoreCard({ profile, session }) {
  const [stats, setStats] = useState({ count: 0, totalPaise: 0 });

  useEffect(() => {
    if (!session) return;
    supabase
      .from('purchases')
      .select('amount_paise, status')
      .eq('user_id', session.user.id)
      .then(({ data }) => {
        const paid = (data || []).filter((p) => p.status === 'paid');
        setStats({
          count: paid.length,
          totalPaise: paid.reduce((sum, p) => sum + p.amount_paise, 0),
        });
      });
  }, [session]);

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-glow"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Candidate</p>
          <p className="font-display text-lg font-semibold text-white">
            {profile?.full_name || session?.user?.email}
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-medium ${
            profile?.is_verified
              ? 'border-violet/40 bg-violet/10 text-lavender'
              : 'border-amber/40 bg-amber/10 text-amber'
          }`}
        >
          {profile?.is_verified ? 'Verified' : 'Pending'}
        </span>
      </div>

      <div className="my-5 h-px w-full bg-line" />

      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="font-display text-2xl font-bold text-white">{stats.count}</p>
          <p className="mt-1 text-xs text-white/45">purchases made</p>
        </div>
        <div>
          <p className="font-display text-2xl font-bold text-white">
            ₹{(stats.totalPaise / 100).toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-white/45">your donations</p>
        </div>
      </div>

      <div className="my-5 h-px w-full bg-line" />

      <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-white/40">
        <span>Member since {memberSince}</span>
        <span>{session?.user?.email}</span>
      </div>
    </motion.div>
  );
}
