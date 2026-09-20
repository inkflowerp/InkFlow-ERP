import type {
  ProductRecord,
  PriceHistoryRecord,
  ProductVariantRecord,
  ProductFormulaRecord,
  PriceListRecord,
  ProductUsageStats,
  ResolvedProductPrice,
  PricingCalculationInput,
  PricingCalculationOutput,
} from '../types/product.types.ts'
import { ProductRepository } from '../lib/repositories/product.repository.ts'
import { calculateJobPricing } from '../lib/pricing-engine.ts'

export class ProductService {
  static async getProducts(
    companyId: string,
    activeOnly: boolean = false,
    category?: string,
    search?: string,
    entityType?: string
  ): Promise<ProductRecord[]> {
    return ProductRepository.getProducts(companyId, activeOnly, category, search, entityType)
  }

  static async getProductById(id: string, companyId: string): Promise<ProductRecord | null> {
    return ProductRepository.getProductById(id, companyId)
  }

  static async createProduct(data: Partial<ProductRecord> & { company_id: string }): Promise<ProductRecord> {
    if (!data.company_id) {
      throw new Error('Tenant Company ID is required to create a product.')
    }
    return ProductRepository.createProduct({
      ...data,
      name: data.name || 'Product',
      sku: data.sku || `PRD-${Date.now().toString().slice(-4)}`,
      unit: (data.unit as any) || 'sft',
      selling_price: data.selling_price || 0,
    })
  }

  static async updateProduct(id: string, data: Partial<ProductRecord>, companyId: string): Promise<ProductRecord> {
    if (!companyId) throw new Error('Tenant Company ID is required to update a product.')
    return ProductRepository.updateProduct(id, data, companyId)
  }

  static async archiveProduct(id: string, isArchived: boolean, companyId: string): Promise<ProductRecord> {
    if (!companyId) throw new Error('Tenant Company ID is required to archive a product.')
    return ProductRepository.archiveProduct(id, isArchived, companyId)
  }

  static async restoreProduct(id: string, companyId: string): Promise<ProductRecord> {
    if (!companyId) throw new Error('Tenant Company ID is required to restore a product.')
    return ProductRepository.restoreProduct(id, companyId)
  }

  static async checkProductDeletionSafety(productId: string, companyId: string) {
    if (!companyId) throw new Error('Tenant Company ID is required.')
    return ProductRepository.checkProductDeletionSafety(productId, companyId)
  }

  static async deleteProduct(id: string, companyId: string): Promise<{ deleted: boolean; archived: boolean; message: string }> {
    if (!companyId) throw new Error('Tenant Company ID is required to delete a product.')
    return ProductRepository.deleteProduct(id, companyId)
  }

  static async updatePrice(
    productId: string,
    newPrice: number,
    reason: string = 'Market cost adjustment',
    changedByName: string = 'Current User',
    changedByUserIdOrCompanyId: string | null = null,
    companyIdArg?: string,
    commercialDetails?: {
      newPurchasePrice?: number
      newTargetMarginPercent?: number
      newWastagePercent?: number
    }
  ): Promise<ProductRecord | null> {
    const effectiveCompanyId = companyIdArg || (changedByUserIdOrCompanyId && typeof changedByUserIdOrCompanyId === 'string' ? changedByUserIdOrCompanyId : '')
    const effectiveUserId = companyIdArg ? changedByUserIdOrCompanyId : null

    if (!effectiveCompanyId) throw new Error('Tenant Company ID is required.')
    const existing = await this.getProductById(productId, effectiveCompanyId)
    if (!existing) return null

    const safeNewPrice = Math.max(0, Number(newPrice) || 0)
    const updatePayload: Partial<ProductRecord> = { selling_price: safeNewPrice }
    if (commercialDetails?.newPurchasePrice !== undefined) {
      updatePayload.purchase_price = Math.max(0, Number(commercialDetails.newPurchasePrice))
    }
    if (commercialDetails?.newTargetMarginPercent !== undefined) {
      updatePayload.target_margin_percentage = Number(commercialDetails.newTargetMarginPercent)
    }
    if (commercialDetails?.newWastagePercent !== undefined) {
      updatePayload.default_wastage_percentage = Math.max(0, Number(commercialDetails.newWastagePercent))
    }

    const updated = await this.updateProduct(productId, updatePayload, effectiveCompanyId)

    await ProductRepository.recordPriceChange(
      productId,
      existing.selling_price,
      safeNewPrice,
      reason,
      effectiveCompanyId,
      effectiveUserId,
      changedByName,
      {
        oldPurchasePrice: existing.purchase_price,
        newPurchasePrice: commercialDetails?.newPurchasePrice !== undefined ? commercialDetails.newPurchasePrice : existing.purchase_price,
        oldMarginPercent: existing.target_margin_percentage,
        newMarginPercent: commercialDetails?.newTargetMarginPercent !== undefined ? commercialDetails.newTargetMarginPercent : existing.target_margin_percentage,
        oldWastagePercent: existing.default_wastage_percentage,
        newWastagePercent: commercialDetails?.newWastagePercent !== undefined ? commercialDetails.newWastagePercent : existing.default_wastage_percentage,
      }
    )

    return updated
  }

  static async getPriceHistory(productId?: string, companyId?: string): Promise<PriceHistoryRecord[]> {
    return ProductRepository.getProductPriceHistory(productId, companyId)
  }

  static async getProductUsageStats(productId: string, companyId: string): Promise<ProductUsageStats> {
    if (!companyId) throw new Error('Tenant Company ID is required.')
    return ProductRepository.getProductUsageStats(productId, companyId)
  }

  static async resolveCustomerProductPrice(
    productId: string,
    customerId: string | undefined,
    companyId: string,
    options?:
      | {
          allowFloorOverride?: boolean
          overrideReason?: string
          authorizedBy?: string
          tier?: string
        }
      | string
  ): Promise<ResolvedProductPrice> {
    if (!companyId) throw new Error('Tenant Company ID is required.')
    return ProductRepository.resolveCustomerProductPrice(productId, customerId, companyId, options)
  }

  // ============================================================================
  // VARIANTS
  // ============================================================================

  static async getProductVariants(productId: string, companyId: string): Promise<ProductVariantRecord[]> {
    if (!companyId) throw new Error('Tenant Company ID is required.')
    return ProductRepository.getProductVariants(productId, companyId)
  }

  static async createProductVariant(data: Partial<ProductVariantRecord> & {
    company_id: string
    product_id: string
    variant_name: string
  }): Promise<ProductVariantRecord> {
    if (!data.company_id) throw new Error('Tenant Company ID is required.')
    return ProductRepository.createProductVariant(data)
  }

  static async deleteProductVariant(variantId: string, companyId: string): Promise<boolean> {
    if (!companyId) throw new Error('Tenant Company ID is required.')
    return ProductRepository.deleteProductVariant(variantId, companyId)
  }

  // ============================================================================
  // FORMULAS
  // ============================================================================

  static async getProductFormulas(productId: string, companyId: string): Promise<ProductFormulaRecord[]> {
    if (!companyId) throw new Error('Tenant Company ID is required.')
    return ProductRepository.getProductFormulas(productId, companyId)
  }

  static async createProductFormula(data: Partial<ProductFormulaRecord> & {
    company_id: string
    product_id: string
    model: any
  }): Promise<ProductFormulaRecord> {
    if (!data.company_id) throw new Error('Tenant Company ID is required.')
    return ProductRepository.createProductFormula(data)
  }

  // ============================================================================
  // PRICE LISTS
  // ============================================================================

  static async getPriceLists(companyId: string): Promise<PriceListRecord[]> {
    if (!companyId) throw new Error('Tenant Company ID is required.')
    return ProductRepository.getPriceLists(companyId)
  }

  static async createPriceList(data: Partial<PriceListRecord> & {
    company_id: string
    name: string
    code: string
  }): Promise<PriceListRecord> {
    if (!data.company_id) throw new Error('Tenant Company ID is required.')
    return ProductRepository.createPriceList(data)
  }

  // ============================================================================
  // SUPPLIER PURCHASE ECONOMICS
  // ============================================================================

  static async getProductSupplierPrices(productId: string, companyId: string) {
    if (!companyId) throw new Error('Tenant Company ID is required.')
    return ProductRepository.getProductSupplierPrices(productId, companyId)
  }

  static async saveProductSupplierPrice(companyId: string, data: any) {
    if (!companyId) throw new Error('Tenant Company ID is required.')
    return ProductRepository.saveProductSupplierPrice(companyId, data)
  }

  static async deleteProductSupplierPrice(id: string, companyId: string) {
    if (!companyId) throw new Error('Tenant Company ID is required.')
    return ProductRepository.deleteProductSupplierPrice(id, companyId)
  }

  // ============================================================================
  // PRICE OVERRIDES AUDITING
  // ============================================================================

  static async logPriceOverride(companyId: string, data: any) {
    if (!companyId) throw new Error('Tenant Company ID is required.')
    return ProductRepository.logPriceOverride(companyId, data)
  }

  static async getPriceOverrides(companyId: string, productId?: string, limit?: number) {
    if (!companyId) throw new Error('Tenant Company ID is required.')
    return ProductRepository.getPriceOverrides(companyId, productId, limit)
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
