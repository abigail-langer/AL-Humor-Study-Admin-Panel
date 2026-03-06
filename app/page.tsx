'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { Profile } from '@/lib/types'

const PAGE_SIZE = 20

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function Badge({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
      ${on
        ? 'bg-green-100 text-green-800 ring-1 ring-green-200'
        : 'bg-gray-100 text-gray-400 ring-1 ring-gray-200'}`}>
      {label}
    </span>
  )
}

export default function UsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchProfiles = useCallback(async (p: number, s: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page:  String(p),
        limit: String(PAGE_SIZE),
        ...(s ? { search: s } : {}),
      })
      const res  = await fetch(`/api/users?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to fetch')
      setProfiles(json.data)
      setTotal(json.total)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => { fetchProfiles(1, '') }, [fetchProfiles])

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchProfiles(1, value), 350)
  }

  const handlePage = (next: number) => {
    setPage(next)
    fetchProfiles(next, search)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <h1 className="text-lg font-bold text-gray-900 mr-auto">
          AlmostCrackd <span className="text-gray-400 font-normal">/ Admin</span>
        </h1>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Page heading */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Users</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading ? 'Loading…' : `${total.toLocaleString()} profile${total !== 1 ? 's' : ''} total`}
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search name or email…"
              className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-white shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            ⚠️ {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Roles</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">In Study</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  // Skeleton rows
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + (i * j * 7) % 40}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : profiles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                      {search ? `No profiles matching "${search}"` : 'No profiles found'}
                    </td>
                  </tr>
                ) : (
                  profiles.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      {/* Name */}
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                        {p.first_name || p.last_name
                          ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()
                          : <span className="text-gray-400 italic">—</span>}
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3 text-gray-600">
                        {p.email ?? <span className="text-gray-400 italic">—</span>}
                      </td>

                      {/* Roles */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {p.is_superadmin   && <Badge on label="Superadmin" />}
                          {p.is_matrix_admin && <Badge on label="Matrix Admin" />}
                          {!p.is_superadmin && !p.is_matrix_admin && (
                            <span className="text-gray-400 text-xs italic">User</span>
                          )}
                        </div>
                      </td>

                      {/* In Study */}
                      <td className="px-4 py-3">
                        <Badge on={p.is_in_study} label={p.is_in_study ? 'Yes' : 'No'} />
                      </td>

                      {/* Joined */}
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {formatDate(p.created_datetime_utc)}
                      </td>

                      {/* ID */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-400" title={p.id}>
                          {p.id.slice(0, 8)}…
                        </span>
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
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages} · {total.toLocaleString()} total
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePage(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white
                             hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  ← Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | '…')[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, i) => p === '…' ? (
                    <span key={`e${i}`} className="px-2 text-gray-400 text-sm">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => handlePage(p as number)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition
                        ${p === page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-700'}`}
                    >
                      {p}
                    </button>
                  ))}
                <button
                  onClick={() => handlePage(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white
                             hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
