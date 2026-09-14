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
  simpleMode?: boolean
  isPrimaryAction?: boolean
  ownerOnly?: boolean
  level?: 1 | 2 | 3 | 4
}

export interface NavSection {
  id: 'today' | 'work' | 'materials' | 'management' | 'settings'
  title: string
  titleBn: string
  level: 1 | 2 | 3 | 4
  items: NavItem[]
}

export function getNavigationConfig(tenantSlug: string): NavSection[] {
  return [
    {
      id: 'today',
      title: "Today's Work",
      titleBn: 'আজকের কাজ',
      level: 1,
      items: [
        {
          key: 'dashboard',
          title: "Today's Work",
          titleBn: 'আজকের কাজ',
          href: `/${tenantSlug}/dashboard`,
          icon: 'LayoutDashboard',
          simpleMode: true,
          level: 1,
        },
        {
          key: 'operator',
          title: 'My Work',
          titleBn: 'আমার কাজ',
          href: `/${tenantSlug}/operator`,
          icon: 'Printer',
          badge: 'Live',
          badgeVariant: 'live',
          simpleMode: true,
          level: 1,
        },
        {
          key: 'new-work',
          title: '+ New Work',
          titleBn: '+ নতুন কাজ',
          href: `/${tenantSlug}/sales/new-work`,
          icon: 'Plus',
          badge: 'Fast',
          badgeVariant: 'fast',
          isPrimaryAction: true,
          simpleMode: true,
          level: 1,
        },
        {
          key: 'communications',
          title: 'Messages',
          titleBn: 'মেসেজ ও চ্যাট',
          href: `/${tenantSlug}/communications`,
          icon: 'MessageSquare',
          permission: { action: 'view', resource: 'notifications' },
          simpleMode: false,
          level: 1,
        },
      ],
    },
    {
      id: 'work',
      title: 'Work',
      titleBn: 'কাজের হিসাব ও প্রোডাকশন',
      level: 2,
      items: [
        {
          key: 'customers',
          title: 'Customers',
          titleBn: 'কাস্টমার',
          href: `/${tenantSlug}/customers`,
          icon: 'Users',
          permission: { action: 'view', resource: 'customers' },
          simpleMode: true,
          level: 2,
        },
        {
          key: 'sales',
          title: 'Sales & Quotations',
          titleBn: 'সেলস ও কোটেশন',
          href: `/${tenantSlug}/sales`,
          icon: 'Briefcase',
          permission: { action: 'view', resource: 'quotations' },
          simpleMode: true,
          level: 2,
        },
        {
          key: 'billing',
          title: 'Invoices & Payments',
          titleBn: 'ইনভয়েস ও পেমেন্ট',
          href: `/${tenantSlug}/billing`,
          icon: 'Receipt',
          permission: { action: 'view', resource: 'invoices' },
          simpleMode: true,
          level: 2,
        },
        {
          key: 'design',
          title: 'Design & Approval',
          titleBn: 'ডিজাইন ও প্রুফিং',
          href: `/${tenantSlug}/design`,
          icon: 'Palette',
          permission: { action: 'view', resource: 'design' },
          simpleMode: false,
          level: 2,
        },
        {
          key: 'production',
          title: 'Production',
          titleBn: 'প্রোডাকশন ফ্লোর',
          href: `/${tenantSlug}/production`,
          icon: 'Printer',
          permission: { action: 'view', resource: 'production' },
          simpleMode: true,
          level: 2,
        },
        {
          key: 'delivery',
          title: 'Delivery',
          titleBn: 'ডেলিভারি ও চালান',
          href: `/${tenantSlug}/delivery`,
          icon: 'Truck',
          permission: { action: 'view', resource: 'delivery' },
          simpleMode: true,
          level: 2,
        },
      ],
    },
    {
      id: 'materials',
      title: 'Materials',
      titleBn: 'কাঁচামাল ও স্টক',
      level: 2,
      items: [
        {
          key: 'inventory',
          title: 'Inventory',
          titleBn: 'কাঁচামাল ও স্টক',
          href: `/${tenantSlug}/inventory`,
          icon: 'Package',
          permission: { action: 'view', resource: 'inventory' },
          simpleMode: true,
          level: 2,
        },
        {
          key: 'purchases',
          title: 'Purchasing',
          titleBn: 'ক্রয় ও রিকুইজিশন',
          href: `/${tenantSlug}/purchases`,
          icon: 'ShoppingBag',
          permission: { action: 'view', resource: 'inventory' },
          simpleMode: false,
          level: 2,
        },
        {
          key: 'suppliers',
          title: 'Suppliers',
          titleBn: 'সরবরাহকারী',
          href: `/${tenantSlug}/suppliers`,
          icon: 'Building2',
          permission: { action: 'view', resource: 'inventory' },
          simpleMode: false,
          level: 2,
        },
      ],
    },
    {
      id: 'management',
      title: 'Management',
      titleBn: 'ব্যবস্থাপনা ও রিপোর্ট',
      level: 3,
      items: [
        {
          key: 'reports',
          title: 'Reports',
          titleBn: 'রিপোর্ট ও অ্যানালিটিক্স',
          href: `/${tenantSlug}/reports`,
          icon: 'BarChart3',
          permission: { action: 'view', resource: 'reports' },
          simpleMode: false,
          level: 3,
        },
        {
          key: 'costing',
          title: 'Costing & Profit',
          titleBn: 'কস্টিং ও লাভ নিরীক্ষা',
          href: `/${tenantSlug}/costing`,
          icon: 'Calculator',
          permission: { action: 'view', resource: 'reports' },
          simpleMode: false,
          level: 3,
        },
        {
          key: 'accounting',
          title: 'Finance',
          titleBn: 'ফাইন্যান্স ও ব্যাংক',
          href: `/${tenantSlug}/accounting`,
          icon: 'Landmark',
          permission: { action: 'view', resource: 'payments' },
          simpleMode: false,
          level: 3,
        },
        {
          key: 'attendance',
          title: 'Staff & Attendance',
          titleBn: 'কর্মী ও হাজিরা',
          href: `/${tenantSlug}/attendance`,
          icon: 'UserCheck',
          permission: { action: 'view', resource: 'settings' },
          simpleMode: false,
          level: 3,
        },
        {
          key: 'machineries',
          title: 'Machines',
          titleBn: 'মেশিনারিজ',
          href: `/${tenantSlug}/production/machineries`,
          icon: 'Cpu',
          permission: { action: 'view', resource: 'machineries' },
          simpleMode: false,
          level: 3,
        },
        {
          key: 'branches',
          title: 'Branches',
          titleBn: 'ব্রাঞ্চ ও শাখা',
          href: `/${tenantSlug}/settings/branches`,
          icon: 'Building',
          permission: { action: 'view', resource: 'branches' },
          simpleMode: false,
          level: 3,
        },
      ],
    },
    {
      id: 'settings',
      title: 'Settings',
      titleBn: 'সিস্টেম সেটিংস',
      level: 4,
      items: [
        {
          key: 'users',
          title: 'Users & Responsibilities',
          titleBn: 'ইউজার ও দায়িত্ব',
          href: `/${tenantSlug}/settings/users`,
          icon: 'Users2',
          permission: { action: 'view', resource: 'settings' },
          simpleMode: false,
          level: 4,
        },
        {
          key: 'roles',
          title: 'Permissions',
          titleBn: 'অনুমতি ও পারমিশন',
          href: `/${tenantSlug}/settings/roles`,
          icon: 'ShieldCheck',
          permission: { action: 'manage', resource: 'settings' },
          simpleMode: false,
          level: 4,
        },
        {
          key: 'automations',
          title: 'Workflow',
          titleBn: 'ওয়ার্কফ্লো অটোমেশন',
          href: `/${tenantSlug}/settings/automations`,
          icon: 'Workflow',
          permission: { action: 'manage', resource: 'settings' },
          simpleMode: false,
          level: 4,
        },
        {
          key: 'tax',
          title: 'Tax & VAT',
          titleBn: 'ভ্যাট ও ট্যাক্স',
          href: `/${tenantSlug}/settings/tax`,
          icon: 'FileCheck2',
          permission: { action: 'manage', resource: 'settings' },
          simpleMode: false,
          level: 4,
        },
        {
          key: 'audit',
          title: 'Audit Log',
          titleBn: 'অডিট লগ ও নিরাপত্তা',
          href: `/${tenantSlug}/audit`,
          icon: 'FileText',
          permission: { action: 'view', resource: 'settings' },
          simpleMode: false,
          level: 4,
        },
        {
          key: 'company_settings',
          title: 'Company Settings',
          titleBn: 'প্রতিষ্ঠান সেটিংস',
          href: `/${tenantSlug}/settings`,
          icon: 'Settings',
          permission: { action: 'view', resource: 'settings' },
          simpleMode: false,
          level: 4,
        },
      ],
    },
  ]
}
