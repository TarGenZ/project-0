import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Shared full-screen modal shell used by every popup on the site
 * (JoinModal, ComingSoonModal). Handles:
 *  - locking background scroll while open (stops the page shifting under it)
 *  - a strong, full-page blur + dark overlay
 *  - true centering on mobile via dynamic viewport height (100dvh), which
 *    behaves correctly even when the browser's address bar is showing/hiding
 *  - closing on backdrop click (pass onClose={null} to disable, e.g. for a
 *    mandatory gate the user can't dismiss)
 *
 * Usage: <ModalShell open={open} onClose={close}><motion.div>...your card...</motion.div></ModalShell>
 */
export default function ModalShell({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex h-[100dvh] w-screen items-center justify-center overflow-y-auto bg-base/90 backdrop-blur-md px-6 py-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose || undefined}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
