// Detects filled bubbles in a photo of the standard NTA-style NEET OMR
// answer sheet (180 questions, laid out as 4 blocks of 45 rows x 4 options:
// block 0 = Q1-45, block 1 = Q46-90, block 2 = Q91-135, block 3 = Q136-180).
//
// This is a SELF-CALIBRATING detector, not a fixed-pixel template: rather
// than trusting hardcoded coordinates (fragile — depends on every photo
// being framed/cropped identically), it clusters the actual darkened-bubble
// positions found in this specific photo to reconstruct the row/column
// grid, then samples all 720 possible bubble positions against that fitted
// grid. This tolerates different crops, zoom levels and phone cameras far
// better than a fixed template would.
//
// Loads OpenCV.js lazily (dynamic import from the calling page) since it's
// an ~8MB WASM payload — CSV-only users should never download it.
//
// Known limitation: this does NOT correct for a photo taken at a
// significant angle (no perspective/rotation warp in v1). Works best with
// a reasonably flat, front-on, well-lit photo. Because detection can never
// be guaranteed, the calling page MUST show a review/correct step before
// scoring — never trust this output silently.

import { MULTI_MARKED } from './omrScoring.js';

const BLOCKS = [
  { startQ: 1, label: 'block0' },
  { startQ: 46, label: 'block1' },
  { startQ: 91, label: 'block2' },
  { startQ: 136, label: 'block3' },
];
const ROWS_PER_BLOCK = 45;
const OPTIONS_PER_ROW = 4;

let cvPromise = null;
function loadCv() {
  if (!cvPromise) {
    cvPromise = import('@techstark/opencv-js').then((mod) => {
      const cv = mod.default || mod;
      if (cv.getBuildInformation) return cv;
      return new Promise((resolve) => {
        cv.onRuntimeInitialized = () => resolve(cv);
      });
    });
  }
  return cvPromise;
}

// Groups sorted numbers into clusters, splitting wherever the gap to the
// next value exceeds `gap`. Returns cluster centers (means).
function clusterSorted(values, gap) {
  if (values.length === 0) return [];
  const clusters = [[values[0]]];
  for (let i = 1; i < values.length; i++) {
    const v = values[i];
    const cluster = clusters[clusters.length - 1];
    if (v - cluster[cluster.length - 1] > gap) clusters.push([v]);
    else cluster.push(v);
  }
  return clusters.map((c) => c.reduce((a, b) => a + b, 0) / c.length);
}

// Fits a uniform grid (start + pitch) to a set of observed cluster centers,
// tolerating missing clusters (e.g. a column nobody happened to mark).
// Assumes clusters are a subset of {start + k*pitch : k = 0..count-1}.
function fitUniformGrid(clusterCenters, expectedCount) {
  if (clusterCenters.length < 2) return null;
  const sorted = [...clusterCenters].sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i] - sorted[i - 1]);
  gaps.sort((a, b) => a - b);
  // Median of the smaller half of gaps approximates the true single-step
  // pitch (larger gaps are multi-step, i.e. skipped clusters).
  const pitchEstimate = gaps[Math.floor(gaps.length / 2)];
  if (!pitchEstimate || pitchEstimate < 1) return null;

  // Snap every observed center to the nearest integer multiple of the
  // pitch estimate, then least-squares fit start/pitch against those
  // indices for a refined result.
  const ref = sorted[0];
  const indices = sorted.map((v) => Math.round((v - ref) / pitchEstimate));
  const n = indices.length;
  const sumI = indices.reduce((a, b) => a + b, 0);
  const sumV = sorted.reduce((a, b) => a + b, 0);
  const sumII = indices.reduce((a, i) => a + i * i, 0);
  const sumIV = indices.reduce((a, i, idx) => a + i * sorted[idx], 0);
  const denom = n * sumII - sumI * sumI;
  let pitch = pitchEstimate;
  let start = ref;
  if (denom !== 0) {
    pitch = (n * sumIV - sumI * sumV) / denom;
    start = (sumV - pitch * sumI) / n;
  }
  if (!Number.isFinite(pitch) || !Number.isFinite(start) || pitch <= 0) return null;
  return { start, pitch };
}

/**
 * Runs bubble detection on an HTMLImageElement (already loaded).
 * Returns:
 *   - responses: {qno: '1'-'4' | MULTI_MARKED} — confident single marks,
 *     plus MULTI_MARKED for questions where 2+ bubbles were darkened
 *     (NTA scores these as incorrect outright — see omrScoring.js)
 *   - lowConfidence: string[] of qnos with a faint/ambiguous single mark,
 *     left out of `responses` entirely so they don't silently misscore
 *   - multiMarked: string[] of qnos flagged MULTI_MARKED, for UI display
 * `responses` only includes questions the detector is reasonably confident
 * about (or clearly multi-marked); everything else the caller should treat
 * as blank until the person reviews it.
 */
export async function detectResponsesFromImage(imgEl) {
  const cv = await loadCv();

  const src = cv.imread(imgEl);
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  // Downscale very large photos for speed; keep a scale factor to convert
  // detected coordinates back if needed (we work entirely in this scale).
  const maxDim = 2000;
  let working = gray;
  const scale = Math.min(1, maxDim / Math.max(gray.cols, gray.rows));
  if (scale < 1) {
    working = new cv.Mat();
    cv.resize(gray, working, new cv.Size(Math.round(gray.cols * scale), Math.round(gray.rows * scale)));
  }

  const w = working.cols;
  const h = working.rows;

  const bin = new cv.Mat();
  cv.adaptiveThreshold(working, bin, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 35, 12);

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(bin, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

  const totalArea = w * h;
  const minArea = totalArea * 0.00004;
  const maxArea = totalArea * 0.0009;
  const leftExclude = w * 0.33; // roll no / booklet no / booklet code boxes
  const topExclude = h * 0.03;
  const bottomExclude = h * 0.97;

  const candidates = [];
  for (let i = 0; i < contours.size(); i++) {
    const c = contours.get(i);
    const area = cv.contourArea(c);
    if (area > minArea && area < maxArea) {
      const rect = cv.boundingRect(c);
      const ar = rect.width / rect.height;
      const cx = rect.x + rect.width / 2;
      const cy = rect.y + rect.height / 2;
      if (ar > 0.55 && ar < 1.8 && cx > leftExclude && cy > topExclude && cy < bottomExclude) {
        candidates.push({ cx, cy });
      }
    }
    c.delete();
  }
  contours.delete();
  hierarchy.delete();
  bin.delete();

  if (candidates.length < 20) {
    gray.delete();
    if (working !== gray) working.delete();
    src.delete();
    return { responses: {}, lowConfidence: [], warning: 'not_enough_marks' };
  }

  // --- Fit the row grid (shared across all 4 blocks) ---
  const ySorted = candidates.map((p) => p.cy).sort((a, b) => a - b);
  const rowGapThreshold = h * 0.008;
  const rowClusters = clusterSorted(ySorted, rowGapThreshold);
  const rowFit = fitUniformGrid(rowClusters, ROWS_PER_BLOCK);

  // --- Fit the column grid: first split into up to 4 blocks by big gaps,
  // then fit option pitch within each block, then fit block pitch across
  // the 4 block-start estimates. ---
  const xSorted = candidates.map((p) => p.cx).sort((a, b) => a - b);
  const blockGapThreshold = w * 0.05;
  const blockGroups = [];
  {
    let cur = [xSorted[0]];
    for (let i = 1; i < xSorted.length; i++) {
      if (xSorted[i] - cur[cur.length - 1] > blockGapThreshold) {
        blockGroups.push(cur);
        cur = [xSorted[i]];
      } else {
        cur.push(xSorted[i]);
      }
    }
    blockGroups.push(cur);
  }

  const colGapThreshold = w * 0.012;
  let pitchSamples = [];
  const blockStartEstimates = [];
  for (const group of blockGroups) {
    const cols = clusterSorted(group, colGapThreshold);
    if (cols.length >= 2) {
      const fit = fitUniformGrid(cols, OPTIONS_PER_ROW);
      if (fit) {
        pitchSamples.push(fit.pitch);
        blockStartEstimates.push(fit.start);
      }
    } else if (cols.length === 1) {
      blockStartEstimates.push(cols[0]);
    }
  }

  gray.delete();
  if (working !== gray) working.delete();
  src.delete();

  if (!rowFit || blockStartEstimates.length < 2 || pitchSamples.length === 0) {
    return { responses: {}, lowConfidence: [], warning: 'grid_fit_failed' };
  }

  const optionPitch = pitchSamples.reduce((a, b) => a + b, 0) / pitchSamples.length;
  const blockFit = fitUniformGrid(blockStartEstimates, BLOCKS.length);
  const blockPitch = blockFit ? blockFit.pitch : optionPitch * OPTIONS_PER_ROW * 1.7;
  // Anchor block starts on the leftmost detected estimate rather than a
  // possibly-noisy least-squares intercept.
  const anchorBlock = Math.min(...blockStartEstimates);
  const blockXStart = BLOCKS.map((_, i) => anchorBlock + i * blockPitch);

  // --- Sample every one of the 720 grid positions for ink darkness ---
  const grayFull = new cv.Mat();
  const srcFull = cv.imread(imgEl);
  cv.cvtColor(srcFull, grayFull, cv.COLOR_RGBA2GRAY);
  let sampleMat = grayFull;
  if (scale < 1) {
    sampleMat = new cv.Mat();
    cv.resize(grayFull, sampleMat, new cv.Size(w, h));
  }

  const sampleRadius = Math.max(4, optionPitch * 0.28);
  const responses = {};
  const lowConfidence = [];
  const multiMarked = [];
  const FILLED_THRESHOLD = 70; // empirically: blank ~15-30, filled ~190-230

  for (let b = 0; b < BLOCKS.length; b++) {
    for (let r = 0; r < ROWS_PER_BLOCK; r++) {
      const qno = String(BLOCKS[b].startQ + r);
      const cy = rowFit.start + r * rowFit.pitch;
      const darkness = [];
      for (let o = 0; o < OPTIONS_PER_ROW; o++) {
        const cx = blockXStart[b] + o * optionPitch;
        const mean = meanGrayAt(sampleMat, cv, cx, cy, sampleRadius);
        darkness.push(255 - mean); // higher = darker/more filled
      }
      const filledOptions = darkness.reduce((count, d) => count + (d > FILLED_THRESHOLD ? 1 : 0), 0);

      if (filledOptions === 1) {
        const idx = darkness.indexOf(Math.max(...darkness));
        responses[qno] = String(idx + 1);
      } else if (filledOptions >= 2) {
        // Two or more bubbles darkened for the same question — NTA scores
        // this as incorrect outright, never blank, regardless of whether
        // one of the marks happens to be right.
        responses[qno] = MULTI_MARKED;
        multiMarked.push(qno);
      } else if (Math.max(...darkness) > FILLED_THRESHOLD * 0.6) {
        // Something faint was marked but not confidently — flag for
        // review, leave unanswered so it doesn't silently misscore.
        lowConfidence.push(qno);
      }
    }
  }

  grayFull.delete();
  srcFull.delete();
  if (sampleMat !== grayFull) sampleMat.delete();

  return { responses, lowConfidence, multiMarked };
}

function meanGrayAt(mat, cv, cx, cy, radius) {
  const x0 = Math.max(0, Math.round(cx - radius));
  const y0 = Math.max(0, Math.round(cy - radius));
  const x1 = Math.min(mat.cols - 1, Math.round(cx + radius));
  const y1 = Math.min(mat.rows - 1, Math.round(cy + radius));
  if (x1 <= x0 || y1 <= y0) return 255;
  const roi = mat.roi(new cv.Rect(x0, y0, x1 - x0, y1 - y0));
  const mean = cv.mean(roi)[0];
  roi.delete();
  return mean;
}

export const TOTAL_QUESTIONS = BLOCKS.length * ROWS_PER_BLOCK;
