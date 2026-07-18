import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Gift, Power, Pencil, X, Package, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const BLANK_FORM = {
  product: 'mentorship',
  plan_key: '',
  name: '',
  tagline: '',
  features: '',
  price_paise: '',
  compare_at_price: '', // rupees — "was" price for slashed pricing, blank = no discount shown
  billing_period: 'one_time',
  duration_days: '',
  fixed_expiry_date: '', // date string, blank = use duration_days instead. Overrides it when set.
  schedule_type: 'pick_date',
  is_group: false,
  max_redemptions: '',
  available_from: '', // datetime-local string, blank = available immediately
  available_to: '', // datetime-local string, blank = available forever
  is_bundle: false,
  bundle_plan_keys: [],
  capacity: '', // blank = uncapped. Meaning depends on plan type — see AdminPlans capacity field hint.
  min_enrollment: '', // group cohort plans only — batch doesn't "start" until this many join (informational, doesn't block purchases)
  yearly_plan_key: '', // monthly plans only — links to a yearly plan_key to render as a Monthly/Yearly switch on one card
};

// datetime-local inputs want "YYYY-MM-DDTHH:mm" in LOCAL time, not ISO/UTC.
function toLocalInputValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(BLANK_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = () => {
    supabase
      .from('plans')
      .select('*')
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        setPlans(data || []);
        setLoading(false);
      });
  };

  useEffect(load, []);

  const isEditing = editingId !== null;

  // Plans available to pack into a bundle: not bundles themselves (no
  // nesting), and not the bundle currently being edited.
  const bundleCandidates = useMemo(
    () => plans.filter((p) => !p.is_bundle && p.id !== editingId),
    [plans, editingId]
  );

  const resetForm = () => {
    setForm(BLANK_FORM);
    setEditingId(null);
  };

  const applyFreeSessionPreset = () => {
    setForm({
      ...BLANK_FORM,
      plan_key: `free_session_${Date.now().toString(36)}`,
      name: 'Free Mentorship Session',
      tagline: 'On the house — limited spots',
      features: 'One-time 1-on-1 Zoom session\nPersonalised strategy & doubt-clearing',
      price_paise: '0',
      billing_period: 'one_time',
      schedule_type: 'pick_date',
      max_redemptions: '10',
    });
    setEditingId(null);
  };

  const startEdit = (plan) => {
    setForm({
      product: plan.product,
      plan_key: plan.plan_key,
      name: plan.name,
      tagline: plan.tagline || '',
      features: (plan.features || []).join('\n'),
      price_paise: plan.price_paise != null ? String(plan.price_paise / 100) : '',
      compare_at_price: plan.compare_at_price_paise != null ? String(plan.compare_at_price_paise / 100) : '',
      billing_period: plan.billing_period,
      duration_days: plan.duration_days != null ? String(plan.duration_days) : '',
      fixed_expiry_date: plan.fixed_expiry_date ? plan.fixed_expiry_date.slice(0, 10) : '',
      schedule_type: plan.schedule_type,
      is_group: !!plan.is_group,
      max_redemptions: plan.max_redemptions != null ? String(plan.max_redemptions) : '',
      available_from: toLocalInputValue(plan.available_from),
      available_to: toLocalInputValue(plan.available_to),
      is_bundle: !!plan.is_bundle,
      bundle_plan_keys: plan.bundle_plan_keys || [],
      capacity: plan.capacity != null ? String(plan.capacity) : '',
      min_enrollment: plan.min_enrollment != null ? String(plan.min_enrollment) : '',
      yearly_plan_key: plan.yearly_plan_key || '',
    });
    setEditingId(plan.id);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleBundleItem = (planKey) => {
    setForm((f) => ({
      ...f,
      bundle_plan_keys: f.bundle_plan_keys.includes(planKey)
        ? f.bundle_plan_keys.filter((k) => k !== planKey)
        : [...f.bundle_plan_keys, planKey],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (form.is_bundle && form.bundle_plan_keys.length === 0) {
        throw new Error('Select at least one plan to include in the bundle.');
      }

      const payload = {
        product: form.product,
        plan_key: form.plan_key.trim(),
        name: form.name.trim(),
        tagline: form.tagline.trim() || null,
        features: form.features
          .split('\n')
          .map((f) => f.trim())
          .filter(Boolean),
        price_paise: Math.round(Number(form.price_paise) * 100) || 0,
        compare_at_price_paise: form.compare_at_price ? Math.round(Number(form.compare_at_price) * 100) : null,
        billing_period: form.billing_period,
        duration_days: form.duration_days ? Number(form.duration_days) : null,
        fixed_expiry_date: form.fixed_expiry_date ? new Date(`${form.fixed_expiry_date}T23:59:59`).toISOString() : null,
        schedule_type: form.schedule_type,
        is_group: form.is_group,
        max_redemptions: form.max_redemptions ? Number(form.max_redemptions) : null,
        available_from: form.available_from ? new Date(form.available_from).toISOString() : null,
        available_to: form.available_to ? new Date(form.available_to).toISOString() : null,
        is_bundle: form.is_bundle,
        bundle_plan_keys: form.is_bundle ? form.bundle_plan_keys : null,
        capacity: form.capacity ? Number(form.capacity) : null,
        min_enrollment: form.min_enrollment ? Number(form.min_enrollment) : null,
        yearly_plan_key: form.billing_period === 'monthly' && form.yearly_plan_key ? form.yearly_plan_key : null,
      };

      if (
        payload.compare_at_price_paise != null &&
        payload.compare_at_price_paise <= payload.price_paise
      ) {
        throw new Error('The "was" price must be higher than the current price for a discount to show.');
      }
      if (
        payload.available_from &&
        payload.available_to &&
        new Date(payload.available_from) >= new Date(payload.available_to)
      ) {
        throw new Error('"Available from" must be before "available to".');
      }

      const { error: err } = isEditing
        ? await supabase.from('plans').update(payload).eq('id', editingId)
        : await supabase.from('plans').insert(payload);
      if (err) throw err;

      resetForm();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (plan) => {
    await supabase.from('plans').update({ is_active: !plan.is_active }).eq('id', plan.id);
    load();
  };

  const remove = async (plan) => {
    if (!confirm(`Delete "${plan.name}"? This can't be undone.`)) return;
    await supabase.from('plans').delete().eq('id', plan.id);
    if (editingId === plan.id) resetForm();
    load();
  };

  const discountPct =
    form.compare_at_price && form.price_paise
      ? Math.round((1 - Number(form.price_paise) / Number(form.compare_at_price)) * 100)
      : null;

  return (
    <div>
      <form onSubmit={handleSave} className="rounded-2xl border border-line bg-panel p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-white">
            {isEditing ? `Editing "${form.name || form.plan_key}"` : 'Create a new plan'}
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                type="button"
                onClick={applyFreeSessionPreset}
                className="flex items-center gap-1.5 rounded-lg border border-amber/40 bg-amber/10 px-3 py-1.5 text-xs font-medium text-amber transition hover:bg-amber/20"
              >
                <Gift size={13} /> Free session preset
              </button>
            )}
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-white/60 transition hover:text-white"
              >
                <X size={13} /> Cancel edit
              </button>
            )}
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-lg border border-line bg-base px-3 py-2.5">
          <input
            type="checkbox"
            id="is_bundle"
            checked={form.is_bundle}
            onChange={(e) => setForm((f) => ({ ...f, is_bundle: e.target.checked }))}
            className="h-4 w-4 rounded border-line"
          />
          <label htmlFor="is_bundle" className="flex items-center gap-1.5 text-sm text-white/70">
            <Package size={14} /> This is a bundle of other plans
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Plan key (unique)">
            <input
              required
              disabled={isEditing}
              value={form.plan_key}
              onChange={(e) => setForm((f) => ({ ...f, plan_key: e.target.value }))}
              placeholder="e.g. personal_session"
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white placeholder:text-white/25 disabled:opacity-50"
            />
          </Field>
          <Field label="Product">
            <select
              value={form.product}
              onChange={(e) => setForm((f) => ({ ...f, product: e.target.value }))}
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white"
            >
              <option value="mentorship">Mentorship</option>
              {form.is_bundle && <option value="bundle">Bundle (mixed)</option>}
            </select>
          </Field>
          <Field label="Name">
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white"
            />
          </Field>
          <Field label="Tagline">
            <input
              value={form.tagline}
              onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white"
            />
          </Field>
          <Field label="Price (₹, 0 = free)">
            <input
              type="number"
              min="0"
              step="1"
              required
              value={form.price_paise}
              onChange={(e) => setForm((f) => ({ ...f, price_paise: e.target.value }))}
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white"
            />
          </Field>
          <Field label="Was price (₹, blank = no discount badge)">
            <input
              type="number"
              min="0"
              step="1"
              value={form.compare_at_price}
              onChange={(e) => setForm((f) => ({ ...f, compare_at_price: e.target.value }))}
              placeholder="e.g. 999"
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white placeholder:text-white/25"
            />
            {discountPct > 0 && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-amber">
                <Tag size={11} /> Shows as {discountPct}% off
              </p>
            )}
          </Field>
          <Field label="Billing period">
            <select
              value={form.billing_period}
              onChange={(e) => setForm((f) => ({ ...f, billing_period: e.target.value }))}
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white"
            >
              <option value="one_time">One-time</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </Field>
          {form.billing_period === 'monthly' && (
            <Field label="Yearly counterpart (adds a Monthly/Yearly switch on this card)">
              <select
                value={form.yearly_plan_key}
                onChange={(e) => setForm((f) => ({ ...f, yearly_plan_key: e.target.value }))}
                className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white"
              >
                <option value="">None — show as a standalone monthly plan</option>
                {plans
                  .filter((p) => p.billing_period === 'yearly' && !p.is_bundle && p.id !== editingId)
                  .map((p) => (
                    <option key={p.plan_key} value={p.plan_key}>
                      {p.name}
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-[11px] text-white/35">
                The yearly plan you pick here stops appearing as its own card and gets folded into
                this one behind a switch. Set its price/discount as usual on its own plan entry.
              </p>
            </Field>
          )}
          <Field label="Valid for (days after purchase, blank = no expiry)">
            <input
              type="number"
              min="1"
              value={form.duration_days}
              disabled={!!form.fixed_expiry_date}
              onChange={(e) => setForm((f) => ({ ...f, duration_days: e.target.value }))}
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white disabled:opacity-40"
            />
          </Field>
          <Field label="OR expires on a fixed date for everyone (e.g. exam day)">
            <input
              type="date"
              value={form.fixed_expiry_date}
              onChange={(e) => setForm((f) => ({ ...f, fixed_expiry_date: e.target.value }))}
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white"
            />
            {form.fixed_expiry_date && (
              <p className="mt-1 text-[11px] text-amber">Overrides "valid for X days" above — everyone who buys this expires on this date.</p>
            )}
          </Field>
          {!form.is_bundle && (
            <>
              <Field label="Scheduling">
                <select
                  value={form.schedule_type}
                  onChange={(e) => setForm((f) => ({ ...f, schedule_type: e.target.value }))}
                  className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white"
                >
                  <option value="pick_date">Student picks a one-off date</option>
                  <option value="pick_weekly">Student picks a recurring weekday</option>
                  <option value="admin_sets">Admin sets the date (group sessions)</option>
                </select>
              </Field>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="is_group"
                  checked={form.is_group}
                  onChange={(e) => setForm((f) => ({ ...f, is_group: e.target.checked }))}
                  className="h-4 w-4 rounded border-line"
                />
                <label htmlFor="is_group" className="text-sm text-white/60">
                  Group plan
                </label>
              </div>
            </>
          )}
          <Field label="Max free claims (blank = unlimited)">
            <input
              type="number"
              min="1"
              value={form.max_redemptions}
              onChange={(e) => setForm((f) => ({ ...f, max_redemptions: e.target.value }))}
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white"
            />
          </Field>
          <Field label="Available from (blank = immediately)">
            <input
              type="datetime-local"
              value={form.available_from}
              onChange={(e) => setForm((f) => ({ ...f, available_from: e.target.value }))}
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white"
            />
          </Field>
          <Field label="Available until (blank = forever)">
            <input
              type="datetime-local"
              value={form.available_to}
              onChange={(e) => setForm((f) => ({ ...f, available_to: e.target.value }))}
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white"
            />
          </Field>
          <Field label="Capacity (blank = uncapped)">
            <input
              type="number"
              min="1"
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
              placeholder="e.g. 7, 14, 50"
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white placeholder:text-white/25"
            />
            <p className="mt-1 text-[11px] text-white/35">
              Personal one-time/weekly: shared pool across every plan with the same scheduling type.
              Group monthly/yearly: shared pool across all group cohort plans. Group one-time: per-batch
              cap (set per batch in Group Sessions — this is just the default).
            </p>
          </Field>
          <Field label="Min. enrollment to start (group cohorts only, blank = no threshold)">
            <input
              type="number"
              min="1"
              value={form.min_enrollment}
              onChange={(e) => setForm((f) => ({ ...f, min_enrollment: e.target.value }))}
              placeholder="e.g. 20"
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white placeholder:text-white/25"
            />
            <p className="mt-1 text-[11px] text-white/35">
              Shown to buyers as "X/N joined — starts once N enroll." Doesn't block purchases past this
              number, only gates the batch actually starting.
            </p>
          </Field>
        </div>

        <Field label="Features (one per line)">
          <textarea
            value={form.features}
            onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))}
            rows={3}
            className="mt-1 w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white"
          />
        </Field>

        {form.is_bundle && (
          <div className="mt-3">
            <label className="mb-1.5 block text-xs text-white/45">
              Included plans ({form.bundle_plan_keys.length} selected)
            </label>
            {bundleCandidates.length === 0 ? (
              <p className="text-xs text-white/35">No other plans exist yet to bundle — create some first.</p>
            ) : (
              <div className="grid max-h-56 gap-1.5 overflow-y-auto rounded-lg border border-line bg-base p-2 sm:grid-cols-2">
                {bundleCandidates.map((p) => (
                  <label
                    key={p.plan_key}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-white/70 hover:bg-panel"
                  >
                    <input
                      type="checkbox"
                      checked={form.bundle_plan_keys.includes(p.plan_key)}
                      onChange={() => toggleBundleItem(p.plan_key)}
                      className="h-4 w-4 rounded border-line"
                    />
                    {p.name}{' '}
                    <span className="text-xs text-white/30">
                      ({p.price_paise === 0 ? 'free' : `₹${(p.price_paise / 100).toLocaleString('en-IN')}`})
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="mt-4 flex items-center gap-1.5 rounded-lg bg-violet px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-soft disabled:opacity-50"
        >
          {isEditing ? <Pencil size={14} /> : <Plus size={14} />}
          {saving ? 'Saving…' : isEditing ? 'Update plan' : 'Create plan'}
        </button>
      </form>

      <div className="mt-6 space-y-2">
        {loading ? (
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet border-t-transparent" />
        ) : (
          plans.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3">
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  p.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/10 text-white/40'
                }`}
              >
                {p.is_active ? 'active' : 'inactive'}
              </span>
              {p.is_bundle && (
                <span className="flex items-center gap-1 rounded-full bg-violet/15 px-2.5 py-1 text-[11px] font-medium text-lavender">
                  <Package size={11} /> bundle
                </span>
              )}
              <div className="flex-1">
                <div className="text-sm text-white">
                  {p.name} <span className="ml-1 text-xs text-white/30">{p.plan_key}</span>
                </div>
                <div className="text-xs text-white/40">
                  {p.price_paise === 0 ? 'Free' : `₹${(p.price_paise / 100).toLocaleString('en-IN')}`}
                  {p.compare_at_price_paise > p.price_paise && (
                    <span className="ml-1 text-amber">
                      (was ₹{(p.compare_at_price_paise / 100).toLocaleString('en-IN')})
                    </span>
                  )}{' '}
                  · {p.billing_period} · {p.schedule_type}
                  {p.max_redemptions ? ` · max ${p.max_redemptions} claims` : ''}
                  {p.fixed_expiry_date
                    ? ` · expires ${new Date(p.fixed_expiry_date).toLocaleDateString('en-IN')}`
                    : p.duration_days
                      ? ` · valid ${p.duration_days}d`
                      : ''}
                  {p.available_from && ` · from ${new Date(p.available_from).toLocaleDateString('en-IN')}`}
                  {p.available_to && ` · until ${new Date(p.available_to).toLocaleDateString('en-IN')}`}
                  {p.capacity ? ` · cap ${p.capacity}` : ''}
                  {p.min_enrollment ? ` · min ${p.min_enrollment} to start` : ''}
                  {p.yearly_plan_key ? ` · linked to yearly plan` : ''}
                </div>
              </div>
              <button onClick={() => startEdit(p)} className="text-white/40 hover:text-white" title="Edit">
                <Pencil size={14} />
              </button>
              <button onClick={() => toggleActive(p)} className="text-white/40 hover:text-white" title="Toggle active">
                <Power size={14} />
              </button>
              <button onClick={() => remove(p)} className="text-white/30 hover:text-red-400" title="Delete">
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-white/45">{label}</label>
      {children}
    </div>
  );
}
