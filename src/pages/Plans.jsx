import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import PlanCard from '../components/plans/PlanCard.jsx';
import SEO from '../components/SEO.jsx';
import BackButton from '../components/BackButton.jsx';

const PRODUCT_LABELS = {
  mentorship: 'Mentorship',
};

// `key: null` = show everything (All Plans, Combo Plans use is_bundle instead
// of a product match). `product` filters plans.product. `disabled: true`
// products don't exist yet — clicking just shows a "coming soon" nudge.
const CATEGORIES = [
  { key: 'all', label: 'All Plans' },
  { key: 'mentorship', label: 'Mentorship', product: 'mentorship' },
  { key: 'resources', label: 'Resources', product: 'resources', disabled: true },
  { key: 'cutoffs', label: 'Cutoff Access', product: 'cutoffs', disabled: true },
  { key: 'counselling', label: 'Counselling', product: 'counselling', disabled: true },
  { key: 'combo', label: 'Combo Plans', bundleOnly: true },
];

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [comingSoon, setComingSoon] = useState(null);

  const load = () => {
    supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        setPlans(data || []);
        setLoading(false);
      });
  };

  useEffect(load, []);

  useEffect(() => {
    if (!comingSoon) return;
    const t = setTimeout(() => setComingSoon(null), 2500);
    return () => clearTimeout(t);
  }, [comingSoon]);

  // Plans are visible to everyone (logged in or not); login is only
  // required at checkout. Availability windows are enforced here for
  // display AND again server-side in /api/create-order — this filter is
  // just so nobody sees a plan they can't actually buy yet or anymore.
  const now = Date.now();
  const visible = useMemo(() => {
    const linkedYearlyKeys = new Set(plans.filter((p) => p.yearly_plan_key).map((p) => p.yearly_plan_key));
    return plans.filter((p) => {
      if (p.available_from && new Date(p.available_from).getTime() > now) return false;
      if (p.available_to && new Date(p.available_to).getTime() < now) return false;
      if (linkedYearlyKeys.has(p.plan_key)) return false; // folded into its monthly counterpart's switch instead
      return true;
    });
  }, [plans, now]);

  const activeCategory = CATEGORIES.find((c) => c.key === category) || CATEGORIES[0];

  const categorised = useMemo(() => {
    if (activeCategory.key === 'all') return visible;
    if (activeCategory.bundleOnly) return visible.filter((p) => p.is_bundle);
    return visible.filter((p) => !p.is_bundle && p.product === activeCategory.product);
  }, [visible, activeCategory]);

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categorised;
    return categorised.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.tagline || '').toLowerCase().includes(q)
    );
  }, [categorised, search]);

  const bundles = searched.filter((p) => p.is_bundle);
  const regular = searched.filter((p) => !p.is_bundle);

  const byProduct = regular.reduce((acc, p) => {
    (acc[p.product] ||= []).push(p);
    return acc;
  }, {});

  const handleCategoryClick = (cat) => {
    if (cat.disabled) {
      setComingSoon(cat.label);
      return;
    }
    setCategory(cat.key);
  };

  return (
    <div className="min-h-screen bg-base px-5 py-16 md:py-20">
      <BackButton fallback="/" />
      <SEO
        title="Plans — arpansarkar.org"
        description="Browse mentorship and other plans across the arpansarkar.org network."
        path="/plans"
      />
      <div className="mx-auto max-w-5xl">
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-amber">Plans</div>
        <h1 className="mt-3 font-display text-3xl font-bold text-white md:text-4xl">
          Everything you can unlock
        </h1>
        <p className="mt-3 max-w-xl text-sm text-white/50">
          Buy here, use it on the matching app — a mentorship plan unlocks right on your dashboard
          and on mentorship.arpansarkar.org.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => handleCategoryClick(cat)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                cat.disabled
                  ? 'cursor-not-allowed border-line/60 text-white/25'
                  : category === cat.key
                    ? 'border-violet bg-violet/15 text-white'
                    : 'border-line text-white/55 hover:border-violet/40 hover:text-white'
              }`}
            >
              {cat.label}
              {cat.disabled && <span className="ml-1 text-white/20">· soon</span>}
            </button>
          ))}
        </div>

        {comingSoon && (
          <p className="mt-2 text-xs text-amber">{comingSoon} plans are coming soon — stay tuned!</p>
        )}

        <div className="relative mt-4 max-w-sm">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plans…"
            className="w-full rounded-lg border border-line bg-panel py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:border-violet/50 focus:outline-none"
          />
        </div>

        {loading ? (
          <div className="mt-10 h-8 w-8 animate-spin rounded-full border-2 border-violet border-t-transparent" />
        ) : searched.length === 0 ? (
          <p className="mt-10 text-sm text-white/40">
            {search ? `No plans match "${search}".` : 'No plans available in this category right now.'}
          </p>
        ) : (
          <>
            {bundles.length > 0 && (
              <div className="mt-12">
                <h2 className="mb-4 font-display text-lg font-semibold text-white">Bundles &amp; deals</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {bundles.map((plan) => (
                    <PlanCard key={plan.plan_key} plan={plan} allPlans={plans} onClaimed={load} />
                  ))}
                </div>
              </div>
            )}

            {Object.entries(byProduct).map(([product, productPlans]) => (
              <div key={product} className="mt-12">
                <h2 className="mb-4 font-display text-lg font-semibold text-white">
                  {PRODUCT_LABELS[product] || product}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {productPlans.map((plan) => (
                    <PlanCard key={plan.plan_key} plan={plan} allPlans={plans} onClaimed={load} />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
