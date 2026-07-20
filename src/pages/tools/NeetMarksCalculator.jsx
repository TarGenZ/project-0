import { useEffect, useState } from 'react';
import { Upload, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { parseResponseCsv, scoreResponses } from '../../lib/omrScoring';
import SEO from '../../components/SEO.jsx';
import BackButton from '../../components/BackButton.jsx';

const BOOKMARKLET_SNIPPET = `(function() {
  const grid = document.querySelector("[id^='ctl00_LoginContent_grOMR']");
  if (!grid) { console.error("OMR table not found."); return; }
  const rows = Array.from(grid.querySelectorAll("tr"));
  const lines = ["Qno,RecordedResponse"];
  rows.forEach(tr => {
    const qSpan = tr.querySelector("span[id$='_lbl_QuestionNo']");
    const rSpan = tr.querySelector("span[id$='_lbl_RAnswer']");
    if (qSpan && rSpan) {
      const qno = qSpan.textContent.trim().padStart(3, "0");
      const raw = rSpan.textContent.trim();
      lines.push(\`\${qno},\${raw === "-" ? "" : raw}\`);
    }
  });
  const blob = new Blob([lines.join("\\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "NEET_OMR_Responses.csv";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
})();`;

export default function NeetMarksCalculator() {
  const [keys, setKeys] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase
      .from('answer_keys')
      .select('*')
      .eq('is_active', true)
      .order('exam_name', { ascending: false })
      .order('paper_code', { ascending: true })
      .then(({ data }) => {
        setKeys(data || []);
        setLoadingKeys(false);
        if (data && data.length > 0) setSelectedKeyId(data[0].id);
      });
  }, []);

  const selectedKey = keys.find((k) => k.id === selectedKeyId);

  const handleFile = (file) => {
    setError(null);
    setResult(null);
    if (!file) return;
    if (!selectedKey) {
      setError('Pick an exam and paper code first.');
      return;
    }
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const responses = parseResponseCsv(String(e.target.result));
        if (Object.keys(responses).length === 0) {
          setError("Couldn't find any responses in that file — check it's the right CSV format.");
          return;
        }
        setResult(scoreResponses(responses, selectedKey));
      } catch {
        setError("Couldn't read that file — make sure it's a plain CSV.");
      }
    };
    reader.onerror = () => setError('Failed to read the file — try again.');
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-base bg-omr-grid bg-omr px-5 py-16 md:py-20">
      <BackButton fallback="/" />
      <SEO
        title="NEET Marks Calculator — arpansarkar.org"
        description="Upload your recorded NEET OMR responses and get your score instantly, checked against the official answer key."
        path="/tools/neet-marks-calculator"
      />
      <div className="mx-auto max-w-2xl">
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-amber">Tools</div>
        <h1 className="mt-3 font-display text-3xl font-bold text-white md:text-4xl">NEET Marks Calculator</h1>
        <p className="mt-3 max-w-xl text-sm text-white/50">
          Upload your recorded response CSV from the official NEET OMR portal and get your score instantly,
          checked against the answer key for your paper code.
        </p>

        <div className="mt-8 rounded-2xl border border-line bg-panel p-6">
          <label className="mb-1.5 block text-xs text-white/45">Exam &amp; paper code</label>
          {loadingKeys ? (
            <div className="h-9 w-full animate-pulse rounded-lg bg-line/40" />
          ) : keys.length === 0 ? (
            <p className="text-sm text-white/40">No answer keys are available yet — check back once one's added.</p>
          ) : (
            <select
              value={selectedKeyId}
              onChange={(e) => {
                setSelectedKeyId(e.target.value);
                setResult(null);
                setError(null);
              }}
              className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-white focus:border-violet/50 focus:outline-none"
            >
              {keys.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.exam_name} — Code {k.paper_code}
                </option>
              ))}
            </select>
          )}

          {keys.length > 0 && (
            <>
              <label className="mb-1.5 mt-5 block text-xs text-white/45">Recorded response CSV</label>
              <label
                htmlFor="omr-csv-upload"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line px-4 py-8 text-center transition hover:border-violet/50"
              >
                <Upload size={20} className="text-lavender" />
                <span className="text-sm text-white/70">{fileName || 'Click to choose your CSV file'}</span>
                <span className="text-xs text-white/30">Qno,RecordedResponse — see instructions below</span>
              </label>
              <input
                id="omr-csv-upload"
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </>
          )}

          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        </div>

        {result && (
          <div className="mt-6 rounded-2xl border border-line bg-panel p-6 shadow-glow">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Your score</p>
              <p className="font-display text-3xl font-bold text-amber">{result.score}</p>
            </div>
            <div className="my-4 h-px w-full bg-line" />
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <CheckCircle2 size={16} className="mx-auto mb-1 text-green-400" />
                <p className="text-lg font-semibold text-white">{result.correct}</p>
                <p className="text-[11px] text-white/40">Correct</p>
              </div>
              <div>
                <XCircle size={16} className="mx-auto mb-1 text-red-400" />
                <p className="text-lg font-semibold text-white">{result.incorrect}</p>
                <p className="text-[11px] text-white/40">Incorrect</p>
              </div>
              <div>
                <MinusCircle size={16} className="mx-auto mb-1 text-white/40" />
                <p className="text-lg font-semibold text-white">{result.blank}</p>
                <p className="text-[11px] text-white/40">Blank</p>
              </div>
            </div>
            {result.incorrectQuestions.length > 0 && (
              <p className="mt-4 text-xs text-white/40">
                Missed: {result.incorrectQuestions.join(', ')}
              </p>
            )}
          </div>
        )}

        <details className="mt-8 rounded-2xl border border-line bg-panel/60 p-5 text-sm text-white/60">
          <summary className="cursor-pointer font-semibold text-white">How do I get my response CSV?</summary>
          <p className="mt-3">
            While logged into the official NEET OMR/response-sheet page, open your browser's developer console
            and paste this script — it downloads your recorded responses as a CSV ready to upload here:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-base p-3 text-[11px] text-lavender">
            {BOOKMARKLET_SNIPPET}
          </pre>
        </details>

        <p className="mt-6 text-xs text-white/25">
          Nothing you upload here is stored — scoring happens entirely in your browser.
        </p>
      </div>
    </div>
  );
}
