import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET /api/images?page=1&limit=20&search=&filter=all|common|public
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page   = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10))
    const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const search = searchParams.get('search') ?? ''
    const filter = searchParams.get('filter') ?? 'all'
    const from   = (page - 1) * limit
    const to     = from + limit - 1

    const supabase = getSupabaseAdmin()

    // Join profiles so we can show uploader name/email
    let query = supabase
      .from('images')
      .select(`
        *,
        profile:profiles ( id, first_name, last_name, email )
      `, { count: 'exact' })

    if (search) {
      query = query.or(
        `url.ilike.%${search}%,image_description.ilike.%${search}%,additional_context.ilike.%${search}%`
      )
    }

    if (filter === 'common') query = query.eq('is_common_use', true)
    if (filter === 'public') query = query.eq('is_public', true)

    query = query
      .order('created_datetime_utc', { ascending: false })
      .range(from, to)

    const { data, count, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/images  body: { id }
// Deletes the image row — cascades to captions via FK
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('images').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
