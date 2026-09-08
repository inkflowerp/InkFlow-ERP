// ==============================================================================
// PrintERP SaaS - Phase 23: Offline Drafts Storage Manager
// Enables sales reps and operators to save in-progress forms locally without network.
// ==============================================================================

import { OfflineDraft, OfflineFormType } from '@/types/offline.types'

const DRAFTS_STORAGE_KEY = 'printerp_offline_drafts'

const INITIAL_DEMO_DRAFTS: OfflineDraft[] = []

export class OfflineDraftManager {
  static getDrafts(): OfflineDraft[] {
    if (typeof window === 'undefined') return INITIAL_DEMO_DRAFTS
    try {
      const stored = localStorage.getItem(DRAFTS_STORAGE_KEY)
      if (!stored) {
        localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_DRAFTS))
        return INITIAL_DEMO_DRAFTS
      }
      return JSON.parse(stored)
    } catch {
      return INITIAL_DEMO_DRAFTS
    }
  }

  static saveDraft(
    companyId: string,
    formType: OfflineFormType,
    title: string,
    data: Record<string, any>,
    existingId?: string
  ): OfflineDraft {
    const drafts = this.getDrafts()
    const id = existingId || `draft-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`

    const draft: OfflineDraft = {
      id,
      companyId,
      formType,
      title,
      data,
      updatedAt: new Date().toISOString(),
    }

    const filtered = drafts.filter((d) => d.id !== id)
    const updated = [draft, ...filtered]

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(updated))
        window.dispatchEvent(new Event('printerp_drafts_updated'))
      } catch (e) {
        console.error('Failed to save draft', e)
      }
    }

    return draft
  }

  static deleteDraft(id: string) {
    const drafts = this.getDrafts().filter((d) => d.id !== id)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts))
        window.dispatchEvent(new Event('printerp_drafts_updated'))
      } catch (e) {
        console.error('Failed to delete draft', e)
      }
    }
  }
}
