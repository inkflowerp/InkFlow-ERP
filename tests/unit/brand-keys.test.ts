import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BRAND } from '../../config/brand.ts';
import {
  k,
  COOKIE_PLATFORM_SESSION,
  COOKIE_TENANT_SESSION,
  COOKIE_SUPPORT_TENANT,
  LEGACY_COOKIE_PLATFORM_SESSION,
  LEGACY_COOKIE_TENANT_SESSION,
  LEGACY_COOKIE_SUPPORT_TENANT,
  getSessionCookieWithFallback,
  migrateLegacyStorageKeys,
} from '../../lib/brand/keys.ts';

describe('Brand Constants & Key Helpers', () => {
  it('has authoritative brand constants', () => {
    assert.equal(BRAND.name, 'PrintFlow');
    assert.equal(BRAND.nameBn, 'প্রিন্টফ্লো');
    assert.equal(BRAND.rootDomain, 'printflow.bd');
    assert.equal(BRAND.helplineDisplay, '+880 1973-811114');
    assert.equal(BRAND.helplineE164, '+8801973811114');
    assert.equal(BRAND.whatsappUrl, 'https://wa.me/8801973811114');
    assert.equal(BRAND.keyPrefix, 'printflow');
  });

  it('prefixes runtime keys with printflow_', () => {
    assert.equal(k('test_key'), 'printflow_test_key');
    assert.equal(COOKIE_PLATFORM_SESSION, 'printflow_platform_session');
    assert.equal(COOKIE_TENANT_SESSION, 'printflow_tenant_session');
    assert.equal(COOKIE_SUPPORT_TENANT, 'printflow_support_tenant');
  });

  it('resolves session cookie with legacy fallback', () => {
    const mockStoreCanonical = (name: string) => {
      if (name === COOKIE_TENANT_SESSION) return 'token-canonical-123';
      return undefined;
    };

    const resCanonical = getSessionCookieWithFallback(mockStoreCanonical, 'tenant');
    assert.ok(resCanonical);
    assert.equal(resCanonical.name, COOKIE_TENANT_SESSION);
    assert.equal(resCanonical.value, 'token-canonical-123');
    assert.equal(resCanonical.isLegacy, false);

    const mockStoreLegacy = (name: string) => {
      if (name === LEGACY_COOKIE_TENANT_SESSION) return 'token-legacy-456';
      return undefined;
    };

    const resLegacy = getSessionCookieWithFallback(mockStoreLegacy, 'tenant');
    assert.ok(resLegacy);
    assert.equal(resLegacy.name, COOKIE_TENANT_SESSION);
    assert.equal(resLegacy.value, 'token-legacy-456');
    assert.equal(resLegacy.isLegacy, true);
  });

  it('migrates localStorage legacy keys cleanly', () => {
    const storageMap = new Map<string, string>();
    storageMap.set('printerp_locale', 'bn');
    storageMap.set('printerp_table_synced', 'true');
    storageMap.set('other_key', 'keep_me');

    const fakeLocalStorage = {
      getItem: (key: string) => storageMap.get(key) ?? null,
      setItem: (key: string, val: string) => storageMap.set(key, val),
      removeItem: (key: string) => storageMap.delete(key),
      key: (idx: number) => Array.from(storageMap.keys())[idx] ?? null,
      get length() {
        return storageMap.size;
      },
    };

    const originalWindow = globalThis.window;
    // @ts-expect-error Mocking window for node environment
    globalThis.window = { localStorage: fakeLocalStorage };

    try {
      migrateLegacyStorageKeys();
      assert.equal(storageMap.get('printflow_locale'), 'bn');
      assert.equal(storageMap.get('printflow_table_synced'), 'true');
      assert.equal(storageMap.has('printerp_locale'), false);
      assert.equal(storageMap.has('printerp_table_synced'), false);
      assert.equal(storageMap.get('other_key'), 'keep_me');
    } finally {
      // @ts-expect-error Reset window
      globalThis.window = originalWindow;
    }
  });
});
