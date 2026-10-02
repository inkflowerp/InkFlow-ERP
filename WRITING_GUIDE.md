# InkFlow ERP — Plain-Language Writing Guide

> **Audience:** Shop staff, press operators, cashiers, helpers, and small business owners in Bangladesh, in the printing and signage industry. Many read slowly, use budget Android phones, and do not know formal English or accounting jargon.

---

## 1. Core Principles

1. **Class 5 Rule:** If a fifth-grade student cannot understand the sentence immediately, rewrite it.
2. **Cut Words Ruthlessly:** If an icon + 1 word explains the action, delete the helper text. Never write subtitles that merely repeat the header.
3. **Action-First:** Tell the user what to DO directly with active verbs ("টাকা নিন", "Add customer", "Save").
4. **No Blame in Errors:** Never show technical error codes or say "Invalid input". Say what is wrong and what to do in under 10 words ("Phone number is wrong. Enter 11 digits." / "মোবাইল নম্বর ভুল। ১১ সংখ্যা লিখুন।").
5. **Natural Spoken Bangla:** Polite everyday spoken shop Bangla ("আপনি" form: "লিখুন", "বেছে নিন", "সেভ করুন"). Never use formal Sanskritized words (সাধু-ভাষা).
6. **One Word for One Concept Everywhere:** Always check `glossary.md`. Never use synonyms across different screens.

---

## 2. Hard Length Limits

| Element | Max Word Count | Rule | Example |
|---|---|---|---|
| **Buttons** | **1 – 2 words** | Direct action verb + noun | "Save" / "সেভ করুন", "Add Customer" / "কাস্টমার যোগ" |
| **Menu Items** | **1 – 2 words** | Everyday category noun | "Orders" / "অর্ডার", "Money" / "টাকা-পয়সা" |
| **Field Labels** | **1 – 3 words** | What goes in the box | "Customer Name" / "কাস্টমারের নাম" |
| **Screen Titles** | **Max 4 words** | What this screen does | "Billing & Invoices" -> "Bills & Payments" / "বিল ও টাকা" |
| **Hints & Errors** | **Max 10 words** | 1 short sentence only | "Enter 11-digit mobile number." / "১১ সংখ্যার মোবাইল নম্বর লিখুন।" |
| **Confirmation** | **Max 10 words** | Direct question + clear buttons | "Delete this bill?" -> [Delete] [Cancel] |
| **Empty States** | **1 line + 1 button** | What is missing + action | "No bills yet." + [New Bill] |

---

## 3. Banned Jargon & Mandatory Replacements

| Banned Jargon | Replace with (English) | Replace with (Bangla) |
|---|---|---|
| Liquid / Liquidity | Money in Hand | হাতের টাকা |
| Treasury / Liquidity Reserve | Total Money | মোট টাকা |
| Cash Drawer / Petty Cash Till | Cash Box | ক্যাশ বাক্স |
| Receivables | Customer Due / They Owe | কাস্টমারের বাকি / আমরা পাব |
| Payables | Supplier Due / We Owe | মহাজনের বাকি / আমরা দেব |
| Automation / Workflow Trigger | Auto Rule | অটো নিয়ম |
| Reconciliation / EOD Audit | Close Day | দিন শেষ |
| General Ledger | Money Book | টাকার খাতা |
| Settle / Settlement | Paid / Clear Due | পরিশোধ |
| Disburse / Disbursement | Pay Out | টাকা দেওয়া |
| Remit / Remittance | Send Money | টাকা পাঠানো |
| Invoice-to-Cash | Sell to Payment | কাজ থেকে টাকা |
| Machine Utilization | Machine Work | মেশিনের কাজ |
| Gang-run Nesting Yield | Sheet Saving | শিটে সাজানো |
| Substrate | Material | কাঁচামাল |
| Synchronize / Syncing | Saving... | সেভ হচ্ছে... |
| Aggregate | Total | মোট |
| Initiate / Terminate | Start / Stop | শুরু / বন্ধ |
| Authenticate / Authorization | Sign In / Permission | লগইন / অনুমতি |

---

## 4. Writing Error Messages

Every error message must follow this exact formula:
**[What is wrong in simple words]. [What to do next].** (Max 10 words total)

- ❌ *Bad:* "Invalid input format: E.164 phone number validation failed for customer entity."
- ✅ *Good:* "Phone number is wrong. Enter 11 digits." (বাংলা: "নম্বরটি ভুল। ১১ সংখ্যার নম্বর দিন।")

- ❌ *Bad:* "Insufficient balance in liquidity drawer to disburse expenditure."
- ✅ *Good:* "Not enough money in cash box." (বাংলা: "ক্যাশ বাক্সে পর্যাপ্ত টাকা নেই।")

- ❌ *Bad:* "Fatal database constraint violation: duplicate invoice number detected."
- ✅ *Good:* "This bill number already exists." (বাংলা: "এই বিল নম্বরটি আগেই আছে।")

---

## 5. Bangla Typography & Rendering

- Use standard Bengali numerals (`০-৯`) in Bangla mode, English numerals (`0-9`) in English mode.
- Use `৳` symbol for all Bangladeshi Taka amounts.
- Ensure all Bangla container elements have `bangla-text` class with proper line-height (`leading-relaxed`) to prevent conjuncts (যুক্তাক্ষর) from clipping.
- Never mix English grammar with Bangla suffixes (e.g. avoid "Customer-দের", write "কাস্টমারদের").

---

## 6. Platform Owner Panel Rules (SaaS Owner & Support Staff)

> **Audience:** The SaaS owner, platform staff, support agents, and sales staff in Bangladesh. Some have little formal software experience. All copy must be understandable without technical training.

### 6.1 Banned SaaS Jargon & Plain Replacements

| Banned SaaS Term | Replace with (English) | Replace with (Bangla) | Context / Meaning |
|---|---|---|---|
| **Tenant / Tenant Management** | Client / Clients | ক্লায়েন্ট | The printing business using InkFlow |
| **Subscription / Lifecycle** | Plan / Plan Status | প্ল্যান / প্ল্যানের অবস্থা | Their monthly or yearly tier |
| **MRR / Monthly Recurring** | Monthly Income | মাসিক আয় | Total recurring revenue per month |
| **ARR** | Yearly Income | বার্ষিক আয় | Total recurring revenue per year |
| **ARPU** | Avg per Client | ক্লায়েন্ট প্রতি আয় | Average revenue per account |
| **Churn Rate / Churned** | Clients Left | চলে যাওয়া ক্লায়েন্ট | Accounts that cancelled or stopped |
| **Trial Period Expires** | Free trial ends | ফ্রি ট্রায়াল শেষ | When the free demo period ends |
| **Provisioning / Provision** | Setup / Setup Client | সেটআপ / ক্লায়েন্ট তৈরি | Creating a new business space |
| **Suspend Tenant** | Stop Client | ক্লায়েন্ট বন্ধ করুন | Deactivating access for overdue bill |
| **Activate / Reactivate** | Start Client | ক্লায়েন্ট চালু করুন | Restoring full access |
| **Impersonate / Ghost Session** | Open as Client | ক্লায়েন্ট হিসেবে খুলুন | Support agent entering client workspace |
| **Overdue / Dunning** | Payment Late | পেমেন্ট দেরি | Unpaid invoice after due date |
| **Usage Quota Exceeded** | Limit is full | লিমিট শেষ | Reached storage or user quota limit |
| **Feature Flags / Entitlements** | Features On/Off | ফিচার চালু/বন্ধ | Toggling optional tools |
| **Audit Logs** | Activity History | কাজের ইতিহাস | List of who did what and when |
| **Webhook / Endpoint** | Auto Notification | স্বয়ংক্রিয় নোটিফিকেশন | System-to-system notifications |
| **API Key / Secret** | Secret Key | সিক্রেট চাবি | Connection password |
| **Incident / Degradation** | System Issue | সিস্টেম সমস্যা | Server outage or bug |
| **Background Jobs / Workers** | System Tasks | সিস্টেমের কাজ | Automatic background processing |
| **RBAC / Permissions** | Staff Roles | কর্মীদের অনুমতি | Who is allowed to click what |

### 6.2 Platform Safety Rules for Destructive Actions
For stop, delete, refund, plan-change, and price-change actions:
- Always clearly state **what will happen** in simple words.
  - Stop Client: *"Stop this client? They cannot log in."* (বাংলা: *"ক্লায়েন্ট বন্ধ করবেন? তারা লগইন করতে পারবে না।"*)
  - Delete Client: *"Delete this client? All their data will be removed."* (বাংলা: *"ক্লায়েন্ট মুছে ফেলবেন? তাদের সব তথ্য মুছে যাবে।"*)
- Explicit, unambiguous action buttons: `[Stop Client] [Cancel]` or `[Delete] [Cancel]`. Never use vague labels like `[Submit]` or `[OK]`.
- Always show money amounts with the `৳` symbol and clearly formatted numbers.

