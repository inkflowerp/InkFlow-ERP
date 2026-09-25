'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import type { PlatformSystemSettings } from '@/types/platform.types'
import { DEFAULT_PLATFORM_BRANDING } from '@/types/platform.types'
import { getPublicPlatformSettingsAction } from '@/actions/platform-data.actions'
import { createClient } from '@/lib/supabase/client'
import { setRuntimeRootDomain } from '@/lib/tenant/tenant-resolution'

export interface PlatformSettingsContextType {
  appName: string
  appLogoUrl: string
  tagline: string
  faviconUrl: string
  title: string
  description: string
  helpline: string
  supportHelpline: string
  domain: string
  contactEmail: string
  contactPhone: string
  contactAddress: string
  settings: PlatformSystemSettings | null
  loading: boolean
  refreshSettings: () => Promise<void>
}

const PlatformSettingsContext = createContext<PlatformSettingsContextType>({
  appName: DEFAULT_PLATFORM_BRANDING.app_name,
  appLogoUrl: DEFAULT_PLATFORM_BRANDING.app_logo_url,
  tagline: DEFAULT_PLATFORM_BRANDING.app_tagline,
  faviconUrl: DEFAULT_PLATFORM_BRANDING.favicon_url,
  title: DEFAULT_PLATFORM_BRANDING.app_title,
  description: DEFAULT_PLATFORM_BRANDING.app_description,
  helpline: DEFAULT_PLATFORM_BRANDING.support_helpline,
  supportHelpline: DEFAULT_PLATFORM_BRANDING.support_helpline,
  domain: DEFAULT_PLATFORM_BRANDING.app_domain,
  contactEmail: DEFAULT_PLATFORM_BRANDING.contact_email,
  contactPhone: DEFAULT_PLATFORM_BRANDING.contact_phone,
  contactAddress: DEFAULT_PLATFORM_BRANDING.contact_address,
  settings: null,
  loading: false,
  refreshSettings: async () => {},
})

export const PLATFORM_SETTINGS_EVENT = 'inkflow_platform_settings_updated'

interface PlatformSettingsProviderProps {
  children: React.ReactNode
  initialSettings?: PlatformSystemSettings | null
}

export function PlatformSettingsProvider({
  children,
  initialSettings,
}: PlatformSettingsProviderProps) {
  const [settings, setSettings] = useState<PlatformSystemSettings | null>(initialSettings || null)
  const [loading, setLoading] = useState(false)

  // Derived properties with safe fallbacks
  const appName = useMemo(() => settings?.app_name || DEFAULT_PLATFORM_BRANDING.app_name, [settings])
  const appLogoUrl = useMemo(() => settings?.app_logo_url || '', [settings])
  const tagline = useMemo(() => settings?.app_tagline || DEFAULT_PLATFORM_BRANDING.app_tagline, [settings])
  const faviconUrl = useMemo(() => settings?.favicon_url || DEFAULT_PLATFORM_BRANDING.favicon_url, [settings])
  const title = useMemo(() => settings?.app_title || DEFAULT_PLATFORM_BRANDING.app_title, [settings])
  const description = useMemo(() => settings?.app_description || DEFAULT_PLATFORM_BRANDING.app_description, [settings])
  const helpline = useMemo(() => settings?.support_helpline || DEFAULT_PLATFORM_BRANDING.support_helpline, [settings])
  const domain = useMemo(() => settings?.app_domain || DEFAULT_PLATFORM_BRANDING.app_domain, [settings])
  const contactEmail = useMemo(() => settings?.contact_email || DEFAULT_PLATFORM_BRANDING.contact_email, [settings])
  const contactPhone = useMemo(() => settings?.contact_phone || DEFAULT_PLATFORM_BRANDING.contact_phone, [settings])
  const contactAddress = useMemo(() => settings?.contact_address || DEFAULT_PLATFORM_BRANDING.contact_address, [settings])

  // Synchronize DOM elements (Favicon, Meta Description, Document Title)
  useEffect(() => {
    if (typeof document === 'undefined') return

    // 1. Synchronize Favicon link
    if (faviconUrl) {
      let iconLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null
      if (!iconLink) {
        iconLink = document.createElement('link')
        iconLink.rel = 'shortcut icon'
        document.head.appendChild(iconLink)
      }
      if (iconLink.href !== faviconUrl) {
        iconLink.href = faviconUrl
      }
    }

    // 2. Synchronize Meta Description
    if (description) {
      let metaDesc = document.querySelector("meta[name='description']") as HTMLMetaElement | null
      if (!metaDesc) {
        metaDesc = document.createElement('meta')
        metaDesc.name = 'description'
        document.head.appendChild(metaDesc)
      }
      metaDesc.content = description
    }

    // 3. Synchronize Runtime Domain for tenant URL generation
    if (domain) {
      setRuntimeRootDomain(domain)
    }
  }, [faviconUrl, description, domain, appName])

  const refreshSettings = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getPublicPlatformSettingsAction()
      if (res.success && res.data) {
        setSettings(res.data)
        if (res.data.app_domain) {
          setRuntimeRootDomain(res.data.app_domain)
        }
      }
    } catch {
      // Non-blocking fallback
    } finally {
      setLoading(false)
    }
  }, [])

  // Listen to manual update events across components or windows
  useEffect(() => {
    const handlePlatformSettingsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<PlatformSystemSettings>
      if (customEvent.detail) {
        setSettings(customEvent.detail)
        if (customEvent.detail.app_domain) {
          setRuntimeRootDomain(customEvent.detail.app_domain)
        }
      } else {
        refreshSettings()
      }
    }

    window.addEventListener(PLATFORM_SETTINGS_EVENT, handlePlatformSettingsUpdated)

    // Initial load if not provided
    if (!initialSettings) {
      refreshSettings()
    }

    // Subscribe to Supabase Realtime for platform_system_settings table
    let channel: any
    try {
      const supabase = createClient()
      channel = supabase
        .channel('realtime_platform_settings_sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'platform_system_settings' },
          (payload: any) => {
            if (payload?.new) {
              setSettings((prev) => ({ ...(prev || {}), ...payload.new }))
              if (payload.new.app_domain) {
                setRuntimeRootDomain(payload.new.app_domain)
              }
            }
          }
        )
        .subscribe()
    } catch {
      // Realtime subscription non-blocking fallback
    }

    return () => {
      window.removeEventListener(PLATFORM_SETTINGS_EVENT, handlePlatformSettingsUpdated)
      if (channel) {
        try {
          const supabase = createClient()
          supabase.removeChannel(channel)
        } catch {}
      }
    }
  }, [initialSettings, refreshSettings])

  const contextValue = useMemo<PlatformSettingsContextType>(
    () => ({
      appName,
      appLogoUrl,
      tagline,
      faviconUrl,
      title,
      description,
      helpline,
      supportHelpline: helpline,
      domain,
      contactEmail,
      contactPhone,
      contactAddress,
      settings,
      loading,
      refreshSettings,
    }),
    [
      appName,
      appLogoUrl,
      tagline,
      faviconUrl,
      title,
      description,
      helpline,
      domain,
      contactEmail,
      contactPhone,
      contactAddress,
      settings,
      loading,
      refreshSettings,
    ]
  )

  return (
    <PlatformSettingsContext.Provider value={contextValue}>
      {children}
    </PlatformSettingsContext.Provider>
  )
}

export function usePlatformSettings(): PlatformSettingsContextType {
  const context = useContext(PlatformSettingsContext)
  if (!context) {
    throw new Error('usePlatformSettings must be used within a PlatformSettingsProvider')
  }
  return context
}
