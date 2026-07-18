// Shared by /api/verify-payment.js (frontend-triggered, right after checkout)
// and /api/webhook.js (Razorpay-triggered, works even if the user's browser
// dropped connection before verify-payment could run). Both paths end up
// calling this so there's exactly one place that ever flips a purchase to
// 'paid'.
//
// Marking a bundle plan's purchase row 'paid' here is enough to unlock every
// plan inside it too — see expand_bundle_purchase() in the SQL migration,
// which fires automatically on this update.

export async function finalizeOrderPayment(supabaseAdmin, { razorpayOrderId, razorpayPaymentId, userId = null }) {
  let query = supabaseAdmin
    .from('purchases')
    .update({ status: 'paid', razorpay_payment_id: razorpayPaymentId })
    .eq('razorpay_order_id', razorpayOrderId)
    .eq('status', 'pending');

  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query.select();
  if (error) throw error;
  return data || [];
}
