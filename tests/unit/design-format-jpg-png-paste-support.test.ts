import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { isRenderableFormat, getFormatBadgeColor } from '../../lib/formatters.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { DesignJobRecord, DesignVersionRecord, DesignFormat } from '../../types/design.types.ts'

describe('Graphic Design Studio - .JPG / .PNG Format Support & Clipboard Paste (Ctrl+V)', () => {
  const companyId = 'c-test-formats'

  beforeEach(() => {
    PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, [])
  })

  it('1. Correctly identifies .jpg, .jpeg, and .png as renderable formats', () => {
    assert.equal(isRenderableFormat('jpg'), true)
    assert.equal(isRenderableFormat('JPG'), true)
    assert.equal(isRenderableFormat('jpeg'), true)
    assert.equal(isRenderableFormat('JPEG'), true)
    assert.equal(isRenderableFormat('png'), true)
    assert.equal(isRenderableFormat('PNG'), true)
    assert.equal(isRenderableFormat('webp'), true)
  })

  it('2. Returns distinct, styled badge colors for png and jpg', () => {
    const pngColor = getFormatBadgeColor('png')
    const jpgColor = getFormatBadgeColor('jpg')
    const jpegColor = getFormatBadgeColor('jpeg')

    assert.ok(pngColor.includes('emerald'), 'PNG badge should use emerald styling')
    assert.ok(jpgColor.includes('blue'), 'JPG badge should use blue styling')
    assert.ok(jpegColor.includes('blue'), 'JPEG badge should use blue styling')
  })

  it('3. Can create and persist a design job with .png and .jpg proofs', () => {
    const dsnJob: DesignJobRecord = {
      id: 'dsn-fmt-1',
      company_id: companyId,
      design_number: 'DSN-8801',
      customer_id: 'cust-1',
      customer_name: 'Apex Footwear Ltd',
      title: 'Store Frontlit Banner',
      designer_name: 'Studio Designer',
      priority: 'urgent',
      status: 'customer_approval',
      dimensions_spec: '20ft × 4ft',
      current_version: 1,
      versions: [
        {
          id: 'dv-1',
          design_job_id: 'dsn-fmt-1',
          version_number: 1,
          version_label: 'Version 1',
          proof_file_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          proof_file_name: 'proof_banner_v1.png',
          file_format: 'png',
          change_notes: 'Initial artwork loaded via PNG format',
          uploaded_by_name: 'Studio Designer',
          is_approved: false,
          created_at: new Date().toISOString(),
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, dsnJob)

    const retrieved = PrintERPDataStore.get<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS) || []
    assert.equal(retrieved.length, 1)
    assert.equal(retrieved[0].versions?.[0].file_format, 'png')
    assert.ok(retrieved[0].versions?.[0].proof_file_url?.startsWith('data:image/png'))
  })

  it('4. Correctly creates and appends pasted clipboard image (Ctrl+V) as a new version', () => {
    const initialJob: DesignJobRecord = {
      id: 'dsn-paste-1',
      company_id: companyId,
      design_number: 'DSN-9902',
      customer_name: 'Square Pharmaceuticals',
      title: 'Backlit Signboard',
      status: 'designing',
      current_version: 1,
      versions: [
        {
          id: 'dv-1',
          design_job_id: 'dsn-paste-1',
          version_number: 1,
          version_label: 'Version 1 (Brief)',
          proof_file_url: 'https://example.com/initial_brief.png',
          proof_file_name: 'brief.png',
          file_format: 'png',
          uploaded_by_name: 'Sales Rep',
          is_approved: false,
          created_at: new Date().toISOString(),
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, initialJob)

    // Simulate pasted clipboard screenshot (Ctrl+V) resulting in a base64 Data URL and .jpg format
    const pastedDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...'
    const newVersionNum = 2
    const newVer: DesignVersionRecord = {
      id: `dv-${Date.now()}`,
      design_job_id: initialJob.id,
      version_number: newVersionNum,
      version_label: `Version ${newVersionNum}`,
      proof_file_url: pastedDataUrl,
      proof_file_name: `pasted_proof_dsn-9902_v${newVersionNum}.jpg`,
      source_file_name: `pasted_proof_dsn-9902_v${newVersionNum}.jpg`,
      file_format: 'jpg',
      change_notes: 'Pasted screenshot revision (Ctrl+V)',
      uploaded_by_name: 'Studio Designer',
      is_approved: false,
      created_at: 'Just now',
    }

    const updatedJob: DesignJobRecord = {
      ...initialJob,
      current_version: newVersionNum,
      versions: [...(initialJob.versions || []), newVer],
      status: 'customer_approval',
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, initialJob.id, updatedJob)

    const jobs = PrintERPDataStore.get<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS) || []
    const updated = jobs.find((j) => j.id === initialJob.id)

    assert.ok(updated)
    assert.equal(updated.current_version, 2)
    assert.equal(updated.versions?.length, 2)
    assert.equal(updated.versions[1].file_format, 'jpg')
    assert.equal(updated.versions[1].proof_file_url, pastedDataUrl)
    assert.equal(updated.status, 'customer_approval')
  })
})
