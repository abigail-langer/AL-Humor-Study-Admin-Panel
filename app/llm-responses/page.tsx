'use client'

import { useEffect, useState, useCallback } from 'react'
import type { LlmModelResponse, LlmModel, HumorFlavor } from '@/lib/types'

const PAGE_SIZE = 30

type ResponseWithRelations = LlmModelResponse & {
  profile?:     { id: string; first_name: string | null; last_name: string | null; email: string | null } | null
  llm_model?:   { id: number; name: string; provider_model_id: string } | null
  humor_flavor?: { id: number; slug: string } | null
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function ResponseDetailModal({ response, onClose }: { response: ResponseWithRelations; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Response Detail</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto text-sm">
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              ['Model',         response.llm_model?.name ?? `#${response.llm_model_id}`],
              ['Humor Flavor',  response.humor_flavor?.slug ?? `#${response.humor_flavor_id}`],
              ['Processing',    `${response.processing_time_seconds}s`],
              ['Temperature',   response.llm_temperature !== null ? String(response.llm_temperature) : '—'],
              ['User',          response.profile?.email ?? '—'],
              ['Created',       formatDate(response.created_datetime_utc)],
            ].map(([label, value]) => (
              <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-gray-400 font-medium uppercase tracking-wider text-[10px]">{label}</p>
                <p className="text-gray-800 mt-0.5 font-mono">{value}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">System Prompt</p>
            <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">{response.llm_system_prompt}</pre>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">User Prompt</p>
            <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">{response.llm_user_prompt}</pre>
          </div>
          {response.llm_model_response && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Response</p>
              <pre className="text-xs text-gray-700 bg-blue-50 rounded-lg p-3 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">{response.llm_model_response}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LlmResponsesPage() {
  const [items,           setItems]           = useState<ResponseWithRelations[]>([])
  const [total,           setTotal]           = useState(0)
  const [page,            setPage]            = useState(1)
  const [loading,         setLoading]         = useState(true)
  const [error,           setError]           = useState<string | null>(null)
  const [models,          setModels]          = useState<LlmModel[]>([])
  const [flavors,         setFlavors]         = useState<HumorFlavor[]>([])
  const [filterModel,     setFilterModel]     = useState('')
  const [filterFlavor,    setFilterFlavor]    = useState('')
  const [detailTarget,    setDetailTarget]    = useState<ResponseWithRelations | null>(null)

  const fetchItems = useCallback(async (p: number, modelId: string, flavorId: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) })
      if (modelId)  params.set('llm_model_id',    modelId)
      if (flavorId) params.set('humor_flavor_id', flavorId)
      const res    = await fetch(`/api/llm-responses?${params}`)
      const json   = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to fetch')
      setItems(json.data)
      setTotal(json.total)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems(1, '', '')
    Promise.all([
      fetch('/api/llm-models').then(r => r.json()),
      fetch('/api/humor-flavors').then(r => r.json()),
    ]).then(([m, f]) => {
      if (!m.error) setModels(m.data)
      if (!f.error) setFlavors(f.data)
    })
  }, [fetchItems])

  const handleFilter = (model: string, flavor: string) => {
    setPage(1)
    fetchItems(1, model, flavor)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="px-6 py-8 space-y-6 max-w-7xl mx-auto">
      {detailTarget && <ResponseDetailModal response={detailTarget} onClose={() => setDetailTarget(null)} />}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">LLM Responses</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Loading…' : `${total.toLocaleString()} response${total !== 1 ? 's' : ''} total`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={filterModel}
            onChange={e => { setFilterModel(e.target.value); handleFilter(e.target.value, filterFlavor) }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Models</option>
            {models.map(m => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
          </select>
          <select
            value={filterFlavor}
            onChange={e => { setFilterFlavor(e.target.value); handleFilter(filterModel, e.target.value) }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Flavors</option>
            {flavors.map(f => <option key={f.id} value={String(f.id)}>{f.slug}</option>)}
          </select>
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Model</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Flavor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Processing</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Temp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Response</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">No responses found</td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-100 text-purple-700">
                        {item.llm_model?.name ?? `#${item.llm_model_id}`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-700 font-mono">
                        {item.humor_flavor?.slug ?? `#${item.humor_flavor_id}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {item.profile?.email ?? <span className="italic text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                      {item.processing_time_seconds}s
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                      {item.llm_temperature !== null ? item.llm_temperature : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs text-xs">
                      {item.llm_model_response
                        ? item.llm_model_response.length > 60
                          ? item.llm_model_response.slice(0, 60) + '…'
                          : item.llm_model_response
                        : <span className="italic text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(item.created_datetime_utc)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDetailTarget(item)}
                        className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition">
                        View
                      </button>
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
              <button onClick={() => { setPage(p => p - 1); fetchItems(page - 1, filterModel, filterFlavor) }} disabled={page <= 1}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                ← Prev
              </button>
              <button onClick={() => { setPage(p => p + 1); fetchItems(page + 1, filterModel, filterFlavor) }} disabled={page >= totalPages}
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
