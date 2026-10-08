'use client'

import { useState, useEffect } from 'react'
import {
  DocumentTypeKey,
  DocumentTemplateSettings,
  DEFAULT_TEMPLATE_SETTINGS,
} from '@/types/document-template.types'
import {
  getDocumentTemplate,
  getAllDocumentTemplates,
  saveAllDocumentTemplates,
} from '@/lib/services/document-template.service'

/**
 * Hook to access and synchronize a tenant's document template configuration.
 */
export function useDocumentTemplate(
  companySlug: string | null | undefined,
  docType: DocumentTypeKey
) {
  const [template, setTemplate] = useState<DocumentTemplateSettings>(() =>
    getDocumentTemplate(companySlug, docType)
  )

  useEffect(() => {
    // Initial sync
    setTemplate(getDocumentTemplate(companySlug, docType))

    // Listen for broadcasted updates
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent
      const targetSlug = customEvent.detail?.companySlug
      if (!targetSlug || targetSlug === companySlug || targetSlug === 'default') {
        const updatedTemplates = customEvent.detail?.templates
        if (updatedTemplates && updatedTemplates[docType]) {
          setTemplate(updatedTemplates[docType])
        } else {
          setTemplate(getDocumentTemplate(companySlug, docType))
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('printflow_template_updated', handleUpdate)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('printflow_template_updated', handleUpdate)
      }
    }
  }, [companySlug, docType])

  return {
    template,
    updateTemplate: (fields: Partial<DocumentTemplateSettings>) => {
      const all = getAllDocumentTemplates(companySlug)
      const updated = {
        ...all,
        [docType]: {
          ...all[docType],
          ...fields,
          updated_at: new Date().toISOString(),
        },
      }
      saveAllDocumentTemplates(companySlug, updated)
      setTemplate(updated[docType])
    },
  }
}
