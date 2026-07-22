import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient.js';

const TC = 'explorer_colleges';
const TQ = 'explorer_quotas';

function QuotaManager({ college, onBack }) {
  const [quotas, setQuotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newQuota, setNewQuota] = useState({ name: '', quota_type: 'all_india' });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    supabase.from(TQ).select('*').eq('college_id', college.id)
      .then(({ data }) => { setQuotas(data || []); setLoading(false); });
  };

  useEffect(load, [college.id]);

  const handleAdd = async () => {
    if (!newQuota.name.trim()) return;
    setError('');
    const { error: err } = await supabase.from(TQ).insert({ ...newQuota, college_id: college.id });
    if (err) { setError(err.message); return; }
    setNewQuota({ name: '', quota_type: 'all_india' });
    setAdding(false);
    load();
  };

  const handleDelete = async (id) => {
    await supabase.from(TQ).delete().eq('id', id);
    setQuotas(qs => qs.filter(q => q.id !== id));
  };

  const AIQ   = quotas.filter(q => q.quota_type === 'all_india');
  const STATE = quotas.filter(q => q.quota_type === 'state');

  return (
    <div>
      <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-xs text-white/50 hover:text-white">
        <ChevronLeft size={14} /> Back to colleges
      </button>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">{college.name}</p>
          <p className="text-xs text-white/40">Quota management</p>
        </div>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-lg bg-violet px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-soft">
          <Plus size={14} /> Add Quota
        </button>
      </div>

      {adding && (
        <div className="mb-4 rounded-2xl border border-line bg-panel p-4">
          <p className="mb-3 text-xs font-semibold text-white/60">New Quota</p>
          <div className="flex flex-wrap gap-2">
            <input value={newQuota.name} onChange={e => setNewQuota(q => ({ ...q, name: e.target.value }))}
              placeholder="e.g. General, OBC, SC"
              className="flex-1 min-w-[160px] rounded-lg border border-line bg-base px-3 py-2 text-sm text-white placeholder:text-white/25" />
            <select value={newQuota.quota_type} onChange={e => setNewQuota(q => ({ ...q, quota_type: e.target.value }))}
              className="rounded-lg border border-line bg-base px-3 py-2 text-sm text-white">
              <option value="all_india">All India Quota</option>
              <option value="state">State Quota</option>
            </select>
            <button onClick={handleAdd} className="rounded-lg bg-violet px-4 py-2 text-xs font-semibold text-white hover:bg-violet-soft">Add</button>
            <button onClick={() => { setAdding(false); setError(''); }} className="text-white/40 hover:text-white"><X size={16} /></button>
          </div>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>
      )}

      {loading && <p className="text-sm text-white/35">Loading…</p>}

      {!loading && quotas.length === 0 && (
        <p className="text-sm text-white/35">No quotas yet. Add some above.</p>
      )}

      {[{ label: 'All India Quota', list: AIQ, color: 'text-sky-400' }, { label: 'State Quota', list: STATE, color: 'text-orange-400' }]
        .filter(g => g.list.length > 0)
        .map(g => (
          <div key={g.label} className="mb-4">
            <p className={`mb-2 text-[11px] font-bold uppercase tracking-wider ${g.color}`}>{g.label}</p>
            <div className="space-y-1.5">
              {g.list.map(q => (
                <div key={q.id} className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-2.5">
                  <p className="flex-1 text-sm text-white">{q.name}</p>
                  <button onClick={() => handleDelete(q.id)} className="text-white/30 hover:text-red-400"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

export default function AdminCutoffQuotas() {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    supabase.from(TC).select('id, name, state, type').order('name')
      .then(({ data }) => { setColleges(data || []); setLoading(false); });
  }, []);

  if (selected) {
    return <QuotaManager college={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div>
      <p className="mb-4 text-xs text-white/40">Select a college to manage its quotas.</p>
      {loading && <p className="text-sm text-white/35">Loading…</p>}
      <div className="space-y-1.5">
        {colleges.map(c => (
          <button key={c.id} onClick={() => setSelected(c)}
            className="flex w-full items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3 text-left transition hover:border-violet/40">
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{c.name}</p>
              <p className="text-xs text-white/40">{c.state}</p>
            </div>
            <ChevronRight size={14} className="text-white/30" />
          </button>
        ))}
        {!loading && colleges.length === 0 && <p className="text-sm text-white/35">No colleges found. Add them in the Colleges tab first.</p>}
      </div>
    </div>
  );
}
