import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser-side Supabase client using the ANON key.
 * Use this in Client Components for auth calls (signIn, signOut, getSession).
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return createBrowserClient(url, key)
}
