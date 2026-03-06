'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { Caption } from '@/lib/types'

const PAGE_SIZE = 30

type CaptionWithRelations = Caption & {
  image?:   { id: string; url: string | null } | null
  profile?: { id: string; first_name: string | null; last_name: string | null; email: string | null } | null
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function truncate(s: string | null, n = 80) {
  if (!s) return '—'
  return s.length > n ? s.slice(0, n) + '…' : s
}

// ─── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({
  caption,
  onClose,
  onSaved,
}: {
  caption: CaptionWithRelations
  onClose: () => void
  onSaved: (updated: CaptionWithRelations) => void
}) {
  const [form, setForm] = useState({
    content:     caption.content     ?? '',
    is_public:   caption.is_public,
    is_featured: caption.is_featured,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/captions/${caption.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Save failed')
      onSaved({ ...caption, ...json.data })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Edit Caption</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Image thumbnail */}
          {caption.image?.url && (
            <img src={caption.image.url} alt="" className="w-full max-h-32 object-contain rounded-lg bg-gray-50 border border-gray-100" />
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Caption text</label>
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={4}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Caption text…"
            />
          </div>

          <div className="flex items-center gap-6">
            {([
              ['is_public',   'Public'],
              ['is_featured', 'Featured'],
            ] as [keyof typeof form, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}
                  className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5
                    ${form[key] ? 'bg-blue-500' : 'bg-gray-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform
                    ${form[key] ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
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

// ─── Delete Confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({
  caption,
  onClose,
  onDeleted,
}: {
  caption: CaptionWithRelations
  onClose: () => void
  onDeleted: (id: string) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch('/api/captions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: caption.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Delete failed')
      onDeleted(caption.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Delete caption?</h2>
        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 italic">
          &ldquo;{truncate(caption.content, 100)}&rdquo;
        </p>
        <p className="text-sm text-gray-600">This will permanently delete this caption. This cannot be undone.</p>
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition">
            {deleting ? 'Deleting…' : 'Yes, delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CaptionsPage() {
  const [captions,     setCaptions]     = useState<CaptionWithRelations[]>([])
  const [total,        setTotal]        = useState(0)
  const [page,         setPage]         = useState(1)
  const [search,       setSearch]       = useState('')
  const [sort,         setSort]         = useState<'recent' | 'most_liked' | 'least_liked'>('recent')
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [editTarget,   setEditTarget]   = useState<CaptionWithRelations | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CaptionWithRelations | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchCaptions = useCallback(async (p: number, s: string, so: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(p), limit: String(PAGE_SIZE), sort: so,
        ...(s ? { search: s } : {}),
      })
      const res  = await fetch(`/api/captions?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to fetch')
      setCaptions(json.data)
      setTotal(json.total)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCaptions(1, '', 'recent') }, [fetchCaptions])

  const handleSearch = (value: string) => {
    setSearch(value); setPage(1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchCaptions(1, value, sort), 350)
  }

  const handleSort = (s: 'recent' | 'most_liked' | 'least_liked') => {
    setSort(s); setPage(1)
    fetchCaptions(1, search, s)
  }

  const handlePage = (next: number) => { setPage(next); fetchCaptions(next, search, sort) }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const SORT_OPTIONS: { value: 'recent' | 'most_liked' | 'least_liked'; label: string }[] = [
    { value: 'recent',      label: 'Most Recent' },
    { value: 'most_liked',  label: 'Most Liked'  },
    { value: 'least_liked', label: 'Least Liked' },
  ]

  return (
    <div className="px-6 py-8 space-y-6 max-w-7xl mx-auto">
      {/* Modals */}
      {editTarget   && <EditModal caption={editTarget} onClose={() => setEditTarget(null)} onSaved={c => { setCaptions(prev => prev.map(x => x.id === c.id ? c : x)); setEditTarget(null) }} />}
      {deleteTarget && <DeleteConfirm caption={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={id => { setCaptions(prev => prev.filter(c => c.id !== id)); setTotal(t => t - 1); setDeleteTarget(null) }} />}

      {/* Heading row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Captions</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Loading…' : `${total.toLocaleString()} caption${total !== 1 ? 's' : ''} total`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="search" value={search} onChange={e => handleSearch(e.target.value)}
              placeholder="Search captions…"
              className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-white shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
            />
          </div>
          {/* Sort pills */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            {SORT_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => handleSort(opt.value)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition
                  ${sort === opt.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">⚠️ {error}</div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Image</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Caption</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Author</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Likes</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Flags</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${50 + (i * j * 7) % 45}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : captions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    {search ? `No captions matching "${search}"` : 'No captions found'}
                  </td>
                </tr>
              ) : (
                captions.map(cap => (
                  <tr key={cap.id} className="hover:bg-gray-50 transition-colors">
                    {/* Image thumbnail */}
                    <td className="px-4 py-3">
                      {cap.image?.url ? (
                        <img src={cap.image.url} alt="" className="w-10 h-10 object-cover rounded-lg bg-gray-100" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4-4a3 3 0 0 1 4.24 0L16 16" />
                          </svg>
                        </div>
                      )}
                    </td>
                    {/* Caption text */}
                    <td className="px-4 py-3 max-w-xs">
                      <span className="text-gray-800" title={cap.content ?? ''}>
                        {truncate(cap.content)}
                      </span>
                    </td>
                    {/* Author */}
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {cap.profile?.email
                        ? cap.profile.email
                        : cap.profile?.first_name
                          ? `${cap.profile.first_name} ${cap.profile.last_name ?? ''}`.trim()
                          : <span className="italic text-gray-300">—</span>}
                    </td>
                    {/* Likes */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-700">
                        👍 {cap.like_count}
                      </span>
                    </td>
                    {/* Flags */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {cap.is_public   && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">Public</span>}
                        {cap.is_featured && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-700">Featured</span>}
                        {!cap.is_public && !cap.is_featured && <span className="text-gray-300 text-xs italic">—</span>}
                      </div>
                    </td>
                    {/* Created */}
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(cap.created_datetime_utc)}</td>
                    {/* Actions */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditTarget(cap)}
                          className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition">
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(cap)}
                          className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-4 flex-wrap">
            <span className="text-sm text-gray-500">Page {page} of {totalPages} · {total.toLocaleString()} total</span>
            <div className="flex items-center gap-1">
              <button onClick={() => handlePage(page - 1)} disabled={page <= 1}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .reduce<(number | '…')[]>((acc, n, i, arr) => {
                  if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('…')
                  acc.push(n)
                  return acc
                }, [])
                .map((n, i) => n === '…' ? (
                  <span key={`e${i}`} className="px-2 text-gray-400 text-sm">…</span>
                ) : (
                  <button key={n} onClick={() => handlePage(n as number)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition
                      ${n === page ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-700'}`}>
                    {n}
                  </button>
                ))}
              <button onClick={() => handlePage(page + 1)} disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
