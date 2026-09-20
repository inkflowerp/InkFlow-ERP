import { createClient } from '../supabase/server.ts'
import type { FinishingOptionRecord } from '../../types/product.types.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'

export const DEFAULT_FINISHING_OPTIONS: Array<Omit<FinishingOptionRecord, 'id' | 'company_id' | 'created_at' | 'updated_at'>> = [
  {
    name: 'Glossy Lamination',
    name_bn: 'গ্লসি লেমিনেশন',
    category: 'lamination',
    pricing_method: 'sqft',
    selling_price: 15.0,
    cost: 7.0,
    is_active: true,
  },
  {
    name: 'Matte Lamination',
    name_bn: 'ম্যাট লেমিনেশন',
    category: 'lamination',
    pricing_method: 'sqft',
    selling_price: 15.0,
    cost: 7.0,
    is_active: true,
  },
  {
    name: 'Sparkle / 3D Lamination',
    name_bn: 'স্পার্কল / ৩ডি লেমিনেশন',
    category: 'lamination',
    pricing_method: 'sqft',
    selling_price: 25.0,
    cost: 12.0,
    is_active: true,
  },
  {
    name: 'Eyelet Punching',
    name_bn: 'আইলেট / রিং পাঞ্চ',
    category: 'hardware',
    pricing_method: 'per_piece',
    selling_price: 5.0,
    cost: 1.5,
    is_active: true,
  },
  {
    name: 'Hemming & Rope Insertion',
    name_bn: 'হেমিং ও দড়ি লাগানো',
    category: 'sewing',
    pricing_method: 'per_linear_ft',
    selling_price: 8.0,
    cost: 3.0,
    is_active: true,
  },
  {
    name: 'MS Metal Frame Fabrication',
    name_bn: 'এমএস ফ্রেম তৈরি',
    category: 'fabrication',
    pricing_method: 'sqft',
    selling_price: 65.0,
    cost: 35.0,
    is_active: true,
  },
]

export class FinishingOptionRepository {
  static async getFinishingOptions(
    companyId: string,
    options?: { includeInactive?: boolean }
  ): Promise<FinishingOptionRecord[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('finishing_options')
        .select('*')
        .eq('company_id', companyId)
        .order('name', { ascending: true })

      if (!options?.includeInactive) {
        query = query.eq('is_active', true)
      }

      if (!error && data) {
        return data as FinishingOptionRecord[]
      }
    } catch {
      // Fallback
    }

    const all = PrintERPDataStore.get<FinishingOptionRecord[]>(
      STORAGE_KEYS.FINISHING_OPTIONS,
      companyId
    ) || []

    return options?.includeInactive ? all : all.filter((d) => d.is_active)
  }

  static async seedDefaultOptions(companyId: string): Promise<FinishingOptionRecord[]> {
    try {
      const supabase = await createClient()
      const recordsToInsert = DEFAULT_FINISHING_OPTIONS.map((d) => ({
        ...d,
        company_id: companyId,
      }))

      const { data, error } = await (supabase as any)
        .from('finishing_options')
        .insert(recordsToInsert)
        .select('*')

      if (!error && data) {
        return data as FinishingOptionRecord[]
      }
    } catch {}

    const now = new Date().toISOString()
    const defaults: FinishingOptionRecord[] = DEFAULT_FINISHING_OPTIONS.map((d, idx) => ({
      ...d,
      id: `fin-seed-${idx + 1}`,
      company_id: companyId,
      created_at: now,
      updated_at: now,
    }))
    defaults.forEach((item) =>
      PrintERPDataStore.addItem<FinishingOptionRecord>(STORAGE_KEYS.FINISHING_OPTIONS, item, companyId)
    )
    return defaults
  }

  static async save(
    input: Partial<FinishingOptionRecord> & { company_id: string; name: string }
  ): Promise<FinishingOptionRecord> {
    if (input.id) {
      const updated = await this.updateFinishingOption(input.company_id, input.id, input)
      if (updated) return updated
    }
    return this.createFinishingOption(input.company_id, input)
  }

  static async createFinishingOption(
    companyId: string,
    input: Partial<FinishingOptionRecord>
  ): Promise<FinishingOptionRecord> {
    const payload = {
      company_id: companyId,
      name: input.name || 'New Finishing',
      name_bn: input.name_bn || null,
      category: input.category || 'general',
      pricing_method: input.pricing_method || 'sqft',
      selling_price: Number(input.selling_price) || 0,
      cost: Number(input.cost) || 0,
      material_id: input.material_id || null,
      is_active: input.is_active !== undefined ? input.is_active : true,
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('finishing_options')
        .insert(payload)
        .select('*')
        .single()

      if (!error && data) {
        return data as FinishingOptionRecord
      }
    } catch {
      // Fallback
    }

    const localRecord: FinishingOptionRecord = {
      ...payload,
      id: `fin-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<FinishingOptionRecord>(
      STORAGE_KEYS.FINISHING_OPTIONS,
      localRecord,
      companyId
    )
    return localRecord
  }

  static async updateFinishingOption(
    companyId: string,
    id: string,
    input: Partial<FinishingOptionRecord>
  ): Promise<FinishingOptionRecord | null> {
    const updates = {
      ...input,
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('finishing_options')
        .update(updates)
        .eq('company_id', companyId)
        .eq('id', id)
        .select('*')
        .single()

      if (!error && data) {
        return data as FinishingOptionRecord
      }
    } catch {
      // Fallback
    }

    return PrintERPDataStore.updateItem<FinishingOptionRecord>(
      STORAGE_KEYS.FINISHING_OPTIONS,
      id,
      updates,
      companyId
    )
  }

  static async deleteFinishingOption(
    companyId: string,
    id: string
  ): Promise<boolean> {
    try {
      const supabase = await createClient()
      const { error } = await (supabase as any)
        .from('finishing_options')
        .delete()
        .eq('company_id', companyId)
        .eq('id', id)

      if (!error) return true
    } catch {
      // Fallback
    }

    PrintERPDataStore.removeItem<FinishingOptionRecord>(STORAGE_KEYS.FINISHING_OPTIONS, id, companyId)
    return true
  }
}
