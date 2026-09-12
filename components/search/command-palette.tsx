'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  X,
  UserPlus,
  FileSpreadsheet,
  ShoppingBag,
  CreditCard,
  Truck,
  Receipt,
  Users,
  Printer,
  Package,
  Layers,
  Settings,
  ArrowRight,
  Sparkles,
  Command,
  RotateCcw,
  CornerDownLeft,
  ArrowDown,
  ArrowUp,
} from 'lucide-react'
import { SearchService } from '@/services/search.service'
import {
  SearchEntity,
  SearchResultItem,
  GroupedSearchResults,
  QuickCommand,
} from '@/types/search.types'
import { useShortcuts } from '@/hooks/use-shortcuts'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Button } from '@/components/ui/button'

const ENTITY_CONFIG: Record<
  SearchEntity,
  { label: string; labelBn: string; icon: React.ElementType; color: string }
> = {
  customer: { label: 'Customers', labelBn: 'কাস্টমার', icon: Users, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  order: { label: 'Orders', labelBn: 'অর্ডার', icon: ShoppingBag, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' },
  quotation: { label: 'Quotations', labelBn: 'কোটেশন', icon: FileSpreadsheet, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  invoice: { label: 'Invoices', labelBn: 'ইনভয়েস', icon: Receipt, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  job: { label: 'Jobs', labelBn: 'জব', icon: Printer, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  product: { label: 'Products', labelBn: 'পণ্য', icon: Package, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  material: { label: 'Materials', labelBn: 'ম্যাটেরিয়াল', icon: Layers, color: 'text-pink-400 bg-pink-500/10 border-pink-500/30' },
  supplier: { label: 'Suppliers', labelBn: 'সাপ্লায়ার', icon: Truck, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
  employee: { label: 'Employees', labelBn: 'স্টাফ', icon: Users, color: 'text-teal-400 bg-teal-500/10 border-teal-500/30' },
  inventory: { label: 'Inventory', labelBn: 'মজুত', icon: Layers, color: 'text-pink-400 bg-pink-500/10 border-pink-500/30' },
  production_job: { label: 'Production', labelBn: 'উৎপাদন', icon: Printer, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  design_job: { label: 'Design', labelBn: 'ডিজাইন', icon: Sparkles, color: 'text-violet-400 bg-violet-500/10 border-violet-500/30' },
  challan: { label: 'Challans', labelBn: 'চালান', icon: Truck, color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
}

const COMMAND_ICONS: Record<string, React.ElementType> = {
  UserPlus,
  FileSpreadsheet,
  ShoppingBag,
  CreditCard,
  Truck,
  Receipt,
}

const COMMAND_THEMES: Record<
  string,
  { gradient: string; text: string; border: string; bg: string }
> = {
  'cmd-create-customer': {
    gradient: 'from-cyan-500/20 to-blue-500/20',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-500/10',
  },
  'cmd-create-quotation': {
    gradient: 'from-blue-500/20 to-indigo-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/10',
  },
  'cmd-create-order': {
    gradient: 'from-indigo-500/20 to-violet-500/20',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
    bg: 'bg-indigo-500/10',
  },
  'cmd-record-payment': {
    gradient: 'from-emerald-500/20 to-teal-500/20',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
  },
  'cmd-create-purchase': {
    gradient: 'from-sky-500/20 to-cyan-500/20',
    text: 'text-sky-400',
    border: 'border-sky-500/30',
    bg: 'bg-sky-500/10',
  },
  'cmd-add-expense': {
    gradient: 'from-amber-500/20 to-rose-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
  },
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'search' | 'quick-new'
}

export function CommandPalette({ isOpen, onClose, initialMode = 'search' }: CommandPaletteProps) {
  const router = useRouter()
  const { company } = useTenant()
  const { tBilingual } = useI18n()
  const tenantSlug = company?.slug || 'app'

  const [query, setQuery] = useState('')
  const [selectedEntity, setSelectedEntity] = useState<string>('all')
  const [showSettings, setShowSettings] = useState(false)
  const [viewMode, setViewMode] = useState<'search' | 'quick-new'>(initialMode)
  const [selectedIndex, setSelectedIndex] = useState<number>(0)

  const inputRef = useRef<HTMLInputElement>(null)

  const { shortcuts, updateShortcuts, resetShortcuts } = useShortcuts({
    onClose: () => onClose(),
  })

  // Autofocus input when opened
  useEffect(() => {
    if (isOpen) {
      setViewMode(initialMode)
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          inputRef.current.select()
        }
      }, 60)
    }
  }, [isOpen, initialMode])

  // Perform search across entities
  const groupedResults: GroupedSearchResults = useMemo(() => {
    if (!isOpen) return {}
    return SearchService.search(company?.id || 'c-01', query)
  }, [isOpen, company?.id, query])

  const quickCommands = useMemo(() => {
    return SearchService.getQuickCommands()
  }, [])

  // Flattened searchable items for arrow navigation
  const flatSearchItems = useMemo(() => {
    const isQueryEmpty = query.trim().length === 0
    if (isQueryEmpty || viewMode === 'quick-new') {
      return quickCommands.map((cmd) => ({ type: 'command' as const, data: cmd }))
    }

    const items: Array<{ type: 'result'; data: SearchResultItem; entity: string }> = []
    Object.entries(groupedResults).forEach(([entityKey, list]) => {
      if (selectedEntity === 'all' || selectedEntity === entityKey) {
        list.forEach((item) => items.push({ type: 'result', data: item, entity: entityKey }))
      }
    })
    return items
  }, [query, viewMode, quickCommands, groupedResults, selectedEntity])

  // Reset selectedIndex when filter/query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query, selectedEntity, viewMode])

  if (!isOpen) return null

  const handleSelectCommand = (cmd: QuickCommand) => {
    onClose()
    router.push(`/${tenantSlug}${cmd.href}`)
  }

  const handleSelectResult = (item: SearchResultItem) => {
    onClose()
    router.push(`/${tenantSlug}${item.href}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (flatSearchItems.length > 0 ? (prev + 1) % flatSearchItems.length : 0))
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (flatSearchItems.length > 0 ? (prev - 1 + flatSearchItems.length) % flatSearchItems.length : 0))
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (flatSearchItems.length > 0 && flatSearchItems[selectedIndex]) {
        const item = flatSearchItems[selectedIndex]
        if (item.type === 'command') {
          handleSelectCommand(item.data)
        } else {
          handleSelectResult(item.data)
        }
      }
    }
  }

  const hasResults = Object.keys(groupedResults).length > 0
  const isQueryEmpty = query.trim().length === 0

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-start justify-center p-3 sm:p-6 sm:pt-20 animate-in fade-in duration-150 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[85vh] relative animate-in zoom-in-95 duration-150 cursor-default ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle top ambient glow */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

        {/* Search Header */}
        <div className="p-3 sm:p-4 border-b border-slate-800/80 flex items-center gap-3 bg-slate-950/70">
          <div className="h-8 w-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400">
            <Search className="h-4 w-4" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              viewMode === 'quick-new'
                ? tBilingual('Type to filter operations (e.g. customer, quote, payment)...', 'অপারেশন খুঁজুন (যেমন: কাস্টমার, কোটেশন, পেমেন্ট)...')
                : tBilingual('Search customers, orders, invoices, jobs, materials...', 'কাস্টমার, অর্ডার, ইনভয়েস, জব, ম্যাটেরিয়াল খুঁজুন...')
            }
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder:text-slate-500 font-sans border-0 outline-none ring-0 shadow-none focus:outline-none focus:ring-0 focus:border-transparent focus:shadow-none select-text"
            style={{
              outline: 'none',
              boxShadow: 'none',
              border: 'none',
              WebkitAppearance: 'none',
            }}
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 cursor-pointer transition-colors"
              title="Clear search query"
              aria-label="Clear query"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-xl shrink-0 cursor-pointer transition-colors ${
              showSettings
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={tBilingual('Configure Shortcuts', 'শর্টকাট কনফিগার')}
            aria-label="Configure shortcuts"
          >
            <Settings className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 shrink-0 cursor-pointer transition-colors"
            title="Close Search (ESC)"
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Shortcuts Settings Banner / Drawer */}
        {showSettings && (
          <div className="p-4 bg-slate-950/90 border-b border-slate-800 text-xs space-y-3 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Command className="h-3.5 w-3.5 text-indigo-400" />
                <span>{tBilingual('Configurable Keyboard Shortcuts', 'কীবোর্ড শর্টকাট কনফিগারেশন')}</span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={resetShortcuts}
                className="h-6 text-[10px] text-slate-400 hover:text-white"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                {tBilingual('Reset Defaults', 'ডিফল্ট রিসেট')}
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[11px]">{tBilingual('Global Search Trigger', 'সার্চ ট্রিগার কি')}</span>
                <input
                  type="text"
                  maxLength={1}
                  value={shortcuts.openSearch}
                  onChange={(e) => updateShortcuts({ openSearch: e.target.value || '/' })}
                  className="w-9 h-7 text-center font-mono font-bold text-indigo-400 bg-slate-950 border border-slate-700 rounded-lg outline-none"
                  style={{ outline: 'none', boxShadow: 'none' }}
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[11px]">{tBilingual('Quick Operations Menu', 'অপারেশন মেনু কি')}</span>
                <input
                  type="text"
                  maxLength={1}
                  value={shortcuts.openNewMenu}
                  onChange={(e) => updateShortcuts({ openNewMenu: e.target.value || 'n' })}
                  className="w-9 h-7 text-center font-mono font-bold text-indigo-400 bg-slate-950 border border-slate-700 rounded-lg uppercase outline-none"
                  style={{ outline: 'none', boxShadow: 'none' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Category Pill Filters (when searching) */}
        {!isQueryEmpty && (
          <div className="px-3.5 py-2 border-b border-slate-800/80 bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
            <button
              onClick={() => setSelectedEntity('all')}
              className={`px-3 py-1 rounded-xl transition-all font-medium cursor-pointer ${
                selectedEntity === 'all'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white bg-slate-900/80 border border-slate-800'
              }`}
            >
              {tBilingual('All Results', 'সকল ফলাফল')}
            </button>
            {Object.entries(ENTITY_CONFIG).map(([key, item]) => {
              const count = groupedResults[key as SearchEntity]?.length || 0
              if (count === 0) return null

              return (
                <button
                  key={key}
                  onClick={() => setSelectedEntity(key)}
                  className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1.5 font-medium cursor-pointer ${
                    selectedEntity === key
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white bg-slate-900/80 border border-slate-800'
                  }`}
                >
                  <span>{tBilingual(item.label, item.labelBn)}</span>
                  <span className="font-mono text-[9px] px-1.5 py-0.2 rounded-md bg-slate-800 text-slate-300">
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Scrollable Results & Commands Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4">
          {/* SECTION 1: QUICK COMMANDS (Shown when empty query or in quick-new mode) */}
          {(isQueryEmpty || viewMode === 'quick-new') && (
            <div className="space-y-2.5">
              <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  <span>{tBilingual('Quick Commands', 'দ্রুত অপারেশন কমান্ড')}</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {tBilingual('Press key to trigger', 'কীবোর্ড শর্টকাট চাপুন')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {quickCommands.map((cmd, idx) => {
                  const Icon = COMMAND_ICONS[cmd.icon] || Sparkles
                  const theme = COMMAND_THEMES[cmd.id] || {
                    gradient: 'from-indigo-500/20 to-purple-500/20',
                    text: 'text-indigo-400',
                    border: 'border-indigo-500/30',
                    bg: 'bg-indigo-500/10',
                  }
                  const isSelected = selectedIndex === idx

                  return (
                    <button
                      key={cmd.id}
                      onClick={() => handleSelectCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between group cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? 'bg-slate-850 border-indigo-500/80 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                          : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-9 w-9 rounded-xl ${theme.bg} ${theme.text} border ${theme.border} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 pr-1">
                          <div
                            className={`text-xs font-bold text-white transition-colors truncate ${
                              isSelected ? 'text-indigo-300' : 'group-hover:text-indigo-300'
                            }`}
                          >
                            {cmd.title}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 leading-tight line-clamp-1">
                            {cmd.subtitle}
                          </div>
                        </div>
                      </div>

                      {cmd.shortcut && (
                        <kbd className="h-6 min-w-6 px-1.5 rounded-lg bg-slate-900/90 border border-slate-700/80 text-[11px] font-mono text-slate-300 font-bold ml-2 shrink-0 flex items-center justify-center shadow-xs">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* SECTION 2: SEARCH RESULTS (Grouped by Entity) */}
          {!isQueryEmpty && (
            <div className="space-y-4">
              {!hasResults ? (
                <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <Search className="h-5 w-5" />
                  </div>
                  <p className="font-semibold text-slate-300 text-sm">
                    {tBilingual(`No results found for "${query}"`, `"${query}" এর জন্য কোনো ফলাফল নেই`)}
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    {tBilingual(
                      'Try searching by customer name, phone number, order ID, invoice number, or material title.',
                      'কাস্টমার নাম, ফোন নম্বর, অর্ডার আইডি বা ইনভয়েস নম্বর দিয়ে খুঁজুন।'
                    )}
                  </p>
                </div>
              ) : (
                (() => {
                  let runningIndex = 0
                  return Object.entries(groupedResults).map(([entityKey, items]) => {
                    if (selectedEntity !== 'all' && selectedEntity !== entityKey) {
                      return null
                    }
                    if (!items || items.length === 0) return null

                    const config = ENTITY_CONFIG[entityKey as SearchEntity]
                    const Icon = config.icon

                    return (
                      <div key={entityKey} className="space-y-1.5">
                        {/* Group Header */}
                        <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 text-indigo-400" />
                          <span>{tBilingual(config.label, config.labelBn)}</span>
                          <span className="font-mono text-[9px] text-slate-500">({items.length})</span>
                        </div>

                        {/* Items */}
                        <div className="space-y-1">
                          {items.map((item) => {
                            const itemIndex = runningIndex++
                            const isSelected = selectedIndex === itemIndex

                            return (
                              <button
                                key={item.id}
                                onClick={() => handleSelectResult(item)}
                                onMouseEnter={() => setSelectedIndex(itemIndex)}
                                className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between group cursor-pointer ${
                                  isSelected
                                    ? 'bg-slate-850 border-indigo-500/80 ring-1 ring-indigo-500/30'
                                    : 'bg-slate-950/60 border-slate-800/80 hover:border-indigo-500/40 hover:bg-slate-900/80'
                                }`}
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`font-bold text-xs text-white transition-colors ${
                                        isSelected ? 'text-indigo-300' : 'group-hover:text-indigo-300'
                                      }`}
                                    >
                                      {item.title}
                                    </span>
                                    {item.badge && (
                                      <span
                                        className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase border ${config.color}`}
                                      >
                                        {item.badge}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                                    {item.subtitle}
                                  </div>
                                </div>

                                <ArrowRight
                                  className={`h-3.5 w-3.5 text-slate-600 transition-all shrink-0 ${
                                    isSelected
                                      ? 'text-indigo-400 translate-x-0.5'
                                      : 'group-hover:text-indigo-400 group-hover:translate-x-0.5'
                                  }`}
                                />
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                })()
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400 font-bold">
                {shortcuts.openSearch}
              </kbd>
              <span>{tBilingual('Search', 'সার্চ')}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400 font-bold uppercase">
                {shortcuts.openNewMenu}
              </kbd>
              <span>{tBilingual('New Action', 'নতুন কাজ')}</span>
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400 font-bold">
                ↑↓
              </kbd>
              <span>{tBilingual('Navigate', 'নেভিগেট')}</span>
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400 font-bold">
                ↵
              </kbd>
              <span>{tBilingual('Select', 'নির্বাচন')}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-emerald-500/80 text-[10px] font-mono">
              ● Multi-Tenant Isolated
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-slate-400 hover:text-white cursor-pointer transition-colors"
              title="Close search"
            >
              ESC to close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
