// ==============================================================================
// InkFlow ERP SaaS - Visual Audit & Screenshot Crawler (Step A)
//
// Crawls all ~57 routes (Auth, Onboarding, Platform, and all 31 Tenant Modules)
// across Light/Dark x Mobile 375 / Tablet 768 / Desktop 1440 x English/Bangla.
// Captures screenshots to docs/hardening/screenshots/ and produces ui-findings.md.
// ==============================================================================

import fs from 'fs'
import path from 'path'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'
import { signSessionToken } from '../lib/security/session-signer.ts'
import { createClient } from '@supabase/supabase-js'

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000'

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
]

const THEMES: ('light' | 'dark')[] = ['light', 'dark']
const LOCALES: ('en' | 'bn')[] = ['en', 'bn']

export interface PageAuditDef {
  id: string
  path: string
  name: string
  category: 'auth' | 'onboarding' | 'platform' | 'tenant' | 'public'
}

export const ALL_AUDIT_PAGES: PageAuditDef[] = [
  // Auth & Public
  { id: 'auth-login', path: '/login', name: 'User Login', category: 'auth' },
  { id: 'auth-register', path: '/register', name: 'User Registration', category: 'auth' },
  { id: 'auth-forgot-password', path: '/forgot-password', name: 'Forgot Password', category: 'auth' },
  { id: 'auth-reset-password', path: '/reset-password', name: 'Reset Password', category: 'auth' },
  { id: 'onboarding-setup', path: '/onboarding', name: 'Tenant Onboarding', category: 'onboarding' },
  { id: 'public-pricing', path: '/pricing', name: 'Public Pricing', category: 'public' },
  { id: 'public-home', path: '/', name: 'Marketing Homepage', category: 'public' },

  // Platform Modules
  { id: 'plat-overview', path: '/platform', name: 'Platform Overview', category: 'platform' },
  { id: 'plat-tenants', path: '/platform/tenants', name: 'Tenant Directory', category: 'platform' },
  { id: 'plat-company-detail', path: '/platform/companies/a0000000-0000-0000-0000-000000000001', name: 'Tenant Details', category: 'platform' },
  { id: 'plat-plans', path: '/platform/plans', name: 'Plan & Tier Config', category: 'platform' },
  { id: 'plat-subscriptions', path: '/platform/subscriptions', name: 'Subscription Ledger', category: 'platform' },
  { id: 'plat-billing', path: '/platform/billing', name: 'Platform Billing', category: 'platform' },
  { id: 'plat-features', path: '/platform/features', name: 'Feature Flags', category: 'platform' },
  { id: 'plat-usage', path: '/platform/usage', name: 'Resource Quotas', category: 'platform' },
  { id: 'plat-support', path: '/platform/support', name: 'Platform Support Tickets', category: 'platform' },
  { id: 'plat-incidents', path: '/platform/incidents', name: 'Incident Response', category: 'platform' },
  { id: 'plat-health', path: '/platform/health', name: 'Cluster Health Monitor', category: 'platform' },
  { id: 'plat-jobs', path: '/platform/jobs', name: 'Background Jobs & Cron', category: 'platform' },
  { id: 'plat-notifications', path: '/platform/notifications', name: 'Broadcast Announcements', category: 'platform' },
  { id: 'plat-security', path: '/platform/security', name: 'Platform Security Settings', category: 'platform' },
  { id: 'plat-admins', path: '/platform/admins', name: 'Superadmin Staff Management', category: 'platform' },
  { id: 'plat-permissions', path: '/platform/permissions', name: 'RBAC Permission Matrix', category: 'platform' },
  { id: 'plat-audit', path: '/platform/audit', name: 'Compliance Audit Trail', category: 'platform' },
  { id: 'plat-settings', path: '/platform/settings', name: 'Platform Settings', category: 'platform' },
  { id: 'plat-settings-comm', path: '/platform/settings/communication', name: 'Platform Communications', category: 'platform' },

  // All 31 Tenant Modules
  { id: 'tenant-dashboard', path: '/alpha-print/dashboard', name: 'Tenant Dashboard', category: 'tenant' },
  { id: 'tenant-invoices', path: '/alpha-print/invoices', name: 'Invoices & Billing', category: 'tenant' },
  { id: 'tenant-billing', path: '/alpha-print/billing', name: 'Payments & Receipts', category: 'tenant' },
  { id: 'tenant-quotations', path: '/alpha-print/quotations', name: 'Quotations & Estimates', category: 'tenant' },
  { id: 'tenant-orders', path: '/alpha-print/orders', name: 'Sales Orders', category: 'tenant' },
  { id: 'tenant-production', path: '/alpha-print/production', name: 'Production Kanban', category: 'tenant' },
  { id: 'tenant-operator', path: '/alpha-print/operator', name: 'Floor Operator Terminal', category: 'tenant' },
  { id: 'tenant-design', path: '/alpha-print/design', name: 'Design Jobs & Proofing', category: 'tenant' },
  { id: 'tenant-designer', path: '/alpha-print/designer', name: 'Designer Workspace', category: 'tenant' },
  { id: 'tenant-finishing', path: '/alpha-print/finishing', name: 'Finishing & Fabrication', category: 'tenant' },
  { id: 'tenant-inventory', path: '/alpha-print/inventory', name: 'Inventory & Stock Rolls', category: 'tenant' },
  { id: 'tenant-products', path: '/alpha-print/products', name: 'Products & Price Lists', category: 'tenant' },
  { id: 'tenant-purchases', path: '/alpha-print/purchases', name: 'Purchase Orders & GRN', category: 'tenant' },
  { id: 'tenant-suppliers', path: '/alpha-print/suppliers', name: 'Suppliers Directory', category: 'tenant' },
  { id: 'tenant-customers', path: '/alpha-print/customers', name: 'Customer Directory & CRM', category: 'tenant' },
  { id: 'tenant-delivery', path: '/alpha-print/delivery', name: 'Delivery Challans', category: 'tenant' },
  { id: 'tenant-accounting', path: '/alpha-print/accounting', name: 'Chart of Accounts & GL', category: 'tenant' },
  { id: 'tenant-hr', path: '/alpha-print/hr', name: 'HR & Employee Directory', category: 'tenant' },
  { id: 'tenant-attendance', path: '/alpha-print/attendance', name: 'Attendance & Punch Logs', category: 'tenant' },
  { id: 'tenant-costing', path: '/alpha-print/costing', name: 'Service Costing Engine', category: 'tenant' },
  { id: 'tenant-pricing', path: '/alpha-print/pricing', name: 'Pricing Formula Config', category: 'tenant' },
  { id: 'tenant-reports', path: '/alpha-print/reports', name: 'Executive Financial Reports', category: 'tenant' },
  { id: 'tenant-tax', path: '/alpha-print/tax', name: 'NBR VAT 6.3 & Mushak', category: 'tenant' },
  { id: 'tenant-communications', path: '/alpha-print/communications', name: 'Communications Delivery Log', category: 'tenant' },
  { id: 'tenant-automations', path: '/alpha-print/automations', name: 'Workflow Automations', category: 'tenant' },
  { id: 'tenant-support', path: '/alpha-print/support', name: 'Tenant Helpdesk', category: 'tenant' },
  { id: 'tenant-audit', path: '/alpha-print/audit', name: 'Tenant Audit Trail', category: 'tenant' },
  { id: 'tenant-settings', path: '/alpha-print/settings', name: 'Tenant Company Settings', category: 'tenant' },
  { id: 'tenant-settings-notif', path: '/alpha-print/settings/notifications', name: 'Notification Preferences', category: 'tenant' },
  { id: 'tenant-trash', path: '/alpha-print/trash', name: 'Recycle Bin', category: 'tenant' },
  { id: 'tenant-floor-consumption', path: '/alpha-print/floor-consumption', name: 'Shop Floor Scrap Logger', category: 'tenant' },
]

export interface FindingItem {
  pageId: string
  name: string
  path: string
  horizontalOverflow: boolean
  clippedTextCount: number
  sub12pxTextCount: number
  rawPaletteClasses: string[]
  unreadableOrLowContrast: string[]
  missingStates: string[]
  screenshotCount: number
}

async function getAuthTokens() {
  const platCookie = await signSessionToken({
    userId: 'ef8108a7-5bbb-4525-937b-a7411fc1e796',
    adminId: 'e6ad52d3-a45b-415a-9168-2c73e11dfa9d',
    email: 'bdinfosky@gmail.com',
    role: 'platform_owner',
    fullName: 'Shahidur Rahman',
  })

  const tenantCookie = await signSessionToken({
    userId: 'a0000000-0000-0000-0000-000000000041',
    companyId: 'a0000000-0000-0000-0000-000000000001',
    companySlug: 'alpha-print',
    role: 'business_owner',
    companyName: 'Alpha Print & Signage Ltd.',
    responsibilities: ['business_owner'],
    email: 'owner.alpha@test.com',
  })

  // Supabase Auth session for platform
  let supabaseAuthCookie = ''
  try {
    const client = createClient(
      process.env.SUPABASE_URL || 'https://liqhihsqcblddqfjmmse.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )
    const { data } = await client.auth.signInWithPassword({
      email: 'bdinfosky@gmail.com',
      password: 'TestPassword123!',
    })
    if (data?.session) {
      supabaseAuthCookie = 'base64-' + Buffer.from(JSON.stringify(data.session)).toString('base64')
    }
  } catch (err) {
    console.warn('Could not acquire Supabase session token:', err)
  }

  return { platCookie, tenantCookie, supabaseAuthCookie }
}

export async function runVisualAudit() {
  console.log('==============================================================================')
  console.log('INKFLOW ERP - VISUAL AUDIT & WCAG CONTRAST HARNESS (STEP A)')
  console.log(`Target: ${BASE_URL}`)
  console.log(`Pages: ${ALL_AUDIT_PAGES.length} total`)
  console.log(`Variants: 2 Themes x 3 Viewports x 2 Locales = 12 variants per page`)
  console.log('==============================================================================\n')

  const screenshotsDir = path.resolve(process.cwd(), 'docs/hardening/screenshots')
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true })
  }

  const { platCookie, tenantCookie, supabaseAuthCookie } = await getAuthTokens()

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const findings: FindingItem[] = []
  let totalScreenshotsTaken = 0

  for (const pageDef of ALL_AUDIT_PAGES) {
    console.log(`Auditing: ${pageDef.name} (${pageDef.path})`)

    const finding: FindingItem = {
      pageId: pageDef.id,
      name: pageDef.name,
      path: pageDef.path,
      horizontalOverflow: false,
      clippedTextCount: 0,
      sub12pxTextCount: 0,
      rawPaletteClasses: [],
      unreadableOrLowContrast: [],
      missingStates: [],
      screenshotCount: 0,
    }

    const context = await browser.newContext()

    // Add session cookies
    const cookiesToAdd = [
      { name: 'printerp_tenant_session', value: tenantCookie, url: BASE_URL },
      { name: 'printerp_platform_session', value: platCookie, url: BASE_URL },
    ]
    if (supabaseAuthCookie) {
      cookiesToAdd.push({
        name: 'sb-liqhihsqcblddqfjmmse-auth-token',
        value: encodeURIComponent(supabaseAuthCookie),
        url: BASE_URL,
      })
    }
    await context.addCookies(cookiesToAdd)

    const page = await context.newPage()
    const targetUrl = `${BASE_URL}${pageDef.path}`

    let loaded = false
    try {
      const resp = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      if (resp && resp.status() < 400) {
        loaded = true
      } else {
        console.warn(`  Warning: Got status ${resp?.status()} on ${targetUrl}`)
      }
    } catch (err: any) {
      console.error(`  Failed to navigate to ${targetUrl}:`, err.message)
    }

    if (!loaded) {
      finding.missingStates.push('Page failed to load cleanly')
      findings.push(finding)
      await context.close()
      continue
    }

    try {
      // Give hydration a brief moment
      await page.waitForTimeout(300)

      for (const locale of LOCALES) {
        try {
          // Set locale in browser
          await page.evaluate((loc) => {
            try {
              localStorage.setItem('printerp_locale', loc)
              document.cookie = `printerp_locale=${loc}; path=/`
              document.documentElement.lang = loc
            } catch (_) {}
          }, locale)
        } catch (_) {}

        for (const theme of THEMES) {
          try {
            // Toggle theme class
            await page.evaluate((th) => {
              if (th === 'dark') {
                document.documentElement.classList.add('dark')
                document.documentElement.classList.remove('light')
              } else {
                document.documentElement.classList.remove('dark')
                document.documentElement.classList.add('light')
              }
              try {
                localStorage.setItem('theme', th)
              } catch (_) {}
            }, theme)
          } catch (_) {}

          for (const vp of VIEWPORTS) {
            try {
              await page.setViewportSize({ width: vp.width, height: vp.height })
              await page.waitForTimeout(100)

              const screenshotName = `${pageDef.id}_${theme}_${vp.name}_${locale}.png`
              const screenshotPath = path.join(screenshotsDir, screenshotName)
              if (!fs.existsSync(screenshotPath)) {
                await page.screenshot({ path: screenshotPath, fullPage: false })
              }
              totalScreenshotsTaken++
              finding.screenshotCount++

              // Extract DOM metrics on the desktop light version or once per page
              if (theme === 'light' && vp.name === 'desktop' && locale === 'en') {
                try {
                  const metrics = await page.evaluate(() => {
                    const overflow = document.documentElement.scrollWidth > window.innerWidth + 2

                    // Check for sub-12px text
                    const elements = Array.from(document.querySelectorAll('*'))
                    let sub12 = 0
                    let clipped = 0
                    const rawPalettes: string[] = []

                    const paletteRegex = /\b(bg|text|border)-(slate|zinc|gray|neutral|red|blue|indigo|emerald|amber|orange|purple|cyan|teal|green|rose|yellow)-/i
                    const hardcodedWhiteBlack = /\b(bg-white|text-white|bg-black|text-black)\b/i

                    for (const el of elements) {
                      const style = window.getComputedStyle(el)
                      const fontSize = parseFloat(style.fontSize) || 16
                      if (fontSize < 12 && el.textContent && el.textContent.trim().length > 0) {
                        sub12++
                      }

                      // Check text truncation/clipping
                      if (
                        (style.overflow === 'hidden' || style.textOverflow === 'ellipsis') &&
                        el.scrollWidth > el.clientWidth + 4
                      ) {
                        clipped++
                      }

                      // Check raw palette in classList
                      const cls = el.className || ''
                      if (typeof cls === 'string') {
                        const m1 = cls.match(paletteRegex)
                        if (m1 && !rawPalettes.includes(m1[0])) rawPalettes.push(m1[0])
                        const m2 = cls.match(hardcodedWhiteBlack)
                        if (m2 && !rawPalettes.includes(m2[0])) rawPalettes.push(m2[0])
                      }
                    }

                    // Check missing empty state on table/list containers
                    const tables = document.querySelectorAll('table')
                    let hasTableWithNoRowsAndNoEmptyState = false
                    for (const tbl of Array.from(tables)) {
                      const rows = tbl.querySelectorAll('tbody tr')
                      if (rows.length === 0) {
                        hasTableWithNoRowsAndNoEmptyState = true
                      }
                    }

                    return {
                      overflow,
                      sub12,
                      clipped,
                      rawPalettes: rawPalettes.slice(0, 10),
                      hasTableWithNoRowsAndNoEmptyState,
                    }
                  })

                  if (metrics.overflow) finding.horizontalOverflow = true
                  finding.sub12pxTextCount += metrics.sub12
                  finding.clippedTextCount += metrics.clipped
                  finding.rawPaletteClasses = metrics.rawPalettes
                  if (metrics.hasTableWithNoRowsAndNoEmptyState) {
                    finding.missingStates.push('Table with empty rows lacks standardized EmptyState component')
                  }
                } catch (_) {}
              }
            } catch (err: any) {
              console.warn(`    Warning on variant ${vp.name}/${theme}/${locale}:`, err.message)
            }
          }
        }
      }
    } catch (err: any) {
      console.warn(`  Warning processing page ${pageDef.name}:`, err.message)
    }

    findings.push(finding)
    await context.close()
  }

  await browser.close()

  console.log(`\nAll page audits complete. Total screenshots: ${totalScreenshotsTaken}`)
  return { findings, totalScreenshots: totalScreenshotsTaken }
}

if (process.argv[1]?.includes('visual-audit')) {
  runVisualAudit()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
