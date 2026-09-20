'use server'

import { revalidatePath } from 'next/cache'
import { TrashService } from '@/services/trash.service'
import type { TrashCategory } from '@/types/trash.types'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'

export async function getTrashItemsAction(companyId?: string, category?: TrashCategory) {
  try {
    const tenant = await getCurrentTenant(companyId)
    const effectiveCompanyId = companyId || tenant?.companyId || 'default'
    const data = await TrashService.getTrashItems(effectiveCompanyId, category)
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch trash items' }
  }
}

export async function getTrashSummaryAction(companyId?: string) {
  try {
    const tenant = await getCurrentTenant(companyId)
    const effectiveCompanyId = companyId || tenant?.companyId || 'default'
    const summary = await TrashService.getTrashSummary(effectiveCompanyId)
    return { success: true, summary }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to get trash summary' }
  }
}

export async function moveToTrashAction(
  arg1: TrashCategory | { category: TrashCategory; item: any; companyId?: string; tenantSlug?: string },
  arg2?: any,
  arg3?: string,
  arg4?: string
) {
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

    const tenant = await getCurrentTenant(companyId)
    const effectiveCompanyId = companyId || tenant?.companyId || item?.company_id || 'default'
    const deletedByName = tenant?.fullName || (tenant as any)?.email || 'System User'

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

export async function restoreFromTrashAction(
  arg1: string | { trashId: string; companyId?: string; tenantSlug?: string },
  arg2?: string,
  arg3?: string
) {
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

    const tenant = await getCurrentTenant(companyId)
    const effectiveCompanyId = companyId || tenant?.companyId || 'default'
    const restored = await TrashService.restoreFromTrash(trashId, effectiveCompanyId)

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

export async function permanentDeleteAction(
  arg1: string | { trashId: string; companyId?: string; tenantSlug?: string },
  arg2?: string,
  arg3?: string
) {
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

    const tenant = await getCurrentTenant(companyId)
    const effectiveCompanyId = companyId || tenant?.companyId || 'default'
    await TrashService.permanentDelete(trashId, effectiveCompanyId)

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

export async function emptyTrashAction(
  arg1?: string | { companyId?: string; category?: TrashCategory; tenantSlug?: string },
  arg2?: TrashCategory,
  arg3?: string
) {
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

    const tenant = await getCurrentTenant(companyId)
    const effectiveCompanyId = companyId || tenant?.companyId || 'default'
    const count = await TrashService.emptyTrash(effectiveCompanyId, category)

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

export async function purgeExpiredTrashAction(
  arg1?: string | { companyId?: string; tenantSlug?: string; retentionDays?: number },
  arg2?: string,
  arg3?: number
) {
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

    const tenant = await getCurrentTenant(companyId)
    const effectiveCompanyId = companyId || tenant?.companyId || 'default'
    const result = await TrashService.purgeExpiredTrash(effectiveCompanyId, retentionDays)

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

