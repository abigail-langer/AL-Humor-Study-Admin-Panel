'use client'

import { useEffect, useState } from 'react'
import type { HumorFlavorMix } from '@/lib/types'

type MixWithFlavor = HumorFlavorMix & {
  humor_flavor?: { id: number; slug: string; description: string | null } | null
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function EditModal({
  item,
  onClose,
  onSaved,
}: {
  item: MixWithFlavor
  onClose: () => void
  onSaved: (updated: MixWithFlavor) => void
}) {
  const [captionCount, setCaptionCount] = useState(item.caption_count)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/humor-flavor-mix', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, caption_count: captionCount }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Save failed')
      onSaved(json.data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Edit Mix Entry</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Humor Flavor</label>
            <p className="text-sm font-mono text-gray-700">{item.humor_flavor?.slug ?? `#${item.humor_flavor_id}`}</p>
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Caption Count</label>
            <input
              type="number"
              value={captionCount}
              onChange={e => setCaptionCount(Number(e.target.value))}
              min={0}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function HumorFlavorMixPage() {
  const [items,      setItems]      = useState<MixWithFlavor[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<MixWithFlavor | null>(null)

  useEffect(() => {
    fetch('/api/humor-flavor-mix')
      .then(r => r.json())
      .then(j => {
        if (j.error) throw new Error(j.error)
        setItems(j.data)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const totalCaptions = items.reduce((acc, i) => acc + i.caption_count, 0)

  return (
    <div className="px-6 py-8 space-y-6 max-w-4xl mx-auto">
      {editTarget && (
        <EditModal
          item={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={updated => {
            setItems(prev => prev.map(x => x.id === updated.id ? updated : x))
            setEditTarget(null)
          }}
        />
      )}

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Humor Flavor Mix</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Loading…' : `${items.length} flavor${items.length !== 1 ? 's' : ''} · ${totalCaptions} total captions`}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">⚠️ {error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Humor Flavor</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Caption Count</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">No mix entries found</td>
              </tr>
            ) : (
              items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{item.id}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-700 font-mono">
                      {item.humor_flavor?.slug ?? `#${item.humor_flavor_id}`}
                    </span>
                    {item.humor_flavor?.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{item.humor_flavor.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-2xl font-bold text-gray-800">{item.caption_count}</span>
                    <span className="text-xs text-gray-400 ml-1">captions</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(item.created_datetime_utc)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setEditTarget(item)}
                      className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition">
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
