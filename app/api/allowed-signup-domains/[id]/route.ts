import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// DELETE /api/allowed-signup-domains/[id]
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('allowed_signup_domains').delete().eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
