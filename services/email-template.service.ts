// ==============================================================================
// PrintERP SaaS - Email Template Engine & Pre-Seeded Workflow Templates
// Supports dynamic variable interpolation, bilingual layout rendering, and HTML wrappers.
// ==============================================================================

import type { EmailTemplateRecord, EmailEventType } from '../types/communication.types.ts'

/**
 * Replaces `{{variable_name}}` placeholders with values from dictionary
 */
export function interpolateVariables(
  template: string,
  variables: Record<string, any> = {}
): string {
  if (!template) return ''
  let output = template

  // Replace standard and dot-notated placeholders e.g. {{customer.name}} or {{customer_name}}
  for (const [key, val] of Object.entries(variables)) {
    if (val !== undefined && val !== null) {
      const stringVal = typeof val === 'object' ? JSON.stringify(val) : String(val)
      output = output.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), stringVal)
    }
  }

  // Remove unresolved placeholders or leave clean
  output = output.replace(/{{\s*[\w_.]+\s*}}/g, '')
  return output
}

/**
 * Wraps email body content with a modern, responsive HTML container
 */
export function wrapHtmlEmail(
  contentHtml: string,
  options: {
    companyName?: string
    logoUrl?: string
    accentColor?: string
    footerText?: string
    year?: number
  } = {}
): string {
  const companyName = options.companyName || 'PrintERP SaaS'
  const accentColor = options.accentColor || '#4f46e5' // Indigo 600
  const year = options.year || new Date().getFullYear()
  const footer = options.footerText || `© ${year} ${companyName}. All rights reserved.`

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${companyName}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      line-height: 1.6;
    }
    .wrapper {
      max-width: 600px;
      margin: 30px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: #0f172a;
      padding: 24px 32px;
      text-align: left;
      border-bottom: 3px solid ${accentColor};
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header .subtitle {
      margin: 4px 0 0 0;
      color: #94a3b8;
      font-size: 12px;
    }
    .content {
      padding: 32px;
    }
    .content p {
      margin: 0 0 16px 0;
      font-size: 14px;
      color: #334155;
    }
    .info-card {
      background: #f1f5f9;
      border-left: 4px solid ${accentColor};
      padding: 16px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .info-card table {
      width: 100%;
      border-collapse: collapse;
    }
    .info-card td {
      padding: 6px 0;
      font-size: 13px;
    }
    .info-card td.label {
      color: #64748b;
      font-weight: 600;
      width: 40%;
    }
    .info-card td.value {
      color: #0f172a;
      font-weight: 700;
    }
    .btn {
      display: inline-block;
      background: ${accentColor};
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      margin: 16px 0;
      text-align: center;
    }
    .footer {
      background: #f8fafc;
      padding: 20px 32px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>${companyName}</h1>
      <div class="subtitle">Commercial Printing & Production Notification</div>
    </div>
    <div class="content">
      ${contentHtml}
    </div>
    <div class="footer">
      ${footer}
      <div style="margin-top: 6px; font-size: 11px; color: #94a3b8;">This is an automated communication from PrintERP SaaS.</div>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * 15 Pre-Seeded Standardized Bilingual Email Templates
 */
export const DEFAULT_EMAIL_TEMPLATES: EmailTemplateRecord[] = [
  // 1. Quotation Sent
  {
    id: 'tpl-quotation-sent',
    tenant_id: null,
    event_type: 'quotation_sent',
    name: 'Quotation Submission (কোটেশন প্রেরণ)',
    name_bn: 'কোটেশন প্রেরণ',
    subject_template: 'Quotation #{{quotation_number}} for {{customer_name}} from {{company_name}}',
    subject_template_bn: '{{company_name}} থেকে আপনার কোটেশন #{{quotation_number}}',
    body_template: `
      <p>Dear <strong>{{customer_name}}</strong>,</p>
      <p>Thank you for reaching out to <strong>{{company_name}}</strong>. Your requested quotation is ready for review.</p>
      <div class="info-card">
        <table>
          <tr><td class="label">Quotation #:</td><td class="value">{{quotation_number}}</td></tr>
          <tr><td class="label">Estimated Total:</td><td class="value">৳ {{amount}}</td></tr>
          <tr><td class="label">Valid Until:</td><td class="value">{{valid_until}}</td></tr>
        </table>
      </div>
      <p>Click below to view the itemized quotation breakdown and confirm your order:</p>
      <p><a href="{{view_link}}" class="btn">View Quotation Online</a></p>
      <p>If you have any questions or require custom specifications, please feel free to reply directly to this email.</p>
    `,
    body_template_bn: `
      <p>প্রিয় <strong>{{customer_name}}</strong>,</p>
      <p><strong>{{company_name}}</strong>-এ যোগাযোগ করার জন্য ধন্যবাদ। আপনার অনুরোধকৃত কোটেশন প্রস্তুত করা হয়েছে।</p>
      <div class="info-card">
        <table>
          <tr><td class="label">কোটেশন নং:</td><td class="value">{{quotation_number}}</td></tr>
          <tr><td class="label">মোট পরিমাণ:</td><td class="value">৳ {{amount}}</td></tr>
          <tr><td class="label">মেয়াদ:</td><td class="value">{{valid_until}}</td></tr>
        </table>
      </div>
      <p><a href="{{view_link}}" class="btn">কোটেশন বিস্তারিত দেখুন</a></p>
    `,
    variables: ['customer_name', 'company_name', 'quotation_number', 'amount', 'valid_until', 'view_link'],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // 2. Invoice Created
  {
    id: 'tpl-invoice-created',
    tenant_id: null,
    event_type: 'invoice_created',
    name: 'Tax Invoice Created (ইনভয়েস তৈরি)',
    name_bn: 'ইনভয়েস তৈরি',
    subject_template: 'Tax Invoice #{{invoice_number}} from {{company_name}} [Due: ৳ {{due_amount}}]',
    subject_template_bn: 'ইনভয়েস #{{invoice_number}} - {{company_name}} [বকেয়া: ৳ {{due_amount}}]',
    body_template: `
      <p>Dear <strong>{{customer_name}}</strong>,</p>
      <p>We have generated Invoice <strong>#{{invoice_number}}</strong> for your recent print job with <strong>{{company_name}}</strong>.</p>
      <div class="info-card">
        <table>
          <tr><td class="label">Invoice No:</td><td class="value">{{invoice_number}}</td></tr>
          <tr><td class="label">Total Amount:</td><td class="value">৳ {{total_amount}}</td></tr>
          <tr><td class="label">Amount Paid:</td><td class="value">৳ {{paid_amount}}</td></tr>
          <tr><td class="label">Remaining Due:</td><td class="value">৳ {{due_amount}}</td></tr>
          <tr><td class="label">Due Date:</td><td class="value">{{due_date}}</td></tr>
        </table>
      </div>
      <p><a href="{{payment_link}}" class="btn">View & Pay Invoice Online</a></p>
      <p>Thank you for choosing {{company_name}} for your printing needs.</p>
    `,
    body_template_bn: `
      <p>প্রিয় <strong>{{customer_name}}</strong>,</p>
      <p><strong>{{company_name}}</strong> থেকে আপনার কাজের জন্য ইনভয়েস <strong>#{{invoice_number}}</strong> প্রস্তুত করা হয়েছে।</p>
      <div class="info-card">
        <table>
          <tr><td class="label">ইনভয়েস নং:</td><td class="value">{{invoice_number}}</td></tr>
          <tr><td class="label">মোট বিল:</td><td class="value">৳ {{total_amount}}</td></tr>
          <tr><td class="label">পরিশোধিত:</td><td class="value">৳ {{paid_amount}}</td></tr>
          <tr><td class="label">অবশিষ্ট বকেয়া:</td><td class="value">৳ {{due_amount}}</td></tr>
        </table>
      </div>
      <p><a href="{{payment_link}}" class="btn">অনলাইনে ইনভয়েস দেখুন</a></p>
    `,
    variables: ['customer_name', 'company_name', 'invoice_number', 'total_amount', 'paid_amount', 'due_amount', 'due_date', 'payment_link'],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // 3. Payment Received
  {
    id: 'tpl-payment-received',
    tenant_id: null,
    event_type: 'payment_received',
    name: 'Payment Receipt Acknowledgement (মানি রিসিট)',
    name_bn: 'মানি রিসিট',
    subject_template: 'Payment Receipt: ৳ {{amount}} acknowledged for Invoice #{{invoice_number}}',
    subject_template_bn: 'পেমেন্ট রিসিট: ইনভয়েস #{{invoice_number}} বাবদ ৳ {{amount}} গৃহীত',
    body_template: `
      <p>Dear <strong>{{customer_name}}</strong>,</p>
      <p>We gratefully acknowledge receipt of your payment for Invoice <strong>#{{invoice_number}}</strong>.</p>
      <div class="info-card">
        <table>
          <tr><td class="label">Money Receipt #:</td><td class="value">{{receipt_number}}</td></tr>
          <tr><td class="label">Amount Paid:</td><td class="value">৳ {{amount}}</td></tr>
          <tr><td class="label">Payment Method:</td><td class="value">{{payment_method}}</td></tr>
          <tr><td class="label">Remaining Balance:</td><td class="value">৳ {{remaining_due}}</td></tr>
        </table>
      </div>
      <p><a href="{{receipt_link}}" class="btn">Download Money Receipt (PDF)</a></p>
    `,
    body_template_bn: `
      <p>প্রিয় <strong>{{customer_name}}</strong>,</p>
      <p>ইনভয়েস <strong>#{{invoice_number}}</strong> বাবদ আপনার পেমেন্ট সফলভাবে গ্রহণ করা হয়েছে।</p>
      <div class="info-card">
        <table>
          <tr><td class="label">মানি রিসিট নং:</td><td class="value">{{receipt_number}}</td></tr>
          <tr><td class="label">পরিশোধিত অর্থ:</td><td class="value">৳ {{amount}}</td></tr>
          <tr><td class="label">পদ্ধতি:</td><td class="value">{{payment_method}}</td></tr>
          <tr><td class="label">অবশিষ্ট বকেয়া:</td><td class="value">৳ {{remaining_due}}</td></tr>
        </table>
      </div>
    `,
    variables: ['customer_name', 'invoice_number', 'receipt_number', 'amount', 'payment_method', 'remaining_due', 'receipt_link'],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // 4. Due Reminder
  {
    id: 'tpl-due-reminder',
    tenant_id: null,
    event_type: 'due_reminder',
    name: 'Overdue Payment Reminder (বাকি তাগাদা)',
    name_bn: 'বাকি তাগাদা',
    subject_template: 'Urgent: Overdue Balance ৳ {{due_amount}} on Invoice #{{invoice_number}}',
    subject_template_bn: 'জরুরী তাগাদা: ইনভয়েস #{{invoice_number}} এর বকেয়া ৳ {{due_amount}}',
    body_template: `
      <p>Dear <strong>{{customer_name}}</strong>,</p>
      <p>This is a gentle reminder that Invoice <strong>#{{invoice_number}}</strong> from <strong>{{company_name}}</strong> has an outstanding overdue balance of <strong>৳ {{due_amount}}</strong>.</p>
      <div class="info-card">
        <table>
          <tr><td class="label">Invoice No:</td><td class="value">{{invoice_number}}</td></tr>
          <tr><td class="label">Total Amount:</td><td class="value">৳ {{total_amount}}</td></tr>
          <tr><td class="label">Overdue Balance:</td><td class="value">৳ {{due_amount}}</td></tr>
          <tr><td class="label">Due Date:</td><td class="value">{{due_date}}</td></tr>
        </table>
      </div>
      <p>Kindly settle the outstanding amount at your earliest convenience to maintain uninterrupted service.</p>
      <p><a href="{{payment_link}}" class="btn">Settle Invoice Online</a></p>
    `,
    body_template_bn: `
      <p>প্রিয় <strong>{{customer_name}}</strong>,</p>
      <p><strong>{{company_name}}</strong> এর ইনভয়েস <strong>#{{invoice_number}}</strong> এর বকেয়া <strong>৳ {{due_amount}}</strong> পরিশোধের মেয়াদ উত্তীর্ণ হয়েছে। অনুগ্রহপূর্বক দ্রুত পরিশোধের অনুরোধ করা হচ্ছে।</p>
    `,
    variables: ['customer_name', 'company_name', 'invoice_number', 'total_amount', 'due_amount', 'due_date', 'payment_link'],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // 5. Design Approval Request
  {
    id: 'tpl-design-approval-request',
    tenant_id: null,
    event_type: 'design_approval_request',
    name: 'Artwork Proof Approval Request (ডিজাইন অনুমোদন অনুরোধ)',
    name_bn: 'ডিজাইন অনুমোদন অনুরোধ',
    subject_template: 'Action Required: Artwork Approval for Job #{{job_number}} ({{item_name}})',
    subject_template_bn: 'ডিজাইন অনুমোদন প্রয়োজন: জব #{{job_number}} ({{item_name}})',
    body_template: `
      <p>Dear <strong>{{customer_name}}</strong>,</p>
      <p>The design team at <strong>{{company_name}}</strong> has prepared the high-resolution artwork proof for <strong>{{item_name}}</strong> (Job #{{job_number}}).</p>
      <p>Please review the digital proof carefully for spelling, dimensions, color placement, and finishing marks before we proceed to print production.</p>
      <p><a href="{{proof_link}}" class="btn">Review & Approve Artwork Proof</a></p>
      <p><em>Note: Production will commence immediately upon your written digital approval.</em></p>
    `,
    body_template_bn: `
      <p>প্রিয় <strong>{{customer_name}}</strong>,</p>
      <p><strong>{{company_name}}</strong> এর ডিজাইন টিম আপনার কাজের (জব #{{job_number}}) প্রুফ প্রস্তুত করেছে। প্রিন্টে পাঠানোর পূর্বে প্রুফটি সতর্কতার সাথে যাচাই করে অনুমোদন দিন।</p>
      <p><a href="{{proof_link}}" class="btn">ডিজাইন প্রুফ যাচাই ও অনুমোদন করুন</a></p>
    `,
    variables: ['customer_name', 'company_name', 'job_number', 'item_name', 'proof_link'],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // 6. Revision Notification
  {
    id: 'tpl-revision-notification',
    tenant_id: null,
    event_type: 'revision_notification',
    name: 'Design Revision Requested (ডিজাইন সংশোধন)',
    name_bn: 'ডিজাইন সংশোধন',
    subject_template: 'Design Revision Requested for Job #{{job_number}} - {{item_name}}',
    subject_template_bn: 'ডিজাইন সংশোধনের অনুরোধ: জব #{{job_number}}',
    body_template: `
      <p>Hello Team,</p>
      <p>Client <strong>{{customer_name}}</strong> has requested revisions on artwork proof for Job <strong>#{{job_number}}</strong> ({{item_name}}).</p>
      <div class="info-card">
        <p><strong>Client Feedback:</strong></p>
        <p>{{feedback_notes}}</p>
      </div>
      <p><a href="{{job_link}}" class="btn">Open Design Studio</a></p>
    `,
    body_template_bn: `
      <p>প্রিয় টিম,</p>
      <p>গ্রাহক <strong>{{customer_name}}</strong> জব <strong>#{{job_number}}</strong> এর ডিজাইনে সংশোধনের অনুরোধ জানিয়েছেন।</p>
    `,
    variables: ['customer_name', 'job_number', 'item_name', 'feedback_notes', 'job_link'],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // 7. Approval Confirmation
  {
    id: 'tpl-approval-confirmation',
    tenant_id: null,
    event_type: 'approval_confirmation',
    name: 'Artwork Approved for Production (অনুমোদন নিশ্চিতকরণ)',
    name_bn: 'অনুমোদন নিশ্চিতকরণ',
    subject_template: 'Artwork Approved: Job #{{job_number}} Queued for Printing',
    subject_template_bn: 'ডিজাইন অনুমোদিত: জব #{{job_number}} প্রিন্টিংয়ের জন্য তৈরি',
    body_template: `
      <p>Dear <strong>{{customer_name}}</strong>,</p>
      <p>Thank you for approving the artwork proof for Job <strong>#{{job_number}}</strong> ({{item_name}}).</p>
      <p>Your job has now been scheduled on our print production queue. Estimated completion date: <strong>{{estimated_completion}}</strong>.</p>
    `,
    body_template_bn: `
      <p>প্রিয় <strong>{{customer_name}}</strong>,</p>
      <p>জব <strong>#{{job_number}}</strong> এর ডিজাইন অনুমোদন নিশ্চিত হয়েছে। কাজটি প্রিন্টিং কিউতে পাঠানো হয়েছে। সম্ভাব্য ডেলিভারি: <strong>{{estimated_completion}}</strong>।</p>
    `,
    variables: ['customer_name', 'job_number', 'item_name', 'estimated_completion'],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // 8. Job Started
  {
    id: 'tpl-job-started',
    tenant_id: null,
    event_type: 'job_started',
    name: 'Production Job Started (প্রোডাকশন শুরু)',
    name_bn: 'প্রোডাকশন শুরু',
    subject_template: 'Printing In Progress: Job #{{job_number}} is on the Press',
    subject_template_bn: 'প্রিন্টিং শুরু হয়েছে: জব #{{job_number}}',
    body_template: `
      <p>Dear <strong>{{customer_name}}</strong>,</p>
      <p>Great news! Production has officially commenced for your job <strong>#{{job_number}}</strong> ({{item_name}}).</p>
      <div class="info-card">
        <table>
          <tr><td class="label">Job Order:</td><td class="value">#{{job_number}}</td></tr>
          <tr><td class="label">Machine / Line:</td><td class="value">{{machine_name}}</td></tr>
          <tr><td class="label">Quantity:</td><td class="value">{{quantity}}</td></tr>
        </table>
      </div>
    `,
    body_template_bn: `
      <p>প্রিয় <strong>{{customer_name}}</strong>,</p>
      <p>আপনার কাজের (জব #{{job_number}}) প্রিন্টিং কাজ শুরু হয়েছে।</p>
    `,
    variables: ['customer_name', 'job_number', 'item_name', 'machine_name', 'quantity'],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // 9. Job Completed
  {
    id: 'tpl-job-completed',
    tenant_id: null,
    event_type: 'job_completed',
    name: 'Production Job Completed (প্রোডাকশন সম্পন্ন)',
    name_bn: 'প্রোডাকশন সম্পন্ন',
    subject_template: 'Production Complete: Job #{{job_number}} is Ready for Delivery',
    subject_template_bn: 'প্রোডাকশন সম্পন্ন: জব #{{job_number}} ডেলিভারির জন্য প্রস্তুত',
    body_template: `
      <p>Dear <strong>{{customer_name}}</strong>,</p>
      <p>Your print job <strong>#{{job_number}}</strong> ({{item_name}}) has completed production and passed our quality assurance checks.</p>
      <p>Our dispatch team will coordinate delivery with you shortly.</p>
    `,
    body_template_bn: `
      <p>প্রিয় <strong>{{customer_name}}</strong>,</p>
      <p>আপনার অর্ডারকৃত মালামাল (জব #{{job_number}}) সফলভাবে প্রিন্ট ও ফিনিশিং সম্পন্ন হয়েছে। খুব শীঘ্রই ডেলিভারির ব্যবস্থা করা হবে।</p>
    `,
    variables: ['customer_name', 'job_number', 'item_name'],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // 10. Delivery Scheduled
  {
    id: 'tpl-delivery-scheduled',
    tenant_id: null,
    event_type: 'delivery_scheduled',
    name: 'Delivery Challan Dispatched (চালান প্রেরণ)',
    name_bn: 'চালান প্রেরণ',
    subject_template: 'Out for Delivery: Challan #{{challan_number}} from {{company_name}}',
    subject_template_bn: 'ডেলিভারির পথে: চালান #{{challan_number}} - {{company_name}}',
    body_template: `
      <p>Dear <strong>{{customer_name}}</strong>,</p>
      <p>Your finished goods under Delivery Challan <strong>#{{challan_number}}</strong> have been dispatched from our facility.</p>
      <div class="info-card">
        <table>
          <tr><td class="label">Challan No:</td><td class="value">{{challan_number}}</td></tr>
          <tr><td class="label">Delivery Contact:</td><td class="value">{{driver_name}} ({{driver_phone}})</td></tr>
          <tr><td class="label">Destination:</td><td class="value">{{delivery_address}}</td></tr>
        </table>
      </div>
      <p><a href="{{challan_link}}" class="btn">View Delivery Challan (PDF)</a></p>
    `,
    body_template_bn: `
      <p>প্রিয় <strong>{{customer_name}}</strong>,</p>
      <p>চালান <strong>#{{challan_number}}</strong> এর মালামাল ডেলিভারির উদ্দেশ্যে রওয়ানা হয়েছে। চালক পৌঁছানোর পর যোগাযোগ করবেন।</p>
    `,
    variables: ['customer_name', 'company_name', 'challan_number', 'driver_name', 'driver_phone', 'delivery_address', 'challan_link'],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // 11. Delivery Completed
  {
    id: 'tpl-delivery-completed',
    tenant_id: null,
    event_type: 'delivery_completed',
    name: 'Delivery Completed (ডেলিভারি সম্পন্ন)',
    name_bn: 'ডেলিভারি সম্পন্ন',
    subject_template: 'Delivery Confirmed for Challan #{{challan_number}}',
    subject_template_bn: 'ডেলিভারি সম্পন্ন: চালান #{{challan_number}}',
    body_template: `
      <p>Dear <strong>{{customer_name}}</strong>,</p>
      <p>We are pleased to confirm that Delivery Challan <strong>#{{challan_number}}</strong> has been successfully delivered and received by <strong>{{received_by}}</strong>.</p>
      <p>Thank you for partnering with <strong>{{company_name}}</strong>.</p>
    `,
    body_template_bn: `
      <p>প্রিয় <strong>{{customer_name}}</strong>,</p>
      <p>চালান <strong>#{{challan_number}}</strong> এর মালামাল সফলভাবে পৌঁছানো হয়েছে। <strong>{{company_name}}</strong> এর সাথে থাকার জন্য ধন্যবাদ।</p>
    `,
    variables: ['customer_name', 'company_name', 'challan_number', 'received_by'],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // 12. User Invitation
  {
    id: 'tpl-user-invitation',
    tenant_id: null,
    event_type: 'user_invitation',
    name: 'Team Member Invitation (টিম আমন্ত্রণ)',
    name_bn: 'টিম আমন্ত্রণ',
    subject_template: 'You have been invited to join {{company_name}} on PrintERP SaaS',
    subject_template_bn: '{{company_name}} এর PrintERP টিমে যোগদানের আমন্ত্রণ',
    body_template: `
      <p>Hello <strong>{{user_name}}</strong>,</p>
      <p>You have been invited by <strong>{{invited_by}}</strong> to join the team at <strong>{{company_name}}</strong> on PrintERP SaaS.</p>
      <div class="info-card">
        <table>
          <tr><td class="label">Organization:</td><td class="value">{{company_name}}</td></tr>
          <tr><td class="label">Assigned Role:</td><td class="value">{{role_name}}</td></tr>
          <tr><td class="label">Login Email:</td><td class="value">{{email}}</td></tr>
        </table>
      </div>
      <p><a href="{{accept_link}}" class="btn">Accept Invitation & Set Password</a></p>
    `,
    body_template_bn: `
      <p>প্রিয় <strong>{{user_name}}</strong>,</p>
      <p>আপনাকে <strong>{{company_name}}</strong> এর PrintERP সফটওয়্যারে টিম মেম্বার হিসেবে যুক্ত হওয়ার আমন্ত্রণ জানানো হয়েছে।</p>
      <p><a href="{{accept_link}}" class="btn">আমন্ত্রণ গ্রহণ করুন</a></p>
    `,
    variables: ['user_name', 'invited_by', 'company_name', 'role_name', 'email', 'accept_link'],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // 13. Registration Email Verification (OTP & Secure Link)
  {
    id: 'tpl-email-verification',
    tenant_id: null,
    event_type: 'email_verification',
    name: 'Account Email Verification (ইমেইল যাচাইকরণ)',
    name_bn: 'ইমেইল যাচাইকরণ',
    subject_template: 'Verify your InkFlow account - Code: {{otp_code}}',
    subject_template_bn: 'আপনার InkFlow একাউন্ট যাচাই করুন - কোড: {{otp_code}}',
    body_template: `
      <p>Hello <strong>{{user_name}}</strong>,</p>
      <p>Thank you for registering with <strong>InkFlow</strong>. Please use the 6-digit verification code below to activate your account:</p>
      <div style="background: #f1f5f9; border: 2px dashed #4f46e5; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #4f46e5; font-family: monospace;">{{otp_code}}</span>
      </div>
      <p style="text-align: center; margin: 20px 0;">
        <a href="{{verification_link}}" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 12px 28px; font-weight: bold; border-radius: 6px; text-decoration: none;">Verify Email Address</a>
      </p>
      <p style="font-size: 13px; color: #64748b;">This verification code and link will expire in <strong>{{expires_minutes}} minutes</strong>. If you did not create an account on InkFlow, you can safely ignore this email.</p>
    `,
    body_template_bn: `
      <p>প্রিয় <strong>{{user_name}}</strong>,</p>
      <p>InkFlow-এ নিবন্ধন করার জন্য ধন্যবাদ। আপনার একাউন্ট সক্রিয় করতে নিচের ৬-সংখ্যার যাচাইকরণ কোডটি ব্যবহার করুন:</p>
      <div style="background: #f1f5f9; border: 2px dashed #4f46e5; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #4f46e5; font-family: monospace;">{{otp_code}}</span>
      </div>
      <p style="text-align: center; margin: 20px 0;">
        <a href="{{verification_link}}" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 12px 28px; font-weight: bold; border-radius: 6px; text-decoration: none;">ইমেইল যাচাই করুন</a>
      </p>
      <p style="font-size: 13px; color: #64748b;">এই কোড ও লিংকটি <strong>{{expires_minutes}} মিনিট</strong> পর নিষ্ক্রিয় হয়ে যাবে। আপনি যদি এই একাউন্ট তৈরি না করে থাকেন, তবে এই ইমেইলটি উপেক্ষা করুন।</p>
    `,
    variables: ['user_name', 'email', 'otp_code', 'verification_link', 'expires_minutes'],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // 14. Password Reset (OTP & Secure Link)
  {
    id: 'tpl-password-reset',
    tenant_id: null,
    event_type: 'password_reset',
    name: 'Password Reset Request (পাসওয়ার্ড রিসেট)',
    name_bn: 'পাসওয়ার্ড রিসেট',
    subject_template: 'Reset your InkFlow password - Code: {{otp_code}}',
    subject_template_bn: 'আপনার InkFlow পাসওয়ার্ড রিসেট করুন - কোড: {{otp_code}}',
    body_template: `
      <p>Hello <strong>{{user_name}}</strong>,</p>
      <p>We received a request to reset the password for your InkFlow account (<strong>{{email}}</strong>).</p>
      <div style="background: #f1f5f9; border: 2px dashed #4f46e5; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #4f46e5; font-family: monospace;">{{otp_code}}</span>
      </div>
      <p style="text-align: center; margin: 20px 0;">
        <a href="{{reset_link}}" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 12px 28px; font-weight: bold; border-radius: 6px; text-decoration: none;">Reset My Password</a>
      </p>
      <p style="font-size: 13px; color: #64748b;">This code and reset link will expire in <strong>{{expires_minutes}} minutes</strong>. If you did not request a password reset, please change your password immediately or contact support.</p>
    `,
    body_template_bn: `
      <p>প্রিয় <strong>{{user_name}}</strong>,</p>
      <p>আপনার InkFlow একাউন্টের (<strong>{{email}}</strong>) পাসওয়ার্ড রিসেট করার জন্য একটি অনুরোধ পাওয়া গেছে।</p>
      <div style="background: #f1f5f9; border: 2px dashed #4f46e5; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #4f46e5; font-family: monospace;">{{otp_code}}</span>
      </div>
      <p style="text-align: center; margin: 20px 0;">
        <a href="{{reset_link}}" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 12px 28px; font-weight: bold; border-radius: 6px; text-decoration: none;">পাসওয়ার্ড পরিবর্তন করুন</a>
      </p>
      <p style="font-size: 13px; color: #64748b;">এই কোড ও লিংকটি <strong>{{expires_minutes}} মিনিট</strong> কার্যকর থাকবে। আপনি যদি এই অনুরোধ না করে থাকেন, তবে দ্রুত পাসওয়ার্ড পরিবর্তন করুন।</p>
    `,
    variables: ['user_name', 'email', 'otp_code', 'reset_link', 'expires_minutes'],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // 14. Security Alert
  {
    id: 'tpl-security-alert',
    tenant_id: null,
    event_type: 'security_alert',
    name: 'Security Alert: New Sign-In (নিরাপত্তা সতর্কতা)',
    name_bn: 'নিরাপত্তা সতর্কতা',
    subject_template: 'Security Alert: New sign-in to your PrintERP account',
    subject_template_bn: 'নিরাপত্তা সতর্কতা: আপনার একাউন্টে নতুন সাইন-ইন',
    body_template: `
      <p>Hello <strong>{{user_name}}</strong>,</p>
      <p>A new sign-in was detected for your PrintERP account.</p>
      <div class="info-card">
        <table>
          <tr><td class="label">Date & Time:</td><td class="value">{{timestamp}}</td></tr>
          <tr><td class="label">IP Address:</td><td class="value">{{ip_address}}</td></tr>
          <tr><td class="label">Browser & OS:</td><td class="value">{{device_info}}</td></tr>
        </table>
      </div>
      <p>If this was you, no action is needed. If you did not sign in, please change your password immediately.</p>
    `,
    body_template_bn: `
      <p>প্রিয় <strong>{{user_name}}</strong>,</p>
      <p>আপনার একাউন্টে একটি নতুন সাইন-ইন শনাক্ত হয়েছে। যদি এটি আপনি না হয়ে থাকেন, তবে অবিলম্বে পাসওয়ার্ড পরিবর্তন করুন।</p>
    `,
    variables: ['user_name', 'timestamp', 'ip_address', 'device_info'],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // 15. Test Email
  {
    id: 'tpl-test-email',
    tenant_id: null,
    event_type: 'test_email',
    name: 'Gateway Connection Test Email (গেটওয়ে টেস্ট বার্তা)',
    name_bn: 'গেটওয়ে টেস্ট বার্তা',
    subject_template: '✓ Test Email from {{sender_name}} via PrintERP Email Gateway',
    subject_template_bn: '✓ PrintERP ইমেইল গেটওয়ে টেস্ট সফল - {{sender_name}}',
    body_template: `
      <p>Congratulations!</p>
      <p>Your email gateway configured for <strong>{{company_name}}</strong> is functioning perfectly.</p>
      <div class="info-card">
        <table>
          <tr><td class="label">Provider:</td><td class="value">{{provider_name}}</td></tr>
          <tr><td class="label">Sender Identity:</td><td class="value">{{sender_name}} &lt;{{sender_email}}&gt;</td></tr>
          <tr><td class="label">Dispatched At:</td><td class="value">{{timestamp}}</td></tr>
          <tr><td class="label">Status:</td><td class="value" style="color: #10b981;">CONNECTED & VERIFIED</td></tr>
        </table>
      </div>
      <p>All automated quotations, invoices, work orders, and notification emails will be reliably delivered through this gateway.</p>
    `,
    body_template_bn: `
      <p>অভিনন্দন!</p>
      <p><strong>{{company_name}}</strong> এর জন্য কনফিগার করা ইমেইল গেটওয়ে সফলভাবে সংযোগ স্থাপন করেছে।</p>
    `,
    variables: ['company_name', 'provider_name', 'sender_name', 'sender_email', 'timestamp'],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]
