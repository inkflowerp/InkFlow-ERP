'use server'

import { revalidatePath } from 'next/cache'
import { TrashService } from '@/services/trash.service'
import type { TrashCategory } from '@/types/trash.types'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import { withTenantAction } from '@/lib/actions/action-wrapper'

export const getTrashItemsAction = withTenantAction(
  {
    anyPermission: [
      'settings.manage',
      'trash.manage',
      'trash.view',
      'quotations.view',
      'quotations.edit',
      'orders.view',
      'orders.edit',
      'invoices.view',
      'invoices.edit',
      'customers.view',
      'customers.edit',
      'materials.view',
      'suppliers.view',
      'products.view',
      'all.manage',
    ],
  },
  async (ctx, companyId?: string, category?: TrashCategory) => {
    try {
      const data = await TrashService.getTrashItems(ctx.companyId, category)
      return { success: true, data }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch trash items' }
    }
  }
)

export const getTrashSummaryAction = withTenantAction(
  {
    anyPermission: [
      'settings.manage',
      'trash.manage',
      'trash.view',
      'quotations.view',
      'quotations.edit',
      'orders.view',
      'orders.edit',
      'invoices.view',
      'invoices.edit',
      'customers.view',
      'customers.edit',
      'materials.view',
      'suppliers.view',
      'products.view',
      'all.manage',
    ],
  },
  async (ctx, companyId?: string) => {
    try {
      const summary = await TrashService.getTrashSummary(ctx.companyId)
      return { success: true, summary }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to get trash summary' }
    }
  }
)

export const moveToTrashAction = withTenantAction(
  {
    anyPermission: [
      'settings.manage',
      'trash.manage',
      'quotations.delete',
      'quotations.edit',
      'quotations.view',
      'quotation.delete',
      'quotation.edit',
      'orders.delete',
      'orders.edit',
      'invoices.delete',
      'invoices.edit',
      'customers.delete',
      'customers.edit',
      'materials.edit',
      'materials.delete',
      'suppliers.edit',
      'suppliers.delete',
      'products.edit',
      'products.delete',
      'sales.manage',
      'all.manage',
    ],
    auditAction: 'trash.move_to',
    entityType: 'trash',
  },
  async (
    ctx,
    arg1: TrashCategory | { category: TrashCategory; item: any; companyId?: string; tenantSlug?: string },
    arg2?: any,
    arg3?: string,
    arg4?: string
  ) => {
    try {
      let category: TrashCategory
      let item: any
      let companyId: string | undefined
      let tenantSlug: string | undefined

      if (typeof arg1 === 'object' && arg1 !== null && 'category' in arg1) {
        category = arg1.category
        item = arg1.item
        companyId = arg1.companyId
        tenantSlug = arg1.tenantSlug
      } else {
        category = arg1 as TrashCategory
        item = arg2
        companyId = arg3
        tenantSlug = arg4
      }

      const effectiveCompanyId = ctx.companyId
      const deletedByName = ctx.tenant.fullName || (ctx.tenant as any)?.email || 'System User'

      const record = await TrashService.moveToTrash({
        category,
        item,
        companyId: effectiveCompanyId,
        deletedByName,
      })

      if (tenantSlug) {
        try {
          revalidatePath(`/${tenantSlug}/trash`)
          revalidatePath(`/${tenantSlug}/${category}`)
        } catch {}
      }

      return { success: true, record }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to move item to trash' }
    }
  }
)

export const restoreFromTrashAction = withTenantAction(
  {
    anyPermission: [
      'settings.manage',
      'trash.manage',
      'quotations.delete',
      'quotations.edit',
      'orders.edit',
      'invoices.edit',
      'customers.edit',
      'materials.edit',
      'suppliers.edit',
      'products.edit',
      'sales.manage',
      'all.manage',
    ],
    auditAction: 'trash.restore',
    entityType: 'trash',
  },
  async (
    ctx,
    arg1: string | { trashId: string; companyId?: string; tenantSlug?: string },
    arg2?: string,
    arg3?: string
  ) => {
    try {
      let trashId: string
      let companyId: string | undefined
      let tenantSlug: string | undefined

      if (typeof arg1 === 'object' && arg1 !== null && 'trashId' in arg1) {
        trashId = arg1.trashId
        companyId = arg1.companyId
        tenantSlug = arg1.tenantSlug
      } else {
        trashId = arg1
        companyId = arg2
        tenantSlug = arg3
      }

      const restored = await TrashService.restoreFromTrash(trashId, ctx.companyId)

      if (tenantSlug) {
        try {
          revalidatePath(`/${tenantSlug}/trash`)
        } catch {}
      }

      return { success: true, restored }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to restore item from trash' }
    }
  }
)

export const permanentDeleteAction = withTenantAction(
  {
    permission: 'settings.manage',
    destructive: true,
    auditAction: 'trash.permanent_delete',
    entityType: 'trash',
  },
  async (
    ctx,
    arg1: string | { trashId: string; companyId?: string; tenantSlug?: string },
    arg2?: string,
    arg3?: string
  ) => {
    try {
      let trashId: string
      let companyId: string | undefined
      let tenantSlug: string | undefined

      if (typeof arg1 === 'object' && arg1 !== null && 'trashId' in arg1) {
        trashId = arg1.trashId
        companyId = arg1.companyId
        tenantSlug = arg1.tenantSlug
      } else {
        trashId = arg1
        companyId = arg2
        tenantSlug = arg3
      }

      await TrashService.permanentDelete(trashId, ctx.companyId)

      if (tenantSlug) {
        try {
          revalidatePath(`/${tenantSlug}/trash`)
        } catch {}
      }

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to permanently delete item' }
    }
  }
)

export const emptyTrashAction = withTenantAction(
  {
    permission: 'settings.manage',
    destructive: true,
    auditAction: 'trash.empty',
    entityType: 'trash',
  },
  async (
    ctx,
    arg1?: string | { companyId?: string; category?: TrashCategory; tenantSlug?: string },
    arg2?: TrashCategory,
    arg3?: string
  ) => {
    try {
      let companyId: string | undefined
      let category: TrashCategory | undefined
      let tenantSlug: string | undefined

      if (typeof arg1 === 'object' && arg1 !== null) {
        companyId = arg1.companyId
        category = arg1.category
        tenantSlug = arg1.tenantSlug
      } else {
        companyId = arg1
        category = arg2
        tenantSlug = arg3
      }

      const count = await TrashService.emptyTrash(ctx.companyId, category)

      if (tenantSlug) {
        try {
          revalidatePath(`/${tenantSlug}/trash`)
        } catch {}
      }

      return { success: true, count }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to empty trash' }
    }
  }
)

export const purgeExpiredTrashAction = withTenantAction(
  {
    permission: 'settings.manage',
    destructive: true,
    auditAction: 'trash.purge_expired',
    entityType: 'trash',
  },
  async (
    ctx,
    arg1?: string | { companyId?: string; tenantSlug?: string; retentionDays?: number },
    arg2?: string,
    arg3?: number
  ) => {
    try {
      let companyId: string | undefined
      let tenantSlug: string | undefined
      let retentionDays: number | undefined

      if (typeof arg1 === 'object' && arg1 !== null) {
        companyId = arg1.companyId
        tenantSlug = arg1.tenantSlug
        retentionDays = arg1.retentionDays
      } else {
        companyId = arg1
        tenantSlug = arg2
        retentionDays = arg3
      }

      const result = await TrashService.purgeExpiredTrash(ctx.companyId, retentionDays)

      if (tenantSlug) {
        try {
          revalidatePath(`/${tenantSlug}/trash`)
        } catch {}
      }

      return { success: true, ...result }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to purge expired trash items' }
    }
  }
)
