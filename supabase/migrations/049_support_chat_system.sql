-- ==============================================================================
-- InkFlow SaaS - Migration 049: Enterprise Support Chat & Conversation System
-- Supports:
--   1. Tenant-isolated support conversations with human-friendly numbering (SUP-000001)
--   2. Realtime messages with strict distinction between public replies and internal notes
--   3. Secure attachment handling with tenant isolation
--   4. Granular RLS policies preventing cross-tenant leakage & protecting internal notes
--   5. Realtime replication publication and replica identity configuration
-- ==============================================================================

-- 1. SUPPORT CONVERSATIONS TABLE
create table if not exists public.support_conversations (
    id uuid primary key default gen_random_uuid(),
    ticket_number text not null unique,
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    created_by uuid references auth.users(id) on delete set null,
    created_by_name text not null,
    created_by_email text not null,
    assigned_to uuid references public.platform_admins(id) on delete set null,
    assigned_to_name text,
    subject text not null,
    status text not null default 'open' check (status in ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
    priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
    category text not null default 'general' check (category in (
        'account', 'billing', 'subscription', 'login', 'email', 'whatsapp', 'sms',
        'payment', 'invoice', 'production', 'inventory', 'attendance', 'technical',
        'bug_report', 'feature_request', 'general', 'other'
    )),
    source text not null default 'app' check (source in ('app', 'mobile', 'widget', 'system')),
    context_metadata jsonb not null default '{}'::jsonb,
    unread_tenant_count integer not null default 0,
    unread_platform_count integer not null default 1,
    last_message_at timestamptz not null default now(),
    last_message_preview text,
    last_message_by text,
    last_message_sender_type text default 'tenant_user' check (last_message_sender_type in ('tenant_user', 'platform_support', 'system')),
    first_response_at timestamptz,
    resolved_at timestamptz,
    resolved_by uuid references public.platform_admins(id) on delete set null,
    closed_at timestamptz,
    closed_by uuid,
    reopened_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_support_conversations_company on public.support_conversations(company_id);
create index if not exists idx_support_conversations_status on public.support_conversations(status);
create index if not exists idx_support_conversations_priority on public.support_conversations(priority);
create index if not exists idx_support_conversations_assigned on public.support_conversations(assigned_to);
create index if not exists idx_support_conversations_last_msg on public.support_conversations(last_message_at desc);
create index if not exists idx_support_conversations_created on public.support_conversations(created_at desc);
create index if not exists idx_support_conversations_ticket on public.support_conversations(ticket_number);

-- 2. SUPPORT MESSAGES TABLE
create table if not exists public.support_messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.support_conversations(id) on delete cascade,
    company_id uuid not null references public.companies(id) on delete cascade,
    sender_user_id uuid not null,
    sender_name text not null,
    sender_email text,
    sender_type text not null check (sender_type in ('tenant_user', 'platform_support', 'system')),
    message_type text not null default 'message' check (message_type in ('message', 'support_reply', 'internal_note', 'system_event')),
    body text not null,
    attachments jsonb not null default '[]'::jsonb,
    client_mutation_id text,
    read_at timestamptz,
    edited_at timestamptz,
    deleted_at timestamptz,
    created_at timestamptz not null default now()
);

-- Indexes for messages
create index if not exists idx_support_messages_conv on public.support_messages(conversation_id, created_at asc);
create index if not exists idx_support_messages_company on public.support_messages(company_id);
create index if not exists idx_support_messages_type on public.support_messages(message_type);
create index if not exists idx_support_messages_created on public.support_messages(created_at asc);
create index if not exists idx_support_messages_mutation on public.support_messages(client_mutation_id);

-- 3. SUPPORT ATTACHMENTS TABLE
create table if not exists public.support_attachments (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.support_conversations(id) on delete cascade,
    message_id uuid references public.support_messages(id) on delete cascade,
    company_id uuid not null references public.companies(id) on delete cascade,
    uploaded_by uuid not null,
    file_name text not null,
    file_size integer not null,
    mime_type text not null,
    storage_path text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_support_attachments_conv on public.support_attachments(conversation_id);
create index if not exists idx_support_attachments_msg on public.support_attachments(message_id);
create index if not exists idx_support_attachments_company on public.support_attachments(company_id);

-- 4. SEQUENCE GENERATOR FOR SUPPORT TICKET NUMBERS (SUP-000001)
create sequence if not exists public.support_ticket_number_seq start with 1 increment by 1;

create or replace function public.get_next_support_ticket_number()
returns text as $$
declare
    v_next_val bigint;
begin
    v_next_val := nextval('public.support_ticket_number_seq');
    return 'SUP-' || lpad(v_next_val::text, 6, '0');
end;
$$ language plpgsql security definer;

-- 5. ENABLE ROW LEVEL SECURITY
alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_attachments enable row level security;

-- 6. RLS POLICIES FOR SUPPORT CONVERSATIONS

-- Tenant Users: can view their company's conversations
create policy "Tenant users can view own company conversations"
    on public.support_conversations for select
    using (
        public.auth_is_active_company_user(company_id)
        or exists (
            select 1 from public.company_users cu
            where cu.company_id = support_conversations.company_id
              and cu.user_id = auth.uid()
              and cu.status = 'active'
        )
    );

-- Tenant Users: can insert conversations for their own company
create policy "Tenant users can create conversations for own company"
    on public.support_conversations for insert
    with check (
        public.auth_is_active_company_user(company_id)
        or exists (
            select 1 from public.company_users cu
            where cu.company_id = support_conversations.company_id
              and cu.user_id = auth.uid()
              and cu.status = 'active'
        )
    );

-- Tenant Users: can update own company conversations (e.g. close/reopen or update unread)
create policy "Tenant users can update own company conversations"
    on public.support_conversations for update
    using (
        public.auth_is_active_company_user(company_id)
        or exists (
            select 1 from public.company_users cu
            where cu.company_id = support_conversations.company_id
              and cu.user_id = auth.uid()
              and cu.status = 'active'
        )
    );

-- Platform Admins: full control over support conversations
create policy "Platform admins have full control on support conversations"
    on public.support_conversations for all
    using (
        public.auth_is_platform_owner()
        or exists (
            select 1 from public.platform_admins pa
            where pa.user_id = auth.uid()
              and pa.is_active = true
        )
    );

-- 7. RLS POLICIES FOR SUPPORT MESSAGES

-- Tenant Users: can view messages in their company's conversations EXCEPT internal notes
create policy "Tenant users can view public messages in own conversations"
    on public.support_messages for select
    using (
        message_type != 'internal_note'
        and deleted_at is null
        and (
            public.auth_is_active_company_user(company_id)
            or exists (
                select 1 from public.company_users cu
                where cu.company_id = support_messages.company_id
                  and cu.user_id = auth.uid()
                  and cu.status = 'active'
            )
        )
    );

-- Tenant Users: can insert customer messages into own company conversations
create policy "Tenant users can insert messages into own conversations"
    on public.support_messages for insert
    with check (
        sender_type = 'tenant_user'
        and message_type = 'message'
        and (
            public.auth_is_active_company_user(company_id)
            or exists (
                select 1 from public.company_users cu
                where cu.company_id = support_messages.company_id
                  and cu.user_id = auth.uid()
                  and cu.status = 'active'
            )
        )
    );

-- Platform Admins: full control on messages (including internal notes)
create policy "Platform admins have full control on support messages"
    on public.support_messages for all
    using (
        public.auth_is_platform_owner()
        or exists (
            select 1 from public.platform_admins pa
            where pa.user_id = auth.uid()
              and pa.is_active = true
        )
    );

-- 8. RLS POLICIES FOR SUPPORT ATTACHMENTS

create policy "Tenant users can view own company support attachments"
    on public.support_attachments for select
    using (
        public.auth_is_active_company_user(company_id)
        or exists (
            select 1 from public.company_users cu
            where cu.company_id = support_attachments.company_id
              and cu.user_id = auth.uid()
              and cu.status = 'active'
        )
    );

create policy "Tenant users can insert own company support attachments"
    on public.support_attachments for insert
    with check (
        public.auth_is_active_company_user(company_id)
        or exists (
            select 1 from public.company_users cu
            where cu.company_id = support_attachments.company_id
              and cu.user_id = auth.uid()
              and cu.status = 'active'
        )
    );

create policy "Platform admins have full control on support attachments"
    on public.support_attachments for all
    using (
        public.auth_is_platform_owner()
        or exists (
            select 1 from public.platform_admins pa
            where pa.user_id = auth.uid()
              and pa.is_active = true
        )
    );

-- 9. REALTIME SYNCHRONIZATION SETUP
alter table public.support_conversations replica identity full;
alter table public.support_messages replica identity full;
alter table public.support_attachments replica identity full;

do $$
begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
        if not exists (
            select 1 from pg_publication_tables 
            where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'support_conversations'
        ) then
            alter publication supabase_realtime add table public.support_conversations;
        end if;

        if not exists (
            select 1 from pg_publication_tables 
            where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'support_messages'
        ) then
            alter publication supabase_realtime add table public.support_messages;
        end if;

        if not exists (
            select 1 from pg_publication_tables 
            where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'support_attachments'
        ) then
            alter publication supabase_realtime add table public.support_attachments;
        end if;
    end if;
end $$;
