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

// Start/end (24h, IST — Asia/Kolkata, UTC+5:30) for every CURRENT slot key,
// used to build real Date objects for Zoom scheduling and "add to
// calendar" links. Legacy keys aren't listed since they're display-only.
export const SLOT_TIMES = {
  '22:00': { start: '22:00', end: '22:30' },
  '21:00': { start: '21:00', end: '21:30' },
  '21:30': { start: '21:30', end: '22:00' },
  '19:00': { start: '19:00', end: '19:40' },
};

// Combines a "YYYY-MM-DD" date string with a slot key into real Date
// objects, anchored to IST regardless of the browser/server's own
// timezone. Returns null if the slot key has no known time (legacy slot).
export function slotToDateRange(dateStr, slotKey) {
  const t = SLOT_TIMES[slotKey];
  if (!t || !dateStr) return null;
  return {
    start: new Date(`${dateStr}T${t.start}:00+05:30`),
    end: new Date(`${dateStr}T${t.end}:00+05:30`),
  };
}
