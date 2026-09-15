'use server'

import { revalidatePath } from 'next/cache'
import { ProductService } from '@/services/product.service'
import { AuditService } from '@/services/audit.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import {
  ProductRecord,
  ProductVariantRecord,
  ProductFormulaRecord,
  PriceListRecord,
  PricingCalculationInput,
  PricingCalculationOutput,
} from '@/types/product.types'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

function checkProductPermission(tenant: any, requiredPerm: string): boolean {
  if (!tenant) return false
  if (tenant.companyRole === 'business_owner' || tenant.companyRole === 'admin') return true
  if (tenant.permissions?.includes('products.manage') || tenant.permissions?.includes('inventory.manage')) return true
  if (tenant.permissions?.includes(requiredPerm)) return true
  return false
}

// ==========================================
// PRODUCTS CRUD ACTIONS
// ==========================================

export async function getProductsAction(
  requestedCompanyId?: string,
  activeOnly: boolean = false
): Promise<ServerActionResult<ProductRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const prods = await ProductService.getProducts(companyId, activeOnly)
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

import { EntitlementService } from '@/services/entitlement.service'

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
    await EntitlementService.enforceLimit(companyId, 'max_products')

    if (!checkProductPermission(tenant, 'products.create') && !checkProductPermission(tenant, 'products.edit')) {
      return { success: false, error: 'Unauthorized: You do not have permission to create products.' }
    }

    if (!data.name?.trim() || !data.sku?.trim()) {
      return { success: false, error: 'Product name and SKU are required.' }
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
        `Created product ${created.name}`
      )
    } catch {}

    revalidatePath('/products')
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

    if (!checkProductPermission(tenant, 'products.edit')) {
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
        `Updated product ${id}`
      )
    } catch {}

    revalidatePath('/products')
    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update product.' }
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

    const success = await ProductService.deleteProduct(id, companyId)
    revalidatePath('/products')
    return { success: true, data: success }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete product.' }
  }
}

export async function updateProductPriceAction(
  productId: string,
  newPrice: number,
  reason?: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    if (!checkProductPermission(tenant, 'pricing.edit') && !checkProductPermission(tenant, 'products.edit')) {
      return { success: false, error: 'Unauthorized: You do not have permission to change prices.' }
    }

    const updated = await ProductService.updatePrice(
      productId,
      newPrice,
      reason,
      tenant.fullName || tenant.userEmail || 'Current User',
      companyId
    )
    if (!updated) return { success: false, error: 'Product not found.' }

    revalidatePath('/products')
    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update price.' }
  }
}

// ==========================================
// VARIANTS & FORMULAS ACTIONS
// ==========================================

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

    const variant = await ProductService.createProductVariant({
      ...data,
      company_id: companyId,
    })
    revalidatePath('/products')
    return { success: true, data: variant }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create variant.' }
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

    const formula = await ProductService.createProductFormula({
      ...data,
      company_id: companyId,
    })
    revalidatePath('/products')
    return { success: true, data: formula }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create formula.' }
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
