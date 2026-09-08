'use client'

import React, { useState, use } from 'react'
import Link from 'next/link'
import {
  Truck,
  ArrowLeft,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Building,
  User,
  Phone,
  FileCheck2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DeliveryChallanRecord, DeliveryStatus } from '@/types/logistics.types'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'

interface DeliveryDetailPageProps {
  params: Promise<{ tenantSlug: string; id: string }>
}

export default function DeliveryChallanDetailPage({ params }: DeliveryDetailPageProps) {
  const resolvedParams = use(params)
  const chId = resolvedParams.id
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

  const [challans] = useDataStore<DeliveryChallanRecord[]>(STORAGE_KEYS.DELIVERY_CHALLANS, [])
  const challan = challans.find((c: DeliveryChallanRecord) => c.id === chId || c.challan_number === chId)

  if (!challan) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Link
          href={`/${slug}/delivery`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Delivery Terminal
        </Link>
        <Card className="p-12 text-center border-dashed">
          <Truck className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Delivery Challan Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            The delivery challan record you are looking for does not exist in your organization.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href={`/${slug}/delivery`}>View All Challans</Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl print:max-w-none print:m-0 print:p-0">
      {/* Non-Print Action Bar */}
      <div className="print:hidden flex items-center justify-between">
        <Link
          href={`/${slug}/delivery`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Delivery Terminal
        </Link>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => window.print()}
            className="bg-slate-900 hover:bg-slate-800 text-xs text-white"
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Delivery Challan
          </Button>
        </div>
      </div>

      {/* =========================================================================
          PRINTABLE OFFICIAL DELIVERY CHALLAN (চালানপত্র)
         ========================================================================= */}
      <div className="bg-white dark:bg-slate-950 p-8 sm:p-12 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs print:border-none print:shadow-none print:p-0 text-xs text-slate-900 dark:text-white space-y-6">
        {/* Header */}
        <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900 dark:border-slate-100">
          <h1 className="text-xl font-black tracking-tight">{company?.name || 'Company Name'}</h1>
          {company?.address && <p className="text-slate-500 text-[11px]">{company.address}</p>}
          <div className="inline-block mt-2 px-5 py-1 rounded-full bg-slate-100 dark:bg-slate-900 font-black text-sm tracking-wider uppercase border border-slate-300 dark:border-slate-700">
            DELIVERY CHALLAN (ডেলিভারি চালানপত্র)
          </div>
        </div>

        {/* Challan & Transit Meta */}
        <div className="grid grid-cols-2 gap-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">Consignee / Deliver To:</span>
            <div className="font-bold text-sm text-slate-900 dark:text-white">{challan.customer_name}</div>
            <div className="text-slate-600 dark:text-slate-300 font-mono flex items-center gap-1">
              <Phone className="h-3 w-3 text-slate-400" /> {challan.customer_phone}
            </div>
            <div className="text-slate-500 flex items-start gap-1 mt-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>{challan.delivery_address}</span>
            </div>
          </div>

          <div className="space-y-1.5 text-right font-mono">
            <div>Challan No: <strong className="text-sm font-black text-blue-600 dark:text-blue-400">{challan.challan_number}</strong></div>
            <div>Order Ref: <strong>{challan.order_number || 'N/A'}</strong></div>
            <div>Scheduled Date: <strong>{challan.scheduled_date}</strong></div>
            <div>Delivery Mode: <strong className="uppercase">{challan.delivery_method.replace('_', ' ')}</strong></div>
            <div className="text-slate-500">Vehicle / Tracking: <strong>{challan.vehicle_info || 'Factory Gate'}</strong></div>
            <div className="text-slate-500">Driver / Dispatcher: <strong>{challan.delivery_person_name || 'Assigned Driver'}</strong></div>
          </div>
        </div>

        {/* Line Items Table */}
        <table className="w-full text-left border-collapse border border-slate-300 dark:border-slate-700">
          <thead className="bg-slate-100 dark:bg-slate-900 font-bold text-[11px]">
            <tr>
              <th className="p-2.5 border border-slate-300 dark:border-slate-700 text-center">SL #</th>
              <th className="p-2.5 border border-slate-300 dark:border-slate-700">Product / Work Description</th>
              <th className="p-2.5 border border-slate-300 dark:border-slate-700 text-center">Dimensions</th>
              <th className="p-2.5 border border-slate-300 dark:border-slate-700 text-center">Quantity</th>
              <th className="p-2.5 border border-slate-300 dark:border-slate-700">Packaging Remarks</th>
            </tr>
          </thead>
          <tbody>
            {challan.items.map((item: any, idx: number) => (
              <tr key={item.id}>
                <td className="p-2.5 border border-slate-300 dark:border-slate-700 text-center font-mono">{idx + 1}</td>
                <td className="p-2.5 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
                  {item.product_description}
                </td>
                <td className="p-2.5 border border-slate-300 dark:border-slate-700 text-center font-mono">
                  {item.dimensions_spec || '—'}
                </td>
                <td className="p-2.5 border border-slate-300 dark:border-slate-700 text-center font-mono font-black text-sm">
                  {item.quantity} {item.unit}
                </td>
                <td className="p-2.5 border border-slate-300 dark:border-slate-700 text-slate-500">
                  {item.remarks || 'Inspected and packed in bubble wrap'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Delivery Terms */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-[11px] text-slate-500 space-y-1">
          <strong>Terms of Transit & Delivery: </strong>
          <p>
            Goods mentioned above have been dispatched in good order and condition. The receiver is requested to verify physical count and condition before signing the acknowledgement slip. No transit claims will be entertained post-acceptance.
          </p>
        </div>

        {/* Dual Signatures */}
        <div className="pt-12 flex justify-between items-end text-xs">
          <div className="text-center space-y-2">
            <div className="font-mono text-slate-400">Driver: {challan.delivery_person_name}</div>
            <div className="border-t border-slate-400 w-52 pt-1 font-bold">
              প্রেরকের স্বাক্ষর (Dispatched By)
            </div>
          </div>

          <div className="text-center space-y-2">
            {challan.receiver_signature ? (
              <div className="font-mono text-emerald-600 font-bold">
                Signed: {challan.receiver_signature} ({challan.receiver_name})
              </div>
            ) : (
              <div className="font-mono text-slate-400 italic">Signature & Seal upon receipt</div>
            )}
            <div className="border-t border-slate-400 w-60 pt-1 font-bold">
              গ্রহীতার স্বাক্ষর ও সিল (Received in Good Condition)
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
