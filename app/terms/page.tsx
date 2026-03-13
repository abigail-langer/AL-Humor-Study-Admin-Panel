'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { Term, TermType } from '@/lib/types'

const PAGE_SIZE = 30

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function truncate(s: string | null, n = 80) {
  if (!s) return '—'
  return s.length > n ? s.slice(0, n) + '…' : s
}

// ─── Create/Edit Modal ─────────────────────────────────────────────────────────
function TermModal({
  term,
  termTypes,
  onClose,
  onSaved,
}: {
  term: Term | null
  termTypes: TermType[]
  onClose: () => void
  onSaved: (t: Term) => void
}) {
  const isEdit = term !== null
  const [form, setForm] = useState({
    term:         term?.term         ?? '',
    definition:   term?.definition   ?? '',
    example:      term?.example      ?? '',
    priority:     term?.priority     ?? 0,
    term_type_id: term?.term_type_id ?? null as number | null,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const url    = isEdit ? `/api/terms/${term!.id}` : '/api/terms'
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

  const field = (label: string, key: keyof typeof form, type: 'input' | 'textarea' = 'input') => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {type === 'textarea' ? (
        <textarea
          value={String(form[key] ?? '')}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          rows={3}
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      ) : (
        <input
          type="text"
          value={String(form[key] ?? '')}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{isEdit ? 'Edit Term' : 'New Term'}</h2>
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
          {field('Term *', 'term')}
          {field('Definition *', 'definition', 'textarea')}
          {field('Example *', 'example', 'textarea')}
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
            {termTypes.length > 0 && (
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Term Type</label>
                <select
                  value={form.term_type_id ?? ''}
                  onChange={e => setForm(f => ({ ...f, term_type_id: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">None</option>
                  {termTypes.map(tt => (
                    <option key={tt.id} value={tt.id}>{tt.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create term'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Delete Confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ term, onClose, onDeleted }: { term: Term; onClose: () => void; onDeleted: (id: number) => void }) {
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/terms/${term.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Delete failed')
      onDeleted(term.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Delete term?</h2>
        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 font-medium">&ldquo;{term.term}&rdquo;</p>
        <p className="text-sm text-gray-600">This will permanently delete this term. This cannot be undone.</p>
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
export default function TermsPage() {
  const [terms,        setTerms]        = useState<Term[]>([])
  const [termTypes,    setTermTypes]    = useState<TermType[]>([])
  const [total,        setTotal]        = useState(0)
  const [page,         setPage]         = useState(1)
  const [search,       setSearch]       = useState('')
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [createOpen,   setCreateOpen]   = useState(false)
  const [editTarget,   setEditTarget]   = useState<Term | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Term | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchTerms = useCallback(async (p: number, s: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE), ...(s ? { search: s } : {}) })
      const res    = await fetch(`/api/terms?${params}`)
      const json   = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to fetch')
      setTerms(json.data)
      setTotal(json.total)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTerms(1, '')
    fetch('/api/term-types').then(r => r.json()).then(j => { if (!j.error) setTermTypes(j.data) })
  }, [fetchTerms])

  const handleSearch = (value: string) => {
    setSearch(value); setPage(1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchTerms(1, value), 350)
  }

  const handlePage = (next: number) => { setPage(next); fetchTerms(next, search) }
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const termTypeName = (id: number | null) => {
    if (!id) return null
    return termTypes.find(t => t.id === id)?.name ?? `#${id}`
  }

  return (
    <div className="px-6 py-8 space-y-6 max-w-7xl mx-auto">
      {createOpen   && <TermModal term={null} termTypes={termTypes} onClose={() => setCreateOpen(false)} onSaved={t => { setTerms(prev => [t, ...prev]); setTotal(n => n + 1); setCreateOpen(false) }} />}
      {editTarget   && <TermModal term={editTarget} termTypes={termTypes} onClose={() => setEditTarget(null)} onSaved={t => { setTerms(prev => prev.map(x => x.id === t.id ? t : x)); setEditTarget(null) }} />}
      {deleteTarget && <DeleteConfirm term={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={id => { setTerms(prev => prev.filter(t => t.id !== id)); setTotal(n => n - 1); setDeleteTarget(null) }} />}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Terms</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Loading…' : `${total.toLocaleString()} term${total !== 1 ? 's' : ''} total`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="search" value={search} onChange={e => handleSearch(e.target.value)}
              placeholder="Search terms…"
              className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
            />
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Term
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Term</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Definition</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Example</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
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
              ) : terms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    {search ? `No terms matching "${search}"` : 'No terms found'}
                  </td>
                </tr>
              ) : (
                terms.map(term => (
                  <tr key={term.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{term.term}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs">{truncate(term.definition)}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs italic">{truncate(term.example)}</td>
                    <td className="px-4 py-3">
                      {termTypeName(term.term_type_id)
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-600">{termTypeName(term.term_type_id)}</span>
                        : <span className="text-gray-300 text-xs italic">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{term.priority}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(term.created_datetime_utc)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditTarget(term)}
                          className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition">Edit</button>
                        <button onClick={() => setDeleteTarget(term)}
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
