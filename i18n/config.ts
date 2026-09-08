import { LocaleMode } from '@/types/common.types'

export const LOCALES: { code: LocaleMode; label: string; labelNative: string }[] = [
  { code: 'bn', label: 'Bengali', labelNative: 'বাংলা' },
  { code: 'en', label: 'English', labelNative: 'English' },
]

export const DEFAULT_LOCALE: LocaleMode = 'bn'
