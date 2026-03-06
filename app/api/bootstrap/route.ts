import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

/**
 * POST /api/bootstrap
 *
 * Self-sealing first-superadmin promotion.
 *
 * Rules:
 *   1. If ANY row in profiles already has is_superadmin = true  → 403, do nothing.
 *   2. If zero superadmins exist AND the supplied user_id exists → promote that user.
 *   3. Once a superadmin exists this route is permanently a no-op.
 *
 * Body: { user_id: string }
 *
 * This route is intentionally kept in the PUBLIC_PATHS list in middleware.ts
 * so it's reachable before any superadmin exists.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { user_id } = body as { user_id?: string }

    if (!user_id || typeof user_id !== 'string') {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // ── Check: does any superadmin already exist? ─────────────────────────
    const { count, error: countErr } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_superadmin', true)

    if (countErr) {
      return NextResponse.json({ error: countErr.message }, { status: 500 })
    }

    if (count && count > 0) {
      // Already bootstrapped — this route is now sealed
      return NextResponse.json(
        { error: 'Bootstrap already complete. This route is disabled.' },
        { status: 403 }
      )
    }

    // ── No superadmin yet — verify the user_id exists in profiles ─────────
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', user_id)
      .single()

    if (profileErr || !profile) {
      return NextResponse.json(
        { error: 'User not found. Make sure the user has signed up and their profile exists.' },
        { status: 404 }
      )
    }

    // ── Promote to superadmin ─────────────────────────────────────────────
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        is_superadmin: true,
        modified_datetime_utc: new Date().toISOString(),
      })
      .eq('id', user_id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      message: `User ${profile.email ?? user_id} has been promoted to superadmin. Bootstrap is now sealed.`,
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
