import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient }             from '@supabase/ssr'

// Routes that are always public (no auth required)
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/bootstrap',
  '/_next',
  '/favicon.ico',
]

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow public paths through — but still forward the pathname header
  if (isPublic(pathname)) {
    const res = NextResponse.next()
    res.headers.set('x-pathname', pathname)
    return res
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // We need a response object so @supabase/ssr can write refreshed cookies
  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // Write cookies to both the request (so server components see them)
        // and the response (so the browser stores the refreshed session)
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  // Refresh the session (rotates tokens if needed)
  const { data: { user } } = await supabase.auth.getUser()

  // ── Not logged in → redirect to /login ───────────────────────────────────
  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    // Preserve the intended destination so we can redirect back after login
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Logged in but NOT superadmin → redirect to /login with error ─────────
  // We check via a Supabase RPC/query using the SERVICE key would be ideal,
  // but in middleware we only have the anon client.  We store the superadmin
  // flag in the user's JWT app_metadata (set during bootstrap/login), so we
  // read it from there.  Fallback: query profiles on first load only.
  //
  // Strategy: we embed is_superadmin in the session via a custom claim.
  // Until that's set up we perform the profiles query here.
  // Note: this runs on every non-public request, but Supabase edge is fast.
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_superadmin) {
    // Sign out and redirect with a message
    await supabase.auth.signOut()
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('error', 'not_superadmin')
    return NextResponse.redirect(loginUrl)
  }

  // ── All good — pass through with refreshed cookies ───────────────────────
  response.headers.set('x-pathname', pathname)
  return response
}

export const config = {
  /*
   * Match all paths EXCEPT static files and Next.js internals.
   * We intentionally include /api/* so API routes are also protected.
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
