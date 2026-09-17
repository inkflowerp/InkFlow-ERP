-- ==============================================================================
-- InkFlow SaaS - Migration 090: Customer-Type-Based Pricing Engine & Tariffs
-- Supports:
--   1. Reusable Customer-Type Pricing Layer (Retail, Reseller, Corporate, Agency, Government, Regular)
--   2. Multiple Pricing Strategies (Fixed Price, Unit Rate, Percentage Adjustment, Fixed Adjustment, Tiered, Formula)
--   3. Commercial Rules (Minimum Billable Quantity, Minimum Charge, Target Margin, Markup vs Margin, Price Rounding)
--   4. Date-Based Effectiveness (Effective From / Until, Status: draft, active, scheduled, expired, inactive)
--   5. Multi-Tenant Row Level Security & Approval Workflows
-- ==============================================================================

-- 1. PRICING RULES TABLE
create table if not exists public.pricing_rules (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    product_id uuid references public.products(id) on delete cascade,
    category text,
    customer_type text not null check (
        customer_type in ('retail', 'reseller', 'corporate', 'agency', 'government', 'regular')
    ),
    customer_id uuid references public.customers(id) on delete set null,
    pricing_rule_type text not null check (
        pricing_rule_type in ('fixed_price', 'unit_rate', 'percentage_adjustment', 'fixed_adjustment', 'tiered', 'formula')
    ),
    pricing_method text not null default 'per_area',
    base_price numeric(12,2) not null default 0 check (base_price >= 0),
    adjustment_type text check (adjustment_type in ('percentage', 'fixed', 'none')),
    adjustment_value numeric(12,2) default 0,
    fixed_price numeric(12,2) check (fixed_price is null or fixed_price >= 0),
    calculated_price numeric(12,2) not null check (calculated_price >= 0),
    currency text not null default 'BDT',
    target_margin numeric(5,2),
    margin_basis text not null default 'margin' check (margin_basis in ('margin', 'markup')),
    rounding_rule text not null default 'none' check (
        rounding_rule in ('none', 'round_1', 'round_5', 'round_10', 'ceil_5', 'floor_5', 'round_2_decimals')
    ),
    minimum_billable_quantity numeric(10,2) default 0 check (minimum_billable_quantity >= 0),
    minimum_charge numeric(12,2) default 0 check (minimum_charge >= 0),
    tier_ranges jsonb default '[]'::jsonb,
    formula_config jsonb,
    effective_from timestamptz,
    effective_until timestamptz,
    status text not null default 'active' check (
        status in ('draft', 'active', 'scheduled', 'expired', 'inactive', 'pending_approval')
    ),
    notes text,
    requires_approval boolean not null default false,
    approved_by uuid,
    approved_at timestamptz,
    created_by uuid,
    updated_by uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 2. INDEXES FOR HIGH PERFORMANCE QUERYING
create index if not exists idx_pricing_rules_comp_type on public.pricing_rules(company_id, customer_type);
create index if not exists idx_pricing_rules_comp_prod on public.pricing_rules(company_id, product_id);
create index if not exists idx_pricing_rules_comp_cat on public.pricing_rules(company_id, category);
create index if not exists idx_pricing_rules_comp_cust on public.pricing_rules(company_id, customer_id);
create index if not exists idx_pricing_rules_status on public.pricing_rules(company_id, status);
create index if not exists idx_pricing_rules_effective on public.pricing_rules(company_id, effective_from, effective_until);

-- 3. STRICT MULTI-TENANT RLS POLICIES
alter table public.pricing_rules enable row level security;

drop policy if exists "Active company users can view pricing rules" on public.pricing_rules;
create policy "Active company users can view pricing rules" on public.pricing_rules for select
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "Authorized company users can insert pricing rules" on public.pricing_rules;
create policy "Authorized company users can insert pricing rules" on public.pricing_rules for insert
    with check (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'pricing.create')
            or public.auth_user_has_permission(company_id, 'pricing.edit')
            or public.auth_user_has_permission(company_id, 'pricing.manage')
            or public.auth_user_has_permission(company_id, 'products.edit')
            or public.auth_user_has_permission(company_id, 'products.create')
        )
    );

drop policy if exists "Authorized company users can update pricing rules" on public.pricing_rules;
create policy "Authorized company users can update pricing rules" on public.pricing_rules for update
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'pricing.edit')
            or public.auth_user_has_permission(company_id, 'pricing.manage')
            or public.auth_user_has_permission(company_id, 'products.edit')
        )
    );

drop policy if exists "Authorized company users can delete pricing rules" on public.pricing_rules;
create policy "Authorized company users can delete pricing rules" on public.pricing_rules for delete
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'pricing.delete')
            or public.auth_user_has_permission(company_id, 'pricing.manage')
        )
    );
