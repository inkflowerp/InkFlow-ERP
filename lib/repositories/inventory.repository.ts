import { createClient } from '@/lib/supabase/server'
import {
  MaterialRecord,
  InventoryRollRecord,
  StockLedgerRecord,
  MaterialWastageRecord,
} from '@/types/inventory.types'

export class InventoryRepository {
  static async getMaterials(companyId: string): Promise<MaterialRecord[]> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('materials')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch materials: ${error.message}`)
    }
    return (data || []) as unknown as MaterialRecord[]
  }

  static async getMaterialById(id: string, companyId: string): Promise<MaterialRecord | null> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('materials')
      .select('*')
      .or(`id.eq.${id},sku.eq.${id}`)
      .eq('company_id', companyId)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to fetch material ${id}: ${error.message}`)
    }
    return (data as unknown as MaterialRecord) || null
  }

  static async createMaterial(material: Partial<MaterialRecord> & {
    company_id: string
    sku: string
    name: string
    category: any
    unit: any
  }): Promise<MaterialRecord> {
    const supabase = await createClient()
    const payload: any = {
      company_id: material.company_id,
      sku: material.sku.trim(),
      name: material.name.trim(),
      name_bn: material.name_bn?.trim() || null,
      category: material.category,
      unit: material.unit,
      is_roll: Boolean(material.is_roll),
      roll_width_ft: material.roll_width_ft || null,
      roll_length_ft: material.roll_length_ft || null,
      total_roll_area_sft: material.roll_width_ft && material.roll_length_ft ? material.roll_width_ft * material.roll_length_ft : null,
      current_stock: material.current_stock || 0,
      min_stock_level: material.min_stock_level || 0,
      coverage_rate_sft_per_unit: material.coverage_rate_sft_per_unit || null,
      last_purchase_price: material.last_purchase_price || 0,
      average_cost: material.average_cost || 0,
      manual_cost: material.manual_cost || 0,
      valuation_method: material.valuation_method || 'average_cost',
      location: material.location?.trim() || null,
    }

    if (material.id) {
      payload.id = material.id
    }

    const { data, error } = await (supabase as any)
      .from('materials')
      .insert(payload)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create material: ${error.message}`)
    }
    return data as unknown as MaterialRecord
  }

  static async updateMaterial(id: string, updates: Partial<MaterialRecord>, companyId: string): Promise<MaterialRecord> {
    const supabase = await createClient()
    const payload: any = { ...updates, updated_at: new Date().toISOString() }
    delete payload.id
    delete payload.company_id

    const { data, error } = await (supabase as any)
      .from('materials')
      .update(payload)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update material: ${error.message}`)
    }
    return data as unknown as MaterialRecord
  }

  /**
   * Atomic Inventory Mutation & Stock Ledger Insertion
   * Rejects any transaction that would reduce stock below zero (No silent clamping!)
   */
  static async recordStockAdjustment(params: {
    company_id: string
    material_id: string
    quantity_change: number
    transaction_type: 'purchase' | 'consumption' | 'adjustment' | 'return' | 'wastage' | 'transfer' | 'opening_stock'
    unit_cost?: number
    reference_id?: string | null
    notes?: string | null
    performed_by_name: string
  }): Promise<{ material: MaterialRecord; ledgerEntry: StockLedgerRecord }> {
    const supabase = await createClient()

    // 1. Fetch live material under tenant isolation
    const material = await this.getMaterialById(params.material_id, params.company_id)
    if (!material) {
      throw new Error(`Material with ID ${params.material_id} not found.`)
    }

    const currentStock = Number(material.current_stock) || 0
    const newStock = currentStock + params.quantity_change

    // 2. Strict non-negative stock verification
    if (newStock < 0) {
      throw new Error(
        `Inventory integrity violation: Operation rejected. Requested change (${params.quantity_change} ${material.unit}) would result in negative stock (${newStock} ${material.unit}). Current stock is ${currentStock} ${material.unit}.`
      )
    }

    const unitCost = params.unit_cost !== undefined ? params.unit_cost : Number(material.average_cost) || 0
    const totalCost = Math.abs(params.quantity_change) * unitCost

    // 3. Insert immutable stock ledger entry
    const { data: ledgerEntry, error: ledgerErr } = await (supabase as any)
      .from('stock_ledger')
      .insert({
        company_id: params.company_id,
        material_id: material.id,
        transaction_type: params.transaction_type,
        quantity_change: params.quantity_change,
        unit: material.unit,
        balance_after: newStock,
        unit_cost: unitCost,
        total_cost: totalCost,
        reference_id: params.reference_id || null,
        notes: params.notes || null,
        performed_by_name: params.performed_by_name,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (ledgerErr) {
      throw new Error(`Failed to record stock ledger entry: ${ledgerErr.message}`)
    }

    // 4. Update material stock atomically
    const { data: updatedMaterial, error: updateErr } = await (supabase as any)
      .from('materials')
      .update({
        current_stock: newStock,
        updated_at: new Date().toISOString(),
      })
      .eq('id', material.id)
      .eq('company_id', params.company_id)
      .select()
      .single()

    if (updateErr) {
      throw new Error(`Failed to update material stock: ${updateErr.message}`)
    }

    return {
      material: updatedMaterial as unknown as MaterialRecord,
      ledgerEntry: ledgerEntry as unknown as StockLedgerRecord,
    }
  }

  static async getStockLedger(companyId: string, materialId?: string): Promise<StockLedgerRecord[]> {
    const supabase = await createClient()
    let query = (supabase as any)
      .from('stock_ledger')
      .select('*, material:materials(name, sku)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (materialId) {
      query = query.eq('material_id', materialId)
    }

    const { data, error } = await query
    if (error) {
      throw new Error(`Failed to fetch stock ledger: ${error.message}`)
    }
    return (data || []) as unknown as StockLedgerRecord[]
  }

  static async getInventoryRolls(companyId: string): Promise<InventoryRollRecord[]> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('inventory_rolls')
      .select('*, material:materials!inner(company_id, name, sku)')
      .eq('materials.company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch inventory rolls: ${error.message}`)
    }
    return (data || []) as unknown as InventoryRollRecord[]
  }
}
