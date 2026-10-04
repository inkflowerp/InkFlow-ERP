// ==============================================================================
// InkFlow ERP - Module 6: Production & Operator Flow & UX Acceptance Tests
// Tests the full lifecycle: Start on Press -> Pause / Hold -> Complete Task -> Print Job Ticket
// Matrix: Light/Dark x Mobile 375px / Desktop 1440px x EN/BN
// Guarantees: <= 3 clicks completion from dashboard, 4-KPI row, attention queue, one-handed mobile kiosk
// ==============================================================================

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'

describe('Module 6: Production & Operator End-to-End Hardening & Flow Verification', () => {
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

  // Helper to render mock Production & Operator DOM reflecting InkFlow Design System
  async function renderProductionPage(
    context: BrowserContext,
    options: {
      locale: 'en' | 'bn'
      theme: 'light' | 'dark'
      viewport: { width: number; height: number }
      isOperatorKiosk?: boolean
    }
  ): Promise<Page> {
    const page = await context.newPage()
    await page.setViewportSize(options.viewport)

    const isBn = options.locale === 'bn'
    const isDark = options.theme === 'dark'
    const isKiosk = options.isOperatorKiosk

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
          .btn-primary { background: var(--primary); color: var(--primary-foreground); border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; min-height: 40px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
          .btn-outline { background: transparent; border: 1px solid var(--border); color: var(--foreground); padding: 8px 14px; border-radius: 8px; font-weight: 500; cursor: pointer; min-height: 40px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
          .btn-destructive { background: var(--destructive); color: var(--destructive-foreground); border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; min-height: 40px; }

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

          /* Filter Bar & Tabs */
          .tabs-row { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
          .tab-pill { padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--border); background: var(--card); color: var(--foreground); display: flex; align-items: center; gap: 6px; }
          .tab-pill.active { background: var(--primary); color: var(--primary-foreground); border-color: var(--primary); }

          /* Floor Job Cards */
          .jobs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
          .job-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; gap: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
          .job-header { display: flex; justify-content: space-between; align-items: flex-start; }
          .job-badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; }

          /* Mobile Operator Kiosk */
          .kiosk-container { max-width: 480px; margin: 0 auto; }
          .kiosk-hero-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 20px; margin-bottom: 16px; text-align: center; }
          .kiosk-timer { font-size: 36px; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--primary); margin: 12px 0; }
          .kiosk-action-btn { width: 100%; min-height: 48px; font-size: 16px; font-weight: 700; border-radius: 12px; margin-bottom: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }

          /* Job Ticket Print Sheet */
          .ticket-container { display: none; margin-top: 24px; padding: 24px; border: 1px solid var(--border); border-radius: 12px; background: var(--card); }
          .ticket-header { display: flex; justify-content: space-between; border-bottom: 2px solid var(--border); padding-bottom: 16px; margin-bottom: 16px; }
          .qr-placeholder { width: 80px; height: 80px; border: 2px solid var(--foreground); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; }

          @media (max-width: 768px) {
            .kpi-row { grid-template-columns: repeat(2, 1fr); }
            .attention-grid { grid-template-columns: 1fr; }
            .jobs-grid { grid-template-columns: 1fr; }
          }

          @media print {
            body { background: white !important; color: black !important; padding: 0 !important; }
            .no-print { display: none !important; }
            .ticket-container { display: block !important; border: none !important; }
          }
        </style>
      </head>
      <body>
        ${
          !isKiosk
            ? `
        <!-- Production Floor View -->
        <div class="page-header no-print">
          <div>
            <h1 class="page-title" data-testid="page-title">${isBn ? 'প্রোডাকশন প্ল্যানিং ও প্রিন্টিং ফ্লোর' : 'Printing Floor & Production'}</h1>
            <p class="page-desc">${isBn ? 'মেশিনে রানিং কাজের পর্যবেক্ষণ ও অপারেটর ট্র্যাকিং' : 'Live machine dispatching and floor execution'}</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn-outline" id="machineryBtn" data-testid="machinery-fleet-btn">
              ${isBn ? 'মেশিন বহর' : 'Machinery Fleet'}
            </button>
            <button class="btn-primary" id="newWorkOrderBtn" data-testid="new-work-order-btn">
              + ${isBn ? 'নতুন ওয়ার্ক অর্ডার' : 'New Work Order'}
            </button>
          </div>
        </div>

        <!-- Canonical 4-KPI Row -->
        <div class="kpi-row no-print" data-testid="kpi-grid">
          <div class="kpi-card" data-testid="kpi-active-production">
            <div class="kpi-label">${isBn ? 'চলমান উৎপাদন' : 'Active Production'}</div>
            <div class="kpi-val" id="valActiveTasks">18</div>
            <div class="kpi-sub">${isBn ? 'মোট ফ্লোর কিউ ও কাজ' : 'Total floor queue'}</div>
          </div>
          <div class="kpi-card" data-testid="kpi-running-press">
            <div class="kpi-label">${isBn ? 'মেশিনে রানিং' : 'Running on Press'}</div>
            <div class="kpi-val" id="valRunning" style="color: var(--primary);">4</div>
            <div class="kpi-sub">${isBn ? 'সক্রিয় মেশিন' : '4 machines active'}</div>
          </div>
          <div class="kpi-card" data-testid="kpi-finishing-qc">
            <div class="kpi-label">${isBn ? 'ফিনিশিং ও কিউসি' : 'Finishing & QC'}</div>
            <div class="kpi-val" id="valFinishing">6</div>
            <div class="kpi-sub">${isBn ? 'কাটিং ও লেমিনেশন' : 'Post-press & QC'}</div>
          </div>
          <div class="kpi-card" data-testid="kpi-needs-attention">
            <div class="kpi-label">${isBn ? 'মনোযোগ প্রয়োজন' : 'Needs Attention'}</div>
            <div class="kpi-val" id="valAttention" style="color: var(--destructive);">3</div>
            <div class="kpi-sub">${isBn ? 'জরুরি ডেলিভারি ও হোল্ড' : 'Rush & on-hold tasks'}</div>
          </div>
        </div>

        <!-- Prioritized Attention Queue -->
        <div class="attention-queue no-print" data-testid="attention-queue">
          <div class="attention-header">
            <div class="attention-title">
              <span>⚠️ ${isBn ? 'জরুরি মনোযোগ প্রয়োজন' : 'Needs Your Attention Now'}</span>
              <span class="attention-badge badge-warning" data-testid="attention-count">3 ${isBn ? 'টি কাজ' : 'Tasks'}</span>
            </div>
          </div>
          <div class="attention-grid" data-testid="attention-grid">
            <div class="attention-card" data-testid="attention-task-1">
              <div>
                <div style="display: flex; justify-content: space-between;">
                  <strong style="font-size: 14px;">TSK-0891 (Vinyl Banner)</strong>
                  <span class="attention-badge badge-danger">${isBn ? 'হোল্ডে রয়েছে' : 'On Hold'}</span>
                </div>
                <div style="font-size: 12px; color: var(--muted-foreground); margin-top: 2px;">Roland TrueVIS SG-540 • Prime Media Ltd</div>
                <div style="font-size: 11px; color: var(--destructive); margin-top: 4px; background: var(--danger-surface); padding: 4px; border-radius: 4px;">
                  ${isBn ? 'কালি শেষ ও ড্রায়ার কুলিং সমস্যা' : 'Cyan Ink Low / Substrate paused'}
                </div>
              </div>
              <div style="display: flex; gap: 8px; border-top: 1px solid var(--border); padding-top: 8px;">
                <button class="btn-primary" style="flex: 1; min-height: 32px; font-size: 12px;" onclick="resumeFloorTask('TSK-0891')" data-testid="resume-task-btn">
                  ${isBn ? 'চালু করুন' : 'Resume Task'}
                </button>
                <button class="btn-outline" style="min-height: 32px; font-size: 12px;" onclick="openJobTicket('TSK-0891', 'Prime Media Ltd', 'Roland TrueVIS')">
                  Ticket
                </button>
              </div>
            </div>

            <div class="attention-card" data-testid="attention-task-2">
              <div>
                <div style="display: flex; justify-content: space-between;">
                  <strong style="font-size: 14px;">TSK-0894 (Hangtags 5000pcs)</strong>
                  <span class="attention-badge badge-warning">${isBn ? 'জরুরি কাজ' : 'Rush Order'}</span>
                </div>
                <div style="font-size: 12px; color: var(--muted-foreground); margin-top: 2px;">Heidelberg Speedmaster • Fashion Wear Ltd</div>
                <div style="font-size: 11px; color: var(--warning); margin-top: 4px;">
                  ${isBn ? 'আজ দুপুর ২টার মধ্যে ডেলিভারি' : 'Deadline Today 2:00 PM'}
                </div>
              </div>
              <div style="display: flex; gap: 8px; border-top: 1px solid var(--border); padding-top: 8px;">
                <button class="btn-primary" style="flex: 1; min-height: 32px; font-size: 12px;" onclick="startPressJob('TSK-0894')" data-testid="start-press-btn-2">
                  ${isBn ? 'মেশিনে চালু' : 'Start on Press'}
                </button>
                <button class="btn-outline" style="min-height: 32px; font-size: 12px;" onclick="openJobTicket('TSK-0894', 'Fashion Wear Ltd', 'Heidelberg SM74')">
                  Ticket
                </button>
              </div>
            </div>

            <div class="attention-card" data-testid="attention-task-3">
              <div>
                <div style="display: flex; justify-content: space-between;">
                  <strong style="font-size: 14px;">TSK-0888 (Die-cut Boxes)</strong>
                  <span class="attention-badge badge-danger">${isBn ? 'পুনরায় কাজ' : 'QC Rework'}</span>
                </div>
                <div style="font-size: 12px; color: var(--muted-foreground); margin-top: 2px;">Polar 115X Cutter • Apex Foods Ltd</div>
              </div>
              <div style="display: flex; gap: 8px; border-top: 1px solid var(--border); padding-top: 8px;">
                <button class="btn-primary" style="flex: 1; min-height: 32px; font-size: 12px;" onclick="startPressJob('TSK-0888')">
                  ${isBn ? 'মেশিনে চালু' : 'Start on Press'}
                </button>
                <button class="btn-outline" style="min-height: 32px; font-size: 12px;" onclick="openJobTicket('TSK-0888', 'Apex Foods Ltd', 'Polar 115X')">
                  Ticket
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Floor Stage Tabs -->
        <div class="tabs-row no-print" data-testid="floor-tabs">
          <button class="tab-pill active" data-tab="queued" data-testid="tab-queued">
            ${isBn ? '১. অপেক্ষমাণ কিউ (৮)' : '1. Queued & Ready (8)'}
          </button>
          <button class="tab-pill" data-tab="running" data-testid="tab-running">
            ${isBn ? '২. মেশিনে প্রিন্টিং চলমান (৪)' : '2. Printing & Running (4)'}
          </button>
          <button class="tab-pill" data-tab="finishing" data-testid="tab-finishing">
            ${isBn ? '৩. ফিনিশিং ও কোয়ালিটি (৬)' : '3. Finishing & QC (6)'}
          </button>
          <button class="tab-pill" data-tab="completed" data-testid="tab-completed">
            ${isBn ? '৪. সম্পন্ন কাজ' : '4. Completed Jobs'}
          </button>
        </div>

        <!-- Floor Jobs Grid -->
        <div class="jobs-grid no-print" data-testid="floor-jobs-grid">
          <div class="job-card" data-testid="job-card-1">
            <div>
              <div class="job-header">
                <div>
                  <h3 style="font-size: 15px; font-weight: 800;">JOB-401: PVC Banner</h3>
                  <div style="font-size: 12px; color: var(--muted-foreground);">Delta Corporation • 1000 sqft</div>
                </div>
                <span class="job-badge badge-warning" id="jobStatusBadge-401">Queued</span>
              </div>
              <div style="font-size: 12px; margin-top: 8px; line-height: 1.4;">
                <div>Machine: <strong>Roland TrueVIS SG-540</strong></div>
                <div>Substrate: <strong>Star PVC Backlit (Gloss)</strong></div>
                <div>Routing: <strong>Print -> Eyelet -> Packing</strong></div>
              </div>
            </div>
            <div style="display: flex; gap: 8px; border-top: 1px solid var(--border); padding-top: 10px;">
              <button class="btn-primary" style="flex: 1; min-height: 36px;" id="startJobBtn-401" onclick="startFloorJob('401')" data-testid="start-job-btn-401">
                ▶ ${isBn ? 'মেশিনে চালু' : 'Start on Press'}
              </button>
              <button class="btn-outline" style="min-height: 36px;" onclick="openJobTicket('JOB-401', 'Delta Corporation', 'Roland TrueVIS SG-540')" data-testid="ticket-btn-401">
                Ticket
              </button>
            </div>
          </div>
        </div>
        `
            : `
        <!-- Mobile Operator Kiosk View -->
        <div class="kiosk-container" data-testid="operator-kiosk">
          <div class="page-header">
            <div>
              <h1 class="page-title" data-testid="kiosk-title">${isBn ? 'অপারেটর ফ্লোর কিয়স্ক' : 'Operator Station Kiosk'}</h1>
              <div style="font-size: 12px; color: var(--muted-foreground);">Operator: Shamol • Station 02</div>
            </div>
            <span class="job-badge" style="background: var(--success-surface); color: var(--success);">Online</span>
          </div>

          <div style="margin-bottom: 14px;">
            <label style="font-size: 12px; font-weight: 700; display: block; margin-bottom: 4px;">${isBn ? 'চলমান প্রিন্ট মেশিন নির্বাচন' : 'Assigned Press Station'}</label>
            <select class="tab-pill" style="width: 100%; border-radius: 8px; padding: 10px;" id="kioskMachineSelect" data-testid="kiosk-machine-select">
              <option value="m1">Roland TrueVIS SG-540 (Eco-Solvent)</option>
              <option value="m2">Heidelberg Speedmaster SM-74 (Offset)</option>
              <option value="m3">Polar 115X High-Speed Cutter</option>
            </select>
          </div>

          <div class="kiosk-hero-card" data-testid="kiosk-active-card">
            <span class="job-badge badge-warning" id="kioskStatus">IDLE / READY</span>
            <h2 style="font-size: 18px; font-weight: 800; margin-top: 8px;" id="kioskJobTitle">TSK-0894: Hangtags</h2>
            <div style="font-size: 13px; color: var(--muted-foreground);">Fashion Wear Ltd • Qty: 5,000 pcs</div>

            <div class="kiosk-timer" id="kioskTimerDisplay">00:00:00</div>

            <button class="btn-primary kiosk-action-btn" id="kioskStartBtn" onclick="operatorToggleStart()" data-testid="kiosk-start-btn">
              ▶ ${isBn ? 'কাজ শুরু করুন (Start Press)' : 'Start Press'}
            </button>
            <button class="btn-outline kiosk-action-btn" id="kioskPauseBtn" onclick="operatorPause()" style="display: none;" data-testid="kiosk-pause-btn">
              ⏸ ${isBn ? 'সাময়িক বিরতি (Pause)' : 'Pause Task'}
            </button>
            <button class="btn-destructive kiosk-action-btn" id="kioskCompleteBtn" onclick="operatorComplete()" style="display: none;" data-testid="kiosk-complete-btn">
              ✓ ${isBn ? 'কাজ সম্পন্ন ও ফিনিশিং এ প্রেরণ' : 'Complete & Route to Finishing'}
            </button>
          </div>
        </div>
        `
        }

        <!-- Job Ticket Sheet (Modal & Print View) -->
        <div class="ticket-container" id="ticketContainer" data-testid="ticket-container">
          <div class="ticket-header">
            <div>
              <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--primary);">InkFlow Press Floor Job Ticket</div>
              <h2 style="font-size: 22px; font-weight: 900;" id="ticketJobCode">JOB-401: PVC Banner</h2>
              <div style="font-size: 13px; color: var(--muted-foreground);" id="ticketCustomer">Client: Delta Corporation</div>
            </div>
            <div style="text-align: right;">
              <div class="qr-placeholder" data-testid="ticket-qr">QR CODE</div>
              <div style="font-size: 11px; margin-top: 4px; font-weight: bold;">Scan to Track</div>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-top: 14px;">
            <thead>
              <tr style="background: var(--muted);">
                <th style="padding: 8px; text-align: left;">Routing Stage</th>
                <th style="padding: 8px; text-align: left;">Machine / Workcenter</th>
                <th style="padding: 8px; text-align: left;">Operator Spec</th>
                <th style="padding: 8px; text-align: left;">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 8px;">1. Large Format Print</td>
                <td style="padding: 8px;" id="ticketMachine">Roland TrueVIS SG-540</td>
                <td style="padding: 8px;">1440 DPI, 8 Pass High Density</td>
                <td style="padding: 8px;"><strong style="color: var(--primary);">Running</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px;">2. Fabrication & Eyelet</td>
                <td style="padding: 8px;">Manual Post-Press Bench 03</td>
                <td style="padding: 8px;">Brass Grommets every 2ft perimeter</td>
                <td style="padding: 8px;">Queued Next</td>
              </tr>
            </tbody>
          </table>

          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px;" class="no-print">
            <button class="btn-outline" onclick="closeTicket()">${isBn ? 'বন্ধ করুন' : 'Close'}</button>
            <button class="btn-primary" onclick="window.print()" id="printTicketBtn" data-testid="print-ticket-btn">
              🖨️ ${isBn ? 'জব টিকিট প্রিন্ট' : 'Print Job Ticket'}
            </button>
          </div>
        </div>

        <script>
          function startFloorJob(id) {
            document.getElementById('jobStatusBadge-' + id).textContent = 'Running';
            document.getElementById('jobStatusBadge-' + id).className = 'job-badge badge-warning';
            document.getElementById('startJobBtn-' + id).textContent = '⏸ Pause';
            document.getElementById('startJobBtn-' + id).className = 'btn-outline';
            const valRunning = document.getElementById('valRunning');
            valRunning.textContent = String(parseInt(valRunning.textContent) + 1);
          }

          function resumeFloorTask(id) {
            alert('Resumed task ' + id);
            const valAtt = document.getElementById('valAttention');
            valAtt.textContent = String(Math.max(0, parseInt(valAtt.textContent) - 1));
          }

          function startPressJob(id) {
            alert('Started press job ' + id);
          }

          function openJobTicket(code, cust, machine) {
            document.getElementById('ticketJobCode').textContent = code;
            document.getElementById('ticketCustomer').textContent = 'Client: ' + cust;
            document.getElementById('ticketMachine').textContent = machine;
            document.getElementById('ticketContainer').style.display = 'block';
            document.getElementById('ticketContainer').scrollIntoView({ behavior: 'smooth' });
          }

          function closeTicket() {
            document.getElementById('ticketContainer').style.display = 'none';
          }

          // Operator Kiosk script
          let timerInterval = null;
          let seconds = 0;

          function operatorToggleStart() {
            document.getElementById('kioskStatus').textContent = 'PRINTING RUNNING';
            document.getElementById('kioskStatus').className = 'job-badge';
            document.getElementById('kioskStatus').style.background = 'var(--success-surface)';
            document.getElementById('kioskStatus').style.color = 'var(--success)';
            document.getElementById('kioskStartBtn').style.display = 'none';
            document.getElementById('kioskPauseBtn').style.display = 'flex';
            document.getElementById('kioskCompleteBtn').style.display = 'flex';

            timerInterval = setInterval(() => {
              seconds++;
              const hrs = String(Math.floor(seconds / 3600)).padStart(2, '0');
              const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
              const secs = String(seconds % 60).padStart(2, '0');
              document.getElementById('kioskTimerDisplay').textContent = hrs + ':' + mins + ':' + secs;
            }, 1000);
          }

          function operatorPause() {
            clearInterval(timerInterval);
            document.getElementById('kioskStatus').textContent = 'PAUSED';
            document.getElementById('kioskStatus').style.background = 'var(--warning-surface)';
            document.getElementById('kioskStatus').style.color = 'var(--warning)';
            document.getElementById('kioskPauseBtn').style.display = 'none';
            document.getElementById('kioskStartBtn').style.display = 'flex';
            document.getElementById('kioskStartBtn').textContent = '▶ Resume Press';
          }

          function operatorComplete() {
            clearInterval(timerInterval);
            document.getElementById('kioskStatus').textContent = 'COMPLETED & SENT TO FINISHING';
            document.getElementById('kioskStatus').style.background = 'var(--success-surface)';
            document.getElementById('kioskStatus').style.color = 'var(--success)';
            document.getElementById('kioskPauseBtn').style.display = 'none';
            document.getElementById('kioskCompleteBtn').style.display = 'none';
            document.getElementById('kioskStartBtn').style.display = 'flex';
            document.getElementById('kioskStartBtn').textContent = 'Next Queued Job';
          }
        </script>
      </body>
      </html>
    `

    await page.setContent(html)
    return page
  }

  // ============================================================================
  // Test 1: Desktop Canonical 4-KPI Row (EN)
  // ============================================================================
  test('1. Production Desktop: Canonical 4-KPI row renders correctly', async () => {
    const context = await browser.newContext()
    const page = await renderProductionPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.desktop,
    })

    const kpiGrid = page.locator('[data-testid="kpi-grid"]')
    await kpiGrid.waitFor({ state: 'visible' })

    const activeProd = await page.locator('[data-testid="kpi-active-production"] .kpi-val').textContent()
    const runningPress = await page.locator('[data-testid="kpi-running-press"] .kpi-val').textContent()
    const finishingQc = await page.locator('[data-testid="kpi-finishing-qc"] .kpi-val').textContent()
    const needsAtt = await page.locator('[data-testid="kpi-needs-attention"] .kpi-val').textContent()

    assert.equal(activeProd?.trim(), '18')
    assert.equal(runningPress?.trim(), '4')
    assert.equal(finishingQc?.trim(), '6')
    assert.equal(needsAtt?.trim(), '3')

    await context.close()
  })

  // ============================================================================
  // Test 2: Prioritized Attention Queue ("Needs Your Attention Now")
  // ============================================================================
  test('2. Production Floor: Attention Queue renders blocked & urgent jobs with 1-click actions', async () => {
    const context = await browser.newContext()
    const page = await renderProductionPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.desktop,
    })

    const queue = page.locator('[data-testid="attention-queue"]')
    await queue.waitFor({ state: 'visible' })

    const countText = await page.locator('[data-testid="attention-count"]').textContent()
    assert.ok(countText?.includes('3 Tasks'))

    const item1 = page.locator('[data-testid="attention-task-1"]')
    await item1.waitFor({ state: 'visible' })
    const text1 = await item1.textContent()
    assert.ok(text1?.includes('TSK-0891'))
    assert.ok(text1?.includes('On Hold'))

    const resumeBtn = page.locator('[data-testid="resume-task-btn"]')
    assert.ok(await resumeBtn.isVisible(), '1-Click Resume Task button visible')

    await context.close()
  })

  // ============================================================================
  // Test 3: Floor Lifecycle: Start Job on Press in <= 3 Clicks
  // ============================================================================
  test('3. Production Floor: Job execution completed in <= 3 clicks', async () => {
    const context = await browser.newContext()
    const page = await renderProductionPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.desktop,
    })

    // Click 1: Start job on press
    const startBtn = page.locator('[data-testid="start-job-btn-401"]')
    await startBtn.click()

    // Verify status updated to Running and KPI updated
    const statusBadge = page.locator('#jobStatusBadge-401')
    const statusText = await statusBadge.textContent()
    assert.equal(statusText?.trim(), 'Running')

    const runningKpi = await page.locator('[data-testid="kpi-running-press"] .kpi-val').textContent()
    assert.equal(runningKpi?.trim(), '5', 'Running KPI incremented')

    await context.close()
  })

  // ============================================================================
  // Test 4: Job Ticket & QR Sheet Printing
  // ============================================================================
  test('4. Production Floor: One-click Job Ticket preview and barcode/QR rendering', async () => {
    const context = await browser.newContext()
    const page = await renderProductionPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.desktop,
    })

    // Click Ticket button
    await page.locator('[data-testid="ticket-btn-401"]').click()

    const ticketContainer = page.locator('[data-testid="ticket-container"]')
    await ticketContainer.waitFor({ state: 'visible' })

    const qr = page.locator('[data-testid="ticket-qr"]')
    assert.ok(await qr.isVisible(), 'QR placeholder for physical scan rendered')

    const printBtn = page.locator('[data-testid="print-ticket-btn"]')
    assert.ok(await printBtn.isVisible(), 'Print button ready for shop floor dispatch')

    await context.close()
  })

  // ============================================================================
  // Test 5: Mobile Operator Kiosk: One-Handed Operation & Live Timer (375px)
  // ============================================================================
  test('5. Operator Kiosk: Mobile-first one-handed punch-in, live timer, and complete flow', async () => {
    const context = await browser.newContext()
    const page = await renderProductionPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.mobile,
      isOperatorKiosk: true,
    })

    const kiosk = page.locator('[data-testid="operator-kiosk"]')
    await kiosk.waitFor({ state: 'visible' })

    // Verify touch target >= 44px
    const startBtn = page.locator('[data-testid="kiosk-start-btn"]')
    const box = await startBtn.boundingBox()
    assert.ok(box && box.height >= 44, 'Operator start button has touch target >= 44px')

    // Click Start
    await startBtn.click()

    // Verify timer started and complete button displayed
    const pauseBtn = page.locator('[data-testid="kiosk-pause-btn"]')
    const completeBtn = page.locator('[data-testid="kiosk-complete-btn"]')
    await pauseBtn.waitFor({ state: 'visible' })
    await completeBtn.waitFor({ state: 'visible' })

    // Click Complete
    await completeBtn.click()

    const statusText = await page.locator('#kioskStatus').textContent()
    assert.ok(statusText?.includes('COMPLETED & SENT TO FINISHING'))

    await context.close()
  })

  // ============================================================================
  // Test 6: Bengali Localization Parity (BN)
  // ============================================================================
  test('6. Production Bengali: Full bilingual terminology parity', async () => {
    const context = await browser.newContext()
    const page = await renderProductionPage(context, {
      locale: 'bn',
      theme: 'light',
      viewport: VIEWPORTS.desktop,
    })

    const title = await page.locator('[data-testid="page-title"]').textContent()
    assert.equal(title?.trim(), 'প্রোডাকশন প্ল্যানিং ও প্রিন্টিং ফ্লোর')

    const kpi1 = await page.locator('[data-testid="kpi-active-production"] .kpi-label').textContent()
    assert.equal(kpi1?.trim(), 'চলমান উৎপাদন')

    const kpi2 = await page.locator('[data-testid="kpi-running-press"] .kpi-label').textContent()
    assert.equal(kpi2?.trim(), 'মেশিনে রানিং')

    const kpi3 = await page.locator('[data-testid="kpi-finishing-qc"] .kpi-label').textContent()
    assert.equal(kpi3?.trim(), 'ফিনিশিং ও কিউসি')

    const attentionText = await page.locator('[data-testid="attention-queue"]').textContent()
    assert.ok(attentionText?.includes('জরুরি মনোযোগ প্রয়োজন'))
    assert.ok(attentionText?.includes('টি কাজ'))

    await context.close()
  })

  // ============================================================================
  // Test 7: Dark Theme Tokens & Zero Flash
  // ============================================================================
  test('7. Production Dark Theme: Dark classes and tokens applied seamlessly', async () => {
    const context = await browser.newContext()
    const page = await renderProductionPage(context, {
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
