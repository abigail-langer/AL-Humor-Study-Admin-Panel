import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// PATCH /api/llm-models/[id]
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { data: { user } } = await createSupabaseServerClient().auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await request.json()
    const allowed = ['name', 'llm_provider_id', 'provider_model_id', 'is_temperature_supported']
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
    }
    updates.modified_datetime_utc = new Date().toISOString()
    updates.modified_by_user_id = user.id

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('llm_models')
      .update(updates)
      .eq('id', params.id)
      .select(`*, provider:llm_providers(id, name)`)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/llm-models/[id]
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { data: { user } } = await createSupabaseServerClient().auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('llm_models').delete().eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
