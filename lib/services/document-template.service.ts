// ==============================================================================
// PrintFlow Document Template Storage & Synchronization Service
// Synchronizes Document Template Settings across Designer, Live Preview,
// In-Page Printable Views, and Vector PDF Generators.
// ==============================================================================

import {
  DocumentTypeKey,
  DocumentTemplateSettings,
  DEFAULT_TEMPLATE_SETTINGS,
} from '@/types/document-template.types'

const STORAGE_PREFIX = 'printflow_doc_designer_templates_'

/**
 * Get storage key for a tenant company slug.
 */
export function getTemplateStorageKey(companySlug?: string | null): string {
  return `${STORAGE_PREFIX}${companySlug || 'default'}`
}

/**
 * Retrieve all saved document template settings for a company.
 * Falls back to DEFAULT_TEMPLATE_SETTINGS if unconfigured.
 */
export function getAllDocumentTemplates(
  companySlug?: string | null
): Record<DocumentTypeKey, DocumentTemplateSettings> {
  if (typeof window === 'undefined') {
    return DEFAULT_TEMPLATE_SETTINGS
  }

  const key = getTemplateStorageKey(companySlug)
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        ...DEFAULT_TEMPLATE_SETTINGS,
        ...parsed,
      }
    }
  } catch (err) {
    console.warn('[DocTemplateService] Failed reading template settings:', err)
  }

  return DEFAULT_TEMPLATE_SETTINGS
}

/**
 * Retrieve specific document template settings for a company and document type.
 */
export function getDocumentTemplate(
  companySlug: string | null | undefined,
  docType: DocumentTypeKey
): DocumentTemplateSettings {
  const all = getAllDocumentTemplates(companySlug)
  return all[docType] || DEFAULT_TEMPLATE_SETTINGS[docType]
}

/**
 * Save all document templates for a company and dispatch synchronization event.
 */
export function saveAllDocumentTemplates(
  companySlug: string | null | undefined,
  templates: Record<DocumentTypeKey, DocumentTemplateSettings>
): void {
  if (typeof window === 'undefined') return

  const key = getTemplateStorageKey(companySlug)
  try {
    localStorage.setItem(key, JSON.stringify(templates))
    // Broadcast event so any active quotation, invoice, challan, or receipt print views update immediately
    window.dispatchEvent(
      new CustomEvent('printflow_template_updated', {
        detail: { companySlug, templates },
      })
    )
  } catch (err) {
    console.error('[DocTemplateService] Failed saving template settings:', err)
  }
}

/**
 * Calculate CSS safe area padding style from document template settings.
 */
export function getTemplatePaddingStyles(
  settings: DocumentTemplateSettings
): React.CSSProperties {
  return {
    paddingTop: `${settings.padding_top || 0}mm`,
    paddingRight: `${settings.padding_right || 0}mm`,
    paddingBottom: `${settings.padding_bottom || 0}mm`,
    paddingLeft: `${settings.padding_left || 0}mm`,
  }
}
