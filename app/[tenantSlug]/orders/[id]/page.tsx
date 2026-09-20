'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
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

const LIFECYCLE_STAGES = [
  { id: 'quotation', label: 'Quotation' },
  { id: 'approval', label: 'Approval' },
  { id: 'sales_order', label: 'Sales Order' },
  { id: 'job_order', label: 'Job Orders' },
  { id: 'production', label: 'Production' },
  { id: 'finishing', label: 'Finishing' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'installation', label: 'Installation' },
  { id: 'completion', label: 'Completion' },
]

export default function OrderDetailPage() {
  const params = useParams()
  const orderId = (params?.id as string) || ''
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'

  const [orders] = useDataStore<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS, [])
  const [invoices] = useDataStore<any[]>(STORAGE_KEYS.INVOICES, [])
  const [allJobs] = useDataStore<JobOrderRecord[]>(STORAGE_KEYS.JOB_ORDERS, [])
  const [allTimeline] = useDataStore<OrderTimelineEventRecord[]>(STORAGE_KEYS.TIMELINE_EVENTS, [])

  let order = orders.find((o) => o.id === orderId || o.order_number === orderId)
  if (!order) {
    const inv = invoices.find((i) => i.id === orderId || i.invoice_number === orderId || i.order_number === orderId || i.sales_order_id === orderId)
    if (inv) {
      order = {
        id: inv.sales_order_id || inv.id,
        company_id: inv.company_id || company?.id || 'default',
        order_number: inv.order_number || inv.invoice_number.replace('INV-', 'ORD-'),
        customer_id: inv.customer_id,
        customer_name: inv.customer_name,
        customer_phone: inv.customer_phone,
        customer_address: inv.customer_address,
        salesperson_name: inv.created_by_name || 'Commercial Manager',
        order_date: inv.invoice_date || new Date().toISOString().split('T')[0],
        delivery_date: inv.due_date || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
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
        workflow_routing: (inv.items && inv.items.some((it: any) => it.workflow_routing === 'design_required' || it.design_required))
          ? 'design_required'
          : (inv.items && inv.items.some((it: any) => it.workflow_routing === 'design_ok'))
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
  const jobs = allJobs.filter((j) => order && (j.order_id === order.id || j.order_id === orderId || j.order_id === order.order_number || (order.invoice_id && j.invoice_id === order.invoice_id)))
  const timeline = allTimeline.filter((t) => order && (t.order_id === order.id || t.order_id === orderId || t.order_id === order.order_number))

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

  if (!order) {
    return (
      <div className="space-y-6 max-w-7xl">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Orders & Job Flow
        </Link>
        <Card className="p-12 text-center border-dashed">
          <FileText className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Sales Order Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            The sales order record you are looking for does not exist in your organization.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href="/orders">View All Orders</Link>
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
            <Flame className="h-3.5 w-3.5 text-red-600 shrink-0" />
            Very Urgent (জরুরি)
          </span>
        )
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            Urgent (জরুরি)
          </span>
        )
      case 'normal':
      default:
        return (
          <span className="px-2.5 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Normal Priority
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Back Link & Header */}
      <div>
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Orders & Job Flow
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
                {order.order_number}
              </h1>
              {getPriorityBadge(order.priority)}
              <span className="capitalize px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300">
                {order.status.replace('_', ' ')}
              </span>

              {/* Workflow Routing Badge */}
              {order.workflow_routing && (
                <Badge
                  variant="outline"
                  className={`text-xs font-bold ${
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
                  <CheckCircle2 className="h-3 w-3" />
                  Invoice Linked {order.invoice_number ? `(#${order.invoice_number})` : ''}
                </Badge>
              ) : order.commercial_status === 'invoice_requested' ? (
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-xs font-bold flex items-center gap-1">
                  <Clock className="h-3 w-3 text-amber-600" />
                  Invoice Requested
                </Badge>
              ) : (
                <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-xs font-bold flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-rose-600" />
                  Invoice Required
                </Badge>
              )}
            </div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Customer: {order.customer_name}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-0.5">
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                {order.customer_phone}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Target Delivery: <strong>{order.delivery_date}</strong>
              </span>
              <span>•</span>
              <span>Sales: {order.salesperson_name}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(!order.invoice_id && order.commercial_status !== 'invoice_created') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsInvoiceRequestOpen(true)}
                className="text-xs border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300"
              >
                <Send className="mr-1.5 h-3.5 w-3.5 text-rose-600" />
                Request Invoice
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAddJobOpen(true)}
              className="text-xs"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5 text-indigo-600" />
              Add Job Ticket
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setCollectionAmount(order.due_amount)
                setIsPayOpen(true)
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-xs text-white"
            >
              <Receipt className="mr-1.5 h-3.5 w-3.5" />
              Record Payment
            </Button>
          </div>
        </div>
      </div>

      {/* Commercial Hold Gate Warning Banner */}
      {(!order.invoice_id && order.commercial_status !== 'invoice_created') && (
        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Lock className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
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
                size="sm"
                onClick={() => setIsInvoiceRequestOpen(true)}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Send Invoice Request
              </Button>
            ) : (
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-3 py-1.5 rounded-lg border border-amber-300">
                Invoice Request Dispatched
              </span>
            )}
            <Link href={`/billing?action=create_invoice&order_id=${order.id}`}>
              <Button size="sm" variant="outline" className="text-xs">
                Create Invoice
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Financial Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <span className="text-xs font-semibold text-slate-500">Contract Final Price</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            <CurrencyDisplay amount={order.final_price} />
          </div>
          <span className="text-[11px] text-slate-400">Terms: {order.payment_terms}</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-slate-500">Advance Received (পরিশোধিত)</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            <CurrencyDisplay amount={order.advance_amount} />
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">
            {order.final_price > 0 ? Math.round((order.advance_amount / order.final_price) * 100) : 0}% Paid
          </span>
        </Card>

        <Card className={`p-4 border-l-4 ${order.due_amount > 0 ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
          <span className="text-xs font-semibold text-slate-500">Remaining Balance (বাকি টাকা)</span>
          <div className="text-2xl font-black text-red-600 mt-1">
            <CurrencyDisplay amount={order.due_amount} />
          </div>
          <span className="text-[11px] text-slate-400">Collect prior to dispatch</span>
        </Card>
      </div>

      {/* =========================================================================
          ORDER LIFECYCLE TIMELINE (9 STAGES)
          Quotation -> Approval -> Sales Order -> Job Order -> Production ->
          Finishing -> Delivery -> Installation -> Completion
         ========================================================================= */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              9-Stage Order Lifecycle Flow (অর্ডার ও প্রোডাকশন পর্যায়)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live tracking from customer commercial agreement through shop floor machines to installation.
            </p>
          </div>
          <span className="text-xs font-bold text-indigo-600">Active Phase: Production</span>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex items-center min-w-[750px] justify-between relative">
            {/* Connecting line */}
            <div className="absolute top-3.5 left-4 right-4 h-0.5 bg-slate-200 dark:bg-slate-800 -z-0" />

            {LIFECYCLE_STAGES.map((stage, idx) => {
              const isDone = idx <= 4 // Quotation, Approval, Sales Order, Job Order, Production
              const isCurrent = idx === 4

              return (
                <div key={stage.id} className="flex flex-col items-center z-10 text-center px-1">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      isCurrent
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950'
                        : isDone
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {isDone && !isCurrent ? '✓' : idx + 1}
                  </div>
                  <span
                    className={`text-[11px] mt-1.5 font-medium whitespace-nowrap ${
                      isCurrent
                        ? 'font-bold text-indigo-600 dark:text-indigo-400'
                        : isDone
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-400'
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* =========================================================================
          MULTI-JOB TICKETS SECTION (Core Phase 7 Requirement)
          Each order splits into discrete jobs across machine departments.
         ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-600" />
              Production Job Orders ({jobs.length} Discrete Machine Tickets)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Items in this sales order automatically split into dedicated departmental production tickets.
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setIsAddJobOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-xs text-white"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            + New Job Ticket
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <Card key={job.id} className="border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                    {job.job_number}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {job.workflow_routing && (
                      <Badge variant="outline" className="text-[9px] font-semibold">
                        {job.workflow_routing === 'design_required'
                          ? '🎨 Design'
                          : job.workflow_routing === 'design_ok'
                          ? '⚡ Design OK'
                          : '🚀 Ready Prod'}
                      </Badge>
                    )}
                    {job.production_gate_status && job.production_gate_status !== 'ready_for_production' && (
                      <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[9px] font-bold">
                        {job.production_gate_status === 'blocked_commercial' ? 'Locked (No Invoice)' : 'Design Hold'}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold capitalize ${
                        job.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : job.status === 'in_progress'
                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      {job.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <CardTitle className="text-sm font-bold mt-1 text-slate-900 dark:text-white">
                  {job.product_name}
                </CardTitle>
                <div className="text-[11px] text-slate-500">
                  Qty: <strong>{job.quantity}</strong> • Size: <strong>{job.size_spec}</strong>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3 text-xs">
                <div>
                  <span className="text-slate-400">Department:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 capitalize mt-0.5">
                    {job.assigned_department.replace(/_/g, ' ')}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400">Assigned Operator:</span>
                  <div className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                    {job.assigned_employee_name || 'Unassigned'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400">Material Substrate:</span>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    {job.material_spec}
                  </div>
                </div>

                {job.production_instructions && (
                  <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                    <strong>Instructions:</strong> {job.production_instructions}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] text-red-600 font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {job.deadline}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedJobForPrint(job)}
                      className="h-7 text-[11px] px-2"
                    >
                      <Printer className="h-3 w-3 mr-1" />
                      Job Bag
                    </Button>

                    <select
                      value={job.status}
                      onChange={(e) => handleUpdateJobStatus(job.id, e.target.value as JobStatus)}
                      className="h-7 px-1.5 rounded text-[11px] font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="queued">Queued</option>
                      <option value="in_progress">In Progress</option>
                      <option value="quality_check">QC Check</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* MODAL: ADD JOB TICKET */}
      <ModalDialog
        open={isAddJobOpen}
        onOpenChange={setIsAddJobOpen}
        title="Dispatch New Job Ticket to Machine Bay"
        description={`Add another production job under Sales Order ${order.order_number}.`}
      >
        <form onSubmit={handleCreateJob} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
          <div className="space-y-1.5">
            <Label htmlFor="jpName" required>Product / Job Title</Label>
            <Input
              id="jpName"
              placeholder="e.g. Die-Cut Window Vinyl Stickers"
              value={jobProduct}
              onChange={(e) => setJobProduct(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="jpSize" required>Dimensions / Size</Label>
              <Input
                id="jpSize"
                placeholder="e.g. 10ft × 4ft (40 sft)"
                value={jobSize}
                onChange={(e) => setJobSize(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="jpDept" required>Assigned Department</Label>
              <select
                id="jpDept"
                value={jobDept}
                onChange={(e) => setJobDept(e.target.value as JobDepartment)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
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
              <Label htmlFor="jpMat" required>Material Specification</Label>
              <Input
                id="jpMat"
                placeholder="e.g. 320g Star Flex, 5mm Cast Acrylic"
                value={jobMaterial}
                onChange={(e) => setJobMaterial(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="jpOp">Assigned Operator</Label>
              <Input
                id="jpOp"
                placeholder="e.g. Jahid Hossain (Machine 1)"
                value={jobOperator}
                onChange={(e) => setJobOperator(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="jpInst">Special Production Instructions</Label>
            <textarea
              id="jpInst"
              rows={2}
              placeholder="e.g. 8-pass high resolution mode, double-fold welding..."
              value={jobInstructions}
              onChange={(e) => setJobInstructions(e.target.value)}
              className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddJobOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Dispatch to Machine Queue
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: RECORD ADVANCE / PAYMENT */}
      <ModalDialog
        open={isPayOpen}
        onOpenChange={setIsPayOpen}
        title="Record Customer Advance / Payment"
        description={`Record payment for Order ${order.order_number} (Outstanding Due: ৳ ${order.due_amount}).`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pAmt" required>Collection Amount (৳ BDT)</Label>
              <Input
                id="pAmt"
                type="number"
                value={collectionAmount || ''}
                onChange={(e) => setCollectionAmount(Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pMeth">Payment Channel</Label>
              <select
                id="pMeth"
                value={collectionMethod}
                onChange={(e) => setCollectionMethod(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              >
                <option>Cash Counter</option>
                <option>bKash Merchant</option>
                <option>Nagad</option>
                <option>Bank Deposit / Cheque</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsPayOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Issue Money Receipt
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: PRINTABLE JOB BAG TICKET */}
      <ModalDialog
        open={Boolean(selectedJobForPrint)}
        onOpenChange={(open) => !open && setSelectedJobForPrint(null)}
        title="Shop Floor Routing Ticket (Job Bag)"
        description="Physical traveler ticket attached to raw media rolls and work-in-progress carts."
      >
        {selectedJobForPrint && (
          <div className="space-y-4 p-4 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs print:bg-white print:text-slate-900 print:border-slate-900">
            <div className="flex justify-between items-start border-b-2 border-slate-900 dark:border-slate-700 print:border-slate-900 pb-3">
              <div>
                <span className="font-mono font-black text-xl text-blue-800 dark:text-blue-400 print:text-blue-800">
                  {selectedJobForPrint.job_number}
                </span>
                <div className="text-slate-600 dark:text-slate-400 print:text-slate-600">Sales Order: {order.order_number}</div>
              </div>
              <div className="text-right">
                <div className="font-bold uppercase tracking-wider text-slate-900 dark:text-white print:text-slate-900">{selectedJobForPrint.assigned_department}</div>
                <div className="text-red-600 dark:text-red-400 font-bold print:text-red-600">Deadline: {selectedJobForPrint.deadline}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 py-2 border-b border-slate-200 dark:border-slate-800 print:border-slate-200">
              <div>
                <span className="text-slate-500 dark:text-slate-400 print:text-slate-500">Customer:</span>
                <strong className="block text-slate-900 dark:text-white print:text-slate-900">{selectedJobForPrint.customer_name}</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 print:text-slate-500">Operator:</span>
                <strong className="block text-slate-900 dark:text-white print:text-slate-900">{selectedJobForPrint.assigned_employee_name}</strong>
              </div>
            </div>

            <div className="space-y-1 py-1">
              <span className="text-slate-500 dark:text-slate-400 print:text-slate-500">Item Specification:</span>
              <div className="font-bold text-sm text-slate-900 dark:text-white print:text-slate-900">{selectedJobForPrint.product_name}</div>
              <div className="font-mono text-slate-700 dark:text-slate-300 print:text-slate-700">Dimensions: {selectedJobForPrint.size_spec} • Qty: {selectedJobForPrint.quantity}</div>
              <div className="text-slate-700 dark:text-slate-300 print:text-slate-700">Material: {selectedJobForPrint.material_spec}</div>
            </div>

            {selectedJobForPrint.production_instructions && (
              <div className="p-2.5 rounded bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 print:bg-slate-100 print:border-slate-300 print:text-slate-900">
                <strong>Machine Operator Instructions:</strong>
                <p className="mt-0.5">{selectedJobForPrint.production_instructions}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-dashed border-slate-300 dark:border-slate-700 print:border-slate-300 text-center text-[10px] text-slate-600 dark:text-slate-400 print:text-slate-600">
              <div>Operator Initial & Machine #</div>
              <div>QC Inspector Passed</div>
            </div>

            <div className="flex justify-end pt-2 print:hidden">
              <Button onClick={() => window.print()} className="bg-slate-900 dark:bg-slate-800 hover:dark:bg-slate-700 text-white text-xs">
                <Printer className="h-3.5 w-3.5 mr-1" />
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
        title="Send Invoice Request to Sales / Management"
        description={`Request official invoice creation for Order ${order.order_number} to clear commercial production gating.`}
      >
        <form onSubmit={handleSendInvoiceRequest} className="space-y-4 pt-1">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-900 dark:text-blue-200 space-y-1">
            <p className="font-semibold">Commercial Workflow Gating</p>
            <p className="text-[11px] opacity-90">
              Submitting this request alerts sales and billing management. Once the invoice is generated, this order will automatically unlock for shop floor printing and production.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reqNotes">Notes / Commercial Instructions (Optional)</Label>
            <textarea
              id="reqNotes"
              rows={3}
              placeholder="e.g. Design is ready and customer approved quotation amount. Please issue invoice # so floor can print."
              value={invoiceNotes}
              onChange={(e) => setInvoiceNotes(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsInvoiceRequestOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmittingInvoiceRequest}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
            >
              {isSubmittingInvoiceRequest ? 'Dispatching...' : 'Dispatch Request'}
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}
