import { useEffect, useState } from 'react';
import { Upload, CheckCircle2, XCircle, MinusCircle, Bookmark, Copy, Check } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { parseResponseCsv, scoreResponses } from '../../lib/omrScoring';
import SEO from '../../components/SEO.jsx';
import BackButton from '../../components/BackButton.jsx';

// This runs as a bookmarklet on NTA's response-sheet page (not in our
// app), so it can't rely on a dev console — that's the whole point, since
// there's no console to open on a phone. Tapping the saved bookmark while
// on the response sheet page triggers this directly.
const BOOKMARKLET_CODE = `(function() { const grid = document.querySelector("[id^='ctl00_LoginContent_grOMR']"); if (!grid) { alert("Could not find the OMR table on this page. Make sure you are on the response sheet page."); return; } const rows = Array.from(grid.querySelectorAll("tr")); const lines = ["Qno,RecordedResponse"]; rows.forEach(function(tr) { const qSpan = tr.querySelector("span[id$='_lbl_QuestionNo']"); const rSpan = tr.querySelector("span[id$='_lbl_RAnswer']"); if (qSpan && rSpan) { const qno = qSpan.textContent.trim().padStart(3, "0"); const raw = rSpan.textContent.trim(); lines.push(qno + "," + (raw === "-" ? "" : raw)); } }); if (lines.length === 1) { alert("Found the table but no rows in it. Try again on the full response sheet page."); return; } const blob = new Blob([lines.join("\\n")], { type: "text/csv" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "NEET_OMR_Responses.csv"; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function(){ URL.revokeObjectURL(url); }, 1000); })();`;
const BOOKMARKLET_URI = 'javascript:' + encodeURIComponent(BOOKMARKLET_CODE);

export default function NeetMarksCalculator() {
  const [keys, setKeys] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const copyBookmarklet = async () => {
    try {
      await navigator.clipboard.writeText(BOOKMARKLET_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (rare, non-HTTPS/older browser) — the
      // code is still shown below for manual copy.
    }
  };

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
            {result.dropped > 0 && (
              <p className="mt-3 text-xs text-white/40">
                {result.dropped} question{result.dropped === 1 ? '' : 's'} officially dropped by NTA — excluded
                from scoring.
              </p>
            )}
            {result.incorrectQuestions.length > 0 && (
              <p className="mt-4 text-xs text-white/40">
                Missed: {result.incorrectQuestions.join(', ')}
              </p>
            )}
          </div>
        )}

        <details open className="mt-8 rounded-2xl border border-line bg-panel/60 p-5 text-sm text-white/60">
          <summary className="cursor-pointer font-semibold text-white">How do I get my response CSV?</summary>

          <p className="mt-3">
            Save the button below as a bookmark once. Then, whenever you're on the official NEET response-sheet
            page (logged in), tap that saved bookmark — it downloads your recorded responses as a CSV, ready to
            upload here. Works the same way on a phone or a computer.
          </p>

          <div className="mt-4 rounded-xl border border-line bg-base p-4">
            <p className="mb-2 text-xs font-semibold text-white/70">On a computer</p>
            <p className="mb-2 text-xs text-white/40">
              Drag this to your browser's bookmarks bar (show it first if it's hidden):
            </p>
            <a
              href={BOOKMARKLET_URI}
              onClick={(e) => e.preventDefault()}
              draggable="true"
              className="inline-flex cursor-grab items-center gap-1.5 rounded-lg bg-violet px-3 py-1.5 text-xs font-semibold text-white active:cursor-grabbing"
            >
              <Bookmark size={13} /> Get NEET CSV
            </a>

            <p className="mb-2 mt-4 text-xs font-semibold text-white/70">On a phone</p>
            <ol className="list-decimal space-y-1 pl-4 text-xs text-white/40">
              <li>Bookmark any page in your browser (e.g. this one).</li>
              <li>Open your bookmarks, edit that bookmark, and rename it "NEET CSV".</li>
              <li>
                Copy the code below and paste it over the bookmark's URL, replacing what's there — then save.
              </li>
              <li>Go to the NEET response-sheet page (logged in), open your bookmarks, and tap "NEET CSV".</li>
            </ol>
            <button
              onClick={copyBookmarklet}
              className="mt-2 flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-white/60 hover:text-white"
            >
              {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy code'}
            </button>
            <pre className="mt-2 max-h-24 overflow-y-auto rounded-lg border border-line bg-panel p-2 text-[10px] text-lavender">
              {BOOKMARKLET_CODE}
            </pre>
          </div>

          <p className="mt-3 text-xs text-white/40">
            If a row shows "Drop" instead of an option, that question was officially cancelled by NTA — it's
            excluded from your score entirely rather than scored as blank.
          </p>
        </details>

        <p className="mt-6 text-xs text-white/25">
          Nothing you upload here is stored — scoring happens entirely in your browser.
        </p>
      </div>
    </div>
  );
}
