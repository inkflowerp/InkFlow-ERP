export interface NavItem {
  title: string
  titleBn: string
  href: string
  icon: string
  badge?: string
  level?: 1 | 2 | 3 | 4
}

export interface NavSection {
  title: string
  titleBn: string
  level: 1 | 2 | 3 | 4
  items: NavItem[]
}

export function getNavigationConfig(tenantSlug: string): NavSection[] {
  return [
    {
      title: 'Level 1 — Daily (আজকের কাজ)',
      titleBn: 'দৈনন্দিন কাজ',
      level: 1,
      items: [
        {
          title: "Today's Work & Home",
          titleBn: 'আজকের কাজ ও হোম',
          href: `/${tenantSlug}/dashboard`,
          icon: 'LayoutDashboard',
        },
        {
          title: 'My Work (Operator Terminal)',
          titleBn: 'আমার কাজ (টার্মিনাল)',
          href: `/${tenantSlug}/operator`,
          icon: 'Printer',
          badge: 'Live',
        },
        {
          title: '+ New Work Order',
          titleBn: '+ নতুন কাজ এন্ট্রি',
          href: `/${tenantSlug}/sales/new-work`,
          icon: 'Plus',
          badge: 'Fast',
        },
        {
          title: 'Communications & Chat',
          titleBn: 'মেসেজ ও লাইভ চ্যাট',
          href: `/${tenantSlug}/communications`,
          icon: 'MessageSquare',
        },
      ],
    },
    {
      title: 'Level 2 — Business Operations',
      titleBn: 'ব্যবসা ও পরিচালনা',
      level: 2,
      items: [
        {
          title: 'Customers & CRM',
          titleBn: 'কাস্টমার ও বাকি হিসাব',
          href: `/${tenantSlug}/customers`,
          icon: 'Users',
        },
        {
          title: 'Sales & Quotations',
          titleBn: 'সেলস ও কোটেশন',
          href: `/${tenantSlug}/sales`,
          icon: 'Briefcase',
        },
        {
          title: 'Invoices & Billing',
          titleBn: 'ইনভয়েস ও বিলিং',
          href: `/${tenantSlug}/billing`,
          icon: 'Receipt',
        },
        {
          title: 'Production Floor',
          titleBn: 'প্রোডাকশন ফ্লোর',
          href: `/${tenantSlug}/production`,
          icon: 'Printer',
        },
        {
          title: 'Inventory & Materials',
          titleBn: 'কাঁচামাল ও স্টক',
          href: `/${tenantSlug}/inventory`,
          icon: 'Package',
        },
        {
          title: 'Delivery & Challans',
          titleBn: 'ডেলিভারি ও চালান',
          href: `/${tenantSlug}/delivery`,
          icon: 'Truck',
        },
      ],
    },
    {
      title: 'Level 3 — Management & Costing',
      titleBn: 'ব্যবস্থাপনা ও কস্টিং',
      level: 3,
      items: [
        {
          title: 'Reports & Analytics',
          titleBn: 'রিপোর্ট ও অ্যানালিটিক্স',
          href: `/${tenantSlug}/reports`,
          icon: 'BarChart3',
        },
        {
          title: 'Branches & Transfers',
          titleBn: 'ব্রাঞ্চ ও স্টক ট্রান্সফার',
          href: `/${tenantSlug}/settings/branches`,
          icon: 'Building',
        },
        {
          title: 'Machineries & Equipment',
          titleBn: 'মেশিনারিজ ও ইকুইপমেন্ট',
          href: `/${tenantSlug}/production/machineries`,
          icon: 'Cpu',
        },
        {
          title: 'Workforce & Attendance',
          titleBn: 'কর্মী ও হাজিরা',
          href: `/${tenantSlug}/attendance`,
          icon: 'UserCheck',
        },
        {
          title: 'Purchasing & Suppliers',
          titleBn: 'ক্রয় ও সরবরাহকারী',
          href: `/${tenantSlug}/purchases`,
          icon: 'ShoppingBag',
        },
        {
          title: 'Job Costing & Profit',
          titleBn: 'কস্টিং ও লাভ নিরীক্ষা',
          href: `/${tenantSlug}/costing`,
          icon: 'Calculator',
        },
        {
          title: 'Finance & Bank Accounts',
          titleBn: 'ফাইন্যান্স ও ব্যাংক',
          href: `/${tenantSlug}/accounting`,
          icon: 'Landmark',
        },
      ],
    },
    {
      title: 'Level 4 — Administration & Config',
      titleBn: 'প্রশাসন ও সিস্টেম',
      level: 4,
      items: [
        {
          title: 'Permissions & Roles',
          titleBn: 'পারমিশন ও রোল',
          href: `/${tenantSlug}/settings/permissions`,
          icon: 'ShieldCheck',
        },
        {
          title: 'Workflow Automation',
          titleBn: 'ওয়ার্কফ্লো অটোমেশন',
          href: `/${tenantSlug}/automations`,
          icon: 'Workflow',
        },
        {
          title: 'VAT & Tax Rules',
          titleBn: 'ভ্যাট ও ট্যাক্স সেটিংস',
          href: `/${tenantSlug}/settings/tax`,
          icon: 'Receipt',
        },
        {
          title: 'Audit Logs & Security',
          titleBn: 'অডিট লগ ও নিরাপত্তা',
          href: `/${tenantSlug}/audit`,
          icon: 'FileText',
        },
        {
          title: 'Company Settings',
          titleBn: 'প্রতিষ্ঠান সেটিংস',
          href: `/${tenantSlug}/settings`,
          icon: 'Settings',
        },
      ],
    },
  ]
}
