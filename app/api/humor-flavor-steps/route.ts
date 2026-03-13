import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET /api/humor-flavor-steps?humor_flavor_id=
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const humor_flavor_id = searchParams.get('humor_flavor_id')

    const supabase = getSupabaseAdmin()
    let query = supabase
      .from('humor_flavor_steps')
      .select(`
        *,
        humor_flavor:humor_flavors(id, slug),
        humor_flavor_step_type:humor_flavor_step_types(id, slug, description),
        llm_input_type:llm_input_types(id, slug, description),
        llm_output_type:llm_output_types(id, slug, description),
        llm_model:llm_models(id, name, provider_model_id)
      `)
      .order('humor_flavor_id', { ascending: true })
      .order('order_by', { ascending: true })

    if (humor_flavor_id) {
      query = query.eq('humor_flavor_id', humor_flavor_id)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
