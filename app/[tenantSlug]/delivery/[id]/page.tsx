'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
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
 Share2,
 MessageSquare,
 DollarSign,
 Copy,
 Check,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageContainer } from '@/components/ui/page-container'
import { FeatureGate } from '@/components/shared/feature-gate'
import { DeliveryChallanRecord, DeliveryStatus } from '@/types/logistics.types'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'
import { getChallanByIdAction } from '@/actions/logistics.actions'
import { formatBDT } from '@/lib/formatters'
import { PdfActionButtons } from '@/components/pdf/pdf-action-buttons'
import { ChallanPdfDocument } from '@/components/pdf/documents/challan-pdf-document'
import { generateBangladeshiChallanWhatsAppMessage } from '@/lib/communication/challan-whatsapp'

type CopyType = 'all' | 'customer' | 'gate_pass' | 'office'

export default function DeliveryChallanDetailPage() {
 const params = useParams()
 const pathname = usePathname()
 const chId = (params?.id as string) || ''
 const { company } = useTenant()
 const { locale, tBilingual } = useI18n()
 const routeSlug = (params?.tenantSlug as string) || ''
 const slug = routeSlug || company?.slug || company?.id || 'my-company'

 const [mounted, setMounted] = useState(false)
 const [selectedCopy, setSelectedCopy] = useState<CopyType>('all')
 const [copiedLink, setCopiedLink] = useState(false)

 useEffect(() => {
 setMounted(true)
  }, [])

 const [challans] = useDataStore<DeliveryChallanRecord[]>(STORAGE_KEYS.DELIVERY_CHALLANS, [])
 const [invoices] = useDataStore<any[]>(STORAGE_KEYS.INVOICES, [])
 const [fetchedChallan, setFetchedChallan] = useState<DeliveryChallanRecord | null>(null)
 const [isLoading, setIsLoading] = useState(false)

 React.useEffect(() => {
 async function loadChallan() {
 const targetCompanyId = routeSlug || company?.slug || company?.id || slug
 if (!chId || !targetCompanyId) return
 try {
 setIsLoading(true)
 const res = await getChallanByIdAction(chId, targetCompanyId)
 if (res.success && res.data) {
 setFetchedChallan(res.data)
        }
      } catch (err) {
 console.error('Failed to fetch challan:', err)
      } finally {
 setIsLoading(false)
      }
    }
 loadChallan()
  }, [chId, routeSlug, company?.slug, company?.id, slug])

 const storeChallan = challans.find((c: DeliveryChallanRecord) => c.id === chId || c.challan_number === chId)
 const challan = fetchedChallan || storeChallan

  // Resolve invoice / due amount if not directly on challan
 const relatedInvoice = challan?.invoice_id
    ? invoices.find((inv: any) => inv.id === challan.invoice_id)
    : (challan as any)?.order_id || (challan as any)?.sales_order_id
    ? invoices.find((inv: any) => inv.order_id === (challan as any)?.order_id || inv.order_id === (challan as any)?.sales_order_id)
    : null

 const calculatedDue = challan?.due_amount !== undefined && challan?.due_amount !== null
    ? Number(challan.due_amount)
    : relatedInvoice?.due_amount !== undefined
    ? Number(relatedInvoice.due_amount)
    : 0

 if (!mounted) {
 return (
      <div className="space-y-6 p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-48"/>
        <div className="h-96 bg-muted rounded-xl"/>
      </div>
    )
  }

 if (!challan) {
 return (
      <FeatureGate feature="delivery_challan">
        <div className="space-y-6">
          <Link
 href={getTenantNavHref('/delivery', pathname, slug)}
 className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground dark:hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5"/>
            {locale === 'bn' ? 'ডেলিভারি ড্যাশবোর্ডে ফিরে যান' : 'Back to Delivery Terminal'}
          </Link>
          <Card className="p-12 text-center border-dashed">
            <Truck className="h-10 w-10 text-muted-foreground mx-auto mb-3"/>
            <h2 className="text-base font-bold text-foreground">
              {locale === 'bn' ? 'ডেলিভারি চালান পাওয়া যায়নি' : 'Delivery Challan Not Found'}
            </h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              {locale === 'bn'
                ? 'এই চালান রেকর্ডটি সিস্টেমে বিদ্যমান নেই অথবা মুছে ফেলা হয়েছে।'
                : 'The delivery challan record you are looking for does not exist in your organization.'}
            </p>
            <Button asChild className="mt-4"size="sm">
              <Link href={getTenantNavHref('/delivery', pathname, slug)}>
                {locale === 'bn' ? 'সকল চালান দেখুন' : 'View All Challans'}
              </Link>
            </Button>
          </Card>
        </div>
      </FeatureGate>
    )
  }

 const handleSendWhatsApp = () => {
 const rawMsg = generateBangladeshiChallanWhatsAppMessage(
      { ...challan, due_amount: calculatedDue },
 company?.name || 'InkFlow Printing Press'
    )
 const encoded = encodeURIComponent(rawMsg)
 const phone = challan.customer_phone?.replace(/[^0-9]/g, '') || ''
 const targetUrl = phone
      ? `https://api.whatsapp.com/send?phone=${phone.startsWith('88') ? phone : '88' + phone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`
 window.open(targetUrl, '_blank')
  }

 const handleCopySlip = () => {
 const rawMsg = generateBangladeshiChallanWhatsAppMessage(
      { ...challan, due_amount: calculatedDue },
 company?.name || 'InkFlow Printing Press'
    )
 navigator.clipboard.writeText(rawMsg)
 setCopiedLink(true)
 setTimeout(() => setCopiedLink(false), 2000)
  }

 const copiesToRender: Array<{ key: CopyType; titleBn: string; titleEn: string; color: string; badge: string }> =
 selectedCopy === 'all'
      ? [
          {
 key: 'customer',
 titleBn: 'গ্রাহক কপি (পণ্য গ্রহণের রিসিট)',
 titleEn: 'CUSTOMER COPY',
 color: 'border-primary/20 text-primary bg-primary/10/50',
 badge: '১ম কপি / Customer Acknowledgment Copy',
          },
          {
 key: 'gate_pass',
 titleBn: 'গেট পাস ও ট্রান্সপোর্ট কপি (সিকিউরিটি ও পরিবহন)',
 titleEn: 'GATE PASS & TRANSPORTER COPY',
 color: 'border-primary/20 text-primary bg-primary/10/50',
 badge: '২য় কপি / Factory Gate & Transit Check Copy',
          },
          {
 key: 'office',
 titleBn: 'অফিস ও হিসাব কপি (বকেয়া ও রেকর্ড সংরক্ষণ)',
 titleEn: 'OFFICE & ACCOUNTS COPY',
 color: 'border-success-border text-success bg-success-surface/50',
 badge: '৩য় কপি / Accounts & Due Collection Verification',
          },
        ]
      : selectedCopy === 'customer'
      ? [
          {
 key: 'customer',
 titleBn: 'গ্রাহক কপি (পণ্য গ্রহণের রিসিট)',
 titleEn: 'CUSTOMER COPY',
 color: 'border-primary/20 text-primary bg-primary/10/50',
 badge: 'CUSTOMER COPY (গ্রাহক কপি)',
          },
        ]
      : selectedCopy === 'gate_pass'
      ? [
          {
 key: 'gate_pass',
 titleBn: 'গেট পাস ও ট্রান্সপোর্ট কপি (সিকিউরিটি ও পরিবহন)',
 titleEn: 'GATE PASS & TRANSPORTER COPY',
 color: 'border-primary/20 text-primary bg-primary/10/50',
 badge: 'GATE PASS / TRANSPORTER COPY (গেট পাস কপি)',
          },
        ]
      : [
          {
 key: 'office',
 titleBn: 'অফিস ও হিসাব কপি (বকেয়া ও রেকর্ড সংরক্ষণ)',
 titleEn: 'OFFICE & ACCOUNTS COPY',
 color: 'border-success-border text-success bg-success-surface/50',
 badge: 'OFFICE & ACCOUNTS COPY (অফিস ও হিসাব কপি)',
          },
        ]

 return (
    <FeatureGate feature="delivery_challan">
      <PageContainer className="space-y-6 print:max-w-none print:m-0 print:p-0">
        {/* Top Action Bar (Hidden on Print) */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3 p-4 bg-card rounded-xl border border-border shadow-xs">
          <Link
 href={getTenantNavHref('/delivery', pathname, slug)}
 className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground dark:hover:text-foreground">
            <ArrowLeft className="h-4 w-4"/>
            {locale === 'bn' ? 'ডেলিভারি ড্যাশবোর্ড' : 'Delivery Terminal'}
          </Link>

          {/* 3-Part Copy Mode Selector */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs">
            <button
 onClick={() => setSelectedCopy('all')}
 className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
 selectedCopy === 'all'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {locale === 'bn' ? '৩ কপি একসাথে' : 'All 3 Copies'}
            </button>
            <button
 onClick={() => setSelectedCopy('customer')}
 className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
 selectedCopy === 'customer'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {locale === 'bn' ? 'গ্রাহক কপি' : 'Customer'}
            </button>
            <button
 onClick={() => setSelectedCopy('gate_pass')}
 className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
 selectedCopy === 'gate_pass'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {locale === 'bn' ? 'গেট পাস' : 'Gate Pass'}
            </button>
            <button
 onClick={() => setSelectedCopy('office')}
 className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
 selectedCopy === 'office'
                  ? 'bg-success text-success-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {locale === 'bn' ? 'অফিস কপি' : 'Office/Due'}
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
 size="sm"variant="outline"onClick={handleCopySlip}
 className="text-xs h-8 border-input">
              {copiedLink ? <Check className="mr-1.5 h-3.5 w-3.5 text-success"/> : <Copy className="mr-1.5 h-3.5 w-3.5"/>}
              {copiedLink ? (locale === 'bn' ? 'কপি হয়েছে' : 'Copied') : (locale === 'bn' ? 'স্লিপ কপি' : 'Copy Text')}
            </Button>
            <Button
 size="sm"onClick={handleSendWhatsApp}
 className="bg-success hover:bg-success/90 text-success-foreground text-xs h-8">
              <MessageSquare className="mr-1.5 h-3.5 w-3.5"/>
              {locale === 'bn' ? 'হোয়াটসঅ্যাপে পাঠান' : 'WhatsApp Slip'}
            </Button>
            <PdfActionButtons
 document={
                <ChallanPdfDocument
 challan={challan}
 company={{
 name: company?.name,
 tagline: (company as any)?.tagline || (company as any)?.legal_name || 'Printing & Signage Manufacturing',
 address: company?.address,
 phone: company?.phone,
 email: company?.email,
                  }}
                />
              }
 filename={`CHL-${challan.challan_number}`}
 title={`Delivery Challan #${challan.challan_number}`}
            />
          </div>
        </div>

        {/* DUE ON DELIVERY / COD BANNER (If Due > 0) */}
        {calculatedDue > 0 && (
          <div className="print:hidden p-4 rounded-xl bg-warning/10 border-2 border-warning-border/30 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-warning text-warning-foreground font-bold shrink-0">
                <AlertTriangle className="h-5 w-5"/>
              </div>
              <div>
                <h3 className="text-sm font-black text-warning">
                  {locale === 'bn' ? 'বকেয়া বিল সতর্কতা (Cash On Delivery - COD)' : 'Due on Delivery Alert (Cash On Delivery - COD)'}
                </h3>
                <p className="text-xs text-warning mt-0.5">
                  {locale === 'bn'
                    ? `ডেলিভারির সময় গ্রাহক থেকে অবশিষ্ট ${formatBDT(calculatedDue)} নগদ/বিকাশ/নগদ বা ব্যাংকের মাধ্যমে গ্রহণ নিশ্চিত করুন।`
                    : `Please ensure remaining balance of ${formatBDT(calculatedDue)} is collected via Cash / bKash / Bank before cargo handover.`}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs font-bold uppercase tracking-wider text-warning">
                {locale === 'bn' ? 'মোট বকেয়া' : 'Pending Due'}
              </div>
              <div className="text-lg font-black text-warning tabular-nums">
                {formatBDT(calculatedDue)}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
 RENDER PRINTABLE CHALLAN COPIES (ডেলিভারি চালানপত্র)
           ========================================================================= */}
        <div className="space-y-8 print:space-y-0">
          {copiesToRender.map((copyMeta, copyIdx) => (
            <div
 key={copyMeta.key}
 className={`bg-card text-foreground print:bg-white print:text-foreground print: print: p-8 sm:p-12 rounded-xl border border-border shadow-sm print:border-none print:shadow-none print:p-0 text-xs space-y-5 print:w-full ${
 copyIdx > 0 ? 'print:break-before-page' : ''
              }`}
            >
              {/* Header */}
              <div className="text-center space-y-1 pb-3 border-b-2 border-border print:border-border relative">
                <div className="absolute right-0 top-0 text-xs tabular-nums px-2 py-0.5 rounded bg-muted print:bg-muted font-bold border border-input text-foreground print:text-foreground">
                  {copyMeta.badge}
                </div>
                <h1 className="text-xl font-black tracking-tight print:text-foreground">{company?.name || 'InkFlow Printing & Signage'}</h1>
                {company?.address && <p className="text-muted-foreground print:text-muted-foreground text-xs">{company.address}</p>}
                
                <div className="inline-block mt-2 px-6 py-1 rounded-full bg-surface-inset text-foreground print:bg-surface-inset print:text-white font-black text-xs tracking-wider uppercase">
 DELIVERY CHALLAN • ডেলিভারি চালানপত্র
                </div>
                <div className="text-xs font-bold text-muted-foreground print:text-foreground">
                  {copyMeta.titleBn} — ({copyMeta.titleEn})
                </div>
              </div>

              {/* Challan & Transit Meta */}
              <div className="grid grid-cols-2 gap-6 p-4 rounded-xl bg-muted print:bg-muted border border-border print:border-input text-xs print:text-foreground">
                <div className="space-y-1.5">
                  <span className="text-xs uppercase font-bold text-muted-foreground print:text-muted-foreground">
 Consignee / Deliver To (প্রাপক):
                  </span>
                  <div className="font-bold text-sm text-foreground print:text-foreground">{challan.customer_name}</div>
                  <div className="text-muted-foreground print:text-foreground tabular-nums flex items-center gap-1">
                    <Phone className="h-3 w-3 text-muted-foreground"/> {challan.customer_phone}
                  </div>
                  <div className="text-muted-foreground print:text-muted-foreground flex items-start gap-1 mt-1">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5"/>
                    <span>{challan.delivery_address || 'Factory Pickup / Counter Delivery'}</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-right tabular-nums print:text-foreground">
                  <div>
 Challan No: <strong className="text-sm font-black text-primary print:text-foreground">{challan.challan_number}</strong>
                  </div>
                  <div>Order Ref: <strong className="print:text-foreground">{challan.order_number || 'N/A'}</strong></div>
                  <div>Invoice Ref: <strong className="print:text-foreground">{challan.invoice_number || relatedInvoice?.invoice_number || 'N/A'}</strong></div>
                  <div>Scheduled Date: <strong className="print:text-foreground">{challan.scheduled_date}</strong></div>
                  <div>
 Delivery Mode:{' '}
                    <strong className="uppercase print:text-foreground">
                      {challan.delivery_method === 'courier'
                        ? 'কুরিয়ার (Courier)'
                        : challan.delivery_method === 'company_vehicle'
                        ? 'নিজস্ব গাড়ি (Vehicle)'
                        : challan.delivery_method === 'local_transport'
                        ? 'লোকাল পরিবহন (Local Transport)'
                        : 'পিকআপ (Pickup)'}
                    </strong>
                  </div>
                  <div className="text-muted-foreground print:text-muted-foreground">
 Vehicle / Tracking: <strong className="print:text-foreground">{challan.vehicle_info || 'Factory Gate'}</strong>
                  </div>
                  <div className="text-muted-foreground print:text-muted-foreground">
 Driver / Dispatcher: <strong className="print:text-foreground">{challan.delivery_person_name || 'Assigned Driver'}</strong>
                    {challan.delivery_person_phone && ` (${challan.delivery_person_phone})`}
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <table className="w-full text-left border-collapse border border-input print:border-input text-xs print:text-foreground">
                <thead className="bg-muted print:bg-muted font-bold text-xs print:text-foreground">
                  <tr>
                    <th className="p-2.5 border border-input print:border-input text-center w-12">ক্র./SL</th>
                    <th className="p-2.5 border border-input print:border-input">
                      পণ্যের বিবরণ (Product / Job Description)
                    </th>
                    <th className="p-2.5 border border-input print:border-input text-center w-28">
                      সাইজ (Size / Dimensions)
                    </th>
                    <th className="p-2.5 border border-input print:border-input text-center w-24">
                      পরিমাণ (Qty)
                    </th>
                    <th className="p-2.5 border border-input print:border-input">
                      প্যাকিং / ফিনিশিং রিমার্কস (Packaging Remarks)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(challan.items || []).map((item: any, idx: number) => (
                    <tr key={item.id || idx}>
                      <td className="p-2.5 border border-input print:border-input text-center tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="p-2.5 border border-input print:border-input font-bold text-foreground print:text-foreground">
                        {item.product_description}
                        {item.is_delivered && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-success-surface text-success border border-success-border print:hidden">
                            ডেলিভার্ড
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 border border-input print:border-input text-center tabular-nums">
                        {item.dimensions_spec || '—'}
                      </td>
                      <td className="p-2.5 border border-input print:border-input text-center tabular-nums font-black text-sm print:text-foreground">
                        {item.quantity} {item.unit || 'pcs'}
                      </td>
                      <td className="p-2.5 border border-input print:border-input text-muted-foreground print:text-muted-foreground">
                        {item.remarks || 'Inspected and packed securely in bubble/craft paper'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Due on Delivery Box for Accounts Copy & General Copy */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-muted print:bg-muted rounded-lg text-xs text-muted-foreground print:text-foreground space-y-1 border border-border print:border-input">
                  <strong className="print:text-foreground text-foreground">
                    ডেলিভারির নিয়মাবলী ও শর্তসমূহ (Terms of Delivery):
                  </strong>
                  <p>
                    উপরে বর্ণিত পণ্য অক্ষত ও সঠিক সংখ্যায় বুঝিয়া প্রদান করা হইল। পণ্য গ্রহণের সময় গণনা ও সাইজ পরীক্ষা করে রিসিট স্বাক্ষর করুন। পরবর্তী কোনো আপত্তি বা অভিযোগ গ্রহণযোগ্য নয়।
                  </p>
                </div>

                {/* Due / Payment Verification Block */}
                <div className="p-3 bg-muted print:bg-muted rounded-lg border border-border print:border-input space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground print:text-foreground">
                      পেমেন্ট / বিল হিসাব (Payment Status):
                    </span>
                    {calculatedDue > 0 ? (
                      <span className="text-xs font-black px-2 py-0.5 rounded bg-warning/20 text-warning border border-warning-border/30">
                        বকেয়া বাকি আছে (DUE ON DELIVERY)
                      </span>
                    ) : (
                      <span className="text-xs font-black px-2 py-0.5 rounded bg-success/20 text-success border border-success-border/30">
                        সম্পূর্ণ পরিশোধিত (PAID IN FULL)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border print:border-input">
                    <span className="text-muted-foreground print:text-muted-foreground">ডেলিভারি কালেকশন / বকেয়া:</span>
                    <strong className="text-sm font-black tabular-nums text-foreground print:text-foreground">
                      {formatBDT(calculatedDue)}
                    </strong>
                  </div>
                  {copyMeta.key === 'office' && (
                    <div className="pt-2 text-xs text-muted-foreground print:text-foreground space-y-1 border-t border-dashed border-input">
                      <div>[ ] নগদ টাকা আদায় করা হয়েছে (MR No: _________)</div>
                      <div>[ ] বিকাশ/নগদ/ব্যাংক ট্রান্সফার ভেরিফাইড (Trx ID: _________)</div>
                    </div>
                  )}
                </div>
              </div>

              {/* 3-Party Signatures Block */}
              <div className="pt-10 grid grid-cols-3 gap-4 text-xs page-break-inside-avoid print-avoid-break">
                <div className="text-center space-y-1.5">
                  <div className="tabular-nums text-muted-foreground print:text-muted-foreground text-xs">
                    {(challan as any).dispatched_by_name || (challan as any).created_by_name || 'Warehouse In-charge'}
                  </div>
                  <div className="border-t border-input pt-1 font-bold print:text-foreground">
                    প্রেরকের স্বাক্ষর
                    <div className="text-xs font-normal text-muted-foreground print:text-muted-foreground">(Dispatched By)</div>
                  </div>
                </div>

                <div className="text-center space-y-1.5">
                  <div className="tabular-nums text-muted-foreground print:text-muted-foreground text-xs">
                    {challan.delivery_person_name || 'Driver / Carrier'}
                  </div>
                  <div className="border-t border-input pt-1 font-bold print:text-foreground">
                    বাহকের স্বাক্ষর
                    <div className="text-xs font-normal text-muted-foreground print:text-muted-foreground">(Carried By / Driver)</div>
                  </div>
                </div>

                <div className="text-center space-y-1.5">
                  {challan.receiver_signature ? (
                    <div className="tabular-nums text-success print:text-success font-bold text-xs">
 Signed: {challan.receiver_signature} ({challan.receiver_name})
                    </div>
                  ) : (
                    <div className="tabular-nums text-muted-foreground print:text-muted-foreground italic text-xs">
                      সিল ও স্বাক্ষর (Seal & Sign)
                    </div>
                  )}
                  <div className="border-t border-input pt-1 font-bold print:text-foreground">
                    গ্রহীতার স্বাক্ষর ও সিল
                    <div className="text-xs font-normal text-muted-foreground print:text-muted-foreground">(Received in Good Condition)</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PageContainer>
    </FeatureGate>
  )
}

