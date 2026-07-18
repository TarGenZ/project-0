// Small, duplicated-on-purpose subset of project-1's plans.js — just
// enough to render a human-readable line for the mentorship service box.
// Kept minimal here since project-0 doesn't need slot-availability logic,
// only display labels.
//
// Keep this in sync with SLOT_LABELS in project-1/src/lib/plans.js —
// current slots first, then legacy (pre-timing-change) keys kept only so
// older purchase records still display a readable label.

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const SLOT_LABELS = {
  // current
  '22:00': '10:00 – 10:30 PM',
  '21:00': '9:00 – 9:30 PM',
  '21:30': '9:30 – 10:00 PM',
  '19:00': '7:00 – 7:40 PM',
  // legacy (pre-timing-change) — display only, no longer offered
  '19:45': '7:45 – 8:15 PM',
  '18:00': '6:00 – 6:30 PM',
  '18:30': '6:30 – 7:00 PM',
};
