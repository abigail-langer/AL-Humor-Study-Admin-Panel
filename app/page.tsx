'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface TopCaption {
  id: string
  content: string | null
  like_count: number
  image: {
    id: string
    url: string | null
    image_description: string | null
  } | null
}

interface Stats {
  users: number
  images: number
  captions: number
  topCaptions: TopCaption[]
}

function StatCard({
  label,
  value,
  icon,
  loading,
}: {
  label: string
  value: number
  icon: React.ReactNode
  loading: boolean
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-5 flex items-center gap-5">
      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        {loading ? (
          <div className="h-8 w-20 bg-gray-100 rounded-lg animate-pulse mb-1" />
        ) : (
          <p className="text-3xl font-bold text-gray-900 tabular-nums">
            {value.toLocaleString()}
          </p>
        )}
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(json => {
        if (json.error) throw new Error(json.error)
        setStats(json)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="px-6 py-8 space-y-8 max-w-5xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">A snapshot of the AlmostCrackd humor study.</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Users"
          value={stats?.users ?? 0}
          loading={loading}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M17 20h5v-2a4 4 0 0 0-4-4h-1M9 20H4v-2a4 4 0 0 1 4-4h1m4-4a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm16 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
            </svg>
          }
        />
        <StatCard
          label="Total Images"
          value={stats?.images ?? 0}
          loading={loading}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M4 16l4-4a3 3 0 0 1 4.24 0L16 16m-2-2 1.59-1.59A3 3 0 0 1 19.83 12L20 12v4M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
            </svg>
          }
        />
        <StatCard
          label="Total Captions"
          value={stats?.captions ?? 0}
          loading={loading}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M8 10h8M8 14h5m-9 4h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" />
            </svg>
          }
        />
      </div>

      {/* Crowd Favorites */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Crowd Favorites
          <span className="ml-2 text-sm font-normal text-gray-400">Top captions by likes</span>
        </h2>

        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex gap-5 animate-pulse">
                <div className="w-8 shrink-0" />
                <div className="w-40 h-28 bg-gray-100 rounded-xl shrink-0" />
                <div className="flex-1 space-y-3 py-1">
                  <div className="h-4 bg-gray-100 rounded w-1/4" />
                  <div className="h-5 bg-gray-100 rounded w-3/4" />
                  <div className="h-5 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : !stats?.topCaptions?.length ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-12 text-center text-gray-400">
            No captions yet.
          </div>
        ) : (
          <div className="space-y-4">
            {stats.topCaptions.map((caption, rank) => (
              <div
                key={caption.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex gap-5 items-start"
              >
                {/* Rank badge */}
                <div className="shrink-0 w-8 pt-1 text-center">
                  <span className={`text-lg font-bold tabular-nums
                    ${rank === 0 ? 'text-yellow-500' : rank === 1 ? 'text-gray-400' : 'text-amber-600'}`}>
                    #{rank + 1}
                  </span>
                </div>

                {/* Image thumbnail */}
                <div className="shrink-0 w-40 h-28 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                  {caption.image?.url ? (
                    <Image
                      src={caption.image.url}
                      alt={caption.image.image_description ?? 'Study image'}
                      width={160}
                      height={112}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M4 16l4-4a3 3 0 0 1 4.24 0L16 16m-2-2 1.59-1.59A3 3 0 0 1 19.83 12L20 12v4M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Caption content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-700 tabular-nums">
                      {caption.like_count.toLocaleString()} {caption.like_count === 1 ? 'like' : 'likes'}
                    </span>
                  </div>
                  <p className="text-gray-900 text-base leading-relaxed">
                    {caption.content ?? <span className="italic text-gray-400">No content</span>}
                  </p>
                  {caption.image?.image_description && (
                    <p className="mt-2 text-xs text-gray-400 truncate" title={caption.image.image_description}>
                      Image: {caption.image.image_description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
