import { createClient } from '../supabase/server.ts'
import type { AdditionalOptionRecord } from '../../types/product.types.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'

export const DEFAULT_ADDITIONAL_OPTIONS: Array<Omit<AdditionalOptionRecord, 'id' | 'company_id' | 'created_at' | 'updated_at'>> = [
  {
    name: '3mm PVC Board Pasting',
    name_bn: '৩মিমি পিভিসি বোর্ড পেস্টিং',
    pricing_method: 'sqft',
    selling_price: 45.0,
    cost: 25.0,
    is_active: true,
  },
  {
    name: '5mm PVC Board Pasting',
    name_bn: '৫মিমি পিভিসি বোর্ড পেস্টিং',
    pricing_method: 'sqft',
    selling_price: 70.0,
    cost: 40.0,
    is_active: true,
  },
  {
    name: '5mm Acrylic Board Mounting',
    name_bn: '৫মিমি অ্যাক্রিলিক বোর্ড মাউন্টিং',
    pricing_method: 'sqft',
    selling_price: 180.0,
    cost: 110.0,
    is_active: true,
  },
  {
    name: 'X-Stand Hardware Stand (2ft × 5ft)',
    name_bn: 'এক্স-স্ট্যান্ড হার্ডওয়্যার',
    pricing_method: 'per_piece',
    selling_price: 450.0,
    cost: 280.0,
    is_active: true,
  },
  {
    name: 'Roll-up Stand Hardware (2.5ft × 6ft)',
    name_bn: 'রোল-আপ স্ট্যান্ড হার্ডওয়্যার',
    pricing_method: 'per_piece',
    selling_price: 1200.0,
    cost: 750.0,
    is_active: true,
  },
]

export class AdditionalOptionRepository {
  static async getAdditionalOptions(
    companyId: string,
    options?: { includeInactive?: boolean }
  ): Promise<AdditionalOptionRecord[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('additional_options')
        .select('*')
        .eq('company_id', companyId)
        .order('name', { ascending: true })

      if (!options?.includeInactive) {
        query = query.eq('is_active', true)
      }

      if (!error && data) {
        return data as AdditionalOptionRecord[]
      }
    } catch {
      // Fallback
    }

    const all = PrintERPDataStore.get<AdditionalOptionRecord[]>(
      STORAGE_KEYS.ADDITIONAL_OPTIONS,
      companyId
    ) || []

    return options?.includeInactive ? all : all.filter((d) => d.is_active)
  }

  static async seedDefaultOptions(companyId: string): Promise<AdditionalOptionRecord[]> {
    try {
      const supabase = await createClient()
      const recordsToInsert = DEFAULT_ADDITIONAL_OPTIONS.map((d) => ({
        ...d,
        company_id: companyId,
      }))

      const { data, error } = await (supabase as any)
        .from('additional_options')
        .insert(recordsToInsert)
        .select('*')

      if (!error && data) {
        return data as AdditionalOptionRecord[]
      }
    } catch {}

    const now = new Date().toISOString()
    const defaults: AdditionalOptionRecord[] = DEFAULT_ADDITIONAL_OPTIONS.map((d, idx) => ({
      ...d,
      id: `add-seed-${idx + 1}`,
      company_id: companyId,
      created_at: now,
      updated_at: now,
    }))
    defaults.forEach((item) =>
      PrintERPDataStore.addItem<AdditionalOptionRecord>(STORAGE_KEYS.ADDITIONAL_OPTIONS, item, companyId)
    )
    return defaults
  }

  static async save(
    input: Partial<AdditionalOptionRecord> & { company_id: string; name: string }
  ): Promise<AdditionalOptionRecord> {
    if (input.id) {
      const updated = await this.updateAdditionalOption(input.company_id, input.id, input)
      if (updated) return updated
    }
    return this.createAdditionalOption(input.company_id, input)
  }

  static async createAdditionalOption(
    companyId: string,
    input: Partial<AdditionalOptionRecord>
  ): Promise<AdditionalOptionRecord> {
    const payload = {
      company_id: companyId,
      name: input.name || 'New Additional',
      name_bn: input.name_bn || null,
      product_id: input.product_id || null,
      pricing_method: input.pricing_method || 'sqft',
      selling_price: Number(input.selling_price) || 0,
      cost: Number(input.cost) || 0,
      is_active: input.is_active !== undefined ? input.is_active : true,
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('additional_options')
        .insert(payload)
        .select('*')
        .single()

      if (!error && data) {
        return data as AdditionalOptionRecord
      }
    } catch {
      // Fallback
    }

    const localRecord: AdditionalOptionRecord = {
      ...payload,
      id: `add-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<AdditionalOptionRecord>(
      STORAGE_KEYS.ADDITIONAL_OPTIONS,
      localRecord,
      companyId
    )
    return localRecord
  }

  static async updateAdditionalOption(
    companyId: string,
    id: string,
    input: Partial<AdditionalOptionRecord>
  ): Promise<AdditionalOptionRecord | null> {
    const updates = {
      ...input,
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('additional_options')
        .update(updates)
        .eq('company_id', companyId)
        .eq('id', id)
        .select('*')
        .single()

      if (!error && data) {
        return data as AdditionalOptionRecord
      }
    } catch {
      // Fallback
    }

    return PrintERPDataStore.updateItem<AdditionalOptionRecord>(
      STORAGE_KEYS.ADDITIONAL_OPTIONS,
      id,
      updates,
      companyId
    )
  }

  static async deleteAdditionalOption(
    companyId: string,
    id: string
  ): Promise<boolean> {
    try {
      const supabase = await createClient()
      const { error } = await (supabase as any)
        .from('additional_options')
        .delete()
        .eq('company_id', companyId)
        .eq('id', id)

      if (!error) return true
    } catch {
      // Fallback
    }

    PrintERPDataStore.removeItem<AdditionalOptionRecord>(STORAGE_KEYS.ADDITIONAL_OPTIONS, id, companyId)
    return true
  }
}
