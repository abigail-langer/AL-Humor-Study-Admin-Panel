import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET /api/terms?page=1&limit=30&search=
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
      .from('terms')
      .select('*', { count: 'exact' })
      .order('priority', { ascending: false })
      .order('term', { ascending: true })

    if (search) {
      query = query.or(`term.ilike.%${search}%,definition.ilike.%${search}%`)
    }

    const { data, count, error } = await query.range(from, to)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/terms  body: { term, definition, example, priority?, term_type_id? }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { term, definition, example, priority = 0, term_type_id = null } = body
    if (!term)       return NextResponse.json({ error: 'term is required' },       { status: 400 })
    if (!definition) return NextResponse.json({ error: 'definition is required' }, { status: 400 })
    if (!example)    return NextResponse.json({ error: 'example is required' },    { status: 400 })

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('terms')
      .insert({ term, definition, example, priority, term_type_id })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
