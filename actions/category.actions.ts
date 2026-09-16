'use server'

import { revalidatePath } from 'next/cache'
import { CategoryService } from '@/services/category.service'
import { AuditService } from '@/services/audit.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import type {
  ProductCategoryRecord,
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoryTreeItem,
} from '@/types/category.types'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

function checkCategoryPermission(tenant: any, requiredPerm: string): boolean {
  if (!tenant) return false
  if (
    tenant.companyRole === 'business_owner' ||
    tenant.companyRole === 'admin' ||
    tenant.companyRole === 'platform_owner'
  ) {
    return true
  }
  if (
    tenant.permissions?.includes('products.manage') ||
    tenant.permissions?.includes('inventory.manage')
  ) {
    return true
  }
  if (tenant.permissions?.includes(requiredPerm)) {
    return true
  }
  return false
}

export async function getCategoriesAction(
  requestedCompanyId?: string,
  activeOnly: boolean = false,
  productType?: string,
  search?: string
): Promise<ServerActionResult<ProductCategoryRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }

    const categories = await CategoryService.getCategories(
      tenant.companyId,
      activeOnly,
      productType,
      search
    )
    return { success: true, data: categories }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch categories.' }
  }
}

export async function getCategoryTreeAction(
  requestedCompanyId?: string,
  activeOnly: boolean = false
): Promise<ServerActionResult<CategoryTreeItem[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }

    const tree = await CategoryService.getCategoryTree(tenant.companyId, activeOnly)
    return { success: true, data: tree }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch category tree.' }
  }
}

export async function createCategoryAction(
  input: CreateCategoryInput,
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductCategoryRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }

    if (!checkCategoryPermission(tenant, 'products.create')) {
      return { success: false, error: 'Forbidden: You do not have permission to create categories.' }
    }

    const cat = await CategoryService.createCategory(input, tenant.companyId)

    await AuditService.logEvent(
      tenant.companyId,
      tenant.userId || null,
      tenant.userEmail || null,
      'category.create',
      'product_category',
      cat.id,
      null,
      { name: cat.name, slug: cat.slug, parent_id: cat.parent_id },
      `Created product category "${cat.name}"`
    ).catch(() => {})

    revalidatePath('/[tenantSlug]/products', 'page')
    return { success: true, data: cat }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create category.' }
  }
}

export async function updateCategoryAction(
  input: UpdateCategoryInput,
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductCategoryRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }

    if (!checkCategoryPermission(tenant, 'products.edit')) {
      return { success: false, error: 'Forbidden: You do not have permission to edit categories.' }
    }

    const cat = await CategoryService.updateCategory(input, tenant.companyId)

    await AuditService.logEvent(
      tenant.companyId,
      tenant.userId || null,
      tenant.userEmail || null,
      'category.update',
      'product_category',
      cat.id,
      null,
      { name: cat.name, updates: input },
      `Updated product category "${cat.name}"`
    ).catch(() => {})

    revalidatePath('/[tenantSlug]/products', 'page')
    return { success: true, data: cat }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update category.' }
  }
}

export async function deleteCategoryAction(
  id: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<boolean>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }

    if (!checkCategoryPermission(tenant, 'products.delete')) {
      return { success: false, error: 'Forbidden: You do not have permission to delete categories.' }
    }

    const success = await CategoryService.deleteCategory(id, tenant.companyId)

    await AuditService.logEvent(
      tenant.companyId,
      tenant.userId || null,
      tenant.userEmail || null,
      'category.delete',
      'product_category',
      id,
      null,
      { id },
      `Deleted product category "${id}"`
    ).catch(() => {})

    revalidatePath('/[tenantSlug]/products', 'page')
    return { success: true, data: success }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete category.' }
  }
}

export async function seedDefaultCategoriesAction(
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductCategoryRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }

    const seeded = await CategoryService.seedDefaultCategories(tenant.companyId)
    revalidatePath('/[tenantSlug]/products', 'page')
    return { success: true, data: seeded }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to seed categories.' }
  }
}
