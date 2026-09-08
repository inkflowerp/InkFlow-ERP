-- ==============================================================================
-- PrintERP SaaS - Multi-Tenant Security & Isolation Verification Test
-- ==============================================================================

-- TEST SCENARIO 1: Create Two Separate Companies (Company A & Company B)
-- Company A: Padma Digital Ltd.
-- Company B: Meghna Color Press

do $$
declare
    user_a_id uuid := gen_random_uuid();
    user_b_id uuid := gen_random_uuid();
    company_a_id uuid := gen_random_uuid();
    company_b_id uuid := gen_random_uuid();
    branch_a_id uuid;
    branch_b_id uuid;
    cu_a_id uuid;
    cu_b_id uuid;
    owner_role_id uuid;
begin
    -- 1. Insert Companies
    insert into public.companies (id, slug, name, business_type)
    values (company_a_id, 'padma-test-a', 'Padma Test A', 'printing_signage');

    insert into public.companies (id, slug, name, business_type)
    values (company_b_id, 'meghna-test-b', 'Meghna Test B', 'offset_print');

    -- 2. Insert Branches
    insert into public.branches (company_id, name, code, is_main)
    values (company_a_id, 'Padma Main Branch', 'BR-A-01', true)
    returning id into branch_a_id;

    insert into public.branches (company_id, name, code, is_main)
    values (company_b_id, 'Meghna Main Branch', 'BR-B-01', true)
    returning id into branch_b_id;

    -- 3. Membership for User A in Company A
    insert into public.company_users (company_id, user_id, branch_id, status)
    values (company_a_id, user_a_id, branch_a_id, 'active')
    returning id into cu_a_id;

    -- 4. Membership for User B in Company B
    insert into public.company_users (company_id, user_id, branch_id, status)
    values (company_b_id, user_b_id, branch_b_id, 'active')
    returning id into cu_b_id;

    -- 5. Assign Owner Roles
    select id into owner_role_id from public.roles where slug = 'owner' limit 1;
    insert into public.user_roles (company_user_id, role_id, company_id)
    values (cu_a_id, owner_role_id, company_a_id);

    insert into public.user_roles (company_user_id, role_id, company_id)
    values (cu_b_id, owner_role_id, company_b_id);

    -- VERIFICATION CHECK:
    -- User A should be active in Company A, but NOT in Company B
    -- When querying under User A identity:
    -- SELECT public.auth_is_active_company_user(company_a_id) => TRUE
    -- SELECT public.auth_is_active_company_user(company_b_id) => FALSE

    -- TEST SCENARIO 2: Disabled User Check
    -- Disable User A
    update public.company_users set status = 'disabled' where id = cu_a_id;

    -- Now User A should be blocked:
    -- SELECT public.auth_is_active_company_user(company_a_id) => FALSE
    -- RLS policies evaluate to FALSE, returning 0 rows.

    raise notice 'Verification setup completed successfully.';
end $$;
