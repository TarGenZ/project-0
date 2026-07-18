import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ShoppingCart } from 'lucide-react';
import { useCart } from '../../lib/cart';
import { useAuth } from '../../auth/useAuth';
import { runCheckout } from '../../lib/checkout';

export default function CartDrawer() {
  const { items, removeItem, clear, total, open, setOpen } = useCart();
  const { session, isAuthenticated } = useAuth();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      window.location.href = `/login?next=${encodeURIComponent('/plans')}`;
      return;
    }
    setPaying(true);
    setError(null);
    try {
      await runCheckout(items, { name: session.user.user_metadata?.full_name, email: session.user.email });
      clear();
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setPaying(false);
    }
  };

  return (
    <>
      {/* Floating cart button */}
      {items.length > 0 && !open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-violet px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-violet-soft"
        >
          <ShoppingCart size={16} />
          {items.length} in cart
        </button>
      )}

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-line bg-panel p-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-white">Your cart</h2>
                <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              {success ? (
                <div className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
                  <p className="font-display font-semibold text-emerald-400">Payment successful!</p>
                  <p className="mt-1 text-sm text-white/60">Your plan is unlocked — check your dashboard.</p>
                  <a
                    href="/dashboard"
                    className="mt-4 inline-block rounded-lg bg-violet px-4 py-2 text-sm font-semibold text-white"
                  >
                    Go to dashboard
                  </a>
                </div>
              ) : (
                <>
                  <div className="mt-6 flex-1 space-y-3 overflow-y-auto">
                    {items.length === 0 ? (
                      <p className="text-sm text-white/40">Your cart is empty.</p>
                    ) : (
                      items.map((i) => (
                        <div key={i.plan_key} className="flex items-start justify-between rounded-xl border border-line bg-base px-4 py-3">
                          <div>
                            <p className="text-sm text-white">{i.name}</p>
                            <p className="text-xs text-white/40">₹{(i.price_paise / 100).toLocaleString('en-IN')}</p>
                          </div>
                          <button onClick={() => removeItem(i.plan_key)} className="text-white/30 hover:text-red-400">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {items.length > 0 && (
                    <div className="mt-4 border-t border-line pt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Total</span>
                        <span className="font-display text-lg font-bold text-white">
                          ₹{(total / 100).toLocaleString('en-IN')}
                        </span>
                      </div>
                      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
                      <button
                        onClick={handleCheckout}
                        disabled={paying}
                        className="mt-4 w-full rounded-lg bg-violet py-2.5 text-sm font-semibold text-white transition hover:bg-violet-soft disabled:opacity-50"
                      >
                        {paying ? 'Opening checkout…' : isAuthenticated ? 'Pay now' : 'Sign in to pay'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
