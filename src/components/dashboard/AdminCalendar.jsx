import { useEffect, useMemo, useState } from 'react';
import { Video, CalendarPlus, Users, User, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { SLOT_LABELS, slotToDateRange } from '../../lib/mentorshipLabels';
import { googleCalendarUrl, downloadICS } from '../../lib/calendarLinks';

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function fmtDateKey(d) {
  return startOfDay(d).toISOString().slice(0, 10);
}
function nextWeekdayOccurrence(weekday, from) {
  const d = startOfDay(from);
  const diff = (weekday - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Admin's agenda — every upcoming 1:1 (one-off and recurring-weekly) and
 * group session, from every plan, in one scrollable list grouped by date.
 * A true month-grid isn't worth the complexity here since weekly personal
 * slots recur indefinitely; a rolling 21-day agenda is what an admin
 * actually needs to plan a week ahead. Each row's Join/Add-to-calendar
 * buttons work the moment a Zoom link exists on the record.
 */
export default function AdminCalendar() {
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [groupSessions, setGroupSessions] = useState([]);
  const [plansByKey, setPlansByKey] = useState({});
  const [rangeDays, setRangeDays] = useState(21);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [purchasesRes, groupRes, plansRes] = await Promise.all([
        supabase
          .from('purchases')
          .select(
            'id, plan_key, plan_name, scheduled_date, scheduled_slot, weekly_day, weekly_slot, valid_till, zoom_join_url, profiles(full_name, email)'
          )
          .eq('status', 'paid')
          .eq('product', 'mentorship'),
        supabase.from('group_sessions').select('*').order('session_date', { ascending: true }),
        supabase.from('plans').select('plan_key, schedule_type, name'),
      ]);
      if (cancelled) return;
      setPurchases(purchasesRes.data || []);
      setGroupSessions(groupRes.data || []);
      setPlansByKey(Object.fromEntries((plansRes.data || []).map((p) => [p.plan_key, p])));
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const agenda = useMemo(() => {
    const today = startOfDay(new Date());
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + rangeDays);

    const byDate = {};
    const push = (dateObj, entry) => {
      if (dateObj < today || dateObj > horizon) return;
      const key = fmtDateKey(dateObj);
      (byDate[key] ||= []).push(entry);
    };

    for (const p of purchases) {
      const who = p.profiles?.full_name || p.profiles?.email || 'Student';
      if (p.scheduled_date) {
        const range = slotToDateRange(p.scheduled_date, p.scheduled_slot);
        push(startOfDay(p.scheduled_date), {
          id: `${p.id}-d`,
          who,
          what: p.plan_name,
          slot: SLOT_LABELS[p.scheduled_slot] || p.scheduled_slot,
          isGroup: false,
          zoomJoinUrl: p.zoom_join_url,
          range,
        });
      } else if (p.weekly_day !== null && p.weekly_day !== undefined && p.weekly_slot) {
        if (p.valid_till && startOfDay(p.valid_till) < today) continue;
        // Recurring — surface every occurrence inside the visible window,
        // not just the next one, so the admin sees the full week ahead.
        let occ = nextWeekdayOccurrence(p.weekly_day, today);
        while (occ <= horizon) {
          const range = slotToDateRange(fmtDateKey(occ), p.weekly_slot);
          push(occ, {
            id: `${p.id}-w-${fmtDateKey(occ)}`,
            who,
            what: `${p.plan_name} (weekly)`,
            slot: SLOT_LABELS[p.weekly_slot] || p.weekly_slot,
            isGroup: false,
            zoomJoinUrl: p.zoom_join_url,
            range,
          });
          const next = new Date(occ);
          next.setDate(next.getDate() + 7);
          occ = next;
        }
      }
    }

    for (const g of groupSessions) {
      const range = slotToDateRange(g.session_date, g.session_slot);
      push(new Date(g.session_date), {
        id: `gs-${g.id}`,
        who: 'Group batch',
        what: plansByKey[g.plan_key]?.name || 'Group session',
        slot: SLOT_LABELS[g.session_slot] || g.session_slot,
        isGroup: true,
        zoomJoinUrl: g.zoom_link,
        range,
      });
    }

    return Object.entries(byDate).sort(([a], [b]) => (a < b ? -1 : 1));
  }, [purchases, groupSessions, plansByKey, rangeDays]);

  if (loading) {
    return <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet border-t-transparent" />;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-white/40">
          Every scheduled 1:1 and group session across the mentorship product, next {rangeDays} days.
        </p>
        <div className="relative">
          <select
            value={rangeDays}
            onChange={(e) => setRangeDays(Number(e.target.value))}
            className="appearance-none rounded-lg border border-line bg-panel py-1.5 pl-3 pr-7 text-xs text-white/70"
          >
            <option value={7}>Next 7 days</option>
            <option value={21}>Next 21 days</option>
            <option value={45}>Next 45 days</option>
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/40" />
        </div>
      </div>

      {agenda.length === 0 ? (
        <p className="rounded-xl border border-line bg-panel/50 px-5 py-6 text-sm text-white/45">
          Nothing scheduled in this window.
        </p>
      ) : (
        <div className="space-y-5">
          {agenda.map(([dateKey, entries]) => (
            <div key={dateKey}>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-white/40">
                {new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </div>
              <div className="space-y-2">
                {entries
                  .sort((a, b) => (a.slot || '').localeCompare(b.slot || ''))
                  .map((e) => (
                    <AgendaRow key={e.id} entry={e} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AgendaRow({ entry }) {
  const Icon = entry.isGroup ? Users : User;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-panel px-4 py-3">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            entry.isGroup ? 'bg-violet/15 text-lavender' : 'bg-amber/15 text-amber'
          }`}
        >
          <Icon size={14} />
        </div>
        <div>
          <div className="text-sm text-white">
            {entry.who} <span className="ml-1 text-xs text-white/40">{entry.what}</span>
          </div>
          <div className="text-xs text-white/40">{entry.slot}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {entry.zoomJoinUrl ? (
          <a
            href={entry.zoomJoinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs text-white/70 hover:border-violet/50 hover:text-white"
          >
            <Video size={12} /> Join
          </a>
        ) : (
          <span className="rounded-lg border border-dashed border-line px-2.5 py-1.5 text-xs text-white/30">
            No Zoom link
          </span>
        )}
        {entry.range && (
          <>
            <a
              href={googleCalendarUrl({
                title: `${entry.what} — ${entry.who}`,
                description: entry.zoomJoinUrl ? `Zoom: ${entry.zoomJoinUrl}` : '',
                location: entry.zoomJoinUrl || '',
                start: entry.range.start,
                end: entry.range.end,
              })}
              target="_blank"
              rel="noopener noreferrer"
              title="Add to Google Calendar"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-white/50 hover:border-violet/50 hover:text-white"
            >
              <CalendarPlus size={13} />
            </a>
          </>
        )}
      </div>
    </div>
  );
}
