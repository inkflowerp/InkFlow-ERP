import { createClient } from '@/lib/supabase/server'
import { ProductRecord } from '@/types/product.types'
import { measureAsync } from '@/lib/performance/logger'

export const DEFAULT_PRINT_PRODUCTS: Omit<ProductRecord, 'id' | 'company_id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Star Flex Banner (Frontlit 280 GSM)',
    name_bn: 'স্টার ফ্লেক্স ব্যানার (ফ্রন্টলিট)',
    sku: 'PRD-FLX-01',
    category: 'flex_banner',
    product_type: 'print_service',
    unit: 'sft',
    material_spec: '280 GSM Chinese Star Flex Media',
    description: 'High durability outdoor solvent/eco-solvent banner for marketing campaigns & billboards.',
    base_cost: 11.5,
    selling_price: 18.0,
    min_price: 15.0,
    tax_rate: 7.5,
    is_active: true,
  },
  {
    name: 'Panaflex Backlit Signage Print',
    name_bn: 'প্যানাফ্লেক্স ব্যাকলিট সাইনবোর্ড প্রিন্ট',
    sku: 'PRD-PANA-01',
    category: 'backlit_flex',
    product_type: 'print_service',
    unit: 'sft',
    material_spec: '440 GSM Backlit Translucent Media',
    description: 'High-luminance translucent printing for illuminated light boxes and shop fascias.',
    base_cost: 22.0,
    selling_price: 35.0,
    min_price: 28.0,
    tax_rate: 7.5,
    is_active: true,
  },
  {
    name: 'Eco-Solvent Vinyl Sticker (Glossy / Matte)',
    name_bn: 'ভিনাইল স্টিকার (গ্লসি / ম্যাট)',
    sku: 'PRD-VIN-01',
    category: 'vinyl_sticker',
    product_type: 'print_service',
    unit: 'sft',
    material_spec: '100 Micron PVC Vinyl with permanent adhesive',
    description: 'Photo-quality vinyl sticker with UV coating for indoor and outdoor branding.',
    base_cost: 18.0,
    selling_price: 32.0,
    min_price: 26.0,
    tax_rate: 7.5,
    is_active: true,
  },
  {
    name: 'PVC Foam Board Mount (3mm / 5mm)',
    name_bn: 'পিভিসি ফোম বোর্ড মাউন্টিং (৩মিমি/৫মিমি)',
    sku: 'PRD-PVC-01',
    category: 'rigid_board',
    product_type: 'fabrication_service',
    unit: 'sft',
    material_spec: 'High-density rigid PVC sheet mounted with laminated vinyl',
    description: 'Rigid photo-mounted display boards for exhibitions, retail point-of-sale, and directional signage.',
    base_cost: 45.0,
    selling_price: 75.0,
    min_price: 60.0,
    tax_rate: 7.5,
    is_active: true,
  },
  {
    name: 'Acrylic 3D LED Raised Letter Signage',
    name_bn: 'এক্রিলিক ৩ডি এলইডি লেটার সাইন',
    sku: 'PRD-ACR-01',
    category: 'signage_3d',
    product_type: 'fabrication_service',
    unit: 'inch',
    material_spec: '3mm Cast Acrylic with Samsung LED module & Korean SMPS',
    description: 'Premium laser-cut 3D illuminated letters for corporate receptions and retail storefronts.',
    base_cost: 65.0,
    selling_price: 120.0,
    min_price: 95.0,
    tax_rate: 7.5,
    is_active: true,
  },
  {
    name: 'Roll-Up Banner Standee (3ft x 6.5ft)',
    name_bn: 'রোল-আপ ব্যানার স্ট্যান্ডি (৩ x ৬.৫ ফুট)',
    sku: 'PRD-STN-01',
    category: 'display_stand',
    product_type: 'finished_product',
    unit: 'pcs',
    material_spec: 'Aluminum teardrop base with synthetic non-tearable banner',
    description: 'Portable retractable banner stand for seminars, fairs, and corporate activations.',
    base_cost: 1100.0,
    selling_price: 1850.0,
    min_price: 1500.0,
    tax_rate: 7.5,
    is_active: true,
  },
  {
    name: 'Premium Corporate Visiting Cards (300 GSM Matte)',
    name_bn: 'ভিজিটিং কার্ড (৩০০ জিএসএম ম্যাট লেমিনেশন)',
    sku: 'PRD-CRD-01',
    category: 'commercial_print',
    product_type: 'print_service',
    unit: 'pcs',
    material_spec: '300 GSM Art Card with Thermal Double-side Matte & Spot UV',
    description: 'Offset printed executive business cards with velvet lamination (Box of 100 pcs).',
    base_cost: 220.0,
    selling_price: 450.0,
    min_price: 350.0,
    tax_rate: 7.5,
    is_active: true,
  },
  {
    name: 'Full Color Promotional Leaflet / Flyer (A4 / A5)',
    name_bn: 'রঙিন লিফলেট / ফ্লায়ার (এ৪ / এ৫)',
    sku: 'PRD-FLY-01',
    category: 'commercial_print',
    product_type: 'print_service',
    unit: 'pcs',
    material_spec: '120 GSM Art Paper, 4-color high resolution offset printing',
    description: 'Marketing handouts and distribution brochures (Per 1,000 pcs unit).',
    base_cost: 1400.0,
    selling_price: 2400.0,
    min_price: 2000.0,
    tax_rate: 7.5,
    is_active: true,
  },
]

export class ProductRepository {
  static async getProducts(companyId: string, activeOnly: boolean = false): Promise<ProductRecord[]> {
    return measureAsync(`ProductRepository.getProducts(${companyId})`, async () => {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('products')
        .select('*')
        .eq('company_id', companyId)
        .order('name', { ascending: true })

      if (activeOnly) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch products: ${error.message}`)
      }

      const list = (data || []) as ProductRecord[]

      // If tenant has no products seeded yet, synthesize standard catalog items
      if (list.length === 0) {
        return DEFAULT_PRINT_PRODUCTS.map((p, idx) => ({
          ...p,
          id: `seed-prd-${companyId}-${idx + 1}`,
          company_id: companyId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })) as ProductRecord[]
      }

      return list
    })
  }

  static async getProductById(id: string, companyId: string): Promise<ProductRecord | null> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('products')
      .select('*')
      .or(`id.eq.${id},sku.eq.${id}`)
      .eq('company_id', companyId)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to fetch product ${id}: ${error.message}`)
    }

    if (!data) {
      // Check default catalog
      const foundDefault = DEFAULT_PRINT_PRODUCTS.find((p, idx) => `seed-prd-${companyId}-${idx + 1}` === id || p.sku === id)
      if (foundDefault) {
        return {
          ...foundDefault,
          id,
          company_id: companyId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as ProductRecord
      }
    }

    return (data as unknown as ProductRecord) || null
  }

  static async createProduct(product: Partial<ProductRecord> & {
    company_id: string
    name: string
    sku: string
    unit: any
    selling_price: number
  }): Promise<ProductRecord> {
    const supabase = await createClient()
    const payload: any = {
      company_id: product.company_id,
      name: product.name.trim(),
      name_bn: product.name_bn?.trim() || null,
      sku: product.sku.trim().toUpperCase(),
      category: product.category || 'general_print',
      product_type: product.product_type || 'print_service',
      unit: product.unit,
      material_spec: product.material_spec?.trim() || null,
      description: product.description?.trim() || null,
      base_cost: product.base_cost || 0,
      selling_price: product.selling_price || 0,
      min_price: product.min_price || 0,
      tax_rate: product.tax_rate !== undefined ? product.tax_rate : 7.5,
      pricing_formula: product.pricing_formula || null,
      is_active: product.is_active !== undefined ? product.is_active : true,
    }

    if (product.id) {
      payload.id = product.id
    }

    const { data, error } = await (supabase as any)
      .from('products')
      .insert(payload)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create product: ${error.message}`)
    }

    return data as unknown as ProductRecord
  }

  static async updateProduct(id: string, updates: Partial<ProductRecord>, companyId: string): Promise<ProductRecord> {
    const supabase = await createClient()
    const payload: any = { ...updates, updated_at: new Date().toISOString() }
    delete payload.id
    delete payload.company_id

    const { data, error } = await (supabase as any)
      .from('products')
      .update(payload)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update product: ${error.message}`)
    }

    return data as unknown as ProductRecord
  }

  static async deleteProduct(id: string, companyId: string): Promise<boolean> {
    const supabase = await createClient()
    const { error } = await (supabase as any)
      .from('products')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId)

    if (error) {
      throw new Error(`Failed to delete product: ${error.message}`)
    }

    return true
  }
}
