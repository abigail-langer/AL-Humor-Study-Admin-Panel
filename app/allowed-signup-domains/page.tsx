'use client'

import { useEffect, useState, useRef } from 'react'
import type { AllowedSignupDomain } from '@/lib/types'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function DeleteConfirm({ domain, onClose, onDeleted }: { domain: AllowedSignupDomain; onClose: () => void; onDeleted: (id: number) => void }) {
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res  = await fetch(`/api/allowed-signup-domains/${domain.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Delete failed')
      onDeleted(domain.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Remove domain?</h2>
        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 font-mono font-medium">{domain.apex_domain}</p>
        <p className="text-sm text-gray-600">Users with this domain will no longer be able to sign up.</p>
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

export default function AllowedSignupDomainsPage() {
  const [domains,      setDomains]      = useState<AllowedSignupDomain[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AllowedSignupDomain | null>(null)
  const [newDomain,    setNewDomain]    = useState('')
  const [adding,       setAdding]       = useState(false)
  const [addError,     setAddError]     = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/allowed-signup-domains')
      .then(r => r.json())
      .then(j => { if (j.error) throw new Error(j.error); setDomains(j.data) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDomain.trim()) return
    setAdding(true)
    setAddError(null)
    try {
      const res  = await fetch('/api/allowed-signup-domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apex_domain: newDomain.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to add')
      setDomains(prev => [...prev, json.data].sort((a, b) => a.apex_domain.localeCompare(b.apex_domain)))
      setNewDomain('')
      inputRef.current?.focus()
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="px-6 py-8 space-y-6 max-w-3xl mx-auto">
      {deleteTarget && (
        <DeleteConfirm
          domain={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={id => { setDomains(prev => prev.filter(d => d.id !== id)); setDeleteTarget(null) }}
        />
      )}

      <div>
        <h2 className="text-2xl font-bold text-gray-900">Allowed Signup Domains</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {loading ? 'Loading…' : `${domains.length} domain${domains.length !== 1 ? 's' : ''} allowed`}
        </p>
      </div>

      {/* Add form */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Domain</h3>
        <form onSubmit={handleAdd} className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={newDomain}
            onChange={e => setNewDomain(e.target.value)}
            placeholder="example.com"
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={adding || !newDomain.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition whitespace-nowrap">
            {adding ? 'Adding…' : 'Add Domain'}
          </button>
        </form>
        {addError && (
          <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{addError}</div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">⚠️ {error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Domain</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Added</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 3 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : domains.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-gray-400">No domains configured</td>
              </tr>
            ) : (
              domains.map(d => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-gray-800">{d.apex_domain}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(d.created_datetime_utc)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setDeleteTarget(d)}
                      className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition">
                      Remove
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
