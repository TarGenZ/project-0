// POST /api/verify-payment  (Netlify Function)
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Verifies the HMAC signature Razorpay returns, then flips the matching
// `pending` purchase rows (created in create-order.js) to `paid`. This is
// the primary "mark as paid" path, run right after checkout in the user's
// browser. /api/webhook is the reliability backstop for cases where the
// browser loses connection before this ever runs — both funnel through the
// same finalizeOrderPayment() helper so a purchase only ever becomes `paid`
// in one place.

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { finalizeOrderPayment } from './_lib/finalizePurchase.js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async (req) => {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });

  try {
    const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
    if (!token) return json({ error: 'Not signed in.' }, 401);

    const {
      data: { user },
      error: authErr,
    } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return json({ error: 'Invalid session — please sign in again.' }, 401);

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json().catch(() => ({}));
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json({ error: 'Missing payment fields.' }, 400);
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return json({ error: 'Invalid payment signature.' }, 400);
    }

    const purchases = await finalizeOrderPayment(supabaseAdmin, {
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      userId: user.id, // ownership check — this endpoint is user-triggered, unlike the webhook
    });

    if (purchases.length === 0) {
      const { data: already } = await supabaseAdmin
        .from('purchases')
        .select('*')
        .eq('razorpay_order_id', razorpay_order_id)
        .eq('user_id', user.id)
        .eq('status', 'paid');
      if (already && already.length > 0) return json({ success: true, purchases: already });
      return json({ error: 'No matching pending order found for this payment.' }, 404);
    }

    return json({ success: true, purchases });
  } catch (err) {
    console.error('[verify-payment] failed:', err);
    return json({ error: 'Could not verify payment.' }, 500);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

export const config = { path: '/api/verify-payment' };
