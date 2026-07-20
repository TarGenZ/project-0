import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Search, FileText } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import SEO from '../components/SEO.jsx';
import BackButton from '../components/BackButton.jsx';

const CLASS_LABELS = { all: 'All years', '11th': 'Class 11', '12th': 'Class 12', drop: 'Dropper' };

/**
 * Every link here points straight at NCERT's own official PDF
 * (ncert.nic.in/textbook/pdf/...) — nothing is rehosted or stored by us.
 * That's the whole point of this page existing separately from the paid
 * Resources app: linking to free, official government-published PDFs
 * carries essentially none of the copyright risk that rehosting copies
 * behind a paywall would.
 */
export default function FreeResources() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase
      .from('free_resources')
      .select('*')
      .eq('is_active', true)
      .order('subject', { ascending: true })
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        setItems(data || []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (r) => r.title.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q)
    );
  }, [items, search]);

  const bySubject = filtered.reduce((acc, r) => {
    (acc[r.subject] ||= []).push(r);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-base px-5 py-16 md:py-20">
      <BackButton fallback="/" />
      <SEO
        title="Free NCERT PDFs — arpansarkar.org"
        description="Every NCERT chapter PDF for NEET, linked straight from the official NCERT website — free, no login required."
        path="/free-resources"
      />
      <div className="mx-auto max-w-4xl">
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-amber">Free, always</div>
        <h1 className="mt-3 font-display text-3xl font-bold text-white md:text-4xl">NCERT PDFs</h1>
        <p className="mt-3 max-w-xl text-sm text-white/50">
          Every chapter, linked straight from NCERT's own website — free for anyone, no account or
          payment needed. Looking for notes, short notes or mind maps instead? Those live on{' '}
          <a href="https://resources.arpansarkar.org" className="text-lavender underline underline-offset-2">
            resources.arpansarkar.org
          </a>
          .
        </p>

        <div className="relative mt-6 max-w-sm">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chapters…"
            className="w-full rounded-lg border border-line bg-panel py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:border-violet/50 focus:outline-none"
          />
        </div>

        {loading ? (
          <div className="mt-10 h-8 w-8 animate-spin rounded-full border-2 border-violet border-t-transparent" />
        ) : Object.keys(bySubject).length === 0 ? (
          <p className="mt-10 text-sm text-white/40">
            {search ? `No chapters match "${search}".` : 'Nothing here yet — check back soon.'}
          </p>
        ) : (
          <div className="mt-8 space-y-8">
            {Object.entries(bySubject).map(([subject, rows]) => (
              <div key={subject}>
                <h2 className="mb-3 font-display text-lg font-semibold text-white">{subject}</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {rows.map((r) => (
                    <a
                      key={r.id}
                      href={r.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3 transition hover:border-violet/40"
                    >
                      <FileText size={16} className="flex-shrink-0 text-lavender" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white">{r.title}</p>
                        {r.class_level !== 'all' && (
                          <p className="text-xs text-white/35">{CLASS_LABELS[r.class_level]}</p>
                        )}
                      </div>
                      <ExternalLink size={14} className="flex-shrink-0 text-white/25 transition group-hover:text-lavender" />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-10 text-xs text-white/25">
          These link directly to ncert.nic.in — we don't host or store copies of the PDFs.
        </p>
      </div>
    </div>
  );
}
