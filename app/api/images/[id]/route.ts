import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET /api/images/[id]  — fetch one image + its captions
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin()

    const { data: image, error: imgErr } = await supabase
      .from('images')
      .select(`*, profile:profiles ( id, first_name, last_name, email )`)
      .eq('id', params.id)
      .single()

    if (imgErr) return NextResponse.json({ error: imgErr.message }, { status: 404 })

    const { data: captions, error: capErr } = await supabase
      .from('captions')
      .select('id, content, is_public, is_featured, like_count, created_datetime_utc')
      .eq('image_id', params.id)
      .order('like_count', { ascending: false })

    if (capErr) return NextResponse.json({ error: capErr.message }, { status: 500 })

    return NextResponse.json({ image, captions: captions ?? [] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PATCH /api/images/[id]  — update editable fields
// Allowed fields: additional_context, image_description, is_common_use, is_public
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    const allowed = ['additional_context', 'image_description', 'is_common_use', 'is_public']
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
    }

    updates.modified_datetime_utc = new Date().toISOString()

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('images')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
