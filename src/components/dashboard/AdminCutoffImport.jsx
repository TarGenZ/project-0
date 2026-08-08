import { useState, useRef } from 'react';
import { Upload, Download, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabaseClient.js';

// ── Table refs ────────────────────────────────────────────────────────────────
const TC = 'explorer_colleges';
const TQ = 'explorer_quotas';
const TR = 'explorer_cutoff_rounds';

// ── Rating params (for college bulk import) ───────────────────────────────────
const RATING_KEYS = [
  'rating_location','rating_roi','rating_fees','rating_facilities','rating_faculty',
  'rating_campus','rating_hostel','rating_patient_load','rating_research','rating_placement',
];
const RATING_WEIGHTS = [0.08,0.15,0.10,0.12,0.13,0.06,0.05,0.13,0.09,0.09];
function computeFinalRating(row) {
  let sum = 0, total = 0;
  RATING_KEYS.forEach((k, i) => {
    const v = row[k];
    if (v == null || v === '') return;
    sum += Number(v) * RATING_WEIGHTS[i]; total += RATING_WEIGHTS[i];
  });
  return total ? Math.round((sum / total) * 10) / 10 : 5;
}

// ── Default quotas (for auto-creation on college import) ──────────────────────
function getDefaultQuotas(type, govtSubcategory) {
  if (type === 'government') {
    if (govtSubcategory === 'state') {
      return [
        ...['UR','EWS','OBC','SC','ST'].map(n => ({ name: n, quota_type: 'all_india' })),
        ...['GEN','EWS','OBC','SC','ST'].map(n => ({ name: n, quota_type: 'state' })),
      ];
    }
    return ['UR','EWS','OBC','SC','ST'].map(n => ({ name: n, quota_type: 'all_india' }));
  }
  return [
    ...['GEN','MGT','NRI'].map(n => ({ name: n, quota_type: 'all_india' })),
    ...['UR','EWS','OBC','SC','ST','MGT'].map(n => ({ name: n, quota_type: 'state' })),
  ];
}

// ── Import types ──────────────────────────────────────────────────────────────
const IMPORT_TYPES = [
  {
    key: 'colleges',
    label: 'Colleges',
    desc: 'Each row = one college. Rating fields (0–10) default to 5. final_rating is auto-computed. Existing college names are updated.',
    requiredCols: ['name'],
    templateHeaders: ['name','city','state','year_established','type','govt_subcategory','total_seats','annual_fees','about','worthness',...RATING_KEYS],
    templateRows: [['AIIMS New Delhi','New Delhi','Delhi',1956,'government','central',100,1628,'About...','Worth it...','9.5','9.8','9.9','9.7','9.9','8.8','8.5','9.6','9.8','9.7']],
  },
  {
    key: 'quotas',
    label: 'Quotas',
    desc: 'college_name must exactly match an existing college (case-insensitive). Duplicate quota+type combos are skipped.',
    requiredCols: ['college_name','name','quota_type'],
    templateHeaders: ['college_name','name','quota_type'],
    templateRows: [['AIIMS New Delhi','UR','all_india'],['AIIMS New Delhi','GEN','state']],
  },
  {
    key: 'cutoffs',
    label: 'Cutoff Rounds',
    desc: 'Wide format: one row per college+quota+round. Each year gets its own column (closing_rank_2023, closing_rank_2024…). Blank = no data that year. Existing rounds are updated.',
    requiredCols: ['college_name','quota_name','quota_type','round_number'],
    templateHeaders: ['college_name','quota_name','quota_type','round_number','closing_rank_2023','closing_rank_2024'],
    templateRows: [['AIIMS New Delhi','UR','all_india',1,50,48],['AIIMS New Delhi','UR','all_india',2,62,60]],
  },
];

// ── Spreadsheet parser ────────────────────────────────────────────────────────
function parseSpreadsheet(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsBinaryString(file);
  });
}

function downloadTemplate(type) {
  const def = IMPORT_TYPES.find(t => t.key === type);
  if (!def) return;
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([def.templateHeaders, ...def.templateRows]);
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, `cutoffs_${type}_template.xlsx`);
}

// ── Bulk upsert functions ─────────────────────────────────────────────────────
async function runCollegesImport(rows) {
  const { data: existing } = await supabase.from(TC).select('id, name');
  const existingMap = new Map((existing || []).map(c => [c.name.trim().toLowerCase(), c.id]));

  const toInsert = [], toUpdate = [];
  for (const row of rows) {
    const withRating = { ...row, final_rating: computeFinalRating(row) };
    existingMap.has(row.name.trim().toLowerCase())
      ? toUpdate.push({ ...withRating, id: existingMap.get(row.name.trim().toLowerCase()) })
      : toInsert.push(withRating);
  }

  const errors = []; let inserted = 0, updated = 0;

  if (toInsert.length) {
    const { data, error } = await supabase.from(TC).insert(toInsert).select();
    if (error) errors.push(error.message);
    else {
      inserted = data?.length || 0;
      const quotaRows = [];
      for (const c of data || []) {
        getDefaultQuotas(c.type, c.govt_subcategory).forEach(q => quotaRows.push({ ...q, college_id: c.id }));
      }
      if (quotaRows.length) {
        const { error: qErr } = await supabase.from(TQ).insert(quotaRows);
        if (qErr) errors.push(`Default quota creation: ${qErr.message}`);
      }
    }
  }
  for (const row of toUpdate) {
    const { id, ...fields } = row;
    const { error } = await supabase.from(TC).update(fields).eq('id', id);
    error ? errors.push(`${row.name}: ${error.message}`) : updated++;
  }
  return { inserted, updated, errors };
}

async function runQuotasImport(rows) {
  const { data: colleges } = await supabase.from(TC).select('id, name');
  const collegeMap = new Map((colleges || []).map(c => [c.name.trim().toLowerCase(), c.id]));
  const { data: existing } = await supabase.from(TQ).select('id, name, quota_type, college_id');
  const existingSet = new Set((existing || []).map(q => `${q.college_id}|${q.name.trim().toLowerCase()}|${q.quota_type}`));

  const toInsert = [], errors = []; let skipped = 0;
  for (const row of rows) {
    const cid = collegeMap.get(row.college_name.trim().toLowerCase());
    if (!cid) { errors.push(`College not found: "${row.college_name}"`); continue; }
    const key = `${cid}|${row.name.trim().toLowerCase()}|${row.quota_type}`;
    if (existingSet.has(key)) { skipped++; continue; }
    existingSet.add(key);
    toInsert.push({ name: row.name, quota_type: row.quota_type, college_id: cid });
  }

  let inserted = 0;
  if (toInsert.length) {
    const { data, error } = await supabase.from(TQ).insert(toInsert).select();
    if (error) errors.push(error.message);
    else inserted = data?.length || 0;
  }
  return { inserted, skipped, errors };
}

async function runCutoffsImport(rows) {
  const { data: colleges } = await supabase.from(TC).select('id, name');
  const collegeMap = new Map((colleges || []).map(c => [c.name.trim().toLowerCase(), c.id]));
  const { data: quotas } = await supabase.from(TQ).select('id, name, quota_type, college_id');
  const quotaMap = new Map((quotas || []).map(q => [`${q.college_id}|${q.name.trim().toLowerCase()}|${q.quota_type}`, q.id]));
  const { data: existingRounds } = await supabase.from(TR).select('id, quota_id, year, round_number');
  const roundMap = new Map((existingRounds || []).map(r => [`${r.quota_id}|${r.year}|${r.round_number}`, r.id]));

  // Detect year columns (closing_rank_YYYY)
  const sampleRow = rows[0] || {};
  const yearCols = Object.keys(sampleRow).filter(k => /^closing_rank_\d{4}$/.test(k));

  const toInsert = [], toUpdate = [], errors = [];

  for (const row of rows) {
    const cid = collegeMap.get(String(row.college_name || '').trim().toLowerCase());
    if (!cid) { errors.push(`College not found: "${row.college_name}"`); continue; }
    const qKey = `${cid}|${String(row.quota_name || '').trim().toLowerCase()}|${row.quota_type}`;
    const quotaId = quotaMap.get(qKey);
    if (!quotaId) { errors.push(`Quota not found: "${row.quota_name}" (${row.quota_type}) at "${row.college_name}"`); continue; }

    for (const col of yearCols) {
      const year = parseInt(col.replace('closing_rank_', ''));
      const closing_rank = row[col] === '' || row[col] == null ? null : parseInt(row[col]);
      if (closing_rank == null) continue;
      const rKey = `${quotaId}|${year}|${row.round_number}`;
      roundMap.has(rKey)
        ? toUpdate.push({ id: roundMap.get(rKey), closing_rank })
        : toInsert.push({ quota_id: quotaId, year, round_number: parseInt(row.round_number), closing_rank });
    }
  }

  let inserted = 0, updated = 0;
  if (toInsert.length) {
    const { data, error } = await supabase.from(TR).insert(toInsert).select();
    if (error) errors.push(error.message);
    else inserted = data?.length || 0;
  }
  for (const row of toUpdate) {
    const { id, ...fields } = row;
    const { error } = await supabase.from(TR).update(fields).eq('id', id);
    error ? errors.push(error.message) : updated++;
  }
  return { inserted, updated, errors };
}

const IMPORT_FN = { colleges: runCollegesImport, quotas: runQuotasImport, cutoffs: runCutoffsImport };

// ── UI ────────────────────────────────────────────────────────────────────────
export default function AdminCutoffImport() {
  const [type, setType] = useState('colleges');
  const [fileName, setFileName] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parseErrors, setParseErrors] = useState([]);
  const [validRows, setValidRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const def = IMPORT_TYPES.find(t => t.key === type);

  const reset = () => {
    setFileName(null); setParseErrors([]); setValidRows([]); setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const switchType = (t) => { setType(t); reset(); };

  const handleFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    reset(); setFileName(file.name); setParsing(true);
    try {
      const rows = await parseSpreadsheet(file);
      const errors = [], valid = [];
      for (const [i, row] of rows.entries()) {
        const missing = def.requiredCols.filter(c => !row[c]);
        if (missing.length) { errors.push(`Row ${i + 2}: missing ${missing.join(', ')}`); continue; }
        valid.push(row);
      }
      setParseErrors(errors);
      setValidRows(valid);
    } catch (err) {
      setParseErrors([`Failed to parse file: ${err.message}`]);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!validRows.length) return;
    setImporting(true);
    try {
      const res = await IMPORT_FN[type](validRows);
      setResult(res);
    } catch (err) {
      setResult({ errors: [err.message] });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      {/* Type tabs */}
      <div className="mb-5 flex gap-1.5">
        {IMPORT_TYPES.map(t => (
          <button key={t.key} onClick={() => switchType(t.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              type === t.key ? 'bg-violet text-white' : 'border border-line text-white/50 hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <p className="mb-4 text-xs text-white/40">{def.desc}</p>

      {/* Template download */}
      <button onClick={() => downloadTemplate(type)}
        className="mb-5 flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-xs text-white/60 transition hover:text-white">
        <Download size={14} /> Download {def.label} template
      </button>

      {/* File upload */}
      <div className="mb-4 rounded-2xl border-2 border-dashed border-line bg-panel p-6 text-center">
        <Upload size={24} className="mx-auto mb-3 text-white/30" />
        <p className="mb-1 text-sm text-white/60">Drop a spreadsheet here or</p>
        <button onClick={() => fileRef.current?.click()}
          className="text-sm font-medium text-lavender hover:text-white underline underline-offset-2">
          browse files
        </button>
        {fileName && <p className="mt-2 text-xs text-white/40">{fileName}</p>}
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
      </div>

      {/* Parse status */}
      {parsing && (
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Loader2 size={14} className="animate-spin" /> Parsing…
        </div>
      )}

      {parseErrors.length > 0 && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="mb-2 text-xs font-semibold text-red-400">{parseErrors.length} row error{parseErrors.length !== 1 ? 's' : ''}</p>
          <ul className="space-y-0.5">
            {parseErrors.slice(0, 10).map((e, i) => <li key={i} className="text-xs text-red-300">{e}</li>)}
            {parseErrors.length > 10 && <li className="text-xs text-red-300/60">…and {parseErrors.length - 10} more</li>}
          </ul>
        </div>
      )}

      {validRows.length > 0 && !result && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-violet/30 bg-violet/10 px-4 py-3">
          <p className="text-xs text-lavender">{validRows.length} valid row{validRows.length !== 1 ? 's' : ''} ready to import</p>
          <button onClick={handleImport} disabled={importing}
            className="flex items-center gap-1.5 rounded-lg bg-violet px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-soft disabled:opacity-50">
            {importing ? <><Loader2 size={13} className="animate-spin" /> Importing…</> : <><Upload size={13} /> Import</>}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-xl border p-4 ${result.errors?.length ? 'border-amber/30 bg-amber/10' : 'border-emerald-500/30 bg-emerald-500/10'}`}>
          <div className="mb-2 flex items-center gap-2">
            {result.errors?.length
              ? <AlertCircle size={16} className="text-amber flex-shrink-0" />
              : <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />}
            <p className="text-xs font-semibold text-white">Import complete</p>
          </div>
          <ul className="space-y-0.5 text-xs text-white/60">
            {result.inserted != null && <li>✓ {result.inserted} inserted</li>}
            {result.updated  != null && <li>✓ {result.updated} updated</li>}
            {result.skipped  != null && <li>– {result.skipped} skipped (duplicates)</li>}
            {result.errors?.map((e, i) => <li key={i} className="text-red-300">✗ {e}</li>)}
          </ul>
          <button onClick={reset} className="mt-3 flex items-center gap-1 text-xs text-white/40 hover:text-white">
            <X size={12} /> Import another file
          </button>
        </div>
      )}
    </div>
  );
}
