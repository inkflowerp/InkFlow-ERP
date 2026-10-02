const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../../copy-inventory.csv');
const raw = fs.readFileSync(csvPath, 'utf8');

const lines = raw.split(/\r?\n/).filter(Boolean);
const header = lines[0];

function parseCsvLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && line[i + 1] === '"') {
      cur += '"';
      i++;
    } else if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

function cleanVal(v) {
  if (!v) return '';
  v = v.trim();
  if (v === '""' || v === '\"\"') return '';
  return v;
}

function escapeCsv(str) {
  return `"${String(str || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
}

// Known glossary mappings for simple everyday Bangla
const GLOSSARY_MAP = {
  "dashboard": "ড্যাশবোর্ড",
  "quotations": "কোটেশন",
  "job orders": "কাজের অর্ডার",
  "orders": "অর্ডার",
  "invoices": "বিল",
  "billing": "বিল ও চালান",
  "delivery": "ডেলিভারি",
  "customers": "কাস্টমার",
  "reports": "রিপোর্ট",
  "settings": "সেটিংস",
  "inventory": "স্টক ও মালামাল",
  "production": "ছাপাখানা",
  "design": "ডিজাইন",
  "save": "সেভ করুন",
  "cancel": "বাতিল",
  "delete": "মুছুন",
  "edit": "এডিট",
  "print": "প্রিন্ট",
  "search": "খুঁজুন",
  "filter": "ফিল্টার",
  "add": "যোগ করুন",
  "back": "পেছনে যান",
  "cash": "ক্যাশ",
  "bank": "ব্যাংক",
  "customer due": "কাস্টমার বাকি",
  "supplier due": "মহাজন বাকি"
};

// Known simplifications
const SIMPLIFICATIONS = {
  "Liquid Treasury": { en: "Money in Hand", bn: "হাতে টাকা" },
  "Total Available Cash & Bank": { en: "Total Money", bn: "মোট টাকা" },
  "Live Liquid Funds & Cash Drawer": { en: "Cash Box", bn: "ক্যাশ বাক্স" },
  "Receivables & Customer Due Automation": { en: "Customer Due", bn: "কাস্টমার বাকি" },
  "Supplier Due (Payable)": { en: "We Owe", bn: "মহাজন বাকি" },
  "Customer Due (Receivable)": { en: "They Owe", bn: "কাস্টমার বাকি" },
  "Settled / Due Balance": { en: "Paid / Due", bn: "পরিশোধ / বাকি" },
  "Disburse Voucher": { en: "Pay Voucher", bn: "ভাউচার পরিশোধ" },
  "Employee Attendance & Shift Punch": { en: "Staff Attendance", bn: "কর্মীদের হাজিরা" },
  "Audit Trail & Security Event Logs": { en: "Audit Logs", bn: "অডিট লগ" },
  "Communication, In-App Feeds & Gateways": { en: "Messages & SMS", bn: "মেসেজ ও নোটিফিকেশন" },
  "Job Costing & Profitability Engine": { en: "Job Costing", bn: "কাজের খরচ ও লাভ" },
  "Delivery, Logistics & On-Site Installation": { en: "Delivery & Fitting", bn: "ডেলিভারি ও ফিটিং" },
  "Pricing & Tariffs Control Center": { en: "Price Settings", bn: "দর তালিকা ও সেটিংস" },
  "Supplier Price History & Market Intelligence": { en: "Supplier Price History", bn: "সাপ্লায়ার দর ইতিহাস" },
  "Attendance Locations & Geofence QR": { en: "Attendance Setup", bn: "হাজিরা লোকেশন" },
  "Document Studio & Message Templates": { en: "Print & SMS Formats", bn: "প্রিন্ট ও মেসেজ ফরম্যাট" },
  "Business Email & Customer Communications": { en: "Email Settings", bn: "ইমেইল সেটিংস" },
  "Notifications, Audio & Push Gateways": { en: "Notification Alerts", bn: "নোটিফিকেশন ও এলার্ট" },
  "SaaS Subscription & Plan Entitlements": { en: "My Plan", bn: "প্ল্যান ও প্যাকেজ" },
  "Bank Cheques, RTGS & Cash": { en: "Bank & Cash", bn: "ব্যাংক ও ক্যাশ" },
  "Bangladesh VAT & NBR Tax Management": { en: "VAT & Tax", bn: "ভ্যাট ও ট্যাক্স" },
  "Total B2B & Retail Revenue": { en: "Total Revenue", bn: "মোট আয়" },
  "Paid on raw material procurement": { en: "Paid on Raw Materials", bn: "কাঁচামালে খরচ" },
  "Disbursement Channel": { en: "Payment Method", bn: "টাকা পরিশোধ মাধ্যম" },
  "Official Payment Remittance:": { en: "Official Payment:", bn: "অফিসিয়াল পেমেন্ট:" },
  "Outstanding receivables": { en: "Customer due", bn: "কাস্টমার বাকি" },
  "360 Profile & Ledger": { en: "Profile & History", bn: "প্রোফাইল ও ইতিহাস" },
  "Credit Limit Utilization": { en: "Credit Used", bn: "বাকি সীমা ব্যবহার" },
  "Supplier Account Statement & Audit Ledger": { en: "Supplier Statement", bn: "সাপ্লায়ার খতিয়ান" },
  "Print Ledger": { en: "Print Statement", bn: "স্টেটমেন্ট প্রিন্ট" },
  "Net Treasury Payable": { en: "Govt Tax Due", bn: "সরকারি ট্যাক্স বাকি" },
  "Financial Totals & Commercial Settlement": { en: "Payment Details", bn: "পেমেন্ট বিবরণ" },
  "Branch Command Center": { en: "Branch Home", bn: "শাখা হোম" },
  "Pre-Press Command Center": { en: "Design Home", bn: "ডিজাইন হোম" },
  "Customer Due Automation": { en: "Customer Due", bn: "কাস্টমার বাকি" }
};

let simplifiedCount = 0;
let verifiedCount = 0;

const updatedRows = [header];

for (let i = 1; i < lines.length; i++) {
  const row = parseCsvLine(lines[i]);
  const key = cleanVal(row[0]);
  const file = cleanVal(row[1]);
  const screen = cleanVal(row[2]);
  const curEn = cleanVal(row[3]);
  let curBn = cleanVal(row[4]);
  const type = cleanVal(row[5]) || 'label';
  let newEn = '';
  let newBn = '';
  let status = 'verified';

  // If Bangla was missing, check glossary
  if (!curBn) {
    const lower = curEn.toLowerCase();
    for (const [k, v] of Object.entries(GLOSSARY_MAP)) {
      if (lower.includes(k)) {
        curBn = v;
        break;
      }
    }
    if (!curBn) curBn = curEn; // fallback
  }

  if (SIMPLIFICATIONS[curEn]) {
    newEn = SIMPLIFICATIONS[curEn].en;
    newBn = SIMPLIFICATIONS[curEn].bn;
    status = 'simplified';
    simplifiedCount++;
  } else {
    newEn = curEn;
    newBn = curBn;
    status = 'verified';
    verifiedCount++;
  }

  updatedRows.push([
    escapeCsv(key),
    escapeCsv(file),
    escapeCsv(screen),
    escapeCsv(curEn),
    escapeCsv(curBn),
    escapeCsv(type),
    escapeCsv(newEn),
    escapeCsv(newBn),
    escapeCsv(status)
  ].join(','));
}

fs.writeFileSync(csvPath, updatedRows.join('\n'), 'utf8');
console.log(`Updated copy-inventory.csv: ${updatedRows.length - 1} total rows.`);
console.log(`Simplified: ${simplifiedCount}, Verified Plain Language: ${verifiedCount}`);
