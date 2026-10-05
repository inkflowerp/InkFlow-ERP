-- ==============================================================================
-- PrintFlow SaaS - Migration 113: Authoritative RBAC Matrix & Role Permissions Seeding
-- Implements single source of truth from docs/hardening/permission-matrix.md
-- 1. Cleans up phantom / unused legacy permissions.
-- 2. Adds active application permissions (products, pricing, design, tasks, support, audit).
-- 3. Ensures global and tenant system roles exist.
-- 4. Seeds public.role_permissions for all roles.
-- 5. Implements server-side PostgreSQL authorization & branch scoping helpers.
-- ==============================================================================

BEGIN;

-- 1. PRUNE PHANTOM / OBSOLETE PERMISSIONS
DELETE FROM public.role_permissions
WHERE permission_id IN (
    SELECT id FROM public.permissions WHERE code IN (
        'settings.delete', 'settings.approve', 'settings.full_control',
        'reports.delete', 'reports.create', 'reports.edit', 'reports.approve', 'reports.full_control',
        'customer.approve', 'customer.full_control',
        'supplier.approve', 'supplier.full_control', 'supplier.delete',
        'inventory.delete', 'inventory.full_control',
        'purchase.delete', 'purchase.full_control', 'purchase.approve',
        'hr.delete', 'hr.full_control',
        'delivery.delete', 'delivery.full_control', 'delivery.approve',
        'production.full_control', 'production.delete',
        'order.full_control', 'order.delete',
        'quotation.full_control', 'quotation.delete',
        'invoice.full_control', 'invoice.delete',
        'payment.full_control', 'payment.delete',
        'payroll.full_control', 'payroll.delete', 'payroll.create'
    )
);

DELETE FROM public.user_permission_overrides
WHERE permission_id IN (
    SELECT id FROM public.permissions WHERE code IN (
        'settings.delete', 'settings.approve', 'settings.full_control',
        'reports.delete', 'reports.create', 'reports.edit', 'reports.approve', 'reports.full_control',
        'customer.approve', 'customer.full_control',
        'supplier.approve', 'supplier.full_control', 'supplier.delete',
        'inventory.delete', 'inventory.full_control',
        'purchase.delete', 'purchase.full_control', 'purchase.approve',
        'hr.delete', 'hr.full_control',
        'delivery.delete', 'delivery.full_control', 'delivery.approve',
        'production.full_control', 'production.delete',
        'order.full_control', 'order.delete',
        'quotation.full_control', 'quotation.delete',
        'invoice.full_control', 'invoice.delete',
        'payment.full_control', 'payment.delete',
        'payroll.full_control', 'payroll.delete', 'payroll.create'
    )
);

DELETE FROM public.permissions WHERE code IN (
    'settings.delete', 'settings.approve', 'settings.full_control',
    'reports.delete', 'reports.create', 'reports.edit', 'reports.approve', 'reports.full_control',
    'customer.approve', 'customer.full_control',
    'supplier.approve', 'supplier.full_control', 'supplier.delete',
    'inventory.delete', 'inventory.full_control',
    'purchase.delete', 'purchase.full_control', 'purchase.approve',
    'hr.delete', 'hr.full_control',
    'delivery.delete', 'delivery.full_control', 'delivery.approve',
    'production.full_control', 'production.delete',
    'order.full_control', 'order.delete',
    'quotation.full_control', 'quotation.delete',
    'invoice.full_control', 'invoice.delete',
    'payment.full_control', 'payment.delete',
    'payroll.full_control', 'payroll.delete', 'payroll.create'
);

-- 2. INSERT ACTIVE / CANONICAL APPLICATION PERMISSIONS
INSERT INTO public.permissions (code, module, resource, action, name, description) VALUES
-- Products & Catalog
('products.view', 'products', 'products', 'view', 'View Products & Services', 'View catalog tariffs, items, and unit specifications'),
('products.create', 'products', 'products', 'create', 'Create Products', 'Add new standard catalog products and custom fabrication specs'),
('products.edit', 'products', 'products', 'edit', 'Edit Products', 'Modify product details, categories, minimum margins, and dimensions'),
('products.delete', 'products', 'products', 'delete', 'Archive Products', 'Archive or deactivate catalog products'),
('products.manage', 'products', 'products', 'full_control', 'Manage Products & Tariffs', 'Full administrative authority over product catalogue'),
('products.export', 'products', 'products', 'view', 'Export Products', 'Export product and rate sheet data'),

-- Pricing & Floor Margins
('pricing.view', 'pricing', 'pricing', 'view', 'View Pricing Rules', 'View rate cards, volume discount matrices, and base pricing'),
('pricing.create', 'pricing', 'pricing', 'create', 'Create Pricing Rules', 'Add customer contract pricing and tiered discount schedules'),
('pricing.edit', 'pricing', 'pricing', 'edit', 'Edit Pricing Rules', 'Modify square foot rates, minimum margins, and calculation formulas'),
('pricing.delete', 'pricing', 'pricing', 'delete', 'Delete Pricing Rules', 'Remove custom pricing rule cards and contracts'),
('pricing.approve', 'pricing', 'pricing', 'approve', 'Approve Special Rates', 'Authorize custom rates below standard catalog tariff'),
('pricing.manage', 'pricing', 'pricing', 'full_control', 'Manage Pricing Engine', 'Administrative control over company pricing configurations'),
('pricing.export', 'pricing', 'pricing', 'view', 'Export Pricing', 'Export price cards and discount formulas'),
('pricing.price_override', 'pricing', 'pricing', 'approve', 'Override Floor Price', 'Authorize below-floor-margin manual price discounts on orders'),

-- Graphic Design & Pre-press Proofs
('design.view', 'design', 'design', 'view', 'View Design Queue', 'Access prepress artwork queue, proof approvals, and customer files'),
('design.create', 'design', 'design', 'create', 'Upload Artwork', 'Upload customer artwork files, proofs, and specifications'),
('design.edit', 'design', 'design', 'edit', 'Edit Design Details', 'Modify design notes, version descriptions, and attachments'),
('design.approve', 'design', 'design', 'approve', 'Approve Proofs', 'Approve artwork proofs for production platemaking and printing'),
('design.download', 'design', 'design', 'view', 'Download Artwork Files', 'Download high-resolution customer artwork (AI, PDF, TIFF)'),
('design.send', 'design', 'design', 'edit', 'Send Proofs to Client', 'Dispatch proof verification links via WhatsApp, SMS, or Email'),

-- Tasks & Operations
('tasks.view', 'tasks', 'tasks', 'view', 'View Assigned Tasks', 'Access daily operational checklist and assigned tasks'),
('tasks.complete', 'tasks', 'tasks', 'edit', 'Complete Tasks', 'Mark assigned tasks and operational milestones as completed'),

-- Notifications & Audit
('notifications.view', 'notifications', 'notifications', 'view', 'View Notifications', 'View internal job notifications and operational alerts'),
('audit.view', 'audit', 'audit', 'view', 'View Audit Logs', 'View administrative governance and security audit events'),

-- Support
('support.view', 'support', 'support', 'view', 'View Support Tickets', 'Access live support chat and ticket history'),
('support.create', 'support', 'support', 'create', 'Open Support Ticket', 'Submit assistance tickets and inquiries to platform support'),
('support.edit', 'support', 'support', 'edit', 'Update Support Ticket', 'Reply to support inquiries and update diagnostic logs'),
('support.delete', 'support', 'support', 'delete', 'Close Support Ticket', 'Resolve and archive support inquiries'),
('support.manage', 'support', 'support', 'full_control', 'Manage Support Access', 'Configure tenant platform support session authorizations'),

-- Branches & Settings
('branches.view', 'branches', 'branches', 'view', 'View Branches', 'View company branches, factory floors, and outlets'),
('branches.create', 'branches', 'branches', 'create', 'Create Branches', 'Provision new commercial branches and workshops'),
('branches.edit', 'branches', 'branches', 'edit', 'Edit Branches', 'Modify branch operational parameters, phones, and addresses'),
('branches.delete', 'branches', 'branches', 'delete', 'Archive Branches', 'Archive or deactivate existing branch locations'),
('branches.manage', 'branches', 'branches', 'full_control', 'Manage All Branches', 'Full administrative authority over physical locations'),
('settings.manage', 'settings', 'settings', 'full_control', 'Manage Settings', 'Full organizational settings and tax/document numbering setup'),

-- Canonical Plural Codes (Matching Active Server Action Wrappers)
('customers.view', 'customers', 'customers', 'view', 'View Customers', 'View customer directory and accounts'),
('customers.create', 'customers', 'customers', 'create', 'Create Customers', 'Add new customer profiles and credit limits'),
('customers.edit', 'customers', 'customers', 'edit', 'Edit Customers', 'Modify customer contact info and credit limits'),
('customers.delete', 'customers', 'customers', 'delete', 'Delete Customers', 'Archive or delete customer accounts'),
('customers.export', 'customers', 'customers', 'view', 'Export Customers', 'Export customer directories and statements'),

('quotations.view', 'quotations', 'quotations', 'view', 'View Quotations', 'View price quotations and estimates'),
('quotations.create', 'quotations', 'quotations', 'create', 'Create Quotations', 'Generate square foot rate estimates and quotes'),
('quotations.edit', 'quotations', 'quotations', 'edit', 'Edit Quotations', 'Modify quotation quantities, line items, and terms'),
('quotations.approve', 'quotations', 'quotations', 'approve', 'Approve Quotations', 'Authorize quotations for client confirmation'),
('quotations.send', 'quotations', 'quotations', 'edit', 'Send Quotations', 'Dispatch quotations to client via WhatsApp / Email'),
('quotations.print', 'quotations', 'quotations', 'view', 'Print Quotations', 'Generate printable quotation PDF documents'),

('orders.view', 'orders', 'orders', 'view', 'View Work Orders', 'View job orders across assigned branches'),
('orders.create', 'orders', 'orders', 'create', 'Create Work Orders', 'Book new print and fabrication job orders'),
('orders.edit', 'orders', 'orders', 'edit', 'Edit Work Orders', 'Modify job order specifications and quantities'),
('orders.delete', 'orders', 'orders', 'delete', 'Cancel Work Orders', 'Cancel or archive job orders'),
('orders.assign', 'orders', 'orders', 'edit', 'Assign Orders', 'Assign orders to designers, operators, or branches'),
('orders.complete', 'orders', 'orders', 'edit', 'Complete Orders', 'Mark jobs as produced, QC inspected, and ready'),
('orders.cancel', 'orders', 'orders', 'edit', 'Cancel Orders', 'Cancel order with cancellation reason'),
('orders.print', 'orders', 'orders', 'view', 'Print Work Orders', 'Print production job tickets and job cards'),

('invoices.view', 'invoices', 'invoices', 'view', 'View Invoices', 'View commercial bills and tax invoices'),
('invoices.create', 'invoices', 'invoices', 'create', 'Create Invoices', 'Generate commercial invoices and VAT receipts'),
('invoices.edit', 'invoices', 'invoices', 'edit', 'Edit Invoices', 'Modify invoice line items and remarks'),
('invoices.approve', 'invoices', 'invoices', 'approve', 'Approve Invoices', 'Authorize confirmed sales invoices'),
('invoices.print', 'invoices', 'invoices', 'view', 'Print Invoices', 'Generate and print PDF invoices'),
('invoices.download', 'invoices', 'invoices', 'view', 'Download Invoices', 'Download invoice PDF documents'),
('invoices.send', 'invoices', 'invoices', 'edit', 'Send Invoices', 'Dispatch invoices via WhatsApp / Email'),

('payments.view', 'payments', 'payments', 'view', 'View Payments', 'View payment receipts and cash entries'),
('payments.create', 'payments', 'payments', 'create', 'Record Payments', 'Record cash, bKash, and bank payment receipts'),
('payments.edit', 'payments', 'payments', 'edit', 'Edit Payments', 'Modify payment transaction notes'),
('payments.print', 'payments', 'payments', 'view', 'Print Money Receipts', 'Print Money Receipt (MR) vouchers')

ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    module = EXCLUDED.module,
    resource = EXCLUDED.resource,
    action = EXCLUDED.action;

-- 3. ENSURE GLOBAL SYSTEM ROLES (company_id IS NULL)
INSERT INTO public.roles (id, company_id, name, name_bn, slug, description, is_system, is_active) VALUES
('00000000-0000-0000-0000-000000000001', null, 'Business Owner', 'প্রতিষ্ঠানের মালিক', 'business_owner', 'Universal organization access: P&L, accounts, reports, HR, settings, and deletion', true, true),
('00000000-0000-0000-0000-000000000002', null, 'Branch Manager', 'শাখা ব্যবস্থাপক', 'branch_manager', 'Local branch operations, sales orders, counter collections, local workforce and stock', true, true),
('00000000-0000-0000-0000-000000000003', null, 'Sales Manager', 'সেলস ম্যানেজার', 'sales_manager', 'Customers, leads, price quotations, job order booking, advance collection, and delivery', true, true),
('00000000-0000-0000-0000-000000000004', null, 'Graphic Designer', 'গ্রাফিক ডিজাইনার (প্রিপ প্রেস)', 'designer', 'Pre-press design queue, artwork uploads (AI/PDF), proof approval, and revision logs', true, true),
('00000000-0000-0000-0000-000000000005', null, 'Production Manager', 'প্রোডাকশন ম্যানেজার', 'production_manager', 'Floor scheduling, machine allocation, materials issuance, finishing, and installation', true, true),
('00000000-0000-0000-0000-000000000006', null, 'Print Operator', 'মেশিন অপারেটর', 'operator', 'Assigned jobs, printing execution, material consumption logging, and QC completion', true, true),
('00000000-0000-0000-0000-000000000007', null, 'General Staff', 'সাধারণ কর্মী', 'general_staff', 'Restricted access based strictly on assigned duties and user overrides', true, true),
('00000000-0000-0000-0000-000000000008', null, 'Accountant', 'হিসাবরক্ষক', 'accountant', 'Invoices, money receipts (MR), payments, billing & P&L reports', true, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    name_bn = EXCLUDED.name_bn,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    is_system = EXCLUDED.is_system,
    is_active = EXCLUDED.is_active;

-- Ensure system roles exist for all tenant companies as well
INSERT INTO public.roles (company_id, name, name_bn, slug, description, is_system, is_active)
SELECT c.id, sr.name, sr.name_bn, sr.slug, sr.description, true, true
FROM public.companies c
CROSS JOIN (
    SELECT 'Business Owner' AS name, 'প্রতিষ্ঠানের মালিক' AS name_bn, 'business_owner' AS slug, 'Universal organization access' AS description
    UNION ALL SELECT 'Branch Manager', 'শাখা ব্যবস্থাপক', 'branch_manager', 'Local branch operations and sales'
    UNION ALL SELECT 'Sales Manager', 'সেলস ম্যানেজার', 'sales_manager', 'Customers, quotes, orders, counter billing'
    UNION ALL SELECT 'Graphic Designer', 'গ্রাফিক ডিজাইনার', 'designer', 'Pre-press queue and artwork approvals'
    UNION ALL SELECT 'Production Manager', 'প্রোডাকশন ম্যানেজার', 'production_manager', 'Floor scheduling and machine allocations'
    UNION ALL SELECT 'Print Operator', 'মেশিন অপারেটর', 'operator', 'Machine runs and consumption logs'
    UNION ALL SELECT 'General Staff', 'সাধারণ কর্মী', 'general_staff', 'Restricted personal self-service'
    UNION ALL SELECT 'Accountant', 'হিসাবরক্ষক', 'accountant', 'Financial billing and accounts'
) sr
ON CONFLICT DO NOTHING;

-- 4. SEED ROLE PERMISSIONS (FROM APPROVED MATRIX)
-- Clean existing role permissions to rebuild authoritatively
DELETE FROM public.role_permissions;

-- 4.1 BUSINESS OWNER: Full access to everything
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.slug = 'business_owner';

-- 4.2 BRANCH MANAGER: Branch-scoped operations
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.slug = 'branch_manager'
  AND (
    p.code IN (
      'branch.view', 'branch.transfer.request', 'branch.transfer.approve', 'branch.transfer.dispatch', 'branch.transfer.receive',
      'branches.view',
      'users.view',
      'reports.view',
      'customer.view', 'customer.create', 'customer.edit',
      'customers.view', 'customers.create', 'customers.edit', 'customers.export',
      'quotation.view', 'quotation.create', 'quotation.edit', 'quotation.approve',
      'quotations.view', 'quotations.create', 'quotations.edit', 'quotations.send', 'quotations.print',
      'order.view', 'order.create', 'order.edit', 'order.approve',
      'orders.view', 'orders.create', 'orders.edit', 'orders.assign', 'orders.complete', 'orders.print',
      'design.view', 'design.download', 'design.send',
      'invoice.view', 'invoice.create', 'invoice.edit', 'invoice.approve',
      'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.cancel', 'invoices.print', 'invoices.download', 'invoices.send',
      'payment.view', 'payment.create', 'payment.edit', 'payment.approve',
      'payments.view', 'payments.create', 'payments.edit', 'payments.print',
      'production.view', 'production.create', 'production.edit', 'production.approve',
      'machineries.view', 'machineries.status', 'machineries.breakdown',
      'delivery.view', 'delivery.create', 'delivery.edit', 'delivery.approve',
      'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.approve',
      'purchase.view', 'purchase.create',
      'supplier.view',
      'hr.view', 'hr.create', 'hr.edit',
      'tasks.view', 'tasks.complete',
      'notifications.view',
      'support.view', 'support.create', 'support.edit',
      'whatsapp.view', 'whatsapp.send', 'whatsapp.send_customer',
      'products.view', 'pricing.view'
    )
  );

-- 4.3 SALES MANAGER: Sales, Quotes, Orders, CRM, Advance Collections
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.slug = 'sales_manager'
  AND (
    p.code IN (
      'customer.view', 'customer.create', 'customer.edit',
      'customers.view', 'customers.create', 'customers.edit', 'customers.export',
      'quotation.view', 'quotation.create', 'quotation.edit', 'quotation.approve',
      'quotations.view', 'quotations.create', 'quotations.edit', 'quotations.approve', 'quotations.send', 'quotations.print',
      'order.view', 'order.create', 'order.edit', 'order.approve',
      'orders.view', 'orders.create', 'orders.edit', 'orders.assign', 'orders.print',
      'invoice.view', 'invoice.create', 'invoice.edit', 'invoice.approve',
      'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.print', 'invoices.download', 'invoices.send',
      'payment.view', 'payment.create',
      'payments.view', 'payments.create', 'payments.print',
      'delivery.view', 'delivery.create', 'delivery.edit',
      'reports.view',
      'settings.view',
      'users.view',
      'products.view', 'products.create', 'products.edit', 'products.export',
      'pricing.view', 'pricing.create', 'pricing.edit', 'pricing.manage',
      'design.view', 'design.download', 'design.send',
      'production.view',
      'machineries.view',
      'inventory.view',
      'tasks.view', 'tasks.complete',
      'notifications.view',
      'support.view', 'support.create', 'support.edit',
      'whatsapp.view', 'whatsapp.send', 'whatsapp.send_customer', 'whatsapp.conversations'
    )
  );

-- 4.4 GRAPHIC DESIGNER: Prepress, proofs, artwork download, read orders
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.slug = 'designer'
  AND (
    p.code IN (
      'design.view', 'design.create', 'design.edit', 'design.approve', 'design.download', 'design.send',
      'order.view', 'order.edit',
      'orders.view', 'orders.edit', 'orders.print',
      'quotation.view', 'quotations.view',
      'customer.view', 'customers.view',
      'production.view',
      'machineries.view',
      'products.view', 'pricing.view',
      'tasks.view', 'tasks.complete',
      'notifications.view',
      'support.view', 'support.create',
      'hr.view'
    )
  );

-- 4.5 PRODUCTION MANAGER: Floor, machine scheduling, materials, stock adjustments, QC
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.slug = 'production_manager'
  AND (
    p.code IN (
      'production.view', 'production.create', 'production.edit', 'production.approve',
      'machineries.view', 'machineries.create', 'machineries.edit', 'machineries.assign', 'machineries.status', 'machineries.maintenance', 'machineries.breakdown', 'machineries.resolve_breakdown', 'machineries.cost_view', 'machineries.export',
      'order.view', 'order.edit', 'order.approve',
      'orders.view', 'orders.edit', 'orders.print',
      'design.view', 'design.download',
      'delivery.view', 'delivery.create', 'delivery.edit',
      'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.approve', 'inventory.adjust',
      'purchase.view', 'purchase.create', 'purchase.edit',
      'supplier.view', 'supplier.create', 'supplier.edit', 'supplier.approve',
      'reports.view',
      'customer.view', 'customers.view',
      'quotation.view', 'quotations.view',
      'products.view', 'products.create', 'products.edit',
      'pricing.view',
      'users.view',
      'hr.view',
      'tasks.view', 'tasks.complete',
      'notifications.view',
      'support.view', 'support.create', 'support.edit',
      'whatsapp.send_employee'
    )
  );

-- 4.6 PRINT OPERATOR: Assigned machine runs, stage completion, material consumption, breakdown reporting
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.slug = 'operator'
  AND (
    p.code IN (
      'production.view', 'production.edit',
      'machineries.view', 'machineries.status', 'machineries.breakdown',
      'order.view',
      'orders.view',
      'design.view', 'design.download',
      'inventory.view',
      'tasks.view', 'tasks.complete',
      'notifications.view',
      'support.view', 'support.create',
      'hr.view'
    )
  );

-- 4.7 GENERAL STAFF: Personal self-service, assigned tasks, notifications
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.slug = 'general_staff'
  AND (
    p.code IN (
      'order.view',
      'orders.view',
      'tasks.view', 'tasks.complete',
      'notifications.view',
      'support.view', 'support.create',
      'hr.view'
    )
  );

-- 4.8 ACCOUNTANT (Specialized Responsibility Preset)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.slug = 'accountant'
  AND (
    p.code IN (
      'invoice.view', 'invoice.create', 'invoice.edit', 'invoice.approve',
      'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.approve', 'invoices.cancel', 'invoices.print', 'invoices.download', 'invoices.send',
      'payment.view', 'payment.create', 'payment.edit', 'payment.approve',
      'payments.view', 'payments.create', 'payments.edit', 'payments.delete', 'payments.print',
      'reports.view', 'reports.export',
      'customer.view', 'customer.edit',
      'customers.view', 'customers.edit',
      'quotation.view', 'quotations.view',
      'order.view', 'orders.view',
      'delivery.view',
      'inventory.view',
      'purchase.view',
      'supplier.view',
      'salary.edit', 'salary.approve',
      'payroll.view', 'payroll.approve', 'payroll.pay',
      'hr.view', 'hr.create', 'hr.edit', 'hr.approve',
      'tasks.view', 'tasks.complete',
      'notifications.view',
      'support.view', 'support.create'
    )
  );

-- 5. SERVER-SIDE POSTGRESQL AUTHORIZATION & BRANCH SCOPING HELPERS

-- 5.1 Helper: Get User Authorized Branches for Company
CREATE OR REPLACE FUNCTION public.auth_get_user_authorized_branches(p_company_id uuid)
RETURNS TABLE (branch_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    -- If user is Business Owner, they have access to all branches
    SELECT b.id AS branch_id
    FROM public.branches b
    WHERE b.company_id = p_company_id
      AND (
          EXISTS (
              SELECT 1 FROM public.company_users cu
              WHERE cu.company_id = p_company_id
                AND cu.user_id = auth.uid()
                AND cu.status = 'active'
                AND (
                    'business_owner' = ANY(cu.responsibilities)
                    OR 'owner' = ANY(cu.responsibilities)
                    OR EXISTS (
                        SELECT 1 FROM public.user_roles ur
                        JOIN public.roles r ON ur.role_id = r.id
                        WHERE ur.company_user_id = cu.id
                          AND r.slug = 'business_owner'
                    )
                )
          )
          OR EXISTS (
              SELECT 1 FROM public.companies comp
              WHERE comp.id = p_company_id
                AND comp.owner_id = auth.uid()
          )
      )
    UNION
    -- User's primary branch from company_users
    SELECT cu.branch_id
    FROM public.company_users cu
    WHERE cu.company_id = p_company_id
      AND cu.user_id = auth.uid()
      AND cu.status = 'active'
      AND cu.branch_id IS NOT NULL
    UNION
    -- User's assigned additional branches from user_branch_access
    SELECT uba.branch_id
    FROM public.user_branch_access uba
    WHERE uba.company_id = p_company_id
      AND uba.user_id = auth.uid();
$$;

-- 5.2 Helper: Authoritative Effective Permission Checker in SQL
CREATE OR REPLACE FUNCTION public.auth_user_has_effective_permission(
    p_company_id uuid,
    p_permission_code text,
    p_branch_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_is_owner boolean := false;
    v_has_perm boolean := false;
    v_has_override boolean := false;
    v_override_val boolean := false;
    v_has_branch_access boolean := false;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;

    -- 1. Check Platform Owner bypass
    IF EXISTS (
        SELECT 1 FROM public.platform_admins
        WHERE user_id = v_user_id AND is_active = true
    ) THEN
        RETURN true;
    END IF;

    -- 2. Check Business Owner status
    SELECT (comp.owner_id = v_user_id) INTO v_is_owner
    FROM public.companies comp
    WHERE comp.id = p_company_id;

    IF v_is_owner IS TRUE THEN
        RETURN true;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.company_users cu
        LEFT JOIN public.user_roles ur ON ur.company_user_id = cu.id
        LEFT JOIN public.roles r ON ur.role_id = r.id
        WHERE cu.company_id = p_company_id
          AND cu.user_id = v_user_id
          AND cu.status = 'active'
          AND (
              'business_owner' = ANY(cu.responsibilities)
              OR 'owner' = ANY(cu.responsibilities)
              OR r.slug = 'business_owner'
          )
    ) THEN
        RETURN true;
    END IF;

    -- 3. Check User-Level Overrides (Highest Precedence)
    SELECT true, upo.is_granted INTO v_has_override, v_override_val
    FROM public.user_permission_overrides upo
    JOIN public.company_users cu ON upo.company_user_id = cu.id
    JOIN public.permissions p ON upo.permission_id = p.id
    WHERE cu.company_id = p_company_id
      AND cu.user_id = v_user_id
      AND cu.status = 'active'
      AND (p.code = p_permission_code OR p.code = split_part(p_permission_code, '.', 1) || '.full_control')
    ORDER BY upo.is_granted DESC
    LIMIT 1;

    IF v_has_override IS TRUE THEN
        IF v_override_val IS FALSE THEN
            RETURN false; -- Explicit deny
        END IF;
        -- Explicit grant -> proceed to branch check if applicable
        v_has_perm := true;
    END IF;

    -- 4. Check Role Permissions
    IF v_has_perm IS FALSE THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.company_users cu
            JOIN public.user_roles ur ON ur.company_user_id = cu.id
            JOIN public.roles r ON ur.role_id = r.id
            JOIN public.role_permissions rp ON rp.role_id = r.id
            JOIN public.permissions p ON rp.permission_id = p.id
            WHERE cu.company_id = p_company_id
              AND cu.user_id = v_user_id
              AND cu.status = 'active'
              AND r.is_active = true
              AND (
                  p.code = p_permission_code
                  OR p.code = split_part(p_permission_code, '.', 1) || '.full_control'
                  OR (p_permission_code LIKE 'orders.%' AND p.code = replace(p_permission_code, 'orders.', 'order.'))
                  OR (p_permission_code LIKE 'order.%' AND p.code = replace(p_permission_code, 'order.', 'orders.'))
                  OR (p_permission_code LIKE 'invoices.%' AND p.code = replace(p_permission_code, 'invoices.', 'invoice.'))
                  OR (p_permission_code LIKE 'invoice.%' AND p.code = replace(p_permission_code, 'invoice.', 'invoices.'))
                  OR (p_permission_code LIKE 'customers.%' AND p.code = replace(p_permission_code, 'customers.', 'customer.'))
                  OR (p_permission_code LIKE 'customer.%' AND p.code = replace(p_permission_code, 'customer.', 'customers.'))
                  OR (p_permission_code LIKE 'quotations.%' AND p.code = replace(p_permission_code, 'quotations.', 'quotation.'))
                  OR (p_permission_code LIKE 'quotation.%' AND p.code = replace(p_permission_code, 'quotation.', 'quotations.'))
              )
        ) INTO v_has_perm;
    END IF;

    IF v_has_perm IS NOT TRUE THEN
        RETURN false;
    END IF;

    -- 5. Branch Scope Validation if branch specified
    IF p_branch_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.auth_get_user_authorized_branches(p_company_id) ub
            WHERE ub.branch_id = p_branch_id
        ) INTO v_has_branch_access;

        RETURN v_has_branch_access;
    END IF;

    RETURN true;
END;
$$;

-- 5.3 Update existing auth_user_has_permission to use the new engine
CREATE OR REPLACE FUNCTION public.auth_user_has_permission(
    target_company_id uuid,
    required_permission text
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT public.auth_user_has_effective_permission(target_company_id, required_permission, NULL);
$$;

COMMIT;
