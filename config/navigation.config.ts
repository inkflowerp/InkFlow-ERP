import type { PermissionAction, PermissionModule } from '@/types/rbac.types'
import type { FeatureCode } from '@/types/subscription.types'

export interface NavItem {
  key: string
  title: string
  titleBn: string
  href: string
  icon: string
  exact?: boolean
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
  children?: NavItem[]
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
      title: '',
      titleBn: '',
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
          permission: { action: 'create', resource: 'orders' },
        },
        {
          key: 'dashboard',
          title: 'Dashboard',
          titleBn: 'ড্যাশবোর্ড',
          href: '/dashboard',
          icon: 'LayoutDashboard',
          exact: true,
          hasDividerBelow: true,
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
          titleBn: 'বিল ও জমা',
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
          key: 'orders',
          title: 'Orders & Job Flow',
          titleBn: 'কাজের অর্ডার',
          href: '/orders',
          icon: 'ShoppingBag',
          permission: { action: 'view', resource: 'orders' },
          hasDividerBelow: true,
        },
      ],
    },
    {
      id: 'work',
      title: '',
      titleBn: '',
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
          exact: true,
          permission: { action: 'view', resource: 'production' },
        },
        {
          key: 'operator',
          title: 'Shop Floor Terminal',
          titleBn: 'অপারেটর টার্মিনাল',
          href: '/operator',
          icon: 'Cpu',
          permission: { action: 'view', resource: 'production' },
        },
        {
          key: 'finishing',
          title: 'Finishing & Fabrications',
          titleBn: 'ফিনিশিং ও তৈরি',
          href: '/finishing',
          icon: 'Scissors',
          permission: { action: 'view', resource: 'production' },
        },
        {
          key: 'delivery',
          title: 'Delivery & Challan',
          titleBn: 'ডেলিভারি ও চালান',
          href: '/delivery',
          icon: 'Truck',
          permission: { action: 'view', resource: 'delivery' },
        },
        {
          key: 'floor_consumption',
          title: 'Floor Consumptions',
          titleBn: 'কাঁচামাল খরচ',
          href: '/production/floor-consumption',
          icon: 'Flame',
          permission: { action: 'view', resource: 'production' },
        },
        {
          key: 'machineries',
          title: 'Machineries & Fleet',
          titleBn: 'মেশিন ও যন্ত্রপাতি',
          href: '/production/machineries',
          icon: 'Cpu',
          permission: { action: 'view', resource: 'machineries' },
          hasDividerBelow: true,
        },
      ],
    },
    {
      id: 'management',
      title: '',
      titleBn: '',
      items: [
        {
          key: 'inventory',
          title: 'Materials & Rolls',
          titleBn: 'কাঁচামাল ও রোল',
          href: '/inventory',
          icon: 'Package',
          permission: { action: 'view', resource: 'inventory' },
        },
        {
          key: 'products',
          title: 'Products & Masters',
          titleBn: 'পণ্য ও সেবা',
          href: '/products',
          icon: 'Layers',
          permission: { action: 'view', resource: 'products' },
        },
        {
          key: 'pricing',
          title: 'Pricing & Estimator',
          titleBn: 'দর তালিকা ও ক্যালকুলেটর',
          href: '/pricing',
          icon: 'Calculator',
          permission: { action: 'view', resource: 'pricing' },
        },
        {
          key: 'suppliers',
          title: 'Suppliers & Purchase',
          titleBn: 'সরবরাহকারী ও মহাজন',
          href: '/suppliers',
          icon: 'Building2',
          permission: { action: 'view', resource: 'inventory' },
          hasDividerBelow: true,
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
          key: 'tax',
          title: 'Tax & VAT',
          titleBn: 'ট্যাক্স ও ভ্যাট',
          href: '/tax',
          icon: 'FileCheck2',
          permission: { action: 'manage', resource: 'settings' },
        },
        {
          key: 'reports',
          title: 'Business Reports',
          titleBn: 'রিপোর্ট ও হিসাব',
          href: '/reports',
          icon: 'BarChart3',
          permission: { action: 'view', resource: 'reports' },
          hasDividerBelow: true,
        },
        {
          key: 'hr',
          title: 'Workforce & HRM',
          titleBn: 'কর্মী ও বেতন',
          href: '/hr',
          icon: 'Users2',
          exact: true,
          permission: { action: 'view', resource: 'hr' },
          hasDividerBelow: true,
          children: [
            {
              key: 'hr_dashboard',
              title: 'HRM Command',
              titleBn: 'এইচআর ড্যাশবোর্ড',
              href: '/hr',
              icon: 'LayoutDashboard',
              exact: true,
              permission: { action: 'view', resource: 'hr' },
            },
            {
              key: 'hr_employees',
              title: 'Employee Directory',
              titleBn: 'কর্মীদের তালিকা',
              href: '/hr/employees',
              icon: 'Users',
              permission: { action: 'view', resource: 'hr' },
            },
            {
              key: 'hr_attendance',
              title: 'Floor Attendance & Punch',
              titleBn: 'হাজিরা ও পাঞ্চিং',
              href: '/hr/attendance',
              icon: 'UserCheck',
              permission: { action: 'view', resource: 'hr' },
            },
            {
              key: 'hr_payroll',
              title: 'Payroll & Salary Sheets',
              titleBn: 'পেরোল ও বেতন শিট',
              href: '/hr/payroll',
              icon: 'Wallet',
              permission: { action: 'view', resource: 'hr' },
            },
            {
              key: 'hr_salary_report',
              title: 'Salary & Payout Reports',
              titleBn: 'বেতন ও ব্যাংক রিপোর্ট',
              href: '/hr/salary-report',
              icon: 'FileSpreadsheet',
              permission: { action: 'view', resource: 'hr' },
            },
          ],
        },
      ],
    },
    {
      id: 'settings',
      title: '',
      titleBn: '',
      items: [
        {
          key: 'company_settings',
          title: 'Settings',
          titleBn: 'সেটিংস',
          href: '/settings',
          icon: 'Settings',
          exact: true,
          permission: { action: 'view', resource: 'settings' },
          hasDividerBelow: true,
          children: [
            {
              key: 'settings_overview',
              title: 'Overview',
              titleBn: 'মূল সেটিংস',
              href: '/settings',
              icon: 'LayoutDashboard',
              exact: true,
              permission: { action: 'view', resource: 'settings' },
            },
            {
              key: 'settings_company',
              title: 'Company Profile',
              titleBn: 'প্রতিষ্ঠান তথ্য',
              href: '/settings/company',
              icon: 'Building2',
              permission: { action: 'view', resource: 'settings' },
            },
            {
              key: 'settings_branding',
              title: 'Branding & Theme',
              titleBn: 'ব্র্যান্ডিং ও লোগো',
              href: '/settings/branding',
              icon: 'Palette',
              permission: { action: 'view', resource: 'settings' },
            },
            {
              key: 'settings_localization',
              title: 'Localization & Formats',
              titleBn: 'ভাষা ও মুদ্রা',
              href: '/settings/localization',
              icon: 'Globe2',
              permission: { action: 'view', resource: 'settings' },
            },
            {
              key: 'settings_numbering',
              title: 'Document Numbering',
              titleBn: 'ডকুমেন্ট নাম্বারিং',
              href: '/settings/document-numbering',
              icon: 'Hash',
              permission: { action: 'manage', resource: 'settings' },
            },
            {
              key: 'settings_templates',
              title: 'Document Templates',
              titleBn: 'ডকুমেন্ট টেমপ্লেট',
              href: '/settings/documents',
              icon: 'FileText',
              permission: { action: 'view', resource: 'settings' },
            },
            {
              key: 'settings_automations',
              title: 'Workflow Automations',
              titleBn: 'কাজের অটোমেশন',
              href: '/settings/automations',
              icon: 'Workflow',
              permission: { action: 'manage', resource: 'settings' },
            },
            {
              key: 'settings_branches',
              title: 'Branches & Hubs',
              titleBn: 'শাখা ও কারখানা',
              href: '/settings/branches',
              icon: 'Building',
              permission: { action: 'manage', resource: 'branches' },
              ownerOnly: true,
            },
            {
              key: 'settings_attendance',
              title: 'Attendance & QR',
              titleBn: 'হাজিরা ও কিউআর',
              href: '/settings/attendance',
              icon: 'QrCode',
              permission: { action: 'view', resource: 'settings' },
            },
            {
              key: 'settings_notifications',
              title: 'Notifications & SMS',
              titleBn: 'নোটিফিকেশন ও এসএমএস',
              href: '/settings/notifications',
              icon: 'Bell',
              permission: { action: 'manage', resource: 'settings' },
            },
            {
              key: 'settings_email',
              title: 'Email Gateway',
              titleBn: 'ইমেইল গেটওয়ে',
              href: '/settings/email',
              icon: 'Mail',
              permission: { action: 'manage', resource: 'settings' },
            },
            {
              key: 'settings_users',
              title: 'Team Users',
              titleBn: 'টিম সদস্য',
              href: '/settings/users',
              icon: 'Users',
              permission: { action: 'manage', resource: 'users' },
            },
            {
              key: 'settings_roles',
              title: 'Roles & Matrix',
              titleBn: 'অনুমতি সেটিংস',
              href: '/settings/roles',
              icon: 'ShieldCheck',
              permission: { action: 'manage', resource: 'users' },
            },
            {
              key: 'settings_subscription',
              title: 'Subscription & Plan',
              titleBn: 'সাবস্ক্রিপশন',
              href: '/settings/subscription',
              icon: 'Crown',
              permission: { action: 'manage', resource: 'settings' },
            },
          ],
        },
        {
          key: 'trash',
          title: 'Recycle Bin',
          titleBn: 'রিসাইকেল বিন',
          href: '/trash',
          icon: 'Trash2',
          permission: { action: 'view', resource: 'settings' },
        },
      ],
    },
  ]
}
