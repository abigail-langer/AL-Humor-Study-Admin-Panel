import { NextResponse }       from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies }            from 'next/headers'
import { getSupabaseAdmin }   from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    // Build a server client that can write cookies
    const cookieStore = cookies()
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll()                          { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    })

    // Attempt sign-in
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error || !data.session) {
      return NextResponse.json(
        { error: error?.message ?? 'Invalid credentials' },
        { status: 401 }
      )
    }

    // ── Superadmin check ──────────────────────────────────────────────────────
    // Use the service-role client so we can read profiles regardless of RLS
    const admin = getSupabaseAdmin()
    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('is_superadmin')
      .eq('id', data.session.user.id)
      .single()

    if (profileErr || !profile?.is_superadmin) {
      // Sign the user back out immediately so no session lingers
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: 'Access denied. This panel requires a superadmin account.' },
        { status: 403 }
      )
    }

    // Session cookie was written by createServerClient above — we're done
    return NextResponse.json({ ok: true })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
