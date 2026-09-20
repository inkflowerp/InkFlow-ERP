import { createClient } from '../supabase/server.ts'
import type { PrintingMethod } from '../../types/product.types.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'

export const DEFAULT_PRINTING_METHODS: Array<Omit<PrintingMethod, 'id' | 'company_id' | 'created_at' | 'updated_at'>> = [
  {
    name: 'Eco-Solvent Print',
    name_bn: 'ইকো-সলভেন্ট প্রিন্ট',
    code: 'ECO_SOLVENT',
    description: 'High resolution outdoor & indoor graphics on vinyl, banner, and film',
    compatible_material_types: ['roll'],
    cost_per_sqft: 12.0,
    default_ink_type: 'Eco-Solvent Ink',
    is_active: true,
  },
  {
    name: 'UV Flatbed Print',
    name_bn: 'ইউভি ফ্ল্যাটবেড প্রিন্ট',
    code: 'UV_FLATBED',
    description: 'Direct print on rigid materials like PVC board, acrylic, MDF, and glass',
    compatible_material_types: ['rigid', 'sheet', 'roll'],
    cost_per_sqft: 25.0,
    default_ink_type: 'UV Curable Ink',
    is_active: true,
  },
  {
    name: 'UV Roll-to-Roll Print',
    name_bn: 'ইউভি রোল-টু-রোল প্রিন্ট',
    code: 'UV_ROLL',
    description: 'Durable UV curing on flexible vinyl, backlit film, and canvas',
    compatible_material_types: ['roll'],
    cost_per_sqft: 20.0,
    default_ink_type: 'UV Flexible Ink',
    is_active: true,
  },
  {
    name: 'Solvent Print',
    name_bn: 'সলভেন্ট প্রিন্ট',
    code: 'SOLVENT',
    description: 'Heavy duty outdoor flex and banner printing',
    compatible_material_types: ['roll'],
    cost_per_sqft: 8.0,
    default_ink_type: 'Solvent Ink',
    is_active: true,
  },
  {
    name: 'Sublimation Print',
    name_bn: 'সাবলিমেশন প্রিন্ট',
    code: 'SUBLIMATION',
    description: 'Heat transfer on polyester fabrics, mugs, and promotional items',
    compatible_material_types: ['roll', 'sheet'],
    cost_per_sqft: 15.0,
    default_ink_type: 'Sublimation Disperse Ink',
    is_active: true,
  },
  {
    name: 'DTF Print',
    name_bn: 'ডিটিএফ প্রিন্ট',
    code: 'DTF',
    description: 'Direct to Film transfer for apparel and fabric branding',
    compatible_material_types: ['roll', 'sheet'],
    cost_per_sqft: 22.0,
    default_ink_type: 'DTF Textile Ink',
    is_active: true,
  },
  {
    name: 'Screen Print',
    name_bn: 'স্ক্রিন প্রিন্ট',
    code: 'SCREEN',
    description: 'Traditional spot-color and bulk screen printing',
    compatible_material_types: ['sheet', 'hardware', 'accessory'],
    cost_per_sqft: 5.0,
    default_ink_type: 'Plastisol / Waterbased Ink',
    is_active: true,
  },
  {
    name: 'Latex Print',
    name_bn: 'ল্যাটেক্স প্রিন্ট',
    code: 'LATEX',
    description: 'Odorless water-based latex print for wallpaper, interior decor, and vehicle wraps',
    compatible_material_types: ['roll'],
    cost_per_sqft: 28.0,
    default_ink_type: 'HP Latex Ink',
    is_active: true,
  },
]

export class PrintingMethodRepository {
  static async getPrintingMethods(
    companyId: string,
    options?: { includeInactive?: boolean }
  ): Promise<PrintingMethod[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('printing_methods')
        .select('*')
        .eq('company_id', companyId)
        .order('name', { ascending: true })

      if (!options?.includeInactive) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (!error && data && data.length > 0) {
        return data as PrintingMethod[]
      }

      // If empty in database, seed default methods for tenant
      if (!error && data && data.length === 0) {
        const seeded = await this.seedDefaultMethods(companyId)
        if (seeded.length > 0) return seeded
      }
    } catch {
      // Fallback to data store
    }

    // In-memory data store fallback
    const all = PrintERPDataStore.get<PrintingMethod[]>(
      STORAGE_KEYS.PRINTING_METHODS,
      companyId
    ) || []

    if (all.length === 0) {
      const now = new Date().toISOString()
      const defaults: PrintingMethod[] = DEFAULT_PRINTING_METHODS.map((d, idx) => ({
        ...d,
        id: `pm-seed-${idx + 1}`,
        company_id: companyId,
        created_at: now,
        updated_at: now,
      }))
      defaults.forEach((item) =>
        PrintERPDataStore.addItem<PrintingMethod>(STORAGE_KEYS.PRINTING_METHODS, item, companyId)
      )
      return options?.includeInactive ? defaults : defaults.filter((d) => d.is_active)
    }

    return options?.includeInactive ? all : all.filter((d) => d.is_active)
  }

  static async seedDefaultMethods(companyId: string): Promise<PrintingMethod[]> {
    try {
      const supabase = await createClient()
      const recordsToInsert = DEFAULT_PRINTING_METHODS.map((d) => ({
        ...d,
        company_id: companyId,
      }))

      const { data, error } = await (supabase as any)
        .from('printing_methods')
        .insert(recordsToInsert)
        .select('*')

      if (!error && data && data.length > 0) {
        return data as PrintingMethod[]
      }
    } catch {}

    const now = new Date().toISOString()
    const defaults: PrintingMethod[] = DEFAULT_PRINTING_METHODS.map((d, idx) => ({
      ...d,
      id: `pm-seed-${idx + 1}`,
      company_id: companyId,
      created_at: now,
      updated_at: now,
    }))
    defaults.forEach((item) =>
      PrintERPDataStore.addItem<PrintingMethod>(STORAGE_KEYS.PRINTING_METHODS, item, companyId)
    )
    return defaults
  }

  static async getById(companyId: string, id: string): Promise<PrintingMethod | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('printing_methods')
        .select('*')
        .eq('company_id', companyId)
        .eq('id', id)
        .single()

      if (!error && data) {
        return data as PrintingMethod
      }
    } catch {
      // Fallback
    }

    const all = await this.getPrintingMethods(companyId, { includeInactive: true })
    return all.find((m) => m.id === id) || null
  }

  static async save(
    input: Partial<PrintingMethod> & { company_id: string; name: string }
  ): Promise<PrintingMethod> {
    if (input.id) {
      const updated = await this.updatePrintingMethod(input.company_id, input.id, input)
      if (updated) return updated
    }
    return this.createPrintingMethod(input.company_id, input)
  }

  static async createPrintingMethod(
    companyId: string,
    input: Partial<PrintingMethod>
  ): Promise<PrintingMethod> {
    const payload = {
      company_id: companyId,
      name: input.name || 'New Printing Method',
      name_bn: input.name_bn || null,
      code: input.code || input.name?.toUpperCase().replace(/\s+/g, '_') || 'CUSTOM',
      description: input.description || null,
      category_id: input.category_id || null,
      compatible_material_types: input.compatible_material_types || ['roll'],
      cost_per_sqft: Number(input.cost_per_sqft) || 0,
      default_ink_type: input.default_ink_type || null,
      is_active: input.is_active !== undefined ? input.is_active : true,
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('printing_methods')
        .insert(payload)
        .select('*')
        .single()

      if (!error && data) {
        return data as PrintingMethod
      }
    } catch {
      // Fallback
    }

    const localRecord: PrintingMethod = {
      ...payload,
      id: `pm-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<PrintingMethod>(
      STORAGE_KEYS.PRINTING_METHODS,
      localRecord,
      companyId
    )
    return localRecord
  }

  static async updatePrintingMethod(
    companyId: string,
    id: string,
    input: Partial<PrintingMethod>
  ): Promise<PrintingMethod | null> {
    const updates = {
      ...input,
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('printing_methods')
        .update(updates)
        .eq('company_id', companyId)
        .eq('id', id)
        .select('*')
        .single()

      if (!error && data) {
        return data as PrintingMethod
      }
    } catch {
      // Fallback
    }

    return PrintERPDataStore.updateItem<PrintingMethod>(
      STORAGE_KEYS.PRINTING_METHODS,
      id,
      updates,
      companyId
    )
  }

  static async deletePrintingMethod(
    companyId: string,
    id: string
  ): Promise<boolean> {
    try {
      const supabase = await createClient()
      const { error } = await (supabase as any)
        .from('printing_methods')
        .delete()
        .eq('company_id', companyId)
        .eq('id', id)

      if (!error) return true
    } catch {
      // Fallback
    }

    PrintERPDataStore.removeItem<PrintingMethod>(STORAGE_KEYS.PRINTING_METHODS, id, companyId)
    return true
  }
}
