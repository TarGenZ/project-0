// POST /api/verify-payment
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Verifies the HMAC signature Razorpay returns, then flips the matching
// `pending` purchase rows (created in create-order.js) to `paid`. This is
// the primary "mark as paid" path, run right after checkout in the user's
// browser. /api/webhook.js is the reliability backstop for cases where the
// browser loses connection before this ever runs — both funnel through the
// same finalizeOrderPayment() helper so a purchase only ever becomes `paid`
// in one place.

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { finalizeOrderPayment } from './_lib/finalizePurchase.js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Not signed in.' });

    const {
      data: { user },
      error: authErr,
    } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Invalid session — please sign in again.' });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment fields.' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature.' });
    }

    const purchases = await finalizeOrderPayment(supabaseAdmin, {
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      userId: user.id, // ownership check — this endpoint is user-triggered, unlike the webhook
    });

    // Not necessarily an error: the webhook may have already finalized this
    // order a moment earlier (e.g. slow network). Treat as success either way
    // as long as the order belongs to this user and isn't still pending.
    if (purchases.length === 0) {
      const { data: already } = await supabaseAdmin
        .from('purchases')
        .select('*')
        .eq('razorpay_order_id', razorpay_order_id)
        .eq('user_id', user.id)
        .eq('status', 'paid');
      if (already && already.length > 0) {
        return res.status(200).json({ success: true, purchases: already });
      }
      return res.status(404).json({ error: 'No matching pending order found for this payment.' });
    }

    res.status(200).json({ success: true, purchases });
  } catch (err) {
    console.error('[verify-payment] failed:', err);
    res.status(500).json({ error: 'Could not verify payment.' });
  }
}
