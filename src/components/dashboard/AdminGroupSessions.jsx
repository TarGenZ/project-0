import { useEffect, useState } from 'react';
import { Plus, Trash2, Link2, Check, X, Users } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { SLOT_LABELS } from '../../lib/mentorshipLabels';

const GROUP_MONTHLY_SLOT = '19:00'; // fixed Sunday 7:00–7:40 PM, not editable

export default function AdminGroupSessions() {
  const [sessions, setSessions] = useState([]);
  const [groupPlans, setGroupPlans] = useState([]);
  const [enrollment, setEnrollment] = useState({}); // plan_key -> count, for cohort plans
  const [form, setForm] = useState({ plan_key: '', session_date: '', session_slot: '19:00', zoom_link: '', notes: '', capacity: '50' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editLink, setEditLink] = useState('');
  const [savingLink, setSavingLink] = useState(false);

  const selectedPlan = groupPlans.find((p) => p.plan_key === form.plan_key);
  const isRecurringCohort = selectedPlan && (selectedPlan.billing_period === 'monthly' || selectedPlan.billing_period === 'yearly');

  useEffect(() => {
    supabase
      .from('group_sessions')
      .select('*')
      .order('session_date', { ascending: true })
      .then(({ data }) => setSessions(data || []));

    // Any plan with schedule_type = 'admin_sets' needs its sessions
    // scheduled here — free or paid, single or recurring, whatever
    // plan_key was given on the Plans tab.
    supabase
      .from('plans')
      .select('plan_key, name, billing_period, is_active, capacity, min_enrollment')
      .eq('product', 'mentorship')
      .eq('schedule_type', 'admin_sets')
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        const plans = data || [];
        setGroupPlans(plans);
        if (plans.length > 0) {
          setForm((f) => (f.plan_key ? f : { ...f, plan_key: plans[0].plan_key }));
        }
        // enrollment counts, for cohort (monthly/yearly) plans only
        plans
          .filter((p) => p.billing_period === 'monthly' || p.billing_period === 'yearly')
          .forEach((p) => {
            supabase
              .rpc('plan_pool_enrollment_count', { p_plan_key: p.plan_key })
              .then(({ data: count }) => setEnrollment((e) => ({ ...e, [p.plan_key]: count })));
          });
      });
  }, []);

  // Recurring cohort (monthly/yearly group) plans are always Sunday, always
  // 7:00–7:40 PM — lock the slot and steer the date picker to Sundays.
  // One-time batches are fully flexible: Arpan picks any date and any time.
  useEffect(() => {
    if (isRecurringCohort) {
      setForm((f) => ({ ...f, session_slot: GROUP_MONTHLY_SLOT }));
    }
  }, [isRecurringCohort]);

  const add = async () => {
    if (!form.session_date || !form.session_slot || !form.plan_key) return;
    setError(null);
    if (isRecurringCohort && new Date(form.session_date).getDay() !== 0) {
      setError('Group cohort sessions are Sundays only.');
      return;
    }
    setSaving(true);
    const payload = {
      plan_key: form.plan_key,
      session_date: form.session_date,
      session_slot: form.session_slot,
      zoom_link: form.zoom_link || null,
      notes: form.notes || null,
      capacity: form.capacity ? Number(form.capacity) : 50,
    };
    const { data, error: err } = await supabase.from('group_sessions').insert(payload).select().single();
    if (err) {
      setError(err.message);
    } else if (data) {
      setSessions((s) => [...s, data]);
      setForm((f) => ({ ...f, session_date: '', zoom_link: '', notes: '' }));
    }
    setSaving(false);
  };

  const remove = async (id) => {
    await supabase.from('group_sessions').delete().eq('id', id);
    setSessions((s) => s.filter((x) => x.id !== id));
  };

  const startEditLink = (s) => {
    setEditingId(s.id);
    setEditLink(s.zoom_link || '');
  };

  const cancelEditLink = () => {
    setEditingId(null);
    setEditLink('');
  };

  const saveLink = async (id) => {
    setSavingLink(true);
    const { data, error: err } = await supabase
      .from('group_sessions')
      .update({ zoom_link: editLink.trim() || null })
      .eq('id', id)
      .select()
      .single();
    if (!err && data) {
      setSessions((s) => s.map((x) => (x.id === id ? data : x)));
      setEditingId(null);
      setEditLink('');
    }
    setSavingLink(false);
  };

  const planName = (key) => groupPlans.find((p) => p.plan_key === key)?.name || key;
  const timeLabel = (slot) => {
    if (SLOT_LABELS[slot]) return SLOT_LABELS[slot];
    const [h, m] = slot.split(':').map(Number);
    if (Number.isNaN(h)) return slot;
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  };

  return (
    <div>
      {groupPlans.some((p) => p.billing_period === 'monthly' || p.billing_period === 'yearly') && (
        <div className="mb-4 flex flex-wrap gap-3">
          {groupPlans
            .filter((p) => p.billing_period === 'monthly' || p.billing_period === 'yearly')
            .map((p) => (
              <div key={p.plan_key} className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-xs">
                <Users size={13} className="text-lavender" />
                <span className="text-white/70">{p.name}:</span>
                <span className="font-semibold text-white">
                  {enrollment[p.plan_key] ?? '…'}{p.capacity ? `/${p.capacity}` : ''} enrolled
                </span>
                {p.min_enrollment != null && enrollment[p.plan_key] != null && enrollment[p.plan_key] < p.min_enrollment && (
                  <span className="text-amber">· needs {p.min_enrollment - enrollment[p.plan_key]} more to start</span>
                )}
              </div>
            ))}
        </div>
      )}

      <div className="rounded-2xl border border-line bg-panel p-5">
        <div className="mb-3 text-sm font-semibold text-white">Add new group session</div>
        {groupPlans.length === 0 ? (
          <p className="text-sm text-white/40">
            No group plans yet. Create one on the Plans tab first — set "Scheduling" to "Admin sets the date
            (group sessions)" — then come back here to schedule its sessions.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-white/45">Plan</label>
                <select
                  value={form.plan_key}
                  onChange={(e) => setForm((f) => ({ ...f, plan_key: e.target.value }))}
                  className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white"
                >
                  {groupPlans.map((p) => (
                    <option key={p.plan_key} value={p.plan_key}>
                      {p.name} {!p.is_active && '(inactive)'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/45">
                  Date {isRecurringCohort && <span className="text-white/30">(Sundays only)</span>}
                </label>
                <input
                  type="date"
                  value={form.session_date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setForm((f) => ({ ...f, session_date: e.target.value }))}
                  className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/45">Time</label>
                {isRecurringCohort ? (
                  <div className="flex h-[38px] items-center rounded-lg border border-line bg-base px-3 text-sm text-white/50">
                    7:00 – 7:40 PM (fixed)
                  </div>
                ) : (
                  <input
                    type="time"
                    value={form.session_slot}
                    onChange={(e) => setForm((f) => ({ ...f, session_slot: e.target.value }))}
                    className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white"
                  />
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/45">Capacity</label>
                <input
                  type="number"
                  min="1"
                  value={form.capacity}
                  onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                  className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <label className="mb-1 block text-xs text-white/45">Zoom link (optional now, can add later)</label>
                <input
                  type="url"
                  placeholder="https://zoom.us/j/..."
                  value={form.zoom_link}
                  onChange={(e) => setForm((f) => ({ ...f, zoom_link: e.target.value }))}
                  className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white placeholder:text-white/25"
                />
              </div>
            </div>
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
            <button
              onClick={add}
              disabled={saving}
              className="mt-3 flex items-center gap-1.5 rounded-lg bg-violet px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-soft disabled:opacity-50"
            >
              <Plus size={14} /> {saving ? 'Saving…' : 'Add session'}
            </button>
          </>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {sessions.length === 0 && <p className="text-sm text-white/35">No sessions scheduled yet.</p>}
        {sessions.map((s) => (
          <div key={s.id} className="rounded-xl border border-line bg-panel px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-violet/15 px-2.5 py-1 text-[11px] font-medium text-lavender">
                {planName(s.plan_key)}
              </span>
              <div className="flex-1">
                <div className="text-sm text-white">
                  {new Date(s.session_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                <div className="text-xs text-white/40">
                  {timeLabel(s.session_slot)} {s.capacity ? `· cap ${s.capacity}` : ''}
                </div>
              </div>
              {editingId !== s.id && (
                <button
                  onClick={() => startEditLink(s)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition ${
                    s.zoom_link
                      ? 'border-line text-white/60 hover:text-white'
                      : 'border-amber-500/40 text-amber-400 hover:border-amber-500/70'
                  }`}
                >
                  <Link2 size={12} /> {s.zoom_link ? 'Edit link' : 'Add link'}
                </button>
              )}
              <button onClick={() => remove(s.id)} className="text-white/30 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>

            {editingId === s.id && (
              <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
                <input
                  autoFocus
                  type="url"
                  placeholder="https://zoom.us/j/..."
                  value={editLink}
                  onChange={(e) => setEditLink(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveLink(s.id)}
                  className="flex-1 rounded-lg border border-line bg-base px-3 py-1.5 text-sm text-white placeholder:text-white/25"
                />
                <button
                  onClick={() => saveLink(s.id)}
                  disabled={savingLink}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet text-white transition hover:bg-violet-soft disabled:opacity-50"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={cancelEditLink}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-white/50 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {editingId !== s.id && s.zoom_link && (
              <div className="mt-1 truncate pl-[52px] text-xs text-white/30">{s.zoom_link}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
