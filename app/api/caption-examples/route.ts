import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// GET /api/caption-examples?page=1&limit=30&search=
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page   = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10))
    const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '30', 10)))
    const search = searchParams.get('search') ?? ''
    const from   = (page - 1) * limit
    const to     = from + limit - 1

    const supabase = getSupabaseAdmin()
    let query = supabase
      .from('caption_examples')
      .select(`*, image:images(id, url)`, { count: 'exact' })
      .order('priority', { ascending: false })
      .order('created_datetime_utc', { ascending: false })

    if (search) {
      query = query.or(`caption.ilike.%${search}%,image_description.ilike.%${search}%,explanation.ilike.%${search}%`)
    }

    const { data, count, error } = await query.range(from, to)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/caption-examples
export async function POST(request: Request) {
  try {
    const { data: { user } } = await createSupabaseServerClient().auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await request.json()
    const { image_description, caption, explanation, priority = 0, image_id = null } = body
    if (!image_description) return NextResponse.json({ error: 'image_description is required' }, { status: 400 })
    if (!caption)           return NextResponse.json({ error: 'caption is required' },           { status: 400 })
    if (!explanation)       return NextResponse.json({ error: 'explanation is required' },       { status: 400 })

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('caption_examples')
      .insert({ image_description, caption, explanation, priority, image_id, created_by_user_id: user.id, modified_by_user_id: user.id })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
