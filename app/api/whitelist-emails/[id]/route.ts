import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// PATCH /api/whitelist-emails/[id]
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { email_address } = await request.json()
    if (!email_address) return NextResponse.json({ error: 'email_address is required' }, { status: 400 })

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('whitelist_email_addresses')
      .update({ email_address: email_address.toLowerCase().trim(), modified_datetime_utc: new Date().toISOString() })
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

// DELETE /api/whitelist-emails/[id]
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('whitelist_email_addresses').delete().eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
