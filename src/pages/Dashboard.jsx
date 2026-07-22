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
import AdminCutoffColleges from '../components/dashboard/AdminCutoffColleges.jsx';
import AdminCutoffQuotas from '../components/dashboard/AdminCutoffQuotas.jsx';
import AdminCutoffData from '../components/dashboard/AdminCutoffData.jsx';
import AdminCutoffImport from '../components/dashboard/AdminCutoffImport.jsx';
import OnboardingModal from '../components/dashboard/OnboardingModal.jsx';
import SEO from '../components/SEO.jsx';

const OVERVIEW_TAB = { id: 'overview', label: 'Overview', Component: AdminOverview };

const ADMIN_TAB_GROUPS = [
  {
    group: 'Homepage',
    tabs: [
      { id: 'orders', label: 'Orders', Component: AdminOrders },
      { id: 'plans',  label: 'Plans',  Component: AdminPlans  },
    ],
  },
  {
    group: 'Schedule',
    tabs: [
      { id: 'schedule_calendar',  label: 'Calendar',       Component: AdminCalendar      },
      { id: 'mentorship_group',   label: 'Group Sessions', Component: AdminGroupSessions },
      { id: 'mentorship_blocked', label: 'Block Slots',    Component: AdminBlockedSlots  },
    ],
  },
  {
    group: 'Mentorship',
    tabs: [
      { id: 'mentorship_purchases', label: 'All Purchases', Component: AdminAllPurchases },
    ],
  },
  {
    group: 'Resources',
    tabs: [
      { id: 'resources_files', label: 'Files',          Component: AdminResources     },
      { id: 'resources_free',  label: 'Free Resources', Component: AdminFreeResources },
    ],
  },
  {
    group: 'Tools',
    tabs: [
      { id: 'tools_answer_keys', label: 'Answer Keys', Component: AdminAnswerKeys },
    ],
  },
  {
    group: 'Cutoffs',
    tabs: [
      { id: 'cutoffs_colleges', label: 'Colleges',    Component: AdminCutoffColleges },
      { id: 'cutoffs_quotas',   label: 'Quotas',      Component: AdminCutoffQuotas   },
      { id: 'cutoffs_data',     label: 'Cutoff Data', Component: AdminCutoffData     },
      { id: 'cutoffs_import',   label: 'Bulk Import', Component: AdminCutoffImport   },
    ],
  },
];

const ALL_ADMIN_TABS = [OVERVIEW_TAB, ...ADMIN_TAB_GROUPS.flatMap((g) => g.tabs)];

// Shared pill style for desktop tab buttons
const pill = (active) =>
  `rounded-full px-4 py-1.5 text-sm font-medium transition whitespace-nowrap ${
    active
      ? 'bg-violet text-[#fff]'
      : 'border border-line text-white/60 hover:border-violet/40 hover:text-white'
  }`;

export default function Dashboard() {
  const { session, profile, isAdmin, signOut, needsOnboarding, refreshProfile } = useAuth();

  const [adminTab, setAdminTab] = useState(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('admin_dashboard_tab') : null;
    return ALL_ADMIN_TABS.some((t) => t.id === stored) ? stored : ALL_ADMIN_TABS[0].id;
  });

  const selectAdminTab = (id) => {
    setAdminTab(id);
    localStorage.setItem('admin_dashboard_tab', id);
  };

  const ActiveAdminComponent = ALL_ADMIN_TABS.find((t) => t.id === adminTab)?.Component;

  // Label shown in the mobile select header
  const activeMobileLabel = ALL_ADMIN_TABS.find((t) => t.id === adminTab)?.label ?? 'Select';

  return (
    <div className="min-h-screen bg-base px-4 py-10 sm:px-5 md:py-14">
      <SEO title="Dashboard — arpansarkar.org" path="/dashboard" noindex />
      <div className="mx-auto max-w-5xl">

        {/* ── Header ─────────────────────────────────────────────────────── */}
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

        {/* ── Content ────────────────────────────────────────────────────── */}
        <div className="mt-10">
          {isAdmin ? (
            <div>
              {/* ── Mobile nav: native grouped select ──────────────────── */}
              <div className="mb-6 md:hidden">
                <select
                  value={adminTab}
                  onChange={(e) => selectAdminTab(e.target.value)}
                  className="w-full rounded-xl border border-line bg-panel px-4 py-3 text-sm text-white outline-none focus:border-violet/50 appearance-none"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23ffffff60' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center' }}
                >
                  <option value={OVERVIEW_TAB.id}>{OVERVIEW_TAB.label}</option>
                  {ADMIN_TAB_GROUPS.map((g) => (
                    <optgroup key={g.group} label={g.group}>
                      {g.tabs.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* ── Desktop nav: grouped pill buttons ──────────────────── */}
              <div className="mb-6 hidden flex-wrap items-start gap-x-6 gap-y-4 md:flex">
                {/* Overview — always first, separated by a divider */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => selectAdminTab(OVERVIEW_TAB.id)}
                    className={pill(adminTab === OVERVIEW_TAB.id)}
                  >
                    {OVERVIEW_TAB.label}
                  </button>
                  <div className="h-4 w-px bg-line" />
                </div>

                {/* One cluster per group */}
                {ADMIN_TAB_GROUPS.map((g) => (
                  <div key={g.group} className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">
                      {g.group}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {g.tabs.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => selectAdminTab(t.id)}
                          className={pill(adminTab === t.id)}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {ActiveAdminComponent && (
                <ActiveAdminComponent
                  {...(adminTab === OVERVIEW_TAB.id ? { onNavigate: selectAdminTab } : {})}
                />
              )}
            </div>
          ) : (
            // ── Student / user dashboard ────────────────────────────────
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
