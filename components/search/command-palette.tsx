'use client'

import React, { useState, useEffect, useRef } from 'react'
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
  CornerDownLeft,
  RotateCcw,
} from 'lucide-react'
import { SearchService } from '@/services/search.service'
import {
  SearchEntity,
  SearchResultItem,
  GroupedSearchResults,
  QuickCommand,
  KeyboardShortcutConfig,
} from '@/types/search.types'
import { useShortcuts } from '@/hooks/use-shortcuts'
import { useTenant } from '@/hooks/use-tenant'
import { Button } from '@/components/ui/button'

const ENTITY_CONFIG: Record<
  SearchEntity,
  { label: string; icon: React.ElementType; color: string }
> = {
  customer: { label: 'Customers', icon: Users, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  order: { label: 'Orders', icon: ShoppingBag, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' },
  quotation: { label: 'Quotations', icon: FileSpreadsheet, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  invoice: { label: 'Invoices', icon: Receipt, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  job: { label: 'Jobs', icon: Printer, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  product: { label: 'Products', icon: Package, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  material: { label: 'Materials', icon: Layers, color: 'text-pink-400 bg-pink-500/10 border-pink-500/30' },
  supplier: { label: 'Suppliers', icon: Truck, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
  employee: { label: 'Employees', icon: Users, color: 'text-teal-400 bg-teal-500/10 border-teal-500/30' },
  inventory: { label: 'Inventory', icon: Layers, color: 'text-pink-400 bg-pink-500/10 border-pink-500/30' },
  production_job: { label: 'Production', icon: Printer, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  design_job: { label: 'Design', icon: Sparkles, color: 'text-violet-400 bg-violet-500/10 border-violet-500/30' },
  challan: { label: 'Challans', icon: Truck, color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
}

const COMMAND_ICONS: Record<string, React.ElementType> = {
  UserPlus,
  FileSpreadsheet,
  ShoppingBag,
  CreditCard,
  Truck,
  Receipt,
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'search' | 'quick-new'
}

export function CommandPalette({ isOpen, onClose, initialMode = 'search' }: CommandPaletteProps) {
  const router = useRouter()
  const { company } = useTenant()
  const tenantSlug = company?.slug || 'padma-digital'

  const [query, setQuery] = useState('')
  const [selectedEntity, setSelectedEntity] = useState<string>('all')
  const [showSettings, setShowSettings] = useState(false)
  const [viewMode, setViewMode] = useState<'search' | 'quick-new'>(initialMode)

  const inputRef = useRef<HTMLInputElement>(null)

  const { shortcuts, updateShortcuts, resetShortcuts } = useShortcuts({
    onClose: () => onClose(),
  })

  // Autofocus input when opened
  useEffect(() => {
    if (isOpen) {
      setViewMode(initialMode)
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen, initialMode])

  if (!isOpen) return null

  // Perform search across 9 entities
  const groupedResults: GroupedSearchResults = SearchService.search(
    company?.id || 'c-01',
    query
  )

  const quickCommands = SearchService.getQuickCommands()

  const handleSelectCommand = (cmd: QuickCommand) => {
    onClose()
    router.push(`/${tenantSlug}${cmd.href}`)
  }

  const handleSelectResult = (item: SearchResultItem) => {
    onClose()
    router.push(`/${tenantSlug}${item.href}`)
  }

  const hasResults = Object.keys(groupedResults).length > 0
  const isQueryEmpty = query.trim().length === 0

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-start justify-center p-3 sm:p-6 sm:pt-20 animate-in fade-in-0 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative animate-in zoom-in-95 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-950/60">
          <Search className="h-5 w-5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                onClose()
              }
            }}
            placeholder={
              viewMode === 'quick-new'
                ? 'Type to filter actions (e.g. customer, quote, payment)...'
                : 'Search customers, orders, invoices, jobs, materials...'
            }
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder:text-slate-500 focus:outline-hidden font-sans"
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-500 hover:text-white cursor-pointer transition-colors"
              title="Clear search query"
              aria-label="Clear query"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 shrink-0 cursor-pointer transition-colors"
            title="Configure Keyboard Shortcuts"
            aria-label="Configure shortcuts"
          >
            <Settings className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 shrink-0 cursor-pointer transition-colors"
            title="Close Search (ESC)"
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Shortcuts Settings Banner / Drawer */}
        {showSettings && (
          <div className="p-3.5 bg-slate-950 border-b border-slate-800 text-xs space-y-2.5 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Command className="h-3.5 w-3.5 text-indigo-400" />
                <span>Configurable Keyboard Shortcuts</span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={resetShortcuts}
                className="h-6 text-[10px] text-slate-400 hover:text-white"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset Defaults
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-slate-300">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span>Global Search Trigger</span>
                <input
                  type="text"
                  maxLength={1}
                  value={shortcuts.openSearch}
                  onChange={(e) => updateShortcuts({ openSearch: e.target.value || '/' })}
                  className="w-8 h-7 text-center font-mono font-bold text-indigo-400 bg-slate-950 border border-slate-700 rounded"
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span>Quick Actions Menu</span>
                <input
                  type="text"
                  maxLength={1}
                  value={shortcuts.openNewMenu}
                  onChange={(e) => updateShortcuts({ openNewMenu: e.target.value || 'n' })}
                  className="w-8 h-7 text-center font-mono font-bold text-indigo-400 bg-slate-950 border border-slate-700 rounded uppercase"
                />
              </div>
            </div>
          </div>
        )}

        {/* Category Pill Filters (when searching) */}
        {!isQueryEmpty && (
          <div className="px-3.5 py-2 border-b border-slate-800/80 bg-slate-950/30 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
            <button
              onClick={() => setSelectedEntity('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                selectedEntity === 'all'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white bg-slate-900/60'
              }`}
            >
              All Results
            </button>
            {Object.entries(ENTITY_CONFIG).map(([key, item]) => {
              const count = groupedResults[key as SearchEntity]?.length || 0
              if (count === 0) return null

              return (
                <button
                  key={key}
                  onClick={() => setSelectedEntity(key)}
                  className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 font-medium ${
                    selectedEntity === key
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white bg-slate-900/60'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-300">
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
            <div className="space-y-2">
              <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Quick Commands</span>
                <span className="text-[10px] text-slate-500 font-mono">Press key to trigger</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {quickCommands.map((cmd) => {
                  const Icon = COMMAND_ICONS[cmd.icon] || Sparkles
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => handleSelectCommand(cmd)}
                      className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/60 hover:bg-slate-850/80 text-left transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white group-hover:text-indigo-300 truncate">
                            {cmd.title}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {cmd.subtitle}
                          </div>
                        </div>
                      </div>

                      {cmd.shortcut && (
                        <kbd className="h-5 px-1.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400 font-bold ml-2 shrink-0">
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
                <div className="py-12 text-center text-slate-500 text-xs">
                  <Search className="h-6 w-6 mx-auto mb-2 text-slate-600" />
                  <p className="font-medium text-slate-400">No results found for &ldquo;{query}&rdquo;</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Try searching by customer name, order number, invoice ID, or press machine.
                  </p>
                </div>
              ) : (
                Object.entries(groupedResults).map(([entityKey, items]) => {
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
                        <span>{config.label}</span>
                        <span className="font-mono text-[9px] text-slate-500">({items.length})</span>
                      </div>

                      {/* Items */}
                      <div className="space-y-1">
                        {items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleSelectResult(item)}
                            className="w-full p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-indigo-500/40 hover:bg-slate-850 text-left transition-colors flex items-center justify-between group cursor-pointer"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-xs group-hover:text-indigo-300">
                                  {item.title}
                                </span>
                                {item.badge && (
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase border ${config.color}`}
                                  >
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                                {item.subtitle}
                              </div>
                            </div>

                            <ArrowRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="p-2.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
                {shortcuts.openSearch}
              </kbd>
              <span>Search</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400 uppercase">
                {shortcuts.openNewMenu}
              </kbd>
              <span>New Action</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Permission Isolated</span>
            <button
              type="button"
              onClick={onClose}
              className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-slate-400 hover:text-white cursor-pointer transition-colors"
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
