import { getSupabaseAdmin } from '@/lib/supabase'

function formatNumber(value: number) {
  return value.toLocaleString('en-US')
}

type CaptionRow = {
  id: string
  content: string | null
  like_count: number | null
  image_id: string
  image: {
    id: string
    url: string | null
    image_description: string | null
  } | null
}

type CaptionLikeRow = {
  like_count: number | null
  image_id: string
  image: {
    id: string
    url: string | null
    image_description: string | null
  } | null
}

type ImageLikes = {
  imageId: string
  url: string | null
  imageDescription: string | null
  totalLikes: number
  captionCount: number
}

function getTopImage(captions: CaptionLikeRow[]): ImageLikes | null {
  if (captions.length === 0) return null

  const byImage = new Map<string, ImageLikes>()

  for (const caption of captions) {
    const likes = caption.like_count ?? 0
    const current = byImage.get(caption.image_id)

    if (current) {
      current.totalLikes += likes
      current.captionCount += 1
      if (!current.url && caption.image?.url) current.url = caption.image.url
      if (!current.imageDescription && caption.image?.image_description) {
        current.imageDescription = caption.image.image_description
      }
      continue
    }

    byImage.set(caption.image_id, {
      imageId: caption.image_id,
      url: caption.image?.url ?? null,
      imageDescription: caption.image?.image_description ?? null,
      totalLikes: likes,
      captionCount: 1,
    })
  }

  return [...byImage.values()].sort((a, b) => {
    if (b.totalLikes !== a.totalLikes) return b.totalLikes - a.totalLikes
    return b.captionCount - a.captionCount
  })[0]
}

export default async function LandingPage() {
  const supabase = getSupabaseAdmin()

  const [imagesResult, captionsCountResult, usersResult, topCaptionResult, captionLikesResult] = await Promise.all([
    supabase.from('images').select('*', { count: 'exact', head: true }),
    supabase.from('captions').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('captions')
      .select(`
        id,
        content,
        like_count,
        image_id,
        image:images ( id, url, image_description )
      `)
      .order('like_count', { ascending: false })
      .order('created_datetime_utc', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('captions')
      .select(`
        like_count,
        image_id,
        image:images ( id, url, image_description )
      `)
      .not('image_id', 'is', null),
  ])

  const errorMessage =
    imagesResult.error?.message ||
    captionsCountResult.error?.message ||
    usersResult.error?.message ||
    topCaptionResult.error?.message ||
    captionLikesResult.error?.message

  const imageCount = imagesResult.count ?? 0
  const captionsCount = captionsCountResult.count ?? 0
  const usersCount = usersResult.count ?? 0

  const topCaption = topCaptionResult.data as CaptionRow | null
  const topImage = getTopImage((captionLikesResult.data as CaptionLikeRow[] | null) ?? [])

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Landing snapshot for study activity and crowd favorites.</p>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load dashboard metrics: {errorMessage}
        </div>
      ) : null}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Images</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{formatNumber(imageCount)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Captions Generated</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{formatNumber(captionsCount)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Users</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{formatNumber(usersCount)}</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Crowd Favorites</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Most Liked Caption</p>
              <p className="text-sm text-gray-500 mt-1">
                {topCaption ? `${formatNumber(topCaption.like_count ?? 0)} likes` : 'No caption data available'}
              </p>
            </div>

            {topCaption?.content ? (
              <blockquote className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700 border border-gray-200">
                &ldquo;{topCaption.content}&rdquo;
              </blockquote>
            ) : (
              <p className="text-sm text-gray-500">No caption content available.</p>
            )}

            {topCaption?.image?.url ? (
              <img
                src={topCaption.image.url}
                alt="Most liked caption image"
                className="w-full max-h-56 object-contain rounded-xl border border-gray-200 bg-gray-50"
              />
            ) : null}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Most Liked Image</p>
              <p className="text-sm text-gray-500 mt-1">
                {topImage
                  ? `${formatNumber(topImage.totalLikes)} total likes across ${formatNumber(topImage.captionCount)} captions`
                  : 'No image-like data available'}
              </p>
            </div>

            {topImage?.url ? (
              <img
                src={topImage.url}
                alt="Most liked image"
                className="w-full max-h-56 object-contain rounded-xl border border-gray-200 bg-gray-50"
              />
            ) : (
              <p className="text-sm text-gray-500">No image available.</p>
            )}

            {topImage?.imageDescription ? (
              <p className="text-sm text-gray-600">{topImage.imageDescription}</p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}
