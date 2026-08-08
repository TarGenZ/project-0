import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'arpansarkar-cart';

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Cart holds only plan_key + a display snapshot (name/price/tagline) for
 * instant rendering — it is NEVER the source of truth for price. At
 * checkout, /api/create-order re-fetches every price from the `plans`
 * table server-side and ignores whatever the client sends. The cart is
 * just a shopping-list UI, not a pricing authority.
 */
export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((plan, { onConflict } = {}) => {
    let blocked = false;
    setItems((prev) => {
      if (prev.some((i) => i.plan_key === plan.plan_key)) return prev; // one of each plan at a time

      // Students can only hold one non-bundle mentorship plan at a time —
      // stacking monthly+yearly, one-time+monthly, or group+personal plans
      // together is a known chargeback-abuse pattern (dispute one while
      // still using the other). Bundles are exempt since they're
      // deliberately curated combos.
      if (plan.product === 'mentorship' && !plan.is_bundle) {
        const hasConflict = prev.some((i) => i.product === 'mentorship' && !i.is_bundle);
        if (hasConflict) {
          blocked = true;
          return prev;
        }
      }

      return [
        ...prev,
        {
          plan_key: plan.plan_key,
          name: plan.name,
          price_paise: plan.price_paise,
          tagline: plan.tagline,
          product: plan.product,
          is_bundle: !!plan.is_bundle,
        },
      ];
    });
    if (blocked) {
      onConflict?.();
    } else {
      setOpen(true);
    }
  }, []);

  const removeItem = useCallback((planKey) => {
    setItems((prev) => prev.filter((i) => i.plan_key !== planKey));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const total = items.reduce((sum, i) => sum + i.price_paise, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clear, total, open, setOpen }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart() must be used within a <CartProvider>.');
  return ctx;
}
