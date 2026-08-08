import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Star } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient.js';

const T = 'explorer_colleges';

const RATING_PARAMS = [
  { key: 'rating_location',     label: 'Location',     weight: 0.08 },
  { key: 'rating_roi',          label: 'ROI',          weight: 0.15 },
  { key: 'rating_fees',         label: 'Fees Value',   weight: 0.10 },
  { key: 'rating_facilities',   label: 'Facilities',   weight: 0.12 },
  { key: 'rating_faculty',      label: 'Faculty',      weight: 0.13 },
  { key: 'rating_campus',       label: 'Campus',       weight: 0.06 },
  { key: 'rating_hostel',       label: 'Hostel',       weight: 0.05 },
  { key: 'rating_patient_load', label: 'Patient Load', weight: 0.13 },
  { key: 'rating_research',     label: 'Research',     weight: 0.09 },
  { key: 'rating_placement',    label: 'Placement',    weight: 0.09 },
];

function computeFinalRating(college) {
  let sum = 0, total = 0;
  for (const p of RATING_PARAMS) {
    const v = college[p.key];
    if (v == null || v === '') continue;
    sum += Number(v) * p.weight; total += p.weight;
  }
  if (!total) return 0;
  return Math.round((sum / total) * 10) / 10;
}

const BLANK = {
  name: '', city: '', state: '', year_established: '', type: 'government',
  govt_subcategory: 'central', total_seats: '', annual_fees: '', about: '', worthness: '',
  ...RATING_PARAMS.reduce((a, p) => ({ ...a, [p.key]: 5 }), {}),
};

function CollegeForm({ college, onSave, onCancel }) {
  const [form, setForm] = useState(() => {
    const base = college ? { ...college } : { ...BLANK };
    if (!base.govt_subcategory) base.govt_subcategory = 'central';
    return { ...base, final_rating: computeFinalRating(base) };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(prev => {
    const next = { ...prev, [k]: v };
    next.final_rating = computeFinalRating(next);
    return next;
  });

  const handleSave = async () => {
    if (!form.name.trim()) { setError('College name is required.'); return; }
    setSaving(true); setError('');
    const payload = { ...form, final_rating: computeFinalRating(form) };
    const query = college?.id
      ? supabase.from(T).update(payload).eq('id', college.id).select().single()
      : supabase.from(T).insert(payload).select().single();
    const { error: err } = await query;
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSave();
  };

  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-white">{college ? 'Edit' : 'Add'} College</p>
        <button onClick={onCancel} className="text-white/40 hover:text-white"><X size={16} /></button>
      </div>

      {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-white/45">College Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="e.g. AIIMS New Delhi"
            className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white placeholder:text-white/25" />
        </div>
        {[
          { k: 'city',             label: 'City',              ph: 'New Delhi' },
          { k: 'state',            label: 'State',             ph: 'Delhi' },
          { k: 'year_established', label: 'Year Established',  ph: '1956', type: 'number' },
          { k: 'total_seats',      label: 'MBBS Seats',        ph: '100',  type: 'number' },
          { k: 'annual_fees',      label: 'Annual Fees (₹)',   ph: '1628', type: 'number' },
        ].map(({ k, label, ph, type }) => (
          <div key={k}>
            <label className="mb-1 block text-xs text-white/45">{label}</label>
            <input value={form[k]} onChange={e => set(k, e.target.value)}
              placeholder={ph} type={type || 'text'}
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white placeholder:text-white/25" />
          </div>
        ))}
        <div>
          <label className="mb-1 block text-xs text-white/45">Type</label>
          <select value={form.type} onChange={e => set('type', e.target.value)}
            className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white">
            <option value="government">Government</option>
            <option value="private">Private</option>
            <option value="deemed">Deemed</option>
          </select>
        </div>
        {form.type === 'government' && (
          <div>
            <label className="mb-1 block text-xs text-white/45">Subcategory</label>
            <select value={form.govt_subcategory || 'central'} onChange={e => set('govt_subcategory', e.target.value)}
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white">
              <option value="central">Central</option>
              <option value="state">State</option>
            </select>
          </div>
        )}
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-white/45">About</label>
          <textarea value={form.about || ''} onChange={e => set('about', e.target.value)} rows={3}
            placeholder="History, affiliations, campus life, notable alumni…"
            className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white placeholder:text-white/25 resize-y" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-white/45">Is it worth it? (Admin note)</label>
          <textarea value={form.worthness || ''} onChange={e => set('worthness', e.target.value)} rows={2}
            placeholder="Honest assessment of this college…"
            className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white placeholder:text-white/25 resize-y" />
        </div>
      </div>

      {/* Rating sliders */}
      <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Rating Parameters (0–10)</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {RATING_PARAMS.map(p => (
          <div key={p.key}>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs text-white/45">{p.label} <span className="text-white/25">({Math.round(p.weight * 100)}%)</span></label>
              <span className="font-mono text-xs text-violet">{Number(form[p.key]).toFixed(1)}</span>
            </div>
            <input type="range" min="0" max="10" step="0.1"
              value={form[p.key]}
              onChange={e => set(p.key, parseFloat(e.target.value))}
              className="w-full accent-violet" />
          </div>
        ))}
        {/* Final rating display */}
        <div className="sm:col-span-2 rounded-lg border border-line bg-base px-4 py-3 flex items-center gap-3">
          <Star size={14} className="text-amber flex-shrink-0" />
          <span className="text-xs text-white/45">Final Rating (auto-calculated)</span>
          <span className="ml-auto font-mono text-xl font-bold text-amber">{Number(form.final_rating).toFixed(1)}</span>
          <span className="text-xs text-white/30">/ 10</span>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-violet px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-soft disabled:opacity-50">
          <Plus size={14} /> {saving ? 'Saving…' : college ? 'Save changes' : 'Add College'}
        </button>
        <button onClick={onCancel}
          className="flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-xs text-white/60 hover:text-white">
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  );
}

export default function AdminCutoffColleges() {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | college object
  const [adding, setAdding] = useState(false);

  const load = () => {
    setLoading(true);
    supabase.from(T).select('*').order('final_rating', { ascending: false })
      .then(({ data }) => { setColleges(data || []); setLoading(false); });
  };

  useEffect(load, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this college and all its quotas / cutoff data? This cannot be undone.')) return;
    await supabase.from(T).delete().eq('id', id);
    setColleges(cs => cs.filter(c => c.id !== id));
  };

  const TYPE_COLORS = { government: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30', private: 'text-sky-400 bg-sky-400/10 border-sky-400/30', deemed: 'text-purple-400 bg-purple-400/10 border-purple-400/30' };

  if (adding || editing) {
    return (
      <CollegeForm
        college={editing}
        onSave={() => { setAdding(false); setEditing(null); load(); }}
        onCancel={() => { setAdding(false); setEditing(null); }}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-white/40">{colleges.length} colleges in database</p>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-lg bg-violet px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-soft">
          <Plus size={14} /> Add College
        </button>
      </div>

      <div className="space-y-2">
        {loading && <p className="text-sm text-white/35">Loading…</p>}
        {!loading && colleges.length === 0 && <p className="text-sm text-white/35">No colleges yet — add one above.</p>}
        {colleges.map(c => (
          <div key={c.id} className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${TYPE_COLORS[c.type] || TYPE_COLORS.government}`}>
                  {c.type}
                </span>
                <p className="text-sm font-medium text-white">{c.name}</p>
              </div>
              <p className="mt-0.5 text-xs text-white/40">{[c.city, c.state].filter(Boolean).join(', ')}</p>
            </div>
            <span className="font-mono text-sm font-bold text-amber flex-shrink-0">{Number(c.final_rating).toFixed(1)}</span>
            <button onClick={() => setEditing(c)} className="text-white/40 hover:text-white flex-shrink-0"><Pencil size={14} /></button>
            <button onClick={() => handleDelete(c.id)} className="text-white/30 hover:text-red-400 flex-shrink-0"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
