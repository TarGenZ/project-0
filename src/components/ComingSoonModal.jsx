import { motion } from 'framer-motion';
import ModalShell from './ModalShell.jsx';

export default function ComingSoonModal({ app, onClose }) {
  return (
    <ModalShell open={!!app} onClose={onClose}>
      {app && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="coming-soon-title"
          className="w-full rounded-2xl border border-line bg-panel p-7 shadow-glow"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet/40 bg-violet/10 px-3 py-1 text-xs font-medium tracking-wide text-lavender">
            <span className="h-1.5 w-1.5 rounded-full bg-amber animate-pulse" />
            IN PROGRESS
          </div>
          <h3 id="coming-soon-title" className="font-display text-xl font-semibold text-white">
            {app.name} is being built
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-white/60">{app.blurb}</p>
          <p className="mt-4 text-xs text-white/40">
            It'll live at{' '}
            <span className="font-medium text-lavender">{app.subdomain}</span> and sign you in
            automatically — same account, no new password.
          </p>
          <button
            onClick={onClose}
            className="mt-6 w-full rounded-lg bg-violet py-2.5 text-sm font-semibold text-white transition hover:bg-violet-soft"
          >
            Got it
          </button>
        </motion.div>
      )}
    </ModalShell>
  );
}
