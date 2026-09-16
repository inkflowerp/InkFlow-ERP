import type { CommercialProductType, ProductType } from './product.types'

export interface ProductCategoryRecord {
  id: string
  company_id: string
  name: string
  name_bn?: string | null
  slug: string
  parent_id?: string | null
  parent_name?: string | null
  applies_to_product_types: string[] // e.g. ['production_product', 'finishing', 'all']
  description?: string | null
  is_active: boolean
  display_order: number
  product_count?: number
  created_at: string
  updated_at: string
}

export interface CreateCategoryInput {
  name: string
  name_bn?: string | null
  parent_id?: string | null
  applies_to_product_types?: string[]
  description?: string | null
  is_active?: boolean
  display_order?: number
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {
  id: string
}

export interface CategoryTreeItem extends ProductCategoryRecord {
  children?: CategoryTreeItem[]
}
