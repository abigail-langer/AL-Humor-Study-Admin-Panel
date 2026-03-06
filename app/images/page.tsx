'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { Image as ImageRow } from '@/lib/types'

const PAGE_SIZE = 24

type ImageWithProfile = ImageRow & {
  profile?: { id: string; first_name: string | null; last_name: string | null; email: string | null } | null
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// ─── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const [file,     setFile]     = useState<File | null>(null)
  const [preview,  setPreview]  = useState<string | null>(null)
  const [status,   setStatus]   = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [message,  setMessage]  = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setStatus('idle')
    setMessage('')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleUpload = async () => {
    if (!file) return
    setStatus('uploading')
    setMessage('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res  = await fetch('/api/images/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      setStatus('done')
      setMessage(`Uploaded! Image ID: ${json.imageId}`)
      onUploaded()
    } catch (e: unknown) {
      setStatus('error')
      setMessage(e instanceof Error ? e.message : 'Unknown error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Upload Image</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer
                       hover:border-blue-400 hover:bg-blue-50/30 transition"
          >
            {preview ? (
              <img src={preview} alt="Preview" className="max-h-40 mx-auto rounded-lg object-contain" />
            ) : (
              <div className="space-y-2">
                <svg className="w-10 h-10 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4-4a3 3 0 0 1 4.24 0L16 16m-2-2 1.59-1.59A3 3 0 0 1 19.83 12L20 16M14 8h.01M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 0 2-2z" />
                </svg>
                <p className="text-sm text-gray-500">Drop an image here or click to browse</p>
                <p className="text-xs text-gray-400">JPEG, PNG, WebP, GIF, HEIC</p>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
          </div>

          {file && <p className="text-xs text-gray-500">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>}

          {message && (
            <div className={`rounded-lg px-3 py-2 text-sm ${
              status === 'done'  ? 'bg-green-50 text-green-700 border border-green-200' :
              status === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : ''}`}>
              {message}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              {status === 'done' ? 'Close' : 'Cancel'}
            </button>
            {status !== 'done' && (
              <button onClick={handleUpload} disabled={!file || status === 'uploading'}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                {status === 'uploading' ? 'Uploading…' : 'Upload'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({
  image,
  onClose,
  onSaved,
}: {
  image: ImageWithProfile
  onClose: () => void
  onSaved: (updated: ImageWithProfile) => void
}) {
  const [form, setForm] = useState({
    additional_context: image.additional_context ?? '',
    image_description:  image.image_description  ?? '',
    is_common_use:      image.is_common_use       ?? false,
    is_public:          image.is_public           ?? false,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/images/${image.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Save failed')
      onSaved({ ...image, ...json.data })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  const toggle = (key: 'is_common_use' | 'is_public') =>
    setForm(f => ({ ...f, [key]: !f[key] }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Edit Image</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Thumbnail */}
          {image.url && (
            <img src={image.url} alt="" className="w-full max-h-40 object-contain rounded-lg bg-gray-50 border border-gray-100" />
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Additional context</label>
            <textarea
              value={form.additional_context}
              onChange={e => setForm(f => ({ ...f, additional_context: e.target.value }))}
              rows={2}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Image description</label>
            <textarea
              value={form.image_description}
              onChange={e => setForm(f => ({ ...f, image_description: e.target.value }))}
              rows={3}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center gap-6">
            {([
              ['is_common_use', 'Common use'],
              ['is_public',     'Public'],
            ] as [keyof typeof form, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => toggle(key as 'is_common_use' | 'is_public')}
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

// ─── Detail Modal ──────────────────────────────────────────────────────────────
function DetailModal({ imageId, onClose }: { imageId: string; onClose: () => void }) {
  const [data,    setData]    = useState<{ image: ImageWithProfile; captions: { id: string; content: string | null; is_public: boolean; is_featured: boolean; like_count: number; created_datetime_utc: string }[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/images/${imageId}`)
      .then(r => r.json())
      .then(j => { setData(j); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [imageId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Image Detail</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {loading && <p className="text-sm text-gray-500">Loading…</p>}
          {error   && <p className="text-sm text-red-600">{error}</p>}
          {data && (
            <>
              {data.image.url && (
                <img src={data.image.url} alt="" className="w-full max-h-64 object-contain rounded-lg bg-gray-50 border border-gray-100" />
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Uploaded:</span> {formatDate(data.image.created_datetime_utc)}</div>
                <div><span className="text-gray-500">By:</span> {data.image.profile?.email ?? data.image.profile_id ?? '—'}</div>
                <div><span className="text-gray-500">Common use:</span> {data.image.is_common_use ? 'Yes' : 'No'}</div>
                <div><span className="text-gray-500">Public:</span> {data.image.is_public ? 'Yes' : 'No'}</div>
                {data.image.additional_context && (
                  <div className="col-span-2"><span className="text-gray-500">Context:</span> {data.image.additional_context}</div>
                )}
                {data.image.image_description && (
                  <div className="col-span-2"><span className="text-gray-500">Description:</span> {data.image.image_description}</div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Captions ({data.captions.length})
                </h3>
                {data.captions.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No captions yet.</p>
                ) : (
                  <div className="space-y-2">
                    {data.captions.map(cap => (
                      <div key={cap.id} className="bg-gray-50 rounded-lg px-3 py-2.5 flex items-start justify-between gap-3">
                        <p className="text-sm text-gray-700 flex-1">{cap.content ?? '—'}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs text-gray-500">👍 {cap.like_count}</span>
                          {cap.is_featured && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Featured</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({
  image,
  onClose,
  onDeleted,
}: {
  image: ImageWithProfile
  onClose: () => void
  onDeleted: (id: string) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch('/api/images', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: image.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Delete failed')
      onDeleted(image.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Delete image?</h2>
        {image.url && (
          <img src={image.url} alt="" className="w-full h-28 object-cover rounded-lg bg-gray-100" />
        )}
        <p className="text-sm text-gray-600">
          This will permanently delete this image and all its captions. This cannot be undone.
        </p>
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
export default function ImagesPage() {
  const [images,       setImages]       = useState<ImageWithProfile[]>([])
  const [total,        setTotal]        = useState(0)
  const [page,         setPage]         = useState(1)
  const [search,       setSearch]       = useState('')
  const [filter,       setFilter]       = useState<'all' | 'common' | 'public'>('all')
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [showUpload,   setShowUpload]   = useState(false)
  const [editTarget,   setEditTarget]   = useState<ImageWithProfile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ImageWithProfile | null>(null)
  const [detailId,     setDetailId]     = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchImages = useCallback(async (p: number, s: string, f: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(p), limit: String(PAGE_SIZE), filter: f,
        ...(s ? { search: s } : {}),
      })
      const res  = await fetch(`/api/images?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to fetch')
      setImages(json.data)
      setTotal(json.total)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchImages(1, '', 'all') }, [fetchImages])

  const handleSearch = (value: string) => {
    setSearch(value); setPage(1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchImages(1, value, filter), 350)
  }

  const handleFilter = (f: 'all' | 'common' | 'public') => {
    setFilter(f); setPage(1)
    fetchImages(1, search, f)
  }

  const handlePage = (next: number) => { setPage(next); fetchImages(next, search, filter) }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="px-6 py-8 space-y-6 max-w-7xl mx-auto">
      {/* Modals */}
      {showUpload   && <UploadModal   onClose={() => setShowUpload(false)} onUploaded={() => fetchImages(1, search, filter)} />}
      {editTarget   && <EditModal     image={editTarget} onClose={() => setEditTarget(null)} onSaved={img => { setImages(prev => prev.map(i => i.id === img.id ? img : i)); setEditTarget(null) }} />}
      {deleteTarget && <DeleteConfirm image={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={id => { setImages(prev => prev.filter(i => i.id !== id)); setTotal(t => t - 1); setDeleteTarget(null) }} />}
      {detailId     && <DetailModal   imageId={detailId} onClose={() => setDetailId(null)} />}

      {/* Heading row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Images</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Loading…' : `${total.toLocaleString()} image${total !== 1 ? 's' : ''} total`}
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
              placeholder="Search images…"
              className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-white shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
            />
          </div>
          {/* Filter pills */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            {(['all', 'common', 'public'] as const).map(f => (
              <button key={f} onClick={() => handleFilter(f)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition
                  ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {f === 'all' ? 'All' : f === 'common' ? 'Common Use' : 'Public'}
              </button>
            ))}
          </div>
          {/* Upload btn */}
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">⚠️ {error}</div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-2">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4-4a3 3 0 0 1 4.24 0L16 16m-2-2 1.59-1.59A3 3 0 0 1 19.83 12L20 16M14 8h.01" />
          </svg>
          <p className="text-sm">{search ? `No images matching "${search}"` : 'No images found'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {images.map(img => (
            <div key={img.id} className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition">
              {/* Thumbnail */}
              <div
                className="aspect-square bg-gray-50 cursor-pointer"
                onClick={() => setDetailId(img.id)}
              >
                {img.url ? (
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4-4a3 3 0 0 1 4.24 0L16 16m-2-2 1.59-1.59A3 3 0 0 1 19.83 12L20 16M14 8h.01" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Badges */}
              <div className="absolute top-1.5 left-1.5 flex gap-1">
                {img.is_common_use && (
                  <span className="bg-blue-600/80 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                    Common
                  </span>
                )}
                {img.is_public && (
                  <span className="bg-green-600/80 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                    Public
                  </span>
                )}
              </div>

              {/* Action overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-end justify-center pb-2 gap-1.5 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => setEditTarget(img)}
                  className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600/90 hover:bg-blue-700 rounded-lg transition backdrop-blur-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteTarget(img)}
                  className="px-2.5 py-1 text-xs font-medium text-white bg-red-600/90 hover:bg-red-700 rounded-lg transition backdrop-blur-sm"
                >
                  Delete
                </button>
              </div>

              {/* Bottom meta */}
              <div className="px-2 py-1.5 border-t border-gray-100">
                <p className="text-[11px] text-gray-400 truncate" title={img.id}>{formatDate(img.created_datetime_utc)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
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
  )
}
