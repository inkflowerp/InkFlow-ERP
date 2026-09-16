import { createClient } from '../supabase/server.ts'
import type { MaterialPurchaseConfig } from '../../types/product.types.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'

export class MaterialPurchaseConfigRepository {
  static async getConfigsByMaterial(
    companyId: string,
    materialId: string,
    options?: { includeInactive?: boolean }
  ): Promise<MaterialPurchaseConfig[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('material_purchase_configs')
        .select('*')
        .eq('company_id', companyId)
        .eq('material_id', materialId)
        .order('width_ft', { ascending: true })

      if (!options?.includeInactive) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (!error && data && data.length > 0) {
        return data as MaterialPurchaseConfig[]
      }
    } catch {
      // Fallback
    }

    const all = PrintERPDataStore.getAll<MaterialPurchaseConfig>(STORAGE_KEYS.MATERIAL_PURCHASE_CONFIGS, companyId)
      .filter((c: MaterialPurchaseConfig) => (!c.company_id || c.company_id === companyId) && c.material_id === materialId)

    return options?.includeInactive ? all : all.filter((c: MaterialPurchaseConfig) => c.is_active)
  }

  static async getByMaterial(
    materialId: string,
    companyId: string,
    options?: { includeInactive?: boolean }
  ): Promise<MaterialPurchaseConfig[]> {
    return this.getConfigsByMaterial(companyId, materialId, options)
  }

  static async getAllConfigs(
    companyId: string,
    options?: { includeInactive?: boolean }
  ): Promise<MaterialPurchaseConfig[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('material_purchase_configs')
        .select('*')
        .eq('company_id', companyId)
        .order('config_name', { ascending: true })

      if (!options?.includeInactive) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (!error && data && data.length > 0) {
        return data as MaterialPurchaseConfig[]
      }
    } catch {
      // Fallback
    }

    const all = PrintERPDataStore.getAll<MaterialPurchaseConfig>(STORAGE_KEYS.MATERIAL_PURCHASE_CONFIGS, companyId)
      .filter((c: MaterialPurchaseConfig) => !c.company_id || c.company_id === companyId)

    return options?.includeInactive ? all : all.filter((c: MaterialPurchaseConfig) => c.is_active)
  }

  static async save(
    input: Partial<MaterialPurchaseConfig> & { company_id: string; material_id: string }
  ): Promise<MaterialPurchaseConfig> {
    if (input.id) {
      const updated = await this.updateConfig(input.company_id, input.id, input)
      if (updated) return updated
    }
    return this.createConfig(input.company_id, input)
  }

  static async createConfig(
    companyId: string,
    input: Partial<MaterialPurchaseConfig>
  ): Promise<MaterialPurchaseConfig> {
    const payload = {
      company_id: companyId,
      material_id: input.material_id || '',
      supplier_id: input.supplier_id || null,
      supplier_name: (input as any).supplier_name || null,
      config_name: input.config_name || `${input.width_ft || 4}ft × ${input.length_ft || 164}ft Roll`,
      width_ft: Number(input.width_ft) || 4.0,
      length_ft: Number(input.length_ft) || 164.0,
      unit: input.unit || 'roll',
      purchase_price: Number(input.purchase_price) || 0,
      item_code_sku: input.item_code_sku || null,
      is_default: Boolean(input.is_default),
      is_active: input.is_active !== undefined ? input.is_active : true,
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('material_purchase_configs')
        .insert(payload)
        .select('*')
        .single()

      if (!error && data) {
        return data as MaterialPurchaseConfig
      }
    } catch {
      // Fallback
    }

    const localRecord: MaterialPurchaseConfig = {
      ...payload,
      id: `mpc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<MaterialPurchaseConfig>(
      STORAGE_KEYS.MATERIAL_PURCHASE_CONFIGS,
      localRecord,
      companyId
    )

    return localRecord
  }

  static async updateConfig(
    companyId: string,
    id: string,
    input: Partial<MaterialPurchaseConfig>
  ): Promise<MaterialPurchaseConfig | null> {
    const updates = {
      ...input,
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('material_purchase_configs')
        .update(updates)
        .eq('company_id', companyId)
        .eq('id', id)
        .select('*')
        .single()

      if (!error && data) {
        return data as MaterialPurchaseConfig
      }
    } catch {
      // Fallback
    }

    return PrintERPDataStore.updateItem<MaterialPurchaseConfig>(
      STORAGE_KEYS.MATERIAL_PURCHASE_CONFIGS,
      id,
      updates,
      companyId
    )
  }

  static async deleteConfig(
    companyId: string,
    id: string
  ): Promise<boolean> {
    try {
      const supabase = await createClient()
      const { error } = await (supabase as any)
        .from('material_purchase_configs')
        .delete()
        .eq('company_id', companyId)
        .eq('id', id)

      if (!error) return true
    } catch {
      // Fallback
    }

    PrintERPDataStore.removeItem<MaterialPurchaseConfig>(STORAGE_KEYS.MATERIAL_PURCHASE_CONFIGS, id, companyId)
    return true
  }
}
