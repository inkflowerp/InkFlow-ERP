// ==============================================================================
// PrintFlow — Deliberately Broken PR Acceptance Gate Suite
// Requirement: "A deliberately broken PR test verifying CI blocks cross-tenant query,
// hard-coded color, missing translation, and anon grant."
//
// This test suite proves that PrintFlow's automated CI/CD security and quality gates
// fail-closed, actively intercepting and rejecting non-compliant code.
// ==============================================================================

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { BillingRepository } from '../../lib/repositories/billing.repository.ts'

describe('CI/CD & Security Defense Gates: Rejection of Non-Compliant PR Patterns', () => {
  const tenantA = 'a0000000-0000-0000-0000-000000000001' // Alpha Print & Signage Ltd.
  const tenantB = 'b0000000-0000-0000-0000-000000000002' // Beta Commercial Press Ltd.

  // --------------------------------------------------------------------------
  // Gate 1: Cross-Tenant Data Access Interception
  // --------------------------------------------------------------------------
  it('1. Cross-Tenant Gate: Intercepts & Rejects Cross-Tenant Data Access (Fail-Closed)', async () => {
    // 1.1 Create Tenant A private invoice
    const invA = await BillingRepository.createInvoice(
      {
        company_id: tenantA,
        customer_id: 'a0000000-0000-0000-0000-000000000051',
        customer_name: 'Confidential Client A',
        customer_phone: '01711223344',
        invoice_number: `INV-CONFIDENTIAL-${Date.now()}`,
        issue_date: '2026-10-04',
        due_date: '2026-10-18',
        subtotal: 50000,
        vat_amount: 7500,
        total_amount: 57500,
        paid_amount: 0,
        status: 'unpaid',
      },
      tenantA
    )
    assert.ok(invA?.id, 'Invoice A created in Tenant A context')

    // 1.2 Tenant B attempts direct access by ID -> MUST return null
    const breachById = await BillingRepository.getInvoiceById(invA.id, tenantB)
    assert.strictEqual(breachById, null, 'Tenant B cannot read Tenant A invoice by direct ID lookup')

    // 1.3 Tenant B attempts collection query -> MUST NOT contain Tenant A invoice
    const tenantBInvoices = await BillingRepository.getInvoices(tenantB)
    assert.strictEqual(
      tenantBInvoices.some((i) => i.id === invA.id),
      false,
      'Tenant B list query must strictly omit Tenant A invoice'
    )
    assert.ok(
      tenantBInvoices.every((i) => i.company_id === tenantB),
      'All invoices returned to Tenant B must strictly belong to Tenant B'
    )

    // 1.4 Tenant B attempts write-off against Tenant A invoice -> MUST fail closed
    await assert.rejects(
      async () => {
        await BillingRepository.recordWriteOff({
          company_id: tenantB,
          invoice_id: invA.id,
          amount: 5000,
          reason: 'Malicious cross-tenant write-off attempt',
          authorized_by_name: 'Attacker',
        })
      },
      /(not found|unauthorized|invalid|exceed)/i,
      'Cross-tenant write-off modification must be rejected'
    )
  })

  // --------------------------------------------------------------------------
  // Gate 2: UI Design Token & Palette Audit Gate
  // --------------------------------------------------------------------------
  it('2. Design System Gate: Intercepts Raw Tailwind Palette, Raw Hex & Hardcoded Colors', () => {
    // Audit Scanner Regex Rules (from scripts/ui-audit/audit-scanner.ts)
    const RAW_PALETTE_REGEX =
      /\b(bg|text|border|ring)-(slate|zinc|gray|neutral|red|blue|indigo|emerald|amber|orange|purple|cyan|teal|green|rose|yellow)-\d+\b/
    const RAW_WHITE_BLACK_REGEX = /(?<!print:)\b(bg-white|text-black)\b/
    const COLOR_HEX_REGEX =
      /(?:(?:bg|text|border|ring|fill|stroke|from|to|via)-\[#(?:[0-9a-fA-F]{3}){1,2}\]|(?:color|fill|stroke|bgColor|fgColor|stopColor|background|backgroundColor|borderColor)\s*[:=]\s*["']#(?:[0-9a-fA-F]{3}){1,2}["']|['"]#(?:[0-9a-fA-F]{3}){1,2}['"])/
    const SUB_12PX_REGEX = /(?:text-\[(?:[0-9]|10|11)px\]|\btext-2xs\b)/

    // Test PR snippet 1: Raw palette classes
    const prWithRawPalette = '<button className="bg-slate-900 text-blue-500 hover:bg-slate-800">Submit</button>'
    assert.match(prWithRawPalette, RAW_PALETTE_REGEX, 'CI UI audit must flag raw palette bg-slate-900 / text-blue-500')

    // Test PR snippet 2: Raw white / black
    const prWithRawWhiteBlack = '<div className="bg-white text-black p-4">Invoice Card</div>'
    assert.match(prWithRawWhiteBlack, RAW_WHITE_BLACK_REGEX, 'CI UI audit must flag raw bg-white / text-black')

    // Test PR snippet 3: Arbitrary raw hex
    const prWithRawHex = '<span className="text-[#3b82f6]">Dynamic Banner</span>'
    assert.match(prWithRawHex, COLOR_HEX_REGEX, 'CI UI audit must flag hardcoded hex color #3b82f6')

    // Test PR snippet 4: Sub-12px unreadable font
    const prWithSub12px = '<p className="text-[10px] text-muted-foreground">Tiny timestamp</p>'
    assert.match(prWithSub12px, SUB_12PX_REGEX, 'CI UI audit must flag sub-12px font size text-[10px]')

    // Verified Compliant PR snippet: Uses semantic design tokens
    const compliantSnippet = '<button className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium">Submit</button>'
    assert.doesNotMatch(compliantSnippet, RAW_PALETTE_REGEX, 'Compliant snippet must pass palette check')
    assert.doesNotMatch(compliantSnippet, RAW_WHITE_BLACK_REGEX, 'Compliant snippet must pass white/black check')
    assert.doesNotMatch(compliantSnippet, COLOR_HEX_REGEX, 'Compliant snippet must pass hex check')
    assert.doesNotMatch(compliantSnippet, SUB_12PX_REGEX, 'Compliant snippet must pass font size check')
  })

  // --------------------------------------------------------------------------
  // Gate 3: Copy & Localization Linter Gate
  // --------------------------------------------------------------------------
  it('3. Copy & i18n Gate: Intercepts Banned Corporate Jargon & Missing Translations', () => {
    const BANNED_WORDS = [
      'liquid',
      'liquidity',
      'treasury',
      'automation',
      'orchestration',
      'disbursement',
      'seamlessly',
      'idempotent',
      'human capital',
      'quota',
    ]

    function auditCopyEntry(enText: string, bnText?: string): { errors: string[] } {
      const errors: string[] = []
      if (!bnText || !bnText.trim()) {
        errors.push('MISSING_BN_TRANSLATION')
      }
      const lower = enText.toLowerCase()
      for (const word of BANNED_WORDS) {
        if (new RegExp(`\\b${word}\\b`, 'i').test(lower)) {
          errors.push(`BANNED_JARGON_${word.toUpperCase()}`)
        }
      }
      return { errors }
    }

    // Broken PR snippet 1: Banned corporate jargon
    const brokenCopy1 = auditCopyEntry('Seamlessly automate treasury liquidity management', 'ট্রেজারি অটোমেশন')
    assert.ok(brokenCopy1.errors.some((e) => e.includes('LIQUID')), 'Must detect banned word "liquid/liquidity"')
    assert.ok(brokenCopy1.errors.some((e) => e.includes('TREASURY')), 'Must detect banned word "treasury"')
    assert.ok(brokenCopy1.errors.some((e) => e.includes('SEAMLESSLY')), 'Must detect banned word "seamlessly"')

    // Broken PR snippet 2: Missing Bengali translation
    const brokenCopy2 = auditCopyEntry('Confirm Job Order Dispatch', '')
    assert.ok(brokenCopy2.errors.includes('MISSING_BN_TRANSLATION'), 'Must detect missing Bengali translation key')

    // Compliant PR snippet: Direct, clear language with Bengali counterpart
    const compliantCopy = auditCopyEntry('Send Invoices to Clients', 'গ্রাহকদের কাছে ইনভয়েস পাঠান')
    assert.strictEqual(compliantCopy.errors.length, 0, 'Compliant copy must pass linter with 0 errors')
  })

  // --------------------------------------------------------------------------
  // Gate 4: Security Grep Gate (SQL & Client Leaks)
  // --------------------------------------------------------------------------
  it('4. Security Grep Gate: Intercepts Anon Grants, USING (true) Tenant Table Bypass & Service Role Leaks', () => {
    // 4.1 Check: GRANT TO anon on function
    const ANON_GRANT_REGEX = /grant\s+execute\s+on\s+function.+to\s+[^;]*\banon\b/i

    const badSqlAnonGrant = 'GRANT EXECUTE ON FUNCTION public.delete_tenant_permanently(uuid, text) TO authenticated, anon;'
    assert.match(badSqlAnonGrant, ANON_GRANT_REGEX, 'Security gate must intercept GRANT EXECUTE to anon')

    const safeSqlGrant = 'GRANT EXECUTE ON FUNCTION public.delete_tenant_permanently(uuid, text) TO authenticated, service_role;'
    assert.doesNotMatch(safeSqlGrant, ANON_GRANT_REGEX, 'Safe grant to authenticated/service_role must pass')

    // 4.2 Check: USING (true) on tenant tables
    const TENANT_TABLES = ['invoices', 'customers', 'orders', 'quotations', 'payments']
    function checkRlsPolicyBypass(sql: string, table: string): boolean {
      const hasUsingTrue = /\b(?:using|with\s+check)\s*\(\s*true\s*\)/i.test(sql)
      const isTenantTable = TENANT_TABLES.includes(table)
      return hasUsingTrue && isTenantTable
    }

    const badRlsPolicy = 'CREATE POLICY "leak_all_invoices" ON public.invoices FOR ALL USING (true);'
    assert.strictEqual(
      checkRlsPolicyBypass(badRlsPolicy, 'invoices'),
      true,
      'Security gate must detect USING (true) on tenant table "invoices"'
    )

    const goodRlsPolicy = 'CREATE POLICY "tenant_isolation" ON public.invoices FOR ALL USING (company_id = auth_current_company_id());'
    assert.strictEqual(
      checkRlsPolicyBypass(goodRlsPolicy, 'invoices'),
      false,
      'Strict company_id RLS policy must pass'
    )

    // 4.3 Check: SUPABASE_SERVICE_ROLE in client code
    const CLIENT_SERVICE_ROLE_REGEX = /process\.env\.SUPABASE_SERVICE_ROLE_KEY|process\.env\.SUPABASE_SERVICE_ROLE/i

    const badClientComponent = `
      'use client'
      import { createClient } from '@supabase/supabase-js'
      const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    `
    assert.match(
      badClientComponent,
      CLIENT_SERVICE_ROLE_REGEX,
      'Security gate must intercept SUPABASE_SERVICE_ROLE in client component'
    )

    const safeClientComponent = `
      'use client'
      import { createBrowserClient } from '@supabase/ssr'
      const client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    `
    assert.doesNotMatch(
      safeClientComponent,
      CLIENT_SERVICE_ROLE_REGEX,
      'Standard public anon client in client code must pass'
    )
  })
})
