'use client'

import React, { useState, use } from 'react'
import Link from 'next/link'
import {
  Package,
  ArrowLeft,
  DollarSign,
  Tag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calculator,
  Sliders,
  Layers,
  History,
  ShieldCheck,
  Edit3,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'
import { ProductRecord, PriceHistoryRecord } from '@/types/product.types'

interface ProductDetailPageProps {
  params: Promise<{ tenantSlug: string; id: string }>
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const resolvedParams = use(params)
  const productId = resolvedParams.id
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

  const [products] = useDataStore<ProductRecord[]>(STORAGE_KEYS.PRODUCTS, [])
  const [allHistory] = useDataStore<PriceHistoryRecord[]>(STORAGE_KEYS.PRICE_HISTORY, [])

  const product = products.find((p) => p.id === productId || p.sku === productId)
  const priceHistory = allHistory.filter((h) => product && (h.product_id === product.id || h.product_id === productId))
  const formula = product?.pricing_formula

  if (!product) {
    return (
      <div className="space-y-6 max-w-6xl">
        <Link
          href={`/${slug}/products`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Product Catalog
        </Link>
        <Card className="p-12 text-center border-dashed">
          <Layers className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Product Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            The product record you are looking for does not exist in your catalog.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href={`/${slug}/products`}>View All Products</Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <Link
          href={`/${slug}/products`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Product Catalog
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {product.name}
              </h1>
              <span className="capitalize px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
                {product.product_type.replace('_', ' ')}
              </span>
            </div>
            {product.name_bn && (
              <div className="text-sm font-medium text-slate-500">{product.name_bn}</div>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{product.sku}</span>
              <span>•</span>
              <span className="capitalize">{product.category.replace('_', ' ')}</span>
              <span>•</span>
              <span className="uppercase font-mono font-semibold text-blue-600">Unit: {product.unit}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/${slug}/pricing`}>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs">
                <Calculator className="mr-1.5 h-3.5 w-3.5" />
                Open in Estimator
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-xs font-semibold text-slate-500">Internal Base Cost</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            <CurrencyDisplay amount={product.base_cost} />
          </div>
          <span className="text-[11px] text-slate-400">COGS per {product.unit}</span>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-semibold text-slate-500">Catalog Selling Rate</span>
          <div className="text-2xl font-black text-blue-600 mt-1">
            <CurrencyDisplay amount={product.selling_price} />
          </div>
          <span className="text-[11px] text-blue-600 font-medium">Standard customer price</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-slate-500">Minimum Floor Price</span>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
            <CurrencyDisplay amount={product.min_price} />
          </div>
          <span className="text-[11px] text-amber-600">Discounts cannot fall below this</span>
        </Card>

        <Card className="p-4 bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200">
          <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Standard Margin</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {product.selling_price > 0
              ? Math.round(((product.selling_price - product.base_cost) / product.selling_price) * 100)
              : 0}
            %
          </div>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
            VAT: {product.tax_rate}% NBR compliant
          </span>
        </Card>
      </div>

      {/* Structured Formula Inspector */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sliders className="h-4 w-4 text-blue-600" />
                Structured Pricing Formula Engine
              </CardTitle>
              <CardDescription className="text-xs">
                Declarative, non-eval mathematical rules evaluated safely in real-time.
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
              <ShieldCheck className="h-3 w-3 mr-1" /> Safe Non-Eval Rule
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs font-mono border border-slate-200 dark:border-slate-800">
            <strong>Active Rule Template: </strong>
            <span className="text-blue-600 dark:text-blue-400">{formula?.model || 'dimensional_area'}</span>
            <div className="mt-1 text-slate-500 font-sans text-xs">
              Formula: Area(sft) = Width(ft) × Height(ft) × Qty. Cost = Area × (Material Rate + Print Rate) + Finishing.
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-400">Material Cost Rate</span>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                ৳ {formula?.material_rate || 0} / sft
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-400">Print Service Rate</span>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                ৳ {formula?.print_rate || 0} / sft
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-400">Finishing / Hemming</span>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                ৳ {formula?.finishing_rate || 0} / ft
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-400">Fabrication / Metal</span>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                ৳ {formula?.fabrication_rate || 0} / sft
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historical Price Changes */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <History className="h-4 w-4 text-purple-600" />
            Price Adjustment Audit Trail
          </CardTitle>
          <CardDescription className="text-xs">
            Immutable log of catalog price revisions and reason documentation.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-900/80 font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Effective Date</th>
                <th className="py-3 px-4">Previous Price</th>
                <th className="py-3 px-4">New Price</th>
                <th className="py-3 px-4">Reason for Change</th>
                <th className="py-3 px-4">Authorized By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {priceHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No historical price changes recorded for this item.
                  </td>
                </tr>
              ) : (
                priceHistory.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                    <td className="py-3 px-4 text-slate-500 font-mono">{h.created_at}</td>
                    <td className="py-3 px-4 line-through text-slate-400">
                      <CurrencyDisplay amount={h.old_price} />
                    </td>
                    <td className="py-3 px-4 font-bold text-blue-600">
                      <CurrencyDisplay amount={h.new_price} />
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">{h.reason}</td>
                    <td className="py-3 px-4 text-slate-500">{h.changed_by_name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
