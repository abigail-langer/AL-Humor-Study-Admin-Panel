'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { CaptionExample } from '@/lib/types'

const PAGE_SIZE = 30

type CaptionExampleWithImage = CaptionExample & {
  image?: { id: string; url: string | null } | null
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function truncate(s: string | null, n = 70) {
  if (!s) return '—'
  return s.length > n ? s.slice(0, n) + '…' : s
}

// ─── Modal ─────────────────────────────────────────────────────────────────────
function ExampleModal({
  example,
  onClose,
  onSaved,
}: {
  example: CaptionExampleWithImage | null
  onClose: () => void
  onSaved: (e: CaptionExampleWithImage) => void
}) {
  const isEdit = example !== null
  const [form, setForm] = useState({
    image_description: example?.image_description ?? '',
    caption:           example?.caption           ?? '',
    explanation:       example?.explanation       ?? '',
    priority:          example?.priority          ?? 0,
    image_id:          example?.image_id          ?? null as string | null,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const url    = isEdit ? `/api/caption-examples/${example!.id}` : '/api/caption-examples'
      const method = isEdit ? 'PATCH' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{isEdit ? 'Edit Caption Example' : 'New Caption Example'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          {([
            ['Image Description *', 'image_description'],
            ['Caption *',           'caption'],
            ['Explanation *',       'explanation'],
          ] as [string, keyof typeof form][]).map(([label, key]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <textarea
                value={String(form[key] ?? '')}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                rows={3}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          ))}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
              <input
                type="number"
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Image ID (optional)</label>
              <input
                type="text"
                value={form.image_id ?? ''}
                onChange={e => setForm(f => ({ ...f, image_id: e.target.value || null }))}
                placeholder="UUID"
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create example'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Delete Confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ example, onClose, onDeleted }: { example: CaptionExampleWithImage; onClose: () => void; onDeleted: (id: number) => void }) {
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/caption-examples/${example.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Delete failed')
      onDeleted(example.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Delete caption example?</h2>
        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 italic">&ldquo;{truncate(example.caption, 100)}&rdquo;</p>
        <p className="text-sm text-gray-600">This cannot be undone.</p>
        {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
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
export default function CaptionExamplesPage() {
  const [examples,     setExamples]     = useState<CaptionExampleWithImage[]>([])
  const [total,        setTotal]        = useState(0)
  const [page,         setPage]         = useState(1)
  const [search,       setSearch]       = useState('')
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [createOpen,   setCreateOpen]   = useState(false)
  const [editTarget,   setEditTarget]   = useState<CaptionExampleWithImage | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CaptionExampleWithImage | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchExamples = useCallback(async (p: number, s: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE), ...(s ? { search: s } : {}) })
      const res    = await fetch(`/api/caption-examples?${params}`)
      const json   = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to fetch')
      setExamples(json.data)
      setTotal(json.total)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchExamples(1, '') }, [fetchExamples])

  const handleSearch = (value: string) => {
    setSearch(value); setPage(1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchExamples(1, value), 350)
  }

  const handlePage = (next: number) => { setPage(next); fetchExamples(next, search) }
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="px-6 py-8 space-y-6 max-w-7xl mx-auto">
      {createOpen   && <ExampleModal example={null} onClose={() => setCreateOpen(false)} onSaved={e => { setExamples(prev => [e, ...prev]); setTotal(n => n + 1); setCreateOpen(false) }} />}
      {editTarget   && <ExampleModal example={editTarget} onClose={() => setEditTarget(null)} onSaved={e => { setExamples(prev => prev.map(x => x.id === e.id ? e : x)); setEditTarget(null) }} />}
      {deleteTarget && <DeleteConfirm example={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={id => { setExamples(prev => prev.filter(e => e.id !== id)); setTotal(n => n - 1); setDeleteTarget(null) }} />}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Caption Examples</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Loading…' : `${total.toLocaleString()} example${total !== 1 ? 's' : ''} total`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="search" value={search} onChange={e => handleSearch(e.target.value)}
              placeholder="Search examples…"
              className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
            />
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Example
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">⚠️ {error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Image</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Caption</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Explanation</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
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
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : examples.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    {search ? `No examples matching "${search}"` : 'No caption examples found'}
                  </td>
                </tr>
              ) : (
                examples.map(ex => (
                  <tr key={ex.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      {ex.image?.url ? (
                        <img src={ex.image.url} alt="" className="w-12 h-12 object-cover rounded-lg bg-gray-100" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4-4a3 3 0 0 1 4.24 0L16 16" />
                          </svg>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs">{truncate(ex.image_description)}</td>
                    <td className="px-4 py-3 text-gray-800 max-w-xs font-medium">{truncate(ex.caption)}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs">{truncate(ex.explanation)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{ex.priority}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(ex.created_datetime_utc)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditTarget(ex)}
                          className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition">Edit</button>
                        <button onClick={() => setDeleteTarget(ex)}
                          className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-4 flex-wrap">
            <span className="text-sm text-gray-500">Page {page} of {totalPages} · {total.toLocaleString()} total</span>
            <div className="flex items-center gap-1">
              <button onClick={() => handlePage(page - 1)} disabled={page <= 1}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                ← Prev
              </button>
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
