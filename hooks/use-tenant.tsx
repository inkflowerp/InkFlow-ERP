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
import { TENANT_SESSION_COOKIE, TenantSessionData, TenantContext as ServerTenantContext } from '@/lib/auth/types'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { PlatformTenantCompany } from '@/types/platform.types'

const TenantContext = createContext<TenantContextType | null>(null)

// Helper to convert PlatformTenantCompany to CompanyRow
function platformCompanyToRow(p: PlatformTenantCompany): CompanyRow {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    name_bn: p.name_bn || null,
    legal_name: null,
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
    address: p.hub || 'Dhaka, Bangladesh',
    address_bn: null,
    currency: 'BDT',
    default_locale: 'bn',
    logo_url: null,
    is_active: p.status !== 'suspended',
    settings: { vat_rate: 7.5, bilingual_invoicing: true },
    created_at: p.created_at || new Date().toISOString(),
    updated_at: p.created_at || new Date().toISOString(),
  }
}

function resolveCompanyFromContextOrStore(
  ctx?: ServerTenantContext | null,
  targetSlug?: string
): CompanyRow | null {
  if (ctx?.companyId && ctx?.companySlug) {
    return {
      id: ctx.companyId,
      slug: ctx.companySlug,
      name: ctx.companyName || ctx.companySlug,
      name_bn: ctx.companyNameBn || ctx.companyName || null,
      legal_name: `${ctx.companyName || ctx.companySlug} Ltd.`,
      trade_license_no: null,
      bin_no: null,
      tin_no: null,
      business_type: 'printing_signage',
      phone: ctx.phone || null,
      whatsapp: ctx.phone || null,
      email: ctx.userEmail || null,
      website: null,
      division_id: 1,
      district_id: 1,
      upazila_id: 1,
      area: null,
      address: 'Dhaka, Bangladesh',
      address_bn: null,
      currency: 'BDT',
      default_locale: 'bn',
      logo_url: null,
      is_active: true,
      settings: { vat_rate: 7.5, bilingual_invoicing: true },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  const slug = (targetSlug || '').toLowerCase().trim()
  if (!slug) return null

  const platformCompanies =
    PrintERPDataStore.get<PlatformTenantCompany[]>(STORAGE_KEYS.PLATFORM_COMPANIES) || []
  const platMatch = platformCompanies.find((c) => c.slug === slug || c.id === slug)
  if (platMatch) return platformCompanyToRow(platMatch)

  const profile = PrintERPDataStore.get<Partial<CompanyRow>>(STORAGE_KEYS.COMPANY_PROFILE)
  if (profile && (profile.slug === slug || profile.id === slug)) {
    return {
      id: profile.id || slug,
      slug: profile.slug || slug,
      name: profile.name || slug,
      name_bn: profile.name_bn || null,
      legal_name: profile.legal_name || null,
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
      address: profile.address || 'Dhaka, Bangladesh',
      address_bn: profile.address_bn || null,
      currency: profile.currency || 'BDT',
      default_locale: profile.default_locale || 'bn',
      logo_url: profile.logo_url || null,
      is_active: profile.is_active ?? true,
      settings: profile.settings || { vat_rate: 7.5, bilingual_invoicing: true },
      created_at: profile.created_at || new Date().toISOString(),
      updated_at: profile.updated_at || new Date().toISOString(),
    }
  }

  return null
}

export const DEMO_COMPANIES: CompanyRow[] = []

function getSessionFromContext(ctx?: ServerTenantContext | null): TenantSessionData | null {
  if (!ctx || !ctx.userId) return null
  return {
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    fullName: ctx.fullName || '',
    fullNameBn: ctx.fullNameBn || null,
    phone: ctx.phone || null,
    companyId: ctx.companyId,
    companySlug: ctx.companySlug,
    companyName: ctx.companyName,
    companyNameBn: ctx.companyNameBn || null,
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

  // Map session role to TenantRole ('owner' | 'manager' | 'operator' | etc.)
  const currentRole: TenantRole = session?.role
    ? session.role === 'business_owner'
      ? 'owner'
      : session.role === 'sales_manager'
      ? 'manager'
      : session.role === 'graphic_designer'
      ? 'designer'
      : session.role === 'machine_operator'
      ? 'operator'
      : session.role === 'accountant'
      ? 'accountant'
      : session.role === 'delivery_coordinator'
      ? 'installer'
      : (session.role as TenantRole) || 'owner'
    : 'owner'

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
    }
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

    const platformCompanies =
      PrintERPDataStore.get<PlatformTenantCompany[]>(STORAGE_KEYS.PLATFORM_COMPANIES) || []
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
    if (target) {
      setCompany(target)
      if (typeof window !== 'undefined') {
        try {
          const storedSession = getSessionFromCookie() || session
          if (storedSession) {
            const updatedSession: TenantSessionData = {
              ...storedSession,
              companyId: target.id,
              companySlug: target.slug,
              companyName: target.name,
              companyNameBn: target.name_bn || null,
            }
            setSession(updatedSession)
            document.cookie = `${TENANT_SESSION_COOKIE}=${encodeURIComponent(JSON.stringify(updatedSession))}; path=/; max-age=604800; SameSite=Lax`
          }
        } catch {}
      }
      router.push(`/${target.slug}/dashboard`)
    }
    setIsLoading(false)
  }

  return (
    <TenantContext.Provider
      value={{
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
      }}
    >
      {children}
    </TenantContext.Provider>
  )
}

function getFallbackTenantContext(): TenantContextType {
  const activeSession = getSessionFromCookie()
  const resolvedCompany = activeSession
    ? resolveCompanyFromContextOrStore(null, activeSession.companySlug || activeSession.companyId)
    : null

  const currentRole: TenantRole = activeSession?.role
    ? activeSession.role === 'business_owner'
      ? 'owner'
      : activeSession.role === 'sales_manager'
      ? 'manager'
      : activeSession.role === 'graphic_designer'
      ? 'designer'
      : activeSession.role === 'machine_operator'
      ? 'operator'
      : activeSession.role === 'accountant'
      ? 'accountant'
      : activeSession.role === 'delivery_coordinator'
      ? 'installer'
      : (activeSession.role as TenantRole) || 'owner'
    : 'owner'

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
      }
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
        window.location.href = `/${slug}/dashboard`
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
