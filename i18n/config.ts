import type { LocaleMode } from '../types/common.types.ts'

export const LOCALES: { code: LocaleMode; label: string; labelNative: string }[] = [
  { code: 'bn', label: 'Bengali', labelNative: 'বাংলা' },
  { code: 'en', label: 'English', labelNative: 'English' },
]

export const DEFAULT_LOCALE: LocaleMode = 'bn'
