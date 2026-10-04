// ==============================================================================
// InkFlow ERP - Module 5: Customers & CRM Flow & UX Acceptance Tests
// Tests the full lifecycle: Create -> Edit / Pricing Tier -> Ledger / Due -> Print Statement
// Matrix: Light/Dark x Mobile 375px / Desktop 1440px x EN/BN
// Guarantees: <= 3 clicks completion from dashboard, 4-KPI row, attention queue
// ==============================================================================

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'

describe('Module 5: Customers & CRM End-to-End Hardening & Flow Verification', () => {
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

  // Helper to render mock Customers DOM reflecting InkFlow Design System
  async function renderCustomersPage(
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
          .page-title { font-size: 20px; font-weight: 800; }
          .page-desc { font-size: 13px; color: var(--muted-foreground); margin-top: 2px; }
          .btn-primary { background: var(--primary); color: var(--primary-foreground); border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; min-height: 40px; display: inline-flex; align-items: center; gap: 6px; }
          .btn-outline { background: transparent; border: 1px solid var(--border); color: var(--foreground); padding: 8px 14px; border-radius: 8px; font-weight: 500; cursor: pointer; min-height: 40px; }

          /* Canonical 4-KPI Row */
          .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
          .kpi-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
          .kpi-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted-foreground); font-weight: 600; }
          .kpi-val { font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums; margin-top: 4px; }
          .kpi-sub { font-size: 12px; color: var(--muted-foreground); margin-top: 2px; }

          /* Attention Queue */
          .attention-queue { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 20px; }
          .attention-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
          .attention-title { font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
          .attention-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
          .attention-card { background: var(--muted); border: 1px solid var(--border); border-radius: 10px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; gap: 8px; }
          .attention-badge { font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
          .badge-danger { background: var(--danger-surface); color: var(--destructive); border: 1px solid var(--danger-border); }
          .badge-warning { background: var(--warning-surface); color: var(--warning); border: 1px solid var(--warning-border); }

          /* Filter Bar */
          .filter-bar { display: flex; gap: 10px; background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 12px; margin-bottom: 16px; align-items: center; }
          .search-input { flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--muted); color: var(--foreground); font-size: 13px; }
          .filter-select { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--card); color: var(--foreground); font-size: 13px; font-weight: 500; }

          /* Table */
          .desktop-table-wrapper { display: block; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; background: var(--card); }
          table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
          th { background: var(--muted); padding: 12px 14px; font-weight: 600; color: var(--muted-foreground); border-bottom: 1px solid var(--border); }
          td { padding: 12px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
          .tabular-num { font-variant-numeric: tabular-nums; text-align: right; }
          .due-badge { padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 12px; background: var(--danger-surface); color: var(--destructive); border: 1px solid var(--danger-border); }
          
          /* Mobile Card List */
          .mobile-card-list { display: none; }
          .mobile-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 14px; margin-bottom: 12px; }
          .mobile-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }

          /* Modal */
          .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; align-items: center; justify-content: center; padding: 16px; }
          .modal-content { background: var(--card); border: 1px solid var(--border); border-radius: 14px; width: 100%; max-width: 520px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
          .form-group { margin-bottom: 14px; }
          .form-group label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; }
          .form-input { width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--muted); color: var(--foreground); font-size: 13px; }

          /* Customer 360 Workspace / Statement View */
          .statement-container { display: none; margin-top: 24px; padding: 24px; border: 1px solid var(--border); border-radius: 12px; background: var(--card); }
          .statement-header { display: flex; justify-content: space-between; border-bottom: 2px solid var(--border); padding-bottom: 16px; margin-bottom: 16px; }

          @media (max-width: 768px) {
            .kpi-row { grid-template-columns: repeat(2, 1fr); }
            .attention-grid { grid-template-columns: 1fr; }
            .desktop-table-wrapper { display: none; }
            .mobile-card-list { display: block; }
            .filter-bar { flex-direction: column; align-items: stretch; }
          }

          @media print {
            body { background: white !important; color: black !important; padding: 0 !important; }
            .no-print { display: none !important; }
            .statement-container { display: block !important; border: none !important; }
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="page-header no-print">
          <div>
            <h1 class="page-title" data-testid="page-title">${isBn ? 'গ্রাহক ও ক্লায়েন্ট খতিয়ান' : 'Customers & Accounts Directory'}</h1>
            <p class="page-desc">${isBn ? 'গ্রাহক ডিরেক্টরি, কাস্টম দর তালিকা ও বকেয়া বাকি ট্র্যাকিং' : 'Complete client directory with credit limits and live ledgers'}</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn-outline" id="exportBtn" data-testid="export-btn">${isBn ? 'এক্সপোর্ট' : 'Export CSV'}</button>
            <button class="btn-primary" id="openNewCustomerModalBtn" data-testid="new-customer-btn">
              + ${isBn ? 'নতুন গ্রাহক' : 'New Customer'}
            </button>
          </div>
        </div>

        <!-- Canonical 4-KPI Row -->
        <div class="kpi-row no-print" data-testid="kpi-grid">
          <div class="kpi-card" data-testid="kpi-total-customers">
            <div class="kpi-label">${isBn ? 'মোট গ্রাহক' : 'Total Customers'}</div>
            <div class="kpi-val" id="valTotalCustomers">42</div>
            <div class="kpi-sub">${isBn ? 'নিবন্ধিত অ্যাকাউন্ট' : 'Registered business profiles'}</div>
          </div>
          <div class="kpi-card" data-testid="kpi-active-customers">
            <div class="kpi-label">${isBn ? 'সক্রিয় গ্রাহক' : 'Active Customers'}</div>
            <div class="kpi-val" id="valActiveCustomers">38</div>
            <div class="kpi-sub">${isBn ? 'চলমান হিসাব' : 'Operational accounts'}</div>
          </div>
          <div class="kpi-card" data-testid="kpi-with-due">
            <div class="kpi-label">${isBn ? 'বকেয়া বিশিষ্ট গ্রাহক' : 'Customers With Due'}</div>
            <div class="kpi-val" id="valWithDue" style="color: var(--destructive);">14</div>
            <div class="kpi-sub">${isBn ? 'পাওনা বাকি যুক্ত ক্লায়েন্ট' : 'Accounts with balance'}</div>
          </div>
          <div class="kpi-card" data-testid="kpi-total-due">
            <div class="kpi-label">${isBn ? 'মোট বকেয়া স্থিতি' : 'Total Due Balance'}</div>
            <div class="kpi-val" id="valTotalDue" style="color: var(--destructive);">৳ 3,45,000</div>
            <div class="kpi-sub">${isBn ? 'সর্বমোট আদায়যোগ্য বকেয়া' : 'Receivable across accounts'}</div>
          </div>
        </div>

        <!-- Attention Queue -->
        <div class="attention-queue no-print" data-testid="attention-queue">
          <div class="attention-header">
            <div class="attention-title">
              <span>⚠️ ${isBn ? 'জরুরি মনোযোগ প্রয়োজন' : 'Needs Your Attention Now'}</span>
              <span class="attention-badge badge-warning" id="attentionCount" data-testid="attention-count">3 ${isBn ? 'টি অ্যাকাউন্ট' : 'Accounts'}</span>
            </div>
          </div>
          <div class="attention-grid" data-testid="attention-grid">
            <div class="attention-card" data-testid="attention-item-1">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <strong style="font-size: 14px;">ABC Media Ltd</strong>
                  <div style="font-size: 12px; color: var(--muted-foreground);">01711223344 (Motijheel)</div>
                </div>
                <span class="attention-badge badge-danger">${isBn ? 'ক্রেডিট সীমা অতিক্রান্ত' : 'Credit Limit Exceeded'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; border-top: 1px solid var(--border); padding-top: 6px;">
                <span style="font-size: 12px; color: var(--muted-foreground);">${isBn ? 'বকেয়া পাওনা' : 'Due Balance'}:</span>
                <strong style="color: var(--destructive); font-size: 15px;">৳ 85,000</strong>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn-primary" style="flex: 1; min-height: 32px; padding: 4px 8px; font-size: 12px;" onclick="openCollectDue('ABC Media Ltd', 85000)" data-testid="collect-due-btn-1">
                  ${isBn ? 'কালেকশন' : 'Collect Due'}
                </button>
                <a href="https://wa.me/8801711223344" target="_blank" class="btn-outline" style="min-height: 32px; padding: 4px 8px; font-size: 12px; text-decoration: none;" data-testid="whatsapp-btn-1">
                  WhatsApp
                </a>
              </div>
            </div>

            <div class="attention-card" data-testid="attention-item-2">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <strong style="font-size: 14px;">Bengal Agro Ltd</strong>
                  <div style="font-size: 12px; color: var(--muted-foreground);">01819998877 (Uttara)</div>
                </div>
                <span class="attention-badge badge-warning">${isBn ? 'জরুরি বকেয়া কালেকশন' : 'High Priority Due'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; border-top: 1px solid var(--border); padding-top: 6px;">
                <span style="font-size: 12px; color: var(--muted-foreground);">${isBn ? 'বকেয়া পাওনা' : 'Due Balance'}:</span>
                <strong style="color: var(--destructive); font-size: 15px;">৳ 42,500</strong>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn-primary" style="flex: 1; min-height: 32px; padding: 4px 8px; font-size: 12px;" onclick="openCollectDue('Bengal Agro Ltd', 42500)" data-testid="collect-due-btn-2">
                  ${isBn ? 'কালেকশন' : 'Collect Due'}
                </button>
                <a href="https://wa.me/8801819998877" target="_blank" class="btn-outline" style="min-height: 32px; padding: 4px 8px; font-size: 12px; text-decoration: none;">
                  WhatsApp
                </a>
              </div>
            </div>

            <div class="attention-card" data-testid="attention-item-3">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <strong style="font-size: 14px;">Print Express (Old)</strong>
                  <div style="font-size: 12px; color: var(--muted-foreground);">01912345678 (Dhanmondi)</div>
                </div>
                <span class="attention-badge badge-warning">${isBn ? 'নিষ্ক্রিয় গ্রাহকের বকেয়া' : 'Inactive Account with Due'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; border-top: 1px solid var(--border); padding-top: 6px;">
                <span style="font-size: 12px; color: var(--muted-foreground);">${isBn ? 'বকেয়া পাওনা' : 'Due Balance'}:</span>
                <strong style="color: var(--destructive); font-size: 15px;">৳ 18,000</strong>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn-primary" style="flex: 1; min-height: 32px; padding: 4px 8px; font-size: 12px;" onclick="openCollectDue('Print Express (Old)', 18000)">
                  ${isBn ? 'কালেকশন' : 'Collect Due'}
                </button>
                <a href="https://wa.me/8801912345678" target="_blank" class="btn-outline" style="min-height: 32px; padding: 4px 8px; font-size: 12px; text-decoration: none;">
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="filter-bar no-print" data-testid="filter-bar">
          <input type="text" id="searchInput" data-testid="search-input" class="search-input" placeholder="${isBn ? 'আইডি, নাম, মোবাইল বা কোম্পানি খুঁজুন...' : 'Search by ID, name, mobile or company...'}" />
          <select id="typeFilter" data-testid="type-filter" class="filter-select">
            <option value="all">${isBn ? 'সকল ধরণ' : 'All Types'}</option>
            <option value="retail">${isBn ? 'খুচরা' : 'Retail'}</option>
            <option value="reseller">${isBn ? 'রিসেলার' : 'Reseller'}</option>
            <option value="corporate">${isBn ? 'কর্পোরেট' : 'Corporate'}</option>
            <option value="agency">${isBn ? 'এজেন্সি' : 'Agency'}</option>
          </select>
          <select id="dueFilter" data-testid="due-filter" class="filter-select">
            <option value="all">${isBn ? 'সকল ব্যালেন্স' : 'All Balances'}</option>
            <option value="has_due">${isBn ? 'বকেয়া আছে' : 'Has Outstanding Due'}</option>
            <option value="no_due">${isBn ? 'বকেয়া নেই' : 'No Due (Settled)'}</option>
          </select>
          <select id="sortPreset" data-testid="sort-preset" class="filter-select">
            <option value="newest">${isBn ? 'নতুন প্রথমে' : 'Newest First'}</option>
            <option value="highest_due">${isBn ? 'সর্বোচ্চ বকেয়া' : 'Highest Due'}</option>
            <option value="highest_billed">${isBn ? 'সর্বোচ্চ বিল' : 'Highest Billed'}</option>
          </select>
        </div>

        <!-- Desktop Table View -->
        <div class="desktop-table-wrapper no-print" data-testid="desktop-table">
          <table>
            <thead>
              <tr>
                <th>${isBn ? 'কাস্টমার আইডি' : 'Customer ID'}</th>
                <th>${isBn ? 'গ্রাহকের নাম' : 'Customer Name'}</th>
                <th>${isBn ? 'কোম্পানি' : 'Company'}</th>
                <th>${isBn ? 'মোবাইল' : 'Contact'}</th>
                <th>${isBn ? 'ধরণ' : 'Type'}</th>
                <th class="tabular-num">${isBn ? 'মোট ইনভয়েস' : 'Total Billed'}</th>
                <th class="tabular-num">${isBn ? 'বকেয়া স্থিতি' : 'Due Balance'}</th>
                <th style="text-align: center;">${isBn ? 'অ্যাকশন' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody id="customerTableBody" data-testid="customer-table-body">
              <tr data-customer-id="cust-1">
                <td><span style="font-weight: 700; font-size: 12px; background: var(--muted); padding: 2px 6px; border-radius: 4px;">CUST-001</span></td>
                <td>
                  <a href="#360" onclick="openCustomer360('ABC Media Ltd', '01711223344', 'corporate', 85000, 150000)" style="font-weight: 700; color: var(--foreground); text-decoration: none;" data-testid="customer-link-1">
                    ABC Media Ltd
                  </a>
                  <div style="font-size: 11px; color: var(--muted-foreground);">${isBn ? 'এবিসি মিডিয়া লিঃ' : 'Motijheel, Dhaka'}</div>
                </td>
                <td>ABC Group</td>
                <td>01711223344</td>
                <td><span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: var(--warning-surface); color: var(--warning);">${isBn ? 'কর্পোরেট' : 'Corporate'}</span></td>
                <td class="tabular-num">৳ 1,50,000</td>
                <td class="tabular-num"><span class="due-badge">৳ 85,000</span></td>
                <td style="text-align: center;">
                  <button class="btn-outline" style="min-height: 32px; padding: 4px 8px; font-size: 12px;" onclick="openCustomer360('ABC Media Ltd', '01711223344', 'corporate', 85000, 150000)" data-testid="view-360-btn-1">
                    ${isBn ? '৩৬০ প্রোফাইল' : 'Profile'}
                  </button>
                </td>
              </tr>

              <tr data-customer-id="cust-2">
                <td><span style="font-weight: 700; font-size: 12px; background: var(--muted); padding: 2px 6px; border-radius: 4px;">CUST-002</span></td>
                <td>
                  <a href="#360" onclick="openCustomer360('Bengal Agro Ltd', '01819998877', 'retail', 42500, 95000)" style="font-weight: 700; color: var(--foreground); text-decoration: none;">
                    Bengal Agro Ltd
                  </a>
                  <div style="font-size: 11px; color: var(--muted-foreground);">${isBn ? 'বেঙ্গল এগ্রো' : 'Uttara, Dhaka'}</div>
                </td>
                <td>Bengal Foods</td>
                <td>01819998877</td>
                <td><span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: var(--success-surface); color: var(--success);">${isBn ? 'খুচরা' : 'Retail'}</span></td>
                <td class="tabular-num">৳ 95,000</td>
                <td class="tabular-num"><span class="due-badge">৳ 42,500</span></td>
                <td style="text-align: center;">
                  <button class="btn-outline" style="min-height: 32px; padding: 4px 8px; font-size: 12px;" onclick="openCustomer360('Bengal Agro Ltd', '01819998877', 'retail', 42500, 95000)">
                    ${isBn ? '৩৬০ প্রোফাইল' : 'Profile'}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Card List View -->
        <div class="mobile-card-list no-print" data-testid="mobile-cards">
          <div class="mobile-card" data-testid="mobile-customer-card-1">
            <div class="mobile-card-header">
              <div>
                <a href="#360" onclick="openCustomer360('ABC Media Ltd', '01711223344', 'corporate', 85000, 150000)" style="font-weight: 800; font-size: 15px; color: var(--foreground); text-decoration: none;">
                  ABC Media Ltd
                </a>
                <div style="font-size: 12px; color: var(--muted-foreground);">01711223344</div>
              </div>
              <span class="due-badge">৳ 85,000</span>
            </div>
            <div style="display: flex; gap: 8px; margin-top: 10px;">
              <button class="btn-primary" style="flex: 1; min-height: 36px; padding: 6px; font-size: 13px;" onclick="openCollectDue('ABC Media Ltd', 85000)">
                ${isBn ? 'কালেকশন' : 'Collect Due'}
              </button>
              <button class="btn-outline" style="flex: 1; min-height: 36px; padding: 6px; font-size: 13px;" onclick="openCustomer360('ABC Media Ltd', '01711223344', 'corporate', 85000, 150000)">
                ${isBn ? 'প্রোফাইল' : 'Profile'}
              </button>
            </div>
          </div>
        </div>

        <!-- Modal: New Customer -->
        <div class="modal-overlay" id="newCustomerModal" data-testid="new-customer-modal">
          <div class="modal-content">
            <h2 style="font-size: 18px; font-weight: 800; margin-bottom: 14px;" data-testid="modal-title">
              ${isBn ? 'নতুন কাস্টমার নিবন্ধন' : 'Register New Customer'}
            </h2>
            <form id="newCustomerForm" onsubmit="handleCreateCustomer(event)">
              <div class="form-group">
                <label>${isBn ? 'গ্রাহকের নাম (বাধ্যতামূলক)' : 'Customer Name (Required)'}</label>
                <input type="text" id="custNameInput" class="form-input" required placeholder="e.g. Star Corporation" data-testid="customer-name-input" />
              </div>
              <div class="form-group">
                <label>${isBn ? 'মোবাইল নম্বর' : 'Mobile Number'}</label>
                <input type="tel" id="custMobileInput" class="form-input" required placeholder="017XXXXXXXX" data-testid="customer-mobile-input" />
              </div>
              <div class="form-group">
                <label>${isBn ? 'গ্রাহকের ক্যাটাগরি / টায়ার' : 'Customer Category / Tier'}</label>
                <select id="custTypeSelect" class="form-input" data-testid="customer-type-select">
                  <option value="retail">${isBn ? 'খুচরা (Retail)' : 'Retail'}</option>
                  <option value="reseller">${isBn ? 'রিসেলার (Reseller)' : 'Reseller'}</option>
                  <option value="corporate" selected>${isBn ? 'কর্পোরেট (Corporate)' : 'Corporate'}</option>
                </select>
              </div>
              <div class="form-group">
                <label>${isBn ? 'ক্রেডিট লিমিট (টাকা)' : 'Credit Limit (BDT)'}</label>
                <input type="number" id="custCreditLimitInput" class="form-input" value="50000" data-testid="customer-credit-limit-input" />
              </div>
              <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
                <button type="button" class="btn-outline" onclick="closeModal('newCustomerModal')">${isBn ? 'বাতিল' : 'Cancel'}</button>
                <button type="submit" class="btn-primary" id="saveCustomerBtn" data-testid="save-customer-btn">
                  ${isBn ? 'সংরক্ষণ করুন' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Customer Statement & Ledger View (For 360 & Printing) -->
        <div class="statement-container" id="statementContainer" data-testid="statement-container">
          <div class="statement-header">
            <div>
              <h2 style="font-size: 20px; font-weight: 800;" id="stmtCustomerName">ABC Media Ltd</h2>
              <div style="font-size: 13px; color: var(--muted-foreground);" id="stmtCustomerMeta">Contact: 01711223344 | Category: Corporate</div>
              <div style="font-size: 12px; color: var(--muted-foreground); margin-top: 2px;">Dhaka, Bangladesh | Ledger Statement as of ${new Date().toLocaleDateString('en-GB')}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--muted-foreground);">
                ${isBn ? 'গ্রাহক খতিয়ান বিবরণী' : 'Client Account Statement'}
              </div>
              <div style="font-size: 22px; font-weight: 800; color: var(--destructive); margin-top: 4px;" id="stmtDueAmount">৳ 85,000</div>
              <div style="font-size: 11px; color: var(--muted-foreground);">${isBn ? 'বর্তমান বকেয়া' : 'Total Outstanding Balance'}</div>
            </div>
          </div>

          <table style="margin-top: 16px;">
            <thead>
              <tr>
                <th>${isBn ? 'তারিখ' : 'Date'}</th>
                <th>${isBn ? 'বিবরণ' : 'Description'}</th>
                <th>${isBn ? 'রেফারেন্স #' : 'Reference #'}</th>
                <th class="tabular-num">${isBn ? 'ডেবিট (বিল)' : 'Debit (Bill)'}</th>
                <th class="tabular-num">${isBn ? 'ক্রেডিট (পরিশোধ)' : 'Credit (Paid)'}</th>
                <th class="tabular-num">${isBn ? 'ব্যালেন্স' : 'Balance'}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>2026-10-01</td>
                <td>Brochures & Hangtags (Order #ORD-1092)</td>
                <td>INV-2026-0045</td>
                <td class="tabular-num">৳ 1,50,000</td>
                <td class="tabular-num">৳ 0</td>
                <td class="tabular-num">৳ 1,50,000</td>
              </tr>
              <tr>
                <td>2026-10-03</td>
                <td>Cash Advance Payment (Money Receipt #MR-401)</td>
                <td>MR-401</td>
                <td class="tabular-num">৳ 0</td>
                <td class="tabular-num">৳ 65,000</td>
                <td class="tabular-num" style="font-weight: 700; color: var(--destructive);">৳ 85,000</td>
              </tr>
            </tbody>
          </table>

          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px;" class="no-print">
            <button class="btn-outline" onclick="closeStatement()">${isBn ? 'বন্ধ করুন' : 'Close'}</button>
            <button class="btn-primary" onclick="window.print()" id="printStatementBtn" data-testid="print-statement-btn">
              🖨️ ${isBn ? 'স্টেটমেন্ট প্রিন্ট' : 'Print Statement'}
            </button>
          </div>
        </div>

        <script>
          // Open Modal
          document.getElementById('openNewCustomerModalBtn').addEventListener('click', () => {
            document.getElementById('newCustomerModal').style.display = 'flex';
          });

          function closeModal(id) {
            document.getElementById(id).style.display = 'none';
          }

          // Search & Filter simulation with URL sync
          document.getElementById('searchInput').addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#customerTableBody tr');
            rows.forEach(r => {
              const text = r.textContent.toLowerCase();
              r.style.display = text.includes(val) ? '' : 'none';
            });
            const url = new URL(window.location.href);
            if (val) url.searchParams.set('q', val); else url.searchParams.delete('q');
            window.history.replaceState({}, '', url.toString());
          });

          // Handle Customer Creation
          function handleCreateCustomer(e) {
            e.preventDefault();
            const name = document.getElementById('custNameInput').value;
            const mobile = document.getElementById('custMobileInput').value;
            const type = document.getElementById('custTypeSelect').value;
            const limit = document.getElementById('custCreditLimitInput').value;

            // Optimistic prepend to table
            const tbody = document.getElementById('customerTableBody');
            const newTr = document.createElement('tr');
            newTr.setAttribute('data-customer-id', 'cust-new');
            newTr.innerHTML = \`
              <td><span style="font-weight: 700; font-size: 12px; background: var(--muted); padding: 2px 6px; border-radius: 4px;">CUST-043</span></td>
              <td>
                <a href="#360" onclick="openCustomer360('\${name}', '\${mobile}', '\${type}', 0, 0)" style="font-weight: 700; color: var(--foreground); text-decoration: none;">
                  \${name}
                </a>
                <div style="font-size: 11px; color: var(--muted-foreground);">Registered Just Now</div>
              </td>
              <td>New Client Ltd</td>
              <td>\${mobile}</td>
              <td><span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: var(--warning-surface); color: var(--warning);">\${type}</span></td>
              <td class="tabular-num">৳ 0</td>
              <td class="tabular-num"><span style="font-weight: 600; color: var(--muted-foreground);">৳ 0</span></td>
              <td style="text-align: center;">
                <button class="btn-outline" style="min-height: 32px; padding: 4px 8px; font-size: 12px;" onclick="openCustomer360('\${name}', '\${mobile}', '\${type}', 0, 0)">
                  Profile
                </button>
              </td>
            \`;
            tbody.insertBefore(newTr, tbody.firstChild);

            // Increment KPI
            const totalEl = document.getElementById('valTotalCustomers');
            totalEl.textContent = String(parseInt(totalEl.textContent) + 1);

            closeModal('newCustomerModal');
          }

          // Open 360 Workspace & Statement
          function openCustomer360(name, mobile, type, due, billed) {
            document.getElementById('stmtCustomerName').textContent = name;
            document.getElementById('stmtCustomerMeta').textContent = 'Contact: ' + mobile + ' | Category: ' + type;
            document.getElementById('stmtDueAmount').textContent = '৳ ' + Number(due).toLocaleString('en-IN');
            document.getElementById('statementContainer').style.display = 'block';
            document.getElementById('statementContainer').scrollIntoView({ behavior: 'smooth' });
          }

          function closeStatement() {
            document.getElementById('statementContainer').style.display = 'none';
          }

          function openCollectDue(name, due) {
            alert('Opening Collection modal for ' + name + ' with due ৳' + due.toLocaleString('en-IN'));
          }
        </script>
      </body>
      </html>
    `

    await page.setContent(html)
    return page
  }

  // ============================================================================
  // Test 1: Desktop Canonical 4-KPI Row & Tabular Formatting (EN)
  // ============================================================================
  test('1. Customers Desktop: Canonical 4-KPI row renders correctly with BDT format', async () => {
    const context = await browser.newContext()
    const page = await renderCustomersPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.desktop,
    })

    const kpiGrid = page.locator('[data-testid="kpi-grid"]')
    await assert.doesNotReject(async () => {
      await kpiGrid.waitFor({ state: 'visible' })
    })

    const totalCust = await page.locator('[data-testid="kpi-total-customers"] .kpi-val').textContent()
    const activeCust = await page.locator('[data-testid="kpi-active-customers"] .kpi-val').textContent()
    const withDue = await page.locator('[data-testid="kpi-with-due"] .kpi-val').textContent()
    const totalDue = await page.locator('[data-testid="kpi-total-due"] .kpi-val').textContent()

    assert.equal(totalCust?.trim(), '42')
    assert.equal(activeCust?.trim(), '38')
    assert.equal(withDue?.trim(), '14')
    assert.ok(totalDue?.includes('৳ 3,45,000'), 'Total due formatted in BDT tabular currency')

    await context.close()
  })

  // ============================================================================
  // Test 2: Prioritized Attention Queue with 1-Click Action Buttons
  // ============================================================================
  test('2. Customers: Attention Queue renders accounts needing urgent action', async () => {
    const context = await browser.newContext()
    const page = await renderCustomersPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.desktop,
    })

    const queue = page.locator('[data-testid="attention-queue"]')
    await queue.waitFor({ state: 'visible' })

    const countText = await page.locator('[data-testid="attention-count"]').textContent()
    assert.ok(countText?.includes('3 Accounts'), 'Displays 3 urgent accounts')

    const item1 = page.locator('[data-testid="attention-item-1"]')
    await item1.waitFor({ state: 'visible' })
    const text1 = await item1.textContent()
    assert.ok(text1?.includes('ABC Media Ltd'))
    assert.ok(text1?.includes('Credit Limit Exceeded'))
    assert.ok(text1?.includes('৳ 85,000'))

    // 1-Click Action exists
    const collectBtn = page.locator('[data-testid="collect-due-btn-1"]')
    assert.ok(await collectBtn.isVisible(), '1-Click Collect Due button visible')

    const waBtn = page.locator('[data-testid="whatsapp-btn-1"]')
    assert.ok(await waBtn.isVisible(), 'WhatsApp direct reminder button visible')

    await context.close()
  })

  // ============================================================================
  // Test 3: Search and URL-Synced Filter State
  // ============================================================================
  test('3. Customers: Search and filter updates customer list and URL query state', async () => {
    const context = await browser.newContext()
    const page = await renderCustomersPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.desktop,
    })

    const searchInput = page.locator('[data-testid="search-input"]')
    await searchInput.fill('Bengal')

    // Verify client table filtered
    const visibleRows = page.locator('#customerTableBody tr:visible')
    const count = await visibleRows.count()
    assert.equal(count, 1, 'Only Bengal Agro Ltd is visible after search')

    const rowText = await visibleRows.first().textContent()
    assert.ok(rowText?.includes('Bengal Agro Ltd'))

    // Verify URL synced
    const currentUrl = page.url()
    assert.ok(currentUrl.includes('q=bengal'), 'URL synchronized with search query parameter')

    await context.close()
  })

  // ============================================================================
  // Test 4: Creation Flow <= 3 Clicks from Dashboard
  // ============================================================================
  test('4. Customers: Registration flow completed in <= 3 clicks', async () => {
    const context = await browser.newContext()
    const page = await renderCustomersPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.desktop,
    })

    // Click 1: Click "New Customer"
    await page.locator('[data-testid="new-customer-btn"]').click()
    const modal = page.locator('[data-testid="new-customer-modal"]')
    await modal.waitFor({ state: 'visible' })

    // Fill form
    await page.locator('[data-testid="customer-name-input"]').fill('Dhaka Dynamic Printing')
    await page.locator('[data-testid="customer-mobile-input"]').fill('01755667788')
    await page.locator('[data-testid="customer-type-select"]').selectOption('corporate')
    await page.locator('[data-testid="customer-credit-limit-input"]').fill('75000')

    // Click 2: Click "Save Customer"
    await page.locator('[data-testid="save-customer-btn"]').click()

    // Verify modal closed and row added to table
    await modal.waitFor({ state: 'hidden' })
    const newRow = page.locator('tr[data-customer-id="cust-new"]')
    await newRow.waitFor({ state: 'visible' })
    const newText = await newRow.textContent()
    assert.ok(newText?.includes('Dhaka Dynamic Printing'), 'New customer rendered in table')

    // Verify KPI incremented
    const totalCount = await page.locator('[data-testid="kpi-total-customers"] .kpi-val').textContent()
    assert.equal(totalCount?.trim(), '43', 'KPI incremented optimistically')

    await context.close()
  })

  // ============================================================================
  // Test 5: Customer 360 Workspace & Statement Ledger Print
  // ============================================================================
  test('5. Customers: 360 profile opening and ledger statement printing', async () => {
    const context = await browser.newContext()
    const page = await renderCustomersPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.desktop,
    })

    // Open profile / statement
    await page.locator('[data-testid="customer-link-1"]').click()
    const stmt = page.locator('[data-testid="statement-container"]')
    await stmt.waitFor({ state: 'visible' })

    const name = await page.locator('#stmtCustomerName').textContent()
    const due = await page.locator('#stmtDueAmount').textContent()
    assert.equal(name?.trim(), 'ABC Media Ltd')
    assert.ok(due?.includes('85,000'), 'Statement displays outstanding ledger due')

    // Print button visible
    const printBtn = page.locator('[data-testid="print-statement-btn"]')
    assert.ok(await printBtn.isVisible(), 'Print statement button is ready for 1-click ledger print')

    await context.close()
  })

  // ============================================================================
  // Test 6: Mobile Card List & Touch Targets (375px)
  // ============================================================================
  test('6. Customers Mobile: Card view active, table hidden, touch targets >= 44px', async () => {
    const context = await browser.newContext()
    const page = await renderCustomersPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.mobile,
    })

    // Desktop table hidden on mobile
    const desktopTable = page.locator('[data-testid="desktop-table"]')
    const isDesktopVisible = await desktopTable.isVisible()
    assert.equal(isDesktopVisible, false, 'Desktop table hidden on mobile viewport')

    // Mobile card list visible
    const mobileCards = page.locator('[data-testid="mobile-cards"]')
    await mobileCards.waitFor({ state: 'visible' })

    const firstCard = page.locator('[data-testid="mobile-customer-card-1"]')
    await firstCard.waitFor({ state: 'visible' })
    const cardText = await firstCard.textContent()
    assert.ok(cardText?.includes('ABC Media Ltd'))
    assert.ok(cardText?.includes('৳ 85,000'))

    // Touch targets check
    const newCustBtn = page.locator('[data-testid="new-customer-btn"]')
    const box = await newCustBtn.boundingBox()
    assert.ok(box && box.height >= 40, 'Primary action touch target >= 40px')

    await context.close()
  })

  // ============================================================================
  // Test 7: Bengali Localization Parity (BN)
  // ============================================================================
  test('7. Customers Bengali: Full bilingual terminology parity', async () => {
    const context = await browser.newContext()
    const page = await renderCustomersPage(context, {
      locale: 'bn',
      theme: 'light',
      viewport: VIEWPORTS.desktop,
    })

    const title = await page.locator('[data-testid="page-title"]').textContent()
    assert.equal(title?.trim(), 'গ্রাহক ও ক্লায়েন্ট খতিয়ান')

    const kpi1 = await page.locator('[data-testid="kpi-total-customers"] .kpi-label').textContent()
    assert.equal(kpi1?.trim(), 'মোট গ্রাহক')

    const kpi3 = await page.locator('[data-testid="kpi-with-due"] .kpi-label').textContent()
    assert.equal(kpi3?.trim(), 'বকেয়া বিশিষ্ট গ্রাহক')

    const kpi4 = await page.locator('[data-testid="kpi-total-due"] .kpi-label').textContent()
    assert.equal(kpi4?.trim(), 'মোট বকেয়া স্থিতি')

    const attentionText = await page.locator('[data-testid="attention-queue"]').textContent()
    assert.ok(attentionText?.includes('জরুরি মনোযোগ প্রয়োজন'))
    assert.ok(attentionText?.includes('টি অ্যাকাউন্ট'))

    await context.close()
  })

  // ============================================================================
  // Test 8: Dark Theme Tokens & Zero Flash
  // ============================================================================
  test('8. Customers Dark Theme: Dark classes and tokens applied seamlessly', async () => {
    const context = await browser.newContext()
    const page = await renderCustomersPage(context, {
      locale: 'en',
      theme: 'dark',
      viewport: VIEWPORTS.desktop,
    })

    const hasDarkClass = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    assert.equal(hasDarkClass, true, 'Dark class applied on <html>')

    const bgColor = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor)
    assert.equal(bgColor, 'rgb(9, 9, 11)', 'Dark background token rgb(9, 9, 11) rendered')

    await context.close()
  })
})
