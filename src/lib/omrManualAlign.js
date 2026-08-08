// Manual alignment fallback for the NEET OMR photo checker.
//
// When automatic detection (omrImageScoring.js) can't confidently fit a
// grid — or even when it can, but the person notices the overlay dots
// don't quite line up with their real bubbles — this lets them nudge an
// X offset, Y offset, and scale until it lines up, the same well-known
// pattern other OMR checkers use as a fallback (there's no way to
// guarantee automatic detection on every photo, so a manual rescue path
// is standard, not something unique to any one tool).
//
// Deliberately framework-free plain functions, same as omrScoring.js.

import { MULTI_MARKED } from './omrScoring.js';
import {
  BLOCKS,
  ROWS_PER_BLOCK,
  OPTIONS_PER_ROW,
  FILLED_THRESHOLD,
  LOW_CONFIDENCE_RATIO,
} from './omrGridConstants.js';

/**
 * Draws the photo to an offscreen canvas once and returns its pixel data
 * plus dimensions. Do this once per photo, then reuse the result for every
 * slider tick — re-decoding the image on every change would feel laggy.
 */
export function loadImageData(imgEl, maxDim = 1600) {
  const scale = Math.min(1, maxDim / Math.max(imgEl.naturalWidth, imgEl.naturalHeight));
  const width = Math.round(imgEl.naturalWidth * scale);
  const height = Math.round(imgEl.naturalHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(imgEl, 0, 0, width, height);

  const { data } = ctx.getImageData(0, 0, width, height);
  return { data, width, height };
}

// Average grayscale darkness (0-255, 255 = fully black) in a small box
// around (cx, cy), reading straight out of the cached ImageData array —
// no canvas calls, so this is fast enough to run 720 times per slider tick.
function darknessAt(imageData, cx, cy, radius) {
  const { data, width, height } = imageData;
  const x0 = Math.max(0, Math.round(cx - radius));
  const y0 = Math.max(0, Math.round(cy - radius));
  const x1 = Math.min(width - 1, Math.round(cx + radius));
  const y1 = Math.min(height - 1, Math.round(cy + radius));
  if (x1 <= x0 || y1 <= y0) return 0;

  let sum = 0;
  let count = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * width + x) * 4;
      // Standard luminance weighting.
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sum += gray;
      count += 1;
    }
  }
  return count ? 255 - sum / count : 0;
}

/**
 * Applies an offset/scale adjustment to a base grid (either the fitted
 * grid from automatic detection, or DEFAULT_GRID_FRACTIONS as a starting
 * guess). Scale is applied around the grid's own center so the "size"
 * slider feels like resizing the whole grid in place, not shifting it.
 */
export function adjustGrid(baseGrid, { xOffsetFrac = 0, yOffsetFrac = 0, scale = 1 } = {}) {
  const { rowStartFrac, rowPitchFrac, blockXStartFrac, optionPitchFrac } = baseGrid;

  const yMin = rowStartFrac;
  const yMax = rowStartFrac + (ROWS_PER_BLOCK - 1) * rowPitchFrac;
  const yCenter = (yMin + yMax) / 2;

  const xMin = blockXStartFrac[0];
  const xMax = blockXStartFrac[blockXStartFrac.length - 1] + (OPTIONS_PER_ROW - 1) * optionPitchFrac;
  const xCenter = (xMin + xMax) / 2;

  return {
    rowStartFrac: yCenter + (rowStartFrac - yCenter) * scale + yOffsetFrac,
    rowPitchFrac: rowPitchFrac * scale,
    blockXStartFrac: blockXStartFrac.map((x) => xCenter + (x - xCenter) * scale + xOffsetFrac),
    optionPitchFrac: optionPitchFrac * scale,
  };
}

/**
 * Samples every one of the 720 grid positions against cached ImageData for
 * a given grid (base or adjusted). Same classification rules and return
 * shape as detectResponsesFromImage in omrImageScoring.js, so the calling
 * page can treat both interchangeably.
 */
export function sampleGridResponses(imageData, grid) {
  const { width: w, height: h } = imageData;
  const { rowStartFrac, rowPitchFrac, blockXStartFrac, optionPitchFrac } = grid;
  const sampleRadius = Math.max(4, optionPitchFrac * w * 0.28);

  const responses = {};
  const lowConfidence = [];
  const multiMarked = [];
  const positions = {};

  for (let b = 0; b < BLOCKS.length; b++) {
    for (let r = 0; r < ROWS_PER_BLOCK; r++) {
      const qno = String(BLOCKS[b].startQ + r);
      const cy = (rowStartFrac + r * rowPitchFrac) * h;
      const darkness = [];
      const xPositions = [];
      for (let o = 0; o < OPTIONS_PER_ROW; o++) {
        const cx = (blockXStartFrac[b] + o * optionPitchFrac) * w;
        xPositions.push(cx);
        darkness.push(darknessAt(imageData, cx, cy, sampleRadius));
      }
      const filledIdx = darkness.reduce((idxs, d, i) => (d > FILLED_THRESHOLD ? [...idxs, i] : idxs), []);

      if (filledIdx.length === 1) {
        responses[qno] = String(filledIdx[0] + 1);
        positions[qno] = { fx: xPositions[filledIdx[0]] / w, fy: cy / h };
      } else if (filledIdx.length >= 2) {
        responses[qno] = MULTI_MARKED;
        multiMarked.push(qno);
        const midX = filledIdx.reduce((sum, i) => sum + xPositions[i], 0) / filledIdx.length;
        positions[qno] = { fx: midX / w, fy: cy / h };
      } else {
        const maxD = Math.max(...darkness);
        if (maxD > FILLED_THRESHOLD * LOW_CONFIDENCE_RATIO) {
          lowConfidence.push(qno);
          positions[qno] = { fx: xPositions[darkness.indexOf(maxD)] / w, fy: cy / h };
        }
      }
    }
  }

  return { responses, lowConfidence, multiMarked, positions };
}
