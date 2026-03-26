import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET /api/llm-responses?page=1&limit=30&humor_flavor_id=&llm_model_id=
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page           = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10))
    const limit          = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '30', 10)))
    const humor_flavor_id = searchParams.get('humor_flavor_id')
    const llm_model_id    = searchParams.get('llm_model_id')
    const from = (page - 1) * limit
    const to   = from + limit - 1

    const supabase = getSupabaseAdmin()
    let query = supabase
      .from('llm_model_responses')
      .select(`
        *,
        profile:profiles!profile_id(id, first_name, last_name, email),
        llm_model:llm_models(id, name, provider_model_id),
        humor_flavor:humor_flavors(id, slug)
      `, { count: 'exact' })
      .order('created_datetime_utc', { ascending: false })

    if (humor_flavor_id) query = query.eq('humor_flavor_id', humor_flavor_id)
    if (llm_model_id)    query = query.eq('llm_model_id', llm_model_id)

    const { data, count, error } = await query.range(from, to)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
