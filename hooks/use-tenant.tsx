'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  CompanyRow,
  TenantRole,
  TenantContextType,
  BranchRow,
  CompanySettingsRow,
  CompanyUserWithProfile,
} from '@/types/tenant.types'
import { TENANT_SESSION_COOKIE, TenantSessionData, TenantContext as ServerTenantContext, mapSessionToTenantRole } from '@/lib/auth/types'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { PlatformTenantCompany } from '@/types/platform.types'
import { getTenantLink } from '@/lib/tenant/tenant-url'
import { switchCompanyAction } from '@/actions/tenant.actions'
import { useI18n } from '@/i18n/context'

const TenantContext = createContext<TenantContextType | null>(null)

function sanitizeField(val?: string | null): string | null {
  if (!val) return null
  const trimmed = val.trim()
  return trimmed || null
}

function sanitizeCorporateNameBn(nameBn?: string | null, name?: string): string | null {
  const cleanBn = sanitizeField(nameBn)
  if (!cleanBn) return null
  if (name && cleanBn.toLowerCase() === name.trim().toLowerCase()) return null
  return cleanBn
}

function sanitizeLegalName(legalName?: string | null, name?: string): string | null {
  const clean = sanitizeField(legalName)
  if (!clean) return null
  if (name) {
    const cleanLower = clean.toLowerCase()
    const nameLower = name.trim().toLowerCase()
    if (cleanLower === nameLower || cleanLower === `${nameLower} ltd.` || cleanLower === `${nameLower} ltd`) {
      return null
    }
  }
  return clean
}

function sanitizeAddress(address?: string | null): string {
  if (!address) return ''
  const trimmed = address.trim()
  if (trimmed.toLowerCase() === 'dhaka, bangladesh') return ''
  return trimmed
}

// Helper to convert PlatformTenantCompany to CompanyRow
function platformCompanyToRow(p: PlatformTenantCompany): CompanyRow {
  const name = p.name
  return {
    id: p.id,
    slug: p.slug,
    name,
    name_bn: sanitizeCorporateNameBn(p.name_bn, name),
    legal_name: sanitizeLegalName((p as any).legal_name, name),
    trade_license_no: null,
    bin_no: null,
    tin_no: null,
    business_type: 'printing_signage',
    phone: p.owner_phone || null,
    whatsapp: p.owner_phone || null,
    email: p.owner_email || null,
    website: null,
    division_id: 1,
    district_id: 1,
    upazila_id: 1,
    area: p.hub || null,
    address: sanitizeAddress((p as any).address || p.hub),
    address_bn: null,
    office_hours: '9:00 AM - 8:00 PM (Sat - Thu)',
    holidays: 'Friday',
    currency: 'BDT',
    default_locale: 'bn',
    logo_url: null,
    is_active: p.status !== 'suspended',
    settings: { vat_rate: 7.5, bilingual_invoicing: true },
    created_at: p.created_at || new Date().toISOString(),
    updated_at: p.created_at || new Date().toISOString(),
  } as unknown as CompanyRow
}

function resolveCompanyFromContextOrStore(
  ctx?: ServerTenantContext | null,
  targetSlug?: string
): CompanyRow | null {
  if (ctx?.companyId && ctx?.companySlug) {
    if (ctx.company) {
      const co = ctx.company
      const rawName = co.name || ctx.companyName || ctx.companySlug
      return {
        ...co,
        name: rawName,
        name_bn: sanitizeCorporateNameBn(co.name_bn, rawName),
        legal_name: sanitizeLegalName(co.legal_name, rawName),
        address: sanitizeAddress(co.address),
        address_bn: co.address_bn || null,
        area: co.area || null,
      }
    }
    const rawName = ctx.companyName || ctx.companySlug
    return {
      id: ctx.companyId,
      slug: ctx.companySlug,
      name: rawName,
      name_bn: sanitizeCorporateNameBn(ctx.companyNameBn, rawName),
      legal_name: sanitizeLegalName((ctx as any).legalName || (ctx as any).legal_name, rawName),
      trade_license_no: (ctx as any).trade_license_no || null,
      bin_no: (ctx as any).bin_no || null,
      tin_no: (ctx as any).tin_no || null,
      business_type: (ctx as any).business_type || 'printing_signage',
      phone: ctx.phone || null,
      whatsapp: (ctx as any).whatsapp || ctx.phone || null,
      email: ctx.userEmail || null,
      website: null,
      division_id: (ctx as any).division_id || 1,
      district_id: (ctx as any).district_id || 1,
      upazila_id: (ctx as any).upazila_id || 1,
      area: (ctx as any).area || null,
      address: sanitizeAddress((ctx as any).address),
      address_bn: (ctx as any).address_bn || null,
      office_hours: (ctx as any).office_hours || '9:00 AM - 8:00 PM (Sat - Thu)',
      holidays: (ctx as any).holidays || 'Friday',
      currency: (ctx as any).currency || 'BDT',
      default_locale: (ctx as any).defaultLocale || 'bn',
      logo_url: (ctx as any).logo_url || null,
      is_active: true,
      settings: (ctx as any).settings || { vat_rate: 7.5, bilingual_invoicing: true },
      created_at: (ctx as any).created_at || new Date().toISOString(),
      updated_at: (ctx as any).updated_at || new Date().toISOString(),
    } as unknown as CompanyRow
  }

  const slug = (targetSlug || '').toLowerCase().trim()
  if (!slug) return null

  const cookieSession = getSessionFromCookie()
  if (
    cookieSession &&
    (cookieSession.companySlug?.toLowerCase() === slug ||
      cookieSession.companyId?.toLowerCase() === slug)
  ) {
    const rawName = cookieSession.companyName || cookieSession.companySlug
    return {
      id: cookieSession.companyId,
      slug: cookieSession.companySlug,
      name: rawName,
      name_bn: sanitizeCorporateNameBn(cookieSession.companyNameBn, rawName),
      legal_name: sanitizeLegalName((cookieSession as any).legalName, rawName),
      trade_license_no: null,
      bin_no: null,
      tin_no: null,
      business_type: 'printing_signage',
      phone: cookieSession.phone || null,
      whatsapp: cookieSession.phone || null,
      email: cookieSession.userEmail || null,
      website: null,
      division_id: 1,
      district_id: 1,
      upazila_id: 1,
      area: (cookieSession as any).area || null,
      address: sanitizeAddress((cookieSession as any).address),
      address_bn: (cookieSession as any).addressBn || null,
      office_hours: '9:00 AM - 8:00 PM (Sat - Thu)',
      holidays: 'Friday',
      currency: 'BDT',
      default_locale: cookieSession.defaultLocale || 'bn',
      logo_url: null,
      is_active: true,
      settings: { vat_rate: 7.5, bilingual_invoicing: true },
      created_at: cookieSession.loginTime || new Date().toISOString(),
      updated_at: cookieSession.loginTime || new Date().toISOString(),
    } as unknown as CompanyRow
  }

  const platformCompanies =
    PrintERPDataStore.get<PlatformTenantCompany[]>(STORAGE_KEYS.PLATFORM_COMPANIES) || []
  const platMatch = platformCompanies.find((c) => c.slug === slug || c.id === slug)
  if (platMatch) return platformCompanyToRow(platMatch)

  const profile = PrintERPDataStore.get<Partial<CompanyRow>>(STORAGE_KEYS.COMPANY_PROFILE)
  if (profile && (profile.slug === slug || profile.id === slug)) {
    const rawName = profile.name || slug
    return {
      id: profile.id || slug,
      slug: profile.slug || slug,
      name: rawName,
      name_bn: sanitizeCorporateNameBn(profile.name_bn, rawName),
      legal_name: sanitizeLegalName(profile.legal_name, rawName),
      trade_license_no: profile.trade_license_no || null,
      bin_no: profile.bin_no || null,
      tin_no: profile.tin_no || null,
      business_type: profile.business_type || 'printing_signage',
      phone: profile.phone || null,
      whatsapp: profile.whatsapp || null,
      email: profile.email || null,
      website: profile.website || null,
      division_id: profile.division_id || 1,
      district_id: profile.district_id || 1,
      upazila_id: profile.upazila_id || 1,
      area: profile.area || null,
      address: sanitizeAddress(profile.address),
      address_bn: profile.address_bn || null,
      office_hours: profile.office_hours || '9:00 AM - 8:00 PM (Sat - Thu)',
      holidays: profile.holidays || 'Friday',
      currency: profile.currency || 'BDT',
      default_locale: profile.default_locale || 'bn',
      logo_url: profile.logo_url || null,
      is_active: profile.is_active ?? true,
      settings: profile.settings || { vat_rate: 7.5, bilingual_invoicing: true },
      created_at: profile.created_at || new Date().toISOString(),
      updated_at: profile.updated_at || new Date().toISOString(),
    } as unknown as CompanyRow
  }

  return null
}

export const DEMO_COMPANIES: CompanyRow[] = []

function getSessionFromContext(ctx?: ServerTenantContext | null): TenantSessionData | null {
  if (!ctx || !ctx.userId) return null
  const rawName = ctx.companyName || ctx.companySlug || ''
  return {
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    fullName: ctx.fullName || '',
    fullNameBn: ctx.fullNameBn || null,
    phone: ctx.phone || null,
    companyId: ctx.companyId,
    companySlug: ctx.companySlug,
    companyName: rawName,
    companyNameBn: sanitizeCorporateNameBn(ctx.companyNameBn, rawName),
    legalName: sanitizeLegalName(ctx.legalName || ctx.company?.legal_name, rawName),
    address: sanitizeAddress(ctx.address || ctx.company?.address),
    addressBn: ctx.addressBn || ctx.company?.address_bn || null,
    area: ctx.area || ctx.company?.area || null,
    branchId: ctx.branchId || null,
    branchName: ctx.branchName,
    role: ctx.companyRole,
    primaryRole: ctx.primaryRole || ctx.companyRole,
    responsibilities: ctx.responsibilities || [],
    permissions: ctx.permissions || [],
    loginTime: '',
    token: '',
  }
}

function getSessionFromCookie(): TenantSessionData | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${TENANT_SESSION_COOKIE}=`))

  if (!match) return null
  try {
    const raw = match.split('=')[1]
    const parsed = JSON.parse(decodeURIComponent(raw))
    if (parsed && (parsed.userId || parsed.companyId || parsed.companySlug)) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export { mapSessionToTenantRole }

export function TenantProvider({
  initialSlug,
  initialTenantContext,
  children,
}: {
  initialSlug?: string
  initialTenantContext?: ServerTenantContext | null
  children: React.ReactNode
}) {
  const router = useRouter()
  const [company, setCompany] = useState<CompanyRow | null>(() => {
    return resolveCompanyFromContextOrStore(initialTenantContext, initialSlug)
  })

  const [availableCompanies, setAvailableCompanies] = useState<CompanyRow[]>(() => {
    const activeCo = resolveCompanyFromContextOrStore(initialTenantContext, initialSlug)
    return activeCo ? [activeCo] : []
  })

  const [session, setSession] = useState<TenantSessionData | null>(() => {
    const fromCtx = getSessionFromContext(initialTenantContext)
    if (fromCtx) return fromCtx
    return getSessionFromCookie()
  })

  const [branches] = useState<BranchRow[]>([])
  const [settings, setSettings] = useState<CompanySettingsRow | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [syncedUser, setSyncedUser] = useState<CompanyUserWithProfile | null>(null)
  const i18n = useI18n()

  // Ensure active UI locale matches tenant organization's selected default language
  useEffect(() => {
    const tenantDefault =
      company?.default_locale ||
      (session as any)?.defaultLocale ||
      (initialTenantContext as any)?.defaultLocale
    if (tenantDefault === 'en' || tenantDefault === 'bn') {
      const explicitChoice = typeof window !== 'undefined' ? localStorage.getItem('printerp_locale_explicit') : null
      if (!explicitChoice && i18n.locale !== tenantDefault) {
        i18n.setLocale(tenantDefault)
      }
    }
  }, [company?.default_locale, session, initialTenantContext, i18n])

  // Map session role to TenantRole ('owner' | 'manager' | 'operator' | etc.)
  const currentRole: TenantRole = useMemo(() => {
    return mapSessionToTenantRole(session)
  }, [session])

  // Resolve current user details deterministically
  const currentUser: CompanyUserWithProfile | null = useMemo(() => {
    if (!session) return null
    if (syncedUser) return syncedUser

    return {
      id: session.userId,
      company_id: session.companyId,
      user_id: session.userId,
      branch_id: session.branchId || 'br-main',
      status: 'active',
      department: 'Operations',
      responsibilities: session.responsibilities || [session.role],
      overrides: {},
      data_scopes: {},
      invited_email: null,
      created_at: session.loginTime || new Date().toISOString(),
      updated_at: session.loginTime || new Date().toISOString(),
      profile: {
        id: session.userId,
        email: session.userEmail,
        full_name: session.fullName,
        full_name_bn: session.fullNameBn || null,
        phone: session.phone || null,
        avatar_url: null,
        preferred_locale: 'bn',
        is_active: true,
        created_at: session.loginTime || new Date().toISOString(),
        updated_at: session.loginTime || new Date().toISOString(),
      },
      roles: [],
      branch: branches.find((b) => b.id === session.branchId) || null,
    } as unknown as CompanyUserWithProfile
  }, [session, branches, syncedUser])

  const currentBranch = session?.branchId
    ? branches.find((b) => b.id === session.branchId) || null
    : branches[0] || null

  const responsibilities = session?.responsibilities || (currentUser?.responsibilities || [])
  const permissions = session?.permissions || []

  const reloadTenantData = useCallback(() => {
    const activeSession = getSessionFromCookie()
    if (activeSession) {
      setSession(activeSession)
      const users =
        PrintERPDataStore.get<CompanyUserWithProfile[]>(STORAGE_KEYS.COMPANY_USERS) || []
      const matched = users.find(
        (u) =>
          u.user_id === activeSession.userId ||
          u.profile?.email.toLowerCase() === activeSession.userEmail.toLowerCase()
      )
      setSyncedUser(matched || null)
    }

    const targetSlug =
      initialSlug ||
      activeSession?.companySlug ||
      initialTenantContext?.companySlug ||
      ''
    const resolved = resolveCompanyFromContextOrStore(initialTenantContext, targetSlug)
    if (resolved) {
      setCompany(resolved)
    }

    const persistedSettings = PrintERPDataStore.get<CompanySettingsRow>(STORAGE_KEYS.TAX_SETTINGS)
    if (persistedSettings) {
      setSettings(persistedSettings)
    }

    const rawPlatformCompanies =
      PrintERPDataStore.get<PlatformTenantCompany[]>(STORAGE_KEYS.PLATFORM_COMPANIES)
    const platformCompanies = Array.isArray(rawPlatformCompanies) ? rawPlatformCompanies : []
    const converted = platformCompanies.map(platformCompanyToRow)

    if (resolved && !converted.some((c) => c.slug === resolved.slug)) {
      setAvailableCompanies([resolved, ...converted])
    } else {
      setAvailableCompanies(converted.length > 0 ? converted : resolved ? [resolved] : [])
    }
  }, [initialSlug, initialTenantContext])

  useEffect(() => {
    reloadTenantData()

    const handleAuthChange = () => {
      reloadTenantData()
    }

    const handleDataSync = (e: Event) => {
      const customEvent = e as CustomEvent
      if (
        customEvent.detail?.key === STORAGE_KEYS.COMPANY_PROFILE ||
        customEvent.detail?.key === STORAGE_KEYS.TAX_SETTINGS ||
        customEvent.detail?.key === STORAGE_KEYS.BRANDING_SETTINGS ||
        customEvent.detail?.key === STORAGE_KEYS.PLATFORM_COMPANIES
      ) {
        reloadTenantData()
      }
    }

    window.addEventListener('printerp_auth_changed', handleAuthChange)
    window.addEventListener('printerp_data_sync', handleDataSync)

    return () => {
      window.removeEventListener('printerp_auth_changed', handleAuthChange)
      window.removeEventListener('printerp_data_sync', handleDataSync)
    }
  }, [reloadTenantData])

  // Sync session cookie to browser document.cookie for Next.js App Router server navigation
  useEffect(() => {
    if (typeof window !== 'undefined' && session) {
      try {
        const existing = getSessionFromCookie()
        if (!existing || existing.companySlug !== session.companySlug || existing.userId !== session.userId) {
          document.cookie = `${TENANT_SESSION_COOKIE}=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=604800; SameSite=Lax`
        }
      } catch {}
    }
  }, [session])

  const refreshTenant = useCallback(async () => {
    reloadTenantData()
  }, [reloadTenantData])

  const switchCompany = async (slug: string) => {
    setIsLoading(true)
    const target = availableCompanies.find((c) => c.slug === slug)
    const targetSlug = target?.slug || slug
    if (target) {
      setCompany(target)
    }

    try {
      const res = await switchCompanyAction(targetSlug)
      if (res && !res.success && res.error) {
        console.error('[TenantContext] Failed to switch company:', res.error)
      }
    } catch {
      // switchCompanyAction triggers server-side redirect() which Next.js throws
      return
    }

    if (typeof window !== 'undefined') {
      window.location.href = getTenantLink(targetSlug, '/dashboard')
      return
    }
    setIsLoading(false)
  }

  const contextValue: TenantContextType = useMemo(
    () => ({
      company,
      currentRole,
      currentUser,
      currentBranch,
      responsibilities,
      permissions,
      availableCompanies,
      branches,
      settings,
      isLoading,
      switchCompany,
      refreshTenant,
    }),
    [
      company,
      currentRole,
      currentUser,
      currentBranch,
      responsibilities,
      permissions,
      availableCompanies,
      branches,
      settings,
      isLoading,
      switchCompany,
      refreshTenant,
    ]
  )

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  )
}

function getFallbackTenantContext(): TenantContextType {
  const activeSession = getSessionFromCookie()
  const resolvedCompany = activeSession
    ? resolveCompanyFromContextOrStore(null, activeSession.companySlug || activeSession.companyId)
    : null

  const currentRole: TenantRole = mapSessionToTenantRole(activeSession)

  const currentUser: CompanyUserWithProfile | null = activeSession
    ? {
        id: activeSession.userId,
        company_id: activeSession.companyId,
        user_id: activeSession.userId,
        branch_id: activeSession.branchId || null,
        status: 'active',
        department: 'Operations',
        responsibilities: activeSession.responsibilities || [activeSession.role],
        overrides: {},
        data_scopes: {},
        invited_email: null,
        created_at: activeSession.loginTime || new Date().toISOString(),
        updated_at: activeSession.loginTime || new Date().toISOString(),
        profile: {
          id: activeSession.userId,
          email: activeSession.userEmail,
          full_name: activeSession.fullName || 'User',
          full_name_bn: activeSession.fullNameBn || null,
          phone: activeSession.phone || null,
          avatar_url: null,
          preferred_locale: 'bn',
          is_active: true,
          created_at: activeSession.loginTime || new Date().toISOString(),
          updated_at: activeSession.loginTime || new Date().toISOString(),
        },
        roles: [],
        branch: null,
      } as unknown as CompanyUserWithProfile
    : null

  return {
    company: resolvedCompany,
    currentRole,
    currentUser,
    currentBranch: null,
    responsibilities: activeSession?.responsibilities || [],
    permissions: activeSession?.permissions || [],
    availableCompanies: resolvedCompany ? [resolvedCompany] : [],
    branches: [],
    settings: null,
    isLoading: false,
    switchCompany: async (slug: string) => {
      if (typeof window !== 'undefined') {
        window.location.href = getTenantLink(slug, '/dashboard')
      }
    },
    refreshTenant: async () => {},
  }
}

export function useTenant() {
  const ctx = useContext(TenantContext)
  if (!ctx) {
    return getFallbackTenantContext()
  }
  return ctx
}
