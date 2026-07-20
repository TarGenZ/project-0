import { useState } from 'react';
import { useAuth } from '../auth/useAuth';
import ScoreCard from '../components/dashboard/ScoreCard.jsx';
import ServicesGrid from '../components/dashboard/ServicesGrid.jsx';
import PurchasesTable from '../components/dashboard/PurchasesTable.jsx';
import AdminOverview from '../components/dashboard/AdminOverview.jsx';
import AdminOrders from '../components/dashboard/AdminOrders.jsx';
import AdminPlans from '../components/dashboard/AdminPlans.jsx';
import AdminCalendar from '../components/dashboard/AdminCalendar.jsx';
import AdminGroupSessions from '../components/dashboard/AdminGroupSessions.jsx';
import AdminResources from '../components/dashboard/AdminResources.jsx';
import AdminFreeResources from '../components/dashboard/AdminFreeResources.jsx';
import AdminAnswerKeys from '../components/dashboard/AdminAnswerKeys.jsx';
import AdminBlockedSlots from '../components/dashboard/AdminBlockedSlots.jsx';
import AdminAllPurchases from '../components/dashboard/AdminAllPurchases.jsx';
import OnboardingModal from '../components/dashboard/OnboardingModal.jsx';
import SEO from '../components/SEO.jsx';

// Every ecosystem admin panel lives here, grouped by the app it belongs to.
// This is the ONE admin dashboard for the whole *.arpansarkar.org network —
// project-1 (mentorship) and any future project-N subdomain never render
// their own admin UI; their dashboards are student/user-facing only.
//
// 'overview' is pinned outside the groups below — it's the landing tab and
// always renders first, answering "does anything need me right now?" with
// links straight into whichever tab can act on it (AdminOverview.jsx).
//
// To add a new app's admin tools once project-2, project-3, etc. exist:
//   1. Copy its Admin*.jsx components into src/components/dashboard/ here
//      (same pattern as AdminGroupSessions/AdminBlockedSlots/AdminAllPurchases
//      were copied over from project-1 — they already read the SAME shared
//      Supabase project, so no backend changes are needed).
//   2. Add one entry to ADMIN_TAB_GROUPS below.
// That's it — no changes needed in the subdomain app itself beyond removing
// any admin UI it used to have.
const OVERVIEW_TAB = { id: 'overview', label: 'Overview', Component: AdminOverview };

const ADMIN_TAB_GROUPS = [
  {
    group: 'Homepage',
    tabs: [
      { id: 'orders', label: 'Orders', Component: AdminOrders },
      { id: 'plans', label: 'Plans', Component: AdminPlans },
    ],
  },
  {
    group: 'Schedule',
    tabs: [
      { id: 'schedule_calendar', label: 'Calendar', Component: AdminCalendar },
      { id: 'mentorship_group', label: 'Group Sessions', Component: AdminGroupSessions },
      { id: 'mentorship_blocked', label: 'Block Slots', Component: AdminBlockedSlots },
    ],
  },
  {
    group: 'Mentorship',
    tabs: [{ id: 'mentorship_purchases', label: 'All Purchases', Component: AdminAllPurchases }],
  },
  {
    group: 'Resources',
    tabs: [
      { id: 'resources_files', label: 'Files', Component: AdminResources },
      { id: 'resources_free', label: 'Free Resources', Component: AdminFreeResources },
    ],
  },
  {
    group: 'Tools',
    tabs: [{ id: 'tools_answer_keys', label: 'Answer Keys', Component: AdminAnswerKeys }],
  },
];

const ALL_ADMIN_TABS = [OVERVIEW_TAB, ...ADMIN_TAB_GROUPS.flatMap((g) => g.tabs)];

// Auth is already resolved by the time this renders — App.jsx wraps this
// route in <ProtectedRoute>, so we only ever get here with a session and a
// loaded profile. Onboarding (name + class) is rendered as an OVERLAY on
// top of this component, never in place of it — the dashboard itself is
// always mounted, so there's no swap-in/swap-out that could blank the page.
export default function Dashboard() {
  const { session, profile, isAdmin, signOut, needsOnboarding, refreshProfile } = useAuth();

  // Persisted so a refresh (or coming back after signing in again) lands on
  // whichever tab was open last, instead of always resetting to Orders.
  // Falls back to the first tab if the stored id no longer exists (e.g.
  // after a tab was renamed/removed in a future update).
  const [adminTab, setAdminTab] = useState(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('admin_dashboard_tab') : null;
    return ALL_ADMIN_TABS.some((t) => t.id === stored) ? stored : ALL_ADMIN_TABS[0].id;
  });

  const selectAdminTab = (id) => {
    setAdminTab(id);
    localStorage.setItem('admin_dashboard_tab', id);
  };

  const ActiveAdminComponent = ALL_ADMIN_TABS.find((t) => t.id === adminTab)?.Component;

  return (
    <div className="min-h-screen bg-base px-5 py-10 md:py-14">
      <SEO title="Dashboard — arpansarkar.org" path="/dashboard" noindex />
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/40">
              {isAdmin ? 'Admin dashboard' : 'Your dashboard'}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-white md:text-3xl">
              {isAdmin
                ? 'Ecosystem admin'
                : `Welcome back${profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}`}
            </h1>
          </div>
          <button
            onClick={signOut}
            className="rounded-full border border-line px-4 py-2 text-sm text-white/70 transition hover:border-violet/50 hover:text-white"
          >
            Sign out
          </button>
        </div>

        <div className="mt-10">
          {isAdmin ? (
            <div>
              <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                <button
                  onClick={() => selectAdminTab(OVERVIEW_TAB.id)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    adminTab === OVERVIEW_TAB.id
                      ? 'bg-violet text-white'
                      : 'border border-violet/40 text-lavender hover:text-white'
                  }`}
                >
                  {OVERVIEW_TAB.label}
                </button>
                <div className="h-4 w-px bg-line" />
                {ADMIN_TAB_GROUPS.map((g) => (
                  <div key={g.group} className="flex items-center gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-white/30">
                      {g.group}
                    </span>
                    <div className="flex gap-1.5">
                      {g.tabs.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => selectAdminTab(t.id)}
                          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                            adminTab === t.id
                              ? 'bg-violet text-white'
                              : 'border border-line text-white/60 hover:text-white'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {ActiveAdminComponent && (
                <ActiveAdminComponent {...(adminTab === OVERVIEW_TAB.id ? { onNavigate: selectAdminTab } : {})} />
              )}
            </div>
          ) : (
            <div className="space-y-10">
              <ScoreCard profile={profile} session={session} />

              <div>
                <h2 className="mb-4 font-display text-lg font-semibold text-white">Services</h2>
                <ServicesGrid />
              </div>

              <div>
                <h2 className="mb-4 font-display text-lg font-semibold text-white">Your purchases</h2>
                <PurchasesTable userId={session.user.id} />
              </div>
            </div>
          )}
        </div>
      </div>

      {needsOnboarding && (
        <OnboardingModal
          userId={session.user.id}
          prefillName={session.user.user_metadata?.full_name || ''}
          onSaved={refreshProfile}
        />
      )}
    </div>
  );
}
