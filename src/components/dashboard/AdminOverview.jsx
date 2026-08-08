import { useEffect, useMemo, useState } from 'react';
import {
  IndianRupee,
  Clock,
  CalendarClock,
  AlertTriangle,
  FileText,
  Package,
  ArrowRight,
  Video,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { SLOT_LABELS, DAYS } from '../../lib/mentorshipLabels';

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function inr(paise) {
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}

/**
 * The admin's landing tab — replaces "check Orders, then check Plans, then
 * check Group Sessions, then check Purchases" with one screen that answers
 * "does anything need me right now?" and links straight into the tab that
 * can act on it. `onNavigate(tabId)` jumps the parent Dashboard to that tab.
 */
export default function AdminOverview({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [plans, setPlans] = useState([]);
  const [groupSessions, setGroupSessions] = useState([]);
  const [resourceCount, setResourceCount] = useState(null);
  const [enrollment, setEnrollment] = useState({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [purchasesRes, plansRes, groupRes, resourceRes] = await Promise.all([
        supabase
          .from('purchases')
          .select(
            'id, product, plan_key, plan_name, amount_paise, status, created_at, scheduled_date, scheduled_slot, weekly_day, weekly_slot, zoom_join_url, profiles(full_name, email)'
          )
          .gte('created_at', daysAgo(30).toISOString())
          .order('created_at', { ascending: false })
          .limit(500),
        supabase.from('plans').select('*').eq('is_active', true),
        supabase
          .from('group_sessions')
          .select('*')
          .gte('session_date', startOfDay(new Date()).toISOString().slice(0, 10))
          .order('session_date', { ascending: true })
          .limit(20),
        supabase.from('resource_files').select('id', { count: 'exact', head: true }),
      ]);
      if (cancelled) return;

      setPurchases(purchasesRes.data || []);
      setPlans(plansRes.data || []);
      setGroupSessions(groupRes.data || []);
      setResourceCount(resourceRes.count ?? 0);

      const cohortPlans = (plansRes.data || []).filter(
        (p) => p.is_group && (p.billing_period === 'monthly' || p.billing_period === 'yearly')
      );
      const counts = {};
      await Promise.all(
        cohortPlans.map(async (p) => {
          const { data } = await supabase.rpc('plan_pool_enrollment_count', { p_plan_key: p.plan_key });
          counts[p.plan_key] = data;
        })
      );
      if (!cancelled) setEnrollment(counts);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const weekAgo = daysAgo(7);

    const pending = purchases.filter((p) => p.status === 'pending');
    const failedRecent = purchases.filter((p) => p.status === 'failed' && new Date(p.created_at) >= weekAgo);
    const paidThisWeek = purchases.filter((p) => p.status === 'paid' && new Date(p.created_at) >= weekAgo);
    const revenueThisWeek = paidThisWeek.reduce((sum, p) => sum + p.amount_paise, 0);

    const todayWeekday = today.getDay();
    const todaysOneOff = purchases.filter(
      (p) => p.status === 'paid' && p.scheduled_date && startOfDay(p.scheduled_date).getTime() === today.getTime()
    );
    const todaysWeekly = purchases.filter(
      (p) => p.status === 'paid' && p.weekly_day === todayWeekday && p.weekly_slot
    );
    const todaysGroup = groupSessions.filter((g) => g.session_date === today.toISOString().slice(0, 10));

    const todaysSessions = [
      ...todaysOneOff.map((p) => ({
        id: p.id,
        who: p.profiles?.full_name || p.profiles?.email || 'Student',
        what: p.plan_name,
        slot: SLOT_LABELS[p.scheduled_slot] || p.scheduled_slot,
        zoomJoinUrl: p.zoom_join_url,
      })),
      ...todaysWeekly.map((p) => ({
        id: `${p.id}-w`,
        who: p.profiles?.full_name || p.profiles?.email || 'Student',
        what: p.plan_name,
        slot: SLOT_LABELS[p.weekly_slot] || p.weekly_slot,
        zoomJoinUrl: p.zoom_join_url,
      })),
      ...todaysGroup.map((g) => ({
        id: `gs-${g.id}`,
        who: 'Group batch',
        what: plans.find((p) => p.plan_key === g.plan_key)?.name || 'Group session',
        slot: SLOT_LABELS[g.session_slot] || g.session_slot,
        zoomJoinUrl: g.zoom_link,
      })),
    ].sort((a, b) => (a.slot || '').localeCompare(b.slot || ''));

    // Plans running hot on capacity — worth knowing before they sell out
    // from under the admin without warning.
    const nearCapacity = plans
      .filter((p) => p.capacity && p.is_group && (p.billing_period === 'monthly' || p.billing_period === 'yearly'))
      .map((p) => ({ ...p, count: enrollment[p.plan_key] ?? null }))
      .filter((p) => p.count !== null && p.count / p.capacity >= 0.8);

    // Group batches with a min-enrollment threshold that's happening soon
    // but hasn't hit that number yet.
    const soon = daysAgo(-3); // next 3 days
    const atRiskBatches = groupSessions.filter((g) => {
      const plan = plans.find((p) => p.plan_key === g.plan_key);
      if (!plan?.min_enrollment) return false;
      const count = enrollment[g.plan_key];
      const date = new Date(g.session_date);
      return date <= soon && count !== undefined && count < plan.min_enrollment;
    });

    const staleP = pending.filter((p) => new Date(p.created_at) < daysAgo(0.04)); // >1hr old

    return {
      pendingCount: pending.length,
      stalePendingCount: staleP.length,
      failedRecentCount: failedRecent.length,
      revenueThisWeek,
      paidThisWeekCount: paidThisWeek.length,
      todaysSessions,
      nearCapacity,
      atRiskBatches,
      recentPending: pending.slice(0, 5),
    };
  }, [purchases, plans, groupSessions, enrollment]);

  if (loading) {
    return <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet border-t-transparent" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={IndianRupee}
          label="Revenue, last 7 days"
          value={inr(stats.revenueThisWeek)}
          sub={`${stats.paidThisWeekCount} paid order${stats.paidThisWeekCount === 1 ? '' : 's'}`}
        />
        <StatCard
          icon={Clock}
          label="Pending payments"
          value={stats.pendingCount}
          sub={stats.stalePendingCount > 0 ? `${stats.stalePendingCount} stuck >1hr` : 'all recent'}
          tone={stats.stalePendingCount > 0 ? 'amber' : 'default'}
          onClick={() => onNavigate('orders')}
        />
        <StatCard
          icon={CalendarClock}
          label="Sessions today"
          value={stats.todaysSessions.length}
          sub="tap to view schedule"
          onClick={() => onNavigate('schedule_calendar')}
        />
        <StatCard icon={FileText} label="Resource files" value={resourceCount ?? '—'} sub="live on Resources app" onClick={() => onNavigate('resources_files')} />
      </div>

      {(stats.failedRecentCount > 0 || stats.nearCapacity.length > 0 || stats.atRiskBatches.length > 0) && (
        <div className="rounded-2xl border border-amber/30 bg-amber/5 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber">
            <AlertTriangle size={15} /> Needs a look
          </div>
          <ul className="space-y-2 text-sm text-white/70">
            {stats.failedRecentCount > 0 && (
              <li>
                {stats.failedRecentCount} failed payment{stats.failedRecentCount === 1 ? '' : 's'} in the last 7
                days —{' '}
                <button onClick={() => onNavigate('orders')} className="text-amber underline underline-offset-2">
                  review in Orders
                </button>
              </li>
            )}
            {stats.nearCapacity.map((p) => (
              <li key={p.plan_key}>
                "{p.name}" is at {p.count}/{p.capacity} capacity —{' '}
                <button onClick={() => onNavigate('plans')} className="text-amber underline underline-offset-2">
                  consider raising the cap
                </button>
              </li>
            ))}
            {stats.atRiskBatches.map((g) => (
              <li key={g.id}>
                Group batch on {new Date(g.session_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{' '}
                hasn't hit its minimum enrollment yet —{' '}
                <button onClick={() => onNavigate('mentorship_group')} className="text-amber underline underline-offset-2">
                  check Group Sessions
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-panel p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-white">
              <CalendarClock size={14} /> Today's sessions
            </h3>
            <button
              onClick={() => onNavigate('schedule_calendar')}
              className="flex items-center gap-1 text-xs text-white/40 hover:text-white"
            >
              Full calendar <ArrowRight size={12} />
            </button>
          </div>
          {stats.todaysSessions.length === 0 ? (
            <p className="text-sm text-white/35">Nothing scheduled today.</p>
          ) : (
            <div className="space-y-2">
              {stats.todaysSessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-line bg-base px-3 py-2 text-sm">
                  <div>
                    <span className="text-white">{s.who}</span>
                    <span className="ml-1.5 text-xs text-white/40">{s.what}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    {s.slot}
                    {s.zoomJoinUrl && (
                      <a href={s.zoomJoinUrl} target="_blank" rel="noopener noreferrer" className="text-lavender">
                        <Video size={13} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-panel p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-white">
              <Package size={14} /> Recent pending orders
            </h3>
            <button onClick={() => onNavigate('orders')} className="flex items-center gap-1 text-xs text-white/40 hover:text-white">
              All orders <ArrowRight size={12} />
            </button>
          </div>
          {stats.recentPending.length === 0 ? (
            <p className="text-sm text-white/35">No pending orders — everything's settled.</p>
          ) : (
            <div className="space-y-2">
              {stats.recentPending.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-line bg-base px-3 py-2 text-sm">
                  <div>
                    <span className="text-white">{p.profiles?.full_name || p.profiles?.email || 'Student'}</span>
                    <span className="ml-1.5 text-xs text-white/40">{p.plan_name}</span>
                  </div>
                  <span className="text-xs text-white/50">{inr(p.amount_paise)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, tone = 'default', onClick }) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        tone === 'amber' ? 'border-amber/30 bg-amber/5' : 'border-line bg-panel'
      } ${onClick ? 'hover:border-violet/40' : ''}`}
    >
      <div className="flex items-center gap-1.5 text-xs text-white/45">
        <Icon size={13} /> {label}
      </div>
      <div className="mt-1.5 font-display text-2xl font-bold text-white">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-white/35">{sub}</div>}
    </Wrapper>
  );
}
