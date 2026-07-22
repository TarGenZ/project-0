import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sun, Moon, Search, X, ExternalLink } from 'lucide-react';
import AuthButton from './AuthButton.jsx';
import ComingSoonModal from './ComingSoonModal.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';

// ── App registry ──────────────────────────────────────────────────────────────
// Live apps on subdomains — rendered as external links in the Apps dropdown.
export const LIVE_APPS = [
  {
    id: 'mentorship',
    name: 'Mentorship',
    href: 'https://mentorship.arpansarkar.org',
    blurb: '1-on-1 sessions, study plans, doubt clearing',
  },
  {
    id: 'resources',
    name: 'Resources',
    href: 'https://resources.arpansarkar.org',
    blurb: 'Notes, revision sheets and question banks',
  },
  {
    id: 'cutoffs',
    name: 'Cutoffs',
    href: 'https://cutoffs.arpansarkar.org',
    blurb: 'College-wise cutoffs, updated every round',
  },
];

// Apps still in development — clicking opens a ComingSoonModal.
export const SUBDOMAIN_APPS = [
  {
    id: 'counselling',
    name: 'Counselling',
    subdomain: 'counselling.arpansarkar.org',
    blurb: 'Round-by-round seat allotment guidance so a choice-filling mistake does not cost a year.',
  },
];

// Lightweight utilities that live on this domain.
export const TOOLS = [
  {
    id: 'neet-marks-calculator',
    name: 'NEET Marks Calculator',
    path: '/tools/neet-marks-calculator',
    blurb: 'Convert raw marks to rank estimates instantly',
  },
];

// ── Shared dropdown styles ────────────────────────────────────────────────────
const DROPDOWN_WRAP =
  'absolute left-0 top-full z-50 mt-2 w-60 rounded-xl border border-line bg-panel shadow-glow overflow-hidden';
const DROPDOWN_ITEM =
  'flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-base';

export default function Navbar() {
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [appsOpen, setAppsOpen]       = useState(false);
  const [toolsOpen, setToolsOpen]     = useState(false);
  const [searchOpen, setSearchOpen]   = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModal, setActiveModal] = useState(null);

  const appsRef   = useRef(null);
  const toolsRef  = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();

  // Open a coming-soon modal and close the mobile drawer
  const openApp = (app) => {
    setMobileOpen(false);
    setActiveModal(app);
  };

  // Close any open dropdown when clicking outside it
  useEffect(() => {
    const handler = (e) => {
      if (appsRef.current  && !appsRef.current.contains(e.target))  setAppsOpen(false);
      if (toolsRef.current && !toolsRef.current.contains(e.target)) setToolsOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Collapse mobile menu on viewport resize ≥ md
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Focus the search input when the bar expands
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    // Route to free-resources with the search pre-filled
    navigate(`/free-resources?q=${encodeURIComponent(q)}`);
    setSearchOpen(false);
    setSearchQuery('');
    setMobileOpen(false);
  };

  const closeMobileAndNavigate = () => setMobileOpen(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-base/85 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:px-5">

          {/* ── Logo ─────────────────────────────────────────────────────── */}
          <a
            href="/"
            className="mr-3 flex-shrink-0 font-display text-base font-bold tracking-tight text-white sm:text-lg"
          >
            arpan<span className="text-amber">sarkar</span>
            <span className="text-white/30">.org</span>
          </a>

          {/* ── Desktop nav items ─────────────────────────────────────────── */}
          <div className="hidden items-center gap-0.5 md:flex">

            {/* Apps dropdown */}
            <div className="relative" ref={appsRef}>
              <button
                onClick={() => { setAppsOpen((v) => !v); setToolsOpen(false); }}
                aria-expanded={appsOpen}
                className="flex items-center gap-1 rounded-full px-3.5 py-2 text-sm text-white/70 transition hover:bg-panel hover:text-white"
              >
                Apps
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 ${appsOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {appsOpen && (
                  <motion.div
                    key="apps-dd"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className={DROPDOWN_WRAP}
                  >
                    <div className="p-1.5">
                      {LIVE_APPS.map((app) => (
                        <a
                          key={app.id}
                          href={app.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setAppsOpen(false)}
                          className={DROPDOWN_ITEM}
                        >
                          <span className="flex items-center gap-1.5 font-medium text-white/85">
                            {app.name}
                            <ExternalLink size={11} className="text-white/30" />
                          </span>
                          <span className="text-xs text-white/40">{app.blurb}</span>
                        </a>
                      ))}

                      {SUBDOMAIN_APPS.map((app) => (
                        <button
                          key={app.id}
                          onClick={() => { openApp(app); setAppsOpen(false); }}
                          className={DROPDOWN_ITEM}
                        >
                          <span className="flex items-center gap-2 font-medium text-white/85">
                            {app.name}
                            <span className="rounded-full bg-amber/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber">
                              Soon
                            </span>
                          </span>
                          <span className="line-clamp-1 text-xs text-white/40">{app.blurb}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Tools dropdown */}
            <div className="relative" ref={toolsRef}>
              <button
                onClick={() => { setToolsOpen((v) => !v); setAppsOpen(false); }}
                aria-expanded={toolsOpen}
                className="flex items-center gap-1 rounded-full px-3.5 py-2 text-sm text-white/70 transition hover:bg-panel hover:text-white"
              >
                Tools
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 ${toolsOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {toolsOpen && (
                  <motion.div
                    key="tools-dd"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className={DROPDOWN_WRAP}
                  >
                    <div className="p-1.5">
                      {TOOLS.map((tool) => (
                        <Link
                          key={tool.id}
                          to={tool.path}
                          onClick={() => setToolsOpen(false)}
                          className={DROPDOWN_ITEM}
                        >
                          <span className="font-medium text-white/85">{tool.name}</span>
                          {tool.blurb && (
                            <span className="text-xs text-white/40">{tool.blurb}</span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Free Resources */}
            <Link
              to="/free-resources"
              className="rounded-full px-3.5 py-2 text-sm text-white/70 transition hover:bg-panel hover:text-white"
            >
              Free Resources
            </Link>
          </div>

          {/* ── Desktop right: search + theme + auth ──────────────────────── */}
          <div className="ml-auto hidden items-center gap-2 md:flex">

            {/* Expandable search bar */}
            <div ref={searchRef} className="relative flex items-center">
              <AnimatePresence mode="wait">
                {searchOpen ? (
                  <motion.form
                    key="search-open"
                    onSubmit={handleSearch}
                    initial={{ width: 36, opacity: 0.5 }}
                    animate={{ width: 220, opacity: 1 }}
                    exit={{ width: 36, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    className="flex items-center gap-2 overflow-hidden rounded-full border border-violet/40 bg-panel px-3 py-1.5"
                  >
                    <Search size={14} className="flex-shrink-0 text-white/40" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search resources…"
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                    />
                    <button
                      type="button"
                      onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                      className="flex-shrink-0 text-white/30 transition hover:text-white/70"
                    >
                      <X size={13} />
                    </button>
                  </motion.form>
                ) : (
                  <motion.button
                    key="search-icon"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setSearchOpen(true)}
                    aria-label="Search"
                    className="rounded-full border border-line/60 p-2 text-white/50 transition hover:border-violet/40 hover:text-white"
                  >
                    <Search size={15} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="rounded-full border border-line/60 p-2 text-white/50 transition hover:border-violet/40 hover:text-white"
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Auth */}
            <AuthButton />
          </div>

          {/* ── Mobile right: theme + hamburger ───────────────────────────── */}
          <div className="ml-auto flex items-center gap-2 md:hidden">
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="rounded-full border border-line/60 p-1.5 text-white/50 transition hover:text-white"
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              <div className="relative h-3.5 w-4">
                <span
                  className={`absolute left-0 top-0 h-[1.5px] w-full bg-white transition-all duration-200 ${
                    mobileOpen ? 'translate-y-[6px] rotate-45' : ''
                  }`}
                />
                <span
                  className={`absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 bg-white transition-all duration-200 ${
                    mobileOpen ? 'scale-x-0 opacity-0' : ''
                  }`}
                />
                <span
                  className={`absolute bottom-0 left-0 h-[1.5px] w-full bg-white transition-all duration-200 ${
                    mobileOpen ? '-translate-y-[6px] -rotate-45' : ''
                  }`}
                />
              </div>
            </button>
          </div>
        </nav>

        {/* ── Mobile drawer ────────────────────────────────────────────────── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              key="mobile-menu"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="overflow-hidden border-t border-line/70 bg-base md:hidden"
            >
              <div className="px-4 pb-6 pt-4">

                {/* Search */}
                <form
                  onSubmit={handleSearch}
                  className="mb-4 flex items-center gap-2 rounded-xl border border-line/70 bg-panel px-3 py-2.5"
                >
                  <Search size={15} className="flex-shrink-0 text-white/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search resources…"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} className="text-white/30">
                      <X size={13} />
                    </button>
                  )}
                </form>

                {/* Apps */}
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                  Apps
                </p>
                {LIVE_APPS.map((app) => (
                  <a
                    key={app.id}
                    href={app.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-panel hover:text-white"
                  >
                    {app.name}
                    <ExternalLink size={13} className="text-white/30" />
                  </a>
                ))}
                {SUBDOMAIN_APPS.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => openApp(app)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-white/70 transition hover:bg-panel hover:text-white"
                  >
                    {app.name}
                    <span className="rounded-full bg-amber/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber">
                      Soon
                    </span>
                  </button>
                ))}

                {/* Tools */}
                <p className="mb-1 mt-3 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                  Tools
                </p>
                {TOOLS.map((tool) => (
                  <Link
                    key={tool.id}
                    to={tool.path}
                    onClick={closeMobileAndNavigate}
                    className="block rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-panel hover:text-white"
                  >
                    {tool.name}
                  </Link>
                ))}

                {/* Free Resources */}
                <div className="mt-1 border-t border-line/50 pt-2">
                  <Link
                    to="/free-resources"
                    onClick={closeMobileAndNavigate}
                    className="block rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-panel hover:text-white"
                  >
                    Free Resources
                  </Link>
                </div>

                {/* Auth */}
                <div className="mt-3 border-t border-line/70 pt-4">
                  <AuthButton className="w-full justify-center" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <ComingSoonModal app={activeModal} onClose={() => setActiveModal(null)} />
    </>
  );
}
