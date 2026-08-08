import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, X, Check, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const CLASS_LEVELS = [
  { key: 'all', label: 'All years' },
  { key: '11th', label: 'Class 11' },
  { key: '12th', label: 'Class 12' },
  { key: 'drop', label: 'Dropper' },
];

const BLANK_FORM = { subject: '', class_level: 'all', title: '', source_url: '', sort_order: '0' };

/**
 * These are link-only, on purpose — we never store or rehost a copy of an
 * NCERT PDF. Every entry just points at NCERT's own official PDF URL
 * (ncert.nic.in/textbook/pdf/...), so there's nothing here that could be
 * construed as unauthorised redistribution the way rehosting on Drive
 * behind a paywall was. The public page is /free-resources — no login,
 * no purchase, genuinely free for anyone who lands on it.
 */
export default function AdminFreeResources() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(BLANK_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = () => {
    supabase
      .from('free_resources')
      .select('*')
      .order('subject', { ascending: true })
      .order('sort_order', { ascending: true })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        setItems(data || []);
        setLoading(false);
      });
  };

  useEffect(load, []);

  const resetForm = () => {
    setForm(BLANK_FORM);
    setEditingId(null);
  };

  const startEdit = (r) => {
    setEditingId(r.id);
    setForm({
      subject: r.subject,
      class_level: r.class_level || 'all',
      title: r.title,
      source_url: r.source_url,
      sort_order: String(r.sort_order ?? 0),
    });
  };

  const save = async () => {
    setError(null);
    if (!form.subject.trim() || !form.title.trim() || !form.source_url.trim()) {
      setError('Subject, title and the NCERT PDF link are required.');
      return;
    }
    try {
      new URL(form.source_url.trim());
    } catch {
      setError('That doesn\'t look like a valid URL — paste the full link, e.g. https://ncert.nic.in/textbook/pdf/kebo108.pdf');
      return;
    }
    setSaving(true);
    const payload = {
      subject: form.subject.trim(),
      class_level: form.class_level,
      title: form.title.trim(),
      source_url: form.source_url.trim(),
      sort_order: Number(form.sort_order) || 0,
    };

    const query = editingId
      ? supabase.from('free_resources').update(payload).eq('id', editingId).select().single()
      : supabase.from('free_resources').insert(payload).select().single();

    const { data, error: err } = await query;
    if (err) {
      setError(err.message);
    } else if (data) {
      setItems((rs) => (editingId ? rs.map((x) => (x.id === editingId ? data : x)) : [...rs, data]));
      resetForm();
    }
    setSaving(false);
  };

  const remove = async (id) => {
    if (!confirm('Remove this link? This cannot be undone.')) return;
    await supabase.from('free_resources').delete().eq('id', id);
    setItems((rs) => rs.filter((r) => r.id !== id));
  };

  const toggleActive = async (r) => {
    const { data } = await supabase
      .from('free_resources')
      .update({ is_active: !r.is_active })
      .eq('id', r.id)
      .select()
      .single();
    if (data) setItems((rs) => rs.map((x) => (x.id === r.id ? data : x)));
  };

  return (
    <div>
      <p className="mb-4 text-xs text-white/40">
        Every entry here should link to NCERT's own official PDF (ncert.nic.in) — never a Drive copy or any other
        rehosted file. That's what keeps this page copyright-safe.
      </p>

      <div className="rounded-2xl border border-line bg-panel p-5">
        <div className="mb-3 text-sm font-semibold text-white">{editingId ? 'Edit link' : 'Add NCERT chapter link'}</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-white/45">Subject</label>
            <input
              type="text"
              placeholder="Biology"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white placeholder:text-white/25"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/45">Class</label>
            <select
              value={form.class_level}
              onChange={(e) => setForm((f) => ({ ...f, class_level: e.target.value }))}
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white"
            >
              {CLASS_LEVELS.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/45">Sort order</label>
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/45">&nbsp;</label>
            <div className="flex h-[38px] items-center text-[11px] text-white/30">Lower = shown first</div>
          </div>
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="mb-1 block text-xs text-white/45">Chapter title</label>
            <input
              type="text"
              placeholder="Ch 8 — Cell: The Unit of Life"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white placeholder:text-white/25"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="mb-1 block text-xs text-white/45">Official NCERT PDF link</label>
            <input
              type="text"
              placeholder="https://ncert.nic.in/textbook/pdf/kebo108.pdf"
              value={form.source_url}
              onChange={(e) => setForm((f) => ({ ...f, source_url: e.target.value }))}
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white placeholder:text-white/25"
            />
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-violet px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-soft disabled:opacity-50"
          >
            <Plus size={14} /> {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add link'}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-xs text-white/60 hover:text-white"
            >
              <X size={14} /> Cancel
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {loading && <p className="text-sm text-white/35">Loading…</p>}
        {!loading && items.length === 0 && <p className="text-sm text-white/35">No links added yet.</p>}
        {items.map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-violet/15 px-2 py-0.5 text-[11px] text-lavender">{r.subject}</span>
                {r.class_level !== 'all' && (
                  <span className="rounded-full border border-line px-2 py-0.5 text-[10px] text-white/40">
                    {CLASS_LEVELS.find((c) => c.key === r.class_level)?.label}
                  </span>
                )}
                {!r.is_active && (
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/40">hidden</span>
                )}
              </div>
              <p className="mt-1 truncate text-sm text-white">{r.title}</p>
              <a
                href={r.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 truncate text-xs text-white/30 hover:text-lavender"
              >
                {r.source_url} <ExternalLink size={10} className="flex-shrink-0" />
              </a>
            </div>
            <button
              onClick={() => toggleActive(r)}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition ${
                r.is_active ? 'border-line text-white/60 hover:text-white' : 'border-green-500/40 text-green-400'
              }`}
            >
              <Check size={12} /> {r.is_active ? 'Hide' : 'Show'}
            </button>
            <button onClick={() => startEdit(r)} className="text-white/40 hover:text-white">
              <Pencil size={14} />
            </button>
            <button onClick={() => remove(r.id)} className="text-white/30 hover:text-red-400">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
