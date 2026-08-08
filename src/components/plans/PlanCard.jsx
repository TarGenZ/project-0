import { useEffect, useState } from 'react';
import { Check, Users, User, Gift, ShoppingCart, Package, Tag } from 'lucide-react';
import { useCart } from '../../lib/cart';
import { supabase } from '../../lib/supabaseClient';

export default function PlanCard({ plan, allPlans, onClaimed }) {
  const { items, addItem } = useCart();
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState(null);
  const [claimed, setClaimed] = useState(false);
  const [enrolled, setEnrolled] = useState(null); // count from plan_pool_enrollment_count RPC
  const [conflictMsg, setConflictMsg] = useState(null);

  const linkedYearlyPlan = plan.yearly_plan_key ? allPlans?.find((p) => p.plan_key === plan.yearly_plan_key) : null;
  const [billing, setBilling] = useState('monthly'); // only meaningful when linkedYearlyPlan exists

  // The plan actually being shown/bought on this card — either the base
  // plan, or its linked yearly counterpart when the switch is set to yearly.
  const displayPlan = linkedYearlyPlan && billing === 'yearly' ? linkedYearlyPlan : plan;

  useEffect(() => {
    if (!displayPlan.capacity && !displayPlan.min_enrollment) return;
    supabase
      .rpc('plan_pool_enrollment_count', { p_plan_key: displayPlan.plan_key })
      .then(({ data }) => setEnrolled(typeof data === 'number' ? data : null));
  }, [displayPlan.plan_key, displayPlan.capacity, displayPlan.min_enrollment]);

  useEffect(() => {
    if (!conflictMsg) return;
    const t = setTimeout(() => setConflictMsg(null), 4000);
    return () => clearTimeout(t);
  }, [conflictMsg]);

  const isFree = displayPlan.price_paise === 0;
  const inCart = items.some((i) => i.plan_key === displayPlan.plan_key);
  const isFull = enrolled != null && displayPlan.capacity != null && displayPlan.capacity - enrolled <= 0;
  const hasDiscount = displayPlan.compare_at_price_paise > displayPlan.price_paise;
  const discountPct = hasDiscount
    ? Math.round((1 - displayPlan.price_paise / displayPlan.compare_at_price_paise) * 100)
    : null;

  const includedNames =
    displayPlan.is_bundle && displayPlan.bundle_plan_keys
      ? displayPlan.bundle_plan_keys.map((key) => allPlans?.find((p) => p.plan_key === key)?.name || key)
      : [];

  const dealEndsSoon =
    displayPlan.available_to &&
    new Date(displayPlan.available_to) - Date.now() < 3 * 86400000 &&
    new Date(displayPlan.available_to) > Date.now();

  const handleClaim = async () => {
    setClaiming(true);
    setClaimError(null);
    try {
      const { error } = await supabase.rpc('claim_free_plan', { p_plan_key: displayPlan.plan_key });
      if (error) throw error;
      setClaimed(true);
      onClaimed?.();
    } catch (err) {
      setClaimError(err.message);
    } finally {
      setClaiming(false);
    }
  };

  const handleAddToCart = () => {
    addItem(displayPlan, {
      onConflict: () =>
        setConflictMsg(
          'You can only hold one mentorship plan at a time. Remove your current plan from the cart first — or wait for it to expire if you already own one.'
        ),
    });
  };

  return (
    <div
      className={`flex flex-col rounded-2xl border p-6 ${
        displayPlan.is_bundle ? 'border-violet/40 bg-panel shadow-glow' : 'border-line bg-panel'
      }`}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {isFree && (
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber/15 px-2.5 py-1 text-[11px] font-medium text-amber">
            <Gift size={12} /> Free
          </div>
        )}
        {hasDiscount && (
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber/15 px-2.5 py-1 text-[11px] font-medium text-amber">
            <Tag size={12} /> {discountPct}% off
          </div>
        )}
        {displayPlan.is_bundle && (
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-violet/15 px-2.5 py-1 text-[11px] font-medium text-lavender">
            <Package size={12} /> Bundle
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              isFree ? 'bg-amber/15 text-amber' : 'bg-violet/15 text-lavender'
            }`}
          >
            {displayPlan.is_bundle ? <Package size={17} /> : displayPlan.is_group ? <Users size={17} /> : <User size={17} />}
          </div>
          <div>
            <div className="font-display font-semibold text-white">
              {linkedYearlyPlan ? plan.name.replace(/\s*\(.*?\)\s*$/, '') : displayPlan.name}
            </div>
            {displayPlan.tagline && <div className="text-xs text-white/45">{displayPlan.tagline}</div>}
          </div>
        </div>

        {linkedYearlyPlan && (
          <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-line bg-base p-0.5 text-[11px] font-medium">
            <button
              onClick={() => setBilling('monthly')}
              className={`rounded-full px-2.5 py-1 transition ${billing === 'monthly' ? 'bg-violet text-white' : 'text-white/50'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`rounded-full px-2.5 py-1 transition ${billing === 'yearly' ? 'bg-violet text-white' : 'text-white/50'}`}
            >
              Yearly
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        {hasDiscount && (
          <span className="text-sm text-white/30 line-through">
            ₹{(displayPlan.compare_at_price_paise / 100).toLocaleString('en-IN')}
          </span>
        )}
        <span className={`font-display text-3xl font-bold ${isFree ? 'text-amber' : 'text-white'}`}>
          {isFree ? 'Free' : `₹${(displayPlan.price_paise / 100).toLocaleString('en-IN')}`}
        </span>
        {!isFree && (
          <span className="text-sm text-white/40">
            /{displayPlan.billing_period === 'monthly' ? 'mo' : displayPlan.billing_period === 'yearly' ? 'yr' : 'session'}
          </span>
        )}
      </div>

      {dealEndsSoon && (
        <p className="mt-1.5 text-[11px] font-medium text-amber">
          Deal ends {new Date(displayPlan.available_to).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </p>
      )}

      {enrolled != null && displayPlan.min_enrollment && enrolled < displayPlan.min_enrollment && (
        <div className="mt-3 rounded-lg border border-amber/30 bg-amber/10 px-3 py-2 text-[11px] text-amber">
          {enrolled}/{displayPlan.min_enrollment} joined — batch starts once {displayPlan.min_enrollment} enroll
        </div>
      )}
      {enrolled != null && displayPlan.capacity && (
        <p className={`mt-2 text-[11px] font-medium ${displayPlan.capacity - enrolled <= 0 ? 'text-red-400' : 'text-white/40'}`}>
          {displayPlan.capacity - enrolled <= 0
            ? 'Full — check back soon'
            : `${displayPlan.capacity - enrolled} spot${displayPlan.capacity - enrolled === 1 ? '' : 's'} left`}
        </p>
      )}

      {displayPlan.is_bundle && includedNames.length > 0 && (
        <div className="mt-4 rounded-lg border border-line/70 bg-base/60 p-3">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-white/40">Includes</p>
          <ul className="space-y-1">
            {includedNames.map((n) => (
              <li key={n} className="flex items-start gap-2 text-sm text-white/70">
                <Check size={13} className="mt-0.5 shrink-0 text-lavender" /> {n}
              </li>
            ))}
          </ul>
        </div>
      )}

      {displayPlan.features?.length > 0 && (
        <ul className="mt-5 space-y-2">
          {displayPlan.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-white/60">
              <Check size={14} className={`mt-0.5 shrink-0 ${isFree ? 'text-amber' : 'text-violet-soft'}`} />
              {f}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-6">
        {isFree ? (
          claimed ? (
            <div className="rounded-lg bg-emerald-500/15 py-2.5 text-center text-sm font-semibold text-emerald-400">
              Claimed! Check your dashboard →
            </div>
          ) : (
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="w-full rounded-lg bg-amber py-2.5 text-sm font-semibold text-base transition hover:bg-amber/90 disabled:opacity-50"
            >
              {claiming ? 'Claiming…' : 'Claim for free'}
            </button>
          )
        ) : (
          <button
            onClick={handleAddToCart}
            disabled={inCart || isFull}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet py-2.5 text-sm font-semibold text-white transition hover:bg-violet-soft disabled:opacity-60"
          >
            <ShoppingCart size={14} /> {isFull ? 'Full — check back soon' : inCart ? 'In cart' : 'Add to cart'}
          </button>
        )}
        {claimError && <p className="mt-2 text-xs text-red-400">{claimError}</p>}
        {conflictMsg && <p className="mt-2 text-xs text-amber">{conflictMsg}</p>}
      </div>
    </div>
  );
}
