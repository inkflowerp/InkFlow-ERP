'use client'

import React, { useState } from 'react'
import {
  Wallet,
  Building2,
  Smartphone,
  Plus,
  AlertCircle,
  CreditCard,
  Hash,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import type { AccountRecord, AccountSubtype } from '@/types/finance.types'

export interface AddAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newAccount: AccountRecord) => void
  existingAccounts: AccountRecord[]
}

export function AddAccountModal({
  isOpen,
  onClose,
  onSuccess,
  existingAccounts,
}: AddAccountModalProps) {
  const { tBilingual } = useI18n()

  const [accountType, setAccountType] = useState<'CASH' | 'BANK' | 'MFS'>('CASH')
  const [name, setName] = useState('')
  const [nameBn, setNameBn] = useState('')
  const [openingBalance, setOpeningBalance] = useState('')

  // Bank fields
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [branchName, setBranchName] = useState('')

  // MFS fields
  const [mfsProvider, setMfsProvider] = useState<'bkash' | 'nagad' | 'rocket' | 'upay' | 'other'>('bkash')
  const [mfsWalletNumber, setMfsWalletNumber] = useState('')
  const [mfsAccountType, setMfsAccountType] = useState<'merchant' | 'personal' | 'agent'>('merchant')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate a distinct code for the new account
  const generateNewCode = (subtype: AccountSubtype) => {
    let prefix = '101'
    if (subtype === 'BANK') prefix = '102'
    if (subtype === 'MFS') prefix = '103'

    const matching = existingAccounts
      .filter((a) => a.code.startsWith(prefix))
      .map((a) => parseInt(a.code, 10))
      .filter((n) => !isNaN(n))

    const maxCode = matching.length > 0 ? Math.max(...matching) : parseInt(prefix + '0', 10)
    return String(maxCode + 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError(tBilingual('Please enter an account name.', 'দয়া করে অ্যাকাউন্টের নাম লিখুন।'))
      return
    }

    try {
      setIsSubmitting(true)
      const code = generateNewCode(accountType)

      const payload: Partial<AccountRecord> & { code: string; name: string; account_type: any; account_subtype: any } = {
        code,
        name: name.trim(),
        name_bn: nameBn.trim() || undefined,
        account_type: 'ASSET',
        account_subtype: accountType,
        currency: 'BDT',
        opening_balance: parseFloat(openingBalance) || 0,
        current_balance: parseFloat(openingBalance) || 0,
        is_system: false,
        is_active: true,
        metadata: {
          ...(accountType === 'BANK'
            ? {
                bank_name: bankName.trim(),
                account_number_masked: accountNumber ? `•••• ${accountNumber.slice(-4)}` : undefined,
                branch_name: branchName.trim(),
              }
            : {}),
          ...(accountType === 'MFS'
            ? {
                mfs_provider: mfsProvider,
                mfs_wallet_number: mfsWalletNumber.trim(),
                mfs_account_type: mfsAccountType,
              }
            : {}),
        },
      }

      const { createAccountAction } = await import('@/actions/finance.actions')
      const res = await createAccountAction(payload)

      if (res.success && res.data) {
        onSuccess(res.data)
        onClose()
        setName('')
        setNameBn('')
        setOpeningBalance('')
        setBankName('')
        setAccountNumber('')
        setBranchName('')
        setMfsWalletNumber('')
      } else {
        setError(res.error || tBilingual('Failed to create account.', 'অ্যাকাউন্ট তৈরি করতে ব্যর্থ হয়েছে।'))
      }
    } catch (err: any) {
      setError(err.message || 'Error creating account')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={tBilingual('Add Money Account', 'নতুন হিসাব / ব্যাংক / ওয়ালেট যুক্ত করুন')}
      description={tBilingual(
        'Create a real Cash Drawer, Bank Account, or bKash/Nagad wallet.',
        'ক্যাশ ড্রয়ার, ব্যাংক একাউন্ট বা বিকাশ/নগদ ওয়ালেট যুক্ত করুন।'
      )}
      size="md"
      hideFooter
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl flex items-center gap-2 border border-rose-200 dark:border-rose-900">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Account Type Selector */}
        <div>
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
            {tBilingual('Account Type', 'হিসাবের ধরন')}
          </Label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setAccountType('CASH')
                if (!name || name.includes('Bank') || name.includes('bKash')) setName('Petty Cash / Counter')
              }}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs font-semibold transition-all cursor-pointer ${
                accountType === 'CASH'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Wallet className="w-5 h-5 text-emerald-600" />
              <span>{tBilingual('Cash', 'নগদ ক্যাশ')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAccountType('BANK')
                if (!name || name.includes('Counter') || name.includes('bKash')) setName('Corporate Bank Account')
              }}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs font-semibold transition-all cursor-pointer ${
                accountType === 'BANK'
                  ? 'border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-300 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Building2 className="w-5 h-5 text-blue-600" />
              <span>{tBilingual('Bank Account', 'ব্যাংক হিসাব')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAccountType('MFS')
                if (!name || name.includes('Counter') || name.includes('Bank')) setName('bKash Merchant')
              }}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs font-semibold transition-all cursor-pointer ${
                accountType === 'MFS'
                  ? 'border-pink-500 bg-pink-50 text-pink-900 dark:bg-pink-950/40 dark:text-pink-300 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Smartphone className="w-5 h-5 text-pink-600" />
              <span>{tBilingual('bKash / Nagad / MFS', 'এমএফএস ওয়ালেট')}</span>
            </button>
          </div>
        </div>

        {/* Account Name */}
        <div>
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
            {tBilingual('Account Display Name *', 'অ্যাকাউন্টের নাম *')}
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              accountType === 'CASH'
                ? 'e.g. Counter Cash Drawer #2'
                : accountType === 'BANK'
                ? 'e.g. DBBL Current Account'
                : 'e.g. bKash Merchant 017...'
            }
            className="h-9 text-xs rounded-xl"
            required
          />
        </div>

        {/* Name in Bengali */}
        <div>
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
            {tBilingual('Name in Bangla (Optional)', 'বাংলা নাম (ঐচ্ছিক)')}
          </Label>
          <Input
            value={nameBn}
            onChange={(e) => setNameBn(e.target.value)}
            placeholder="যেমন: ক্যাশ ড্রয়ার ২"
            className="h-9 text-xs rounded-xl"
          />
        </div>

        {/* Bank Specific Fields */}
        {accountType === 'BANK' && (
          <div className="space-y-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800">
            <div>
              <Label className="text-2xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                {tBilingual('Bank Name', 'ব্যাংকের নাম')}
              </Label>
              <Input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Dutch-Bangla Bank, BRAC Bank, City Bank"
                className="h-8 text-xs rounded-lg bg-white dark:bg-slate-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-2xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                  {tBilingual('Account Number', 'হিসাব নম্বর')}
                </Label>
                <Input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 12010500..."
                  className="h-8 text-xs rounded-lg bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <Label className="text-2xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                  {tBilingual('Branch Name', 'শাখা')}
                </Label>
                <Input
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. Motijheel, Banani"
                  className="h-8 text-xs rounded-lg bg-white dark:bg-slate-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* MFS Specific Fields */}
        {accountType === 'MFS' && (
          <div className="space-y-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-2xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                  {tBilingual('Provider', 'প্রোভাইডার')}
                </Label>
                <select
                  value={mfsProvider}
                  onChange={(e) => setMfsProvider(e.target.value as any)}
                  className="h-8 w-full text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2"
                >
                  <option value="bkash">bKash (বিকাশ)</option>
                  <option value="nagad">Nagad (নগদ)</option>
                  <option value="rocket">Rocket (রকেট)</option>
                  <option value="upay">Upay (উপায়)</option>
                  <option value="other">Other MFS</option>
                </select>
              </div>
              <div>
                <Label className="text-2xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                  {tBilingual('Account Category', 'ধরন')}
                </Label>
                <select
                  value={mfsAccountType}
                  onChange={(e) => setMfsAccountType(e.target.value as any)}
                  className="h-8 w-full text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2"
                >
                  <option value="merchant">Merchant (মার্চেন্ট)</option>
                  <option value="personal">Personal (ব্যক্তিগত)</option>
                  <option value="agent">Agent (এজেন্ট)</option>
                </select>
              </div>
            </div>
            <div>
              <Label className="text-2xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                {tBilingual('Wallet Phone Number', 'ওয়ালেট মোবাইল নম্বর')}
              </Label>
              <Input
                value={mfsWalletNumber}
                onChange={(e) => setMfsWalletNumber(e.target.value)}
                placeholder="e.g. 01711223344"
                className="h-8 text-xs rounded-lg bg-white dark:bg-slate-900"
              />
            </div>
          </div>
        )}

        {/* Opening Balance */}
        <div>
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
            {tBilingual('Opening Balance (৳ BDT)', 'প্রারম্ভিক ব্যালেন্স (৳)')}
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">৳</span>
            <Input
              type="number"
              min="0"
              step="any"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0.00"
              className="h-9 pl-7 text-xs rounded-xl tabular-nums font-bold"
            />
          </div>
          <p className="text-3xs text-slate-400 mt-1">
            {tBilingual(
              'Initial money in this drawer or account when starting PrintERP.',
              'সফটওয়্যার চালুর সময় এই ড্রয়ার বা একাউন্টে থাকা বর্তমান নগদ টাকা।'
            )}
          </p>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs h-8 rounded-xl"
          >
            {tBilingual('Cancel', 'বাতিল')}
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 rounded-xl font-semibold shadow-xs"
          >
            {isSubmitting ? tBilingual('Saving...', 'সংরক্ষণ হচ্ছে...') : tBilingual('Create Account', 'অ্যাকাউন্ট তৈরি করুন')}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
