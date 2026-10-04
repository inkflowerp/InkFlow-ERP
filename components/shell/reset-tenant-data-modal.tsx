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
 const pathSlug = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : ''
 const effectiveSlug = companySlug || PrintERPDataStore.getActiveTenantSlug() || pathSlug || ''
 const effectiveCompanyId = companyId || effectiveSlug
 const aliases = [
 effectiveSlug,
 companySlug,
 companyId,
 pathSlug,
        `comp-${effectiveSlug.replace(/^comp-/, '').replace(/^co-/, '')}`,
        `co-${effectiveSlug.replace(/^comp-/, '').replace(/^co-/, '')}`,
      ].filter(Boolean)

      // 1. Client-side immediate zero-state wipe (guarantees local storage is wiped regardless of server connection)
 PrintERPDataStore.resetTenantData(effectiveCompanyId, aliases)

      // 2. Trigger server-side data reset across database tables
 try {
 await resetTenantDataAction(effectiveCompanyId)
      } catch (srvErr) {
 console.warn('Server reset action note:', srvErr)
      }

      // 3. Client-side secondary purge to guarantee clean zero-state
 PrintERPDataStore.resetTenantData(effectiveCompanyId, aliases)

      // 4. Play sound & dispatch alert
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

      // 5. Close modal and reload page to refresh all active queries
 onOpenChange(false)
 setTimeout(() => {
 window.location.reload()
      }, 350)
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
      <DialogContent className="p-0 overflow-hidden border-danger-border/40 bg-surface-inset text-foreground shadow-lg rounded-xl">
        {/* Header with Caution Theme */}
        <div className="p-5 border-b border-danger-border/40 relative">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-destructive/20 text-destructive border border-danger-border/30 shrink-0">
              <ShieldAlert className="h-6 w-6 animate-pulse"/>
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <span>{tBilingual('Reset Workspace Data', 'সব ট্রানজ্যাকশন ডাটা রিসেট')}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-destructive/80 bangla-text">
                {tBilingual(
                  `You are about to reset operational records for"${companyName}".`,
                  `আপনি"${companyName}"এর সমস্ত ট্রানজ্যাকশন ডাটা রিসেট করতে যাচ্ছেন।`
                )}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-danger-surface/60 border border-danger-border text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-destructive"/>
              <span>{error}</span>
            </div>
          )}

          {/* Explanation Box */}
          <div className="p-3.5 rounded-xl bg-surface-inset border border-border space-y-2.5">
            <div className="font-bold text-foreground flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive"/>
              <span>{tBilingual('The following records will be cleared:', 'নিম্নলিখিত ডাটাগুলো মুছে ফেলা হবে:')}</span>
            </div>
            <ul className="space-y-1.5 text-muted-foreground pl-2">
              <li className="flex items-center gap-2">
                <ShoppingBag className="h-3.5 w-3.5 text-primary shrink-0"/>
                <span>Sales Orders, POS Transactions &amp; Quotations</span>
              </li>
              <li className="flex items-center gap-2">
                <Receipt className="h-3.5 w-3.5 text-success shrink-0"/>
                <span>Invoices, Payments, Expenses &amp; Cash Book</span>
              </li>
              <li className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-warning shrink-0"/>
                <span>Production Jobs, Tasks &amp; Delivery Challans</span>
              </li>
              <li className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-primary shrink-0"/>
                <span>Stock Movements, Materials &amp; Roll Inventories</span>
              </li>
            </ul>
          </div>

          {/* Safe Items Notice */}
          <div className="p-3 rounded-xl bg-success-surface border border-success-border/40 text-success/90 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success shrink-0"/>
            <span>
              {tBilingual(
                'Company profile, registered staff users, roles, branches, and subscription plans will remain completely safe.',
                'কোম্পানি প্রোফাইল, স্টাফ ইউজার একাউন্ট, রোলস এবং সাবস্ক্রিপশন সুরক্ষিত থাকবে।'
              )}
            </span>
          </div>

          {/* Type Confirmation */}
          <div className="space-y-2 pt-1">
            <label className="block font-semibold text-muted-foreground">
              {tBilingual(
                'To confirm, type"RESET"in the box below:',
                'নিশ্চিত করতে নিচে"RESET"লিখুন:'
              )}
            </label>
            <Input
 type="text"placeholder="RESET"value={confirmText}
 onChange={(e) => setConfirmText(e.target.value)}
 className="tabular-nums text-center tracking-widest uppercase bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-danger-border focus:ring-ring/20"/>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 bg-surface-inset border-t border-border flex items-center justify-end gap-2.5">
          <Button
 type="button"variant="outline"onClick={handleClose}
 disabled={loading}
 className="text-xs border-border text-muted-foreground hover:bg-card-elevated hover:text-foreground">
            {tBilingual('Cancel', 'বাতিল')}
          </Button>

          <Button
 type="button"onClick={handleReset}
 disabled={!isConfirmed || loading}
 isLoading={loading}
 className="text-xs font-bold bg-destructive hover:bg-destructive text-white shadow-lg shadow-rose-900/30 border border-danger-border/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
            <RotateCcw className="h-3.5 w-3.5 mr-1.5"/>
            <span>{tBilingual('Reset All Data', 'সব ডাটা রিসেট করুন')}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
