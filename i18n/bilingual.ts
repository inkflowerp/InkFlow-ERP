// ==============================================================================
// PrintERP SaaS - Bangla & English Text Renderer
// Strictly enforces:
// - If English ('en') => All English
// - If Bangla ('bn')  => All Bangla
// ==============================================================================

import { LocaleMode } from '@/types/common.types'

export function renderBilingualText(
  enText: string,
  bnText?: string | null,
  locale: LocaleMode = 'en'
): string {
  if (!bnText) return enText
  switch (locale) {
    case 'bn':
      return bnText
    case 'en':
    default:
      return enText
  }
}
