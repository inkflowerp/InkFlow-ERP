import {
  MaterialRecord,
  InventoryRollRecord,
  StockLedgerRecord,
  MaterialWastageRecord,
} from '@/types/inventory.types'

import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

/**
 * Data Integrity: Records an inventory adjustment via immutable stock ledger
 */
export async function recordInventoryAdjustment(
  companyId: string,
  materialId: string,
  quantityChange: number,
  reason: string,
  performedByName: string,
  actorEmail?: string
): Promise<{ success: boolean; newStock?: number; ledgerEntry?: StockLedgerRecord; error?: string }> {
  const materials = PrintERPDataStore.get<MaterialRecord[]>(STORAGE_KEYS.MATERIALS) || []
  const material = materials.find((m) => m.id === materialId)
  if (!material) {
    return { success: false, error: 'Material not found' }
  }

  const prevStock = material.current_stock
  const newStock = prevStock + quantityChange

  if (newStock < 0) {
    return { success: false, error: 'Inventory integrity violation: Stock cannot drop below zero' }
  }

  const ledgerEntry: StockLedgerRecord = {
    id: `sl-${Date.now()}`,
    company_id: companyId,
    material_id: materialId,
    material_name: material.name,
    transaction_type: quantityChange >= 0 ? 'adjustment' : 'wastage',
    quantity_change: quantityChange,
    unit: material.unit,
    balance_after: newStock,
    unit_cost: material.average_cost,
    total_cost: Math.abs(quantityChange) * material.average_cost,
    reference_id: `ADJ-${Date.now().toString().slice(-4)}`,
    notes: reason,
    performed_by_name: performedByName,
    created_at: new Date().toLocaleString(),
  }

  PrintERPDataStore.updateItem<MaterialRecord>(STORAGE_KEYS.MATERIALS, materialId, { current_stock: newStock })
  PrintERPDataStore.addItem(STORAGE_KEYS.STOCK_LEDGER, ledgerEntry)

  // Dynamic import or direct audit call
  try {
    const { AuditService } = await import('@/services/audit.service')
    await AuditService.trackInventoryAdjustment(
      companyId,
      performedByName,
      actorEmail || performedByName,
      material.sku,
      prevStock,
      newStock,
      reason
    )
  } catch {
    // Pass
  }

  return { success: true, newStock, ledgerEntry }
}


export class InventoryService {
  static async getMaterials(companyId: string = 'c-01'): Promise<MaterialRecord[]> {
    const materials = PrintERPDataStore.get<MaterialRecord[]>(STORAGE_KEYS.MATERIALS) || []
    return materials.filter((m) => !m.company_id || m.company_id === companyId)
  }

  static async getMaterialById(id: string, companyId: string = 'c-01'): Promise<MaterialRecord | null> {
    const materials = await this.getMaterials(companyId)
    return materials.find((m) => m.id === id || m.sku === id) || null
  }

  static async createMaterial(data: Partial<MaterialRecord>): Promise<MaterialRecord> {
    const id = data.id || `mat-${Date.now()}`
    const newMaterial: MaterialRecord = {
      id,
      company_id: data.company_id || 'c-01',
      sku: data.sku || `MAT-${Date.now().toString().slice(-4)}`,
      name: data.name || 'Material Item',
      name_bn: data.name_bn || null,
      category: data.category || 'roll_media',
      unit: data.unit || 'sft',
      is_roll: data.is_roll !== undefined ? data.is_roll : true,
      roll_width_ft: data.roll_width_ft || 10,
      roll_length_ft: data.roll_length_ft || 164,
      total_roll_area_sft: (data.roll_width_ft || 10) * (data.roll_length_ft || 164),
      current_stock: data.current_stock || 10,
      min_stock_level: data.min_stock_level || 3,
      last_purchase_price: data.last_purchase_price || 15000,
      average_cost: data.average_cost || 14800,
      manual_cost: data.manual_cost || 15000,
      valuation_method: data.valuation_method || 'average_cost',
      location: data.location || 'Warehouse Main Rack',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, newMaterial)
    return newMaterial
  }

  static async updateMaterial(id: string, data: Partial<MaterialRecord>): Promise<MaterialRecord | null> {
    return PrintERPDataStore.updateItem<MaterialRecord>(STORAGE_KEYS.MATERIALS, id, data)
  }

  static async deleteMaterial(id: string): Promise<boolean> {
    return PrintERPDataStore.removeItem(STORAGE_KEYS.MATERIALS, id)
  }

  static async getMountedRolls(): Promise<InventoryRollRecord[]> {
    return PrintERPDataStore.get<InventoryRollRecord[]>(STORAGE_KEYS.MOUNTED_ROLLS) || []
  }

  static async mountRoll(data: Partial<InventoryRollRecord>): Promise<InventoryRollRecord> {
    const roll: InventoryRollRecord = {
      id: `roll-${Date.now()}`,
      material_id: data.material_id || 'mat-01',
      roll_tag: data.roll_tag || `ROLL-${Date.now().toString().slice(-4)}`,
      width_ft: data.width_ft || 10,
      initial_length_ft: data.initial_length_ft || 164,
      initial_area_sft: (data.width_ft || 10) * (data.initial_length_ft || 164),
      consumed_area_sft: 0,
      remaining_area_sft: (data.width_ft || 10) * (data.initial_length_ft || 164),
      status: 'mounted',
      mounted_press_name: data.mounted_press_name || 'Flora 3200 UV Press',
      created_at: new Date().toLocaleString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.MOUNTED_ROLLS, roll)
    return roll
  }

  static async getStockLedger(): Promise<StockLedgerRecord[]> {
    return PrintERPDataStore.get<StockLedgerRecord[]>(STORAGE_KEYS.STOCK_LEDGER) || []
  }

  static async adjustStock(
    materialId: string,
    quantityChange: number,
    reason: string,
    performedByName: string = 'Current User'
  ) {
    const mat = PrintERPDataStore.findItem<MaterialRecord>(STORAGE_KEYS.MATERIALS, materialId)
    if (!mat) return null
    const newStock = Math.max(0, mat.current_stock + quantityChange)
    PrintERPDataStore.updateItem<MaterialRecord>(STORAGE_KEYS.MATERIALS, materialId, { current_stock: newStock })

    const ledgerEntry: StockLedgerRecord = {
      id: `led-${Date.now()}`,
      company_id: mat.company_id,
      material_id: mat.id,
      material_name: mat.name,
      transaction_type: quantityChange >= 0 ? 'adjustment' : 'wastage',
      quantity_change: quantityChange,
      unit: mat.unit,
      balance_after: newStock,
      unit_cost: mat.average_cost,
      total_cost: Math.abs(quantityChange) * mat.average_cost,
      reference_id: `ADJ-${Date.now().toString().slice(-4)}`,
      notes: reason,
      performed_by_name: performedByName,
      created_at: new Date().toLocaleString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.STOCK_LEDGER, ledgerEntry)
    return { success: true, newStock, ledgerEntry }
  }
}


