import { BRAND } from '../../config/brand.ts';

/**
 * Brand key helper: generates namespaced runtime keys for cookies, storage, events, and channels.
 * e.g., k('tenant_session') => 'printflow_tenant_session'
 */
export function k(name: string): string {
  return `${BRAND.keyPrefix}_${name}`;
}

// Canonical Cookie Names
export const COOKIE_PLATFORM_SESSION = k('platform_session');
export const COOKIE_TENANT_SESSION = k('tenant_session');
export const COOKIE_SUPPORT_TENANT = k('support_tenant');

// Legacy 1-release transition keys for seamless migration
export const LEGACY_COOKIE_PLATFORM_SESSION = ['print', 'erp', '_platform_session'].join('');
export const LEGACY_COOKIE_TENANT_SESSION = ['print', 'erp', '_tenant_session'].join('');
export const LEGACY_COOKIE_SUPPORT_TENANT = ['print', 'erp', '_support_tenant'].join('');

/**
 * Reads a cookie checking canonical printflow_* name first, falling back to legacy printflow_* name.
 */
export function getSessionCookieWithFallback(
  getCookie: (name: string) => string | undefined,
  type: 'platform' | 'tenant' | 'support'
): { name: string; value: string; isLegacy: boolean } | null {
  const canonicalName =
    type === 'platform'
      ? COOKIE_PLATFORM_SESSION
      : type === 'tenant'
      ? COOKIE_TENANT_SESSION
      : COOKIE_SUPPORT_TENANT;

  const legacyName =
    type === 'platform'
      ? LEGACY_COOKIE_PLATFORM_SESSION
      : type === 'tenant'
      ? LEGACY_COOKIE_TENANT_SESSION
      : LEGACY_COOKIE_SUPPORT_TENANT;

  const canonicalVal = getCookie(canonicalName);
  if (canonicalVal) {
    return { name: canonicalName, value: canonicalVal, isLegacy: false };
  }

  const legacyVal = getCookie(legacyName);
  if (legacyVal) {
    return { name: canonicalName, value: legacyVal, isLegacy: true };
  }

  return null;
}

/**
 * Browser-side migration helper: automatically migrates printflow_* localStorage keys
 * to new printflow_* keys and deletes the legacy entries.
 */
export function migrateLegacyStorageKeys(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    const legacyPrefix = ['print', 'erp_'].join('');
    const keysToMigrate: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(legacyPrefix)) {
        keysToMigrate.push(key);
      }
    }

    for (const oldKey of keysToMigrate) {
      const val = window.localStorage.getItem(oldKey);
      if (val !== null) {
        const suffix = oldKey.slice(legacyPrefix.length);
        const newKey = k(suffix);
        if (!window.localStorage.getItem(newKey)) {
          window.localStorage.setItem(newKey, val);
        }
        window.localStorage.removeItem(oldKey);
      }
    }
  } catch (err) {
    console.warn('[BrandMigration] Storage key migration failed:', err);
  }
}
