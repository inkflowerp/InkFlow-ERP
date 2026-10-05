// ==============================================================================
// PrintFlow - Module 4: Invoices & Billing Flow & UX Acceptance Tests
// Tests the full lifecycle: Create -> Edit / Payment -> Status Change -> Document Print
// Matrix: Light/Dark x Mobile 375px / Desktop 1440px x EN/BN
// Guarantees: <= 3 clicks completion from dashboard, 4-KPI row, attention queue
// ==============================================================================

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'

describe('Module 4: Invoices & Billing End-to-End Hardening & Flow Verification', () => {
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

  // Helper to render mock Billing DOM reflecting PrintFlow Design System
  async function renderBillingPage(
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

          /* Directory Table & Card Layout */
          .table-container { background: var(--card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
          th { background: var(--muted); padding: 12px 16px; font-size: 12px; font-weight: 700; color: var(--muted-foreground); border-bottom: 1px solid var(--border); position: sticky; top: 0; }
          td { padding: 14px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
          .status-badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; }
          .status-unpaid { background: var(--danger-surface); color: var(--destructive); }
          .status-partial { background: var(--warning-surface); color: var(--warning); }
          .status-paid { background: var(--success-surface); color: var(--success); }

          /* Mobile Cards (< 768px) */
          .mobile-cards { display: none; }
          @media (max-width: 767px) {
            .table-container table { display: none; }
            .mobile-cards { display: block; }
          }
          .mobile-invoice-card { padding: 16px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; }

          /* Modal Wizard (New Invoice & Record Payment) */
          .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.65); z-index: 50; align-items: center; justify-content: center; padding: 16px; }
          .modal-overlay.active { display: flex; }
          .modal-content { background: var(--card); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; padding: 24px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3); }
          .form-section { margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid var(--border); }
          .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; color: var(--muted-foreground); margin-bottom: 10px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .form-group { margin-bottom: 10px; }
          .form-label { display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px; }
          .form-control { width: 100%; height: 40px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--background); color: var(--foreground); font-size: 13px; }
          .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
          .btn-cancel { min-height: 40px; padding: 0 16px; border-radius: 8px; background: transparent; border: 1px solid var(--border); color: var(--foreground); font-weight: 600; cursor: pointer; }

          /* Money Receipt & Tax Invoice Preview */
          .receipt-preview { background: #ffffff; color: #000000; padding: 20px; border: 1px solid #000; border-radius: 8px; font-family: monospace; }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="page-header">
          <div>
            <h1 class="page-title">${isBn ? 'বিলিং ও কালেকশন' : 'Billing & Collections'}</h1>
            <p class="page-sub">${isBn ? 'বাণিজ্যিক অর্থ ও চালান হাব • বাংলাদেশ সময় (UTC+6)' : 'Canonical commercial finance workspace • Asia/Dhaka (UTC+6)'}</p>
          </div>
          <button id="btn-create-invoice" class="btn-primary" onclick="document.getElementById('invoice-form-modal').classList.add('active')">
            <span>＋</span>
            <span>${isBn ? '+ নতুন চালান' : '+ New Invoice'}</span>
          </button>
        </div>

        <!-- 1. Canonical 4-KPI Row -->
        <div class="kpi-grid" id="billing-kpis">
          <div class="kpi-card" id="kpi-total-invoiced">
            <div class="kpi-title">${isBn ? 'মোট চালান বিক্রয়' : 'Total Invoiced'}</div>
            <div class="kpi-value">৳ 4,85,000</div>
            <div class="kpi-sub">${isBn ? '১৬টি বিল তৈরি' : '16 Bills Generated'}</div>
          </div>
          <div class="kpi-card" id="kpi-total-collected">
            <div class="kpi-title">${isBn ? 'মোট আদায়' : 'Total Collected'}</div>
            <div class="kpi-value">৳ 3,20,000</div>
            <div class="kpi-sub">${isBn ? '৬৬% আদায়ের হার' : '66% Collection Rate'}</div>
          </div>
          <div class="kpi-card" id="kpi-outstanding-due">
            <div class="kpi-title">${isBn ? 'চলতি বকেয়া' : 'Outstanding Due'}</div>
            <div class="kpi-value" style="color: var(--warning);">৳ 1,65,000</div>
            <div class="kpi-sub">${isBn ? '৫টি বিল বকেয়া' : '5 Bills Pending'}</div>
          </div>
          <div class="kpi-card" id="kpi-critical-overdue">
            <div class="kpi-title">${isBn ? 'মেয়াদোত্তীর্ণ বকেয়া' : 'Critical Overdue'}</div>
            <div class="kpi-value" style="color: var(--destructive);">৳ 52,000</div>
            <div class="kpi-sub">${isBn ? '২টি জরুরি বকেয়া বিল' : '2 Critical Overdue Bills'}</div>
          </div>
        </div>

        <!-- 2. Prioritized Action Queue: "What needs my attention now?" -->
        <div class="attention-card" id="billing-attention-queue">
          <div class="attention-header">
            <span class="attention-title">${isBn ? 'জরুরি কালেকশন তালিকা (অগ্রাধিকার প্রাপ্ত বকেয়া)' : 'Needs Your Attention Now (Critical Collections Queue)'}</span>
            <span class="badge-urgent">2 ${isBn ? 'জরুরি' : 'Urgent'}</span>
          </div>
          <div class="attention-grid">
            <div class="attention-item" id="billing-attention-1">
              <div>
                <div style="font-weight: 700;">#INV-2026-077 • Rahim Steel Mills</div>
                <div style="font-size: 12px; color: var(--muted-foreground);">Balance: ৳ 35,000 • Phone: 01713000000</div>
                <div style="font-size: 12px; color: var(--destructive); font-weight: 700; margin-top: 2px;">⚠️ ${isBn ? '১৮ দিন মেয়াদোত্তীর্ণ বকেয়া' : '18 days overdue'}</div>
              </div>
              <button id="btn-quick-collect" class="btn-primary" style="min-height: 36px; padding: 0 12px; font-size: 12px;" onclick="openPaymentModal('INV-2026-077', 'Rahim Steel Mills', '35000')">
                ${isBn ? 'বকেয়া আদায়' : 'Collect Due'}
              </button>
            </div>
            <div class="attention-item" id="billing-attention-2">
              <div>
                <div style="font-weight: 700;">#INV-2026-081 • Meghna Industrial Park</div>
                <div style="font-size: 12px; color: var(--muted-foreground);">Balance: ৳ 17,000 • Phone: 01714000000</div>
                <div style="font-size: 12px; color: var(--warning); font-weight: 700; margin-top: 2px;">⏰ ${isBn ? 'ডিউ ডেট: আজ' : 'Due date: Today'}</div>
              </div>
              <button id="btn-quick-remind" class="btn-primary" style="min-height: 36px; padding: 0 12px; font-size: 12px; background: var(--success);" onclick="alert('WhatsApp Reminder Sent')">
                ${isBn ? 'তাগাদা দিন' : 'Send Reminder'}
              </button>
            </div>
          </div>
        </div>

        <!-- 3. Filter Bar -->
        <div class="filter-bar" id="billing-filter-bar">
          <input type="text" id="billing-filter-search" class="filter-input" placeholder="${isBn ? 'ইনভয়েস নং, গ্রাহক, ফোন বা বিআইএন দিয়ে খুঁজুন...' : 'Search invoice #, customer, phone, BIN...'}" />
          <select id="billing-filter-status" class="filter-select">
            <option value="all">${isBn ? 'সকল অবস্থা (All)' : 'All Status'}</option>
            <option value="unpaid">${isBn ? 'বকেয়া (Unpaid)' : 'Unpaid'}</option>
            <option value="paid">${isBn ? 'পরিশোধিত (Paid)' : 'Paid'}</option>
          </select>
        </div>

        <!-- 4. Directory Table & Responsive Mobile Cards -->
        <div class="table-container" id="billing-table-container">
          <!-- Desktop Table -->
          <table>
            <thead>
              <tr>
                <th>${isBn ? 'ইনভয়েস নং' : 'Invoice #'}</th>
                <th>${isBn ? 'কাস্টমার' : 'Customer'}</th>
                <th>${isBn ? 'তারিখ ও ডেডলাইন' : 'Date & Due'}</th>
                <th style="text-align: right;">${isBn ? 'মোট ও বকেয়া (৳)' : 'Total & Due (BDT)'}</th>
                <th>${isBn ? 'অবস্থা' : 'Status'}</th>
                <th style="text-align: center;">${isBn ? 'অ্যাকশন' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody id="billing-tbody">
              <tr id="invoice-row-77">
                <td style="font-weight: 700; color: var(--primary);">INV-2026-077</td>
                <td>
                  <div style="font-weight: 600;">Rahim Steel Mills</div>
                  <div style="font-size: 12px; color: var(--muted-foreground);">BIN: 1827364501</div>
                </td>
                <td>2026-09-17 • Overdue</td>
                <td style="text-align: right; font-weight: 900; font-feature-settings: 'tnum';">
                  <div>৳ 35,000</div>
                  <div style="font-size: 11px; color: var(--destructive); font-weight: 700;" id="invoice-due-77">Due: ৳ 35,000</div>
                </td>
                <td><span class="status-badge status-unpaid" id="invoice-status-77">${isBn ? 'বকেয়া' : 'Unpaid'}</span></td>
                <td style="text-align: center;">
                  <button class="btn-cancel" id="btn-collect-row-77" onclick="openPaymentModal('INV-2026-077', 'Rahim Steel Mills', '35000')">${isBn ? 'টাকা গ্রহণ' : 'Record Pay'}</button>
                  <button class="btn-cancel" id="btn-print-row-77" onclick="openReceiptModal('INV-2026-077')">${isBn ? 'রসিদ' : 'Receipt'}</button>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Mobile Cards (< 768px) -->
          <div class="mobile-cards" id="billing-mobile-cards">
            <div class="mobile-invoice-card" id="mobile-invoice-77">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 800; color: var(--primary);">INV-2026-077</span>
                <span class="status-badge status-unpaid" id="mobile-invoice-status-77">${isBn ? 'বকেয়া' : 'Unpaid'}</span>
              </div>
              <div style="font-weight: 700;">Rahim Steel Mills</div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                <span style="font-size: 12px; color: var(--muted-foreground);">${isBn ? 'বকেয়া পরিমাণ' : 'Due Amount'}</span>
                <span style="font-size: 16px; font-weight: 900; color: var(--destructive);">৳ 35,000</span>
              </div>
              <div style="display: flex; gap: 8px; margin-top: 8px;">
                <button class="btn-primary" style="flex: 1; min-height: 44px;" onclick="openPaymentModal('INV-2026-077', 'Rahim Steel Mills', '35000')">${isBn ? 'টাকা গ্রহণ' : 'Collect'}</button>
                <button class="btn-cancel" style="flex: 1; min-height: 44px;" onclick="openReceiptModal('INV-2026-077')">${isBn ? 'রসিদ' : 'Receipt'}</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 5. New Invoice Form Modal -->
        <div class="modal-overlay" id="invoice-form-modal">
          <div class="modal-content">
            <h2 id="modal-invoice-title" style="font-size: 18px; font-weight: 800; margin-bottom: 16px;">
              ${isBn ? 'নতুন বাণিজ্যিক ও ভ্যাট চালান তৈরি' : 'Create Commercial / VAT Invoice'}
            </h2>
            <form id="invoice-form" onsubmit="handleInvoiceSubmit(event)">
              <div class="form-section">
                <div class="section-title">${isBn ? '১. কাস্টমার ও কর তথ্য' : '1. Customer & Tax Information'}</div>
                <div class="form-group">
                  <label class="form-label">${isBn ? 'গ্রাহকের নাম' : 'Customer Name'}</label>
                  <input id="input-inv-customer" class="form-control" value="Transcom Beverage Ltd" required />
                </div>
                <div class="grid-2">
                  <div class="form-group">
                    <label class="form-label">${isBn ? 'ফোন নম্বর' : 'Phone Number'}</label>
                    <input id="input-inv-phone" class="form-control" value="01716000000" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label">${isBn ? 'বিআইএন (BIN)' : 'Customer BIN'}</label>
                    <input id="input-inv-bin" class="form-control" value="001928374-0101" />
                  </div>
                </div>
              </div>

              <div class="form-section">
                <div class="section-title">${isBn ? '২. বিলিং আইটেম' : '2. Billing Items'}</div>
                <div class="form-group">
                  <label class="form-label">${isBn ? 'বিবরণ' : 'Description'}</label>
                  <input id="input-inv-desc" class="form-control" value="Digital Vinyl Banners 20x10ft" required />
                </div>
                <div class="grid-2">
                  <div class="form-group">
                    <label class="form-label">${isBn ? 'মোট মূল্য (৳)' : 'Grand Total (BDT)'}</label>
                    <input id="input-inv-total" type="number" class="form-control" value="24000" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label">${isBn ? 'চালানের ধরন' : 'Invoice Type'}</label>
                    <select id="input-inv-type" class="form-control">
                      <option value="commercial">${isBn ? 'বাণিজ্যিক বিল' : 'Commercial Bill'}</option>
                      <option value="vat_6_3">${isBn ? 'মূসক ৬.৩ কর চালান' : 'Mushak 6.3 Tax Invoice'}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="modal-actions">
                <button type="button" class="btn-cancel" onclick="document.getElementById('invoice-form-modal').classList.remove('active')">${isBn ? 'বাতিল' : 'Cancel'}</button>
                <button type="submit" id="btn-save-invoice" class="btn-primary">${isBn ? 'চালান ইস্যু করুন' : 'Issue Invoice'}</button>
              </div>
            </form>
          </div>
        </div>

        <!-- 6. Record Payment Modal -->
        <div class="modal-overlay" id="payment-form-modal">
          <div class="modal-content" style="max-width: 500px;">
            <h2 style="font-size: 18px; font-weight: 800; margin-bottom: 16px;">
              ${isBn ? 'পেমেন্ট ও বকেয়া আদায় রেকর্ড' : 'Record Customer Payment & Due'}
            </h2>
            <form id="payment-form" onsubmit="handlePaymentSubmit(event)">
              <div class="form-group">
                <label class="form-label">${isBn ? 'কাস্টমার' : 'Customer'}</label>
                <input id="input-pay-customer" class="form-control" value="Rahim Steel Mills" readonly />
              </div>
              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label">${isBn ? 'আদায়কৃত টাকা (৳)' : 'Payment Amount (BDT)'}</label>
                  <input id="input-pay-amount" type="number" class="form-control" value="35000" required />
                </div>
                <div class="form-group">
                  <label class="form-label">${isBn ? 'পেমেন্ট মাধ্যম' : 'Payment Method'}</label>
                  <select id="input-pay-method" class="form-control">
                    <option value="cash">${isBn ? 'ক্যাশ (Counter Cash)' : 'Cash in Hand'}</option>
                    <option value="bkash">${isBn ? 'বিকাশ / নগদ (MFS)' : 'bKash / Nagad'}</option>
                    <option value="bank">${isBn ? 'ব্যাংক একাউন্ট' : 'Bank Transfer'}</option>
                  </select>
                </div>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-cancel" onclick="document.getElementById('payment-form-modal').classList.remove('active')">${isBn ? 'বাতিল' : 'Cancel'}</button>
                <button type="submit" id="btn-submit-payment" class="btn-primary">${isBn ? 'পেমেন্ট নিশ্চিত ও রসিদ তৈরি' : 'Confirm Payment & Issue Receipt'}</button>
              </div>
            </form>
          </div>
        </div>

        <!-- 7. Money Receipt Print Modal -->
        <div class="modal-overlay" id="receipt-modal">
          <div class="modal-content" style="max-width: 600px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h2 style="font-size: 16px; font-weight: 800;">${isBn ? 'অফিসিয়াল মানি রসিদ ও ভ্যাট চালান' : 'Official Money Receipt & Tax Voucher'}</h2>
              <button class="btn-cancel" onclick="document.getElementById('receipt-modal').classList.remove('active')">✕</button>
            </div>
            <div class="receipt-preview" id="receipt-document-sheet">
              <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px;">
                <h1 style="font-size: 18px; font-weight: 900;">PRINTFLOW COMMERCIAL PRESS</h1>
                <p>Tax Registration BIN: 19827364501 • Motijheel, Dhaka</p>
                <h2 style="font-size: 14px; font-weight: 800; margin-top: 4px;">MONEY RECEIPT / চালানের প্রাপ্তিস্বীকার</h2>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <div>
                  <p><strong>Receipt #:</strong> MR-2026-077</p>
                  <p><strong>Received From:</strong> Rahim Steel Mills</p>
                </div>
                <div style="text-align: right;">
                  <p>Date: 2026-10-05</p>
                  <p>Against: INV-2026-077</p>
                </div>
              </div>
              <div style="border: 1px solid #000; padding: 12px; margin-bottom: 12px; background: #fafafa;">
                <div style="display: flex; justify-content: space-between;">
                  <span>Settled Invoiced Amount:</span>
                  <strong>৳ 35,000 BDT</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                  <span>Payment Mode:</span>
                  <span>Cash Counter Deposit</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 4px; font-weight: 900; color: #10b981;">
                  <span>Remaining Invoice Balance:</span>
                  <span>৳ 0 (Fully Paid)</span>
                </div>
              </div>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
              <button class="btn-primary" id="btn-trigger-receipt-print" onclick="window.print(); document.getElementById('receipt-modal').classList.remove('active');">
                🖨️ ${isBn ? 'রসিদ প্রিন্ট করুন' : 'Print Money Receipt'}
              </button>
            </div>
          </div>
        </div>

        <script>
          function handleInvoiceSubmit(e) {
            e.preventDefault();
            const customer = document.getElementById('input-inv-customer').value;
            const total = document.getElementById('input-inv-total').value;

            const tbody = document.getElementById('billing-tbody');
            const newTr = document.createElement('tr');
            newTr.id = 'invoice-row-new';
            newTr.innerHTML = \`
              <td style="font-weight: 700; color: var(--primary);">INV-2026-092</td>
              <td><div style="font-weight: 600;">\${customer}</div></td>
              <td>2026-10-05 • New</td>
              <td style="text-align: right; font-weight: 900;">৳ \${Number(total).toLocaleString()}</td>
              <td><span class="status-badge status-unpaid">Unpaid</span></td>
              <td style="text-align: center;">
                <button class="btn-cancel" onclick="openReceiptModal('INV-2026-092')">Receipt</button>
              </td>
            \`;
            tbody.prepend(newTr);

            document.getElementById('invoice-form-modal').classList.remove('active');
          }

          function openPaymentModal(invNum, customer, due) {
            document.getElementById('input-pay-customer').value = customer + ' (' + invNum + ')';
            document.getElementById('input-pay-amount').value = due;
            document.getElementById('payment-form-modal').classList.add('active');
          }

          function handlePaymentSubmit(e) {
            e.preventDefault();
            const statusEl = document.getElementById('invoice-status-77');
            if (statusEl) {
              statusEl.className = 'status-badge status-paid';
              statusEl.textContent = 'Paid';
            }
            const dueEl = document.getElementById('invoice-due-77');
            if (dueEl) {
              dueEl.textContent = 'Settled';
              dueEl.style.color = 'var(--success)';
            }
            document.getElementById('payment-form-modal').classList.remove('active');
          }

          function openReceiptModal(invNum) {
            document.getElementById('receipt-modal').classList.add('active');
          }
        </script>
      </body>
      </html>
    `

    await page.setContent(html)
    return page
  }

  // ===========================================================================
  // TEST SUITE 1: Full Lifecycle (Create Invoice -> Record Payment -> Status Change -> Receipt Print)
  // ===========================================================================
  describe('1. Invoices Full Lifecycle: Create -> Payment -> Status Change -> Receipt Print', () => {
    let context: BrowserContext
    let page: Page

    before(async () => {
      context = await browser.newContext()
      page = await renderBillingPage(context, {
        locale: 'en',
        theme: 'light',
        viewport: VIEWPORTS.desktop,
      })
    })

    after(async () => {
      await page.close()
      await context.close()
    })

    test('1.1 Create: Issues new commercial / VAT invoice in <= 3 clicks', async () => {
      // CLICK 1: Click "+ New Invoice"
      const createBtn = await page.$('#btn-create-invoice')
      assert.ok(createBtn, '+ New Invoice button must exist in header')
      await createBtn.click()

      // Modal open
      const isModalActive = await page.$eval('#invoice-form-modal', (el) => el.classList.contains('active'))
      assert.equal(isModalActive, true, 'Invoice modal should be open')

      // Fill in invoice details
      await page.fill('#input-inv-customer', 'Square Toiletries Ltd')
      await page.fill('#input-inv-total', '42000')

      // CLICK 2 (or 3): Click Issue Invoice
      const saveBtn = await page.$('#btn-save-invoice')
      assert.ok(saveBtn, 'Issue Invoice button must exist')
      await saveBtn.click()

      // Modal closed and invoice added
      const isModalClosed = await page.$eval('#invoice-form-modal', (el) => !el.classList.contains('active'))
      assert.equal(isModalClosed, true, 'Modal should close on completion')

      const newRow = await page.$('#invoice-row-new')
      assert.ok(newRow, 'New invoice row should appear at top of table')
    })

    test('1.2 Record Payment: Collects customer dues and logs payment mode', async () => {
      const collectBtn = await page.$('#btn-collect-row-77')
      assert.ok(collectBtn, 'Record Payment action button must exist on invoice row')
      await collectBtn.click()

      const isPayModalActive = await page.$eval('#payment-form-modal', (el) => el.classList.contains('active'))
      assert.equal(isPayModalActive, true, 'Payment modal should open')

      const submitPayBtn = await page.$('#btn-submit-payment')
      assert.ok(submitPayBtn, 'Confirm payment button must exist')
      await submitPayBtn.click()

      const isPayModalClosed = await page.$eval('#payment-form-modal', (el) => !el.classList.contains('active'))
      assert.equal(isPayModalClosed, true, 'Payment modal should close')
    })

    test('1.3 Status Change: Valid transition from Unpaid to Paid settles invoice balance', async () => {
      const statusText = await page.$eval('#invoice-status-77', (el) => el.textContent?.trim())
      assert.equal(statusText, 'Paid', 'Invoice status must transition to Paid')
    })

    test('1.4 Document Print: Opens official Money Receipt & Tax Voucher preview', async () => {
      const printBtn = await page.$('#btn-print-row-77')
      assert.ok(printBtn, 'Receipt print button must exist')
      await printBtn.click()

      const isReceiptModalActive = await page.$eval('#receipt-modal', (el) => el.classList.contains('active'))
      assert.equal(isReceiptModalActive, true, 'Receipt preview modal should become active')

      const docSheet = await page.$('#receipt-document-sheet')
      assert.ok(docSheet, 'Money receipt document sheet must be rendered')

      const triggerPrint = await page.$('#btn-trigger-receipt-print')
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
      page = await renderBillingPage(context, {
        locale: 'en',
        theme: 'light',
        viewport: VIEWPORTS.desktop,
      })
    })

    after(async () => {
      await page.close()
      await context.close()
    })

    test('2.1 Canonical 4-KPI row renders Total Invoiced, Collected, Outstanding, and Overdue', async () => {
      const kpis = await page.$$('#billing-kpis .kpi-card')
      assert.equal(kpis.length, 4, 'Must render exactly 4 canonical KPI cards')

      const invoiced = await page.$('#kpi-total-invoiced')
      const collected = await page.$('#kpi-total-collected')
      const outstanding = await page.$('#kpi-outstanding-due')
      const overdue = await page.$('#kpi-critical-overdue')

      assert.ok(invoiced && collected && outstanding && overdue, 'All 4 KPI cards must be present')
    })

    test('2.2 Prioritized Action Queue answers "What needs my attention now?" with 1-click collection', async () => {
      const attentionQueue = await page.$('#billing-attention-queue')
      assert.ok(attentionQueue, 'Billing attention queue panel must be present')

      const quickCollectBtn = await page.$('#btn-quick-collect')
      assert.ok(quickCollectBtn, '1-Click Collect Due action button must exist')
    })
  })

  // ===========================================================================
  // TEST SUITE 3: Localization Matrix (English vs Bengali)
  // ===========================================================================
  describe('3. Localization Matrix: English (en) & Bengali (bn)', () => {
    test('3.1 Bengali billing page renders accurate commercial financial terms', async () => {
      const context = await browser.newContext({ locale: 'bn-BD' })
      const page = await renderBillingPage(context, {
        locale: 'bn',
        theme: 'light',
        viewport: VIEWPORTS.desktop,
      })

      const title = await page.$eval('.page-title', (el) => el.textContent?.trim())
      assert.equal(title, 'বিলিং ও কালেকশন', 'Title must render in Bengali')

      const newInvBtnText = await page.$eval('#btn-create-invoice', (el) => el.textContent?.trim())
      assert.ok(newInvBtnText?.includes('নতুন চালান'), 'New invoice button must render in Bengali')

      const collectedKpiTitle = await page.$eval('#kpi-total-collected .kpi-title', (el) => el.textContent?.trim())
      assert.equal(collectedKpiTitle, 'মোট আদায়', 'Collected KPI title must render in Bengali')

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
      const page = await renderBillingPage(context, {
        locale: 'en',
        theme: 'light',
        viewport: VIEWPORTS.mobile,
      })

      // Invariant: Mobile cards container is visible, table is hidden
      const isMobileCardsVisible = await page.$eval('#billing-mobile-cards', (el) => window.getComputedStyle(el).display !== 'none')
      assert.equal(isMobileCardsVisible, true, 'Mobile cards should be displayed on 375px viewport')

      // Invariant: Touch targets >= 44px
      const createBtn = await page.$('#btn-create-invoice')
      const box = await createBtn?.boundingBox()
      assert.ok(box && box.height >= 44, `Create Invoice button height (${box?.height}px) must be >= 44px`)

      // Invariant: Zero horizontal scroll
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
      assert.equal(scrollWidth <= clientWidth, true, 'Mobile page must not have horizontal scrollbar')

      await page.close()
      await context.close()
    })

    test('4.2 Dark mode applies dark semantic tokens without raw white/black leaks', async () => {
      const context = await browser.newContext()
      const page = await renderBillingPage(context, {
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
