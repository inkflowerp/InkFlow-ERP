'use client'

import React, { useState } from 'react'
import {
  Layers,
  Sparkles,
  Search,
  Tag,
  DollarSign,
  TrendingUp,
  Percent,
  Clock,
  Printer,
  Edit2,
  Plus,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import type { ProductRecord } from '@/types/product.types'
import { formatBDT } from '@/lib/formatters'

interface PricingServicesTariffsProps {
  products: ProductRecord[]
  onOpenEditProductPrice: (product: ProductRecord) => void
  tenantSlug: string
}

export function PricingServicesTariffs({
  products,
  onOpenEditProductPrice,
  tenantSlug,
}: PricingServicesTariffsProps) {
  const { tBilingual } = useI18n()
  const [search, setSearch] = useState('')

  // Filter custom print services
  const serviceProducts = products.filter((p) => {
    const isService =
      p.product_type === 'print_service' ||
      p.product_type === 'fabrication_service' ||
      p.product_type === 'installation_service' ||
      p.product_type === 'custom_job' ||
      p.product_type === 'service' ||
      p.product_type === 'SERVICE' ||
      p.pricing_method === 'per_sft' ||
      p.pricing_method === 'per_area' ||
      p.pricing_method === 'dimensional_area' ||
      (p.pricing_method as any) === 'per_sqft' ||
      p.unit === 'sft' ||
      p.unit === 'sqm' ||
      p.unit === 'rft' ||
      p.unit === 'running_feet'

    if (!isService) return false

    if (search) {
      const q = search.toLowerCase()
      return (
        p.name.toLowerCase().includes(q) ||
        (p.name_bn && p.name_bn.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
      )
    }
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {tBilingual('Custom Printing & Signage Service Tariffs', 'কাস্টম প্রিন্টিং ও সাইনেজ সেবা ট্যারিফ')}
          </h3>
          <p className="text-xs text-slate-500">
            {tBilingual(
              'Dimensional SFT/SQM rate cards for Flex, Vinyl, Backlit, Canvas, Frosted, and Fabric print services.',
              'ব্যানার, ভিনাইল, ব্যাকলিট এবং ক্যানভাস প্রিন্টিংয়ের প্রতি স্কয়ার ফিট রেট কার্ড।'
            )}
          </p>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search print services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-8"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {serviceProducts.map((p) => {
          const baseSell = Number(p.selling_price) || Number((p as any).base_price) || 0
          const baseCost = Number(p.base_cost) || Number((p as any).cost_price) || 0
          const minBillable = Number(p.min_billable_quantity) || Number(p.service_config?.min_billable_qty) || 0
          const minCharge = Number(p.minimum_charge) || Number(p.service_config?.min_charge) || Number(p.service_config?.minimum_charge) || 0
          const tiers = (p.price_tiers as any) || {}
          const resellerPrice = tiers.reseller ?? (baseSell > 0 ? Math.round(baseSell * 0.85) : 0)
          const corporatePrice = tiers.corporate ?? (baseSell > 0 ? Math.round(baseSell * 0.9) : 0)

          const marginPct =
            baseSell > 0 && baseCost > 0
              ? Math.round(((baseSell - baseCost) / baseSell) * 100)
              : null

          return (
            <Card
              key={p.id}
              className="rounded-xl shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                {/* Header */}
                <div className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{p.name}</div>
                    {p.name_bn && (
                      <div className="text-xs text-teal-700 dark:text-teal-400 font-medium bangla-text mt-0.5">
                        {p.name_bn}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono font-bold bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 shrink-0">
                    {p.unit || 'sft'}
                  </Badge>
                </div>

                {/* Rates Grid */}
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Retail Rate</span>
                      <div className="text-base font-black text-slate-900 dark:text-white font-mono">
                        {formatBDT(baseSell)} <span className="text-[10px] text-slate-400 font-normal">/{p.unit || 'sft'}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Reseller Wholesale</span>
                      <div className="text-base font-bold text-blue-700 dark:text-blue-400 font-mono">
                        {formatBDT(resellerPrice)}
                      </div>
                    </div>
                  </div>

                  {/* Specifications */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Base Material Cost:</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {baseCost > 0 ? formatBDT(baseCost) : '—'}
                      </span>
                    </div>

                    {minBillable > 0 && (
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Min Billable Area:</span>
                        <span className="font-mono font-semibold">{minBillable} sft</span>
                      </div>
                    )}

                    {minCharge > 0 && (
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Min Job Charge:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatBDT(minCharge)}
                        </span>
                      </div>
                    )}

                    {marginPct !== null && (
                      <div className="flex justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">Gross Margin:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {marginPct}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 capitalize">{p.category || 'Print Service'}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenEditProductPrice(p)}
                  className="h-7 px-2.5 text-xs font-bold text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-800"
                >
                  <Edit2 className="h-3 w-3 mr-1 text-teal-600" />
                  {tBilingual('Edit Tariff', 'দর পরিবর্তন')}
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
