// Server-side capacity checks — run before create-order.js is allowed to
// open a Razorpay order for a plan. Mirrors the pooling logic in the
// plan_pool_enrollment_count() SQL function (used client-side for display),
// but does its own counting here so it can also resolve + return the
// specific group_sessions batch a one-time group purchase should be
// stamped with.
//
// Pools, by plan type:
//   - personal one-time (pick_date, not group):   shared across all such plan_keys, cap = plan.capacity (7)
//   - personal weekly   (pick_weekly, not group):  shared across all such plan_keys, cap = plan.capacity (14)
//   - group cohort      (is_group, monthly/yearly): shared across all group monthly/yearly plan_keys, cap = plan.capacity (50)
//   - group batch       (is_group, one_time):      scoped to the soonest upcoming group_sessions row, cap = that row's capacity (50)
//
// Returns { ok: true, groupBatchId? } or { ok: false, error }.

export async function checkPlanCapacity(supabaseAdmin, plan) {
  const nowIso = new Date().toISOString();

  if (!plan.is_group && (plan.schedule_type === 'pick_date' || plan.schedule_type === 'pick_weekly')) {
    if (!plan.capacity) return { ok: true };

    const { data: poolPlans, error: poolErr } = await supabaseAdmin
      .from('plans')
      .select('plan_key')
      .eq('schedule_type', plan.schedule_type)
      .eq('is_group', false);
    if (poolErr) throw poolErr;
    const poolKeys = (poolPlans || []).map((p) => p.plan_key);

    const { count, error: countErr } = await supabaseAdmin
      .from('purchases')
      .select('id', { count: 'exact', head: true })
      .in('plan_key', poolKeys)
      .eq('status', 'paid')
      .or(`valid_till.is.null,valid_till.gt.${nowIso}`);
    if (countErr) throw countErr;

    if ((count || 0) >= plan.capacity) {
      return {
        ok: false,
        error:
          plan.schedule_type === 'pick_date'
            ? 'All personal one-time session slots are full right now — check back once a spot frees up.'
            : "All personal weekly slots are full for now — check back once someone's plan expires.",
      };
    }
    return { ok: true };
  }

  if (plan.is_group && (plan.billing_period === 'monthly' || plan.billing_period === 'yearly')) {
    if (!plan.capacity) return { ok: true };

    const { data: poolPlans, error: poolErr } = await supabaseAdmin
      .from('plans')
      .select('plan_key')
      .eq('is_group', true)
      .in('billing_period', ['monthly', 'yearly']);
    if (poolErr) throw poolErr;
    const poolKeys = (poolPlans || []).map((p) => p.plan_key);

    const { count, error: countErr } = await supabaseAdmin
      .from('purchases')
      .select('id', { count: 'exact', head: true })
      .in('plan_key', poolKeys)
      .eq('status', 'paid')
      .or(`valid_till.is.null,valid_till.gt.${nowIso}`);
    if (countErr) throw countErr;

    if ((count || 0) >= plan.capacity) {
      return { ok: false, error: 'The group batch is full right now — check back once a spot opens up.' };
    }
    return { ok: true };
  }

  if (plan.is_group && plan.billing_period === 'one_time') {
    const { data: batch, error: batchErr } = await supabaseAdmin
      .from('group_sessions')
      .select('*')
      .eq('plan_key', plan.plan_key)
      .gte('session_date', nowIso.slice(0, 10))
      .order('session_date', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (batchErr) throw batchErr;

    if (!batch) {
      return { ok: false, error: `No group session is scheduled yet for "${plan.name}" — check back soon.` };
    }

    const { count, error: countErr } = await supabaseAdmin
      .from('purchases')
      .select('id', { count: 'exact', head: true })
      .eq('group_batch_id', batch.id)
      .eq('status', 'paid');
    if (countErr) throw countErr;

    if ((count || 0) >= (batch.capacity || 50)) {
      const dateLabel = new Date(batch.session_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
      return { ok: false, error: `This month's group batch (${dateLabel}) is full — check back for next month's session.` };
    }

    return { ok: true, groupBatchId: batch.id };
  }

  return { ok: true };
}
