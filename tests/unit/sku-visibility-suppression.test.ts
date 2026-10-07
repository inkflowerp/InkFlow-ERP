import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { isUserSku } from '../../lib/units.ts'

describe('SKU Visibility Suppression When Not User-Added', () => {
  it('correctly identifies auto-generated and empty SKUs as non-user SKUs', () => {
    // Null / Undefined / Empty
    assert.strictEqual(isUserSku(null), false)
    assert.strictEqual(isUserSku(undefined), false)
    assert.strictEqual(isUserSku(''), false)
    assert.strictEqual(isUserSku('   '), false)
    assert.strictEqual(isUserSku('null'), false)
    assert.strictEqual(isUserSku('undefined'), false)

    // Auto-generated Ready Product SKUs (Screenshot 1: X-Stand PRD-58939)
    assert.strictEqual(isUserSku('PRD-58939'), false)
    assert.strictEqual(isUserSku('prd-58939'), false)
    assert.strictEqual(isUserSku('PRD-12345'), false)

    // Auto-generated Material SKUs (Screenshot 2 & 3: PVC MAT-43991)
    assert.strictEqual(isUserSku('MAT-43991'), false)
    assert.strictEqual(isUserSku('mat-43991'), false)
    assert.strictEqual(isUserSku('MAT-10000'), false)

    // Auto-generated Service & Outsource SKUs
    assert.strictEqual(isUserSku('SRV-12345'), false)
    assert.strictEqual(isUserSku('OUT-98765'), false)
    assert.strictEqual(isUserSku('RM-54321'), false)
    assert.strictEqual(isUserSku('RP-11223'), false)

    // Auto prefixes
    assert.strictEqual(isUserSku('AUTO-998877'), false)
    assert.strictEqual(isUserSku('auto-test-123'), false)
  })

  it('correctly identifies user-provided custom SKUs as user SKUs', () => {
    assert.strictEqual(isUserSku('ACR-3MM-CUSTOM'), true)
    assert.strictEqual(isUserSku('STAND-ROLLUP-01'), true)
    assert.strictEqual(isUserSku('X-STAND-REG'), true)
    assert.strictEqual(isUserSku('VINYL-GLOSS-01'), true)
    assert.strictEqual(isUserSku('BANNER-280'), true)
    assert.strictEqual(isUserSku('FLEX-STAR-340'), true)
    assert.strictEqual(isUserSku('MAT-ACRYLIC-WHITE'), true) // Letters after prefix, not pure random digits
    assert.strictEqual(isUserSku('PRD-XSTAND-PRO'), true)
  })

  it('verifies receive-stock-modal suppresses auto SKU in registered material master dropdown', () => {
    const filePath = path.join(process.cwd(), 'components/inventory/receive-stock-modal.tsx')
    const content = fs.readFileSync(filePath, 'utf8')

    // Must import isUserSku
    assert.ok(content.includes('isUserSku'), 'receive-stock-modal.tsx must import isUserSku')

    // Dropdown option must conditionally render SKU
    assert.ok(
      content.includes('{m.name}{isUserSku(m.sku) ? ` [SKU: ${m.sku}]` : \'\'}'),
      'receive-stock-modal.tsx must only render [SKU: ...] if isUserSku is true'
    )
  })

  it('verifies inventory page suppresses auto SKU in table rows and master rolls', () => {
    const filePath = path.join(process.cwd(), 'app/[tenantSlug]/inventory/page.tsx')
    const content = fs.readFileSync(filePath, 'utf8')

    assert.ok(content.includes('isUserSku(row.sku)'), 'inventory page must guard row.sku with isUserSku')
    assert.ok(content.includes('isUserSku(p.sku)'), 'inventory page must guard ready product p.sku with isUserSku')
    assert.ok(content.includes('isUserSku(group.sku)'), 'inventory page must guard group.sku with isUserSku')
  })

  it('verifies product catalog page suppresses auto SKU across item rows', () => {
    const filePath = path.join(process.cwd(), 'app/[tenantSlug]/products/page.tsx')
    const content = fs.readFileSync(filePath, 'utf8')

    assert.ok(
      content.includes('{isUserSku(item.sku) ? `${item.sku} • ` : \'\'}{item.category || \'printing\'}'),
      'products page must conditionally render sku prefix for printing services'
    )
    assert.ok(
      content.includes('{isUserSku(item.sku) ? `${item.sku} • ` : \'\'}{item.category || \'hardware\'}'),
      'products page must conditionally render sku prefix for hardware items'
    )
  })

  it('verifies product modal forms do not prefill auto SKU when editing', () => {
    const readyModalPath = path.join(process.cwd(), 'components/products/ready-product-modal.tsx')
    const matModalPath = path.join(process.cwd(), 'components/products/material-config-modal.tsx')
    const srvModalPath = path.join(process.cwd(), 'components/products/service-config-modal.tsx')
    const outModalPath = path.join(process.cwd(), 'components/products/outsource-product-modal.tsx')

    assert.ok(fs.readFileSync(readyModalPath, 'utf8').includes('isUserSku(initialData.sku) ? initialData.sku : \'\''))
    assert.ok(fs.readFileSync(matModalPath, 'utf8').includes('isUserSku(initialData.sku) ? initialData.sku : \'\''))
    assert.ok(fs.readFileSync(srvModalPath, 'utf8').includes('isUserSku(initialData.sku) ? initialData.sku : \'\''))
    assert.ok(fs.readFileSync(outModalPath, 'utf8').includes('isUserSku(initialData.sku) ? initialData.sku : \'\''))
  })
})
