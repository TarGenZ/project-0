import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { parseAnswerKeyPaste } from '../../lib/omrScoring';

const BLANK_FORM = {
  exam_name: '',
  paper_code: '',
  marks_correct: '4',
  marks_incorrect: '-1',
  keyPaste: '',
};

// Feeds the NEET Marks Calculator tool (/tools/neet-marks-calculator).
// Each row here is one exam + paper code combo; the calculator fetches the
// active ones so a student can pick theirs and score their uploaded
// response CSV against it. Nothing here is exam-year-specific in code —
// add a new row each cycle instead of touching the tool itself.
export default function AdminAnswerKeys() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(BLANK_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = () => {
    supabase
      .from('answer_keys')
      .select('*')
      .order('exam_name', { ascending: true })
      .order('paper_code', { ascending: true })
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
    const keyPaste = Object.entries(r.key || {})
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([qno, answers]) => [qno, ...answers].join(','))
      .join('\n');
    setForm({
      exam_name: r.exam_name,
      paper_code: r.paper_code,
      marks_correct: String(r.marks_correct),
      marks_incorrect: String(r.marks_incorrect),
      keyPaste,
    });
  };

  const save = async () => {
    setError(null);
    if (!form.exam_name.trim() || !form.paper_code.trim() || !form.keyPaste.trim()) {
      setError('Exam name, paper code, and the answer key paste are all required.');
      return;
    }
    const key = parseAnswerKeyPaste(form.keyPaste);
    if (Object.keys(key).length === 0) {
      setError("Couldn't parse any questions — check the paste is 'Qno,Answer' one per line.");
      return;
    }

    setSaving(true);
    const payload = {
      exam_name: form.exam_name.trim(),
      paper_code: form.paper_code.trim(),
      marks_correct: Number(form.marks_correct) || 0,
      marks_incorrect: Number(form.marks_incorrect) || 0,
      key,
    };

    const query = editingId
      ? supabase.from('answer_keys').update(payload).eq('id', editingId).select().single()
      : supabase.from('answer_keys').insert(payload).select().single();

    const { data, error: err } = await query;
    if (err) {
      setError(err.message.includes('duplicate') ? 'That exam + paper code combo already exists.' : err.message);
    } else if (data) {
      setItems((rs) => (editingId ? rs.map((x) => (x.id === editingId ? data : x)) : [...rs, data]));
      resetForm();
    }
    setSaving(false);
  };

  const remove = async (id) => {
    if (!confirm('Remove this answer key? This cannot be undone.')) return;
    await supabase.from('answer_keys').delete().eq('id', id);
    setItems((rs) => rs.filter((r) => r.id !== id));
  };

  const toggleActive = async (r) => {
    const { data } = await supabase
      .from('answer_keys')
      .update({ is_active: !r.is_active })
      .eq('id', r.id)
      .select()
      .single();
    if (data) setItems((rs) => rs.map((x) => (x.id === r.id ? data : x)));
  };

  return (
    <div>
      <p className="mb-4 text-xs text-white/40">
        Only active keys show up as options on the public calculator. Paste one question per line as{' '}
        <code className="rounded bg-panel px-1 py-0.5 text-[11px] text-lavender">Qno,Answer</code> — add extra
        comma-separated options for multi-correct questions, e.g. <code className="rounded bg-panel px-1 py-0.5 text-[11px] text-lavender">47,2,4</code>.
      </p>

      <div className="rounded-2xl border border-line bg-panel p-5">
        <div className="mb-3 text-sm font-semibold text-white">{editingId ? 'Edit answer key' : 'Add answer key'}</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-white/45">Exam name</label>
            <input
              type="text"
              placeholder="NEET UG 2026"
              value={form.exam_name}
              onChange={(e) => setForm((f) => ({ ...f, exam_name: e.target.value }))}
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white placeholder:text-white/25"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/45">Paper / booklet code</label>
            <input
              type="text"
              placeholder="45"
              value={form.paper_code}
              onChange={(e) => setForm((f) => ({ ...f, paper_code: e.target.value }))}
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white placeholder:text-white/25"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/45">Marks — correct</label>
            <input
              type="number"
              value={form.marks_correct}
              onChange={(e) => setForm((f) => ({ ...f, marks_correct: e.target.value }))}
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/45">Marks — incorrect</label>
            <input
              type="number"
              value={form.marks_incorrect}
              onChange={(e) => setForm((f) => ({ ...f, marks_incorrect: e.target.value }))}
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="mb-1 block text-xs text-white/45">Answer key (Qno,Answer — one per line)</label>
            <textarea
              rows={8}
              placeholder={'1,2\n2,4\n3,1\n47,2,4'}
              value={form.keyPaste}
              onChange={(e) => setForm((f) => ({ ...f, keyPaste: e.target.value }))}
              className="w-full rounded-lg border border-line bg-base px-3 py-2 font-mono text-xs text-white placeholder:text-white/25"
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
            <Plus size={14} /> {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add answer key'}
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
        {!loading && items.length === 0 && <p className="text-sm text-white/35">No answer keys added yet.</p>}
        {items.map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-violet/15 px-2 py-0.5 text-[11px] text-lavender">{r.exam_name}</span>
                <span className="rounded-full border border-line px-2 py-0.5 text-[10px] text-white/40">
                  Code {r.paper_code}
                </span>
                {!r.is_active && (
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/40">hidden</span>
                )}
              </div>
              <p className="mt-1 text-xs text-white/40">
                {Object.keys(r.key || {}).length} questions · +{r.marks_correct} / {r.marks_incorrect}
              </p>
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
