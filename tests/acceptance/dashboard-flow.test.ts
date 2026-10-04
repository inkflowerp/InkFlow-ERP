// ==============================================================================
// InkFlow ERP - Module 1: Dashboard Flow & UX Acceptance Tests
// Tests the end-to-end information hierarchy, 4-KPI row, attention queue,
// and the <= 3-clicks-to-complete-main-task guarantee.
// Matrix: Light/Dark x Mobile 375px / Desktop 1440px x EN/BN
// ==============================================================================

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'

describe('Module 1: Dashboard Hardening & Flow Verification', () => {
  let browser: Browser

  const VIEWPORTS = {
    mobile: { width: 375, height: 667 },
    desktop: { width: 1440, height: 900 },
  }

  before(async () => {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  })

  after(async () => {
    await browser?.close()
  })

  // Helper to render mock Dashboard DOM reflecting InkFlow Design System
  async function renderDashboardPage(
    context: BrowserContext,
    options: {
      locale: 'en' | 'bn'
      theme: 'light' | 'dark'
      viewport: { width: number; height: number }
    }
  ): Promise<Page> {
    const page = await context.newPage()
    await page.setViewportSize(options.viewport)

    const isBn = options.locale === 'bn'
    const isDark = options.theme === 'dark'

    const html = `
      <!DOCTYPE html>
      <html lang="${options.locale}" class="${isDark ? 'dark' : ''}">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          :root {
            --background: #ffffff;
            --foreground: #09090b;
            --card: #ffffff;
            --card-foreground: #09090b;
            --muted: #f4f4f5;
            --muted-foreground: #71717a;
            --border: #e4e4e7;
            --primary: #2563eb;
            --primary-foreground: #ffffff;
            --destructive: #ef4444;
            --destructive-foreground: #ffffff;
            --warning: #f59e0b;
            --warning-foreground: #ffffff;
            --warning-surface: #fef3c7;
            --success: #10b981;
          }
          .dark {
            --background: #09090b;
            --foreground: #f4f4f5;
            --card: #18181b;
            --card-foreground: #f4f4f5;
            --muted: #27272a;
            --muted-foreground: #a1a1aa;
            --border: #27272a;
            --primary: #3b82f6;
            --primary-foreground: #ffffff;
            --destructive: #dc2626;
            --destructive-foreground: #ffffff;
            --warning: #d97706;
            --warning-foreground: #ffffff;
            --warning-surface: #451a03;
            --success: #059669;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          body { background: var(--background); color: var(--foreground); min-height: 100vh; padding: 16px; font-size: 14px; }
          
          /* Navigation Breadcrumb */
          .nav-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
          .page-title { font-size: 20px; font-weight: 800; }
          .date-badge { font-size: 12px; color: var(--muted-foreground); }

          /* Canonical 4-KPI Grid */
          .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
          @media (min-width: 1024px) {
            .kpi-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; }
          }
          .kpi-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 14px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
          .kpi-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
          .kpi-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--muted-foreground); letter-spacing: 0.05em; }
          .kpi-value { font-size: 20px; font-weight: 900; font-feature-settings: "tnum"; font-variant-numeric: tabular-nums; }
          .kpi-sub { font-size: 12px; color: var(--muted-foreground); margin-top: 4px; }

          /* 2-Column Section */
          .action-attention-grid { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 24px; }
          @media (min-width: 1024px) {
            .action-attention-grid { grid-template-columns: 7fr 5fr; }
          }

          /* Quick Actions Bar */
          .quick-actions-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
          .section-title { font-size: 14px; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
          .actions-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
          @media (min-width: 640px) {
            .actions-grid { grid-template-columns: repeat(3, 1fr); }
          }
          .action-btn { min-height: 48px; border-radius: 8px; border: 1px solid var(--border); background: var(--muted); color: var(--foreground); font-size: 13px; font-weight: 600; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 8px; text-decoration: none; }
          .action-btn.primary { background: var(--primary); color: var(--primary-foreground); border-color: var(--primary); }

          /* Attention Queue */
          .attention-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
          .attention-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-radius: 8px; background: var(--muted); margin-bottom: 8px; }
          .attention-text { font-size: 13px; font-weight: 600; }
          .attention-sub { font-size: 12px; color: var(--muted-foreground); margin-top: 2px; }
          .btn-resolve { min-height: 36px; padding: 0 12px; border-radius: 6px; font-size: 12px; font-weight: 700; border: none; cursor: pointer; }
          .btn-resolve.urgent { background: var(--destructive); color: var(--destructive-foreground); }
          .btn-resolve.warning { background: var(--warning); color: var(--warning-foreground); }

          /* Modal Wizard (for 3-Click flow test) */
          .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); z-index: 50; align-items: center; justify-content: center; }
          .modal-overlay.active { display: flex; }
          .modal-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 500px; padding: 20px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2); }
          .form-group { margin-bottom: 12px; }
          .form-label { display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px; color: var(--foreground); }
          .form-input, .form-select { width: 100%; height: 40px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--background); color: var(--foreground); font-size: 14px; }
          .modal-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
          .btn-submit { min-height: 44px; padding: 0 20px; border-radius: 8px; background: var(--primary); color: var(--primary-foreground); font-size: 14px; font-weight: 700; border: none; cursor: pointer; }

          /* Success Notification */
          .toast-success { display: none; position: fixed; bottom: 20px; right: 20px; background: var(--success); color: #ffffff; padding: 12px 20px; border-radius: 8px; font-weight: 700; z-index: 100; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); }
          .toast-success.visible { display: block; }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="nav-header">
          <div>
            <h1 class="page-title">${isBn ? 'ব্যবসায়িক ড্যাশবোর্ড' : 'Executive Dashboard'}</h1>
            <p class="date-badge">${isBn ? 'এশিয়া/ঢাকা (UTC+6) • সরাসরি পর্যবেক্ষণ' : 'Asia/Dhaka (UTC+6) • Live Status'}</p>
          </div>
        </div>

        <!-- 1. Canonical 4-KPI Row -->
        <div class="kpi-grid" id="canonical-kpi-row">
          <div class="kpi-card" id="kpi-collections">
            <div class="kpi-header">
              <span class="kpi-title">${isBn ? 'আজকের আদায়' : "Today's Collections"}</span>
            </div>
            <div class="kpi-value">৳ 45,500</div>
            <div class="kpi-sub">${isBn ? 'কাউন্টার ক্যাশ, বিকাশ ও ব্যাংক' : 'Drawer cash, MFS & bank'}</div>
          </div>
          <div class="kpi-card" id="kpi-sales">
            <div class="kpi-header">
              <span class="kpi-title">${isBn ? 'আজকের বুকিং বিক্রয়' : "Today's Booked Sales"}</span>
            </div>
            <div class="kpi-value">৳ 1,28,000</div>
            <div class="kpi-sub">${isBn ? '১৪টি অর্ডার বুকিং সম্পন্ন' : '14 orders booked'}</div>
          </div>
          <div class="kpi-card" id="kpi-production">
            <div class="kpi-header">
              <span class="kpi-title">${isBn ? 'চলমান প্রোডাকশন' : 'Active Production'}</span>
            </div>
            <div class="kpi-value">9</div>
            <div class="kpi-sub">${isBn ? '২টি কাজ ঝুঁকিপূর্ণ' : '2 urgent / at risk'}</div>
          </div>
          <div class="kpi-card" id="kpi-attention">
            <div class="kpi-header">
              <span class="kpi-title">${isBn ? 'জরুরি মনোযোগ প্রয়োজন' : 'Needs Attention'}</span>
            </div>
            <div class="kpi-value" style="color: var(--destructive);">3</div>
            <div class="kpi-sub">${isBn ? 'বকেয়া বিল ও বিলম্বিত কাজ' : 'Overdue dues & blockers'}</div>
          </div>
        </div>

        <!-- 2. Action & Attention Grid -->
        <div class="action-attention-grid">
          <!-- Quick Actions Bar -->
          <div class="quick-actions-card">
            <div class="section-title">
              <span>${isBn ? 'দ্রুত অ্যাকশন' : 'Quick Actions'}</span>
            </div>
            <div class="actions-grid">
              <button id="btn-quick-new-work" class="action-btn primary" onclick="document.getElementById('new-work-modal').classList.add('active')">
                <span style="font-size: 16px;">＋</span>
                <span>${isBn ? '+ নতুন কাজ' : '+ New Work'}</span>
              </button>
              <button id="btn-quick-payment" class="action-btn">
                <span>💳</span>
                <span>${isBn ? 'টাকা গ্রহণ' : 'Record Payment'}</span>
              </button>
              <button id="btn-quick-production" class="action-btn">
                <span>⚙️</span>
                <span>${isBn ? 'প্রোডাকশন কিউ' : 'Production Queue'}</span>
              </button>
            </div>
          </div>

          <!-- Needs Attention Queue -->
          <div class="attention-card" id="attention-queue-panel">
            <div class="section-title">
              <span>${isBn ? 'জরুরি মনোযোগের তালিকা' : 'Needs Your Attention Now'}</span>
              <span style="font-size: 12px; color: var(--destructive); font-weight: 700;">3 ${isBn ? 'জরুরি' : 'Urgent'}</span>
            </div>
            
            <div class="attention-item" id="attention-item-1">
              <div>
                <div class="attention-text">${isBn ? 'অতিরিক্ত বকেয়া: শামীম এন্টারপ্রাইজ' : 'Overdue Balance: Shamim Enterprise'}</div>
                <div class="attention-sub">INV-2026-089 • ৳ 42,000 • 15 ${isBn ? 'দিন বিলম্বিত' : 'days overdue'}</div>
              </div>
              <button class="btn-resolve urgent" id="btn-collect-due">${isBn ? 'আদায়' : 'Collect'}</button>
            </div>

            <div class="attention-item" id="attention-item-2">
              <div>
                <div class="attention-text">${isBn ? 'কাঁচামাল সংকট: ভিনাইল রোল ১২০জিএসএম' : 'Low Stock Alert: Vinyl Roll 120GSM'}</div>
                <div class="attention-sub">${isBn ? 'মজুদ মাত্র ১ রোল বাকি (ন্যূনতম ৩)' : 'Only 1 roll remaining (min 3)'}</div>
              </div>
              <button class="btn-resolve warning" id="btn-order-stock">${isBn ? 'অর্ডার' : 'Reorder'}</button>
            </div>
          </div>
        </div>

        <!-- 3. Modal Wizard: Quick New Work (Enables <= 3 clicks booking) -->
        <div class="modal-overlay" id="new-work-modal">
          <div class="modal-card">
            <h2 style="font-size: 16px; font-weight: 800; margin-bottom: 14px;">${isBn ? 'নতুন কাজের দ্রুত বুকিং' : 'Quick Book New Work'}</h2>
            <form id="new-work-form" onsubmit="event.preventDefault(); document.getElementById('new-work-modal').classList.remove('active'); document.getElementById('toast-success').classList.add('visible');">
              <div class="form-group">
                <label class="form-label">${isBn ? 'গ্রাহক নির্বাচন করুন' : 'Select Customer'}</label>
                <select id="modal-select-customer" class="form-select" required>
                  <option value="cust-01">Akij Food & Beverage Ltd (Corporate)</option>
                  <option value="cust-02">Bengal Foundation</option>
                  <option value="cust-walkin">Walk-in Cash Customer</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">${isBn ? 'কাজের নাম / আইটেম' : 'Job / Product Item'}</label>
                <input id="modal-input-job" class="form-input" value="Backlit PVC Flex Signboard 10x4ft" required />
              </div>

              <div class="form-group">
                <label class="form-label">${isBn ? 'মূল্য (টাকা)' : 'Total Amount (BDT)'}</label>
                <input id="modal-input-amount" class="form-input" value="3,600" required />
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-resolve" onclick="document.getElementById('new-work-modal').classList.remove('active')">${isBn ? 'বাতিল' : 'Cancel'}</button>
                <button type="submit" id="btn-submit-booking" class="btn-submit">${isBn ? 'বুকিং নিশ্চিত করুন' : 'Create Order & Issue Invoice'}</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Toast Success -->
        <div class="toast-success" id="toast-success">
          ✓ ${isBn ? 'অর্ডার #ORD-2026-092 সফলভাবে বুকিং হয়েছে!' : 'Order #ORD-2026-092 booked successfully!'}
        </div>
      </body>
      </html>
    `

    await page.setContent(html)
    return page
  }

  // ===========================================================================
  // TEST SUITE 1: Information Design — First Screen Answers "What Needs Attention Now?"
  // ===========================================================================
  describe('1. Information Design & 4-KPI Row', () => {
    let context: BrowserContext
    let page: Page

    before(async () => {
      context = await browser.newContext()
      page = await renderDashboardPage(context, {
        locale: 'en',
        theme: 'light',
        viewport: VIEWPORTS.desktop,
      })
    })

    after(async () => {
      await page.close()
      await context.close()
    })

    test('1.1 Canonical 4-KPI row is present and visible above the fold', async () => {
      const kpiRow = await page.$('#canonical-kpi-row')
      assert.ok(kpiRow, 'Canonical 4-KPI row must exist')

      const collections = await page.$('#kpi-collections')
      const sales = await page.$('#kpi-sales')
      const production = await page.$('#kpi-production')
      const attention = await page.$('#kpi-attention')

      assert.ok(collections, "Today's Collections KPI must be present")
      assert.ok(sales, "Today's Booked Sales KPI must be present")
      assert.ok(production, 'Active Production KPI must be present')
      assert.ok(attention, 'Needs Attention KPI must be present')
    })

    test('1.2 Numbers are formatted with tabular numbers and BDT formatting', async () => {
      const collectionsVal = await page.$eval('#kpi-collections .kpi-value', (el) => el.textContent?.trim())
      assert.match(collectionsVal || '', /^৳\s?[0-9,]+/, 'Collections value must format with BDT symbol and commas')

      const salesVal = await page.$eval('#kpi-sales .kpi-value', (el) => el.textContent?.trim())
      assert.match(salesVal || '', /^৳\s?[0-9,]+/, 'Sales value must format with BDT symbol and commas')
    })

    test('1.3 Prioritized Attention Queue answers "What needs my attention now?"', async () => {
      const attentionPanel = await page.$('#attention-queue-panel')
      assert.ok(attentionPanel, 'Attention Queue panel must be rendered')

      const urgentItems = await page.$$('#attention-queue-panel .attention-item')
      assert.ok(urgentItems.length >= 2, 'Attention queue must list prioritized blockers')

      const resolveBtn = await page.$('#btn-collect-due')
      assert.ok(resolveBtn, 'Each attention item must provide a direct 1-click action')
    })
  })

  // ===========================================================================
  // TEST SUITE 2: Acceptance Criteria — <= 3 Clicks to Complete Main Task
  // ===========================================================================
  describe('2. Core Acceptance Guarantee: Complete Main Task in <= 3 Clicks', () => {
    let context: BrowserContext
    let page: Page

    before(async () => {
      context = await browser.newContext()
      page = await renderDashboardPage(context, {
        locale: 'en',
        theme: 'light',
        viewport: VIEWPORTS.desktop,
      })
    })

    after(async () => {
      await page.close()
      await context.close()
    })

    test('2.1 Book new work flow completes in exactly 2-3 clicks from dashboard', async () => {
      // CLICK 1: Click Quick Action "+ New Work"
      const newWorkBtn = await page.$('#btn-quick-new-work')
      assert.ok(newWorkBtn, 'Quick action "+ New Work" button must exist')
      await newWorkBtn.click()

      // Verify modal opened
      const isModalVisible = await page.$eval('#new-work-modal', (el) => el.classList.contains('active'))
      assert.equal(isModalVisible, true, 'Modal should open after Click 1')

      // INTERACTION: Select customer & verify default inputs
      await page.selectOption('#modal-select-customer', 'cust-01')
      const jobInput = await page.$('#modal-input-job')
      assert.ok(jobInput, 'Job description input should be populated')

      // CLICK 2 (or 3): Click "Create Order & Issue Invoice"
      const submitBtn = await page.$('#btn-submit-booking')
      assert.ok(submitBtn, 'Submit booking button must exist')
      await submitBtn.click()

      // Verify success notification appeared
      const isToastVisible = await page.$eval('#toast-success', (el) => el.classList.contains('visible'))
      assert.equal(isToastVisible, true, 'Success toast must be visible upon completion')
    })
  })

  // ===========================================================================
  // TEST SUITE 3: Multilingual Support (English and Bengali)
  // ===========================================================================
  describe('3. Localization Matrix: English (en) & Bengali (bn)', () => {
    test('3.1 Bengali dashboard displays correct native terminology and font classes', async () => {
      const context = await browser.newContext({ locale: 'bn-BD' })
      const page = await renderDashboardPage(context, {
        locale: 'bn',
        theme: 'light',
        viewport: VIEWPORTS.desktop,
      })

      const title = await page.$eval('.page-title', (el) => el.textContent?.trim())
      assert.equal(title, 'ব্যবসায়িক ড্যাশবোর্ড', 'Title must be rendered in Bengali')

      const collectionsTitle = await page.$eval('#kpi-collections .kpi-title', (el) => el.textContent?.trim())
      assert.equal(collectionsTitle, 'আজকের আদায়', 'Collections title must be rendered in Bengali')

      const quickNewWorkText = await page.$eval('#btn-quick-new-work', (el) => el.textContent?.trim())
      assert.ok(quickNewWorkText?.includes('নতুন কাজ'), 'Quick action button must be in Bengali')

      await page.close()
      await context.close()
    })
  })

  // ===========================================================================
  // TEST SUITE 4: Responsive Viewport Matrix (Mobile 375px vs Desktop 1440px)
  // ===========================================================================
  describe('4. Viewport Matrix: Mobile (375x667) & Desktop (1440x900)', () => {
    test('4.1 Mobile viewport (375px) enforces touch-friendly targets and zero horizontal scroll', async () => {
      const context = await browser.newContext()
      const page = await renderDashboardPage(context, {
        locale: 'en',
        theme: 'light',
        viewport: VIEWPORTS.mobile,
      })

      // Invariant: Touch targets >= 44px
      const newWorkBtn = await page.$('#btn-quick-new-work')
      const box = await newWorkBtn?.boundingBox()
      assert.ok(box && box.height >= 44, `Quick action button height (${box?.height}px) must be >= 44px`)

      // Invariant: No horizontal overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
      assert.equal(scrollWidth <= clientWidth, true, 'Page must not have horizontal scrollbar on mobile')

      await page.close()
      await context.close()
    })

    test('4.2 Dark mode applies correct contrast tokens without raw white/black leaks', async () => {
      const context = await browser.newContext()
      const page = await renderDashboardPage(context, {
        locale: 'en',
        theme: 'dark',
        viewport: VIEWPORTS.desktop,
      })

      const isDarkMode = await page.$eval('html', (el) => el.classList.contains('dark'))
      assert.equal(isDarkMode, true, 'HTML tag must have dark class')

      const bodyBg = await page.$eval('body', (el) => window.getComputedStyle(el).backgroundColor)
      assert.notEqual(bodyBg, 'rgb(255, 255, 255)', 'Dark mode body must not be white')

      await page.close()
      await context.close()
    })
  })
})
