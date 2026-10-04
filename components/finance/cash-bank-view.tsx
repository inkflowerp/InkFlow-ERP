'use client'

import React, { useState, useMemo } from 'react'
import {
 Wallet,
 Building2,
 Smartphone,
 Plus,
 ArrowDownLeft,
 ArrowUpRight,
 ArrowLeftRight,
 Search,
 Filter,
 FileText,
 ShieldCheck,
 CheckCircle2,
 ExternalLink,
 ChevronRight,
 MoreVertical,
 Calendar,
 Download,
 CreditCard,
 Hash,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import { formatBDT } from '@/lib/formatters'
import type { AccountRecord, FinancialTransactionRecord } from '@/types/finance.types'
import { AccountStatementModal } from './modals/account-statement-modal'

export interface CashBankViewProps {
 accounts: AccountRecord[]
 transactions?: FinancialTransactionRecord[]
 onOpenAddAccount: () => void
 onOpenMoneyIn: (targetAccountId?: string) => void
 onOpenSpendModal: (sourceAccountId?: string) => void
 onOpenTransferModal: (fromAccountId?: string) => void
 isLoading?: boolean
}

export function CashBankView({
 accounts,
 transactions = [],
 onOpenAddAccount,
 onOpenMoneyIn,
 onOpenSpendModal,
 onOpenTransferModal,
 isLoading = false,
}: CashBankViewProps) {
 const { tBilingual } = useI18n()
 const [filterType, setFilterType] = useState<'ALL' | 'CASH' | 'BANK' | 'MFS'>('ALL')
 const [searchQuery, setSearchQuery] = useState('')
 const [selectedStatementAccount, setSelectedStatementAccount] = useState<AccountRecord | null>(null)

 const liquidAccounts = useMemo(() => {
 return accounts.filter((a) => {
 const isLiquid = a.account_subtype === 'CASH' || a.account_subtype === 'BANK' || a.account_subtype === 'MFS'
 if (!isLiquid) return false
      // Only show accounts that the tenant / business owner added
 if (a.is_system) return false
 const meta = a.metadata as any
 if (
 meta?.mfs_wallet_number === '01711000000' ||
 meta?.mfs_wallet_number === '01811000000' ||
 meta?.mfs_wallet_number === '01911000000' ||
 meta?.account_number_masked === '•••• •••• 4589' ||
 a.name?.includes('(Islami Bank)') ||
 a.name?.includes('(Main Drawer)')
      ) {
 return false
      }
 return true
    })
  }, [accounts])

  // Compute total balances by subtype
 const stats = useMemo(() => {
 let totalCash = 0
 let totalBank = 0
 let totalMfs = 0

 for (const a of liquidAccounts) {
 const bal = Number(a.current_balance || 0)
 if (a.account_subtype === 'CASH') totalCash += bal
 else if (a.account_subtype === 'BANK') totalBank += bal
 else if (a.account_subtype === 'MFS') totalMfs += bal
    }

 return {
 totalCash,
 totalBank,
 totalMfs,
 totalLiquid: totalCash + totalBank + totalMfs,
    }
  }, [liquidAccounts])

  // Calculate per-account inflows, outflows, and transfers from transactions
 const accountMetricsMap = useMemo(() => {
 const map = new Map<string, { received: number; paid: number; transfers: number }>()

 for (const a of liquidAccounts) {
 map.set(a.id, { received: 0, paid: 0, transfers: 0 })
    }

 for (const t of transactions) {
 for (const line of t.lines || []) {
 const metric = map.get(line.account_id)
 if (metric) {
 const debit = Number(line.debit || 0)
 const credit = Number(line.credit || 0)

 if (t.transaction_type === 'ACCOUNT_TRANSFER') {
 if (debit > 0) metric.transfers += debit
 if (credit > 0) metric.transfers -= credit
          } else {
 if (debit > 0) metric.received += debit
 if (credit > 0) metric.paid += credit
          }
        }
      }
    }

 return map
  }, [liquidAccounts, transactions])

  // Filter accounts
 const filteredAccounts = useMemo(() => {
 return liquidAccounts.filter((a) => {
 if (filterType !== 'ALL' && a.account_subtype !== filterType) return false
 if (!searchQuery.trim()) return true

 const q = searchQuery.toLowerCase()
 const matchName = a.name.toLowerCase().includes(q)
 const matchCode = a.code.toLowerCase().includes(q)
 const matchBank = a.metadata?.bank_name?.toLowerCase().includes(q) || false
 const matchWallet = a.metadata?.mfs_wallet_number?.toLowerCase().includes(q) || false
 return matchName || matchCode || matchBank || matchWallet
    })
  }, [liquidAccounts, filterType, searchQuery])

 return (
    <div className="space-y-6">
      {/* 1. TOP SUMMARY STRIP & ACTION BUTTONS */}
      <div className="p-5 rounded-xl bg-card shadow-xs border border-border flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="text-xs uppercase tracking-wider font-semibold">
              {tBilingual('Money in Hand', 'চলতি নগদ ও ব্যাংক তহবিল')}
            </Badge>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl sm:text-4xl font-black tabular-nums tracking-tight">
              ৳{stats.totalLiquid.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">
              ({liquidAccounts.length} {tBilingual('Active Accounts', 'টি সক্রিয় হিসাব')})
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {tBilingual(
              'Real money accounts across Cash in Hand, Bank Checking Accounts, and MFS Wallets.',
              'দোকানের ক্যাশ ড্রয়ার, ব্যাংক অ্যাকাউন্ট ও বিকাশ/নগদ মার্চেন্ট ওয়ালেটের বাস্তব হিসাব।'
            )}
          </p>
        </div>

        {/* Global Cash & Bank Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
 onClick={onOpenAddAccount}
 variant="outline"className="text-xs h-9 px-3.5 gap-1.5">
            <Plus className="w-4 h-4"/>
            <span>{tBilingual('Add Account', '+ নতুন হিসাব')}</span>
          </Button>

          <Button
 onClick={() => onOpenMoneyIn()}
 variant="success"className="text-xs h-9 px-3.5 gap-1.5">
            <ArrowDownLeft className="w-4 h-4"/>
            <span>{tBilingual('Money In', 'টাকা জমা')}</span>
          </Button>

          <Button
 onClick={() => onOpenSpendModal()}
 variant="destructive"className="text-xs h-9 px-3.5 gap-1.5">
            <ArrowUpRight className="w-4 h-4"/>
            <span>{tBilingual('Money Out', 'টাকা খরচ')}</span>
          </Button>

          <Button
 onClick={() => onOpenTransferModal()}
 variant="outline"className="text-xs h-9 px-3.5 gap-1.5">
            <ArrowLeftRight className="w-4 h-4"/>
            <span>{tBilingual('Transfer', 'ট্রান্সফার')}</span>
          </Button>
        </div>
      </div>

      {/* 2. SUBTYPE FILTER PILLS & SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 bg-muted p-1 rounded-xl w-fit">
          <button
 type="button"onClick={() => setFilterType('ALL')}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
 filterType === 'ALL'
                ? 'bg-card text-primary text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tBilingual('All Accounts', 'সকল হিসাব')} ({liquidAccounts.length})
          </button>

          <button
 type="button"onClick={() => setFilterType('CASH')}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
 filterType === 'CASH'
                ? 'bg-card text-success text-success shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-success"/>
            <span>{tBilingual('Cash Accounts', 'ক্যাশ ড্রয়ার')}</span>
          </button>

          <button
 type="button"onClick={() => setFilterType('BANK')}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
 filterType === 'BANK'
                ? 'bg-card text-primary text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-primary"/>
            <span>{tBilingual('Bank Accounts', 'ব্যাংক হিসাব')}</span>
          </button>

          <button
 type="button"onClick={() => setFilterType('MFS')}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
 filterType === 'MFS'
                ? 'bg-card text-pink-600 dark:text-pink-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-pink-500"/>
            <span>{tBilingual('bKash / Nagad / MFS', 'বিকাশ / নগদ')}</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
          <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder={tBilingual('Search account, bank or wallet...', 'হিসাব বা ওয়ালেট খুঁজুন...')}
 className="h-8.5 pl-8 text-xs rounded-xl bg-card"/>
        </div>
      </div>

      {/* 3. ACCOUNTS CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAccounts.map((account) => {
 const metrics = accountMetricsMap.get(account.id) || { received: 0, paid: 0, transfers: 0 }
 const isCash = account.account_subtype === 'CASH'
 const isBank = account.account_subtype === 'BANK'
 const isMfs = account.account_subtype === 'MFS'

 return (
            <Card
 key={account.id}
 className="rounded-xl border-border shadow-xs hover:shadow-xs transition-all overflow-hidden flex flex-col justify-between bg-card group">
              <div>
                {/* Card Header */}
                <div className="p-4 pb-3 border-b border-border /80 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
 className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
 isCash
                          ? 'bg-success-surface text-success bg-success-surface text-success'
                          : isBank
                          ? 'bg-primary/10 text-primary bg-primary/10 text-primary'
                          : 'bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400'
                      }`}
                    >
                      {isCash && <Wallet className="w-5 h-5"/>}
                      {isBank && <Building2 className="w-5 h-5"/>}
                      {isMfs && <Smartphone className="w-5 h-5"/>}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-foreground truncate">
                          {account.name}
                        </span>
                        {account.is_system && (
                          <Badge variant="outline"className="text-xs px-1 py-0 h-4">
 System
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {account.code} •{' '}
                        {account.metadata?.bank_name ||
 account.metadata?.mfs_provider?.toUpperCase() ||
 account.name_bn ||
                          'Money Account'}
                        {account.metadata?.account_number_masked ? ` (${account.metadata.account_number_masked})` : ''}
                        {account.metadata?.mfs_wallet_number ? ` (${account.metadata.mfs_wallet_number})` : ''}
                      </p>
                    </div>
                  </div>

                  <Badge
 variant="outline"className={`text-xs font-semibold uppercase ${
 isCash
                        ? 'border-success-border text-success text-success'
                        : isBank
                        ? 'border-primary/20 text-primary text-primary'
                        : 'border-pink-200 text-pink-700 dark:text-pink-400'
                    }`}
                  >
                    {account.account_subtype}
                  </Badge>
                </div>

                {/* Balance Display */}
                <div className="p-4 pt-3">
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {tBilingual('Current Balance', 'বর্তমান স্থিতি')}
                    </span>
                    <span className="text-xl sm:text-2xl font-black tabular-nums text-foreground">
                      ৳{Number(account.current_balance || 0).toLocaleString()}
                    </span>
                  </div>

                  {/* Account Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-muted dark:bg-muted/60 border border-border text-center">
                    <div>
                      <span className="text-xs text-muted-foreground block">{tBilingual('Opening', 'প্রারম্ভিক')}</span>
                      <span className="text-xs tabular-nums font-semibold text-foreground">
                        ৳{Number(account.opening_balance || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="border-x border-border">
                      <span className="text-xs text-success block">{tBilingual('Received', 'মোট জমা')}</span>
                      <span className="text-xs tabular-nums font-semibold text-success text-success">
                        +৳{metrics.received.toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-destructive block">{tBilingual('Paid', 'মোট খরচ')}</span>
                      <span className="text-xs tabular-nums font-semibold text-destructive text-destructive">
                        -৳{metrics.paid.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-3 pt-0 flex items-center justify-between gap-1.5 border-t border-border /80 mt-2">
                <Button
 size="sm"variant="ghost"onClick={() => setSelectedStatementAccount(account)}
 className="h-7 px-2 text-xs text-primary text-primary hover:bg-primary/10 dark:hover:bg-primary/10 rounded-lg font-semibold flex items-center gap-1">
                  <FileText className="w-3 h-3"/>
                  <span>{tBilingual('Statement', 'বিবরণী')}</span>
                </Button>

                <div className="flex items-center gap-1">
                  <Button
 size="sm"variant="outline"onClick={() => onOpenMoneyIn(account.id)}
 className="h-7 px-2 text-xs text-success border-success-border hover:bg-success-surface border-success-border rounded-lg font-semibold"title="Deposit into this account">
                    + In
                  </Button>

                  <Button
 size="sm"variant="outline"onClick={() => onOpenSpendModal(account.id)}
 className="h-7 px-2 text-xs text-destructive border-danger-border hover:bg-danger-surface border-danger-border rounded-lg font-semibold"title="Pay out from this account">
                    - Out
                  </Button>

                  <Button
 size="sm"variant="outline"onClick={() => onOpenTransferModal(account.id)}
 className="h-7 px-2 text-xs text-primary border-primary/20 hover:bg-primary/10 border-border rounded-lg font-semibold"title="Transfer from this account">
                    ⇄ Trf
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}

        {filteredAccounts.length === 0 && (
          <div className="col-span-full p-12 text-center text-muted-foreground">
            <Wallet className="w-10 h-10 text-muted-foreground mx-auto mb-3"/>
            <p className="text-xs font-semibold">
              {tBilingual('No matching money accounts found.', 'কোনো হিসাব পাওয়া যায়নি।')}
            </p>
            <Button
 size="sm"onClick={onOpenAddAccount}
 className="mt-3 bg-primary hover:bg-primary text-white text-xs h-8 rounded-xl font-semibold">
              {tBilingual('+ Create Money Account', '+ নতুন হিসাব তৈরি করুন')}
            </Button>
          </div>
        )}
      </div>

      {/* 4. STATEMENT MODAL */}
      {selectedStatementAccount && (
        <AccountStatementModal
 isOpen={Boolean(selectedStatementAccount)}
 onClose={() => setSelectedStatementAccount(null)}
 account={selectedStatementAccount}
 transactions={transactions}
        />
      )}
    </div>
  )
}
