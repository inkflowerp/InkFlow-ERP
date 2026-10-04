'use server'

import { revalidatePath } from 'next/cache'
import { CategoryService } from '@/services/category.service'
import { AuditService } from '@/services/audit.service'
import { withTenantAction } from '@/lib/actions/action-wrapper'
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

export const getCategoriesAction = withTenantAction(
  { permission: 'products.view' },
  async (
    ctx,
    requestedCompanyId?: string,
    activeOnly: boolean = false,
    productType?: string,
    search?: string
  ): Promise<ServerActionResult<ProductCategoryRecord[]>> => {
    try {
      const categories = await CategoryService.getCategories(
        ctx.companyId,
        activeOnly,
        productType,
        search
      )
      return { success: true, data: categories }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch categories.' }
    }
  }
)

export const getCategoryTreeAction = withTenantAction(
  { permission: 'products.view' },
  async (
    ctx,
    requestedCompanyId?: string,
    activeOnly: boolean = false
  ): Promise<ServerActionResult<CategoryTreeItem[]>> => {
    try {
      const tree = await CategoryService.getCategoryTree(ctx.companyId, activeOnly)
      return { success: true, data: tree }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch category tree.' }
    }
  }
)

export const createCategoryAction = withTenantAction(
  { permission: 'products.create', auditAction: 'category.create', entityType: 'product_category' },
  async (
    ctx,
    input: CreateCategoryInput,
    requestedCompanyId?: string
  ): Promise<ServerActionResult<ProductCategoryRecord>> => {
    try {
      const cat = await CategoryService.createCategory(input, ctx.companyId)

      await AuditService.logEvent(
        ctx.companyId,
        ctx.userId || null,
        ctx.user.email || null,
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
)

export const updateCategoryAction = withTenantAction(
  { permission: 'products.edit', auditAction: 'category.update', entityType: 'product_category' },
  async (
    ctx,
    input: UpdateCategoryInput,
    requestedCompanyId?: string
  ): Promise<ServerActionResult<ProductCategoryRecord>> => {
    try {
      const cat = await CategoryService.updateCategory(input, ctx.companyId)

      await AuditService.logEvent(
        ctx.companyId,
        ctx.userId || null,
        ctx.user.email || null,
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
)

export const deleteCategoryAction = withTenantAction(
  {
    permission: 'products.delete',
    destructive: true,
    auditAction: 'category.delete',
    entityType: 'product_category',
  },
  async (
    ctx,
    id: string,
    requestedCompanyId?: string
  ): Promise<ServerActionResult<boolean>> => {
    try {
      const success = await CategoryService.deleteCategory(id, ctx.companyId)

      await AuditService.logEvent(
        ctx.companyId,
        ctx.userId || null,
        ctx.user.email || null,
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
)

export const seedDefaultCategoriesAction = withTenantAction(
  { permission: 'products.create', auditAction: 'category.seed', entityType: 'product_category' },
  async (
    ctx,
    requestedCompanyId?: string
  ): Promise<ServerActionResult<ProductCategoryRecord[]>> => {
    try {
      const seeded = await CategoryService.seedDefaultCategories(ctx.companyId)
      revalidatePath('/[tenantSlug]/products', 'page')
      return { success: true, data: seeded }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to seed categories.' }
    }
  }
)
