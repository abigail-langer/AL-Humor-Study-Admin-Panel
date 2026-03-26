import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// GET /api/humor-flavor-mix
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('humor_flavor_mix')
      .select(`*, humor_flavor:humor_flavors(id, slug, description)`)
      .order('id', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PATCH /api/humor-flavor-mix  body: { id, caption_count }
export async function PATCH(request: Request) {
  try {
    const { data: { user } } = await createSupabaseServerClient().auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await request.json()
    const { id, caption_count } = body
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    if (caption_count === undefined || caption_count === null) {
      return NextResponse.json({ error: 'caption_count is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('humor_flavor_mix')
      .update({ caption_count, modified_by_user_id: user.id })
      .eq('id', id)
      .select(`*, humor_flavor:humor_flavors(id, slug, description)`)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
