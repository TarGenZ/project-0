// Prevents students from holding more than one non-bundle mentorship plan
// at once — stacking monthly+yearly, one-time+monthly/yearly, or
// group+personal plans together is a known chargeback-abuse pattern
// (dispute one payment while still actively using the other). The cart's
// own addItem() already blocks this client-side for immediate feedback,
// but that's just UX — this is the actual enforcement, checked against
// BOTH the current cart AND anything the user already owns.
//
// Bundles are exempt (product may be 'mentorship' or 'bundle' depending on
// how the admin tagged it) since they're deliberately curated combinations.

export async function checkMentorshipCartConflict(supabaseAdmin, plans, userId) {
  const nonBundleMentorship = plans.filter((p) => p.product === 'mentorship' && !p.is_bundle);
  if (nonBundleMentorship.length === 0) return { ok: true };

  if (nonBundleMentorship.length > 1) {
    return {
      ok: false,
      error:
        'Only one mentorship plan can be purchased at a time — remove the extra one from your cart (monthly, yearly, one-time, and group plans can\'t be combined).',
    };
  }

  const nowIso = new Date().toISOString();
  const { data: held, error } = await supabaseAdmin
    .from('purchases')
    .select('plan_key')
    .eq('user_id', userId)
    .eq('product', 'mentorship')
    .eq('status', 'paid')
    .is('source_purchase_id', null) // exclude bundle-expanded entitlement rows
    .or(`valid_till.is.null,valid_till.gt.${nowIso}`);
  if (error) throw error;

  if (held && held.length > 0) {
    const heldKeys = held.map((h) => h.plan_key);
    const { data: heldPlans, error: heldPlansErr } = await supabaseAdmin
      .from('plans')
      .select('plan_key, is_bundle')
      .in('plan_key', heldKeys);
    if (heldPlansErr) throw heldPlansErr;

    const hasActiveNonBundle = (heldPlans || []).some((p) => !p.is_bundle);
    if (hasActiveNonBundle) {
      return {
        ok: false,
        error: 'You already have an active mentorship plan. Wait for it to expire before buying another.',
      };
    }
  }

  return { ok: true };
}
