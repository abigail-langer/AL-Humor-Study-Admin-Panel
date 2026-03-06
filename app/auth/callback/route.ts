import { NextResponse }       from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies }            from 'next/headers'
import { getSupabaseAdmin }   from '@/lib/supabase'

/**
 * GET /auth/callback
 *
 * Supabase redirects here after Google OAuth completes.
 * Identical pattern to AL-Humor-Study-Project, plus the superadmin guard:
 *
 *   1. Exchange the ?code= param for a Supabase session (sets cookie)
 *   2. Check profiles.is_superadmin via the service-role key
 *   3a. Superadmin  → redirect to / (or the originally requested page)
 *   3b. Not admin   → sign out, redirect to /login?error=not_superadmin
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // No code → something went wrong with the OAuth flow
  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  // Build a server client that can write the session cookie
  const cookieStore = cookies()
  const response    = NextResponse.redirect(`${origin}${next}`)

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll()        { return cookieStore.getAll() },
      setAll(list) {
        // Write to both the cookie store AND the redirect response
        list.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  // Exchange the OAuth code for a session
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  // ── Superadmin check (service-role bypasses RLS) ──────────────────────────
  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('is_superadmin')
    .eq('id', data.session.user.id)
    .single()

  if (!profile?.is_superadmin) {
    // Not a superadmin — sign them back out and send to login with an error
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=not_superadmin`)
  }

  // All good — the redirect response already has the session cookie set above
  return response
}
