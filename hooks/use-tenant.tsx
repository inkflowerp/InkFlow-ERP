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

function slugToDisplayName(slug: string): string {
  return (
    slug
      .split(/[-_]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ') + ' Ltd.'
  )
}

function createSyntheticCompany(slug: string): CompanyRow {
  const normSlug = slug.toLowerCase().trim()
  const name = slugToDisplayName(normSlug)
  return {
    id: `co-${normSlug}`,
    slug: normSlug,
    name,
    name_bn: name,
    legal_name: `${name} Limited`,
    trade_license_no: null,
    bin_no: null,
    tin_no: null,
    business_type: 'printing_signage',
    phone: null,
    whatsapp: null,
    email: null,
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

function resolveCompanyBySlug(targetSlug?: string): CompanyRow {
  const normSlug = (targetSlug || 'my-company').toLowerCase().trim()
  const demoMatch = DEMO_COMPANIES.find((c) => c.slug === normSlug)
  if (demoMatch) return demoMatch

  const platformCompanies =
    PrintERPDataStore.get<PlatformTenantCompany[]>(STORAGE_KEYS.PLATFORM_COMPANIES) || []

  const platMatch = platformCompanies.find((c) => c.slug === normSlug)
  if (platMatch) return platformCompanyToRow(platMatch)

  const profile = PrintERPDataStore.get<Partial<CompanyRow>>(STORAGE_KEYS.COMPANY_PROFILE)
  if (profile && (profile.slug === normSlug || profile.name)) {
    return { ...createSyntheticCompany(normSlug), ...profile, slug: normSlug } as CompanyRow
  }

  return createSyntheticCompany(normSlug)
}

// Clean production export - no demo companies
export const DEMO_COMPANIES: CompanyRow[] = []

function getSessionFromContext(ctx?: ServerTenantContext | null): TenantSessionData | null {
  if (!ctx) return null
  return {
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    fullName: ctx.fullName || '',
    fullNameBn: ctx.fullNameBn || null,
    phone: ctx.phone || null,
    companyId: ctx.companyId,
    companySlug: ctx.companySlug,
    companyName: ctx.companyName,
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
    return JSON.parse(decodeURIComponent(raw))
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
    if (initialTenantContext?.companySlug) {
      const match = resolveCompanyBySlug(initialTenantContext.companySlug)
      return {
        ...match,
        id: initialTenantContext.companyId || match.id,
        name: initialTenantContext.companyName || match.name,
        name_bn:
          initialTenantContext.companyNameBn ||
          initialTenantContext.companyName ||
          match.name_bn ||
          match.name,
        slug: initialTenantContext.companySlug,
      }
    }
    const targetSlug = initialSlug || 'my-company'
    return resolveCompanyBySlug(targetSlug)
  })

  const [availableCompanies, setAvailableCompanies] = useState<CompanyRow[]>(() => {
    const platformCompanies =
      PrintERPDataStore.get<PlatformTenantCompany[]>(STORAGE_KEYS.PLATFORM_COMPANIES) || []
    const converted = platformCompanies.map(platformCompanyToRow)
    const activeCo = company || resolveCompanyBySlug(initialSlug || initialTenantContext?.companySlug || 'my-company')
    if (activeCo && !converted.some((c) => c.slug === activeCo.slug)) {
      return [activeCo, ...converted]
    }
    return converted.length > 0 ? converted : activeCo ? [activeCo] : []
  })

  const [session, setSession] = useState<TenantSessionData | null>(() => {
    const fromCtx = getSessionFromContext(initialTenantContext)
    if (fromCtx) return fromCtx
    const fromCookie = getSessionFromCookie()
    if (fromCookie) return fromCookie

    const targetSlug = initialSlug || initialTenantContext?.companySlug || 'my-company'
    const targetCo = resolveCompanyBySlug(targetSlug)
    return {
      userId: 'usr-owner',
      userEmail: targetCo.email || `owner@${targetCo.slug}.com`,
      fullName: targetCo.name ? `${targetCo.name} Admin` : 'Business Owner',
      fullNameBn: targetCo.name_bn ? `${targetCo.name_bn} অ্যাডমিন` : 'প্রতিষ্ঠান প্রধান',
      phone: targetCo.phone || null,
      companyId: targetCo.id,
      companySlug: targetCo.slug,
      companyName: targetCo.name,
      companyNameBn: targetCo.name_bn || null,
      branchId: null,
      role: 'business_owner',
      primaryRole: 'business_owner',
      responsibilities: ['business_owner'],
      permissions: ['*'],
      loginTime: new Date().toISOString(),
      token: '',
    }
  })

  const [branches] = useState<BranchRow[]>([])
  const [settings, setSettings] = useState<CompanySettingsRow | null>(() => {
    return {
      id: 'cs-default',
      company_id: '',
      invoice_prefix: 'INV',
      quotation_prefix: 'QUO',
      challan_prefix: 'CHL',
      vat_enabled: false,
      vat_rate: 0,
      default_currency: 'BDT',
      default_language: 'bn',
      phone: null,
      whatsapp: null,
      email: null,
      logo_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  })
  const [isLoading, setIsLoading] = useState(false)

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
    const users =
      PrintERPDataStore.get<CompanyUserWithProfile[]>(STORAGE_KEYS.COMPANY_USERS) || []

    const matched = users.find(
      (u) =>
        u.user_id === session.userId ||
        u.profile?.email.toLowerCase() === session.userEmail.toLowerCase()
    )
    if (matched) return matched

    return {
      id: session.userId,
      company_id: session.companyId,
      user_id: session.userId,
      branch_id: session.branchId || 'br-001',
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
      branch: branches.find((b) => b.id === session.branchId) || branches[0],
    }
  }, [session, branches])

  const currentBranch = session?.branchId
    ? branches.find((b) => b.id === session.branchId) || branches[0]
    : branches[0]

  const responsibilities = session?.responsibilities || (currentUser?.responsibilities || [])
  const permissions = session?.permissions || []

  const reloadTenantData = useCallback(() => {
    const activeSession = getSessionFromCookie()
    if (activeSession) {
      setSession(activeSession)
    }

    const targetSlug =
      initialSlug ||
      activeSession?.companySlug ||
      initialTenantContext?.companySlug ||
      ''
    const resolved = resolveCompanyBySlug(targetSlug)
    if (activeSession?.companyName) {
      setCompany({
        ...resolved,
        id: activeSession.companyId || resolved.id,
        name: activeSession.companyName,
        name_bn: activeSession.companyNameBn || activeSession.companyName || resolved.name_bn,
        slug: activeSession.companySlug || resolved.slug,
      })
    } else {
      setCompany(resolved)
    }

    const persistedSettings = PrintERPDataStore.get<CompanySettingsRow>(STORAGE_KEYS.TAX_SETTINGS)
    if (persistedSettings) {
      setSettings(persistedSettings)
    }

    const platformCompanies =
      PrintERPDataStore.get<PlatformTenantCompany[]>(STORAGE_KEYS.PLATFORM_COMPANIES) || []
    const converted = platformCompanies.map(platformCompanyToRow)
    const activeResolved = activeSession?.companyName
      ? {
          ...resolved,
          id: activeSession.companyId || resolved.id,
          name: activeSession.companyName,
          name_bn: activeSession.companyNameBn || activeSession.companyName || resolved.name_bn,
          slug: activeSession.companySlug || resolved.slug,
        }
      : resolved

    if (activeResolved && !converted.some((c) => c.slug === activeResolved.slug)) {
      setAvailableCompanies([activeResolved, ...converted])
    } else {
      setAvailableCompanies(converted.length > 0 ? converted : activeResolved ? [activeResolved] : [])
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

  const refreshTenant = useCallback(async () => {
    reloadTenantData()
  }, [reloadTenantData])

  const switchCompany = async (slug: string) => {
    setIsLoading(true)
    const target = availableCompanies.find((c) => c.slug === slug) || resolveCompanyBySlug(slug)
    if (target) {
      const profile = PrintERPDataStore.get<Partial<CompanyRow>>(STORAGE_KEYS.COMPANY_PROFILE)
      setCompany(profile ? { ...target, ...profile } : target)
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

export function useTenant() {
  const ctx = useContext(TenantContext)
  if (!ctx) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return ctx
}

