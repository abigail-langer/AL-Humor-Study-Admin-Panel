'use client'

import { useEffect, useState, useRef } from 'react'
import type { WhitelistEmailAddress } from '@/lib/types'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function EditModal({ item, onClose, onSaved }: { item: WhitelistEmailAddress; onClose: () => void; onSaved: (updated: WhitelistEmailAddress) => void }) {
  const [email,  setEmail]  = useState(item.email_address)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res  = await fetch(`/api/whitelist-emails/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_address: email }),
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
          <h2 className="text-base font-semibold text-gray-900">Edit Email</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2">
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

function DeleteConfirm({ item, onClose, onDeleted }: { item: WhitelistEmailAddress; onClose: () => void; onDeleted: (id: number) => void }) {
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res  = await fetch(`/api/whitelist-emails/${item.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Delete failed')
      onDeleted(item.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Remove email?</h2>
        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 font-mono">{item.email_address}</p>
        <p className="text-sm text-gray-600">This user will no longer be whitelisted.</p>
        {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition">
            {deleting ? 'Removing…' : 'Yes, remove'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function WhitelistEmailsPage() {
  const [items,        setItems]        = useState<WhitelistEmailAddress[]>([])
  const [filtered,     setFiltered]     = useState<WhitelistEmailAddress[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [search,       setSearch]       = useState('')
  const [newEmail,     setNewEmail]     = useState('')
  const [adding,       setAdding]       = useState(false)
  const [addError,     setAddError]     = useState<string | null>(null)
  const [editTarget,   setEditTarget]   = useState<WhitelistEmailAddress | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WhitelistEmailAddress | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/whitelist-emails')
      .then(r => r.json())
      .then(j => {
        if (j.error) throw new Error(j.error)
        setItems(j.data)
        setFiltered(j.data)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSearch = (value: string) => {
    setSearch(value)
    setFiltered(items.filter(i => i.email_address.toLowerCase().includes(value.toLowerCase())))
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail.trim()) return
    setAdding(true)
    setAddError(null)
    try {
      const res  = await fetch('/api/whitelist-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_address: newEmail.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to add')
      const next = [...items, json.data].sort((a, b) => a.email_address.localeCompare(b.email_address))
      setItems(next)
      setFiltered(search ? next.filter(i => i.email_address.toLowerCase().includes(search.toLowerCase())) : next)
      setNewEmail('')
      inputRef.current?.focus()
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setAdding(false)
    }
  }

  const handleSaved = (updated: WhitelistEmailAddress) => {
    const next = items.map(i => i.id === updated.id ? updated : i).sort((a, b) => a.email_address.localeCompare(b.email_address))
    setItems(next)
    setFiltered(search ? next.filter(i => i.email_address.toLowerCase().includes(search.toLowerCase())) : next)
    setEditTarget(null)
  }

  const handleDeleted = (id: number) => {
    const next = items.filter(i => i.id !== id)
    setItems(next)
    setFiltered(search ? next.filter(i => i.email_address.toLowerCase().includes(search.toLowerCase())) : next)
    setDeleteTarget(null)
  }

  return (
    <div className="px-6 py-8 space-y-6 max-w-3xl mx-auto">
      {editTarget   && <EditModal item={editTarget} onClose={() => setEditTarget(null)} onSaved={handleSaved} />}
      {deleteTarget && <DeleteConfirm item={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={handleDeleted} />}

      <div>
        <h2 className="text-2xl font-bold text-gray-900">Whitelisted Emails</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {loading ? 'Loading…' : `${items.length} address${items.length !== 1 ? 'es' : ''} whitelisted`}
        </p>
      </div>

      {/* Add form */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Email</h3>
        <form onSubmit={handleAdd} className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            placeholder="user@example.com"
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={adding || !newEmail.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition whitespace-nowrap">
            {adding ? 'Adding…' : 'Add Email'}
          </button>
        </form>
        {addError && (
          <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{addError}</div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">⚠️ {error}</div>
      )}

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="search" value={search} onChange={e => handleSearch(e.target.value)}
          placeholder="Search emails…"
          className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-white shadow-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email Address</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Added</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Modified</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                  {search ? `No emails matching "${search}"` : 'No whitelisted emails'}
                </td>
              </tr>
            ) : (
              filtered.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{item.email_address}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(item.created_datetime_utc)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(item.modified_datetime_utc)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditTarget(item)}
                        className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition">Edit</button>
                      <button onClick={() => setDeleteTarget(item)}
                        className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition">Remove</button>
                    </div>
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
