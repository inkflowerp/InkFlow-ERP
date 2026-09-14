// ==============================================================================
// InkFlow ERP - Local Cache Security & Multi-Branch Boundary Enforcer (V9)
// Tenant & Branch Scoped Local Storage Partitioner, Cache Clearing on Switch & Logout
// ==============================================================================

export class LocalCacheSecurityManager {
  /**
   * Generates a tenant- and branch-isolated cache key
   */
  static getBranchScopedKey(
    companyId: string,
    branchId: string,
    keyName: string
  ): string {
    return `printerp_offline_${companyId}_${branchId}_${keyName}`
  }

  /**
   * Securely purges cached data on logout, tenant switch, or branch switch
   */
  static clearSensitiveLocalData(
    targetTenantSlug?: string,
    targetBranchId?: string
  ): void {
    if (typeof window === 'undefined') return

    try {
      const keysToRemove: string[] = []

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key) continue

        if (targetBranchId && targetTenantSlug) {
          // Purge specific branch of tenant
          if (
            key.includes(`_${targetTenantSlug}_${targetBranchId}_`) ||
            key.includes(`__${targetTenantSlug}__${targetBranchId}`)
          ) {
            keysToRemove.push(key)
          }
        } else if (targetTenantSlug) {
          // Purge specific tenant
          if (
            key.includes(`__${targetTenantSlug}`) ||
            key.includes(`_${targetTenantSlug}`) ||
            key === `inkflow_client_outbox_${targetTenantSlug}`
          ) {
            keysToRemove.push(key)
          }
        } else {
          // Purge all tenant & branch data (e.g. global logout)
          if (
            key.startsWith('printerp_tenant_') ||
            key.startsWith('printerp_offline_') ||
            key.startsWith('inkflow_client_outbox') ||
            key.startsWith('inkflow_drafts') ||
            key.includes('__')
          ) {
            keysToRemove.push(key)
          }
        }
      }

      for (const k of keysToRemove) {
        localStorage.removeItem(k)
      }

      // Notify window of cache purge
      window.dispatchEvent(
        new CustomEvent('inkflow_tenant_cache_purged', {
          detail: {
            tenantSlug: targetTenantSlug || 'ALL',
            branchId: targetBranchId || 'ALL',
            timestamp: Date.now(),
          },
        })
      )
    } catch (err) {
      console.error('[LocalCacheSecurity] Error purging local storage:', err)
    }
  }

  /**
   * Specifically purges branch-scoped caches when user switches branches
   */
  static clearBranchScopedData(companyId: string, branchId: string): void {
    if (typeof window === 'undefined') return

    try {
      const keysToRemove: string[] = []
      const prefix = `printerp_offline_${companyId}_${branchId}_`

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key)
        }
      }

      for (const k of keysToRemove) {
        localStorage.removeItem(k)
      }

      window.dispatchEvent(
        new CustomEvent('inkflow_branch_cache_purged', {
          detail: { companyId, branchId, timestamp: Date.now() },
        })
      )
    } catch (err) {
      console.error('[LocalCacheSecurity] Error purging branch cache:', err)
    }
  }

  /**
   * Validates that no cross-tenant or unauthorized branch data is present in storage
   */
  static validateTenantCacheIsolation(activeTenantSlug: string): {
    isIsolated: boolean
    alienKeysFound: string[]
  } {
    if (typeof window === 'undefined') {
      return { isIsolated: true, alienKeysFound: [] }
    }

    const alienKeys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue

      if (key.includes('__')) {
        const parts = key.split('__')
        const keySlug = parts[1]
        if (keySlug && keySlug !== activeTenantSlug && keySlug !== 'default') {
          alienKeys.push(key)
        }
      }
    }

    return {
      isIsolated: alienKeys.length === 0,
      alienKeysFound: alienKeys,
    }
  }
}

