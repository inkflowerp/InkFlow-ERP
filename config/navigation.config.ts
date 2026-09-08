export interface NavItem {
  title: string
  titleBn: string
  href: string
  icon: string
  badge?: string
}

export interface NavSection {
  title: string
  titleBn: string
  items: NavItem[]
}

export function getNavigationConfig(tenantSlug: string): NavSection[] {
  return [
    {
      title: 'Main',
      titleBn: 'প্রধান',
      items: [
        {
          title: 'Dashboard',
          titleBn: 'ড্যাশবোর্ড',
          href: `/${tenantSlug}/dashboard`,
          icon: 'LayoutDashboard',
        },
        {
          title: 'Mobile Workshop',
          titleBn: 'মোবাইল হাব',
          href: `/${tenantSlug}/mobile`,
          icon: 'Smartphone',
          badge: 'PWA',
        },
      ],
    },
    {
      title: 'Commercial & Sales',
      titleBn: 'সেলস ও কোটেশন',
      items: [
        {
          title: 'Sales Dashboard',
          titleBn: 'সেলস ড্যাশবোর্ড',
          href: `/${tenantSlug}/sales`,
          icon: 'Briefcase',
        },
        {
          title: 'Pricing Estimator',
          titleBn: 'লাইভ দর নির্ধারণ',
          href: `/${tenantSlug}/pricing`,
          icon: 'Calculator',
        },
        {
          title: 'Products & Services',
          titleBn: 'পণ্য ও সেবা তালিকা',
          href: `/${tenantSlug}/products`,
          icon: 'Package',
        },
        {
          title: 'Quotations',
          titleBn: 'কোটেশন সমূহ',
          href: `/${tenantSlug}/quotations`,
          icon: 'FileSpreadsheet',
        },
        {
          title: 'Sales Orders',
          titleBn: 'সেলস অর্ডার সমূহ',
          href: `/${tenantSlug}/orders`,
          icon: 'Layers',
        },
        {
          title: 'Job Costing & Profit',
          titleBn: 'কস্টিং ও লাভ নিরীক্ষা',
          href: `/${tenantSlug}/costing`,
          icon: 'Calculator',
        },
        {
          title: 'Customers',
          titleBn: 'কাস্টমার তালিকা',
          href: `/${tenantSlug}/customers`,
          icon: 'Users',
        },
      ],
    },
    {
      title: 'Shop Floor & Production',
      titleBn: 'ফ্লোর ও প্রোডাকশন',
      items: [
        {
          title: 'Production Floor',
          titleBn: 'প্রোডাকশন ফ্লোর',
          href: `/${tenantSlug}/production`,
          icon: 'Printer',
          badge: 'Live',
        },
        {
          title: 'Pre-Press & Design',
          titleBn: 'ডিজাইন কিউ',
          href: `/${tenantSlug}/design`,
          icon: 'Palette',
        },
        {
          title: 'Operator Terminal',
          titleBn: 'অপারেটর টার্মিনাল',
          href: `/${tenantSlug}/operator`,
          icon: 'Printer',
        },
        {
          title: 'Inventory & Materials',
          titleBn: 'কাঁচামাল ও স্টক',
          href: `/${tenantSlug}/inventory`,
          icon: 'Package',
        },
        {
          title: 'Purchases & POs',
          titleBn: 'ক্রয় ও সরবরাহ অর্ডার',
          href: `/${tenantSlug}/purchases`,
          icon: 'ShoppingBag',
        },
        {
          title: 'Suppliers',
          titleBn: 'সাপ্লায়ার ও মহাজন',
          href: `/${tenantSlug}/suppliers`,
          icon: 'Truck',
        },
      ],
    },
    {
      title: 'Fulfillment & Accounts',
      titleBn: 'ডেলিভারি ও বিলিং',
      items: [
        {
          title: 'Delivery & Fitting',
          titleBn: 'ডেলিভারি ও ফিটিং',
          href: `/${tenantSlug}/delivery`,
          icon: 'Truck',
        },
        {
          title: 'Invoices & Billing',
          titleBn: 'ইনভয়েস ও বিলিং',
          href: `/${tenantSlug}/billing`,
          icon: 'Receipt',
        },
        {
          title: 'Expenses & Accounting',
          titleBn: 'খরচ ও ক্যাশ খাতা',
          href: `/${tenantSlug}/accounting`,
          icon: 'Wallet',
        },
        {
          title: 'Reports & Analytics',
          titleBn: 'রিপোর্ট ও অ্যানালিটিক্স',
          href: `/${tenantSlug}/reports`,
          icon: 'BarChart3',
        },
      ],
    },
    {
      title: 'Administration',
      titleBn: 'সেটিংস ও অ্যাডমিন',
      items: [
        {
          title: 'HR & Payroll',
          titleBn: 'এইচআর ও বেতন',
          href: `/${tenantSlug}/hr`,
          icon: 'Users2',
        },
        {
          title: 'Company Settings',
          titleBn: 'প্রতিষ্ঠান সেটিংস',
          href: `/${tenantSlug}/settings`,
          icon: 'Settings',
        },
        {
          title: 'VAT & Tax Settings',
          titleBn: 'ভ্যাট ও কর সেটিংস',
          href: `/${tenantSlug}/settings/tax`,
          icon: 'Landmark',
        },
        {
          title: 'Document Studio',
          titleBn: 'ডকুমেন্ট টেমপ্লেট',
          href: `/${tenantSlug}/settings/documents`,
          icon: 'FileText',
        },
        {
          title: 'Subscription & Plan',
          titleBn: 'সাবস্ক্রিপশন ও বিলিং',
          href: `/${tenantSlug}/settings/subscription`,
          icon: 'Crown',
        },
        {
          title: 'Communications & Alerts',
          titleBn: 'মেসেজিং ও নোটিফিকেশন',
          href: `/${tenantSlug}/communications`,
          icon: 'MessageSquare',
        },
        {
          title: 'Workflow Automation',
          titleBn: 'ওয়ার্কফ্লো অটোমেশন',
          href: `/${tenantSlug}/settings/automations`,
          icon: 'Workflow',
          badge: 'Auto',
        },
        {
          title: 'Team Members',
          titleBn: 'টিম মেম্বার',
          href: `/${tenantSlug}/settings/users`,
          icon: 'Users',
        },
        {
          title: 'Roles & Matrix',
          titleBn: 'অনুমতি ম্যাট্রিক্স',
          href: `/${tenantSlug}/settings/roles`,
          icon: 'ShieldCheck',
        },
      ],
    },
  ]
}
