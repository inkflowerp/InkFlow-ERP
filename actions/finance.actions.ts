'use server'

import { withTenantAction } from '@/lib/actions/action-wrapper'


// ==============================================================================
// InkFlow ERP - Authoritative Finance 360 Server Actions (V9.1)
// ==============================================================================

import { FinanceService } from '@/services/finance.service'
import { getTenantCompanyId } from '@/lib/auth/tenant-auth'
import { verifyServerPermission } from '@/lib/auth/rbac.server'
import type { AccountRecord } from '@/types/finance.types'

async function resolveCompanyId(companyIdOrSlug?: string): Promise<string> {
  const companyId = await getTenantCompanyId(companyIdOrSlug)
  if (!companyId) {
    throw new Error('Unauthorized: Valid authenticated tenant session required.')
  }
  return companyId
}

export const getAccountsAction = withTenantAction(
  {
    permission: "payments.view",
    entityType: "finance"
  },
  async (ctx, branchId?: string, companyIdOrSlug?: string) => {
  try {
    const companyId = await resolveCompanyId(companyIdOrSlug)
    const accounts = await FinanceService.getAccounts(companyId, branchId)
    return { success: true, data: accounts }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch accounts.' }
  }

})

export const createAccountAction = withTenantAction(
  {
    permission: "payments.create",
    entityType: "finance"
  },
  async (ctx, input: Partial<AccountRecord> & { code: string; name: string; account_type: any; account_subtype: any; companyId?: string }) => {
  try {
    const companyId = await resolveCompanyId(input.companyId || input.company_id)
    const authCheck = await verifyServerPermission({ companyId, permissionCode: 'accounting.manage' })
    if (!authCheck.allowed) {
      return { success: false, error: authCheck.error || 'Permission denied' }
    }

    const account = await FinanceService.createAccount({ ...input, company_id: companyId })
    return { success: true, data: account }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create account.' }
  }

})

export const recordCustomerPaymentAction = withTenantAction(
  {
    permission: "payments.create",
    entityType: "finance"
  },
  async (ctx, params: {
  invoiceId?: string | null
  customerId: string
  customerName: string
  paymentAccountId: string
  amount: number
  paymentDate?: string
  paymentMethod: string
  referenceNumber?: string | null
  notes?: string | null
  companyId?: string
}) => {
  try {
    const companyId = await resolveCompanyId(params.companyId)
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

})

export const recordSupplierPaymentAction = withTenantAction(
  {
    permission: "payments.create",
    entityType: "finance"
  },
  async (ctx, params: {
  supplierId: string
  supplierName: string
  paymentAccountId: string
  amount: number
  paymentDate?: string
  referenceNumber?: string | null
  notes?: string | null
  companyId?: string
}) => {
  try {
    const companyId = await resolveCompanyId(params.companyId)
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

})

export const recordExpenseAction = withTenantAction(
  {
    permission: "payments.create",
    entityType: "finance"
  },
  async (ctx, params: {
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
  companyId?: string
}) => {
  try {
    const companyId = await resolveCompanyId(params.companyId)
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

})

export const recordTransferAction = withTenantAction(
  {
    permission: "payments.create",
    entityType: "finance"
  },
  async (ctx, params: {
  fromAccountId: string
  toAccountId: string
  amount: number
  feeAmount?: number
  transferDate?: string
  notes?: string | null
  companyId?: string
}) => {
  try {
    const companyId = await resolveCompanyId(params.companyId)
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

})

export const recordCustomerRefundAction = withTenantAction(
  {
    permission: "payments.create",
    entityType: "finance"
  },
  async (ctx, params: {
  customerId: string
  customerName: string
  refundAccountId: string
  amount: number
  refundDate?: string
  reason?: string | null
  companyId?: string
}) => {
  try {
    const companyId = await resolveCompanyId(params.companyId)
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

})

export const recordFinancialAdjustmentAction = withTenantAction(
  {
    permission: "payments.delete",
    destructive: true,
    auditAction: "finance.recordfinancialadjustment",
    entityType: "finance"
  },
  async (ctx, params: {
  lines: { accountId: string; debit: number; credit: number; memo?: string }[]
  narration: string
  reason: string
  adjustmentDate?: string
  companyId?: string
}) => {
  try {
    const companyId = await resolveCompanyId(params.companyId)
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

})

export const submitCashClosingAction = withTenantAction(
  {
    permission: "payments.create",
    entityType: "finance"
  },
  async (ctx, params: {
  accountId: string
  closingDate?: string
  countedCash: number
  varianceReason?: string | null
  companyId?: string
}) => {
  try {
    const companyId = await resolveCompanyId(params.companyId)
    const closing = await FinanceService.submitCashClosing({
      companyId,
      ...params,
    })
    return { success: true, data: closing }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit cash closing.' }
  }

})

export const getProfitAndLossAction = withTenantAction(
  {
    permission: "reports.view",
    entityType: "finance"
  },
  async (ctx, startDate?: string, endDate?: string, branchId?: string, companyIdOrSlug?: string) => {
  try {
    const companyId = await resolveCompanyId(companyIdOrSlug)
    const pnl = await FinanceService.getProfitAndLoss(companyId, startDate, endDate, branchId)
    return { success: true, data: pnl }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to compute P&L.' }
  }

})

export const getBalanceSheetAction = withTenantAction(
  {
    permission: "reports.view",
    entityType: "finance"
  },
  async (ctx, asOfDate?: string, branchId?: string, companyIdOrSlug?: string) => {
  try {
    const companyId = await resolveCompanyId(companyIdOrSlug)
    const bs = await FinanceService.getBalanceSheet(companyId, asOfDate, branchId)
    return { success: true, data: bs }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to compute Balance Sheet.' }
  }

})

export const getCashFlowAction = withTenantAction(
  {
    permission: "reports.view",
    entityType: "finance"
  },
  async (ctx, startDate?: string, endDate?: string, branchId?: string, companyIdOrSlug?: string) => {
  try {
    const companyId = await resolveCompanyId(companyIdOrSlug)
    const cf = await FinanceService.getCashFlow(companyId, startDate, endDate, branchId)
    return { success: true, data: cf }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to compute Cash Flow.' }
  }

})

export const getTrialBalanceAction = withTenantAction(
  {
    permission: "reports.view",
    entityType: "finance"
  },
  async (ctx, asOfDate?: string, branchId?: string, companyIdOrSlug?: string) => {
  try {
    const companyId = await resolveCompanyId(companyIdOrSlug)
    const tb = await FinanceService.getTrialBalance(companyId, asOfDate, branchId)
    return { success: true, data: tb }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to compute Trial Balance.' }
  }

})

export const getGeneralLedgerAction = withTenantAction(
  {
    permission: "reports.view",
    entityType: "finance"
  },
  async (ctx, options?: { accountId?: string; startDate?: string; endDate?: string; branchId?: string; companyIdOrSlug?: string }) => {
  try {
    const companyId = await resolveCompanyId(options?.companyIdOrSlug)
    const gl = await FinanceService.getGeneralLedger(companyId, options)
    return { success: true, data: gl }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch General Ledger.' }
  }

})

export const getReceivablesAgingAction = withTenantAction(
  {
    permission: "reports.view",
    entityType: "finance"
  },
  async (ctx, companyIdOrSlug?: string) => {
  try {
    const companyId = await resolveCompanyId(companyIdOrSlug)
    const aging = await FinanceService.getReceivablesAging(companyId)
    return { success: true, data: aging }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to compute receivables aging.' }
  }

})

export const getPayablesAgingAction = withTenantAction(
  {
    permission: "reports.view",
    entityType: "finance"
  },
  async (ctx, companyIdOrSlug?: string) => {
  try {
    const companyId = await resolveCompanyId(companyIdOrSlug)
    const aging = await FinanceService.getPayablesAging(companyId)
    return { success: true, data: aging }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to compute payables aging.' }
  }

})

export const getJobProfitabilityAction = withTenantAction(
  {
    permission: "reports.view",
    entityType: "finance"
  },
  async (ctx, companyIdOrSlug?: string) => {
  try {
    const companyId = await resolveCompanyId(companyIdOrSlug)
    const metrics = await FinanceService.getJobProfitability(companyId)
    return { success: true, data: metrics }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to compute job profitability.' }
  }

})

export const getBranchProfitabilityAction = withTenantAction(
  {
    permission: "reports.view",
    entityType: "finance"
  },
  async (ctx, period?: string, companyIdOrSlug?: string) => {
  try {
    const companyId = await resolveCompanyId(companyIdOrSlug)
    const metrics = await FinanceService.getBranchProfitability(companyId, period)
    return { success: true, data: metrics }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to compute branch profitability.' }
  }

})

export const getFinancialDashboardAction = withTenantAction(
  {
    permission: "reports.view",
    entityType: "finance"
  },
  async (ctx, options?: { startDate?: string; endDate?: string; branchId?: string; companyIdOrSlug?: string }) => {
  try {
    const companyId = await resolveCompanyId(options?.companyIdOrSlug)
    const dashboard = await FinanceService.getFinancialDashboard(companyId, options)
    return { success: true, data: dashboard }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch financial dashboard.' }
  }

})

export const getExpensesAction = withTenantAction(
  {
    permission: "payments.view",
    entityType: "finance"
  },
  async (ctx, options?: {
  startDate?: string
  endDate?: string
  category?: string
  employeeId?: string
  branchId?: string
  companyIdOrSlug?: string
}) => {
  try {
    const companyId = await resolveCompanyId(options?.companyIdOrSlug)
    const report = await FinanceService.getExpenses(companyId, options)
    return { success: true, data: report }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch expenses report.' }
  }

})

export const getTransactionsAction = withTenantAction(
  {
    permission: "payments.view",
    entityType: "finance"
  },
  async (ctx, options?: {
  startDate?: string
  endDate?: string
  type?: string
  status?: string
  accountId?: string
  branchId?: string
  companyIdOrSlug?: string
}) => {
  try {
    const companyId = await resolveCompanyId(options?.companyIdOrSlug)
    const txns = await FinanceService.getTransactions(companyId, options)
    return { success: true, data: txns }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch transactions.' }
  }

})

export const getCashClosingsAction = withTenantAction(
  {
    permission: "payments.view",
    entityType: "finance"
  },
  async (ctx, closingDate?: string, companyIdOrSlug?: string) => {
  try {
    const companyId = await resolveCompanyId(companyIdOrSlug)
    const closings = await FinanceService.getCashClosings(companyId, closingDate)
    return { success: true, data: closings }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch cash closings.' }
  }

})

