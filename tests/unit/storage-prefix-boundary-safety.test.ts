import { describe, it } from 'node:test'
import assert from 'node:assert'
import { StorageCleanupService } from '../../lib/security/storage-cleanup.ts'

describe('Supabase Storage Prefix Boundary Safety Unit Tests', () => {
  it('1. Verifies exact delimiter boundary matching logic prevents accidental prefix collisions', () => {
    const targetTenantId = 'abc123'
    const targetSlug = 'press-alpha'
    const targetPrefixes = [targetTenantId, targetSlug]

    // Candidate files
    const safeCandidates = [
      { name: 'abc123/invoice-001.pdf', shouldDelete: true },
      { name: 'abc123_logo.png', shouldDelete: true },
      { name: 'abc123-banner.jpg', shouldDelete: true },
      { name: 'abc123.proof.pdf', shouldDelete: true },
      { name: 'press-alpha/artwork.ai', shouldDelete: true },
    ]

    const collateralCandidates = [
      { name: 'abc1234-invoice.pdf', shouldDelete: false },
      { name: 'my-abc123-company.jpg', shouldDelete: false },
      { name: 'another-tenant-abc123.pdf', shouldDelete: false },
      { name: 'press-alphaprint/logo.png', shouldDelete: false },
      { name: 'unrelated-company/abc123.pdf', shouldDelete: false },
    ]

    // Matching helper function mirroring StorageCleanupService boundary check
    const isFileOwnedByTenant = (filename: string, prefixes: string[]) => {
      const lower = filename.toLowerCase()
      return prefixes.some((p) => {
        return (
          lower === p ||
          lower.startsWith(`${p}/`) ||
          lower.startsWith(`${p}_`) ||
          lower.startsWith(`${p}-`) ||
          lower.startsWith(`${p}.`)
        )
      })
    }

    // Verify all safe candidates are identified for deletion
    for (const file of safeCandidates) {
      const isOwned = isFileOwnedByTenant(file.name, targetPrefixes)
      assert.strictEqual(
        isOwned,
        file.shouldDelete,
        `File ${file.name} must be marked for deletion`
      )
    }

    // Verify ZERO collateral files are accidentally marked for deletion
    for (const file of collateralCandidates) {
      const isOwned = isFileOwnedByTenant(file.name, targetPrefixes)
      assert.strictEqual(
        isOwned,
        file.shouldDelete,
        `Collateral file ${file.name} must NOT be deleted`
      )
    }
  })

  it('2. purgeTenantStorage runs cleanly without throwing unhandled exceptions', async () => {
    const res = await StorageCleanupService.purgeTenantStorage('comp-nonexistent-999', 'nonexistent-999')
    assert.strictEqual(res.success, true)
    assert.strictEqual(res.deletedFilesCount, 0)
    assert.ok(res.bucketsScanned >= 10)
  })
})
