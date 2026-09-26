'use client'

import React, { useState } from 'react'
import {
  Package,
  Search,
  Tag,
  DollarSign,
  TrendingUp,
  Percent,
  Edit2,
  Boxes,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import type { ProductRecord } from '@/types/product.types'
import { formatBDT } from '@/lib/formatters'

interface PricingProductsTariffsProps {
  products: ProductRecord[]
  onOpenEditProductPrice: (product: ProductRecord) => void
  tenantSlug: string
}

export function PricingProductsTariffs({
  products,
  onOpenEditProductPrice,
  tenantSlug,
}: PricingProductsTariffsProps) {
  const { tBilingual } = useI18n()
  const [search, setSearch] = useState('')

  // Filter ready products / hardware
  const physicalProducts = products.filter((p) => {
    const isPhysical =
      p.product_type === 'ready_product' ||
      p.product_type === 'finished_product' ||
      p.product_type === 'PRODUCT' ||
      p.product_type === 'material' ||
      (p.product_type as any) === 'physical' ||
      (p.product_type as any) === 'raw_material' ||
      p.unit === 'piece' ||
      p.unit === 'sheet' ||
      p.unit === 'roll' ||
      p.unit === 'set' ||
      p.unit === 'pcs'

    if (!isPhysical) return false

    if (search) {
      const q = search.toLowerCase()
      return (
        p.name.toLowerCase().includes(q) ||
        (p.name_bn && p.name_bn.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q))
      )
    }
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {tBilingual('Ready Products & Display Hardware Tariffs', 'রেডি প্রোডাক্ট ও ডিসপ্লে হার্ডওয়্যার ট্যারিফ')}
          </h3>
          <p className="text-xs text-slate-500">
            {tBilingual(
              'Pricing for X-Banner stands, Rollup standees, Acrylic sheets, MS frames, and POP display hardware.',
              'রোলআপ স্ট্যান্ডি, এক্রিলিক শিট ও সাইনেজ হার্ডওয়্যারের পাইকারি ও খুচরা দর।'
            )}
          </p>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search physical goods..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-8"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {physicalProducts.map((p) => {
          const baseSell = Number(p.selling_price) || Number((p as any).base_price) || 0
          const baseCost = Number(p.base_cost) || Number((p as any).cost_price) || 0
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
                    {p.sku && (
                      <div className="text-2xs text-slate-400 font-mono mt-0.5">SKU: {p.sku}</div>
                    )}
                  </div>
                  <Badge variant="outline" className="text-2xs uppercase font-mono font-bold bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 shrink-0">
                    {p.unit || 'piece'}
                  </Badge>
                </div>

                {/* Rates Grid */}
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl text-xs">
                    <div>
                      <span className="text-2xs text-slate-400 uppercase font-semibold">Retail Price</span>
                      <div className="text-base font-black text-slate-900 dark:text-white font-mono">
                        {formatBDT(baseSell)}
                      </div>
                    </div>

                    <div>
                      <span className="text-2xs text-slate-400 uppercase font-semibold">Wholesale Tier</span>
                      <div className="text-base font-bold text-blue-700 dark:text-blue-400 font-mono">
                        {formatBDT(resellerPrice)}
                      </div>
                    </div>
                  </div>

                  {/* Cost & Margin */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-2xs text-slate-500">
                      <span>Acquisition Cost:</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {baseCost > 0 ? formatBDT(baseCost) : '—'}
                      </span>
                    </div>

                    {marginPct !== null && (
                      <div className="flex justify-between text-2xs pt-1 border-t border-slate-100 dark:border-slate-800">
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
                <span className="text-2xs text-slate-400 capitalize">{p.category || 'Hardware'}</span>
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
