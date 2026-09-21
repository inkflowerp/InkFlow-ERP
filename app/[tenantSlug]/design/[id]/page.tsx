'use client'

import React, { useState, useEffect, useRef, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import {
  Palette,
  ArrowLeft,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Upload,
  Layers,
  FileCode,
  FileCheck2,
  ExternalLink,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  History,
  CornerDownRight,
  Receipt,
  Send,
  HelpCircle,
  Image as ImageIcon,
  Check,
  Clipboard,
  X,
  Phone,
  User,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Share2,
  Sliders,
  Scissors,
  Copy,
  RotateCcw,
  Split,
  FileText,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Printer,
  Calendar,
  Building,
  MapPin,
  Tag,
  Paperclip,
  CheckSquare,
  Square,
  Package,
  Box,
  Ruler,
  Maximize,
  SlidersHorizontal,
  Flame,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModalDialog } from '@/components/shared/modal-dialog'
import {
  isRenderableFormat,
  getFormatBadgeColor,
  formatBDT,
  toBengaliNumerals,
} from '@/lib/formatters'
import type {
  DesignJobRecord,
  DesignVersionRecord,
  DesignStatus,
  DesignPriority,
  DesignFormat,
  DesignFeedbackRecord,
} from '@/types/design.types'
import type { InvoiceRecord, InvoiceItemRecord } from '@/types/billing.types'
import type { InvoiceRequestRecord } from '@/types/workflow.types'
import type { SalesOrderRecord } from '@/types/order.types'
import type { CustomerRecord } from '@/types/crm.types'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { cn } from '@/lib/utils'
import { useDataStore } from '@/hooks/use-data-store'
import { createInvoiceRequestAction } from '@/actions/invoice-request.actions'
import {
  markDesignReadyAction,
  sendToPrintOperatorAction,
  getDesignJobByIdAction,
} from '@/actions/design.actions'

import { getInvoicesAction, getInvoiceByIdAction } from '@/actions/billing.actions'
import { getOrdersAction } from '@/actions/order.actions'

export interface SiblingWorkItem {
  index: number
  id: string
  itemId: string
  designNumber: string
  title: string
  productName?: string | null
  itemDescription?: string | null
  itemKind?: string | null
  productType?: string | null
  dimensions: string
  width?: number
  height?: number
  dimensionUnit?: string
  areaSft?: number | null
  material: string
  finishing?: string | null
  selectedFinishing?: Array<{ id?: string; name: string; rate?: number; cost?: number }> | null
  selectedAddOns?: Array<{ id?: string; name: string; rate?: number; cost?: number }> | null
  quantity: number
  unit: string
  unitPrice?: number | null
  totalPrice?: number | null
  routing: string
  status: DesignStatus
  isLocked: boolean
  isCurrent: boolean
  brief?: string | null
  proofUrl?: string | null
  attachments?: Array<{ name: string; url: string; size?: string; type?: string }>
}

function DesignDetailPageLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
      <div className="h-10 w-10 rounded-xl bg-pink-600 text-white flex items-center justify-center animate-pulse">
        <Palette className="h-5 w-5 animate-spin" />
      </div>
      <p className="text-sm font-semibold text-slate-500">Loading Design Workbench...</p>
    </div>
  )
}

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class DesignDetailErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[DesignDetailPage] Caught render error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center space-y-4 max-w-lg mx-auto my-12 bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/50 shadow-lg">
          <div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Workbench Temporarily Unavailable
            </h3>
            <p className="text-xs text-slate-500">
              An unexpected display issue occurred while loading this artwork. You can reload or return to the studio.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
            >
              Reload Workbench
            </Button>
            <Button size="sm" asChild>
              <Link href="/design">Back to Design Studio</Link>
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function DesignDetailContent() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname() || ''
  const jobId = (params?.id as string) || ''
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'
  const backHref = pathname.startsWith(`/${slug}`) ? `/${slug}/design` : '/design'

  const [mounted, setMounted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [jobs, setJobs] = useDataStore<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS, [])
  const [invoices, setInvoices] = useDataStore<InvoiceRecord[]>(STORAGE_KEYS.INVOICES, [])
  const [invoiceRequests] = useDataStore<InvoiceRequestRecord[]>(STORAGE_KEYS.INVOICE_REQUESTS, [])
  const [orders, setOrders] = useDataStore<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS, [])
  const [customers] = useDataStore<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS, [])
  const [jobOrders] = useDataStore<any[]>(STORAGE_KEYS.JOB_ORDERS, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  const companyId = company?.id || (slug !== 'my-company' ? slug : 'default')

  const isMatchingCompany = (id?: string | null) => {
    if (!id || id === 'default') return true
    return (
      (company?.id && id === company.id) ||
      (company?.slug && id === company.slug) ||
      (slug && id === slug) ||
      id === 'default'
    )
  }

  // 1. Resolve Current Job (from local storage, synthesized from invoice, or order)
  const resolvedJob = useMemo<DesignJobRecord | null>(() => {
    if (!jobId) return null

    // A. Search direct match in Design Jobs store
    const directMatch = jobs.find(
      (j: DesignJobRecord) =>
        (j.id === jobId ||
          j.design_number === jobId ||
          j.id?.toLowerCase() === jobId?.toLowerCase() ||
          j.design_number?.toLowerCase() === jobId?.toLowerCase()) &&
        isMatchingCompany(j.company_id)
    )
    if (directMatch) return directMatch

    // B. Search by fallback in Design Jobs without strict company matching
    const looseMatch = jobs.find(
      (j: DesignJobRecord) =>
        j.id === jobId ||
        j.design_number === jobId ||
        j.id?.toLowerCase() === jobId?.toLowerCase() ||
        j.design_number?.toLowerCase() === jobId?.toLowerCase()
    )
    if (looseMatch) return looseMatch

    // C. Synthesize from Invoices store (e.g. dsn-inv-eb6f4ead-24c1-4c2b-bd82-0feaf55e786b-0 or DSN-INV-001-A)
    let targetInv = invoices.find(
      (i) =>
        (i.id === jobId ||
          i.invoice_number === jobId ||
          (jobId.startsWith('DSN-') && i.invoice_number === `INV-${jobId.replace('DSN-', '')}`) ||
          (i.items && i.items.some((it: any) => it.id === jobId || it.design_job_id === jobId))) &&
        isMatchingCompany(i.company_id)
    )

    let targetItemIdx = 0
    if (!targetInv && jobId.startsWith('dsn-inv-')) {
      const raw = jobId.replace('dsn-inv-', '')
      const lastDash = raw.lastIndexOf('-')
      const invIdPart = lastDash !== -1 ? raw.substring(0, lastDash) : raw
      targetItemIdx = lastDash !== -1 ? parseInt(raw.substring(lastDash + 1), 10) || 0 : 0
      targetInv = invoices.find(
        (i) =>
          (i.id === invIdPart ||
            i.invoice_number === invIdPart ||
            (typeof i.id === 'string' && i.id.includes(invIdPart)) ||
            (typeof i.id === 'string' && typeof invIdPart === 'string' && invIdPart.includes(i.id))) &&
          isMatchingCompany(i.company_id)
      )
    }

    if (!targetInv && invoices.length > 0) {
      targetInv = invoices.find((i) => {
        if (!i.id) return false
        if (
          jobId.toLowerCase().includes(i.id.toLowerCase()) ||
          (i.invoice_number && jobId.toLowerCase().includes(i.invoice_number.toLowerCase()))
        ) {
          return true
        }
        return false
      })
    }

    if (targetInv) {
      const it =
        targetInv.items?.[targetItemIdx] ||
        targetInv.items?.find((item: any) => item.id === jobId || item.design_job_id === jobId) ||
        targetInv.items?.[0]

      const isDesignOk = it?.workflow_routing === 'design_ok'
      const synthNum = `DSN-${targetInv.invoice_number ? targetInv.invoice_number.replace('INV-', '') : '001'}-${String.fromCharCode(65 + targetItemIdx)}`
      const synthJob: DesignJobRecord = {
        id: jobId,
        company_id: targetInv.company_id || companyId,
        invoice_id: targetInv.id,
        invoice_number: targetInv.invoice_number,
        invoice_item_id: it?.id || null,
        customer_id: targetInv.customer_id,
        customer_name: targetInv.customer_name || 'Walk-in Customer',
        customer_phone: targetInv.customer_phone || (targetInv as any)?.mobile || (targetInv as any)?.whatsapp || null,
        customer_address: targetInv.customer_address || (targetInv as any)?.address || null,
        customer_company_name: (targetInv as any)?.company_name || null,
        design_number: synthNum,
        title: it?.item_description || it?.item_name || 'Design Artwork',
        product_name: it?.item_name || null,
        dimensions_spec:
          it?.dimensions_spec ||
          (it?.width && it?.height ? `${it.width} × ${it.height} ${it.dimension_unit || it.unit || 'ft'}` : null),
        material: (it as any)?.material || (it as any)?.material_spec || null,
        finishing: it?.finishing || (Array.isArray((it as any)?.selected_finishing) ? (it as any).selected_finishing.map((f: any) => f.name || f).join(', ') : null),
        selected_finishing: (it as any)?.selected_finishing || null,
        selected_add_ons: (it as any)?.selected_add_ons || null,
        quantity: Number(it?.quantity) || 1,
        unit: it?.unit || 'pcs',
        unit_price: it?.unit_price || null,
        total_price: it?.total_price || null,
        area_sft: it?.area_sft || (it?.width && it?.height ? Number((it.width * it.height).toFixed(2)) : null),
        item_kind: it?.item_kind || null,
        designer_name: 'Design Team',
        priority: ((targetInv as any).priority as any) || 'normal',
        deadline: targetInv.due_date || new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        status: isDesignOk ? 'approved' : 'received',
        workflow_routing: (it?.workflow_routing as any) || 'design_required',
        commercial_status: 'invoice_created',
        intake_source: 'manager_billing',
        customer_approval_required: !isDesignOk,
        is_locked: isDesignOk,
        current_version: 1,
        instructions: (it as any)?.remarks || (it as any)?.notes || targetInv.notes || null,
        versions: [
          {
            id: `dv-${targetInv.id}-${targetItemIdx}`,
            design_job_id: jobId,
            version_number: 1,
            version_label: isDesignOk ? 'Version 1 (Customer Artwork)' : 'Version 1 (Initial Brief)',
            proof_file_name: isDesignOk ? 'customer_artwork.pdf' : 'artwork_brief.png',
            proof_file_url:
              (it as any)?.attachment_url ||
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
            file_format: 'png',
            uploaded_by_name: targetInv.created_by_name || 'Billing / Commercial',
            is_approved: isDesignOk,
            created_at: targetInv.created_at || new Date().toISOString(),
          },
        ],
        created_at: targetInv.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      return synthJob
    }

    // D. Synthesize from Sales Orders store
    const targetOrder = orders.find(
      (o) =>
        (o.id === jobId ||
          o.order_number === jobId ||
          (o.items && o.items.some((it: any) => it.id === jobId))) &&
        isMatchingCompany(o.company_id)
    )
    if (targetOrder) {
      const it = targetOrder.items?.[0]
      const synthJob: DesignJobRecord = {
        id: jobId,
        company_id: targetOrder.company_id || companyId,
        sales_order_id: targetOrder.id,
        order_number: targetOrder.order_number,
        customer_id: targetOrder.customer_id,
        customer_name: targetOrder.customer_name || 'Walk-in Customer',
        design_number: `DSN-${targetOrder.order_number?.replace('ORD-', '') || '001'}-A`,
        title: it?.item_name || 'Design Work Order',
        product_name: it?.item_name || null,
        dimensions_spec: it?.width && it?.height ? `${it.width} × ${it.height} ${it.dimension_unit || 'ft'}` : null,
        material: it?.material_spec || null,
        finishing: null,
        quantity: it?.quantity || 1,
        unit: it?.unit || 'pcs',
        designer_name: 'Design Team',
        priority: targetOrder.priority as any || 'normal',
        deadline: targetOrder.delivery_date,
        status: 'received',
        workflow_routing: targetOrder.workflow_routing === 'design_required' ? 'design_required' : 'design_ok',
        commercial_status: targetOrder.commercial_status === 'invoice_created' ? 'invoice_created' : 'invoice_required',
        intake_source: 'manager_billing',
        customer_approval_required: true,
        is_locked: false,
        current_version: 1,
        instructions: targetOrder.notes || null,
        versions: [
          {
            id: `dv-${targetOrder.id}-0`,
            design_job_id: jobId,
            version_number: 1,
            version_label: 'Version 1 (Work Order Brief)',
            proof_file_name: 'order_brief.png',
            proof_file_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
            file_format: 'png',
            uploaded_by_name: 'Sales / Operator',
            is_approved: false,
            created_at: targetOrder.created_at || new Date().toISOString(),
          },
        ],
        created_at: targetOrder.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      return synthJob
    }

    return null
  }, [jobId, jobs, invoices, orders, companyId, slug])

  // Hydrate from server if not found in local datastore
  useEffect(() => {
    if (jobId) {
      const effCompany = companyId || 'default'

      // A. Fetch design job by ID
      getDesignJobByIdAction(jobId, effCompany)
        .then((res) => {
          if (res?.success && res.data) {
            setJobs((prev) => {
              if (prev.some((j) => j.id === res.data!.id)) return prev
              return [res.data!, ...prev]
            })
          }
        })
        .catch(() => {})

      // B. If synthesized from invoice (dsn-inv-...), fetch invoice by ID directly
      if (jobId.startsWith('dsn-inv-')) {
        const raw = jobId.replace('dsn-inv-', '')
        const lastDash = raw.lastIndexOf('-')
        const invIdPart = lastDash !== -1 ? raw.substring(0, lastDash) : raw
        getInvoiceByIdAction(invIdPart, effCompany)
          .then((invRes) => {
            if (invRes?.success && invRes.data) {
              const loadedInv = invRes.data as InvoiceRecord
              setInvoices((prev) => {
                const idx = prev.findIndex(
                  (i) => i.id === loadedInv.id || i.invoice_number === loadedInv.invoice_number
                )
                if (idx >= 0) {
                  const updated = [...prev]
                  updated[idx] = loadedInv
                  return updated
                }
                return [loadedInv, ...prev]
              })
            }
          })
          .catch(() => {})
      }

      // C. Also load invoices and orders list for background context
      getInvoicesAction(undefined, effCompany)
        .then((invRes) => {
          if (invRes?.success && Array.isArray(invRes.data) && invRes.data.length > 0) {
            setInvoices(invRes.data)
          }
        })
        .catch(() => {})

      getOrdersAction(effCompany)
        .then((ordRes) => {
          if (ordRes?.success && Array.isArray(ordRes.data) && ordRes.data.length > 0) {
            setOrders(ordRes.data)
          }
        })
        .catch(() => {})
    }
  }, [jobId, companyId, setJobs, setInvoices, setOrders])

  // Persist synthesized job into datastore if not already stored
  useEffect(() => {
    if (resolvedJob && !jobs.some((j) => j.id === resolvedJob.id)) {
      const all = PrintERPDataStore.get<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS) || []
      if (!all.some((j) => j.id === resolvedJob.id)) {
        all.unshift(resolvedJob)
        PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, all)
        setJobs(all)
      }
    }
  }, [resolvedJob, jobs, setJobs])

  const job = resolvedJob

  // 2. Identify Linked Commercial Invoice & Sales Order
  const linkedInvoice = useMemo<InvoiceRecord | null>(() => {
    if (!job) return null
    return (
      invoices.find(
        (i) =>
          (job.invoice_id && (i.id === job.invoice_id || i.invoice_number === job.invoice_id)) ||
          (job.invoice_number && i.invoice_number === job.invoice_number) ||
          (job.sales_order_id && i.sales_order_id === job.sales_order_id)
      ) || null
    )
  }, [job, invoices])

  const linkedOrder = useMemo<SalesOrderRecord | null>(() => {
    if (!job) return null
    return (
      orders.find(
        (o) =>
          (job.sales_order_id && o.id === job.sales_order_id) ||
          (job.order_number && o.order_number === job.order_number) ||
          (linkedInvoice?.sales_order_id && o.id === linkedInvoice.sales_order_id) ||
          (linkedInvoice?.order_number && o.order_number === linkedInvoice.order_number)
      ) || null
    )
  }, [job, orders, linkedInvoice])

  // 3. Resolve Customer Profile & Contact Details
  const customerProfile = useMemo<CustomerRecord | null>(() => {
    if (!job) return null
    const cId = job.customer_id || linkedInvoice?.customer_id || linkedOrder?.customer_id
    if (cId) {
      const matched = customers.find((c) => c.id === cId)
      if (matched) return matched
    }
    const cPhone = (job as any).customer_phone || linkedInvoice?.customer_phone || linkedOrder?.customer_phone
    if (cPhone) {
      const matched = customers.find((c) => c.mobile === cPhone || c.whatsapp === cPhone || c.alternative_phone === cPhone)
      if (matched) return matched
    }
    const cName = job.customer_name || linkedInvoice?.customer_name || linkedOrder?.customer_name
    if (cName) {
      const matched = customers.find((c) => c.name?.toLowerCase() === cName.toLowerCase())
      if (matched) return matched
    }
    return null
  }, [job, linkedInvoice, linkedOrder, customers])

  const customerPhone =
    customerProfile?.mobile ||
    customerProfile?.whatsapp ||
    customerProfile?.alternative_phone ||
    (job as any)?.customer_phone ||
    linkedInvoice?.customer_phone ||
    linkedOrder?.customer_phone ||
    ''

  const customerAddress =
    customerProfile?.address ||
    (job as any)?.customer_address ||
    linkedInvoice?.customer_address ||
    linkedOrder?.customer_address ||
    ''

  const customerCompanyName =
    customerProfile?.company_name ||
    (job as any)?.company_name ||
    customerProfile?.name ||
    job?.customer_name ||
    'Walk-in Customer'

  // 4. Derive ALL Sibling Works in this Invoice or Order
  const siblingWorks = useMemo<SiblingWorkItem[]>(() => {
    if (!job) return []

    // A. If linked to an Invoice with items
    if (linkedInvoice && Array.isArray(linkedInvoice.items) && linkedInvoice.items.length > 0) {
      return linkedInvoice.items.map((it: any, idx: number) => {
        const synthId = it.design_job_id || `dsn-inv-${linkedInvoice.id}-${idx}`
        const synthNum = `DSN-${linkedInvoice.invoice_number ? linkedInvoice.invoice_number.replace('INV-', '') : '001'}-${String.fromCharCode(65 + idx)}`
        const existingJob = jobs.find(
          (j) =>
            j.id === synthId ||
            j.design_number === synthNum ||
            (j.invoice_id === linkedInvoice.id && (j.invoice_item_id === it.id || j.title === it.item_name))
        )

        const isCurrent =
          job.id === synthId ||
          job.id === existingJob?.id ||
          jobId === synthId ||
          (jobId.startsWith('dsn-inv-') && jobId.endsWith(`-${idx}`)) ||
          job.design_number === synthNum ||
          (Boolean(job.invoice_item_id) && job.invoice_item_id === it.id)

        const dims =
          it.dimensions_spec ||
          (it.width && it.height ? `${it.width} × ${it.height} ${it.dimension_unit || it.unit || 'ft'}` : 'Standard Specs')

        const briefAttachments: Array<{ name: string; url: string; size?: string; type?: string }> = []
        if (it.attachment_url) {
          briefAttachments.push({
            name: it.attachment_name || `${it.item_name || 'Item'}_reference.pdf`,
            url: it.attachment_url,
            size: 'Reference File',
            type: 'file',
          })
        }
        if (it.attachments && Array.isArray(it.attachments)) {
          briefAttachments.push(...it.attachments)
        }

        return {
          index: idx,
          id: existingJob?.id || synthId,
          itemId: it.id || `inv-item-${idx}`,
          designNumber: existingJob?.design_number || synthNum,
          title: it.item_description || it.item_name || `Work Item #${idx + 1}`,
          productName: it.item_name || null,
          itemDescription: it.item_description || null,
          itemKind: it.item_kind || null,
          productType: it.product_type || null,
          dimensions: dims,
          width: it.width,
          height: it.height,
          dimensionUnit: it.dimension_unit || it.unit || 'ft',
          areaSft: it.area_sft || (it.width && it.height ? Number((it.width * it.height).toFixed(2)) : null),
          material: it.material || it.material_spec || 'Standard Flex / Media',
          finishing: it.finishing || (Array.isArray(it.selected_finishing) ? it.selected_finishing.map((f: any) => f.name || f).join(', ') : null),
          selectedFinishing: it.selected_finishing || null,
          selectedAddOns: it.selected_add_ons || null,
          quantity: Number(it.quantity) || 1,
          unit: it.unit || 'pcs',
          unitPrice: it.unit_price || null,
          totalPrice: it.total_price || null,
          routing: it.workflow_routing || 'design_required',
          status: existingJob?.status || (it.workflow_routing === 'design_ok' ? 'approved' : 'received'),
          isLocked: existingJob?.is_locked ?? it.workflow_routing === 'design_ok',
          isCurrent,
          brief: it.remarks || it.notes || linkedInvoice.notes || null,
          proofUrl: existingJob?.versions?.[existingJob.versions.length - 1]?.proof_file_url || it.attachment_url,
          attachments: briefAttachments,
        }
      })
    }

    // B. If linked to a Sales Order with items
    if (linkedOrder && Array.isArray(linkedOrder.items) && linkedOrder.items.length > 0) {
      return linkedOrder.items.map((it: any, idx: number) => {
        const synthId = `dsn-ord-${linkedOrder.id}-${idx}`
        const synthNum = `DSN-${linkedOrder.order_number ? linkedOrder.order_number.replace('ORD-', '') : '001'}-${String.fromCharCode(65 + idx)}`
        const existingJob = jobs.find(
          (j) =>
            j.id === synthId ||
            j.design_number === synthNum ||
            (j.sales_order_id === linkedOrder.id && j.title === it.item_name)
        )

        const isCurrent =
          job.id === synthId ||
          job.id === existingJob?.id ||
          job.design_number === synthNum ||
          (Boolean(job.sales_order_id) && job.title === it.item_name)

        const dims =
          it.width && it.height ? `${it.width} × ${it.height} ${it.dimension_unit || 'ft'}` : 'Standard Specs'

        return {
          index: idx,
          id: existingJob?.id || synthId,
          itemId: it.id || `ord-item-${idx}`,
          designNumber: existingJob?.design_number || synthNum,
          title: it.item_name || `Work Item #${idx + 1}`,
          productName: it.item_name || null,
          itemDescription: it.item_description || null,
          itemKind: it.item_kind || null,
          productType: null,
          dimensions: dims,
          width: it.width,
          height: it.height,
          dimensionUnit: it.dimension_unit || 'ft',
          areaSft: it.width && it.height ? Number((it.width * it.height).toFixed(2)) : null,
          material: it.material_spec || 'Standard Flex / Media',
          finishing: it.finishing || null,
          selectedFinishing: null,
          selectedAddOns: null,
          quantity: Number(it.quantity) || 1,
          unit: it.unit || 'pcs',
          unitPrice: it.unit_price || null,
          totalPrice: it.total_price || null,
          routing: it.workflow_routing || 'ready_production',
          status: existingJob?.status || 'received',
          isLocked: existingJob?.is_locked ?? false,
          isCurrent,
          brief: linkedOrder.notes || null,
          proofUrl: existingJob?.versions?.[existingJob.versions.length - 1]?.proof_file_url,
          attachments: [],
        }
      })
    }

    // C. Standalone Job (single work item)
    return [
      {
        index: 0,
        id: job.id,
        itemId: job.invoice_item_id || job.id,
        designNumber: job.design_number,
        title: job.title,
        productName: job.product_name,
        itemDescription: (job as any).item_description || null,
        itemKind: (job as any).item_kind || null,
        productType: null,
        dimensions: job.dimensions_spec || 'Standard Specs',
        areaSft: (job as any).area_sft || null,
        material: job.material || 'Standard Media',
        finishing: job.finishing || null,
        selectedFinishing: (job as any).selected_finishing || null,
        selectedAddOns: (job as any).selected_add_ons || null,
        quantity: job.quantity || 1,
        unit: job.unit || 'pcs',
        unitPrice: (job as any).unit_price || null,
        totalPrice: (job as any).total_price || null,
        routing: job.workflow_routing || 'design_required',
        status: job.status,
        isLocked: Boolean(job.is_locked),
        isCurrent: true,
        brief: job.instructions || null,
        proofUrl: job.versions?.[job.versions.length - 1]?.proof_file_url,
        attachments: [],
      },
    ]
  }, [job, linkedInvoice, linkedOrder, jobs])

  const totalWorksCount = siblingWorks.length
  const currentWork = siblingWorks.find((w) => w.isCurrent) || siblingWorks[0] || null

  // Active version object
  const [activeVersionNumber, setActiveVersionNumber] = useState<number>(job?.current_version || 1)

  useEffect(() => {
    if (job?.current_version) {
      setActiveVersionNumber(job.current_version)
    }
  }, [job?.current_version, job?.id])

  // Modals & Power Tools State
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isApproveOpen, setIsApproveOpen] = useState(false)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [isInvoiceRequestOpen, setIsInvoiceRequestOpen] = useState(false)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [lightboxZoom, setLightboxZoom] = useState(1)
  const [isPrepressModalOpen, setIsPrepressModalOpen] = useState(false)
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false)
  const [compareVerA, setCompareVerA] = useState(1)
  const [compareVerB, setCompareVerB] = useState(1)
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)
  const [whatsAppPhone, setWhatsAppPhone] = useState(customerPhone || '')
  const [copiedPhone, setCopiedPhone] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'warning' | 'info'; text: string } | null>(null)

  // Interactive Prepress Checklist State
  const [prepressChecks, setPrepressChecks] = useState<{
    dimensions: boolean
    colorProfile: boolean
    bleedMargin: boolean
    outlines: boolean
    proofApproved: boolean
  }>({
    dimensions: true,
    colorProfile: true,
    bleedMargin: true,
    outlines: false,
    proofApproved: false,
  })

  // All Invoice Works Matrix collapsible state
  const [isInvoiceMatrixOpen, setIsInvoiceMatrixOpen] = useState(false)

  // Sync proof approved check when job status changes
  useEffect(() => {
    if (job?.status === 'approved' || job?.is_locked) {
      setPrepressChecks({
        dimensions: true,
        colorProfile: true,
        bleedMargin: true,
        outlines: true,
        proofApproved: true,
      })
    }
  }, [job?.status, job?.is_locked, job?.id])

  const togglePrepressCheck = (key: keyof typeof prepressChecks) => {
    setPrepressChecks((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const prepressPassedCount = Object.values(prepressChecks).filter(Boolean).length
  const isAllPrepressPassed = prepressPassedCount === 5

  // Derive structured finishing items
  const finishingItems = useMemo<Array<{ name: string; rate?: number; cost?: number }>>(() => {
    if (currentWork?.selectedFinishing && Array.isArray(currentWork.selectedFinishing) && currentWork.selectedFinishing.length > 0) {
      return currentWork.selectedFinishing.map((f: any) =>
        typeof f === 'string' ? { name: f } : { name: f.name || String(f), rate: f.rate, cost: f.cost }
      )
    }
    if ((job as any)?.selected_finishing && Array.isArray((job as any).selected_finishing) && (job as any).selected_finishing.length > 0) {
      return (job as any).selected_finishing.map((f: any) =>
        typeof f === 'string' ? { name: f } : { name: f.name || String(f), rate: f.rate, cost: f.cost }
      )
    }
    const finishingStr = currentWork?.finishing || job?.finishing
    if (
      finishingStr &&
      typeof finishingStr === 'string' &&
      finishingStr.trim().length > 0 &&
      finishingStr.toLowerCase() !== 'standard' &&
      finishingStr.toLowerCase() !== 'none'
    ) {
      return finishingStr.split(/[,+;/]/).map((s) => s.trim()).filter(Boolean).map((name) => ({ name }))
    }
    return []
  }, [currentWork, job])

  // Derive structured add-on items
  const addOnItems = useMemo<Array<{ name: string; cost?: number }>>(() => {
    if (currentWork?.selectedAddOns && Array.isArray(currentWork.selectedAddOns) && currentWork.selectedAddOns.length > 0) {
      return currentWork.selectedAddOns.map((a: any) =>
        typeof a === 'string' ? { name: a } : { name: a.name || String(a), cost: a.cost }
      )
    }
    if ((job as any)?.selected_add_ons && Array.isArray((job as any).selected_add_ons) && (job as any).selected_add_ons.length > 0) {
      return (job as any).selected_add_ons.map((a: any) =>
        typeof a === 'string' ? { name: a } : { name: a.name || String(a), cost: a.cost }
      )
    }
    return []
  }, [currentWork, job])

  const getFinishingBadgeEmoji = (name: string) => {
    const lower = (name || '').toLowerCase()
    if (lower.includes('eyelet') || lower.includes('grommet') || lower.includes('punch') || lower.includes('ring')) return '✂️'
    if (lower.includes('hem') || lower.includes('sew') || lower.includes('pocket') || lower.includes('fold')) return '🪡'
    if (lower.includes('lam') || lower.includes('gloss') || lower.includes('matt') || lower.includes('matte') || lower.includes('uv') || lower.includes('varnish')) return '✨'
    if (lower.includes('foil') || lower.includes('gold') || lower.includes('silver') || lower.includes('emboss') || lower.includes('deboss')) return '🟨'
    if (lower.includes('die') || lower.includes('cut') || lower.includes('crease') || lower.includes('creasing') || lower.includes('shape') || lower.includes('perforat')) return '📐'
    if (lower.includes('stand') || lower.includes('frame') || lower.includes('base') || lower.includes('rollup') || lower.includes('structure')) return '🔘'
    if (lower.includes('bind') || lower.includes('spiral') || lower.includes('book') || lower.includes('staple') || lower.includes('saddle')) return '📚'
    return '⚙️'
  }

  // Attachments form
  const [isAddAttachmentOpen, setIsAddAttachmentOpen] = useState(false)
  const [attachmentName, setAttachmentName] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')

  // New Version Form State (.JPG / .PNG only with paste support)
  const [newVersionNotes, setNewVersionNotes] = useState('')
  const [newVersionFormat, setNewVersionFormat] = useState<DesignFormat>('png')
  const [newVersionFileName, setNewVersionFileName] = useState('')
  const [newVersionProofUrl, setNewVersionProofUrl] = useState<string>('')
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  // Approval Form State
  const [approverName, setApproverName] = useState('')
  const [approvalNote, setApprovalNote] = useState('')

  // Feedback Form State
  const [feedbackText, setFeedbackText] = useState('')

  // Invoice Request Form State
  const [requestNotes, setRequestNotes] = useState('')
  const [estimatedAmount, setEstimatedAmount] = useState<number>(5000)

  const showNotification = (text: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setNotification({ text, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const handleCopyPhone = () => {
    if (!customerPhone) return
    navigator.clipboard.writeText(customerPhone)
    setCopiedPhone(true)
    showNotification('Customer phone number copied to clipboard!')
    setTimeout(() => setCopiedPhone(false), 3000)
  }

  // Process image file for upload (supporting .jpg, .jpeg, .png)
  const processImageFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const isJpeg = ext === 'jpg' || ext === 'jpeg'
    const isPng = ext === 'png'

    if (!isJpeg && !isPng) {
      showNotification('Unsupported format! Only .JPG and .PNG images are supported.', 'warning')
      return
    }

    const fmt: DesignFormat = isJpeg ? 'jpg' : 'png'
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (dataUrl) {
        setNewVersionProofUrl(dataUrl)
        setNewVersionFileName(file.name || `proof_${Date.now()}.${fmt}`)
        setNewVersionFormat(fmt)
        if (!newVersionNotes) {
          setNewVersionNotes(`Uploaded ${file.name} (${fmt.toUpperCase()})`)
        }
        setIsUploadOpen(true)
        showNotification(`Artwork loaded: ${file.name} (${fmt.toUpperCase()})!`, 'success')
      }
    }
    reader.readAsDataURL(file)
  }

  // Global Clipboard Paste (Ctrl+V) listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) {
            const nextVerNum = (job?.versions?.length || 0) + 1
            const fmt: DesignFormat = item.type === 'image/jpeg' ? 'jpg' : 'png'
            const customName = `proof_${job?.design_number?.toLowerCase() || 'artwork'}_v${nextVerNum}.${fmt}`

            const reader = new FileReader()
            reader.onload = (event) => {
              const dataUrl = event.target?.result as string
              if (dataUrl) {
                setNewVersionProofUrl(dataUrl)
                setNewVersionFileName(customName)
                setNewVersionFormat(fmt)
                if (!newVersionNotes) {
                  setNewVersionNotes(`Pasted screenshot artwork (Ctrl+V) for v${nextVerNum}`)
                }
                setIsUploadOpen(true)
                showNotification(`Image pasted from clipboard (${fmt.toUpperCase()})! Ready to save.`, 'success')
              }
            }
            reader.readAsDataURL(file)
            break
          }
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [job, isUploadOpen, newVersionNotes])

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="h-10 w-10 rounded-xl bg-pink-600 text-white flex items-center justify-center animate-pulse">
          <Palette className="h-5 w-5 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-slate-500">Loading Design Workbench...</p>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="space-y-6 max-w-7xl">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Design Studio
        </Link>
        <Card className="p-12 text-center border-dashed">
          <Palette className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Design Job Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            The design job record you are looking for does not exist in your organization.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href={backHref}>View All Design Jobs</Link>
          </Button>
        </Card>
      </div>
    )
  }

  const hasInvoice = Boolean(job.invoice_id || linkedInvoice)
  const invoiceNumber = linkedInvoice?.invoice_number || job.invoice_number || 'INV-XXXX'

  const pendingRequest =
    invoiceRequests.find(
      (r) =>
        r.company_id === job.company_id &&
        r.status === 'pending' &&
        (r.design_job_id === job.id || (job.sales_order_id && r.sales_order_id === job.sales_order_id))
    ) || null
  const hasPendingRequest = Boolean(pendingRequest || job.commercial_status === 'invoice_requested')

  const activeVersion =
    job.versions?.find((v: DesignVersionRecord) => v.version_number === activeVersionNumber) ||
    job.versions?.[job.versions.length - 1] || {
      id: 'dv-def',
      design_job_id: job.id,
      version_number: 1,
      version_label: 'Initial Brief Artwork',
      proof_file_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
      proof_file_name: 'artwork_brief.png',
      file_format: 'png' as DesignFormat,
      change_notes: 'Initial artwork brief',
      uploaded_by_name: 'Billing / Designer',
      is_approved: job.workflow_routing === 'design_ok',
      created_at: 'Initial intake',
    }

  // Action: Mark Design Ready
  const handleMarkDesignReady = async () => {
    startTransition(async () => {
      try {
        const effectiveId = job.id || job.design_number || jobId
        const effectiveCompany = job.company_id || company?.id || slug
        await markDesignReadyAction(effectiveId, 'Designer marked design ready for production proofing', effectiveCompany)
        PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, job.id, {
          status: 'customer_approval',
          commercial_status: hasInvoice ? 'invoice_created' : 'invoice_required',
          updated_at: new Date().toISOString(),
        })

        if (hasInvoice) {
          showNotification('Design marked READY! Invoice is linked. Proceeding to Customer Approval.')
        } else {
          showNotification('Design marked READY! Invoice is missing — please dispatch Invoice Request to Sales.', 'warning')
          setIsInvoiceRequestOpen(true)
        }
      } catch (err: any) {
        showNotification(err.message || 'Failed to update status', 'warning')
      }
    })
  }

  // Action: Send Invoice Request to Sales/Manager
  const handleSendInvoiceRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      try {
        const res = await createInvoiceRequestAction({
          companyId: job.company_id,
          customerId: job.customer_id || null,
          customerName: job.customer_name,
          customerPhone: customerPhone || null,
          customerEmail: (job as any).customer_email || null,
          customerAddress: customerAddress || null,
          companyName: customerCompanyName || null,
          salesOrderId: job.sales_order_id || null,
          orderNumber: (job as any).order_number || null,
          designJobId: job.id,
          designNumber: job.design_number,
          itemsSummary: `${job.title} (${job.dimensions_spec || 'Standard'})`,
          estimatedAmount: estimatedAmount,
          notes: requestNotes || `Artwork ${job.design_number} ready for billing`,
        })

        if (!res.success) {
          showNotification(res.error || 'Failed to dispatch request', 'warning')
          return
        }

        PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, job.id, {
          commercial_status: 'invoice_requested',
          invoice_request_id: res.data?.id,
          updated_at: new Date().toISOString(),
        })

        setIsInvoiceRequestOpen(false)
        setRequestNotes('')
        showNotification(`Invoice Request dispatched to Sales/Billing! (Req #${res.data?.request_number})`)
      } catch (err: any) {
        showNotification(err.message || 'Failed to dispatch request', 'warning')
      }
    })
  }

  // Upload New Version
  const handleUploadVersion = (e: React.FormEvent) => {
    e.preventDefault()
    if (job.is_locked) {
      showNotification('Artwork is currently locked! Supervisor unlock is required to upload a revision.', 'warning')
      return
    }

    const nextVerNum = (job.versions?.length || 0) + 1
    const proofUrl = newVersionProofUrl || 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80'
    const fileName = newVersionFileName || `proof_${job.design_number.toLowerCase()}_v${nextVerNum}.${newVersionFormat}`

    const newVer: DesignVersionRecord = {
      id: `dv-${Date.now()}`,
      design_job_id: job.id,
      version_number: nextVerNum,
      version_label: `Version ${nextVerNum}`,
      proof_file_url: proofUrl,
      proof_file_name: fileName,
      source_file_url: proofUrl,
      source_file_name: fileName,
      file_format: newVersionFormat,
      file_size_bytes: 4500000,
      change_notes: newVersionNotes || `Version ${nextVerNum} artwork revision`,
      uploaded_by_name: 'Current Designer',
      is_approved: false,
      created_at: 'Just now',
    }

    const updatedJob = {
      current_version: nextVerNum,
      versions: [...(job.versions || []), newVer],
      status: 'customer_approval' as const,
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, job.id, updatedJob)
    setActiveVersionNumber(nextVerNum)
    setIsUploadOpen(false)
    setNewVersionProofUrl('')
    setNewVersionFileName('')
    setNewVersionNotes('')
    showNotification(`Version ${nextVerNum} created and dispatched for customer proof approval!`)
  }

  // Customer Approval & Lock
  const handleApproveAndLock = (e: React.FormEvent) => {
    e.preventDefault()
    const updatedVersions = (job.versions || []).map((v: DesignVersionRecord) => ({
      ...v,
      is_approved: v.version_number === activeVersionNumber,
    }))

    const updatedJob = {
      status: 'approved' as const,
      approved_version: activeVersionNumber,
      approved_by: approverName || 'Authorized Approver',
      approval_timestamp: new Date().toLocaleString(),
      approval_note: approvalNote,
      is_locked: true,
      versions: updatedVersions,
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, job.id, updatedJob)
    setIsApproveOpen(false)
    showNotification(`Version ${activeVersionNumber} officially approved & locked for print production!`)
  }

  // Toggle Lock
  const handleToggleLock = () => {
    const updated = !job.is_locked
    PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, job.id, {
      is_locked: updated,
      updated_at: new Date().toISOString(),
    })
    showNotification(updated ? 'Design job locked.' : 'Supervisor override: Design job unlocked for revision.')
  }

  // Send to Print Operator
  const handleSendToPrint = async () => {
    startTransition(async () => {
      try {
        const effectiveId = job.id || job.design_number || jobId
        const effectiveCompany = job.company_id || company?.id || slug
        const now = new Date().toISOString()

        await sendToPrintOperatorAction(effectiveId, effectiveCompany, job)

        PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, job.id, {
          status: 'approved',
          workflow_routing: 'ready_production',
          commercial_status: hasInvoice ? 'invoice_created' : 'invoice_required',
          is_locked: true,
          updated_at: now,
        })

        showNotification(`Job #${job.design_number} dispatched to Print Floor Queue!`, 'success')
      } catch (err: any) {
        showNotification(err.message || 'Failed to dispatch to print operator', 'warning')
      }
    })
  }

  // Add Reference Attachment
  const handleAddAttachment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!attachmentName || !attachmentUrl) {
      showNotification('Please enter file name and valid URL or upload a file.', 'warning')
      return
    }
    showNotification(`Attachment "${attachmentName}" added to Design Brief!`)
    setIsAddAttachmentOpen(false)
    setAttachmentName('')
    setAttachmentUrl('')
  }

  const currentFormat =
    activeVersion?.file_format ||
    ((activeVersion?.file_name || activeVersion?.proof_file_name || '').split('.').pop() as any) ||
    'png'

  return (
    <div className="space-y-6 max-w-7xl pb-16">
      {/* 1. TOP HEADER & WORKBENCH BREADCRUMB */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{tBilingual('Back to Design Studio', 'ডিজাইন স্টুডিওতে ফিরে যান')}</span>
          </Link>

          {/* Sibling Works Indicator Badge */}
          {totalWorksCount > 1 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 animate-pulse">
              <Layers className="h-3.5 w-3.5 text-indigo-500" />
              <span>
                {tBilingual(
                  `Multi-Work Invoice: ${totalWorksCount} Design Works in Group`,
                  `মাল্টি-ওয়ার্ক ইনভয়েস: মোট ${toBengaliNumerals(totalWorksCount)} টি ডিজাইন কাজ`
                )}
              </span>
            </span>
          )}
        </div>

        {/* WORKBENCH TOP COMMAND BAR */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl font-black text-slate-950 dark:text-white font-mono tracking-tight">
                {job.design_number}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  'capitalize text-xs font-bold px-2.5 py-0.5',
                  job.status === 'approved'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : job.status === 'revision'
                    ? 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300'
                    : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300'
                )}
              >
                {job.status.replace('_', ' ')}
              </Badge>

              {/* Commercial Invoice Gate */}
              {hasInvoice ? (
                <Link
                  href={`/${slug}/invoices/${linkedInvoice?.id || job.invoice_id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 transition-colors"
                >
                  <Receipt className="h-3.5 w-3.5" />
                  <span>Invoice Linked: #{invoiceNumber}</span>
                </Link>
              ) : hasPendingRequest ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  <Clock className="h-3.5 w-3.5 animate-spin" />
                  <span>Invoice Requested</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Invoice Required</span>
                </span>
              )}

              {job.is_locked && (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded bg-emerald-600 text-white shadow-xs">
                  <Lock className="h-3 w-3" /> Locked for Production
                </span>
              )}
            </div>

            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{job.title}</span>
              {job.product_name && job.product_name !== job.title && (
                <span className="text-xs font-normal text-slate-500">({job.product_name})</span>
              )}
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* WhatsApp Proof Share */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsWhatsAppModalOpen(true)}
              className="h-8 text-xs font-bold bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              <Share2 className="h-3.5 w-3.5 mr-1" />
              WhatsApp Proof
            </Button>

            {/* Prepress Checklist */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPrepressModalOpen(true)}
              className="h-8 text-xs font-bold text-indigo-700 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-300 dark:border-indigo-800"
            >
              <Sliders className="h-3.5 w-3.5 mr-1" />
              Prepress Checks
            </Button>

            {/* Upload New Version */}
            {!job.is_locked && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsUploadOpen(true)}
                className="h-8 text-xs font-bold text-blue-700 border-blue-200 bg-blue-50/50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
              >
                <Upload className="h-3.5 w-3.5 mr-1" />
                Upload / Paste
              </Button>
            )}

            {/* Approve & Lock Button */}
            {!job.is_locked ? (
              <Button
                size="sm"
                onClick={() => setIsApproveOpen(true)}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Approve & Lock
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleToggleLock}
                className="h-8 text-xs text-amber-700 border-amber-300 dark:text-amber-400 hover:bg-amber-50"
              >
                <Unlock className="h-3.5 w-3.5 mr-1" />
                Supervisor Unlock
              </Button>
            )}

            {/* Send to Print Operator Queue */}
            {hasInvoice && (job.status === 'approved' || job.is_locked) && (
              <Button
                size="sm"
                onClick={handleSendToPrint}
                disabled={isPending}
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs"
              >
                <Printer className="h-3.5 w-3.5 mr-1" />
                Send to Print Floor
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. NOTIFICATIONS */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border animate-in fade-in-0 ${
            notification.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
          }`}
        >
          {notification.type === 'warning' ? (
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* 3. MULTI-WORK SIBLING NAVIGATION BAR (When Invoice has multiple works) */}
      {totalWorksCount > 1 && (
        <Card className="border-2 border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/10 overflow-hidden shadow-xs">
          <div className="p-3.5 bg-indigo-100/50 dark:bg-indigo-950/40 border-b border-indigo-200 dark:border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs">
                {totalWorksCount}
              </div>
              <div>
                <h3 className="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-wide">
                  {tBilingual(
                    `Grouped Invoice Works (${totalWorksCount} Total Items)`,
                    `ইনভয়েস ভিত্তিক কাজের তালিকা (মোট ${toBengaliNumerals(totalWorksCount)} টি কাজ)`
                  )}
                </h3>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-400">
                  {tBilingual(
                    `Invoice #${invoiceNumber} • Switch between design works in this group instantly:`,
                    `ইনভয়েস #${invoiceNumber} • এই গ্রুপের প্রতিটি ডিজাইনে দ্রুত সুইচ করুন:`
                  )}
                </p>
              </div>
            </div>

            <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Customer: <span className="text-slate-900 dark:text-white">{job.customer_name}</span>
            </div>
          </div>

          {/* Sibling Tabs / Pills */}
          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {siblingWorks.map((work) => {
              const isActive = work.isCurrent
              return (
                <button
                  key={work.id}
                  onClick={() => {
                    if (!isActive) {
                      router.push(`/${slug}/design/${work.id}`)
                    }
                  }}
                  className={cn(
                    'text-left p-3 rounded-xl border transition-all relative group flex flex-col justify-between space-y-2',
                    isActive
                      ? 'bg-white dark:bg-slate-900 border-indigo-500 dark:border-indigo-400 shadow-md ring-2 ring-indigo-500/20'
                      : 'bg-white/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-indigo-300 hover:bg-white dark:hover:bg-slate-900 shadow-2xs'
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="h-5 w-5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 flex items-center justify-center text-[10px] font-black">
                          #{work.index + 1}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 truncate">
                          {work.designNumber}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9px] px-1.5 py-0 capitalize shrink-0',
                          work.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        )}
                      >
                        {work.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {work.title}
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      <span className="truncate font-medium">{work.dimensions}</span>
                      {work.areaSft && (
                        <>
                          <span>•</span>
                          <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">{work.areaSft} SFT</span>
                        </>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {work.material}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      Qty: {work.quantity} {work.unit}
                    </span>
                    {work.totalPrice && (
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        ৳{formatBDT(work.totalPrice)}
                      </span>
                    )}
                  </div>

                  {isActive && (
                    <div className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] shadow-sm">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </Card>
      )}

      {/* 4. MAIN WORKBENCH 2-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: ARTWORK VIEWER & SAFE PROOFS (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="overflow-hidden shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <span>{activeVersion.version_label}</span>
                    {activeVersion.is_approved && (
                      <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> (Approved)
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Uploaded by {activeVersion.uploaded_by_name} • {activeVersion.created_at}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`uppercase text-xs font-black px-2.5 py-0.5 rounded border font-mono ${getFormatBadgeColor(
                      currentFormat
                    )}`}
                  >
                    .{currentFormat}
                  </span>

                  {/* Zoom Lightbox Trigger */}
                  {activeVersion.proof_file_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsLightboxOpen(true)}
                      className="h-7 text-xs font-bold gap-1"
                    >
                      <Maximize2 className="h-3 w-3" />
                      Zoom
                    </Button>
                  )}

                  {!job.is_locked && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsUploadOpen(true)}
                      className="h-7 text-xs font-bold gap-1 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800"
                    >
                      <Upload className="h-3 w-3" />
                      Paste / Upload (Ctrl+V)
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* IMAGE CANVAS & PROOF DISPLAY */}
              {activeVersion.proof_file_url ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDraggingOver(true)
                  }}
                  onDragLeave={() => setIsDraggingOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsDraggingOver(false)
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      processImageFile(e.dataTransfer.files[0])
                    }
                  }}
                  className={cn(
                    'rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center min-h-[380px] relative group transition-all',
                    isDraggingOver && 'ring-4 ring-indigo-500 ring-offset-2'
                  )}
                >
                  <img
                    src={activeVersion.proof_file_url}
                    alt={activeVersion.proof_file_name || 'Design Proof'}
                    className="max-h-[520px] w-full object-contain cursor-zoom-in"
                    onClick={() => setIsLightboxOpen(true)}
                  />

                  {/* Top-Right Paste Helper Badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded bg-black/70 text-white backdrop-blur-xs border border-white/10">
                      <Clipboard className="h-3 w-3 text-indigo-400" /> Paste (<kbd className="font-mono text-[10px]">Ctrl+V</kbd>)
                    </span>
                  </div>

                  {/* Bottom Actions Overlay */}
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                    <button
                      onClick={() => setIsLightboxOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/80 text-white text-xs font-bold hover:bg-black transition-colors"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                      Inspector Lightbox
                    </button>
                    <a
                      href={activeVersion.proof_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/80 text-white text-xs font-bold hover:bg-black transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Full Image
                    </a>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setIsUploadOpen(true)}
                  className="p-10 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 text-center space-y-3 cursor-pointer hover:bg-indigo-50/70 transition-all"
                >
                  <div className="h-14 w-14 mx-auto rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center font-black">
                    <Upload className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Drop Artwork Proof or Press Ctrl+V
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Click to browse or paste screenshot from clipboard directly to render customer proof.
                    </p>
                  </div>
                </div>
              )}

              {/* Version Specs Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl text-xs border border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-700 dark:text-slate-300">File Reference:</div>
                  <code className="text-[11px] text-slate-500 font-mono">
                    {activeVersion.source_file_name || activeVersion.proof_file_name || 'proof.png'}
                  </code>
                </div>
                {activeVersion.change_notes && (
                  <div className="text-slate-600 dark:text-slate-400 text-right max-w-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Notes: </span>
                    {activeVersion.change_notes}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 5. ATTACHMENTS & REFERENCE BRIEFS SECTION */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-pink-600" />
                  <span>{tBilingual('Client Attachments & Reference Files', 'গ্রাহকের রেফারেন্স ফাইল ও সংযুক্তি')}</span>
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddAttachmentOpen(true)}
                  className="h-7 text-xs font-bold text-pink-700 border-pink-200 hover:bg-pink-50 dark:border-pink-800"
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Add File
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {currentWork?.attachments && currentWork.attachments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentWork.attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="h-8 w-8 rounded-lg bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300 flex items-center justify-center font-bold text-xs shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="truncate">
                          <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {att.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">{att.size || 'Attachment'}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                          title="Preview"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </a>
                        <a
                          href={att.url}
                          download={att.name}
                          className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center border border-dashed rounded-xl border-slate-200 dark:border-slate-800 text-xs text-slate-400 space-y-1">
                  <Paperclip className="h-6 w-6 mx-auto text-slate-300 mb-1" />
                  <p>No extra reference attachments uploaded with this work item.</p>
                  <p className="text-[11px] text-slate-500">
                    You can attach client logos, fonts, vectors, or reference photos anytime.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: CUSTOMER CONTACT, BRIEFS & SPECS, VERSION TIMELINE (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* 6. CUSTOMER PROFILE & DIRECT CONTACT CARD */}
          <Card className="shadow-sm border-2 border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <User className="h-4 w-4 text-indigo-600" />
                  <span>{tBilingual('Customer Contact & Profile', 'গ্রাহকের বিবরণ ও যোগাযোগ')}</span>
                </CardTitle>
                <Badge variant="outline" className="text-[10px] uppercase font-bold">
                  {customerProfile?.customer_category || customerProfile?.customer_type || 'Customer'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3.5">
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  {job.customer_name}
                </h4>
                {customerProfile?.name_bn && (
                  <p className="text-xs text-slate-500 font-medium">{customerProfile.name_bn}</p>
                )}
                {customerProfile?.company_name && customerProfile.company_name !== job.customer_name && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1 mt-0.5">
                    <Building className="h-3 w-3 text-slate-400" />
                    {customerProfile.company_name}
                  </p>
                )}
              </div>

              {/* Phone & Direct Communication */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    Phone / WhatsApp:
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                    {customerPhone || 'Not provided'}
                  </span>
                </div>

                {customerPhone && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      className="h-7 text-xs flex-1 font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-800"
                    >
                      <a href={`tel:${customerPhone}`}>
                        <Phone className="h-3 w-3 mr-1" />
                        Call
                      </a>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsWhatsAppModalOpen(true)}
                      className="h-7 text-xs flex-1 font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                    >
                      <Share2 className="h-3 w-3 mr-1" />
                      WhatsApp
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyPhone}
                      className="h-7 text-xs px-2.5 font-bold"
                      title="Copy Number"
                    >
                      {copiedPhone ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* Address */}
              {customerAddress && (
                <div className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{customerAddress}</span>
                </div>
              )}

              {/* Commercial Invoice & Billing Summary */}
              {linkedInvoice && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-500">Commercial Amount:</span>
                    <span className="font-mono text-slate-900 dark:text-white">
                      ৳{formatBDT((linkedInvoice as any).total_amount || linkedInvoice.grand_total || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-600 font-semibold">Paid: ৳{formatBDT(linkedInvoice.paid_amount || 0)}</span>
                    <span className="text-rose-600 font-semibold">Due: ৳{formatBDT(linkedInvoice.due_amount || 0)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 7. ITEM INFORMATION, BRIEFS & TECHNICAL SPECIFICATIONS */}
          <Card className="shadow-sm border border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <span>{tBilingual('Item Specs & Requirements', 'আইটেমের তথ্য ও টেকনিক্যাল স্পেসিফিকেশন')}</span>
                </CardTitle>
                <div className="flex items-center gap-1.5">
                  {totalWorksCount > 1 && (
                    <Badge variant="outline" className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300">
                      Item #{((currentWork?.index ?? 0) + 1)} of {totalWorksCount}
                    </Badge>
                  )}
                  {currentWork?.itemKind && (
                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-700 dark:text-slate-300">
                      {currentWork.itemKind}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* Item Title & Classification Header */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-purple-50/80 to-indigo-50/80 dark:from-purple-950/20 dark:to-indigo-950/20 border border-purple-200/80 dark:border-purple-900/50">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                      Current Work Item
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                      {currentWork?.title || job.title}
                    </h4>
                    {currentWork?.productName && currentWork.productName !== currentWork.title && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Product: <span className="font-medium text-slate-700 dark:text-slate-300">{currentWork.productName}</span>
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-bold capitalize shrink-0',
                      currentWork?.routing === 'design_ok'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    )}
                  >
                    {currentWork?.routing === 'design_ok' ? 'Design OK' : 'Design Required'}
                  </Badge>
                </div>
              </div>

              {/* Core Physical & Commercial Specs Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Dimensions & Area */}
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Ruler className="h-3 w-3 text-slate-400" />
                    Target Dimensions
                  </span>
                  <div className="mt-1">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {currentWork?.dimensions || job.dimensions_spec || 'Standard'}
                    </p>
                    {(currentWork?.areaSft || (job as any).area_sft) && (
                      <span className="inline-block mt-0.5 text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
                        Area: {currentWork?.areaSft || (job as any).area_sft} SFT
                      </span>
                    )}
                  </div>
                </div>

                {/* Quantity & Unit */}
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Box className="h-3 w-3 text-slate-400" />
                    Quantity & Unit
                  </span>
                  <div className="mt-1">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {currentWork?.quantity || job.quantity || 1} {currentWork?.unit || job.unit || 'pcs'}
                    </p>
                    {(currentWork?.unitPrice || (job as any).unit_price) && (
                      <span className="inline-block mt-0.5 text-[10px] text-slate-500 font-medium">
                        Rate: ৳{formatBDT(currentWork?.unitPrice || (job as any).unit_price)} / {currentWork?.unit || job.unit || 'pcs'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Material / Substrate */}
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Layers className="h-3 w-3 text-slate-400" />
                    Media / Substrate Material
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white mt-1">
                    {currentWork?.material || job.material || 'Standard Media / Substrate'}
                  </p>
                </div>
              </div>

              {/* Finishing Breakdown (Styled Pills with Icons) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Scissors className="h-3.5 w-3.5 text-pink-600" />
                    Finishing & Post-Press Requirements:
                  </span>
                  {finishingItems.length > 0 && (
                    <span className="text-[10px] font-bold text-slate-400">
                      {finishingItems.length} selected
                    </span>
                  )}
                </div>

                {finishingItems.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {finishingItems.map((fin, fIdx) => (
                      <span
                        key={fIdx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-pink-50 text-pink-900 border border-pink-200 dark:bg-pink-950/40 dark:text-pink-200 dark:border-pink-800/60 shadow-2xs"
                      >
                        <span>{getFinishingBadgeEmoji(fin.name)}</span>
                        <span>{fin.name}</span>
                        {fin.cost && fin.cost > 0 && (
                          <span className="font-mono text-[10px] text-pink-700 dark:text-pink-300 font-bold">
                            (+৳{formatBDT(fin.cost)})
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>Standard finishing (No extra post-press required).</span>
                  </div>
                )}
              </div>

              {/* Add-ons & Accessories (if any) */}
              {addOnItems.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-amber-600" />
                    Add-ons & Hardware Accessories:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {addOnItems.map((addon, aIdx) => (
                      <span
                        key={aIdx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800/60"
                      >
                        <span>📦</span>
                        <span>{addon.name}</span>
                        {addon.cost && addon.cost > 0 && (
                          <span className="font-mono text-[10px] text-amber-700 dark:text-amber-300 font-bold">
                            (+৳{formatBDT(addon.cost)})
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer Brief / Special Remarks Callout */}
              <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 space-y-1.5">
                <div className="font-bold text-xs text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                  <span>Customer Brief & Special Remarks:</span>
                </div>
                <p className="text-xs text-purple-950 dark:text-purple-300 leading-relaxed font-medium">
                  {currentWork?.brief || job.instructions || 'Standard print specifications as per invoice.'}
                </p>
              </div>

              {/* Prepress & Technical Quality Checklist (Interactive In-Place) */}
              <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    Prepress & Machine Readiness:
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-bold px-1.5 py-0',
                      isAllPrepressPassed
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-indigo-100 text-indigo-800 border-indigo-300'
                    )}
                  >
                    {prepressPassedCount} / 5 Passed
                  </Badge>
                </div>

                <div className="space-y-1.5 pt-1 text-xs">
                  <button
                    type="button"
                    onClick={() => togglePrepressCheck('dimensions')}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      {prepressChecks.dimensions ? (
                        <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400 shrink-0" />
                      )}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Dimensions Match ({currentWork?.dimensions || job.dimensions_spec || 'Standard'})
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600">
                      {prepressChecks.dimensions ? 'Verified' : 'Pending'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePrepressCheck('colorProfile')}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      {prepressChecks.colorProfile ? (
                        <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400 shrink-0" />
                      )}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        High-Res CMYK 300 DPI Profile
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600">
                      {prepressChecks.colorProfile ? 'Verified' : 'Pending'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePrepressCheck('bleedMargin')}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      {prepressChecks.bleedMargin ? (
                        <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400 shrink-0" />
                      )}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Bleed / Hemming Margins Reserved
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600">
                      {prepressChecks.bleedMargin ? 'Verified' : 'Pending'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePrepressCheck('outlines')}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      {prepressChecks.outlines ? (
                        <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400 shrink-0" />
                      )}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Vector Curves & Fonts Outlined
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600">
                      {prepressChecks.outlines ? 'Verified' : 'Check'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePrepressCheck('proofApproved')}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      {prepressChecks.proofApproved ? (
                        <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400 shrink-0" />
                      )}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Client Proof Approval Gate
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold ${prepressChecks.proofApproved ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {prepressChecks.proofApproved ? 'Approved' : 'Pending Gate'}
                    </span>
                  </button>
                </div>

                {isAllPrepressPassed && (
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 animate-in fade-in-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>All Prepress Checks Passed • Ready for Print Floor</span>
                  </div>
                )}
              </div>

              {/* Multi-Work Group Summary Toggle */}
              {totalWorksCount > 1 && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setIsInvoiceMatrixOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-indigo-600" />
                      View All {totalWorksCount} Invoice Items Matrix
                    </span>
                    {isInvoiceMatrixOpen ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </button>

                  {isInvoiceMatrixOpen && (
                    <div className="mt-2 space-y-2 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs animate-in fade-in-0">
                      {siblingWorks.map((sw) => (
                        <div
                          key={sw.id}
                          onClick={() => {
                            if (!sw.isCurrent) {
                              router.push(`/${slug}/design/${sw.id}`)
                            }
                          }}
                          className={cn(
                            'p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2',
                            sw.isCurrent
                              ? 'bg-indigo-50/60 border-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-800'
                              : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100 dark:bg-slate-900/50 dark:border-slate-800'
                          )}
                        >
                          <div className="truncate">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] font-bold text-indigo-600">
                                #{sw.index + 1} • {sw.designNumber}
                              </span>
                              {sw.isCurrent && (
                                <Badge className="bg-indigo-600 text-white text-[9px] px-1 py-0 h-3.5">
                                  Current
                                </Badge>
                              )}
                            </div>
                            <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                              {sw.title}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {sw.dimensions} • {sw.quantity} {sw.unit} • {sw.material}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[9px] px-1 py-0 capitalize',
                                sw.status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              )}
                            >
                              {sw.status.replace('_', ' ')}
                            </Badge>
                            {sw.totalPrice && (
                              <div className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                                ৳{formatBDT(sw.totalPrice)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 8. VERSION TIMELINE & CUSTOMER REVISIONS */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <History className="h-4 w-4 text-slate-500" />
                  Version & Approval Timeline
                </span>
                <span className="text-xs text-slate-400 font-normal">
                  {job.versions?.length || 1} versions
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
              {(job.versions || []).map((ver: DesignVersionRecord) => (
                <button
                  key={ver.id}
                  onClick={() => setActiveVersionNumber(ver.version_number)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    ver.version_number === activeVersionNumber
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 dark:border-indigo-700 ring-1 ring-indigo-500'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {ver.version_label}
                      </span>
                      {ver.is_approved && (
                        <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0 h-4">
                          Approved
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      .{ver.file_format}
                    </span>
                  </div>
                  {ver.change_notes && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                      {ver.change_notes}
                    </p>
                  )}
                  <div className="text-[10px] text-slate-400 mt-1">
                    Uploaded by {ver.uploaded_by_name} • {ver.created_at}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 9. LIGHTBOX INSPECTOR MODAL */}
      <ModalDialog
        open={isLightboxOpen}
        onOpenChange={setIsLightboxOpen}
        title={`Artwork Lightbox: ${job.design_number} - ${activeVersion.version_label}`}
        description="Inspect high-resolution artwork proof with zoom and aspect verification."
        className="max-w-4xl"
      >
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between gap-2 p-2 bg-slate-900 text-white rounded-lg text-xs">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setLightboxZoom((z) => Math.max(0.5, z - 0.25))}
                className="h-7 text-xs text-white hover:bg-slate-800"
              >
                <ZoomOut className="h-3.5 w-3.5 mr-1" /> Zoom Out
              </Button>
              <span className="font-mono">{Math.round(lightboxZoom * 100)}%</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setLightboxZoom((z) => Math.min(3, z + 0.25))}
                className="h-7 text-xs text-white hover:bg-slate-800"
              >
                <ZoomIn className="h-3.5 w-3.5 mr-1" /> Zoom In
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setLightboxZoom(1)}
                className="h-7 text-xs text-white hover:bg-slate-800"
              >
                Reset
              </Button>
            </div>

            <div className="text-slate-400 text-[11px] font-mono">
              Target: {currentWork?.dimensions || job.dimensions_spec || 'Standard'}
            </div>
          </div>

          <div className="overflow-auto max-h-[65vh] rounded-xl bg-slate-950 flex items-center justify-center p-4 border border-slate-800">
            <img
              src={activeVersion.proof_file_url}
              alt="Lightbox Proof"
              style={{ transform: `scale(${lightboxZoom})`, transformOrigin: 'center center' }}
              className="max-w-full transition-transform duration-150"
            />
          </div>
        </div>
      </ModalDialog>

      {/* 10. WHATSAPP PROOF DISPATCH MODAL */}
      <ModalDialog
        open={isWhatsAppModalOpen}
        onOpenChange={setIsWhatsAppModalOpen}
        title="Share Artwork Proof via WhatsApp"
        description="Send customer proof approval link directly to the client's WhatsApp."
      >
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="waPhone">Customer WhatsApp Number</Label>
            <Input
              id="waPhone"
              value={whatsAppPhone}
              onChange={(e) => setWhatsAppPhone(e.target.value)}
              placeholder="e.g. 01712345678"
            />
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
            <span className="font-bold text-slate-700 dark:text-slate-300">Message Preview:</span>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-sans bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
              Hello {job.customer_name}, your artwork proof for &quot;{job.title}&quot; (#{job.design_number}, Invoice #{invoiceNumber}) is ready for review. Please check the proof: {activeVersion.proof_file_url}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setIsWhatsAppModalOpen(false)}>
              Close
            </Button>
            <Button
              asChild
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              <a
                href={`https://wa.me/${whatsAppPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                  `Hello ${job.customer_name}, your artwork proof for "${job.title}" (#${job.design_number}, Invoice #${invoiceNumber}) is ready for review. Please check: ${activeVersion.proof_file_url}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Share2 className="h-3.5 w-3.5 mr-1.5" />
                Launch WhatsApp Chat
              </a>
            </Button>
          </div>
        </div>
      </ModalDialog>

      {/* 11. PREPRESS CHECKLIST MODAL */}
      <ModalDialog
        open={isPrepressModalOpen}
        onOpenChange={setIsPrepressModalOpen}
        title="Prepress & Machine Readiness Checklist"
        description="Verify technical prepress requirements before sending artwork to the print floor."
      >
        <div className="space-y-4 pt-1 text-xs">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-700 dark:text-slate-300">Dimensions Check:</span>
              <span className="font-mono font-bold text-emerald-600">
                {currentWork?.dimensions || job.dimensions_spec || 'Standard'} (Verified)
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-700 dark:text-slate-300">Color Profile:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">CMYK / High Res</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-700 dark:text-slate-300">Target Material:</span>
              <span className="font-bold text-indigo-600">{currentWork?.material || job.material || 'Standard Media'}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-700 dark:text-slate-300">Commercial Gate:</span>
              <span className={`font-bold ${hasInvoice ? 'text-emerald-600' : 'text-rose-600'}`}>
                {hasInvoice ? 'Cleared (Invoice Linked)' : 'Blocked (Invoice Required)'}
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button onClick={() => setIsPrepressModalOpen(false)}>Done</Button>
          </div>
        </div>
      </ModalDialog>

      {/* 12. ADD ATTACHMENT MODAL */}
      <ModalDialog
        open={isAddAttachmentOpen}
        onOpenChange={setIsAddAttachmentOpen}
        title="Add Reference Attachment"
        description="Attach client reference files, brand guidelines, or vector logos."
      >
        <form onSubmit={handleAddAttachment} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="attName" required>Attachment Name / Label</Label>
            <Input
              id="attName"
              value={attachmentName}
              onChange={(e) => setAttachmentName(e.target.value)}
              placeholder="e.g. Logo Vector .AI / Reference Color Palette"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="attUrl" required>File URL or Image Link</Label>
            <Input
              id="attUrl"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              placeholder="https://..."
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddAttachmentOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-pink-600 hover:bg-pink-700 text-white font-bold">
              Save Attachment
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* 13. MODAL: UPLOAD NEW VERSION */}
      <ModalDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        title="Upload Artwork Revision"
        description="Upload or paste (.JPG / .PNG) artwork proofs. Supports clipboard paste (Ctrl+V)."
      >
        <form onSubmit={handleUploadVersion} className="space-y-4 pt-1">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDraggingOver(true)
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDraggingOver(false)
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                processImageFile(e.dataTransfer.files[0])
              }
            }}
            className={cn(
              'border-2 border-dashed rounded-xl p-6 text-center space-y-2 cursor-pointer transition-all',
              isDraggingOver
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50 dark:bg-slate-900/50'
            )}
          >
            {newVersionProofUrl ? (
              <div className="space-y-2">
                <img
                  src={newVersionProofUrl}
                  alt="Proof Preview"
                  className="max-h-48 mx-auto rounded-lg object-contain shadow-xs"
                />
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Ready to Save ({newVersionFormat.toUpperCase()})
                </p>
              </div>
            ) : (
              <div>
                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Drag & Drop Image, Click to Browse, or Press Ctrl+V
                </p>
                <p className="text-[11px] text-slate-500">Supports .JPG, .JPEG, and .PNG</p>
              </div>
            )}
            <input
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              className="hidden"
              id="file-upload-input"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  processImageFile(e.target.files[0])
                }
              }}
            />
            <Label
              htmlFor="file-upload-input"
              className="inline-block mt-2 px-3 py-1 bg-white dark:bg-slate-800 border rounded text-xs font-bold cursor-pointer"
            >
              Browse Files
            </Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vNotes">Revision Change Notes</Label>
            <Input
              id="vNotes"
              value={newVersionNotes}
              onChange={(e) => setNewVersionNotes(e.target.value)}
              placeholder="e.g. Corrected phone number in banner, adjusted CMYK contrast"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!newVersionProofUrl}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              Save Version {(job.versions?.length || 0) + 1}
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* 14. MODAL: APPROVE & LOCK */}
      <ModalDialog
        open={isApproveOpen}
        onOpenChange={setIsApproveOpen}
        title="Approve & Lock Version for Print Production"
        description="Locking protects the approved proof from accidental modifications."
      >
        <form onSubmit={handleApproveAndLock} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="apprName" required>Approver Name</Label>
            <Input
              id="apprName"
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              placeholder="e.g. Shamol / Customer Rep"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apprNotes">Approval Notes</Label>
            <Input
              id="apprNotes"
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              placeholder="e.g. Colors confirmed by customer over WhatsApp"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsApproveOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Confirm & Lock Version
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* 15. MODAL: SEND INVOICE REQUEST */}
      <ModalDialog
        open={isInvoiceRequestOpen}
        onOpenChange={setIsInvoiceRequestOpen}
        title="Send Invoice Request to Sales / Billing"
        description="Notify the responsible Manager / Sales Representative to create the official invoice so production can proceed."
      >
        <form onSubmit={handleSendInvoiceRequest} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="reqAmt" required>Estimated Job Amount (৳ BDT)</Label>
            <Input
              id="reqAmt"
              type="number"
              value={estimatedAmount}
              onChange={(e) => setEstimatedAmount(Number(e.target.value))}
              required
              min={1}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reqNotes">Notes / Specifications for Billing</Label>
            <textarea
              id="reqNotes"
              rows={3}
              placeholder="e.g. 500 SFT Flex Banner with eyelet finishing and bamboo frames."
              value={requestNotes}
              onChange={(e) => setRequestNotes(e.target.value)}
              className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsInvoiceRequestOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              Dispatch Request & Notify Sales
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}

export default function DesignDetailPage() {
  return (
    <DesignDetailErrorBoundary>
      <React.Suspense fallback={<DesignDetailPageLoading />}>
        <DesignDetailContent />
      </React.Suspense>
    </DesignDetailErrorBoundary>
  )
}

