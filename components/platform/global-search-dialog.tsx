'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Building2,
  Users,
  CreditCard,
  FileClock,
  Flag,
  ArrowRight,
  ExternalLink,
  X,
  Sparkles,
} from 'lucide-react'
import { searchPlatformGlobalAction } from '@/actions/platform-data.actions'
import { GlobalSearchResult } from '@/types/platform.types'

interface GlobalSearchDialogProps {
  open: boolean
  onClose: () => void
}

export function GlobalSearchDialog({ open, onClose }: GlobalSearchDialogProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GlobalSearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setResults(null)
    }
  }, [open])

  // ESC key handler to close dialog
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!query.trim()) {
      setResults(null)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      const res = await searchPlatformGlobalAction(query)
      if (res.success && res.data) {
        setResults(res.data)
      }
      setLoading(false)
    }, 200)

    return () => clearTimeout(timer)
  }, [query])

  if (!open) return null

  const handleSelect = (url: string) => {
    onClose()
    router.push(url)
  }

  const hasResults =
    results &&
    (results.companies.length > 0 ||
      results.users.length > 0 ||
      results.subscriptions.length > 0 ||
      results.audit_events.length > 0 ||
      results.features.length > 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-foreground backdrop-blur-sm animate-in fade-in-0 duration-200 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-foreground border border-border rounded-2xl shadow-2xl shadow-black/90 ring-1 ring-slate-700/60 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-border gap-3">
          <Search className="h-5 w-5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                onClose()
              }
            }}
            placeholder="Search companies, owners, phone, subscriptions, audit logs, feature flags..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-muted-foreground outline-none font-medium"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-muted-foreground hover:text-white p-1 rounded-md cursor-pointer transition-colors"
              title="Clear search query"
              aria-label="Clear query"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="hidden sm:inline-flex items-center px-2 py-0.5 text-2xs tabular-nums text-foreground hover:text-white bg-secondary hover:bg-slate-700 border border-slate-600 rounded-md cursor-pointer transition-colors font-semibold"
            title="Press ESC or click to close"
            aria-label="Close search (ESC)"
          >
            ESC
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-white hover:bg-secondary rounded-md cursor-pointer transition-colors shrink-0"
            title="Close Search"
            aria-label="Close search dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
          {loading && (
            <div className="py-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span>Searching across PrintERP platform...</span>
            </div>
          )}

          {!loading && !query && (
            <div className="py-8 text-center text-muted-foreground space-y-2">
              <Sparkles className="h-6 w-6 text-indigo-400 mx-auto opacity-80" />
              <p className="text-xs text-foreground font-medium">Type a company name, owner phone, email, plan, or audit action.</p>
              <p className="text-2xs text-muted-foreground">Quick shortcut: press <kbd className="px-1.5 py-0.5 bg-secondary border border-slate-600 rounded text-foreground font-bold tabular-nums">/</kbd> anywhere to open search.</p>
            </div>
          )}

          {!loading && query && !hasResults && (
            <div className="py-8 text-center text-muted-foreground">
              <p className="text-sm font-semibold text-foreground">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-muted-foreground mt-1">Try searching by company slug, district, or owner phone number.</p>
            </div>
          )}

          {/* Group: Companies */}
          {results && results.companies.length > 0 && (
            <div className="space-y-2">
              <div className="text-2xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                <span>Companies ({results.companies.length})</span>
              </div>
              <div className="space-y-1">
                {results.companies.map((comp) => (
                  <button
                    key={comp.id}
                    onClick={() => handleSelect(`/platform/companies/${comp.id}`)}
                    className="w-full text-left p-2.5 rounded-xl bg-foreground hover:bg-secondary border border-border hover:border-indigo-500/70 transition-all flex items-center justify-between group cursor-pointer shadow-xs"
                  >
                    <div>
                      <div className="font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {comp.name}
                        {comp.name_bn && <span className="text-muted-foreground ml-1 font-normal">({comp.name_bn})</span>}
                      </div>
                      <div className="text-2xs text-muted-foreground flex items-center gap-2 mt-0.5 font-medium">
                        <span>Owner: {comp.owner_name}</span>
                        <span>•</span>
                        <span>{comp.owner_phone}</span>
                        <span>•</span>
                        <span className="capitalize text-indigo-300 font-semibold">{comp.plan}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-2xs uppercase font-bold px-2 py-0.5 rounded-full border ${comp.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'}`}>
                        {comp.status}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-indigo-300 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Group: Subscriptions */}
          {results && results.subscriptions.length > 0 && (
            <div className="space-y-2">
              <div className="text-2xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-emerald-400" />
                <span>Subscriptions ({results.subscriptions.length})</span>
              </div>
              <div className="space-y-1">
                {results.subscriptions.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => handleSelect('/platform/subscriptions')}
                    className="w-full text-left p-2.5 rounded-xl bg-foreground hover:bg-secondary border border-border hover:border-emerald-500/70 transition-all flex items-center justify-between group cursor-pointer shadow-xs"
                  >
                    <div>
                      <div className="font-semibold text-white group-hover:text-emerald-300 transition-colors">
                        {sub.company_name} — {sub.plan_code.toUpperCase()}
                      </div>
                      <div className="text-2xs text-muted-foreground font-medium">
                        Monthly Rate: ৳{sub.amount.toLocaleString()} / mo
                      </div>
                    </div>
                    <span className="text-2xs font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {sub.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Group: Audit Events */}
          {results && results.audit_events.length > 0 && (
            <div className="space-y-2">
              <div className="text-2xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <FileClock className="h-3.5 w-3.5 text-cyan-400" />
                <span>Audit Logs ({results.audit_events.length})</span>
              </div>
              <div className="space-y-1">
                {results.audit_events.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => handleSelect('/platform/audit')}
                    className="w-full text-left p-2.5 rounded-xl bg-foreground hover:bg-secondary border border-border hover:border-cyan-500/70 transition-all flex items-center justify-between group cursor-pointer shadow-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors tabular-nums">
                        {a.action}
                      </div>
                      <div className="text-2xs text-muted-foreground font-medium">
                        By {a.actor_email} {a.target_company_name ? `on ${a.target_company_name}` : ''}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-cyan-300 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Group: Feature Flags */}
          {results && results.features.length > 0 && (
            <div className="space-y-2">
              <div className="text-2xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Flag className="h-3.5 w-3.5 text-purple-400" />
                <span>Feature Flags ({results.features.length})</span>
              </div>
              <div className="space-y-1">
                {results.features.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleSelect('/platform/features')}
                    className="w-full text-left p-2.5 rounded-xl bg-foreground hover:bg-secondary border border-border hover:border-purple-500/70 transition-all flex items-center justify-between group cursor-pointer shadow-xs"
                  >
                    <div>
                      <div className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                        {f.name}
                      </div>
                      <div className="text-2xs text-muted-foreground tabular-nums font-mono">{f.key}</div>
                    </div>
                    <span className={`text-2xs font-bold px-2 py-0.5 rounded-full ${f.is_enabled ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-secondary text-muted-foreground border border-slate-600'}`}>
                      {f.is_enabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-foreground border-t border-border flex items-center justify-between text-2xs text-muted-foreground">
          <span>Navigate with mouse or arrow keys</span>
          <button
            type="button"
            onClick={onClose}
            className="hover:text-white transition-colors cursor-pointer font-medium"
          >
            Click outside or press ESC to dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
