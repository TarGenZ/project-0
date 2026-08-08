// POST /api/create-order
// Body: { items: [{ plan_key }] }
// Price is NEVER taken from the client — every plan_key is re-priced
// server-side from the `plans` table, using the Supabase service-role key
// (server-only, never exposed to the browser). Creates the Razorpay order
// AND the matching `pending` purchase rows in one step.
//
// A `plan_key` here can point at a regular plan, a bundle (plans.is_bundle
// = true), OR a capacity-limited plan (personal one-time/weekly caps, group
// cohort/batch caps) — see api/_lib/capacity.js for the pooling rules. Every
// item in the cart is capacity-checked before the Razorpay order is created,
// so nobody pays for a plan that's actually full.

import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';
import { checkPlanCapacity } from './_lib/capacity.js';
import { checkMentorshipCartConflict } from './_lib/planConflicts.js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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

    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }

    const planKeys = items.map((i) => i.plan_key);
    const { data: plans, error: plansErr } = await supabaseAdmin
      .from('plans')
      .select('*')
      .in('plan_key', planKeys)
      .eq('is_active', true);
    if (plansErr) throw plansErr;

    if (plans.length !== new Set(planKeys).size) {
      return res.status(400).json({ error: 'One or more plans in your cart are no longer available.' });
    }

    const now = new Date();
    const unavailable = plans.find(
      (p) => (p.available_from && new Date(p.available_from) > now) || (p.available_to && new Date(p.available_to) < now)
    );
    if (unavailable) {
      return res.status(400).json({ error: `"${unavailable.name}" is not available for purchase right now.` });
    }

    const freeInCart = plans.find((p) => p.price_paise === 0);
    if (freeInCart) {
      return res.status(400).json({ error: `"${freeInCart.name}" is free — claim it directly, no checkout needed.` });
    }

    const conflict = await checkMentorshipCartConflict(supabaseAdmin, plans, user.id);
    if (!conflict.ok) {
      return res.status(409).json({ error: conflict.error });
    }

    // Capacity check every item BEFORE creating the Razorpay order — nobody
    // should pay for a plan that's actually full. Also collects the
    // group_sessions batch id for one-time group plans, if applicable.
    const groupBatchByPlanKey = {};
    for (const plan of plans) {
      const result = await checkPlanCapacity(supabaseAdmin, plan);
      if (!result.ok) {
        return res.status(409).json({ error: result.error });
      }
      if (result.groupBatchId) {
        groupBatchByPlanKey[plan.plan_key] = result.groupBatchId;
      }
    }

    const totalPaise = plans.reduce((sum, p) => sum + p.price_paise, 0);
    if (totalPaise < 100) {
      return res.status(400).json({ error: 'Order total is below the minimum payable amount.' });
    }

    const order = await razorpay.orders.create({
      amount: totalPaise,
      currency: 'INR',
      receipt: `rcpt_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: { user_id: user.id, plan_keys: planKeys.join(',') },
    });

    const pendingRows = plans.map((p) => ({
      user_id: user.id,
      product: p.product,
      plan_key: p.plan_key,
      plan_name: p.name,
      amount_paise: p.price_paise,
      billing_period: p.billing_period,
      razorpay_order_id: order.id,
      status: 'pending',
      valid_till: p.fixed_expiry_date
        ? new Date(p.fixed_expiry_date).toISOString()
        : p.duration_days
          ? new Date(Date.now() + p.duration_days * 86400000).toISOString()
          : null,
      group_batch_id: groupBatchByPlanKey[p.plan_key] || null,
    }));

    const { error: insertErr } = await supabaseAdmin.from('purchases').insert(pendingRows);
    if (insertErr) throw insertErr;

    res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('[create-order] failed:', err);
    res.status(500).json({ error: 'Could not start checkout. Please try again.' });
  }
}
