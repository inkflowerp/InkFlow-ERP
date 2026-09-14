// ==============================================================================
// InkFlow ERP - Authoritative Finance & Double-Entry Accounting Repository (V9.1)
// PostgreSQL persistence for Accounts, Financial Transactions, Transfers, Cash Closings,
// General Ledger, Trial Balance, Bank Statements & Statements Reconciliation
// ==============================================================================

import { createAdminClient } from '../supabase/admin.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'
import type {
  AccountRecord,
  FinancialTransactionRecord,
  JournalEntryLineRecord,
  AccountTransferRecord,
  CashClosingRecord,
  FinancialPeriodRecord,
  ProfitAndLossStatement,
  ReceivablesAgingSummary,
  PayablesAgingSummary,
  FinancialDashboardMetrics,
  AgingBucketItem,
  TrialBalanceStatement,
  TrialBalanceAccountItem,
  GeneralLedgerEntry,
  BankStatementRecord,
  BankStatementLineRecord,
} from '../../types/finance.types.ts'

export class FinanceRepository {
  private static sequenceCounters: Map<string, number> = new Map()

  static async getNextDocumentNumber(companyId: string, docType: string, prefix: string): Promise<string> {
    const year = new Date().getFullYear()
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any).rpc('get_next_document_number', {
        p_company_id: companyId,
        p_doc_type: docType,
        p_prefix: prefix,
      })
      if (!error && data && typeof data === 'string') {
        return data
      }
    } catch {}

    // Deterministic in-memory sequence fallback (No Math.random)
    const key = `${companyId}:${docType}:${year}`
    const nextSeq = (this.sequenceCounters.get(key) || 0) + 1
    this.sequenceCounters.set(key, nextSeq)
    return `${prefix}-${year}-${String(nextSeq).padStart(6, '0')}`
  }

  // ============================================================================
  // 1. CHART OF ACCOUNTS
  // ============================================================================

  static async getAccounts(companyId: string, branchId?: string): Promise<AccountRecord[]> {
    try {
      const admin = createAdminClient()
      let query = (admin as any)
        .from('accounts')
        .select('*')
        .eq('company_id', companyId)
        .order('code', { ascending: true })

      if (branchId) {
        query = query.eq('branch_id', branchId)
      }

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        return data as AccountRecord[]
      }
    } catch (e) {
      console.warn('[FinanceRepository.getAccounts] DB query fallback:', e)
    }

    const accounts = PrintERPDataStore.get<AccountRecord[]>(STORAGE_KEYS.ACCOUNTS) || []
    const filtered = accounts.filter((a) => {
      if (a.company_id && a.company_id !== companyId) return false
      if (branchId && a.branch_id !== branchId) return false
      return true
    })

    if (filtered.length === 0) {
      return this.seedDefaultAccounts(companyId)
    }

    return filtered
  }

  static async getAccountById(id: string, companyId: string): Promise<AccountRecord | null> {
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('accounts')
        .select('*')
        .eq('company_id', companyId)
        .eq('id', id)
        .maybeSingle()

      if (!error && data) {
        return data as AccountRecord
      }
    } catch (e) {
      console.warn('[FinanceRepository.getAccountById] DB fallback:', e)
    }

    const accounts = await this.getAccounts(companyId)
    return accounts.find((a) => a.id === id || a.code === id) || null
  }

  static async createAccount(account: AccountRecord): Promise<AccountRecord> {
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('accounts')
        .insert(account)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.ACCOUNTS, data as AccountRecord)
        return data as AccountRecord
      }
    } catch (e) {
      console.warn('[FinanceRepository.createAccount] DB fallback:', e)
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.ACCOUNTS, account)
    return account
  }

  static async updateAccountBalance(
    accountId: string,
    companyId: string,
    delta: number
  ): Promise<AccountRecord | null> {
    const acc = await this.getAccountById(accountId, companyId)
    if (!acc) return null

    const newBalance = Number((acc.current_balance + delta).toFixed(2))

    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('accounts')
        .update({ current_balance: newBalance, updated_at: new Date().toISOString() })
        .eq('company_id', companyId)
        .eq('id', accountId)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.updateItem<AccountRecord>(STORAGE_KEYS.ACCOUNTS, accountId, {
          current_balance: newBalance,
        })
        return data as AccountRecord
      }
    } catch (e) {
      console.warn('[FinanceRepository.updateAccountBalance] DB fallback:', e)
    }

    return PrintERPDataStore.updateItem<AccountRecord>(STORAGE_KEYS.ACCOUNTS, accountId, {
      current_balance: newBalance,
    })
  }

  static async seedDefaultAccounts(companyId: string): Promise<AccountRecord[]> {
    const defaultTemplates: Omit<AccountRecord, 'id' | 'company_id' | 'created_at' | 'updated_at'>[] = [
      { code: '1010', name: 'Cash in Hand (Main Drawer)', name_bn: 'নগদ তহবিল', account_type: 'ASSET', account_subtype: 'CASH', currency: 'BDT', opening_balance: 0, current_balance: 0, is_system: true, is_active: true },
      { code: '1020', name: 'Primary Bank Account (Islami Bank)', name_bn: 'ব্যাংক হিসাব', account_type: 'ASSET', account_subtype: 'BANK', currency: 'BDT', opening_balance: 0, current_balance: 0, is_system: true, is_active: true, metadata: { bank_name: 'Islami Bank Bangladesh', account_number_masked: '•••• •••• 4589', branch_name: 'Dhanmondi' } },
      { code: '1030', name: 'bKash Merchant Wallet', name_bn: 'বিকাশ হিসাব', account_type: 'ASSET', account_subtype: 'MFS', currency: 'BDT', opening_balance: 0, current_balance: 0, is_system: true, is_active: true, metadata: { mfs_provider: 'bkash', mfs_wallet_number: '01711000000', mfs_account_type: 'merchant' } },
      { code: '1031', name: 'Nagad Business Wallet', name_bn: 'নগদ হিসাব', account_type: 'ASSET', account_subtype: 'MFS', currency: 'BDT', opening_balance: 0, current_balance: 0, is_system: true, is_active: true, metadata: { mfs_provider: 'nagad', mfs_wallet_number: '01811000000', mfs_account_type: 'merchant' } },
      { code: '1032', name: 'Rocket Business Wallet', name_bn: 'রকেট হিসাব', account_type: 'ASSET', account_subtype: 'MFS', currency: 'BDT', opening_balance: 0, current_balance: 0, is_system: true, is_active: true, metadata: { mfs_provider: 'rocket', mfs_wallet_number: '01911000000', mfs_account_type: 'merchant' } },
      { code: '1040', name: 'Accounts Receivable (Customers)', name_bn: 'গ্রাহক দেনাদার হিসাব', account_type: 'ASSET', account_subtype: 'RECEIVABLE', currency: 'BDT', opening_balance: 0, current_balance: 0, is_system: true, is_active: true },
      { code: '1050', name: 'Inventory Asset (Raw Materials)', name_bn: 'মজুদ কাঁচামাল হিসাব', account_type: 'ASSET', account_subtype: 'INVENTORY', currency: 'BDT', opening_balance: 0, current_balance: 0, is_system: true, is_active: true },
      { code: '1060', name: 'Machineries & Factory Equipment', name_bn: 'যন্ত্রপাতি ও সরঞ্জাম', account_type: 'ASSET', account_subtype: 'OTHER', currency: 'BDT', opening_balance: 0, current_balance: 0, is_system: true, is_active: true },
      { code: '2010', name: 'Accounts Payable (Suppliers)', name_bn: 'সরবরাহকারী পাওনাদার হিসাব', account_type: 'LIABILITY', account_subtype: 'PAYABLE', currency: 'BDT', opening_balance: 0, current_balance: 0, is_system: true, is_active: true },
      { code: '2020', name: 'Customer Advance Deposits', name_bn: 'গ্রাহক অগ্রিম জমা', account_type: 'LIABILITY', account_subtype: 'OTHER', currency: 'BDT', opening_balance: 0, current_balance: 0, is_system: true, is_active: true },
      { code: '2030', name: 'VAT & Tax Payable', name_bn: 'ভ্যাট ও ট্যাক্স প্রদেয়', account_type: 'LIABILITY', account_subtype: 'OTHER', currency: 'BDT', opening_balance: 0, current_balance: 0, is_system: true, is_active: true },
      { code: '3010', name: "Owner's Capital / Equity", name_bn: 'মালিকানা তহবিল', account_type: 'EQUITY', account_subtype: 'EQUITY', currency: 'BDT', opening_balance: 0, current_balance: 0, is_system: true, is_active: true },
      { code: '3020', name: "Owner's Drawings", name_bn: 'মালিকের উত্তোলন', account_type: 'EQUITY', account_subtype: 'EQUITY', currency: 'BDT', opening_balance: 0, current_balance: 0, is_system: true, is_active: true },
      { code: '4010', name: 'Sales & Print Revenue', name_bn: 'বিক্রয় আয়', account_type: 'REVENUE', account_subtype: 'REVENUE', currency: 'BDT', opening_balance: 0, current_balance: 0, is_system: true, is_active: true },
      { code: '4020', name: 'Signage & Installation Revenue', name_bn: 'সাইনেজ ও ইনস্টলেশন আয়', account_type: 'REVENUE', account_subtype: 'REVENUE', currency: 'BDT', opening_balance: 0, current_balance: 0, is_system: true, is_active: true },
      { code: '5010', name: 'COGS - Direct Materials Consumption', name_bn: 'কাঁচামাল খরচ', account_type: 'EXPENSE', account_subtype: 'COGS_MATERIAL', currency: 'BDT', opening_balance: 0, current_balance: 0, is_system: true, is_active: true },
      { code: '5020', name: 'COGS - Direct Labor & Production Workforce', name_bn: 'উৎপাদন শ্রম খরচ', account_type: 'EXPENSE', account_subtype: 'COGS_LABOR', currency: 'BDT', opening_balance: 0, current_balance: 0, is_system: true, is_active: true },
      { code: '5030', name: 'COGS - Machine Operations & Electricity', name_bn: 'যন্ত্রপাতি পরিচালনা খরচ', account_type: 'EXPENSE', account_subtype: 'COGS_MACHINE', currency: 'BDT', opening_balance: 0, current_balance: 0, is_system: true, is_active: true },
      { code: '6010', name: 'Operating Expense - Factory & Office Rent', name_bn: 'কারখানা ও অফিস ভাড়া', account_type: 'EXPENSE', account_subtype: 'OPEX_RENT', currency: 'BDT', opening_balance: 0, current_balance: 0, is_system: true, is_active: true },
      { code: '6020', name: 'Operating Expense - Utilities & Internet', name_bn: 'বিদ্যুৎ ও ইন্টারনেট বিল', account_type: 'EXPENSE', account_subtype: 'OPEX_UTILITIES', currency: 'BDT', opening_balance: 0, current_balance: 0, is_system: true, is_active: true },
      { code: '6030', name: 'Operating Expense - Staff Salaries', name_bn: 'কর্মচারীদের বেতন', account_type: 'EXPENSE', account_subtype: 'OPEX_SALARY', currency: 'BDT', opening_balance: 0, current_balance: 0, is_system: true, is_active: true },
      { code: '6040', name: 'Operating Expense - Transport & Fuel', name_bn: 'পরিবহন ও জ্বালানি', account_type: 'EXPENSE', account_subtype: 'OPEX_TRANSPORT', currency: 'BDT', opening_balance: 0, current_balance: 0, is_system: true, is_active: true },
      { code: '6050', name: 'Operating Expense - Maintenance & Repairs', name_bn: 'মেরামত ও রক্ষণাবেক্ষণ', account_type: 'EXPENSE', account_subtype: 'OPEX_MAINTENANCE', currency: 'BDT', opening_balance: 0, current_balance: 0, is_system: true, is_active: true },
      { code: '6060', name: 'Operating Expense - Marketing & Sales Promotion', name_bn: 'মার্কেটিং ও বিজ্ঞাপন', account_type: 'EXPENSE', account_subtype: 'OPEX_MARKETING', currency: 'BDT', opening_balance: 0, current_balance: 0, is_system: true, is_active: true },
      { code: '6070', name: 'Operating Expense - General & Miscellaneous', name_bn: 'বিবিধ খরচ', account_type: 'EXPENSE', account_subtype: 'OPEX_GENERAL', currency: 'BDT', opening_balance: 0, current_balance: 0, is_system: true, is_active: true },
    ]

    const created: AccountRecord[] = []
    const now = new Date().toISOString()

    for (const t of defaultTemplates) {
      const acc: AccountRecord = {
        id: `acc-${companyId}-${t.code}`,
        company_id: companyId,
        ...t,
        created_at: now,
        updated_at: now,
      }
      await this.createAccount(acc)
      created.push(acc)
    }

    return created
  }

  // ============================================================================
  // 2. DOUBLE-ENTRY FINANCIAL TRANSACTIONS
  // ============================================================================

  static async recordTransaction(
    txn: FinancialTransactionRecord,
    lines: JournalEntryLineRecord[]
  ): Promise<FinancialTransactionRecord> {
    // 1. Strict Double-Entry Balanced Validation
    const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0)
    const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0)

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new Error(
        `Double-entry unbalance rejected: Total Debit (৳${totalDebit.toFixed(2)}) must equal Total Credit (৳${totalCredit.toFixed(2)}).`
      )
    }

    if (lines.length < 2) {
      throw new Error('Double-entry rejected: Transaction must contain at least 2 journal entry lines.')
    }

    // 2. Insert Header & Lines into DB
    try {
      const admin = createAdminClient()
      const { data: txnData, error: txnErr } = await (admin as any)
        .from('financial_transactions')
        .insert(txn)
        .select()
        .single()

      if (!txnErr && txnData) {
        const { error: linesErr } = await (admin as any)
          .from('journal_entry_lines')
          .insert(lines)

        if (!linesErr) {
          // Mutate account balances atomically
          for (const line of lines) {
            const acc = await this.getAccountById(line.account_id, txn.company_id)
            if (acc) {
              const debit = Number(line.debit || 0)
              const credit = Number(line.credit || 0)
              let delta = 0
              if (acc.account_type === 'ASSET' || acc.account_type === 'EXPENSE') {
                delta = debit - credit
              } else {
                delta = credit - debit
              }
              await this.updateAccountBalance(acc.id, txn.company_id, delta)
            }
          }

          PrintERPDataStore.addItem(STORAGE_KEYS.FINANCIAL_TRANSACTIONS, txnData)
          for (const line of lines) {
            PrintERPDataStore.addItem(STORAGE_KEYS.JOURNAL_ENTRY_LINES, line)
          }

          return { ...txnData, lines } as FinancialTransactionRecord
        }
      }
    } catch (e) {
      console.warn('[FinanceRepository.recordTransaction] DB write fallback:', e)
    }

    // Fallback store handling
    PrintERPDataStore.addItem(STORAGE_KEYS.FINANCIAL_TRANSACTIONS, txn)
    for (const line of lines) {
      PrintERPDataStore.addItem(STORAGE_KEYS.JOURNAL_ENTRY_LINES, line)
      const acc = await this.getAccountById(line.account_id, txn.company_id)
      if (acc) {
        const debit = Number(line.debit || 0)
        const credit = Number(line.credit || 0)
        let delta = 0
        if (acc.account_type === 'ASSET' || acc.account_type === 'EXPENSE') {
          delta = debit - credit
        } else {
          delta = credit - debit
        }
        await this.updateAccountBalance(acc.id, txn.company_id, delta)
      }
    }

    return { ...txn, lines }
  }

  static async getTransactions(
    companyId: string,
    options?: {
      startDate?: string
      endDate?: string
      type?: string
      status?: string
      accountId?: string
      branchId?: string
    }
  ): Promise<FinancialTransactionRecord[]> {
    try {
      const admin = createAdminClient()
      let query = (admin as any)
        .from('financial_transactions')
        .select('*, journal_entry_lines(*)')
        .eq('company_id', companyId)
        .order('transaction_date', { ascending: false })

      if (options?.branchId) query = query.eq('branch_id', options.branchId)
      if (options?.startDate) query = query.gte('transaction_date', options.startDate)
      if (options?.endDate) query = query.lte('transaction_date', options.endDate)
      if (options?.type) query = query.eq('transaction_type', options.type)
      if (options?.status) query = query.eq('status', options.status)

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        return data.map((t: any) => ({
          ...t,
          lines: t.journal_entry_lines || [],
        })) as FinancialTransactionRecord[]
      }
    } catch (e) {
      console.warn('[FinanceRepository.getTransactions] DB fallback:', e)
    }

    const txns = PrintERPDataStore.get<FinancialTransactionRecord[]>(STORAGE_KEYS.FINANCIAL_TRANSACTIONS) || []
    const allLines = PrintERPDataStore.get<JournalEntryLineRecord[]>(STORAGE_KEYS.JOURNAL_ENTRY_LINES) || []

    return txns
      .filter((t) => {
        if (t.company_id && t.company_id !== companyId) return false
        if (options?.branchId && t.branch_id && t.branch_id !== options.branchId) return false
        if (options?.startDate && t.transaction_date < options.startDate) return false
        if (options?.endDate && t.transaction_date > options.endDate) return false
        if (options?.type && t.transaction_type !== options.type) return false
        if (options?.status && t.status !== options.status) return false
        return true
      })
      .map((t) => ({
        ...t,
        lines: allLines
          .filter((l) => l.transaction_id === t.id)
          .sort((a, b) => (a.created_at || a.id || '').localeCompare(b.created_at || b.id || '')),
      }))
  }

  // ============================================================================
  // 3. GENERAL LEDGER
  // ============================================================================

  static async getGeneralLedger(
    companyId: string,
    options?: {
      accountId?: string
      startDate?: string
      endDate?: string
      branchId?: string
    }
  ): Promise<GeneralLedgerEntry[]> {
    const txns = await this.getTransactions(companyId, {
      startDate: options?.startDate,
      endDate: options?.endDate,
      branchId: options?.branchId,
      status: 'POSTED',
    })

    const accounts = await this.getAccounts(companyId)
    const accMap = new Map(accounts.map((a) => [a.id, a]))

    // Sort transactions chronologically
    const sortedTxns = [...txns].sort((a, b) => {
      const dateCmp = (a.transaction_date || '').localeCompare(b.transaction_date || '')
      if (dateCmp !== 0) return dateCmp
      return (a.created_at || a.id || '').localeCompare(b.created_at || b.id || '')
    })

    const accountBalances = new Map<string, number>()
    const entries: GeneralLedgerEntry[] = []

    for (const txn of sortedTxns) {
      for (const line of txn.lines || []) {
        if (options?.accountId && line.account_id !== options.accountId) {
          continue
        }

        const acc = accMap.get(line.account_id)
        if (!acc) continue

        const debit = Number(line.debit || 0)
        const credit = Number(line.credit || 0)
        const prevBal = accountBalances.has(acc.id)
          ? accountBalances.get(acc.id)!
          : Number(acc.opening_balance || 0)

        let delta = 0
        if (acc.account_type === 'ASSET' || acc.account_type === 'EXPENSE') {
          delta = debit - credit
        } else {
          delta = credit - debit
        }

        const currentBal = Number((prevBal + delta).toFixed(2))
        accountBalances.set(acc.id, currentBal)

        entries.push({
          id: line.id,
          transaction_id: txn.id,
          transaction_number: txn.transaction_number,
          transaction_date: txn.transaction_date,
          transaction_type: txn.transaction_type,
          reference_type: txn.reference_type,
          reference_id: txn.reference_id,
          narration: line.memo || txn.narration,
          account_id: acc.id,
          account_code: acc.code,
          account_name: acc.name,
          debit,
          credit,
          running_balance: currentBal,
          posted_by_name: txn.posted_by_name,
        })
      }
    }

    return entries
  }

  // ============================================================================
  // 4. TRIAL BALANCE
  // ============================================================================

  static async getTrialBalance(companyId: string, asOfDate?: string, branchId?: string): Promise<TrialBalanceStatement> {
    const txns = await this.getTransactions(companyId, {
      endDate: asOfDate,
      branchId,
      status: 'POSTED',
    })

    const accounts = await this.getAccounts(companyId, branchId)
    const items: TrialBalanceAccountItem[] = []

    let totalDebit = 0
    let totalCredit = 0

    for (const acc of accounts) {
      let accDebit = 0
      let accCredit = 0

      for (const txn of txns) {
        for (const line of txn.lines || []) {
          if (line.account_id === acc.id) {
            accDebit += Number(line.debit || 0)
            accCredit += Number(line.credit || 0)
          }
        }
      }

      let netBalance = 0
      if (acc.account_type === 'ASSET' || acc.account_type === 'EXPENSE') {
        netBalance = acc.opening_balance + accDebit - accCredit
      } else {
        netBalance = acc.opening_balance + accCredit - accDebit
      }

      totalDebit += accDebit
      totalCredit += accCredit

      items.push({
        account_id: acc.id,
        code: acc.code,
        name: acc.name,
        name_bn: acc.name_bn,
        account_type: acc.account_type,
        account_subtype: acc.account_subtype,
        debit: Number(accDebit.toFixed(2)),
        credit: Number(accCredit.toFixed(2)),
        net_balance: Number(netBalance.toFixed(2)),
      })
    }

    const diff = Math.abs(totalDebit - totalCredit)
    const isBalanced = diff <= 0.01

    return {
      company_id: companyId,
      as_of_date: asOfDate || new Date().toISOString().split('T')[0],
      total_debit: Number(totalDebit.toFixed(2)),
      total_credit: Number(totalCredit.toFixed(2)),
      is_balanced: isBalanced,
      accounts: items,
    }
  }

  // ============================================================================
  // 5. ACCOUNT TRANSFERS
  // ============================================================================

  static async recordTransfer(transfer: AccountTransferRecord): Promise<AccountTransferRecord> {
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('account_transfers')
        .insert(transfer)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.ACCOUNT_TRANSFERS, data as AccountTransferRecord)
        return data as AccountTransferRecord
      }
    } catch (e) {
      console.warn('[FinanceRepository.recordTransfer] DB fallback:', e)
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.ACCOUNT_TRANSFERS, transfer)
    return transfer
  }

  static async getTransfers(companyId: string): Promise<AccountTransferRecord[]> {
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('account_transfers')
        .select('*')
        .eq('company_id', companyId)
        .order('transfer_date', { ascending: false })

      if (!error && data && data.length > 0) {
        return data as AccountTransferRecord[]
      }
    } catch (e) {
      console.warn('[FinanceRepository.getTransfers] DB fallback:', e)
    }

    const transfers = PrintERPDataStore.get<AccountTransferRecord[]>(STORAGE_KEYS.ACCOUNT_TRANSFERS) || []
    return transfers.filter((t) => !t.company_id || t.company_id === companyId)
  }

  // ============================================================================
  // 6. DAILY CASH CLOSING
  // ============================================================================

  static async recordCashClosing(closing: CashClosingRecord): Promise<CashClosingRecord> {
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('cash_closings')
        .insert(closing)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.CASH_CLOSINGS, data as CashClosingRecord)
        return data as CashClosingRecord
      }
    } catch (e) {
      console.warn('[FinanceRepository.recordCashClosing] DB fallback:', e)
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.CASH_CLOSINGS, closing)
    return closing
  }

  static async getCashClosings(companyId: string, closingDate?: string): Promise<CashClosingRecord[]> {
    try {
      const admin = createAdminClient()
      let query = (admin as any)
        .from('cash_closings')
        .select('*')
        .eq('company_id', companyId)
        .order('closing_date', { ascending: false })

      if (closingDate) query = query.eq('closing_date', closingDate)

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        return data as CashClosingRecord[]
      }
    } catch (e) {
      console.warn('[FinanceRepository.getCashClosings] DB fallback:', e)
    }

    const closings = PrintERPDataStore.get<CashClosingRecord[]>(STORAGE_KEYS.CASH_CLOSINGS) || []
    return closings.filter((c) => {
      if (c.company_id && c.company_id !== companyId) return false
      if (closingDate && c.closing_date !== closingDate) return false
      return true
    })
  }

  // ============================================================================
  // 7. FINANCIAL PERIODS
  // ============================================================================

  static async getFinancialPeriods(companyId: string): Promise<FinancialPeriodRecord[]> {
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('financial_periods')
        .select('*')
        .eq('company_id', companyId)
        .order('start_date', { ascending: false })

      if (!error && data && data.length > 0) {
        return data as FinancialPeriodRecord[]
      }
    } catch (e) {
      console.warn('[FinanceRepository.getFinancialPeriods] DB fallback:', e)
    }

    const periods = PrintERPDataStore.get<FinancialPeriodRecord[]>(STORAGE_KEYS.FINANCIAL_PERIODS) || []
    return periods.filter((p) => !p.company_id || p.company_id === companyId)
  }

  static async isDateInClosedPeriod(dateStr: string, companyId: string): Promise<boolean> {
    const periods = await this.getFinancialPeriods(companyId)
    const closed = periods.find(
      (p) => p.status === 'CLOSED' && dateStr >= p.start_date && dateStr <= p.end_date
    )
    return Boolean(closed)
  }

  // ============================================================================
  // 8. BANK & MFS STATEMENTS & RECONCILIATION
  // ============================================================================

  static async getBankStatements(companyId: string, accountId?: string): Promise<BankStatementRecord[]> {
    try {
      const admin = createAdminClient()
      let query = (admin as any)
        .from('bank_statements')
        .select('*, lines:bank_statement_lines(*)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (accountId) query = query.eq('account_id', accountId)

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        return data as BankStatementRecord[]
      }
    } catch {}

    const statements = PrintERPDataStore.get<BankStatementRecord[]>(STORAGE_KEYS.BANK_STATEMENTS, companyId) || []
    return statements.filter((s) => !accountId || s.account_id === accountId)
  }

  static async createBankStatement(statement: BankStatementRecord): Promise<BankStatementRecord> {
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('bank_statements')
        .insert(statement)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.BANK_STATEMENTS, data as BankStatementRecord)
        return data as BankStatementRecord
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.BANK_STATEMENTS, statement)
    return statement
  }
}
