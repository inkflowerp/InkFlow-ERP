import {
  CompanyTaxSettingsRecord,
  DocumentTemplateConfigRecord,
  VatCalculationResult,
  VatPricingMode,
  VatReportSummary,
  DocumentType,
} from '@/types/tax-and-docs.types'

export function calculateVat(
  amount: number,
  rate: number,
  mode: VatPricingMode
): VatCalculationResult {
  if (mode === 'inclusive') {
    const totalAmount = amount
    const baseAmount = Math.round(totalAmount / (1 + rate / 100))
    const vatAmount = totalAmount - baseAmount
    return { baseAmount, vatRate: rate, vatAmount, totalAmount, pricingMode: 'inclusive' }
  } else {
    const baseAmount = amount
    const vatAmount = Math.round(baseAmount * (rate / 100))
    const totalAmount = baseAmount + vatAmount
    return { baseAmount, vatRate: rate, vatAmount, totalAmount, pricingMode: 'exclusive' }
  }
}

export const DEFAULT_TAX_SETTINGS: CompanyTaxSettingsRecord = {
  id: 'tax-default',
  company_id: 'default',
  vat_enabled: true,
  default_vat_rate: 15.0, // Standard 15% NBR Rate
  pricing_mode: 'exclusive',
  bin_number: '',
  tin_number: '',
  trade_license_number: '',
  vat_commissionerate: '',
  vat_circle: '',
  updated_at: new Date().toISOString(),
}

export const DEMO_TAX_SETTINGS = DEFAULT_TAX_SETTINGS

export const DEFAULT_DOCUMENT_TEMPLATES: Record<DocumentType, DocumentTemplateConfigRecord> = {
  quotation: {
    id: 'dt-01',
    company_id: 'default',
    document_type: 'quotation',
    default_language: 'bengali',
    show_company_logo: true,
    company_name_bn: '',
    header_disclaimer: 'Commercial Price Proposal / বাণিজ্যিক দরপত্র',
    footer_terms_en: '1. Quotation valid for 15 days from issue date.\n2. Advance along with work order, remaining on delivery.',
    footer_terms_bn: '১. কোটেশনের মেয়াদ প্রদানের তারিখ হতে ১৫ দিন।\n২. কাজের অর্ডারের সাথে অগ্রিম এবং অবশিষ্ট মালামাল ডেলিভারির সময় প্রদেয়।',
    authorized_signatory_title: 'Authorized Signature',
    show_seal_box: true,
    email_subject_template: 'Official Quotation #{{quotation_number}} from {{company_name}} [৳ {{quotation_total}}]',
    email_subject_template_bn: 'বাণিজ্যিক কোটেশন #{{quotation_number}} - {{company_name}} [৳ {{quotation_total}}]',
    email_body_template: `<p>Dear <strong>{{customer_name}}</strong>,</p>
<p>Thank you for reaching out to <strong>{{company_name}}</strong>. Please find attached our official price proposal for your requested print items.</p>
<div class="info-card">
  <table>
    <tr><td class="label">Quotation #:</td><td class="value"><strong>{{quotation_number}}</strong></td></tr>
    <tr><td class="label">Issue Date:</td><td class="value">{{quotation_date}}</td></tr>
    <tr><td class="label">Valid Until:</td><td class="value">{{valid_until}}</td></tr>
    <tr><td class="label">Grand Total:</td><td class="value"><strong>৳ {{quotation_total}}</strong></td></tr>
  </table>
</div>
<p><strong>Item Overview:</strong><br>{{items_summary}}</p>
<p>The formal PDF proposal has been attached to this email for your convenience and records.</p>
<p><a href="{{document_link}}" class="btn">View & Approve Quotation Online</a></p>
<p>Thank you for choosing {{company_name}}!</p>`,
    email_body_template_bn: `<p>প্রিয় <strong>{{customer_name}}</strong>,</p>
<p><strong>{{company_name}}</strong>-এর সাথে যোগাযোগের জন্য ধন্যবাদ। আপনার অনুরোধকৃত প্রিন্ট কাজের বিস্তারিত কোটেশন পত্রটি এই ইমেইলের সাথে পিডিএফ (PDF) হিসেবে সংযুক্ত করা হলো।</p>
<div class="info-card">
  <table>
    <tr><td class="label">কোটেশন নং:</td><td class="value"><strong>{{quotation_number}}</strong></td></tr>
    <tr><td class="label">প্রদানের তারিখ:</td><td class="value">{{quotation_date}}</td></tr>
    <tr><td class="label">মেয়াদ:</td><td class="value">{{valid_until}}</td></tr>
    <tr><td class="label">মোট মূল্য:</td><td class="value"><strong>৳ {{quotation_total}}</strong></td></tr>
  </table>
</div>
<p><a href="{{document_link}}" class="btn">কোটেশন বিস্তারিত দেখুন ও অনুমোদন দিন</a></p>
<p>ধন্যবাদান্তে,<br><strong>{{company_name}}</strong></p>`,
    whatsapp_template: `*OFFICIAL QUOTATION - {{company_name}}*

Dear {{customer_name}},
Thank you for your inquiry! Here is your official price proposal:

📄 *Quotation No:* #{{quotation_number}}
📅 *Date:* {{quotation_date}}
⏳ *Valid Until:* {{valid_until}}

📋 *Items Summary:*
{{items_summary}}

💵 *Grand Total:* ৳ {{quotation_total}}

🔗 *View & Approve Online:* {{document_link}}

_Thank you for doing business with {{company_name}}!_`,
    whatsapp_template_bn: `*বাণিজ্যিক দরপত্র (কোটেশন) - {{company_name}}*

প্রিয় {{customer_name}},
আমাদের সাথে যোগাযোগের জন্য ধন্যবাদ। আপনার কোটেশন বিবরণ:

📄 *কোটেশন নং:* #{{quotation_number}}
📅 *তারিখ:* {{quotation_date}}
⏳ *মেয়াদ:* {{valid_until}} পর্যন্ত

📋 *আইটেম বিবরণ:*
{{items_summary}}

💵 *সর্বমোট বিল:* ৳ {{quotation_total}}

🔗 *কোটেশন দেখুন ও অনুমোদন দিন:* {{document_link}}

_{{company_name}}_`,
    updated_at: new Date().toISOString(),
  },
  invoice: {
    id: 'dt-02',
    company_id: 'default',
    document_type: 'invoice',
    default_language: 'bengali',
    show_company_logo: true,
    company_name_bn: '',
    header_disclaimer: 'Sales Invoice / বিক্রয় চালান বিল',
    footer_terms_en: '1. Payment is due within agreed terms.\n2. Please make account payee cheques or bank transfers to official company account.',
    footer_terms_bn: '১. নির্ধারিত মেয়াদের মধ্যে বিল পরিশোধযোগ্য।\n২. প্রতিষ্ঠানের ব্যাংক একাউন্টে চেক বা অনলাইন ট্রান্সফার করুন।',
    authorized_signatory_title: 'Authorized Signature',
    show_seal_box: true,
    email_subject_template: 'Commercial Sales Invoice #{{invoice_number}} from {{company_name}} [Due: ৳ {{due_amount}}]',
    email_subject_template_bn: 'বাণিজ্যিক ইনভয়েস #{{invoice_number}} - {{company_name}} [বকেয়া: ৳ {{due_amount}}]',
    email_body_template: `<p>Dear <strong>{{customer_name}}</strong>,</p>
<p>We have generated Invoice <strong>#{{invoice_number}}</strong> for your recent print production with <strong>{{company_name}}</strong>.</p>
<div class="info-card">
  <table>
    <tr><td class="label">Invoice No:</td><td class="value"><strong>{{invoice_number}}</strong></td></tr>
    <tr><td class="label">Invoice Date:</td><td class="value">{{invoice_date}}</td></tr>
    <tr><td class="label">Grand Total:</td><td class="value">৳ {{invoice_total}}</td></tr>
    <tr><td class="label">Paid Amount:</td><td class="value" style="color:#10b981;">৳ {{paid_amount}}</td></tr>
    <tr><td class="label">Due Balance:</td><td class="value" style="color:#ef4444;"><strong>৳ {{due_amount}}</strong></td></tr>
    <tr><td class="label">Payment Status:</td><td class="value"><strong>{{payment_status}}</strong></td></tr>
  </table>
</div>
<p><strong>Item Overview:</strong><br>{{items_summary}}</p>
<p>Please find the official tax invoice PDF attached to this email.</p>
<p><a href="{{document_link}}" class="btn">View & Settle Invoice Online</a></p>
<p>Thank you for choosing {{company_name}}!</p>`,
    email_body_template_bn: `<p>প্রিয় <strong>{{customer_name}}</strong>,</p>
<p><strong>{{company_name}}</strong> থেকে আপনার কাজের জন্য বিক্রয় চালান বিল <strong>#{{invoice_number}}</strong> প্রস্তুত করা হয়েছে। বিস্তারিত ইনভয়েস পিডিএফ ফাইল সংযুক্ত করা হলো।</p>
<div class="info-card">
  <table>
    <tr><td class="label">ইনভয়েস নং:</td><td class="value"><strong>{{invoice_number}}</strong></td></tr>
    <tr><td class="label">তারিখ:</td><td class="value">{{invoice_date}}</td></tr>
    <tr><td class="label">মোট বিল:</td><td class="value">৳ {{invoice_total}}</td></tr>
    <tr><td class="label">পরিশোধিত:</td><td class="value">৳ {{paid_amount}}</td></tr>
    <tr><td class="label">অবশিষ্ট বকেয়া:</td><td class="value" style="color:#ef4444;"><strong>৳ {{due_amount}}</strong></td></tr>
    <tr><td class="label">স্ট্যাটাস:</td><td class="value"><strong>{{payment_status}}</strong></td></tr>
  </table>
</div>
<p><a href="{{document_link}}" class="btn">অনলাইনে ইনভয়েস দেখুন ও পেমেন্ট করুন</a></p>
<p>ধন্যবাদান্তে,<br><strong>{{company_name}}</strong></p>`,
    whatsapp_template: `*COMMERCIAL INVOICE - {{company_name}}*

Dear {{customer_name}},
Your invoice has been generated for your recent print order:

📄 *Invoice No:* #{{invoice_number}}
📅 *Date:* {{invoice_date}}
📊 *Status:* {{payment_status}}

📋 *Items Summary:*
{{items_summary}}

💰 *Grand Total:* ৳ {{invoice_total}}
✅ *Paid Amount:* ৳ {{paid_amount}}
⚠️ *Due Balance:* ৳ {{due_amount}}

🔗 *View & Download Invoice:* {{document_link}}

_Thank you for doing business with {{company_name}}!_`,
    whatsapp_template_bn: `*বাণিজ্যিক বিক্রয় চালান বিল - {{company_name}}*

প্রিয় {{customer_name}},
আপনার সাম্প্রতিক প্রিন্ট অর্ডারের ইনভয়েস বিল প্রস্তুত করা হয়েছে:

📄 *ইনভয়েস নং:* #{{invoice_number}}
📅 *তারিখ:* {{invoice_date}}
📊 *স্ট্যাটাস:* {{payment_status}}

📋 *আইটেম বিবরণ:*
{{items_summary}}

💰 *সর্বমোট বিল:* ৳ {{invoice_total}}
✅ *জমা:* ৳ {{paid_amount}}
⚠️ *বকেয়া:* ৳ {{due_amount}}

🔗 *ইনভয়েস লিংক:* {{document_link}}

_{{company_name}}_`,
    updated_at: new Date().toISOString(),
  },
  vat_mushak: {
    id: 'dt-03',
    company_id: 'default',
    document_type: 'vat_mushak',
    default_language: 'bengali',
    show_company_logo: true,
    company_name_bn: '',
    header_disclaimer: 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার, জাতীয় রাজস্ব বোর্ড — কর চালানপত্র [মূসক-৬.৩]',
    footer_terms_en: 'Goods supplied are subject to National Board of Revenue VAT regulations. This Mushak 6.3 is an official tax credit document.',
    footer_terms_bn: 'সরবরাহকৃত পণ্য জাতীয় রাজস্ব বোর্ডের মূসক বিধিমালা অনুযায়ী করযুক্ত। এই মূসক-৬.৩ চালান কর রেয়াতের সরকারি দলিল।',
    authorized_signatory_title: 'Authorized VAT Officer / মূসক কর্মকর্তা',
    show_seal_box: true,
    updated_at: new Date().toISOString(),
  },
  receipt: {
    id: 'dt-04',
    company_id: 'default',
    document_type: 'receipt',
    default_language: 'bengali',
    show_company_logo: true,
    company_name_bn: '',
    header_disclaimer: 'Official Money Receipt / আনুষ্ঠানিক মানি রিসিট',
    footer_terms_en: 'Received with thanks. Subject to realization in case of payment made by bank cheque.',
    footer_terms_bn: 'ধন্যবাদসহ গৃহীত হলো। চেকের মাধ্যমে প্রদেয় অর্থ ব্যাংকে ক্লিয়ারিং সাপেক্ষে কার্যকর।',
    authorized_signatory_title: 'Cashier / হিসাবরক্ষণ',
    show_seal_box: true,
    updated_at: new Date().toISOString(),
  },
  challan: {
    id: 'dt-05',
    company_id: 'default',
    document_type: 'challan',
    default_language: 'bengali',
    show_company_logo: true,
    company_name_bn: '',
    header_disclaimer: 'Delivery Challan / ডেলিভারি চালানপত্র',
    footer_terms_en: 'Goods received in sound physical condition and exact count.',
    footer_terms_bn: 'সঠিক গণনা ও অক্ষত অবস্থায় মালামাল বুঝে পাওয়া গেল।',
    authorized_signatory_title: 'Store & Dispatch / স্টোর ইনচার্জ',
    show_seal_box: true,
    updated_at: new Date().toISOString(),
  },
  purchase_order: {
    id: 'dt-06',
    company_id: 'default',
    document_type: 'purchase_order',
    default_language: 'bengali',
    show_company_logo: true,
    company_name_bn: '',
    header_disclaimer: 'Purchase Order / ক্রয় আদেশ',
    footer_terms_en: 'Supply strictly in accordance with approved specifications.',
    footer_terms_bn: 'অনুমোদিত নমুনা ও স্পেসিফিকেশন মোতাবেক মালামাল সরবরাহ করতে হবে।',
    authorized_signatory_title: 'Procurement Incharge / ক্রয় কর্মকর্তা',
    show_seal_box: true,
    updated_at: new Date().toISOString(),
  },
}

export const DEMO_DOCUMENT_TEMPLATES = DEFAULT_DOCUMENT_TEMPLATES

export const DEMO_VAT_MONTHLY_RETURN: VatReportSummary = {
  period: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
  grossTurnover: 0,
  outputVat: 0,
  inputVat: 0,
  netPayableVat: 0,
  isExempted: false,
}
