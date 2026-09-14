# InkFlow V8 — Mobile + WhatsApp + SMS + Offline Implementation Guide

## Enterprise Architecture, Engine Specifications & Technical Documentation

**Version:** V8.0-PROD-IMPLEMENTATION  
**Date:** September 14, 2026  
**Architect:** DeepMind Antigravity Advanced Agentic Core  
**Target Environment:** Node.js 20+ / Next.js 16.3.4 / Supabase PostgreSQL 15+ / PWA / WebPush  

---

## 1. Architectural Overview & System Design

InkFlow V8 introduces a resilient mobile operating system, bilingual multi-channel customer communications, and an audit-grade offline sync engine engineered directly on top of the production-certified V1–V7 architecture (`migrations 001–068`).

```
                                +-------------------------------------------+
                                |      InkFlow V8 Architecture Matrix       |
                                +-------------------------------------------+
                                                      |
                   +----------------------------------+----------------------------------+
                   |                                                                     |
         [ Mobile & Offline Engine ]                                         [ Unified Communication Engine ]
                   |                                                                     |
   +---------------+---------------+                                     +---------------+---------------+
   |               |               |                                     |               |               |
[ Client Outbox ] [ Idempotency ] [ Server Sync ]                     [ WhatsApp ]    [ SMS Gateways ] [ Templates ]
- Device Queue    - Key Hash      - Atomic Batch                      - Meta Cloud    - BulkSMSBD      - English / বাংলা
- PWA LocalCache  - Deduplication - Conflict Resolution               - Twilio API    - SSL Wireless   - Variable Engine
- Tenant Keying   - Server Auth   - RLS Boundary                      - Signed PDFs   - Non-Blocking   - Document Links
```

### Core Architecture Principles:
1. **Server Authority (Zero Parallel Ledgers):** The server remains the sole source of truth. Offline devices queue operational intents into a tenant-scoped outbox. Money, inventory, production state, and attendance transactions are never finalized offline; they are evaluated and committed atomically by the server upon sync.
2. **Deterministic Idempotency:** Every queued outbox item carries an immutable compound idempotency key formatted as `device_id + '_' + uuid`. Re-transmissions of previously processed items safely return cached execution results without double processing.
3. **Non-Blocking Communication Failure Isolation:** Commercial transactions (invoice generation, quotation approval, job delivery, payment collection) complete and commit with 100% reliability regardless of whether third-party messaging providers (Meta WhatsApp, BulkSMSBD) succeed, timeout, or fail.
4. **Tenant-Scoped Local Cache Partitioning:** All browser local storage and IndexedDB keys are strictly prefixed with the tenant slug (`printerp_{tenantSlug}_*`). Cache purging on logout, session termination, or tenant switching ensures zero cross-tenant data leakage on shared mobile floor tablets.

---

## 2. Database Migration & Schema (`069_mobile_communication_offline.sql`)

Migration 069 establishes four core PostgreSQL tables with complete foreign keys, composite indexes, and strict multi-tenant Row Level Security (RLS) policies:

### 2.1 Schema Overview

```sql
-- 1. Sync Outbox Queue
CREATE TABLE IF NOT EXISTS public.sync_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    device_id VARCHAR(100) NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'queued',
    conflict_details JSONB,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    synced_at TIMESTAMPTZ,
    synced_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT sync_outbox_idempotency_co_unique UNIQUE (company_id, idempotency_key)
);

-- 2. Unified Communication Messages Log
CREATE TABLE IF NOT EXISTS public.communication_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    channel VARCHAR(50) NOT NULL,
    recipient_name VARCHAR(255) NOT NULL,
    recipient_destination VARCHAR(255) NOT NULL,
    subject TEXT,
    template_key VARCHAR(100),
    variables JSONB DEFAULT '{}'::jsonb,
    message_content TEXT NOT NULL,
    attachment_url TEXT,
    attachment_name VARCHAR(255),
    provider VARCHAR(100) NOT NULL,
    provider_message_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'queued',
    error_code VARCHAR(100),
    error_message TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    idempotency_key VARCHAR(255),
    sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT comm_msg_idempotency_co_unique UNIQUE (company_id, idempotency_key)
);

-- 3. Bilingual Communication Templates Master
CREATE TABLE IF NOT EXISTS public.communication_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    template_key VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_bn VARCHAR(255),
    channel VARCHAR(50) NOT NULL DEFAULT 'all',
    subject_en TEXT,
    subject_bn TEXT,
    body_en TEXT NOT NULL,
    body_bn TEXT NOT NULL,
    variables JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT comm_tpl_key_co_chan_unique UNIQUE (company_id, template_key, channel)
);

-- 4. Registered Client Devices
CREATE TABLE IF NOT EXISTS public.client_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id VARCHAR(100) NOT NULL,
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50) NOT NULL DEFAULT 'mobile',
    os_info VARCHAR(100),
    app_version VARCHAR(50),
    push_subscription JSONB,
    last_sync_at TIMESTAMPTZ,
    is_trusted BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT client_devices_company_device_unique UNIQUE (company_id, device_id)
);
```

### 2.2 Composite Performance Indexes
```sql
CREATE INDEX idx_sync_outbox_company_status ON public.sync_outbox (company_id, status);
CREATE INDEX idx_sync_outbox_device_sync ON public.sync_outbox (device_id, status, created_at DESC);
CREATE INDEX idx_comm_messages_company_chan ON public.communication_messages (company_id, channel, status);
CREATE INDEX idx_comm_messages_recipient ON public.communication_messages (company_id, recipient_destination, created_at DESC);
CREATE INDEX idx_client_devices_user ON public.client_devices (company_id, user_id, is_active);
```

### 2.3 Row-Level Security (RLS) Verification
Every table is guarded with `public.auth_is_active_company_user(company_id)` ensuring strict multi-tenant boundary checks across queries, mutations, and bulk outbox pushes.

---

## 3. Server-Authoritative Offline Sync Engine

The `SyncService` processes batches of queued actions submitted by mobile devices.

### 3.1 Idempotency Key Architecture
- **Format:** `{device_id}_{action_slug}_{uuid}` (e.g. `dev_phone_01_task_start_a9b1c2d3`).
- **Processing Flow:**
  1. Server checks if `company_id + idempotency_key` exists in `sync_outbox`.
  2. If found and status is `synced`, returns the cached entity ID and timestamp immediately.
  3. If not found, creates a pending outbox record and proceeds with atomic validation.

### 3.2 Conflict Resolution Matrix

| Domain Operation | Conflict Condition | Server Resolution Strategy | Client Notification |
| :--- | :--- | :--- | :--- |
| `task.start` / `task.complete` | Task was already completed/cancelled on server | **TASK_ALREADY_TERMINATED**: Rejects mutation, returns live server task status. | Displays conflict banner: *"Task was already completed by another operator."* |
| `production.material_issue` | Requested issue quantity exceeds live server stock balance | **INSUFFICIENT_STOCK**: Prevents negative physical inventory, halts deduction. | Displays stock shortage alert with current live stock count. |
| `attendance.punch` | Duplicate check-in on the same day for employee | **DUPLICATE_CHECK_IN**: Retains initial server check-in timestamp. | Informs operator that attendance was already recorded earlier. |
| `quotation.create` / `quotation.draft` | Offline customer price proposal created | **SERVER_AUTHORITATIVE_INSERT**: Generates authoritative server quotation number. | Syncs new quotation and maps local draft ID to server ID. |
| `customer.note_add` | Offline operator note added to customer profile | **APPEND_LOG**: Appends note to customer timeline without overwriting. | Updates customer timeline smoothly. |

---

## 4. Multi-Channel Unified Communication Engine

The `UnifiedCommunicationService` dispatches transactional alerts across WhatsApp, SMS, Email, and In-App notifications.

### 4.1 Channel Integrations & Routing
- **WhatsApp:** Official Meta Graph API v21.0 Cloud API / Twilio WhatsApp fallback.
- **SMS Gateways:** BulkSMSBD, SSL Wireless, Greenweb BD, Twilio SMS.
- **Email:** Resend / Nodemailer SMTP.
- **In-App:** Real-time web-push and tenant activity feed.

### 4.2 Bilingual Variable Substitution Engine
Templates support double-brace variable syntax (`{{variable_name}}`) in both English and বাংলা:

```typescript
// Sample Invoice Notification (Bengali)
"প্রিয় {{customer_name}},\n\nআপনার বিক্রয় বিল {{invoice_number}} তৈরি হয়েছে। মোট বিল: {{invoice_total}} টাকা, বকেয়া: {{due_amount}} টাকা।\n\nধন্যবাদান্তে,\n{{company_name}}"

// Interpolated Output
"প্রিয় Beximco Media,\n\nআপনার বিক্রয় বিল INV-2026-888 তৈরি হয়েছে। মোট বিল: 57500 টাকা, বকেয়া: 37500 টাকা।\n\nধন্যবাদান্তে,\nMetro Print & Media"
```

### 4.3 PDF / Document Link Delivery
When documents (e.g. Invoices, Quotations, Delivery Challans, Mushak 6.3) are dispatched over text channels (WhatsApp / SMS), the service automatically formats and appends the secure document link to the message content:
```
Document Link / লিংক: https://cdn.inkflow.com.bd/invoices/inv-123.pdf
```

### 4.4 Non-Blocking Commercial Isolation
```typescript
try {
  await UnifiedCommunicationService.sendTransactionalMessage({ ... })
} catch (commErr) {
  // Commercial operation (Invoice creation / Payment) SUCCEEDS regardless of communication delivery status
  console.warn('[Commercial Operation] Notification dispatch failed non-blockingly:', commErr)
}
```

---

## 5. Mobile Floor Terminal & PWA Architecture

### 5.1 Mobile Dashboard (`components/mobile/mobile-operations-dashboard.tsx`)
- **Header:** Live Online/Offline indicator badge, instant outbox sync button with pending item counter.
- **Actionable Metrics:** Today's pending tasks, active production jobs, customer designs awaiting approval, scheduled deliveries, overdue bills, and low stock warnings.
- **Floor Task Terminal:** Quick action buttons (`Start`, `Pause`, `Resume`, `Complete`, `Rework`) sized for minimum 48px touch targets.
- **Mobile QR & GPS Attendance Terminal:** One-touch check-in / check-out with automatic GPS coordinate capture.

### 5.2 Sync Center Modal (`components/mobile/sync-center-modal.tsx`)
- Displays real-time queue of pending outbox actions.
- Categorized conflict resolution view explaining any rejected mutations.
- One-touch manual trigger to retry failed or conflicted operations.
- Secure tenant cache purge button for shared workstations.

---

## 6. Client Cache Security & Tenant Partitioning

The `LocalCacheSecurityManager` guarantees zero cross-tenant contamination:
1. **Tenant Key Prefixing:** All local storage entries are partitioned by tenant slug (`printerp_{tenantSlug}_{key}`).
2. **Automatic Session Cleanup:** When a user logs out or switches tenants, all tenant-scoped cached data, outbox items, and client settings are cryptographically purged.
3. **Hardware Device Registration:** Devices generate a persistent UUID stored in local storage and register with the server via `SyncRepository.registerClientDevice`.

---

## 7. TypeScript Type Definitions

### 7.1 Sync Engine Types (`types/sync.types.ts`)
```typescript
export type SyncItemStatus = 'queued' | 'syncing' | 'synced' | 'conflict' | 'failed'

export interface SyncOutboxRecord {
  id: string
  company_id: string
  branch_id?: string | null
  device_id: string
  idempotency_key: string
  action_type: string
  entity_type: string
  entity_id?: string | null
  payload: Record<string, any>
  status: SyncItemStatus
  conflict_details?: SyncConflictRecord | null
  attempts: number
  max_attempts: number
  last_error?: string | null
  created_at: string
  synced_at?: string | null
  synced_by?: string | null
}

export interface SyncBatchResult {
  success: boolean
  total_processed: number
  synced_count: number
  conflict_count: number
  failed_count: number
  results: Array<{
    idempotency_key: string
    status: SyncItemStatus
    entity_id?: string | null
    action_type: string
    conflict_details?: SyncConflictRecord
    error?: string
    synced_at?: string
  }>
}
```

### 7.2 Mobile Dashboard Types (`types/mobile.types.ts`)
```typescript
export interface MobileTodaySummary {
  date: string
  pending_tasks_count: number
  in_progress_tasks_count: number
  designs_awaiting_approval_count: number
  active_production_jobs_count: number
  scheduled_deliveries_count: number
  overdue_invoices_count: number
  total_due_amount: number
  low_stock_alerts_count: number
  unread_notifications_count: number
  attendance_status: {
    is_checked_in: boolean
    check_in_time?: string | null
    shift_name?: string | null
  }
}
```

---

## 8. Server Actions (`actions/`)

1. `actions/sync.actions.ts`:
   - `submitOutboxBatchAction(batch, tenantSlug)`
   - `fetchOutboxStatusAction(options, tenantSlug)`
   - `registerClientDeviceAction(deviceInfo, tenantSlug)`
2. `actions/communication.actions.ts`:
   - `sendTransactionalAlertAction(payload, tenantSlug)`
   - `fetchCommunicationLogsAction(options, tenantSlug)`
   - `updateCommunicationTemplateAction(template, tenantSlug)`
3. `actions/mobile.actions.ts`:
   - `getMobileDashboardDataAction(tenantSlug)`
   - `updateTaskStateAction(taskId, action, notes, tenantSlug)`
   - `recordMobilePunchAction(payload, tenantSlug)`
