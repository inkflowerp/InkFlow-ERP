'use server'

// ==============================================================================
// InkFlow ERP - Authoritative Finance Server Actions (V6)
// ==============================================================================

import { FinanceService } from '@/services/finance.service'
import { getTenantCompanyId } from '@/lib/auth/tenant-auth'
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
  vendorName?: string | null
  description: string
  expenseDate?: string
}) {
  try {
    const companyId = await getTenantCompanyId()
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
    const transfer = await FinanceService.recordTransfer({
      companyId,
      ...params,
    })
    return { success: true, data: transfer }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to record transfer.' }
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

export async function getProfitAndLossAction(startDate?: string, endDate?: string) {
  try {
    const companyId = await getTenantCompanyId()
    const pnl = await FinanceService.getProfitAndLoss(companyId, startDate, endDate)
    return { success: true, data: pnl }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to compute P&L.' }
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

export async function getFinancialDashboardAction() {
  try {
    const companyId = await getTenantCompanyId()
    const dashboard = await FinanceService.getFinancialDashboard(companyId)
    return { success: true, data: dashboard }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch financial dashboard.' }
  }
}
