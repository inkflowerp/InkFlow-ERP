'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  Building2,
  ExternalLink,
  RefreshCw,
  Zap,
} from 'lucide-react'
import {
  PlatformSaasPlanRecord,
  PlatformBillingCycle,
} from '@/types/platform-subscription.types'
import {
  initiatePlatformCheckoutAction,
  verifyPlatformPaymentAction,
} from '@/actions/platform-subscription.actions'
import { SanitizedGatewayRecord } from '@/types/gateway.types'

interface PlatformCheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  selectedPlan: PlatformSaasPlanRecord | null
  currentPlanId?: string
  gateways: SanitizedGatewayRecord[]
  onSuccess: () => void
}

export function PlatformCheckoutModal({
  isOpen,
  onClose,
  selectedPlan,
  currentPlanId,
  gateways,
  onSuccess,
}: PlatformCheckoutModalProps) {
  const [billingCycle, setBillingCycle] = useState<PlatformBillingCycle>('yearly')
  const [selectedGateway, setSelectedGateway] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTrxId, setActiveTrxId] = useState<string | null>(null)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)

  // Verification states
  const [verificationState, setVerificationState] = useState<
    'idle' | 'initiating' | 'pending_payment' | 'verifying' | 'verified' | 'failed'
  >('idle')
  const [manualTrxRef, setManualTrxRef] = useState('')
  const [verificationMessage, setVerificationMessage] = useState('')

  useEffect(() => {
    if (gateways.length > 0 && !selectedGateway) {
      const defaultGw = gateways.find((g) => g.is_default && g.is_enabled) || gateways.find((g) => g.is_enabled)
      if (defaultGw) setSelectedGateway(defaultGw.provider)
    }
  }, [gateways, selectedGateway])

  useEffect(() => {
    if (!isOpen) {
      setVerificationState('idle')
      setActiveTrxId(null)
      setCheckoutUrl(null)
      setError(null)
      setManualTrxRef('')
    }
  }, [isOpen])

  if (!selectedPlan) return null

  const isUpgrade = currentPlanId && currentPlanId !== selectedPlan.id
  const basePrice = billingCycle === 'yearly' ? selectedPlan.yearly_price : selectedPlan.monthly_price

  const handleInitiate = async () => {
    setLoading(true)
    setError(null)
    setVerificationState('initiating')

    const gwRecord = gateways.find((g) => g.provider === selectedGateway)

    const res = await initiatePlatformCheckoutAction({
      planId: selectedPlan.id,
      billingCycle,
      provider: selectedGateway || 'bkash',
      gatewayIntegrationId: gwRecord?.id,
      returnUrl: window.location.origin + '/platform/billing?status=processing',
      cancelUrl: window.location.origin + '/platform/billing?status=cancelled',
    })

    setLoading(false)

    if (!res.success || !res.data) {
      setError(res.error || 'Failed to initiate platform checkout.')
      setVerificationState('failed')
      return
    }

    setActiveTrxId(res.data.internalTrxId || null)
    setCheckoutUrl(res.data.checkoutUrl || null)
    setVerificationState('pending_payment')

    // If real gateway provided a redirect URL, open it
    if (res.data.checkoutUrl) {
      window.open(res.data.checkoutUrl, '_blank')
    }
  }

  const handleVerify = async () => {
    if (!activeTrxId) return
    setLoading(true)
    setError(null)
    setVerificationState('verifying')

    const res = await verifyPlatformPaymentAction(activeTrxId, {
      admin_verified: selectedGateway === 'bank_transfer' || selectedGateway === 'manual',
      verification_code: selectedGateway === 'bank_transfer' ? 'MANUAL_VERIFIED' : undefined,
      bank_trx_id: manualTrxRef || undefined,
    })

    setLoading(false)

    if (res.success && res.data?.isVerified) {
      setVerificationState('verified')
      setVerificationMessage(res.data.message || 'Payment successfully verified and platform activated!')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 2000)
    } else {
      setVerificationState('failed')
      setError(res.error || 'Server-side payment verification failed. Gateway has not confirmed settlement.')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[620px] bg-slate-950 border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 border-b border-slate-800 p-6">
          <div className="flex items-center justify-between mb-2">
            <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase text-[10px] tracking-wider px-2 py-0.5">
              Platform SaaS Subscription
            </Badge>
            <span className="text-xs font-semibold text-slate-400">Cluster Infrastructure</span>
          </div>
          <DialogTitle className="text-2xl font-black text-white flex items-center gap-2.5">
            <Sparkles className="h-6 w-6 text-indigo-400" />
            {selectedPlan.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-300 mt-1">
            {selectedPlan.description || 'Authorize production cluster capacity, tenants, and infrastructure limits.'}
          </DialogDescription>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Billing Cycle Switcher */}
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-900/90 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              disabled={verificationState !== 'idle'}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center ${
                billingCycle === 'monthly'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              disabled={verificationState !== 'idle'}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                billingCycle === 'yearly'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Annual Billing
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.2 rounded border border-emerald-500/30">
                2 Mo Free
              </span>
            </button>
          </div>

          {/* Pricing & Limits Breakdown */}
          <Card className="bg-slate-900/60 border-slate-800 p-4 space-y-3">
            <div className="flex items-baseline justify-between border-b border-slate-800/80 pb-3">
              <div>
                <span className="text-xs text-slate-400 font-medium">Subscription Total:</span>
                <div className="text-2xl font-black text-white mt-0.5">
                  <CurrencyDisplay amount={basePrice} />
                  <span className="text-xs font-normal text-slate-400 ml-1">
                    /{billingCycle === 'yearly' ? 'year' : 'month'}
                  </span>
                </div>
              </div>
              <Badge className="bg-slate-800 text-slate-300 border-slate-700">
                {billingCycle === 'yearly' ? '12 Months Access' : '30 Days Access'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-400">Max Tenants</span>
                <p className="font-bold text-slate-200 mt-0.5">{selectedPlan.limits.max_tenants || 'Unlimited'}</p>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-400">Total Users</span>
                <p className="font-bold text-slate-200 mt-0.5">{selectedPlan.limits.max_total_users || 'Unlimited'}</p>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-400">Cluster Storage</span>
                <p className="font-bold text-slate-200 mt-0.5">{selectedPlan.limits.storage_gb} GB</p>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-400">API Calls</span>
                <p className="font-bold text-slate-200 mt-0.5">
                  {selectedPlan.limits.monthly_api_calls ? (selectedPlan.limits.monthly_api_calls / 1000) + 'k/mo' : 'Unlimited'}
                </p>
              </div>
            </div>
          </Card>

          {/* Payment Method Selection */}
          {verificationState === 'idle' && (
            <div className="space-y-3">
              <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select Platform Payment Gateway
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {gateways.length === 0 ? (
                  <div className="col-span-2 p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl text-amber-300 text-xs">
                    No active payment gateways found. Using Bank Wire / Manual Verification mode.
                  </div>
                ) : (
                  gateways
                    .filter((g) => g.is_enabled)
                    .map((gw) => (
                      <button
                        key={gw.id}
                        type="button"
                        onClick={() => setSelectedGateway(gw.provider)}
                        className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                          selectedGateway === gw.provider
                            ? 'bg-indigo-950/40 border-indigo-500/80 shadow-md ring-1 ring-indigo-500'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <CreditCard className="h-4 w-4 text-indigo-400" />
                          <div>
                            <p className="text-xs font-bold text-white uppercase">{gw.provider}</p>
                            <span className="text-[10px] text-slate-400">{gw.name}</span>
                          </div>
                        </div>
                        {gw.is_default && (
                          <Badge className="bg-emerald-500/20 text-emerald-300 text-[9px] px-1 py-0">Default</Badge>
                        )}
                      </button>
                    ))
                )}
              </div>
            </div>
          )}

          {/* Verification Timeline / Progress */}
          {verificationState !== 'idle' && (
            <Card className="bg-slate-900 border-slate-800 p-4 space-y-4">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Transaction & Verification Status</span>
                <span className="text-indigo-400 font-mono text-[11px]">{activeTrxId}</span>
              </div>

              <div className="space-y-3">
                {/* Step 1: Initiated */}
                <div className="flex items-start gap-3 text-xs">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-white">Payment Transaction Created</p>
                    <span className="text-[11px] text-slate-400">Server verified plan pricing and initialized gateway.</span>
                  </div>
                </div>

                {/* Step 2: Pending Payment / Checkout */}
                <div className="flex items-start gap-3 text-xs">
                  <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                    verificationState === 'pending_payment'
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 animate-pulse'
                      : verificationState === 'verifying' || verificationState === 'verified'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-white">Provider Checkout &amp; Settlement</p>
                    {checkoutUrl && (
                      <a
                        href={checkoutUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 underline mt-0.5"
                      >
                        Re-open Gateway Payment Page <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Step 3: Provider Verification */}
                <div className="flex items-start gap-3 text-xs">
                  <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                    verificationState === 'verifying'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                      : verificationState === 'verified'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-white">Authoritative Server-Side Verification</p>
                    <span className="text-[11px] text-slate-400">
                      Cryptographic confirmation &amp; anti-tampering amount validation.
                    </span>
                  </div>
                </div>
              </div>

              {/* Manual Bank Wire Ref Input */}
              {(selectedGateway === 'bank_transfer' || selectedGateway === 'manual') && (
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <Label className="text-xs text-slate-300">Bank Wire / Cheque Reference Number</Label>
                  <Input
                    placeholder="e.g. TRX-BANK-9823412"
                    value={manualTrxRef}
                    onChange={(e) => setManualTrxRef(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs h-9"
                  />
                </div>
              )}
            </Card>
          )}

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {verificationMessage && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{verificationMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-200 text-xs"
          >
            Close
          </Button>

          {verificationState === 'idle' ? (
            <Button
              type="button"
              onClick={handleInitiate}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 px-5 shadow-lg"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Initiating...
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5 mr-1.5" />
                  Proceed to Payment
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleVerify}
              disabled={loading || verificationState === 'verified'}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-5 shadow-lg"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Verifying with Gateway...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                  Verify &amp; Activate Plan
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
