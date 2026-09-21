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
  hasDividerBelow?: boolean
}

export interface NavSection {
  id: 'today' | 'work' | 'materials' | 'management' | 'settings'
  title: string
  titleBn: string
  items: NavItem[]
}

export function getNavigationConfig(_tenantSlug?: string): NavSection[] {
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
          href: '/dashboard',
          icon: 'LayoutDashboard',
        },
        {
          key: 'quotations',
          title: 'Quotations',
          titleBn: 'কোটেশন',
          href: '/quotations',
          icon: 'FileSpreadsheet',
          permission: { action: 'view', resource: 'quotations' },
        },
        {
          key: 'billing',
          title: 'Billing & Collections',
          titleBn: 'বিলিং ও কালেকশন',
          href: '/billing',
          icon: 'Receipt',
          permission: { action: 'view', resource: 'invoices' },
        },
        {
          key: 'customers',
          title: 'Customers',
          titleBn: 'কাস্টমার',
          href: '/customers',
          icon: 'Users',
          permission: { action: 'view', resource: 'customers' },
        },
        {
          key: 'products',
          title: 'Products & Services',
          titleBn: 'পণ্য ও সেবা',
          href: '/products',
          icon: 'Layers',
          permission: { action: 'view', resource: 'inventory' },
        },
        {
          key: 'inventory',
          title: 'Inventory',
          titleBn: 'ইনভেন্টরি',
          href: '/inventory',
          icon: 'Package',
          permission: { action: 'view', resource: 'inventory' },
        },
        {
          key: 'suppliers',
          title: 'Suppliers',
          titleBn: 'সরবরাহকারী',
          href: '/suppliers',
          icon: 'Building2',
          permission: { action: 'view', resource: 'inventory' },
        },
        {
          key: 'pricing',
          title: 'Pricing & Tariffs',
          titleBn: 'মূল্য নির্ধারণ ও ট্যারিফ',
          href: '/pricing',
          icon: 'Tag',
          permission: { action: 'view', resource: 'pricing' },
          hasDividerBelow: true,
        },
        {
          key: 'hrm_dashboard',
          title: 'HRM Dashboard',
          titleBn: 'এইচআরএম ড্যাশবোর্ড',
          href: '/hr',
          icon: 'LayoutDashboard',
          permission: { action: 'view', resource: 'settings' },
          badge: 'HRM',
          badgeVariant: 'pro',
        },
        {
          key: 'hrm_employees',
          title: 'Employee List',
          titleBn: 'কর্মীদের তালিকা',
          href: '/hr/employees',
          icon: 'Users',
          permission: { action: 'view', resource: 'settings' },
        },
        {
          key: 'hrm_attendance',
          title: 'Attendance',
          titleBn: 'উপস্থিতি ও হাজিরা',
          href: '/hr/attendance',
          icon: 'UserCheck',
          permission: { action: 'view', resource: 'settings' },
        },
        {
          key: 'hrm_payroll',
          title: 'Payroll and Salery',
          titleBn: 'পেরোল ও বেতন',
          href: '/hr/payroll',
          icon: 'Wallet',
          permission: { action: 'view', resource: 'settings' },
        },
        {
          key: 'hrm_salary_report',
          title: 'Salery Report',
          titleBn: 'বেতন রিপোর্ট',
          href: '/hr/salary-report',
          icon: 'FileSpreadsheet',
          permission: { action: 'view', resource: 'reports' },
          hasDividerBelow: true,
        },
        {
          key: 'operator',
          title: 'My Work',
          titleBn: 'আমার কাজ',
          href: '/operator',
          icon: 'Printer',
          badge: 'Live',
          badgeVariant: 'live',
        },
        {
          key: 'new-work',
          title: 'New Work',
          titleBn: 'নতুন কাজ',
          href: '/sales/new-work',
          icon: 'Plus',
          isPrimaryAction: true,
        },
        {
          key: 'communications',
          title: 'Notifications',
          titleBn: 'নোটিফিকেশন',
          href: '/communications',
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
          key: 'orders',
          title: 'Orders & Job Flow',
          titleBn: 'অর্ডার ও জব ফ্লো',
          href: '/orders',
          icon: 'ShoppingBag',
          permission: { action: 'view', resource: 'orders' },
        },
        {
          key: 'sales',
          title: 'Sales & Quotes',
          titleBn: 'বিক্রি ও কোটেশন',
          href: '/sales',
          icon: 'Briefcase',
          permission: { action: 'view', resource: 'quotations' },
        },
        {
          key: 'design',
          title: 'Design Panel',
          titleBn: 'ডিজাইন প্যানেল',
          href: '/design',
          icon: 'Palette',
          permission: { action: 'view', resource: 'design' },
        },
        {
          key: 'production',
          title: 'Production',
          titleBn: 'প্রোডাকশন',
          href: '/production',
          icon: 'Printer',
          permission: { action: 'view', resource: 'production' },
        },
        {
          key: 'finishing',
          title: 'Finishing & Fabrication',
          titleBn: 'ফিনিশিং ও ফেব্রিকেশন',
          href: '/finishing',
          icon: 'Scissors',
          permission: { action: 'view', resource: 'production' },
          badge: 'Floor',
          badgeVariant: 'fast',
        },
        {
          key: 'delivery',
          title: 'Delivery',
          titleBn: 'ডেলিভারি',
          href: '/delivery',
          icon: 'Truck',
          permission: { action: 'view', resource: 'delivery' },
        },
      ],
    },
    {
      id: 'management',
      title: 'Management',
      titleBn: 'ম্যানেজমেন্ট',
      items: [
        {
          key: 'costing',
          title: 'Cost & Profit',
          titleBn: 'খরচ ও লাভ',
          href: '/costing',
          icon: 'Calculator',
          permission: { action: 'view', resource: 'reports' },
        },
        {
          key: 'accounting',
          title: 'Finance',
          titleBn: 'হিসাব',
          href: '/accounting',
          icon: 'Landmark',
          permission: { action: 'view', resource: 'payments' },
        },
        {
          key: 'reports',
          title: 'Reports',
          titleBn: 'রিপোর্ট',
          href: '/reports',
          icon: 'BarChart3',
          permission: { action: 'view', resource: 'reports' },
        },
        {
          key: 'machineries',
          title: 'Machines',
          titleBn: 'মেশিন',
          href: '/production/machineries',
          icon: 'Cpu',
          permission: { action: 'view', resource: 'machineries' },
        },
        {
          key: 'branches',
          title: 'Branches',
          titleBn: 'শাখা',
          href: '/settings/branches',
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
          href: '/settings/users',
          icon: 'Users2',
          permission: { action: 'manage', resource: 'settings' },
        },
        {
          key: 'automations',
          title: 'Workflow',
          titleBn: 'কাজের ধাপ',
          href: '/settings/automations',
          icon: 'Workflow',
          permission: { action: 'manage', resource: 'settings' },
        },
        {
          key: 'tax',
          title: 'Tax & VAT',
          titleBn: 'ট্যাক্স ও ভ্যাট',
          href: '/settings/tax',
          icon: 'FileCheck2',
          permission: { action: 'manage', resource: 'settings' },
        },
        {
          key: 'audit',
          title: 'Activity Log',
          titleBn: 'কাজের ইতিহাস',
          href: '/audit',
          icon: 'FileText',
          permission: { action: 'view', resource: 'settings' },
        },
        {
          key: 'trash',
          title: 'Trash / Recycle Bin',
          titleBn: 'ট্র্যাশ ও রিসাইকেল বিন',
          href: '/trash',
          icon: 'Trash2',
          permission: { action: 'view', resource: 'settings' },
        },
        {
          key: 'company_settings',
          title: 'Company Settings',
          titleBn: 'কোম্পানি সেটিংস',
          href: '/settings',
          icon: 'Settings',
          permission: { action: 'view', resource: 'settings' },
        },
      ],
    },
  ]
}
