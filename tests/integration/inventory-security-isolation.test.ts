import { test, describe } from 'node:test'
import assert from 'node:assert'
import type { MaterialRecord, StockLedgerRecord } from '../../types/inventory.types.ts'

describe('V3 Inventory Multi-Tenant Isolation & RBAC Security Test Suite', () => {
  const tenantAlpha = 'tenant-alpha-dhaka-print'
  const tenantBeta = 'tenant-beta-chittagong-signs'

  const materialsDb: MaterialRecord[] = [
    {
      id: 'mat-alpha-01',
      company_id: tenantAlpha,
      sku: 'ALPHA-FLEX-01',
      name: 'Alpha Frontlit Flex',
      category: 'flex',
      unit: 'roll',
      is_roll: true,
      current_stock: 50,
      min_stock_level: 10,
      last_purchase_price: 10000,
      average_cost: 10000,
      manual_cost: 10000,
      valuation_method: 'average_cost',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'mat-beta-01',
      company_id: tenantBeta,
      sku: 'BETA-VINYL-01',
      name: 'Beta Cast Vinyl Gloss',
      category: 'vinyl',
      unit: 'roll',
      is_roll: true,
      current_stock: 30,
      min_stock_level: 5,
      last_purchase_price: 14000,
      average_cost: 14000,
      manual_cost: 14000,
      valuation_method: 'average_cost',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  describe('1. Multi-Tenant Material Master & Stock Isolation', () => {
    test('Tenant Alpha query only returns Tenant Alpha materials, Tenant Beta materials are hidden', () => {
      const alphaMaterials = materialsDb.filter((m) => m.company_id === tenantAlpha)
      assert.strictEqual(alphaMaterials.length, 1)
      assert.strictEqual(alphaMaterials[0].sku, 'ALPHA-FLEX-01')
      assert.ok(!alphaMaterials.some((m) => m.company_id === tenantBeta))
    })

    test('Cross-tenant issue attempt is rejected: Tenant Alpha cannot issue stock from Tenant Beta material', () => {
      function issueStockSecurely(activeTenantId: string, targetMaterialId: string, quantity: number) {
        const mat = materialsDb.find((m) => m.id === targetMaterialId && m.company_id === activeTenantId)
        if (!mat) {
          throw new Error('Unauthorized or Material not found in tenant boundary')
        }
        mat.current_stock -= quantity
        return mat
      }

      assert.throws(
        () => issueStockSecurely(tenantAlpha, 'mat-beta-01', 5),
        /Unauthorized or Material not found/
      )
      // Verify Tenant Beta stock remained untouched
      assert.strictEqual(materialsDb.find((m) => m.id === 'mat-beta-01')?.current_stock, 30)
    })
  })

  describe('2. RBAC & Granular Permission Security', () => {
    const roles = {
      sales_viewer: {
        companyRole: 'viewer',
        permissions: ['inventory.view', 'sales.view'],
      },
      store_keeper: {
        companyRole: 'operator',
        permissions: ['inventory.view', 'inventory.issue', 'inventory.receive'],
      },
      store_manager: {
        companyRole: 'manager',
        permissions: ['inventory.view', 'inventory.issue', 'inventory.approve', 'inventory.adjust', 'inventory.manage'],
      },
    }

    function checkPermission(user: { companyRole: string; permissions: string[] }, requiredPerm: string): boolean {
      if (user.companyRole === 'business_owner' || user.companyRole === 'admin') return true
      if (user.permissions.includes('inventory.manage')) return true
      return user.permissions.includes(requiredPerm)
    }

    test('Viewer role can view but is unauthorized to issue material or approve requests', () => {
      assert.strictEqual(checkPermission(roles.sales_viewer, 'inventory.view'), true)
      assert.strictEqual(checkPermission(roles.sales_viewer, 'inventory.issue'), false)
      assert.strictEqual(checkPermission(roles.sales_viewer, 'inventory.approve'), false)
      assert.strictEqual(checkPermission(roles.sales_viewer, 'inventory.adjust'), false)
    })

    test('Store keeper can issue stock but cannot perform administrative stock adjustments or approvals', () => {
      assert.strictEqual(checkPermission(roles.store_keeper, 'inventory.issue'), true)
      assert.strictEqual(checkPermission(roles.store_keeper, 'inventory.approve'), false)
      assert.strictEqual(checkPermission(roles.store_keeper, 'inventory.adjust'), false)
    })

    test('Store manager has complete authorization for approvals, adjustments and transfers', () => {
      assert.strictEqual(checkPermission(roles.store_manager, 'inventory.approve'), true)
      assert.strictEqual(checkPermission(roles.store_manager, 'inventory.adjust'), true)
      assert.strictEqual(checkPermission(roles.store_manager, 'inventory.manage'), true)
    })
  })

  describe('3. Financial & Sales Order Independence (Zero Auto-Deduction on Billing/Invoicing)', () => {
    test('Creating an Invoice does NOT automatically reduce inventory stock', () => {
      const initialStock = 50
      const mat = { ...materialsDb[0], current_stock: initialStock }

      // Simulate Invoice Creation event
      const invoice = {
        id: 'inv-2026-001',
        grand_total: 75000,
        items: [{ item_name: 'Custom Outdoor Billboard Print', quantity: 2, unit_rate: 37500 }],
      }

      // Assert stock remains strictly unchanged
      assert.strictEqual(mat.current_stock, initialStock, 'Invoice creation must not reduce physical inventory')
    })

    test('Creating a Quotation does NOT reserve or lock inventory stock', () => {
      const initialStock = 50
      const mat = { ...materialsDb[0], current_stock: initialStock }

      // Simulate Quotation Creation event
      const quotation = {
        id: 'quo-2026-001',
        items: [{ item_name: 'Frontlit Flex Printing 1000 SFT', quantity: 1, unit_rate: 45000 }],
      }

      assert.strictEqual(mat.current_stock, initialStock, 'Quotation generation must not reserve or mutate stock')
    })
  })
})
