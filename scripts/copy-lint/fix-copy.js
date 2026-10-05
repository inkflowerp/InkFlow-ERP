/**
 * Plain-language Copy Fixer for PrintFlow
 * Replaces banned corporate words and long titles with everyday words.
 */

const fs = require('fs');
const path = require('path');

const REPLACEMENTS = [
  // Titles
  {
    from: 'titleEn="Employee Attendance & Shift Punch"',
    to: 'titleEn="Staff Attendance"'
  },
  {
    from: 'titleBn="কর্মীদের দৈনিক উপস্থিতি ও শিফট হাজিরা"',
    to: 'titleBn="কর্মীদের হাজিরা"'
  },
  {
    from: 'titleEn="Audit Trail & Security Event Logs"',
    to: 'titleEn="Audit Logs"'
  },
  {
    from: 'titleBn="অডিট ট্রেইল ও নিরাপত্তা ইভেন্ট লগ"',
    to: 'titleBn="অডিট লগ"'
  },
  {
    from: 'titleEn="Communication, In-App Feeds & Gateways"',
    to: 'titleEn="Messages & SMS"'
  },
  {
    from: 'titleBn="যোগাযোগ, নোটিফিকেশন ফিড ও মেসেজ"',
    to: 'titleBn="মেসেজ ও নোটিফিকেশন"'
  },
  {
    from: 'titleEn="Job Costing & Profitability Engine"',
    to: 'titleEn="Job Costing"'
  },
  {
    from: 'titleBn="কাজের ব্যয় বিশ্লেষণ ও লাভ-লোকসান হিসাব"',
    to: 'titleBn="কাজের খরচ ও লাভ"'
  },
  {
    from: 'titleEn="Delivery, Logistics & On-Site Installation"',
    to: 'titleEn="Delivery & Fitting"'
  },
  {
    from: 'titleBn="ডেলিভারি, লজিস্টিকস ও সাইট ইনস্টলেশন"',
    to: 'titleBn="ডেলিভারি ও ফিটিং"'
  },
  {
    from: 'titleEn="My Workforce Hub & Salary"',
    to: 'titleEn="My Staff Hub"'
  },
  {
    from: 'titleEn="Pricing & Tariffs Control Center"',
    to: 'titleEn="Price Settings"'
  },
  {
    from: 'titleBn="মূল্য নির্ধারণ ও ট্যারিফ রেট"',
    to: 'titleBn="দর তালিকা ও সেটিংস"'
  },
  {
    from: 'titleEn="Supplier Price History & Market Intelligence"',
    to: 'titleEn="Supplier Price History"'
  },
  {
    from: 'titleBn="সাপ্লায়ার দর ইতিহাস ও রেট ট্রেন্ড"',
    to: 'titleBn="সাপ্লায়ার দর ইতিহাস"'
  },
  {
    from: 'titleEn="Attendance Locations & Geofence QR"',
    to: 'titleEn="Attendance Setup"'
  },
  {
    from: 'titleBn="হাজিরা লোকেশন ও কিউআর কোড"',
    to: 'titleBn="হাজিরা লোকেশন"'
  },
  {
    from: 'titleEn="Document Studio & Message Templates"',
    to: 'titleEn="Print & SMS Formats"'
  },
  {
    from: 'titleBn="ডকুমেন্ট স্টুডিও ও মেসেজ টেমপ্লেট"',
    to: 'titleBn="প্রিন্ট ও মেসেজ ফরম্যাট"'
  },
  {
    from: 'titleEn="Business Email & Customer Communications"',
    to: 'titleEn="Email Settings"'
  },
  {
    from: 'titleBn="বিজনেস ইমেইল ও নোটিফিকেশন"',
    to: 'titleBn="ইমেইল সেটিংস"'
  },
  {
    from: 'titleEn="Notifications, Audio & Push Gateways"',
    to: 'titleEn="Notification Alerts"'
  },
  {
    from: 'titleBn="নোটিফিকেশন, অডিও ও পুশ গেটওয়ে"',
    to: 'titleBn="নোটিফিকেশন ও এলার্ট"'
  },
  {
    from: 'titleEn="SaaS Subscription & Plan Entitlements"',
    to: 'titleEn="My Plan"'
  },
  {
    from: 'titleBn="সাবস্ক্রিপশন ও ফিচার প্যাকেজ"',
    to: 'titleBn="প্ল্যান ও প্যাকেজ"'
  },
  {
    from: 'titleEn="Bank Cheques, RTGS & Cash"',
    to: 'titleEn="Bank & Cash"'
  },
  {
    from: 'titleBn="ব্যাংক চেক ও ক্যাশ"',
    to: 'titleBn="ব্যাংক ও ক্যাশ"'
  },
  {
    from: 'titleEn="Bangladesh VAT & NBR Tax Management"',
    to: 'titleEn="VAT & Tax"'
  },
  {
    from: 'titleBn="ভ্যাট ও এনবিআর ট্যাক্স হিসাব"',
    to: 'titleBn="ভ্যাট ও ট্যাক্স"'
  },
  {
    from: 'titleEn="Total B2B & Retail Revenue"',
    to: 'titleEn="Total Revenue"'
  },
  {
    from: 'titleEn="Paid on raw material procurement"',
    to: 'titleEn="Paid on Raw Materials"'
  },

  // Banned Words in UI Code
  {
    from: 'Official Payment Remittance:',
    to: 'Official Payment:'
  },
  {
    from: 'Favorable gang-run nesting yield',
    to: 'Saved paper on sheet'
  },
  {
    from: 'Back to Costing Ledger',
    to: 'Back to Costing'
  },
  {
    from: 'Outstanding receivables',
    to: 'Customer due'
  },
  {
    from: '360 Profile & Ledger',
    to: 'Profile & History'
  },
  {
    from: 'Credit Limit Utilization',
    to: 'Credit Used'
  },
  {
    from: 'Disburse Voucher',
    to: 'Pay Voucher'
  },
  {
    from: 'Disbursement Channel',
    to: 'Payment Method'
  },
  {
    from: 'Supplier Account Statement & Audit Ledger',
    to: 'Supplier Statement'
  },
  {
    from: 'Print Ledger',
    to: 'Print Statement'
  },
  {
    from: 'Net Treasury Payable',
    to: 'Govt Tax Due'
  },
  {
    from: 'Financial Totals & Commercial Settlement',
    to: 'Payment Details'
  },
  {
    from: 'New invoice recorded and receivables updated.',
    to: 'New bill saved and customer due updated.'
  },
  {
    from: 'Branch Command Center',
    to: 'Branch Home'
  },
  {
    from: 'Pre-Press Command Center',
    to: 'Design Home'
  },
  {
    from: 'NO access to payment collections, cash ledger, or company accounts',
    to: 'No access to payments, cash box, or accounts'
  },
  {
    from: 'Digital • Offset • Signage Command Center',
    to: 'Owner Dashboard'
  },
  {
    from: 'Live Liquid Funds & Cash Drawer',
    to: 'Cash Box & Bank'
  },
  {
    from: 'Real-time counter cash in drawer, bKash merchant & bank balances',
    to: 'Cash in box, bKash and bank money'
  },
  {
    from: 'Total Liquid Cash:',
    to: 'Total Cash:'
  },
  {
    from: 'Real-time machine floor runs, queues, and task completions',
    to: 'Machine work and running orders'
  },
  {
    from: 'Financial receivables data restricted by permissions.',
    to: 'Customer due data is restricted.'
  },
  {
    from: 'Commercial Sales Command Center',
    to: 'Sales Home'
  },
  {
    from: 'Liquid Treasury',
    to: 'Money in Hand'
  },
  {
    from: '100% Liquid',
    to: 'In Cash & Bank'
  },
  {
    from: 'Supplier Dues (Payables)',
    to: 'Supplier Due'
  },
  {
    from: 'Open Full Ledger →',
    to: 'View All Transactions →'
  },
  {
    from: 'Receivables Report',
    to: 'Customer Due Report'
  },
  {
    from: 'Payables Report',
    to: 'Supplier Due Report'
  },
  {
    from: 'Cash Flow Statement (Liquid Movements)',
    to: 'Cash Flow Statement'
  },
  {
    from: 'Net Liquid Cash Movement',
    to: 'Net Cash In/Out'
  },
  {
    from: 'Total Current Liquid Capital in Hand & Bank',
    to: 'Total Money in Hand & Bank'
  },
  {
    from: 'Customer Receivables Aging & Outstanding Report',
    to: 'Customer Due Report'
  },
  {
    from: 'Supplier Payables & Vendor Commitments Report',
    to: 'Supplier Due Report'
  },
  {
    from: 'General Ledger Debit Account',
    to: 'Expense Account'
  },
  {
    from: 'Payables & Supplier Liabilities',
    to: 'Supplier Due'
  },
  {
    from: 'No supplier payables found.',
    to: 'No supplier dues found.'
  },
  {
    from: 'Due for settlement this week',
    to: 'Pay this week'
  },
  {
    from: 'Receivables & Customer Due Automation',
    to: 'Customer Due'
  },
  {
    from: 'No customer receivables found matching your criteria.',
    to: 'No customer dues found.'
  },
  {
    from: 'Physical Count Reconciliation & Adjustment',
    to: 'Count Check & Fix Stock'
  },
  {
    from: 'View Accounts Ledger',
    to: 'View Bill & Payments'
  },
  {
    from: 'Advance Salary Ledger',
    to: 'Advance Salary History'
  },
  {
    from: 'Agreed Payment Terms & Advance Disbursement',
    to: 'Payment Terms & Advance Pay'
  },
  {
    from: 'Unlock unlimited orders, multi-branch, and SMS automation.',
    to: 'Unlock unlimited orders, multi-branch, and auto SMS.'
  },
  {
    from: 'Please enter a valid disbursement amount greater than 0.',
    to: 'Enter an amount greater than 0.'
  },
  {
    from: 'Disbursement Amount',
    to: 'Payment Amount'
  },
  {
    from: 'Disbursement Channel & Method',
    to: 'Payment Method'
  },
  {
    from: 'Disbursement Bank Account',
    to: 'Bank Account'
  },
  {
    from: 'Disburse Payment Voucher',
    to: 'Pay Supplier'
  },
  {
    from: 'Legal, VAT/BIN & Bank Settlement Details',
    to: 'Bank & VAT Details'
  },
  {
    from: 'New Automation Rule',
    to: 'New Auto Rule'
  },
  {
    from: 'Audit Ledger',
    to: 'Audit Log'
  },
  {
    from: 'Net Receivables (Due)',
    to: 'Customer Due'
  },
  {
    from: "tBilingual('Receivables', 'কাস্টমার বাকি')",
    to: "tBilingual('Customer Due', 'কাস্টমার বাকি')"
  },
  {
    from: "tBilingual('Payables', 'মহাজন দেনা')",
    to: "tBilingual('Supplier Due', 'মহাজন বাকি')"
  },
  {
    from: "title: 'Receivables & Customer Due'",
    to: "title: 'Customer Due'"
  },
  {
    from: "title: 'Payables & Supplier Dues'",
    to: "title: 'Supplier Due'"
  },
  {
    from: "labelEn: 'View Payables'",
    to: "labelEn: 'View Supplier Due'"
  },
  {
    from: 'No receivable invoices found.',
    to: 'No due bills found.'
  }
];

function processDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== '.git') {
        processDir(full);
      }
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      let content = fs.readFileSync(full, 'utf8');
      let changed = false;

      for (const rep of REPLACEMENTS) {
        if (content.includes(rep.from)) {
          content = content.replaceAll(rep.from, rep.to);
          changed = true;
          console.log(`Replaced in ${entry.name}: "${rep.from}" -> "${rep.to}"`);
        }
      }

      if (changed) {
        fs.writeFileSync(full, content, 'utf8');
      }
    }
  }
}

console.log('Applying copy replacements...');
processDir(path.join(__dirname, '../../app/[tenantSlug]'));
processDir(path.join(__dirname, '../../components'));
processDir(path.join(__dirname, '../../features'));
console.log('Done applying replacements!');
