import { createClient } from '../supabase/server.ts'
import type { InstallationOptionRecord } from '../../types/product.types.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'

export const DEFAULT_INSTALLATION_OPTIONS: Array<Omit<InstallationOptionRecord, 'id' | 'company_id' | 'created_at' | 'updated_at'>> = [
  {
    name: 'On-Site Installation (Dhaka Metro)',
    name_bn: 'অন-সাইট ইনস্টলেশন (ঢাকা মেট্রো)',
    fulfillment_type: 'installation',
    pricing_method: 'fixed',
    selling_price: 1500.0,
    cost: 800.0,
    creates_task: true,
    is_active: true,
  },
  {
    name: 'Outside Dhaka On-Site Installation',
    name_bn: 'ঢাকার বাইরে ইনস্টলেশন',
    fulfillment_type: 'installation',
    pricing_method: 'fixed',
    selling_price: 3500.0,
    cost: 2000.0,
    creates_task: true,
    is_active: true,
  },
  {
    name: 'Per-Sqft Signage Installation',
    name_bn: 'প্রতি বর্গফুট সাইনেজ ইনস্টলেশন',
    fulfillment_type: 'installation',
    pricing_method: 'sqft',
    selling_price: 15.0,
    cost: 8.0,
    creates_task: true,
    is_active: true,
  },
  {
    name: 'Shop Delivery / Courier Dispatch',
    name_bn: 'দোকান ডেলিভারি / কুরিয়ার প্রেরণ',
    fulfillment_type: 'delivery',
    pricing_method: 'fixed',
    selling_price: 300.0,
    cost: 150.0,
    creates_task: false,
    is_active: true,
  },
  {
    name: 'Self Pickup from Factory / Outlet',
    name_bn: 'ফ্যাক্টরি / আউটলেট থেকে সেলফ পিকআপ',
    fulfillment_type: 'pickup',
    pricing_method: 'fixed',
    selling_price: 0.0,
    cost: 0.0,
    creates_task: false,
    is_active: true,
  },
]

export class InstallationOptionRepository {
  static async getInstallationOptions(
    companyId: string,
    options?: { includeInactive?: boolean }
  ): Promise<InstallationOptionRecord[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('installation_options')
        .select('*')
        .eq('company_id', companyId)
        .order('name', { ascending: true })

      if (!options?.includeInactive) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (!error && data) {
        return data as InstallationOptionRecord[]
      }
    } catch {
      // Fallback
    }

    const all = PrintERPDataStore.get<InstallationOptionRecord[]>(
      STORAGE_KEYS.INSTALLATION_OPTIONS,
      companyId
    ) || []

    return options?.includeInactive ? all : all.filter((d) => d.is_active)
  }

  static async seedDefaultOptions(companyId: string): Promise<InstallationOptionRecord[]> {
    try {
      const supabase = await createClient()
      const recordsToInsert = DEFAULT_INSTALLATION_OPTIONS.map((d) => ({
        ...d,
        company_id: companyId,
      }))

      const { data, error } = await (supabase as any)
        .from('installation_options')
        .insert(recordsToInsert)
        .select('*')

      if (!error && data) {
        return data as InstallationOptionRecord[]
      }
    } catch {}

    const now = new Date().toISOString()
    const defaults: InstallationOptionRecord[] = DEFAULT_INSTALLATION_OPTIONS.map((d, idx) => ({
      ...d,
      id: `inst-seed-${idx + 1}`,
      company_id: companyId,
      created_at: now,
      updated_at: now,
    }))
    defaults.forEach((item) =>
      PrintERPDataStore.addItem<InstallationOptionRecord>(STORAGE_KEYS.INSTALLATION_OPTIONS, item, companyId)
    )
    return defaults
  }

  static async save(
    input: Partial<InstallationOptionRecord> & { company_id: string; name: string }
  ): Promise<InstallationOptionRecord> {
    if (input.id) {
      const updated = await this.updateInstallationOption(input.company_id, input.id, input)
      if (updated) return updated
    }
    return this.createInstallationOption(input.company_id, input)
  }

  static async createInstallationOption(
    companyId: string,
    input: Partial<InstallationOptionRecord>
  ): Promise<InstallationOptionRecord> {
    const payload = {
      company_id: companyId,
      name: input.name || 'New Installation Option',
      name_bn: input.name_bn || null,
      fulfillment_type: input.fulfillment_type || 'installation',
      pricing_method: input.pricing_method || 'fixed',
      selling_price: Number(input.selling_price) || 0,
      cost: Number(input.cost) || 0,
      creates_task: input.creates_task !== undefined ? input.creates_task : true,
      is_active: input.is_active !== undefined ? input.is_active : true,
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('installation_options')
        .insert(payload)
        .select('*')
        .single()

      if (!error && data) {
        return data as InstallationOptionRecord
      }
    } catch {
      // Fallback
    }

    const localRecord: InstallationOptionRecord = {
      ...payload,
      id: `inst-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<InstallationOptionRecord>(
      STORAGE_KEYS.INSTALLATION_OPTIONS,
      localRecord,
      companyId
    )
    return localRecord
  }

  static async updateInstallationOption(
    companyId: string,
    id: string,
    input: Partial<InstallationOptionRecord>
  ): Promise<InstallationOptionRecord | null> {
    const updates = {
      ...input,
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('installation_options')
        .update(updates)
        .eq('company_id', companyId)
        .eq('id', id)
        .select('*')
        .single()

      if (!error && data) {
        return data as InstallationOptionRecord
      }
    } catch {
      // Fallback
    }

    return PrintERPDataStore.updateItem<InstallationOptionRecord>(
      STORAGE_KEYS.INSTALLATION_OPTIONS,
      id,
      updates,
      companyId
    )
  }

  static async deleteInstallationOption(
    companyId: string,
    id: string
  ): Promise<boolean> {
    try {
      const supabase = await createClient()
      const { error } = await (supabase as any)
        .from('installation_options')
        .delete()
        .eq('company_id', companyId)
        .eq('id', id)

      if (!error) return true
    } catch {
      // Fallback
    }

    PrintERPDataStore.removeItem<InstallationOptionRecord>(STORAGE_KEYS.INSTALLATION_OPTIONS, id, companyId)
    return true
  }
}
