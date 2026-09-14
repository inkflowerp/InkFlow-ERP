// ==============================================================================
// InkFlow ERP - Local Cache Security & Cross-Tenant Boundary Enforcer (V8)
// Tenant-Scoped Local Storage Partitioner, Cache Clearing on Logout & Tenant Switch
// ==============================================================================

export class LocalCacheSecurityManager {
  /**
   * Securely purges all cached tenant data, drafts, and outbox queues on logout or tenant switch
   */
  static clearSensitiveLocalData(targetTenantSlug?: string): void {
    if (typeof window === 'undefined') return

    try {
      const keysToRemove: string[] = []

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key) continue

        if (targetTenantSlug) {
          // Purge specific tenant
          if (
            key.includes(`__${targetTenantSlug}`) ||
            key.includes(`_${targetTenantSlug}`) ||
            key === `inkflow_client_outbox_${targetTenantSlug}`
          ) {
            keysToRemove.push(key)
          }
        } else {
          // Purge all tenant data (e.g. global logout)
          if (
            key.startsWith('printerp_tenant_') ||
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

      // Clear session storage as well
      sessionStorage.clear()

      // Notify window of cache purge
      window.dispatchEvent(
        new CustomEvent('inkflow_tenant_cache_purged', {
          detail: { tenantSlug: targetTenantSlug || 'ALL', timestamp: Date.now() },
        })
      )
    } catch (err) {
      console.error('[LocalCacheSecurity] Error purging local storage:', err)
    }
  }

  /**
   * Validates that no cross-tenant data from other tenants is present in storage
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
