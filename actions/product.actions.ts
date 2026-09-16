'use server'

import { revalidatePath } from 'next/cache'
import { ProductService } from '@/services/product.service'
import { AuditService } from '@/services/audit.service'
import { EntitlementService } from '@/services/entitlement.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import type {
  ProductRecord,
  ProductVariantRecord,
  ProductFormulaRecord,
  PriceListRecord,
  PriceHistoryRecord,
  PriceOverrideRecord,
  ProductSupplierPriceRecord,
  ProductUsageStats,
  ResolvedProductPrice,
  PricingCalculationInput,
  PricingCalculationOutput,
} from '@/types/product.types'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
  deletionResult?: { deleted: boolean; archived: boolean; message: string }
}

function checkProductPermission(tenant: any, requiredPerm: string): boolean {
  if (!tenant) return false
  if (tenant.companyRole === 'business_owner' || tenant.companyRole === 'admin' || tenant.companyRole === 'platform_owner') {
    return true
  }
  if (tenant.permissions?.includes('products.manage') || tenant.permissions?.includes('inventory.manage')) {
    return true
  }
  if (tenant.permissions?.includes(requiredPerm)) {
    return true
  }
  return false
}

// ==========================================
// PRODUCTS CRUD ACTIONS
// ==========================================

export async function getProductsAction(
  requestedCompanyId?: string,
  activeOnly: boolean = false,
  category?: string,
  search?: string
): Promise<ServerActionResult<ProductRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const prods = await ProductService.getProducts(companyId, activeOnly, category, search)
    return { success: true, data: prods }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch products.' }
  }
}

export async function getProductByIdAction(
  id: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductRecord | null>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const prod = await ProductService.getProductById(id, companyId)
    return { success: true, data: prod }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch product.' }
  }
}

export async function createProductAction(
  data: Partial<ProductRecord> & {
    sku: string
    name: string
    unit: any
    selling_price: number
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    // Enforce Plan Product Limit
    try {
      await EntitlementService.enforceLimit(companyId, 'max_products')
    } catch (limErr: any) {
      return { success: false, error: limErr.message || 'Catalog product limit reached for current subscription plan.' }
    }

    if (!checkProductPermission(tenant, 'products.create') && !checkProductPermission(tenant, 'inventory.create')) {
      return { success: false, error: 'Unauthorized: You do not have permission to create catalog items.' }
    }

    if (!data.name?.trim() || !data.sku?.trim()) {
      return { success: false, error: 'Product name and SKU code are required.' }
    }

    const created = await ProductService.createProduct({
      ...data,
      company_id: companyId,
      created_by: tenant.userId,
    })

    try {
      await AuditService.logEvent(
        companyId,
        tenant.userId,
        tenant.userEmail,
        'create',
        'product',
        created.id,
        null,
        { name: created.name, sku: created.sku, price: created.selling_price },
        `Created catalog item ${created.name} (${created.sku})`
      )
    } catch {}

    revalidatePath(`/${tenant.companySlug || 'tenant'}/products`)
    revalidatePath(`/${tenant.companySlug || 'tenant'}/pricing`)
    return { success: true, data: created }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create product.' }
  }
}

export async function updateProductAction(
  id: string,
  data: Partial<ProductRecord>,
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    if (!checkProductPermission(tenant, 'products.edit') && !checkProductPermission(tenant, 'inventory.edit')) {
      return { success: false, error: 'Unauthorized: You do not have permission to edit products.' }
    }

    const updated = await ProductService.updateProduct(id, data, companyId)
    if (!updated) return { success: false, error: 'Product not found.' }

    try {
      await AuditService.logEvent(
        companyId,
        tenant.userId,
        tenant.userEmail,
        'update',
        'product',
        id,
        null,
        data,
        `Updated catalog item ${updated.name} (${updated.sku})`
      )
    } catch {}

    revalidatePath(`/${tenant.companySlug || 'tenant'}/products`)
    revalidatePath(`/${tenant.companySlug || 'tenant'}/products/${id}`)
    revalidatePath(`/${tenant.companySlug || 'tenant'}/pricing`)
    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update product.' }
  }
}

export async function archiveProductAction(
  id: string,
  isArchived: boolean,
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    if (!checkProductPermission(tenant, 'products.edit') && !checkProductPermission(tenant, 'products.delete')) {
      return { success: false, error: 'Unauthorized: You do not have permission to archive products.' }
    }

    const updated = await ProductService.archiveProduct(id, isArchived, companyId)

    try {
      await AuditService.logEvent(
        companyId,
        tenant.userId,
        tenant.userEmail,
        'update',
        'product',
        id,
        null,
        { is_active: !isArchived },
        `${isArchived ? 'Archived' : 'Restored'} product ${updated.name}`
      )
    } catch {}

    revalidatePath(`/${tenant.companySlug || 'tenant'}/products`)
    revalidatePath(`/${tenant.companySlug || 'tenant'}/products/${id}`)
    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update product status.' }
  }
}

export async function restoreProductAction(
  id: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductRecord>> {
  return archiveProductAction(id, false, requestedCompanyId)
}

export async function checkProductDeletionSafetyAction(
  id: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<{ isSafe: boolean; references: any; reason?: string }>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const safety = await ProductService.checkProductDeletionSafety(id, companyId)
    return { success: true, data: safety }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to check deletion safety.' }
  }
}

export async function deleteProductAction(
  id: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<boolean>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    if (!checkProductPermission(tenant, 'products.delete') && !checkProductPermission(tenant, 'products.manage')) {
      return { success: false, error: 'Unauthorized: You do not have permission to delete products.' }
    }

    const result = await ProductService.deleteProduct(id, companyId)

    try {
      await AuditService.logEvent(
        companyId,
        tenant.userId,
        tenant.userEmail,
        'delete',
        'product',
        id,
        null,
        result,
        result.deleted ? `Permanently deleted product ${id}` : `Archived referenced product ${id}`
      )
    } catch {}

    revalidatePath(`/${tenant.companySlug || 'tenant'}/products`)
    revalidatePath(`/${tenant.companySlug || 'tenant'}/pricing`)
    return { success: true, data: result.deleted, deletionResult: result }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete product.' }
  }
}

export async function updateProductPriceAction(
  productId: string,
  newPrice: number,
  reason?: string,
  requestedCompanyId?: string,
  commercialDetails?: {
    newPurchasePrice?: number
    newTargetMarginPercent?: number
    newWastagePercent?: number
  }
): Promise<ServerActionResult<ProductRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    if (
      !checkProductPermission(tenant, 'pricing.edit') &&
      !checkProductPermission(tenant, 'pricing.manage') &&
      !checkProductPermission(tenant, 'products.edit')
    ) {
      return { success: false, error: 'Unauthorized: You do not have permission to change catalog prices.' }
    }

    if (newPrice < 0 || isNaN(newPrice)) {
      return { success: false, error: 'Price must be a non-negative number.' }
    }

    const updated = await ProductService.updatePrice(
      productId,
      newPrice,
      reason || 'Manual catalog price adjustment',
      tenant.fullName || tenant.userEmail || 'Current User',
      tenant.userId,
      companyId,
      commercialDetails
    )
    if (!updated) return { success: false, error: 'Product not found.' }

    try {
      await AuditService.logEvent(
        companyId,
        tenant.userId,
        tenant.userEmail,
        'update',
        'product_price',
        productId,
        null,
        { new_price: newPrice, reason, commercialDetails },
        `Adjusted price of ${updated.name} to ৳${newPrice}`
      )
    } catch {}

    revalidatePath(`/${tenant.companySlug || 'tenant'}/products`)
    revalidatePath(`/${tenant.companySlug || 'tenant'}/products/${productId}`)
    revalidatePath(`/${tenant.companySlug || 'tenant'}/pricing`)
    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update price.' }
  }
}

export async function getProductPriceHistoryAction(
  productId?: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<PriceHistoryRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const history = await ProductService.getPriceHistory(productId, companyId)
    return { success: true, data: history }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch price history.' }
  }
}

export async function getProductUsageStatsAction(
  productId: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductUsageStats>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const stats = await ProductService.getProductUsageStats(productId, companyId)
    return { success: true, data: stats }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch product usage statistics.' }
  }
}

export async function resolveProductCustomerPriceAction(
  productId: string,
  customerId?: string,
  options?: {
    allowFloorOverride?: boolean
    overrideReason?: string
    authorizedBy?: string
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<ResolvedProductPrice>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const resolved = await ProductService.resolveCustomerProductPrice(productId, customerId, companyId, options)
    return { success: true, data: resolved }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to resolve customer price.' }
  }
}

// ==========================================
// VARIANTS & FORMULAS ACTIONS
// ==========================================

export async function getProductVariantsAction(
  productId: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductVariantRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const variants = await ProductService.getProductVariants(productId, companyId)
    return { success: true, data: variants }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch variants.' }
  }
}

export async function createProductVariantAction(
  data: Partial<ProductVariantRecord> & {
    product_id: string
    variant_name: string
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductVariantRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    if (!checkProductPermission(tenant, 'products.edit')) {
      return { success: false, error: 'Unauthorized: You do not have permission to manage variants.' }
    }

    const variant = await ProductService.createProductVariant({
      ...data,
      company_id: companyId,
    })
    revalidatePath(`/${tenant.companySlug || 'tenant'}/products/${data.product_id}`)
    return { success: true, data: variant }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create variant.' }
  }
}

export async function deleteProductVariantAction(
  variantId: string,
  productId: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<boolean>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    if (!checkProductPermission(tenant, 'products.edit')) {
      return { success: false, error: 'Unauthorized: You do not have permission to manage variants.' }
    }

    const res = await ProductService.deleteProductVariant(variantId, companyId)
    revalidatePath(`/${tenant.companySlug || 'tenant'}/products/${productId}`)
    return { success: true, data: res }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete variant.' }
  }
}

export async function getProductFormulasAction(
  productId: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductFormulaRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const formulas = await ProductService.getProductFormulas(productId, companyId)
    return { success: true, data: formulas }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch formulas.' }
  }
}

export async function createProductFormulaAction(
  data: Partial<ProductFormulaRecord> & {
    product_id: string
    model: any
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductFormulaRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    if (!checkProductPermission(tenant, 'pricing.edit') && !checkProductPermission(tenant, 'products.edit')) {
      return { success: false, error: 'Unauthorized: You do not have permission to create formulas.' }
    }

    const formula = await ProductService.createProductFormula({
      ...data,
      company_id: companyId,
    })
    revalidatePath(`/${tenant.companySlug || 'tenant'}/products/${data.product_id}`)
    return { success: true, data: formula }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create formula.' }
  }
}

export async function getPriceListsAction(
  requestedCompanyId?: string
): Promise<ServerActionResult<PriceListRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const lists = await ProductService.getPriceLists(companyId)
    return { success: true, data: lists }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch price lists.' }
  }
}

export async function createPriceListAction(
  data: Partial<PriceListRecord> & {
    name: string
    code: string
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<PriceListRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    if (!checkProductPermission(tenant, 'pricing.edit') && !checkProductPermission(tenant, 'pricing.manage')) {
      return { success: false, error: 'Unauthorized: You do not have permission to manage price lists.' }
    }

    const list = await ProductService.createPriceList({
      ...data,
      company_id: companyId,
    })
    revalidatePath(`/${tenant.companySlug || 'tenant'}/products`)
    return { success: true, data: list }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create price list.' }
  }
}

export async function calculateProductPricingAction(
  productId: string,
  input: PricingCalculationInput,
  requestedCompanyId?: string
): Promise<ServerActionResult<PricingCalculationOutput>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const product = await ProductService.getProductById(productId, companyId)
    if (!product) return { success: false, error: 'Product not found.' }

    const result = ProductService.calculateProductPrice(product, input)
    return { success: true, data: result }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to calculate pricing.' }
  }
}

// ==========================================
// SUPPLIER PURCHASE ECONOMICS ACTIONS
// ==========================================

export async function getProductSupplierPricesAction(
  productId: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductSupplierPriceRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const prices = await ProductService.getProductSupplierPrices(productId, companyId)
    return { success: true, data: prices }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch supplier prices.' }
  }
}

export async function saveProductSupplierPriceAction(
  data: Partial<ProductSupplierPriceRecord> & { product_id: string; supplier_name: string; purchase_price: number },
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductSupplierPriceRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    if (!checkProductPermission(tenant, 'products.manage_costing') && !checkProductPermission(tenant, 'products.edit')) {
      return { success: false, error: 'Unauthorized: You do not have permission to manage supplier purchase prices.' }
    }

    const saved = await ProductService.saveProductSupplierPrice(companyId, data)
    revalidatePath(`/${tenant.companySlug || 'tenant'}/products/${data.product_id}`)
    return { success: true, data: saved }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save supplier price.' }
  }
}

export async function deleteProductSupplierPriceAction(
  id: string,
  productId: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<boolean>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    if (!checkProductPermission(tenant, 'products.manage_costing') && !checkProductPermission(tenant, 'products.edit')) {
      return { success: false, error: 'Unauthorized: You do not have permission to delete supplier prices.' }
    }

    await ProductService.deleteProductSupplierPrice(id, companyId)
    revalidatePath(`/${tenant.companySlug || 'tenant'}/products/${productId}`)
    return { success: true, data: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete supplier price.' }
  }
}

// ==========================================
// PRICE OVERRIDES AUDITING ACTIONS
// ==========================================

export async function getPriceOverridesAction(
  productId?: string,
  limit: number = 50,
  requestedCompanyId?: string
): Promise<ServerActionResult<PriceOverrideRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const overrides = await ProductService.getPriceOverrides(companyId, productId, limit)
    return { success: true, data: overrides }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch price overrides.' }
  }
}

export async function logPriceOverrideAction(
  data: Partial<PriceOverrideRecord> & { original_price: number; override_price: number; reason: string },
  requestedCompanyId?: string
): Promise<ServerActionResult<PriceOverrideRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const entry = await ProductService.logPriceOverride(companyId, {
      ...data,
      authorized_by_id: tenant.userId,
      authorized_by_name: (tenant as any).userName || (tenant as any).name || tenant.userId || 'Authorized User',
      tenant_slug: tenant.companySlug,
    })

    return { success: true, data: entry }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to log price override.' }
  }
}
