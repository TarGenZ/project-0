import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronRight, ChevronLeft } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient.js';

const TC = 'explorer_colleges';
const TQ = 'explorer_quotas';
const TR = 'explorer_cutoff_rounds';

function CutoffManager({ college, onBack }) {
  const [quotas, setQuotas] = useState([]);
  const [quotasLoading, setQuotasLoading] = useState(true);
  const [selectedQuota, setSelectedQuota] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [roundsLoading, setRoundsLoading] = useState(false);
  const [form, setForm] = useState({ year: new Date().getFullYear(), round_number: 1, closing_rank: '' });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from(TQ).select('*').eq('college_id', college.id)
      .then(({ data }) => {
        const q = data || [];
        setQuotas(q);
        if (q.length) setSelectedQuota(q[0].id);
        setQuotasLoading(false);
      });
  }, [college.id]);

  useEffect(() => {
    if (!selectedQuota) { setRounds([]); return; }
    setRoundsLoading(true);
    supabase.from(TR).select('*').eq('quota_id', selectedQuota)
      .order('year', { ascending: false }).order('round_number')
      .then(({ data }) => { setRounds(data || []); setRoundsLoading(false); });
  }, [selectedQuota]);

  const handleAdd = async () => {
    if (!form.closing_rank) { setError('Closing rank is required.'); return; }
    setError('');
    const { error: err } = await supabase.from(TR).insert({ ...form, quota_id: selectedQuota });
    if (err) { setError(err.message); return; }
    setForm({ year: new Date().getFullYear(), round_number: 1, closing_rank: '' });
    setAdding(false);
    // Refetch rounds
    const { data } = await supabase.from(TR).select('*').eq('quota_id', selectedQuota)
      .order('year', { ascending: false }).order('round_number');
    setRounds(data || []);
  };

  const handleDelete = async (id) => {
    await supabase.from(TR).delete().eq('id', id);
    setRounds(rs => rs.filter(r => r.id !== id));
  };

  const selectedQuotaObj = quotas.find(q => q.id === selectedQuota);

  if (quotasLoading) return <p className="text-sm text-white/35">Loading…</p>;

  if (!quotas.length) return (
    <div>
      <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-xs text-white/50 hover:text-white">
        <ChevronLeft size={14} /> Back
      </button>
      <p className="text-sm text-white/35">No quotas found for {college.name}. Add quotas in the Quotas tab first.</p>
    </div>
  );

  return (
    <div>
      <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-xs text-white/50 hover:text-white">
        <ChevronLeft size={14} /> Back to colleges
      </button>

      <div className="mb-4">
        <p className="text-sm font-semibold text-white">{college.name}</p>
        <p className="text-xs text-white/40">Cutoff data — select a quota</p>
      </div>

      {/* Quota tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {quotas.map(q => (
          <button key={q.id} onClick={() => setSelectedQuota(q.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              selectedQuota === q.id
                ? 'bg-violet text-white'
                : 'border border-line text-white/50 hover:text-white'
            }`}>
            {q.name}
            <span className={`ml-1.5 text-[10px] ${q.quota_type === 'all_india' ? 'text-sky-400' : 'text-orange-400'}`}>
              {q.quota_type === 'all_india' ? 'AIQ' : 'State'}
            </span>
          </button>
        ))}
      </div>

      {/* Add round */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-white/40">
          {rounds.length} round{rounds.length !== 1 ? 's' : ''} · {selectedQuotaObj?.name}
        </p>
        <button onClick={() => setAdding(a => !a)}
          className="flex items-center gap-1.5 rounded-lg bg-violet px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-soft">
          <Plus size={14} /> Add Round
        </button>
      </div>

      {adding && (
        <div className="mb-4 rounded-2xl border border-line bg-panel p-4">
          <div className="flex flex-wrap gap-3 items-end">
            {[
              { k: 'year',         label: 'Year',          ph: '2024' },
              { k: 'round_number', label: 'Round',         ph: '1' },
              { k: 'closing_rank', label: 'Closing Rank',  ph: '12345' },
            ].map(({ k, label, ph }) => (
              <div key={k} className="flex-1 min-w-[100px]">
                <label className="mb-1 block text-xs text-white/45">{label}</label>
                <input type="number" placeholder={ph} value={form[k]}
                  onChange={e => setForm(f => ({ ...f, [k]: parseInt(e.target.value) || '' }))}
                  className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white font-mono placeholder:text-white/25" />
              </div>
            ))}
            <div className="flex gap-2 pb-0.5">
              <button onClick={handleAdd} className="rounded-lg bg-violet px-4 py-2 text-xs font-semibold text-white hover:bg-violet-soft">Add</button>
              <button onClick={() => setAdding(false)} className="text-xs text-white/40 hover:text-white px-2">Cancel</button>
            </div>
          </div>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>
      )}

      {roundsLoading && <p className="text-sm text-white/35">Loading…</p>}
      <div className="space-y-1.5">
        {rounds.map(r => (
          <div key={r.id} className="flex items-center gap-4 rounded-xl border border-line bg-panel px-4 py-2.5">
            <span className="font-mono text-xs text-white/40 w-10">{r.year}</span>
            <span className="text-xs text-white/60">Round {r.round_number}</span>
            <span className="flex-1 font-mono text-sm font-bold text-amber">{r.closing_rank?.toLocaleString('en-IN')}</span>
            <button onClick={() => handleDelete(r.id)} className="text-white/30 hover:text-red-400"><Trash2 size={13} /></button>
          </div>
        ))}
        {!roundsLoading && rounds.length === 0 && (
          <p className="text-sm text-white/35">No rounds yet for {selectedQuotaObj?.name}.</p>
        )}
      </div>
    </div>
  );
}

export default function AdminCutoffData() {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    supabase.from(TC).select('id, name, state, type').order('name')
      .then(({ data }) => { setColleges(data || []); setLoading(false); });
  }, []);

  if (selected) {
    return <CutoffManager college={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div>
      <p className="mb-4 text-xs text-white/40">Select a college to manage its cutoff data.</p>
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
