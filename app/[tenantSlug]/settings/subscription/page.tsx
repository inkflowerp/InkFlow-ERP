'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Crown,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
  Building,
  HardDrive,
  ShoppingCart,
  Layers,
  AlertTriangle,
  Lock,
  Smartphone,
  CreditCard,
  Landmark,
  FileText,
  RotateCcw,
  Clock,
  Ban,
} from 'lucide-react'
import { useSubscription } from '@/hooks/use-subscription'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { PageHeader } from '@/components/shared/page-header'
import { paymentRegistry } from '@/lib/payments/payment-registry'
import {
  DEFAULT_PLANS,
  DEMO_SUBSCRIPTION_INVOICES,
  FEATURE_METADATA,
} from '@/services/subscription.service'
import {
  PlanCode,
  BillingInterval,
  PaymentGatewayType,
} from '@/types/subscription.types'

export default function TenantSubscriptionPage() {
  const {
    subscription,
    currentPlan,
    currentPlanCode,
    allPlans,
    usage,
    isSuspended,
    isPastDue,
    isTrial,
    daysRemainingInTrial,
    getLimitStatus,
    upgradeSubscription,
    simulatePlan,
    simulateStatus,
  } = useSubscription()

  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const isBn = locale === 'bn'

  const [interval, setInterval] = useState<BillingInterval>('monthly')
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false)
  const [targetPlan, setTargetPlan] = useState<PlanCode>('enterprise')
  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayType>('bkash')
  const [isProcessing, setIsProcessing] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  const providers = paymentRegistry.getAllProviders()
  const activeProvider = paymentRegistry.getProvider(selectedGateway)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const handleConfirmUpgrade = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    const txnRef = `${selectedGateway.toUpperCase()}-${Date.now().toString().slice(-6)}`
    await upgradeSubscription({
      planCode: targetPlan,
      interval,
      paymentMethod: selectedGateway,
      reference: txnRef,
    })

    setIsProcessing(false)
    setIsUpgradeOpen(false)
    showNotification(
      `Plan successfully upgraded to ${targetPlan.toUpperCase()} via ${selectedGateway.toUpperCase()}! Transaction: ${txnRef}`
    )
  }

  // Calculate pricing for target plan
  const selectedTargetPlanObj = allPlans.find((p) => p.code === targetPlan) || allPlans[2]
  const payableAmount =
    interval === 'yearly'
      ? selectedTargetPlanObj.price_yearly
      : selectedTargetPlanObj.price_monthly

  // 6 Configurable limits statuses
  const userLimit = getLimitStatus('max_users')
  const branchLimit = getLimitStatus('max_branches')
  const storageLimit = getLimitStatus('storage_gb')
  const orderLimit = getLimitStatus('monthly_orders')
  const customerLimit = getLimitStatus('max_customers')
  const productLimit = getLimitStatus('max_products')

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <PageHeader
        titleEn="SaaS Subscription & Resource Quotas"
        titleBn="সাবস্ক্রিপশন ও রিসোর্স কোটা"
        descriptionEn="Manage organization subscription tier, monitor usage against 6 configurable limits, and pay via local Bangladesh MFS/Gateways."
        descriptionBn="আপনার প্রতিষ্ঠানের সাবস্ক্রিপশন প্ল্যান, রিসোর্স মিটার এবং বাংলাদেশ পেমেন্ট মেথড পরিচালনা করুন।"
        icon={Crown}
        iconColor="text-amber-500"
        actions={
          <Link
            href="/platform/plans"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 transition-colors bangla-text"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
            {tBilingual('Platform Owner Console', 'প্ল্যাটফর্ম ওনার কনসোল')}
          </Link>
        }
      />

      {/* Notification Toast */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Interactive Plan Simulator Banner (Useful for immediate feature gating testing) */}
      <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
            <RotateCcw className="h-4 w-4" />
          </div>
          <div className="text-xs">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              Live Plan Simulator
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-200 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-200 font-mono">
                TESTING MODE
              </span>
            </div>
            <div className="text-slate-600 dark:text-slate-400 mt-0.5">
              Switch plan in real-time to test feature gating across modules (Inventory, Production, HR, Reports).
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-center">
          {(['starter', 'business', 'enterprise'] as PlanCode[]).map((code) => {
            const isSelected = currentPlanCode === code
            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  simulatePlan(code)
                  showNotification(`Simulated plan switched to ${code.toUpperCase()}!`)
                }}
                className={`px-2.5 py-1 rounded text-xs font-bold capitalize transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                {code}
              </button>
            )
          })}
        </div>
      </div>

      {/* Active Subscription Banner */}
      <Card className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 text-white rounded-2xl shadow-md border-0 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Badge className="bg-amber-400 text-slate-950 font-black tracking-wider uppercase text-[10px] px-2.5 py-0.5">
                {currentPlan.name}
              </Badge>

              <Badge
                className={`text-[10px] font-bold capitalize px-2 py-0.5 ${
                  subscription.status === 'active'
                    ? 'bg-emerald-500 text-white'
                    : subscription.status === 'trial'
                    ? 'bg-cyan-500 text-slate-950'
                    : subscription.status === 'past_due'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-red-500 text-white'
                }`}
              >
                {subscription.status.replace('_', ' ')}
              </Badge>

              <span className="text-xs text-slate-400 capitalize">
                • {subscription.billing_interval} billing
              </span>
            </div>

            <div className="text-3xl font-black tracking-tight text-white flex items-baseline gap-2">
              <CurrencyDisplay
                amount={
                  subscription.billing_interval === 'yearly'
                    ? currentPlan.price_yearly
                    : currentPlan.price_monthly
                }
              />
              <span className="text-xs text-slate-400 font-normal">
                / {subscription.billing_interval === 'yearly' ? 'year' : 'month'}
              </span>
            </div>

            <p className="text-xs text-slate-300 max-w-xl">
              {isBn ? currentPlan.name_bn : currentPlan.name}: {currentPlan.description}
            </p>

            <div className="text-[11px] text-slate-400 pt-1 flex items-center gap-3">
              <span>
                Period Ends: <strong className="text-white font-mono">{subscription.current_period_end.slice(0, 10)}</strong>
              </span>
              {subscription.last_payment_reference && (
                <span>
                  Last Payment: <strong className="text-indigo-300 font-mono">{subscription.last_payment_reference}</strong> ({subscription.payment_method_type?.toUpperCase()})
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2 w-full md:w-auto shrink-0">
            <Button
              onClick={() => {
                setTargetPlan(currentPlanCode === 'starter' ? 'business' : 'enterprise')
                setIsUpgradeOpen(true)
              }}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black shadow-lg shadow-amber-500/20 text-xs px-5"
            >
              <Zap className="mr-1.5 h-4 w-4" />
              {isBn ? 'প্ল্যান পরিবর্তন / আপগ্রেড' : 'Change / Upgrade Plan'}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                // Toggle status simulation
                const next = subscription.status === 'suspended' ? 'active' : 'suspended'
                simulateStatus(next)
                showNotification(`Subscription status simulated to: ${next.toUpperCase()}`)
              }}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
            >
              Simulate {subscription.status === 'suspended' ? 'Active' : 'Suspended'}
            </Button>
          </div>
        </div>
      </Card>

      {/* 6 Configurable Limits Meters */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-600" />
              {isBn ? 'রিসোর্স ব্যবহার ও কোটা মিটার' : '6 Configurable Limits & Utilization'}
            </h2>
            <p className="text-xs text-slate-500">
              Real-time consumption tracking against your plan allocation.
            </p>
          </div>

          {subscription.custom_limits_override && (
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 text-[10px]">
              Custom Overrides Active
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Limit 1: Team Users */}
          <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-blue-500" />
                Team Users
              </span>
              <span className="font-mono text-slate-900 dark:text-white font-bold">
                {userLimit.current} / {userLimit.limit}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${
                  userLimit.exceeded
                    ? 'bg-red-500'
                    : userLimit.warning
                    ? 'bg-amber-500'
                    : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(userLimit.percentage, 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
              <span>{userLimit.percentage}% used</span>
              <span>{Math.max(0, userLimit.limit - userLimit.current)} seats left</span>
            </div>
          </Card>

          {/* Limit 2: Branches */}
          <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Building className="h-4 w-4 text-purple-500" />
                Branches &amp; Hubs
              </span>
              <span className="font-mono text-slate-900 dark:text-white font-bold">
                {branchLimit.current} / {branchLimit.limit}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${
                  branchLimit.exceeded ? 'bg-red-500' : 'bg-purple-600'
                }`}
                style={{ width: `${Math.min(branchLimit.percentage, 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
              <span>{branchLimit.percentage}% used</span>
              <span>{Math.max(0, branchLimit.limit - branchLimit.current)} available</span>
            </div>
          </Card>

          {/* Limit 3: Storage */}
          <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <HardDrive className="h-4 w-4 text-cyan-500" />
                Cloud Artwork Storage
              </span>
              <span className="font-mono text-slate-900 dark:text-white font-bold">
                {storageLimit.current} GB / {storageLimit.limit} GB
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-cyan-500 transition-all"
                style={{ width: `${Math.min(storageLimit.percentage, 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
              <span>{storageLimit.percentage}% used</span>
              <span>{(storageLimit.limit - storageLimit.current).toFixed(1)} GB free</span>
            </div>
          </Card>

          {/* Limit 4: Monthly Orders */}
          <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <ShoppingCart className="h-4 w-4 text-emerald-500" />
                Monthly Orders
              </span>
              <span className="font-mono text-slate-900 dark:text-white font-bold">
                {orderLimit.current} / {orderLimit.limit}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(orderLimit.percentage, 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
              <span>{orderLimit.percentage}% used</span>
              <span>Resets on 1st of month</span>
            </div>
          </Card>

          {/* Limit 5: Customers */}
          <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-amber-500" />
                Client Directory
              </span>
              <span className="font-mono text-slate-900 dark:text-white font-bold">
                {customerLimit.current} / {customerLimit.limit}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-amber-500 transition-all"
                style={{ width: `${Math.min(customerLimit.percentage, 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
              <span>{customerLimit.percentage}% used</span>
              <span>{customerLimit.limit - customerLimit.current} entries left</span>
            </div>
          </Card>

          {/* Limit 6: Products */}
          <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-pink-500" />
                Catalog Products
              </span>
              <span className="font-mono text-slate-900 dark:text-white font-bold">
                {productLimit.current} / {productLimit.limit}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-pink-500 transition-all"
                style={{ width: `${Math.min(productLimit.percentage, 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
              <span>{productLimit.percentage}% used</span>
              <span>{productLimit.limit - productLimit.current} products left</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Plan Feature Matrix Comparison */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            {isBn ? 'প্ল্যান ফিচার তুলনা' : 'Available Subscription Plans in Bangladesh (BDT)'}
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Choose the best plan suited for your printing factory scale.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Feature / Resource</th>
                <th className="py-3 px-4">Starter</th>
                <th className="py-3 px-4">Business</th>
                <th className="py-3 px-4">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                  Monthly Rate (৳ BDT)
                </td>
                <td className="py-2.5 px-4 font-bold font-mono">৳1,999</td>
                <td className="py-2.5 px-4 font-bold font-mono text-indigo-600 dark:text-indigo-400">
                  ৳4,999
                </td>
                <td className="py-2.5 px-4 font-bold font-mono text-purple-600 dark:text-purple-400">
                  ৳9,999
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                  Yearly Rate (৳ BDT)
                </td>
                <td className="py-2.5 px-4 font-mono">৳19,990</td>
                <td className="py-2.5 px-4 font-mono text-indigo-600 dark:text-indigo-400">৳49,990</td>
                <td className="py-2.5 px-4 font-mono text-purple-600 dark:text-purple-400">৳99,990</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                  Max Users
                </td>
                <td className="py-2.5 px-4">3 Seats</td>
                <td className="py-2.5 px-4">10 Seats</td>
                <td className="py-2.5 px-4 font-bold">Unlimited (999)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                  Branches / Factory Hubs
                </td>
                <td className="py-2.5 px-4">1 Location</td>
                <td className="py-2.5 px-4">3 Locations</td>
                <td className="py-2.5 px-4 font-bold">Unlimited</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                  Cloud Storage
                </td>
                <td className="py-2.5 px-4">1 GB</td>
                <td className="py-2.5 px-4">10 GB</td>
                <td className="py-2.5 px-4 font-bold">100 GB</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                  Raw Material Inventory
                </td>
                <td className="py-2.5 px-4 text-slate-400">Locked</td>
                <td className="py-2.5 px-4 text-emerald-600 font-bold">✓ Included</td>
                <td className="py-2.5 px-4 text-emerald-600 font-bold">✓ Included</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                  Production Kanban Floor
                </td>
                <td className="py-2.5 px-4 text-slate-400">Locked</td>
                <td className="py-2.5 px-4 text-emerald-600 font-bold">✓ Included</td>
                <td className="py-2.5 px-4 text-emerald-600 font-bold">✓ Included</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                  HR, Attendance &amp; Payroll
                </td>
                <td className="py-2.5 px-4 text-slate-400">Locked</td>
                <td className="py-2.5 px-4 text-emerald-600 font-bold">✓ Included</td>
                <td className="py-2.5 px-4 text-emerald-600 font-bold">✓ Included</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                  Job Costing &amp; Profit Audit
                </td>
                <td className="py-2.5 px-4 text-slate-400">Locked</td>
                <td className="py-2.5 px-4 text-emerald-600 font-bold">✓ Included</td>
                <td className="py-2.5 px-4 text-emerald-600 font-bold">✓ Included</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                  Advanced Analytics &amp; Workflows
                </td>
                <td className="py-2.5 px-4 text-slate-400">Locked</td>
                <td className="py-2.5 px-4 text-slate-400">Locked</td>
                <td className="py-2.5 px-4 text-purple-600 font-bold">✓ Included</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Subscription Invoices History */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600" />
            {isBn ? 'সাবস্ক্রিপশন ইনভয়েস হিস্ট্রি' : 'Billing Invoices & Receipts'}
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Download receipts for accounting and tax records.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Plan &amp; Interval</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {DEMO_SUBSCRIPTION_INVOICES.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    {isBn ? 'কোনো সাবস্ক্রিপশন ইনভয়েস পাওয়া যায়নি।' : 'No subscription invoices found.'}
                  </td>
                </tr>
              ) : (
                DEMO_SUBSCRIPTION_INVOICES.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold">{inv.plan_name}</span>
                      <span className="text-[10px] text-slate-400 ml-1 capitalize">({inv.billing_interval})</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">
                      <CurrencyDisplay amount={inv.amount} />
                    </td>
                    <td className="py-3 px-4 uppercase text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      {inv.payment_method} ({inv.transaction_ref})
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{inv.billing_date}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                        PAID
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => showNotification(`Receipt ${inv.invoice_number} downloaded.`)}
                        className="h-6 text-[11px] text-indigo-600 hover:text-indigo-700"
                      >
                        Download PDF
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Upgrade / Plan Selection Modal */}
      {isUpgradeOpen && (
        <ModalDialog
          open={isUpgradeOpen}
          onOpenChange={setIsUpgradeOpen}
          hideFooter
          title="Upgrade Your PrintERP SaaS Subscription"
        >
          <form onSubmit={handleConfirmUpgrade} className="space-y-4 text-xs max-h-[80vh] overflow-y-auto pr-1">
            {/* Interval Toggle: Monthly vs Yearly */}
            <div className="flex items-center justify-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setInterval('monthly')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all ${
                  interval === 'monthly'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setInterval('yearly')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                  interval === 'yearly'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Yearly Billing
                <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.2 rounded font-bold">
                  2 Months Free
                </span>
              </button>
            </div>

            {/* Target Plan Selection */}
            <div>
              <div className="font-bold text-slate-900 dark:text-white mb-2">Select Target Plan</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {allPlans.map((p) => {
                  const isSelected = targetPlan === p.code
                  const price = interval === 'yearly' ? p.price_yearly : p.price_monthly
                  return (
                    <div
                      key={p.code}
                      onClick={() => setTargetPlan(p.code)}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                      <div className="text-[10px] text-slate-400">{p.name_bn}</div>
                      <div className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-1">
                        <CurrencyDisplay amount={price} />
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {p.max_users} users • {p.max_branches} branches
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Bangladesh Payment Gateway Selection */}
            <div>
              <div className="font-bold text-slate-900 dark:text-white mb-2">
                Select Bangladesh Payment Instrument
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {providers.map((prov) => {
                  const isSelected = selectedGateway === prov.id
                  return (
                    <div
                      key={prov.id}
                      onClick={() => setSelectedGateway(prov.id)}
                      className={`p-2.5 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-indigo-600">
                          {prov.id === 'bkash' ? 'bK' : prov.id === 'nagad' ? 'NG' : prov.id === 'rocket' ? 'RK' : prov.id === 'sslcommerz' ? 'CC' : 'BK'}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white">
                            {prov.name} ({prov.nameBn})
                          </div>
                          <div className="text-[10px] text-slate-400">{prov.description}</div>
                        </div>
                      </div>
                      {prov.badge && (
                        <Badge className="text-[9px] bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 border-0">
                          {prov.badge}
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Payment Summary Box */}
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-400">Plan &amp; Cycle:</span>
                <strong className="text-slate-900 dark:text-white capitalize">
                  {selectedTargetPlanObj.name} ({interval})
                </strong>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-400">Payment Channel:</span>
                <strong className="text-slate-900 dark:text-white">{activeProvider.name}</strong>
              </div>
              <div className="flex justify-between items-center text-sm font-black pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                <span>Total Amount Payable (৳ BDT):</span>
                <span className="text-indigo-600 dark:text-indigo-400">
                  <CurrencyDisplay amount={payableAmount} />
                </span>
              </div>
            </div>

            {/* Checkout & Complete */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUpgradeOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isProcessing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                {isProcessing ? 'Processing...' : `Pay ৳${payableAmount.toLocaleString()} via ${activeProvider.name}`}
              </Button>
            </div>
          </form>
        </ModalDialog>
      )}
    </div>
  )
}
