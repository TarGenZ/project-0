import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sun, Moon, Search, X, ExternalLink, Clock } from 'lucide-react';
import AuthButton from './AuthButton.jsx';
import ComingSoonModal from './ComingSoonModal.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';

// ── Data ─────────────────────────────────────────────────────────────────────

export const LIVE_APPS = [
  { id: 'mentorship', name: 'Mentorship', href: 'https://mentorship.arpansarkar.org', blurb: '1-on-1 sessions, study plans, doubt clearing' },
  { id: 'resources',  name: 'Resources',  href: 'https://resources.arpansarkar.org',  blurb: 'Notes, revision sheets and question banks' },
  { id: 'cutoffs',   name: 'Cutoffs',    href: 'https://collegedatabase.arpansarkar.org',    blurb: 'College-wise cutoffs, updated every round' },
];

export const SUBDOMAIN_APPS = [
  { id: 'counselling', name: 'Counselling', subdomain: 'counselling.arpansarkar.org', blurb: 'Round-by-round seat allotment guidance so a choice-filling mistake does not cost a year.' },
];

// Plans sub-items — comingSoon items open a modal; others are router Links
export const PLANS_ITEMS = [
  { id: 'mentorship',       name: 'Mentorship',       path: '/plans?category=mentorship', blurb: '1-on-1 sessions and personalised study plans' },
  { id: 'college-database', name: 'College Database', comingSoon: true, subdomain: 'collegedatabase.arpansarkar.org', blurb: 'Browse NEET colleges, seats, and historical cutoffs in one place.' },
  { id: 'resources',        name: 'Resources',        path: '/plans?category=resources',  blurb: 'Notes, revision sheets and curated question banks' },
];

// Tools — comingSoon items open a modal; others are router Links
export const TOOLS = [
  { id: 'syllabus-tracker',          name: 'Syllabus Tracker',            comingSoon: true, subdomain: 'tools.arpansarkar.org', blurb: 'Track your chapter-wise NEET progress and revision schedule.' },
  { id: 'reneet-marks-calculator',   name: 'ReNEET 2026 Calculator',      path: '/tools/neet-marks-calculator', blurb: 'Estimate your rank from raw marks instantly' },
];

// ── Dropdown primitives ───────────────────────────────────────────────────────
const DD_WRAP  = 'absolute left-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-xl border border-line bg-panel shadow-glow';
const DD_ITEM  = 'flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-base';
const SOON_BADGE = (
  <span className="inline-flex items-center gap-1 rounded-full bg-amber/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber">
    <Clock size={9} /> Soon
  </span>
);

// ── Component ─────────────────────────────────────────────────────────────────
export default function Navbar() {
  // Which desktop dropdown is currently open: 'apps' | 'plans' | 'tools' | null
  const [openMenu,     setOpenMenu]     = useState(null);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  // Mobile accordion: which section is expanded
  const [mobileSection, setMobileSection] = useState(null); // 'apps'|'plans'|'tools'
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [activeModal,  setActiveModal]  = useState(null);

  const hoverTimer    = useRef(null);
  const searchRef     = useRef(null);
  const searchInputRef = useRef(null);
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();

  // ── Hover helpers ─────────────────────────────────────────────────────────
  const menuEnter = (key) => {
    clearTimeout(hoverTimer.current);
    setOpenMenu(key);
  };
  const menuLeave = () => {
    hoverTimer.current = setTimeout(() => setOpenMenu(null), 90);
  };

  // ── Coming-soon modal ─────────────────────────────────────────────────────
  const openModal = (item) => {
    setMobileOpen(false);
    setOpenMenu(null);
    setActiveModal(item);
  };

  // ── Close search on outside click ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Collapse mobile menu on ≥ md resize ───────────────────────────────────
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  // ── Search submit ─────────────────────────────────────────────────────────
  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/free-resources?q=${encodeURIComponent(q)}`);
    setSearchOpen(false);
    setSearchQuery('');
    setMobileOpen(false);
  };

  const closeNav = () => setMobileOpen(false);

  // ── Reusable: render a dropdown item ─────────────────────────────────────
  const renderDropdownItem = (item, closeKey) => {
    if (item.comingSoon) {
      return (
        <button key={item.id} onClick={() => openModal(item)} className={DD_ITEM}>
          <span className="flex items-center gap-2 font-medium text-white/85">
            {item.name} {SOON_BADGE}
          </span>
          <span className="line-clamp-2 text-xs text-white/40">{item.blurb}</span>
        </button>
      );
    }
    if (item.href) {
      return (
        <a key={item.id} href={item.href} target="_blank" rel="noopener noreferrer"
          onClick={() => setOpenMenu(null)}
          className={DD_ITEM}
        >
          <span className="flex items-center gap-1.5 font-medium text-white/85">
            {item.name} <ExternalLink size={11} className="text-white/30" />
          </span>
          <span className="text-xs text-white/40">{item.blurb}</span>
        </a>
      );
    }
    return (
      <Link key={item.id} to={item.path} onClick={() => setOpenMenu(null)} className={DD_ITEM}>
        <span className="font-medium text-white/85">{item.name}</span>
        <span className="text-xs text-white/40">{item.blurb}</span>
      </Link>
    );
  };

  // ── Dropdown wrapper (hover-triggered on desktop) ─────────────────────────
  const DropdownMenu = ({ id, label, items }) => (
    <div
      className="relative"
      onMouseEnter={() => menuEnter(id)}
      onMouseLeave={menuLeave}
    >
      <button
        aria-expanded={openMenu === id}
        className="flex items-center gap-1 rounded-full px-3.5 py-2 text-sm text-white/70 transition-colors hover:bg-panel hover:text-white"
      >
        {label}
        <ChevronDown size={13} className={`transition-transform duration-200 ${openMenu === id ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {openMenu === id && (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.13 }}
            className={DD_WRAP}
          >
            <div className="p-1.5">
              {items.map((item) => renderDropdownItem(item))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // ── Mobile accordion section ──────────────────────────────────────────────
  const MobileSection = ({ sectionKey, label, children }) => {
    const isOpen = mobileSection === sectionKey;
    return (
      <div>
        <button
          onClick={() => setMobileSection(isOpen ? null : sectionKey)}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-panel hover:text-white"
        >
          {label}
          <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="ml-2 border-l border-line/50 pl-3 pb-1">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-base/85 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:px-5">

          {/* Logo */}
          <a href="/" className="mr-3 flex-shrink-0 font-display text-base font-bold tracking-tight text-white sm:text-lg">
            arpan<span className="text-amber">sarkar</span><span className="text-white/30">.org</span>
          </a>

          {/* Desktop nav */}
          <div className="hidden items-center gap-0.5 md:flex">
            <DropdownMenu id="apps"  label="Apps"   items={[...LIVE_APPS, ...SUBDOMAIN_APPS]} />
            <DropdownMenu id="plans" label="Plans"  items={PLANS_ITEMS} />
            <DropdownMenu id="tools" label="Tools"  items={TOOLS} />
            <Link
              to="/free-resources"
              className="rounded-full px-3.5 py-2 text-sm text-white/70 transition-colors hover:bg-panel hover:text-white"
            >
              Free Resources
            </Link>
          </div>

          {/* Desktop right: search + theme + auth */}
          <div className="ml-auto hidden items-center gap-2 md:flex">
            {/* Expandable search */}
            <div ref={searchRef} className="relative flex items-center">
              <AnimatePresence mode="wait">
                {searchOpen ? (
                  <motion.form
                    key="open"
                    onSubmit={handleSearch}
                    initial={{ width: 36, opacity: 0.4 }}
                    animate={{ width: 216, opacity: 1 }}
                    exit={{ width: 36, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
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
                    <button type="button" onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                      className="flex-shrink-0 text-white/30 transition hover:text-white/70">
                      <X size={13} />
                    </button>
                  </motion.form>
                ) : (
                  <motion.button
                    key="icon"
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
            <button onClick={toggle} aria-label="Toggle theme"
              className="rounded-full border border-line/60 p-2 text-white/50 transition hover:border-violet/40 hover:text-white">
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <AuthButton />
          </div>

          {/* Mobile right: theme + hamburger */}
          <div className="ml-auto flex items-center gap-2 md:hidden">
            <button onClick={toggle} aria-label="Toggle theme"
              className="rounded-full border border-line/60 p-1.5 text-white/50 transition hover:text-white">
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-white"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              <div className="relative h-3.5 w-4">
                <span className={`absolute left-0 top-0 h-[1.5px] w-full bg-current transition-all duration-200 ${mobileOpen ? 'translate-y-[6px] rotate-45' : ''}`} />
                <span className={`absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 bg-current transition-all duration-200 ${mobileOpen ? 'scale-x-0 opacity-0' : ''}`} />
                <span className={`absolute bottom-0 left-0 h-[1.5px] w-full bg-current transition-all duration-200 ${mobileOpen ? '-translate-y-[6px] -rotate-45' : ''}`} />
              </div>
            </button>
          </div>
        </nav>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              key="drawer"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="overflow-hidden border-t border-line/70 bg-base md:hidden"
            >
              <div className="px-4 pb-6 pt-3">

                {/* Search */}
                <form onSubmit={handleSearch}
                  className="mb-3 flex items-center gap-2 rounded-xl border border-line/70 bg-panel px-3 py-2.5">
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

                {/* Apps accordion */}
                <MobileSection sectionKey="apps" label="Apps">
                  {LIVE_APPS.map((app) => (
                    <a key={app.id} href={app.href} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-white/65 transition hover:bg-panel hover:text-white">
                      {app.name}
                      <ExternalLink size={12} className="text-white/30" />
                    </a>
                  ))}
                  {SUBDOMAIN_APPS.map((app) => (
                    <button key={app.id} onClick={() => openModal(app)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-white/65 transition hover:bg-panel hover:text-white">
                      {app.name}
                      <span className="rounded-full bg-amber/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber">Soon</span>
                    </button>
                  ))}
                </MobileSection>

                {/* Plans accordion */}
                <MobileSection sectionKey="plans" label="Plans">
                  {PLANS_ITEMS.map((item) => item.comingSoon ? (
                    <button key={item.id} onClick={() => openModal(item)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-white/65 transition hover:bg-panel hover:text-white">
                      {item.name}
                      <span className="rounded-full bg-amber/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber">Soon</span>
                    </button>
                  ) : (
                    <Link key={item.id} to={item.path} onClick={closeNav}
                      className="block rounded-lg px-3 py-2 text-sm text-white/65 transition hover:bg-panel hover:text-white">
                      {item.name}
                    </Link>
                  ))}
                </MobileSection>

                {/* Tools accordion */}
                <MobileSection sectionKey="tools" label="Tools">
                  {TOOLS.map((tool) => tool.comingSoon ? (
                    <button key={tool.id} onClick={() => openModal(tool)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-white/65 transition hover:bg-panel hover:text-white">
                      {tool.name}
                      <span className="rounded-full bg-amber/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber">Soon</span>
                    </button>
                  ) : (
                    <Link key={tool.id} to={tool.path} onClick={closeNav}
                      className="block rounded-lg px-3 py-2 text-sm text-white/65 transition hover:bg-panel hover:text-white">
                      {tool.name}
                    </Link>
                  ))}
                </MobileSection>

                {/* Free Resources */}
                <Link to="/free-resources" onClick={closeNav}
                  className="mt-1 block rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-panel hover:text-white">
                  Free Resources
                </Link>

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
