import { useEffect, useRef, useState } from 'react';
import { Upload, CheckCircle2, XCircle, MinusCircle, Camera, FileText, Loader2, AlertTriangle, SlidersHorizontal } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { parseResponseCsv, scoreResponses, classifyAnswer } from '../../lib/omrScoring';
import { loadImageData, adjustGrid, sampleGridResponses } from '../../lib/omrManualAlign';
import { DEFAULT_GRID_FRACTIONS, TOTAL_QUESTIONS } from '../../lib/omrGridConstants';
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
  const [mode, setMode] = useState('csv'); // 'csv' | 'photo'
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Photo-detection review state — never scored until the user confirms.
  const [detecting, setDetecting] = useState(false);
  const [reviewResponses, setReviewResponses] = useState(null); // {qno: '1'-'4'} | null
  const [lowConfidence, setLowConfidence] = useState(new Set());
  const [multiMarked, setMultiMarked] = useState(new Set());
  const [positions, setPositions] = useState({}); // {qno: {fx, fy}} for the overlay
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);
  const photoUrlRef = useRef(null);

  // Manual alignment fallback — lets the person nudge the grid when
  // automatic detection is uncertain or off. imageDataRef/baseGridRef are
  // refs (not state) since they're large/stable and only ever read inside
  // the slider handler, not rendered directly.
  const imageDataRef = useRef(null);
  const baseGridRef = useRef(null);
  const [usingFallbackGrid, setUsingFallbackGrid] = useState(false);
  const [align, setAlign] = useState({ x: 0, y: 0, scale: 1 });

  useEffect(() => {
    // Revoke whichever object URL we created, whenever it's replaced or
    // the page is left — these aren't meant to outlive the review.
    return () => {
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    };
  }, []);

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
    setPositions({});
    setUsingFallbackGrid(false);
    setAlign({ x: 0, y: 0, scale: 1 });
    imageDataRef.current = null;
    baseGridRef.current = null;
  };

  const clearPhotoPreview = () => {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    photoUrlRef.current = null;
    setPhotoPreviewUrl(null);
  };

  const switchMode = (next) => {
    setMode(next);
    setFileName('');
    clearPhotoPreview();
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
    clearPhotoPreview();

    try {
      const { isPdfFile, pdfFileToImage } = await import('../../lib/pdfToImage.js');
      let imgEl;
      let previewUrl;

      if (isPdfFile(file)) {
        imgEl = await pdfFileToImage(file);
        previewUrl = imgEl.src; // already a data URL from rendering the page
      } else {
        const objectUrl = URL.createObjectURL(file);
        previewUrl = objectUrl;
        imgEl = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('image_load_failed'));
          img.src = objectUrl;
        });
      }

      const { detectResponsesFromImage } = await import('../../lib/omrImageScoring.js');
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('detection_timeout')), 30000)
      );
      const {
        responses,
        lowConfidence: low,
        multiMarked: multi,
        positions: pos,
        grid,
        warning,
      } = await Promise.race([detectResponsesFromImage(imgEl), timeout]);

      // Cache pixel data for the manual alignment sliders regardless of
      // whether automatic detection succeeded — they resample from this
      // directly, no need to re-decode the photo on every nudge.
      imageDataRef.current = loadImageData(imgEl);

      // Keep this alive — the review overlay below renders the sheet
      // itself with detected marks drawn on top of it.
      photoUrlRef.current = previewUrl;
      setPhotoPreviewUrl(previewUrl);

      if (warning === 'not_enough_marks' || warning === 'grid_fit_failed') {
        // Automatic detection couldn't confidently fit a grid at all —
        // fall back to a generic starting position and let the person
        // align it manually with the sliders, rather than a dead end.
        baseGridRef.current = DEFAULT_GRID_FRACTIONS;
        setUsingFallbackGrid(true);
        const fallback = sampleGridResponses(imageDataRef.current, DEFAULT_GRID_FRACTIONS);
        setReviewResponses(fallback.responses);
        setLowConfidence(new Set(fallback.lowConfidence));
        setMultiMarked(new Set(fallback.multiMarked));
        setPositions(fallback.positions);
        setDetecting(false);
        return;
      }

      baseGridRef.current = grid;
      setReviewResponses(responses);
      setLowConfidence(new Set(low));
      setMultiMarked(new Set(multi));
      setPositions(pos);
    } catch (err) {
      setError(
        err?.message === 'detection_timeout'
          ? 'That took too long — check your connection and try again, or use CSV upload instead.'
          : "Couldn't process that file — try re-downloading it from the NTA portal, or use CSV upload instead."
      );
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

  const updateAlign = (next) => {
    const merged = { ...align, ...next };
    setAlign(merged);
    if (!imageDataRef.current || !baseGridRef.current) return;
    const grid = adjustGrid(baseGridRef.current, {
      xOffsetFrac: merged.x,
      yOffsetFrac: merged.y,
      scale: merged.scale,
    });
    const resampled = sampleGridResponses(imageDataRef.current, grid);
    setReviewResponses(resampled.responses);
    setLowConfidence(new Set(resampled.lowConfidence));
    setMultiMarked(new Set(resampled.multiMarked));
    setPositions(resampled.positions);
  };

  const resetAlign = () => updateAlign({ x: 0, y: 0, scale: 1 });

  const confirmReview = () => {
    if (!selectedKey || !reviewResponses) return;
    setResult(scoreResponses(reviewResponses, selectedKey));
  };

  return (
    <div className="min-h-screen bg-base bg-omr-grid bg-omr px-5 py-16 md:py-20">
      <BackButton fallback="/" />
      <SEO
        title="NEET Marks Calculator — arpansarkar.org"
        description="Upload your NEET OMR response sheet — CSV, PDF, or image — and get your score instantly, checked against the official answer key."
        path="/tools/neet-marks-calculator"
      />
      <div className="mx-auto max-w-2xl">
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-amber">Tools</div>
        <h1 className="mt-3 font-display text-3xl font-bold text-white md:text-4xl">NEET Marks Calculator</h1>
        <p className="mt-3 max-w-xl text-sm text-white/50">
          Upload your recorded responses — as a CSV, or the scanned OMR response sheet PDF/image NTA sent you — and get your score instantly,
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
                  <Camera size={13} /> Upload OMR sheet
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
                      {detecting ? 'Reading bubbles…' : fileName || 'Click to choose your OMR sheet'}
                    </span>
                    <span className="text-xs text-white/30">
                      The scanned response sheet PDF (or image) NTA sent you — from the portal or your email
                    </span>
                  </label>
                  <input
                    id="omr-photo-upload"
                    type="file"
                    accept="application/pdf,.pdf,image/*"
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

        {photoPreviewUrl && (
          <div className="mt-6 rounded-2xl border border-line bg-panel p-4">
            <div className="relative overflow-hidden rounded-lg border border-line">
              <img src={photoPreviewUrl} alt="Your uploaded OMR sheet" className="block w-full" />
              {Object.entries(positions).map(([qno, pos]) => {
                let status;
                if (result) {
                  status = classifyAnswer(reviewResponses[qno], selectedKey?.key?.[qno]);
                } else if (multiMarked.has(qno)) {
                  status = 'multi';
                } else if (lowConfidence.has(qno)) {
                  status = 'low';
                } else {
                  status = 'marked';
                }
                const dotClass =
                  {
                    correct: 'bg-green-400 border-green-200',
                    incorrect: 'bg-red-500 border-red-300',
                    multi: 'bg-red-500 border-red-300',
                    dropped: 'bg-white/40 border-white/60',
                    blank: 'bg-white/20 border-white/40',
                    marked: 'bg-sky-400 border-sky-200',
                    low: 'bg-amber border-amber/60',
                  }[status] || 'bg-sky-400 border-sky-200';
                return (
                  <span
                    key={qno}
                    className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border ${dotClass}`}
                    style={{ left: `${pos.fx * 100}%`, top: `${pos.fy * 100}%` }}
                  />
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-white/40">
              {result ? (
                <>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-400" /> Correct</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Wrong / multi-marked</span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-400" /> Detected mark</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Two bubbles marked</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber" /> Faint / uncertain</span>
                </>
              )}
            </div>
          </div>
        )}

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

            {usingFallbackGrid && (
              <p className="mt-3 rounded-lg border border-amber/30 bg-amber/5 px-3 py-2 text-xs text-amber">
                Couldn't confidently find your bubble grid automatically — starting from a default position.
                Use the sliders below to line it up with your sheet (watch the dots on the image above move as
                you adjust).
              </p>
            )}

            <div className="mt-4 rounded-lg border border-line bg-base/60 p-4">
              <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-white/70">
                <SlidersHorizontal size={13} /> Fine-tune alignment
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 flex justify-between text-[11px] text-white/40">
                    <span>X offset</span><span>{(align.x * 100).toFixed(1)}%</span>
                  </label>
                  <input
                    type="range"
                    min={-0.06}
                    max={0.06}
                    step={0.001}
                    value={align.x}
                    onChange={(e) => updateAlign({ x: Number(e.target.value) })}
                    className="w-full accent-violet"
                  />
                </div>
                <div>
                  <label className="mb-1 flex justify-between text-[11px] text-white/40">
                    <span>Y offset</span><span>{(align.y * 100).toFixed(1)}%</span>
                  </label>
                  <input
                    type="range"
                    min={-0.06}
                    max={0.06}
                    step={0.001}
                    value={align.y}
                    onChange={(e) => updateAlign({ y: Number(e.target.value) })}
                    className="w-full accent-violet"
                  />
                </div>
                <div>
                  <label className="mb-1 flex justify-between text-[11px] text-white/40">
                    <span>Size</span><span>{(align.scale * 100).toFixed(0)}%</span>
                  </label>
                  <input
                    type="range"
                    min={0.92}
                    max={1.08}
                    step={0.002}
                    value={align.scale}
                    onChange={(e) => updateAlign({ scale: Number(e.target.value) })}
                    className="w-full accent-violet"
                  />
                </div>
              </div>
              <button
                onClick={resetAlign}
                className="mt-3 text-xs text-white/40 underline underline-offset-2 hover:text-white"
              >
                Reset alignment
              </button>
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
          Nothing you upload here is stored — CSV parsing and bubble detection both happen entirely in
          your browser.
        </p>
      </div>
    </div>
  );
}
