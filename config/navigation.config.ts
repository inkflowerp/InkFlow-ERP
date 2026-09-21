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
  id: 'today' | 'work' | 'management' | 'settings'
  title: string
  titleBn: string
  items: NavItem[]
}

export function getNavigationConfig(_tenantSlug?: string): NavSection[] {
  return [
    {
      id: 'today',
      title: 'Sales & Commercial',
      titleBn: 'সেলস ও বাণিজ্যিক',
      items: [
        {
          key: 'new-work',
          title: 'New Work',
          titleBn: 'নতুন কাজ',
          href: '/sales/new-work',
          icon: 'Plus',
          isPrimaryAction: true,
          badge: 'POS',
          badgeVariant: 'fast',
        },
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
          key: 'orders',
          title: 'Orders & Job Flow',
          titleBn: 'অর্ডার ও জব ফ্লো',
          href: '/orders',
          icon: 'ShoppingBag',
          permission: { action: 'view', resource: 'orders' },
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
      ],
    },
    {
      id: 'work',
      title: 'Factory & Floor',
      titleBn: 'কারখানা ও প্রোডাকশন',
      items: [
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
          title: 'Printing Floor',
          titleBn: 'প্রিন্টিং ফ্লোর',
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
          key: 'operator',
          title: 'Shop Floor Terminal',
          titleBn: 'অপারেটর টার্মিনাল',
          href: '/operator',
          icon: 'Cpu',
          permission: { action: 'view', resource: 'production' },
          badge: 'Live',
          badgeVariant: 'live',
        },
        {
          key: 'machineries',
          title: 'Machineries & Fleet',
          titleBn: 'মেশিনারি ও ফ্লিট',
          href: '/production/machineries',
          icon: 'Cpu',
          permission: { action: 'view', resource: 'machineries' },
        },
        {
          key: 'delivery',
          title: 'Delivery & Challan',
          titleBn: 'ডেলিভারি ও চালান',
          href: '/delivery',
          icon: 'Truck',
          permission: { action: 'view', resource: 'delivery' },
        },
      ],
    },
    {
      id: 'management',
      title: 'Materials & Finance',
      titleBn: 'মালামাল ও হিসাব',
      items: [
        {
          key: 'inventory',
          title: 'Materials & Rolls',
          titleBn: 'ইনভেন্টরি ও রুল',
          href: '/inventory',
          icon: 'Package',
          permission: { action: 'view', resource: 'inventory' },
        },
        {
          key: 'products',
          title: 'Products & Pricing',
          titleBn: 'পণ্য ও সেবা',
          href: '/products',
          icon: 'Layers',
          permission: { action: 'view', resource: 'inventory' },
        },
        {
          key: 'suppliers',
          title: 'Suppliers & Purchase',
          titleBn: 'সরবরাহকারী',
          href: '/suppliers',
          icon: 'Building2',
          permission: { action: 'view', resource: 'inventory' },
        },
        {
          key: 'accounting',
          title: 'Finance & Accounts',
          titleBn: 'হিসাব ও ক্যাশবুক',
          href: '/accounting',
          icon: 'Landmark',
          permission: { action: 'view', resource: 'payments' },
        },
        {
          key: 'costing',
          title: 'Cost & Profit',
          titleBn: 'খরচ ও লাভ',
          href: '/costing',
          icon: 'Calculator',
          permission: { action: 'view', resource: 'reports' },
        },
        {
          key: 'hr',
          title: 'Workforce & HRM',
          titleBn: 'কর্মী ও বেতন',
          href: '/hr',
          icon: 'Users2',
          permission: { action: 'view', resource: 'settings' },
        },
        {
          key: 'reports',
          title: 'Business Reports',
          titleBn: 'রিপোর্ট',
          href: '/reports',
          icon: 'BarChart3',
          permission: { action: 'view', resource: 'reports' },
        },
      ],
    },
    {
      id: 'settings',
      title: 'System & Settings',
      titleBn: 'সেটিংস ও প্রশাসন',
      items: [
        {
          key: 'company_settings',
          title: 'Company Settings',
          titleBn: 'কোম্পানি সেটিংস',
          href: '/settings',
          icon: 'Settings',
          permission: { action: 'view', resource: 'settings' },
        },
        {
          key: 'users',
          title: 'Users & Permissions',
          titleBn: 'ইউজার ও অনুমতি',
          href: '/settings/users',
          icon: 'ShieldCheck',
          permission: { action: 'manage', resource: 'settings' },
        },
        {
          key: 'branches',
          title: 'Factory Branches',
          titleBn: 'শাখা ও ব্রাঞ্চ',
          href: '/settings/branches',
          icon: 'Building',
          permission: { action: 'view', resource: 'branches' },
        },
        {
          key: 'tax',
          title: 'Tax & NBR VAT 6.3',
          titleBn: 'ট্যাক্স ও ভ্যাট',
          href: '/settings/tax',
          icon: 'FileCheck2',
          permission: { action: 'manage', resource: 'settings' },
        },
        {
          key: 'trash',
          title: 'Trash / Recycle Bin',
          titleBn: 'ট্র্যাশ ও রিসাইকেল বিন',
          href: '/trash',
          icon: 'Trash2',
          permission: { action: 'view', resource: 'settings' },
        },
      ],
    },
  ]
}
