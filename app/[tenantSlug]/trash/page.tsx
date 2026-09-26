'use client'

import React, { useState, useMemo, useEffect } from 'react'
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
  ExternalLink,
  Clock,
  Info,
  ShieldAlert,
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
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { TrashRepository } from '@/lib/repositories/trash.repository'
import {
  TRASH_RETENTION_DAYS,
  getTrashDaysRemaining,
  type TrashCategory,
  type TrashRecord,
} from '@/types/trash.types'
import { cn } from '@/lib/utils'

function TrashContent() {
  const searchParams = useSearchParams()
  const tabParam = searchParams?.get('tab')
  const { company } = useTenant()
  const { tBilingual } = useI18n()
  const companyId = company?.id || 'default'

  const [trashItems, setTrashItems] = useDataStore<TrashRecord[]>(STORAGE_KEYS.TRASH_ITEMS, [])
  const [selectedCategory, setSelectedCategory] = useState<string>(tabParam || 'all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (tabParam) {
      setSelectedCategory(tabParam)
    }
    // Auto-purge any records older than 30 days on page load
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
            <FileSpreadsheet className="h-3 w-3" />
            {tBilingual('Quotation', 'কোটেশন')}
          </span>
        )
      case 'invoices':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Receipt className="h-3 w-3" />
            {tBilingual('Invoice', 'ইনভয়েস')}
          </span>
        )
      case 'customers':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">
            <Users className="h-3 w-3" />
            {tBilingual('Customer', 'গ্রাহক')}
          </span>
        )
      case 'products':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300">
            <Package className="h-3 w-3" />
            {tBilingual('Product', 'পণ্য')}
          </span>
        )
      case 'materials':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-bold bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300">
            <Boxes className="h-3 w-3" />
            {tBilingual('Material / Stock', 'কাঁচামাল ও স্টক')}
          </span>
        )
      case 'suppliers':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300">
            <Truck className="h-3 w-3" />
            {tBilingual('Supplier', 'সরবরাহকারী')}
          </span>
        )
      default:
        return <Badge variant="outline">{category}</Badge>
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <PageHeader
        titleEn="Trash & Recycle Bin"
        titleBn="রিসাইকেল বিন ও ট্র্যাশ"
        descriptionEn="Safely restore or permanently purge deleted quotations, invoices, customers, products, inventory items, and suppliers."
        descriptionBn="মুছে ফেলা কোটেশন, ইনভয়েস, গ্রাহক, পণ্য, কাঁচামাল ও সরবরাহকারীর তথ্য রিস্টোর বা স্থায়ীভাবে মুছে ফেলুন।"
        icon={Trash2}
        iconColor="text-rose-600"
        actions={
          counts.total > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEmptyTrashModalOpen(true)}
              className="text-xs font-bold text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-200 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
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
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
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
                'Items in Trash are permanently deleted from database and backend automatically after 30 days.',
                'ট্র্যাশে থাকা আইটেমসমূহ ৩০ দিন পর ডাটাবেজ ও ব্যাকএন্ড থেকে স্থায়ীভাবে স্বয়ংক্রিয়ভাবে মুছে যায়।'
              )}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <Badge variant="outline" className="bg-white/80 dark:bg-amber-900/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-semibold text-2xs px-2.5 py-0.5">
            <ShieldAlert className="h-3 w-3 mr-1 text-amber-600 dark:text-amber-400" />
            {TRASH_RETENTION_DAYS} Days Retention
          </Badge>
        </div>
      </div>

      {/* CATEGORY SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* All Items */}
        <Card
          onClick={() => setSelectedCategory('all')}
          className={cn(
            'p-3 cursor-pointer transition-all hover:border-slate-400',
            selectedCategory === 'all' && 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 dark:bg-rose-950/20'
          )}
        >
          <span className="text-2xs font-bold text-slate-500 block">{tBilingual('All Items', 'সব আইটেম')}</span>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{counts.total}</div>
        </Card>

        {/* Quotations */}
        <Card
          onClick={() => setSelectedCategory('quotations')}
          className={cn(
            'p-3 cursor-pointer transition-all hover:border-blue-400 border-l-4 border-l-blue-500',
            selectedCategory === 'quotations' && 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20'
          )}
        >
          <span className="text-2xs font-bold text-blue-700 dark:text-blue-300 block">{tBilingual('Quotations', 'কোটেশন')}</span>
          <div className="text-xl font-black text-blue-700 dark:text-blue-300 mt-0.5">{counts.quotations}</div>
        </Card>

        {/* Invoices */}
        <Card
          onClick={() => setSelectedCategory('invoices')}
          className={cn(
            'p-3 cursor-pointer transition-all hover:border-emerald-400 border-l-4 border-l-emerald-500',
            selectedCategory === 'invoices' && 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20'
          )}
        >
          <span className="text-2xs font-bold text-emerald-700 dark:text-emerald-300 block">{tBilingual('Invoices', 'ইনভয়েস')}</span>
          <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{counts.invoices}</div>
        </Card>

        {/* Customers */}
        <Card
          onClick={() => setSelectedCategory('customers')}
          className={cn(
            'p-3 cursor-pointer transition-all hover:border-purple-400 border-l-4 border-l-purple-500',
            selectedCategory === 'customers' && 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/20 dark:bg-purple-950/20'
          )}
        >
          <span className="text-2xs font-bold text-purple-700 dark:text-purple-300 block">{tBilingual('Customers', 'গ্রাহক')}</span>
          <div className="text-xl font-black text-purple-700 dark:text-purple-300 mt-0.5">{counts.customers}</div>
        </Card>

        {/* Products */}
        <Card
          onClick={() => setSelectedCategory('products')}
          className={cn(
            'p-3 cursor-pointer transition-all hover:border-cyan-400 border-l-4 border-l-cyan-500',
            selectedCategory === 'products' && 'border-cyan-500 ring-2 ring-cyan-500/20 bg-cyan-50/20 dark:bg-cyan-950/20'
          )}
        >
          <span className="text-2xs font-bold text-cyan-700 dark:text-cyan-300 block">{tBilingual('Products', 'পণ্য')}</span>
          <div className="text-xl font-black text-cyan-700 dark:text-cyan-300 mt-0.5">{counts.products}</div>
        </Card>

        {/* Materials */}
        <Card
          onClick={() => setSelectedCategory('materials')}
          className={cn(
            'p-3 cursor-pointer transition-all hover:border-amber-400 border-l-4 border-l-amber-500',
            selectedCategory === 'materials' && 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20 dark:bg-amber-950/20'
          )}
        >
          <span className="text-2xs font-bold text-amber-700 dark:text-amber-300 block">{tBilingual('Materials', 'কাঁচামাল')}</span>
          <div className="text-xl font-black text-amber-700 dark:text-amber-300 mt-0.5">{counts.materials}</div>
        </Card>

        {/* Suppliers */}
        <Card
          onClick={() => setSelectedCategory('suppliers')}
          className={cn(
            'p-3 cursor-pointer transition-all hover:border-indigo-400 border-l-4 border-l-indigo-500',
            selectedCategory === 'suppliers' && 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20'
          )}
        >
          <span className="text-2xs font-bold text-indigo-700 dark:text-indigo-300 block">{tBilingual('Suppliers', 'সরবরাহকারী')}</span>
          <div className="text-xl font-black text-indigo-700 dark:text-indigo-300 mt-0.5">{counts.suppliers}</div>
        </Card>
      </div>

      {/* FILTER CHIPS & SEARCH */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {[
            { id: 'all', labelEn: 'All Trashed Items', labelBn: 'সব ট্র্যাশ', count: counts.total },
            { id: 'quotations', labelEn: 'Quotations', labelBn: 'কোটেশন', count: counts.quotations },
            { id: 'invoices', labelEn: 'Invoices', labelBn: 'ইনভয়েস', count: counts.invoices },
            { id: 'customers', labelEn: 'Customers', labelBn: 'গ্রাহক', count: counts.customers },
            { id: 'products', labelEn: 'Products', labelBn: 'পণ্য', count: counts.products },
            { id: 'materials', labelEn: 'Materials / Inventory', labelBn: 'কাঁচামাল ও স্টক', count: counts.materials },
            { id: 'suppliers', labelEn: 'Suppliers', labelBn: 'সরবরাহকারী', count: counts.suppliers },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5',
                selectedCategory === tab.id
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              <span>{tBilingual(tab.labelEn, tab.labelBn)}</span>
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-2xs',
                  selectedCategory === tab.id
                    ? 'bg-rose-800 text-rose-100'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder={tBilingual(
              'Search trashed items by title, reference #, deleted user...',
              'শিরোনাম, রেফারেন্স নম্বর বা ব্যবহারকারী দিয়ে খুঁজুন...'
            )}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
      </Card>

      {/* TRASH DIRECTORY TABLE */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <span>{tBilingual('Deleted Items in Trash', 'ট্র্যাশে থাকা আইটেমসমূহ')}</span>
              <Badge variant="secondary" className="text-xs">
                {filteredItems.length}
              </Badge>
            </CardTitle>
            <span className="text-xs text-slate-400">
              {tBilingual('Soft-deleted items are safely preserved until permanent wipe', 'রিস্টোর বা স্থায়ীভাবে ডিলিট করুন')}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">{tBilingual('Category', 'ক্যাটাগরি')}</th>
                  <th className="py-3 px-4">{tBilingual('Item Title / Name', 'নাম ও বিবরণ')}</th>
                  <th className="py-3 px-4">{tBilingual('Reference / Code', 'রেফারেন্স / কোড')}</th>
                  <th className="py-3 px-4">{tBilingual('Deleted Date', 'মুছে ফেলার তারিখ')}</th>
                  <th className="py-3 px-4">{tBilingual('Auto-Delete in', 'স্বয়ংক্রিয় ডিলিট')}</th>
                  <th className="py-3 px-4">{tBilingual('Deleted By', 'মুছেছেন')}</th>
                  <th className="py-3 px-4 text-right">{tBilingual('Actions', 'অ্যাকশন')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                      <Trash2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      {tBilingual('Trash is clean! No deleted items found.', 'ট্র্যাশ খালি! কোন মুছে ফেলা আইটেম নেই।')}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const daysLeft = getTrashDaysRemaining(item.expires_at, item.deleted_at, TRASH_RETENTION_DAYS)
                    const isUrgent = daysLeft <= 3

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                        {/* Category */}
                        <td className="py-3.5 px-4">
                          {getCategoryBadge(item.category)}
                        </td>

                        {/* Title & Subtitle */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {item.title}
                          </div>
                          {item.subtitle && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {item.subtitle}
                            </div>
                          )}
                        </td>

                        {/* Reference Number */}
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                          {item.reference_number || '—'}
                        </td>

                        {/* Deleted Date */}
                        <td className="py-3.5 px-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>{new Date(item.deleted_at).toLocaleString()}</span>
                          </div>
                        </td>

                        {/* Auto-Delete Countdown */}
                        <td className="py-3.5 px-4 text-xs">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 font-semibold text-2xs px-2 py-0.5 rounded-full border',
                              isUrgent
                                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
                                : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900'
                            )}
                            title={`Expires on ${new Date(item.expires_at || Date.now()).toLocaleDateString()}`}
                          >
                            <Clock className="h-3 w-3" />
                            {daysLeft === 0
                              ? tBilingual('Expiring today', 'আজ মেয়াদ শেষ')
                              : `${daysLeft} ${tBilingual('days left', 'দিন বাকি')}`}
                          </span>
                        </td>

                        {/* Deleted By */}
                        <td className="py-3.5 px-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span>{item.deleted_by_name || 'System User'}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Inspect Snapshot */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setInspectedItem(item)
                                setIsInspectModalOpen(true)
                              }}
                              className="h-7 px-2 text-xs text-slate-500 hover:text-indigo-600"
                              title="Inspect Payload"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>

                            {/* Restore Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRestore(item)}
                              className="h-7 px-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              {tBilingual('Restore', 'রিস্টোর')}
                            </Button>

                            {/* Delete Forever Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setItemToPermanentDelete(item)
                                setIsPermanentModalOpen(true)
                              }}
                              className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200 dark:border-rose-900"
                              title="Permanent Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                {tBilingual('Trash is clean! No deleted items found.', 'ট্র্যাশ খালি! কোন মুছে ফেলা আইটেম নেই।')}
              </div>
            ) : (
              filteredItems.map((item) => {
                const daysLeft = getTrashDaysRemaining(item.expires_at, item.deleted_at, TRASH_RETENTION_DAYS)
                const isUrgent = daysLeft <= 3

                return (
                  <div key={item.id} className="p-4 space-y-2 hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getCategoryBadge(item.category)}
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-2xs font-semibold px-2 py-0.2 rounded-full border',
                            isUrgent
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                              : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                          )}
                        >
                          <Clock className="h-2.5 w-2.5" />
                          {daysLeft === 0 ? 'Expires today' : `${daysLeft}d left`}
                        </span>
                      </div>
                      <span className="text-2xs font-mono text-slate-400">
                        {new Date(item.deleted_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{item.title}</div>
                      {item.subtitle && <div className="text-xs text-slate-500">{item.subtitle}</div>}
                      {item.reference_number && (
                        <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                          Ref: {item.reference_number}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-2xs text-slate-400">
                        By: {item.deleted_by_name || 'System User'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestore(item)}
                          className="h-7 px-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 border-emerald-200"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setItemToPermanentDelete(item)
                            setIsPermanentModalOpen(true)
                          }}
                          className="h-7 px-2 text-xs text-rose-600 border-rose-200"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* MODAL: PERMANENT DELETE CONFIRMATION */}
      <ModalDialog
        open={isPermanentModalOpen}
        onOpenChange={setIsPermanentModalOpen}
        title="Permanently Delete Item? / স্থায়ীভাবে মুছবেন?"
        description="This action cannot be undone. All data will be permanently wiped from the system."
        hideFooter
      >
        <div className="space-y-4 pt-1">
          {itemToPermanentDelete && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-xs space-y-1">
              <div className="font-bold text-rose-900 dark:text-rose-200">
                {itemToPermanentDelete.title}
              </div>
              <div className="text-rose-700 dark:text-rose-300">
                Category: {itemToPermanentDelete.category} | Ref: {itemToPermanentDelete.reference_number || 'N/A'}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setIsPermanentModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handlePermanentDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete Permanently
            </Button>
          </div>
        </div>
      </ModalDialog>

      {/* MODAL: EMPTY TRASH CONFIRMATION */}
      <ModalDialog
        open={isEmptyTrashModalOpen}
        onOpenChange={setIsEmptyTrashModalOpen}
        title="Empty Trash? / ট্র্যাশ সম্পূর্ণ খালি করবেন?"
        description="Are you sure you want to permanently delete all items in this trash category? This action cannot be reversed."
        hideFooter
      >
        <div className="space-y-4 pt-1">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-900 dark:text-amber-200">
            <strong>Target Category:</strong> {selectedCategory === 'all' ? 'All Trashed Items' : selectedCategory} ({filteredItems.length} items to purge).
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setIsEmptyTrashModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleEmptyTrash}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Purge All Now
            </Button>
          </div>
        </div>
      </ModalDialog>

      {/* MODAL: INSPECT ITEM PAYLOAD */}
      <ModalDialog
        open={isInspectModalOpen}
        onOpenChange={setIsInspectModalOpen}
        title={`Inspecting: ${inspectedItem?.title || 'Trashed Item'}`}
        description="Raw snapshot preserved at the moment of deletion."
        hideFooter
      >
        <div className="space-y-4 pt-1 max-h-[60vh] overflow-y-auto">
          <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-2xs font-mono overflow-x-auto">
            {JSON.stringify(inspectedItem?.payload || {}, null, 2)}
          </pre>
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setIsInspectModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </ModalDialog>
    </div>
  )
}

export default function TrashPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
          <Trash2 className="h-6 w-6 text-slate-400 animate-pulse" />
          <p className="text-xs text-slate-500">Loading Trash Bin...</p>
        </div>
      }
    >
      <TrashContent />
    </React.Suspense>
  )
}

