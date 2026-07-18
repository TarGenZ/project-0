import { supabase } from './supabaseClient';

let scriptPromise = null;
function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Could not load Razorpay checkout script.'));
    document.body.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Runs a full checkout for the given cart items (just plan_keys — price
 * is never taken from the client). Resolves with the paid purchases on
 * success, rejects with an Error otherwise (including user-cancelled).
 * @param {{plan_key: string}[]} items
 * @param {{name: string, email: string}} customer
 * @returns {Promise<object[]>}
 */
export async function runCheckout(items, customer) {
  await loadRazorpayScript();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in first.');

  const orderRes = await fetch('/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ items: items.map((i) => ({ plan_key: i.plan_key })) }),
  });
  const order = await orderRes.json();
  if (!orderRes.ok) throw new Error(order.error || 'Could not start checkout.');

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.key_id,
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      name: 'ArpanMentors',
      description: items.map((i) => i.name).join(', '),
      prefill: { name: customer?.name, email: customer?.email },
      theme: { color: '#7C3AED' },
      handler: async (response) => {
        try {
          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify(response),
          });
          const result = await verifyRes.json();
          if (!verifyRes.ok) throw new Error(result.error || 'Payment verification failed.');
          resolve(result.purchases);
        } catch (err) {
          reject(err);
        }
      },
      modal: {
        ondismiss: () => reject(new Error('Checkout cancelled.')),
      },
    });
    rzp.on('payment.failed', (resp) => reject(new Error(resp.error?.description || 'Payment failed.')));
    rzp.open();
  });
}
