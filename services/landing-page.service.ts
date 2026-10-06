// ==============================================================================
// PrintFlow SaaS - Platform Landing Page Configuration Service
// ==============================================================================

import { createAdminClient } from '@/lib/supabase/admin'
import {
  DEFAULT_LANDING_CONFIG,
  DEFAULT_LANDING_SECTIONS,
  DEFAULT_LANDING_FAQ,
} from '@/lib/marketing/landing-defaults'
import type {
  LandingPageConfig,
  LandingCompanyConfig,
  LandingSectionConfig,
  LandingFaqItem,
} from '@/types/landing-page.types'
import { revalidatePath } from 'next/cache'

// Memory/local cache for environments without immediate database access or test runs
let transientLandingStore: {
  draft_config: LandingPageConfig
  published_config: LandingPageConfig
  is_published: boolean
  published_at: string | null
  updated_at: string
} = {
  draft_config: JSON.parse(JSON.stringify(DEFAULT_LANDING_CONFIG)),
  published_config: JSON.parse(JSON.stringify(DEFAULT_LANDING_CONFIG)),
  is_published: true,
  published_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

function mergeWithDefaultConfig(config?: Partial<LandingPageConfig> | null): LandingPageConfig {
  if (!config) return JSON.parse(JSON.stringify(DEFAULT_LANDING_CONFIG))

  const mergedSections: LandingSectionConfig[] = DEFAULT_LANDING_SECTIONS.map((defSec) => {
    const existing = config.sections?.find((s) => s.key === defSec.key || s.id === defSec.id)
    if (existing) {
      return {
        ...defSec,
        ...existing,
        nameEn: existing.nameEn || defSec.nameEn,
        nameBn: existing.nameBn || defSec.nameBn,
      }
    }
    return defSec
  })

  // Sort sections by order
  mergedSections.sort((a, b) => a.order - b.order)

  return {
    general: {
      ...DEFAULT_LANDING_CONFIG.general,
      ...(config.general || {}),
    },
    sections: mergedSections,
    hero: {
      ...DEFAULT_LANDING_CONFIG.hero,
      ...(config.hero || {}),
    },
    companies: Array.isArray(config.companies) ? config.companies : [],
    pricing: {
      ...DEFAULT_LANDING_CONFIG.pricing,
      ...(config.pricing || {}),
    },
    faq: Array.isArray(config.faq) && config.faq.length > 0 ? config.faq : DEFAULT_LANDING_FAQ,
    seo: {
      ...DEFAULT_LANDING_CONFIG.seo,
      ...(config.seo || {}),
    },
  }
}

export class LandingPageService {
  /**
   * Fetches published landing page configuration for public visitors.
   * Strips out drafts and enforces company privacy (is_public = true, status = active only).
   */
  static async getPublicConfig(): Promise<LandingPageConfig> {
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('platform_landing_page')
        .select('published_config, is_published')
        .eq('id', 'default')
        .maybeSingle()

      if (!error && data && data.published_config && Object.keys(data.published_config).length > 0) {
        const parsed = mergeWithDefaultConfig(data.published_config)
        // Strictly sanitize companies for public display: only approved, public, active with logos
        parsed.companies = (parsed.companies || [])
          .filter(
            (c: LandingCompanyConfig) =>
              c.isPublic === true &&
              c.status === 'active' &&
              Boolean(c.logoUrl && c.logoUrl.trim())
          )
          .sort((a, b) => (a.order || 0) - (b.order || 0))
        return parsed
      }
    } catch {
      // Non-blocking fallback
    }

    const fallback = mergeWithDefaultConfig(transientLandingStore.published_config)
    fallback.companies = (fallback.companies || [])
      .filter((c) => c.isPublic === true && c.status === 'active' && Boolean(c.logoUrl && c.logoUrl.trim()))
      .sort((a, b) => (a.order || 0) - (b.order || 0))
    return fallback
  }

  /**
   * Fetches both draft and publication state for Platform Admins.
   */
  static async getAdminConfig(): Promise<{
    draft: LandingPageConfig
    published: LandingPageConfig
    isPublished: boolean
    publishedAt: string | null
    updatedAt: string
  }> {
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('platform_landing_page')
        .select('*')
        .eq('id', 'default')
        .maybeSingle()

      if (!error && data) {
        const draft = mergeWithDefaultConfig(data.draft_config)
        const published = mergeWithDefaultConfig(data.published_config)
        return {
          draft,
          published,
          isPublished: Boolean(data.is_published),
          publishedAt: data.published_at || null,
          updatedAt: data.updated_at || new Date().toISOString(),
        }
      }
    } catch {
      // Non-blocking fallback
    }

    return {
      draft: mergeWithDefaultConfig(transientLandingStore.draft_config),
      published: mergeWithDefaultConfig(transientLandingStore.published_config),
      isPublished: transientLandingStore.is_published,
      publishedAt: transientLandingStore.published_at,
      updatedAt: transientLandingStore.updated_at,
    }
  }

  /**
   * Saves draft configuration changes.
   */
  static async saveDraft(
    draft: Partial<LandingPageConfig>,
    adminUserId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const fullDraft = mergeWithDefaultConfig(draft)
    const now = new Date().toISOString()

    transientLandingStore.draft_config = fullDraft
    transientLandingStore.updated_at = now

    try {
      const admin = createAdminClient()
      const { error } = await (admin as any).from('platform_landing_page').upsert(
        {
          id: 'default',
          draft_config: fullDraft,
          updated_at: now,
          updated_by: adminUserId || null,
        },
        { onConflict: 'id' }
      )

      if (error) {
        console.warn('[LandingPageService.saveDraft] Database upsert notice:', error.message)
      }
    } catch (err: any) {
      console.warn('[LandingPageService.saveDraft] Exception:', err?.message)
    }

    return { success: true }
  }

  /**
   * Publishes the current draft configuration to production.
   */
  static async publish(adminUserId?: string): Promise<{ success: boolean; error?: string }> {
    const now = new Date().toISOString()
    const draftToPublish = mergeWithDefaultConfig(transientLandingStore.draft_config)

    transientLandingStore.published_config = JSON.parse(JSON.stringify(draftToPublish))
    transientLandingStore.is_published = true
    transientLandingStore.published_at = now
    transientLandingStore.updated_at = now

    try {
      const admin = createAdminClient()
      const { error } = await (admin as any).from('platform_landing_page').upsert(
        {
          id: 'default',
          is_published: true,
          published_config: draftToPublish,
          draft_config: draftToPublish,
          published_at: now,
          published_by: adminUserId || null,
          updated_at: now,
          updated_by: adminUserId || null,
        },
        { onConflict: 'id' }
      )

      if (error) {
        console.warn('[LandingPageService.publish] Database upsert notice:', error.message)
      }
    } catch (err: any) {
      console.warn('[LandingPageService.publish] Exception:', err?.message)
    }

    revalidatePath('/')
    revalidatePath('/pricing')
    revalidatePath('/faq')
    return { success: true }
  }

  /**
   * Resets draft configuration to system defaults.
   */
  static async resetDraftToDefault(adminUserId?: string): Promise<{ success: boolean }> {
    const defaults = JSON.parse(JSON.stringify(DEFAULT_LANDING_CONFIG))
    await this.saveDraft(defaults, adminUserId)
    return { success: true }
  }
}
