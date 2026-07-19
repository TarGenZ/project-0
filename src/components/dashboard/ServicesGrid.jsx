import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GraduationCap, BookOpen, BarChart3, Users, ArrowRight, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { DAYS, SLOT_LABELS } from '../../lib/mentorshipLabels';

const MENTORSHIP_URL = 'https://mentorship.arpansarkar.org/dashboard';

function scheduleLine(p) {
  if (p.scheduled_date) {
    const d = new Date(p.scheduled_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    return `${d} · ${SLOT_LABELS[p.scheduled_slot] || p.scheduled_slot}`;
  }
  if (p.weekly_day !== null && p.weekly_day !== undefined && p.weekly_slot) {
    return `Every ${DAYS[p.weekly_day]} · ${SLOT_LABELS[p.weekly_slot] || p.weekly_slot}`;
  }
  return 'Booking pending';
}

function MentorshipBox() {
  const [state, setState] = useState({ loading: true, hasPurchases: false, latest: null });

  useEffect(() => {
    supabase
      .from('purchases')
      .select('id, plan_name, status, scheduled_date, scheduled_slot, weekly_day, weekly_slot, created_at')
      .eq('product', 'mentorship')
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const purchases = data || [];
        // "Latest booked session" = most recently created purchase that
        // actually has a schedule attached yet; falls back to the most
        // recent purchase overall if none are scheduled.
        const latest = purchases.find((p) => p.scheduled_date || (p.weekly_day !== null && p.weekly_day !== undefined)) || purchases[0] || null;
        setState({ loading: false, hasPurchases: purchases.length > 0, latest });
      });
  }, []);

  return (
    <a
      href={MENTORSHIP_URL}
      className="group flex flex-col rounded-2xl border border-line bg-panel p-5 transition hover:border-violet/50 hover:shadow-glow"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet/15 text-lavender">
          <GraduationCap size={18} />
        </div>
        <ArrowRight size={15} className="text-white/25 transition group-hover:translate-x-0.5 group-hover:text-white/60" />
      </div>
      <p className="mt-3 font-display text-sm font-semibold text-white">Mentorship</p>

      {state.loading ? (
        <div className="mt-2 h-8 animate-pulse rounded bg-line/40" />
      ) : !state.hasPurchases ? (
        <p className="mt-2 text-xs text-white/45">No sessions booked by you</p>
      ) : (
        <>
          <p className="mt-2 text-xs text-white/70">{state.latest?.plan_name}</p>
          <p className="text-xs text-white/40">{scheduleLine(state.latest)}</p>
          <p className="mt-2 text-[11px] text-lavender">Click to see all your scheduled sessions</p>
        </>
      )}
    </a>
  );
}

const RESOURCES_URL = 'https://resources.arpansarkar.org/dashboard';

function ResourcesBox() {
  const [state, setState] = useState({ loading: true, hasAccess: false });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setState({ loading: false, hasAccess: false });
        return;
      }
      supabase.rpc('has_resource_access', { p_user_id: session.user.id }).then(({ data, error }) => {
        setState({ loading: false, hasAccess: !error && !!data });
      });
    });
  }, []);

  return (
    <a
      href={RESOURCES_URL}
      className="group flex flex-col rounded-2xl border border-line bg-panel p-5 transition hover:border-violet/50 hover:shadow-glow"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet/15 text-lavender">
          <BookOpen size={18} />
        </div>
        <ArrowRight size={15} className="text-white/25 transition group-hover:translate-x-0.5 group-hover:text-white/60" />
      </div>
      <p className="mt-3 font-display text-sm font-semibold text-white">Resources</p>

      {state.loading ? (
        <div className="mt-2 h-8 animate-pulse rounded bg-line/40" />
      ) : state.hasAccess ? (
        <p className="mt-2 text-xs text-lavender">Notes, mind maps & NCERT PDFs — open library</p>
      ) : (
        <p className="mt-2 text-xs text-white/45">Notes, short notes, mind maps & NCERT PDFs</p>
      )}
    </a>
  );
}

function ComingSoonBox({ label, icon: Icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-start rounded-2xl border border-line bg-panel/60 p-5 text-left opacity-70 transition hover:opacity-100"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/40">
        <Icon size={18} />
      </div>
      <p className="mt-3 font-display text-sm font-semibold text-white">{label}</p>
      <p className="mt-2 flex items-center gap-1 text-xs text-white/35">
        <Clock size={11} /> Coming soon
      </p>
    </button>
  );
}

export default function ServicesGrid() {
  const [toast, setToast] = useState(null);

  const showComingSoon = (label) => {
    setToast(label);
    setTimeout(() => setToast(null), 2200);
  };

  return (
    <div className="relative">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MentorshipBox />
        <ResourcesBox />
        <ComingSoonBox label="Cutoffs" icon={BarChart3} onClick={() => showComingSoon('Cutoffs')} />
        <ComingSoonBox label="Counselling" icon={Users} onClick={() => showComingSoon('Counselling')} />
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-line bg-panel px-4 py-2 text-sm text-white shadow-glow"
          >
            {toast} is coming soon 🚧
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
