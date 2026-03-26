import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// GET /api/whitelist-emails?search=
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? ''

    const supabase = getSupabaseAdmin()
    let query = supabase
      .from('whitelist_email_addresses')
      .select('*')
      .order('email_address', { ascending: true })

    if (search) {
      query = query.ilike('email_address', `%${search}%`)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/whitelist-emails  body: { email_address }
export async function POST(request: Request) {
  try {
    const { data: { user } } = await createSupabaseServerClient().auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { email_address } = await request.json()
    if (!email_address) return NextResponse.json({ error: 'email_address is required' }, { status: 400 })

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('whitelist_email_addresses')
      .insert({ email_address: email_address.toLowerCase().trim(), created_by_user_id: user.id, modified_by_user_id: user.id })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
