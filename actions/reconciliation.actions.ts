'use server'

import { withTenantAction } from '@/lib/actions/action-wrapper'
import { revalidatePath } from 'next/cache'
import { FinanceRepository } from '@/lib/repositories/finance.repository'

export interface DriftItem {
  id: string
  name: string
  stored_due?: number
  ledger_due?: number
  stored_stock?: number
  ledger_stock?: number
  variance: number
}

export interface FinancialDriftReport {
  has_drift: boolean
  customer_drifts: DriftItem[]
  stock_drifts: DriftItem[]
  scanned_at: string
}

export interface ReconciliationResult {
  success: boolean
  reconciled_customers: number
  reconciled_stock_items: number
  drift_detected_count: number
  total_drift_amount: number
  timestamp: string
  error?: string
}

/**
 * Server Action: Get Realtime Financial & Stock Drift Report
 */
export const getFinancialDriftReportAction = withTenantAction(
  {
    permission: 'accounting.view',
    entityType: 'financial_reconciliation',
  },
  async (ctx, requestedCompanyId?: string) => {
    try {
      const companyId = ctx.companyId
      const data = await FinanceRepository.getFinancialDriftReport(companyId)

      return {
        success: true,
        data: data as FinancialDriftReport,
      }
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to generate financial drift report',
      }
    }
  }
)

/**
 * Server Action: Execute Atomic Ledger Reconciliation
 */
export const runReconciliationAction = withTenantAction(
  {
    permission: 'accounting.manage',
    entityType: 'financial_reconciliation',
  },
  async (ctx, requestedCompanyId?: string) => {
    try {
      const companyId = ctx.companyId
      const reconData = await FinanceRepository.runReconciliation(companyId)

      revalidatePath(`/${ctx.companySlug}/accounting`, 'layout')
      revalidatePath(`/${ctx.companySlug}/dashboard`, 'layout')

      return {
        success: true,
        data: {
          ...reconData,
          success: true,
        } as ReconciliationResult,
      }
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to execute ledger reconciliation',
      }
    }
  }
)
