import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DOCUMENT_TYPE_TABS,
  DEFAULT_PADDING_CONFIG,
  DEFAULT_TEMPLATE_SETTINGS,
  type DocumentTypeKey,
} from '../../types/document-template.types.ts'
import { getNavigationConfig } from '../../config/navigation.config.ts'
import fs from 'node:fs'
import path from 'node:path'

describe('Document Templates Settings & Navigation Tests', () => {
  it('1. Verifies all 5 document types are defined with codes and labels', () => {
    assert.equal(DOCUMENT_TYPE_TABS.length, 5)
    const keys = DOCUMENT_TYPE_TABS.map((t) => t.key)
    assert.deepEqual(keys, [
      'quotation',
      'invoice',
      'challan',
      'receipt',
      'purchase_order',
    ])

    const quotation = DOCUMENT_TYPE_TABS.find((t) => t.key === 'quotation')
    assert.equal(quotation?.labelEn, 'Quotation')
    assert.equal(quotation?.docCodePrefix, 'QT-2026-001')

    const invoice = DOCUMENT_TYPE_TABS.find((t) => t.key === 'invoice')
    assert.equal(invoice?.labelEn, 'Invoice')
    assert.equal(invoice?.docCodePrefix, 'INV-2026-001')
  })

  it('2. Verifies default template configurations exist for all 5 document types', () => {
    const requiredTypes: DocumentTypeKey[] = [
      'quotation',
      'invoice',
      'challan',
      'receipt',
      'purchase_order',
    ]

    for (const type of requiredTypes) {
      const config = DEFAULT_TEMPLATE_SETTINGS[type]
      assert.ok(config, `Missing config for ${type}`)
      assert.equal(config.page_size, 'a4')
      assert.equal(config.orientation, 'portrait')
      assert.equal(config.use_letterhead, true)
      assert.equal(config.letterhead_mode, 'full_page')
      assert.equal(config.repeat_letterhead, 'every_page')
      assert.equal(config.padding_top, 42)
      assert.equal(config.padding_right, 10)
      assert.equal(config.padding_bottom, 25)
      assert.equal(config.padding_left, 10)
      assert.equal(config.item_display_mode, 'detailed')
      assert.ok(config.terms_and_conditions.length > 0)
    }
  })

  it('3. Verifies default content padding safe area configuration', () => {
    assert.equal(DEFAULT_PADDING_CONFIG.top, 42)
    assert.equal(DEFAULT_PADDING_CONFIG.right, 10)
    assert.equal(DEFAULT_PADDING_CONFIG.bottom, 25)
    assert.equal(DEFAULT_PADDING_CONFIG.left, 10)
  })

  it('4. Verifies Navigation Config contains Settings -> Documents -> Document Templates', () => {
    const sections = getNavigationConfig('sample-tenant')
    const settingsSection = sections.find((s) => s.id === 'settings')
    assert.ok(settingsSection, 'Settings section must exist')

    const settingsMenu = settingsSection.items.find(
      (item) => item.key === 'company_settings'
    )
    assert.ok(settingsMenu, 'company_settings parent menu must exist')

    const docsItem = settingsMenu.children?.find(
      (item) => item.key === 'settings_documents'
    )
    assert.ok(docsItem, 'settings_documents item must exist in settings section')
    assert.equal(docsItem.title, 'Documents')
    assert.equal(docsItem.href, '/settings/document-templates')

    assert.ok(docsItem.children && docsItem.children.length > 0, 'Must have children')
    const templateChild = docsItem.children.find(
      (c) => c.key === 'settings_document_templates'
    )
    assert.ok(templateChild, 'Document Templates child item must exist')
    assert.equal(templateChild.title, 'Document Templates')
    assert.equal(templateChild.href, '/settings/document-templates')
  })

  it('5. Verifies SETTINGS_11_GROUPS hub contains document-templates with aliases', () => {
    const hubShellPath = path.resolve(process.cwd(), 'components/settings/settings-hub-shell.tsx')
    const content = fs.readFileSync(hubShellPath, 'utf-8')
    assert.ok(
      content.includes("id: 'documents'"),
      'documents group must exist in SETTINGS_11_GROUPS'
    )
    assert.ok(
      content.includes("href: '/settings/document-templates'"),
      'href must point to /settings/document-templates'
    )
    assert.ok(
      content.includes("aliases: ['/settings/documents']"),
      'aliases must include /settings/documents'
    )
    assert.ok(
      content.includes("titleEn: 'Document Templates'"),
      'titleEn must be Document Templates'
    )
  })
})
