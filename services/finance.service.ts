// ==============================================================================
// InkFlow ERP - Authoritative Finance 360 Service (V9.1)
// Double-entry accounting, General Ledger authority, Receivables & Payables reconciliation,
// Cash Closings, Transfers, Profit & Loss, Balance Sheet, Cash Flow, Trial Balance,
// Job Profitability, Branch Profitability, Bank Reconciliation
// ==============================================================================

import { FinanceRepository } from '../lib/repositories/finance.repository.ts'
import { BillingRepository } from '../lib/repositories/billing.repository.ts'
import { SupplierRepository } from '../lib/repositories/supplier.repository.ts'
import { CostingRepository } from '../lib/repositories/costing.repository.ts'
import { BranchAnalyticsRepository } from '../lib/repositories/branch-analytics.repository.ts'
import { WorkforceRepository } from '../lib/repositories/workforce.repository.ts'
import type { ExpenseCategory } from '../types/accounting.types.ts'
import type {
  AccountRecord,
  FinancialTransactionRecord,
  JournalEntryLineRecord,
  AccountTransferRecord,
  CashClosingRecord,
  ProfitAndLossStatement,
  BalanceSheetStatement,
  BalanceSheetAccountCategory,
  CashFlowStatement,
  TrialBalanceStatement,
  GeneralLedgerEntry,
  ReceivablesAgingSummary,
  PayablesAgingSummary,
  FinancialDashboardMetrics,
  AgingBucketItem,
  BankStatementRecord,
  BankReconciliationSummary,
  JobProfitabilityMetric,
  BranchProfitabilityMetric,
  ExpenseItemRecord,
  ExpenseSummaryReport,
} from '../types/finance.types.ts'

export const EXPENSE_CATEGORY_DEFINITIONS: Record<
  string,
  { labelEn: string; labelBn: string; defaultCode: string; icon: string; accountSubtype?: string }
> = {
  staff_salary: { labelEn: 'Staff Salary', labelBn: 'মাসিক স্টাফ বেতন', defaultCode: '6030', accountSubtype: 'OPEX_SALARY', icon: '👨‍💼' },
  salary_advance: { labelEn: 'Salary Advance', labelBn: 'স্টাফ বেতন অগ্রিম', defaultCode: '6030', accountSubtype: 'OPEX_SALARY', icon: '💸' },
  daily_labor: { labelEn: 'Daily Labor & Wages', labelBn: 'দৈনিক মজুরি ও ওভারটাইম', defaultCode: '5020', accountSubtype: 'COGS_LABOR', icon: '👷' },
  factory_rent: { labelEn: 'Factory & Shop Rent', labelBn: 'কারখানা ও দোকান ভাড়া', defaultCode: '6010', accountSubtype: 'OPEX_RENT', icon: '🏢' },
  electricity_utility: { labelEn: 'Electricity & Utilities', labelBn: 'বিদ্যুৎ ও ইউটিলিটি বিল', defaultCode: '6020', accountSubtype: 'OPEX_UTILITIES', icon: '⚡' },
  machine_maintenance: { labelEn: 'Machine Repair & Parts', labelBn: 'মেশিন মেরামত ও পার্টস', defaultCode: '6050', accountSubtype: 'OPEX_MAINTENANCE', icon: '🔧' },
  raw_materials: { labelEn: 'Raw Materials & Ink', labelBn: 'খুচরা কাঁচামাল ও কালি', defaultCode: '5010', accountSubtype: 'COGS_MATERIAL', icon: '📦' },
  transport_fuel: { labelEn: 'Transport, Courier & Fuel', labelBn: 'পরিবহন ও জ্বালানি', defaultCode: '6040', accountSubtype: 'OPEX_TRANSPORT', icon: '🚚' },
  tea_snacks: { labelEn: 'Tea, Snacks & Entertainment', labelBn: 'চা, নাস্তা ও আপ্যায়ন', defaultCode: '6070', accountSubtype: 'OPEX_GENERAL', icon: '☕' },
  office_stationery: { labelEn: 'Office Stationery & Paper', labelBn: 'স্টেশনারি ও কাগজ', defaultCode: '6070', accountSubtype: 'OPEX_GENERAL', icon: '📝' },
  marketing_promo: { labelEn: 'Marketing & Promotion', labelBn: 'মার্কেটিং ও বিজ্ঞাপন', defaultCode: '6060', accountSubtype: 'OPEX_MARKETING', icon: '📢' },
  govt_tax_fees: { labelEn: 'Govt Tax & Trade License', labelBn: 'ট্যাক্স ও লাইসেন্স ফি', defaultCode: '6070', accountSubtype: 'OPEX_GENERAL', icon: '🏛️' },
  miscellaneous: { labelEn: 'General / Miscellaneous', labelBn: 'অন্যান্য বিবিধ খরচ', defaultCode: '6070', accountSubtype: 'OPEX_GENERAL', icon: '📂' },
  // Legacy aliases
  salary: { labelEn: 'Staff Salary', labelBn: 'স্টাফ বেতন', defaultCode: '6030', accountSubtype: 'OPEX_SALARY', icon: '👨‍💼' },
  labor: { labelEn: 'Daily Labor', labelBn: 'শ্রমিক মজুরি', defaultCode: '5020', accountSubtype: 'COGS_LABOR', icon: '👷' },
  rent: { labelEn: 'Factory Rent', labelBn: 'কারখানা ভাড়া', defaultCode: '6010', accountSubtype: 'OPEX_RENT', icon: '🏢' },
  electricity: { labelEn: 'Electricity Bill', labelBn: 'বিদ্যুৎ বিল', defaultCode: '6020', accountSubtype: 'OPEX_UTILITIES', icon: '⚡' },
  fuel: { labelEn: 'Fuel / Diesel', labelBn: 'জ্বালানি / ডিজেল', defaultCode: '6040', accountSubtype: 'OPEX_TRANSPORT', icon: '⛽' },
  transport: { labelEn: 'Transport / Fare', labelBn: 'ভাড়া ও যাতায়াত', defaultCode: '6040', accountSubtype: 'OPEX_TRANSPORT', icon: '🚗' },
  maintenance: { labelEn: 'Machine Repair', labelBn: 'মেরামত ও পার্টস', defaultCode: '6050', accountSubtype: 'OPEX_MAINTENANCE', icon: '🔧' },
  office: { labelEn: 'Office Stationary', labelBn: 'স্টেশনারি ও কাগজ', defaultCode: '6070', accountSubtype: 'OPEX_GENERAL', icon: '📝' },
  marketing: { labelEn: 'Marketing & Ads', labelBn: 'মার্কেটিং', defaultCode: '6060', accountSubtype: 'OPEX_MARKETING', icon: '📢' },
  materials: { labelEn: 'Raw Materials', labelBn: 'কাঁচামাল', defaultCode: '5010', accountSubtype: 'COGS_MATERIAL', icon: '📦' },
  other: { labelEn: 'Other Expense', labelBn: 'বিবিধ খরচ', defaultCode: '6070', accountSubtype: 'OPEX_GENERAL', icon: '📂' },
}

export class FinanceService {
  // ============================================================================
  // 1. CHART OF ACCOUNTS
  // ============================================================================

  static async getAccounts(companyId: string, branchId?: string): Promise<AccountRecord[]> {
    return FinanceRepository.getAccounts(companyId, branchId)
  }

  static async getAccountById(id: string, companyId: string): Promise<AccountRecord | null> {
    return FinanceRepository.getAccountById(id, companyId)
  }

  static async createAccount(input: Partial<AccountRecord> & { company_id: string; code: string; name: string; account_type: any; account_subtype: any }): Promise<AccountRecord> {
    const now = new Date().toISOString()
    const account: AccountRecord = {
      id: input.id || `acc-${input.company_id}-${input.code}`,
      company_id: input.company_id,
      branch_id: input.branch_id || null,
      code: input.code,
      name: input.name,
      name_bn: input.name_bn || null,
      account_type: input.account_type,
      account_subtype: input.account_subtype,
      currency: input.currency || 'BDT',
      opening_balance: Number(input.opening_balance || 0),
      current_balance: Number(input.opening_balance || 0),
      is_system: Boolean(input.is_system),
      is_active: input.is_active !== undefined ? input.is_active : true,
      metadata: input.metadata || null,
      created_at: now,
      updated_at: now,
    }

    return FinanceRepository.createAccount(account)
  }

  // ============================================================================
  // 2. CUSTOMER PAYMENTS & RECEIVABLES RECONCILIATION
  // ============================================================================

  static async recordCustomerPayment(params: {
    companyId: string
    branchId?: string | null
    invoiceId?: string | null
    customerId: string
    customerName: string
    paymentAccountId: string
    amount: number
    paymentDate?: string
    paymentMethod: string
    referenceNumber?: string | null
    notes?: string | null
    actorName?: string
  }): Promise<{ transaction: FinancialTransactionRecord; invoiceUpdated?: boolean }> {
    if (params.amount <= 0) {
      throw new Error('Payment amount must be greater than 0.')
    }

    const accounts = await FinanceRepository.getAccounts(params.companyId)
    const paymentAccount = accounts.find((a) => a.id === params.paymentAccountId)
    if (!paymentAccount) {
      throw new Error(`Payment account (${params.paymentAccountId}) not found.`)
    }

    const arAccount = accounts.find((a) => a.code === '1040' || a.account_subtype === 'RECEIVABLE')
    if (!arAccount) {
      throw new Error('Accounts Receivable (1040) account not configured in Chart of Accounts.')
    }

    let invoiceUpdated = false
    if (params.invoiceId) {
      const invoice = await BillingRepository.getInvoiceById(params.invoiceId, params.companyId)
      if (invoice) {
        if (params.amount > invoice.due_amount + 0.01) {
          throw new Error(
            `Overpayment rejected: Payment amount (৳${params.amount.toFixed(2)}) exceeds invoice due amount (৳${invoice.due_amount.toFixed(2)}).`
          )
        }

        const updatedPaid = Number((invoice.paid_amount + params.amount).toFixed(2))
        const updatedDue = Math.max(0, Number((invoice.grand_total - updatedPaid).toFixed(2)))
        const updatedStatus = updatedDue <= 0.01 ? 'paid' : 'partially_paid'

        await BillingRepository.updateInvoice(invoice.id, params.companyId, {
          paid_amount: updatedPaid,
          due_amount: updatedDue,
          status: updatedStatus,
        })
        invoiceUpdated = true
      }
    }

    const txnNumber = await FinanceRepository.getNextDocumentNumber(params.companyId, 'PAYMENT', 'PAY')
    const txnId = `txn-${Date.now()}-${txnNumber}`
    const now = new Date().toISOString()
    const pDate = params.paymentDate || now.split('T')[0]

    const header: FinancialTransactionRecord = {
      id: txnId,
      company_id: params.companyId,
      branch_id: params.branchId || null,
      transaction_number: txnNumber,
      transaction_date: pDate,
      transaction_type: 'CUSTOMER_PAYMENT',
      status: 'POSTED',
      total_amount: params.amount,
      reference_type: 'INVOICE',
      reference_id: params.invoiceId || params.referenceNumber || null,
      narration: `Customer payment received from ${params.customerName} via ${paymentAccount.name}`,
      posted_by_name: params.actorName || 'Accounts Officer',
      posted_at: now,
      metadata: { customerId: params.customerId, paymentMethod: params.paymentMethod },
      created_at: now,
      updated_at: now,
    }

    const lines: JournalEntryLineRecord[] = [
      {
        id: `jel-${Date.now()}-1`,
        transaction_id: txnId,
        company_id: params.companyId,
        account_id: paymentAccount.id,
        account_code: paymentAccount.code,
        account_name: paymentAccount.name,
        debit: params.amount,
        credit: 0,
        memo: `Cash/Bank/MFS inflow from ${params.customerName}`,
        created_at: now,
      },
      {
        id: `jel-${Date.now()}-2`,
        transaction_id: txnId,
        company_id: params.companyId,
        account_id: arAccount.id,
        account_code: arAccount.code,
        account_name: arAccount.name,
        debit: 0,
        credit: params.amount,
        memo: `Reduction of accounts receivable for ${params.customerName}`,
        created_at: now,
      },
    ]

    const transaction = await FinanceRepository.recordTransaction(header, lines)
    return { transaction, invoiceUpdated }
  }

  // ============================================================================
  // 3. SUPPLIER PAYMENTS & PAYABLES RECONCILIATION
  // ============================================================================

  static async recordSupplierPayment(params: {
    companyId: string
    branchId?: string | null
    supplierId: string
    supplierName: string
    paymentAccountId: string
    amount: number
    paymentDate?: string
    referenceNumber?: string | null
    notes?: string | null
    actorName?: string
  }): Promise<FinancialTransactionRecord> {
    if (params.amount <= 0) {
      throw new Error('Supplier payment amount must be greater than 0.')
    }

    const accounts = await FinanceRepository.getAccounts(params.companyId)
    const paymentAccount = accounts.find((a) => a.id === params.paymentAccountId)
    if (!paymentAccount) {
      throw new Error(`Payment account (${params.paymentAccountId}) not found.`)
    }

    const apAccount = accounts.find((a) => a.code === '2010' || a.account_subtype === 'PAYABLE')
    if (!apAccount) {
      throw new Error('Accounts Payable (2010) account not configured in Chart of Accounts.')
    }

    const txnNumber = await FinanceRepository.getNextDocumentNumber(params.companyId, 'SUPPLIER_PAYMENT', 'BILL-PAY')
    const txnId = `txn-${Date.now()}-${txnNumber}`
    const now = new Date().toISOString()
    const pDate = params.paymentDate || now.split('T')[0]

    const header: FinancialTransactionRecord = {
      id: txnId,
      company_id: params.companyId,
      branch_id: params.branchId || null,
      transaction_number: txnNumber,
      transaction_date: pDate,
      transaction_type: 'SUPPLIER_PAYMENT',
      status: 'POSTED',
      total_amount: params.amount,
      reference_type: 'PURCHASE_ORDER',
      reference_id: params.referenceNumber || null,
      narration: `Supplier payment made to ${params.supplierName} from ${paymentAccount.name}`,
      posted_by_name: params.actorName || 'Procurement Manager',
      posted_at: now,
      metadata: { supplierId: params.supplierId },
      created_at: now,
      updated_at: now,
    }

    const lines: JournalEntryLineRecord[] = [
      {
        id: `jel-${Date.now()}-1`,
        transaction_id: txnId,
        company_id: params.companyId,
        account_id: apAccount.id,
        account_code: apAccount.code,
        account_name: apAccount.name,
        debit: params.amount,
        credit: 0,
        memo: `Reduction of accounts payable to ${params.supplierName}`,
        created_at: now,
      },
      {
        id: `jel-${Date.now()}-2`,
        transaction_id: txnId,
        company_id: params.companyId,
        account_id: paymentAccount.id,
        account_code: paymentAccount.code,
        account_name: paymentAccount.name,
        debit: 0,
        credit: params.amount,
        memo: `Cash/Bank/MFS outflow to ${params.supplierName}`,
        created_at: now,
      },
    ]

    const transaction = await FinanceRepository.recordTransaction(header, lines)

    try {
      await SupplierRepository.recordLedgerEntry({
        company_id: params.companyId,
        branch_id: params.branchId || null,
        supplier_id: params.supplierId,
        entry_type: 'PAYMENT',
        reference_type: 'PAYMENT_RECEIPT',
        reference_id: txnNumber,
        debit: params.amount,
        credit: 0,
        notes: `Paid ৳${params.amount.toLocaleString()} via ${paymentAccount.name} (${txnNumber})`,
      })
    } catch (suppErr) {
      console.warn('[FinanceService.recordSupplierPayment] Supplier subledger sync warning:', suppErr)
    }

    return transaction
  }

  // ============================================================================
  // 4. EXPENSE POSTING & STAFF SALARY INTEGRATION
  // ============================================================================

  static async recordExpense(params: {
    companyId: string
    branchId?: string | null
    expenseNumber?: string
    category: ExpenseCategory | string
    amount: number
    expenseAccountId?: string | null
    paymentAccountId: string
    employeeId?: string | null
    employeeName?: string | null
    paymentMethod?: string
    vendorName?: string | null
    description: string
    expenseDate?: string
    attachmentUrl?: string | null
    actorName?: string
  }): Promise<FinancialTransactionRecord> {
    if (params.amount <= 0) {
      throw new Error('Expense amount must be greater than 0.')
    }

    const accounts = await FinanceRepository.getAccounts(params.companyId)
    const paymentAccount = accounts.find((a) => a.id === params.paymentAccountId)
    if (!paymentAccount) {
      throw new Error(`Payment account (${params.paymentAccountId}) not found.`)
    }

    const catKey = String(params.category).toLowerCase()
    const catDef = EXPENSE_CATEGORY_DEFINITIONS[catKey] || {
      labelEn: params.category,
      labelBn: params.category,
      defaultCode: '6070',
      accountSubtype: 'OPEX_GENERAL',
    }

    let expenseAccount = params.expenseAccountId
      ? accounts.find((a) => a.id === params.expenseAccountId)
      : null

    if (!expenseAccount) {
      if (catDef.defaultCode) {
        expenseAccount = accounts.find((a) => a.code === catDef.defaultCode)
      }
      if (!expenseAccount && catDef.accountSubtype) {
        expenseAccount = accounts.find(
          (a) => a.account_type === 'EXPENSE' && a.account_subtype === catDef.accountSubtype
        )
      }
      if (!expenseAccount) {
        const catUpper = catKey.toUpperCase()
        expenseAccount = accounts.find(
          (a) =>
            a.account_type === 'EXPENSE' &&
            (a.account_subtype.includes(catUpper) || a.code.startsWith('60') || a.code.startsWith('50'))
        )
      }
    }

    if (!expenseAccount) {
      expenseAccount = accounts.find((a) => a.code === '6070') || accounts.find((a) => a.account_type === 'EXPENSE')!
    }

    const txnNumber = params.expenseNumber || await FinanceRepository.getNextDocumentNumber(params.companyId, 'EXPENSE', 'EXP')
    const txnId = `txn-${Date.now()}-${txnNumber}`
    const now = new Date().toISOString()
    const eDate = params.expenseDate || now.split('T')[0]

    const payeeName = params.employeeName || params.vendorName || 'General Payee'
    const narrationPrefix = params.employeeName
      ? `Staff Payout (${catDef.labelEn}): ${params.employeeName}`
      : `Expense: ${params.description} (${catDef.labelEn})`

    const header: FinancialTransactionRecord = {
      id: txnId,
      company_id: params.companyId,
      branch_id: params.branchId || null,
      transaction_number: txnNumber,
      transaction_date: eDate,
      transaction_type: 'EXPENSE',
      status: 'POSTED',
      total_amount: params.amount,
      reference_type: 'EXPENSE',
      reference_id: txnNumber,
      narration: `${narrationPrefix} via ${paymentAccount.name}`,
      posted_by_name: params.actorName || 'Accounts Officer',
      posted_at: now,
      metadata: {
        category: params.category,
        category_label_en: catDef.labelEn,
        category_label_bn: catDef.labelBn,
        vendor: params.vendorName || undefined,
        employee_id: params.employeeId || undefined,
        employee_name: params.employeeName || undefined,
        payment_method: params.paymentMethod || undefined,
        attachment_url: params.attachmentUrl || undefined,
      },
      created_at: now,
      updated_at: now,
    }

    const lines: JournalEntryLineRecord[] = [
      {
        id: `jel-${Date.now()}-1`,
        transaction_id: txnId,
        company_id: params.companyId,
        account_id: expenseAccount.id,
        account_code: expenseAccount.code,
        account_name: expenseAccount.name,
        debit: params.amount,
        credit: 0,
        memo: `${catDef.labelEn}: ${params.description} (${payeeName})`,
        created_at: now,
      },
      {
        id: `jel-${Date.now()}-2`,
        transaction_id: txnId,
        company_id: params.companyId,
        account_id: paymentAccount.id,
        account_code: paymentAccount.code,
        account_name: paymentAccount.name,
        debit: 0,
        credit: params.amount,
        memo: `Payment for expense voucher ${txnNumber}`,
        created_at: now,
      },
    ]

    const transaction = await FinanceRepository.recordTransaction(header, lines)

    // Atomically sync salary advance with employee record if applicable
    if (params.employeeId && (catKey === 'salary_advance' || catKey === 'advance')) {
      try {
        const emp = await WorkforceRepository.getEmployeeById(params.employeeId, params.companyId)
        if (emp) {
          const newBal = Number(emp.current_advance_balance || 0) + params.amount
          await WorkforceRepository.updateEmployee(emp.id, params.companyId, {
            current_advance_balance: newBal,
          })
        }
      } catch (empErr) {
        console.warn('[FinanceService.recordExpense] Non-blocking employee advance balance update:', empErr)
      }
    }

    return transaction
  }

  static async getExpenses(
    companyId: string,
    options?: {
      startDate?: string
      endDate?: string
      category?: string
      employeeId?: string
      branchId?: string
    }
  ): Promise<ExpenseSummaryReport> {
    const allTxns = await FinanceRepository.getTransactions(companyId, {
      startDate: options?.startDate,
      endDate: options?.endDate,
      branchId: options?.branchId,
    })

    const accounts = await FinanceRepository.getAccounts(companyId, options?.branchId)
    const accountMap = new Map<string, AccountRecord>(accounts.map((a) => [a.id, a]))

    // Filter transactions that are EXPENSE or SALARY_PAYMENT
    const expenseTxns = allTxns.filter((t) => {
      if (t.transaction_type !== 'EXPENSE' && t.transaction_type !== 'SALARY_PAYMENT') {
        return false
      }
      if (options?.category && options.category !== 'all') {
        const cat = t.metadata?.category || (t.transaction_type === 'SALARY_PAYMENT' ? 'staff_salary' : 'miscellaneous')
        if (cat !== options.category) return false
      }
      if (options?.employeeId) {
        const empId = t.metadata?.employee_id || t.metadata?.employeeId
        if (empId !== options.employeeId) return false
      }
      return true
    })

    let totalExpenses = 0
    let totalStaffSalary = 0
    let totalSalaryAdvance = 0
    let totalDailyLabor = 0
    let totalOperationalOverhead = 0

    const categorySummaryMap = new Map<string, { count: number; total: number }>()
    const paymentAccountMap = new Map<string, { name: string; code: string; count: number; total: number }>()
    const employeeSummaryMap = new Map<
      string,
      { employee_id: string; employee_name: string; salary_total: number; advance_total: number; labor_total: number; total_paid: number; transaction_count: number }
    >()

    const items: ExpenseItemRecord[] = []

    for (const txn of expenseTxns) {
      const amount = Number(txn.total_amount || 0)
      totalExpenses += amount

      const catRaw = txn.metadata?.category || (txn.transaction_type === 'SALARY_PAYMENT' ? 'staff_salary' : 'miscellaneous')
      const catKey = String(catRaw).toLowerCase()
      const catDef = EXPENSE_CATEGORY_DEFINITIONS[catKey] || {
        labelEn: catRaw,
        labelBn: catRaw,
        defaultCode: '6070',
        icon: '📂',
      }

      // Group totals
      if (catKey === 'staff_salary' || catKey === 'salary' || txn.transaction_type === 'SALARY_PAYMENT') {
        totalStaffSalary += amount
      } else if (catKey === 'salary_advance' || catKey === 'advance') {
        totalSalaryAdvance += amount
      } else if (catKey === 'daily_labor' || catKey === 'labor') {
        totalDailyLabor += amount
      } else {
        totalOperationalOverhead += amount
      }

      // Category breakdown
      const existingCat = categorySummaryMap.get(catKey) || { count: 0, total: 0 }
      categorySummaryMap.set(catKey, {
        count: existingCat.count + 1,
        total: existingCat.total + amount,
      })

      // Payment Account Resolution (from credit line or metadata)
      const creditLine = (txn.lines || []).find((l) => Number(l.credit || 0) > 0)
      const payAccId = creditLine?.account_id || accounts.find((a) => a.account_type === 'ASSET')?.id || 'acc-cash'
      const payAcc = accountMap.get(payAccId)
      const payAccName = payAcc?.name || creditLine?.account_name || 'Cash in Hand'
      const payAccCode = payAcc?.code || creditLine?.account_code || '1010'

      const existingAcc = paymentAccountMap.get(payAccId) || { name: payAccName, code: payAccCode, count: 0, total: 0 }
      paymentAccountMap.set(payAccId, {
        name: payAccName,
        code: payAccCode,
        count: existingAcc.count + 1,
        total: existingAcc.total + amount,
      })

      // Employee Tracking
      const empId = txn.metadata?.employee_id || txn.metadata?.employeeId || null
      const empName = txn.metadata?.employee_name || txn.metadata?.employeeName || (empId ? txn.metadata?.vendor : null)

      if (empId || (empName && (catKey === 'staff_salary' || catKey === 'salary_advance' || catKey === 'daily_labor' || txn.transaction_type === 'SALARY_PAYMENT'))) {
        const key = empId || empName!
        const existingEmp = employeeSummaryMap.get(key) || {
          employee_id: empId || key,
          employee_name: empName || 'Employee',
          salary_total: 0,
          advance_total: 0,
          labor_total: 0,
          total_paid: 0,
          transaction_count: 0,
        }

        if (catKey === 'staff_salary' || catKey === 'salary' || txn.transaction_type === 'SALARY_PAYMENT') {
          existingEmp.salary_total += amount
        } else if (catKey === 'salary_advance' || catKey === 'advance') {
          existingEmp.advance_total += amount
        } else if (catKey === 'daily_labor' || catKey === 'labor') {
          existingEmp.labor_total += amount
        }
        existingEmp.total_paid += amount
        existingEmp.transaction_count += 1
        employeeSummaryMap.set(key, existingEmp)
      }

      items.push({
        id: txn.id,
        transaction_number: txn.transaction_number,
        transaction_date: txn.transaction_date,
        category: catKey,
        category_label: catDef.labelEn,
        category_label_bn: catDef.labelBn,
        amount,
        payment_account_id: payAccId,
        payment_account_name: payAccName,
        payment_account_code: payAccCode,
        payment_method: txn.metadata?.payment_method,
        employee_id: empId,
        employee_name: empName,
        vendor_name: txn.metadata?.vendor,
        description: txn.narration || txn.metadata?.description || catDef.labelEn,
        attachment_url: txn.metadata?.attachment_url,
        posted_by_name: txn.posted_by_name || 'Accounts Officer',
        created_at: txn.created_at,
      })
    }

    const byCategory = Array.from(categorySummaryMap.entries()).map(([cat, val]) => {
      const def = EXPENSE_CATEGORY_DEFINITIONS[cat] || { labelEn: cat, labelBn: cat }
      return {
        category: cat,
        labelEn: def.labelEn,
        labelBn: def.labelBn,
        count: val.count,
        total: Math.round(val.total * 100) / 100,
      }
    })

    const byPaymentAccount = Array.from(paymentAccountMap.entries()).map(([accId, val]) => ({
      account_id: accId,
      account_name: val.name,
      account_code: val.code,
      count: val.count,
      total: Math.round(val.total * 100) / 100,
    }))

    const byEmployee = Array.from(employeeSummaryMap.values()).map((emp) => ({
      ...emp,
      salary_total: Math.round(emp.salary_total * 100) / 100,
      advance_total: Math.round(emp.advance_total * 100) / 100,
      labor_total: Math.round(emp.labor_total * 100) / 100,
      total_paid: Math.round(emp.total_paid * 100) / 100,
    }))

    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    return {
      company_id: companyId,
      start_date: options?.startDate || currentMonthStart,
      end_date: options?.endDate || currentMonthEnd,
      total_expenses: Math.round(totalExpenses * 100) / 100,
      total_staff_salary: Math.round(totalStaffSalary * 100) / 100,
      total_salary_advance: Math.round(totalSalaryAdvance * 100) / 100,
      total_daily_labor: Math.round(totalDailyLabor * 100) / 100,
      total_operational_overhead: Math.round(totalOperationalOverhead * 100) / 100,
      by_category: byCategory,
      by_payment_account: byPaymentAccount,
      by_employee: byEmployee,
      items,
    }
  }

  // ============================================================================
  // 5. ACCOUNT TRANSFERS
  // ============================================================================

  static async recordTransfer(params: {
    companyId: string
    branchId?: string | null
    fromAccountId: string
    toAccountId: string
    amount: number
    feeAmount?: number
    transferDate?: string
    notes?: string | null
    actorName?: string
  }): Promise<AccountTransferRecord> {
    if (params.amount <= 0) {
      throw new Error('Transfer amount must be greater than 0.')
    }
    if (params.fromAccountId === params.toAccountId) {
      throw new Error('Transfer rejected: Source and Destination accounts cannot be the same.')
    }

    const fromAcc = await FinanceRepository.getAccountById(params.fromAccountId, params.companyId)
    const toAcc = await FinanceRepository.getAccountById(params.toAccountId, params.companyId)
    if (!fromAcc || !toAcc) {
      throw new Error('Transfer accounts not found.')
    }

    const transferNum = await FinanceRepository.getNextDocumentNumber(params.companyId, 'TRANSFER', 'TRF')
    const txnNumber = await FinanceRepository.getNextDocumentNumber(params.companyId, 'TRANSACTION', 'TXN')
    const txnId = `txn-${Date.now()}-${txnNumber}`
    const now = new Date().toISOString()
    const tDate = params.transferDate || now.split('T')[0]
    const fee = Number(params.feeAmount || 0)

    const header: FinancialTransactionRecord = {
      id: txnId,
      company_id: params.companyId,
      branch_id: params.branchId || null,
      transaction_number: txnNumber,
      transaction_date: tDate,
      transaction_type: 'ACCOUNT_TRANSFER',
      status: 'POSTED',
      total_amount: params.amount,
      reference_type: 'TRANSFER',
      reference_id: transferNum,
      narration: `Funds transfer from ${fromAcc.name} to ${toAcc.name}`,
      posted_by_name: params.actorName || 'Accounts Officer',
      posted_at: now,
      created_at: now,
      updated_at: now,
    }

    const lines: JournalEntryLineRecord[] = [
      {
        id: `jel-${Date.now()}-1`,
        transaction_id: txnId,
        company_id: params.companyId,
        account_id: toAcc.id,
        account_code: toAcc.code,
        account_name: toAcc.name,
        debit: params.amount,
        credit: 0,
        memo: `Transfer received from ${fromAcc.name}`,
        created_at: now,
      },
      {
        id: `jel-${Date.now()}-2`,
        transaction_id: txnId,
        company_id: params.companyId,
        account_id: fromAcc.id,
        account_code: fromAcc.code,
        account_name: fromAcc.name,
        debit: 0,
        credit: params.amount + fee,
        memo: `Transfer sent to ${toAcc.name}`,
        created_at: now,
      },
    ]

    if (fee > 0) {
      const accounts = await FinanceRepository.getAccounts(params.companyId)
      const feeAccount = accounts.find((a) => a.code === '6070') || accounts.find((a) => a.account_type === 'EXPENSE')!
      lines.push({
        id: `jel-${Date.now()}-3`,
        transaction_id: txnId,
        company_id: params.companyId,
        account_id: feeAccount.id,
        account_code: feeAccount.code,
        account_name: feeAccount.name,
        debit: fee,
        credit: 0,
        memo: `Transfer fee for ${transferNum}`,
        created_at: now,
      })
    }

    await FinanceRepository.recordTransaction(header, lines)

    const transfer: AccountTransferRecord = {
      id: `trf-${Date.now()}-${transferNum}`,
      company_id: params.companyId,
      branch_id: params.branchId || null,
      transfer_number: transferNum,
      from_account_id: fromAcc.id,
      from_account_name: fromAcc.name,
      to_account_id: toAcc.id,
      to_account_name: toAcc.name,
      amount: params.amount,
      fee_amount: fee,
      transfer_date: tDate,
      transaction_id: txnId,
      status: 'POSTED',
      notes: params.notes || null,
      created_by_name: params.actorName || 'Accounts Officer',
      created_at: now,
    }

    return FinanceRepository.recordTransfer(transfer)
  }

  // ============================================================================
  // 6. CUSTOMER REFUND
  // ============================================================================

  static async recordCustomerRefund(params: {
    companyId: string
    branchId?: string | null
    customerId: string
    customerName: string
    refundAccountId: string
    amount: number
    refundDate?: string
    reason?: string | null
    actorName?: string
  }): Promise<FinancialTransactionRecord> {
    if (params.amount <= 0) {
      throw new Error('Refund amount must be greater than 0.')
    }

    const accounts = await FinanceRepository.getAccounts(params.companyId)
    const refundAccount = accounts.find((a) => a.id === params.refundAccountId)
    if (!refundAccount) {
      throw new Error(`Refund payment account (${params.refundAccountId}) not found.`)
    }

    const revAccount = accounts.find((a) => a.code === '4010') || accounts.find((a) => a.account_type === 'REVENUE')
    if (!revAccount) {
      throw new Error('Sales Revenue (4010) account not configured in Chart of Accounts.')
    }

    const refundNumber = await FinanceRepository.getNextDocumentNumber(params.companyId, 'REFUND', 'REF')
    const txnId = `txn-${Date.now()}-${refundNumber}`
    const now = new Date().toISOString()
    const rDate = params.refundDate || now.split('T')[0]

    const header: FinancialTransactionRecord = {
      id: txnId,
      company_id: params.companyId,
      branch_id: params.branchId || null,
      transaction_number: refundNumber,
      transaction_date: rDate,
      transaction_type: 'REFUND',
      status: 'POSTED',
      total_amount: params.amount,
      reference_type: 'CUSTOMER_REFUND',
      reference_id: refundNumber,
      narration: `Customer refund to ${params.customerName}: ${params.reason || 'Order adjustment'}`,
      posted_by_name: params.actorName || 'Accounts Manager',
      posted_at: now,
      metadata: { customerId: params.customerId, customerName: params.customerName, reason: params.reason },
      created_at: now,
      updated_at: now,
    }

    const lines: JournalEntryLineRecord[] = [
      {
        id: `jel-${Date.now()}-1`,
        transaction_id: txnId,
        company_id: params.companyId,
        account_id: revAccount.id,
        account_code: revAccount.code,
        account_name: revAccount.name,
        debit: params.amount,
        credit: 0,
        memo: `Revenue reversal for customer refund ${refundNumber}`,
        created_at: now,
      },
      {
        id: `jel-${Date.now()}-2`,
        transaction_id: txnId,
        company_id: params.companyId,
        account_id: refundAccount.id,
        account_code: refundAccount.code,
        account_name: refundAccount.name,
        debit: 0,
        credit: params.amount,
        memo: `Refund payout via ${refundAccount.name}`,
        created_at: now,
      },
    ]

    return FinanceRepository.recordTransaction(header, lines)
  }

  // ============================================================================
  // 7. FINANCIAL ADJUSTMENT (MANUAL JOURNAL ENTRY)
  // ============================================================================

  static async recordFinancialAdjustment(params: {
    companyId: string
    branchId?: string | null
    lines: { accountId: string; debit: number; credit: number; memo?: string }[]
    narration: string
    reason: string
    adjustmentDate?: string
    actorName?: string
  }): Promise<FinancialTransactionRecord> {
    if (!params.reason || params.reason.trim().length === 0) {
      throw new Error('Financial adjustments require an explicit reason for audit trail.')
    }

    const accounts = await FinanceRepository.getAccounts(params.companyId)
    const accMap = new Map(accounts.map((a) => [a.id, a]))

    const jvNumber = await FinanceRepository.getNextDocumentNumber(params.companyId, 'JOURNAL_ENTRY', 'JV')
    const txnId = `txn-${Date.now()}-${jvNumber}`
    const now = new Date().toISOString()
    const aDate = params.adjustmentDate || now.split('T')[0]

    let totalAmount = 0
    const journalLines: JournalEntryLineRecord[] = []

    for (let i = 0; i < params.lines.length; i++) {
      const line = params.lines[i]
      const acc = accMap.get(line.accountId)
      if (!acc) throw new Error(`Account ID ${line.accountId} not found.`)

      const debit = Number(line.debit || 0)
      const credit = Number(line.credit || 0)
      totalAmount += debit

      journalLines.push({
        id: `jel-${Date.now()}-${i + 1}`,
        transaction_id: txnId,
        company_id: params.companyId,
        account_id: acc.id,
        account_code: acc.code,
        account_name: acc.name,
        debit,
        credit,
        memo: line.memo || params.narration,
        created_at: now,
      })
    }

    const header: FinancialTransactionRecord = {
      id: txnId,
      company_id: params.companyId,
      branch_id: params.branchId || null,
      transaction_number: jvNumber,
      transaction_date: aDate,
      transaction_type: 'JOURNAL_ADJUSTMENT',
      status: 'POSTED',
      total_amount: totalAmount,
      reference_type: 'ADJUSTMENT_VOUCHER',
      reference_id: jvNumber,
      narration: `${params.narration} (Reason: ${params.reason})`,
      posted_by_name: params.actorName || 'Chief Accountant',
      posted_at: now,
      metadata: { reason: params.reason },
      created_at: now,
      updated_at: now,
    }

    return FinanceRepository.recordTransaction(header, journalLines)
  }

  // ============================================================================
  // 8. DAILY CASH CLOSING
  // ============================================================================

  static async submitCashClosing(params: {
    companyId: string
    branchId?: string | null
    accountId: string
    closingDate?: string
    countedCash: number
    varianceReason?: string | null
    actorName?: string
  }): Promise<CashClosingRecord> {
    const acc = await FinanceRepository.getAccountById(params.accountId, params.companyId)
    if (!acc) throw new Error('Cash account not found.')

    const cDate = params.closingDate || new Date().toISOString().split('T')[0]
    const currentBalance = acc.current_balance
    const counted = Number(params.countedCash)
    const variance = Number((counted - currentBalance).toFixed(2))

    const closingNum = await FinanceRepository.getNextDocumentNumber(params.companyId, 'CASH_CLOSING', 'CC')
    const now = new Date().toISOString()
    let adjTxnId: string | null = null

    if (Math.abs(variance) > 0.001) {
      const accounts = await FinanceRepository.getAccounts(params.companyId)
      const adjAccount = accounts.find((a) => a.code === '6070') || accounts.find((a) => a.account_type === 'EXPENSE')!
      const txnNumber = await FinanceRepository.getNextDocumentNumber(params.companyId, 'TRANSACTION', 'TXN')
      adjTxnId = `txn-${Date.now()}-${txnNumber}`

      const header: FinancialTransactionRecord = {
        id: adjTxnId,
        company_id: params.companyId,
        branch_id: params.branchId || null,
        transaction_number: txnNumber,
        transaction_date: cDate,
        transaction_type: 'CASH_CLOSING_ADJUSTMENT',
        status: 'POSTED',
        total_amount: Math.abs(variance),
        reference_type: 'CASH_CLOSING',
        reference_id: closingNum,
        narration: `Cash drawer variance adjustment on ${cDate} (Variance: ৳${variance.toFixed(2)})`,
        posted_by_name: params.actorName || 'Cashier',
        posted_at: now,
        created_at: now,
        updated_at: now,
      }

      const lines: JournalEntryLineRecord[] =
        variance > 0
          ? [
              {
                id: `jel-${Date.now()}-1`,
                transaction_id: adjTxnId,
                company_id: params.companyId,
                account_id: acc.id,
                account_code: acc.code,
                account_name: acc.name,
                debit: variance,
                credit: 0,
                memo: 'Cash drawer surplus adjustment',
                created_at: now,
              },
              {
                id: `jel-${Date.now()}-2`,
                transaction_id: adjTxnId,
                company_id: params.companyId,
                account_id: adjAccount.id,
                account_code: adjAccount.code,
                account_name: adjAccount.name,
                debit: 0,
                credit: variance,
                memo: 'Cash drawer surplus credit',
                created_at: now,
              },
            ]
          : [
              {
                id: `jel-${Date.now()}-1`,
                transaction_id: adjTxnId,
                company_id: params.companyId,
                account_id: adjAccount.id,
                account_code: adjAccount.code,
                account_name: adjAccount.name,
                debit: Math.abs(variance),
                credit: 0,
                memo: 'Cash drawer shortage adjustment',
                created_at: now,
              },
              {
                id: `jel-${Date.now()}-2`,
                transaction_id: adjTxnId,
                company_id: params.companyId,
                account_id: acc.id,
                account_code: acc.code,
                account_name: acc.name,
                debit: 0,
                credit: Math.abs(variance),
                memo: 'Cash drawer shortage deduction',
                created_at: now,
              },
            ]

      await FinanceRepository.recordTransaction(header, lines)
    }

    const closing: CashClosingRecord = {
      id: `cc-${Date.now()}-${closingNum}`,
      company_id: params.companyId,
      branch_id: params.branchId || null,
      closing_number: closingNum,
      closing_date: cDate,
      account_id: acc.id,
      account_name: acc.name,
      opening_cash: acc.opening_balance,
      cash_inflows: currentBalance > acc.opening_balance ? currentBalance - acc.opening_balance : 0,
      cash_outflows: currentBalance < acc.opening_balance ? acc.opening_balance - currentBalance : 0,
      expected_cash: currentBalance,
      counted_cash: counted,
      variance,
      variance_reason: params.varianceReason || null,
      status: 'APPROVED',
      adjustment_transaction_id: adjTxnId,
      closed_by_name: params.actorName || 'Cashier',
      approved_by_name: params.actorName || 'Branch Manager',
      approved_at: now,
      created_at: now,
      updated_at: now,
    }

    return FinanceRepository.recordCashClosing(closing)
  }

  // ============================================================================
  // 9. FINANCIAL STATEMENTS: P&L, BALANCE SHEET, CASH FLOW, TRIAL BALANCE
  // ============================================================================

  static async getProfitAndLoss(companyId: string, startDate?: string, endDate?: string, branchId?: string): Promise<ProfitAndLossStatement> {
    const txns = await FinanceRepository.getTransactions(companyId, {
      startDate,
      endDate,
      branchId,
      status: 'POSTED',
    })

    const accounts = await FinanceRepository.getAccounts(companyId)
    const accMap = new Map(accounts.map((a) => [a.id, a]))

    let totalRevenue = 0
    let cogsMaterials = 0
    let cogsLabor = 0
    let cogsMachine = 0
    let otherCogs = 0

    const opexMap = new Map<string, number>()

    for (const txn of txns) {
      for (const line of txn.lines || []) {
        const acc = accMap.get(line.account_id)
        if (!acc) continue

        const netCredit = Number(line.credit || 0) - Number(line.debit || 0)
        const netDebit = Number(line.debit || 0) - Number(line.credit || 0)

        if (acc.account_type === 'REVENUE') {
          totalRevenue += netCredit
        } else if (acc.account_type === 'EXPENSE') {
          if (acc.account_subtype === 'COGS_MATERIAL') {
            cogsMaterials += netDebit
          } else if (acc.account_subtype === 'COGS_LABOR') {
            cogsLabor += netDebit
          } else if (acc.account_subtype === 'COGS_MACHINE') {
            cogsMachine += netDebit
          } else if (acc.account_subtype.startsWith('COGS')) {
            otherCogs += netDebit
          } else {
            const catName = acc.name
            opexMap.set(catName, (opexMap.get(catName) || 0) + netDebit)
          }
        }
      }
    }

    const totalCogs = Number((cogsMaterials + cogsLabor + cogsMachine + otherCogs).toFixed(2))
    const grossProfit = Number((totalRevenue - totalCogs).toFixed(2))
    const grossMarginPct = totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(2)) : 0

    let totalOpex = 0
    const opexCategories: { category: string; amount: number }[] = []
    for (const [category, amount] of opexMap.entries()) {
      const amt = Number(amount.toFixed(2))
      totalOpex += amt
      opexCategories.push({ category, amount: amt })
    }

    const operatingProfit = Number((grossProfit - totalOpex).toFixed(2))
    const operatingMarginPct = totalRevenue > 0 ? Number(((operatingProfit / totalRevenue) * 100).toFixed(2)) : 0
    const netProfit = operatingProfit

    return {
      company_id: companyId,
      start_date: startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      end_date: endDate || new Date().toISOString().split('T')[0],
      revenue: {
        total: Number(totalRevenue.toFixed(2)),
        accounts: [{ code: '4010', name: 'Sales & Print Revenue', amount: Number(totalRevenue.toFixed(2)) }],
      },
      cost_of_goods_sold: {
        total: totalCogs,
        material_cost: Number(cogsMaterials.toFixed(2)),
        labor_cost: Number(cogsLabor.toFixed(2)),
        machine_cost: Number(cogsMachine.toFixed(2)),
        other_cogs: Number(otherCogs.toFixed(2)),
      },
      gross_profit: grossProfit,
      gross_margin_percentage: grossMarginPct,
      operating_expenses: {
        total: Number(totalOpex.toFixed(2)),
        categories: opexCategories,
      },
      operating_profit: operatingProfit,
      operating_margin_percentage: operatingMarginPct,
      net_profit: netProfit,
    }
  }

  static async getBalanceSheet(companyId: string, asOfDate?: string, branchId?: string): Promise<BalanceSheetStatement> {
    const accounts = await FinanceRepository.getAccounts(companyId, branchId)
    const pnl = await this.getProfitAndLoss(companyId, undefined, asOfDate, branchId)

    let liquidTotal = 0
    const liquidAccs: { code: string; name: string; balance: number }[] = []

    let recTotal = 0
    const recAccs: { code: string; name: string; balance: number }[] = []

    let invTotal = 0
    const invAccs: { code: string; name: string; balance: number }[] = []

    let faTotal = 0
    const faAccs: { code: string; name: string; balance: number }[] = []

    let payTotal = 0
    const payAccs: { code: string; name: string; balance: number }[] = []

    let advTotal = 0
    const advAccs: { code: string; name: string; balance: number }[] = []

    let taxTotal = 0
    const taxAccs: { code: string; name: string; balance: number }[] = []

    let otherLiabTotal = 0
    const otherLiabAccs: { code: string; name: string; balance: number }[] = []

    let capitalTotal = 0
    let drawingsTotal = 0

    for (const acc of accounts) {
      const bal = Number(acc.current_balance || 0)
      if (acc.account_type === 'ASSET') {
        if (acc.account_subtype === 'CASH' || acc.account_subtype === 'BANK' || acc.account_subtype === 'MFS') {
          liquidTotal += bal
          liquidAccs.push({ code: acc.code, name: acc.name, balance: bal })
        } else if (acc.account_subtype === 'RECEIVABLE') {
          recTotal += bal
          recAccs.push({ code: acc.code, name: acc.name, balance: bal })
        } else if (acc.account_subtype === 'INVENTORY') {
          invTotal += bal
          invAccs.push({ code: acc.code, name: acc.name, balance: bal })
        } else {
          faTotal += bal
          faAccs.push({ code: acc.code, name: acc.name, balance: bal })
        }
      } else if (acc.account_type === 'LIABILITY') {
        if (acc.account_subtype === 'PAYABLE') {
          payTotal += bal
          payAccs.push({ code: acc.code, name: acc.name, balance: bal })
        } else if (acc.code === '2020') {
          advTotal += bal
          advAccs.push({ code: acc.code, name: acc.name, balance: bal })
        } else if (acc.code === '2030') {
          taxTotal += bal
          taxAccs.push({ code: acc.code, name: acc.name, balance: bal })
        } else {
          otherLiabTotal += bal
          otherLiabAccs.push({ code: acc.code, name: acc.name, balance: bal })
        }
      } else if (acc.account_type === 'EQUITY') {
        if (acc.code === '3010') {
          capitalTotal += bal
        } else if (acc.code === '3020') {
          drawingsTotal += bal
        }
      }
    }

    const totalAssets = Number((liquidTotal + recTotal + invTotal + faTotal).toFixed(2))
    const totalLiabilities = Number((payTotal + advTotal + taxTotal + otherLiabTotal).toFixed(2))
    const currentPeriodProfit = pnl.net_profit
    const retainedEarnings = 0
    const totalEquity = Number((capitalTotal + retainedEarnings + currentPeriodProfit - drawingsTotal).toFixed(2))

    const totalLiabilitiesAndEquity = Number((totalLiabilities + totalEquity).toFixed(2))
    const imbalance = Number(Math.abs(totalAssets - totalLiabilitiesAndEquity).toFixed(2))
    const isBalanced = imbalance <= 0.05

    return {
      company_id: companyId,
      as_of_date: asOfDate || new Date().toISOString().split('T')[0],
      assets: {
        total: totalAssets,
        liquid_assets: { name: 'Liquid Assets (Cash/Bank/MFS)', total: Number(liquidTotal.toFixed(2)), accounts: liquidAccs },
        receivables: { name: 'Accounts Receivable', total: Number(recTotal.toFixed(2)), accounts: recAccs },
        inventory: { name: 'Inventory & Materials', total: Number(invTotal.toFixed(2)), accounts: invAccs },
        fixed_assets: { name: 'Machinery & Fixed Assets', total: Number(faTotal.toFixed(2)), accounts: faAccs },
      },
      liabilities: {
        total: totalLiabilities,
        payables: { name: 'Accounts Payable', total: Number(payTotal.toFixed(2)), accounts: payAccs },
        advances: { name: 'Customer Advance Deposits', total: Number(advTotal.toFixed(2)), accounts: advAccs },
        tax_payable: { name: 'VAT & Tax Payable', total: Number(taxTotal.toFixed(2)), accounts: taxAccs },
        other_liabilities: { name: 'Other Liabilities', total: Number(otherLiabTotal.toFixed(2)), accounts: otherLiabAccs },
      },
      equity: {
        total: totalEquity,
        capital: Number(capitalTotal.toFixed(2)),
        retained_earnings: retainedEarnings,
        current_period_profit: currentPeriodProfit,
        drawings: Number(drawingsTotal.toFixed(2)),
      },
      is_balanced: isBalanced,
      imbalance_amount: imbalance,
    }
  }

  static async getCashFlow(companyId: string, startDate?: string, endDate?: string, branchId?: string): Promise<CashFlowStatement> {
    const txns = await FinanceRepository.getTransactions(companyId, {
      startDate,
      endDate,
      branchId,
      status: 'POSTED',
    })

    const accounts = await FinanceRepository.getAccounts(companyId)
    const liquidAccIds = new Set(
      accounts
        .filter((a) => a.account_subtype === 'CASH' || a.account_subtype === 'BANK' || a.account_subtype === 'MFS')
        .map((a) => a.id)
    )

    let customerReceipts = 0
    let supplierPayments = 0
    let opexPaid = 0
    let equipmentPurchases = 0
    let capitalInjections = 0
    let ownerDrawings = 0

    for (const txn of txns) {
      if (txn.transaction_type === 'CUSTOMER_PAYMENT') {
        customerReceipts += Number(txn.total_amount || 0)
      } else if (txn.transaction_type === 'SUPPLIER_PAYMENT') {
        supplierPayments += Number(txn.total_amount || 0)
      } else if (txn.transaction_type === 'EXPENSE') {
        opexPaid += Number(txn.total_amount || 0)
      } else if (txn.transaction_type === 'PURCHASE_GRN') {
        equipmentPurchases += Number(txn.total_amount || 0)
      } else if (txn.transaction_type === 'REFUND') {
        customerReceipts -= Number(txn.total_amount || 0)
      }
    }

    const operatingTotal = Number((customerReceipts - supplierPayments - opexPaid).toFixed(2))
    const investingTotal = Number((-equipmentPurchases).toFixed(2))
    const financingTotal = Number((capitalInjections - ownerDrawings).toFixed(2))
    const netMovement = Number((operatingTotal + investingTotal + financingTotal).toFixed(2))

    let openingCash = 0
    let closingCash = 0
    for (const acc of accounts) {
      if (liquidAccIds.has(acc.id)) {
        closingCash += Number(acc.current_balance || 0)
        openingCash += Number(acc.opening_balance || 0)
      }
    }

    return {
      company_id: companyId,
      start_date: startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      end_date: endDate || new Date().toISOString().split('T')[0],
      opening_cash_balance: Number(openingCash.toFixed(2)),
      operating_activities: {
        total: operatingTotal,
        customer_receipts: Number(customerReceipts.toFixed(2)),
        supplier_payments: Number(supplierPayments.toFixed(2)),
        operating_expenses_paid: Number(opexPaid.toFixed(2)),
      },
      investing_activities: {
        total: investingTotal,
        equipment_purchases: Number(equipmentPurchases.toFixed(2)),
      },
      financing_activities: {
        total: financingTotal,
        capital_injections: Number(capitalInjections.toFixed(2)),
        owner_drawings: Number(ownerDrawings.toFixed(2)),
      },
      net_cash_movement: netMovement,
      closing_cash_balance: Number(closingCash.toFixed(2)),
    }
  }

  static async getTrialBalance(companyId: string, asOfDate?: string, branchId?: string): Promise<TrialBalanceStatement> {
    return FinanceRepository.getTrialBalance(companyId, asOfDate, branchId)
  }

  static async getGeneralLedger(companyId: string, options?: { accountId?: string; startDate?: string; endDate?: string; branchId?: string }): Promise<GeneralLedgerEntry[]> {
    return FinanceRepository.getGeneralLedger(companyId, options)
  }

  static async getReceivablesAging(companyId: string): Promise<ReceivablesAgingSummary> {
    const invoices = await BillingRepository.getInvoices(companyId)
    const openInvoices = invoices.filter((i) => i.status === 'unpaid' || i.status === 'partially_paid' || i.status === 'overdue')

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let totalReceivable = 0
    let currentDue = 0
    let overdueTotal = 0
    let b0_30 = 0
    let b31_60 = 0
    let b61_90 = 0
    let b90_plus = 0

    const items: AgingBucketItem[] = []

    for (const inv of openInvoices) {
      const due = Number(inv.due_amount || 0)
      if (due <= 0) continue

      totalReceivable += due
      const dueDate = new Date(inv.due_date)
      dueDate.setHours(0, 0, 0, 0)

      const diffDays = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))

      let bucket: AgingBucketItem['bucket'] = '0_30'
      if (diffDays === 0) {
        currentDue += due
      } else {
        overdueTotal += due
      }

      if (diffDays <= 30) {
        b0_30 += due
        bucket = '0_30'
      } else if (diffDays <= 60) {
        b31_60 += due
        bucket = '31_60'
      } else if (diffDays <= 90) {
        b61_90 += due
        bucket = '61_90'
      } else {
        b90_plus += due
        bucket = '90_plus'
      }

      items.push({
        reference_id: inv.invoice_number,
        party_id: inv.customer_id || '',
        party_name: inv.customer_name,
        issue_date: inv.invoice_date,
        due_date: inv.due_date,
        total_amount: inv.grand_total,
        paid_amount: inv.paid_amount,
        due_amount: due,
        days_overdue: diffDays,
        bucket,
      })
    }

    return {
      total_receivable: Number(totalReceivable.toFixed(2)),
      current_due: Number(currentDue.toFixed(2)),
      overdue_total: Number(overdueTotal.toFixed(2)),
      bucket_0_30: Number(b0_30.toFixed(2)),
      bucket_31_60: Number(b31_60.toFixed(2)),
      bucket_61_90: Number(b61_90.toFixed(2)),
      bucket_90_plus: Number(b90_plus.toFixed(2)),
      items,
    }
  }

  static async getPayablesAging(companyId: string): Promise<PayablesAgingSummary> {
    const supplierLedgers = await SupplierRepository.getLedgerEntries(companyId)
    const suppliers = await SupplierRepository.getSuppliers(companyId)

    let totalPayable = 0
    let currentDue = 0
    let overdueTotal = 0
    let b0_30 = 0
    let b31_60 = 0
    let b61_90 = 0
    let b90_plus = 0
    const items: AgingBucketItem[] = []

    for (const supp of suppliers) {
      const entries = supplierLedgers.filter((l) => l.supplier_id === supp.id)
      const totalCredit = entries.reduce((s, e) => s + Number(e.credit || 0), 0)
      const totalDebit = entries.reduce((s, e) => s + Number(e.debit || 0), 0)
      const netDue = Math.max(0, Number((totalCredit - totalDebit).toFixed(2)))

      if (netDue > 0) {
        totalPayable += netDue
        b0_30 += netDue
        currentDue += netDue
        items.push({
          reference_id: `SUPP-${supp.supplier_code || supp.id.slice(0, 6)}`,
          party_id: supp.id,
          party_name: supp.supplier_name || (supp as any).name || 'Supplier',
          issue_date: supp.created_at.split('T')[0],
          due_date: supp.created_at.split('T')[0],
          total_amount: totalCredit,
          paid_amount: totalDebit,
          due_amount: netDue,
          days_overdue: 0,
          bucket: '0_30',
        })
      }
    }

    return {
      total_payable: Number(totalPayable.toFixed(2)),
      current_due: Number(currentDue.toFixed(2)),
      overdue_total: Number(overdueTotal.toFixed(2)),
      bucket_0_30: Number(b0_30.toFixed(2)),
      bucket_31_60: Number(b31_60.toFixed(2)),
      bucket_61_90: Number(b61_90.toFixed(2)),
      bucket_90_plus: Number(b90_plus.toFixed(2)),
      items,
    }
  }

  // ============================================================================
  // 10. JOB & BRANCH PROFITABILITY
  // ============================================================================

  static async getJobProfitability(companyId: string): Promise<JobProfitabilityMetric[]> {
    const costings = await CostingRepository.getCostings(companyId)
    return costings.map((c) => {
      const act = c.act || { material_cost: 0, labor_cost: 0, machine_cost: 0, transport_cost: 0, other_cost: 0, total_cost: 0, profit: 0, margin_percentage: 0 }
      const totalActualCost = Number(act.total_cost || 0)
      const sellingPrice = Number(c.selling_price || 0)
      const grossProfit = Number((sellingPrice - totalActualCost).toFixed(2))
      const marginPct = sellingPrice > 0 ? Number(((grossProfit / sellingPrice) * 100).toFixed(2)) : 0

      return {
        job_id: c.job_id || c.id,
        job_number: c.job_number,
        customer_name: c.customer_name,
        item_title: c.item_title,
        selling_price: sellingPrice,
        material_cost: Number(act.material_cost || 0),
        labor_cost: Number(act.labor_cost || 0),
        machine_cost: Number(act.machine_cost || 0),
        transport_cost: Number(act.transport_cost || 0),
        total_actual_cost: totalActualCost,
        gross_profit: grossProfit,
        margin_percentage: marginPct,
        status: c.status,
      }
    })
  }

  static async getBranchProfitability(companyId: string, period: string = 'this_month'): Promise<BranchProfitabilityMetric[]> {
    const comparison = await BranchAnalyticsRepository.getBranchComparison(companyId, period)
    return comparison.branches.map((b) => ({
      branch_id: b.branch_id,
      branch_name: b.branch_name,
      revenue: b.revenue,
      cogs: b.cost_of_goods_sold,
      gross_profit: b.gross_profit,
      gross_margin_percent: b.gross_margin_percent,
      operating_expenses: b.operating_expenses,
      net_profit: b.net_profit,
      net_margin_percent: b.net_margin_percent,
      receivables: 0,
      payables: 0,
    }))
  }

  // ============================================================================
  // 11. FINANCIAL DASHBOARD
  // ============================================================================

  static async getFinancialDashboard(companyId: string): Promise<FinancialDashboardMetrics> {
    const accounts = await FinanceRepository.getAccounts(companyId)
    const pnl = await this.getProfitAndLoss(companyId)
    const ar = await this.getReceivablesAging(companyId)
    const ap = await this.getPayablesAging(companyId)

    let cashBal = 0
    let bankBal = 0
    let mfsBal = 0

    for (const acc of accounts) {
      if (acc.account_subtype === 'CASH') cashBal += acc.current_balance
      if (acc.account_subtype === 'BANK') bankBal += acc.current_balance
      if (acc.account_subtype === 'MFS') mfsBal += acc.current_balance
    }

    return {
      total_cash_balance: Number(cashBal.toFixed(2)),
      total_bank_balance: Number(bankBal.toFixed(2)),
      total_mfs_balance: Number(mfsBal.toFixed(2)),
      total_liquid_assets: Number((cashBal + bankBal + mfsBal).toFixed(2)),
      total_receivables: ar.total_receivable,
      total_payables: ap.total_payable,
      monthly_revenue: pnl.revenue.total,
      monthly_expenses: pnl.operating_expenses.total,
      monthly_gross_profit: pnl.gross_profit,
      monthly_net_profit: pnl.net_profit,
    }
  }
}
