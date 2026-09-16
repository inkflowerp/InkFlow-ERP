import { createClient } from '../supabase/server.ts'
import type {
  ProductCategoryRecord,
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoryTreeItem,
} from '../../types/category.types.ts'
import { measureAsync } from '../performance/logger.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'
import { isTestMode } from './product.repository.ts'

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

export const DEFAULT_PRINT_SHOP_CATEGORIES: Array<{
  name: string
  name_bn?: string
  slug: string
  parent_slug?: string
  applies_to_product_types: string[]
  description: string
  display_order: number
}> = [
  // Parent Root Categories
  { name: 'Printing', name_bn: 'প্রিন্টিং', slug: 'printing', applies_to_product_types: ['production_product', 'ready_product', 'all'], description: 'All commercial print media and output', display_order: 1 },
  { name: 'Finishing', name_bn: 'ফিনিশিং', slug: 'finishing', applies_to_product_types: ['finishing', 'all'], description: 'Post-press surface finishing and processing services', display_order: 2 },
  { name: 'Signage & Fabrication', name_bn: 'সাইনেজ ও ফেব্রিকেশন', slug: 'signage-fabrication', applies_to_product_types: ['fabrication', 'production_product', 'all'], description: 'Custom signage, acrylic, ACP, LED & 3D fabrication', display_order: 3 },
  { name: 'Display & Hardware', name_bn: 'ডিসপ্লে ও হার্ডওয়্যার', slug: 'display-hardware', applies_to_product_types: ['ready_product', 'material', 'all'], description: 'Ready display stands, rollups, frames and hardware', display_order: 4 },
  { name: 'Services', name_bn: 'সেবা সমূহ', slug: 'services', applies_to_product_types: ['service', 'installation', 'delivery', 'all'], description: 'Design, site installation and delivery services', display_order: 5 },
  { name: 'Raw Materials', name_bn: 'কাঁচামাল', slug: 'raw-materials', applies_to_product_types: ['material', 'all'], description: 'Rolls, sheets, inks and hardware inventory', display_order: 6 },

  // Printing Children
  { name: 'Digital Print', name_bn: 'ডিজিটাল প্রিন্ট', slug: 'digital-print', parent_slug: 'printing', applies_to_product_types: ['production_product', 'ready_product'], description: 'Digital press sheets, brochures, business cards', display_order: 10 },
  { name: 'Flex Banner', name_bn: 'ফ্লেক্স ব্যানার', slug: 'flex-banner', parent_slug: 'printing', applies_to_product_types: ['production_product'], description: 'Frontlit flex, backlit flex, star flex media', display_order: 11 },
  { name: 'Vinyl & Sticker', name_bn: 'ভিনাইল ও স্টিকার', slug: 'vinyl-sticker', parent_slug: 'printing', applies_to_product_types: ['production_product'], description: 'Self adhesive vinyl, clear vinyl, frosted sticker', display_order: 12 },
  { name: 'Photo Paper', name_bn: 'ফটো পেপার', slug: 'photo-paper', parent_slug: 'printing', applies_to_product_types: ['production_product'], description: 'High-resolution indoor photo media', display_order: 13 },
  { name: 'Offset & Packaging', name_bn: 'অফসেট ও প্যাকেজিং', slug: 'offset-packaging', parent_slug: 'printing', applies_to_product_types: ['production_product', 'ready_product'], description: 'Offset commercial jobs, cartons and packaging', display_order: 14 },

  // Finishing Children
  { name: 'Lamination', name_bn: 'লেমিনেটিং', slug: 'lamination', parent_slug: 'finishing', applies_to_product_types: ['finishing'], description: 'Glossy, matte, thermal and UV lamination', display_order: 20 },
  { name: 'Banner Finishing', name_bn: 'ব্যানার ফিনিশিং', slug: 'banner-finishing', parent_slug: 'finishing', applies_to_product_types: ['finishing'], description: 'Eyelet punching, heat hemming, pole pockets, rope', display_order: 21 },
  { name: 'Die Cutting & CNC', name_bn: 'ডাই কাটিং ও সিএনসি', slug: 'die-cutting-cnc', parent_slug: 'finishing', applies_to_product_types: ['finishing'], description: 'Contour cutting, laser cutting, router shaping', display_order: 22 },
  { name: 'Binding & Folding', name_bn: 'বাইন্ডিং ও ভাঁজ', slug: 'binding-folding', parent_slug: 'finishing', applies_to_product_types: ['finishing'], description: 'Booklet binding, creasing, perf and folding', display_order: 23 },

  // Signage Children
  { name: 'Acrylic Signage', name_bn: 'এক্রিলিক সাইনেজ', slug: 'acrylic-signage', parent_slug: 'signage-fabrication', applies_to_product_types: ['fabrication', 'production_product'], description: 'Acrylic letters, display boards, crystal boxes', display_order: 30 },
  { name: 'LED & 3D Letters', name_bn: 'এলইডি ও থ্রিডি লেটার', slug: 'led-3d-letters', parent_slug: 'signage-fabrication', applies_to_product_types: ['fabrication'], description: 'Illuminated 3D channel letters and lightboxes', display_order: 31 },
  { name: 'ACP & Metal Signs', name_bn: 'এসিপি ও মেটাল সাইন', slug: 'acp-metal-signs', parent_slug: 'signage-fabrication', applies_to_product_types: ['fabrication'], description: 'Aluminum composite panels, MS frames, structure', display_order: 32 },

  // Display Children
  { name: 'Display Stands', name_bn: 'ডিসপ্লে স্ট্যান্ড', slug: 'display-stands', parent_slug: 'display-hardware', applies_to_product_types: ['ready_product', 'material'], description: 'Rollup stands, X-stands, A-stands, backdrop frames', display_order: 40 },

  // Services Children
  { name: 'Graphic Design', name_bn: 'গ্রাফিক ডিজাইন', slug: 'graphic-design', parent_slug: 'services', applies_to_product_types: ['service'], description: 'Creative artwork, layout and pre-press design', display_order: 50 },
  { name: 'Installation & Pasting', name_bn: 'ইনস্টলেশন ও পেস্টিং', slug: 'installation-pasting', parent_slug: 'services', applies_to_product_types: ['installation', 'service'], description: 'On-site signboard mounting, vinyl pasting, branding', display_order: 51 },
  { name: 'Delivery & Transport', name_bn: 'ডেলিভারি ও পরিবহন', slug: 'delivery-transport', parent_slug: 'services', applies_to_product_types: ['delivery', 'service'], description: 'Inside Dhaka / nationwide logistics and freight', display_order: 52 },
]

export class CategoryRepository {
  /**
   * Seed default categories if company currently has none
   */
  static async seedDefaultCategories(companyId: string): Promise<ProductCategoryRecord[]> {
    const existing = await this.getCategories(companyId, false)
    if (existing.length > 0) return existing

    const createdMap = new Map<string, ProductCategoryRecord>()

    // First seed parent categories
    const parents = DEFAULT_PRINT_SHOP_CATEGORIES.filter((c) => !c.parent_slug)
    for (const p of parents) {
      const cat = await this.createCategory(
        {
          name: p.name,
          name_bn: p.name_bn,
          applies_to_product_types: p.applies_to_product_types,
          description: p.description,
          display_order: p.display_order,
          is_active: true,
        },
        companyId
      )
      createdMap.set(p.slug, cat)
    }

    // Then seed child categories with parent_id
    const children = DEFAULT_PRINT_SHOP_CATEGORIES.filter((c) => c.parent_slug)
    for (const c of children) {
      const parent = createdMap.get(c.parent_slug!)
      const cat = await this.createCategory(
        {
          name: c.name,
          name_bn: c.name_bn,
          parent_id: parent?.id || null,
          applies_to_product_types: c.applies_to_product_types,
          description: c.description,
          display_order: c.display_order,
          is_active: true,
        },
        companyId
      )
      createdMap.set(c.slug, cat)
    }

    return this.getCategories(companyId, false)
  }

  /**
   * Retrieves categories for a tenant
   */
  static async getCategories(
    companyId: string,
    activeOnly: boolean = false,
    productType?: string,
    search?: string
  ): Promise<ProductCategoryRecord[]> {
    return measureAsync(`CategoryRepository.getCategories(${companyId})`, async () => {
      if (!isSupabaseConfigured() || isTestMode()) {
        let cats = PrintERPDataStore.get<ProductCategoryRecord[]>(STORAGE_KEYS.PRODUCT_CATEGORIES) || []
        
        // Auto-seed for test/local store if empty
        if (cats.length === 0 && companyId) {
          const seeded: ProductCategoryRecord[] = []
          const slugToId = new Map<string, string>()

          for (const item of DEFAULT_PRINT_SHOP_CATEGORIES) {
            const id = `cat-${item.slug}-${Date.now().toString(36)}`
            slugToId.set(item.slug, id)
            const parentId = item.parent_slug ? slugToId.get(item.parent_slug) || null : null

            seeded.push({
              id,
              company_id: companyId,
              name: item.name,
              name_bn: item.name_bn || null,
              slug: item.slug,
              parent_id: parentId,
              applies_to_product_types: item.applies_to_product_types,
              description: item.description,
              is_active: true,
              display_order: item.display_order,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
          }
          PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_CATEGORIES, seeded)
          cats = seeded
        }

        let filtered = cats.filter((c) => !c.company_id || c.company_id === companyId)
        if (activeOnly) filtered = filtered.filter((c) => c.is_active !== false)
        if (productType && productType !== 'all') {
          filtered = filtered.filter(
            (c) =>
              !c.applies_to_product_types ||
              c.applies_to_product_types.includes('all') ||
              c.applies_to_product_types.includes(productType)
          )
        }
        if (search && search.trim()) {
          const q = search.trim().toLowerCase()
          filtered = filtered.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              (c.name_bn && c.name_bn.includes(q)) ||
              c.slug.toLowerCase().includes(q)
          )
        }
        return filtered.sort((a, b) => a.display_order - b.display_order)
      }

      try {
        const supabase = await createClient()
        let query = (supabase as any)
          .from('product_categories')
          .select('*')
          .eq('company_id', companyId)
          .order('display_order', { ascending: true })
          .order('name', { ascending: true })

        if (activeOnly) {
          query = query.eq('is_active', true)
        }

        if (search && search.trim()) {
          const q = search.trim()
          query = query.or(`name.ilike.%${q}%,name_bn.ilike.%${q}%,slug.ilike.%${q}%`)
        }

        const { data, error } = await query
        if (error) {
          throw new Error(`Failed to load categories: ${error.message}`)
        }

        let list = (data || []) as ProductCategoryRecord[]
        if (productType && productType !== 'all') {
          list = list.filter(
            (c) =>
              !c.applies_to_product_types ||
              c.applies_to_product_types.includes('all') ||
              c.applies_to_product_types.includes(productType)
          )
        }

        return list
      } catch (err: any) {
        throw new Error(`Database error fetching categories: ${err.message}`)
      }
    })
  }

  /**
   * Retrieves single category by ID
   */
  static async getCategoryById(id: string, companyId: string): Promise<ProductCategoryRecord | null> {
    return measureAsync(`CategoryRepository.getCategoryById(${id})`, async () => {
      const list = await this.getCategories(companyId, false)
      return list.find((c) => c.id === id || c.slug === id) || null
    })
  }

  /**
   * Returns hierarchical Category Tree
   */
  static async getCategoryTree(companyId: string, activeOnly: boolean = false): Promise<CategoryTreeItem[]> {
    const list = await this.getCategories(companyId, activeOnly)
    const map = new Map<string, CategoryTreeItem>()
    const roots: CategoryTreeItem[] = []

    list.forEach((c) => {
      map.set(c.id, { ...c, children: [] })
    })

    list.forEach((c) => {
      const item = map.get(c.id)!
      if (c.parent_id && map.has(c.parent_id)) {
        map.get(c.parent_id)!.children!.push(item)
      } else {
        roots.push(item)
      }
    })

    return roots
  }

  /**
   * Creates a new category with duplicate prevention & slug generation
   */
  static async createCategory(
    input: CreateCategoryInput,
    companyId: string
  ): Promise<ProductCategoryRecord> {
    return measureAsync(`CategoryRepository.createCategory(${input.name})`, async () => {
      const trimmedName = input.name.trim()
      if (!trimmedName) {
        throw new Error('Category name is required')
      }

      const generatedSlug = slugify(trimmedName)
      const existing = await this.getCategories(companyId, false)
      
      const duplicate = existing.find(
        (c) => c.name.toLowerCase() === trimmedName.toLowerCase() || c.slug === generatedSlug
      )
      if (duplicate) {
        throw new Error(`A category with name "${trimmedName}" already exists`)
      }

      const parent = input.parent_id ? existing.find((c) => c.id === input.parent_id) : null

      const newRecord: ProductCategoryRecord = {
        id: `cat-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        company_id: companyId,
        name: trimmedName,
        name_bn: input.name_bn || null,
        slug: generatedSlug,
        parent_id: input.parent_id || null,
        parent_name: parent ? parent.name : null,
        applies_to_product_types: input.applies_to_product_types && input.applies_to_product_types.length > 0
          ? input.applies_to_product_types
          : ['all'],
        description: input.description || null,
        is_active: input.is_active !== undefined ? input.is_active : true,
        display_order: input.display_order !== undefined ? Number(input.display_order) : existing.length + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      if (!isSupabaseConfigured() || isTestMode()) {
        const all = PrintERPDataStore.get<ProductCategoryRecord[]>(STORAGE_KEYS.PRODUCT_CATEGORIES) || []
        all.push(newRecord)
        PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_CATEGORIES, all)
        return newRecord
      }

      try {
        const supabase = await createClient()
        const { data, error } = await (supabase as any)
          .from('product_categories')
          .insert({
            company_id: companyId,
            name: newRecord.name,
            name_bn: newRecord.name_bn,
            slug: newRecord.slug,
            parent_id: newRecord.parent_id,
            applies_to_product_types: newRecord.applies_to_product_types,
            description: newRecord.description,
            is_active: newRecord.is_active,
            display_order: newRecord.display_order,
          })
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to create category: ${error.message}`)
        }

        return data as ProductCategoryRecord
      } catch (err: any) {
        if (isTestMode()) {
          const all = PrintERPDataStore.get<ProductCategoryRecord[]>(STORAGE_KEYS.PRODUCT_CATEGORIES) || []
          all.push(newRecord)
          PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_CATEGORIES, all)
          return newRecord
        }
        throw new Error(`Database error creating category: ${err.message}`)
      }
    })
  }

  /**
   * Updates an existing category
   */
  static async updateCategory(
    input: UpdateCategoryInput,
    companyId: string
  ): Promise<ProductCategoryRecord> {
    return measureAsync(`CategoryRepository.updateCategory(${input.id})`, async () => {
      const existing = await this.getCategories(companyId, false)
      const current = existing.find((c) => c.id === input.id)
      if (!current) {
        throw new Error(`Category not found with ID ${input.id}`)
      }

      if (input.parent_id && input.parent_id === input.id) {
        throw new Error('A category cannot be its own parent')
      }

      const trimmedName = input.name !== undefined ? input.name.trim() : current.name
      if (!trimmedName) {
        throw new Error('Category name cannot be empty')
      }

      const duplicate = existing.find(
        (c) => c.id !== input.id && c.name.toLowerCase() === trimmedName.toLowerCase()
      )
      if (duplicate) {
        throw new Error(`Another category with name "${trimmedName}" already exists`)
      }

      const updated: ProductCategoryRecord = {
        ...current,
        name: trimmedName,
        name_bn: input.name_bn !== undefined ? input.name_bn : current.name_bn,
        parent_id: input.parent_id !== undefined ? input.parent_id : current.parent_id,
        applies_to_product_types: input.applies_to_product_types || current.applies_to_product_types,
        description: input.description !== undefined ? input.description : current.description,
        is_active: input.is_active !== undefined ? input.is_active : current.is_active,
        display_order: input.display_order !== undefined ? Number(input.display_order) : current.display_order,
        updated_at: new Date().toISOString(),
      }

      if (!isSupabaseConfigured() || isTestMode()) {
        const all = PrintERPDataStore.get<ProductCategoryRecord[]>(STORAGE_KEYS.PRODUCT_CATEGORIES) || []
        const idx = all.findIndex((c) => c.id === input.id)
        if (idx !== -1) {
          all[idx] = updated
          PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_CATEGORIES, all)
        }
        return updated
      }

      try {
        const supabase = await createClient()
        const { data, error } = await (supabase as any)
          .from('product_categories')
          .update({
            name: updated.name,
            name_bn: updated.name_bn,
            parent_id: updated.parent_id,
            applies_to_product_types: updated.applies_to_product_types,
            description: updated.description,
            is_active: updated.is_active,
            display_order: updated.display_order,
            updated_at: updated.updated_at,
          })
          .eq('id', input.id)
          .eq('company_id', companyId)
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to update category: ${error.message}`)
        }

        return data as ProductCategoryRecord
      } catch (err: any) {
        if (isTestMode()) {
          const all = PrintERPDataStore.get<ProductCategoryRecord[]>(STORAGE_KEYS.PRODUCT_CATEGORIES) || []
          const idx = all.findIndex((c) => c.id === input.id)
          if (idx !== -1) {
            all[idx] = updated
            PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_CATEGORIES, all)
          }
          return updated
        }
        throw new Error(`Database error updating category: ${err.message}`)
      }
    })
  }

  /**
   * Deletes a category with foreign key / child checks
   */
  static async deleteCategory(id: string, companyId: string): Promise<boolean> {
    return measureAsync(`CategoryRepository.deleteCategory(${id})`, async () => {
      const existing = await this.getCategories(companyId, false)
      const current = existing.find((c) => c.id === id)
      if (!current) return true

      const hasChildren = existing.some((c) => c.parent_id === id)
      if (hasChildren) {
        throw new Error('Cannot delete category because it has subcategories. Remove or reassign subcategories first.')
      }

      if (!isSupabaseConfigured() || isTestMode()) {
        const all = PrintERPDataStore.get<ProductCategoryRecord[]>(STORAGE_KEYS.PRODUCT_CATEGORIES) || []
        const filtered = all.filter((c) => c.id !== id)
        PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_CATEGORIES, filtered)
        return true
      }

      try {
        const supabase = await createClient()
        const { error } = await (supabase as any)
          .from('product_categories')
          .delete()
          .eq('id', id)
          .eq('company_id', companyId)

        if (error) {
          throw new Error(`Failed to delete category: ${error.message}`)
        }
        return true
      } catch (err: any) {
        if (isTestMode()) {
          const all = PrintERPDataStore.get<ProductCategoryRecord[]>(STORAGE_KEYS.PRODUCT_CATEGORIES) || []
          const filtered = all.filter((c) => c.id !== id)
          PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_CATEGORIES, filtered)
          return true
        }
        throw new Error(`Database error deleting category: ${err.message}`)
      }
    })
  }
}
