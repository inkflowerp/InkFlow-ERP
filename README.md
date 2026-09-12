# PrintERP SaaS 🖨️🇧🇩

**Enterprise Multi-Tenant ERP & Factory Automation Suite tailored for Bangladesh Printing Presses, Digital Advertising Signage, and Commercial Packaging Workshops.**

---

## 📑 Table of Contents
1. [Overview & Core Value](#overview--core-value)
2. [System Architecture & Tech Stack](#system-architecture--tech-stack)
3. [Prerequisites & Environment Setup](#prerequisites--environment-setup)
4. [Database Migrations (001 – 029)](#database-migrations-001--029)
5. [Local Development](#local-development)
6. [Comprehensive Automated Testing](#comprehensive-automated-testing)
7. [Production Deployment (Vercel + Supabase)](#production-deployment-vercel--supabase)
8. [Production Security Hardening](#production-security-hardening)
9. [Troubleshooting & FAQ](#troubleshooting--faq)

---

## 1. Overview & Core Value

PrintERP SaaS is purpose-built for printing workshops in **Motijheel, Arambagh, Banglabazar, Tejgaon, Chittagong, and Bogura**. It addresses the exact real-world complexities of the printing trade:
- **Dimensional SFT/RFT/GSM Pricing**: Fast calculation for Star Flex, Backlit, Vinyl, 3D Acrylic, Offset sheets, and PVC boards.
- **Full Order-to-Delivery Pipeline**: Customer ➔ Quotation ➔ Order ➔ Pre-press Artwork Proof ➔ Press Floor Ticket (Konica, Heidelberg) ➔ Mushak 6.3 Tax Invoice ➔ bKash/Nagad/Cash Payment ➔ Delivery Challan.
- **Bangladesh Compliance**: NBR Mushak 6.3 tax challans, 15% / 7.5% / 5% VAT extraction, double-overtime under Bangladesh Labor Act (208-hour divisor), and advance salary recovery.
- **Offline-Friendly & Mobile-First**: Touch targets (>= 48px), adaptive desktop table to smartphone cards, offline draft preservation, and PWA installation.
- **Bilingual Experience**: Native support for **English**, **বাংলা**, and **Bilingual (উভয়)** with zero font overflow or vowel clipping.

---

## 2. System Architecture & Tech Stack

```
                     ┌──────────────────────────────────────────────┐
                     │           Next.js 16 (App Router)            │
                     │          React 19 + Tailwind CSS 4           │
                     │      Singapore Edge Serverless Runtime       │
                     └──────────────────────┬───────────────────────┘
                                            │
                     ┌──────────────────────┴───────────────────────┐
                     │          Secure API & Security Layer         │
                     │   Tenant Isolation (company_id Partitioning) │
                     │   RBAC Matrix (7 Personas) | Rate Limiter    │
                     └──────────────────────┬───────────────────────┘
                                            │
        ┌───────────────────────────────────┼───────────────────────────────────┐
        ▼                                   ▼                                   ▼
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│     PostgreSQL 15+      │     │    Private S3 Storage   │     │  Bangladeshi Gateways   │
│   29 Applied Migrations │     │ Time-Limited Signed URLs│     │  bKash / Nagad / SSL    │
│  Covering Indexes & RLS │     │  Customer Artworks &    │     │  BulkSMSBD / SSLWire    │
│  Server KPI Aggregation │     │   Mushak 6.3 Invoices   │     │  WhatsApp Cloud API     │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
```

- **Frontend**: Next.js 16.3 (App Router with Turbopack), React 19, Tailwind CSS 4, Lucide Icons.
- **Backend & Database**: Supabase PostgreSQL with strict Row Level Security (RLS) and connection pooling via Supavisor.
- **Realtime**: Tenant-scoped WebSocket subscriptions with client reference-counted deduplication.
- **Hosting**: Vercel (Singapore `sin1` region for low latency across Bangladesh).

---

## 3. Prerequisites & Environment Setup

### System Requirements:
- **Node.js**: `v24.x` (LTS recommended)
- **npm**: `v10.x` or higher
- **Supabase CLI**: `npx supabase`

### Environment Configuration:
1. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```
2. Populate the required variables in `.env.local`:
   ```bash
   # Public Client Variables
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   NEXT_PUBLIC_DEFAULT_LOCALE=bn
   NEXT_PUBLIC_DEFAULT_CURRENCY=BDT

   # Server-Side Secrets (NEVER expose to browser)
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   STORAGE_SIGNING_SALT=your-random-hex-salt
   ```

> [!CAUTION]
> Never prefix sensitive credentials (`SUPABASE_SERVICE_ROLE_KEY`, payment gateway secrets, SMS tokens) with `NEXT_PUBLIC_`.

---

## 4. Database Migrations (001 – 029)

PrintERP features **29 modular SQL migrations** in [`supabase/migrations/`](file:///f:/Antigravity/PrintERP/supabase/migrations/):

```bash
# Link local repo to your remote Supabase project
npx supabase link --project-ref your-project-ref

# Apply all migrations sequentially
npx supabase db push
```

### Migration Overview:
| Range | Domain Covered |
| :--- | :--- |
| `001 - 006` | Base Schema, 64 BD Districts, Core Multi-Tenant Architecture & Strict RLS |
| `007 - 009` | RBAC Matrix (7 Roles), Atomic Sequences (`INV-`, `ORD-`), Customer/Vendor CRM |
| `010 - 014` | Pricing Engine (SFT/RFT), Quotations, Orders, Pre-press Proofs, Machine Queues |
| `015 - 018` | Stock Ledger, Purchase Orders, Mushak 6.3 Tax Invoices, Delivery Challans |
| `019 - 022` | Double-Entry Accounting, BD Labor Act Payroll, Job Costing, Reporting |
| `023 - 025` | BulkSMSBD, SSLWireless, WhatsApp API, NBR Tax Settings, SaaS Subscriptions |
| `026 - 029` | Platform Admin, Security Audit Logs, Workflow Automation, Performance Indexes |

---

## 5. Local Development

Install dependencies and start the local development server:

```bash
# Install exact dependencies
npm install

# Start Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- **Tenant Onboarding & Registration**: [http://localhost:3000/onboarding](http://localhost:3000/onboarding)
- **Platform Owner Admin**: [http://localhost:3000/platform](http://localhost:3000/platform)

---

## 6. Comprehensive Automated Testing

PrintERP uses Node.js native test runner with zero external runner bloat:

```bash
# Run all automated test suites
npm test

# Run TypeScript type verification
npx tsc --noEmit

# Run ESLint standards verification
npm run lint
```

### Test Coverage Highlights:
- **Unit Calculations**: SFT/RFT pricing formulas, NBR 15%/7.5%/5% VAT, multi-tender payments, roll-to-SFT media conversion, BD Labor Law 2x overtime, job margins.
- **Integration**: Complete 8-step lifecycle: `Customer ➔ Quote ➔ Order ➔ Job ➔ Press ➔ Invoice ➔ Payment ➔ Delivery`.
- **Security & Multi-Tenant**: Cross-tenant data isolation, RLS quarantine, signed storage URLs with expiration, and platform admin boundaries.
- **7-Persona RBAC**: Platform Owner, Business Owner, Sales Manager, Designer, Production Manager, Print Operator, General Staff.
- **Edge Cases**: Partial shipments, cancelled orders, negative stock prevention, duplicate phone detection, and atomic sequence collision prevention.

---

## 7. Production Deployment (Vercel + Supabase)

### Step 1: Deploy Database on Supabase
1. Create a Supabase project in the **Singapore (`ap-southeast-1`)** region.
2. Run database migrations: `npx supabase db push`.
3. Create private storage buckets: `customer-artworks`, `prepress-proofs`, `invoices`, `payment-receipts`.
4. Enable Supabase Auth redirect URLs: `https://your-domain.vercel.app/auth/callback`.

### Step 2: Deploy Application on Vercel
1. Import your GitHub repository to [Vercel](https://vercel.com).
2. Configure **Environment Variables** in Vercel Project Settings:
   - Add all variables defined in `.env.example`.
   - Separate **Production**, **Preview**, and **Development** environment variables.
3. Deploy! Vercel will automatically run the build configured in [`vercel.json`](file:///f:/Antigravity/PrintERP/vercel.json) using Singapore (`sin1`) edge routing.

---

- **Content Security Policy (CSP) & Headers**: Configured in `vercel.json` with `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Strict-Transport-Security`.
- **Authoritative Identity Chains**: Supabase Auth `auth.uid()` ➔ Server Authorization ➔ PostgreSQL RLS ➔ Secure Services ➔ UI. (UI is never a security boundary).
- **Fail-Closed Operations**: Zero synthetic fallbacks (`co-${slug}`, `co-main`, `my-company`, `permissions: ['*']`). Mismatched or absent memberships fail closed with 401/403.
- **SECURITY DEFINER Hardening**: All PostgreSQL functions enforce fixed `SET search_path = public, pg_temp` and caller authorization checks.
- **Signed Storage URLs**: Confidential customer vector artwork and financial receipts use short-lived HMAC signed tokens with private cache headers.
- **API Rate Limiting & Webhook Idempotency**: Enforces sliding-window 120 requests/minute per tenant endpoint, cryptographic signature verification, replay protection, and database-level unique transaction idempotency.
- **Database Quarantine**: Row Level Security (RLS) policies audited and verified across all tenant and platform tables (53 migrations).
- **Credential Rotation Notice**: Supabase service-role keys must never be committed or accessible client-side (`server-only` protection enforced in `lib/supabase/admin.ts`). Rotate production service-role credentials upon new environment deployments.

---

## 9. Troubleshooting & FAQ

### 1. `Cannot find module '@/...'` during standalone test execution
- **Solution**: The automated test suite (`npm test`) uses Node.js 24 native type stripping. Tests are self-contained without path alias dependencies to execute at maximum speed.

### 2. Bengali text looks clipped or causes layout shift
- **Solution**: Ensure your container uses `.bangla-text` utility from `globals.css` which enforces `line-height: 1.6` and `word-break: break-word` for complex Bengali vowel signs (যুক্তাক্ষর).

### 3. Database connection pool timeouts on Serverless
- **Solution**: Use Supavisor connection pooler port `6543` in Transaction mode instead of the direct port `5432` in `DATABASE_URL`.

---

## 📜 License
Proprietary SaaS — All rights reserved. Designed for Bangladesh SME Printing & Packaging Enterprises.
