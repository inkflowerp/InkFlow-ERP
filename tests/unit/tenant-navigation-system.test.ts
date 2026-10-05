import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { getNavigationConfig, type NavItem, type NavSection } from '../../config/navigation.config.ts'
import {
  DEFAULT_RESPONSIBILITY_MATRICES,
  normalizeResponsibilitySlug,
  normalizeModuleKey,
} from '../../lib/auth/rbac.client.ts'
import type { PermissionAction, PermissionModule, ResponsibilitySlug } from '../../types/rbac.types.ts'

describe('Tenant Sidebar & Navigation Architecture Tests', () => {
  const sampleSlug = 'printflow-demo'
  const navSections = getNavigationConfig(sampleSlug)

  it('1. Navigation configuration has streamlined business hierarchy sections', () => {
    assert.equal(navSections.length, 6, 'Must have 6 sections: TODAY, WORK, RESOURCES, SPECIALIZED, MANAGEMENT, SETTINGS')
    const sectionIds = navSections.map((s) => s.id)
    assert.deepEqual(sectionIds, ['today', 'work', 'resources', 'specialized', 'management', 'settings'])

    // Section 1: Commercial & Sales
    const todaySection = navSections.find((s) => s.id === 'today')!
    assert.ok(todaySection, 'Today section must exist')
    const todayItems = todaySection.items.map((i) => i.key)
    assert.deepEqual(todayItems, ['new-work', 'dashboard', 'quotations', 'billing', 'customers', 'orders'])

    // Section 2: Factory & Floor (Work)
    const workSection = navSections.find((s) => s.id === 'work')!
    assert.ok(workSection, 'Work section must exist')
    const workItems = workSection.items.map((i) => i.key)
    assert.deepEqual(workItems, ['design', 'production', 'finishing', 'delivery'])

    // Section 3: Resources
    const resourcesSection = navSections.find((s) => s.id === 'resources')!
    assert.ok(resourcesSection, 'Resources section must exist')
    const resourceItems = resourcesSection.items.map((i) => i.key)
    assert.deepEqual(resourceItems, ['floor_consumption', 'machineries'])

    // Section 4: Specialized
    const specializedSection = navSections.find((s) => s.id === 'specialized')!
    assert.ok(specializedSection, 'Specialized section must exist')
    const specializedItems = specializedSection.items.map((i) => i.key)
    assert.deepEqual(specializedItems, ['operator'])

    // Section 5: Materials & Finance (Management)
    const mgmtSection = navSections.find((s) => s.id === 'management')!
    assert.ok(mgmtSection, 'Management section must exist')
    const mgmtItems = mgmtSection.items.map((i) => i.key)
    assert.deepEqual(mgmtItems, ['inventory', 'products', 'pricing', 'suppliers', 'accounting', 'costing', 'tax', 'reports', 'hr'])

    // Section 6: System & Settings
    const settingsSection = navSections.find((s) => s.id === 'settings')!
    assert.ok(settingsSection, 'Settings section must exist')
    const settingsItems = settingsSection.items.map((i) => i.key)
    assert.deepEqual(settingsItems, ['company_settings', 'trash'])

    // Divider boundaries
    const dividerItems = navSections.flatMap((s) => s.items).filter((i) => i.hasDividerBelow).map((i) => i.key)
    assert.deepEqual(dividerItems, ['dashboard', 'orders', 'delivery', 'machineries', 'operator', 'suppliers', 'reports', 'hr', 'company_settings'])
  })

  it('2. Every navigation section and item has complete English and Bengali titles', () => {
    for (const section of navSections) {
      assert.ok(section.id, `Section must have an id`)
      assert.ok(section.items.length > 0, `Section ${section.id} must contain navigation items`)

      for (const item of section.items) {
        assert.ok(item.key && item.key.trim().length > 0, `Item in ${section.id} must have a key`)
        assert.ok(item.title && item.title.trim().length > 0, `Item ${item.key} must have an English title`)
        assert.ok(item.titleBn && item.titleBn.trim().length > 0, `Item ${item.key} must have a Bengali title`)
        assert.ok(item.href && item.href.startsWith('/'), `Item ${item.key} href must be a clean relative path`)
        assert.ok(item.icon && item.icon.trim().length > 0, `Item ${item.key} must have an icon string`)
      }
    }
  })

  it('3. Route Audit: All navigation item hrefs correspond to existing application routes', () => {
    const appDir = path.resolve(process.cwd(), 'app', '[tenantSlug]')

    for (const section of navSections) {
      for (const item of section.items) {
        // Strip the leading slash: /sales -> sales
        const relativeRoute = item.href.replace(/^\//, '')
        const targetPath = relativeRoute ? path.join(appDir, relativeRoute) : appDir

        // Check if page.tsx exists at target directory or file
        const existsAsDir = fs.existsSync(targetPath) && fs.existsSync(path.join(targetPath, 'page.tsx'))
        const existsAsFile = fs.existsSync(`${targetPath}.tsx`) || fs.existsSync(`${targetPath}/page.tsx`)

        assert.ok(
          existsAsDir || existsAsFile,
          `Route target for [${item.title}] (${item.href}) does not exist on disk at: ${targetPath}`
        )
      }
    }
  })

  it('4. Unified Navigation: Simple Mode and Advanced Mode flags are completely absent', () => {
    const allItems: NavItem[] = navSections.flatMap((s) => s.items)
    
    // Ensure no items have simpleMode or mode-specific difficulty levels
    for (const item of allItems) {
      assert.equal(
        (item as unknown as Record<string, unknown>).simpleMode,
        undefined,
        `Item [${item.key}] should not have simpleMode property`
      )
      assert.equal(
        (item as unknown as Record<string, unknown>).level,
        undefined,
        `Item [${item.key}] should not have level property`
      )
    }

    // New Work must be flagged as primary action with exact label "New Work" (no "+" in label)
    const newWorkItem = allItems.find((i) => i.key === 'new-work')
    assert.ok(newWorkItem, 'Must contain New Work item')
    assert.equal(newWorkItem?.isPrimaryAction, true, 'New Work must be flagged as isPrimaryAction')
    assert.equal(newWorkItem?.title, 'New Work', 'New Work title must be exactly "New Work"')
    assert.equal(newWorkItem?.titleBn, 'নতুন কাজ', 'New Work titleBn must be "নতুন কাজ"')
    assert.ok(!newWorkItem?.title.includes('+'), 'New Work title must not contain "+" symbol')
  })

  it('5. Permission Integrity: Module permissions resolve correctly for each employee responsibility', () => {
    function isAllowedForRole(item: NavItem, role: ResponsibilitySlug): boolean {
      if (role === 'business_owner') return true
      if (item.ownerOnly) return false
      if (!item.permission) return true

      const matrix = DEFAULT_RESPONSIBILITY_MATRICES[role]
      if (!matrix) return false

      const mod = normalizeModuleKey(item.permission.resource) as PermissionModule
      const modPerms = matrix[mod] as Record<string, boolean> | undefined
      return Boolean(modPerms?.[item.permission.action])
    }

    // A. Business Owner: full access to all items
    const allItems = navSections.flatMap((s) => s.items)
    for (const item of allItems) {
      assert.equal(isAllowedForRole(item, 'business_owner'), true, `Owner must have access to ${item.key}`)
    }

    // B. Sales Manager: can access customers, quotations, orders, billing, but not settings/roles
    const salesAllowed = allItems.filter((i) => isAllowedForRole(i, 'sales_manager')).map((i) => i.key)
    assert.ok(salesAllowed.includes('customers'), 'Sales Manager must see Customers')
    assert.ok(salesAllowed.includes('quotations'), 'Sales Manager must see Quotations')
    assert.ok(salesAllowed.includes('orders'), 'Sales Manager must see Orders')
    assert.ok(salesAllowed.includes('billing'), 'Sales Manager must see Invoices & Payments')
    assert.ok(!salesAllowed.includes('users'), 'Sales Manager cannot see Users & Permissions')

    // C. Designer: can access design Kanban
    const designerAllowed = allItems.filter((i) => isAllowedForRole(i, 'designer')).map((i) => i.key)
    assert.ok(designerAllowed.includes('design'), 'Designer must see Design')
    assert.ok(!designerAllowed.includes('accounting'), 'Designer cannot see Finance')

    // D. Operator: can access operator terminal and production
    const operatorAllowed = allItems.filter((i) => isAllowedForRole(i, 'operator')).map((i) => i.key)
    assert.ok(operatorAllowed.includes('operator'), 'Operator must see My Work terminal')
    assert.ok(operatorAllowed.includes('production'), 'Operator must see Production')
    assert.ok(!operatorAllowed.includes('accounting'), 'Operator cannot see Finance')
    assert.ok(!operatorAllowed.includes('reports'), 'Operator cannot see Reports')

    // E. Store Manager: can access inventory and suppliers
    const storeAllowed = allItems.filter((i) => isAllowedForRole(i, 'store_manager')).map((i) => i.key)
    assert.ok(storeAllowed.includes('inventory'), 'Store Manager must see Inventory')
    assert.ok(storeAllowed.includes('suppliers'), 'Store Manager must see Suppliers')

    // F. Accountant: can access billing and finance/accounting
    const accountantAllowed = allItems.filter((i) => isAllowedForRole(i, 'accountant')).map((i) => i.key)
    assert.ok(accountantAllowed.includes('billing'), 'Accountant must see Invoices & Payments')
    assert.ok(accountantAllowed.includes('accounting'), 'Accountant must see Finance')
    assert.ok(accountantAllowed.includes('reports'), 'Accountant must see Reports')
  })

  it('6. Icon Mapping Integrity: All icons in navigation config exist in standard Lucide icon set', () => {
    const validIcons = [
      'LayoutDashboard',
      'Printer',
      'Plus',
      'Bell',
      'Users',
      'Briefcase',
      'Receipt',
      'Palette',
      'Truck',
      'Package',
      'ShoppingBag',
      'Building2',
      'Building',
      'BarChart3',
      'Calculator',
      'Landmark',
      'Wallet',
      'UserCheck',
      'Users2',
      'Cpu',
      'ShieldCheck',
      'Workflow',
      'FileCheck2',
      'FileText',
      'FileSpreadsheet',
      'Settings',
      'Layers',
      'Disc',
      'Tag',
      'Trash2',
      'Scissors',
      'Flame',
    ]

    for (const section of navSections) {
      for (const item of section.items) {
        assert.ok(
          validIcons.includes(item.icon),
          `Navigation item [${item.key}] uses icon '${item.icon}' which is not in the recognized Lucide icon map`
        )
      }
    }
  })

  it('7. Settings Sub-Modules: Company settings contains all 14 submodules with verified physical routes', () => {
    const settingsSection = navSections.find((s) => s.id === 'settings')!
    const companySettingsItem = settingsSection.items.find((i) => i.key === 'company_settings')!
    assert.ok(companySettingsItem, 'company_settings must exist')
    assert.ok(companySettingsItem.children, 'company_settings must have children')
    assert.equal(companySettingsItem.children!.length, 14, 'Must contain all 14 settings sub-modules')

    const appDir = path.resolve(process.cwd(), 'app', '[tenantSlug]')

    for (const sub of companySettingsItem.children!) {
      assert.ok(sub.key, 'Submodule must have key')
      assert.ok(sub.title, 'Submodule must have English title')
      assert.ok(sub.titleBn, 'Submodule must have Bengali title')
      assert.ok(sub.href.startsWith('/settings'), `Submodule ${sub.key} href must start with /settings`)

      const relativeRoute = sub.href.replace(/^\//, '')
      const targetPath = path.join(appDir, relativeRoute)
      const existsAsDir = fs.existsSync(targetPath) && fs.existsSync(path.join(targetPath, 'page.tsx'))
      const existsAsFile = fs.existsSync(`${targetPath}.tsx`) || fs.existsSync(`${targetPath}/page.tsx`)

      assert.ok(existsAsDir || existsAsFile, `Target route ${sub.href} must exist at ${targetPath}`)
    }
  })

  it('8. HRM Sub-Modules: Workforce & HRM contains all 6 submodules with verified physical routes', () => {
    const mgmtSection = navSections.find((s) => s.id === 'management')!
    const hrItem = mgmtSection.items.find((i) => i.key === 'hr')!
    assert.ok(hrItem, 'hr item must exist')
    assert.ok(hrItem.children, 'hr must have children')
    assert.equal(hrItem.children!.length, 6, 'Must contain all 6 HRM sub-modules')

    const appDir = path.resolve(process.cwd(), 'app', '[tenantSlug]')

    for (const sub of hrItem.children!) {
      assert.ok(sub.key, 'Submodule must have key')
      assert.ok(sub.title, 'Submodule must have English title')
      assert.ok(sub.titleBn, 'Submodule must have Bengali title')
      assert.ok(sub.href.startsWith('/hr'), `Submodule ${sub.key} href must start with /hr`)

      const relativeRoute = sub.href.replace(/^\//, '')
      const targetPath = path.join(appDir, relativeRoute)
      const existsAsDir = fs.existsSync(targetPath) && fs.existsSync(path.join(targetPath, 'page.tsx'))
      const existsAsFile = fs.existsSync(`${targetPath}.tsx`) || fs.existsSync(`${targetPath}/page.tsx`)

      assert.ok(existsAsDir || existsAsFile, `Target route ${sub.href} must exist at ${targetPath}`)
    }
  })
})

