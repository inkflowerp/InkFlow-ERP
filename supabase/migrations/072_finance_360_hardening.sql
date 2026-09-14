-- ==============================================================================
-- InkFlow ERP SaaS - Migration 072: Finance 360 & Atomic Accounting Hardening
-- Supports:
--   1. Bank Statements & Statement Lines for Bank/MFS Reconciliation
--   2. Atomic PostgreSQL RPC: record_expense_atomic
--   3. Atomic PostgreSQL RPC: record_supplier_payment_atomic
--   4. Atomic PostgreSQL RPC: record_financial_transfer_atomic
--   5. Atomic PostgreSQL RPC: record_customer_refund_atomic
--   6. Atomic PostgreSQL RPC: record_journal_adjustment_atomic
--   7. Strict Multi-Tenant Row Level Security & Performance Indexes
-- ==============================================================================

-- 1. BANK STATEMENTS & RECONCILIATION TABLES
create table if not exists public.bank_statements (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    account_id uuid not null references public.accounts(id) on delete cascade,
    statement_identifier text not null,
    start_date date not null,
    end_date date not null,
    opening_balance numeric(14,2) not null default 0,
    closing_balance numeric(14,2) not null default 0,
    status text not null default 'OPEN' check (status in ('OPEN', 'RECONCILING', 'RECONCILED')),
    imported_by_id uuid references auth.users(id) on delete set null,
    imported_by_name text not null default 'System',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_bank_stmt_comp_id unique (company_id, statement_identifier)
);

create index if not exists idx_bank_stmt_company on public.bank_statements(company_id);
create index if not exists idx_bank_stmt_account on public.bank_statements(company_id, account_id);
alter table public.bank_statements enable row level security;

create table if not exists public.bank_statement_lines (
    id uuid primary key default gen_random_uuid(),
    statement_id uuid not null references public.bank_statements(id) on delete cascade,
    company_id uuid not null references public.companies(id) on delete cascade,
    line_date date not null,
    description text not null,
    reference_number text,
    debit numeric(14,2) not null default 0 check (debit >= 0),
    credit numeric(14,2) not null default 0 check (credit >= 0),
    balance numeric(14,2) not null default 0,
    reconciliation_status text not null default 'UNMATCHED' check (
        reconciliation_status in ('UNMATCHED', 'SUGGESTED', 'MATCHED', 'RECONCILED')
    ),
    matched_transaction_id uuid references public.financial_transactions(id) on delete set null,
    matched_journal_line_id uuid references public.journal_entry_lines(id) on delete set null,
    reconciled_at timestamptz,
    created_at timestamptz not null default now(),
    constraint chk_stmt_line_not_both_zero check (debit > 0 or credit > 0)
);

create index if not exists idx_stmt_lines_stmt on public.bank_statement_lines(statement_id);
create index if not exists idx_stmt_lines_comp on public.bank_statement_lines(company_id);
create index if not exists idx_stmt_lines_status on public.bank_statement_lines(company_id, reconciliation_status);
alter table public.bank_statement_lines enable row level security;

-- RLS POLICIES FOR BANK STATEMENTS
drop policy if exists "tenant_isolation_bank_statements" on public.bank_statements;
create policy "tenant_isolation_bank_statements" on public.bank_statements for all
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "tenant_isolation_bank_statement_lines" on public.bank_statement_lines;
create policy "tenant_isolation_bank_statement_lines" on public.bank_statement_lines for all
    using (public.auth_is_active_company_user(company_id));

-- ============================================================================
-- 2. ATOMIC RPC: RECORD EXPENSE
-- ============================================================================
create or replace function public.record_expense_atomic(
    p_company_id uuid,
    p_branch_id uuid,
    p_expense_number text,
    p_category text,
    p_amount numeric,
    p_payment_account_id uuid,
    p_expense_account_id uuid,
    p_vendor_name text,
    p_description text,
    p_expense_date date,
    p_attachment_url text,
    p_actor_name text
)
returns jsonb
language plpgsql
security definer
as $$
declare
    v_txn_id uuid;
    v_pay_acc public.accounts%rowtype;
    v_exp_acc public.accounts%rowtype;
    v_now timestamptz := now();
begin
    if p_amount <= 0 then
        raise exception 'Expense amount must be greater than 0';
    end if;

    -- Lock accounts
    select * into v_pay_acc from public.accounts
    where id = p_payment_account_id and company_id = p_company_id
    for update;

    if not found then
        raise exception 'Payment account % not found', p_payment_account_id;
    end if;

    select * into v_exp_acc from public.accounts
    where id = p_expense_account_id and company_id = p_company_id
    for update;

    if not found then
        raise exception 'Expense account % not found', p_expense_account_id;
    end if;

    -- 1. Create master financial transaction
    insert into public.financial_transactions (
        company_id,
        branch_id,
        transaction_number,
        transaction_date,
        transaction_type,
        status,
        total_amount,
        reference_type,
        reference_id,
        narration,
        posted_by_name,
        posted_at,
        metadata
    ) values (
        p_company_id,
        p_branch_id,
        p_expense_number,
        coalesce(p_expense_date, current_date),
        'EXPENSE',
        'POSTED',
        p_amount,
        'EXPENSE',
        p_expense_number,
        coalesce(p_description, 'Expense voucher: ' || p_category),
        coalesce(p_actor_name, 'Accounts Officer'),
        v_now,
        jsonb_build_object('category', p_category, 'vendor', p_vendor_name, 'attachment_url', p_attachment_url)
    ) returning id into v_txn_id;

    -- 2. Create double-entry lines
    -- Dr: Expense Account
    insert into public.journal_entry_lines (
        transaction_id, company_id, account_id, debit, credit, memo
    ) values (
        v_txn_id, p_company_id, v_exp_acc.id, p_amount, 0, 'Expense: ' || p_description
    );

    -- Cr: Payment Account (Cash/Bank/MFS)
    insert into public.journal_entry_lines (
        transaction_id, company_id, account_id, debit, credit, memo
    ) values (
        v_txn_id, p_company_id, v_pay_acc.id, 0, p_amount, 'Disbursement for ' || p_expense_number
    );

    -- 3. Update account balances
    update public.accounts
    set current_balance = current_balance + p_amount, updated_at = v_now
    where id = v_exp_acc.id;

    update public.accounts
    set current_balance = current_balance - p_amount, updated_at = v_now
    where id = v_pay_acc.id;

    -- 4. Record in legacy expenses table for backwards compatibility
    insert into public.expenses (
        company_id,
        expense_number,
        expense_date,
        category,
        amount,
        payment_method,
        vendor_name,
        description,
        attachment_url,
        bank_account_id,
        recorded_by_name,
        created_at,
        updated_at
    ) values (
        p_company_id,
        p_expense_number,
        coalesce(p_expense_date, current_date),
        case
            when p_category in ('rent', 'salary', 'labor', 'electricity', 'internet', 'transport', 'fuel', 'marketing', 'maintenance', 'materials', 'office', 'other')
            then p_category
            else 'other'
        end,
        p_amount,
        case
            when v_pay_acc.account_subtype = 'CASH' then 'cash'
            when v_pay_acc.account_subtype = 'BANK' then 'bank'
            when v_pay_acc.account_subtype = 'MFS' then 'bkash'
            else 'cash'
        end,
        p_vendor_name,
        p_description,
        p_attachment_url,
        case when v_pay_acc.account_subtype = 'BANK' then v_pay_acc.id else null end,
        coalesce(p_actor_name, 'Accounts Officer'),
        v_now,
        v_now
    ) on conflict do nothing;

    return jsonb_build_object(
        'success', true,
        'transaction_id', v_txn_id,
        'transaction_number', p_expense_number,
        'amount', p_amount
    );
end;
$$;

-- ============================================================================
-- 3. ATOMIC RPC: RECORD SUPPLIER PAYMENT
-- ============================================================================
create or replace function public.record_supplier_payment_atomic(
    p_company_id uuid,
    p_branch_id uuid,
    p_supplier_id uuid,
    p_supplier_name text,
    p_payment_account_id uuid,
    p_amount numeric,
    p_payment_number text,
    p_payment_date date,
    p_reference_number text,
    p_notes text,
    p_actor_name text
)
returns jsonb
language plpgsql
security definer
as $$
declare
    v_txn_id uuid;
    v_pay_acc public.accounts%rowtype;
    v_ap_acc public.accounts%rowtype;
    v_now timestamptz := now();
begin
    if p_amount <= 0 then
        raise exception 'Supplier payment amount must be greater than 0';
    end if;

    select * into v_pay_acc from public.accounts
    where id = p_payment_account_id and company_id = p_company_id
    for update;

    if not found then
        raise exception 'Payment account % not found', p_payment_account_id;
    end if;

    select * into v_ap_acc from public.accounts
    where (code = '2010' or account_subtype = 'PAYABLE') and company_id = p_company_id
    limit 1
    for update;

    if not found then
        raise exception 'Accounts Payable account (2010) not found';
    end if;

    -- 1. Create financial transaction
    insert into public.financial_transactions (
        company_id,
        branch_id,
        transaction_number,
        transaction_date,
        transaction_type,
        status,
        total_amount,
        reference_type,
        reference_id,
        narration,
        posted_by_name,
        posted_at,
        metadata
    ) values (
        p_company_id,
        p_branch_id,
        p_payment_number,
        coalesce(p_payment_date, current_date),
        'SUPPLIER_PAYMENT',
        'POSTED',
        p_amount,
        'PURCHASE_ORDER',
        p_reference_number,
        'Supplier payment to ' || p_supplier_name || ' via ' || v_pay_acc.name,
        coalesce(p_actor_name, 'Procurement Manager'),
        v_now,
        jsonb_build_object('supplier_id', p_supplier_id, 'supplier_name', p_supplier_name, 'notes', p_notes)
    ) returning id into v_txn_id;

    -- 2. Create double-entry lines
    -- Dr: Accounts Payable (reduces liability)
    insert into public.journal_entry_lines (
        transaction_id, company_id, account_id, debit, credit, memo
    ) values (
        v_txn_id, p_company_id, v_ap_acc.id, p_amount, 0, 'AP reduction for supplier ' || p_supplier_name
    );

    -- Cr: Cash/Bank/MFS (reduces asset)
    insert into public.journal_entry_lines (
        transaction_id, company_id, account_id, debit, credit, memo
    ) values (
        v_txn_id, p_company_id, v_pay_acc.id, 0, p_amount, 'Payment outflow to supplier ' || p_supplier_name
    );

    -- 3. Update account balances
    update public.accounts
    set current_balance = current_balance - p_amount, updated_at = v_now
    where id = v_ap_acc.id;

    update public.accounts
    set current_balance = current_balance - p_amount, updated_at = v_now
    where id = v_pay_acc.id;

    -- 4. Sync Supplier Ledger Entry
    insert into public.supplier_ledger_entries (
        company_id,
        branch_id,
        supplier_id,
        entry_type,
        reference_type,
        reference_id,
        debit,
        credit,
        running_balance,
        notes,
        created_at
    ) values (
        p_company_id,
        p_branch_id,
        p_supplier_id,
        'PAYMENT',
        'PAYMENT_RECEIPT',
        p_payment_number,
        p_amount,
        0,
        0, -- running balance recomputed by ledger view
        'Payment via ' || v_pay_acc.name || ' (' || p_payment_number || ')',
        v_now
    );

    return jsonb_build_object(
        'success', true,
        'transaction_id', v_txn_id,
        'payment_number', p_payment_number,
        'amount', p_amount
    );
end;
$$;

-- ============================================================================
-- 4. ATOMIC RPC: RECORD ACCOUNT TRANSFER
-- ============================================================================
create or replace function public.record_financial_transfer_atomic(
    p_company_id uuid,
    p_branch_id uuid,
    p_from_account_id uuid,
    p_to_account_id uuid,
    p_amount numeric,
    p_fee_amount numeric,
    p_transfer_number text,
    p_transfer_date date,
    p_notes text,
    p_actor_name text
)
returns jsonb
language plpgsql
security definer
as $$
declare
    v_txn_id uuid;
    v_trf_id uuid;
    v_from_acc public.accounts%rowtype;
    v_to_acc public.accounts%rowtype;
    v_fee_acc public.accounts%rowtype;
    v_fee numeric := coalesce(p_fee_amount, 0);
    v_now timestamptz := now();
begin
    if p_amount <= 0 then
        raise exception 'Transfer amount must be greater than 0';
    end if;

    if p_from_account_id = p_to_account_id then
        raise exception 'Source and destination accounts cannot be identical';
    end if;

    select * into v_from_acc from public.accounts
    where id = p_from_account_id and company_id = p_company_id
    for update;

    select * into v_to_acc from public.accounts
    where id = p_to_account_id and company_id = p_company_id
    for update;

    if not found or v_from_acc.id is null then
        raise exception 'Transfer accounts not found';
    end if;

    -- 1. Create financial transaction
    insert into public.financial_transactions (
        company_id,
        branch_id,
        transaction_number,
        transaction_date,
        transaction_type,
        status,
        total_amount,
        reference_type,
        reference_id,
        narration,
        posted_by_name,
        posted_at,
        metadata
    ) values (
        p_company_id,
        p_branch_id,
        p_transfer_number,
        coalesce(p_transfer_date, current_date),
        'ACCOUNT_TRANSFER',
        'POSTED',
        p_amount,
        'TRANSFER',
        p_transfer_number,
        'Funds transfer from ' || v_from_acc.name || ' to ' || v_to_acc.name,
        coalesce(p_actor_name, 'Accounts Officer'),
        v_now,
        jsonb_build_object('fee', v_fee, 'notes', p_notes)
    ) returning id into v_txn_id;

    -- 2. Double-Entry Journal Lines
    -- Dr: Destination Account (Asset increases)
    insert into public.journal_entry_lines (
        transaction_id, company_id, account_id, debit, credit, memo
    ) values (
        v_txn_id, p_company_id, v_to_acc.id, p_amount, 0, 'Transfer in from ' || v_from_acc.name
    );

    -- Cr: Source Account (Asset decreases by principal + fee)
    insert into public.journal_entry_lines (
        transaction_id, company_id, account_id, debit, credit, memo
    ) values (
        v_txn_id, p_company_id, v_from_acc.id, 0, p_amount + v_fee, 'Transfer out to ' || v_to_acc.name
    );

    -- If fee, Dr: Fee Expense Account
    if v_fee > 0 then
        select * into v_fee_acc from public.accounts
        where (code = '6070' or account_subtype = 'OPEX_GENERAL') and company_id = p_company_id
        limit 1;

        if found then
            insert into public.journal_entry_lines (
                transaction_id, company_id, account_id, debit, credit, memo
            ) values (
                v_txn_id, p_company_id, v_fee_acc.id, v_fee, 0, 'Transfer processing fee'
            );

            update public.accounts
            set current_balance = current_balance + v_fee, updated_at = v_now
            where id = v_fee_acc.id;
        end if;
    end if;

    -- 3. Update account balances
    update public.accounts
    set current_balance = current_balance + p_amount, updated_at = v_now
    where id = v_to_acc.id;

    update public.accounts
    set current_balance = current_balance - (p_amount + v_fee), updated_at = v_now
    where id = v_from_acc.id;

    -- 4. Record account transfer row
    insert into public.account_transfers (
        company_id,
        branch_id,
        transfer_number,
        from_account_id,
        to_account_id,
        amount,
        fee_amount,
        transfer_date,
        transaction_id,
        status,
        notes,
        created_by_name,
        created_at
    ) values (
        p_company_id,
        p_branch_id,
        p_transfer_number,
        v_from_acc.id,
        v_to_acc.id,
        p_amount,
        v_fee,
        coalesce(p_transfer_date, current_date),
        v_txn_id,
        'POSTED',
        p_notes,
        coalesce(p_actor_name, 'Accounts Officer'),
        v_now
    ) returning id into v_trf_id;

    return jsonb_build_object(
        'success', true,
        'transfer_id', v_trf_id,
        'transaction_id', v_txn_id,
        'transfer_number', p_transfer_number,
        'amount', p_amount
    );
end;
$$;

-- ============================================================================
-- 5. ATOMIC RPC: RECORD CUSTOMER REFUND
-- ============================================================================
create or replace function public.record_customer_refund_atomic(
    p_company_id uuid,
    p_branch_id uuid,
    p_customer_id uuid,
    p_customer_name text,
    p_refund_account_id uuid,
    p_amount numeric,
    p_refund_number text,
    p_refund_date date,
    p_reason text,
    p_actor_name text
)
returns jsonb
language plpgsql
security definer
as $$
declare
    v_txn_id uuid;
    v_pay_acc public.accounts%rowtype;
    v_rev_acc public.accounts%rowtype;
    v_now timestamptz := now();
begin
    if p_amount <= 0 then
        raise exception 'Refund amount must be greater than 0';
    end if;

    select * into v_pay_acc from public.accounts
    where id = p_refund_account_id and company_id = p_company_id
    for update;

    if not found then
        raise exception 'Refund payment account % not found', p_refund_account_id;
    end if;

    select * into v_rev_acc from public.accounts
    where (code = '4010' or account_type = 'REVENUE') and company_id = p_company_id
    limit 1
    for update;

    if not found then
        raise exception 'Sales revenue account (4010) not found';
    end if;

    -- 1. Create master financial transaction
    insert into public.financial_transactions (
        company_id,
        branch_id,
        transaction_number,
        transaction_date,
        transaction_type,
        status,
        total_amount,
        reference_type,
        reference_id,
        narration,
        posted_by_name,
        posted_at,
        metadata
    ) values (
        p_company_id,
        p_branch_id,
        p_refund_number,
        coalesce(p_refund_date, current_date),
        'REFUND',
        'POSTED',
        p_amount,
        'CUSTOMER_REFUND',
        p_refund_number,
        'Customer refund to ' || p_customer_name || ' (Reason: ' || coalesce(p_reason, 'Order cancellation') || ')',
        coalesce(p_actor_name, 'Accounts Manager'),
        v_now,
        jsonb_build_object('customer_id', p_customer_id, 'customer_name', p_customer_name, 'reason', p_reason)
    ) returning id into v_txn_id;

    -- 2. Double-Entry Journal Lines
    -- Dr: Sales Revenue (Contra-revenue reduction)
    insert into public.journal_entry_lines (
        transaction_id, company_id, account_id, debit, credit, memo
    ) values (
        v_txn_id, p_company_id, v_rev_acc.id, p_amount, 0, 'Sales revenue reversal for ' || p_customer_name
    );

    -- Cr: Cash/Bank/MFS (Asset outflow)
    insert into public.journal_entry_lines (
        transaction_id, company_id, account_id, debit, credit, memo
    ) values (
        v_txn_id, p_company_id, v_pay_acc.id, 0, p_amount, 'Refund payment outflow via ' || v_pay_acc.name
    );

    -- 3. Update account balances
    update public.accounts
    set current_balance = current_balance - p_amount, updated_at = v_now
    where id = v_rev_acc.id;

    update public.accounts
    set current_balance = current_balance - p_amount, updated_at = v_now
    where id = v_pay_acc.id;

    return jsonb_build_object(
        'success', true,
        'transaction_id', v_txn_id,
        'refund_number', p_refund_number,
        'amount', p_amount
    );
end;
$$;
