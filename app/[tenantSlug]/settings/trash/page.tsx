'use client'

import React, { useState, useMemo, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Trash2,
  RefreshCw,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Receipt,
  Users,
  Package,
  Boxes,
  Truck,
  Eye,
  AlertCircle,
  Calendar,
  User,
  Clock,
  ShieldAlert,
  Archive,
  Info,
  SlidersHorizontal,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { SettingsNav } from '@/components/settings/settings-nav'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'
import { TrashRepository } from '@/lib/repositories/trash.repository'
import {
  TRASH_RETENTION_DAYS,
  getTrashDaysRemaining,
  type TrashCategory,
  type TrashRecord,
} from '@/types/trash.types'
import { cn } from '@/lib/utils'

function TrashSettingsContent() {
  const searchParams = useSearchParams()
  const tabParam = searchParams?.get('tab')
  const { company } = useTenant()
  const { tBilingual, locale } = useI18n()
  const companyId = company?.id || 'default'
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const [trashItems, setTrashItems] = useDataStore<TrashRecord[]>(STORAGE_KEYS.TRASH_ITEMS, [])
  const [selectedCategory, setSelectedCategory] = useState<string>(tabParam || 'all')
  const [search, setSearch] = useState('')

  // Realtime multi-tab synchronization listener
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleSync = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.TRASH_ITEMS)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            setTrashItems(parsed)
          }
        }
      } catch (err) {
        console.error('[TrashSettings] Sync parse error:', err)
      }
    }

    window.addEventListener('printerp_table_synced:trash', handleSync)
    window.addEventListener('printerp_data_sync', handleSync)

    return () => {
      window.removeEventListener('printerp_table_synced:trash', handleSync)
      window.removeEventListener('printerp_data_sync', handleSync)
    }
  }, [setTrashItems])

  useEffect(() => {
    if (tabParam) {
      setSelectedCategory(tabParam)
    }
    // Auto-purge any records older than 30 days
    TrashRepository.purgeExpiredTrash(companyId, TRASH_RETENTION_DAYS).catch(() => {})
  }, [tabParam, companyId])

  // Modals state
  const [itemToPermanentDelete, setItemToPermanentDelete] = useState<TrashRecord | null>(null)
  const [isPermanentModalOpen, setIsPermanentModalOpen] = useState(false)
  const [isEmptyTrashModalOpen, setIsEmptyTrashModalOpen] = useState(false)
  const [inspectedItem, setInspectedItem] = useState<TrashRecord | null>(null)
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  // Summary counts
  const counts = useMemo(() => {
    const list = trashItems.filter((i) => !companyId || i.company_id === companyId || i.company_id === 'default')
    return {
      total: list.length,
      quotations: list.filter((i) => i.category === 'quotations').length,
      invoices: list.filter((i) => i.category === 'invoices').length,
      customers: list.filter((i) => i.category === 'customers').length,
      products: list.filter((i) => i.category === 'products').length,
      materials: list.filter((i) => i.category === 'materials').length,
      suppliers: list.filter((i) => i.category === 'suppliers').length,
    }
  }, [trashItems, companyId])

  // Filtered items
  const filteredItems = useMemo(() => {
    return trashItems
      .filter((item) => {
        const matchCompany = !companyId || item.company_id === companyId || item.company_id === 'default'
        const matchCategory = selectedCategory === 'all' || item.category === selectedCategory
        const term = search.toLowerCase().trim()
        const matchSearch =
          !term ||
          item.title.toLowerCase().includes(term) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(term)) ||
          (item.reference_number && item.reference_number.toLowerCase().includes(term)) ||
          (item.deleted_by_name && item.deleted_by_name.toLowerCase().includes(term))

        return matchCompany && matchCategory && matchSearch
      })
      .sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime())
  }, [trashItems, companyId, selectedCategory, search])

  // Restore action
  const handleRestore = async (item: TrashRecord) => {
    try {
      await TrashRepository.restoreFromTrash(item.id, companyId)
      
      // Broadcast restore event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('printerp_table_synced:trash', { detail: { id: item.id } }))
        window.dispatchEvent(new CustomEvent(`printerp_table_synced:${item.category}`, { detail: item.payload }))
        window.dispatchEvent(new CustomEvent('printerp_data_sync', { detail: { table: item.category, action: 'restore' } }))
      }

      showNotification(
        tBilingual(
          `Restored "${item.title}" successfully back to active records.`,
          `"${item.title}" সফলভাবে পুনরুদ্ধার করা হয়েছে।`
        )
      )
    } catch (err: any) {
      showNotification(err.message || 'Failed to restore item.')
    }
  }

  // Permanent delete action
  const handlePermanentDelete = async () => {
    if (!itemToPermanentDelete) return
    try {
      await TrashRepository.permanentDelete(itemToPermanentDelete.id, companyId)
      setIsPermanentModalOpen(false)
      setItemToPermanentDelete(null)

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('printerp_table_synced:trash', { detail: { id: itemToPermanentDelete.id } }))
        window.dispatchEvent(new CustomEvent('printerp_data_sync', { detail: { table: 'trash', action: 'permanent_delete' } }))
      }

      showNotification(
        tBilingual(
          `Permanently deleted "${itemToPermanentDelete.title}".`,
          `"${itemToPermanentDelete.title}" স্থায়ীভাবে মুছে ফেলা হয়েছে।`
        )
      )
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete item permanently.')
    }
  }

  // Empty trash action
  const handleEmptyTrash = async () => {
    try {
      const categoryToClear = selectedCategory === 'all' ? undefined : (selectedCategory as TrashCategory)
      const count = await TrashRepository.emptyTrash(companyId, categoryToClear)
      setIsEmptyTrashModalOpen(false)

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('printerp_table_synced:trash', { detail: { cleared: count } }))
        window.dispatchEvent(new CustomEvent('printerp_data_sync', { detail: { table: 'trash', action: 'empty' } }))
      }

      showNotification(
        tBilingual(
          `Permanently purged ${count} items from trash.`,
          `ট্র্যাশ থেকে ${count} টি আইটেম স্থায়ীভাবে মুছে ফেলা হয়েছে।`
        )
      )
    } catch (err: any) {
      showNotification(err.message || 'Failed to empty trash.')
    }
  }

  const getCategoryBadge = (category: TrashCategory) => {
    switch (category) {
      case 'quotations':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
            <FileSpreadsheet className="h-3 w-3" />
            {tBilingual('Quotation', 'কোটেশন')}
          </span>
        )
      case 'invoices':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Receipt className="h-3 w-3" />
            {tBilingual('Invoice', 'ইনভয়েস')}
          </span>
        )
      case 'customers':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">
            <Users className="h-3 w-3" />
            {tBilingual('Customer', 'গ্রাহক')}
          </span>
        )
      case 'products':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300">
            <Package className="h-3 w-3" />
            {tBilingual('Product', 'পণ্য')}
          </span>
        )
      case 'materials':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300">
            <Boxes className="h-3 w-3" />
            {tBilingual('Material / Stock', 'কাঁচামাল ও স্টক')}
          </span>
        )
      case 'suppliers':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300">
            <Truck className="h-3 w-3" />
            {tBilingual('Supplier', 'সরবরাহকারী')}
          </span>
        )
      default:
        return <Badge variant="outline">{category}</Badge>
    }
  }

  if (!mounted) {
    return (
      <div className="space-y-6 max-w-7xl animate-pulse p-4 sm:p-0">
        <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-3/4" />
        <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-xl w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
        <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl pb-16">
      {/* Header */}
      <PageHeader
        titleEn="Trash & Recycle Bin"
        titleBn="রিসাইকেল বিন ও ট্র্যাশ"
        descriptionEn="Safely restore or permanently purge deleted quotations, invoices, customers, products, materials, and suppliers."
        descriptionBn="মুছে ফেলা কোটেশন, ইনভয়েস, গ্রাহক, পণ্য, কাঁচামাল ও সরবরাহকারীর তথ্য রিস্টোর বা স্থায়ীভাবে মুছে ফেলুন।"
        icon={Trash2}
        iconColor="text-rose-600 dark:text-rose-400"
        actions={
          counts.total > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEmptyTrashModalOpen(true)}
              className="text-xs font-bold text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-200 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40 shadow-xs"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5 text-rose-600" />
              {tBilingual('Empty Trash', 'ট্র্যাশ খালি করুন')}
            </Button>
          )
        }
      />

      <SettingsNav />

      {/* Notification */}
      {notification && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2.5 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 shadow-sm animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* 30-DAY AUTO RETENTION POLICY BANNER */}
      <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg text-amber-800 dark:text-amber-300 shrink-0">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold block sm:inline">
              {tBilingual('30-Day Auto Permanent Deletion Policy:', '৩০ দিনের স্বয়ংক্রিয় ডিলিট পলিসি:')}{' '}
            </span>
            <span className="text-amber-800/90 dark:text-amber-300/90">
              {tBilingual(
                'Deleted business records remain in this Recycle Bin for 30 days before automated permanent removal.',
                'মুছে ফেলা ব্যবসায়িক রেকর্ড ৩০ দিন পর্যন্ত এই রিসাইকেল বিনে সুরক্ষিত থাকে এবং এরপর স্থায়ীভাবে অপসারিত হয়।'
              )}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <Badge variant="outline" className="bg-white/80 dark:bg-amber-900/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-semibold text-[11px] px-2.5 py-0.5">
            <ShieldAlert className="h-3 w-3 mr-1 text-amber-600 dark:text-amber-400" />
            {TRASH_RETENTION_DAYS} Days Safe Retention
          </Badge>
        </div>
      </div>

      {/* CATEGORY SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* All Items */}
        <Card
          onClick={() => setSelectedCategory('all')}
          className={cn(
            'p-3 cursor-pointer transition-all hover:border-slate-400 shadow-2xs',
            selectedCategory === 'all' && 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 dark:bg-rose-950/20'
          )}
        >
          <span className="text-[11px] font-bold text-slate-500 block">{tBilingual('All Items', 'সব আইটেম')}</span>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{counts.total}</div>
        </Card>

        {/* Quotations */}
        <Card
          onClick={() => setSelectedCategory('quotations')}
          className={cn(
            'p-3 cursor-pointer transition-all hover:border-blue-400 border-l-4 border-l-blue-500 shadow-2xs',
            selectedCategory === 'quotations' && 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20'
          )}
        >
          <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 block">{tBilingual('Quotations', 'কোটেশন')}</span>
          <div className="text-xl font-black text-blue-700 dark:text-blue-300 mt-0.5">{counts.quotations}</div>
        </Card>

        {/* Invoices */}
        <Card
          onClick={() => setSelectedCategory('invoices')}
          className={cn(
            'p-3 cursor-pointer transition-all hover:border-emerald-400 border-l-4 border-l-emerald-500 shadow-2xs',
            selectedCategory === 'invoices' && 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20'
          )}
        >
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block">{tBilingual('Invoices', 'ইনভয়েস')}</span>
          <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{counts.invoices}</div>
        </Card>

        {/* Customers */}
        <Card
          onClick={() => setSelectedCategory('customers')}
          className={cn(
            'p-3 cursor-pointer transition-all hover:border-purple-400 border-l-4 border-l-purple-500 shadow-2xs',
            selectedCategory === 'customers' && 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/20 dark:bg-purple-950/20'
          )}
        >
          <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 block">{tBilingual('Customers', 'গ্রাহক')}</span>
          <div className="text-xl font-black text-purple-700 dark:text-purple-300 mt-0.5">{counts.customers}</div>
        </Card>

        {/* Products */}
        <Card
          onClick={() => setSelectedCategory('products')}
          className={cn(
            'p-3 cursor-pointer transition-all hover:border-cyan-400 border-l-4 border-l-cyan-500 shadow-2xs',
            selectedCategory === 'products' && 'border-cyan-500 ring-2 ring-cyan-500/20 bg-cyan-50/20 dark:bg-cyan-950/20'
          )}
        >
          <span className="text-[11px] font-bold text-cyan-700 dark:text-cyan-300 block">{tBilingual('Products', 'পণ্য')}</span>
          <div className="text-xl font-black text-cyan-700 dark:text-cyan-300 mt-0.5">{counts.products}</div>
        </Card>

        {/* Materials */}
        <Card
          onClick={() => setSelectedCategory('materials')}
          className={cn(
            'p-3 cursor-pointer transition-all hover:border-amber-400 border-l-4 border-l-amber-500 shadow-2xs',
            selectedCategory === 'materials' && 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20 dark:bg-amber-950/20'
          )}
        >
          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 block">{tBilingual('Materials', 'কাঁচামাল')}</span>
          <div className="text-xl font-black text-amber-700 dark:text-amber-300 mt-0.5">{counts.materials}</div>
        </Card>

        {/* Suppliers */}
        <Card
          onClick={() => setSelectedCategory('suppliers')}
          className={cn(
            'p-3 cursor-pointer transition-all hover:border-indigo-400 border-l-4 border-l-indigo-500 shadow-2xs',
            selectedCategory === 'suppliers' && 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20'
          )}
        >
          <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 block">{tBilingual('Suppliers', 'সরবরাহকারী')}</span>
          <div className="text-xl font-black text-indigo-700 dark:text-indigo-300 mt-0.5">{counts.suppliers}</div>
        </Card>
      </div>

      {/* FILTER & SEARCH BAR */}
      <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder={tBilingual(
                'Search deleted item by title, reference #, or deleted by...',
                'নাম, রেফারেন্স নম্বর বা ব্যবহারকারীর নাম দিয়ে খুঁজুন...'
              )}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 w-full sm:w-auto"
            >
              <option value="all">{tBilingual('All Categories', 'সকল ক্যাটাগরি')} ({counts.total})</option>
              <option value="quotations">{tBilingual('Quotations', 'কোটেশন')} ({counts.quotations})</option>
              <option value="invoices">{tBilingual('Invoices', 'ইনভয়েস')} ({counts.invoices})</option>
              <option value="customers">{tBilingual('Customers', 'গ্রাহক')} ({counts.customers})</option>
              <option value="products">{tBilingual('Products', 'পণ্য')} ({counts.products})</option>
              <option value="materials">{tBilingual('Raw Materials', 'কাঁচামাল')} ({counts.materials})</option>
              <option value="suppliers">{tBilingual('Suppliers', 'সরবরাহকারী')} ({counts.suppliers})</option>
            </select>
          </div>
        </div>
      </Card>

      {/* TRASH ITEMS TABLE / LIST */}
      <Card className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Archive className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                {tBilingual('Trash is empty', 'ট্র্যাশ সম্পূর্ণ খালি')}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {search
                  ? tBilingual('No deleted records matched your search filter.', 'আপনার সার্চের সাথে কোনো রেকর্ড মেলেনি।')
                  : tBilingual('No soft-deleted records in this category.', 'এই ক্যাটাগরিতে মুছে ফেলা কোনো রেকর্ড নেই।')}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <th className="p-3.5">{tBilingual('Item Details', 'আইটেমের বিবরণ')}</th>
                  <th className="p-3.5">{tBilingual('Category', 'ক্যাটাগরি')}</th>
                  <th className="p-3.5">{tBilingual('Deleted By', 'কে মুছেছেন')}</th>
                  <th className="p-3.5">{tBilingual('Deleted Date', 'মুছে ফেলার তারিখ')}</th>
                  <th className="p-3.5">{tBilingual('Auto-Purge In', 'স্বয়ংক্রিয় মুছা')}</th>
                  <th className="p-3.5 text-right">{tBilingual('Actions', 'পদক্ষেপ')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredItems.map((item) => {
                  const daysLeft = getTrashDaysRemaining(item.expires_at, item.deleted_at, TRASH_RETENTION_DAYS)
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      {/* Item Details */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {item.title}
                        </div>
                        {item.subtitle && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{item.subtitle}</div>
                        )}
                        {item.reference_number && (
                          <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 mt-1 inline-block">
                            #{item.reference_number}
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="p-3.5">{getCategoryBadge(item.category)}</td>

                      {/* Deleted By */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <User className="h-3 w-3 text-slate-400" />
                          <span>{item.deleted_by_name || 'System Admin'}</span>
                        </div>
                      </td>

                      {/* Deleted Date */}
                      <td className="p-3.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {new Date(item.deleted_at).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-US', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Auto-Purge Countdown */}
                      <td className="p-3.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-mono font-semibold',
                            daysLeft <= 5
                              ? 'border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/30'
                              : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400'
                          )}
                        >
                          {daysLeft} {tBilingual('days left', 'দিন বাকি')}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inspect Modal Trigger */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setInspectedItem(item)
                              setIsInspectModalOpen(true)
                            }}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            title={tBilingual('Inspect Record Payload', 'রেকর্ড বিস্তারিত দেখুন')}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {/* Restore Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestore(item)}
                            className="h-7 px-2.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200 dark:border-emerald-900 dark:text-emerald-300"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            {tBilingual('Restore', 'রিস্টোর')}
                          </Button>

                          {/* Permanent Delete Trigger */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setItemToPermanentDelete(item)
                              setIsPermanentModalOpen(true)
                            }}
                            className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title={tBilingual('Delete Permanently', 'স্থায়ীভাবে মুছে ফেলুন')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* INSPECT MODAL */}
      <ModalDialog
        open={isInspectModalOpen}
        onOpenChange={setIsInspectModalOpen}
        title={tBilingual(`Inspect Trashed Record: ${inspectedItem?.title || ''}`, `রেকর্ড বিস্তারিত: ${inspectedItem?.title || ''}`)}
        size="lg"
      >
        {inspectedItem && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Category</span>
                <span className="font-bold capitalize">{inspectedItem.category}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Reference</span>
                <span className="font-mono font-bold">#{inspectedItem.reference_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Deleted By</span>
                <span>{inspectedItem.deleted_by_name || 'System Admin'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Retention</span>
                <span className="text-amber-600 font-bold">
                  {getTrashDaysRemaining(inspectedItem.expires_at, inspectedItem.deleted_at, TRASH_RETENTION_DAYS)} days left
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="font-bold text-slate-700 dark:text-slate-300">Stored Payload JSON:</span>
              <pre className="p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-60">
                {JSON.stringify(inspectedItem.payload, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => setIsInspectModalOpen(false)}>
                {tBilingual('Close', 'বন্ধ করুন')}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  handleRestore(inspectedItem)
                  setIsInspectModalOpen(false)
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                {tBilingual('Restore This Record', 'এই রেকর্ড রিস্টোর করুন')}
              </Button>
            </div>
          </div>
        )}
      </ModalDialog>

      {/* PERMANENT DELETE CONFIRMATION MODAL */}
      <ModalDialog
        open={isPermanentModalOpen}
        onOpenChange={setIsPermanentModalOpen}
        title={tBilingual('Permanent Deletion Warning', 'স্থায়ীভাবে মুছে ফেলার সতর্কতা')}
        size="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 dark:bg-rose-950/40 dark:text-rose-200 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">
                {tBilingual('This action is irreversible!', 'এই কাজটি অপরিবর্তনযোগ্য!')}
              </span>
              <p className="text-[11px] leading-relaxed">
                {tBilingual(
                  `Are you sure you want to permanently delete "${itemToPermanentDelete?.title}"? It cannot be recovered once removed.`,
                  `আপনি কি নিশ্চিত যে আপনি "${itemToPermanentDelete?.title}" স্থায়ীভাবে মুছে ফেলতে চান? এটি আর কোনোভাবেই পুনরুদ্ধার করা যাবে না।`
                )}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button size="sm" variant="outline" onClick={() => setIsPermanentModalOpen(false)}>
              {tBilingual('Cancel', 'বাতিল')}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handlePermanentDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              {tBilingual('Confirm Permanent Delete', 'স্থায়ীভাবে ডিলিট নিশ্চিত করুন')}
            </Button>
          </div>
        </div>
      </ModalDialog>

      {/* EMPTY TRASH CONFIRMATION MODAL */}
      <ModalDialog
        open={isEmptyTrashModalOpen}
        onOpenChange={setIsEmptyTrashModalOpen}
        title={tBilingual('Empty Trash Warning', 'ট্র্যাশ খালি করার সতর্কতা')}
        size="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 dark:bg-rose-950/40 dark:text-rose-200 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">
                {tBilingual(
                  selectedCategory === 'all'
                    ? 'Empty ALL records from Trash?'
                    : `Empty all deleted ${selectedCategory}?`,
                  selectedCategory === 'all'
                    ? 'ট্র্যাশের সকল রেকর্ড স্থায়ীভাবে মুছে ফেলবেন?'
                    : `সকল ${selectedCategory} স্থায়ীভাবে মুছে ফেলবেন?`
                )}
              </span>
              <p className="text-[11px] leading-relaxed">
                {tBilingual(
                  'All matching items will be permanently erased from storage. This operation cannot be undone.',
                  'নির্বাচিত সকল আইটেম ডাটাবেজ থেকে চিরতরে মুছে যাবে। এই কাজটি ফেরানো সম্ভব নয়।'
                )}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button size="sm" variant="outline" onClick={() => setIsEmptyTrashModalOpen(false)}>
              {tBilingual('Cancel', 'বাতিল')}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleEmptyTrash}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              {tBilingual('Empty Trash Now', 'এখনই ট্র্যাশ খালি করুন')}
            </Button>
          </div>
        </div>
      </ModalDialog>
    </div>
  )
}

export default function TrashSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 max-w-7xl animate-pulse p-4 sm:p-0">
          <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-3/4" />
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
        </div>
      }
    >
      <TrashSettingsContent />
    </Suspense>
  )
}
