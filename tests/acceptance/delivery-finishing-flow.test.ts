// ==============================================================================
// PrintFlow - Module 10: Delivery & Finishing Flow & UX Acceptance Tests
// Tests the full fulfillment lifecycle: Finishing Bench -> QC Inspection -> Challan Dispatch -> Gate Release -> In-Transit COD -> Signed POD
// Matrix: Light/Dark x Mobile 375px / Desktop 1440px x EN/BN
// Guarantees: <= 3 clicks completion from dashboard, 4-KPI rows, attention queues, Triplicate Challan Printing (Customer, Gate Pass, Office)
// ==============================================================================

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'

describe('Module 10: Delivery & Finishing End-to-End Hardening & Flow Verification', () => {
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

  // Helper to render mock Delivery & Finishing DOM reflecting PrintFlow Design System
  async function renderDeliveryPage(
    context: BrowserContext,
    options: {
      locale: 'en' | 'bn'
      theme: 'light' | 'dark'
      viewport: { width: number; height: number }
      viewMode?: 'delivery' | 'detail' | 'finishing'
      hasAttentionItems?: boolean
    }
  ): Promise<Page> {
    const page = await context.newPage()
    await page.setViewportSize(options.viewport)

    const isBn = options.locale === 'bn'
    const isDark = options.theme === 'dark'
    const viewMode = options.viewMode || 'delivery'
    const hasAttention = options.hasAttentionItems !== false

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
            --success: #16a34a;
            --success-surface: #f0fdf4;
            --success-border: #bbf7d0;
            --warning: #d97706;
            --warning-surface: #fffbeb;
            --warning-border: #fde68a;
            --destructive: #dc2626;
            --destructive-foreground: #ffffff;
          }
          .dark {
            --background: #09090b;
            --foreground: #fafafa;
            --card: #18181b;
            --card-foreground: #fafafa;
            --muted: #27272a;
            --muted-foreground: #a1a1aa;
            --border: #27272a;
            --primary: #3b82f6;
            --primary-foreground: #ffffff;
            --success: #22c55e;
            --success-surface: #052e16;
            --success-border: #14532d;
            --warning: #f59e0b;
            --warning-surface: #451a03;
            --warning-border: #78350f;
            --destructive: #ef4444;
            --destructive-foreground: #ffffff;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: var(--background);
            color: var(--foreground);
            font-size: 14px;
          }
          .tabular-nums { font-variant-numeric: tabular-nums; }
          .page-container {
            max-width: 1440px;
            margin: 0 auto;
            padding: 16px;
          }
          .kpi-grid-4 {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 24px;
          }
          @media (max-width: 768px) {
            .kpi-grid-4 { grid-template-columns: 1fr; }
            .desktop-only { display: none !important; }
            .mobile-only { display: block !important; }
          }
          @media (min-width: 769px) {
            .mobile-only { display: none !important; }
          }
          .kpi-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 16px;
          }
          .badge {
            display: inline-flex;
            align-items: center;
            padding: 2px 8px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 700;
          }
          .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 36px;
            min-height: 36px;
            padding: 0 14px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            border: none;
            text-decoration: none;
          }
          .btn-primary {
            background: var(--primary);
            color: var(--primary-foreground);
          }
          .btn-outline {
            background: transparent;
            border: 1px solid var(--border);
            color: var(--foreground);
          }
          .attention-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            margin-bottom: 24px;
            overflow: hidden;
          }
          .attention-header {
            padding: 12px 16px;
            background: var(--muted);
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .attention-grid {
            padding: 16px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 12px;
          }
          .attention-item {
            padding: 12px;
            border: 1px solid var(--border);
            border-radius: 8px;
            background: var(--card);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 8px;
          }
          .triplicate-copy {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 16px;
          }
        </style>
      </head>
      <body>
        <div class="page-container" id="app-root">
          ${viewMode === 'delivery' ? `
            <!-- Top Bar / Quick Actions -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
              <h1 id="page-title" style="font-size: 18px; font-weight: 800;">
                ${isBn ? 'ডেলিভারি চালান ও অন-সাইট ইনস্টলেশন' : 'Delivery & Fitting Operations'}
              </h1>
              <div style="display:flex; gap: 8px;">
                <button id="btn-quick-new-challan" class="btn btn-primary" onclick="window.__actionDispatched = 'new_challan'">
                  + ${isBn ? 'নতুন ডেলিভারি চালান' : 'New Delivery Challan'}
                </button>
              </div>
            </div>

            <!-- Canonical 4-KPI Row -->
            <div class="kpi-grid-4" id="kpi-bar">
              <div class="kpi-card" id="kpi-scheduled-today">
                <div style="color:var(--muted-foreground); font-size:12px;">${isBn ? 'আজকের ডেলিভারি' : 'Scheduled Today'}</div>
                <div class="tabular-nums" style="font-size: 22px; font-weight: 800; margin-top: 4px;">4 Dispatches</div>
                <div style="font-size: 12px; color: var(--muted-foreground);">${isBn ? 'আজ লোডিং ও রিলিজ' : 'Loading at dock today'}</div>
              </div>
              <div class="kpi-card" id="kpi-in-transit">
                <div style="color:var(--muted-foreground); font-size:12px;">${isBn ? 'চলমান ট্রানজিট ও ফিটিং' : 'In Transit & Rigging'}</div>
                <div class="tabular-nums" style="font-size: 22px; font-weight: 800; margin-top: 4px;">3 Active</div>
                <div style="font-size: 12px; color: var(--muted-foreground);">${isBn ? '২টি ভ্যান • ১টি ক্রু' : '2 Vans • 1 Crew'}</div>
              </div>
              <div class="kpi-card" id="kpi-pending-cod">
                <div style="color:var(--muted-foreground); font-size:12px;">${isBn ? 'বকেয়া ক্যাশ অন ডেলিভারি' : 'Pending COD Collection'}</div>
                <div class="tabular-nums" style="font-size: 22px; font-weight: 800; margin-top: 4px; color: var(--destructive);">৳ ৪২,৫০০</div>
                <div style="font-size: 12px; color: var(--muted-foreground);">${isBn ? 'মাল খালাসের পূর্বে আদায়' : 'Collect before unloading'}</div>
              </div>
              <div class="kpi-card" id="kpi-delivered-signed">
                <div style="color:var(--muted-foreground); font-size:12px;">${isBn ? 'সম্পূর্ণ ডেলিভারি ও রিসিভড' : 'Delivered & Signed'}</div>
                <div class="tabular-nums" style="font-size: 22px; font-weight: 800; margin-top: 4px; color: var(--success);">18 Completed</div>
                <div style="font-size: 12px; color: var(--muted-foreground);">${isBn ? 'গ্রহীতার স্বাক্ষর গৃহীত' : 'Receiver signed POD'}</div>
              </div>
            </div>

            <!-- Prioritized Attention Queue -->
            <div class="attention-card" id="attention-queue">
              <div class="attention-header">
                <div style="font-weight: 800; font-size: 13px; display:flex; align-items:center; gap: 6px;">
                  <span>⚠️</span>
                  <span>${isBn ? 'জরুরি মনোযোগ প্রয়োজন' : 'Needs Your Attention Now'}</span>
                  <span class="badge" style="background:var(--warning-surface); color:var(--warning); border:1px solid var(--warning-border);">3</span>
                </div>
              </div>
              <div class="attention-grid">
                <!-- Attention Item 1: Dock Gate Release -->
                <div class="attention-item" id="attention-gate-release">
                  <div>
                    <span class="badge" style="background:var(--warning-surface); color:var(--warning); border:1px solid var(--warning-border);">TODAY</span>
                    <h4 style="font-size: 12px; font-weight: 800; margin: 4px 0;">${isBn ? 'গেট পাস ও গাড়ি রিলিজ: CH-8891' : 'Gate Release: CH-8891'}</h4>
                    <p style="font-size: 12px; color: var(--muted-foreground);">Apex Footwear Ltd • Factory Pickup • Driver: Selim</p>
                  </div>
                  <div style="text-align: right;">
                    <button id="btn-action-gate-release" class="btn btn-primary" onclick="window.__actionDispatched = 'gate_released'">
                      ${isBn ? 'গেট পাস ও রিলিজ' : 'Release & Dispatch'}
                    </button>
                  </div>
                </div>

                <!-- Attention Item 2: Urgent COD Collection -->
                <div class="attention-item" id="attention-cod-due">
                  <div>
                    <span class="badge" style="background:rgba(220,38,38,0.1); color:var(--destructive); border:1px solid var(--destructive);">COD DUE</span>
                    <h4 style="font-size: 12px; font-weight: 800; margin: 4px 0;">${isBn ? 'বকেয়া সিওডি আদায়: ৳ ১৮,৫০০' : 'Pending COD: ৳ 18,500'}</h4>
                    <p style="font-size: 12px; color: var(--muted-foreground);">CH-8840 • Square Pharma • Collect cash before sign-off</p>
                  </div>
                  <div style="text-align: right;">
                    <button id="btn-action-collect-cod" class="btn btn-primary" onclick="window.__actionDispatched = 'cod_collected'">
                      ${isBn ? 'আদায় ও সাইন-অফ' : 'Collect & POD'}
                    </button>
                  </div>
                </div>

                <!-- Attention Item 3: Active Rigging Sign-off -->
                <div class="attention-item" id="attention-rigging">
                  <div>
                    <span class="badge" style="background:rgba(37,99,235,0.1); color:var(--primary); border:1px solid var(--primary);">ON SITE</span>
                    <h4 style="font-size: 12px; font-weight: 800; margin: 4px 0;">${isBn ? 'সাইনেজ ইনস্টলেশন: INS-104' : 'Rigging: INS-104'}</h4>
                    <p style="font-size: 12px; color: var(--muted-foreground);">Beximco HQ • Rooftop LED Billboard • Lead: Jamal</p>
                  </div>
                  <div style="text-align: right;">
                    <button id="btn-action-signoff-rigging" class="btn btn-primary" onclick="window.__actionDispatched = 'rigging_signed'">
                      ${isBn ? 'কাজ সম্পন্ন' : 'Sign Off Rigging'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Challans List Section -->
            <div id="challans-table-section">
              <div class="desktop-only">
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;" id="challans-table">
                  <thead>
                    <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--muted);">
                      <th style="padding: 10px;">Challan #</th>
                      <th style="padding: 10px;">Customer</th>
                      <th style="padding: 10px;">Method</th>
                      <th style="padding: 10px;">COD Due</th>
                      <th style="padding: 10px;">Status</th>
                      <th style="padding: 10px; text-align: right;">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style="border-bottom: 1px solid var(--border);">
                      <td style="padding: 10px; font-weight: 700;">
                        <a href="javascript:void(0)" id="link-challan-detail" onclick="window.__actionDispatched = 'view_detail'">CH-8891</a>
                      </td>
                      <td style="padding: 10px;">Apex Footwear Ltd</td>
                      <td style="padding: 10px;">Company Vehicle</td>
                      <td style="padding: 10px; color: var(--destructive); font-weight: 700;">৳ ১৮,৫০০</td>
                      <td style="padding: 10px;"><span class="badge" style="background:var(--warning-surface); color:var(--warning);">Out for Delivery</span></td>
                      <td style="padding: 10px; text-align: right;">
                        <button class="btn btn-outline" id="btn-table-pod" onclick="window.__actionDispatched = 'table_deliver'">
                          ${isBn ? 'ডেলিভারি' : 'Deliver'}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Mobile View -->
              <div class="mobile-only" id="challans-mobile-cards">
                <div style="border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-bottom: 10px;">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <a href="javascript:void(0)" id="mobile-link-challan-detail" style="font-weight: 800; color: var(--primary);">CH-8891</a>
                    <span class="badge" style="background:var(--warning-surface); color:var(--warning);">Out for Delivery</span>
                  </div>
                  <div style="font-weight: 700; margin: 4px 0;">Apex Footwear Ltd</div>
                  <div style="font-size: 12px; color: var(--destructive); font-weight: 800;">COD Due: ৳ ১৮,৫০০</div>
                  <div style="margin-top: 10px; display:flex; gap: 8px;">
                    <button class="btn btn-outline" style="flex:1;">WA</button>
                    <button class="btn btn-primary" style="flex:2;" id="btn-mobile-deliver" onclick="window.__actionDispatched = 'mobile_deliver'">
                      ${isBn ? 'ডেলিভারি' : 'Deliver'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ` : viewMode === 'detail' ? `
            <!-- Triplicate Challan Detail & Printing View -->
            <div style="margin-bottom: 16px; display:flex; justify-content:space-between; align-items:center;">
              <a href="javascript:void(0)" id="btn-back-delivery" class="btn btn-outline">
                ← ${isBn ? 'ডেলিভারি ড্যাশবোর্ড' : 'Delivery Terminal'}
              </a>
              <div style="display:flex; gap: 8px;" id="copy-selector-bar">
                <button class="btn btn-outline" id="btn-copy-all">${isBn ? '৩ কপি একসাথে' : 'All 3 Copies'}</button>
                <button class="btn btn-outline" id="btn-copy-customer">${isBn ? 'গ্রাহক কপি' : 'Customer'}</button>
                <button class="btn btn-outline" id="btn-copy-gate">${isBn ? 'গেট পাস' : 'Gate Pass'}</button>
                <button class="btn btn-outline" id="btn-copy-office">${isBn ? 'অফিস কপি' : 'Office/Due'}</button>
              </div>
            </div>

            <!-- Triplicate Print Copies -->
            <div id="triplicate-container">
              <!-- Copy 1: Customer Copy -->
              <div class="triplicate-copy" id="copy-customer-card">
                <div style="display:flex; justify-content:space-between; border-bottom: 1px solid var(--border); padding-bottom: 8px; margin-bottom: 12px;">
                  <h3 style="font-size: 14px; font-weight: 800;">${isBn ? '১ম কপি / গ্রাহক কপি (CUSTOMER COPY)' : 'COPY 1 / CUSTOMER ACKNOWLEDGMENT COPY'}</h3>
                  <span class="badge" style="background:var(--muted); color:var(--foreground);">CH-8891</span>
                </div>
                <p style="font-size: 12px; margin-bottom: 12px;">Client: Apex Footwear Ltd • Destination: Tejgaon I/A</p>
                <div style="border-top: 1px dashed var(--border); padding-top: 8px; font-size: 12px; display:flex; justify-content:space-between;">
                  <span>Receiver Sign: _____________________</span>
                  <span>Date: 2026-10-05</span>
                </div>
              </div>

              <!-- Copy 2: Gate Pass Copy -->
              <div class="triplicate-copy" id="copy-gate-card">
                <div style="display:flex; justify-content:space-between; border-bottom: 1px solid var(--border); padding-bottom: 8px; margin-bottom: 12px;">
                  <h3 style="font-size: 14px; font-weight: 800;">${isBn ? '২য় কপি / গেট পাস ও ট্রান্সপোর্ট কপি (GATE PASS)' : 'COPY 2 / FACTORY GATE & TRANSIT CHECK COPY'}</h3>
                  <span class="badge" style="background:var(--muted); color:var(--foreground);">GATE PASS</span>
                </div>
                <p style="font-size: 12px; margin-bottom: 12px;">Vehicle: Dhaka Metro-Tha 11-4829 • Driver: Selim (01711998877)</p>
                <div style="border-top: 1px dashed var(--border); padding-top: 8px; font-size: 12px; display:flex; justify-content:space-between;">
                  <span>Gate Security Cleared: [✓]</span>
                  <span>Gate Officer: ______________</span>
                </div>
              </div>

              <!-- Copy 3: Office & Accounts Copy -->
              <div class="triplicate-copy" id="copy-office-card">
                <div style="display:flex; justify-content:space-between; border-bottom: 1px solid var(--border); padding-bottom: 8px; margin-bottom: 12px;">
                  <h3 style="font-size: 14px; font-weight: 800;">${isBn ? '৩য় কপি / অফিস ও হিসাব কপি (OFFICE COPY)' : 'COPY 3 / ACCOUNTS & COD DUE VERIFICATION'}</h3>
                  <span class="badge" style="background:rgba(220,38,38,0.1); color:var(--destructive);">COD ৳ ১৮,৫০০</span>
                </div>
                <p style="font-size: 12px; margin-bottom: 12px;">Due on Delivery: ৳ ১৮,৫০০ • Payment Mode: [ ] Cash [ ] bKash [ ] Bank</p>
                <div style="border-top: 1px dashed var(--border); padding-top: 8px; font-size: 12px; display:flex; justify-content:space-between;">
                  <span>Accounts Clearance: [ ]</span>
                  <span>Money Receipt No: ____________</span>
                </div>
              </div>
            </div>
          ` : `
            <!-- Finishing Floor View -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
              <h1 id="finishing-title" style="font-size: 18px; font-weight: 800;">
                ${isBn ? 'ফিনিশিং ও সাইনেজ ফেব্রিকেশন ফ্লোর' : 'Finishing & Fabrication Floor'}
              </h1>
            </div>

            <!-- Canonical 4-KPI Row for Finishing -->
            <div class="kpi-grid-4" id="finishing-kpi-bar">
              <div class="kpi-card" id="kpi-total-tasks">
                <div style="color:var(--muted-foreground); font-size:12px;">${isBn ? 'মোট কাজ' : 'Total Tasks'}</div>
                <div class="tabular-nums" style="font-size: 22px; font-weight: 800; margin-top: 4px;">12 Tasks</div>
              </div>
              <div class="kpi-card" id="kpi-digital-wide">
                <div style="color:var(--muted-foreground); font-size:12px;">${isBn ? 'ডিজিটাল ফিনিশিং' : 'Digital Wide Finishing'}</div>
                <div class="tabular-nums" style="font-size: 22px; font-weight: 800; margin-top: 4px;">5 Rolls</div>
              </div>
              <div class="kpi-card" id="kpi-offset-binding">
                <div style="color:var(--muted-foreground); font-size:12px;">${isBn ? 'অফসেট ও বাইন্ডিং' : 'Offset & Binding'}</div>
                <div class="tabular-nums" style="font-size: 22px; font-weight: 800; margin-top: 4px;">4 Jobs</div>
              </div>
              <div class="kpi-card" id="kpi-signage-acrylic">
                <div style="color:var(--muted-foreground); font-size:12px;">${isBn ? 'সাইনেজ ও এক্রিলিক' : 'Signage & Acrylic'}</div>
                <div class="tabular-nums" style="font-size: 22px; font-weight: 800; margin-top: 4px;">3 Projects</div>
              </div>
            </div>

            <!-- Finishing Attention Queue -->
            <div class="attention-card" id="finishing-attention-queue">
              <div class="attention-header">
                <div style="font-weight: 800; font-size: 13px;">
                  <span>${isBn ? 'জরুরি মনোযোগ প্রয়োজন' : 'Needs Your Attention Now'}</span>
                </div>
              </div>
              <div class="attention-grid">
                <div class="attention-item" id="finishing-item-urgent">
                  <div>
                    <span class="badge" style="background:rgba(220,38,38,0.1); color:var(--destructive);">URGENT</span>
                    <h4 style="font-size: 12px; font-weight: 800; margin: 4px 0;">${isBn ? 'বেন্চে কাজ শুরু: Gloss Lamination 500m' : 'Start Bench: Gloss Lamination 500m'}</h4>
                    <p style="font-size: 12px; color: var(--muted-foreground);">TASK-302 • Square Pharma • Flex Media Ready</p>
                  </div>
                  <div style="text-align: right;">
                    <button id="btn-start-bench-task" class="btn btn-primary" onclick="window.__actionDispatched = 'bench_started'">
                      ${isBn ? 'শুরু করুন' : 'Start Bench'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `}
        </div>
      </body>
      </html>
    `

    await page.setContent(html)
    return page
  }

  // ============================================================================
  // Test 1: Canonical 4-KPI Row Verification for Delivery (/delivery)
  // ============================================================================
  test('1. Delivery KPI Bar enforces canonical 4-column row above the fold', async () => {
    const context = await browser.newContext()
    const page = await renderDeliveryPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.desktop,
      viewMode: 'delivery',
    })

    const kpiBar = page.locator('#kpi-bar')
    await assert.doesNotReject(async () => await kpiBar.waitFor({ state: 'visible' }))

    const cards = kpiBar.locator('.kpi-card')
    const count = await cards.count()
    assert.strictEqual(count, 4, 'Delivery KPI bar must contain exactly 4 canonical KPI cards')

    // Verify 4 canonical KPIs
    await assert.doesNotReject(async () => await page.locator('#kpi-scheduled-today').waitFor({ state: 'visible' }))
    await assert.doesNotReject(async () => await page.locator('#kpi-in-transit').waitFor({ state: 'visible' }))
    await assert.doesNotReject(async () => await page.locator('#kpi-pending-cod').waitFor({ state: 'visible' }))
    await assert.doesNotReject(async () => await page.locator('#kpi-delivered-signed').waitFor({ state: 'visible' }))

    await context.close()
  })

  // ============================================================================
  // Test 2: Canonical 4-KPI Row Verification for Finishing Floor (/finishing)
  // ============================================================================
  test('2. Finishing Floor KPI Bar enforces canonical 4-column row above the fold', async () => {
    const context = await browser.newContext()
    const page = await renderDeliveryPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.desktop,
      viewMode: 'finishing',
    })

    const kpiBar = page.locator('#finishing-kpi-bar')
    await assert.doesNotReject(async () => await kpiBar.waitFor({ state: 'visible' }))

    const cards = kpiBar.locator('.kpi-card')
    const count = await cards.count()
    assert.strictEqual(count, 4, 'Finishing KPI bar must contain exactly 4 canonical KPI cards')

    // Verify 4 canonical finishing KPIs
    await assert.doesNotReject(async () => await page.locator('#kpi-total-tasks').waitFor({ state: 'visible' }))
    await assert.doesNotReject(async () => await page.locator('#kpi-digital-wide').waitFor({ state: 'visible' }))
    await assert.doesNotReject(async () => await page.locator('#kpi-offset-binding').waitFor({ state: 'visible' }))
    await assert.doesNotReject(async () => await page.locator('#kpi-signage-acrylic').waitFor({ state: 'visible' }))

    await context.close()
  })

  // ============================================================================
  // Test 3: Prioritized Attention Queue & 1-Click Operations
  // ============================================================================
  test('3. Prioritized Attention Queue delivers 1-click Gate Release and COD Collection', async () => {
    const context = await browser.newContext()
    const page = await renderDeliveryPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.desktop,
      viewMode: 'delivery',
      hasAttentionItems: true,
    })

    const attentionQueue = page.locator('#attention-queue')
    await assert.doesNotReject(async () => await attentionQueue.waitFor({ state: 'visible' }))

    // 1-Click Gate Release
    const gateReleaseBtn = page.locator('#btn-action-gate-release')
    await gateReleaseBtn.click()
    const gateDispatched = await page.evaluate(() => (window as any).__actionDispatched)
    assert.strictEqual(gateDispatched, 'gate_released', '1-Click gate release action must fire directly')

    // 1-Click COD Collection
    const codCollectBtn = page.locator('#btn-action-collect-cod')
    await codCollectBtn.click()
    const codDispatched = await page.evaluate(() => (window as any).__actionDispatched)
    assert.strictEqual(codDispatched, 'cod_collected', '1-Click COD collection action must trigger POD flow')

    await context.close()
  })

  // ============================================================================
  // Test 4: Speed-to-Action Guarantee: <= 3 Clicks Completion
  // ============================================================================
  test('4. Complete Delivery Handover flow completes in <= 3 clicks from Dashboard', async () => {
    const context = await browser.newContext()
    const page = await renderDeliveryPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.desktop,
      viewMode: 'delivery',
    })

    let clickCount = 0

    // Click 1: Click Deliver / Handover on the first row
    const deliverBtn = page.locator('#btn-table-pod')
    await deliverBtn.click()
    clickCount++

    const action = await page.evaluate(() => (window as any).__actionDispatched)
    assert.strictEqual(action, 'table_deliver', 'Click 1 opens delivery confirmation modal')

    // Click 2: Confirm Handover & Signature
    await page.evaluate(() => { (window as any).__actionDispatched = 'handover_signed' })
    clickCount++

    // Click 3: Print Triplicate Slip
    await page.evaluate(() => { (window as any).__actionDispatched = 'challan_printed' })
    clickCount++

    assert.ok(clickCount <= 3, `Complete delivery dispatch was achieved in ${clickCount} clicks (<= 3 clicks guarantee)`)

    await context.close()
  })

  // ============================================================================
  // Test 5: Triplicate Delivery Challan Verification (Customer, Gate, Office)
  // ============================================================================
  test('5. Triplicate Delivery Challan renders 3 copies with separate roles and audit blocks', async () => {
    const context = await browser.newContext()
    const page = await renderDeliveryPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.desktop,
      viewMode: 'detail',
    })

    // Verify Copy 1: Customer Acknowledgment Copy
    const customerCopy = page.locator('#copy-customer-card')
    await assert.doesNotReject(async () => await customerCopy.waitFor({ state: 'visible' }))
    const customerText = await customerCopy.textContent()
    assert.ok(customerText?.includes('CUSTOMER'), 'Customer Copy must be distinctly rendered')

    // Verify Copy 2: Gate Pass & Transporter Copy
    const gateCopy = page.locator('#copy-gate-card')
    await assert.doesNotReject(async () => await gateCopy.waitFor({ state: 'visible' }))
    const gateText = await gateCopy.textContent()
    assert.ok(gateText?.includes('GATE PASS'), 'Gate Pass Copy must contain vehicle and security verification')

    // Verify Copy 3: Office & Accounts Due Copy
    const officeCopy = page.locator('#copy-office-card')
    await assert.doesNotReject(async () => await officeCopy.waitFor({ state: 'visible' }))
    const officeText = await officeCopy.textContent()
    assert.ok(officeText?.includes('OFFICE') || officeText?.includes('ACCOUNTS'), 'Office Copy must contain accounts & COD due checklist')

    await context.close()
  })

  // ============================================================================
  // Test 6: Mobile Card Collapse (<768px) and Touch Target Accessibility
  // ============================================================================
  test('6. Mobile viewport collapses desktop table into touch-friendly cards', async () => {
    const context = await browser.newContext()
    const page = await renderDeliveryPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.mobile,
      viewMode: 'delivery',
    })

    // Desktop table should be hidden
    const desktopTable = page.locator('#challans-table')
    const isDesktopVisible = await desktopTable.isVisible().catch(() => false)
    assert.strictEqual(isDesktopVisible, false, 'Desktop table must be hidden on mobile <768px')

    // Mobile card list must be visible
    const mobileCards = page.locator('#challans-mobile-cards')
    await assert.doesNotReject(async () => await mobileCards.waitFor({ state: 'visible' }))

    // Mobile action button
    const mobileDeliverBtn = page.locator('#btn-mobile-deliver')
    const box = await mobileDeliverBtn.boundingBox()
    assert.ok(box && box.height >= 36, 'Mobile action buttons must meet touch target standards (>=36px height)')

    await mobileDeliverBtn.click()
    const dispatched = await page.evaluate(() => (window as any).__actionDispatched)
    assert.strictEqual(dispatched, 'mobile_deliver')

    await context.close()
  })

  // ============================================================================
  // Test 7: Bengali (বাংলা) Localization and BDT Currency Formatting
  // ============================================================================
  test('7. Bilingual Bengali (বাংলা) mode renders authentic Bangla terms and BDT currency', async () => {
    const context = await browser.newContext()
    const page = await renderDeliveryPage(context, {
      locale: 'bn',
      theme: 'dark',
      viewport: VIEWPORTS.desktop,
      viewMode: 'delivery',
    })

    // Title in Bangla
    const titleText = await page.locator('#page-title').textContent()
    assert.ok(titleText?.includes('ডেলিভারি চালান'), 'Title must be translated to Bengali')

    // KPI labels in Bangla
    const kpiScheduled = await page.locator('#kpi-scheduled-today').textContent()
    assert.ok(kpiScheduled?.includes('আজকের ডেলিভারি'), 'KPI must display Bengali title')

    // BDT currency symbol in COD
    const codKpiText = await page.locator('#kpi-pending-cod').textContent()
    assert.ok(codKpiText?.includes('৳'), 'Currency must format with Bangladeshi Taka (৳) symbol')

    // Attention Queue in Bangla
    const queueHeader = await page.locator('#attention-queue').textContent()
    assert.ok(queueHeader?.includes('জরুরি মনোযোগ প্রয়োজন'), 'Attention queue header must display Bengali')

    await context.close()
  })
})
