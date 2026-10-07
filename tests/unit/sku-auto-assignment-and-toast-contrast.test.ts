import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { ProductRepository } from '../../lib/repositories/product.repository.ts'

describe('SKU Auto-Assignment and Toast Visibility Contrast', () => {
  it('auto-generates unique fallback SKU when SKU is empty for materials', async () => {
    const dummyCompanyId = 'comp-test-sku-001'
    const material = await ProductRepository.createProduct({
      company_id: dummyCompanyId,
      name: 'Eco-Solvent Frontlit Flex 340gsm',
      sku: '',
      unit: 'sft',
      entity_type: 'material',
      selling_price: 12,
    })

    assert.ok(material.sku, 'Material must have an assigned SKU')
    assert.match(material.sku, /^MAT-\d{5}$/, `Material SKU '${material.sku}' should start with MAT- followed by 5 digits`)
  })

  it('auto-generates unique fallback SKU when SKU is empty for services', async () => {
    const dummyCompanyId = 'comp-test-sku-002'
    const service = await ProductRepository.createProduct({
      company_id: dummyCompanyId,
      name: 'Large Format UV Printing',
      sku: '',
      unit: 'sft',
      entity_type: 'service',
      product_type: 'print_service',
      is_service: true,
      selling_price: 35,
    })

    assert.ok(service.sku, 'Service must have an assigned SKU')
    assert.match(service.sku, /^SRV-\d{5}$/, `Service SKU '${service.sku}' should start with SRV- followed by 5 digits`)
  })

  it('auto-generates unique fallback SKU when SKU is empty for outsource items', async () => {
    const dummyCompanyId = 'comp-test-sku-003'
    const outsource = await ProductRepository.createProduct({
      company_id: dummyCompanyId,
      name: 'Brochure Offset Printing 150gsm',
      sku: '',
      unit: 'pcs',
      entity_type: 'outsource',
      product_type: 'outsource',
      is_outsource: true,
      selling_price: 5,
    })

    assert.ok(outsource.sku, 'Outsource item must have an assigned SKU')
    assert.match(outsource.sku, /^OUT-\d{5}$/, `Outsource SKU '${outsource.sku}' should start with OUT- followed by 5 digits`)
  })

  it('preserves user-specified custom SKU when provided', async () => {
    const dummyCompanyId = 'comp-test-sku-004'
    const custom = await ProductRepository.createProduct({
      company_id: dummyCompanyId,
      name: 'Custom Acrylic Sheet 3mm',
      sku: 'ACR-3MM-CUSTOM',
      unit: 'sft',
      entity_type: 'material',
      selling_price: 55,
    })

    assert.strictEqual(custom.sku, 'ACR-3MM-CUSTOM', 'Custom SKU should be preserved')
  })

  it('preserves existing SKU when update is sent with empty SKU string', async () => {
    const dummyCompanyId = 'comp-test-sku-005'
    const initial = await ProductRepository.createProduct({
      company_id: dummyCompanyId,
      name: 'Rollup Banner Stand 2.5x6ft',
      sku: 'STAND-ROLLUP-01',
      unit: 'pcs',
      selling_price: 950,
    })

    assert.strictEqual(initial.sku, 'STAND-ROLLUP-01')

    const updated = await ProductRepository.updateProduct(
      initial.id,
      {
        name: 'Rollup Banner Stand Premium 2.5x6ft',
        sku: '   ', // Blank string submitted in form
      },
      dummyCompanyId
    )

    assert.strictEqual(updated.name, 'Rollup Banner Stand Premium 2.5x6ft')
    assert.strictEqual(updated.sku, 'STAND-ROLLUP-01', 'Existing SKU must not be erased when updating with blank SKU')
  })

  it('verifies toast notification component uses text-foreground without text-white on title', () => {
    const toastFilePath = path.join(process.cwd(), 'components/shared/toast-feedback.tsx')
    const toastContent = fs.readFileSync(toastFilePath, 'utf8')

    // Must NOT have text-white on title
    assert.ok(
      !toastContent.includes('text-white bangla-text truncate'),
      'toast-feedback.tsx should not use text-white on title'
    )

    // Must have text-foreground on title
    assert.ok(
      toastContent.includes('text-foreground bangla-text truncate'),
      'toast-feedback.tsx must use text-foreground for title contrast'
    )

    // Style map must use bg-card for proper light/dark mode contrast
    assert.ok(
      toastContent.includes("bg-card border-danger-border/60 text-foreground shadow-lg"),
      'toast-feedback.tsx error style must use bg-card and text-foreground'
    )
  })
})
