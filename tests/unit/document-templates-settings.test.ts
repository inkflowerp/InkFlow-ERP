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

  it('6. Verifies PrintLetterheadArt enforces right alignment, single line, and dynamic business info', () => {
    const artPath = path.resolve(
      process.cwd(),
      'components/settings/document-template/print-letterhead-art.tsx'
    )
    const content = fs.readFileSync(artPath, 'utf-8')

    // Right-aligned and single line invariants
    assert.ok(content.includes('items-end text-right'), 'Must align right')
    assert.ok(content.includes('whitespace-nowrap'), 'Must prevent wrapping into 2 lines')
    assert.ok(content.includes('justify-end'), 'Bengali bar must align to right')

    // Dynamic business info props
    assert.ok(content.includes('companyName'), 'Must support companyName prop')
    assert.ok(content.includes('companyLogoUrl'), 'Must support companyLogoUrl prop')
    assert.ok(content.includes('address'), 'Must support address prop')
    assert.ok(content.includes('phone'), 'Must support phone prop')
    assert.ok(content.includes('email'), 'Must support email prop')
    assert.ok(content.includes('website'), 'Must support website prop')
  })

  it('7. Verifies LiveA4Preview synchronizes all 5 document types dynamically', () => {
    const previewPath = path.resolve(
      process.cwd(),
      'components/settings/document-template/print-a4-preview.tsx'
    )
    const content = fs.readFileSync(previewPath, 'utf-8')

    assert.ok(content.includes("'TAX INVOICE'"), 'Must contain TAX INVOICE header')
    assert.ok(content.includes("'DELIVERY CHALLAN'"), 'Must contain DELIVERY CHALLAN header')
    assert.ok(content.includes("'MONEY RECEIPT'"), 'Must contain MONEY RECEIPT header')
    assert.ok(content.includes("'PURCHASE ORDER'"), 'Must contain PURCHASE ORDER header')
    assert.ok(content.includes("'QUOTATION'"), 'Must contain QUOTATION header')

    assert.ok(content.includes('companyName={companyName}'), 'Must pass companyName')
    assert.ok(content.includes('address={companyAddress}'), 'Must pass companyAddress')
    assert.ok(content.includes('phone={companyPhone}'), 'Must pass companyPhone')
    assert.ok(content.includes('email={companyEmail}'), 'Must pass companyEmail')
    assert.ok(content.includes('website={companyWebsite}'), 'Must pass companyWebsite')
  })

  it('8. Verifies storage service and hook support fallback key and cross-tab synchronization', () => {
    const servicePath = path.resolve(
      process.cwd(),
      'lib/services/document-template.service.ts'
    )
    const serviceContent = fs.readFileSync(servicePath, 'utf-8')
    assert.ok(
      serviceContent.includes("getTemplateStorageKey('default')"),
      'Must support default fallback key'
    )
    assert.ok(
      serviceContent.includes('printflow_template_updated'),
      'Must dispatch update event'
    )

    const hookPath = path.resolve(process.cwd(), 'hooks/use-document-template.ts')
    const hookContent = fs.readFileSync(hookPath, 'utf-8')
    assert.ok(
      hookContent.includes("window.addEventListener('storage'"),
      'Hook must listen to cross-tab storage events'
    )
  })

  it('9. Verifies LiveA4Preview print isolation and guideline suppression', () => {
    const previewPath = path.resolve(
      process.cwd(),
      'components/settings/document-template/print-a4-preview.tsx'
    )
    const content = fs.readFileSync(previewPath, 'utf-8')

    assert.ok(
      content.includes('data-print-isolate="true"'),
      'Must contain data-print-isolate="true" for globals.css print isolation'
    )
    assert.ok(
      content.includes('data-print-sheet="true"'),
      'Must contain data-print-sheet="true" for exact A4 print dimensions'
    )
    assert.ok(
      content.includes('border-dashed border-[#38BDF8] pointer-events-none rounded-xs print:hidden'),
      'Safe area dashed guideline must have print:hidden'
    )
    assert.ok(
      content.includes('print:transform-none'),
      'Zoom container must reset transform on print'
    )
  })

  it('10. Verifies DocumentTemplateDesigner integrates Print PDF, Vector Modal, and Download PDF', () => {
    const designerPath = path.resolve(
      process.cwd(),
      'components/settings/document-template/document-template-designer.tsx'
    )
    const content = fs.readFileSync(designerPath, 'utf-8')

    assert.ok(
      content.includes('PdfViewerModal'),
      'Must integrate PdfViewerModal for vector preview'
    )
    assert.ok(
      content.includes('downloadPdf'),
      'Must integrate downloadPdf for direct file download'
    )
    assert.ok(
      content.includes('handlePrintPdf'),
      'Must implement handlePrintPdf for isolated browser print'
    )
    assert.ok(
      content.includes('handleDownloadPdf'),
      'Must implement handleDownloadPdf'
    )
    assert.ok(
      content.includes('Print PDF'),
      'Header actions must include Print PDF button'
    )
    assert.ok(
      content.includes('Download PDF'),
      'Header actions must include Download PDF button'
    )
  })
})
