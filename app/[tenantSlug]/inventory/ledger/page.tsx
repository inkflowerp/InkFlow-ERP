'use client'

import React, { useState, use } from 'react'
import Link from 'next/link'
import {
  History,
  ArrowLeft,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  CheckCircle2,
  FileSpreadsheet,
  Building,
  User,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { PageHeader } from '@/components/shared/page-header'
import { FeatureGate } from '@/components/shared/feature-gate'
import { StockLedgerRecord, InventoryTransactionType } from '@/types/inventory.types'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'

interface StockLedgerPageProps {
  params: Promise<{ tenantSlug: string }>
}

export default function StockLedgerPage({ params }: StockLedgerPageProps) {
  const resolvedParams = use(params)
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'
  const [ledger] = useDataStore<StockLedgerRecord[]>(STORAGE_KEYS.STOCK_LEDGER, [])
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')

  const filtered = ledger.filter((entry: StockLedgerRecord) => {
    const matchType = selectedType === 'all' || entry.transaction_type === selectedType
    const matchSearch =
      entry.material_name.toLowerCase().includes(search.toLowerCase()) ||
      (entry.reference_id && entry.reference_id.toLowerCase().includes(search.toLowerCase())) ||
      entry.performed_by_name.toLowerCase().includes(search.toLowerCase())

    return matchType && matchSearch
  })

  const getTxBadge = (type: InventoryTransactionType) => {
    switch (type) {
      case 'purchase':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <ArrowDownLeft className="h-3 w-3" /> Purchase (GRN)
          </span>
        )
      case 'consumption':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <ArrowUpRight className="h-3 w-3" /> Consumption
          </span>
        )
      case 'wastage':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
            <RotateCcw className="h-3 w-3" /> Wastage
          </span>
        )
      case 'adjustment':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            Audit Adjustment
          </span>
        )
      default:
        return (
          <span className="capitalize px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
            {type}
          </span>
        )
    }
  }

  return (
    <FeatureGate feature="inventory_rolls">
      <div className="space-y-6 max-w-6xl">
        {/* Header & Back Link */}
      <div>
        <Link
          href={`/${slug}/inventory`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white mb-3 bangla-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {tBilingual('Back to Materials Hub', 'ম্যাটেরিয়াল হাব-এ ফিরুন')}
        </Link>

        <PageHeader
          titleEn="Immutable Stock Audit Ledger"
          titleBn="স্টক অডিট লেজার"
          descriptionEn="Append-only historical transaction journal recording material inflows, production cuts, and scrap write-offs."
          descriptionBn="ম্যাটেরিয়াল আগমন, উৎপাদনে ব্যবহার এবং অপচয় কর্তনের অপরিবর্তনযোগ্য ঐতিহাসিক খতিয়ান।"
          icon={History}
          iconColor="text-purple-600"
        />
      </div>

      {/* Filter and Search */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by material name, reference PO/Job #, or operator..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {['all', 'purchase', 'consumption', 'wastage', 'adjustment'].map((type) => (
              <Button
                key={type}
                size="sm"
                variant={selectedType === type ? 'default' : 'outline'}
                onClick={() => setSelectedType(type)}
                className="text-xs h-8 px-3 capitalize"
              >
                {type}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Ledger Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-base">Stock Journal Entries ({filtered.length})</CardTitle>
          <CardDescription className="text-xs">
            Every inventory movement is permanently registered with balance after calculations.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-900/80 font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Material Name</th>
                <th className="py-3 px-4">Tx Type</th>
                <th className="py-3 px-4 text-right">Qty Change</th>
                <th className="py-3 px-4 text-right">Balance After</th>
                <th className="py-3 px-4 text-right">Total Cost</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Audited By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((row: StockLedgerRecord) => (
                <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                  <td className="py-3 px-4 text-slate-500 font-mono">{row.created_at}</td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    {row.material_name}
                  </td>
                  <td className="py-3 px-4">{getTxBadge(row.transaction_type)}</td>
                  <td
                    className={`py-3 px-4 text-right font-mono font-bold ${
                      row.quantity_change > 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {row.quantity_change > 0 ? `+${row.quantity_change}` : row.quantity_change} {row.unit}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {row.balance_after} {row.unit}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    <CurrencyDisplay amount={row.total_cost} />
                  </td>
                  <td className="py-3 px-4 font-mono text-blue-600">{row.reference_id || 'N/A'}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{row.performed_by_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      </div>
    </FeatureGate>
  )
}
