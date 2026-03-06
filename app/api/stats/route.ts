import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const [
      { count: userCount,    error: userErr },
      { count: imageCount,   error: imageErr },
      { count: captionCount, error: captionErr },
      { data: topCaptions,   error: topCaptionErr },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('images').select('*', { count: 'exact', head: true }),
      supabase.from('captions').select('*', { count: 'exact', head: true }),
      supabase
        .from('captions')
        .select(`
          id,
          content,
          like_count,
          image:images ( id, url, image_description )
        `)
        .order('like_count', { ascending: false })
        .limit(3),
    ])

    const err = userErr ?? imageErr ?? captionErr ?? topCaptionErr
    if (err) return NextResponse.json({ error: err.message }, { status: 500 })

    return NextResponse.json({
      users:       userCount    ?? 0,
      images:      imageCount   ?? 0,
      captions:    captionCount ?? 0,
      topCaptions: topCaptions  ?? [],
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
