'use client'

import React, { useState, useEffect } from 'react'
import {
  ShieldCheck,
  Sliders,
  ShieldAlert,
  History,
  Lock,
  Sparkles,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { RolesMatrixTab } from '@/components/users/roles-matrix-tab'
import { PermissionSimulator } from '@/components/users/permission-simulator'
import { SecurityAuditTab } from '@/components/users/security-audit-tab'
import {
  listCompanyUsersAction,
  listRolesAction,
  listBranchesAction,
} from '@/actions/company-users.actions'
import { CompanyUserWithProfile, RoleRow, BranchRow } from '@/types/tenant.types'
import { useParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n/context'

export function RolesPage() {
  const { tBilingual } = useI18n()
  const params = useParams()
  const routeSlug = (params?.tenantSlug as string) || ''
  const { company } = useTenant()
  const companyId = company?.id || ''
  const companySlug = routeSlug || company?.slug || ''

  const [activeTab, setActiveTab] = useState<'matrix' | 'simulator' | 'audit'>('matrix')
  const [users, setUsers] = useState<CompanyUserWithProfile[]>([])
  const [roles, setRoles] = useState<RoleRow[]>([])
  const [branches, setBranches] = useState<BranchRow[]>([])

  useEffect(() => {
    if (!companyId) return
    let isMounted = true

    async function loadMeta() {
      try {
        const [uRes, rRes, bRes] = await Promise.all([
          listCompanyUsersAction(companyId),
          listRolesAction(companyId),
          listBranchesAction(companyId),
        ])
        if (!isMounted) return
        if (Array.isArray(uRes)) setUsers(uRes)
        else if ((uRes as any)?.data) setUsers((uRes as any).data)
        if (Array.isArray(rRes)) setRoles(rRes)
        if (Array.isArray(bRes)) setBranches(bRes)
      } catch (err) {
        console.error('[RolesPage] loadMeta error:', err)
      }
    }

    loadMeta()
    return () => {
      isMounted = false
    }
  }, [companyId])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-1 border-b border-border">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <span>{tBilingual('Roles & Permission Matrix', 'রোল ও পারমিশন ম্যাট্রিক্স')}</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {tBilingual(
            'Define role responsibilities, configure granular module permissions, simulate access clearances, and review governance audit logs.',
            'রোলের দায়িত্ব নির্ধারণ, মডিউলভিত্তিক অনুমতি কনফিগার, অ্যাক্সেস সিমুলেট এবং নিরাপত্তা অডিট লগ পর্যালোচনা করুন।'
          )}
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto scrollbar-thin">
        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0',
            activeTab === 'matrix'
              ? 'bg-primary text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-muted/60'
          )}
        >
          <Sliders className="w-4 h-4 shrink-0" />
          <span>{tBilingual('Role Templates & Matrix', 'রোল টেমপ্লেট ও ম্যাট্রিক্স')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('simulator')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0',
            activeTab === 'simulator'
              ? 'bg-primary text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-muted/60'
          )}
        >
          <ShieldAlert className="w-4 h-4 shrink-0 text-warning" />
          <span>{tBilingual('Permission Inspector & Simulator', 'পারমিশন ইন্সপেক্টর ও সিমুলেটর')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0',
            activeTab === 'audit'
              ? 'bg-primary text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-muted/60'
          )}
        >
          <History className="w-4 h-4 shrink-0" />
          <span>{tBilingual('Security Audit Trail', 'নিরাপত্তা অডিট ট্রেইল')}</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'matrix' && (
          <RolesMatrixTab
            companyId={companyId}
            tenantSlug={companySlug}
            onRolesChanged={() => {}}
          />
        )}

        {activeTab === 'simulator' && (
          <PermissionSimulator
            users={users}
            roles={roles}
            branches={branches}
            companySlug={companySlug}
          />
        )}

        {activeTab === 'audit' && (
          <SecurityAuditTab
            companyId={companyId}
            companySlug={companySlug}
          />
        )}
      </div>
    </div>
  )
}
