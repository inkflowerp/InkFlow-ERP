import type { PermissionAction, PermissionModule } from '@/types/rbac.types'
import type { FeatureCode } from '@/types/subscription.types'

export interface NavItem {
  key: string
  title: string
  titleBn: string
  href: string
  icon: string
  badge?: string
  badgeVariant?: 'live' | 'fast' | 'pwa' | 'pro' | 'default'
  permission?: {
    action: PermissionAction
    resource: PermissionModule | string
  }
  featureGate?: FeatureCode
  isPrimaryAction?: boolean
  ownerOnly?: boolean
}

export interface NavSection {
  id: 'today' | 'work' | 'materials' | 'management' | 'settings'
  title: string
  titleBn: string
  items: NavItem[]
}

export function getNavigationConfig(tenantSlug: string): NavSection[] {
  return [
    {
      id: 'today',
      title: 'Dashboard',
      titleBn: 'ড্যাশবোর্ড',
      items: [
        {
          key: 'dashboard',
          title: 'Dashboard',
          titleBn: 'ড্যাশবোর্ড',
          href: `/${tenantSlug}/dashboard`,
          icon: 'LayoutDashboard',
        },
        {
          key: 'quotations',
          title: 'Quotations',
          titleBn: 'কোটেশন',
          href: `/${tenantSlug}/quotations`,
          icon: 'FileSpreadsheet',
          permission: { action: 'view', resource: 'quotations' },
        },
        {
          key: 'operator',
          title: 'My Work',
          titleBn: 'আমার কাজ',
          href: `/${tenantSlug}/operator`,
          icon: 'Printer',
          badge: 'Live',
          badgeVariant: 'live',
        },
        {
          key: 'new-work',
          title: 'New Work',
          titleBn: 'নতুন কাজ',
          href: `/${tenantSlug}/sales/new-work`,
          icon: 'Plus',
          isPrimaryAction: true,
        },
        {
          key: 'communications',
          title: 'Notifications',
          titleBn: 'নোটিফিকেশন',
          href: `/${tenantSlug}/communications`,
          icon: 'Bell',
          permission: { action: 'view', resource: 'notifications' },
        },
      ],
    },
    {
      id: 'work',
      title: 'Work',
      titleBn: 'কাজ',
      items: [
        {
          key: 'customers',
          title: 'Customers',
          titleBn: 'কাস্টমার',
          href: `/${tenantSlug}/customers`,
          icon: 'Users',
          permission: { action: 'view', resource: 'customers' },
        },
        {
          key: 'sales',
          title: 'Sales & Quotes',
          titleBn: 'বিক্রি ও কোটেশন',
          href: `/${tenantSlug}/sales`,
          icon: 'Briefcase',
          permission: { action: 'view', resource: 'quotations' },
        },
        {
          key: 'billing',
          title: 'Invoices & Payments',
          titleBn: 'ইনভয়েস ও পেমেন্ট',
          href: `/${tenantSlug}/billing`,
          icon: 'Receipt',
          permission: { action: 'view', resource: 'invoices' },
        },
        {
          key: 'design',
          title: 'Design',
          titleBn: 'ডিজাইন',
          href: `/${tenantSlug}/design`,
          icon: 'Palette',
          permission: { action: 'view', resource: 'design' },
        },
        {
          key: 'production',
          title: 'Production',
          titleBn: 'প্রোডাকশন',
          href: `/${tenantSlug}/production`,
          icon: 'Printer',
          permission: { action: 'view', resource: 'production' },
        },
        {
          key: 'delivery',
          title: 'Delivery',
          titleBn: 'ডেলিভারি',
          href: `/${tenantSlug}/delivery`,
          icon: 'Truck',
          permission: { action: 'view', resource: 'delivery' },
        },
      ],
    },
    {
      id: 'materials',
      title: 'Materials',
      titleBn: 'কাঁচামাল',
      items: [
        {
          key: 'inventory',
          title: 'Inventory',
          titleBn: 'স্টক',
          href: `/${tenantSlug}/inventory`,
          icon: 'Package',
          permission: { action: 'view', resource: 'inventory' },
        },
        {
          key: 'purchases',
          title: 'Purchases',
          titleBn: 'কেনাকাটা',
          href: `/${tenantSlug}/purchases`,
          icon: 'ShoppingBag',
          permission: { action: 'view', resource: 'inventory' },
        },
        {
          key: 'suppliers',
          title: 'Suppliers',
          titleBn: 'সরবরাহকারী',
          href: `/${tenantSlug}/suppliers`,
          icon: 'Building2',
          permission: { action: 'view', resource: 'inventory' },
        },
      ],
    },
    {
      id: 'management',
      title: 'Management',
      titleBn: 'ম্যানেজমেন্ট',
      items: [
        {
          key: 'reports',
          title: 'Reports',
          titleBn: 'রিপোর্ট',
          href: `/${tenantSlug}/reports`,
          icon: 'BarChart3',
          permission: { action: 'view', resource: 'reports' },
        },
        {
          key: 'costing',
          title: 'Cost & Profit',
          titleBn: 'খরচ ও লাভ',
          href: `/${tenantSlug}/costing`,
          icon: 'Calculator',
          permission: { action: 'view', resource: 'reports' },
        },
        {
          key: 'accounting',
          title: 'Finance',
          titleBn: 'হিসাব',
          href: `/${tenantSlug}/accounting`,
          icon: 'Landmark',
          permission: { action: 'view', resource: 'payments' },
        },
        {
          key: 'attendance',
          title: 'Staff & Attendance',
          titleBn: 'কর্মী ও উপস্থিতি',
          href: `/${tenantSlug}/attendance`,
          icon: 'UserCheck',
          permission: { action: 'view', resource: 'settings' },
        },
        {
          key: 'machineries',
          title: 'Machines',
          titleBn: 'মেশিন',
          href: `/${tenantSlug}/production/machineries`,
          icon: 'Cpu',
          permission: { action: 'view', resource: 'machineries' },
        },
        {
          key: 'branches',
          title: 'Branches',
          titleBn: 'শাখা',
          href: `/${tenantSlug}/settings/branches`,
          icon: 'Building',
          permission: { action: 'view', resource: 'branches' },
        },
      ],
    },
    {
      id: 'settings',
      title: 'Settings',
      titleBn: 'সেটিংস',
      items: [
        {
          key: 'users',
          title: 'Users & Permissions',
          titleBn: 'ইউজার ও অনুমতি',
          href: `/${tenantSlug}/settings/users`,
          icon: 'Users2',
          permission: { action: 'manage', resource: 'settings' },
        },
        {
          key: 'automations',
          title: 'Workflow',
          titleBn: 'কাজের ধাপ',
          href: `/${tenantSlug}/settings/automations`,
          icon: 'Workflow',
          permission: { action: 'manage', resource: 'settings' },
        },
        {
          key: 'tax',
          title: 'Tax & VAT',
          titleBn: 'ট্যাক্স ও ভ্যাট',
          href: `/${tenantSlug}/settings/tax`,
          icon: 'FileCheck2',
          permission: { action: 'manage', resource: 'settings' },
        },
        {
          key: 'audit',
          title: 'Activity Log',
          titleBn: 'কাজের ইতিহাস',
          href: `/${tenantSlug}/audit`,
          icon: 'FileText',
          permission: { action: 'view', resource: 'settings' },
        },
        {
          key: 'company_settings',
          title: 'Company Settings',
          titleBn: 'কোম্পানি সেটিংস',
          href: `/${tenantSlug}/settings`,
          icon: 'Settings',
          permission: { action: 'view', resource: 'settings' },
        },
      ],
    },
  ]
}
