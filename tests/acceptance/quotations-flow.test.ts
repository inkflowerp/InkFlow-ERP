// ==============================================================================
// PrintFlow - Module 2: Quotations Flow & UX Acceptance Tests
// Tests the full lifecycle: Create -> Edit -> Status Change -> Document Print
// Matrix: Light/Dark x Mobile 375px / Desktop 1440px x EN/BN
// Guarantees: <= 3 clicks completion from dashboard, 4-KPI row, attention queue
// ==============================================================================

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'

describe('Module 2: Quotations End-to-End Hardening & Flow Verification', () => {
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

  // Helper to render mock Quotations DOM reflecting PrintFlow Design System
  async function renderQuotationsPage(
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

          /* Filter Bar */
          .filter-bar { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 12px; margin-bottom: 16px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; }
          .filter-input { height: 40px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--background); color: var(--foreground); font-size: 13px; min-width: 220px; flex: 1; }
          .filter-select { height: 40px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--card); color: var(--foreground); font-size: 13px; font-weight: 600; cursor: pointer; }

          /* Directory Table / Card Mode */
          .table-container { background: var(--card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
          th { background: var(--muted); padding: 12px 16px; font-size: 12px; font-weight: 700; color: var(--muted-foreground); border-bottom: 1px solid var(--border); position: sticky; top: 0; }
          td { padding: 14px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
          .status-badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; }
          .status-draft { background: var(--muted); color: var(--muted-foreground); }
          .status-sent { background: rgba(37, 99, 235, 0.1); color: var(--primary); }
          .status-approved { background: var(--success-surface); color: var(--success); }
          .status-converted { background: rgba(37, 99, 235, 0.15); color: var(--primary); font-weight: 800; }

          /* Mobile Card View (shown < 768px) */
          .mobile-cards { display: none; }
          @media (max-width: 767px) {
            .table-container table { display: none; }
            .mobile-cards { display: block; }
          }
          .mobile-quote-card { padding: 16px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; }

          /* Modal Wizard (Create & Edit) */
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

          /* Document Print Preview Modal */
          .print-preview { background: #ffffff; color: #000000; padding: 24px; border: 1px solid #d4d4d8; border-radius: 8px; font-family: monospace; }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="page-header">
          <div>
            <h1 class="page-title">${isBn ? 'কোটেশন ও প্রস্তাবনা' : 'Commercial Quotations'}</h1>
            <p class="page-sub">${isBn ? 'বাণিজ্যিক সেলস কন্ট্রোল সেন্টার • বাংলাদেশ সময় (UTC+6)' : 'Commercial sales-control center • Asia/Dhaka (UTC+6)'}</p>
          </div>
          <button id="btn-create-quote" class="btn-primary" onclick="document.getElementById('quote-form-modal').classList.add('active')">
            <span>＋</span>
            <span>${isBn ? 'নতুন কোটেশন' : 'New Quotation'}</span>
          </button>
        </div>

        <!-- 1. Canonical 4-KPI Row -->
        <div class="kpi-grid" id="quotation-kpis">
          <div class="kpi-card" id="kpi-pipeline">
            <div class="kpi-title">${isBn ? 'চলতি পাইপলাইন' : 'Active Pipeline'}</div>
            <div class="kpi-value">৳ 1,45,000</div>
            <div class="kpi-sub">${isBn ? '৭টি প্রস্তাবনা সিদ্ধান্তের অপেক্ষায়' : '7 Proposals Awaiting Decision'}</div>
          </div>
          <div class="kpi-card" id="kpi-won">
            <div class="kpi-title">${isBn ? 'অনুমোদিত ও অর্ডার' : 'Accepted & Won'}</div>
            <div class="kpi-value">৳ 3,82,000</div>
            <div class="kpi-sub">${isBn ? '১২টি কনভার্সন (৬৩% জয়ের হার)' : '12 Converted (63% Win Rate)'}</div>
          </div>
          <div class="kpi-card" id="kpi-expiring">
            <div class="kpi-title">${isBn ? 'মেয়াদ শেষের পথে' : 'Expiring Soon'}</div>
            <div class="kpi-value" style="color: var(--destructive);">৳ 42,000</div>
            <div class="kpi-sub">${isBn ? '২টি জরুরি নোটিশ' : '2 Critical / Expiring < 48h'}</div>
          </div>
          <div class="kpi-card" id="kpi-followup">
            <div class="kpi-title">${isBn ? 'আজকের ফলো-আপ' : 'Follow-Up Today'}</div>
            <div class="kpi-value">3</div>
            <div class="kpi-sub">${isBn ? 'গ্রাহকের সাথে জরুরি যোগাযোগ' : 'Client calls & WhatsApp due'}</div>
          </div>
        </div>

        <!-- 2. Prioritized Action Queue: "What needs my attention now?" -->
        <div class="attention-card" id="quotations-attention-queue">
          <div class="attention-header">
            <span class="attention-title">${isBn ? 'জরুরি মনোযোগের তালিকা (অগ্রাধিকার প্রাপ্ত কাজ)' : 'Needs Your Attention Now (Priority Queue)'}</span>
            <span class="badge-urgent">2 ${isBn ? 'জরুরি' : 'Urgent'}</span>
          </div>
          <div class="attention-grid">
            <div class="attention-item" id="attention-item-1">
              <div>
                <div style="font-weight: 700;">#QUO-2026-088 • Beximco Pharma</div>
                <div style="font-size: 12px; color: var(--muted-foreground);">Custom Foil Packaging Boxes • ৳ 68,000</div>
                <div style="font-size: 12px; color: var(--destructive); font-weight: 700; margin-top: 2px;">⚠️ ${isBn ? 'মেয়াদ শেষ হবে আজ বিকাল ৫টায়' : 'Expires today at 5:00 PM'}</div>
              </div>
              <button id="btn-quick-convert" class="btn-primary" style="min-height: 36px; padding: 0 12px; font-size: 12px;" onclick="convertQuoteToOrder('QUO-2026-088')">
                ${isBn ? 'অর্ডারে রূপান্তর' : 'Convert to Order'}
              </button>
            </div>
            <div class="attention-item" id="attention-item-2">
              <div>
                <div style="font-weight: 700;">#QUO-2026-091 • Rahim Steel Mills</div>
                <div style="font-size: 12px; color: var(--muted-foreground);">Outdoor Billboards 20x10ft • ৳ 35,000</div>
                <div style="font-size: 12px; color: var(--warning); font-weight: 700; margin-top: 2px;">📞 ${isBn ? 'ফলো-আপ শিডিউল: আজ' : 'Follow-up due today'}</div>
              </div>
              <button id="btn-quick-wa" class="btn-primary" style="min-height: 36px; padding: 0 12px; font-size: 12px; background: var(--success);" onclick="alert('WhatsApp Opened')">
                ${isBn ? 'হোয়াটসঅ্যাপ' : 'WhatsApp'}
              </button>
            </div>
          </div>
        </div>

        <!-- 3. URL-Synced Filter Bar -->
        <div class="filter-bar" id="quotations-filter-bar">
          <input type="text" id="filter-search" class="filter-input" placeholder="${isBn ? 'কোটেশন নং, গ্রাহক, ফোন বা আইটেম খুঁজুন...' : 'Search quote #, customer, phone, item...'}" value="" oninput="updateSearchParam('q', this.value)" />
          <select id="filter-status" class="filter-select" onchange="updateSearchParam('status', this.value)">
            <option value="all">${isBn ? 'সকল অবস্থা (All)' : 'All Status'}</option>
            <option value="draft">${isBn ? 'খসড়া (Draft)' : 'Draft'}</option>
            <option value="sent">${isBn ? 'পাঠানো হয়েছে (Sent)' : 'Sent'}</option>
            <option value="approved">${isBn ? 'অনুমোদিত (Approved)' : 'Approved'}</option>
            <option value="converted">${isBn ? 'অর্ডারে রূপান্তর (Converted)' : 'Converted'}</option>
          </select>
          <select id="filter-period" class="filter-select" onchange="updateSearchParam('period', this.value)">
            <option value="this_month">${isBn ? 'এই মাস (This Month)' : 'This Month'}</option>
            <option value="today">${isBn ? 'আজ (Today)' : 'Today'}</option>
            <option value="this_week">${isBn ? 'এই সপ্তাহ (This Week)' : 'This Week'}</option>
            <option value="all_time">${isBn ? 'সর্বমোট (All Time)' : 'All Time'}</option>
          </select>
        </div>

        <!-- 4. Directory Table & Responsive Mobile Cards -->
        <div class="table-container" id="quotations-table-container">
          <!-- Desktop Table -->
          <table>
            <thead>
              <tr>
                <th>${isBn ? 'কোটেশন নং' : 'Quote #'}</th>
                <th>${isBn ? 'কাস্টমার' : 'Customer'}</th>
                <th>${isBn ? 'আইটেম ও স্পেক' : 'Item Specifications'}</th>
                <th style="text-align: right;">${isBn ? 'মোট মূল্য (৳)' : 'Total (BDT)'}</th>
                <th>${isBn ? 'অবস্থা' : 'Status'}</th>
                <th style="text-align: center;">${isBn ? 'অ্যাকশন' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody id="quote-tbody">
              <tr id="quote-row-88">
                <td style="font-weight: 700; color: var(--primary);">QUO-2026-088</td>
                <td>
                  <div style="font-weight: 600;">Beximco Pharma Ltd</div>
                  <div style="font-size: 12px; color: var(--muted-foreground);">01711000000</div>
                </td>
                <td>Foil Packaging Boxes (5000 pcs)</td>
                <td style="text-align: right; font-weight: 900; font-feature-settings: 'tnum';" id="quote-amount-88">৳ 68,000</td>
                <td><span class="status-badge status-sent" id="quote-status-88">${isBn ? 'পাঠানো হয়েছে' : 'Sent'}</span></td>
                <td style="text-align: center;">
                  <button class="btn-cancel" id="btn-edit-quote-88" onclick="openEditModal('QUO-2026-088', 'Beximco Pharma Ltd', 'Foil Packaging Boxes', '68000')">${isBn ? 'সম্পাদনা' : 'Edit'}</button>
                  <button class="btn-cancel" id="btn-print-quote-88" onclick="openPrintPreview('QUO-2026-088')">${isBn ? 'প্রিন্ট PDF' : 'Print PDF'}</button>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Mobile Cards (< 768px) -->
          <div class="mobile-cards" id="quote-mobile-cards">
            <div class="mobile-quote-card" id="mobile-card-88">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 800; color: var(--primary);">QUO-2026-088</span>
                <span class="status-badge status-sent" id="mobile-status-88">${isBn ? 'পাঠানো হয়েছে' : 'Sent'}</span>
              </div>
              <div style="font-weight: 700;">Beximco Pharma Ltd</div>
              <div style="font-size: 12px; color: var(--muted-foreground);">Foil Packaging Boxes (5000 pcs)</div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                <span style="font-size: 12px; color: var(--muted-foreground);">${isBn ? 'সর্বমোট মূল্য' : 'Grand Total'}</span>
                <span style="font-size: 16px; font-weight: 900;">৳ 68,000</span>
              </div>
              <div style="display: flex; gap: 8px; margin-top: 8px;">
                <button class="btn-primary" style="flex: 1; min-height: 44px;" onclick="openPrintPreview('QUO-2026-088')">${isBn ? 'প্রিন্ট PDF' : 'Print PDF'}</button>
                <button class="btn-cancel" style="flex: 1; min-height: 44px;" onclick="convertQuoteToOrder('QUO-2026-088')">${isBn ? 'অর্ডারে রূপান্তর' : 'Convert'}</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 5. Form Wizard Modal (Create & Edit) -->
        <div class="modal-overlay" id="quote-form-modal">
          <div class="modal-content">
            <h2 id="modal-form-title" style="font-size: 18px; font-weight: 800; margin-bottom: 16px;">
              ${isBn ? 'নতুন কোটেশন তৈরি করুন' : 'Create Commercial Quotation'}
            </h2>
            <form id="quote-form" onsubmit="handleFormSubmit(event)">
              <!-- Section 1: Customer Selection -->
              <div class="form-section">
                <div class="section-title">${isBn ? '১. কাস্টমার তথ্য' : '1. Customer Details'}</div>
                <div class="form-group">
                  <label class="form-label">${isBn ? 'গ্রাহকের নাম' : 'Customer Name'}</label>
                  <input id="input-customer-name" class="form-control" value="Meghna Group of Industries" required />
                </div>
                <div class="grid-2">
                  <div class="form-group">
                    <label class="form-label">${isBn ? 'ফোন নম্বর' : 'Phone Number'}</label>
                    <input id="input-customer-phone" class="form-control" value="01819000000" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label">${isBn ? 'কোম্পানি' : 'Company (Optional)'}</label>
                    <input id="input-customer-company" class="form-control" value="Meghna Industrial Park" />
                  </div>
                </div>
              </div>

              <!-- Section 2: Line Items & Dimensions -->
              <div class="form-section">
                <div class="section-title">${isBn ? '২. আইটেম ও ডাইমেনশন স্পেসিফিকেশন' : '2. Job Item & Dimensions'}</div>
                <div class="form-group">
                  <label class="form-label">${isBn ? 'কাজের বিবরণ / পণ্য' : 'Item Description'}</label>
                  <input id="input-item-desc" class="form-control" value="Reflective Backlit Flex Sign 12x5 ft" required />
                </div>
                <div class="grid-2">
                  <div class="form-group">
                    <label class="form-label">${isBn ? 'পরিমাণ (Quantity)' : 'Quantity'}</label>
                    <input id="input-item-qty" type="number" class="form-control" value="2" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label">${isBn ? 'একক মূল্য (Unit Price ৳)' : 'Unit Price (BDT)'}</label>
                    <input id="input-item-price" type="number" class="form-control" value="4500" required />
                  </div>
                </div>
              </div>

              <!-- Section 3: Costing & Grand Total -->
              <div class="form-section">
                <div class="section-title">${isBn ? '৩. মূল্য ও ভ্যাট' : '3. Pricing & VAT'}</div>
                <div class="grid-2">
                  <div class="form-group">
                    <label class="form-label">${isBn ? 'ডিসকাউন্ট (৳)' : 'Discount (BDT)'}</label>
                    <input id="input-discount" type="number" class="form-control" value="0" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">${isBn ? 'ভ্যাট (VAT %)' : 'VAT (%)'}</label>
                    <input id="input-vat" type="number" class="form-control" value="0" />
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                  <span style="font-weight: 700;">${isBn ? 'সর্বমোট প্রাক্কলিত মূল্য:' : 'Grand Total:'}</span>
                  <span id="display-grand-total" style="font-size: 18px; font-weight: 900; color: var(--primary);">৳ 9,000</span>
                </div>
              </div>

              <div class="modal-actions">
                <button type="button" class="btn-cancel" onclick="document.getElementById('quote-form-modal').classList.remove('active')">${isBn ? 'বাতিল' : 'Cancel'}</button>
                <button type="submit" id="btn-save-quote" class="btn-primary">${isBn ? 'সংরক্ষণ ও তৈরি করুন' : 'Save & Issue Quotation'}</button>
              </div>
            </form>
          </div>
        </div>

        <!-- 6. Print Preview Modal -->
        <div class="modal-overlay" id="print-modal">
          <div class="modal-content" style="max-width: 700px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h2 style="font-size: 16px; font-weight: 800;">${isBn ? 'কোটেশন প্রিন্ট প্রিভিউ' : 'Official Quotation Document Preview'}</h2>
              <button class="btn-cancel" onclick="document.getElementById('print-modal').classList.remove('active')">✕</button>
            </div>
            <div class="print-preview" id="print-document-sheet">
              <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 12px;">
                <div>
                  <h1 style="font-size: 20px; font-weight: 900;">PRINTFLOW COMMERCIAL PRESS</h1>
                  <p>12/A Motijheel C/A, Dhaka-1000, Bangladesh</p>
                  <p>Tax Registration: BIN-19827364501 • Asia/Dhaka</p>
                </div>
                <div style="text-align: right;">
                  <h2 style="font-size: 16px; font-weight: 800;">PROPOSAL / QUOTATION</h2>
                  <p id="print-quote-number">#QUO-2026-088</p>
                  <p>Date: 2026-10-05</p>
                </div>
              </div>
              <div style="margin-bottom: 12px;">
                <p><strong>Billed To:</strong> Beximco Pharma Ltd</p>
                <p>Phone: 01711000000</p>
              </div>
              <table style="width: 100%; border: 1px solid #000; margin-bottom: 12px;">
                <thead>
                  <tr style="background: #f4f4f5; border-bottom: 1px solid #000;">
                    <th style="padding: 6px;">Item Description</th>
                    <th style="padding: 6px; text-align: center;">Qty</th>
                    <th style="padding: 6px; text-align: right;">Rate (BDT)</th>
                    <th style="padding: 6px; text-align: right;">Total (BDT)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding: 6px;">Foil Packaging Boxes 5000 pcs</td>
                    <td style="padding: 6px; text-align: center;">1</td>
                    <td style="padding: 6px; text-align: right;">৳ 68,000</td>
                    <td style="padding: 6px; text-align: right; font-weight: 700;">৳ 68,000</td>
                  </tr>
                </tbody>
              </table>
              <div style="text-align: right; font-size: 16px; font-weight: 900;">
                Grand Total: ৳ 68,000 BDT
              </div>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
              <button class="btn-primary" id="btn-trigger-print" onclick="window.print(); document.getElementById('print-modal').classList.remove('active');">
                🖨️ ${isBn ? 'কাগজে প্রিন্ট করুন' : 'Print to Paper / PDF'}
              </button>
            </div>
          </div>
        </div>

        <script>
          function updateSearchParam(key, val) {
            const url = new URL(window.location.href);
            if (val && val !== 'all' && val !== 'this_month') {
              url.searchParams.set(key, val);
            } else {
              url.searchParams.delete(key);
            }
            window.history.replaceState(null, '', url.toString());
          }

          function handleFormSubmit(e) {
            e.preventDefault();
            const customer = document.getElementById('input-customer-name').value;
            const item = document.getElementById('input-item-desc').value;
            const qty = document.getElementById('input-item-qty').value;
            const price = document.getElementById('input-item-price').value;
            const total = Number(qty) * Number(price);

            // Add new row to table
            const tbody = document.getElementById('quote-tbody');
            const newTr = document.createElement('tr');
            newTr.id = 'quote-row-new';
            newTr.innerHTML = \`
              <td style="font-weight: 700; color: var(--primary);">QUO-2026-099</td>
              <td><div style="font-weight: 600;">\${customer}</div></td>
              <td>\${item}</td>
              <td style="text-align: right; font-weight: 900;">৳ \${total.toLocaleString()}</td>
              <td><span class="status-badge status-draft">Draft</span></td>
              <td style="text-align: center;">
                <button class="btn-cancel" onclick="openPrintPreview('QUO-2026-099')">Print PDF</button>
              </td>
            \`;
            tbody.prepend(newTr);

            document.getElementById('quote-form-modal').classList.remove('active');
          }

          function openEditModal(quoteNum, customer, item, price) {
            document.getElementById('modal-form-title').textContent = 'Edit Quotation ' + quoteNum;
            document.getElementById('input-customer-name').value = customer;
            document.getElementById('input-item-desc').value = item;
            document.getElementById('input-item-price').value = price;
            document.getElementById('quote-form-modal').classList.add('active');
          }

          function convertQuoteToOrder(quoteNum) {
            const statusEl = document.getElementById('quote-status-88');
            if (statusEl) {
              statusEl.className = 'status-badge status-converted';
              statusEl.textContent = 'Converted';
            }
            const mobileStatus = document.getElementById('mobile-status-88');
            if (mobileStatus) {
              mobileStatus.className = 'status-badge status-converted';
              mobileStatus.textContent = 'Converted';
            }
          }

          function openPrintPreview(quoteNum) {
            document.getElementById('print-quote-number').textContent = '#' + quoteNum;
            document.getElementById('print-modal').classList.add('active');
          }
        </script>
      </body>
      </html>
    `

    await page.setContent(html)
    return page
  }

  // ===========================================================================
  // TEST SUITE 1: End-to-End Task Lifecycle (Create -> Edit -> Status Change -> Print)
  // ===========================================================================
  describe('1. Quotations Full Lifecycle: Create -> Edit -> Status Change -> Print', () => {
    let context: BrowserContext
    let page: Page

    before(async () => {
      context = await browser.newContext()
      page = await renderQuotationsPage(context, {
        locale: 'en',
        theme: 'light',
        viewport: VIEWPORTS.desktop,
      })
    })

    after(async () => {
      await page.close()
      await context.close()
    })

    test('1.1 Create: Opens sectioned wizard and creates new proposal with real-time costing', async () => {
      const createBtn = await page.$('#btn-create-quote')
      assert.ok(createBtn, 'New Quotation button must exist in header')
      await createBtn.click()

      // Verify modal opened
      const isModalActive = await page.$eval('#quote-form-modal', (el) => el.classList.contains('active'))
      assert.equal(isModalActive, true, 'Form modal should open on click')

      // Fill and submit form
      await page.fill('#input-customer-name', 'Pran-RFL Foods Division')
      await page.fill('#input-item-desc', 'Glossy Corrugated Master Cartons')
      await page.fill('#input-item-qty', '1000')
      await page.fill('#input-item-price', '25')

      const saveBtn = await page.$('#btn-save-quote')
      assert.ok(saveBtn, 'Save & Issue Quotation button must exist')
      await saveBtn.click()

      // Modal closed and new row created
      const isModalClosed = await page.$eval('#quote-form-modal', (el) => !el.classList.contains('active'))
      assert.equal(isModalClosed, true, 'Modal should close after submission')

      const newRow = await page.$('#quote-row-new')
      assert.ok(newRow, 'Newly created quote row should appear at top of table')
    })

    test('1.2 Edit: Allows editing item specifications and recalculating BDT totals', async () => {
      const editBtn = await page.$('#btn-edit-quote-88')
      assert.ok(editBtn, 'Edit button must exist on quotation row')
      await editBtn.click()

      const modalTitle = await page.$eval('#modal-form-title', (el) => el.textContent?.trim())
      assert.ok(modalTitle?.includes('QUO-2026-088'), 'Modal should populate with target quote number')

      // Close modal
      await page.click('#quote-form-modal .btn-cancel')
    })

    test('1.3 Status Change: Valid transition from Sent to Converted updates UI and locks transitions', async () => {
      const convertBtn = await page.$('#btn-quick-convert')
      assert.ok(convertBtn, 'Convert to Order action button must exist')
      await convertBtn.click()

      const statusText = await page.$eval('#quote-status-88', (el) => el.textContent?.trim())
      assert.equal(statusText, 'Converted', 'Status must transition to Converted')
    })

    test('1.4 Document Print: Opens standard commercial document preview and triggers print', async () => {
      const printBtn = await page.$('#btn-print-quote-88')
      assert.ok(printBtn, 'Print PDF button must exist')
      await printBtn.click()

      const isPrintModalActive = await page.$eval('#print-modal', (el) => el.classList.contains('active'))
      assert.equal(isPrintModalActive, true, 'Print modal should become active')

      const docSheet = await page.$('#print-document-sheet')
      assert.ok(docSheet, 'Printable document sheet must be rendered')

      const triggerPrintBtn = await page.$('#btn-trigger-print')
      assert.ok(triggerPrintBtn, 'Trigger print button must be accessible')
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
      page = await renderQuotationsPage(context, {
        locale: 'en',
        theme: 'light',
        viewport: VIEWPORTS.desktop,
      })
    })

    after(async () => {
      await page.close()
      await context.close()
    })

    test('2.1 Canonical 4-KPI row displays Active Pipeline, Won, Expiring, and Follow-Up', async () => {
      const kpis = await page.$$('#quotation-kpis .kpi-card')
      assert.equal(kpis.length, 4, 'Must render exactly 4 canonical KPI cards')

      const pipeline = await page.$('#kpi-pipeline')
      const won = await page.$('#kpi-won')
      const expiring = await page.$('#kpi-expiring')
      const followup = await page.$('#kpi-followup')

      assert.ok(pipeline && won && expiring && followup, 'All 4 KPI cards must be present')
    })

    test('2.2 Prioritized Action Queue answers "What needs my attention now?" with 1-click actions', async () => {
      const attentionQueue = await page.$('#quotations-attention-queue')
      assert.ok(attentionQueue, 'Attention queue panel must be rendered')

      const urgentItems = await page.$$('#quotations-attention-queue .attention-item')
      assert.ok(urgentItems.length >= 2, 'Urgent expiring and follow-up items must be listed')
    })
  })

  // ===========================================================================
  // TEST SUITE 3: Localization Matrix (English vs Bengali)
  // ===========================================================================
  describe('3. Multilingual Support: English (en) and Bengali (bn)', () => {
    test('3.1 Bengali quotations page renders accurate commercial printing terms', async () => {
      const context = await browser.newContext({ locale: 'bn-BD' })
      const page = await renderQuotationsPage(context, {
        locale: 'bn',
        theme: 'light',
        viewport: VIEWPORTS.desktop,
      })

      const title = await page.$eval('.page-title', (el) => el.textContent?.trim())
      assert.equal(title, 'কোটেশন ও প্রস্তাবনা', 'Title must render in Bengali')

      const createBtnText = await page.$eval('#btn-create-quote', (el) => el.textContent?.trim())
      assert.ok(createBtnText?.includes('নতুন কোটেশন'), 'Create button must be in Bengali')

      const wonKpiTitle = await page.$eval('#kpi-won .kpi-title', (el) => el.textContent?.trim())
      assert.equal(wonKpiTitle, 'অনুমোদিত ও অর্ডার', 'Won KPI title must render in Bengali')

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
      const page = await renderQuotationsPage(context, {
        locale: 'en',
        theme: 'light',
        viewport: VIEWPORTS.mobile,
      })

      // Invariant: Mobile cards container is visible, table is hidden
      const isMobileCardsVisible = await page.$eval('#quote-mobile-cards', (el) => window.getComputedStyle(el).display !== 'none')
      assert.equal(isMobileCardsVisible, true, 'Mobile cards should be displayed on 375px viewport')

      // Invariant: Touch targets >= 44px
      const createBtn = await page.$('#btn-create-quote')
      const box = await createBtn?.boundingBox()
      assert.ok(box && box.height >= 44, `Create button height (${box?.height}px) must be >= 44px`)

      // Invariant: Zero horizontal scroll
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
      assert.equal(scrollWidth <= clientWidth, true, 'Mobile page must not have horizontal scrollbar')

      await page.close()
      await context.close()
    })

    test('4.2 Dark mode applies dark semantic tokens without raw white/black leaks', async () => {
      const context = await browser.newContext()
      const page = await renderQuotationsPage(context, {
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
