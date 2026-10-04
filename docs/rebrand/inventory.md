# PrintFlow Rebrand — Token & Domain Inventory

Generated as part of **Phase 0** to establish a comprehensive audit footprint for migrating from **InkFlow ERP / PrintERP** to **PrintFlow** (`প্রিন্টফ্লো`).

---

## 1. Executive Summary & Match Counts

| Category / Pattern | Total Matches |
| :--- | :--- |
| **inkflow** (case-insensitive) | 854 |
| **ink-flow** (case-insensitive) | 1 |
| **printerp** (case-insensitive) | 3962 |
| **print erp** (case-insensitive) | 3 |
| **Bangla: প্রিন্ট ইআরপি** | 7 |
| **Bangla: প্রিন্টইআরপি** | 27 |
| **Bangla: ইঙ্কফ্লো / ইংকফ্লো** | 3 |
| **Hostnames / Domains** (inkflow/printerp + TLDs) | 450 |
| **Unique Affected Files** | 782 |
| **Total Inventory Footprint** | 5307 |

---

## 2. Hostname & Domain Matches Detail

Hostnames matching `(inkflow|printerp)[a-z0-9.-]*\.(com\.bd|com|bd|io|app|net|vercel\.app)`:

| File | Line | Snippet |
| :--- | :--- | :--- |
| `.env.example` | 18 | `NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000 # e.g. printerp.com.bd or inkflowerp.com in production` |
| `.env.example` | 107 | `PLATFORM_SMTP_HOST=smtp.printerp.com` |
| `.env.example` | 108 | `SMTP_HOST=smtp.printerp.com # Alias supported` |
| `.env.example` | 110 | `PLATFORM_SMTP_USER=notifications@printerp.com` |
| `ARCHITECTURE.md` | 29 | `\|  inkflowerp.com  \|            \| admin.inkflowerp  \|           \| [slug].inkflowerp \|` |
| `ARCHITECTURE.md` | 46 | `\| **Marketing / Root** \| `ROOT_DOMAIN` (`inkflowerp.com`, `localhost:3000`) \| Landing page, workspace discovery, tenant registration, legal pages \| Host-only (`inkflowerp.com`) \|` |
| `ARCHITECTURE.md` | 47 | `\| **Platform Owner** \| `admin.ROOT_DOMAIN` (`admin.inkflowerp.com`, `admin.localhost`) \| Platform administration, subscriptions, tenant audit, metrics \| Host-only (`admin.inkflowerp.com`) \|` |
| `ARCHITECTURE.md` | 48 | `\| **Tenant Portal** \| `[tenantSlug].ROOT_DOMAIN` (`vision.inkflowerp.com`) \| Tenant business operations, billing, inventory, POS, employee login \| Host-only (`vision.inkflowerp.com`) \|` |
| `ARCHITECTURE.md` | 50 | `\| **PSL / Dev Fallback**\| `inkflow-erp.vercel.app/t/[slug]/*` or `/[slug]/*` \| Path-based fallback when wildcard DNS is unavailable \| Host-only on fallback host \|` |
| `ARCHITECTURE.md` | 56 | `- Wildcards on `*.inkflow-erp.vercel.app` are mathematically and architecturally impossible because `vercel.app` is an entry on the Public Suffix List (PSL).` |
| `ARCHITECTURE.md` | 247 | `\|    - Verified Host / Subdomain / Custom Domain Resolution (e.g. acme.inkflowerp.com)             \|` |
| `ARCHITECTURE.md` | 254 | `\|    - Reconstructs internal routing / rewrites (e.g. acme.inkflowerp.com/sales -> /acme/sales)    \|` |
| `TENANT_AUTH_AUDIT.md` | 19 | `6. **Vercel Wildcard Domain Misconception:** `*.inkflow-erp.vercel.app` is fundamentally unroutable via wildcards because `vercel.app` is on the Public Suffix List (PSL).` |
| `TENANT_AUTH_AUDIT.md` | 117 | `- Generates synthetic email: `username@companySlug.inkflow.app`.` |
| `TENANT_AUTH_AUDIT.md` | 130 | `### Reproduction 1: Wildcard 404 & SSL Failure on `*.inkflow-erp.vercel.app`` |
| `TENANT_AUTH_AUDIT.md` | 131 | `- **Steps:** Navigate to `https://acme.inkflow-erp.vercel.app`.` |
| `TENANT_AUTH_AUDIT.md` | 133 | `- **Root Cause:** `vercel.app` is an entry on the Public Suffix List (PSL). Vercel does not and cannot issue wildcard SSL certificates (`*.inkflow-erp.vercel.app`) for projects on the `vercel.app` domain.` |
| `TENANT_AUTH_AUDIT.md` | 134 | `- **Resolution:** Production must use a custom root domain (e.g. `inkflowerp.com`) with nameservers pointing to Vercel (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`). Interim preview/development environments must use path-based routing (`/t/[tenantSlug]/...` or `/[tenantSlug]/...`) behind an explicit environment flag.` |
| `TENANT_AUTH_AUDIT.md` | 165 | `1. Log into `alpha.inkflowerp.com`.` |
| `TENANT_AUTH_AUDIT.md` | 167 | `- **Observed Behavior:** Domain attribute is `.inkflowerp.com`. Cookie is sent to `beta.inkflowerp.com` and `admin.inkflowerp.com`.` |
| `TENANT_AUTH_AUDIT.md` | 188 | `\| **SEC-HIGH-01** \| **Vercel Wildcard SSL Impossibility on `*.vercel.app`** \| Project Domain Architecture \| Subdomains on `*.inkflow-erp.vercel.app` fail SSL/DNS; requires custom root domain and path-based fallback. \|` |
| `actions/email-gateway.actions.ts` | 293 | `sender_email: formData.sender_email \|\| 'test@printerp.com',` |
| `actions/whatsapp-connection.actions.ts` | 168 | `const appUrl = process.env.NEXT_PUBLIC_APP_URL \|\| 'https://app.printerp.com'` |
| `app/(auth)/login/page.tsx` | 231 | `// On root domain (e.g. inkflow.com.bd, inkflow-erp.vercel.app, localhost:3000)` |
| `app/api/pdf/[type]/route.ts` | 109 | `email: tenantCompany?.email \|\| "billing@inkflow-erp.com",` |
| `app/api/pdf/[type]/route.ts` | 110 | `website: tenantCompany?.website \|\| "www.inkflow-erp.com",` |
| `app/contact/page.tsx` | 125 | `{contactEmail \|\| 'support@printerp.com.bd'}` |
| `app/platform/admins/admins-client.tsx` | 883 | `placeholder="tariqul@inkflow.com.bd"` |
| `app/platform/email/email-client.tsx` | 675 | `placeholder="smtp.printerp.com"` |
| `app/platform/email/email-client.tsx` | 1020 | `value={customDomainInput \|\| (gateway?.sender_email \|\| senderEmail \|\| 'printerp.com').split('@')[1] \|\| 'printerp.com'}` |
| `app/platform/email/email-client.tsx` | 1176 | `const domain = customDomainInput \|\| (gateway?.sender_email \|\| senderEmail \|\| 'printerp.com').split('@')[1] \|\| 'printerp.com'` |
| `app/platform/email/email-client.tsx` | 1208 | `{`v=DMARC1; p=quarantine; sp=quarantine; rua=mailto:postmaster@${customDomainInput \|\| (gateway?.sender_email \|\| senderEmail \|\| 'printerp.com').split('@')[1] \|\| 'printerp.com'}; aspf=r; adkim=r;`}` |
| `app/platform/email/email-client.tsx` | 1290 | `placeholder="admin@printerp.com"` |
| `app/platform/forgot-password/page.tsx` | 108 | `placeholder="admin@printerp.com.bd"` |
| `app/platform/integrations/integrations-client.tsx` | 194 | `{ key: 'smtp_username', label: 'SMTP Username / Login', placeholder: 'notifications@printerp.com', type: 'text', required: true },` |
| `app/platform/integrations/integrations-client.tsx` | 196 | `{ key: 'sender_email', label: 'From Email Address', placeholder: 'notifications@printerp.com', type: 'text', required: true },` |
| `app/platform/integrations/integrations-client.tsx` | 197 | `{ key: 'reply_to_email', label: 'Reply-To Email', placeholder: 'support@printerp.com', type: 'text', required: false },` |
| `app/platform/integrations/integrations-client.tsx` | 981 | `recipient = String(formData.public_config?.sender_email \|\| formData.public_config?.gmail_account_email \|\| 'admin@printerp.com').trim()` |
| `app/platform/integrations/integrations-client.tsx` | 1107 | `if (gw.category === 'email') defaultRecipient = 'admin@printerp.com'` |
| `app/platform/integrations/integrations-client.tsx` | 2706 | `? 'admin@printerp.com'` |
| `app/platform/login/page.tsx` | 341 | `placeholder={tBilingual('admin@inkflow.com.bd, 017...', 'ইমেইল বা ০১...')}` |
| `app/platform/notifications/notifications-client.tsx` | 882 | `placeholder="e.g., /platform/health or https://status.inkflow.io"` |
| `app/platform/settings/settings-client.tsx` | 677 | `placeholder="e.g. inkflow.com.bd or localhost:3000"` |
| `app/platform/settings/settings-client.tsx` | 756 | `placeholder="support@printerp.com.bd"` |
| `app/platform/subscriptions/subscriptions-client.tsx` | 807 | `{s.company_slug}.printerp.com.bd` |
| `app/platform/tenants/[companyId]/tenant-detail-client.tsx` | 245 | `<span className="tabular-nums text-primary">{company.slug}.printerp.com.bd</span>` |
| `app/platform/usage/usage-client.tsx` | 561 | `{r.company_slug}.printerp.com.bd` |
| `app/privacy/page.tsx` | 75 | `If you have any questions regarding data compliance, export requests, or security audits, contact our Dhaka data protection desk at <span className="text-primary tabular-nums">privacy@printerp.com.bd</span>.` |
| `components/billing/money-receipt-modal.tsx` | 413 | `value={`${typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL \|\| 'https://inkflowerp.com')}/api/pdf/receipt?id=${encodeURIComponent(payment.receipt_number \|\| payment.id)}`}` |
| `components/design/modals/design-whatsapp-modal.tsx` | 54 | `const proofUrl = latestVer?.proof_file_url \|\| 'https://inkflow-erp.vercel.app/proof'` |
| `components/design/modals/design-whatsapp-modal.tsx` | 75 | `const proofUrl = latestVer?.proof_file_url \|\| 'https://inkflow-erp.vercel.app/proof'` |
| `components/marketing/marketing-footer.tsx` | 62 | `<span>{contactEmail \|\| 'support@printerp.com.bd'}</span>` |
| `components/pdf/documents/challan-pdf-document.tsx` | 36 | `const companyContact = `${company?.phone \|\|"+880 1700-000000"} · ${company?.email \|\|"dispatch@inkflow-erp.com"}`;` |
| `components/pdf/documents/challan-pdf-document.tsx` | 41 | `: process.env.NEXT_PUBLIC_APP_URL \|\| 'https://inkflowerp.com'` |
| `components/pdf/documents/invoice-pdf-document.tsx` | 43 | `const companyContact = `${company?.phone \|\|"+880 1700-000000"} · ${company?.email \|\|"billing@inkflow-erp.com"}`;` |
| `components/pdf/documents/invoice-pdf-document.tsx` | 52 | `: process.env.NEXT_PUBLIC_APP_URL \|\| 'https://inkflowerp.com'` |
| `components/pdf/documents/money-receipt-pdf-document.tsx` | 37 | `const companyContact = `${company?.phone \|\|"+880 1700-000000"} · ${company?.email \|\|"accounts@inkflow-erp.com"}`;` |
| `components/pdf/documents/money-receipt-pdf-document.tsx` | 42 | `: process.env.NEXT_PUBLIC_APP_URL \|\| 'https://inkflowerp.com'` |
| `components/pdf/documents/quotation-pdf-document.tsx` | 39 | `const companyContact = `${company?.phone \|\|"+880 1700-000000"} · ${company?.email \|\|"sales@inkflow-erp.com"}`;` |
| `components/pdf/documents/quotation-pdf-document.tsx` | 44 | `: process.env.NEXT_PUBLIC_APP_URL \|\| 'https://inkflowerp.com'` |
| `components/pdf/primitives/qrcode.tsx` | 42 | `const textToEncode = (value && value.trim()) \|\|"https://rangao.inkflow-erp.vercel.app";` |
| `copy-inventory.csv` | 2131 | `"code.page.admin_inkflow_com_bd_017_","app\platform\login\page.tsx","login","admin@inkflow.com.bd, 017...","ইমেইল বা ০১...","label","","","scanned"` |
| `deployment/openwa.md` | 5 | `OpenWA runs as an independent, persistent gateway service on a dedicated Linux VPS/instance (e.g. `wa.printerp.com` or internal VPC network). It provides multi-session WhatsApp connectivity for PrintERP SaaS tenants while remaining completely decoupled from PrintERP's Vercel/Next.js frontend.` |
| `deployment/openwa.md` | 10 | `\|   app.printerp.com / api.printerp.com   \|` |
| `deployment/openwa.md` | 18 | `\|            wa.printerp.com             \|` |
| `deployment/openwa.md` | 165 | `Create `/etc/nginx/sites-available/wa.printerp.com`:` |
| `deployment/openwa.md` | 170 | `server_name wa.printerp.com;` |
| `deployment/openwa.md` | 176 | `server_name wa.printerp.com;` |
| `deployment/openwa.md` | 178 | `ssl_certificate /etc/letsencrypt/live/wa.printerp.com/fullchain.pem;` |
| `deployment/openwa.md` | 179 | `ssl_certificate_key /etc/letsencrypt/live/wa.printerp.com/privkey.pem;` |
| `deployment/openwa.md` | 218 | `OPENWA_BASE_URL="https://wa.printerp.com/api"` |
| `deployment/openwa.md` | 221 | `NEXT_PUBLIC_APP_URL="https://app.printerp.com"` |
| `deployment/openwa.md` | 230 | `curl -I -H "X-API-Key: YOUR_API_KEY" https://wa.printerp.com/api/stats/overview` |
| `docs/V8_MOBILE_COMMUNICATION_OFFLINE_IMPLEMENTATION.md` | 202 | `Document Link / লিংক: https://cdn.inkflow.com.bd/invoices/inv-123.pdf` |
| `docs/deployment/vercel-supabase-environments.md` | 23 | `\| `NEXT_PUBLIC_APP_URL` \| `http://localhost:3000` \| `https://[pr-hash].inkflowerp.com` \| `https://app.inkflowerp.com` \|` |
| `docs/deployment/vercel-supabase-environments.md` | 24 | `\| `NEXT_PUBLIC_ROOT_DOMAIN` \| `localhost:3000` \| `inkflow-preview.com` \| `inkflowerp.com` \|` |
| `docs/ops/rollback-playbook.md` | 26 | `- Synthetic check against `https://app.inkflowerp.com/api/health` confirming `dbStatus === 'ok'` and `queueStatus === 'ok'`.` |
| `lib/auth/google-auth.ts` | 701 | `domainDisplayed = 'auth.inkflowerp.com'` |
| `lib/auth/platform-auth.ts` | 613 | `actor_email: params.actorEmail \|\| 'system@inkflowerp.com',` |
| `lib/communication/variables.ts` | 21 | `{ tag: '{{company_website}}', name: 'Company Website', description: 'Public website or portal URL', category: 'company', example: 'https://demo.printerp.app' },` |
| `lib/communication/variables.ts` | 49 | `{ tag: '{{sender_email}}', name: 'Sender Email', description: 'Email address of logged in staff', category: 'user', example: 'tanvir@printerp.app' },` |
| `lib/db/data-store.ts` | 531 | `contact_email: 'support@printerp.com.bd',` |
| `lib/db/data-store.ts` | 579 | `// 1. Resolve tenant slug directly from subdomain hostname (e.g. rangao.inkflow-erp.vercel.app -> rangao)` |
| `lib/email/adapters/resend.adapter.ts` | 48 | `const senderDomain = senderDomainMatch ? senderDomainMatch[1] : 'printerp.com'` |
| `lib/email/adapters/ses.adapter.ts` | 64 | `const senderDomain = senderDomainMatch ? senderDomainMatch[1] : 'printerp.com'` |
| `lib/email/adapters/smtp.adapter.ts` | 75 | `: 'printerp.com'` |
| `lib/gateway/gateway.registry.ts` | 52 | `const senderEmail = publicConfig.sender_email \|\| publicConfig.gmail_account_email \|\| 'test@printerp.com'` |
| `lib/gateway/gateway.registry.ts` | 241 | `const senderEmail = publicConfig.sender_email \|\| publicConfig.gmail_account_email \|\| 'test@printerp.com'` |
| `lib/payments/adapters/bkash.adapter.ts` | 139 | `params.callbackUrl \|\| `${params.redirectUrl \|\| 'https://printerp.com/api/webhooks/bkash'}?trx=${trxId}`` |
| `lib/payments/adapters/sslcommerz.adapter.ts` | 136 | `: process.env.NEXT_PUBLIC_APP_URL \|\| 'https://printerp.com'` |
| `lib/payments/adapters/sslcommerz.adapter.ts` | 154 | `bodyParams.append('cus_email', params.customerEmail \|\| 'billing@printerp.com')` |
| `lib/payments/adapters/stripe.adapter.ts` | 122 | `body.append('success_url', params.redirectUrl \|\| 'https://printerp.com/platform/billing?session_id={CHECKOUT_SESSION_ID}')` |
| `lib/payments/adapters/stripe.adapter.ts` | 123 | `body.append('cancel_url', params.cancelUrl \|\| 'https://printerp.com/platform/billing')` |
| `lib/payments/adapters/stripe.adapter.ts` | 125 | `body.append('customer_email', params.customerEmail \|\| 'billing@printerp.com')` |
| `lib/payments/adapters/uddoktapay.adapter.ts` | 116 | `email: params.customerEmail \|\| 'billing@printerp.com',` |
| `lib/payments/adapters/uddoktapay.adapter.ts` | 123 | `redirect_url: params.redirectUrl \|\| 'https://printerp.com/platform/billing',` |
| `lib/payments/adapters/uddoktapay.adapter.ts` | 124 | `cancel_url: params.cancelUrl \|\| 'https://printerp.com/platform/billing',` |
| `lib/payments/adapters/uddoktapay.adapter.ts` | 125 | `webhook_url: params.callbackUrl \|\| 'https://printerp.com/api/webhooks/uddoktapay',` |
| `lib/security/encryption.ts` | 320 | `* Masks an email for privacy (e.g. `sup••••@printerp.com`)` |
| `lib/supabase/middleware.ts` | 69 | `// On tenant subdomains (e.g. rangao.inkflow-erp.vercel.app), routes are compiled inside app/[tenantSlug]/...` |
| `lib/supabase/middleware.ts` | 132 | `// 0b. Handle Reserved System Subdomains (e.g. admin.inkflow.com.bd -> redirect to root/platform)` |
| `lib/supabase/middleware.ts` | 312 | `// B. TENANT SUBDOMAIN ROUTING (e.g. vision.inkflow.com.bd or vision.localhost:3000)` |
| `lib/supabase/middleware.ts` | 324 | `// e.g. https://rangao.inkflow-erp.vercel.app/rangao/dashboard -> 307 redirect to https://rangao.inkflow-erp.vercel.app/dashboard` |
| `lib/supabase/middleware.ts` | 342 | `// 3. Tenant Auth Paths on Subdomain (e.g. vision.inkflow.com.bd/login)` |
| `lib/supabase/middleware.ts` | 462 | `// C. ROOT DOMAIN ROUTING (e.g. inkflowerp.com, localhost:3000)` |
| `lib/supabase/middleware.ts` | 541 | `// 4. If user visits explicit path with tenant slug on root domain (e.g. inkflowerp.com/alpha-print/invoices)` |
| `lib/tenant/tenant-resolution.ts` | 85 | `* (e.g. inkflow.com.bd, not inkflow.bd).` |
| `lib/tenant/tenant-resolution.ts` | 265 | `return 'inkflowerp.com'` |
| `lib/tenant/tenant-resolution.ts` | 616 | `// If the host itself is a preview deployment URL (e.g. inkflow-erp.vercel.app or branch-xyz.vercel.app)` |
| `lib/tenant/tenant-resolution.ts` | 656 | `// Subdomain on preview root (e.g. vision.inkflow-erp.vercel.app)` |
| `lib/tenant/tenant-url.ts` | 12 | `* - https://rangao.inkflow-erp.vercel.app` |
| `lib/tenant/tenant-url.ts` | 13 | `* - https://rangao.inkflow.bd` |
| `lib/tenant/tenant-url.ts` | 14 | `* - https://vision-sign.inkflow.com` |
| `lib/tenant/tenant-url.ts` | 15 | `* - https://vision.inkflow.com.bd` |
| `lib/tenant/tenant-url.ts` | 48 | `* getTenantLink('rangao', '/invoices/INV-001', 'inkflow-erp.vercel.app') -> https://rangao.inkflow-erp.vercel.app/invoices/INV-001` |
| `lib/tenant/tenant-url.ts` | 49 | `* getTenantLink('rangao', 'dashboard', 'inkflow.bd') -> https://rangao.inkflow.bd/dashboard` |
| `lib/tenant/tenant-url.ts` | 50 | `* getTenantLink('vision-sign', '/orders', 'inkflow.com') -> https://vision-sign.inkflow.com/orders` |
| `lib/tenant/tenant-url.ts` | 68 | `* formatDocumentUrl('vision', 'invoice', 'INV-2026-0012') -> https://vision.inkflow.com.bd/invoices/INV-2026-0012` |
| `lib/tenant/tenant-url.ts` | 69 | `* formatDocumentUrl('vision', 'quotation', 'QUO-2026-0089') -> https://vision.inkflow.com.bd/quotations/QUO-2026-0089` |
| `lib/tenant/tenant-url.ts` | 70 | `* formatDocumentUrl('vision', 'receipt', 'MR-2026-0044') -> https://vision.inkflow.com.bd/billing/receipts/MR-2026-0044` |
| `lib/tenant/tenant-url.ts` | 112 | `* - Subdomain tenant routing (e.g., vision.inkflow.com.bd/dashboard -> /orders)` |
| `lib/tenant/tenant-url.ts` | 120 | `* 1. Subdomain tenant routing (e.g. rangao.inkflow-erp.vercel.app/production or vision.inkflow.com.bd/dashboard):` |
| `lib/tenant/tenant-url.ts` | 122 | `* 2. Path-based tenant routing (e.g. localhost:3000/rangao/dashboard or inkflow.com.bd/vision/orders):` |
| `lib/tenant/tenant-url.ts` | 146 | `// Check if host is an authoritative tenant subdomain (e.g. rangao.inkflow-erp.vercel.app or vision.inkflow.com.bd or vision.localhost:3000)` |
| `lib/tenant/tenant-url.ts` | 161 | `// On root host (e.g. localhost:3000 or inkflow.com.bd), check if browserPathname is path-based` |
| `next.config.ts` | 3 | `const configuredRoot = process.env.ROOT_DOMAIN \|\| process.env.NEXT_PUBLIC_ROOT_DOMAIN \|\| 'inkflowerp.com'` |
| `next.config.ts` | 11 | `'inkflowerp.com',` |
| `next.config.ts` | 12 | `'*.inkflowerp.com',` |
| `next.config.ts` | 13 | `'inkflow.com.bd',` |
| `next.config.ts` | 14 | `'*.inkflow.com.bd',` |
| `scripts/audit_email_system.ts` | 34 | `const maskedMail = maskEmail('billing.manager@printerp.com')` |
| `scripts/audit_email_system.ts` | 44 | `sender_email: 'audit@printerp.com',` |
| `scripts/audit_email_system.ts` | 88 | `payment_link: 'https://printerp.app/pay/INV-9081',` |
| `scripts/reset_platform.ts` | 172 | `actor_email: admins?.[0]?.email \|\| 'system@printerp.com.bd',` |
| `scripts/reset_platform.ts` | 200 | `support_email: 'support@printerp.com.bd',` |
| `scripts/reset_platform.ts` | 201 | `billing_email: 'billing@printerp.com.bd',` |
| `scripts/test_live_invoice_lifecycle.ts` | 35 | `customer_email: 'forensic.audit@inkflow.com',` |
| `scripts/ui-audit/crawler.ts` | 52 | `email: 'owner@printerp.com',` |
| `services/communication-templates.service.ts` | 32 | `{ tag: '{{company_website}}', name: 'Company Website', description: 'Public website or portal URL', category: 'company', example: 'https://demo.printerp.app' },` |
| `services/communication-templates.service.ts` | 285 | `const compWebsite = company?.website \|\| `https://${tenantSlug}.printerp.app`` |
| `services/communication-templates.service.ts` | 372 | `const compWebsite = company?.website \|\| `https://${tenantSlug}.printerp.app`` |
| `services/email-gateway.service.ts` | 523 | `(!effectiveSenderEmail \|\| effectiveSenderEmail === 'inkflow.erp@gmail.com' \|\| effectiveSenderEmail === 'notifications@printerp.com')` |
| `services/gateway.service.ts` | 628 | `payload.recipient = String(publicConfig.sender_email \|\| publicConfig.gmail_account_email \|\| 'admin@printerp.com').trim()` |
| `services/inventory.service.ts` | 106 | `userEmail: data.actor_email \|\| 'inventory@inkflow.com',` |
| `services/inventory.service.ts` | 128 | `userEmail: actorEmail \|\| 'inventory@inkflow.com',` |
| `services/platform-subscription.service.ts` | 218 | `customerEmail: input.adminEmail \|\| 'admin@inkflow.io',` |
| `services/platform-subscription.service.ts` | 253 | `recipientEmail: input.adminEmail \|\| 'admin@inkflow.io',` |
| `services/platform-subscription.service.ts` | 489 | `recipientEmail: 'admin@inkflow.io',` |
| `services/platform-subscription.service.ts` | 556 | `recipientEmail: 'admin@inkflow.io',` |
| `services/platform-subscription.service.ts` | 606 | `recipientEmail: 'admin@inkflow.io',` |

*(Truncated 300 additional hostname matches; see scripts/inventory.json for full log)*

---

## 3. Bangla Brand Terms Detail

Legacy Bangla transliterations identified:

| Term | Occurrences | Target Replacement |
| :--- | :--- | :--- |
| `প্রিন্ট ইআরপি` | 7 | `প্রিন্টফ্লো` |
| `প্রিন্টইআরপি` | 27 | `প্রিন্টফ্লো` |
| `ইঙ্কফ্লো` / `ইংকফ্লো` | 3 | `প্রিন্টফ্লো` |

### Bangla Matches:
| File | Line | Token | Snippet |
| :--- | :--- | :--- | :--- |
| `components/finance/expenses-tab-view.tsx` | 60 | `Bangla` | `{ id: 'rec_erp', titleEn: 'PrintERP Cloud Platform', titleBn: 'প্রিন্ট ইআরপি সাবস্ক্রিপশন', category: 'miscellaneous', amount: 3000, dueDay: 1, status: 'PAID' },` |
| `components/shell/sidebar.tsx` | 406 | `Bangla` | `{tagline \|\| tBilingual('Print ERP System', 'প্রিন্ট ইআরপি সফটওয়্যার')}` |
| `copy-inventory.csv` | 2 | `Bangla` | `"app.name","i18n/dictionaries/en.json","app","PrintERP","প্রিন্ট ইআরপি","label","","","scanned"` |
| `copy-inventory.csv` | 58 | `Bangla` | `"auth.login_title","i18n/dictionaries/en.json","auth","Sign In to PrintERP","প্রিন্ট ইআরপি-তে প্রবেশ করুন","label","","","scanned"` |
| `copy-inventory.csv` | 4023 | `Bangla` | `"code.sidebar.print_erp_system","components\shell\sidebar.tsx","shell","Print ERP System","প্রিন্ট ইআরপি সফটওয়্যার","label","","","scanned"` |
| `i18n/dictionaries/bn.json` | 3 | `Bangla` | `"name": "প্রিন্ট ইআরপি",` |
| `i18n/dictionaries/bn.json` | 67 | `Bangla` | `"login_title": "প্রিন্ট ইআরপি-তে প্রবেশ করুন",` |
| `app/[tenantSlug]/support/page.tsx` | 99 | `Bangla` | `titleEn="Enterprise Support & Helpdesk"titleBn="এন্টারপ্রাইজ হেল্পডেস্ক ও লাইভ সাপোর্ট"descriptionEn="Direct communication channel with PrintERP engineers, press technicians, and billing specialists."descriptionBn="প্রিন্টইআরপি ইঞ্জিনিয়ার, প্রেস টেকনিশিয়ান ও হিসাব বিশেষজ্ঞদের সাথে সরাসরি সহায়তা ও যোগাযোগ চ্যানেল।"icon={Headset}` |
| `app/faq/page.tsx` | 26 | `Bangla` | `{tBilingual('Frequently Asked Questions', 'প্রিন্টইআরপি সাধারণ প্রশ্নোত্তর')}` |
| `app/terms/page.tsx` | 31 | `Bangla` | `'প্রিন্টইআরপি প্ল্যাটফর্ম ব্যবহার ও সেবার নীতিমালা।'` |
| `components/marketing/core-problems-section.tsx` | 45 | `Bangla` | `'কোটেশন যখন হোয়াটসঅ্যাপে, কাজের মাপ ছেঁড়া চিরকুটে আর বাকি টাকা স্মৃতির ওপর থাকে, তখন কাজের ভুল ও লোকসান ঠেকানো অসম্ভব। প্রিন্টইআরপি এই বিশৃঙ্খলাকে শৃঙ্খলায় রূপান্তর করে।'` |
| `components/marketing/core-problems-section.tsx` | 99 | `Bangla` | `<span>{tBilingual('With PrintERP: Connected & Clear', 'প্রিন্টইআরপিতে: সমন্বিত ও পরিষ্কার')}</span>` |
| `components/marketing/core-workflow-section.tsx` | 43 | `Bangla` | `'প্রিন্টইআরপি প্রেস ও সাইনেজ ব্যবসার বাস্তব কর্মপ্রবাহের সাথে মানানসই: প্রয়োজন অনুযায়ী নমনীয় ধাপ, বহুমুখী কাজের বিভাজন ও স্বচ্ছ হিসাব।'` |
| `components/marketing/faq-section.tsx` | 36 | `Bangla` | `'প্রিন্টইআরপির ফিচার, রোল স্টক, বাংলা ভাষা, টাকা হিসাব এবং সহজে শুরু করার স্পষ্ট উত্তর।'` |
| `components/marketing/feature-deep-dive-section.tsx` | 506 | `Bangla` | `'অনেক সময় লাখ টাকার বিল করেও মাস শেষে ক্যাশ থাকে না। কারণ লুকায়িত খরচগুলো হিসাবে আসে না। প্রিন্টইআরপিতে মেটেরিয়াল, কালি, বিদ্যুৎ, কারিগরের মজুরি ও পরিবহন বাদ দিয়ে প্রতিটি কাজের আসল লাভ নিশ্চিত করা হয়।'` |
| `components/marketing/feature-deep-dive-section.tsx` | 723 | `Bangla` | `'প্রেসের লাভ আটকে থাকে কাস্টমারের বাকি টাকায়। প্রিন্টইআরপি স্বয়ংক্রিয়ভাবে কার কাছে কত টাকা বাকি আছে তা হিসাব রাখে এবং ১ ক্লিকে গ্রাহকের হোয়াটসঅ্যাপে ভদ্র তাগাদার মেসেজ পাঠায়।'` |
| `components/marketing/industry-solutions-section.tsx` | 35 | `Bangla` | `'আরামবাগের ব্যানার শপ, ফকিরাপুলের অফসেট প্রেস কিংবা চট্টগ্রামের সাইনবোর্ড ফ্যাব্রিকেশন—প্রিন্টইআরপি আপনার কারখানার কাজের ধরন অনুযায়ী মানানসই।'` |
| `components/marketing/operational-advantages-section.tsx` | 38 | `Bangla` | `'সাধারণ রিটেইল সফটওয়্যার প্রেসে অচল, কারণ এখানে প্রতিটি কাজ কাস্টম প্রজেক্ট। প্রিন্টইআরপি পরিমাপ, রোল স্টক, মেশিন কিউ ও বাস্তব প্রেস কালচারের ওপর ভিত্তি করে নির্মিত।'` |
| `components/marketing/what-printerp-manages-section.tsx` | 38 | `Bangla` | `{tBilingual('What PrintERP Actually Manages.', 'প্রিন্টইআরপি আপনার ব্যবসায়ের ঠিক কী কী পরিচালনা করে।')}` |
| `components/subscriptions/subscription-status-banner.tsx` | 64 | `Bangla` | `'সতর্কতা: আপনার প্রিন্টইআরপি অ্যাকাউন্ট প্ল্যাটফর্ম অ্যাডমিন দ্বারা স্থগিত (Suspended) করা হয়েছে। নতুন কাজ বুকিং বন্ধ রয়েছে।'` |
| `components/subscriptions/trial-dashboard-card.tsx` | 94 | `Bangla` | `{tBilingual(currentPlan?.name \|\| 'PrintERP Free Trial', currentPlan?.name_bn \|\| 'প্রিন্টইআরপি ফ্রি ট্রায়াল')}` |
| `components/subscriptions/trial-notification-popup.tsx` | 213 | `Bangla` | `'প্রিন্টইআরপি ট্রায়াল উপভোগ করছেন?'` |
| `components/subscriptions/trial-upgrade-modal.tsx` | 192 | `Bangla` | `: tBilingual('Upgrade Your PrintERP Plan', 'আপনার প্রিন্টইআরপি প্ল্যান আপগ্রেড করুন')}` |
| `copy-inventory.csv` | 1862 | `Bangla` | `"prop.desc.direct_communication_chan","app\[tenantSlug]\support\page.tsx","support","Direct communication channel with PrintERP engineers, press technicians, and billing specialists.","প্রিন্টইআরপি ইঞ্জিনিয়ার, প্রেস টেকনিশিয়ান ও হিসাব বিশেষজ্ঞদের সাথে সরাসরি সহায়তা ও যোগাযোগ চ্যানেল।","hint","","","scanned"` |
| `copy-inventory.csv` | 3263 | `Bangla` | `"code.core-problems-section.with_printerp_connected_c","components\marketing\core-problems-section.tsx","marketing","With PrintERP: Connected & Clear","প্রিন্টইআরপিতে: সমন্বিত ও পরিষ্কার","label","","","scanned"` |
| `copy-inventory.csv` | 3323 | `Bangla` | `"code.what-printerp-manages-section.what_printerp_actually_ma","components\marketing\what-printerp-manages-section.tsx","marketing","What PrintERP Actually Manages.","প্রিন্টইআরপি আপনার ব্যবসায়ের ঠিক কী কী পরিচালনা করে।","label","","","scanned"` |
| `copy-inventory.csv` | 4094 | `Bangla` | `"code.trial-upgrade-modal.upgrade_your_printerp_pla","components\subscriptions\trial-upgrade-modal.tsx","subscriptions","Upgrade Your PrintERP Plan","আপনার প্রিন্টইআরপি প্ল্যান আপগ্রেড করুন","label","","","scanned"` |
| `lib/marketing/marketing-data.ts` | 496 | `Bangla` | `qBn: 'প্রিন্টইআরপি (PrintERP) কী?',` |
| `lib/marketing/marketing-data.ts` | 498 | `Bangla` | `aBn: 'প্রিন্টইআরপি হলো বাংলাদেশের ডিজিটাল প্রিন্ট, অফসেট প্রেস, ব্যানার, সাইনবোর্ড ফ্যাব্রিকেশন ও বিজ্ঞাপন এজেন্সির জন্য বিশেষভাবে তৈরি সফটওয়্যার। এটি কোটেশন, অর্ডার, ডিজাইন অনুমোদন, কারখানা প্রোডাকশন, স্টক, চালান ও বকেয়া আদায়ের পুরো ব্যবসাকে এক ছাদের নিচে পরিচালনা করে।',` |
| `lib/marketing/marketing-data.ts` | 502 | `Bangla` | `qBn: 'প্রিন্টইআরপি কাদের জন্য তৈরি?',` |
| `lib/marketing/marketing-data.ts` | 532 | `Bangla` | `qBn: 'প্রিন্টইআরপিতে কি বাংলা ভাষা সাপোর্ট করে?',` |
| `lib/marketing/marketing-data.ts` | 550 | `Bangla` | `qBn: 'প্রিন্টইআরপি কি স্মার্টফোনে ব্যবহার করা যায়?',` |
| `lib/marketing/marketing-data.ts` | 552 | `Bangla` | `aBn: 'প্রিন্টইআরপি সম্পূর্ণ মোবাইল-ফ্রেন্ডলি। ফলে কম্পিউটার ছাড়াও যেকোনো সাধারণ স্মার্টফোনে লাইভ সেলস, বকেয়া খাতা ও প্রোডাকশন মনিটর করা যায়।',` |
| `lib/marketing/marketing-data.ts` | 562 | `Bangla` | `qBn: 'খাতা বা এক্সেল থেকে প্রিন্টইআরপিতে আসা কতটা সহজ?',` |
| `app/platform/login/page.tsx` | 154 | `Bangla` | `{tBilingual('Operate InkFlow.', 'ইঙ্কফ্লো পরিচালনা করুন।')}` |
| `app/platform/login/page.tsx` | 163 | `Bangla` | `'একটি নিরাপদ কন্ট্রোল সেন্টার থেকে ইঙ্কফ্লো প্ল্যাটফর্ম, ক্লায়েন্ট ও সিস্টেম পরিচালনা করুন।'` |
| `copy-inventory.csv` | 2113 | `Bangla` | `"code.page.operate_inkflow_","app\platform\login\page.tsx","login","Operate InkFlow.","ইঙ্কফ্লো পরিচালনা করুন।","label","","","scanned"` |

---

## 4. Top Impacted Files

| File | Total Matches |
| :--- | :--- |
| `lib/db/data-store.ts` | 153 |
| `lib/repositories/workforce.repository.ts` | 153 |
| `tests/unit/tenant-subdomain-resolution.test.ts` | 128 |
| `lib/repositories/inventory.repository.ts` | 125 |
| `supabase/schema_full.sql` | 88 |
| `lib/repositories/product.repository.ts` | 79 |
| `lib/repositories/billing.repository.ts` | 72 |
| `services/platform.service.ts` | 66 |
| `tests/unit/tenant-complete-purge.test.ts` | 55 |
| `tests/unit/resolve-tenant.test.ts` | 54 |
| `lib/repositories/trash.repository.ts` | 51 |
| `app/[tenantSlug]/orders/page.tsx` | 50 |
| `tests/unit/production-commercial-workflow.test.ts` | 46 |
| `tests/integration/tenant-permanent-deletion-full-audit.test.ts` | 44 |
| `app/[tenantSlug]/inventory/page.tsx` | 40 |
| `lib/repositories/design.repository.ts` | 40 |
| `tests/acceptance/business-owner-workflow-rebuild.test.ts` | 40 |
| `components/production/production-job-card.tsx` | 37 |
| `lib/realtime/subscription-manager.ts` | 37 |
| `TENANT_AUTH_AUDIT.md` | 36 |
| `docs/hardening/launch-report.md` | 36 |
| `services/auth.service.ts` | 35 |
| `hooks/use-data-store.ts` | 35 |
| `app/[tenantSlug]/production/page.tsx` | 32 |
| `lib/tenant/tenant-url.ts` | 32 |
| `lib/repositories/invoice-request.repository.ts` | 32 |
| `app/[tenantSlug]/sales/page.tsx` | 31 |
| `app/[tenantSlug]/customers/page.tsx` | 30 |
| `app/[tenantSlug]/customers/[id]/page.tsx` | 30 |
| `app/[tenantSlug]/quotations/[id]/page.tsx` | 29 |

---

## 5. Architectural & System Boundaries

### Database & Migrations
- `public._printerp_migrations`: Live migration state tracking table. **Must NOT be renamed or dropped**.
- `platform_system_settings`: Contains `app_name`, `app_title`, `app_tagline`, `app_domain` (`inkflow-erp.vercel.app`), `support_helpline`, `contact_phone`.
- `email_gateways`: Contains `sender_name` (`InkFlow`), and untouched email fields.

### Runtime Keys & Cookies
- Cookies: `printerp_platform_session`, `printerp_tenant_session`, `printerp_support_tenant`.
- Storage / Event keys: `printerp_locale`, `printerp_table_synced`, `printerp_data_sync`, `printerp_offline_drafts`, `printerp_registration_draft`, etc.
- Must be unified via `k(name) => `${BRAND.keyPrefix}_${name}`` with a 1-release transition reader.

### Email Exclusions (Preserved Unaltered)
- `platform_system_settings.contact_email`
- `email_gateways.sender_email` / `reply_to_email`
- PDF fallback emails: `accounts@inkflow-erp.com`, `sales@inkflow-erp.com`, `billing@inkflow-erp.com`, `dispatch@inkflow-erp.com`
- `.env.example` mail values
- Mail OAuth settings
