import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page    = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10))
    const limit   = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const search  = searchParams.get('search') ?? ''
    const from    = (page - 1) * limit
    const to      = from + limit - 1

    const supabase = getSupabaseAdmin()
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })

    if (search) {
      query = query.or(
        `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
      )
    }

    query = query
      .order('created_datetime_utc', { ascending: false })
      .range(from, to)

    const { data, count, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data:  data  ?? [],
      total: count ?? 0,
      page,
      limit,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
