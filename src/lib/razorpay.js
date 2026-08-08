import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

/**
 * Loads the Razorpay checkout script once, shared by any component/app
 * that needs it. Mirrors src/lib/useRazorpaySDK.js from the mentorship app.
 */
export function useRazorpaySDK() {
  const [ready, setReady] = useState(!!window.Razorpay);

  useEffect(() => {
    if (window.Razorpay) {
      setReady(true);
      return;
    }
    const existing = document.querySelector(`script[src="${CHECKOUT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => setReady(true));
      return;
    }
    const script = document.createElement('script');
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => setReady(true);
    script.onerror = () => setReady(false);
    document.body.appendChild(script);
  }, []);

  return ready;
}

/**
 * Full purchase flow: create-order -> open Razorpay modal -> verify-payment
 * -> onSuccess callback (caller is responsible for the actual DB insert,
 * since the shape of a "purchase" differs per app — mentorship sessions,
 * resource bundles, counselling slots, etc).
 *
 * amountInPaise must be >= 100 (Razorpay minimum).
 */
export async function startCheckout({
  amountInPaise,
  productLabel,
  description,
  onSuccess,
  onFailure,
  onCancelled,
}) {
  if (!window.Razorpay) {
    onFailure?.(new Error('Razorpay checkout script has not loaded yet.'));
    return;
  }
  if (amountInPaise < 100) {
    onFailure?.(new Error('Amount must be at least 100 paise (₹1).'));
    return;
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    const orderRes = await fetch('/api/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ amount: amountInPaise, label: productLabel }),
    });
    if (!orderRes.ok) throw new Error('Could not create order.');
    const order = await orderRes.json();

    const rzp = new window.Razorpay({
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency || 'INR',
      order_id: order.id,
      name: 'Arpan Sarkar',
      description: description || productLabel,
      theme: { color: '#7C3AED' },
      handler: async (response) => {
        try {
          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify(response),
          });
          if (!verifyRes.ok) throw new Error('Payment verification failed.');
          onSuccess?.(response);
        } catch (err) {
          onFailure?.(err);
        }
      },
      modal: {
        ondismiss: () => onCancelled?.(),
      },
    });

    rzp.on('payment.failed', (resp) => onFailure?.(resp.error));
    rzp.open();
  } catch (err) {
    onFailure?.(err);
  }
}
