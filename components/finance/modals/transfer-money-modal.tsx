'use client'

import React, { useState, useEffect } from 'react'
import {
 ArrowLeftRight,
 AlertCircle,
 Building,
 CreditCard,
 Wallet,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/i18n/context'
import { formatBDT } from '@/lib/formatters'
import type { AccountRecord } from '@/types/finance.types'

interface TransferMoneyModalProps {
 isOpen: boolean
 onClose: () => void
 accounts: AccountRecord[]
 onSubmit: (data: {
 fromAccountId: string
 toAccountId: string
 amount: number
 feeAmount?: number
 transferDate: string
 notes?: string
  }) => Promise<void>
}

export function TransferMoneyModal({
 isOpen,
 onClose,
 accounts,
 onSubmit,
}: TransferMoneyModalProps) {
 const { tBilingual } = useI18n()
 const liquidAccounts = accounts.filter(
    (a) => a.account_type === 'ASSET' && (a.account_subtype === 'CASH' || a.account_subtype === 'BANK' || a.account_subtype === 'MFS')
  )

 const [fromAccountId, setFromAccountId] = useState(liquidAccounts[0]?.id || '')
 const [toAccountId, setToAccountId] = useState(liquidAccounts[1]?.id || '')
 const [amount, setAmount] = useState<string>('')
 const [feeAmount, setFeeAmount] = useState<string>('0')
 const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0])
 const [notes, setNotes] = useState('')
 const [isSubmitting, setIsSubmitting] = useState(false)
 const [error, setError] = useState<string | null>(null)

  // Auto-synchronize accounts when modal opens or account list updates
 useEffect(() => {
 if (isOpen && liquidAccounts.length > 0) {
 if (!fromAccountId || !liquidAccounts.some((a) => a.id === fromAccountId)) {
 setFromAccountId(liquidAccounts[0].id)
      }
 if (!toAccountId || toAccountId === fromAccountId || !liquidAccounts.some((a) => a.id === toAccountId)) {
 const nextAcc = liquidAccounts.find((a) => a.id !== fromAccountId) || liquidAccounts[1] || liquidAccounts[0]
 if (nextAcc) {
 setToAccountId(nextAcc.id)
        }
      }
    }
  }, [isOpen, liquidAccounts, fromAccountId, toAccountId])

 const fromAcc = accounts.find((a) => a.id === fromAccountId) || liquidAccounts[0]
 const toAcc = accounts.find((a) => a.id === toAccountId) || liquidAccounts[1]

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 setError(null)
 const numAmt = parseFloat(amount)
 const fee = parseFloat(feeAmount || '0')

 if (isNaN(numAmt) || numAmt <= 0) {
 setError(tBilingual('Please enter a valid transfer amount', 'সঠিক ট্রান্সফার পরিমাণ লিখুন'))
 return
    }

 const activeFromId = fromAccountId || liquidAccounts[0]?.id || accounts[0]?.id || ''
 const activeToId = toAccountId || liquidAccounts.find((a) => a.id !== activeFromId)?.id || liquidAccounts[1]?.id || ''

 if (!activeFromId || !activeToId) {
 setError(tBilingual('Please select source and destination accounts', 'উৎস ও গন্তব্য হিসাব নির্বাচন করুন'))
 return
    }

 if (activeFromId === activeToId) {
 setError(tBilingual('Source and destination accounts cannot be identical', 'উৎস ও গন্তব্য হিসাব একই হতে পারে না'))
 return
    }

 try {
 setIsSubmitting(true)
 await onSubmit({
 fromAccountId: activeFromId,
 toAccountId: activeToId,
 amount: numAmt,
 feeAmount: isNaN(fee) ? 0 : fee,
 transferDate,
 notes: notes || undefined,
      })
 onClose()
 setAmount('')
 setNotes('')
    } catch (err: any) {
 setError(err.message || 'Failed to record transfer')
    } finally {
 setIsSubmitting(false)
    }
  }

 return (
    <ModalDialog
 open={isOpen}
 onOpenChange={(open) => !open && onClose()}
 title={tBilingual('Transfer Money (Cash / Bank / MFS)', 'তহবিল ট্রান্সফার (ক্যাশ ↔ ব্যাংক ↔ বিকাশ)')}
 hideFooter={true}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0"/>
            <span>{error}</span>
          </div>
        )}

        {/* Source Account */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">
            {tBilingual('Transfer From (Source)', 'কোথা থেকে পাঠাচ্ছেন?')} *
          </Label>
          <select
 value={fromAccountId || liquidAccounts[0]?.id || ''}
 onChange={(e) => setFromAccountId(e.target.value)}
 className="w-full h-10 px-3 text-sm rounded-xl border border-input bg-card text-foreground">
            {liquidAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.account_subtype}) — {tBilingual('Current Balance: ', 'বর্তমান ব্যালেন্স: ')}{formatBDT(acc.current_balance)}
              </option>
            ))}
          </select>
        </div>

        {/* Destination Account */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">
            {tBilingual('Transfer To (Destination)', 'কোথায় জমা হবে?')} *
          </Label>
          <select
 value={toAccountId || liquidAccounts[1]?.id || liquidAccounts[0]?.id || ''}
 onChange={(e) => setToAccountId(e.target.value)}
 className="w-full h-10 px-3 text-sm rounded-xl border border-input bg-card text-foreground">
            {liquidAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.account_subtype}) — {tBilingual('Current Balance: ', 'বর্তমান ব্যালেন্স: ')}{formatBDT(acc.current_balance)}
              </option>
            ))}
          </select>
        </div>

        {/* Amount & Fee */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              {tBilingual('Transfer Amount', 'স্থানান্তরের পরিমাণ')} *
            </Label>
            <Input
 type="number"step="any"required
 placeholder="0.00"value={amount}
 onChange={(e) => setAmount(e.target.value)}
 className="text-base font-bold h-10 rounded-xl"/>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {tBilingual('Processing Fee', 'চার্জ বা ফি')}
            </Label>
            <Input
 type="number"step="any"placeholder="0.00"value={feeAmount}
 onChange={(e) => setFeeAmount(e.target.value)}
 className="h-10 text-sm rounded-xl"/>
          </div>
        </div>

        {/* Date & Note */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              {tBilingual('Transfer Date', 'তারিখ')}
            </Label>
            <Input
 type="date"value={transferDate}
 onChange={(e) => setTransferDate(e.target.value)}
 className="h-9 text-xs rounded-lg"/>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              {tBilingual('Reference / Note', 'নোট বা ট্রানজ্যাকশন আইডি')}
            </Label>
            <Input
 placeholder="যেমন: ব্যাংক ডিপোজিট স্লিপ"value={notes}
 onChange={(e) => setNotes(e.target.value)}
 className="h-9 text-xs rounded-lg"/>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
          <Button type="button"variant="outline"onClick={onClose} className="rounded-xl">
            {tBilingual('Cancel', 'বাতিল')}
          </Button>
          <Button
 type="submit"disabled={isSubmitting}
 className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl px-5">
            {isSubmitting ? tBilingual('Transferring...', 'ট্রান্সফার হচ্ছে...') : tBilingual('Confirm Transfer', 'ট্রান্সফার সম্পন্ন করুন')}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
