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
import { cn } from '@/lib/utils'

export function RolesPage() {
  const { company } = useTenant()
  const companyId = company?.id || ''
  const companySlug = company?.slug || 'rangao'

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
      <div className="pb-1 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-blue-600" />
          <span>Roles & Permission Matrix</span>
          <span className="text-xs font-normal text-slate-400 font-hind">অনুমতি ও নিরাপত্তা</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Define role responsibilities, configure granular module permissions, simulate access clearances, and review governance audit logs.
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto scrollbar-thin">
        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0',
            activeTab === 'matrix'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          )}
        >
          <Sliders className="w-4 h-4 shrink-0" />
          <span>Role Templates & Matrix</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('simulator')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0',
            activeTab === 'simulator'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          )}
        >
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
          <span>Permission Inspector & Simulator</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0',
            activeTab === 'audit'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          )}
        >
          <History className="w-4 h-4 shrink-0" />
          <span>Security Audit Trail</span>
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
