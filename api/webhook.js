// POST /api/webhook — Razorpay server-to-server webhook.
//
// Why this exists: if a user's connection drops right after paying, their
// browser may never reach /api/verify-payment, and the pending purchase row
// would be stuck forever even though Razorpay actually captured the money.
// Razorpay calls this endpoint independently of the browser (and retries on
// failure), so it's the reliable fallback that finalizes the purchase either
// way. Both this and verify-payment.js funnel through the same
// finalizeOrderPayment() helper, so nothing is duplicated if both fire.
//
// Setup (Razorpay Dashboard → Settings → Webhooks → Add New Webhook):
//   URL:    https://www.arpansarkar.org/api/webhook
//   Secret: any string YOU choose — put the same value in the
//           RAZORPAY_WEBHOOK_SECRET env var on Vercel (this is NOT your
//           API key secret, it's a separate webhook-only secret)
//   Events: payment.captured, order.paid

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { finalizeOrderPayment } from './_lib/finalizePurchase.js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Signature verification needs the exact raw bytes Razorpay signed, so the
// built-in JSON body parser has to be turned off — we read the raw body
// ourselves and only parse it as JSON *after* the signature checks out.
export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const raw = await readRawBody(req);

  const signature = req.headers['x-razorpay-signature'];
  if (!signature) return res.status(400).json({ error: 'Missing signature.' });

  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex');

  if (expected !== signature) {
    console.warn('[webhook] signature mismatch — ignoring');
    return res.status(400).json({ error: 'Invalid signature.' });
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return res.status(400).json({ error: 'Malformed payload.' });
  }

  try {
    const type = event.event;
    if (type === 'payment.captured' || type === 'order.paid') {
      const payment = event.payload?.payment?.entity;
      const orderId = payment?.order_id || event.payload?.order?.entity?.id;
      const paymentId = payment?.id;

      if (orderId && paymentId) {
        const purchases = await finalizeOrderPayment(supabaseAdmin, {
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
        });
        console.log(`[webhook] ${type}: finalized ${purchases.length} purchase row(s) for order ${orderId}`);
      }
    }
    // 200 once the signature is verified, even for event types we ignore —
    // otherwise Razorpay keeps retrying events we were never going to act on.
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[webhook] processing failed:', err);
    // 500 here on purpose so Razorpay retries — this is a real failure to
    // finalize a payment, not an event we're choosing to skip.
    res.status(500).json({ error: 'Webhook processing failed.' });
  }
}
