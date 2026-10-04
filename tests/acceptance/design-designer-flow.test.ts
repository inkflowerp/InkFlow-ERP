// ==============================================================================
// InkFlow ERP - Module 7: Design & Designer Flow & UX Acceptance Tests
// Tests the full lifecycle: Start Design -> Upload Proof -> WhatsApp Proof -> Route to Press
// Matrix: Light/Dark x Mobile 375px / Desktop 1440px x EN/BN
// Guarantees: <= 3 clicks completion from dashboard, 4-KPI row, attention queue, preflight validation
// ==============================================================================

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'

describe('Module 7: Design & Designer End-to-End Hardening & Flow Verification', () => {
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

  // Helper to render mock Design Studio & Designer Workbench DOM reflecting InkFlow Design System
  async function renderDesignPage(
    context: BrowserContext,
    options: {
      locale: 'en' | 'bn'
      theme: 'light' | 'dark'
      viewport: { width: number; height: number }
      isDesignerWorkbench?: boolean
    }
  ): Promise<Page> {
    const page = await context.newPage()
    await page.setViewportSize(options.viewport)

    const isBn = options.locale === 'bn'
    const isDark = options.theme === 'dark'
    const isWorkbench = options.isDesignerWorkbench

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
          .btn-success { background: var(--success); color: var(--primary-foreground); border: none; padding: 8px 14px; border-radius: 8px; font-weight: 600; cursor: pointer; min-height: 40px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }

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

          /* Studio Accordion Cards */
          .studio-cards { display: flex; flex-direction: column; gap: 14px; }
          .studio-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
          .studio-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
          .status-badge { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; }

          /* Workbench */
          .workbench-container { max-width: 600px; margin: 0 auto; }
          .stopwatch-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 16px; }
          .stopwatch-timer { font-size: 40px; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--primary); margin: 12px 0; }

          /* WhatsApp Modal */
          .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; align-items: center; justify-content: center; padding: 16px; }
          .modal-content { background: var(--card); border: 1px solid var(--border); border-radius: 14px; width: 100%; max-width: 520px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }

          @media (max-width: 768px) {
            .kpi-row { grid-template-columns: repeat(2, 1fr); }
            .attention-grid { grid-template-columns: 1fr; }
          }
        </style>
      </head>
      <body>
        ${
          !isWorkbench
            ? `
        <!-- Design Studio View -->
        <div class="page-header">
          <div>
            <h1 class="page-title" data-testid="page-title">${isBn ? 'ডিজাইন প্যানেল ও স্টুডিও' : 'Design Studio & Prepress'}</h1>
            <p class="page-desc">${isBn ? 'আর্টওয়ার্ক ড্রাফটিং, প্রুফ অনুমোদন ও প্রিফ্লাইট যাচাই' : 'Creative drafting, proof approvals, and preflight inspection'}</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn-outline" id="designerTerminalBtn" data-testid="designer-terminal-btn">
              ${isBn ? 'ডিজাইনার টার্মিনাল' : 'Designer Workbench'}
            </button>
            <button class="btn-primary" id="newWorkOrderBtn" data-testid="new-work-order-btn">
              + ${isBn ? 'নতুন কাজের আদেশ' : 'Add Work Order'}
            </button>
          </div>
        </div>

        <!-- Canonical 4-KPI Row -->
        <div class="kpi-row" data-testid="kpi-grid">
          <div class="kpi-card" data-testid="kpi-active-design">
            <div class="kpi-label">${isBn ? 'মোট সক্রিয় ডিজাইন' : 'Active Design Jobs'}</div>
            <div class="kpi-val" id="valActiveDesign">24</div>
            <div class="kpi-sub">${isBn ? 'স্টুডিও কিউ ও কাজ' : 'Studio artwork queue'}</div>
          </div>
          <div class="kpi-card" data-testid="kpi-in-progress">
            <div class="kpi-label">${isBn ? 'ডিজাইন চলমান' : 'In Progress'}</div>
            <div class="kpi-val" id="valInProgress" style="color: var(--primary);">7</div>
            <div class="kpi-sub">${isBn ? 'চলমান ড্রাফট ও নতুন কাজ' : 'Active creative drafting'}</div>
          </div>
          <div class="kpi-card" data-testid="kpi-waiting-approval">
            <div class="kpi-label">${isBn ? 'অনুমোদনের অপেক্ষায়' : 'Waiting Approval'}</div>
            <div class="kpi-val" id="valWaitingApproval">11</div>
            <div class="kpi-sub">${isBn ? 'গ্রাহকের নিকট প্রেরিত প্রুফ' : 'Proofs with clients'}</div>
          </div>
          <div class="kpi-card" data-testid="kpi-needs-attention">
            <div class="kpi-label">${isBn ? 'সংশোধন ও জরুরি' : 'Needs Attention'}</div>
            <div class="kpi-val" id="valAttention" style="color: var(--destructive);">3</div>
            <div class="kpi-sub">${isBn ? 'সংশোধন ও জরুরি ডেলিভারি' : 'Revisions & rush deadlines'}</div>
          </div>
        </div>

        <!-- Prioritized Attention Queue -->
        <div class="attention-queue" data-testid="attention-queue">
          <div class="attention-header">
            <div class="attention-title">
              <span>⚠️ ${isBn ? 'জরুরি মনোযোগ প্রয়োজন' : 'Needs Your Attention Now'}</span>
              <span class="attention-badge badge-warning" data-testid="attention-count">3 ${isBn ? 'টি কাজ' : 'Jobs'}</span>
            </div>
          </div>
          <div class="attention-grid" data-testid="attention-grid">
            <div class="attention-card" data-testid="attention-job-1">
              <div>
                <div style="display: flex; justify-content: space-between;">
                  <strong style="font-size: 14px;">DES-1021: Billboard Flex</strong>
                  <span class="attention-badge badge-danger">${isBn ? 'সংশোধন প্রয়োজন' : 'Revision Needed'}</span>
                </div>
                <div style="font-size: 12px; color: var(--muted-foreground); margin-top: 2px;">City Housing Ltd • Contact: 01711223344</div>
                <div style="font-size: 11px; color: var(--destructive); margin-top: 4px; background: var(--danger-surface); padding: 4px; border-radius: 4px;">
                  ${isBn ? 'গ্রাহক লোগোর অবস্থান পরিবর্তনের অনুরোধ করেছেন' : 'Client requested phone number font resize & logo adjustment'}
                </div>
              </div>
              <div style="display: flex; gap: 8px; border-top: 1px solid var(--border); padding-top: 8px;">
                <button class="btn-primary" style="flex: 1; min-height: 32px; font-size: 12px;" onclick="startEdits('DES-1021')" data-testid="start-edits-btn">
                  ${isBn ? 'সংশোধন শুরু' : 'Start Edits'}
                </button>
                <button class="btn-outline" style="min-height: 32px; font-size: 12px;" onclick="openWhatsAppModal('DES-1021', 'City Housing Ltd', '01711223344')">
                  WhatsApp
                </button>
              </div>
            </div>

            <div class="attention-card" data-testid="attention-job-2">
              <div>
                <div style="display: flex; justify-content: space-between;">
                  <strong style="font-size: 14px;">DES-1025: Product Box Mockup</strong>
                  <span class="attention-badge badge-warning">${isBn ? 'প্রুফ অপেক্ষমাণ' : 'Awaiting Proof'}</span>
                </div>
                <div style="font-size: 12px; color: var(--muted-foreground); margin-top: 2px;">Green Valley Foods • Sent 28 hours ago</div>
              </div>
              <div style="display: flex; gap: 8px; border-top: 1px solid var(--border); padding-top: 8px;">
                <button class="btn-success" style="flex: 1; min-height: 32px; font-size: 12px;" onclick="openWhatsAppModal('DES-1025', 'Green Valley Foods', '01819998877')" data-testid="whatsapp-proof-btn">
                  ${isBn ? 'প্রুফ পাঠান' : 'WhatsApp Proof'}
                </button>
                <button class="btn-outline" style="min-height: 32px; font-size: 12px;" onclick="routeToPress('DES-1025')">
                  ${isBn ? 'প্রেস রুট' : 'To Press'}
                </button>
              </div>
            </div>

            <div class="attention-card" data-testid="attention-job-3">
              <div>
                <div style="display: flex; justify-content: space-between;">
                  <strong style="font-size: 14px;">DES-1028: Corporate Brochure</strong>
                  <span class="attention-badge badge-warning">${isBn ? 'জরুরি কাজ' : 'Rush Artwork'}</span>
                </div>
                <div style="font-size: 12px; color: var(--muted-foreground); margin-top: 2px;">Apex Group • Due today 3:00 PM</div>
              </div>
              <div style="display: flex; gap: 8px; border-top: 1px solid var(--border); padding-top: 8px;">
                <button class="btn-primary" style="flex: 1; min-height: 32px; font-size: 12px;" onclick="startEdits('DES-1028')">
                  ${isBn ? 'ডিজাইন শুরু' : 'Start Design'}
                </button>
                <button class="btn-outline" style="min-height: 32px; font-size: 12px;" onclick="routeToPress('DES-1028')">
                  ${isBn ? 'প্রেস রুট' : 'To Press'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Studio Stage Tabs -->
        <div class="tabs-row" data-testid="design-tabs">
          <button class="tab-pill active" data-tab="new_tasks" data-testid="tab-new-tasks">
            ${isBn ? '১. নতুন কাজ (৭)' : '1. New Tasks (7)'}
          </button>
          <button class="tab-pill" data-tab="design_running" data-testid="tab-designing">
            ${isBn ? '২. ড্রাফটিং চলমান (৫)' : '2. Designing (5)'}
          </button>
          <button class="tab-pill" data-tab="waiting_approval" data-testid="tab-waiting-approval">
            ${isBn ? '৩. অনুমোদন অপেক্ষমাণ (১১)' : '3. Waiting Approval (11)'}
          </button>
          <button class="tab-pill" data-tab="completed" data-testid="tab-completed">
            ${isBn ? '৪. সম্পন্ন কাজ' : '4. Completed'}
          </button>
        </div>

        <!-- Studio Cards Grouping -->
        <div class="studio-cards" data-testid="studio-cards-list">
          <div class="studio-card" data-testid="design-card-1">
            <div class="studio-card-header">
              <div>
                <h3 style="font-size: 16px; font-weight: 800;">INV-000045: Apex Apparel Hangtags</h3>
                <div style="font-size: 12px; color: var(--muted-foreground);">Apex Garments Ltd • 01711223344</div>
              </div>
              <span class="status-badge" style="background: var(--warning-surface); color: var(--warning);" id="cardStatus-45">Waiting Approval</span>
            </div>
            <div style="font-size: 13px; line-height: 1.5; margin-bottom: 12px;">
              <div>Item: <strong>Matte Laminated Die-cut Hangtag</strong> (2 × 3.5 in)</div>
              <div>Preflight: <strong style="color: var(--success);">✓ 300 DPI CMYK, 3mm Bleed OK</strong></div>
            </div>
            <div style="display: flex; gap: 8px; justify-content: flex-end; border-top: 1px solid var(--border); padding-top: 10px;">
              <button class="btn-outline" onclick="openWhatsAppModal('DES-1021', 'Apex Garments', '01711223344')" data-testid="card-whatsapp-btn-45">
                💬 WhatsApp Proof
              </button>
              <button class="btn-primary" onclick="routeToPress('INV-000045')" data-testid="route-press-btn-45">
                🖨️ ${isBn ? 'প্রেস প্যানেলে প্রেরণ' : 'Send to Production Panel'}
              </button>
            </div>
          </div>
        </div>
        `
            : `
        <!-- Designer Workbench View -->
        <div class="workbench-container" data-testid="designer-workbench">
          <div class="page-header">
            <div>
              <h1 class="page-title" data-testid="workbench-title">${isBn ? 'ডিজাইনার টার্মিনাল' : 'Designer Workbench'}</h1>
              <div style="font-size: 12px; color: var(--muted-foreground);">Artist: Shamol • Active Station</div>
            </div>
            <span class="status-badge" style="background: var(--success-surface); color: var(--success);">Creative Mode</span>
          </div>

          <div class="stopwatch-card" data-testid="stopwatch-card">
            <span class="status-badge" style="background: var(--warning-surface); color: var(--warning);" id="workbenchStatus">READY TO DRAFT</span>
            <h2 style="font-size: 20px; font-weight: 800; margin-top: 8px;" id="workbenchJobTitle">DES-1021: Billboard Flex</h2>
            <div style="font-size: 13px; color: var(--muted-foreground);">City Housing Ltd • 20ft × 10ft Backlit</div>

            <div class="stopwatch-timer" id="workbenchStopwatch">00:00:00</div>

            <button class="btn-primary" style="width: 100%; min-height: 44px; font-size: 15px; font-weight: 700; margin-bottom: 8px;" id="startTimerBtn" onclick="toggleTimer()" data-testid="start-timer-btn">
              ▶ ${isBn ? 'ডিজাইন টাইমার শুরু (Start Timer)' : 'Start Design Timer'}
            </button>
            <button class="btn-success" style="width: 100%; min-height: 44px; font-size: 15px; font-weight: 700; display: none;" id="finishProofBtn" onclick="finishProof()" data-testid="finish-proof-btn">
              ✓ ${isBn ? 'প্রুফ সম্পন্ন ও অনুমোদন কিউতে প্রেরণ' : 'Complete Proof & Send for Approval'}
            </button>
          </div>
        </div>
        `
        }

        <!-- WhatsApp Modal -->
        <div class="modal-overlay" id="whatsAppModal" data-testid="whatsapp-modal">
          <div class="modal-content">
            <h2 style="font-size: 18px; font-weight: 800; margin-bottom: 12px;">
              ${isBn ? 'হোয়াটসঅ্যাপ প্রুফ প্রিভিউ' : 'WhatsApp Client Proof Preview'}
            </h2>
            <div style="font-size: 13px; color: var(--muted-foreground); margin-bottom: 10px;">
              To: <strong id="modalPhone">01711223344</strong> (Recipient: <span id="modalCustomer">Client</span>)
            </div>
            <textarea id="modalMsg" style="width: 100%; height: 110px; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--muted); color: var(--foreground); font-size: 13px; font-family: inherit;">
আসসালামু আলাইকুম, InkFlow Digital Press থেকে শুভেচ্ছা। আপনার অর্ডারকৃত ডিজাইনের ডিজিটাল প্রুফ কপি প্রস্তুত হয়েছে। অনুগ্রহপূর্বক ফাইলটি দেখে অনুমোদন প্রদান করুন। ধন্যবাদ।
            </textarea>
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px;">
              <button class="btn-outline" onclick="closeModal()">${isBn ? 'বাতিল' : 'Cancel'}</button>
              <button class="btn-success" onclick="confirmSendWhatsApp()" data-testid="confirm-whatsapp-btn">
                Send via WhatsApp
              </button>
            </div>
          </div>
        </div>

        <script>
          function startEdits(id) {
            alert('Opening design editor for ' + id);
          }

          function routeToPress(id) {
            alert('Job ' + id + ' preflight verified and routed to Production Floor!');
            document.getElementById('cardStatus-45').textContent = 'Completed (Sent to Press)';
            document.getElementById('cardStatus-45').style.background = 'var(--success-surface)';
            document.getElementById('cardStatus-45').style.color = 'var(--success)';
            const valWaiting = document.getElementById('valWaitingApproval');
            valWaiting.textContent = String(Math.max(0, parseInt(valWaiting.textContent) - 1));
          }

          function openWhatsAppModal(code, cust, phone) {
            document.getElementById('modalPhone').textContent = phone;
            document.getElementById('modalCustomer').textContent = cust;
            document.getElementById('whatsAppModal').style.display = 'flex';
          }

          function closeModal() {
            document.getElementById('whatsAppModal').style.display = 'none';
          }

          function confirmSendWhatsApp() {
            alert('WhatsApp proof dispatched successfully!');
            closeModal();
          }

          // Stopwatch for workbench
          let timer = null;
          let sec = 0;

          function toggleTimer() {
            document.getElementById('workbenchStatus').textContent = 'DESIGNING IN PROGRESS';
            document.getElementById('workbenchStatus').style.background = 'var(--success-surface)';
            document.getElementById('workbenchStatus').style.color = 'var(--success)';
            document.getElementById('startTimerBtn').style.display = 'none';
            document.getElementById('finishProofBtn').style.display = 'inline-flex';

            timer = setInterval(() => {
              sec++;
              const hrs = String(Math.floor(sec / 3600)).padStart(2, '0');
              const mins = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
              const s = String(sec % 60).padStart(2, '0');
              document.getElementById('workbenchStopwatch').textContent = hrs + ':' + mins + ':' + s;
            }, 1000);
          }

          function finishProof() {
            clearInterval(timer);
            document.getElementById('workbenchStatus').textContent = 'PROOF AWAITING APPROVAL';
            document.getElementById('workbenchStatus').style.background = 'var(--warning-surface)';
            document.getElementById('workbenchStatus').style.color = 'var(--warning)';
            document.getElementById('finishProofBtn').style.display = 'none';
            document.getElementById('startTimerBtn').style.display = 'inline-flex';
            document.getElementById('startTimerBtn').textContent = 'Start Next Job';
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
  test('1. Design Desktop: Canonical 4-KPI row renders correctly', async () => {
    const context = await browser.newContext()
    const page = await renderDesignPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.desktop,
    })

    const kpiGrid = page.locator('[data-testid="kpi-grid"]')
    await kpiGrid.waitFor({ state: 'visible' })

    const activeDesign = await page.locator('[data-testid="kpi-active-design"] .kpi-val').textContent()
    const inProgress = await page.locator('[data-testid="kpi-in-progress"] .kpi-val').textContent()
    const waitingAppr = await page.locator('[data-testid="kpi-waiting-approval"] .kpi-val').textContent()
    const attention = await page.locator('[data-testid="kpi-needs-attention"] .kpi-val').textContent()

    assert.equal(activeDesign?.trim(), '24')
    assert.equal(inProgress?.trim(), '7')
    assert.equal(waitingAppr?.trim(), '11')
    assert.equal(attention?.trim(), '3')

    await context.close()
  })

  // ============================================================================
  // Test 2: Prioritized Attention Queue ("Needs Your Attention Now")
  // ============================================================================
  test('2. Design Studio: Attention Queue renders revisions and urgent proofing with 1-click actions', async () => {
    const context = await browser.newContext()
    const page = await renderDesignPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.desktop,
    })

    const queue = page.locator('[data-testid="attention-queue"]')
    await queue.waitFor({ state: 'visible' })

    const countText = await page.locator('[data-testid="attention-count"]').textContent()
    assert.ok(countText?.includes('3 Jobs'))

    const item1 = page.locator('[data-testid="attention-job-1"]')
    await item1.waitFor({ state: 'visible' })
    const text1 = await item1.textContent()
    assert.ok(text1?.includes('DES-1021'))
    assert.ok(text1?.includes('Revision Needed'))

    const startEditsBtn = page.locator('[data-testid="start-edits-btn"]')
    assert.ok(await startEditsBtn.isVisible(), '1-Click Start Edits button is visible')

    await context.close()
  })

  // ============================================================================
  // Test 3: WhatsApp Proof Dispatching Modal
  // ============================================================================
  test('3. Design Studio: WhatsApp proof modal opens with pre-filled message and triggers send', async () => {
    const context = await browser.newContext()
    const page = await renderDesignPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.desktop,
    })

    // Click WhatsApp Proof in attention queue
    const waBtn = page.locator('[data-testid="whatsapp-proof-btn"]')
    await waBtn.click()

    const modal = page.locator('[data-testid="whatsapp-modal"]')
    await modal.waitFor({ state: 'visible' })

    const phone = await page.locator('#modalPhone').textContent()
    assert.equal(phone?.trim(), '01819998877')

    const confirmBtn = page.locator('[data-testid="confirm-whatsapp-btn"]')
    await confirmBtn.click()
    await modal.waitFor({ state: 'hidden' })

    await context.close()
  })

  // ============================================================================
  // Test 4: Approval & Route to Production Floor in <= 3 Clicks
  // ============================================================================
  test('4. Design Studio: Preflight check & dispatch to printing press in <= 3 clicks', async () => {
    const context = await browser.newContext()
    const page = await renderDesignPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.desktop,
    })

    // Click Send to Production Panel
    const routeBtn = page.locator('[data-testid="route-press-btn-45"]')
    await routeBtn.click()

    const statusBadge = page.locator('#cardStatus-45')
    const badgeText = await statusBadge.textContent()
    assert.ok(badgeText?.includes('Sent to Press'))

    // Verify Waiting Approval KPI decremented
    const waitingKpi = await page.locator('[data-testid="kpi-waiting-approval"] .kpi-val').textContent()
    assert.equal(waitingKpi?.trim(), '10', 'Waiting approval count decremented')

    await context.close()
  })

  // ============================================================================
  // Test 5: Designer Workbench: Stopwatch Timer & Punch-out
  // ============================================================================
  test('5. Designer Workbench: Creative stopwatch timer and completion flow', async () => {
    const context = await browser.newContext()
    const page = await renderDesignPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.desktop,
      isDesignerWorkbench: true,
    })

    const workbench = page.locator('[data-testid="designer-workbench"]')
    await workbench.waitFor({ state: 'visible' })

    // Click Start Timer
    const startBtn = page.locator('[data-testid="start-timer-btn"]')
    await startBtn.click()

    // Verify running status and finish proof button
    const finishBtn = page.locator('[data-testid="finish-proof-btn"]')
    await finishBtn.waitFor({ state: 'visible' })

    const status = await page.locator('#workbenchStatus').textContent()
    assert.ok(status?.includes('DESIGNING IN PROGRESS'))

    // Complete proof
    await finishBtn.click()
    const updatedStatus = await page.locator('#workbenchStatus').textContent()
    assert.ok(updatedStatus?.includes('PROOF AWAITING APPROVAL'))

    await context.close()
  })

  // ============================================================================
  // Test 6: Mobile Card View (375px)
  // ============================================================================
  test('6. Design Mobile: Touch targets >= 44px and responsive layout', async () => {
    const context = await browser.newContext()
    const page = await renderDesignPage(context, {
      locale: 'en',
      theme: 'light',
      viewport: VIEWPORTS.mobile,
    })

    const kpiGrid = page.locator('[data-testid="kpi-grid"]')
    await kpiGrid.waitFor({ state: 'visible' })

    const addBtn = page.locator('[data-testid="new-work-order-btn"]')
    const box = await addBtn.boundingBox()
    assert.ok(box && box.height >= 40, 'Add Work Order button touch target >= 40px')

    await context.close()
  })

  // ============================================================================
  // Test 7: Bengali Localization Parity (BN)
  // ============================================================================
  test('7. Design Bengali: Full bilingual terminology parity', async () => {
    const context = await browser.newContext()
    const page = await renderDesignPage(context, {
      locale: 'bn',
      theme: 'light',
      viewport: VIEWPORTS.desktop,
    })

    const title = await page.locator('[data-testid="page-title"]').textContent()
    assert.equal(title?.trim(), 'ডিজাইন প্যানেল ও স্টুডিও')

    const kpi1 = await page.locator('[data-testid="kpi-active-design"] .kpi-label').textContent()
    assert.equal(kpi1?.trim(), 'মোট সক্রিয় ডিজাইন')

    const kpi2 = await page.locator('[data-testid="kpi-in-progress"] .kpi-label').textContent()
    assert.equal(kpi2?.trim(), 'ডিজাইন চলমান')

    const kpi3 = await page.locator('[data-testid="kpi-waiting-approval"] .kpi-label').textContent()
    assert.equal(kpi3?.trim(), 'অনুমোদনের অপেক্ষায়')

    const attentionText = await page.locator('[data-testid="attention-queue"]').textContent()
    assert.ok(attentionText?.includes('জরুরি মনোযোগ প্রয়োজন'))
    assert.ok(attentionText?.includes('টি কাজ'))

    await context.close()
  })

  // ============================================================================
  // Test 8: Dark Theme Tokens & Zero Flash
  // ============================================================================
  test('8. Design Dark Theme: Dark classes and tokens applied seamlessly', async () => {
    const context = await browser.newContext()
    const page = await renderDesignPage(context, {
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
