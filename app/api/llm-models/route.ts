import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// GET /api/llm-models
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('llm_models')
      .select(`*, provider:llm_providers(id, name)`)
      .order('id', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/llm-models
export async function POST(request: Request) {
  try {
    const { data: { user } } = await createSupabaseServerClient().auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await request.json()
    const { name, llm_provider_id, provider_model_id, is_temperature_supported = false } = body
    if (!name)              return NextResponse.json({ error: 'name is required' },              { status: 400 })
    if (!llm_provider_id)   return NextResponse.json({ error: 'llm_provider_id is required' },   { status: 400 })
    if (!provider_model_id) return NextResponse.json({ error: 'provider_model_id is required' }, { status: 400 })

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('llm_models')
      .insert({ name, llm_provider_id, provider_model_id, is_temperature_supported, created_by_user_id: user.id, modified_by_user_id: user.id })
      .select(`*, provider:llm_providers(id, name)`)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
