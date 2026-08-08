// Layout constants for the standard NTA-style NEET OMR sheet, shared
// between the automatic detector (omrImageScoring.js) and the manual
// alignment fallback (omrManualAlign.js) so the two never drift apart.

export const BLOCKS = [
  { startQ: 1, label: 'block0' },
  { startQ: 46, label: 'block1' },
  { startQ: 91, label: 'block2' },
  { startQ: 136, label: 'block3' },
];
export const ROWS_PER_BLOCK = 45;
export const OPTIONS_PER_ROW = 4;
export const TOTAL_QUESTIONS = BLOCKS.length * ROWS_PER_BLOCK;

// Ink-darkness threshold (0-255 scale, 255 = fully black) above which a
// bubble is considered filled, and the fraction of it that still counts as
// a faint/uncertain mark worth flagging for review. Calibrated against a
// real photographed sheet: unmarked bubbles measured ~15-30, filled ones
// ~190-230 — this sits safely in between either way.
export const FILLED_THRESHOLD = 70;
export const LOW_CONFIDENCE_RATIO = 0.6;

// Generic starting grid (as fractions of image width/height) for the
// manual alignment fallback when automatic detection can't fit one at
// all. Not derived from any one photo's exact pixels — a reasonable
// average starting point for this sheet layout that the person then nudges
// into place with the alignment sliders while watching the overlay.
export const DEFAULT_GRID_FRACTIONS = {
  rowStartFrac: 0.083,
  rowPitchFrac: 0.0158,
  blockXStartFrac: [0.4, 0.535, 0.67, 0.805],
  optionPitchFrac: 0.0215,
};
