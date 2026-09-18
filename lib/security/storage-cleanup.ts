// ==============================================================================
// PrintERP SaaS - Supabase Storage Permanent Deletion & Cleanup Service
// Purges all tenant-owned storage assets across all storage buckets
// ==============================================================================

import { createAdminClient } from '../supabase/admin.ts'

export interface StorageCleanupResult {
  success: boolean
  deletedFilesCount: number
  bucketsScanned: number
  error?: string
}

export const KNOWN_STORAGE_BUCKETS = [
  'customer-artworks',
  'prepress-proofs',
  'invoices',
  'quotations',
  'delivery-proofs',
  'employee-documents',
  'company-assets',
  'company-logos',
  'receipts',
  'attachments',
] as const

export class StorageCleanupService {
  /**
   * Permanently purges all storage files associated with a tenant across all buckets.
   */
  static async purgeTenantStorage(
    companyId: string,
    companySlug?: string
  ): Promise<StorageCleanupResult> {
    try {
      const admin = createAdminClient()
      // Use exact companyId and companySlug only (strictly prevent substring collisions)
      const targetPrefixes = Array.from(
        new Set(
          [companyId, companySlug]
            .filter((s): s is string => Boolean(s && s.trim().length >= 3))
            .map((s) => s.toLowerCase().trim())
        )
      )

      let bucketsToScan = [...KNOWN_STORAGE_BUCKETS]
      try {
        const { data: remoteBuckets } = await (admin as any).storage.listBuckets()
        if (remoteBuckets && Array.isArray(remoteBuckets)) {
          const names = remoteBuckets.map((b: any) => b.id || b.name).filter(Boolean)
          bucketsToScan = Array.from(new Set([...bucketsToScan, ...names]))
        }
      } catch {
        // Fallback to known buckets if listBuckets fails or is offline
      }

      let deletedCount = 0

      for (const bucketName of bucketsToScan) {
        try {
          const bucket = (admin as any).storage.from(bucketName)
          if (!bucket) continue

          // Scan root and prefix folders for each target prefix
          for (const prefix of targetPrefixes) {
            try {
              const { data: folderFiles } = await bucket.list(prefix, { limit: 1000 })
              if (folderFiles && folderFiles.length > 0) {
                const pathsToRemove = folderFiles.map((f: any) => `${prefix}/${f.name}`)
                const { error: removeErr } = await bucket.remove(pathsToRemove)
                if (!removeErr) {
                  deletedCount += pathsToRemove.length
                }
              }
            } catch {}
          }

          // Also check root folder for files directly prefixed with tenant ID with strict delimiter boundary
          try {
            const { data: rootFiles } = await bucket.list('', { limit: 1000 })
            if (rootFiles && rootFiles.length > 0) {
              const matchingRootFiles = rootFiles
                .filter((f: any) =>
                  targetPrefixes.some((p) => {
                    const lowerName = (f.name || '').toLowerCase()
                    return (
                      lowerName === p ||
                      lowerName.startsWith(`${p}/`) ||
                      lowerName.startsWith(`${p}_`) ||
                      lowerName.startsWith(`${p}-`) ||
                      lowerName.startsWith(`${p}.`)
                    )
                  })
                )
                .map((f: any) => f.name)

              if (matchingRootFiles.length > 0) {
                const { error: removeErr } = await bucket.remove(matchingRootFiles)
                if (!removeErr) {
                  deletedCount += matchingRootFiles.length
                }
              }
            }
          } catch {}
        } catch {
          // Continue scanning next bucket
        }
      }

      return {
        success: true,
        deletedFilesCount: deletedCount,
        bucketsScanned: bucketsToScan.length,
      }
    } catch (err: any) {
      return {
        success: false,
        deletedFilesCount: 0,
        bucketsScanned: 0,
        error: err?.message || 'Storage cleanup encountered an error',
      }
    }
  }

  /**
   * Purges all files across all buckets during platform purge
   */
  static async purgeAllStorage(): Promise<StorageCleanupResult> {
    try {
      const admin = createAdminClient()
      let bucketsToScan = [...KNOWN_STORAGE_BUCKETS]
      try {
        const { data: remoteBuckets } = await (admin as any).storage.listBuckets()
        if (remoteBuckets && Array.isArray(remoteBuckets)) {
          const names = remoteBuckets.map((b: any) => b.id || b.name).filter(Boolean)
          bucketsToScan = Array.from(new Set([...bucketsToScan, ...names]))
        }
      } catch {}

      let deletedCount = 0
      for (const bucketName of bucketsToScan) {
        try {
          const bucket = (admin as any).storage.from(bucketName)
          if (!bucket) continue
          const { data: files } = await bucket.list('', { limit: 1000 })
          if (files && files.length > 0) {
            const paths = files.map((f: any) => f.name)
            const { error: removeErr } = await bucket.remove(paths)
            if (!removeErr) {
              deletedCount += paths.length
            }
          }
        } catch {}
      }

      return {
        success: true,
        deletedFilesCount: deletedCount,
        bucketsScanned: bucketsToScan.length,
      }
    } catch (err: any) {
      return {
        success: false,
        deletedFilesCount: 0,
        bucketsScanned: 0,
        error: err?.message || 'Failed to purge all storage',
      }
    }
  }
}
