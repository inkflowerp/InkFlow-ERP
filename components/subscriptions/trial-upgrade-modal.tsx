'use client'

import React, { useState, useEffect } from 'react'
import {
  Crown,
  CheckCircle2,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  Building,
  Users,
  HardDrive,
  ShoppingCart,
  Layers,
  Smartphone,
  CreditCard,
  Landmark,
  X,
  Clock,
  Flame,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { useSubscription } from '@/hooks/use-subscription'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { PAYMENT_GATEWAY_METADATA_LIST } from '@/lib/payments/types'
import {
  PlanCode,
  BillingInterval,
  PaymentGatewayType,
  SubscriptionPlanRecord,
  SubscriptionCheckoutResult,
} from '@/types/subscription.types'
import { cn } from '@/lib/utils'

export function TrialUpgradeModal() {
  const {
    isUpgradeModalOpen,
    closeUpgradeModal,
    upgradeModalInitialTarget,
    upgradeModalTriggerFeature,
    currentPlanCode,
    allPlans,
    daysRemainingInTrial,
    isTrial,
    initiateCheckout,
    verifyPayment,
  } = useSubscription()
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()

  const [interval, setInterval] = useState<BillingInterval>('monthly')
  const [selectedPlan, setSelectedPlan] = useState<PlanCode>('business')
  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayType>('bkash')
  const [txReference, setTxReference] = useState('')
  const [currentTrxId, setCurrentTrxId] = useState<string | null>(null)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const [instructions, setInstructions] = useState<string[] | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (upgradeModalInitialTarget && upgradeModalInitialTarget !== 'trial') {
      setSelectedPlan(upgradeModalInitialTarget)
    } else if (currentPlanCode === 'starter') {
      setSelectedPlan('business')
    } else if (currentPlanCode === 'business') {
      setSelectedPlan('enterprise')
    } else {
      setSelectedPlan('business')
    }
  }, [upgradeModalInitialTarget, currentPlanCode, isUpgradeModalOpen])

  if (!isUpgradeModalOpen) return null

  const providers = PAYMENT_GATEWAY_METADATA_LIST
  const activeProvider = PAYMENT_GATEWAY_METADATA_LIST.find((p) => p.id === selectedGateway)
  const paidPlans = allPlans.filter((p) => p.code !== 'trial')
  const targetPlanObj = allPlans.find((p) => p.code === selectedPlan) || paidPlans[1]

  const payableAmount =
    interval === 'yearly'
      ? targetPlanObj.price_yearly
      : targetPlanObj.price_monthly

  const handleInitiateCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setErrorMessage(null)

    try {
      const res = await initiateCheckout({
        planCode: selectedPlan,
        interval,
        gatewayProvider: selectedGateway,
        customerName: company?.name || 'Tenant Administrator',
        customerPhone: (company as any)?.phone || '',
        customerEmail: (company as any)?.email || '',
      })

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to initiate checkout.')
        setIsProcessing(false)
        return
      }

      const checkoutRes = res as SubscriptionCheckoutResult
      setCurrentTrxId(checkoutRes.internalTrxId || null)

      if (checkoutRes.checkoutUrl) {
        setCheckoutUrl(checkoutRes.checkoutUrl)
        window.location.href = checkoutRes.checkoutUrl
        return
      }

      if (checkoutRes.instructions && checkoutRes.instructions.length > 0) {
        setInstructions(checkoutRes.instructions)
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Checkout failed.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManualVerify = async () => {
    if (!currentTrxId && !txReference) return
    setIsProcessing(true)
    setErrorMessage(null)

    try {
      const verifyRes = await verifyPayment({
        internalTrxId: currentTrxId || undefined,
        providerTrxId: txReference || undefined,
        provider: selectedGateway,
      })

      if (verifyRes.success) {
        setIsSuccess(true)
        setTimeout(() => {
          setIsSuccess(false)
          closeUpgradeModal()
        }, 2500)
      } else {
        setErrorMessage(verifyRes.error || 'Payment could not be verified by provider.')
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Verification failed.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <ModalDialog
      open={isUpgradeModalOpen}
      onOpenChange={(open) => !open && closeUpgradeModal()}
      size="xl"
      title={
        <div className="flex items-center gap-2 text-slate-900 dark:text-white">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-indigo-600 text-white shadow-sm">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <div className="font-black text-lg tracking-tight">
              {isTrial
                ? tBilingual('Upgrade Your Free Trial to a Pro Plan', 'আপনার ফ্রি ট্রায়ালটি প্রো প্ল্যানে আপগ্রেড করুন')
                : tBilingual('Upgrade Your PrintERP Plan', 'আপনার প্রিন্টইআরপি প্ল্যান আপগ্রেড করুন')}
            </div>
            {isTrial && (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-normal">
                {tBilingual(
                  `Free trial active (${daysRemainingInTrial} days remaining). Upgrade now to keep full continuous access.`,
                  `ফ্রি ট্রায়াল সক্রিয় (আর ${daysRemainingInTrial} দিন বাকি)। নিরবচ্ছিন্ন সেবার জন্য এখনই আপগ্রেড করুন।`
                )}
              </p>
            )}
          </div>
        </div>
      }
    >
      {isSuccess ? (
        <div className="py-12 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-10 w-10 animate-bounce" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900 dark:text-white bangla-text">
              {tBilingual('Payment Verified & Plan Activated!', 'পেমেন্ট ভেরিফাইড এবং প্ল্যান সক্রিয় হয়েছে!')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto bangla-text">
              {tBilingual(
                `Your tenant workspace has been upgraded to the ${targetPlanObj.name}. All plan limits and features are unlocked.`,
                `আপনার অ্যাকাউন্ট ${targetPlanObj.name_bn}-এ আপগ্রেড করা হয়েছে। সকল সুবিধা এখনই আনলক করা হয়েছে।`
              )}
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleInitiateCheckout} className="space-y-6">
          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Interval Switcher */}
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setInterval('monthly')}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
                  interval === 'monthly'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                {tBilingual('Monthly Billing', 'মাসিক বিলিং')}
              </button>
              <button
                type="button"
                onClick={() => setInterval('yearly')}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
                  interval === 'yearly'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                <span>{tBilingual('Yearly Billing', 'বাৎসরিক বিলিং')}</span>
                <span className="bg-emerald-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full uppercase">
                  {tBilingual('2 Mo Free', '২ মাস ফ্রি')}
                </span>
              </button>
            </div>
          </div>

          {/* Plan Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paidPlans.map((plan) => {
              const isSelected = selectedPlan === plan.code
              const isRecommended = plan.code === 'business'
              const price = interval === 'yearly' ? plan.price_yearly : plan.price_monthly

              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.code)}
                  className={cn(
                    'relative rounded-2xl border-2 p-4 cursor-pointer transition-all flex flex-col justify-between',
                    isSelected
                      ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/30 shadow-lg shadow-blue-500/10'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  )}
                >
                  {isRecommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                      {tBilingual('Most Popular', 'জনপ্রিয় পছন্দ')}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-base text-slate-900 dark:text-white bangla-text">
                        {tBilingual(plan.name, plan.name_bn)}
                      </h4>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900 dark:text-white">
                          <CurrencyDisplay amount={price} />
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {interval === 'yearly' ? tBilingual('/yr', '/বছর') : tBilingual('/mo', '/মাস')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 bangla-text">
                        {plan.description}
                      </p>
                    </div>

                    {/* Limit items */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-700 dark:text-slate-300 bangla-text">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span>{plan.max_users} {tBilingual('Team Users', 'জন ইউজার')}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span>{plan.max_branches} {tBilingual('Branches / Hubs', 'টি ব্রাঞ্চ')}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ShoppingCart className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>{plan.monthly_orders.toLocaleString()} {tBilingual('Monthly Orders', 'টি অর্ডার/মাস')}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <HardDrive className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                        <span>{plan.storage_gb} {tBilingual('GB Cloud Storage', 'জিবি স্টোরেজ')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      type="button"
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'w-full text-xs font-bold bangla-text',
                        isSelected && 'bg-blue-600 hover:bg-blue-700 text-white'
                      )}
                    >
                      {isSelected
                        ? tBilingual('Selected Plan', 'নির্বাচিত প্ল্যান')
                        : tBilingual('Choose ' + plan.name, plan.name_bn + ' নির্বাচন')}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Payment Gateway Selection */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5 bangla-text">
                <CreditCard className="h-4 w-4 text-blue-600" />
                {tBilingual('Select Payment Method (Bangladesh Gateways)', 'পেমেন্ট মেথড নির্বাচন করুন (বাংলাদেশ)')}
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {tBilingual('Total Payable: ', 'মোট প্রদেয়: ')}
                <CurrencyDisplay amount={payableAmount} />
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {providers.map((p) => {
                const isGWSelected = selectedGateway === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedGateway(p.id as PaymentGatewayType)}
                    className={cn(
                      'p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer',
                      isGWSelected
                        ? 'border-blue-600 bg-white dark:bg-slate-900 shadow-sm ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'
                    )}
                  >
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">{p.name}</span>
                    <span className="text-[10px] text-slate-400 capitalize">{p.category}</span>
                  </button>
                )
              })}
            </div>

            {/* Instruction / Reference Input */}
            {instructions && instructions.length > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 space-y-1">
                {instructions.map((ins, i) => (
                  <div key={i} className="text-xs text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span>{ins}</span>
                  </div>
                ))}
              </div>
            )}

            {currentTrxId && (
              <div className="pt-2 space-y-2">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 bangla-text block">
                  {tBilingual('Provider Transaction ID / Reference (For Server Verification):', 'প্রোভাইডার ট্রানজেকশন আইডি / রেফারেন্স নম্বর:')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={txReference}
                    onChange={(e) => setTxReference(e.target.value)}
                    placeholder={`e.g. ${selectedGateway.toUpperCase()}-987261`}
                    className="flex-1 text-xs font-mono px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleManualVerify}
                    disabled={isProcessing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0"
                  >
                    {isProcessing ? 'Verifying...' : 'Verify Now'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeUpgradeModal}
              disabled={isProcessing}
            >
              {tBilingual('Cancel', 'বাতিল')}
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={isProcessing}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-6 shadow-md shadow-blue-500/20 bangla-text"
            >
              {isProcessing ? (
                <span>{tBilingual('Processing Checkout...', 'প্রক্রিয়াধীন...')}</span>
              ) : (
                <>
                  <Zap className="mr-1.5 h-4 w-4 text-amber-300" />
                  <span>
                    {tBilingual(
                      `Upgrade to ${targetPlanObj.name} (৳${payableAmount.toLocaleString()})`,
                      `${targetPlanObj.name_bn} এ আপগ্রেড করুন (৳${payableAmount.toLocaleString()})`
                    )}
                  </span>
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </ModalDialog>
  )
}
