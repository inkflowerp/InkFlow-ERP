-- ==============================================================================
-- PrintERP SaaS - Multi-Tenant Row Level Security (RLS) Policies (003)
-- Ensures strict multi-tenant isolation across all organizations
-- ==============================================================================

-- Enable RLS on all tables
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.audit_logs enable row level security;
alter table public.divisions enable row level security;
alter table public.districts enable row level security;
alter table public.upazilas enable row level security;

-- 1. PUBLIC REFERENCE TABLES (Divisions, Districts, Upazilas)
-- Read-only access for all authenticated and anon users
create policy "Allow read access to divisions"
    on public.divisions for select
    using (true);

create policy "Allow read access to districts"
    on public.districts for select
    using (true);

create policy "Allow read access to upazilas"
    on public.upazilas for select
    using (true);

-- 2. SECURITY HELPER FUNCTIONS
create or replace function public.auth_user_has_company_access(target_company_id uuid)
returns boolean as $$
begin
    return exists (
        select 1
        from public.tenant_memberships
        where company_id = target_company_id
          and user_id = auth.uid()
          and is_active = true
    );
end;
$$ language plpgsql security definer;

create or replace function public.auth_user_get_role(target_company_id uuid)
returns text as $$
declare
    user_role text;
begin
    select role into user_role
    from public.tenant_memberships
    where company_id = target_company_id
      and user_id = auth.uid()
      and is_active = true
    limit 1;
    return user_role;
end;
$$ language plpgsql security definer;

-- 3. PROFILES POLICIES
-- Users can view and update their own profile
create policy "Users can view own profile"
    on public.profiles for select
    using (auth.uid() = id);

create policy "Users can update own profile"
    on public.profiles for update
    using (auth.uid() = id);

create policy "Users can insert own profile"
    on public.profiles for insert
    with check (auth.uid() = id);

-- 4. COMPANIES (TENANTS) POLICIES
-- Users can view companies they belong to
create policy "Members can view company details"
    on public.companies for select
    using (public.auth_user_has_company_access(id));

-- Only owners and admins can update company details
create policy "Owners and Admins can update company"
    on public.companies for update
    using (public.auth_user_get_role(id) in ('owner', 'admin'));

-- Any authenticated user can create a new company (for onboarding)
create policy "Authenticated users can create companies"
    on public.companies for insert
    with check (auth.uid() is not null);

-- 5. TENANT MEMBERSHIPS POLICIES
-- Users can see memberships for companies they belong to
create policy "Members can view company members"
    on public.tenant_memberships for select
    using (public.auth_user_has_company_access(company_id));

-- Users can also see their own memberships anywhere (to list companies)
create policy "Users can view own memberships"
    on public.tenant_memberships for select
    using (auth.uid() = user_id);

-- Owners and Admins can manage memberships (invite, remove, update roles)
create policy "Admins can manage company memberships"
    on public.tenant_memberships for all
    using (public.auth_user_get_role(company_id) in ('owner', 'admin'));

-- Creator of a company can add their own owner membership
create policy "Company creators can insert owner membership"
    on public.tenant_memberships for insert
    with check (
        auth.uid() = user_id 
        and role = 'owner'
    );

-- 6. AUDIT LOGS POLICIES
-- Members can view audit logs for their company if admin/owner
create policy "Admins can view company audit logs"
    on public.audit_logs for select
    using (public.auth_user_get_role(company_id) in ('owner', 'admin'));

create policy "System and users can insert audit logs"
    on public.audit_logs for insert
    with check (public.auth_user_has_company_access(company_id));
