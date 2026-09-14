import type {
  ProductRecord,
  PriceHistoryRecord,
  ProductVariantRecord,
  ProductFormulaRecord,
  PriceListRecord,
  PricingCalculationInput,
  PricingCalculationOutput,
} from '../types/product.types.ts'
import { ProductRepository } from '../lib/repositories/product.repository.ts'
import { calculateJobPricing } from '../lib/pricing-engine.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../lib/db/data-store.ts'

export class ProductService {
  static async getProducts(companyId: string = 'c-01', activeOnly: boolean = false): Promise<ProductRecord[]> {
    return ProductRepository.getProducts(companyId, activeOnly)
  }

  static async getProductById(id: string, companyId: string = 'c-01'): Promise<ProductRecord | null> {
    return ProductRepository.getProductById(id, companyId)
  }

  static async createProduct(data: Partial<ProductRecord>): Promise<ProductRecord> {
    const companyId = data.company_id || 'c-01'
    return ProductRepository.createProduct({
      ...data,
      company_id: companyId,
      name: data.name || 'Product',
      sku: data.sku || `PRD-${Date.now().toString().slice(-4)}`,
      unit: (data.unit as any) || 'sft',
      selling_price: data.selling_price || 0,
    })
  }

  static async updateProduct(id: string, data: Partial<ProductRecord>, companyId: string = 'c-01'): Promise<ProductRecord | null> {
    return ProductRepository.updateProduct(id, data, companyId)
  }

  static async deleteProduct(id: string, companyId: string = 'c-01'): Promise<boolean> {
    return ProductRepository.deleteProduct(id, companyId)
  }

  static async updatePrice(
    productId: string,
    newPrice: number,
    reason: string = 'Market cost adjustment',
    changedByName: string = 'Current User',
    companyId: string = 'c-01'
  ): Promise<ProductRecord | null> {
    const existing = await this.getProductById(productId, companyId)
    if (!existing) return null

    const updated = await this.updateProduct(productId, { selling_price: newPrice }, companyId)

    const historyEntry: PriceHistoryRecord = {
      id: `ph-${Date.now()}`,
      company_id: existing.company_id,
      product_id: productId,
      old_price: existing.selling_price,
      new_price: newPrice,
      reason,
      changed_by_name: changedByName,
      created_at: new Date().toISOString(),
    }
    try {
      PrintERPDataStore.addItem(STORAGE_KEYS.PRICE_HISTORY, historyEntry)
    } catch {
      // Non-blocking
    }

    return updated
  }

  static async getPriceHistory(productId?: string): Promise<PriceHistoryRecord[]> {
    const history = PrintERPDataStore.get<PriceHistoryRecord[]>(STORAGE_KEYS.PRICE_HISTORY) || []
    if (productId) return history.filter((h) => h.product_id === productId)
    return history
  }

  // ============================================================================
  // VARIANTS
  // ============================================================================

  static async getProductVariants(productId: string, companyId: string = 'c-01'): Promise<ProductVariantRecord[]> {
    return ProductRepository.getProductVariants(productId, companyId)
  }

  static async createProductVariant(data: Partial<ProductVariantRecord> & {
    company_id: string
    product_id: string
    variant_name: string
  }): Promise<ProductVariantRecord> {
    return ProductRepository.createProductVariant(data)
  }

  // ============================================================================
  // FORMULAS
  // ============================================================================

  static async getProductFormulas(productId: string, companyId: string = 'c-01'): Promise<ProductFormulaRecord[]> {
    return ProductRepository.getProductFormulas(productId, companyId)
  }

  static async createProductFormula(data: Partial<ProductFormulaRecord> & {
    company_id: string
    product_id: string
    model: any
  }): Promise<ProductFormulaRecord> {
    return ProductRepository.createProductFormula(data)
  }

  // ============================================================================
  // PRICE LISTS
  // ============================================================================

  static async getPriceLists(companyId: string = 'c-01'): Promise<PriceListRecord[]> {
    return ProductRepository.getPriceLists(companyId)
  }

  static async createPriceList(data: Partial<PriceListRecord> & {
    company_id: string
    name: string
    code: string
  }): Promise<PriceListRecord> {
    return ProductRepository.createPriceList(data)
  }

  // ============================================================================
  // PRICING CALCULATION
  // ============================================================================

  static calculateProductPrice(
    product: ProductRecord,
    input: PricingCalculationInput
  ): PricingCalculationOutput {
    return calculateJobPricing(product.pricing_formula, input, product.min_price)
  }
}
