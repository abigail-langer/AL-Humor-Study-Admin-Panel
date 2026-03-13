'use client'

import { useEffect, useState } from 'react'
import type { HumorFlavor, HumorFlavorStep } from '@/lib/types'

type StepWithRelations = HumorFlavorStep & {
  humor_flavor_step_type?: { id: number; slug: string; description: string } | null
  llm_input_type?: { id: number; slug: string; description: string } | null
  llm_output_type?: { id: number; slug: string; description: string } | null
  llm_model?: { id: number; name: string; provider_model_id: string } | null
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function Badge({ text, color = 'gray' }: { text: string; color?: 'gray' | 'blue' | 'purple' | 'green' }) {
  const colors = {
    gray:   'bg-gray-100 text-gray-600',
    blue:   'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    green:  'bg-green-100 text-green-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${colors[color]}`}>
      {text}
    </span>
  )
}

function StepsPanel({ flavorId, steps, loading }: { flavorId: number; steps: StepWithRelations[]; loading: boolean }) {
  const flavorSteps = steps.filter(s => s.humor_flavor_id === flavorId)

  if (loading) {
    return (
      <div className="px-8 py-4 bg-blue-50/40 border-t border-blue-100">
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-8 bg-blue-100/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (flavorSteps.length === 0) {
    return (
      <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-sm text-gray-400 italic">
        No steps configured for this flavor.
      </div>
    )
  }

  return (
    <div className="border-t border-blue-100 bg-blue-50/30">
      <div className="px-6 py-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left">
              <th className="px-2 py-1 text-gray-400 font-semibold uppercase tracking-wider w-12">#</th>
              <th className="px-2 py-1 text-gray-400 font-semibold uppercase tracking-wider">Step Type</th>
              <th className="px-2 py-1 text-gray-400 font-semibold uppercase tracking-wider">Model</th>
              <th className="px-2 py-1 text-gray-400 font-semibold uppercase tracking-wider">Input → Output</th>
              <th className="px-2 py-1 text-gray-400 font-semibold uppercase tracking-wider">Temp</th>
              <th className="px-2 py-1 text-gray-400 font-semibold uppercase tracking-wider">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-100">
            {flavorSteps.map(step => (
              <tr key={step.id} className="hover:bg-blue-50 transition-colors">
                <td className="px-2 py-2 font-mono text-gray-500">{step.order_by}</td>
                <td className="px-2 py-2">
                  <Badge text={step.humor_flavor_step_type?.slug ?? String(step.humor_flavor_step_type_id)} color="purple" />
                </td>
                <td className="px-2 py-2 font-mono text-gray-700">
                  {step.llm_model?.name ?? `#${step.llm_model_id}`}
                </td>
                <td className="px-2 py-2 text-gray-600">
                  <span className="font-mono">{step.llm_input_type?.slug ?? step.llm_input_type_id}</span>
                  <span className="mx-1 text-gray-400">→</span>
                  <span className="font-mono">{step.llm_output_type?.slug ?? step.llm_output_type_id}</span>
                </td>
                <td className="px-2 py-2 font-mono text-gray-500">
                  {step.llm_temperature !== null ? step.llm_temperature : <span className="text-gray-300 italic">—</span>}
                </td>
                <td className="px-2 py-2 text-gray-600 max-w-xs truncate">
                  {step.description ?? <span className="text-gray-300 italic">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function HumorFlavorsPage() {
  const [flavors,      setFlavors]      = useState<HumorFlavor[]>([])
  const [steps,        setSteps]        = useState<StepWithRelations[]>([])
  const [expanded,     setExpanded]     = useState<Set<number>>(new Set())
  const [loadingFlavors, setLoadingFlavors] = useState(true)
  const [loadingSteps,   setLoadingSteps]   = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  useEffect(() => {
    setLoadingFlavors(true)
    fetch('/api/humor-flavors')
      .then(r => r.json())
      .then(j => {
        if (j.error) throw new Error(j.error)
        setFlavors(j.data)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoadingFlavors(false))
  }, [])

  const handleExpand = async (id: number) => {
    const next = new Set(expanded)
    if (next.has(id)) {
      next.delete(id)
      setExpanded(next)
      return
    }
    next.add(id)
    setExpanded(next)

    // Load steps if not yet loaded
    if (!steps.some(s => s.humor_flavor_id === id)) {
      setLoadingSteps(true)
      try {
        const res  = await fetch(`/api/humor-flavor-steps?humor_flavor_id=${id}`)
        const json = await res.json()
        if (json.error) throw new Error(json.error)
        setSteps(prev => [...prev, ...json.data])
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoadingSteps(false)
      }
    }
  }

  return (
    <div className="px-6 py-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Humor Flavors</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {loadingFlavors ? 'Loading…' : `${flavors.length} flavor${flavors.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">⚠️ {error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-8" />
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Slug</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
            </tr>
          </thead>
          <tbody>
            {loadingFlavors ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : flavors.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">No humor flavors found</td>
              </tr>
            ) : (
              flavors.map(flavor => (
                <>
                  <tr
                    key={flavor.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleExpand(flavor.id)}
                  >
                    <td className="px-4 py-3">
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${expanded.has(flavor.id) ? 'rotate-90' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-400 text-xs">{flavor.id}</td>
                    <td className="px-4 py-3">
                      <Badge text={flavor.slug} color="blue" />
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-md">
                      {flavor.description ?? <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {formatDate(flavor.created_datetime_utc)}
                    </td>
                  </tr>
                  {expanded.has(flavor.id) && (
                    <tr key={`steps-${flavor.id}`} className="border-b border-gray-100">
                      <td colSpan={5} className="p-0">
                        <StepsPanel
                          flavorId={flavor.id}
                          steps={steps}
                          loading={loadingSteps && !steps.some(s => s.humor_flavor_id === flavor.id)}
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
