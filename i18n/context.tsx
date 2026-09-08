'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { LocaleMode } from '@/types/common.types'
import { DEFAULT_LOCALE } from './config'
import enDict from './dictionaries/en.json'
import bnDict from './dictionaries/bn.json'

interface I18nContextType {
  locale: LocaleMode
  setLocale: (locale: LocaleMode) => void
  t: (keyPath: string) => string
  tBilingual: (enText: string, bnText?: string | null) => string
}

const I18nContext = createContext<I18nContextType | null>(null)

type NestedDict = { [key: string]: string | NestedDict }

function resolveKey(dict: NestedDict, path: string): string | null {
  const parts = path.split('.')
  let current: unknown = dict
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part]
    } else {
      return null
    }
  }
  return typeof current === 'string' ? current : null
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleMode>(DEFAULT_LOCALE)

  useEffect(() => {
    const saved = localStorage.getItem('printerp_locale') as string | null
    if (saved === 'en' || saved === 'bn') {
      setLocaleState(saved)
    } else if (saved === 'bi') {
      setLocaleState('bn')
      localStorage.setItem('printerp_locale', 'bn')
    }
  }, [])

  const setLocale = (newLocale: LocaleMode) => {
    setLocaleState(newLocale)
    localStorage.setItem('printerp_locale', newLocale)
  }

  const t = (keyPath: string): string => {
    const enVal = resolveKey(enDict as unknown as NestedDict, keyPath) || keyPath
    const bnVal = resolveKey(bnDict as unknown as NestedDict, keyPath) || enVal

    if (locale === 'bn') return bnVal
    return enVal
  }

  const tBilingual = (enText: string, bnText?: string | null): string => {
    if (!bnText) return enText
    if (locale === 'bn') return bnText
    return enText
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, tBilingual }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return ctx
}
