import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import AuthButton from './AuthButton.jsx';
import ComingSoonModal from './ComingSoonModal.jsx';

export const SUBDOMAIN_APPS = [
  {
    id: 'resources',
    name: 'Resources',
    subdomain: 'resources.arpansarkar.org',
    blurb: 'Notes, revision sheets and the exact material Arpan used for NEET 2026.',
  },
  {
    id: 'cutoffs',
    name: 'Cutoffs',
    subdomain: 'cutoffs.arpansarkar.org',
    blurb: 'College-wise NEET cutoffs and rank predictions, kept current every counselling round.',
  },
  {
    id: 'counselling',
    name: 'Counselling',
    subdomain: 'counselling.arpansarkar.org',
    blurb: 'Round-by-round seat allotment guidance so a choice-filling mistake does not cost a year.',
  },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);

  const openApp = (app) => {
    setMobileOpen(false);
    setActiveModal(app);
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-base/85 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <a href="#top" className="font-display text-lg font-bold tracking-tight text-white">
            arpan<span className="text-amber">sarkar</span>
            <span className="text-white/30">.org</span>
          </a>

          <div className="hidden items-center gap-1 md:flex">
            <a
              href="https://mentorship.arpansarkar.org"
              className="rounded-full px-3.5 py-2 text-sm text-white/70 transition hover:bg-panel hover:text-white"
            >
              Mentorship
            </a>
            {SUBDOMAIN_APPS.map((app) => (
              <button
                key={app.id}
                onClick={() => openApp(app)}
                className="rounded-full px-3.5 py-2 text-sm text-white/70 transition hover:bg-panel hover:text-white"
              >
                {app.name}
              </button>
            ))}
            <Link
              to="/plans"
              className="rounded-full px-3.5 py-2 text-sm text-white/70 transition hover:bg-panel hover:text-white"
            >
              Plans
            </Link>
          </div>

          <div className="hidden md:block">
            <AuthButton />
          </div>

          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line md:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <div className="relative h-3.5 w-4">
              <span
                className={`absolute left-0 top-0 h-[1.5px] w-full bg-white transition ${mobileOpen ? 'translate-y-[6px] rotate-45' : ''}`}
              />
              <span
                className={`absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 bg-white transition ${mobileOpen ? 'opacity-0' : ''}`}
              />
              <span
                className={`absolute bottom-0 left-0 h-[1.5px] w-full bg-white transition ${mobileOpen ? '-translate-y-[6px] -rotate-45' : ''}`}
              />
            </div>
          </button>
        </nav>

        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-line/70 bg-base px-5 pb-5 md:hidden"
          >
            <div className="flex flex-col gap-1 pt-3">
              <a
                href="https://mentorship.arpansarkar.org"
                className="rounded-lg px-3 py-2.5 text-left text-sm text-white/70 hover:bg-panel hover:text-white"
              >
                Mentorship
              </a>
              {SUBDOMAIN_APPS.map((app) => (
                <button
                  key={app.id}
                  onClick={() => openApp(app)}
                  className="rounded-lg px-3 py-2.5 text-left text-sm text-white/70 hover:bg-panel hover:text-white"
                >
                  {app.name}
                </button>
              ))}
              <Link
                to="/plans"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-left text-sm text-white/70 hover:bg-panel hover:text-white"
              >
                Plans
              </Link>
              <div className="mt-2 border-t border-line/70 pt-4">
                <AuthButton className="w-full justify-center" />
              </div>
            </div>
          </motion.div>
        )}
      </header>

      <ComingSoonModal app={activeModal} onClose={() => setActiveModal(null)} />
    </>
  );
}
