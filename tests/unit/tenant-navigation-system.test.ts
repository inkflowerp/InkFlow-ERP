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
  const sampleSlug = 'inkflow-demo'
  const navSections = getNavigationConfig(sampleSlug)

  it('1. Navigation configuration has exactly 4 streamlined business hierarchy sections', () => {
    assert.equal(navSections.length, 4, 'Must have exactly 4 sections: TODAY, WORK, MANAGEMENT, SETTINGS')
    const sectionIds = navSections.map((s) => s.id)
    assert.deepEqual(sectionIds, ['today', 'work', 'management', 'settings'])

    // Verify inventory, suppliers, and pricing are positioned immediately below products in today section
    const todayItems = navSections.find((s) => s.id === 'today')!.items.map((i) => i.key)
    const productsIndex = todayItems.indexOf('products')
    const inventoryIndex = todayItems.indexOf('inventory')
    const suppliersIndex = todayItems.indexOf('suppliers')
    const pricingIndex = todayItems.indexOf('pricing')

    assert.ok(productsIndex !== -1, 'products must exist in today section')
    assert.equal(inventoryIndex, productsIndex + 1, 'inventory must immediately follow products')
    assert.equal(suppliersIndex, productsIndex + 2, 'suppliers must immediately follow inventory')
    assert.equal(pricingIndex, productsIndex + 3, 'pricing must immediately follow suppliers')

    const pricingItem = navSections.find((s) => s.id === 'today')!.items.find((i) => i.key === 'pricing')
    assert.equal(pricingItem?.hasDividerBelow, true, 'pricing item must have hasDividerBelow flag set to true')
  })

  it('2. Every navigation section and item has complete English and Bengali titles', () => {
    for (const section of navSections) {
      assert.ok(section.title && section.title.trim().length > 0, `Section ${section.id} must have an English title`)
      assert.ok(section.titleBn && section.titleBn.trim().length > 0, `Section ${section.id} must have a Bengali title`)
      assert.ok(section.items.length > 0, `Section ${section.id} must contain navigation items`)

      for (const item of section.items) {
        assert.ok(item.key && item.key.trim().length > 0, `Item in ${section.id} must have a key`)
        assert.ok(item.title && item.title.trim().length > 0, `Item ${item.key} must have an English title`)
        assert.ok(item.titleBn && item.titleBn.trim().length > 0, `Item ${item.key} must have a Bengali title`)
        assert.ok(item.href && item.href.startsWith(`/${sampleSlug}`), `Item ${item.key} href must be scoped to tenantSlug`)
        assert.ok(item.icon && item.icon.trim().length > 0, `Item ${item.key} must have an icon string`)
      }
    }
  })

  it('3. Route Audit: All navigation item hrefs correspond to existing application routes', () => {
    const appDir = path.resolve(process.cwd(), 'app', '[tenantSlug]')

    for (const section of navSections) {
      for (const item of section.items) {
        // Strip the tenant prefix: /sampleSlug/sales -> sales
        const relativeRoute = item.href.replace(`/${sampleSlug}`, '').replace(/^\//, '')
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
      return Boolean(matrix[mod]?.[item.permission.action])
    }

    // A. Business Owner: full access to all items
    const allItems = navSections.flatMap((s) => s.items)
    for (const item of allItems) {
      assert.equal(isAllowedForRole(item, 'business_owner'), true, `Owner must have access to ${item.key}`)
    }

    // B. Sales Manager: can access customers, sales, billing, but not settings/roles
    const salesAllowed = allItems.filter((i) => isAllowedForRole(i, 'sales_manager')).map((i) => i.key)
    assert.ok(salesAllowed.includes('customers'), 'Sales Manager must see Customers')
    assert.ok(salesAllowed.includes('sales'), 'Sales Manager must see Sales & Quotes')
    assert.ok(salesAllowed.includes('billing'), 'Sales Manager must see Invoices & Payments')
    assert.ok(!salesAllowed.includes('users'), 'Sales Manager cannot see Users & Permissions')

    // C. Designer: can access design Kanban and work orders
    const designerAllowed = allItems.filter((i) => isAllowedForRole(i, 'designer')).map((i) => i.key)
    assert.ok(designerAllowed.includes('design'), 'Designer must see Design')
    assert.ok(!designerAllowed.includes('accounting'), 'Designer cannot see Finance')

    // D. Operator: can access operator terminal and production
    const operatorAllowed = allItems.filter((i) => isAllowedForRole(i, 'operator')).map((i) => i.key)
    assert.ok(operatorAllowed.includes('operator'), 'Operator must see My Work terminal')
    assert.ok(operatorAllowed.includes('production'), 'Operator must see Production')
    assert.ok(!operatorAllowed.includes('accounting'), 'Operator cannot see Finance')
    assert.ok(!operatorAllowed.includes('reports'), 'Operator cannot see Reports')

    // E. Store Manager: can access inventory and suppliers (with purchases unified inside inventory workspace)
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
})
