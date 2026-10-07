import { describe, it } from 'node:test'
import assert from 'node:assert'
import { BRAND } from '../../config/brand.ts'
import { getTenantBaseUrl } from '../../lib/tenant/tenant-url.ts'

describe('Tenant Not Found & Suspended Navigation URL Resolution', () => {
  it('1. Resolves canonical root domain for production environment', () => {
    const rootBaseUrl = getTenantBaseUrl('', BRAND.rootDomain)
    assert.strictEqual(rootBaseUrl, 'https://printflow.bd')

    // Navigation URLs
    const registerUrl = `${rootBaseUrl}/register`
    const homeUrl = `${rootBaseUrl}/`
    const loginUrl = `${rootBaseUrl}/login`
    const contactUrl = `${rootBaseUrl}/contact`

    assert.strictEqual(registerUrl, 'https://printflow.bd/register')
    assert.strictEqual(homeUrl, 'https://printflow.bd/')
    assert.strictEqual(loginUrl, 'https://printflow.bd/login')
    assert.strictEqual(contactUrl, 'https://printflow.bd/contact')
  })

  it('2. Resolves localhost development root without retaining invalid tenant subdomain', () => {
    const rootBaseUrl = getTenantBaseUrl('', 'localhost:3000')
    assert.strictEqual(rootBaseUrl, 'http://localhost:3000')

    const registerUrl = `${rootBaseUrl}/register`
    const homeUrl = `${rootBaseUrl}/`
    const loginUrl = `${rootBaseUrl}/login`
    const contactUrl = `${rootBaseUrl}/contact`

    assert.strictEqual(registerUrl, 'http://localhost:3000/register')
    assert.strictEqual(homeUrl, 'http://localhost:3000/')
    assert.strictEqual(loginUrl, 'http://localhost:3000/login')
    assert.strictEqual(contactUrl, 'http://localhost:3000/contact')
  })
})
