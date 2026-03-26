import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET /api/caption-requests?page=1&limit=30
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '30', 10)))
    const from  = (page - 1) * limit
    const to    = from + limit - 1

    const supabase = getSupabaseAdmin()
    const { data, count, error } = await supabase
      .from('caption_requests')
      .select(`
        *,
        profile:profiles!profile_id(id, first_name, last_name, email),
        image:images(id, url, image_description)
      `, { count: 'exact' })
      .order('created_datetime_utc', { ascending: false })
      .range(from, to)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
