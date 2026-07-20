import { useEffect, useState } from 'react';
import { Upload, CheckCircle2, XCircle, MinusCircle, Camera, FileText, Loader2, AlertTriangle } from 'lucide-react';
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

const TOTAL_QUESTIONS = 180;

export default function NeetMarksCalculator() {
  const [keys, setKeys] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [mode, setMode] = useState('csv'); // 'csv' | 'photo'
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Photo-detection review state — never scored until the user confirms.
  const [detecting, setDetecting] = useState(false);
  const [reviewResponses, setReviewResponses] = useState(null); // {qno: '1'-'4'} | null
  const [lowConfidence, setLowConfidence] = useState(new Set());
  const [multiMarked, setMultiMarked] = useState(new Set());

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

  const resetOutcome = () => {
    setResult(null);
    setError(null);
    setReviewResponses(null);
    setLowConfidence(new Set());
    setMultiMarked(new Set());
  };

  const switchMode = (next) => {
    setMode(next);
    setFileName('');
    resetOutcome();
  };

  const handleCsvFile = (file) => {
    resetOutcome();
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

  const handlePhotoFile = async (file) => {
    resetOutcome();
    if (!file) return;
    if (!selectedKey) {
      setError('Pick an exam and paper code first.');
      return;
    }
    setFileName(file.name);
    setDetecting(true);

    try {
      const objectUrl = URL.createObjectURL(file);
      const imgEl = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('image_load_failed'));
        img.src = objectUrl;
      });

      const { detectResponsesFromImage } = await import('../../lib/omrImageScoring.js');
      const { responses, lowConfidence: low, multiMarked: multi, warning } = await detectResponsesFromImage(imgEl);
      URL.revokeObjectURL(objectUrl);

      if (warning === 'not_enough_marks' || warning === 'grid_fit_failed') {
        setError(
          "Couldn't reliably find the bubble grid in that photo. Try a flatter, well-lit, straight-on shot of the full sheet — or use CSV upload instead."
        );
        setDetecting(false);
        return;
      }

      setReviewResponses(responses);
      setLowConfidence(new Set(low));
      setMultiMarked(new Set(multi));
    } catch {
      setError("Couldn't process that photo — try a clearer image, or use CSV upload instead.");
    }
    setDetecting(false);
  };

  const setReviewAnswer = (qno, val) => {
    setReviewResponses((prev) => {
      const next = { ...prev };
      if (val) next[qno] = val;
      else delete next[qno];
      return next;
    });
    setLowConfidence((prev) => {
      if (!prev.has(qno)) return prev;
      const next = new Set(prev);
      next.delete(qno);
      return next;
    });
    setMultiMarked((prev) => {
      if (!prev.has(qno)) return prev;
      const next = new Set(prev);
      next.delete(qno);
      return next;
    });
  };

  const confirmReview = () => {
    if (!selectedKey || !reviewResponses) return;
    setResult(scoreResponses(reviewResponses, selectedKey));
  };

  return (
    <div className="min-h-screen bg-base bg-omr-grid bg-omr px-5 py-16 md:py-20">
      <BackButton fallback="/" />
      <SEO
        title="NEET Marks Calculator — arpansarkar.org"
        description="Upload your NEET OMR sheet — CSV or photo — and get your score instantly, checked against the official answer key."
        path="/tools/neet-marks-calculator"
      />
      <div className="mx-auto max-w-2xl">
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-amber">Tools</div>
        <h1 className="mt-3 font-display text-3xl font-bold text-white md:text-4xl">NEET Marks Calculator</h1>
        <p className="mt-3 max-w-xl text-sm text-white/50">
          Upload your recorded responses — as a CSV or a photo of your OMR sheet — and get your score instantly,
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
                resetOutcome();
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
              <div className="mb-3 mt-5 flex gap-1.5 rounded-lg border border-line bg-base p-1">
                <button
                  onClick={() => switchMode('csv')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition ${
                    mode === 'csv' ? 'bg-violet text-white' : 'text-white/50 hover:text-white'
                  }`}
                >
                  <FileText size={13} /> Upload CSV
                </button>
                <button
                  onClick={() => switchMode('photo')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition ${
                    mode === 'photo' ? 'bg-violet text-white' : 'text-white/50 hover:text-white'
                  }`}
                >
                  <Camera size={13} /> Upload photo
                </button>
              </div>

              {mode === 'csv' ? (
                <>
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
                    onChange={(e) => handleCsvFile(e.target.files?.[0])}
                  />
                </>
              ) : (
                <>
                  <label
                    htmlFor="omr-photo-upload"
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line px-4 py-8 text-center transition hover:border-violet/50"
                  >
                    {detecting ? (
                      <Loader2 size={20} className="animate-spin text-lavender" />
                    ) : (
                      <Camera size={20} className="text-lavender" />
                    )}
                    <span className="text-sm text-white/70">
                      {detecting ? 'Reading bubbles…' : fileName || 'Click to choose a photo of your OMR sheet'}
                    </span>
                    <span className="text-xs text-white/30">
                      Flat, straight-on, well-lit — full sheet in frame
                    </span>
                  </label>
                  <input
                    id="omr-photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={detecting}
                    onChange={(e) => handlePhotoFile(e.target.files?.[0])}
                  />
                </>
              )}
            </>
          )}

          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        </div>

        {reviewResponses && !result && (
          <div className="mt-6 rounded-2xl border border-line bg-panel p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Check the detected answers</p>
                <p className="mt-1 text-xs text-white/45">
                  Automatic detection isn't perfect — review before scoring.
                  {lowConfidence.size > 0 && (
                    <span className="text-amber"> {lowConfidence.size} question{lowConfidence.size === 1 ? '' : 's'} need a closer look.</span>
                  )}
                  {multiMarked.size > 0 && (
                    <span className="text-red-400"> {multiMarked.size} question{multiMarked.size === 1 ? '' : 's'} had two bubbles marked — counted as incorrect unless you fix them below.</span>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 max-h-[28rem] overflow-y-auto rounded-lg border border-line">
              {Array.from({ length: TOTAL_QUESTIONS }, (_, i) => i + 1).map((qno) => {
                const q = String(qno);
                const flagged = lowConfidence.has(q);
                const multi = multiMarked.has(q);
                return (
                  <div
                    key={q}
                    className={`flex items-center justify-between gap-2 border-b border-line/60 px-3 py-1.5 last:border-b-0 ${
                      multi ? 'bg-red-500/5' : flagged ? 'bg-amber/5' : ''
                    }`}
                  >
                    <span className="flex w-24 items-center gap-1 text-xs text-white/50">
                      {multi && <AlertTriangle size={11} className="text-red-400" />}
                      {flagged && <AlertTriangle size={11} className="text-amber" />}
                      Q{q}
                      {multi && <span className="text-[10px] text-red-400">×2</span>}
                    </span>
                    <div className="flex gap-1">
                      {['1', '2', '3', '4'].map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setReviewAnswer(q, reviewResponses[q] === opt ? null : opt)}
                          className={`h-6 w-6 rounded-full border text-[11px] transition ${
                            reviewResponses[q] === opt
                              ? 'border-violet bg-violet text-white'
                              : 'border-line text-white/40 hover:border-violet/50 hover:text-white'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={confirmReview}
              className="mt-4 w-full rounded-lg bg-violet px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-soft"
            >
              Confirm &amp; see my score
            </button>
          </div>
        )}

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

        <details className="mt-8 rounded-2xl border border-line bg-panel/60 p-5 text-sm text-white/60">
          <summary className="cursor-pointer font-semibold text-white">How do I get my response CSV?</summary>
          <p className="mt-3">
            While logged into the official NEET OMR/response-sheet page, open your browser's developer console
            and paste this script — it downloads your recorded responses as a CSV ready to upload here:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-base p-3 text-[11px] text-lavender">
            {BOOKMARKLET_SNIPPET}
          </pre>
          <p className="mt-3 text-xs text-white/40">
            If a row shows "Drop" instead of an option, that question was officially cancelled by NTA — it's
            excluded from your score entirely rather than scored as blank.
          </p>
        </details>

        <p className="mt-6 text-xs text-white/25">
          Nothing you upload here is stored — CSV parsing and photo bubble-detection both happen entirely in
          your browser.
        </p>
      </div>
    </div>
  );
}
