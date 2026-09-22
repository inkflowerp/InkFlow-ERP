'use client'

import React, { useState } from 'react'
import {
  AlertTriangle,
  RotateCcw,
  Trash2,
  X,
  CheckCircle2,
  ShieldAlert,
  Layers,
  ShoppingBag,
  Receipt,
  Package,
  Users,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/i18n/context'
import { resetTenantDataAction } from '@/actions/tenant.actions'
import { PrintERPDataStore } from '@/lib/db/data-store'
import { playNotificationSound } from '@/lib/notifications/sound-manager'
import { notify } from '@/lib/notifications/notification-bus'
import { useToast } from '@/components/shared/toast-feedback'

interface ResetTenantDataModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  companySlug: string
  companyName: string
}

export function ResetTenantDataModal({
  open,
  onOpenChange,
  companyId,
  companySlug,
  companyName,
}: ResetTenantDataModalProps) {
  const { tBilingual } = useI18n()
  const { showToast } = useToast()
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isConfirmed = confirmText.trim().toUpperCase() === 'RESET'

  const handleReset = async () => {
    if (!isConfirmed || loading) return

    setLoading(true)
    setError(null)

    try {
      // 1. Trigger server-side data reset
      const res = await resetTenantDataAction(companyId)

      // 2. Clear client-side partitioned inMemoryStore and localStorage
      PrintERPDataStore.resetTenantData(companyId, [companySlug])

      // 3. Play sound & dispatch alert
      playNotificationSound('warning')
      notify.warning(
        'Workspace Data Reset',
        `All transactional records for ${companyName} have been reset.`
      )

      showToast({
        title: 'Workspace Data Reset',
        titleBn: 'সব ট্রানজ্যাকশন ডাটা রিসেট সম্পন্ন',
        message: 'All orders, quotations, invoices, jobs, and stock movements have been cleared.',
        messageBn: 'সমস্ত সেলস অর্ডার, কোটেশন, ইনভয়েস এবং স্টক রেকর্ড রিসেট করা হয়েছে।',
        type: 'warning',
      })

      // 4. Close modal and reload page to refresh all active queries
      onOpenChange(false)
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (err: any) {
      setError(err.message || 'An error occurred while resetting workspace data.')
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    setConfirmText('')
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose} maxWidth="max-w-md">
      <DialogContent className="p-0 overflow-hidden border-rose-500/40 bg-slate-900 text-white shadow-2xl rounded-2xl">
        {/* Header with Caution Theme */}
        <div className="p-5 bg-gradient-to-b from-rose-950/60 to-slate-900/90 border-b border-rose-900/40 relative">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
              <ShieldAlert className="h-6 w-6 animate-pulse" />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <span>{tBilingual('Reset Workspace Data', 'সব ট্রানজ্যাকশন ডাটা রিসেট')}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-rose-200/80 bangla-text">
                {tBilingual(
                  `You are about to reset operational records for "${companyName}".`,
                  `আপনি "${companyName}" এর সমস্ত ট্রানজ্যাকশন ডাটা রিসেট করতে যাচ্ছেন।`
                )}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Explanation Box */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="font-bold text-slate-200 flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-rose-400" />
              <span>{tBilingual('The following records will be cleared:', 'নিম্নলিখিত ডাটাগুলো মুছে ফেলা হবে:')}</span>
            </div>
            <ul className="space-y-1.5 text-slate-400 pl-2">
              <li className="flex items-center gap-2">
                <ShoppingBag className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span>Sales Orders, POS Transactions &amp; Quotations</span>
              </li>
              <li className="flex items-center gap-2">
                <Receipt className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Invoices, Payments, Expenses &amp; Cash Book</span>
              </li>
              <li className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Production Jobs, Tasks &amp; Delivery Challans</span>
              </li>
              <li className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                <span>Stock Movements, Materials &amp; Roll Inventories</span>
              </li>
            </ul>
          </div>

          {/* Safe Items Notice */}
          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300/90 text-[11px] flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              {tBilingual(
                'Company profile, registered staff users, roles, branches, and subscription plans will remain completely safe.',
                'কোম্পানি প্রোফাইল, স্টাফ ইউজার একাউন্ট, রোলস এবং সাবস্ক্রিপশন সুরক্ষিত থাকবে।'
              )}
            </span>
          </div>

          {/* Type Confirmation */}
          <div className="space-y-2 pt-1">
            <label className="block font-semibold text-slate-300">
              {tBilingual(
                'To confirm, type "RESET" in the box below:',
                'নিশ্চিত করতে নিচে "RESET" লিখুন:'
              )}
            </label>
            <Input
              type="text"
              placeholder="RESET"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="font-mono text-center tracking-widest uppercase bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 focus:border-rose-500 focus:ring-rose-500/20"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="text-xs border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            {tBilingual('Cancel', 'বাতিল')}
          </Button>

          <Button
            type="button"
            onClick={handleReset}
            disabled={!isConfirmed || loading}
            isLoading={loading}
            className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/30 border border-rose-500/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            <span>{tBilingual('Reset All Data', 'সব ডাটা রিসেট করুন')}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
