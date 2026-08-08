// POST /api/webhook — Razorpay server-to-server webhook (Netlify Function).
//
// Why this exists: if a user's connection drops right after paying, their
// browser may never reach /api/verify-payment, and the pending purchase row
// would be stuck forever even though Razorpay actually captured the money.
// Razorpay calls this endpoint independently of the browser (and retries on
// failure), so it's the reliable fallback that finalizes the purchase
// either way. Both this and verify-payment.js funnel through the same
// finalizeOrderPayment() helper, so nothing is duplicated if both fire.
//
// Setup (Razorpay Dashboard → Settings → Webhooks → Add New Webhook):
//   URL:    https://www.arpansarkar.org/api/webhook
//   Secret: any string YOU choose — put the same value in the
//           RAZORPAY_WEBHOOK_SECRET Netlify environment variable (this is
//           NOT your API key secret, it's a separate webhook-only secret)
//   Events: payment.captured, order.paid

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { finalizeOrderPayment } from './_lib/finalizePurchase.js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async (req) => {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });

  const raw = await req.text();

  const signature = req.headers.get('x-razorpay-signature');
  if (!signature) return json({ error: 'Missing signature.' }, 400);

  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex');
  if (expected !== signature) {
    console.warn('[webhook] signature mismatch — ignoring');
    return json({ error: 'Invalid signature.' }, 400);
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return json({ error: 'Malformed payload.' }, 400);
  }

  try {
    const type = event.event;
    if (type === 'payment.captured' || type === 'order.paid') {
      const payment = event.payload?.payment?.entity;
      const orderId = payment?.order_id || event.payload?.order?.entity?.id;
      const paymentId = payment?.id;

      if (orderId && paymentId) {
        const purchases = await finalizeOrderPayment(supabaseAdmin, { razorpayOrderId: orderId, razorpayPaymentId: paymentId });
        console.log(`[webhook] ${type}: finalized ${purchases.length} purchase row(s) for order ${orderId}`);
      }
    }
    return json({ received: true });
  } catch (err) {
    console.error('[webhook] processing failed:', err);
    return json({ error: 'Webhook processing failed.' }, 500);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

export const config = { path: '/api/webhook' };
