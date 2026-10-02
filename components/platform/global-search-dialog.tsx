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
  X,
  Sparkles,
} from 'lucide-react'
import { searchPlatformGlobalAction } from '@/actions/platform-data.actions'
import { GlobalSearchResult } from '@/types/platform.types'
import { useI18n } from '@/i18n/context'

interface GlobalSearchDialogProps {
  open: boolean
  onClose: () => void
}

export function GlobalSearchDialog({ open, onClose }: GlobalSearchDialogProps) {
  const { tBilingual } = useI18n()
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
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-200 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-lg overflow-hidden flex flex-col max-h-screen animate-in zoom-in-95 duration-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-border gap-3">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
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
            placeholder={tBilingual('Search clients, phones, plans...', 'ক্লায়েন্ট বা ফোন নম্বর খুঁজুন...')}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-medium"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer transition-colors"
              title={tBilingual('Clear', 'মুছুন')}
              aria-label="Clear query"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="hidden sm:inline-flex items-center px-2 py-0.5 text-2xs tabular-nums text-muted-foreground bg-muted border border-border rounded-md cursor-pointer transition-colors font-semibold"
            title="ESC"
            aria-label="Close search (ESC)"
          >
            ESC
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md cursor-pointer transition-colors shrink-0"
            title={tBilingual('Close', 'বন্ধ করুন')}
            aria-label="Close search dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
          {loading && (
            <div className="py-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <div className="h-4 w-4 border border-primary border-t-transparent rounded-full animate-spin" />
              <span>{tBilingual('Searching...', 'খোঁজা হচ্ছে...')}</span>
            </div>
          )}

          {!loading && !query && (
            <div className="py-8 text-center text-muted-foreground space-y-2">
              <Sparkles className="h-6 w-6 text-muted-foreground mx-auto opacity-80" />
              <p className="text-xs text-foreground font-medium">
                {tBilingual('Search by client name, phone, or plan.', 'ক্লায়েন্টের নাম বা ফোন দিয়ে খুঁজুন।')}
              </p>
              <p className="text-2xs text-muted-foreground">
                {tBilingual('Shortcut: press', 'সহজে খুলতে')} <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-foreground font-semibold tabular-nums">/</kbd> {tBilingual('anywhere', 'চাপুন')}
              </p>
            </div>
          )}

          {!loading && query && !hasResults && (
            <div className="py-8 text-center text-muted-foreground">
              <p className="text-sm font-semibold text-foreground">
                {tBilingual('Nothing found for', 'কিছু পাওয়া যায়নি:')} &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {tBilingual('Check spelling or try a phone number.', 'বানান ঠিক আছে কি না বা ফোন নম্বর দিয়ে দেখুন।')}
              </p>
            </div>
          )}

          {/* Group: Companies */}
          {results && results.companies.length > 0 && (
            <div className="space-y-2">
              <div className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{tBilingual('Clients', 'ক্লায়েন্ট')} ({results.companies.length})</span>
              </div>
              <div className="space-y-1">
                {results.companies.map((comp) => (
                  <button
                    key={comp.id}
                    onClick={() => handleSelect(`/platform/companies/${comp.id}`)}
                    className="w-full text-left p-2.5 rounded-lg bg-card hover:bg-muted border border-border transition-all flex items-center justify-between group cursor-pointer shadow-xs"
                  >
                    <div>
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {comp.name}
                        {comp.name_bn && <span className="text-muted-foreground ml-1 font-normal">({comp.name_bn})</span>}
                      </div>
                      <div className="text-2xs text-muted-foreground flex items-center gap-2 mt-0.5 font-medium">
                        <span>{tBilingual('Owner:', 'মালিক:')} {comp.owner_name}</span>
                        <span>•</span>
                        <span>{comp.owner_phone}</span>
                        <span>•</span>
                        <span className="capitalize text-muted-foreground font-semibold">{comp.plan}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-2xs uppercase font-semibold px-2 py-0.5 rounded-full border ${comp.status === 'active' ? 'bg-success-surface text-success border-success/30' : 'bg-warning-surface text-warning border-warning/30'}`}>
                        {comp.status}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Group: Subscriptions */}
          {results && results.subscriptions.length > 0 && (
            <div className="space-y-2">
              <div className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{tBilingual('Plans', 'প্ল্যান')} ({results.subscriptions.length})</span>
              </div>
              <div className="space-y-1">
                {results.subscriptions.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => handleSelect('/platform/subscriptions')}
                    className="w-full text-left p-2.5 rounded-lg bg-card hover:bg-muted border border-border transition-all flex items-center justify-between group cursor-pointer shadow-xs"
                  >
                    <div>
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {sub.company_name} — {sub.plan_code.toUpperCase()}
                      </div>
                      <div className="text-2xs text-muted-foreground font-medium">
                        {tBilingual('Monthly:', 'মাসিক:')} ৳{sub.amount.toLocaleString()}
                      </div>
                    </div>
                    <span className="text-2xs font-semibold uppercase px-2 py-0.5 rounded-full bg-success-surface text-success border border-success/30">
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
              <div className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileClock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{tBilingual('Activity Log', 'কাজের ইতিহাস')} ({results.audit_events.length})</span>
              </div>
              <div className="space-y-1">
                {results.audit_events.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => handleSelect('/platform/audit')}
                    className="w-full text-left p-2.5 rounded-lg bg-card hover:bg-muted border border-border transition-all flex items-center justify-between group cursor-pointer shadow-xs"
                  >
                    <div>
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors tabular-nums">
                        {a.action}
                      </div>
                      <div className="text-2xs text-muted-foreground font-medium">
                        {tBilingual('By', 'করেছেন')} {a.actor_email} {a.target_company_name ? `(${a.target_company_name})` : ''}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Group: Feature Flags */}
          {results && results.features.length > 0 && (
            <div className="space-y-2">
              <div className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Flag className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{tBilingual('Features', 'ফিচার')} ({results.features.length})</span>
              </div>
              <div className="space-y-1">
                {results.features.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleSelect('/platform/features')}
                    className="w-full text-left p-2.5 rounded-lg bg-card hover:bg-muted border border-border transition-all flex items-center justify-between group cursor-pointer shadow-xs"
                  >
                    <div>
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {f.name}
                      </div>
                      <div className="text-2xs text-muted-foreground tabular-nums font-mono">{f.key}</div>
                    </div>
                    <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${f.is_enabled ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground border border-border'}`}>
                      {f.is_enabled ? tBilingual('ON', 'চালু') : tBilingual('OFF', 'বন্ধ')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-muted/50 border-t border-border flex items-center justify-between text-2xs text-muted-foreground">
          <span>{tBilingual('Select to open', 'খুলতে ক্লিক করুন')}</span>
          <button
            type="button"
            onClick={onClose}
            className="hover:text-foreground transition-colors cursor-pointer font-medium"
          >
            {tBilingual('Press ESC to close', 'বন্ধ করতে ESC চাপুন')}
          </button>
        </div>
      </div>
    </div>
  )
}
