'use server'

import { revalidatePath } from 'next/cache'
import { InventoryService } from '@/services/inventory.service'
import { AuditService } from '@/services/audit.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import { StockLedgerRecord, MaterialRecord } from '@/types/inventory.types'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Server Action: Securely adjusts material stock with atomic transaction & non-negative check
 */
export async function adjustStockAction(
  adjustment: {
    material_id: string
    quantity_change: number
    reason: string
    entry_type?: 'purchase_receive' | 'production_issue' | 'rework_issue' | 'manual_correction' | 'stock_take' | 'return_to_supplier'
    cost_per_unit?: number
    reference_id?: string
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<StockLedgerRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId || !tenant) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    const hasPermission =
      tenant.companyRole === 'business_owner' ||
      tenant.permissions.includes('*') ||
      tenant.permissions.includes('inventory.adjust') ||
      tenant.permissions.includes('inventory.edit')

    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: You do not have permission to adjust inventory stock.' }
    }

    if (!adjustment.material_id) {
      return { success: false, error: 'Material ID is required.' }
    }

    if (!adjustment.reason || adjustment.reason.trim().length < 3) {
      return { success: false, error: 'A clear reason is required for stock adjustment.' }
    }

    const ledgerEntry = await InventoryService.recordStockAdjustment({
      company_id: companyId,
      material_id: adjustment.material_id,
      quantity_change: adjustment.quantity_change,
      reason: adjustment.reason,
      performed_by_name: tenant.fullName || 'Inventory Officer',
      entry_type: adjustment.entry_type || 'manual_correction',
      cost_per_unit: adjustment.cost_per_unit,
      reference_id: adjustment.reference_id,
    })

    await AuditService.trackInventoryAdjustment(
      companyId,
      tenant.userId,
      tenant.userEmail,
      adjustment.material_id,
      ledgerEntry.balance_after - adjustment.quantity_change,
      ledgerEntry.balance_after,
      adjustment.reason
    )

    revalidatePath('/', 'layout')
    return { success: true, data: ledgerEntry }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to adjust inventory stock' }
  }
}
