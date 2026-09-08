-- ==============================================================================
-- PrintERP SaaS - Migration 006: Strict Multi-Tenant Row Level Security (RLS)
-- Never trust company_id from browser. Resolve context from authenticated user.
-- Disabled users cannot access any company records.
-- ==============================================================================

-- 1. ENABLE ROW LEVEL SECURITY
alter table public.company_settings enable row level security;
alter table public.branches enable row level security;
alter table public.user_profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.company_users enable row level security;
alter table public.user_roles enable row level security;

-- 2. SECURITY DEFINER HELPER FUNCTIONS

-- Checks if the authenticated user is an ACTIVE member of the company
create or replace function public.auth_is_active_company_user(target_company_id uuid)
returns boolean as $$
begin
    return exists (
        select 1
        from public.company_users
        where company_id = target_company_id
          and user_id = auth.uid()
          and status = 'active'
    );
end;
$$ language plpgsql security definer;

-- Resolves the primary role slug of the user in the company
create or replace function public.auth_get_user_company_role(target_company_id uuid)
returns text as $$
declare
    role_slug text;
begin
    select r.slug into role_slug
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    join public.company_users cu on cu.id = ur.company_user_id
    where cu.company_id = target_company_id
      and cu.user_id = auth.uid()
      and cu.status = 'active'
    limit 1;
    return role_slug;
end;
$$ language plpgsql security definer;

-- Checks if the authenticated user has a specific permission in the company
create or replace function public.auth_user_has_permission(target_company_id uuid, required_permission text)
returns boolean as $$
begin
    -- Owners always have all permissions
    if public.auth_get_user_company_role(target_company_id) = 'owner' then
        return true;
    end if;

    return exists (
        select 1
        from public.user_roles ur
        join public.company_users cu on cu.id = ur.company_user_id
        join public.role_permissions rp on rp.role_id = ur.role_id
        join public.permissions p on p.id = rp.permission_id
        where cu.company_id = target_company_id
          and cu.user_id = auth.uid()
          and cu.status = 'active'
          and p.code = required_permission
    );
end;
$$ language plpgsql security definer;

-- 3. RLS POLICIES FOR USER_PROFILES
create policy "Users can view own user_profile"
    on public.user_profiles for select
    using (auth.uid() = id);

create policy "Users can update own user_profile"
    on public.user_profiles for update
    using (auth.uid() = id);

create policy "Users can insert own user_profile"
    on public.user_profiles for insert
    with check (auth.uid() = id);

-- 4. RLS POLICIES FOR COMPANY_SETTINGS
-- Active members can view company settings
create policy "Active members can view company settings"
    on public.company_settings for select
    using (public.auth_is_active_company_user(company_id));

-- Only owners, admins, or users with settings.manage can update company settings
create policy "Admins can update company settings"
    on public.company_settings for update
    using (
        public.auth_is_active_company_user(company_id) 
        and (
            public.auth_get_user_company_role(company_id) in ('owner', 'admin')
            or public.auth_user_has_permission(company_id, 'settings.manage')
        )
    );

create policy "Authenticated users can insert company settings for created companies"
    on public.company_settings for insert
    with check (auth.uid() is not null);

-- 5. RLS POLICIES FOR BRANCHES
create policy "Active members can view branches"
    on public.branches for select
    using (public.auth_is_active_company_user(company_id));

create policy "Admins can manage branches"
    on public.branches for all
    using (
        public.auth_is_active_company_user(company_id) 
        and (
            public.auth_get_user_company_role(company_id) in ('owner', 'admin')
            or public.auth_user_has_permission(company_id, 'branches.manage')
        )
    );

-- 6. RLS POLICIES FOR COMPANY_USERS
-- Users can view company_users in companies they are active in
create policy "Active members can view company users"
    on public.company_users for select
    using (
        public.auth_is_active_company_user(company_id)
        or auth.uid() = user_id -- Allows users to discover which companies they belong to
    );

create policy "Admins can manage company users"
    on public.company_users for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_get_user_company_role(company_id) in ('owner', 'admin')
            or public.auth_user_has_permission(company_id, 'users.manage')
        )
    );

-- 7. RLS POLICIES FOR ROLES & PERMISSIONS
create policy "Anyone can read permissions catalog"
    on public.permissions for select
    using (true);

create policy "Users can view roles available in their company"
    on public.roles for select
    using (
        company_id is null -- System roles are visible to all
        or public.auth_is_active_company_user(company_id)
    );

create policy "Admins can manage custom roles"
    on public.roles for all
    using (
        company_id is not null
        and public.auth_is_active_company_user(company_id)
        and public.auth_get_user_company_role(company_id) in ('owner', 'admin')
    );

create policy "Users can view role_permissions"
    on public.role_permissions for select
    using (true);

create policy "Active members can view user_roles"
    on public.user_roles for select
    using (public.auth_is_active_company_user(company_id));

create policy "Admins can manage user_roles"
    on public.user_roles for all
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_get_user_company_role(company_id) in ('owner', 'admin')
    );

-- 8. AUTOMATIC ONBOARDING PROVISIONING TRIGGER
-- When a company is created, automatically:
--  - Creates company_settings
--  - Creates main branch
--  - Inserts creator into company_users as active member
--  - Assigns Owner role to creator
create or replace function public.handle_new_company_provisioning()
returns trigger as $$
declare
    main_branch_id uuid;
    new_company_user_id uuid;
    owner_role_id uuid;
begin
    -- 1. Create company settings
    insert into public.company_settings (
        company_id,
        invoice_prefix,
        quotation_prefix,
        challan_prefix,
        vat_enabled,
        vat_rate,
        default_currency,
        default_language,
        phone,
        whatsapp,
        email
    ) values (
        new.id,
        'INV',
        'QT',
        'CH',
        true,
        7.50,
        new.currency,
        new.default_locale,
        new.phone,
        new.whatsapp,
        new.email
    ) on conflict (company_id) do nothing;

    -- 2. Create main branch
    insert into public.branches (
        company_id,
        name,
        name_bn,
        code,
        phone,
        address,
        is_main,
        is_active
    ) values (
        new.id,
        'Head Office / Main Branch',
        'প্রধান শাখা / হেড অফিস',
        'MAIN-01',
        new.phone,
        new.address,
        true,
        true
    ) returning id into main_branch_id;

    -- 3. If an authenticated user initiated creation, register as active owner
    if auth.uid() is not null then
        insert into public.company_users (
            company_id,
            user_id,
            branch_id,
            status
        ) values (
            new.id,
            auth.uid(),
            main_branch_id,
            'active'
        ) returning id into new_company_user_id;

        -- Find owner role ID
        select id into owner_role_id
        from public.roles
        where slug = 'owner' and is_system = true
        limit 1;

        if owner_role_id is not null and new_company_user_id is not null then
            insert into public.user_roles (
                company_user_id,
                role_id,
                company_id
            ) values (
                new_company_user_id,
                owner_role_id,
                new.id
            ) on conflict do nothing;
        end if;
    end if;

    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_company_created_provision on public.companies;
create trigger on_company_created_provision
    after insert on public.companies
    for each row execute function public.handle_new_company_provisioning();
