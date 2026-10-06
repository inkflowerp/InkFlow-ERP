'use server'

import { revalidatePath } from 'next/cache'
import { LandingPageService } from '@/services/landing-page.service'
import {
  requirePlatformPermission,
  getCurrentPlatformUser,
} from '@/lib/auth/platform-auth'
import type { LandingPageConfig } from '@/types/landing-page.types'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Public Server Action: Fetches published landing page configuration for visitors
 */
export async function getPublicLandingPageConfigAction(): Promise<
  ServerActionResult<LandingPageConfig>
> {
  try {
    const config = await LandingPageService.getPublicConfig()
    return { success: true, data: config }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to retrieve landing page configuration',
    }
  }
}

/**
 * Platform Admin Server Action: Fetches draft and published configurations
 */
export async function getAdminLandingPageConfigAction(): Promise<
  ServerActionResult<{
    draft: LandingPageConfig
    published: LandingPageConfig
    isPublished: boolean
    publishedAt: string | null
    updatedAt: string
  }>
> {
  try {
    await requirePlatformPermission('system.manage')
    const result = await LandingPageService.getAdminConfig()
    return { success: true, data: result }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Unauthorized or failed to retrieve admin configuration',
    }
  }
}

/**
 * Platform Admin Server Action: Saves draft changes
 */
export async function saveLandingPageDraftAction(
  draft: Partial<LandingPageConfig>
): Promise<ServerActionResult<{ saved: boolean }>> {
  try {
    const admin = await requirePlatformPermission('system.manage')
    const result = await LandingPageService.saveDraft(draft, admin.id)
    if (!result.success) {
      return { success: false, error: result.error || 'Failed to save draft' }
    }
    return { success: true, data: { saved: true } }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Unauthorized or failed to save draft',
    }
  }
}

/**
 * Platform Admin Server Action: Publishes draft to production
 */
export async function publishLandingPageAction(): Promise<
  ServerActionResult<{ published: boolean }>
> {
  try {
    const admin = await requirePlatformPermission('system.manage')
    const result = await LandingPageService.publish(admin.id)
    if (!result.success) {
      return { success: false, error: result.error || 'Failed to publish landing page' }
    }
    revalidatePath('/', 'layout')
    return { success: true, data: { published: true } }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Unauthorized or failed to publish landing page',
    }
  }
}

/**
 * Platform Admin Server Action: Resets draft configuration to system defaults
 */
export async function resetLandingPageDraftAction(): Promise<
  ServerActionResult<{ reset: boolean }>
> {
  try {
    const admin = await requirePlatformPermission('system.manage')
    await LandingPageService.resetDraftToDefault(admin.id)
    return { success: true, data: { reset: true } }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Unauthorized or failed to reset draft',
    }
  }
}
