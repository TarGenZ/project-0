import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronDown, Sun, Moon } from 'lucide-react';
import AuthButton from './AuthButton.jsx';
import ComingSoonModal from './ComingSoonModal.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';

// Apps that are live — render as direct links.
// Apps that are still being built — keep in SUBDOMAIN_APPS (triggers ComingSoonModal).
export const SUBDOMAIN_APPS = [
  {
    id: 'counselling',
    name: 'Counselling',
    subdomain: 'counselling.arpansarkar.org',
    blurb: 'Round-by-round seat allotment guidance so a choice-filling mistake does not cost a year.',
  },
];

// Lightweight utilities — no subdomain, no auth, no full App treatment.
// Add new tools here as they ship.
export const TOOLS = [
  {
    id: 'neet-marks-calculator',
    name: 'NEET Marks Calculator',
    path: '/tools/neet-marks-calculator',
  },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const toolsRef = useRef(null);
  const { isDark, toggle } = useTheme();

  const openApp = (app) => {
    setMobileOpen(false);
    setActiveModal(app);
  };

  useEffect(() => {
    if (!toolsOpen) return;
    const onClickOutside = (e) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target)) setToolsOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [toolsOpen]);

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
            <a
              href="https://resources.arpansarkar.org"
              className="rounded-full px-3.5 py-2 text-sm text-white/70 transition hover:bg-panel hover:text-white"
            >
              Resources
            </a>
            <a
              href="https://cutoffs.arpansarkar.org"
              className="rounded-full px-3.5 py-2 text-sm text-white/70 transition hover:bg-panel hover:text-white"
            >
              Cutoffs
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
            <div className="relative" ref={toolsRef}>
              <button
                onClick={() => setToolsOpen((v) => !v)}
                aria-expanded={toolsOpen}
                className="flex items-center gap-1 rounded-full px-3.5 py-2 text-sm text-white/70 transition hover:bg-panel hover:text-white"
              >
                Tools
                <ChevronDown size={14} className={`transition ${toolsOpen ? 'rotate-180' : ''}`} />
              </button>
              {toolsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-line bg-panel p-1.5 shadow-glow"
                >
                  {TOOLS.map((tool) => (
                    <Link
                      key={tool.id}
                      to={tool.path}
                      onClick={() => setToolsOpen(false)}
                      className="block rounded-lg px-3 py-2 text-sm text-white/70 transition hover:bg-base hover:text-white"
                    >
                      {tool.name}
                    </Link>
                  ))}
                </motion.div>
              )}
            </div>
            <Link
              to="/free-resources"
              className="rounded-full px-3.5 py-2 text-sm text-white/70 transition hover:bg-panel hover:text-white"
            >
              Free Resources
            </Link>
            <Link
              to="/plans"
              className="rounded-full px-3.5 py-2 text-sm text-white/70 transition hover:bg-panel hover:text-white"
            >
              Plans
            </Link>
          </div>

          <div className="hidden md:block">
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="rounded-full border border-line/60 p-2 text-white/50 transition hover:border-violet/40 hover:text-white"
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
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
              <a
                href="https://resources.arpansarkar.org"
                className="rounded-lg px-3 py-2.5 text-left text-sm text-white/70 hover:bg-panel hover:text-white"
              >
                Resources
              </a>
              <a
                href="https://cutoffs.arpansarkar.org"
                className="rounded-lg px-3 py-2.5 text-left text-sm text-white/70 hover:bg-panel hover:text-white"
              >
                Cutoffs
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
              <p className="mt-2 px-3 text-[11px] uppercase tracking-[0.15em] text-white/30">Tools</p>
              {TOOLS.map((tool) => (
                <Link
                  key={tool.id}
                  to={tool.path}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-left text-sm text-white/70 hover:bg-panel hover:text-white"
                >
                  {tool.name}
                </Link>
              ))}
              <Link
                to="/free-resources"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-left text-sm text-white/70 hover:bg-panel hover:text-white"
              >
                Free Resources
              </Link>
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
