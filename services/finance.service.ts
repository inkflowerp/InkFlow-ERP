// ==============================================================================
// InkFlow ERP - Authoritative Finance Service (V6)
// Double-entry accounting, General Ledger authority, Receivables & Payables reconciliation,
// Cash Closings, Transfers, Profit & Loss reporting
// ==============================================================================

import { FinanceRepository } from '../lib/repositories/finance.repository.ts'
import { BillingRepository } from '../lib/repositories/billing.repository.ts'
import { SupplierRepository } from '../lib/repositories/supplier.repository.ts'
import type { ExpenseCategory } from '../types/accounting.types.ts'
import type {
  AccountRecord,
  FinancialTransactionRecord,
  JournalEntryLineRecord,
  AccountTransferRecord,
  CashClosingRecord,
  ProfitAndLossStatement,
  ReceivablesAgingSummary,
  PayablesAgingSummary,
  FinancialDashboardMetrics,
  AgingBucketItem,
} from '../types/finance.types.ts'

export class FinanceService {
  // ============================================================================
  // DOCUMENT NUMBERING HELPER
  // ============================================================================

  static generateDocNumber(prefix: string): string {
    const year = new Date().getFullYear()
    const seq = Math.floor(Math.random() * 900000) + 100000
    return `${prefix}-${year}-${seq}`
  }

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

  /**
   * Records a customer payment:
   * - Debit Cash/Bank/MFS Account
   * - Credit Accounts Receivable (1040)
   * - Reconciles V1 Invoice paid/due balances
   * - Enforces anti-overpayment validation
   */
  static async recordCustomerPayment(params: {
    companyId: string
    branchId?: string | null
    invoiceId?: string | null
    customerId: string
    customerName: string
    paymentAccountId: string // Cash/Bank/MFS account
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

    // Anti-overpayment validation against invoice if invoiceId is specified
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

    // Generate balanced double-entry transaction
    const txnNumber = this.generateDocNumber('PAY')
    const txnId = `txn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
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

  /**
   * Records a supplier payment:
   * - Debit Accounts Payable (2010)
   * - Credit Cash/Bank/MFS Account
   * - Synchronizes V5 supplier ledger subledger
   */
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

    const txnNumber = this.generateDocNumber('PAY')
    const txnId = `txn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
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

    // Reconcile with V5 Supplier Ledger Subledger
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
  // 4. EXPENSE POSTING
  // ============================================================================

  static async recordExpense(params: {
    companyId: string
    branchId?: string | null
    expenseNumber?: string
    category: ExpenseCategory | string
    amount: number
    expenseAccountId?: string | null
    paymentAccountId: string
    vendorName?: string | null
    description: string
    expenseDate?: string
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

    let expenseAccount = params.expenseAccountId
      ? accounts.find((a) => a.id === params.expenseAccountId)
      : null

    if (!expenseAccount) {
      // Find matching expense account by category
      const catUpper = String(params.category).toUpperCase()
      expenseAccount = accounts.find(
        (a) =>
          a.account_type === 'EXPENSE' &&
          (a.account_subtype.includes(catUpper) || a.code.startsWith('60'))
      )
    }

    if (!expenseAccount) {
      // Default to general OPEX (6070)
      expenseAccount = accounts.find((a) => a.code === '6070') || accounts.find((a) => a.account_type === 'EXPENSE')!
    }

    const txnNumber = params.expenseNumber || this.generateDocNumber('EXP')
    const txnId = `txn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const now = new Date().toISOString()
    const eDate = params.expenseDate || now.split('T')[0]

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
      narration: `Expense: ${params.description} (${params.category}) via ${paymentAccount.name}`,
      posted_by_name: params.actorName || 'Accounts Officer',
      posted_at: now,
      metadata: { category: params.category, vendor: params.vendorName },
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
        memo: `Operating expense: ${params.description}`,
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
        memo: `Payment for expense ${txnNumber}`,
        created_at: now,
      },
    ]

    return FinanceRepository.recordTransaction(header, lines)
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

    const transferNum = this.generateDocNumber('TRF')
    const txnNumber = this.generateDocNumber('TXN')
    const txnId = `txn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const now = new Date().toISOString()
    const tDate = params.transferDate || now.split('T')[0]
    const fee = Number(params.feeAmount || 0)

    // Create journal transaction
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
      id: `trf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
  // 6. DAILY CASH CLOSING
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

    const closingNum = this.generateDocNumber('CC')
    const now = new Date().toISOString()

    let adjTxnId: string | null = null

    // If approved / submitted with variance, generate adjusting entry
    if (Math.abs(variance) > 0.001) {
      const accounts = await FinanceRepository.getAccounts(params.companyId)
      const adjAccount = accounts.find((a) => a.code === '6070') || accounts.find((a) => a.account_type === 'EXPENSE')!
      const txnNumber = this.generateDocNumber('TXN')
      adjTxnId = `txn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

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
      id: `cc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
  // 7. FINANCIAL STATEMENTS: P&L AND AGING
  // ============================================================================

  static async getProfitAndLoss(companyId: string, startDate?: string, endDate?: string): Promise<ProfitAndLossStatement> {
    const txns = await FinanceRepository.getTransactions(companyId, {
      startDate,
      endDate,
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
    const suppMap = new Map(suppliers.map((s) => [s.id, s]))

    // Compute balance per supplier
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
        b0_30 += netDue // default bucket
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
