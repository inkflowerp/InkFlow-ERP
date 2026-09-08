// ==============================================================================
// PrintERP / InkFlow SaaS - Inventory & Material Management Service
// Authoritative PostgreSQL persistence via InventoryRepository
// ==============================================================================

import {
  MaterialRecord,
  InventoryRollRecord,
  StockLedgerRecord,
  MaterialWastageRecord,
} from '@/types/inventory.types'
import { InventoryRepository } from '@/lib/repositories/inventory.repository'
import { AuditRepository } from '@/lib/repositories/audit.repository'

/**
 * Data Integrity: Records an inventory adjustment via immutable stock ledger with non-negative guarantee
 */
export async function recordInventoryAdjustment(
  companyId: string,
  materialId: string,
  quantityChange: number,
  reason: string,
  performedByName: string,
  actorEmail?: string
): Promise<{ success: boolean; newStock?: number; ledgerEntry?: StockLedgerRecord; error?: string }> {
  try {
    const result = await InventoryRepository.recordStockAdjustment({
      company_id: companyId,
      material_id: materialId,
      quantity_change: quantityChange,
      transaction_type: quantityChange >= 0 ? 'adjustment' : 'wastage',
      notes: reason,
      performed_by_name: performedByName,
    })

    // Audit log
    await AuditRepository.logEvent({
      companyId,
      userEmail: actorEmail || performedByName,
      action: 'inventory.adjust',
      entity: 'inventory',
      entityId: materialId,
      newValue: {
        sku: result.material.sku,
        new_stock: result.material.current_stock,
        change: quantityChange,
        reason,
      },
      description: `Adjusted stock for ${result.material.name} (${result.material.sku}): ${quantityChange > 0 ? '+' : ''}${quantityChange} ${result.material.unit}. Reason: ${reason}`,
    })

    return {
      success: true,
      newStock: Number(result.material.current_stock),
      ledgerEntry: result.ledgerEntry,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to adjust inventory stock',
    }
  }
}

export class InventoryService {
  static async getMaterials(companyId: string): Promise<MaterialRecord[]> {
    if (!companyId) return []
    return await InventoryRepository.getMaterials(companyId)
  }

  static async getMaterialById(id: string, companyId: string): Promise<MaterialRecord | null> {
    if (!id || !companyId) return null
    return await InventoryRepository.getMaterialById(id, companyId)
  }

  static async createMaterial(data: Partial<MaterialRecord> & {
    company_id: string
    sku: string
    name: string
    category: any
    unit: any
  }): Promise<MaterialRecord> {
    if (!data.company_id) {
      throw new Error('Company context is required to create a material.')
    }
    return await InventoryRepository.createMaterial(data)
  }

  static async updateMaterial(id: string, data: Partial<MaterialRecord>, companyId: string): Promise<MaterialRecord | null> {
    if (!id || !companyId) return null
    return await InventoryRepository.updateMaterial(id, data, companyId)
  }

  static async getStockLedger(companyId: string, materialId?: string): Promise<StockLedgerRecord[]> {
    if (!companyId) return []
    return await InventoryRepository.getStockLedger(companyId, materialId)
  }

  static async getInventoryRolls(companyId: string): Promise<InventoryRollRecord[]> {
    if (!companyId) return []
    return await InventoryRepository.getInventoryRolls(companyId)
  }

  static async recordStockAdjustment(params: {
    company_id: string
    material_id: string
    quantity_change: number
    reason?: string
    notes?: string
    performed_by_name: string
    entry_type?: any
    cost_per_unit?: number
    reference_id?: string
  }): Promise<StockLedgerRecord> {
    const result = await InventoryRepository.recordStockAdjustment({
      company_id: params.company_id,
      material_id: params.material_id,
      quantity_change: params.quantity_change,
      transaction_type: params.quantity_change >= 0 ? 'adjustment' : 'wastage',
      unit_cost: params.cost_per_unit,
      reference_id: params.reference_id,
      notes: params.notes || params.reason,
      performed_by_name: params.performed_by_name,
    })
    return result.ledgerEntry
  }
}
