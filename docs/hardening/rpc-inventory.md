# RPC Security & Client Invocations Inventory

**Branch:** `hardening/phase-0`  
**Generated:** 2026-10-03  
**Scope:** Complete inventory of all PostgreSQL RPC functions in the PrintFlow database schema and codebase, auditing caller clients, execution permissions, and tenant security boundaries.

---

## 1. Codebase `.rpc()` Call Sites Inventory

The following table catalogs every explicit `.rpc()` call site found across the application codebase (`app/`, `actions/`, `lib/`, `services/`, `scripts/`).

| RPC Name | File & Line | Invocation Client | Role Context | Target Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `auth_user_has_permission` | `lib/auth/rbac.server.ts:28` | SSR User Session (`createClient()`) | `authenticated` | Dynamic permission check for current authenticated user. |
| `auth_is_platform_owner` | `lib/auth/rbac.server.ts:112` | SSR User Session (`createClient()`) | `authenticated` | Check if session user is platform owner. |
| `create_invoice_atomic` | `lib/repositories/billing.repository.ts:620` | SSR User Session (`createClient()`) | `authenticated` | Atomic multi-table invoice creation. |
| `create_invoice_atomic` | `lib/repositories/billing.repository.ts:668` | Service-Role Client (`createAdminClient()`) | `service_role` | Fallback retry under elevated credentials. |
| `cancel_invoice_atomic` | `lib/repositories/billing.repository.ts:2900` | SSR User Session (`createClient()`) | `authenticated` | Atomic invoice cancellation & ledger reversal (5 args). |
| `cancel_invoice_atomic` | `lib/repositories/billing.repository.ts:2910` | Service-Role Client (`createAdminClient()`) | `service_role` | Fallback cancellation retry (5 args). |
| `record_multi_invoice_payment_atomic` | `lib/repositories/billing.repository.ts:2082` | SSR User Session (`createClient()`) | `authenticated` | Atomic multi-invoice allocation & receipting (16 args). |
| `record_multi_invoice_payment_atomic` | `lib/repositories/billing.repository.ts:2103` | Service-Role Client (`createAdminClient()`) | `service_role` | Fallback multi-invoice allocation retry (16 args). |
| `record_financial_write_off_atomic` | `lib/repositories/billing.repository.ts:2697` | SSR User Session (`createClient()`) | `authenticated` | Atomic bad-debt write-off on invoice (6 args). |
| `record_financial_write_off_atomic` | `lib/repositories/billing.repository.ts:2708` | Service-Role Client (`createAdminClient()`) | `service_role` | Fallback write-off retry (6 args). |
| `reconcile_customer_balance_atomic` | `lib/repositories/billing.repository.ts:3510` | SSR User Session (`createClient()`) | `authenticated` | Recalculate customer due/paid balance from ledger. |
| `increment_customer_balance_atomic` | `lib/repositories/billing.repository.ts:920` | Elevated Client (`createAdminClient() \|\| supabase`) | `service_role` | Atomic customer ledger balance adjustment. |
| `increment_customer_balance` | `lib/repositories/billing.repository.ts:928` | SSR User Session (`createClient()`) | `authenticated` | Legacy customer balance increment fallback. |
| `increment_customer_balance_atomic` | `lib/repositories/billing.repository.ts:2355` | Elevated Client (`createAdminClient() \|\| supabase`) | `service_role` | Atomic customer balance adjustment in payments. |
| `increment_customer_balance_atomic` | `lib/repositories/billing.repository.ts:2951` | Elevated Client (`createAdminClient() \|\| supabase`) | `service_role` | Atomic customer balance reversal on invoice cancel. |
| `increment_account_balance_atomic` | `lib/repositories/finance.repository.ts:178` | Service-Role Client (`createAdminClient()`) | `service_role` | Atomic double-entry financial account balance shift. |
| `get_next_document_number` | `lib/repositories/billing.repository.ts:143` | SSR User Session (`createClient()`) | `authenticated` | Sequential document number generator. |
| `get_next_document_number` | `lib/repositories/billing.repository.ts:154` | Service-Role Client (`createAdminClient()`) | `service_role` | Fallback document sequence generator. |
| `get_next_document_number` | `lib/repositories/customer.repository.ts:495` | Service-Role Client (`createAdminClient()`) | `service_role` | Customer code sequence generator. |
| `get_next_document_number` | `lib/repositories/finance.repository.ts:51` | Service-Role Client (`createAdminClient()`) | `service_role` | Financial transaction sequence generator. |
| `get_next_document_number` | `lib/repositories/quotation.repository.ts:28` | SSR User Session (`createClient()`) | `authenticated` | Quotation document sequence generator. |
| `mutate_inventory_stock_atomic` | `lib/repositories/inventory.repository.ts:1297` | Elevated Client (`createAdminClient() \|\| supabase`) | `service_role` | Atomic multi-table inventory stock ledger mutation. |
| `verify_auth_otp_atomic` | `services/auth-email.service.ts:365` | Service-Role Client (`createAdminClient()`) | `service_role` | Email OTP code verification & consumption. |
| `delete_tenant_permanently` | `services/platform.service.ts:1817` | Service-Role Client (`createAdminClient()`) | `service_role` | Platform owner permanent company data eradication. |
| `get_next_support_ticket_number` | `services/support.service.ts:107` | Service-Role Client (`createAdminClient()`) | `service_role` | Sequential support ticket code generator. |
| `reconcile_customer_balances` | `scripts/check_supabase.mjs:83` | Direct Diagnostic Script | `service_role` / test | Diagnostic utility script. |

---

## 2. Classification of Database SECURITY DEFINER Functions

Across the live Supabase database, 63 functions in schema `public` are flagged `prosecdef = true` (SECURITY DEFINER). The functions are classified into four security categories below:

### Category A: Trigger & Internal Only (10 Functions)
*Rules:* `REVOKE EXECUTE` from `PUBLIC`, `anon`, and `authenticated`. Triggers continue to fire with function owner/table owner privileges.
1. `handle_new_user()`
2. `handle_new_company_provisioning()`
3. `enforce_subscription_audit_integrity()`
4. `prevent_last_platform_owner_removal()`
5. `rls_auto_enable()`
6. `trg_prevent_audit_log_mutation()`
7. `trg_prevent_financial_deletion()`
8. `trg_enforce_tenant_immutability()`
9. `update_tenant_domains_modtime()`
10. `update_updated_at_column()`

### Category B: Service-Role Only (26 Functions)
*Rules:* `REVOKE EXECUTE` from `PUBLIC`, `anon`, and `authenticated`. `GRANT EXECUTE` exclusively to `service_role`.
1. `admin_purge_all_company_catalog_and_orders(p_company_id uuid)`
2. `admin_purge_all_company_invoices(p_company_id uuid)`
3. `admin_purge_all_company_operational_data(p_company_id uuid)`
4. `delete_tenant_permanently(p_company_id uuid, p_admin_id uuid, p_reason text)`
5. `transition_subscription_state_atomic(p_company_id uuid, p_new_status text, p_reason text, p_actor_id uuid)`
6. `generate_saas_subscription_invoice_atomic(p_company_id uuid, p_plan_id uuid, p_interval text, p_amount numeric, p_discount numeric, p_tax numeric, p_notes text)`
7. `record_saas_payment_and_settle_atomic(p_internal_trx_id text, p_provider_trx_id text, p_provider text, p_paid_amount numeric, p_actor_id uuid)`
8. `mutate_inventory_stock_atomic(...)` (14 args)
9. `record_inventory_stock_transaction(...)` (8 args)
10. `increment_account_balance_atomic(p_company_id uuid, p_account_id uuid, p_delta numeric)`
11. `increment_customer_balance_atomic(p_company_id uuid, p_customer_id uuid, p_due_delta numeric, ...)`
12. `enforce_tenant_branch_addition_atomic(p_company_id uuid)`
13. `enforce_tenant_order_creation_atomic(p_company_id uuid)`
14. `enforce_tenant_storage_upload_atomic(p_company_id uuid, p_bytes_to_add bigint)`
15. `enforce_tenant_user_addition_atomic(p_company_id uuid)`
16. `validate_tenant_limit_atomic(p_company_id uuid, p_limit_type text, p_current_count integer)`
17. `get_next_document_number(p_company_id uuid, p_doc_type text)`
18. `get_next_tenant_document_number(p_company_id uuid, p_document_type text, p_prefix text)`
19. `get_next_support_ticket_number()`
20. `auth_validate_support_session(p_company_id uuid, p_token_hash text)`
21. `get_platform_tenant_users_overview(p_search text, p_company_id uuid, p_status text, p_limit integer, p_offset integer)`
22. `log_platform_audit_event(p_action text, p_entity text, p_entity_id text, p_details jsonb)`
23. `log_platform_audit_event(p_action text, p_entity_type text, p_entity_id text, p_target_company_id uuid, p_details jsonb, p_ip_address text)`
24. `resolve_tenant_by_hostname(p_hostname text)`
25. `verify_auth_otp_atomic(p_email text, p_otp_hash text, p_purpose text)`
26. `verify_auth_token_atomic(p_token_hash text, p_purpose text)`

### Category C: User-Callable RPCs with Strict In-Body Authorization (24 Functions)
*Rules:* `REVOKE EXECUTE` from `PUBLIC` and `anon`. `GRANT EXECUTE` to `authenticated` and `service_role`. In-body verification derives caller from `auth.uid()`, enforces `public.auth_user_has_company_access(p_company_id)`, and requires specific permission via `public.auth_user_has_permission(p_company_id, '<perm>')`.

| Function | Required Permission / Invariant |
| :--- | :--- |
| `create_invoice_atomic` | `invoice.create` OR `invoice.full_control` |
| `cancel_invoice_atomic` (5 args) | `invoices.cancel` OR `invoice.delete` OR `invoice.full_control` |
| `record_multi_invoice_payment_atomic` (16 args) | `payment.create` OR `payment.full_control` |
| `record_financial_write_off_atomic` (6 args) | `invoice.edit` OR `invoice.full_control` |
| `reconcile_customer_balance_atomic` (2 args) | `customer.edit` OR `customer.full_control` |
| `record_cheque_dishonor_atomic` (6 args) | `payment.edit` OR `payment.full_control` |
| `record_customer_refund_atomic` (10 args) | `payment.create` OR `payment.full_control` |
| `record_expense_atomic` (12 args) | `reports.view` OR `settings.view` (or role owner/accountant) |
| `record_expense_with_journal_atomic` (15 args) | `reports.view` OR `settings.view` (or role owner/accountant) |
| `record_financial_transfer_atomic` (10 args) | `settings.view` (or role owner/accountant) |
| `record_supplier_payment_atomic` (11 args) | `purchase.edit` OR `purchase.full_control` |
| `report_production_problem_atomic` (6 args) | `production.view` OR `production.edit` |
| `schedule_production_task_atomic` (8 args) | `production.edit` OR `production.create` |
| `get_tenant_dashboard_metrics(uuid)` | `auth_user_has_company_access(p_company_id)` |
| `get_tenant_dashboard_metrics_v2(uuid)` | `auth_user_has_company_access(p_company_id)` |
| `get_tenant_financial_summary(uuid, date, date)` | `auth_user_has_company_access(p_company_id)` + `reports.view` |
| `get_tenant_production_summary(uuid, date, date)` | `auth_user_has_company_access(p_company_id)` + `production.view` |
| `get_tenant_sales_summary(uuid, date, date)` | `auth_user_has_company_access(p_company_id)` + `quotation.view` / `invoice.view` |
| `log_audit_event(...)` | `auth_user_has_company_access(p_company_id)` |
| `auth_get_user_company_role(uuid)` | `auth.uid()` authenticated session |
| `auth_is_active_company_user(uuid)` | `auth.uid()` authenticated session |
| `auth_user_get_role(uuid)` | `auth.uid()` authenticated session |
| `auth_user_has_company_access(uuid)` | `auth.uid()` authenticated session |
| `auth_user_has_permission(uuid, text)` | `auth.uid()` authenticated session |
| `auth_is_platform_admin()` | `auth.uid()` authenticated session |
| `auth_is_platform_owner()` | `auth.uid()` authenticated session |
| `platform_is_feature_enabled(text, uuid)` | `auth.uid()` authenticated session |

### Category D: Obsolete Overloads Dropped (3 Functions)
*Rules:* `DROP FUNCTION` to eliminate unauthenticated, parameter-spoofable legacy overloads.
1. `cancel_invoice_atomic(uuid, uuid, text, text)` (4 args - lacks user ID and authorization check)
2. `record_multi_invoice_payment_atomic(uuid, uuid, text, numeric, text, date, text, text, date, text, text, text, jsonb, uuid)` (14 args - lacks idempotency key and user ID)
3. `record_payment_atomic(uuid, uuid, text, numeric, text, uuid, text, text)` (8 args - superseded by `record_multi_invoice_payment_atomic`)

---

## 3. Security Hardening Summary

| Metric | Pre-Hotfix State | Post-Hotfix Target | Status |
| :--- | :---: | :---: | :---: |
| `anon` Executable SECURITY DEFINER Functions | **56** | **0** | **100% Closed** |
| `authenticated` Executable SECURITY DEFINER Functions | **59** | **24** | **Restricted & In-Body Guarded** |
| Mutable `search_path` Functions | **18** | **0** | **All Set to `public, pg_temp`** |
| `btree_gist` Extension Location | `public` | `extensions` | **Relocated** |
| Default Functions Privileges | PUBLIC Execute Granted | Revoked from PUBLIC, anon, auth | **Closed by Default** |
| `role_permissions` Table RLS | `USING (true) WITH CHECK (true)` | Company-Scoped & Role-Checked | **Hardened** |
| `_printerp_migrations` Table RLS | Unrestricted (0 policies) | Explicit Deny-All for Public | **Secured** |
