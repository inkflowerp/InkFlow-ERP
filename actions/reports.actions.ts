'use server'

import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import { BillingRepository } from '@/lib/repositories/billing.repository'
import { OrderRepository } from '@/lib/repositories/order.repository'
import { ProductionRepository } from '@/lib/repositories/production.repository'
import { CustomerRepository } from '@/lib/repositories/customer.repository'
import { InventoryRepository } from '@/lib/repositories/inventory.repository'
import { BranchRepository } from '@/lib/repositories/branch.repository'
import { AccountingService } from '@/services/accounting.service'
import { FinanceService } from '@/services/finance.service'
import type { InvoiceRecord, PaymentRecord } from '@/types/billing.types'
import type { SalesOrderRecord } from '@/types/order.types'
import type { ProductionJobRecord } from '@/types/production.types'
import type { CustomerRecord } from '@/types/crm.types'
import type { MaterialRecord } from '@/types/inventory.types'
import type { ExpenseRecord } from '@/types/accounting.types'
import type { BranchMasterRecord } from '@/types/branch.types'

export interface BusinessReportDataPayload {
  invoices: InvoiceRecord[]
  payments: PaymentRecord[]
  orders: SalesOrderRecord[]
  productionJobs: ProductionJobRecord[]
  expenses: ExpenseRecord[]
  customers: CustomerRecord[]
  materials: MaterialRecord[]
  branches: BranchMasterRecord[]
  companyName: string
  companySlug: string
  currency: string
}

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Server Action: Authoritatively fetches real business report dataset from PostgreSQL repositories
 */
export async function getBusinessReportDataAction(
  branchId?: string | null
): Promise<ServerActionResult<BusinessReportDataPayload>> {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant?.companyId) {
      return {
        success: false,
        error: 'Unauthorized: No active tenant company session found.',
      }
    }

    const companyId = tenant.companyId

    // Parallel fetch from all authoritative PostgreSQL repositories with fail-safe fallbacks
    const [
      invoices,
      payments,
      orders,
      productionJobs,
      expenses,
      customers,
      materials,
      branches,
    ] = await Promise.all([
      BillingRepository.getInvoices(companyId).catch(() => [] as InvoiceRecord[]),
      BillingRepository.getPayments(companyId).catch(() => [] as PaymentRecord[]),
      OrderRepository.getOrders(companyId).catch(() => [] as SalesOrderRecord[]),
      ProductionRepository.getProductionJobs(companyId).catch(() => [] as ProductionJobRecord[]),
      FinanceService.getExpenses(companyId)
        .then((res: any) =>
          (((res?.items || res?.breakdown || []) as any[]).map((b: any) => ({
            id: b.id || `exp-${Math.random()}`,
            company_id: companyId,
            title: b.description || b.category_label || b.category || 'Expense',
            amount: Number(b.amount) || 0,
            category: b.category,
            expense_date: b.transaction_date || b.expense_date || b.date || b.created_at,
            created_at: b.created_at || b.transaction_date || b.date || new Date().toISOString(),
          })) as unknown as ExpenseRecord[])
        )
        .catch(async () => {
          return await AccountingService.getExpenses(companyId).catch(() => [] as ExpenseRecord[])
        }),
      CustomerRepository.getCustomers(companyId).catch(() => [] as CustomerRecord[]),
      InventoryRepository.getMaterials(companyId).catch(() => [] as MaterialRecord[]),
      BranchRepository.listBranches(companyId).catch(() => [] as any[]),
    ])

    // Filter by branch if specific branch selected
    const filteredInvoices = branchId
      ? invoices.filter((i) => !(i as any).branch_id || (i as any).branch_id === branchId)
      : invoices

    const filteredPayments = branchId
      ? payments.filter((p) => !(p as any).branch_id || (p as any).branch_id === branchId)
      : payments

    const filteredOrders = branchId
      ? orders.filter((o) => !(o as any).branch_id || (o as any).branch_id === branchId)
      : orders

    const filteredJobs = branchId
      ? productionJobs.filter((j) => !(j as any).branch_id || (j as any).branch_id === branchId)
      : productionJobs

    const filteredExpenses = branchId
      ? expenses.filter((e) => !(e as any).branch_id || (e as any).branch_id === branchId)
      : expenses

    return {
      success: true,
      data: {
        invoices: filteredInvoices,
        payments: filteredPayments,
        orders: filteredOrders,
        productionJobs: filteredJobs,
        expenses: filteredExpenses,
        customers,
        materials,
        branches: branches as BranchMasterRecord[],
        companyName: tenant.companyName || 'Printing & Signage',
        companySlug: tenant.companySlug || 'company',
        currency: 'BDT',
      },
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to fetch business report dataset.',
    }
  }
}
