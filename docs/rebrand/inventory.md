# PrintFlow Rebrand — Token & Domain Inventory

Generated as part of **Phase 0** to establish a comprehensive audit footprint for migrating from **InkFlow ERP / PrintERP** to **PrintFlow** (`প্রিন্টফ্লো`).

---

## 1. Executive Summary & Match Counts

| Category / Pattern | Total Matches |
| :--- | :--- |
| **inkflow** (case-insensitive) | 723 |
| **ink-flow** (case-insensitive) | 8 |
| **printerp** (case-insensitive) | 2961 |
| **print erp** (case-insensitive) | 11 |
| **Bangla: প্রিন্ট ইআরপি** | 25 |
| **Bangla: প্রিন্টইআরপি** | 66 |
| **Bangla: ইঙ্কফ্লো / ইংকফ্লো** | 22 |
| **Hostnames / Domains** (inkflow/printerp + TLDs) | 779 |
| **Unique Affected Files** | 401 |
| **Total Inventory Footprint** | 4595 |

---

## 2. Hostname & Domain Matches Detail

Hostnames matching `(inkflow|printerp)[a-z0-9.-]*\.(com\.bd|com|bd|io|app|net|vercel\.app)`:

| File | Line | Snippet |
| :--- | :--- | :--- |
| `.env.example` | 108 | `PLATFORM_SMTP_HOST=smtp.printerp.com` |
| `.env.example` | 109 | `SMTP_HOST=smtp.printerp.com # Alias supported` |
| `.env.example` | 111 | `PLATFORM_SMTP_USER=notifications@printerp.com` |
| `ARCHITECTURE.md` | 50 | `\| **PSL / Dev Fallback**\| `inkflow-erp.vercel.app/t/[slug]/*` or `/[slug]/*` \| Path-based fallback when wildcard DNS is unavailable \| Host-only on fallback host \|` |
| `ARCHITECTURE.md` | 56 | `- Wildcards on `*.inkflow-erp.vercel.app` are mathematically and architecturally impossible because `vercel.app` is an entry on the Public Suffix List (PSL).` |
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
| `app/api/pdf/[type]/route.ts` | 110 | `email: tenantCompany?.email \|\| "billing@inkflow-erp.com",` |
| `app/contact/page.tsx` | 125 | `{contactEmail \|\| 'support@printerp.com.bd'}` |
| `app/platform/admins/admins-client.tsx` | 883 | `placeholder="tariqul@inkflow.com.bd"` |
| `app/platform/forgot-password/page.tsx` | 108 | `placeholder="admin@printerp.com.bd"` |
| `app/platform/integrations/integrations-client.tsx` | 194 | `{ key: 'smtp_username', label: 'SMTP Username / Login', placeholder: 'notifications@printerp.com', type: 'text', required: true },` |
| `app/platform/integrations/integrations-client.tsx` | 196 | `{ key: 'sender_email', label: 'From Email Address', placeholder: 'notifications@printerp.com', type: 'text', required: true },` |
| `app/platform/integrations/integrations-client.tsx` | 197 | `{ key: 'reply_to_email', label: 'Reply-To Email', placeholder: 'support@printerp.com', type: 'text', required: false },` |
| `app/platform/integrations/integrations-client.tsx` | 981 | `recipient = String(formData.public_config?.sender_email \|\| formData.public_config?.gmail_account_email \|\| 'admin@printerp.com').trim()` |
| `app/platform/integrations/integrations-client.tsx` | 1107 | `if (gw.category === 'email') defaultRecipient = 'admin@printerp.com'` |
| `app/platform/integrations/integrations-client.tsx` | 2706 | `? 'admin@printerp.com'` |
| `app/platform/login/page.tsx` | 341 | `placeholder={tBilingual('admin@inkflow.com.bd, 017...', 'ইমেইল বা ০১...')}` |
| `app/platform/settings/settings-client.tsx` | 756 | `placeholder="support@printerp.com.bd"` |
| `app/privacy/page.tsx` | 75 | `If you have any questions regarding data compliance, export requests, or security audits, contact our Dhaka data protection desk at <span className="text-primary tabular-nums">privacy@printerp.com.bd</span>.` |
| `components/marketing/marketing-footer.tsx` | 79 | `<span>{contactEmail \|\| 'support@printerp.com.bd'}</span>` |
| `components/pdf/documents/challan-pdf-document.tsx` | 37 | `const companyContact = `${company?.phone \|\|"+880 1700-000000"} · ${company?.email \|\|"dispatch@inkflow-erp.com"}`;` |
| `components/pdf/documents/invoice-pdf-document.tsx` | 44 | `const companyContact = `${company?.phone \|\|"+880 1700-000000"} · ${company?.email \|\|"billing@inkflow-erp.com"}`;` |
| `components/pdf/documents/money-receipt-pdf-document.tsx` | 38 | `const companyContact = `${company?.phone \|\|"+880 1700-000000"} · ${company?.email \|\|"accounts@inkflow-erp.com"}`;` |
| `components/pdf/documents/quotation-pdf-document.tsx` | 40 | `const companyContact = `${company?.phone \|\|"+880 1700-000000"} · ${company?.email \|\|"sales@inkflow-erp.com"}`;` |
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
| `docs/rebrand/inventory.md` | 30 | `\| `.env.example` \| 18 \| `NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000 # e.g. printerp.com.bd or inkflowerp.com in production` \|` |
| `docs/rebrand/inventory.md` | 31 | `\| `.env.example` \| 107 \| `PLATFORM_SMTP_HOST=smtp.printerp.com` \|` |
| `docs/rebrand/inventory.md` | 32 | `\| `.env.example` \| 108 \| `SMTP_HOST=smtp.printerp.com # Alias supported` \|` |
| `docs/rebrand/inventory.md` | 33 | `\| `.env.example` \| 110 \| `PLATFORM_SMTP_USER=notifications@printerp.com` \|` |
| `docs/rebrand/inventory.md` | 34 | `\| `ARCHITECTURE.md` \| 29 \| `\\|  inkflowerp.com  \\|            \\| admin.inkflowerp  \\|           \\| [slug].inkflowerp \\|` \|` |
| `docs/rebrand/inventory.md` | 35 | `\| `ARCHITECTURE.md` \| 46 \| `\\| **Marketing / Root** \\| `ROOT_DOMAIN` (`inkflowerp.com`, `localhost:3000`) \\| Landing page, workspace discovery, tenant registration, legal pages \\| Host-only (`inkflowerp.com`) \\|` \|` |
| `docs/rebrand/inventory.md` | 36 | `\| `ARCHITECTURE.md` \| 47 \| `\\| **Platform Owner** \\| `admin.ROOT_DOMAIN` (`admin.inkflowerp.com`, `admin.localhost`) \\| Platform administration, subscriptions, tenant audit, metrics \\| Host-only (`admin.inkflowerp.com`) \\|` \|` |
| `docs/rebrand/inventory.md` | 37 | `\| `ARCHITECTURE.md` \| 48 \| `\\| **Tenant Portal** \\| `[tenantSlug].ROOT_DOMAIN` (`vision.inkflowerp.com`) \\| Tenant business operations, billing, inventory, POS, employee login \\| Host-only (`vision.inkflowerp.com`) \\|` \|` |
| `docs/rebrand/inventory.md` | 38 | `\| `ARCHITECTURE.md` \| 50 \| `\\| **PSL / Dev Fallback**\\| `inkflow-erp.vercel.app/t/[slug]/*` or `/[slug]/*` \\| Path-based fallback when wildcard DNS is unavailable \\| Host-only on fallback host \\|` \|` |
| `docs/rebrand/inventory.md` | 39 | `\| `ARCHITECTURE.md` \| 56 \| `- Wildcards on `*.inkflow-erp.vercel.app` are mathematically and architecturally impossible because `vercel.app` is an entry on the Public Suffix List (PSL).` \|` |
| `docs/rebrand/inventory.md` | 40 | `\| `ARCHITECTURE.md` \| 247 \| `\\|    - Verified Host / Subdomain / Custom Domain Resolution (e.g. acme.inkflowerp.com)             \\|` \|` |
| `docs/rebrand/inventory.md` | 41 | `\| `ARCHITECTURE.md` \| 254 \| `\\|    - Reconstructs internal routing / rewrites (e.g. acme.inkflowerp.com/sales -> /acme/sales)    \\|` \|` |
| `docs/rebrand/inventory.md` | 42 | `\| `TENANT_AUTH_AUDIT.md` \| 19 \| `6. **Vercel Wildcard Domain Misconception:** `*.inkflow-erp.vercel.app` is fundamentally unroutable via wildcards because `vercel.app` is on the Public Suffix List (PSL).` \|` |
| `docs/rebrand/inventory.md` | 43 | `\| `TENANT_AUTH_AUDIT.md` \| 117 \| `- Generates synthetic email: `username@companySlug.inkflow.app`.` \|` |
| `docs/rebrand/inventory.md` | 44 | `\| `TENANT_AUTH_AUDIT.md` \| 130 \| `### Reproduction 1: Wildcard 404 & SSL Failure on `*.inkflow-erp.vercel.app`` \|` |
| `docs/rebrand/inventory.md` | 45 | `\| `TENANT_AUTH_AUDIT.md` \| 131 \| `- **Steps:** Navigate to `https://acme.inkflow-erp.vercel.app`.` \|` |
| `docs/rebrand/inventory.md` | 46 | `\| `TENANT_AUTH_AUDIT.md` \| 133 \| `- **Root Cause:** `vercel.app` is an entry on the Public Suffix List (PSL). Vercel does not and cannot issue wildcard SSL certificates (`*.inkflow-erp.vercel.app`) for projects on the `vercel.app` domain.` \|` |
| `docs/rebrand/inventory.md` | 47 | `\| `TENANT_AUTH_AUDIT.md` \| 134 \| `- **Resolution:** Production must use a custom root domain (e.g. `inkflowerp.com`) with nameservers pointing to Vercel (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`). Interim preview/development environments must use path-based routing (`/t/[tenantSlug]/...` or `/[tenantSlug]/...`) behind an explicit environment flag.` \|` |
| `docs/rebrand/inventory.md` | 48 | `\| `TENANT_AUTH_AUDIT.md` \| 165 \| `1. Log into `alpha.inkflowerp.com`.` \|` |
| `docs/rebrand/inventory.md` | 49 | `\| `TENANT_AUTH_AUDIT.md` \| 167 \| `- **Observed Behavior:** Domain attribute is `.inkflowerp.com`. Cookie is sent to `beta.inkflowerp.com` and `admin.inkflowerp.com`.` \|` |
| `docs/rebrand/inventory.md` | 50 | `\| `TENANT_AUTH_AUDIT.md` \| 188 \| `\\| **SEC-HIGH-01** \\| **Vercel Wildcard SSL Impossibility on `*.vercel.app`** \\| Project Domain Architecture \\| Subdomains on `*.inkflow-erp.vercel.app` fail SSL/DNS; requires custom root domain and path-based fallback. \\|` \|` |
| `docs/rebrand/inventory.md` | 51 | `\| `actions/email-gateway.actions.ts` \| 293 \| `sender_email: formData.sender_email \\|\\| 'test@printerp.com',` \|` |
| `docs/rebrand/inventory.md` | 52 | `\| `actions/whatsapp-connection.actions.ts` \| 168 \| `const appUrl = process.env.NEXT_PUBLIC_APP_URL \\|\\| 'https://app.printerp.com'` \|` |
| `docs/rebrand/inventory.md` | 53 | `\| `app/(auth)/login/page.tsx` \| 231 \| `// On root domain (e.g. inkflow.com.bd, inkflow-erp.vercel.app, localhost:3000)` \|` |
| `docs/rebrand/inventory.md` | 54 | `\| `app/api/pdf/[type]/route.ts` \| 109 \| `email: tenantCompany?.email \\|\\| "billing@inkflow-erp.com",` \|` |
| `docs/rebrand/inventory.md` | 55 | `\| `app/api/pdf/[type]/route.ts` \| 110 \| `website: tenantCompany?.website \\|\\| "www.inkflow-erp.com",` \|` |
| `docs/rebrand/inventory.md` | 56 | `\| `app/contact/page.tsx` \| 125 \| `{contactEmail \\|\\| 'support@printerp.com.bd'}` \|` |
| `docs/rebrand/inventory.md` | 57 | `\| `app/platform/admins/admins-client.tsx` \| 883 \| `placeholder="tariqul@inkflow.com.bd"` \|` |
| `docs/rebrand/inventory.md` | 58 | `\| `app/platform/email/email-client.tsx` \| 675 \| `placeholder="smtp.printerp.com"` \|` |
| `docs/rebrand/inventory.md` | 59 | `\| `app/platform/email/email-client.tsx` \| 1020 \| `value={customDomainInput \\|\\| (gateway?.sender_email \\|\\| senderEmail \\|\\| 'printerp.com').split('@')[1] \\|\\| 'printerp.com'}` \|` |
| `docs/rebrand/inventory.md` | 60 | `\| `app/platform/email/email-client.tsx` \| 1176 \| `const domain = customDomainInput \\|\\| (gateway?.sender_email \\|\\| senderEmail \\|\\| 'printerp.com').split('@')[1] \\|\\| 'printerp.com'` \|` |
| `docs/rebrand/inventory.md` | 61 | `\| `app/platform/email/email-client.tsx` \| 1208 \| `{`v=DMARC1; p=quarantine; sp=quarantine; rua=mailto:postmaster@${customDomainInput \\|\\| (gateway?.sender_email \\|\\| senderEmail \\|\\| 'printerp.com').split('@')[1] \\|\\| 'printerp.com'}; aspf=r; adkim=r;`}` \|` |
| `docs/rebrand/inventory.md` | 62 | `\| `app/platform/email/email-client.tsx` \| 1290 \| `placeholder="admin@printerp.com"` \|` |
| `docs/rebrand/inventory.md` | 63 | `\| `app/platform/forgot-password/page.tsx` \| 108 \| `placeholder="admin@printerp.com.bd"` \|` |
| `docs/rebrand/inventory.md` | 64 | `\| `app/platform/integrations/integrations-client.tsx` \| 194 \| `{ key: 'smtp_username', label: 'SMTP Username / Login', placeholder: 'notifications@printerp.com', type: 'text', required: true },` \|` |
| `docs/rebrand/inventory.md` | 65 | `\| `app/platform/integrations/integrations-client.tsx` \| 196 \| `{ key: 'sender_email', label: 'From Email Address', placeholder: 'notifications@printerp.com', type: 'text', required: true },` \|` |
| `docs/rebrand/inventory.md` | 66 | `\| `app/platform/integrations/integrations-client.tsx` \| 197 \| `{ key: 'reply_to_email', label: 'Reply-To Email', placeholder: 'support@printerp.com', type: 'text', required: false },` \|` |
| `docs/rebrand/inventory.md` | 67 | `\| `app/platform/integrations/integrations-client.tsx` \| 981 \| `recipient = String(formData.public_config?.sender_email \\|\\| formData.public_config?.gmail_account_email \\|\\| 'admin@printerp.com').trim()` \|` |
| `docs/rebrand/inventory.md` | 68 | `\| `app/platform/integrations/integrations-client.tsx` \| 1107 \| `if (gw.category === 'email') defaultRecipient = 'admin@printerp.com'` \|` |
| `docs/rebrand/inventory.md` | 69 | `\| `app/platform/integrations/integrations-client.tsx` \| 2706 \| `? 'admin@printerp.com'` \|` |
| `docs/rebrand/inventory.md` | 70 | `\| `app/platform/login/page.tsx` \| 341 \| `placeholder={tBilingual('admin@inkflow.com.bd, 017...', 'ইমেইল বা ০১...')}` \|` |
| `docs/rebrand/inventory.md` | 71 | `\| `app/platform/notifications/notifications-client.tsx` \| 882 \| `placeholder="e.g., /platform/health or https://status.inkflow.io"` \|` |
| `docs/rebrand/inventory.md` | 72 | `\| `app/platform/settings/settings-client.tsx` \| 677 \| `placeholder="e.g. inkflow.com.bd or localhost:3000"` \|` |
| `docs/rebrand/inventory.md` | 73 | `\| `app/platform/settings/settings-client.tsx` \| 756 \| `placeholder="support@printerp.com.bd"` \|` |
| `docs/rebrand/inventory.md` | 74 | `\| `app/platform/subscriptions/subscriptions-client.tsx` \| 807 \| `{s.company_slug}.printerp.com.bd` \|` |
| `docs/rebrand/inventory.md` | 75 | `\| `app/platform/tenants/[companyId]/tenant-detail-client.tsx` \| 245 \| `<span className="tabular-nums text-primary">{company.slug}.printerp.com.bd</span>` \|` |
| `docs/rebrand/inventory.md` | 76 | `\| `app/platform/usage/usage-client.tsx` \| 561 \| `{r.company_slug}.printerp.com.bd` \|` |
| `docs/rebrand/inventory.md` | 77 | `\| `app/privacy/page.tsx` \| 75 \| `If you have any questions regarding data compliance, export requests, or security audits, contact our Dhaka data protection desk at <span className="text-primary tabular-nums">privacy@printerp.com.bd</span>.` \|` |
| `docs/rebrand/inventory.md` | 78 | `\| `components/billing/money-receipt-modal.tsx` \| 413 \| `value={`${typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL \\|\\| 'https://inkflowerp.com')}/api/pdf/receipt?id=${encodeURIComponent(payment.receipt_number \\|\\| payment.id)}`}` \|` |
| `docs/rebrand/inventory.md` | 79 | `\| `components/design/modals/design-whatsapp-modal.tsx` \| 54 \| `const proofUrl = latestVer?.proof_file_url \\|\\| 'https://inkflow-erp.vercel.app/proof'` \|` |
| `docs/rebrand/inventory.md` | 80 | `\| `components/design/modals/design-whatsapp-modal.tsx` \| 75 \| `const proofUrl = latestVer?.proof_file_url \\|\\| 'https://inkflow-erp.vercel.app/proof'` \|` |
| `docs/rebrand/inventory.md` | 81 | `\| `components/marketing/marketing-footer.tsx` \| 62 \| `<span>{contactEmail \\|\\| 'support@printerp.com.bd'}</span>` \|` |
| `docs/rebrand/inventory.md` | 82 | `\| `components/pdf/documents/challan-pdf-document.tsx` \| 36 \| `const companyContact = `${company?.phone \\|\\|"+880 1700-000000"} · ${company?.email \\|\\|"dispatch@inkflow-erp.com"}`;` \|` |
| `docs/rebrand/inventory.md` | 83 | `\| `components/pdf/documents/challan-pdf-document.tsx` \| 41 \| `: process.env.NEXT_PUBLIC_APP_URL \\|\\| 'https://inkflowerp.com'` \|` |
| `docs/rebrand/inventory.md` | 84 | `\| `components/pdf/documents/invoice-pdf-document.tsx` \| 43 \| `const companyContact = `${company?.phone \\|\\|"+880 1700-000000"} · ${company?.email \\|\\|"billing@inkflow-erp.com"}`;` \|` |
| `docs/rebrand/inventory.md` | 85 | `\| `components/pdf/documents/invoice-pdf-document.tsx` \| 52 \| `: process.env.NEXT_PUBLIC_APP_URL \\|\\| 'https://inkflowerp.com'` \|` |
| `docs/rebrand/inventory.md` | 86 | `\| `components/pdf/documents/money-receipt-pdf-document.tsx` \| 37 \| `const companyContact = `${company?.phone \\|\\|"+880 1700-000000"} · ${company?.email \\|\\|"accounts@inkflow-erp.com"}`;` \|` |
| `docs/rebrand/inventory.md` | 87 | `\| `components/pdf/documents/money-receipt-pdf-document.tsx` \| 42 \| `: process.env.NEXT_PUBLIC_APP_URL \\|\\| 'https://inkflowerp.com'` \|` |
| `docs/rebrand/inventory.md` | 88 | `\| `components/pdf/documents/quotation-pdf-document.tsx` \| 39 \| `const companyContact = `${company?.phone \\|\\|"+880 1700-000000"} · ${company?.email \\|\\|"sales@inkflow-erp.com"}`;` \|` |
| `docs/rebrand/inventory.md` | 89 | `\| `components/pdf/documents/quotation-pdf-document.tsx` \| 44 \| `: process.env.NEXT_PUBLIC_APP_URL \\|\\| 'https://inkflowerp.com'` \|` |
| `docs/rebrand/inventory.md` | 90 | `\| `components/pdf/primitives/qrcode.tsx` \| 42 \| `const textToEncode = (value && value.trim()) \\|\\|"https://rangao.inkflow-erp.vercel.app";` \|` |
| `docs/rebrand/inventory.md` | 91 | `\| `copy-inventory.csv` \| 2131 \| `"code.page.admin_inkflow_com_bd_017_","app\platform\login\page.tsx","login","admin@inkflow.com.bd, 017...","ইমেইল বা ০১...","label","","","scanned"` \|` |
| `docs/rebrand/inventory.md` | 92 | `\| `deployment/openwa.md` \| 5 \| `OpenWA runs as an independent, persistent gateway service on a dedicated Linux VPS/instance (e.g. `wa.printerp.com` or internal VPC network). It provides multi-session WhatsApp connectivity for PrintERP SaaS tenants while remaining completely decoupled from PrintERP's Vercel/Next.js frontend.` \|` |
| `docs/rebrand/inventory.md` | 93 | `\| `deployment/openwa.md` \| 10 \| `\\|   app.printerp.com / api.printerp.com   \\|` \|` |
| `docs/rebrand/inventory.md` | 94 | `\| `deployment/openwa.md` \| 18 \| `\\|            wa.printerp.com             \\|` \|` |
| `docs/rebrand/inventory.md` | 95 | `\| `deployment/openwa.md` \| 165 \| `Create `/etc/nginx/sites-available/wa.printerp.com`:` \|` |
| `docs/rebrand/inventory.md` | 96 | `\| `deployment/openwa.md` \| 170 \| `server_name wa.printerp.com;` \|` |
| `docs/rebrand/inventory.md` | 97 | `\| `deployment/openwa.md` \| 176 \| `server_name wa.printerp.com;` \|` |
| `docs/rebrand/inventory.md` | 98 | `\| `deployment/openwa.md` \| 178 \| `ssl_certificate /etc/letsencrypt/live/wa.printerp.com/fullchain.pem;` \|` |
| `docs/rebrand/inventory.md` | 99 | `\| `deployment/openwa.md` \| 179 \| `ssl_certificate_key /etc/letsencrypt/live/wa.printerp.com/privkey.pem;` \|` |
| `docs/rebrand/inventory.md` | 100 | `\| `deployment/openwa.md` \| 218 \| `OPENWA_BASE_URL="https://wa.printerp.com/api"` \|` |
| `docs/rebrand/inventory.md` | 101 | `\| `deployment/openwa.md` \| 221 \| `NEXT_PUBLIC_APP_URL="https://app.printerp.com"` \|` |
| `docs/rebrand/inventory.md` | 102 | `\| `deployment/openwa.md` \| 230 \| `curl -I -H "X-API-Key: YOUR_API_KEY" https://wa.printerp.com/api/stats/overview` \|` |
| `docs/rebrand/inventory.md` | 103 | `\| `docs/V8_MOBILE_COMMUNICATION_OFFLINE_IMPLEMENTATION.md` \| 202 \| `Document Link / লিংক: https://cdn.inkflow.com.bd/invoices/inv-123.pdf` \|` |
| `docs/rebrand/inventory.md` | 104 | `\| `docs/deployment/vercel-supabase-environments.md` \| 23 \| `\\| `NEXT_PUBLIC_APP_URL` \\| `http://localhost:3000` \\| `https://[pr-hash].inkflowerp.com` \\| `https://app.inkflowerp.com` \\|` \|` |
| `docs/rebrand/inventory.md` | 105 | `\| `docs/deployment/vercel-supabase-environments.md` \| 24 \| `\\| `NEXT_PUBLIC_ROOT_DOMAIN` \\| `localhost:3000` \\| `inkflow-preview.com` \\| `inkflowerp.com` \\|` \|` |
| `docs/rebrand/inventory.md` | 106 | `\| `docs/ops/rollback-playbook.md` \| 26 \| `- Synthetic check against `https://app.inkflowerp.com/api/health` confirming `dbStatus === 'ok'` and `queueStatus === 'ok'`.` \|` |
| `docs/rebrand/inventory.md` | 107 | `\| `lib/auth/google-auth.ts` \| 701 \| `domainDisplayed = 'auth.inkflowerp.com'` \|` |
| `docs/rebrand/inventory.md` | 108 | `\| `lib/auth/platform-auth.ts` \| 613 \| `actor_email: params.actorEmail \\|\\| 'system@inkflowerp.com',` \|` |
| `docs/rebrand/inventory.md` | 109 | `\| `lib/communication/variables.ts` \| 21 \| `{ tag: '{{company_website}}', name: 'Company Website', description: 'Public website or portal URL', category: 'company', example: 'https://demo.printerp.app' },` \|` |
| `docs/rebrand/inventory.md` | 110 | `\| `lib/communication/variables.ts` \| 49 \| `{ tag: '{{sender_email}}', name: 'Sender Email', description: 'Email address of logged in staff', category: 'user', example: 'tanvir@printerp.app' },` \|` |
| `docs/rebrand/inventory.md` | 111 | `\| `lib/db/data-store.ts` \| 531 \| `contact_email: 'support@printerp.com.bd',` \|` |
| `docs/rebrand/inventory.md` | 112 | `\| `lib/db/data-store.ts` \| 579 \| `// 1. Resolve tenant slug directly from subdomain hostname (e.g. rangao.inkflow-erp.vercel.app -> rangao)` \|` |
| `docs/rebrand/inventory.md` | 113 | `\| `lib/email/adapters/resend.adapter.ts` \| 48 \| `const senderDomain = senderDomainMatch ? senderDomainMatch[1] : 'printerp.com'` \|` |
| `docs/rebrand/inventory.md` | 114 | `\| `lib/email/adapters/ses.adapter.ts` \| 64 \| `const senderDomain = senderDomainMatch ? senderDomainMatch[1] : 'printerp.com'` \|` |
| `docs/rebrand/inventory.md` | 115 | `\| `lib/email/adapters/smtp.adapter.ts` \| 75 \| `: 'printerp.com'` \|` |
| `docs/rebrand/inventory.md` | 116 | `\| `lib/gateway/gateway.registry.ts` \| 52 \| `const senderEmail = publicConfig.sender_email \\|\\| publicConfig.gmail_account_email \\|\\| 'test@printerp.com'` \|` |
| `docs/rebrand/inventory.md` | 117 | `\| `lib/gateway/gateway.registry.ts` \| 241 \| `const senderEmail = publicConfig.sender_email \\|\\| publicConfig.gmail_account_email \\|\\| 'test@printerp.com'` \|` |
| `docs/rebrand/inventory.md` | 118 | `\| `lib/payments/adapters/bkash.adapter.ts` \| 139 \| `params.callbackUrl \\|\\| `${params.redirectUrl \\|\\| 'https://printerp.com/api/webhooks/bkash'}?trx=${trxId}`` \|` |
| `docs/rebrand/inventory.md` | 119 | `\| `lib/payments/adapters/sslcommerz.adapter.ts` \| 136 \| `: process.env.NEXT_PUBLIC_APP_URL \\|\\| 'https://printerp.com'` \|` |
| `docs/rebrand/inventory.md` | 120 | `\| `lib/payments/adapters/sslcommerz.adapter.ts` \| 154 \| `bodyParams.append('cus_email', params.customerEmail \\|\\| 'billing@printerp.com')` \|` |
| `docs/rebrand/inventory.md` | 121 | `\| `lib/payments/adapters/stripe.adapter.ts` \| 122 \| `body.append('success_url', params.redirectUrl \\|\\| 'https://printerp.com/platform/billing?session_id={CHECKOUT_SESSION_ID}')` \|` |
| `docs/rebrand/inventory.md` | 122 | `\| `lib/payments/adapters/stripe.adapter.ts` \| 123 \| `body.append('cancel_url', params.cancelUrl \\|\\| 'https://printerp.com/platform/billing')` \|` |
| `docs/rebrand/inventory.md` | 123 | `\| `lib/payments/adapters/stripe.adapter.ts` \| 125 \| `body.append('customer_email', params.customerEmail \\|\\| 'billing@printerp.com')` \|` |
| `docs/rebrand/inventory.md` | 124 | `\| `lib/payments/adapters/uddoktapay.adapter.ts` \| 116 \| `email: params.customerEmail \\|\\| 'billing@printerp.com',` \|` |
| `docs/rebrand/inventory.md` | 125 | `\| `lib/payments/adapters/uddoktapay.adapter.ts` \| 123 \| `redirect_url: params.redirectUrl \\|\\| 'https://printerp.com/platform/billing',` \|` |
| `docs/rebrand/inventory.md` | 126 | `\| `lib/payments/adapters/uddoktapay.adapter.ts` \| 124 \| `cancel_url: params.cancelUrl \\|\\| 'https://printerp.com/platform/billing',` \|` |
| `docs/rebrand/inventory.md` | 127 | `\| `lib/payments/adapters/uddoktapay.adapter.ts` \| 125 \| `webhook_url: params.callbackUrl \\|\\| 'https://printerp.com/api/webhooks/uddoktapay',` \|` |
| `docs/rebrand/inventory.md` | 128 | `\| `lib/security/encryption.ts` \| 320 \| `* Masks an email for privacy (e.g. `sup••••@printerp.com`)` \|` |
| `docs/rebrand/inventory.md` | 129 | `\| `lib/supabase/middleware.ts` \| 69 \| `// On tenant subdomains (e.g. rangao.inkflow-erp.vercel.app), routes are compiled inside app/[tenantSlug]/...` \|` |
| `docs/rebrand/inventory.md` | 130 | `\| `lib/supabase/middleware.ts` \| 132 \| `// 0b. Handle Reserved System Subdomains (e.g. admin.inkflow.com.bd -> redirect to root/platform)` \|` |

*(Truncated 629 additional hostname matches; see scripts/inventory.json for full log)*

---

## 3. Bangla Brand Terms Detail

Legacy Bangla transliterations identified:

| Term | Occurrences | Target Replacement |
| :--- | :--- | :--- |
| `প্রিন্ট ইআরপি` | 25 | `প্রিন্টফ্লো` |
| `প্রিন্টইআরপি` | 66 | `প্রিন্টফ্লো` |
| `ইঙ্কফ্লো` / `ইংকফ্লো` | 22 | `প্রিন্টফ্লো` |

### Bangla Matches:
| File | Line | Token | Snippet |
| :--- | :--- | :--- | :--- |
| `copy-inventory.csv` | 2 | `Bangla` | `"app.name","i18n/dictionaries/en.json","app","PrintERP","প্রিন্ট ইআরপি","label","","","scanned"` |
| `copy-inventory.csv` | 58 | `Bangla` | `"auth.login_title","i18n/dictionaries/en.json","auth","Sign In to PrintERP","প্রিন্ট ইআরপি-তে প্রবেশ করুন","label","","","scanned"` |
| `copy-inventory.csv` | 4023 | `Bangla` | `"code.sidebar.print_erp_system","components\shell\sidebar.tsx","shell","Print ERP System","প্রিন্ট ইআরপি সফটওয়্যার","label","","","scanned"` |
| `docs/rebrand/inventory.md` | 15 | `Bangla` | `\| **Bangla: প্রিন্ট ইআরপি** \| 7 \|` |
| `docs/rebrand/inventory.md` | 191 | `Bangla` | `\| `প্রিন্ট ইআরপি` \| 7 \| `প্রিন্টফ্লো` \|` |
| `docs/rebrand/inventory.md` | 198 | `Bangla` | `\| `components/finance/expenses-tab-view.tsx` \| 60 \| `Bangla` \| `{ id: 'rec_erp', titleEn: 'PrintERP Cloud Platform', titleBn: 'প্রিন্ট ইআরপি সাবস্ক্রিপশন', category: 'miscellaneous', amount: 3000, dueDay: 1, status: 'PAID' },` \|` |
| `docs/rebrand/inventory.md` | 199 | `Bangla` | `\| `components/shell/sidebar.tsx` \| 406 \| `Bangla` \| `{tagline \\|\\| tBilingual('Print ERP System', 'প্রিন্ট ইআরপি সফটওয়্যার')}` \|` |
| `docs/rebrand/inventory.md` | 200 | `Bangla` | `\| `copy-inventory.csv` \| 2 \| `Bangla` \| `"app.name","i18n/dictionaries/en.json","app","PrintERP","প্রিন্ট ইআরপি","label","","","scanned"` \|` |
| `docs/rebrand/inventory.md` | 201 | `Bangla` | `\| `copy-inventory.csv` \| 58 \| `Bangla` \| `"auth.login_title","i18n/dictionaries/en.json","auth","Sign In to PrintERP","প্রিন্ট ইআরপি-তে প্রবেশ করুন","label","","","scanned"` \|` |
| `docs/rebrand/inventory.md` | 202 | `Bangla` | `\| `copy-inventory.csv` \| 4023 \| `Bangla` \| `"code.sidebar.print_erp_system","components\shell\sidebar.tsx","shell","Print ERP System","প্রিন্ট ইআরপি সফটওয়্যার","label","","","scanned"` \|` |
| `docs/rebrand/inventory.md` | 203 | `Bangla` | `\| `i18n/dictionaries/bn.json` \| 3 \| `Bangla` \| `"name": "প্রিন্ট ইআরপি",` \|` |
| `docs/rebrand/inventory.md` | 204 | `Bangla` | `\| `i18n/dictionaries/bn.json` \| 67 \| `Bangla` \| `"login_title": "প্রিন্ট ইআরপি-তে প্রবেশ করুন",` \|` |
| `scripts/brand-check.mjs` | 21 | `Bangla` | `{ name: 'Bangla প্রিন্ট ইআরপি', regex: /প্রিন্ট\s+ইআরপি/ },` |
| `scripts/build-inventory.mjs` | 33 | `Bangla` | `const bnPrintErpSpaced = runGitGrep('প্রিন্ট ইআরপি');` |
| `scripts/build-inventory.mjs` | 61 | `Bangla` | `addItems('Bangla: প্রিন্ট ইআরপি', 'প্রিন্ট ইআরপি', bnPrintErpSpaced);` |
| `scripts/build-inventory.mjs` | 91 | `Bangla` | `\| **Bangla: প্রিন্ট ইআরপি** \| ${bnPrintErpSpaced.length} \|` |
| `scripts/build-inventory.mjs` | 124 | `Bangla` | `\| \`প্রিন্ট ইআরপি\` \| ${bnPrintErpSpaced.length} \| \`প্রিন্টফ্লো\` \|` |
| `scripts/inventory.json` | 7 | `Bangla` | `"Bangla: প্রিন্ট ইআরপি": 7,` |
| `scripts/inventory.json` | 3052 | `Bangla` | `"content": "{ id: 'rec_erp', titleEn: 'PrintERP Cloud Platform', titleBn: 'প্রিন্ট ইআরপি সাবস্ক্রিপশন', category: 'miscellaneous', amount: 3000, dueDay: 1, status: 'PAID' },"` |
| `scripts/inventory.json` | 3057 | `Bangla` | `"content": "{tagline \|\| tBilingual('Print ERP System', 'প্রিন্ট ইআরপি সফটওয়্যার')}"` |
| `scripts/inventory.json` | 3062 | `Bangla` | `"content": "\"app.name\",\"i18n/dictionaries/en.json\",\"app\",\"PrintERP\",\"প্রিন্ট ইআরপি\",\"label\",\"\",\"\",\"scanned\""` |
| `scripts/inventory.json` | 3067 | `Bangla` | `"content": "\"auth.login_title\",\"i18n/dictionaries/en.json\",\"auth\",\"Sign In to PrintERP\",\"প্রিন্ট ইআরপি-তে প্রবেশ করুন\",\"label\",\"\",\"\",\"scanned\""` |
| `scripts/inventory.json` | 3072 | `Bangla` | `"content": "\"code.sidebar.print_erp_system\",\"components\\shell\\sidebar.tsx\",\"shell\",\"Print ERP System\",\"প্রিন্ট ইআরপি সফটওয়্যার\",\"label\",\"\",\"\",\"scanned\""` |
| `scripts/inventory.json` | 3077 | `Bangla` | `"content": "\"name\": \"প্রিন্ট ইআরপি\","` |
| `scripts/inventory.json` | 3082 | `Bangla` | `"content": "\"login_title\": \"প্রিন্ট ইআরপি-তে প্রবেশ করুন\","` |
| `copy-inventory.csv` | 1862 | `Bangla` | `"prop.desc.direct_communication_chan","app\[tenantSlug]\support\page.tsx","support","Direct communication channel with PrintERP engineers, press technicians, and billing specialists.","প্রিন্টইআরপি ইঞ্জিনিয়ার, প্রেস টেকনিশিয়ান ও হিসাব বিশেষজ্ঞদের সাথে সরাসরি সহায়তা ও যোগাযোগ চ্যানেল।","hint","","","scanned"` |
| `copy-inventory.csv` | 3263 | `Bangla` | `"code.core-problems-section.with_printerp_connected_c","components\marketing\core-problems-section.tsx","marketing","With PrintERP: Connected & Clear","প্রিন্টইআরপিতে: সমন্বিত ও পরিষ্কার","label","","","scanned"` |
| `copy-inventory.csv` | 3323 | `Bangla` | `"code.what-printerp-manages-section.what_printerp_actually_ma","components\marketing\what-printerp-manages-section.tsx","marketing","What PrintERP Actually Manages.","প্রিন্টইআরপি আপনার ব্যবসায়ের ঠিক কী কী পরিচালনা করে।","label","","","scanned"` |
| `copy-inventory.csv` | 4094 | `Bangla` | `"code.trial-upgrade-modal.upgrade_your_printerp_pla","components\subscriptions\trial-upgrade-modal.tsx","subscriptions","Upgrade Your PrintERP Plan","আপনার প্রিন্টইআরপি প্ল্যান আপগ্রেড করুন","label","","","scanned"` |
| `docs/rebrand/inventory.md` | 16 | `Bangla` | `\| **Bangla: প্রিন্টইআরপি** \| 27 \|` |
| `docs/rebrand/inventory.md` | 192 | `Bangla` | `\| `প্রিন্টইআরপি` \| 27 \| `প্রিন্টফ্লো` \|` |
| `docs/rebrand/inventory.md` | 205 | `Bangla` | `\| `app/[tenantSlug]/support/page.tsx` \| 99 \| `Bangla` \| `titleEn="Enterprise Support & Helpdesk"titleBn="এন্টারপ্রাইজ হেল্পডেস্ক ও লাইভ সাপোর্ট"descriptionEn="Direct communication channel with PrintERP engineers, press technicians, and billing specialists."descriptionBn="প্রিন্টইআরপি ইঞ্জিনিয়ার, প্রেস টেকনিশিয়ান ও হিসাব বিশেষজ্ঞদের সাথে সরাসরি সহায়তা ও যোগাযোগ চ্যানেল।"icon={Headset}` \|` |
| `docs/rebrand/inventory.md` | 206 | `Bangla` | `\| `app/faq/page.tsx` \| 26 \| `Bangla` \| `{tBilingual('Frequently Asked Questions', 'প্রিন্টইআরপি সাধারণ প্রশ্নোত্তর')}` \|` |
| `docs/rebrand/inventory.md` | 207 | `Bangla` | `\| `app/terms/page.tsx` \| 31 \| `Bangla` \| `'প্রিন্টইআরপি প্ল্যাটফর্ম ব্যবহার ও সেবার নীতিমালা।'` \|` |
| `docs/rebrand/inventory.md` | 208 | `Bangla` | `\| `components/marketing/core-problems-section.tsx` \| 45 \| `Bangla` \| `'কোটেশন যখন হোয়াটসঅ্যাপে, কাজের মাপ ছেঁড়া চিরকুটে আর বাকি টাকা স্মৃতির ওপর থাকে, তখন কাজের ভুল ও লোকসান ঠেকানো অসম্ভব। প্রিন্টইআরপি এই বিশৃঙ্খলাকে শৃঙ্খলায় রূপান্তর করে।'` \|` |
| `docs/rebrand/inventory.md` | 209 | `Bangla` | `\| `components/marketing/core-problems-section.tsx` \| 99 \| `Bangla` \| `<span>{tBilingual('With PrintERP: Connected & Clear', 'প্রিন্টইআরপিতে: সমন্বিত ও পরিষ্কার')}</span>` \|` |
| `docs/rebrand/inventory.md` | 210 | `Bangla` | `\| `components/marketing/core-workflow-section.tsx` \| 43 \| `Bangla` \| `'প্রিন্টইআরপি প্রেস ও সাইনেজ ব্যবসার বাস্তব কর্মপ্রবাহের সাথে মানানসই: প্রয়োজন অনুযায়ী নমনীয় ধাপ, বহুমুখী কাজের বিভাজন ও স্বচ্ছ হিসাব।'` \|` |
| `docs/rebrand/inventory.md` | 211 | `Bangla` | `\| `components/marketing/faq-section.tsx` \| 36 \| `Bangla` \| `'প্রিন্টইআরপির ফিচার, রোল স্টক, বাংলা ভাষা, টাকা হিসাব এবং সহজে শুরু করার স্পষ্ট উত্তর।'` \|` |
| `docs/rebrand/inventory.md` | 212 | `Bangla` | `\| `components/marketing/feature-deep-dive-section.tsx` \| 506 \| `Bangla` \| `'অনেক সময় লাখ টাকার বিল করেও মাস শেষে ক্যাশ থাকে না। কারণ লুকায়িত খরচগুলো হিসাবে আসে না। প্রিন্টইআরপিতে মেটেরিয়াল, কালি, বিদ্যুৎ, কারিগরের মজুরি ও পরিবহন বাদ দিয়ে প্রতিটি কাজের আসল লাভ নিশ্চিত করা হয়।'` \|` |
| `docs/rebrand/inventory.md` | 213 | `Bangla` | `\| `components/marketing/feature-deep-dive-section.tsx` \| 723 \| `Bangla` \| `'প্রেসের লাভ আটকে থাকে কাস্টমারের বাকি টাকায়। প্রিন্টইআরপি স্বয়ংক্রিয়ভাবে কার কাছে কত টাকা বাকি আছে তা হিসাব রাখে এবং ১ ক্লিকে গ্রাহকের হোয়াটসঅ্যাপে ভদ্র তাগাদার মেসেজ পাঠায়।'` \|` |
| `docs/rebrand/inventory.md` | 214 | `Bangla` | `\| `components/marketing/industry-solutions-section.tsx` \| 35 \| `Bangla` \| `'আরামবাগের ব্যানার শপ, ফকিরাপুলের অফসেট প্রেস কিংবা চট্টগ্রামের সাইনবোর্ড ফ্যাব্রিকেশন—প্রিন্টইআরপি আপনার কারখানার কাজের ধরন অনুযায়ী মানানসই।'` \|` |
| `docs/rebrand/inventory.md` | 215 | `Bangla` | `\| `components/marketing/operational-advantages-section.tsx` \| 38 \| `Bangla` \| `'সাধারণ রিটেইল সফটওয়্যার প্রেসে অচল, কারণ এখানে প্রতিটি কাজ কাস্টম প্রজেক্ট। প্রিন্টইআরপি পরিমাপ, রোল স্টক, মেশিন কিউ ও বাস্তব প্রেস কালচারের ওপর ভিত্তি করে নির্মিত।'` \|` |
| `docs/rebrand/inventory.md` | 216 | `Bangla` | `\| `components/marketing/what-printerp-manages-section.tsx` \| 38 \| `Bangla` \| `{tBilingual('What PrintERP Actually Manages.', 'প্রিন্টইআরপি আপনার ব্যবসায়ের ঠিক কী কী পরিচালনা করে।')}` \|` |
| `docs/rebrand/inventory.md` | 217 | `Bangla` | `\| `components/subscriptions/subscription-status-banner.tsx` \| 64 \| `Bangla` \| `'সতর্কতা: আপনার প্রিন্টইআরপি অ্যাকাউন্ট প্ল্যাটফর্ম অ্যাডমিন দ্বারা স্থগিত (Suspended) করা হয়েছে। নতুন কাজ বুকিং বন্ধ রয়েছে।'` \|` |
| `docs/rebrand/inventory.md` | 218 | `Bangla` | `\| `components/subscriptions/trial-dashboard-card.tsx` \| 94 \| `Bangla` \| `{tBilingual(currentPlan?.name \\|\\| 'PrintERP Free Trial', currentPlan?.name_bn \\|\\| 'প্রিন্টইআরপি ফ্রি ট্রায়াল')}` \|` |
| `docs/rebrand/inventory.md` | 219 | `Bangla` | `\| `components/subscriptions/trial-notification-popup.tsx` \| 213 \| `Bangla` \| `'প্রিন্টইআরপি ট্রায়াল উপভোগ করছেন?'` \|` |
| `docs/rebrand/inventory.md` | 220 | `Bangla` | `\| `components/subscriptions/trial-upgrade-modal.tsx` \| 192 \| `Bangla` \| `: tBilingual('Upgrade Your PrintERP Plan', 'আপনার প্রিন্টইআরপি প্ল্যান আপগ্রেড করুন')}` \|` |
| `docs/rebrand/inventory.md` | 221 | `Bangla` | `\| `copy-inventory.csv` \| 1862 \| `Bangla` \| `"prop.desc.direct_communication_chan","app\[tenantSlug]\support\page.tsx","support","Direct communication channel with PrintERP engineers, press technicians, and billing specialists.","প্রিন্টইআরপি ইঞ্জিনিয়ার, প্রেস টেকনিশিয়ান ও হিসাব বিশেষজ্ঞদের সাথে সরাসরি সহায়তা ও যোগাযোগ চ্যানেল।","hint","","","scanned"` \|` |
| `docs/rebrand/inventory.md` | 222 | `Bangla` | `\| `copy-inventory.csv` \| 3263 \| `Bangla` \| `"code.core-problems-section.with_printerp_connected_c","components\marketing\core-problems-section.tsx","marketing","With PrintERP: Connected & Clear","প্রিন্টইআরপিতে: সমন্বিত ও পরিষ্কার","label","","","scanned"` \|` |
| `docs/rebrand/inventory.md` | 223 | `Bangla` | `\| `copy-inventory.csv` \| 3323 \| `Bangla` \| `"code.what-printerp-manages-section.what_printerp_actually_ma","components\marketing\what-printerp-manages-section.tsx","marketing","What PrintERP Actually Manages.","প্রিন্টইআরপি আপনার ব্যবসায়ের ঠিক কী কী পরিচালনা করে।","label","","","scanned"` \|` |
| `docs/rebrand/inventory.md` | 224 | `Bangla` | `\| `copy-inventory.csv` \| 4094 \| `Bangla` \| `"code.trial-upgrade-modal.upgrade_your_printerp_pla","components\subscriptions\trial-upgrade-modal.tsx","subscriptions","Upgrade Your PrintERP Plan","আপনার প্রিন্টইআরপি প্ল্যান আপগ্রেড করুন","label","","","scanned"` \|` |
| `docs/rebrand/inventory.md` | 225 | `Bangla` | `\| `lib/marketing/marketing-data.ts` \| 496 \| `Bangla` \| `qBn: 'প্রিন্টইআরপি (PrintERP) কী?',` \|` |
| `docs/rebrand/inventory.md` | 226 | `Bangla` | `\| `lib/marketing/marketing-data.ts` \| 498 \| `Bangla` \| `aBn: 'প্রিন্টইআরপি হলো বাংলাদেশের ডিজিটাল প্রিন্ট, অফসেট প্রেস, ব্যানার, সাইনবোর্ড ফ্যাব্রিকেশন ও বিজ্ঞাপন এজেন্সির জন্য বিশেষভাবে তৈরি সফটওয়্যার। এটি কোটেশন, অর্ডার, ডিজাইন অনুমোদন, কারখানা প্রোডাকশন, স্টক, চালান ও বকেয়া আদায়ের পুরো ব্যবসাকে এক ছাদের নিচে পরিচালনা করে।',` \|` |
| `docs/rebrand/inventory.md` | 227 | `Bangla` | `\| `lib/marketing/marketing-data.ts` \| 502 \| `Bangla` \| `qBn: 'প্রিন্টইআরপি কাদের জন্য তৈরি?',` \|` |
| `docs/rebrand/inventory.md` | 228 | `Bangla` | `\| `lib/marketing/marketing-data.ts` \| 532 \| `Bangla` \| `qBn: 'প্রিন্টইআরপিতে কি বাংলা ভাষা সাপোর্ট করে?',` \|` |
| `docs/rebrand/inventory.md` | 229 | `Bangla` | `\| `lib/marketing/marketing-data.ts` \| 550 \| `Bangla` \| `qBn: 'প্রিন্টইআরপি কি স্মার্টফোনে ব্যবহার করা যায়?',` \|` |
| `docs/rebrand/inventory.md` | 230 | `Bangla` | `\| `lib/marketing/marketing-data.ts` \| 552 \| `Bangla` \| `aBn: 'প্রিন্টইআরপি সম্পূর্ণ মোবাইল-ফ্রেন্ডলি। ফলে কম্পিউটার ছাড়াও যেকোনো সাধারণ স্মার্টফোনে লাইভ সেলস, বকেয়া খাতা ও প্রোডাকশন মনিটর করা যায়।',` \|` |
| `docs/rebrand/inventory.md` | 231 | `Bangla` | `\| `lib/marketing/marketing-data.ts` \| 562 \| `Bangla` \| `qBn: 'খাতা বা এক্সেল থেকে প্রিন্টইআরপিতে আসা কতটা সহজ?',` \|` |
| `scripts/brand-check.mjs` | 22 | `Bangla` | `{ name: 'Bangla প্রিন্টইআরপি', regex: /প্রিন্টইআরপি/ },` |
| `scripts/build-inventory.mjs` | 34 | `Bangla` | `const bnPrintErpJoined = runGitGrep('প্রিন্টইআরপি');` |
| `scripts/build-inventory.mjs` | 62 | `Bangla` | `addItems('Bangla: প্রিন্টইআরপি', 'প্রিন্টইআরপি', bnPrintErpJoined);` |
| `scripts/build-inventory.mjs` | 92 | `Bangla` | `\| **Bangla: প্রিন্টইআরপি** \| ${bnPrintErpJoined.length} \|` |
| `scripts/build-inventory.mjs` | 125 | `Bangla` | `\| \`প্রিন্টইআরপি\` \| ${bnPrintErpJoined.length} \| \`প্রিন্টফ্লো\` \|` |
| `scripts/inventory.json` | 8 | `Bangla` | `"Bangla: প্রিন্টইআরপি": 27,` |
| `scripts/inventory.json` | 3087 | `Bangla` | `"content": "titleEn=\"Enterprise Support & Helpdesk\"titleBn=\"এন্টারপ্রাইজ হেল্পডেস্ক ও লাইভ সাপোর্ট\"descriptionEn=\"Direct communication channel with PrintERP engineers, press technicians, and billing specialists.\"descriptionBn=\"প্রিন্টইআরপি ইঞ্জিনিয়ার, প্রেস টেকনিশিয়ান ও হিসাব বিশেষজ্ঞদের সাথে সরাসরি সহায়তা ও যোগাযোগ চ্যানেল।\"icon={Headset}"` |
| `scripts/inventory.json` | 3092 | `Bangla` | `"content": "{tBilingual('Frequently Asked Questions', 'প্রিন্টইআরপি সাধারণ প্রশ্নোত্তর')}"` |
| `scripts/inventory.json` | 3097 | `Bangla` | `"content": "'প্রিন্টইআরপি প্ল্যাটফর্ম ব্যবহার ও সেবার নীতিমালা।'"` |
| `scripts/inventory.json` | 3102 | `Bangla` | `"content": "'কোটেশন যখন হোয়াটসঅ্যাপে, কাজের মাপ ছেঁড়া চিরকুটে আর বাকি টাকা স্মৃতির ওপর থাকে, তখন কাজের ভুল ও লোকসান ঠেকানো অসম্ভব। প্রিন্টইআরপি এই বিশৃঙ্খলাকে শৃঙ্খলায় রূপান্তর করে।'"` |
| `scripts/inventory.json` | 3107 | `Bangla` | `"content": "<span>{tBilingual('With PrintERP: Connected & Clear', 'প্রিন্টইআরপিতে: সমন্বিত ও পরিষ্কার')}</span>"` |
| `scripts/inventory.json` | 3112 | `Bangla` | `"content": "'প্রিন্টইআরপি প্রেস ও সাইনেজ ব্যবসার বাস্তব কর্মপ্রবাহের সাথে মানানসই: প্রয়োজন অনুযায়ী নমনীয় ধাপ, বহুমুখী কাজের বিভাজন ও স্বচ্ছ হিসাব।'"` |
| `scripts/inventory.json` | 3117 | `Bangla` | `"content": "'প্রিন্টইআরপির ফিচার, রোল স্টক, বাংলা ভাষা, টাকা হিসাব এবং সহজে শুরু করার স্পষ্ট উত্তর।'"` |
| `scripts/inventory.json` | 3122 | `Bangla` | `"content": "'অনেক সময় লাখ টাকার বিল করেও মাস শেষে ক্যাশ থাকে না। কারণ লুকায়িত খরচগুলো হিসাবে আসে না। প্রিন্টইআরপিতে মেটেরিয়াল, কালি, বিদ্যুৎ, কারিগরের মজুরি ও পরিবহন বাদ দিয়ে প্রতিটি কাজের আসল লাভ নিশ্চিত করা হয়।'"` |
| `scripts/inventory.json` | 3127 | `Bangla` | `"content": "'প্রেসের লাভ আটকে থাকে কাস্টমারের বাকি টাকায়। প্রিন্টইআরপি স্বয়ংক্রিয়ভাবে কার কাছে কত টাকা বাকি আছে তা হিসাব রাখে এবং ১ ক্লিকে গ্রাহকের হোয়াটসঅ্যাপে ভদ্র তাগাদার মেসেজ পাঠায়।'"` |
| `scripts/inventory.json` | 3132 | `Bangla` | `"content": "'আরামবাগের ব্যানার শপ, ফকিরাপুলের অফসেট প্রেস কিংবা চট্টগ্রামের সাইনবোর্ড ফ্যাব্রিকেশন—প্রিন্টইআরপি আপনার কারখানার কাজের ধরন অনুযায়ী মানানসই।'"` |
| `scripts/inventory.json` | 3137 | `Bangla` | `"content": "'সাধারণ রিটেইল সফটওয়্যার প্রেসে অচল, কারণ এখানে প্রতিটি কাজ কাস্টম প্রজেক্ট। প্রিন্টইআরপি পরিমাপ, রোল স্টক, মেশিন কিউ ও বাস্তব প্রেস কালচারের ওপর ভিত্তি করে নির্মিত।'"` |
| `scripts/inventory.json` | 3142 | `Bangla` | `"content": "{tBilingual('What PrintERP Actually Manages.', 'প্রিন্টইআরপি আপনার ব্যবসায়ের ঠিক কী কী পরিচালনা করে।')}"` |
| `scripts/inventory.json` | 3147 | `Bangla` | `"content": "'সতর্কতা: আপনার প্রিন্টইআরপি অ্যাকাউন্ট প্ল্যাটফর্ম অ্যাডমিন দ্বারা স্থগিত (Suspended) করা হয়েছে। নতুন কাজ বুকিং বন্ধ রয়েছে।'"` |
| `scripts/inventory.json` | 3152 | `Bangla` | `"content": "{tBilingual(currentPlan?.name \|\| 'PrintERP Free Trial', currentPlan?.name_bn \|\| 'প্রিন্টইআরপি ফ্রি ট্রায়াল')}"` |
| `scripts/inventory.json` | 3157 | `Bangla` | `"content": "'প্রিন্টইআরপি ট্রায়াল উপভোগ করছেন?'"` |
| `scripts/inventory.json` | 3162 | `Bangla` | `"content": ": tBilingual('Upgrade Your PrintERP Plan', 'আপনার প্রিন্টইআরপি প্ল্যান আপগ্রেড করুন')}"` |
| `scripts/inventory.json` | 3167 | `Bangla` | `"content": "\"prop.desc.direct_communication_chan\",\"app\\[tenantSlug]\\support\\page.tsx\",\"support\",\"Direct communication channel with PrintERP engineers, press technicians, and billing specialists.\",\"প্রিন্টইআরপি ইঞ্জিনিয়ার, প্রেস টেকনিশিয়ান ও হিসাব বিশেষজ্ঞদের সাথে সরাসরি সহায়তা ও যোগাযোগ চ্যানেল।\",\"hint\",\"\",\"\",\"scanned\""` |
| `scripts/inventory.json` | 3172 | `Bangla` | `"content": "\"code.core-problems-section.with_printerp_connected_c\",\"components\\marketing\\core-problems-section.tsx\",\"marketing\",\"With PrintERP: Connected & Clear\",\"প্রিন্টইআরপিতে: সমন্বিত ও পরিষ্কার\",\"label\",\"\",\"\",\"scanned\""` |
| `scripts/inventory.json` | 3177 | `Bangla` | `"content": "\"code.what-printerp-manages-section.what_printerp_actually_ma\",\"components\\marketing\\what-printerp-manages-section.tsx\",\"marketing\",\"What PrintERP Actually Manages.\",\"প্রিন্টইআরপি আপনার ব্যবসায়ের ঠিক কী কী পরিচালনা করে।\",\"label\",\"\",\"\",\"scanned\""` |
| `scripts/inventory.json` | 3182 | `Bangla` | `"content": "\"code.trial-upgrade-modal.upgrade_your_printerp_pla\",\"components\\subscriptions\\trial-upgrade-modal.tsx\",\"subscriptions\",\"Upgrade Your PrintERP Plan\",\"আপনার প্রিন্টইআরপি প্ল্যান আপগ্রেড করুন\",\"label\",\"\",\"\",\"scanned\""` |
| `scripts/inventory.json` | 3187 | `Bangla` | `"content": "qBn: 'প্রিন্টইআরপি (PrintERP) কী?',"` |
| `scripts/inventory.json` | 3192 | `Bangla` | `"content": "aBn: 'প্রিন্টইআরপি হলো বাংলাদেশের ডিজিটাল প্রিন্ট, অফসেট প্রেস, ব্যানার, সাইনবোর্ড ফ্যাব্রিকেশন ও বিজ্ঞাপন এজেন্সির জন্য বিশেষভাবে তৈরি সফটওয়্যার। এটি কোটেশন, অর্ডার, ডিজাইন অনুমোদন, কারখানা প্রোডাকশন, স্টক, চালান ও বকেয়া আদায়ের পুরো ব্যবসাকে এক ছাদের নিচে পরিচালনা করে।',"` |
| `scripts/inventory.json` | 3197 | `Bangla` | `"content": "qBn: 'প্রিন্টইআরপি কাদের জন্য তৈরি?',"` |
| `scripts/inventory.json` | 3202 | `Bangla` | `"content": "qBn: 'প্রিন্টইআরপিতে কি বাংলা ভাষা সাপোর্ট করে?',"` |
| `scripts/inventory.json` | 3207 | `Bangla` | `"content": "qBn: 'প্রিন্টইআরপি কি স্মার্টফোনে ব্যবহার করা যায়?',"` |
| `scripts/inventory.json` | 3212 | `Bangla` | `"content": "aBn: 'প্রিন্টইআরপি সম্পূর্ণ মোবাইল-ফ্রেন্ডলি। ফলে কম্পিউটার ছাড়াও যেকোনো সাধারণ স্মার্টফোনে লাইভ সেলস, বকেয়া খাতা ও প্রোডাকশন মনিটর করা যায়।',"` |
| `scripts/inventory.json` | 3217 | `Bangla` | `"content": "qBn: 'খাতা বা এক্সেল থেকে প্রিন্টইআরপিতে আসা কতটা সহজ?',"` |
| `copy-inventory.csv` | 2113 | `Bangla` | `"code.page.operate_inkflow_","app\platform\login\page.tsx","login","Operate InkFlow.","ইঙ্কফ্লো পরিচালনা করুন।","label","","","scanned"` |
| `docs/rebrand/inventory.md` | 17 | `Bangla` | `\| **Bangla: ইঙ্কফ্লো / ইংকফ্লো** \| 3 \|` |
| `docs/rebrand/inventory.md` | 193 | `Bangla` | `\| `ইঙ্কফ্লো` / `ইংকফ্লো` \| 3 \| `প্রিন্টফ্লো` \|` |
| `docs/rebrand/inventory.md` | 232 | `Bangla` | `\| `app/platform/login/page.tsx` \| 154 \| `Bangla` \| `{tBilingual('Operate InkFlow.', 'ইঙ্কফ্লো পরিচালনা করুন।')}` \|` |
| `docs/rebrand/inventory.md` | 233 | `Bangla` | `\| `app/platform/login/page.tsx` \| 163 \| `Bangla` \| `'একটি নিরাপদ কন্ট্রোল সেন্টার থেকে ইঙ্কফ্লো প্ল্যাটফর্ম, ক্লায়েন্ট ও সিস্টেম পরিচালনা করুন।'` \|` |
| `docs/rebrand/inventory.md` | 234 | `Bangla` | `\| `copy-inventory.csv` \| 2113 \| `Bangla` \| `"code.page.operate_inkflow_","app\platform\login\page.tsx","login","Operate InkFlow.","ইঙ্কফ্লো পরিচালনা করুন।","label","","","scanned"` \|` |
| `scripts/brand-check.mjs` | 23 | `Bangla` | `{ name: 'Bangla ইঙ্কফ্লো', regex: /ইঙ্কফ্লো\|ইংকফ্লো/ },` |
| `scripts/build-inventory.mjs` | 35 | `Bangla` | `const bnInkflow = runGitGrep('ইঙ্কফ্লো');` |
| `scripts/build-inventory.mjs` | 63 | `Bangla` | `addItems('Bangla: ইঙ্কফ্লো', 'ইঙ্কফ্লো', bnInkflow);` |
| `scripts/build-inventory.mjs` | 93 | `Bangla` | `\| **Bangla: ইঙ্কফ্লো / ইংকফ্লো** \| ${bnInkflow.length + bnInkflow2.length} \|` |
| `scripts/build-inventory.mjs` | 126 | `Bangla` | `\| \`ইঙ্কফ্লো\` / \`ইংকফ্লো\` \| ${bnInkflow.length + bnInkflow2.length} \| \`প্রিন্টফ্লো\` \|` |
| `scripts/inventory.json` | 9 | `Bangla` | `"Bangla: ইঙ্কফ্লো": 3,` |
| `scripts/inventory.json` | 3222 | `Bangla` | `"content": "{tBilingual('Operate InkFlow.', 'ইঙ্কফ্লো পরিচালনা করুন।')}"` |
| `scripts/inventory.json` | 3227 | `Bangla` | `"content": "'একটি নিরাপদ কন্ট্রোল সেন্টার থেকে ইঙ্কফ্লো প্ল্যাটফর্ম, ক্লায়েন্ট ও সিস্টেম পরিচালনা করুন।'"` |
| `scripts/inventory.json` | 3232 | `Bangla` | `"content": "\"code.page.operate_inkflow_\",\"app\\platform\\login\\page.tsx\",\"login\",\"Operate InkFlow.\",\"ইঙ্কফ্লো পরিচালনা করুন।\",\"label\",\"\",\"\",\"scanned\""` |
| `docs/rebrand/inventory.md` | 17 | `Bangla` | `\| **Bangla: ইঙ্কফ্লো / ইংকফ্লো** \| 3 \|` |
| `docs/rebrand/inventory.md` | 193 | `Bangla` | `\| `ইঙ্কফ্লো` / `ইংকফ্লো` \| 3 \| `প্রিন্টফ্লো` \|` |
| `scripts/brand-check.mjs` | 23 | `Bangla` | `{ name: 'Bangla ইঙ্কফ্লো', regex: /ইঙ্কফ্লো\|ইংকফ্লো/ },` |
| `scripts/build-inventory.mjs` | 36 | `Bangla` | `const bnInkflow2 = runGitGrep('ইংকফ্লো');` |
| `scripts/build-inventory.mjs` | 64 | `Bangla` | `addItems('Bangla: ইংকফ্লো', 'ইংকফ্লো', bnInkflow2);` |
| `scripts/build-inventory.mjs` | 93 | `Bangla` | `\| **Bangla: ইঙ্কফ্লো / ইংকফ্লো** \| ${bnInkflow.length + bnInkflow2.length} \|` |
| `scripts/build-inventory.mjs` | 126 | `Bangla` | `\| \`ইঙ্কফ্লো\` / \`ইংকফ্লো\` \| ${bnInkflow.length + bnInkflow2.length} \| \`প্রিন্টফ্লো\` \|` |

---

## 4. Top Impacted Files

| File | Total Matches |
| :--- | :--- |
| `scripts/inventory.json` | 966 |
| `docs/rebrand/inventory.md` | 382 |
| `lib/db/data-store.ts` | 152 |
| `lib/repositories/workforce.repository.ts` | 152 |
| `lib/repositories/inventory.repository.ts` | 125 |
| `supabase/schema_full.sql` | 88 |
| `lib/repositories/product.repository.ts` | 79 |
| `scripts/brand-allowlist.json` | 77 |
| `lib/repositories/billing.repository.ts` | 70 |
| `scripts/build-inventory.mjs` | 63 |
| `services/platform.service.ts` | 54 |
| `lib/repositories/trash.repository.ts` | 51 |
| `app/[tenantSlug]/orders/page.tsx` | 48 |
| `tests/unit/tenant-subdomain-resolution.test.ts` | 40 |
| `app/[tenantSlug]/inventory/page.tsx` | 40 |
| `lib/repositories/design.repository.ts` | 40 |
| `components/production/production-job-card.tsx` | 37 |
| `TENANT_AUTH_AUDIT.md` | 36 |
| `docs/hardening/launch-report.md` | 36 |
| `lib/realtime/subscription-manager.ts` | 36 |
| `hooks/use-data-store.ts` | 35 |
| `lib/repositories/invoice-request.repository.ts` | 32 |
| `services/auth.service.ts` | 32 |
| `app/[tenantSlug]/sales/page.tsx` | 31 |
| `app/[tenantSlug]/customers/[id]/page.tsx` | 30 |
| `app/[tenantSlug]/production/page.tsx` | 30 |
| `app/[tenantSlug]/billing/page.tsx` | 29 |
| `lib/repositories/quotation.repository.ts` | 28 |
| `app/[tenantSlug]/customers/page.tsx` | 28 |
| `lib/repositories/customer.repository.ts` | 28 |

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
