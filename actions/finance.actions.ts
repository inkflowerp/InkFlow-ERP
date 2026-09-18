'use server'

// ==============================================================================
// InkFlow ERP - Authoritative Finance 360 Server Actions (V9.1)
// ==============================================================================

import { FinanceService } from '@/services/finance.service'
import { getTenantCompanyId } from '@/lib/auth/tenant-auth'
import { verifyServerPermission } from '@/lib/auth/rbac.server'
import type { AccountRecord } from '@/types/finance.types'

export async function getAccountsAction(branchId?: string) {
  try {
    const companyId = await getTenantCompanyId()
    const accounts = await FinanceService.getAccounts(companyId, branchId)
    return { success: true, data: accounts }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch accounts.' }
  }
}

export async function createAccountAction(input: Partial<AccountRecord> & { code: string; name: string; account_type: any; account_subtype: any }) {
  try {
    const companyId = await getTenantCompanyId()
    const authCheck = await verifyServerPermission({ companyId, permissionCode: 'accounting.manage' })
    if (!authCheck.allowed) {
      return { success: false, error: authCheck.error || 'Permission denied' }
    }

    const account = await FinanceService.createAccount({ ...input, company_id: companyId })
    return { success: true, data: account }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create account.' }
  }
}

export async function recordCustomerPaymentAction(params: {
  invoiceId?: string | null
  customerId: string
  customerName: string
  paymentAccountId: string
  amount: number
  paymentDate?: string
  paymentMethod: string
  referenceNumber?: string | null
  notes?: string | null
}) {
  try {
    const companyId = await getTenantCompanyId()
    const authCheck = await verifyServerPermission({ companyId, permissionCode: 'payments.create' })
    if (!authCheck.allowed) {
      return { success: false, error: authCheck.error || 'Permission denied' }
    }

    const result = await FinanceService.recordCustomerPayment({
      companyId,
      ...params,
    })
    return { success: true, data: result }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to record customer payment.' }
  }
}

export async function recordSupplierPaymentAction(params: {
  supplierId: string
  supplierName: string
  paymentAccountId: string
  amount: number
  paymentDate?: string
  referenceNumber?: string | null
  notes?: string | null
}) {
  try {
    const companyId = await getTenantCompanyId()
    const authCheck = await verifyServerPermission({ companyId, permissionCode: 'accounting.create' })
    if (!authCheck.allowed) {
      return { success: false, error: authCheck.error || 'Permission denied' }
    }

    const transaction = await FinanceService.recordSupplierPayment({
      companyId,
      ...params,
    })
    return { success: true, data: transaction }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to record supplier payment.' }
  }
}

export async function recordExpenseAction(params: {
  category: string
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
}) {
  try {
    const companyId = await getTenantCompanyId()
    const authCheck = await verifyServerPermission({ companyId, permissionCode: 'accounting.create' })
    if (!authCheck.allowed) {
      return { success: false, error: authCheck.error || 'Permission denied' }
    }

    const transaction = await FinanceService.recordExpense({
      companyId,
      ...params,
    })
    return { success: true, data: transaction }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to record expense.' }
  }
}

export async function recordTransferAction(params: {
  fromAccountId: string
  toAccountId: string
  amount: number
  feeAmount?: number
  transferDate?: string
  notes?: string | null
}) {
  try {
    const companyId = await getTenantCompanyId()
    const authCheck = await verifyServerPermission({ companyId, permissionCode: 'accounting.create' })
    if (!authCheck.allowed) {
      return { success: false, error: authCheck.error || 'Permission denied' }
    }

    const transfer = await FinanceService.recordTransfer({
      companyId,
      ...params,
    })
    return { success: true, data: transfer }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to record transfer.' }
  }
}

export async function recordCustomerRefundAction(params: {
  customerId: string
  customerName: string
  refundAccountId: string
  amount: number
  refundDate?: string
  reason?: string | null
}) {
  try {
    const companyId = await getTenantCompanyId()
    const authCheck = await verifyServerPermission({ companyId, permissionCode: 'accounting.manage' })
    if (!authCheck.allowed) {
      return { success: false, error: authCheck.error || 'Permission denied' }
    }

    const transaction = await FinanceService.recordCustomerRefund({
      companyId,
      ...params,
    })
    return { success: true, data: transaction }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to record customer refund.' }
  }
}

export async function recordFinancialAdjustmentAction(params: {
  lines: { accountId: string; debit: number; credit: number; memo?: string }[]
  narration: string
  reason: string
  adjustmentDate?: string
}) {
  try {
    const companyId = await getTenantCompanyId()
    const authCheck = await verifyServerPermission({ companyId, permissionCode: 'accounting.manage' })
    if (!authCheck.allowed) {
      return { success: false, error: authCheck.error || 'Permission denied' }
    }

    const transaction = await FinanceService.recordFinancialAdjustment({
      companyId,
      ...params,
    })
    return { success: true, data: transaction }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to record financial adjustment.' }
  }
}

export async function submitCashClosingAction(params: {
  accountId: string
  closingDate?: string
  countedCash: number
  varianceReason?: string | null
}) {
  try {
    const companyId = await getTenantCompanyId()
    const closing = await FinanceService.submitCashClosing({
      companyId,
      ...params,
    })
    return { success: true, data: closing }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit cash closing.' }
  }
}

export async function getProfitAndLossAction(startDate?: string, endDate?: string, branchId?: string) {
  try {
    const companyId = await getTenantCompanyId()
    const pnl = await FinanceService.getProfitAndLoss(companyId, startDate, endDate, branchId)
    return { success: true, data: pnl }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to compute P&L.' }
  }
}

export async function getBalanceSheetAction(asOfDate?: string, branchId?: string) {
  try {
    const companyId = await getTenantCompanyId()
    const bs = await FinanceService.getBalanceSheet(companyId, asOfDate, branchId)
    return { success: true, data: bs }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to compute Balance Sheet.' }
  }
}

export async function getCashFlowAction(startDate?: string, endDate?: string, branchId?: string) {
  try {
    const companyId = await getTenantCompanyId()
    const cf = await FinanceService.getCashFlow(companyId, startDate, endDate, branchId)
    return { success: true, data: cf }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to compute Cash Flow.' }
  }
}

export async function getTrialBalanceAction(asOfDate?: string, branchId?: string) {
  try {
    const companyId = await getTenantCompanyId()
    const tb = await FinanceService.getTrialBalance(companyId, asOfDate, branchId)
    return { success: true, data: tb }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to compute Trial Balance.' }
  }
}

export async function getGeneralLedgerAction(options?: { accountId?: string; startDate?: string; endDate?: string; branchId?: string }) {
  try {
    const companyId = await getTenantCompanyId()
    const gl = await FinanceService.getGeneralLedger(companyId, options)
    return { success: true, data: gl }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch General Ledger.' }
  }
}

export async function getReceivablesAgingAction() {
  try {
    const companyId = await getTenantCompanyId()
    const aging = await FinanceService.getReceivablesAging(companyId)
    return { success: true, data: aging }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to compute receivables aging.' }
  }
}

export async function getPayablesAgingAction() {
  try {
    const companyId = await getTenantCompanyId()
    const aging = await FinanceService.getPayablesAging(companyId)
    return { success: true, data: aging }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to compute payables aging.' }
  }
}

export async function getJobProfitabilityAction() {
  try {
    const companyId = await getTenantCompanyId()
    const metrics = await FinanceService.getJobProfitability(companyId)
    return { success: true, data: metrics }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to compute job profitability.' }
  }
}

export async function getBranchProfitabilityAction(period?: string) {
  try {
    const companyId = await getTenantCompanyId()
    const metrics = await FinanceService.getBranchProfitability(companyId, period)
    return { success: true, data: metrics }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to compute branch profitability.' }
  }
}

export async function getFinancialDashboardAction() {
  try {
    const companyId = await getTenantCompanyId()
    const dashboard = await FinanceService.getFinancialDashboard(companyId)
    return { success: true, data: dashboard }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch financial dashboard.' }
  }
}

export async function getExpensesAction(options?: {
  startDate?: string
  endDate?: string
  category?: string
  employeeId?: string
  branchId?: string
}) {
  try {
    const companyId = await getTenantCompanyId()
    const report = await FinanceService.getExpenses(companyId, options)
    return { success: true, data: report }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch expenses report.' }
  }
}

