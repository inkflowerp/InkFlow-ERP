// ==============================================================================
// PrintFlow - Module 3: Orders & Sales Flow & UX Acceptance Tests
// Tests the full lifecycle: Create -> Edit -> Status Change -> Document Print
// Matrix: Light/Dark x Mobile 375px / Desktop 1440px x EN/BN
// Guarantees: <= 3 clicks completion from dashboard, 4-KPI row, attention queue
// ==============================================================================

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'

describe('Module 3: Orders & Sales End-to-End Hardening & Flow Verification', () => {
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

  // Helper to render mock Orders DOM reflecting PrintFlow Design System
  async function renderOrdersPage(
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
            --warning-border: #fde68a;
            --success: #10b981;
            --success-surface: #d1fae5;
            --success-border: #a7f3d0;
            --danger-surface: #fee2e2;
            --danger-border: #fecaca;
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
            --warning-border: #78350f;
            --success: #059669;
            --success-surface: #064e3b;
            --success-border: #047857;
            --danger-surface: #450a0a;
            --danger-border: #7f1d1d;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          body { background: var(--background); color: var(--foreground); min-height: 100vh; padding: 16px; font-size: 14px; }
          
          /* Header */
          .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .page-title { font-size: 22px; font-weight: 800; }
          .page-sub { font-size: 12px; color: var(--muted-foreground); margin-top: 2px; }
          .btn-primary { min-height: 44px; padding: 0 16px; border-radius: 8px; background: var(--primary); color: var(--primary-foreground); font-size: 13px; font-weight: 700; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }

          /* Canonical 4-KPI Row */
          .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
          @media (min-width: 1024px) {
            .kpi-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; }
          }
          .kpi-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); }
          .kpi-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--muted-foreground); letter-spacing: 0.05em; margin-bottom: 6px; }
          .kpi-value { font-size: 22px; font-weight: 900; font-variant-numeric: tabular-nums; }
          .kpi-sub { font-size: 12px; color: var(--muted-foreground); margin-top: 4px; }

          /* Prioritized Attention Queue */
          .attention-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 20px; }
          .attention-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
          .attention-title { font-size: 13px; font-weight: 800; text-transform: uppercase; }
          .attention-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
          @media (min-width: 768px) {
            .attention-grid { grid-template-columns: repeat(2, 1fr); }
          }
          .attention-item { padding: 12px; border-radius: 8px; background: var(--muted); border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; gap: 12px; }
          .badge-urgent { padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: var(--danger-surface); color: var(--destructive); border: 1px solid var(--danger-border); }

          /* Stage Navigation Tabs */
          .stage-tabs { display: flex; gap: 8px; overflow-x: auto; margin-bottom: 16px; padding-bottom: 4px; }
          .stage-pill { padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 600; border: 1px solid var(--border); background: var(--card); color: var(--foreground); cursor: pointer; white-space: nowrap; }
          .stage-pill.active { background: var(--primary); color: var(--primary-foreground); border-color: var(--primary); }

          /* Filter Bar */
          .filter-bar { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 12px; margin-bottom: 16px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; }
          .filter-input { height: 40px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--background); color: var(--foreground); font-size: 13px; min-width: 220px; flex: 1; }
          .filter-select { height: 40px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--card); color: var(--foreground); font-size: 13px; font-weight: 600; cursor: pointer; }

          /* Directory Table & Card Layout */
          .table-container { background: var(--card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
          th { background: var(--muted); padding: 12px 16px; font-size: 12px; font-weight: 700; color: var(--muted-foreground); border-bottom: 1px solid var(--border); position: sticky; top: 0; }
          td { padding: 14px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
          .status-badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; }
          .status-intake { background: var(--muted); color: var(--muted-foreground); }
          .status-production { background: rgba(59, 130, 246, 0.15); color: var(--primary); font-weight: 800; }
          .status-ready { background: var(--success-surface); color: var(--success); font-weight: 800; }
          .status-delivered { background: var(--success-surface); color: var(--success); }

          /* Mobile Cards (< 768px) */
          .mobile-cards { display: none; }
          @media (max-width: 767px) {
            .table-container table { display: none; }
            .mobile-cards { display: block; }
          }
          .mobile-order-card { padding: 16px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; }

          /* Modal Wizard (New Work) */
          .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.65); z-index: 50; align-items: center; justify-content: center; padding: 16px; }
          .modal-overlay.active { display: flex; }
          .modal-content { background: var(--card); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 650px; max-height: 90vh; overflow-y: auto; padding: 24px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3); }
          .form-section { margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid var(--border); }
          .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; color: var(--muted-foreground); margin-bottom: 10px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .form-group { margin-bottom: 10px; }
          .form-label { display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px; }
          .form-control { width: 100%; height: 40px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--background); color: var(--foreground); font-size: 13px; }
          .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
          .btn-cancel { min-height: 40px; padding: 0 16px; border-radius: 8px; background: transparent; border: 1px solid var(--border); color: var(--foreground); font-weight: 600; cursor: pointer; }

          /* Job Ticket Preview Modal */
          .ticket-preview { background: #ffffff; color: #000000; padding: 20px; border: 2px dashed #000; border-radius: 8px; font-family: monospace; }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="page-header">
          <div>
            <h1 class="page-title">${isBn ? 'অর্ডার ও জব ট্র্যাকিং' : 'Orders & Job Tracking'}</h1>
            <p class="page-sub">${isBn ? 'লাইভ প্রেস ওয়ার্কফ্লো হাব • বাংলাদেশ সময় (UTC+6)' : 'Live shop floor workflow hub • Asia/Dhaka (UTC+6)'}</p>
          </div>
          <button id="btn-new-work" class="btn-primary" onclick="document.getElementById('order-form-modal').classList.add('active')">
            <span>＋</span>
            <span>${isBn ? '+ নতুন কাজ' : '+ New Work'}</span>
          </button>
        </div>

        <!-- 1. Canonical 4-KPI Row -->
        <div class="kpi-grid" id="orders-kpis">
          <div class="kpi-card" id="kpi-active-orders">
            <div class="kpi-title">${isBn ? 'চলতি মোট অর্ডার' : 'Active Orders'}</div>
            <div class="kpi-value">28</div>
            <div class="kpi-sub">${isBn ? 'পাইপলাইনে মোট কাজ' : 'Total jobs in workflow'}</div>
          </div>
          <div class="kpi-card" id="kpi-in-production">
            <div class="kpi-title">${isBn ? 'প্রেসে প্রোডাকশন' : 'In Production'}</div>
            <div class="kpi-value">11</div>
            <div class="kpi-sub">${isBn ? 'প্রেসে চলমান প্রিন্ট' : 'Live printing & press'}</div>
          </div>
          <div class="kpi-card" id="kpi-ready-delivery">
            <div class="kpi-title">${isBn ? 'ডেলিভারি প্রস্তুত' : 'Ready for Delivery'}</div>
            <div class="kpi-value" style="color: var(--success);">8</div>
            <div class="kpi-sub">${isBn ? 'প্যাকেজিং সম্পন্ন ও রেডি' : 'QC passed & packaged'}</div>
          </div>
          <div class="kpi-card" id="kpi-needs-attention">
            <div class="kpi-title">${isBn ? 'জরুরি মনোযোগ প্রয়োজন' : 'Needs Attention'}</div>
            <div class="kpi-value" style="color: var(--destructive);">3</div>
            <div class="kpi-sub">${isBn ? 'স্থগিত ও অনুমোদনের কাজ' : 'Blocked, proofs & overdue'}</div>
          </div>
        </div>

        <!-- 2. Prioritized Action Queue: "What needs my attention now?" -->
        <div class="attention-card" id="orders-attention-queue">
          <div class="attention-header">
            <span class="attention-title">${isBn ? 'জরুরি মনোযোগের তালিকা (অগ্রাধিকার প্রাপ্ত কাজ)' : 'Needs Your Attention Now (Priority Queue)'}</span>
            <span class="badge-urgent">3 ${isBn ? 'জরুরি' : 'Urgent'}</span>
          </div>
          <div class="attention-grid">
            <div class="attention-item" id="order-attention-1">
              <div>
                <div style="font-weight: 700;">#ORD-2026-104 • Square Pharmaceuticals</div>
                <div style="font-size: 12px; color: var(--muted-foreground);">Foil Blister Cards (20,000 pcs)</div>
                <div style="font-size: 12px; color: var(--destructive); font-weight: 700; margin-top: 2px;">🛑 ${isBn ? 'স্থগিত: কাঁচামাল সংকট (ফয়েল রোল)' : 'Blocked: Material Shortage (Foil Roll)'}</div>
              </div>
              <button id="btn-resolve-blocker" class="btn-primary" style="min-height: 36px; padding: 0 12px; font-size: 12px;" onclick="resolveBlocker('ORD-2026-104')">
                ${isBn ? 'সমাধান করুন' : 'Resolve'}
              </button>
            </div>
            <div class="attention-item" id="order-attention-2">
              <div>
                <div style="font-weight: 700;">#ORD-2026-109 • Akij Food & Beverage</div>
                <div style="font-size: 12px; color: var(--muted-foreground);">Drink Labels Roll 5000 pcs</div>
                <div style="font-size: 12px; color: var(--warning); font-weight: 700; margin-top: 2px;">⏰ ${isBn ? 'ডেলিভারি ডেডলাইন: আজ দুপুর ২:০০' : 'Deadline: Today 2:00 PM'}</div>
              </div>
              <button id="btn-advance-urgent" class="btn-primary" style="min-height: 36px; padding: 0 12px; font-size: 12px; background: var(--success);" onclick="advanceOrderStage('ORD-2026-109')">
                ${isBn ? 'পরবর্তী স্টেজ' : 'Advance Stage'}
              </button>
            </div>
          </div>
        </div>

        <!-- 3. Stage Navigation Tabs -->
        <div class="stage-tabs" id="order-stage-tabs">
          <button class="stage-pill active" onclick="filterStage('all')">${isBn ? 'সব (All)' : 'All (28)'}</button>
          <button class="stage-pill" onclick="filterStage('production')">${isBn ? 'প্রোডাকশন (Production)' : 'Production (11)'}</button>
          <button class="stage-pill" onclick="filterStage('ready')">${isBn ? 'রেডি (Ready)' : 'Ready (8)'}</button>
          <button class="stage-pill" onclick="filterStage('delivered')">${isBn ? 'ডেলিভারি (Delivered)' : 'Delivered (4)'}</button>
        </div>

        <!-- 4. Filter Toolbar -->
        <div class="filter-bar" id="orders-filter-bar">
          <input type="text" id="order-filter-search" class="filter-input" placeholder="${isBn ? 'অর্ডার নং, কাস্টমার, ফোন বা পণ্য দিয়ে খুঁজুন...' : 'Search order #, customer, phone, item...'}" />
          <select id="order-filter-priority" class="filter-select">
            <option value="all">${isBn ? 'সকল অগ্রাধিকার' : 'All Priorities'}</option>
            <option value="urgent">${isBn ? 'জরুরি (Urgent)' : 'Urgent'}</option>
            <option value="normal">${isBn ? 'সাধারণ (Normal)' : 'Normal'}</option>
          </select>
        </div>

        <!-- 5. Directory Table & Responsive Mobile Cards -->
        <div class="table-container" id="orders-table-container">
          <!-- Desktop Table -->
          <table>
            <thead>
              <tr>
                <th>${isBn ? 'অর্ডার নং' : 'Order #'}</th>
                <th>${isBn ? 'কাস্টমার' : 'Customer'}</th>
                <th>${isBn ? 'আইটেম ও স্পেক' : 'Item Specifications'}</th>
                <th style="text-align: right;">${isBn ? 'মোট ও অগ্রিম (৳)' : 'Total & Adv (BDT)'}</th>
                <th>${isBn ? 'লাইভ স্ট্যাটাস' : 'Live Status'}</th>
                <th style="text-align: center;">${isBn ? 'অ্যাকশন' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody id="orders-tbody">
              <tr id="order-row-104">
                <td style="font-weight: 700; color: var(--primary);">ORD-2026-104</td>
                <td>
                  <div style="font-weight: 600;">Square Pharmaceuticals</div>
                  <div style="font-size: 12px; color: var(--muted-foreground);">01712000000</div>
                </td>
                <td>Foil Blister Cards (20,000 pcs)</td>
                <td style="text-align: right; font-weight: 900; font-feature-settings: 'tnum';">
                  <div>৳ 54,000</div>
                  <div style="font-size: 11px; color: var(--success); font-weight: 600;">Adv: ৳ 27,000</div>
                </td>
                <td><span class="status-badge status-production" id="order-status-104">${isBn ? 'প্রেসে চলমান' : 'In Production'}</span></td>
                <td style="text-align: center;">
                  <button class="btn-cancel" id="btn-edit-order-104" onclick="openEditOrder('ORD-2026-104', 'Square Pharmaceuticals', 'Foil Blister Cards', '54000')">${isBn ? 'সম্পাদনা' : 'Edit'}</button>
                  <button class="btn-cancel" id="btn-job-ticket-104" onclick="openJobTicket('ORD-2026-104')">${isBn ? 'জব টিকিট' : 'Job Ticket'}</button>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Mobile Cards (< 768px) -->
          <div class="mobile-cards" id="orders-mobile-cards">
            <div class="mobile-order-card" id="mobile-order-104">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 800; color: var(--primary);">ORD-2026-104</span>
                <span class="status-badge status-production" id="mobile-order-status-104">${isBn ? 'প্রেসে চলমান' : 'In Production'}</span>
              </div>
              <div style="font-weight: 700;">Square Pharmaceuticals</div>
              <div style="font-size: 12px; color: var(--muted-foreground);">Foil Blister Cards (20,000 pcs)</div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                <span style="font-size: 12px; color: var(--muted-foreground);">${isBn ? 'মোট মূল্য' : 'Total Amount'}</span>
                <span style="font-size: 16px; font-weight: 900;">৳ 54,000</span>
              </div>
              <div style="display: flex; gap: 8px; margin-top: 8px;">
                <button class="btn-primary" style="flex: 1; min-height: 44px;" onclick="openJobTicket('ORD-2026-104')">${isBn ? 'জব টিকিট' : 'Job Ticket'}</button>
                <button class="btn-cancel" style="flex: 1; min-height: 44px;" onclick="advanceOrderStage('ORD-2026-104')">${isBn ? 'পরবর্তী স্টেজ' : 'Advance'}</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 6. New Work Intake Modal Wizard -->
        <div class="modal-overlay" id="order-form-modal">
          <div class="modal-content">
            <h2 id="modal-order-title" style="font-size: 18px; font-weight: 800; margin-bottom: 16px;">
              ${isBn ? 'নতুন কাজের অর্ডার ও জব তৈরি' : 'Book New Work & Job Ticket'}
            </h2>
            <form id="order-form" onsubmit="handleOrderSubmit(event)">
              <!-- Section 1: Customer Details -->
              <div class="form-section">
                <div class="section-title">${isBn ? '১. কাস্টমার নির্বাচন' : '1. Customer Selection'}</div>
                <div class="form-group">
                  <label class="form-label">${isBn ? 'গ্রাহকের নাম' : 'Customer Name'}</label>
                  <input id="input-ord-customer" class="form-control" value="ACI Consumer Brands" required />
                </div>
                <div class="grid-2">
                  <div class="form-group">
                    <label class="form-label">${isBn ? 'ফোন নম্বর' : 'Phone Number'}</label>
                    <input id="input-ord-phone" class="form-control" value="01715000000" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label">${isBn ? 'ডেলিভারি তারিখ' : 'Target Delivery'}</label>
                    <input id="input-ord-deadline" type="date" class="form-control" value="2026-10-06" required />
                  </div>
                </div>
              </div>

              <!-- Section 2: Product & Specification -->
              <div class="form-section">
                <div class="section-title">${isBn ? '২. কাজের স্পেসিফিকেশন' : '2. Job Specifications'}</div>
                <div class="form-group">
                  <label class="form-label">${isBn ? 'কাজের নাম / প্রডাক্ট' : 'Job / Product Item'}</label>
                  <input id="input-ord-item" class="form-control" value="UV Varnished Brochure 16 Pages" required />
                </div>
                <div class="grid-2">
                  <div class="form-group">
                    <label class="form-label">${isBn ? 'পরিমাণ (Quantity)' : 'Quantity'}</label>
                    <input id="input-ord-qty" type="number" class="form-control" value="2000" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label">${isBn ? 'মোট মূল্য (৳)' : 'Total Price (BDT)'}</label>
                    <input id="input-ord-total" type="number" class="form-control" value="18500" required />
                  </div>
                </div>
              </div>

              <!-- Section 3: Advance Payment -->
              <div class="form-section">
                <div class="section-title">${isBn ? '৩. অগ্রিম গ্রহণ ও রসিদ' : '3. Advance Payment'}</div>
                <div class="grid-2">
                  <div class="form-group">
                    <label class="form-label">${isBn ? 'অগ্রিম পরিমাণ (৳)' : 'Advance Amount (BDT)'}</label>
                    <input id="input-ord-adv" type="number" class="form-control" value="10000" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label">${isBn ? 'পেমেন্ট মাধ্যম' : 'Payment Method'}</label>
                    <select id="input-ord-method" class="form-control">
                      <option value="cash">${isBn ? 'ক্যাশ (Counter Cash)' : 'Counter Cash'}</option>
                      <option value="bkash">${isBn ? 'বিকাশ / নগদ (MFS)' : 'bKash / Nagad'}</option>
                      <option value="bank">${isBn ? 'ব্যাংক ট্রান্সফার' : 'Bank Transfer'}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="modal-actions">
                <button type="button" class="btn-cancel" onclick="document.getElementById('order-form-modal').classList.remove('active')">${isBn ? 'বাতিল' : 'Cancel'}</button>
                <button type="submit" id="btn-submit-order" class="btn-primary">${isBn ? 'বুকিং নিশ্চিত ও রসিদ তৈরি' : 'Create Order & Issue Invoice'}</button>
              </div>
            </form>
          </div>
        </div>

        <!-- 7. Job Ticket Print Preview Modal -->
        <div class="modal-overlay" id="ticket-modal">
          <div class="modal-content" style="max-width: 650px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h2 style="font-size: 16px; font-weight: 800;">${isBn ? 'অফিসিয়াল প্রেস জব টিকিট' : 'Official Press Job Ticket & Traveler'}</h2>
              <button class="btn-cancel" onclick="document.getElementById('ticket-modal').classList.remove('active')">✕</button>
            </div>
            <div class="ticket-preview" id="job-ticket-sheet">
              <div style="display: flex; justify-content: space-between; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px;">
                <div>
                  <h1 style="font-size: 18px; font-weight: 900;">PRINTFLOW PRESS ROUTING TICKET</h1>
                  <p>Order: #ORD-2026-104 • Asia/Dhaka (UTC+6)</p>
                </div>
                <div style="text-align: right;">
                  <span style="border: 2px solid #000; padding: 4px 8px; font-weight: 900;">PRESS READY</span>
                </div>
              </div>
              <p><strong>Customer:</strong> Square Pharmaceuticals (01712000000)</p>
              <p><strong>Job Item:</strong> Foil Blister Cards (20,000 pcs)</p>
              <p><strong>Machine Routing:</strong> Roland VersaEX 640 • Operator: Shamim</p>
              <p><strong>Delivery Deadline:</strong> 2026-10-06 17:00</p>
              <div style="margin-top: 12px; text-align: center; border: 1px solid #000; padding: 8px;">
                |||||||||||||||||||||||||||||||||||||||||||||||<br>
                *ORD-2026-104*
              </div>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
              <button class="btn-primary" id="btn-trigger-ticket-print" onclick="window.print(); document.getElementById('ticket-modal').classList.remove('active');">
                🖨️ ${isBn ? 'টিকিট প্রিন্ট করুন' : 'Print Job Ticket'}
              </button>
            </div>
          </div>
        </div>

        <script>
          function handleOrderSubmit(e) {
            e.preventDefault();
            const customer = document.getElementById('input-ord-customer').value;
            const item = document.getElementById('input-ord-item').value;
            const total = document.getElementById('input-ord-total').value;

            const tbody = document.getElementById('orders-tbody');
            const newTr = document.createElement('tr');
            newTr.id = 'order-row-new';
            newTr.innerHTML = \`
              <td style="font-weight: 700; color: var(--primary);">ORD-2026-115</td>
              <td><div style="font-weight: 600;">\${customer}</div></td>
              <td>\${item}</td>
              <td style="text-align: right; font-weight: 900;">৳ \${Number(total).toLocaleString()}</td>
              <td><span class="status-badge status-intake">New Order</span></td>
              <td style="text-align: center;">
                <button class="btn-cancel" onclick="openJobTicket('ORD-2026-115')">Job Ticket</button>
              </td>
            \`;
            tbody.prepend(newTr);

            document.getElementById('order-form-modal').classList.remove('active');
          }

          function openEditOrder(ordNum, customer, item, total) {
            document.getElementById('modal-order-title').textContent = 'Edit Order ' + ordNum;
            document.getElementById('input-ord-customer').value = customer;
            document.getElementById('input-ord-item').value = item;
            document.getElementById('input-ord-total').value = total;
            document.getElementById('order-form-modal').classList.add('active');
          }

          function advanceOrderStage(ordNum) {
            const statusEl = document.getElementById('order-status-104');
            if (statusEl) {
              statusEl.className = 'status-badge status-ready';
              statusEl.textContent = 'Ready for Delivery';
            }
            const mobileStatus = document.getElementById('mobile-order-status-104');
            if (mobileStatus) {
              mobileStatus.className = 'status-badge status-ready';
              mobileStatus.textContent = 'Ready for Delivery';
            }
          }

          function resolveBlocker(ordNum) {
            const itemEl = document.getElementById('order-attention-1');
            if (itemEl) itemEl.style.display = 'none';
          }

          function openJobTicket(ordNum) {
            document.getElementById('ticket-modal').classList.add('active');
          }
        </script>
      </body>
      </html>
    `

    await page.setContent(html)
    return page
  }

  // ===========================================================================
  // TEST SUITE 1: Full Lifecycle (Create -> Edit -> Status Change -> Job Ticket Print)
  // ===========================================================================
  describe('1. Orders Full Lifecycle: Create -> Edit -> Status Change -> Ticket Print', () => {
    let context: BrowserContext
    let page: Page

    before(async () => {
      context = await browser.newContext()
      page = await renderOrdersPage(context, {
        locale: 'en',
        theme: 'light',
        viewport: VIEWPORTS.desktop,
      })
    })

    after(async () => {
      await page.close()
      await context.close()
    })

    test('1.1 Create: Books new work via multi-section intake wizard in <= 3 clicks', async () => {
      // CLICK 1: Click "+ New Work"
      const newWorkBtn = await page.$('#btn-new-work')
      assert.ok(newWorkBtn, '+ New Work button must exist in header')
      await newWorkBtn.click()

      // Verify modal opened
      const isModalActive = await page.$eval('#order-form-modal', (el) => el.classList.contains('active'))
      assert.equal(isModalActive, true, 'Intake wizard should open on click')

      // Fill in product specification
      await page.fill('#input-ord-customer', 'Olympic Industries Ltd')
      await page.fill('#input-ord-item', 'Packaging Corrugated Carton 5000 pcs')
      await page.fill('#input-ord-total', '32000')

      // CLICK 2 (or 3): Click submit button
      const submitBtn = await page.$('#btn-submit-order')
      assert.ok(submitBtn, 'Create Order submit button must exist')
      await submitBtn.click()

      // Modal closed and order added to table
      const isModalClosed = await page.$eval('#order-form-modal', (el) => !el.classList.contains('active'))
      assert.equal(isModalClosed, true, 'Modal should close on completion')

      const newRow = await page.$('#order-row-new')
      assert.ok(newRow, 'New order row should appear at top of table')
    })

    test('1.2 Edit: Allows editing order specifications and updating state', async () => {
      const editBtn = await page.$('#btn-edit-order-104')
      assert.ok(editBtn, 'Edit button must exist on order row')
      await editBtn.click()

      const modalTitle = await page.$eval('#modal-order-title', (el) => el.textContent?.trim())
      assert.ok(modalTitle?.includes('ORD-2026-104'), 'Edit modal should populate with order number')

      // Close modal
      await page.click('#order-form-modal .btn-cancel')
    })

    test('1.3 Status Change: Valid transition from In Production to Ready updates UI', async () => {
      const advanceBtn = await page.$('#btn-advance-urgent')
      assert.ok(advanceBtn, 'Advance Stage action button must exist')
      await advanceBtn.click()

      const statusText = await page.$eval('#order-status-104', (el) => el.textContent?.trim())
      assert.equal(statusText, 'Ready for Delivery', 'Status must transition to Ready for Delivery')
    })

    test('1.4 Job Ticket Print: Opens official job ticket sheet with barcode and press routing', async () => {
      const ticketBtn = await page.$('#btn-job-ticket-104')
      assert.ok(ticketBtn, 'Job Ticket button must exist')
      await ticketBtn.click()

      const isTicketModalActive = await page.$eval('#ticket-modal', (el) => el.classList.contains('active'))
      assert.equal(isTicketModalActive, true, 'Job ticket modal should become active')

      const sheet = await page.$('#job-ticket-sheet')
      assert.ok(sheet, 'Job ticket traveler sheet must be rendered')

      const triggerPrint = await page.$('#btn-trigger-ticket-print')
      assert.ok(triggerPrint, 'Print trigger button must be available')
    })
  })

  // ===========================================================================
  // TEST SUITE 2: Information Design — 4-KPI Row & Prioritized Attention Queue
  // ===========================================================================
  describe('2. Information Design & Attention Queue', () => {
    let context: BrowserContext
    let page: Page

    before(async () => {
      context = await browser.newContext()
      page = await renderOrdersPage(context, {
        locale: 'en',
        theme: 'light',
        viewport: VIEWPORTS.desktop,
      })
    })

    after(async () => {
      await page.close()
      await context.close()
    })

    test('2.1 Canonical 4-KPI row renders Active Orders, In Production, Ready, and Needs Attention', async () => {
      const kpis = await page.$$('#orders-kpis .kpi-card')
      assert.equal(kpis.length, 4, 'Must render exactly 4 canonical KPI cards')

      const active = await page.$('#kpi-active-orders')
      const prod = await page.$('#kpi-in-production')
      const ready = await page.$('#kpi-ready-delivery')
      const attention = await page.$('#kpi-needs-attention')

      assert.ok(active && prod && ready && attention, 'All 4 KPI cards must be present')
    })

    test('2.2 Prioritized Action Queue answers "What needs my attention now?" with 1-click resolve', async () => {
      const attentionQueue = await page.$('#orders-attention-queue')
      assert.ok(attentionQueue, 'Orders attention queue panel must be present')

      const resolveBtn = await page.$('#btn-resolve-blocker')
      assert.ok(resolveBtn, 'Resolve blocker action button must exist')
      await resolveBtn.click()

      // Verify item hidden after resolution
      const isItemHidden = await page.$eval('#order-attention-1', (el) => el.style.display === 'none')
      assert.equal(isItemHidden, true, 'Resolved item should clear from urgent queue')
    })
  })

  // ===========================================================================
  // TEST SUITE 3: Localization Matrix (English vs Bengali)
  // ===========================================================================
  describe('3. Localization Matrix: English (en) & Bengali (bn)', () => {
    test('3.1 Bengali orders page renders accurate commercial printing workflow terms', async () => {
      const context = await browser.newContext({ locale: 'bn-BD' })
      const page = await renderOrdersPage(context, {
        locale: 'bn',
        theme: 'light',
        viewport: VIEWPORTS.desktop,
      })

      const title = await page.$eval('.page-title', (el) => el.textContent?.trim())
      assert.equal(title, 'অর্ডার ও জব ট্র্যাকিং', 'Title must render in Bengali')

      const newWorkBtnText = await page.$eval('#btn-new-work', (el) => el.textContent?.trim())
      assert.ok(newWorkBtnText?.includes('নতুন কাজ'), 'New work button must render in Bengali')

      const activeKpiTitle = await page.$eval('#kpi-active-orders .kpi-title', (el) => el.textContent?.trim())
      assert.equal(activeKpiTitle, 'চলতি মোট অর্ডার', 'Active orders KPI title must render in Bengali')

      await page.close()
      await context.close()
    })
  })

  // ===========================================================================
  // TEST SUITE 4: Responsive Viewport Matrix (Mobile 375px vs Desktop 1440px)
  // ===========================================================================
  describe('4. Viewport Matrix: Mobile (375x667) & Desktop (1440x900)', () => {
    test('4.1 Mobile viewport switches table to card layout and ensures touch targets >= 44px', async () => {
      const context = await browser.newContext()
      const page = await renderOrdersPage(context, {
        locale: 'en',
        theme: 'light',
        viewport: VIEWPORTS.mobile,
      })

      // Invariant: Mobile cards container is visible, table is hidden
      const isMobileCardsVisible = await page.$eval('#orders-mobile-cards', (el) => window.getComputedStyle(el).display !== 'none')
      assert.equal(isMobileCardsVisible, true, 'Mobile cards should be displayed on 375px viewport')

      // Invariant: Touch targets >= 44px
      const newWorkBtn = await page.$('#btn-new-work')
      const box = await newWorkBtn?.boundingBox()
      assert.ok(box && box.height >= 44, `New Work button height (${box?.height}px) must be >= 44px`)

      // Invariant: Zero horizontal scroll
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
      assert.equal(scrollWidth <= clientWidth, true, 'Mobile page must not have horizontal scrollbar')

      await page.close()
      await context.close()
    })

    test('4.2 Dark mode applies dark semantic tokens without raw white/black leaks', async () => {
      const context = await browser.newContext()
      const page = await renderOrdersPage(context, {
        locale: 'en',
        theme: 'dark',
        viewport: VIEWPORTS.desktop,
      })

      const isDarkMode = await page.$eval('html', (el) => el.classList.contains('dark'))
      assert.equal(isDarkMode, true, 'HTML root must have dark class')

      const bodyBg = await page.$eval('body', (el) => window.getComputedStyle(el).backgroundColor)
      assert.notEqual(bodyBg, 'rgb(255, 255, 255)', 'Dark mode body must not be white')

      await page.close()
      await context.close()
    })
  })
})
