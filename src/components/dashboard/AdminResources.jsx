import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, X, Check, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

// Notes / Short Notes / Mind Maps — see resource_files migration for the
// section check constraint. "Latest NCERT PDFs" used to be a section here
// too, but rehosting NCERT's copyrighted PDFs behind a paywall is a real
// infringement risk, so that content moved to the free, link-only
// /free-resources page instead (see AdminFreeResources.jsx) — it links
// straight to NCERT's own official PDFs rather than storing copies.
const SECTIONS = [
  { key: 'notes', label: 'Notes' },
  { key: 'short_notes', label: 'Short Notes' },
  { key: 'mind_maps', label: 'Mind Maps' },
];

const CLASS_LEVELS = [
  { key: 'all', label: 'All years' },
  { key: '11th', label: 'Class 11' },
  { key: '12th', label: 'Class 12' },
  { key: 'drop', label: 'Dropper' },
];

const BLANK_FORM = {
  section: 'notes',
  subject: '',
  class_level: 'all',
  title: '',
  description: '',
  drive_link: '', // full Drive URL or bare file id — extractDriveId() below handles both
  sort_order: '0',
};

// Accepts a full Drive share URL (.../file/d/FILE_ID/view, ?id=FILE_ID,
// /open?id=FILE_ID) or a bare file id typed/pasted directly.
function extractDriveId(input) {
  const s = (input || '').trim();
  const patterns = [/\/d\/([a-zA-Z0-9_-]{10,})/, /[?&]id=([a-zA-Z0-9_-]{10,})/];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) return m[1];
  }
  return s; // assume it's already a bare id
}

export default function AdminResources() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('notes');
  const [form, setForm] = useState(BLANK_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = () => {
    supabase
      .from('resource_files')
      .select('*')
      .order('section', { ascending: true })
      .order('subject', { ascending: true })
      .order('sort_order', { ascending: true })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        setFiles(data || []);
        setLoading(false);
      });
  };

  useEffect(load, []);

  const resetForm = () => {
    setForm({ ...BLANK_FORM, section: activeSection });
    setEditingId(null);
  };

  const startEdit = (f) => {
    setEditingId(f.id);
    setForm({
      section: f.section,
      subject: f.subject,
      class_level: f.class_level || 'all',
      title: f.title,
      description: f.description || '',
      drive_link: f.drive_file_id,
      sort_order: String(f.sort_order ?? 0),
    });
  };

  const save = async () => {
    setError(null);
    const driveId = extractDriveId(form.drive_link);
    if (!form.subject.trim() || !form.title.trim() || !driveId) {
      setError('Subject, title and a Drive link/file id are required.');
      return;
    }
    setSaving(true);
    const payload = {
      product: 'resources',
      section: form.section,
      subject: form.subject.trim(),
      class_level: form.class_level,
      title: form.title.trim(),
      description: form.description.trim() || null,
      drive_file_id: driveId,
      sort_order: Number(form.sort_order) || 0,
    };

    const query = editingId
      ? supabase.from('resource_files').update(payload).eq('id', editingId).select().single()
      : supabase.from('resource_files').insert(payload).select().single();

    const { data, error: err } = await query;
    if (err) {
      setError(err.message);
    } else if (data) {
      setFiles((fs) => (editingId ? fs.map((x) => (x.id === editingId ? data : x)) : [...fs, data]));
      resetForm();
    }
    setSaving(false);
  };

  const remove = async (id) => {
    if (!confirm('Delete this resource? This cannot be undone.')) return;
    await supabase.from('resource_files').delete().eq('id', id);
    setFiles((fs) => fs.filter((f) => f.id !== id));
  };

  const toggleActive = async (f) => {
    const { data } = await supabase
      .from('resource_files')
      .update({ is_active: !f.is_active })
      .eq('id', f.id)
      .select()
      .single();
    if (data) setFiles((fs) => fs.map((x) => (x.id === f.id ? data : x)));
  };

  const sectionFiles = files.filter((f) => f.section === activeSection);

  return (
    <div>
      <p className="mb-4 text-xs text-white/40">
        Each Drive file must be shared as <span className="text-white/60">"Anyone with the link — Viewer"</span> or
        students won't be able to view/download it, even with a paid pass.
      </p>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => {
              setActiveSection(s.key);
              if (!editingId) setForm((f) => ({ ...f, section: s.key }));
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeSection === s.key ? 'bg-violet text-white' : 'border border-line text-white/60 hover:text-white'
            }`}
          >
            {s.label} <span className="text-white/40">({files.filter((f) => f.section === s.key).length})</span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-line bg-panel p-5">
        <div className="mb-3 text-sm font-semibold text-white">
          {editingId ? 'Edit resource' : 'Add new resource'}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-white/45">Section</label>
            <select
              value={form.section}
              onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white"
            >
              {SECTIONS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/45">Subject</label>
            <input
              type="text"
              placeholder="Physics"
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
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="mb-1 block text-xs text-white/45">Title</label>
            <input
              type="text"
              placeholder="Laws of Motion — Full Notes"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white placeholder:text-white/25"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="mb-1 block text-xs text-white/45">Google Drive link or file ID</label>
            <input
              type="text"
              placeholder="https://drive.google.com/file/d/FILE_ID/view"
              value={form.drive_link}
              onChange={(e) => setForm((f) => ({ ...f, drive_link: e.target.value }))}
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white placeholder:text-white/25"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="mb-1 block text-xs text-white/45">Description (optional)</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
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
            <Plus size={14} /> {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add resource'}
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
        {!loading && sectionFiles.length === 0 && (
          <p className="text-sm text-white/35">No resources in this section yet.</p>
        )}
        {sectionFiles.map((f) => (
          <div key={f.id} className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3">
            <FileText size={16} className="flex-shrink-0 text-lavender" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-violet/15 px-2 py-0.5 text-[11px] text-lavender">{f.subject}</span>
                {!f.is_active && (
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/40">hidden</span>
                )}
              </div>
              <p className="mt-1 truncate text-sm text-white">{f.title}</p>
              <p className="truncate text-xs text-white/30">{f.drive_file_id}</p>
            </div>
            <button
              onClick={() => toggleActive(f)}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition ${
                f.is_active ? 'border-line text-white/60 hover:text-white' : 'border-green-500/40 text-green-400'
              }`}
            >
              <Check size={12} /> {f.is_active ? 'Hide' : 'Show'}
            </button>
            <button onClick={() => startEdit(f)} className="text-white/40 hover:text-white">
              <Pencil size={14} />
            </button>
            <button onClick={() => remove(f.id)} className="text-white/30 hover:text-red-400">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
