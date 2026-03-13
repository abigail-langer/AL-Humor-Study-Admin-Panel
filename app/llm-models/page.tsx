'use client'

import { useEffect, useState } from 'react'
import type { LlmModel, LlmProvider } from '@/lib/types'

type LlmModelWithProvider = LlmModel & {
  provider?: { id: number; name: string } | null
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function ModelModal({
  model,
  providers,
  onClose,
  onSaved,
}: {
  model: LlmModelWithProvider | null
  providers: LlmProvider[]
  onClose: () => void
  onSaved: (m: LlmModelWithProvider) => void
}) {
  const isEdit = model !== null
  const [form, setForm] = useState({
    name:                     model?.name                     ?? '',
    llm_provider_id:          model?.llm_provider_id          ?? (providers[0]?.id ?? 0),
    provider_model_id:        model?.provider_model_id        ?? '',
    is_temperature_supported: model?.is_temperature_supported ?? false,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const url    = isEdit ? `/api/llm-models/${model!.id}` : '/api/llm-models'
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{isEdit ? 'Edit Model' : 'New Model'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Display Name *</label>
            <input
              type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
              placeholder="e.g. GPT-4o, Claude 3 Opus…"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Provider *</label>
            <select
              value={form.llm_provider_id}
              onChange={e => setForm(f => ({ ...f, llm_provider_id: Number(e.target.value) }))}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Provider Model ID *</label>
            <input
              type="text" value={form.provider_model_id}
              onChange={e => setForm(f => ({ ...f, provider_model_id: e.target.value }))} required
              placeholder="e.g. gpt-4o, claude-opus-4-6…"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setForm(f => ({ ...f, is_temperature_supported: !f.is_temperature_supported }))}
              className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5
                ${form.is_temperature_supported ? 'bg-blue-500' : 'bg-gray-300'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform
                ${form.is_temperature_supported ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <span className="text-sm text-gray-700">Temperature Supported</span>
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create model'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteConfirm({ model, onClose, onDeleted }: { model: LlmModelWithProvider; onClose: () => void; onDeleted: (id: number) => void }) {
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res  = await fetch(`/api/llm-models/${model.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Delete failed')
      onDeleted(model.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Delete model?</h2>
        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 font-medium">{model.name}</p>
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

export default function LlmModelsPage() {
  const [models,       setModels]       = useState<LlmModelWithProvider[]>([])
  const [providers,    setProviders]    = useState<LlmProvider[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [createOpen,   setCreateOpen]   = useState(false)
  const [editTarget,   setEditTarget]   = useState<LlmModelWithProvider | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LlmModelWithProvider | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/llm-models').then(r => r.json()),
      fetch('/api/llm-providers').then(r => r.json()),
    ]).then(([models, providers]) => {
      if (models.error) throw new Error(models.error)
      setModels(models.data)
      if (!providers.error) setProviders(providers.data)
    }).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [])

  return (
    <div className="px-6 py-8 space-y-6 max-w-5xl mx-auto">
      {createOpen   && <ModelModal model={null} providers={providers} onClose={() => setCreateOpen(false)} onSaved={m => { setModels(prev => [...prev, m]); setCreateOpen(false) }} />}
      {editTarget   && <ModelModal model={editTarget} providers={providers} onClose={() => setEditTarget(null)} onSaved={m => { setModels(prev => prev.map(x => x.id === m.id ? m : x)); setEditTarget(null) }} />}
      {deleteTarget && <DeleteConfirm model={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={id => { setModels(prev => prev.filter(m => m.id !== id)); setDeleteTarget(null) }} />}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">LLM Models</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Loading…' : `${models.length} model${models.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          disabled={providers.length === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50"
          title={providers.length === 0 ? 'Add a provider first' : undefined}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Model
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">⚠️ {error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Provider</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Model ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Temp</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : models.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">No LLM models found</td>
              </tr>
            ) : (
              models.map(m => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{m.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{m.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-100 text-purple-700">
                      {m.provider?.name ?? `#${m.llm_provider_id}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{m.provider_model_id}</td>
                  <td className="px-4 py-3">
                    {m.is_temperature_supported
                      ? <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-green-100 text-green-700">Yes</span>
                      : <span className="text-gray-300 text-xs italic">No</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(m.created_datetime_utc)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditTarget(m)}
                        className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition">Edit</button>
                      <button onClick={() => setDeleteTarget(m)}
                        className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition">Delete</button>
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
