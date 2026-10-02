'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import {
 Briefcase,
 ArrowLeft,
 Printer,
 Calendar,
 Phone,
 Building,
 CheckCircle2,
 AlertTriangle,
 Flame,
 Layers,
 Clock,
 Plus,
 Receipt,
 FileCheck,
 Truck,
 Wrench,
 Sparkles,
 ExternalLink,
 FileText,
 Send,
 Lock,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import {
 SalesOrderRecord,
 JobOrderRecord,
 OrderTimelineEventRecord,
 JobDepartment,
 JobStatus,
 OrderPriority,
} from '@/types/order.types'
import { formatBDT } from '@/lib/formatters'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { createInvoiceRequestAction } from '@/actions/invoice-request.actions'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { JobFlowStepper } from '@/components/orders/job-flow-stepper'
import { ChildJobsBreakdown } from '@/components/orders/child-jobs-breakdown'
import { resolveOrderJobWorkflow } from '@/lib/workflow/workflow-engine'
import { getOrderWithDetailsAction, type OrderWithDetailsResult } from '@/actions/order.actions'

function OrderDetailContent() {
 const params = useParams()
 const pathname = usePathname()
 const orderId = (params?.id as string) || ''
 const { company } = useTenant()
 const { locale, tBilingual } = useI18n()
 const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'

 const [isMounted, setIsMounted] = useState(false)
 const [serverData, setServerData] = useState<OrderWithDetailsResult | null>(null)
 const [isLoadingServer, setIsLoadingServer] = useState(true)

 const fetchOrderDetails = React.useCallback(async () => {
 if (!orderId) return
 setIsLoadingServer(true)
 try {
 const res = await getOrderWithDetailsAction(orderId, company?.id || slug)
 if (res.success && res.data) {
 setServerData(res.data)
      }
    } catch (e) {
 console.error('Failed to load server order details:', e)
    } finally {
 setIsLoadingServer(false)
    }
  }, [orderId, company?.id, slug])

 useEffect(() => {
 setIsMounted(true)
 fetchOrderDetails()
  }, [fetchOrderDetails])

 const [orders] = useDataStore<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS, [])
 const [invoices] = useDataStore<any[]>(STORAGE_KEYS.INVOICES, [])
 const [allJobs] = useDataStore<JobOrderRecord[]>(STORAGE_KEYS.JOB_ORDERS, [])
 const [allTimeline] = useDataStore<OrderTimelineEventRecord[]>(STORAGE_KEYS.TIMELINE_EVENTS, [])

 let localOrder = orders.find((o) => o.id === orderId || o.order_number === orderId)
 if (!localOrder) {
 const inv = invoices.find(
      (i) =>
 i.id === orderId ||
 i.invoice_number === orderId ||
 i.order_number === orderId ||
 i.sales_order_id === orderId
    )
 if (inv) {
 localOrder = {
 id: inv.sales_order_id || inv.id,
 company_id: inv.company_id || company?.id || 'default',
 order_number: inv.order_number || inv.invoice_number.replace('INV-', 'ORD-'),
 customer_id: inv.customer_id,
 customer_name: inv.customer_name,
 customer_phone: inv.customer_phone,
 customer_address: inv.customer_address,
 salesperson_name: inv.created_by_name || 'Commercial Manager',
 order_date: inv.invoice_date || new Date().toISOString().split('T')[0],
 delivery_date:
 inv.due_date || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
 priority: (inv.priority as OrderPriority) || 'normal',
 status: inv.status === 'paid' ? 'completed' : 'confirmed',
 payment_terms: 'cash',
 subtotal: inv.subtotal || 0,
 discount_amount: inv.discount_amount || 0,
 vat_amount: inv.vat_amount || 0,
 final_price: inv.grand_total || 0,
 advance_amount: inv.paid_amount || 0,
 due_amount: inv.due_amount || 0,
 notes: `Origin: Invoice #${inv.invoice_number}`,
 items: (inv.items || []).map((it: any, idx: number) => ({
 id: it.id || `oi-${idx}`,
 item_name: it.item_description || it.description || it.item_name || 'Item',
 width: it.width || 0,
 height: it.height || 0,
 dimension_unit: (it.dimension_unit as any) || 'ft',
 quantity: it.quantity || 1,
 unit: it.unit || 'pcs',
 unit_price: it.unit_price || 0,
 total_price: it.total_price || 0,
 material_spec: it.material_spec || 'Standard Media',
        })),
 jobs_count: inv.items?.length || 1,
 workflow_routing:
 inv.items &&
 inv.items.some(
            (it: any) => it.workflow_routing === 'design_required' || it.design_required
          )
            ? 'design_required'
            : inv.items && inv.items.some((it: any) => it.workflow_routing === 'design_ok')
            ? 'design_ok'
            : 'ready_production',
 commercial_status: 'invoice_created',
 invoice_id: inv.id,
 invoice_number: inv.invoice_number,
 production_gate_status: 'ready_for_production',
 created_at: inv.created_at || new Date().toISOString(),
 updated_at: inv.updated_at || new Date().toISOString(),
      }
    }
  }

 const order = serverData?.order || localOrder
 const localJobs = allJobs.filter(
    (j) =>
 order &&
      (j.order_id === order.id ||
 j.order_id === orderId ||
 j.order_id === order.order_number ||
 j.sales_order_id === order.id ||
        (order.invoice_id && j.invoice_id === order.invoice_id))
  )
 const jobs =
 serverData?.jobs && serverData.jobs.length > 0 ? serverData.jobs : localJobs
 const tasks = serverData?.tasks || []
 const designJobs = serverData?.designJobs || []
 const challans = serverData?.challans || []
 const timeline = allTimeline.filter(
    (t) =>
 order &&
      (t.order_id === order.id ||
 t.order_id === orderId ||
 t.order_id === order.order_number)
  )

 const workflow = React.useMemo(() => {
 if (!order) return null
 return resolveOrderJobWorkflow(order, jobs, tasks, designJobs, challans, slug)
  }, [order, jobs, tasks, designJobs, challans, slug])

  // Modals
 const [isAddJobOpen, setIsAddJobOpen] = useState(false)
 const [isPayOpen, setIsPayOpen] = useState(false)
 const [isInvoiceRequestOpen, setIsInvoiceRequestOpen] = useState(false)
 const [invoiceNotes, setInvoiceNotes] = useState('')
 const [isSubmittingInvoiceRequest, setIsSubmittingInvoiceRequest] = useState(false)
 const [selectedJobForPrint, setSelectedJobForPrint] = useState<JobOrderRecord | null>(null)
 const [notification, setNotification] = useState<string | null>(null)

  // Add Job Form State
 const [jobProduct, setJobProduct] = useState('')
 const [jobSize, setJobSize] = useState('')
 const [jobMaterial, setJobMaterial] = useState('')
 const [jobDept, setJobDept] = useState<JobDepartment>('wide_format_print')
 const [jobOperator, setJobOperator] = useState('')
 const [jobInstructions, setJobInstructions] = useState('')

  // Payment Form State
 const [collectionAmount, setCollectionAmount] = useState<number>(0)
 const [collectionMethod, setCollectionMethod] = useState('Cash Counter')

 const showNotification = (msg: string) => {
 setNotification(msg)
 setTimeout(() => setNotification(null), 3500)
  }

 const handleSendInvoiceRequest = async (e?: React.FormEvent) => {
 if (e) e.preventDefault()
 if (!order) return
 setIsSubmittingInvoiceRequest(true)
 try {
 const itemsSummary =
 order.items && order.items.length > 0
          ? order.items
              .map(
                (it) =>
                  `${it.item_name} (${it.width || 0}×${it.height || 0} ${it.dimension_unit || 'ft'}, Qty: ${it.quantity || 1})`
              )
              .join('; ')
          : 'Sales Order Line Items'

 const mappedItems = (order.items || []).map((it) => ({
 productId: it.product_id || undefined,
 product_id: it.product_id || undefined,
 item_kind: (it as any).item_kind || 'service',
 product_type: (it as any).product_type || undefined,
 itemName: it.item_name,
 item_name: it.item_name,
 material_spec: it.material_spec || undefined,
 dimensions_spec:
          (it as any).dimensions_spec ||
          (it.width && it.height ? `${it.width}×${it.height} ${it.dimension_unit || 'ft'}` : undefined),
 width: String(it.width ?? '0'),
 height: String(it.height ?? '0'),
 dimension_unit: it.dimension_unit || 'ft',
 quantity: Number(it.quantity) || 1,
 unit: it.unit || 'sft',
 rate: Number(it.unit_price ?? (it as any).rate ?? 0),
 unit_price: Number(it.unit_price ?? (it as any).rate ?? 0),
 total_price: Number(it.total_price ?? 0),
 finishing: (it as any).finishing || 'None',
 design_required: Boolean((it as any).design_required),
      }))

 const res = await createInvoiceRequestAction({
 companyId: order.company_id || company?.id,
 salesOrderId: order.id,
 orderId: order.id,
 orderNumber: order.order_number,
 customerId: order.customer_id || null,
 customerName: order.customer_name,
 customerPhone: order.customer_phone || (order as any).phone || null,
 customerEmail: (order as any).customer_email || (order as any).email || null,
 customerAddress:
 order.customer_address || (order as any).delivery_address || (order as any).shipping_address || null,
 companyName: (order as any).company_name || (order as any).customer_company || null,
 items: mappedItems,
 itemsSummary,
 estimatedAmount: Number(order.final_price || order.subtotal || 0),
 notes: invoiceNotes || order.notes || 'Commercial invoice requested for production gating clearance.',
 priority: order.priority === 'very_urgent' ? 'urgent' : 'normal',
      })
 if (res.success) {
 showNotification('Invoice request dispatched to sales/management!')
 setIsInvoiceRequestOpen(false)
 setInvoiceNotes('')
 PrintERPDataStore.updateItem<SalesOrderRecord>(STORAGE_KEYS.ORDERS, order.id, {
 commercial_status: 'invoice_requested',
 invoice_requested_at: new Date().toISOString(),
        })
      } else {
 showNotification(res.error || 'Failed to dispatch invoice request.')
      }
    } catch (err: any) {
 showNotification(err.message || 'Error creating invoice request.')
    } finally {
 setIsSubmittingInvoiceRequest(false)
    }
  }

 if (isLoadingServer && !order) {
 return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Briefcase className="h-7 w-7 text-blue-600 animate-pulse"/>
        <p className="text-xs font-semibold text-muted-foreground">
          {tBilingual('Loading authoritative order details...', 'অর্ডারের তথ্য লোড হচ্ছে...')}
        </p>
      </div>
    )
  }

 if (!order) {
 return (
      <div className="space-y-6 max-w-7xl">
        <Link
 href={getTenantNavHref('/orders', pathname, slug)}
 className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground dark:hover:text-foreground mb-3">
          <ArrowLeft className="h-3.5 w-3.5"/>
          {tBilingual('Back to Orders & Job Flow', 'অর্ডার ও কাজের ফ্লো-তে ফিরে যান')}
        </Link>
        <Card className="p-12 text-center border-dashed">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3"/>
          <h2 className="text-base font-bold text-foreground">
            {tBilingual('Sales Order Not Found', 'অর্ডার পাওয়া যায়নি')}
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            {tBilingual(
              'The sales order record you are looking for does not exist in your organization.',
              'আপনার প্রতিষ্ঠানে এই অর্ডারের কোনো তথ্য পাওয়া যায়নি।'
            )}
          </p>
          <Button asChild className="mt-4"size="sm">
            <Link href={getTenantNavHref('/orders', pathname, slug)}>
              {tBilingual('View All Orders', 'সকল অর্ডার দেখুন')}
            </Link>
          </Button>
        </Card>
      </div>
    )
  }

  // Toggle Job Status
 const handleUpdateJobStatus = (jobId: string, newStatus: JobStatus) => {
 PrintERPDataStore.updateItem<JobOrderRecord>(STORAGE_KEYS.JOB_ORDERS, jobId, {
 status: newStatus,
 updated_at: new Date().toISOString(),
    })

 const newEvent: OrderTimelineEventRecord = {
 id: `te-${Date.now()}`,
 order_id: order.id,
 stage: 'production',
 title: `Job Ticket Status: ${newStatus.replace('_', ' ').toUpperCase()}`,
 description: `Job status transitioned to ${newStatus.replace('_', ' ')}.`,
 actor_name: 'Floor Supervisor',
 created_at: 'Just now',
    }
 PrintERPDataStore.addItem<OrderTimelineEventRecord>(STORAGE_KEYS.TIMELINE_EVENTS, newEvent)

 showNotification(`Job status updated to ${newStatus.replace('_', ' ').toUpperCase()}`)
  }

  // Create Additional Job Ticket
 const handleCreateJob = (e: React.FormEvent) => {
 e.preventDefault()
 const jobNum = `JOB-2024-${order.order_number.replace('ORD-', '')}-${String.fromCharCode(65 + jobs.length)}`

 const newJob: JobOrderRecord = {
 id: `job-${Date.now()}`,
 company_id: 'c-01',
 job_number: jobNum,
 order_id: order.id,
 product_name: jobProduct || 'Custom Print Job',
 customer_name: order.customer_name,
 quantity: 1,
 size_spec: jobSize || 'Standard',
 material_spec: jobMaterial || 'Standard Vinyl',
 artwork_status: 'approved',
 deadline: `${order.delivery_date} 16:00`,
 assigned_department: jobDept,
 assigned_employee_name: jobOperator || 'Unassigned',
 production_instructions: jobInstructions,
 status: 'queued',
 workflow_routing: order.workflow_routing || 'design_required',
 commercial_status: order.commercial_status || 'invoice_required',
 production_gate_status: (order.invoice_id || order.commercial_status === 'invoice_created') ? 'ready_for_production' : 'blocked_commercial',
 created_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
    }

 PrintERPDataStore.addItem<JobOrderRecord>(STORAGE_KEYS.JOB_ORDERS, newJob)
 PrintERPDataStore.updateItem<SalesOrderRecord>(STORAGE_KEYS.ORDERS, order.id, {
 jobs_count: (order.jobs_count || 1) + 1,
    })

 setIsAddJobOpen(false)
 showNotification(`Production Job Ticket ${jobNum} dispatched to shop floor.`)
  }

  // Record Payment
 const handleRecordPayment = (e: React.FormEvent) => {
 e.preventDefault()
 if (collectionAmount <= 0) return

 PrintERPDataStore.recordPaymentCollection({
 customerId: order.customer_id || 'cust-01',
 amount: collectionAmount,
 paymentMethod: collectionMethod.toLowerCase().includes('cash') ? 'cash' : 'bank',
 orderId: order.id,
 notes: `Collected ৳ ${collectionAmount} via ${collectionMethod} for ${order.order_number}.`,
    })

 setIsPayOpen(false)
 showNotification(`Collected ৳ ${collectionAmount} via ${collectionMethod}. Remaining due: ৳ ${Math.max(0, order.due_amount - collectionAmount)}.`)
  }

 const getPriorityBadge = (priority: OrderPriority) => {
 switch (priority) {
 case 'very_urgent':
 return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-black bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800 animate-pulse">
            <Flame className="h-3.5 w-3.5 text-red-600 shrink-0"/>
 Very Urgent (জরুরি)
          </span>
        )
 case 'urgent':
 return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0"/>
 Urgent (জরুরি)
          </span>
        )
 case 'normal':
 default:
 return (
          <span className="px-2.5 py-1 rounded text-xs font-medium bg-muted text-foreground">
 Normal Priority
          </span>
        )
    }
  }

 return (
    <div className="space-y-6 max-w-7xl pb-16">
      {/* =========================================================================
          1. HEADER (Section 10 & 11)
 ORDER #1024 | Customer | Total | Paid | Due | Delivery | Priority | Next Action
         ========================================================================= */}
      <div>
        <Link
 href={getTenantNavHref('/orders', pathname, slug)}
 className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground dark:hover:text-foreground mb-3">
          <ArrowLeft className="h-3.5 w-3.5"/>
          {tBilingual('Back to Orders & Jobs', 'অর্ডার ও কাজে ফিরে যান')}
        </Link>

        {/* Master Order Header Card */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Order</span>
                <h1 className="text-2xl font-black tracking-tight text-foreground tabular-nums">
                  #{order.order_number}
                </h1>
                {getPriorityBadge(order.priority)}
                <span className="capitalize px-2 py-0.5 rounded text-xs font-bold bg-muted text-foreground border border-border">
                  {order.status.replace('_', ' ')}
                </span>

                {/* Workflow Routing Badge */}
                {order.workflow_routing && (
                  <Badge
 variant="outline"className={`text-xs font-bold ${
 order.workflow_routing === 'design_required'
                        ? 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300'
                        : order.workflow_routing === 'design_ok'
                        ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                    }`}
                  >
                    {order.workflow_routing === 'design_required'
                      ? '🎨 Design Required'
                      : order.workflow_routing === 'design_ok'
                      ? '⚡ Design OK'
                      : '🚀 Ready Production'}
                  </Badge>
                )}

                {/* Commercial Invoice Gate Status */}
                {order.invoice_id || order.commercial_status === 'invoice_created' ? (
                  <Badge className="bg-emerald-600 text-white text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3"/>
 Invoice Linked {order.invoice_number ? `(#${order.invoice_number})` : ''}
                  </Badge>
                ) : order.commercial_status === 'invoice_requested' ? (
                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-xs font-bold flex items-center gap-1">
                    <Clock className="h-3 w-3 text-amber-600"/>
 Invoice Requested
                  </Badge>
                ) : (
                  <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-xs font-bold flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-rose-600"/>
 Invoice Required
                  </Badge>
                )}
              </div>

              <div className="text-base font-bold text-foreground flex flex-wrap items-center gap-2">
                <span>{order.customer_name}</span>
                {order.customer_phone && (
                  <span className="text-xs font-normal text-muted-foreground inline-flex items-center gap-1">
                    <Phone className="h-3 w-3 text-muted-foreground"/>
                    {order.customer_phone}
                  </span>
                )}
              </div>
            </div>

            {/* Actions: Primary & Secondary (>=44px touch targets on mobile) */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
 size="sm"onClick={() => {
 const wfElem = document.getElementById('workflow-section')
 if (wfElem) wfElem.scrollIntoView({ behavior: 'smooth' })
                }}
 className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold min-h-[44px] px-4 shadow-sm">
                <Layers className="mr-1.5 h-4 w-4"/>
 Open Job Flow
              </Button>

              <Button
 size="sm"onClick={() => {
 setCollectionAmount(order.due_amount)
 setIsPayOpen(true)
                }}
 className="bg-emerald-600 hover:bg-emerald-700 text-xs text-white min-h-[44px] px-3 font-semibold">
                <Receipt className="mr-1.5 h-4 w-4"/>
 Record Payment
              </Button>

              <Button
 size="sm"variant="outline"onClick={() => setIsAddJobOpen(true)}
 className="text-xs min-h-[44px] px-3 font-medium border-input">
                <Plus className="mr-1.5 h-4 w-4 text-blue-600"/>
 Add Job
              </Button>

              {(!order.invoice_id && order.commercial_status !== 'invoice_created') && (
                <Button
 size="sm"variant="outline"onClick={() => setIsInvoiceRequestOpen(true)}
 className="text-xs min-h-[44px] px-3 border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300">
                  <Send className="mr-1.5 h-3.5 w-3.5 text-rose-600"/>
 Request Invoice
                </Button>
              )}
            </div>
          </div>

          {/* Quick Metrics & Target Delivery Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 bg-muted rounded-lg">
              <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider block">Total</span>
              <span className="text-lg font-black text-foreground tabular-nums">
                <CurrencyDisplay amount={order.final_price} />
              </span>
            </div>
            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-lg">
              <span className="text-2xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">Paid</span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                <CurrencyDisplay amount={order.advance_amount} />
              </span>
            </div>
            <div className={`p-3 rounded-lg ${order.due_amount > 0 ? 'bg-amber-50/60 dark:bg-amber-950/30' : 'bg-muted '}`}>
              <span className={`text-2xs font-semibold uppercase tracking-wider block ${order.due_amount > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`}>Due</span>
              <span className={`text-lg font-black tabular-nums ${order.due_amount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                <CurrencyDisplay amount={order.due_amount} />
              </span>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider block">Delivery Due</span>
              <span className="text-sm font-bold text-foreground mt-1 block">
                {order.delivery_date || 'Not specified'}
              </span>
            </div>
          </div>

          {/* CURRENT STAGE & NEXT ACTION Ribbon (Section 13 & 14) */}
          {workflow && (
            <div className={`p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
 workflow.isBlocked
                ? 'bg-amber-50/80 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800'
                : 'bg-blue-50/80 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div>
                  <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">CURRENT</span>
                  <span className="text-sm font-bold text-foreground">
                    {workflow.overallStageLabelEn}
                  </span>
                </div>
                <div className="hidden sm:block text-muted-foreground">|</div>
                <div>
                  <span className="text-2xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 block">NEXT</span>
                  <span className="text-sm font-semibold text-foreground">
                    {workflow.nextActionEn}
                  </span>
                </div>
              </div>

              {workflow.isBlocked ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/60 px-2.5 py-1 rounded">
 BLOCKED: {workflow.blockedReasonEn || 'Hold in effect'}
                  </span>
                  {workflow.blockerActionHref && (
                    <Button asChild size="sm"className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold min-h-[38px]">
                      <Link href={workflow.blockerActionHref}>
                        {workflow.blockerActionLabelEn || 'Resolve Blocker'}
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
 workflow.nextActionHref && (
                  <Button asChild size="sm"className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold min-h-[38px] self-start sm:self-auto">
                    <Link href={workflow.nextActionHref}>
                      {workflow.nextActionEn}
                    </Link>
                  </Button>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Commercial Hold Gate Warning Banner */}
      {(!order.invoice_id && order.commercial_status !== 'invoice_created') && (
        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Lock className="h-5 w-5 text-rose-600 shrink-0 mt-0.5"/>
            <div>
              <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
 Commercial Gate: Official Invoice Not Created
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
 Production floor execution is blocked until an official invoice is generated by sales or accounts.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {order.commercial_status !== 'invoice_requested' ? (
              <Button
 size="sm"onClick={() => setIsInvoiceRequestOpen(true)}
 className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold min-h-[44px] flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5"/>
 Send Invoice Request
              </Button>
            ) : (
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-3 py-1.5 rounded-lg border border-amber-300">
 Invoice Request Dispatched
              </span>
            )}
            <Link href={`/${slug}/billing?action=create_invoice&order_id=${order.id}`}>
              <Button size="sm"variant="outline"className="text-xs min-h-[44px]">
 Create Invoice
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0"/>
          <span>{notification}</span>
        </div>
      )}

      {/* =========================================================================
          2. WORKFLOW (Section 10 & 12)
 JobFlowStepper with canonical print stages (✓, ●, ○, —) & Blocker Alerts
         ========================================================================= */}
      <section id="workflow-section"className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Layers className="h-4.5 w-4.5 text-blue-600"/>
            <span>Workflow & Stage Progress</span>
          </h2>
          <span className="text-xs text-muted-foreground font-medium">
 Status: <strong>{workflow?.derivedOrderStatus || order.status}</strong>
          </span>
        </div>
        {workflow && <JobFlowStepper workflow={workflow} tenantSlug={slug} />}
      </section>

      {/* =========================================================================
          3. JOBS (Section 10, 16, 17)
 ChildJobsBreakdown using unified JobCard component
         ========================================================================= */}
      <section id="jobs-section"className="space-y-3">
        {workflow && (
          <ChildJobsBreakdown
 jobs={jobs}
 childWorkflows={workflow.childJobs}
 tenantSlug={slug}
 onOpenNewJobModal={() => setIsAddJobOpen(true)}
 onSelectJobForPrint={(job) => setSelectedJobForPrint(job)}
 onUpdateJobStatus={handleUpdateJobStatus}
          />
        )}
      </section>

      {/* =========================================================================
          4. FINANCE (Section 10 & 37)
 Financial Reconciliation & Line Items Breakdown
         ========================================================================= */}
      <section id="finance-section"className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Receipt className="h-4.5 w-4.5 text-emerald-600"/>
            <span>Finance & Line Items</span>
          </h2>
          <Button
 size="sm"onClick={() => {
 setCollectionAmount(order.due_amount)
 setIsPayOpen(true)
            }}
 className="bg-emerald-600 hover:bg-emerald-700 text-xs text-white min-h-[38px] font-semibold">
            <Receipt className="mr-1.5 h-3.5 w-3.5"/>
 Record Payment
          </Button>
        </div>

        {/* Financial Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <span className="text-xs font-semibold text-muted-foreground">Contract Final Price</span>
            <div className="text-2xl font-black text-foreground mt-1">
              <CurrencyDisplay amount={order.final_price} />
            </div>
            <span className="text-2xs text-muted-foreground">Terms: {order.payment_terms || 'cash'}</span>
          </Card>

          <Card className="p-4 border-l-4 border-l-emerald-500">
            <span className="text-xs font-semibold text-muted-foreground">Advance Received (পরিশোধিত)</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              <CurrencyDisplay amount={order.advance_amount} />
            </div>
            <span className="text-2xs text-emerald-600 font-medium">
              {order.final_price > 0 ? Math.round((order.advance_amount / order.final_price) * 100) : 0}% Paid
            </span>
          </Card>

          <Card className={`p-4 border-l-4 ${order.due_amount > 0 ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
            <span className="text-xs font-semibold text-muted-foreground">Remaining Balance (বাকি টাকা)</span>
            <div className={`text-2xl font-black mt-1 ${order.due_amount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              <CurrencyDisplay amount={order.due_amount} />
            </div>
            <span className="text-2xs text-muted-foreground">Payment is decoupled from delivery completion</span>
          </Card>
        </div>

        {/* Line Items: Desktop Table & Mobile Stack Cards (Section 54) */}
        <Card className="overflow-hidden border border-border">
          <div className="p-4 border-b border-border bg-muted flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
 Order Line Items ({order.items?.length || 0})
            </h3>
            <span className="text-xs text-muted-foreground font-medium">
 Commercial Breakdown
            </span>
          </div>

          {/* Desktop Table View (>= 640px) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="py-2.5 px-4">#</th>
                  <th className="py-2.5 px-4">Item & Specifications</th>
                  <th className="py-2.5 px-4">Dimensions</th>
                  <th className="py-2.5 px-4">Material</th>
                  <th className="py-2.5 px-4 text-center">Qty</th>
                  <th className="py-2.5 px-4 text-right">Unit Price</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border">
                {(order.items && order.items.length > 0) ? (
 order.items.map((it: any, idx: number) => (
                    <tr key={it.id || idx} className="hover:bg-muted dark:hover:bg-muted/30">
                      <td className="py-3 px-4 font-mono text-muted-foreground">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-foreground">
                        {it.item_name}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {it.width && it.height ? `${it.width} × ${it.height} ${it.dimension_unit || 'ft'}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {it.material_spec || 'Standard Media'}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-foreground">
                        {it.quantity || 1} {it.unit || 'pcs'}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-foreground">
                        ৳{Number(it.unit_price || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-bold text-foreground">
                        ৳{Number(it.total_price || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
 No line items recorded for this order.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Stack View (< 640px) */}
          <div className="block sm:hidden divide-y divide-border dark:divide-border">
            {(order.items && order.items.length > 0) ? (
 order.items.map((it: any, idx: number) => (
                <div key={it.id || idx} className="p-3.5 space-y-1.5">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-xs text-foreground">
                      {idx + 1}. {it.item_name}
                    </span>
                    <span className="font-bold text-xs text-foreground tabular-nums">
                      ৳{Number(it.total_price || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-2xs text-muted-foreground">
                    <span>Size: {it.width && it.height ? `${it.width}×${it.height} ${it.dimension_unit || 'ft'}` : '—'}</span>
                    <span>•</span>
                    <span>Qty: {it.quantity || 1} {it.unit || 'pcs'}</span>
                    <span>•</span>
                    <span>Material: {it.material_spec || 'Standard'}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-muted-foreground">No line items recorded.</div>
            )}
          </div>
        </Card>
      </section>

      {/* =========================================================================
          5. FILES (Section 10 & 22)
 Artwork Proofs & Versions (V1, V2, V3...) — Never Overwrite Artwork
         ========================================================================= */}
      <section id="files-section"className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <FileCheck className="h-4.5 w-4.5 text-purple-600"/>
              <span>Artwork & Design Proofs</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
 Version history is strictly preserved (V1, V2, V3). Files are immutable and never overwritten.
            </p>
          </div>
        </div>

        {designJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {designJobs.map((dj) => (
              <Card key={dj.id} className="p-4 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-2xs font-bold text-purple-600 dark:text-purple-400">
                      {dj.design_number}
                    </span>
                    <h3 className="text-xs font-bold text-foreground">
                      {dj.title || 'Artwork Proof'}
                    </h3>
                  </div>
                  <Badge
 variant="outline"className={`text-2xs font-bold ${
 dj.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : dj.status === 'customer_approval'
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : 'bg-muted text-foreground border-input'
                    }`}
                  >
                    {dj.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>

                {/* Versions List */}
                {dj.versions && dj.versions.length > 0 ? (
                  <div className="space-y-2 pt-1 border-t border-border">
                    {dj.versions.map((ver) => (
                      <div key={ver.id} className="flex items-center justify-between p-2 rounded bg-muted text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-2xs font-bold rounded">
                            {ver.version_label || `V${ver.version_number}`}
                          </span>
                          <span className="text-foreground truncate max-w-[180px]">
                            {ver.proof_file_name || ver.file_name || 'Artwork Proof File'}
                          </span>
                        </div>
                        {ver.proof_file_url ? (
                          <a
 href={ver.proof_file_url}
 target="_blank"rel="noopener noreferrer"className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1">
                            <span>View</span>
                            <ExternalLink className="h-3 w-3"/>
                          </a>
                        ) : (
                          <span className="text-2xs text-muted-foreground">No URL</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-2xs text-muted-foreground py-1">No versioned proof files uploaded yet.</div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-6 text-center border-dashed">
            <FileCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2"/>
            <p className="text-xs font-semibold text-muted-foreground">
 No design ticket or proof files linked directly.
            </p>
            <p className="text-2xs text-muted-foreground mt-0.5">
 Production will proceed using customer-provided artwork or direct print traveler specs.
            </p>
          </Card>
        )}
      </section>

      {/* =========================================================================
          6. ACTIVITY (Section 10 & 38)
 Unified Timeline & Event Log
         ========================================================================= */}
      <section id="activity-section"className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Clock className="h-4.5 w-4.5 text-blue-600"/>
            <span>Activity & Audit Trail</span>
          </h2>
          <span className="text-xs text-muted-foreground">Immutable chronological events</span>
        </div>

        <Card className="p-5 border border-border">
          <div className="space-y-4">
            {timeline.length > 0 ? (
 timeline.map((ev, idx) => (
                <div key={ev.id || idx} className="flex gap-3 relative pb-4 last:pb-0">
                  {idx < timeline.length - 1 && (
                    <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-muted"/>
                  )}
                  <div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-950/60 border border-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="h-2 w-2 rounded-full bg-blue-600"/>
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-xs font-bold text-foreground">{ev.title}</span>
                      <span className="text-2xs text-muted-foreground tabular-nums">{ev.created_at}</span>
                    </div>
                    {ev.description && (
                      <p className="text-xs text-muted-foreground">{ev.description}</p>
                    )}
                    <span className="text-2xs font-medium text-muted-foreground block pt-0.5">
 By {ev.actor_name || 'System Operator'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-950/60 border border-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="h-2 w-2 rounded-full bg-blue-600"/>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground">Order Booked & Confirmed</span>
                    <p className="text-xs text-muted-foreground">Order #{order.order_number} initialized for customer {order.customer_name}.</p>
                    <span className="text-2xs text-muted-foreground tabular-nums">{order.created_at || order.order_date}</span>
                  </div>
                </div>
                {order.invoice_number && (
                  <div className="flex gap-3">
                    <div className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="h-2 w-2 rounded-full bg-emerald-600"/>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-foreground">Commercial Invoice Generated</span>
                      <p className="text-xs text-muted-foreground">Official invoice #{order.invoice_number} created.</p>
                    </div>
                  </div>
                )}
                {jobs.length > 0 && (
                  <div className="flex gap-3">
                    <div className="h-5 w-5 rounded-full bg-purple-100 dark:bg-purple-950/60 border border-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="h-2 w-2 rounded-full bg-purple-600"/>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-foreground">Production Job Tickets Dispatched</span>
                      <p className="text-xs text-muted-foreground">{jobs.length} production job tickets active on machine floor bays.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* MODAL: ADD JOB TICKET */}
      <ModalDialog
 open={isAddJobOpen}
 onOpenChange={setIsAddJobOpen}
 title="Dispatch New Job Ticket to Machine Bay"description={`Add another production job under Sales Order ${order.order_number}.`}
      >
        <form onSubmit={handleCreateJob} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
          <div className="space-y-1.5">
            <Label htmlFor="jpName"required>Product / Job Title</Label>
            <Input
 id="jpName"placeholder="e.g. Die-Cut Window Vinyl Stickers"value={jobProduct}
 onChange={(e) => setJobProduct(e.target.value)}
 required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="jpSize"required>Dimensions / Size</Label>
              <Input
 id="jpSize"placeholder="e.g. 10ft × 4ft (40 sft)"value={jobSize}
 onChange={(e) => setJobSize(e.target.value)}
 required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="jpDept"required>Assigned Department</Label>
              <select
 id="jpDept"value={jobDept}
 onChange={(e) => setJobDept(e.target.value as JobDepartment)}
 className="w-full h-10 px-3 rounded-md border border-input bg-card text-xs font-semibold">
                <option value="wide_format_print">Wide Format Printing (Flex/Vinyl)</option>
                <option value="laser_cnc">Laser Cutting & CNC Routing</option>
                <option value="fabrication">Metal & Acrylic Fabrication</option>
                <option value="digital_offset">Digital Press / Offset</option>
                <option value="finishing">Finishing, Hemming & Eyelets</option>
                <option value="installation">Installation & Site Crew</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="jpMat"required>Material Specification</Label>
              <Input
 id="jpMat"placeholder="e.g. 320g Star Flex, 5mm Cast Acrylic"value={jobMaterial}
 onChange={(e) => setJobMaterial(e.target.value)}
 required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="jpOp">Assigned Operator</Label>
              <Input
 id="jpOp"placeholder="e.g. Jahid Hossain (Machine 1)"value={jobOperator}
 onChange={(e) => setJobOperator(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="jpInst">Special Production Instructions</Label>
            <textarea
 id="jpInst"rows={2}
 placeholder="e.g. 8-pass high resolution mode, double-fold welding..."value={jobInstructions}
 onChange={(e) => setJobInstructions(e.target.value)}
 className="w-full p-2 rounded-md border border-input bg-card text-xs"/>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button"variant="outline"onClick={() => setIsAddJobOpen(false)}>
 Cancel
            </Button>
            <Button type="submit"className="bg-indigo-600 hover:bg-indigo-700 text-white">
 Dispatch to Machine Queue
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: RECORD ADVANCE / PAYMENT */}
      <ModalDialog
 open={isPayOpen}
 onOpenChange={setIsPayOpen}
 title="Record Customer Advance / Payment"description={`Record payment for Order ${order.order_number} (Outstanding Due: ৳ ${order.due_amount}).`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pAmt"required>Collection Amount (৳ BDT)</Label>
              <Input
 id="pAmt"type="number"value={collectionAmount || ''}
 onChange={(e) => setCollectionAmount(Number(e.target.value))}
 required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pMeth">Payment Channel</Label>
              <select
 id="pMeth"value={collectionMethod}
 onChange={(e) => setCollectionMethod(e.target.value)}
 className="w-full h-10 px-3 rounded-md border border-input bg-card text-xs">
                <option>Cash Counter</option>
                <option>bKash Merchant</option>
                <option>Nagad</option>
                <option>Bank Deposit / Cheque</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button"variant="outline"onClick={() => setIsPayOpen(false)}>
 Cancel
            </Button>
            <Button type="submit"className="bg-emerald-600 hover:bg-emerald-700 text-white">
 Issue Money Receipt
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: PRINTABLE JOB BAG TICKET */}
      <ModalDialog
 open={Boolean(selectedJobForPrint)}
 onOpenChange={(open) => !open && setSelectedJobForPrint(null)}
 title="Shop Floor Routing Ticket (Job Bag)"description="Physical traveler ticket attached to raw media rolls and work-in-progress carts.">
        {selectedJobForPrint && (
          <div className="space-y-4 p-4 rounded-xl border-2 border-border bg-card text-foreground text-xs print:bg-white print:text-foreground print:border-border">
            <div className="flex justify-between items-start border-b-2 border-border print:border-border pb-3">
              <div>
                <span className="tabular-nums font-black text-xl text-blue-800 dark:text-blue-400 print:text-blue-800">
                  {selectedJobForPrint.job_number}
                </span>
                <div className="text-muted-foreground print:text-muted-foreground">Sales Order: {order.order_number}</div>
              </div>
              <div className="text-right">
                <div className="font-bold uppercase tracking-wider text-foreground print:text-foreground">{selectedJobForPrint.assigned_department}</div>
                <div className="text-red-600 dark:text-red-400 font-bold print:text-red-600">Deadline: {selectedJobForPrint.deadline}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 py-2 border-b border-border print:border-border">
              <div>
                <span className="text-muted-foreground print:text-muted-foreground">Customer:</span>
                <strong className="block text-foreground print:text-foreground">{selectedJobForPrint.customer_name}</strong>
              </div>
              <div>
                <span className="text-muted-foreground print:text-muted-foreground">Operator:</span>
                <strong className="block text-foreground print:text-foreground">{selectedJobForPrint.assigned_employee_name}</strong>
              </div>
            </div>

            <div className="space-y-1 py-1">
              <span className="text-muted-foreground print:text-muted-foreground">Item Specification:</span>
              <div className="font-bold text-sm text-foreground print:text-foreground">{selectedJobForPrint.product_name}</div>
              <div className="tabular-nums text-foreground print:text-foreground">Dimensions: {selectedJobForPrint.size_spec} • Qty: {selectedJobForPrint.quantity}</div>
              <div className="text-foreground print:text-foreground">Material: {selectedJobForPrint.material_spec}</div>
            </div>

            {selectedJobForPrint.production_instructions && (
              <div className="p-2.5 rounded bg-muted border border-input text-foreground print:bg-muted print:border-input print:text-foreground">
                <strong>Machine Operator Instructions:</strong>
                <p className="mt-0.5">{selectedJobForPrint.production_instructions}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-dashed border-input print:border-input text-center text-2xs text-muted-foreground print:text-muted-foreground">
              <div>Operator Initial & Machine #</div>
              <div>QC Inspector Passed</div>
            </div>

            <div className="flex justify-end pt-2 print:hidden">
              <Button onClick={() => window.print()} className="bg-surface-inset hover: text-white text-xs">
                <Printer className="h-3.5 w-3.5 mr-1"/>
 Print Traveler Ticket
              </Button>
            </div>
          </div>
        )}
      </ModalDialog>

      {/* MODAL: SEND INVOICE REQUEST */}
      <ModalDialog
 open={isInvoiceRequestOpen}
 onOpenChange={setIsInvoiceRequestOpen}
 title="Send Invoice Request to Sales / Management"description={`Request official invoice creation for Order ${order.order_number} to clear commercial production gating.`}
      >
        <form onSubmit={handleSendInvoiceRequest} className="space-y-4 pt-1">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-900 dark:text-blue-200 space-y-1">
            <p className="font-semibold">Commercial Workflow Gating</p>
            <p className="text-2xs opacity-90">
 Submitting this request alerts sales and billing management. Once the invoice is generated, this order will automatically unlock for shop floor printing and production.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reqNotes">Notes / Commercial Instructions (Optional)</Label>
            <textarea
 id="reqNotes"rows={3}
 placeholder="e.g. Design is ready and customer approved quotation amount. Please issue invoice # so floor can print."value={invoiceNotes}
 onChange={(e) => setInvoiceNotes(e.target.value)}
 className="w-full p-2.5 rounded-lg border border-input bg-card text-xs focus:ring-2 focus:ring-ring focus:outline-none"/>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button type="button"variant="outline"onClick={() => setIsInvoiceRequestOpen(false)}>
 Cancel
            </Button>
            <Button
 type="submit"disabled={isSubmittingInvoiceRequest}
 className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs">
              {isSubmittingInvoiceRequest ? 'Dispatching...' : 'Dispatch Request'}
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}

export default function OrderDetailPage() {
 return (
    <PanelAccessGuard
 module="orders"action="view"panelTitle="Order Lifecycle Details"panelTitleBn="অর্ডার বিস্তারিত">
      <React.Suspense
 fallback={
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
            <Briefcase className="h-6 w-6 text-indigo-500 animate-pulse"/>
            <p className="text-xs text-muted-foreground">Loading Order Details...</p>
          </div>
        }
      >
        <OrderDetailContent />
      </React.Suspense>
    </PanelAccessGuard>
  )
}

