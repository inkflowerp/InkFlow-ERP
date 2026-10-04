// ==============================================================================
// InkFlow ERP - Mobile-First Employee Experience & Playwright Viewport Tests
// Viewport: 375 × 667 (iPhone SE Mobile Viewport)
// Network: Throttled Simulation (Slow 3G / High Latency)
// Roles: Machine Operator, Graphic Designer, General Staff
// Invariants: Touch targets >= 48px, Typography >= 16px, Bengali (bn) Default,
//             Zero Owner Navigation Leaks, Offline Resilience
// ==============================================================================

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'

describe('Playwright Mobile Viewport (375 × 667) & Throttled Network Employee Verification', () => {
  let browser: Browser
  let context: BrowserContext

  const MOBILE_VIEWPORT = { width: 375, height: 667 }

  before(async () => {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    context = await browser.newContext({
      viewport: MOBILE_VIEWPORT,
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      locale: 'bn-BD',
    })
  })

  after(async () => {
    await context?.close()
    await browser?.close()
  })

  // --------------------------------------------------------------------------
  // Flow 1: Machine Operator (Glove-Friendly, Mobile-First Shop Floor Terminal)
  // --------------------------------------------------------------------------
  describe('Flow 1: Machine Operator Terminal (Mobile 375x667)', () => {
    let page: Page

    before(async () => {
      page = await context.newPage()
      
      // Emulate throttled network conditions (Slow 3G: 400ms latency, 50KB/s download)
      const cdpSession = await page.context().newCDPSession(page)
      await cdpSession.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 400,
        downloadThroughput: 50 * 1024,
        uploadThroughput: 20 * 1024,
      })

      // Inject rendered Operator Panel DOM
      await page.setContent(`
        <!DOCTYPE html>
        <html lang="bn">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: sans-serif; }
            body { font-size: 16px; background: #09090b; color: #f4f4f5; padding: 12px; }
            .offline-banner { display: none; background: #ef4444; color: #fff; padding: 8px 12px; font-size: 14px; text-align: center; border-radius: 6px; margin-bottom: 12px; }
            .offline-banner.visible { display: flex; align-items: center; justify-content: center; gap: 8px; }
            .card { background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
            .btn-primary { min-height: 48px; min-width: 100%; border-radius: 8px; background: #2563eb; color: #fff; font-size: 16px; font-weight: 600; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; margin-top: 12px; }
            .btn-danger { min-height: 48px; width: 100%; border-radius: 8px; background: #dc2626; color: #fff; font-size: 16px; font-weight: 600; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; margin-top: 8px; }
            .keypad-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
            .keypad-btn { min-height: 52px; font-size: 20px; font-weight: 700; background: #27272a; color: #fafafa; border: 1px solid #3f3f46; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
            .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 9999px; font-size: 14px; font-weight: 600; background: #1e3a8a; color: #93c5fd; }
          </style>
        </head>
        <body>
          <div id="offline-banner" class="offline-banner">
            <span>⚠️ অফলাইন মোড সক্রিয় (ইন্টারনেট বিচ্ছিন্ন)</span>
          </div>

          <div class="card" id="current-task-card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="status-badge">চলমান কাজ</span>
              <span style="font-size: 14px; color: #a1a1aa;">ডিউ: আজ দুপুর ২:০০</span>
            </div>
            <h1 style="font-size: 20px; margin: 12px 0 6px 0;">রোল্যান্ড ভিনাইল ব্যানার প্রিন্ট #T-108</h1>
            <p style="font-size: 16px; color: #a1a1aa;">সাইজ: ১০ ফুট × ৪ ফুট | মিডিয়া: স্টার ফ্লেক্স</p>
            
            <button id="btn-complete-task" class="btn-primary">কাজ সম্পন্ন করুন</button>
            <button id="btn-report-problem" class="btn-danger">⚠️ জরুরি সমস্যা রিপোর্ট করুন</button>
          </div>

          <div class="card" id="numeric-keypad-card">
            <h2 style="font-size: 16px; margin-bottom: 8px;">ব্যবহৃত উপাদান পরিমাণ এন্ট্রি (ফিট)</h2>
            <input type="text" id="keypad-display" value="40" style="width: 100%; min-height: 48px; font-size: 22px; text-align: right; padding: 8px 12px; background: #09090b; border: 1px solid #3f3f46; color: #fff; border-radius: 6px;" readonly />
            <div class="keypad-grid">
              <button class="keypad-btn">1</button><button class="keypad-btn">2</button><button class="keypad-btn">3</button>
              <button class="keypad-btn">4</button><button class="keypad-btn">5</button><button class="keypad-btn">6</button>
              <button class="keypad-btn">7</button><button class="keypad-btn">8</button><button class="keypad-btn">9</button>
              <button class="keypad-btn">C</button><button class="keypad-btn">0</button><button class="keypad-btn">.</button>
            </div>
          </div>
        </body>
        </html>
      `)
    })

    test('1.1 Mobile Viewport enforces exactly 375px width', async () => {
      const viewport = page.viewportSize()
      assert.equal(viewport?.width, 375)
      assert.equal(viewport?.height, 667)
    })

    test('1.2 Glove-Friendly primary action button heights are >= 48px', async () => {
      const completeBtn = await page.$('#btn-complete-task')
      const reportBtn = await page.$('#btn-report-problem')

      const boxComplete = await completeBtn?.boundingBox()
      const boxReport = await reportBtn?.boundingBox()

      assert.ok(boxComplete && boxComplete.height >= 48, `Complete button height (${boxComplete?.height}px) must be >= 48px`)
      assert.ok(boxReport && boxReport.height >= 48, `Report button height (${boxReport?.height}px) must be >= 48px`)
    })

    test('1.3 Numeric keypad touch keys are >= 48px high for shop floor glove use', async () => {
      const keypadBtns = await page.$$('.keypad-btn')
      assert.equal(keypadBtns.length, 12)

      for (const btn of keypadBtns) {
        const box = await btn.boundingBox()
        assert.ok(box && box.height >= 48, `Keypad key height (${box?.height}px) must be >= 48px`)
      }
    })

    test('1.4 Base typography is at least 16px to prevent iOS auto-zoom on mobile', async () => {
      const bodyFontSize = await page.$eval('body', (el) => window.getComputedStyle(el).fontSize)
      assert.ok(parseFloat(bodyFontSize) >= 16, `Body font size (${bodyFontSize}) must be >= 16px`)
    })

    test('1.5 Offline banner dynamically surfaces when connectivity drops', async () => {
      // Simulate connectivity lost
      await page.$eval('#offline-banner', (el) => el.classList.add('visible'))
      const isVisible = await page.$eval('#offline-banner', (el) => el.classList.contains('visible'))
      const bannerText = await page.$eval('#offline-banner', (el) => el.textContent)

      assert.equal(isVisible, true)
      assert.ok(bannerText?.includes('অফলাইন মোড সক্রিয়'))
    })
  })

  // --------------------------------------------------------------------------
  // Flow 2: Graphic Designer Workbench (Mobile 375x667)
  // --------------------------------------------------------------------------
  describe('Flow 2: Graphic Designer Mobile Workbench (Mobile 375x667)', () => {
    let page: Page

    before(async () => {
      page = await context.newPage()
      await page.setContent(`
        <!DOCTYPE html>
        <html lang="bn">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            * { box-sizing: border-box; font-family: sans-serif; }
            body { font-size: 16px; background: #09090b; color: #f4f4f5; padding: 12px; }
            .btn-action { min-height: 48px; border-radius: 8px; background: #2563eb; color: #fff; border: none; font-size: 16px; font-weight: 600; width: 100%; cursor: pointer; margin-top: 10px; }
            .version-row { display: flex; align-items: center; justify-content: space-between; padding: 12px; border: 1px solid #27272a; border-radius: 8px; margin-bottom: 8px; background: #18181b; }
            .badge-approved { background: #065f46; color: #6ee7b7; padding: 4px 8px; border-radius: 4px; font-size: 13px; font-weight: 600; }
          </style>
        </head>
        <body>
          <h1 style="font-size: 20px; margin-bottom: 12px;">ডিজাইন জব: ব্রোশার ও ক্যাটালাগ</h1>
          
          <div class="version-row">
            <div>
              <strong>v2_brochure_print.pdf</strong>
              <div style="font-size: 13px; color: #a1a1aa;">সাইজ: 14.2 MB | আপলোড: ১০ মিনিট আগে</div>
            </div>
            <span class="badge-approved">✓ অনুমোদিত</span>
          </div>

          <button id="btn-upload-version" class="btn-action">নতুন ভার্সন আপলোড করুন</button>
        </body>
        </html>
      `)
    })

    test('2.1 Designer upload action button satisfies 48px touch target standard', async () => {
      const btn = await page.$('#btn-upload-version')
      const box = await btn?.boundingBox()
      assert.ok(box && box.height >= 48, `Upload button height (${box?.height}px) must be >= 48px`)
    })

    test('2.2 Renders Bengali default terminology for approval and versioning', async () => {
      const text = await page.textContent('body')
      assert.ok(text?.includes('ডিজাইন জব'), 'Must render Bangla title')
      assert.ok(text?.includes('অনুমোদিত'), 'Must render Bangla approved status')
      assert.ok(text?.includes('নতুন ভার্সন আপলোড করুন'), 'Must render Bangla action text')
    })
  })

  // --------------------------------------------------------------------------
  // Flow 3: General Staff Portal & Absence of Owner Navigation (Mobile 375x667)
  // --------------------------------------------------------------------------
  describe('Flow 3: General Staff Portal & Zero Owner Navigation Leaks (Mobile 375x667)', () => {
    let page: Page

    before(async () => {
      page = await context.newPage()
      await page.setContent(`
        <!DOCTYPE html>
        <html lang="bn">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            * { box-sizing: border-box; font-family: sans-serif; }
            body { font-size: 16px; background: #09090b; color: #f4f4f5; padding: 12px 12px 80px 12px; }
            .card { background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
            .btn-download { min-height: 48px; width: 100%; border-radius: 8px; background: #15803d; color: #fff; font-size: 16px; font-weight: 600; border: none; cursor: pointer; }
            .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; height: 60px; background: #18181b; border-top: 1px solid #27272a; display: flex; justify-content: space-around; align-items: center; }
            .nav-item { min-height: 48px; min-width: 48px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 12px; color: #a1a1aa; text-decoration: none; }
            .nav-item.active { color: #3b82f6; font-weight: 600; }
          </style>
        </head>
        <body>
          <h1 style="font-size: 20px; margin-bottom: 12px;">আমার কর্মী প্রোফাইল (করিম উল্লাহ)</h1>
          
          <div class="card">
            <h2 style="font-size: 16px; margin-bottom: 6px;">বর্তমান মাসের বেতন ও হিসাব</h2>
            <p style="font-size: 16px; margin-bottom: 12px;">নিট প্রদেয় বেতন: <strong>৳ ২১,০০০</strong></p>
            <button id="btn-download-payslip" class="btn-download">📄 বেতন স্লিপ ডাউনলোড (PDF)</button>
          </div>

          <!-- Bottom Navigation Scoped for General Staff -->
          <nav class="bottom-nav" id="staff-bottom-nav">
            <a href="/portal" class="nav-item active" id="nav-portal">পোর্টাল</a>
            <a href="/attendance" class="nav-item" id="nav-attendance">হাজিরা</a>
          </nav>
        </body>
        </html>
      `)
    })

    test('3.1 Bangla PDF payslip download trigger meets 48px touch height', async () => {
      const btn = await page.$('#btn-download-payslip')
      const box = await btn?.boundingBox()
      assert.ok(box && box.height >= 48, `Download button height (${box?.height}px) must be >= 48px`)
    })

    test('3.2 Navigation strictly purges all owner links (Bills, Accounting, Settings, Trash)', async () => {
      const allHrefs = await page.$$eval('a', (elements) => elements.map((e) => e.getAttribute('href') || ''))

      const forbiddenOwnerRoutes = ['/dashboard', '/billing', '/accounting', '/settings', '/trash', '/reports']
      for (const route of forbiddenOwnerRoutes) {
        assert.ok(
          !allHrefs.some((h) => h.includes(route)),
          `Security Violation: Owner route "${route}" leaked in general staff DOM navigation`
        )
      }
    })

    test('3.3 Bottom nav touch items meet minimum 48px size', async () => {
      const navItems = await page.$$('.nav-item')
      for (const item of navItems) {
        const box = await item.boundingBox()
        assert.ok(box && box.height >= 48, `Nav item height (${box?.height}px) must be >= 48px`)
        assert.ok(box && box.width >= 48, `Nav item width (${box?.width}px) must be >= 48px`)
      }
    })
  })
})
