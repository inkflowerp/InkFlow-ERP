import {
  ProductRecord,
  PriceHistoryRecord,
  PriceOverrideRecord,
} from '@/types/product.types'



import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

export class ProductService {
  static async getProducts(companyId: string = 'c-01'): Promise<ProductRecord[]> {
    const prods = PrintERPDataStore.get<ProductRecord[]>(STORAGE_KEYS.PRODUCTS) || []
    return prods.filter((p) => !p.company_id || p.company_id === companyId)
  }

  static async getProductById(id: string, companyId: string = 'c-01'): Promise<ProductRecord | null> {
    const prods = await this.getProducts(companyId)
    return prods.find((p) => p.id === id || p.sku === id) || null
  }

  static async createProduct(data: Partial<ProductRecord>): Promise<ProductRecord> {
    const id = data.id || `prd-${Date.now()}`
    const newProduct: ProductRecord = {
      id,
      company_id: data.company_id || 'c-01',
      name: data.name || 'Product',
      name_bn: data.name_bn || null,
      sku: data.sku || `PRD-${Date.now().toString().slice(-4)}`,
      category: data.category || 'flex_banner',
      product_type: data.product_type || 'print_service',
      unit: data.unit || 'sft',
      material_spec: data.material_spec || null,
      description: data.description || null,
      base_cost: data.base_cost || 0,
      selling_price: data.selling_price || 0,
      min_price: data.min_price || 0,
      tax_rate: data.tax_rate || 7.5,
      pricing_formula: data.pricing_formula || {
        model: 'dimensional_area',
        min_area_sft: 4,
        material_rate: (data.base_cost || 0) * 0.6,
        print_rate: (data.base_cost || 0) * 0.4,
        default_margin_percent: 45.0,
      },
      is_active: data.is_active !== undefined ? data.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTS, newProduct)
    return newProduct
  }

  static async updateProduct(id: string, data: Partial<ProductRecord>): Promise<ProductRecord | null> {
    return PrintERPDataStore.updateItem<ProductRecord>(STORAGE_KEYS.PRODUCTS, id, data)
  }

  static async deleteProduct(id: string): Promise<boolean> {
    return PrintERPDataStore.removeItem(STORAGE_KEYS.PRODUCTS, id)
  }

  static async updatePrice(
    productId: string,
    newPrice: number,
    reason: string = 'Market cost adjustment',
    changedByName: string = 'Current User'
  ): Promise<ProductRecord | null> {
    const existing = await this.getProductById(productId)
    if (!existing) return null

    const oldPrice = existing.selling_price
    const updated = PrintERPDataStore.updateItem<ProductRecord>(STORAGE_KEYS.PRODUCTS, productId, {
      selling_price: newPrice,
    })

    const historyEntry: PriceHistoryRecord = {
      id: `ph-${Date.now()}`,
      company_id: existing.company_id,
      product_id: productId,
      old_price: oldPrice,
      new_price: newPrice,
      reason,
      changed_by_name: changedByName,
      created_at: new Date().toLocaleString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.PRICE_HISTORY, historyEntry)

    return updated
  }

  static async getPriceHistory(productId?: string): Promise<PriceHistoryRecord[]> {
    const history = PrintERPDataStore.get<PriceHistoryRecord[]>(STORAGE_KEYS.PRICE_HISTORY) || []
    if (productId) return history.filter((h) => h.product_id === productId)
    return history
  }
}

