# InkFlow — Gmail + SMTP Email Integration Guide

## 1. Overview

InkFlow provides a robust, multi-tenant email architecture supporting two primary providers:
1. **Google Gmail API (OAuth 2.0)**: Modern, zero-password connection via official Google OAuth consent and Gmail REST API v1.
2. **Standard Authenticated SMTP**: Direct connection with support for TLS (587), SSL (465), and STARTTLS.

---

## 2. Platform Email vs. Tenant Email Scope

| Dimension | Platform Email | Tenant Business Email |
| :--- | :--- | :--- |
| **Scope Type** | `PLATFORM` (`tenant_id = null`) | `TENANT` (`tenant_id = company_id`) |
| **Owner** | InkFlow Platform Owner / Administrator | Individual Tenant / Business Owner |
| **Use Cases** | Platform verification, OTPs, Tenant registration, Billing receipts, System alerts | Quotations, Invoices, Money Receipts, Due Reminders, Design Proofs, Delivery Challans |
| **Fallback Policy** | Platform Default Gateway | **FAIL-CLOSED (No fallback to platform)** |
| **Managed In** | Platform Admin -> Settings -> Communication | Tenant Dashboard -> Settings -> Email |

---

## 3. Google OAuth 2.0 & Gmail API Setup

### Step 1: Google Cloud Console Project
1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named `InkFlow-ERP` (or select your existing project).
3. Navigate to **APIs & Services** -> **Library** and enable **Gmail API**.

### Step 2: OAuth Consent Screen
1. Go to **APIs & Services** -> **OAuth consent screen**.
2. Select **External** (for multi-tenant SaaS).
3. Fill in App Name (`InkFlow ERP`), User support email, and Developer contact information.
4. Add Scopes:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`

### Step 3: OAuth 2.0 Client Credentials
1. Navigate to **APIs & Services** -> **Credentials** -> **Create Credentials** -> **OAuth Client ID**.
2. Application type: **Web application**.
3. Name: `InkFlow Web Client`.
4. Authorized Redirect URIs:
   - Development: `http://localhost:3000/api/email/oauth/google/callback`
   - Production: `https://your-domain.com/api/email/oauth/google/callback`
5. Copy the **Client ID** and **Client Secret**.

### Step 4: Environment Variables
Add to `.env.local` / Vercel Environment Settings:
```env
GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
GOOGLE_GMAIL_REDIRECT_URI=https://your-domain.com/api/email/oauth/google/callback
ENCRYPTION_SECRET=your-32-byte-encryption-secret
```

---

## 4. SMTP Setup

InkFlow supports standard authenticated SMTP for cPanel, Google Workspace, Office 365, Zoho, Amazon SES, and transactional providers:

* **Host**: `mail.yourdomain.com` or `smtp.gmail.com`
* **Port**: `587` (TLS / STARTTLS) or `465` (SSL)
* **Username**: `billing@yourdomain.com`
* **Password**: Application Password or SMTP Secret (encrypted with AES-256-GCM at rest)
* **From Email**: `billing@yourdomain.com`
* **From Name**: `Vision Sign BD`

---

## 5. Security & Cryptographic Protection

1. **AES-256-GCM Encryption**: All SMTP passwords and Google OAuth refresh/access tokens are encrypted using AES-256-GCM before database insertion.
2. **Zero Leakage**: Tokens and passwords are deleted by `sanitizeGatewayRecord()` before any record is returned to the client browser.
3. **HMAC-Signed State Tokens**: The OAuth flow generates an HMAC-SHA256 signed state token with a 10-minute expiration window to prevent CSRF, code injection, and cross-tenant substitution.
4. **Idempotency Deduplication**: All business email dispatches accept an `idempotencyKey` to prevent duplicate emails from double-clicks or network retries.

---

## 6. Troubleshooting

| Error | Cause | Remediation |
| :--- | :--- | :--- |
| `Tenant email provider is not configured` | Tenant has not connected Gmail or configured SMTP | Navigate to Settings -> Email and connect Gmail or configure SMTP. |
| `Gmail authorization required: No refresh token available` | Google did not return refresh token or token was revoked | Click **Disconnect** then **Sign in with Google** to prompt full consent. |
| `SMTP connection verification failed` | Host, port, or credentials mismatch | Verify port (`587` for TLS, `465` for SSL), and ensure app passwords are used if 2FA is active. |
| `State signature mismatch` | Expired (>10 mins) or altered OAuth state | Initiate the Google sign-in flow again from the Settings page. |
