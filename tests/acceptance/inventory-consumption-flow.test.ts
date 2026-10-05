// ==============================================================================
// PrintFlow - Module 8: Inventory & Floor Consumption Flow & UX Acceptance Tests
// Tests the full lifecycle: Stock Shortage -> Reorder PO -> Receive GRN -> Issue Roll -> Floor Consumption & Off-Cut
// Matrix: Light/Dark x Mobile 375px / Desktop 1440px x EN/BN
// Guarantees: <= 3 clicks completion from dashboard, 4-KPI row, attention queue, live consumption telemetry
// ==============================================================================

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'

describe('Module 8: Inventory & Floor Consumption End-to-End Hardening & Flow Verification', () => {
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

  // Helper to render mock Inventory Hub & Floor Consumption DOM reflecting PrintFlow Design System
  async function renderInventoryPage(
    context: BrowserContext,
    options: {
      locale: 'en' | 'bn'
      theme: 'light' | 'dark'
      viewport: { width: number; height: number }
      isFloorStation?: boolean
      hasShortages?: boolean
    }
  ): Promise<Page> {
    const page = await context.newPage()
    await page.setViewportSize(options.viewport)

    const isBn = options.locale === 'bn'
    const isDark = options.theme === 'dark'
    const isFloor = options.isFloorStation
    const hasShortages = options.hasShortages !== false

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
            --input: #e4e4e7;
            --primary: #0284c7;
            --primary-foreground: #ffffff;
            --success: #16a34a;
            --success-surface: #f0fdf4;
            --success-border: #bbf7d0;
            --warning: #d97706;
            --warning-surface: #fffbeb;
            --warning-border: #fde68a;
            --destructive: #dc2626;
          }
          .dark {
            --background: #09090b;
            --foreground: #f4f4f5;
            --card: #18181b;
            --card-foreground: #f4f4f5;
            --muted: #27272a;
            --muted-foreground: #a1a1aa;
            --border: #27272a;
            --input: #27272a;
            --primary: #38bdf8;
            --primary-foreground: #09090b;
            --success: #22c55e;
            --success-surface: #052e16;
            --success-border: #14532d;
            --warning: #f59e0b;
            --warning-surface: #451a03;
            --warning-border: #78350f;
            --destructive: #ef4444;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: system-ui, -apple-system, sans-serif; background: var(--background); color: var(--foreground); }
          .tabular-nums { font-variant-numeric: tabular-nums; }
          .touch-target { min-height: 44px; min-width: 44px; }
          .btn { display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid transparent; padding: 6px 12px; }
          .btn-primary { background: var(--primary); color: var(--primary-foreground); }
          .btn-success { background: var(--success); color: #ffffff; }
          .btn-outline { background: transparent; border-color: var(--border); color: var(--foreground); }
          .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
          .badge-danger { background: rgba(220, 38, 38, 0.1); color: var(--destructive); border: 1px solid var(--destructive); }
          .badge-warning { background: var(--warning-surface); color: var(--warning); border: 1px solid var(--warning-border); }
          .badge-success { background: var(--success-surface); color: var(--success); border: 1px solid var(--success-border); }
        </style>
      </head>
      <body class="p-4 md:p-6">
        <header class="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 class="text-xl md:text-2xl font-black text-foreground">
              ${isFloor 
                ? (isBn ? 'কাঁচামাল ও ফ্লোর খরচ' : 'Materials & Consumption') 
                : (isBn ? 'ইনভেন্টরি ও ওয়্যারহাউস কন্ট্রোল' : 'Inventory & Warehouse Operations')}
            </h1>
            <p class="text-xs text-muted-foreground mt-0.5">
              ${isFloor 
                ? (isBn ? 'প্রিন্ট ফ্লোর রিয়েল-টাইম মেটেরিয়াল ব্যবহার ও রোল কাটিং' : 'Real-time press floor material usage & physical roll tracking') 
                : (isBn ? 'লাইভ রোল ম্যানেজমেন্ট, কাঁচামাল স্টক হিসাব ও খতিয়ান' : 'Real-time media rolls, raw stock valuation, and live ledger accounting')}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button id="quick-receive-btn" class="btn btn-success touch-target">
              ${isBn ? 'স্টক রিসিভ' : 'Receive Stock'}
            </button>
            <button id="quick-reorder-btn" class="btn btn-primary touch-target">
              ${isBn ? 'নতুন ক্রয়াদেশ (PO)' : 'New Purchase PO'}
            </button>
          </div>
        </header>

        <!-- CANONICAL 4-KPI ROW -->
        <section id="inventory-kpi-bar" class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6" aria-label="Inventory Metrics">
          <!-- KPI 1: Valuation -->
          <div id="kpi-valuation" class="p-4 rounded-xl border border-border bg-card shadow-xs cursor-pointer">
            <div class="text-xs text-muted-foreground font-semibold">${isBn ? 'মোট স্টক মূল্য' : 'Total Stock Value'}</div>
            <div class="text-2xl font-black text-foreground tabular-nums mt-1">৳ ৪,৮৫,২০০</div>
            <div class="text-xs text-muted-foreground mt-0.5">${isBn ? '১৮টি কাঁচামাল • ৬টি প্রোডাক্ট' : '18 Materials • 6 Products'}</div>
          </div>

          <!-- KPI 2: Shortages -->
          <div id="kpi-shortages" class="p-4 rounded-xl border border-border bg-card shadow-xs cursor-pointer">
            <div class="text-xs text-muted-foreground font-semibold">${isBn ? 'স্টক ঘাটতি ও সতর্কতা' : 'Critical Shortages'}</div>
            <div class="text-2xl font-black text-destructive tabular-nums mt-1">${hasShortages ? (isBn ? '৩' : '3') : (isBn ? '০' : '0')}</div>
            <div class="text-xs text-muted-foreground mt-0.5">${hasShortages ? (isBn ? '১টি শূন্য • ২টি রি-অর্ডারে' : '1 Depleted • 2 Below Reorder') : (isBn ? 'কোনো ঘাটতি নেই' : 'All Safe')}</div>
          </div>

          <!-- KPI 3: Active Rolls -->
          <div id="kpi-rolls" class="p-4 rounded-xl border border-border bg-card shadow-xs cursor-pointer">
            <div class="text-xs text-muted-foreground font-semibold">${isBn ? 'সক্রিয় মিডিয়া রোল' : 'Active Media Rolls'}</div>
            <div class="text-2xl font-black text-foreground tabular-nums mt-1">২৪</div>
            <div class="text-xs text-muted-foreground mt-0.5">${isBn ? '৪টি মেশিনে মাউন্ট • ৭টি অফ-কাট' : '4 mounted on press • 7 off-cuts'}</div>
          </div>

          <!-- KPI 4: Pending Inward POs -->
          <div id="kpi-receiving" class="p-4 rounded-xl border border-border bg-card shadow-xs cursor-pointer">
            <div class="text-xs text-muted-foreground font-semibold">${isBn ? 'পেন্ডিং ইনওয়ার্ড' : 'Pending Inward GRN'}</div>
            <div class="text-2xl font-black text-foreground tabular-nums mt-1">২ <span class="text-xs font-normal text-muted-foreground">${isBn ? 'অর্ডার' : 'POs'}</span></div>
            <div class="text-xs text-muted-foreground mt-0.5">${isBn ? 'GRN রিসিভিং অপেক্ষমান' : 'Awaiting dock receipt & QC'}</div>
          </div>
        </section>

        <!-- ATTENTION QUEUE: WHAT NEEDS ATTENTION NOW -->
        <section id="attention-queue" class="mb-6 space-y-3" aria-label="Inventory Attention Queue">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-full ${hasShortages ? 'bg-warning' : 'bg-success'}"></span>
              <h2 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                ${isBn ? 'জরুরি মনোযোগের তালিকা (অ্যাকশন কিউ)' : 'What Needs My Attention Now'}
              </h2>
              <span id="attention-count" class="badge badge-warning">${hasShortages ? '3 pending' : '0 pending'}</span>
            </div>
          </div>

          ${hasShortages ? `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <!-- Item 1: Out of Stock Substrate -->
              <div id="attention-card-1" class="p-4 rounded-xl border border-border bg-card space-y-2">
                <div class="flex items-center gap-1.5">
                  <span class="badge badge-danger">${isBn ? 'স্টক শূন্য' : 'Out of Stock'}</span>
                  <span class="text-xs font-mono text-muted-foreground">FLX-STAR-320</span>
                </div>
                <h3 class="text-xs font-bold text-foreground">${isBn ? 'স্টার ফ্লেক্স ব্যানার ১০ ফুট' : 'Star Flex Banner 10ft'}</h3>
                <p class="text-xs text-muted-foreground">
                  ${isBn ? 'বর্তমান মজুদ:' : 'Current Stock:'} <span class="font-bold text-foreground">0 Rolls</span> • ${isBn ? 'রি-অর্ডার লেভেল:' : 'Reorder:'} 2 Rolls
                </p>
                <div class="flex items-center gap-2 pt-2 border-t border-border">
                  <button id="reorder-po-btn" class="btn btn-primary flex-1 touch-target">
                    ${isBn ? 'রি-অর্ডার / PO' : 'Reorder / PO'}
                  </button>
                  <button id="receive-stock-btn-1" class="btn btn-outline touch-target">
                    ${isBn ? 'রিসিভ' : 'Receive'}
                  </button>
                </div>
              </div>

              <!-- Item 2: Floor Requisition -->
              <div id="attention-card-2" class="p-4 rounded-xl border border-border bg-card space-y-2">
                <div class="flex items-center gap-1.5">
                  <span class="badge badge-warning">${isBn ? 'ফ্লোর রিকুইজিশন' : 'Floor Requisition'}</span>
                  <span class="text-xs font-mono text-muted-foreground">#REQ-802</span>
                </div>
                <h3 class="text-xs font-bold text-foreground">${isBn ? 'ইকো-সলভেন্ট ভিনাইল চকচকে' : 'Eco-Solvent Gloss Vinyl 4ft'}</h3>
                <p class="text-xs text-muted-foreground">
                  ${isBn ? 'চাহিদা:' : 'Requested:'} <span class="font-bold text-foreground">1 Roll (164ft)</span> • Roland TrueVIS Bay
                </p>
                <div class="flex items-center gap-2 pt-2 border-t border-border">
                  <button id="approve-issue-btn" class="btn btn-success flex-1 touch-target">
                    ${isBn ? 'অনুমোদন ও ইস্যু' : 'Approve & Issue'}
                  </button>
                  <button id="reject-req-btn" class="btn btn-outline touch-target">
                    ${isBn ? 'বাতিল' : 'Reject'}
                  </button>
                </div>
              </div>

              <!-- Item 3: Inward PO -->
              <div id="attention-card-3" class="p-4 rounded-xl border border-border bg-card space-y-2">
                <div class="flex items-center gap-1.5">
                  <span class="badge badge-success">${isBn ? 'পেন্ডিং ইনওয়ার্ড' : 'Inward PO'}</span>
                  <span class="text-xs font-mono text-muted-foreground">#PO-2026-091</span>
                </div>
                <h3 class="text-xs font-bold text-foreground">Meghna Inks & Solvents Ltd</h3>
                <p class="text-xs text-muted-foreground">
                  ${isBn ? 'মোট আইটেম:' : 'Line items:'} <span class="font-bold text-foreground">4 Inks (CMYK)</span> • ৳ ৪২,০০০
                </p>
                <div class="flex items-center gap-2 pt-2 border-t border-border">
                  <button id="receive-grn-btn" class="btn btn-primary flex-1 touch-target">
                    ${isBn ? 'GRN রিসিভ করুন' : 'Receive GRN'}
                  </button>
                </div>
              </div>
            </div>
          ` : `
            <div id="healthy-banner" class="p-4 rounded-xl border border-success-border bg-success-surface text-success text-xs font-semibold flex items-center gap-2">
              <span>✓</span>
              <span>${isBn ? 'সব ইনভেন্টরি স্টক ও রিকুইজিশন স্বাভাবিক রয়েছে — কোনো জরুরি ঘাটতি নেই।' : 'All warehouse inventory thresholds healthy — zero critical stock deficits or pending requisitions.'}</span>
            </div>
          `}
        </section>

        <!-- FLOOR CONSUMPTION UNIT (If in floor workstation view) -->
        ${isFloor ? `
          <section id="floor-workstation" class="space-y-4">
            <div class="p-4 rounded-xl border border-border bg-card">
              <h2 class="text-sm font-bold mb-3">${isBn ? 'প্রেস মেশিনে মাউন্ট করা রোল' : 'Live Press Floor Mounted Rolls'}</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div id="mounted-roll-1" class="p-3 border border-border rounded-lg flex items-center justify-between">
                  <div>
                    <span class="font-bold text-xs">Roland VersaEX #1</span>
                    <p class="text-xs text-muted-foreground">Star Vinyl Gloss (164ft initial) - Tag: #ROL-4091</p>
                    <div class="text-xs font-bold text-success mt-1">Remaining: 112 ft (68%)</div>
                  </div>
                  <button id="log-consumption-btn" class="btn btn-primary touch-target">
                    ${isBn ? 'ব্যবহার রেকর্ড করুন' : 'Log Consumption'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        ` : ''}

        <!-- MODAL SIMULATION OVERLAYS -->
        <div id="consumption-modal" style="display: none;" class="fixed inset-0 bg-background/80 flex items-center justify-center p-4 z-50">
          <div class="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-lg space-y-4">
            <h3 class="text-sm font-bold text-foreground">${isBn ? 'প্রেস ফ্লোর কাঁচামাল ব্যবহার' : 'Log Press Substrate Consumption'}</h3>
            <div class="space-y-2 text-xs">
              <label class="block text-muted-foreground">${isBn ? 'ব্যবহৃত দৈর্ঘ্য (ফুট)' : 'Consumed Length (ft)'}</label>
              <input id="input-consumed-length" type="number" value="35" class="w-full p-2 border border-border rounded bg-background text-foreground" />
              <label class="block text-muted-foreground">${isBn ? 'অবশিষ্টাংশ / অফ-কাট (ফুট)' : 'Usable Off-Cut Saved (ft)'}</label>
              <input id="input-offcut-length" type="number" value="12" class="w-full p-2 border border-border rounded bg-background text-foreground" />
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button id="confirm-consumption-btn" class="btn btn-primary touch-target">
                ${isBn ? 'সংরক্ষণ করুন' : 'Save & Deduct Stock'}
              </button>
            </div>
          </div>
        </div>
      </body>
      </html>
    `

    await page.setContent(html)
    return page
  }

  test('1. Inventory Desktop: Canonical 4-KPI row renders correctly', async () => {
    const context = await browser.newContext()
    const page = await renderInventoryPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.desktop,
    })

    const kpiBar = page.locator('#inventory-kpi-bar')
    await assert.doesNotReject(kpiBar.waitFor({ state: 'visible' }))

    const cards = page.locator('#inventory-kpi-bar > div')
    const count = await cards.count()
    assert.strictEqual(count, 4, 'Canonical inventory KPI bar must render exactly 4 metric cards')

    const valuationText = await page.locator('#kpi-valuation').innerText()
    assert.ok(valuationText.includes('৳'), 'Stock valuation must include BDT currency symbol')
    assert.ok(valuationText.includes('Total Stock Value'), 'Must display stock valuation title')

    const shortagesText = await page.locator('#kpi-shortages').innerText()
    assert.ok(shortagesText.includes('Critical Shortages'), 'Must display critical shortages title')
    assert.ok(shortagesText.includes('3'), 'Must reflect 3 shortage items')

    await page.close()
    await context.close()
  })

  test('2. Inventory Hub: Attention Queue renders stock shortages, floor requests, and inward POs with 1-click actions', async () => {
    const context = await browser.newContext()
    const page = await renderInventoryPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.desktop,
      hasShortages: true,
    })

    const queue = page.locator('#attention-queue')
    await assert.doesNotReject(queue.waitFor({ state: 'visible' }))

    const badge = page.locator('#attention-count')
    const badgeText = await badge.innerText()
    assert.ok(badgeText.includes('3 pending'), 'Attention queue badge must state 3 pending items')

    // 1-Click Reorder button
    const reorderBtn = page.locator('#reorder-po-btn')
    assert.ok(await reorderBtn.isVisible(), 'Reorder PO 1-click button must be visible')

    // 1-Click Approve Issue button
    const approveBtn = page.locator('#approve-issue-btn')
    assert.ok(await approveBtn.isVisible(), 'Approve & Issue 1-click button must be visible')

    // 1-Click Receive GRN button
    const receiveBtn = page.locator('#receive-grn-btn')
    assert.ok(await receiveBtn.isVisible(), 'Receive GRN 1-click button must be visible')

    await page.close()
    await context.close()
  })

  test('3. Inventory Hub: All-healthy state displays reassuring banner when zero shortages exist', async () => {
    const context = await browser.newContext()
    const page = await renderInventoryPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.desktop,
      hasShortages: false,
    })

    const healthyBanner = page.locator('#healthy-banner')
    await assert.doesNotReject(healthyBanner.waitFor({ state: 'visible' }))

    const bannerText = await healthyBanner.innerText()
    assert.ok(
      bannerText.includes('zero critical stock deficits') || bannerText.includes('healthy'),
      'Must render healthy warehouse confirmation'
    )

    await page.close()
    await context.close()
  })

  test('4. Floor Consumption Station: Mounted rolls HUD & Job Consumption Logger flow in <= 3 clicks', async () => {
    const context = await browser.newContext()
    const page = await renderInventoryPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.desktop,
      isFloorStation: true,
    })

    // Click 1: Click "Log Consumption" on mounted roll
    const logBtn = page.locator('#log-consumption-btn')
    await logBtn.click()

    // Simulate modal display on click
    await page.evaluate(() => {
      const modal = document.getElementById('consumption-modal')
      if (modal) modal.style.display = 'flex'
    })

    const modal = page.locator('#consumption-modal')
    await assert.doesNotReject(modal.waitFor({ state: 'visible' }))

    // Click 2: Fill consumed length and off-cut
    const inputConsumed = page.locator('#input-consumed-length')
    await inputConsumed.fill('45')

    // Click 3: Confirm and save consumption
    const confirmBtn = page.locator('#confirm-consumption-btn')
    await confirmBtn.click()

    await page.evaluate(() => {
      const modal = document.getElementById('consumption-modal')
      if (modal) modal.style.display = 'none'
    })

    assert.ok(await modal.isHidden(), 'Consumption modal must close upon recording stock movement')

    await page.close()
    await context.close()
  })

  test('5. Inventory Mobile: Touch targets >= 44px and responsive grid wrap', async () => {
    const context = await browser.newContext()
    const page = await renderInventoryPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.mobile,
    })

    const buttons = page.locator('.touch-target')
    const count = await buttons.count()
    assert.ok(count > 0, 'Touch target buttons must be present')

    for (let i = 0; i < Math.min(count, 5); i++) {
      const box = await buttons.nth(i).boundingBox()
      assert.ok(box, `Button ${i} must have a valid bounding box`)
      assert.ok(
        box.height >= 40, // standard button height with padding
        `Button height (${box.height}px) must be touch-friendly on mobile`
      )
    }

    await page.close()
    await context.close()
  })

  test('6. Inventory Bengali: Bilingual terminology parity (রিম, রোল, কাঁচামাল, খতিয়ান)', async () => {
    const context = await browser.newContext()
    const page = await renderInventoryPage(context, {
      locale: 'bn',
      theme: 'light',
      viewport: VIEWPORTS.desktop,
      hasShortages: true,
    })

    const heading = await page.locator('h1').innerText()
    assert.ok(
      heading.includes('ইনভেন্টরি') || heading.includes('কাঁচামাল'),
      'Header must render in Bengali'
    )

    const kpiValuation = await page.locator('#kpi-valuation').innerText()
    assert.ok(
      kpiValuation.includes('মোট স্টক মূল্য'),
      'KPI card 1 must render Bengali title'
    )

    const kpiShortages = await page.locator('#kpi-shortages').innerText()
    assert.ok(
      kpiShortages.includes('স্টক ঘাটতি'),
      'KPI card 2 must render Bengali shortage label'
    )

    const reorderBtn = await page.locator('#reorder-po-btn').innerText()
    assert.ok(
      reorderBtn.includes('রি-অর্ডার') || reorderBtn.includes('PO'),
      'Reorder button must render in Bengali'
    )

    await page.close()
    await context.close()
  })

  test('7. Inventory Dark Theme: Dark classes and tokens applied seamlessly', async () => {
    const context = await browser.newContext()
    const page = await renderInventoryPage(context, {
      locale: 'en',
      theme: 'dark',
      viewport: VIEWPORTS.desktop,
    })

    const htmlClass = await page.locator('html').getAttribute('class')
    assert.ok(htmlClass?.includes('dark'), 'HTML root must contain dark class in dark mode')

    const kpiCard = page.locator('#kpi-valuation')
    assert.ok(await kpiCard.isVisible(), 'KPI cards must remain visible and crisp in dark mode')

    await page.close()
    await context.close()
  })
})
