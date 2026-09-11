'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Briefcase,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Clock,
  Printer,
  Building,
  DollarSign,
  AlertTriangle,
  Flame,
  Layers,
  Calendar,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useSubscription } from '@/hooks/use-subscription'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { PageHeader } from '@/components/shared/page-header'
import { SalesOrderRecord, OrderPriority, PaymentTerm, OrderStatus } from '@/types/order.types'
import { CustomerRecord } from '@/types/crm.types'
import { NewCustomerModal } from '@/components/shared/new-customer-modal'
import { WorkOrderModal } from '@/components/shared/work-order-modal'
import { useDataStore } from '@/hooks/use-data-store'
import { usePermissions } from '@/hooks/use-permissions'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { Crown, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toBengaliDigits } from '@/hooks/use-public-plans'

export default function OrdersPage() {
  const { company } = useTenant()
  const { can, isReadOnly } = usePermissions()
  const { checkCanCreate, openLimitExceededModal, openUpgradeModal, currentPlan, usage, refreshUsage } = useSubscription()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

  const [orders, setOrders] = useDataStore<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS, [])
  const [customerList] = useDataStore<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS, [])
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')

  const orderCheck = checkCanCreate('monthly_orders')

  const handleOpenNewOrder = () => {
    const check = checkCanCreate('monthly_orders')
    if (!check.allowed) {
      openLimitExceededModal('monthly_orders')
      return
    }
    setIsNewOpen(true)
  }

  const handleOpenWorkOrder = () => {
    const check = checkCanCreate('monthly_orders')
    if (!check.allowed) {
      openLimitExceededModal('monthly_orders')
      return
    }
    setIsWorkOrderOpen(true)
  }


  // New Order Modal
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [isWorkOrderOpen, setIsWorkOrderOpen] = useState(false)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [itemDesc, setItemDesc] = useState('')
  const [itemWidth, setItemWidth] = useState<number>(0)
  const [itemHeight, setItemHeight] = useState<number>(0)
  const [itemQty, setItemQty] = useState<number>(1)
  const [itemPrice, setItemPrice] = useState<number>(0)
  const [advancePaid, setAdvancePaid] = useState<number>(0)
  const [orderPriority, setOrderPriority] = useState<OrderPriority>('normal')
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm>('advance')
  const [deliveryDate, setDeliveryDate] = useState<string>(
    new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
  )
  const [notification, setNotification] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const handleCustomerCreated = (newCust: CustomerRecord) => {
    setSelectedCustomerId(newCust.id)
    showNotification(`Selected customer: ${newCust.name}`)
  }

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderCheck.allowed) {
      openLimitExceededModal('monthly_orders')
      return
    }
    const customer = customerList.find((c) => c.id === selectedCustomerId)
    if (!customer) {
      showNotification('Please select or add a customer first.')
      return
    }
    const orderNum = `ORD-${new Date().getFullYear()}-${String(orders.length + 1).padStart(4, '0')}`
    const finalPrice = itemPrice || 0
    const dueAmount = Math.max(0, finalPrice - (advancePaid || 0))

    const newOrder: SalesOrderRecord = {
      id: `ord-${Date.now()}`,
      company_id: company?.id || 'co-main',
      order_number: orderNum,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_name_bn: customer.name_bn,
      customer_phone: customer.mobile,
      customer_address: customer.address,
      salesperson_name: 'Current Sales Rep',
      order_date: new Date().toISOString().split('T')[0],
      delivery_date: deliveryDate,
      priority: orderPriority,
      status: 'confirmed',
      payment_terms: paymentTerms,
      subtotal: finalPrice,
      discount_amount: 0,
      vat_amount: Math.round(finalPrice * 0.075),
      final_price: finalPrice,
      advance_amount: advancePaid,
      due_amount: dueAmount,
      notes: 'New job order booked directly from sales counter.',
      items: [
        {
          id: `oi-${Date.now()}`,
          item_name: itemDesc,
          width: itemWidth,
          height: itemHeight,
          dimension_unit: 'ft',
          quantity: itemQty,
          unit: 'sft',
          unit_price: itemPrice,
          total_price: finalPrice,
        },
      ],
      jobs_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.createSalesOrderWithIntegrations(newOrder)
    refreshUsage()
    setIsNewOpen(false)
    showNotification(`Order ${orderNum} booked! Production job tickets & invoice generated.`)
  }

  const filtered = orders.filter((o) => {
    const matchSearch =
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      o.salesperson_name.toLowerCase().includes(search.toLowerCase())

    const matchStatus = selectedStatus === 'all' || o.status === selectedStatus
    const matchPriority = selectedPriority === 'all' || o.priority === selectedPriority

    return matchSearch && matchStatus && matchPriority
  })

  // Aggregates
  const totalBooked = orders.reduce((acc, o) => acc + o.final_price, 0)
  const totalAdvance = orders.reduce((acc, o) => acc + o.advance_amount, 0)
  const totalDue = orders.reduce((acc, o) => acc + o.due_amount, 0)

  const getPriorityBadge = (priority: OrderPriority) => {
    switch (priority) {
      case 'very_urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-black bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800 animate-pulse">
            <Flame className="h-3 w-3 text-red-600 shrink-0" />
            Very Urgent (জরুরি)
          </span>
        )
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
            Urgent (জরুরি)
          </span>
        )
      case 'normal':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Normal
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <PageHeader
        titleEn="Sales Orders & Job Flow"
        titleBn="সেলস অর্ডার ও জব ফ্লো"
        descriptionEn="Book sales contracts, manage customer advances, and automatically dispatch discrete job tickets across machine bays."
        descriptionBn="সেলস চুক্তি বুকিং, গ্রাহকের অগ্রিম জমা এবং প্রিন্ট জব টিকেট পরিচালনা করুন।"
        icon={Briefcase}
        iconColor="text-indigo-600"
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenWorkOrder}
              title={!orderCheck.allowed ? orderCheck.reason : undefined}
              className="text-xs bangla-text"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
              {tBilingual('Add Work Order', 'ওয়ার্ক অর্ডার')}
            </Button>
            {can('create', 'orders') && (
              <Button
                size="sm"
                onClick={handleOpenNewOrder}
                title={!orderCheck.allowed ? orderCheck.reason : undefined}
                className="bg-indigo-600 hover:bg-indigo-700 text-xs text-white bangla-text"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {tBilingual('New Sales Order', 'নতুন সেলস অর্ডার')}
              </Button>
            )}
          </div>
        }
      />

      {/* Monthly Orders Quota Alert */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-slate-50/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'p-1.5 rounded-lg text-white font-bold shrink-0',
            orderCheck.exceeded ? 'bg-red-500' : orderCheck.warning ? 'bg-amber-500' : 'bg-indigo-600'
          )}>
            <ShoppingCart className="h-4 w-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white bangla-text">
              {orderCheck.exceeded
                ? tBilingual(
                    `Plan Limit Reached: Your current plan allows up to ${currentPlan.monthly_orders.toLocaleString()} Monthly Orders quota (currently at ${usage.orders_this_month}). Please upgrade your subscription to continue.`,
                    `প্ল্যান লিমিট পূর্ণ: আপনার বর্তমান প্ল্যানে সর্বোচ্চ ${toBengaliDigits(currentPlan.monthly_orders)} মাসিক অর্ডার কোটা অনুমোদিত (বর্তমানে ${toBengaliDigits(usage.orders_this_month)})। চালিয়ে যেতে অনুগ্রহ করে সাবস্ক্রিপশন আপগ্রেড করুন।`
                  )
                : tBilingual(
                    `Monthly Order Quota: ${usage.orders_this_month} of ${currentPlan.monthly_orders.toLocaleString()} orders booked this month`,
                    `মাসিক অর্ডার কোটা: এই মাসে ${toBengaliDigits(currentPlan.monthly_orders)} টির মধ্যে ${toBengaliDigits(usage.orders_this_month)} টি অর্ডার বুক করা হয়েছে`
                  )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 bangla-text">
              {orderCheck.exceeded
                ? tBilingual('Monthly order quota reached. Upgrade to unlock more monthly job bookings.', 'চলতি মাসের অর্ডার কোটা পূর্ণ হয়েছে। নতুন অর্ডার বুক করতে প্ল্যান আপগ্রেড করুন।')
                : tBilingual(`Resets at the start of next calendar month (${currentPlan.name}).`, `পরবর্তী মাসের শুরুতে কোটা পুনরায় রিসেট হবে (${currentPlan.name_bn})।`)}
            </p>
          </div>
        </div>

        {currentPlan.code !== 'enterprise' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => openUpgradeModal('business')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 bangla-text shrink-0"
          >
            <Crown className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
            {tBilingual('Unlimited Orders', 'আনলিমিটেড অর্ডার')}
          </Button>
        )}
      </div>

      {/* Read-Only Notice */}
      {isReadOnly('orders') && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 rounded-lg text-xs font-semibold flex items-center gap-2 border border-blue-200 dark:border-blue-900 animate-in fade-in-0">
          <AlertCircle className="h-4 w-4 text-blue-600 shrink-0" />
          <span>{tBilingual('View-Only Mode: You have read-only access to sales and job orders.', 'শুধুমাত্র দেখার অনুমতি: সেলস বা জব অর্ডার তৈরি ও সম্পাদনার অনুমতি নেই।')}</span>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <span className="text-xs font-semibold text-slate-500">Total Booked Order Value</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            <CurrencyDisplay amount={totalBooked} />
          </div>
          <span className="text-[11px] text-slate-400">{orders.length} active sales orders</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-slate-500">Advance Collected (নগদ অগ্রিম)</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            <CurrencyDisplay amount={totalAdvance} />
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Secured customer commitments</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-red-500">
          <span className="text-xs font-semibold text-slate-500">Total Remaining Due (বাকি)</span>
          <div className="text-2xl font-black text-red-600 mt-1">
            <CurrencyDisplay amount={totalDue} />
          </div>
          <span className="text-[11px] text-red-500 font-semibold">Payable upon delivery/fitting</span>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by order number, client company, salesperson..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="all">All Priorities</option>
              <option value="normal">Normal Priority</option>
              <option value="urgent">Urgent</option>
              <option value="very_urgent">Very Urgent (জরুরি)</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_production">In Production</option>
              <option value="finishing">Finishing</option>
              <option value="ready_for_delivery">Ready for Delivery</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Order Directory ({filtered.length})</CardTitle>
            <span className="text-xs text-slate-400">All booked sales contracts</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Order # & Priority</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Jobs Queued</th>
                  <th className="py-3 px-4">Delivery Deadline</th>
                  <th className="py-3 px-4">Final Price</th>
                  <th className="py-3 px-4">Advance Paid</th>
                  <th className="py-3 px-4">Due Balance</th>
                  <th className="py-3 px-4">Terms</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    {/* Order Number & Priority */}
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/${slug}/orders/${order.id}`}
                        className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 group"
                      >
                        <span>{order.order_number}</span>
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <div className="mt-1">{getPriorityBadge(order.priority)}</div>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{order.customer_name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{order.customer_phone}</div>
                    </td>

                    {/* Jobs Queued */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        <Layers className="h-3 w-3 text-indigo-600" />
                        {order.jobs_count || order.items.length} Production Jobs
                      </span>
                    </td>

                    {/* Delivery Deadline */}
                    <td className="py-3.5 px-4 text-xs">
                      <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {order.delivery_date}
                      </div>
                    </td>

                    {/* Final Price */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      <CurrencyDisplay amount={order.final_price} />
                    </td>

                    {/* Advance Paid */}
                    <td className="py-3.5 px-4 text-xs font-medium text-emerald-600">
                      <CurrencyDisplay amount={order.advance_amount} />
                    </td>

                    {/* Due Balance */}
                    <td className="py-3.5 px-4">
                      {order.due_amount > 0 ? (
                        <span className="text-xs font-bold text-red-600">
                          <CurrencyDisplay amount={order.due_amount} />
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Paid
                        </span>
                      )}
                    </td>

                    {/* Payment Terms */}
                    <td className="py-3.5 px-4">
                      <span className="capitalize px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {order.payment_terms}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/${slug}/orders/${order.id}`}
                        className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Shop Floor Board
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                {tBilingual('No orders found matching filter.', 'কোন অর্ডার পাওয়া যায়নি।')}
              </div>
            ) : (
              filtered.map((order) => (
                <div key={order.id} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  {/* Top Bar: Order # & Priority */}
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/${slug}/orders/${order.id}`}
                      className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <span>{order.order_number}</span>
                      <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                    </Link>
                    {getPriorityBadge(order.priority)}
                  </div>

                  {/* Customer Info & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm text-slate-900 dark:text-white">{order.customer_name}</div>
                      {order.customer_phone && (
                        <a href={`tel:${order.customer_phone}`} className="text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline">
                          {order.customer_phone}
                        </a>
                      )}
                    </div>
                    <span className="capitalize px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                      {order.payment_terms}
                    </span>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-xs border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Booked</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        <CurrencyDisplay amount={order.final_price} />
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Due Balance</span>
                      {order.due_amount > 0 ? (
                        <span className="font-bold text-red-600">
                          <CurrencyDisplay amount={order.due_amount} />
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Paid
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Advance</span>
                      <span className="font-medium text-emerald-600">
                        <CurrencyDisplay amount={order.advance_amount} />
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Delivery</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {order.delivery_date}
                      </span>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      <Layers className="h-3 w-3 text-indigo-600" />
                      {order.jobs_count || order.items.length} Jobs
                    </span>
                    <Link
                      href={`/${slug}/orders/${order.id}`}
                      className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 min-h-[36px]"
                    >
                      Shop Floor Board →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* MODAL: CREATE SALES ORDER */}
      <ModalDialog
        open={isNewOpen}
        onOpenChange={setIsNewOpen}
        title="Book New Sales Order"
        description="Record customer agreement, advance payment, and generate production job tickets."
        hideFooter
      >
        <form onSubmit={handleCreateOrder} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="soCust" required>Select Customer Profile</Label>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
              >
                + New Customer
              </button>
            </div>
            <div className="flex gap-2">
              <select
                id="soCust"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                {customerList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.mobile}) - {c.area || 'Dhaka'}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCustomerModalOpen(true)}
                className="h-10 px-3 shrink-0 rounded-xl border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
              >
                + New
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="soPri" required>Priority Level</Label>
              <select
                id="soPri"
                value={orderPriority}
                onChange={(e) => setOrderPriority(e.target.value as OrderPriority)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
              >
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="very_urgent">Very Urgent (জরুরি)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="soTerms" required>Payment Terms</Label>
              <select
                id="soTerms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value as PaymentTerm)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="advance">Advance Payment</option>
                <option value="cash">Full Cash Counter</option>
                <option value="partial">Partial Payment</option>
                <option value="credit">Credit (বাকি)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="soDelDate" required>Delivery Date</Label>
              <Input
                id="soDelDate"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="soItem" required>Item Name & Specs</Label>
            <Input
              id="soItem"
              placeholder="e.g. Star Flex Billboard Banner (40ft × 20ft with Eyelets)"
              value={itemDesc}
              onChange={(e) => setItemDesc(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="soW">Width (ft)</Label>
              <Input
                id="soW"
                type="number"
                value={itemWidth}
                onChange={(e) => setItemWidth(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="soH">Height (ft)</Label>
              <Input
                id="soH"
                type="number"
                value={itemHeight}
                onChange={(e) => setItemHeight(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="soQty">Qty</Label>
              <Input
                id="soQty"
                type="number"
                value={itemQty}
                onChange={(e) => setItemQty(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="soPr">Total (৳ BDT)</Label>
              <Input
                id="soPr"
                type="number"
                value={itemPrice}
                onChange={(e) => setItemPrice(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="soAdv">Advance Received (৳ BDT)</Label>
              <Input
                id="soAdv"
                type="number"
                value={advancePaid}
                onChange={(e) => setAdvancePaid(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Remaining Due</Label>
              <div className="h-10 px-3 flex items-center bg-red-50 dark:bg-red-950/40 rounded-md font-mono text-xs font-bold text-red-700 dark:text-red-400">
                ৳ {Math.max(0, itemPrice - advancePaid)}
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsNewOpen(false)} className="w-full sm:w-auto min-h-[40px]">
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto min-h-[40px] bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              Confirm & Dispatch to Shop Floor
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: NEW CUSTOMER */}
      <NewCustomerModal
        open={isCustomerModalOpen}
        onOpenChange={setIsCustomerModalOpen}
        onCustomerCreated={handleCustomerCreated}
        companyId={company?.id || 'c-01'}
      />

      {/* MODAL: WORK ORDER */}
      <WorkOrderModal
        isOpen={isWorkOrderOpen}
        onClose={() => setIsWorkOrderOpen(false)}
        companyId={company?.id || 'c-01'}
        onSuccess={(order, sentToManager) => {
          showNotification(
            sentToManager
              ? tBilingual(
                  `Work Order #${order.order_number} saved & Invoice Request sent to Manager!`,
                  `ওয়ার্ক অর্ডার #${order.order_number} সংরক্ষিত এবং ম্যানেজারের কাছে ইনভয়েস রিকোয়েস্ট পাঠানো হয়েছে!`
                )
              : tBilingual(
                  `Work Order #${order.order_number} saved successfully.`,
                  `ওয়ার্ক অর্ডার #${order.order_number} সফলভাবে সংরক্ষিত হয়েছে।`
                )
          )
        }}
      />
    </div>
  )
}
