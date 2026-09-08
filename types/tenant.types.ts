import { Database } from './database.types'

export type CompanyRow = Database['public']['Tables']['companies']['Row']
export type CompanySettingsRow = Database['public']['Tables']['company_settings']['Row']
export type BranchRow = Database['public']['Tables']['branches']['Row']
export type UserProfileRow = Database['public']['Tables']['user_profiles']['Row']
export type RoleRow = Database['public']['Tables']['roles']['Row']
export type PermissionRow = Database['public']['Tables']['permissions']['Row']
export type CompanyUserRow = Database['public']['Tables']['company_users']['Row']
export type UserRoleRow = Database['public']['Tables']['user_roles']['Row']
export type TenantMembershipRow = Database['public']['Tables']['tenant_memberships']['Row']

export type TenantRole = 'owner' | 'admin' | 'manager' | 'operator' | 'accountant' | 'designer' | 'installer'

export interface CompanySettings {
  invoice_prefix: string
  quotation_prefix: string
  challan_prefix: string
  vat_enabled: boolean
  vat_rate: number
  default_currency: string
  default_language: string
  phone?: string | null
  whatsapp?: string | null
  email?: string | null
  logo_url?: string | null
}

import { DataScope } from './rbac.types'

export interface CompanyUserWithProfile extends CompanyUserRow {
  profile?: UserProfileRow | null
  roles?: RoleRow[]
  branch?: BranchRow | null
  department?: string | null
  responsibilities?: string[]
  overrides?: Record<string, boolean>
  data_scopes?: Record<string, DataScope>
}

export interface TenantContextType {
  company: CompanyRow | null
  currentRole: TenantRole | null
  currentUser: CompanyUserWithProfile | null
  currentBranch: BranchRow | null
  responsibilities: string[]
  permissions: string[]
  availableCompanies: CompanyRow[]
  branches: BranchRow[]
  settings: CompanySettingsRow | null
  isLoading: boolean
  switchCompany: (slug: string) => Promise<void>
  refreshTenant: () => Promise<void>
}

