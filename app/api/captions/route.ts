import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET /api/captions?page=1&limit=20&search=&sort=recent|most_liked|least_liked&image_id=
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page     = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10))
    const limit    = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const search   = searchParams.get('search')   ?? ''
    const sort     = searchParams.get('sort')     ?? 'recent'
    const imageId  = searchParams.get('image_id') ?? ''
    const from     = (page - 1) * limit
    const to       = from + limit - 1

    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('captions')
      .select(`
        *,
        image:images ( id, url ),
        profile:profiles ( id, first_name, last_name, email )
      `, { count: 'exact' })

    if (search) {
      query = query.ilike('content', `%${search}%`)
    }

    if (imageId) {
      query = query.eq('image_id', imageId)
    }

    // Sorting
    if (sort === 'most_liked')  query = query.order('like_count', { ascending: false }).order('created_datetime_utc', { ascending: false })
    else if (sort === 'least_liked') query = query.order('like_count', { ascending: true  }).order('created_datetime_utc', { ascending: false })
    else query = query.order('created_datetime_utc', { ascending: false }) // recent

    query = query.range(from, to)

    const { data, count, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/captions  body: { id }
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('captions').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
