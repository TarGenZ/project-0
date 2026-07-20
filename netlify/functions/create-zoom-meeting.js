// POST /api/create-zoom-meeting  (Netlify Function, project-0 — admin only)
// Body: { session_date: "YYYY-MM-DD", session_slot: "HH:mm", topic }
//
// Used by AdminGroupSessions.jsx's "Auto-create Zoom" button. Unlike
// project-1's create-zoom-meeting.js (student self-service, writes
// directly to a `purchases` row), this one is a pure "give me a join
// link" call — it does NOT touch the database itself. AdminGroupSessions
// already has its own insert/update flow for `group_sessions.zoom_link`
// (including the manual paste option), so this endpoint just slots into
// that existing flow instead of replacing it.
//
// Group one-time batches use a free-form time picker (not the fixed
// personal-session slots), so there's no slot-key lookup here — the
// duration is fixed at 40 minutes (matching every other group session)
// regardless of the exact start time chosen. If a batch genuinely needs a
// different length, delete the Zoom meeting from the Zoom dashboard and
// re-create it manually — a rare enough case not worth a form field.

import { createClient } from '@supabase/supabase-js';
import { createZoomMeeting } from './_lib/zoom.js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const GROUP_SESSION_DURATION_MINUTES = 40;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
    if (!token) return json({ error: 'Not signed in.' }, 401);

    const {
      data: { user },
      error: authErr,
    } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return json({ error: 'Invalid session — please sign in again.' }, 401);

    const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) return json({ error: 'Admin access required.' }, 403);

    const { session_date, session_slot, topic } = await req.json().catch(() => ({}));
    if (!session_date || !session_slot) return json({ error: 'Missing session_date or session_slot.' }, 400);

    const start = new Date(`${session_date}T${session_slot}:00+05:30`);
    if (Number.isNaN(start.getTime())) return json({ error: 'Invalid date/time.' }, 400);

    const meeting = await createZoomMeeting({
      topic: topic || 'NEET Mentorship Group Session',
      startTime: start,
      durationMinutes: GROUP_SESSION_DURATION_MINUTES,
      agenda: 'Group mentorship session, arpansarkar.org.',
    });

    return json(meeting);
  } catch (err) {
    console.error('[create-zoom-meeting] failed:', err);
    return json({ error: err.message?.startsWith('Zoom') ? err.message : 'Could not create the Zoom meeting.' }, 500);
  }
};

export const config = { path: '/api/create-zoom-meeting' };
