/**
 * Seed Script: Test Tenants Dataset for Multi-Tenant Isolation Testing
 * 
 * Creates 3 distinct tenants (Tenant A, Tenant B, Tenant C) with:
 * - 5 Roles & Users each (Owner, Accountant, Operator, Designer, Employee)
 * - Branches & Company Settings
 * - Customers
 * - Raw Materials & Stock Ledger
 * - Products
 * - Invoices & Invoice Items
 * - Payments
 * 
 * Safety & Production Guard:
 *   Will abort immediately if run against a remote/production database unless ALLOW_SEED=1
 *   or --allow-seed CLI flag is provided.
 * 
 * Idempotency:
 *   All records use deterministic UUIDs and ON CONFLICT DO UPDATE / DO NOTHING clauses.
 */

import { Client } from 'pg'

// Target database connection
const connectionString =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  'postgresql://postgres.liqhihsqcblddqfjmmse:Shamol199431)!@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres'

// 1. PRODUCTION & ENVIRONMENT GUARD
const isProductionDatabase =
  process.env.NODE_ENV === 'production' ||
  process.env.VERCEL_ENV === 'production' ||
  connectionString.includes('supabase.co') ||
  connectionString.includes('supabase.com') ||
  connectionString.includes('pooler.supabase.com') ||
  connectionString.includes('aws-0')

const hasExplicitSeedAuthorization =
  process.env.ALLOW_SEED?.trim() === '1' ||
  process.argv.includes('--allow-seed')

if (isProductionDatabase && !hasExplicitSeedAuthorization) {
  console.error('\n================================================================================')
  console.error('⛔ HARDENING SAFETY VIOLATION: Execution Aborted!')
  console.error('Attempted to execute seed-test-tenants against a remote/production Supabase database.')
  console.error('This script modifies and seeds database entities.')
  console.error('To authorize execution on this target, set the explicit environment guard:')
  console.error('   ALLOW_SEED=1 node --experimental-strip-types scripts/seed-test-tenants.ts')
  console.error('   or pass the flag: --allow-seed')
  console.error('================================================================================\n')
  process.exit(1)
}

// 2. DETERMINISTIC IDENTIFIERS FOR 3 TENANTS
interface TenantSeedConfig {
  id: string
  slug: string
  name: string
  nameBn: string
  phone: string
  email: string
  branchId: string
  branchCode: string
  branchName: string
  users: Array<{
    userId: string
    companyUserId: string
    roleId: string
    roleSlug: string
    roleName: string
    roleNameBn: string
    email: string
    name: string
    department: string
  }>
  customers: Array<{
    id: string
    name: string
    type: string
    phone: string
    address: string
  }>
  materials: Array<{
    id: string
    sku: string
    name: string
    category: string
    unit: string
    type: string
    currentStock: number
    avgCost: number
  }>
  products: Array<{
    id: string
    sku: string
    name: string
    category: string
    productType: string
    unit: string
    price: number
  }>
  invoices: Array<{
    id: string
    number: string
    customerId: string
    customerName: string
    customerPhone: string
    status: string
    grandTotal: number
    paidAmount: number
    dueAmount: number
    items: Array<{
      id: string
      productId: string
      description: string
      qty: number
      unit: string
      unitPrice: number
      total: number
    }>
  }>
  payments: Array<{
    id: string
    receiptNo: string
    customerId: string
    customerName: string
    amount: number
    type?: string
    method: string
  }>
}

const TENANTS: TenantSeedConfig[] = [
  // TENANT A: ALPHA PRINT
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    slug: 'alpha-print',
    name: 'Alpha Print & Signage Ltd.',
    nameBn: 'আলফা প্রিন্ট অ্যান্ড সাইনেজ লিঃ',
    phone: '+8801711000001',
    email: 'owner@alpha-print.com',
    branchId: 'a0000000-0000-0000-0000-000000000010',
    branchCode: 'BR-ALPHA-MAIN',
    branchName: 'Alpha Main Facility',
    users: [
      {
        userId: 'a0000000-0000-0000-0000-000000000041',
        companyUserId: 'a0000000-0000-0000-0000-000000000031',
        roleId: 'a0000000-0000-0000-0000-000000000021',
        roleSlug: 'business_owner',
        roleName: 'Business Owner',
        roleNameBn: 'মালিক',
        email: 'owner.alpha@test.com',
        name: 'Alpha Owner',
        department: 'Executive',
      },
      {
        userId: 'a0000000-0000-0000-0000-000000000042',
        companyUserId: 'a0000000-0000-0000-0000-000000000032',
        roleId: 'a0000000-0000-0000-0000-000000000022',
        roleSlug: 'accountant',
        roleName: 'Accountant',
        roleNameBn: 'হিসাবরক্ষক',
        email: 'accountant.alpha@test.com',
        name: 'Alpha Accountant',
        department: 'Finance',
      },
      {
        userId: 'a0000000-0000-0000-0000-000000000043',
        companyUserId: 'a0000000-0000-0000-0000-000000000033',
        roleId: 'a0000000-0000-0000-0000-000000000023',
        roleSlug: 'operator',
        roleName: 'Machine Operator',
        roleNameBn: 'অপারেটর',
        email: 'operator.alpha@test.com',
        name: 'Alpha Operator',
        department: 'Production',
      },
      {
        userId: 'a0000000-0000-0000-0000-000000000044',
        companyUserId: 'a0000000-0000-0000-0000-000000000034',
        roleId: 'a0000000-0000-0000-0000-000000000024',
        roleSlug: 'designer',
        roleName: 'Graphic Designer',
        roleNameBn: 'ডিজাইনার',
        email: 'designer.alpha@test.com',
        name: 'Alpha Designer',
        department: 'Pre-Press',
      },
      {
        userId: 'a0000000-0000-0000-0000-000000000045',
        companyUserId: 'a0000000-0000-0000-0000-000000000035',
        roleId: 'a0000000-0000-0000-0000-000000000025',
        roleSlug: 'general_staff',
        roleName: 'Employee',
        roleNameBn: 'কর্মী',
        email: 'employee.alpha@test.com',
        name: 'Alpha Employee',
        department: 'Operations',
      },
    ],
    customers: [
      {
        id: 'a0000000-0000-0000-0000-000000000051',
        name: 'Alpha Corporate Client Ltd',
        type: 'corporate',
        phone: '+8801700100001',
        address: 'Gulshan 2, Dhaka',
      },
      {
        id: 'a0000000-0000-0000-0000-000000000052',
        name: 'Mr. Rafiqul Islam (Retail)',
        type: 'retail',
        phone: '+8801700100002',
        address: 'Mirpur 10, Dhaka',
      },
    ],
    materials: [
      {
        id: 'a0000000-0000-0000-0000-000000000061',
        sku: 'MAT-A-PANA280',
        name: 'Panaflex 280gsm Roll (10ft)',
        category: 'Media',
        unit: 'sft',
        type: 'roll',
        currentStock: 1640,
        avgCost: 18.5,
      },
      {
        id: 'a0000000-0000-0000-0000-000000000062',
        sku: 'MAT-A-VINYL-GLOSS',
        name: 'Glossy Vinyl Sticker (4ft)',
        category: 'Media',
        unit: 'sft',
        type: 'roll',
        currentStock: 656,
        avgCost: 24.0,
      },
    ],
    products: [
      {
        id: 'a0000000-0000-0000-0000-000000000071',
        sku: 'PRD-A-BANNER',
        name: 'Standard Panaflex Banner',
        category: 'Signage',
        productType: 'production_product',
        unit: 'sft',
        price: 35.0,
      },
      {
        id: 'a0000000-0000-0000-0000-000000000072',
        sku: 'PRD-A-STICKER',
        name: 'Die-cut Vinyl Sticker Print',
        category: 'Print',
        productType: 'ready_product',
        unit: 'sft',
        price: 55.0,
      },
    ],
    invoices: [
      {
        id: 'a0000000-0000-0000-0000-000000000081',
        number: 'INV-ALPHA-001',
        customerId: 'a0000000-0000-0000-0000-000000000051',
        customerName: 'Alpha Corporate Client Ltd',
        customerPhone: '+8801700100001',
        status: 'paid',
        grandTotal: 3500,
        paidAmount: 3500,
        dueAmount: 0,
        items: [
          {
            id: 'a0000000-0000-0000-0000-000000000091',
            productId: 'a0000000-0000-0000-0000-000000000071',
            description: '10ft x 10ft Event Backdrop Banner',
            qty: 100,
            unit: 'sft',
            unitPrice: 35.0,
            total: 3500,
          },
        ],
      },
    ],
    payments: [
      {
        id: 'a0000000-0000-0000-0000-000000000101',
        receiptNo: 'REC-ALPHA-001',
        customerId: 'a0000000-0000-0000-0000-000000000051',
        customerName: 'Alpha Corporate Client Ltd',
        amount: 3500,
        type: 'full_payment',
        method: 'bank',
      },
    ],
  },

  // TENANT B: BETA PRESS
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    slug: 'beta-press',
    name: 'Beta Commercial Press Ltd.',
    nameBn: 'বিটা কমার্শিয়াল প্রেস লিঃ',
    phone: '+8801711000002',
    email: 'owner@beta-press.com',
    branchId: 'b0000000-0000-0000-0000-000000000010',
    branchCode: 'BR-BETA-MAIN',
    branchName: 'Beta Commercial Facility',
    users: [
      {
        userId: 'b0000000-0000-0000-0000-000000000041',
        companyUserId: 'b0000000-0000-0000-0000-000000000031',
        roleId: 'b0000000-0000-0000-0000-000000000021',
        roleSlug: 'business_owner',
        roleName: 'Business Owner',
        roleNameBn: 'মালিক',
        email: 'owner.beta@test.com',
        name: 'Beta Owner',
        department: 'Executive',
      },
      {
        userId: 'b0000000-0000-0000-0000-000000000042',
        companyUserId: 'b0000000-0000-0000-0000-000000000032',
        roleId: 'b0000000-0000-0000-0000-000000000022',
        roleSlug: 'accountant',
        roleName: 'Accountant',
        roleNameBn: 'হিসাবরক্ষক',
        email: 'accountant.beta@test.com',
        name: 'Beta Accountant',
        department: 'Finance',
      },
      {
        userId: 'b0000000-0000-0000-0000-000000000043',
        companyUserId: 'b0000000-0000-0000-0000-000000000033',
        roleId: 'b0000000-0000-0000-0000-000000000023',
        roleSlug: 'operator',
        roleName: 'Machine Operator',
        roleNameBn: 'অপারেটর',
        email: 'operator.beta@test.com',
        name: 'Beta Operator',
        department: 'Offset Floor',
      },
      {
        userId: 'b0000000-0000-0000-0000-000000000044',
        companyUserId: 'b0000000-0000-0000-0000-000000000034',
        roleId: 'b0000000-0000-0000-0000-000000000024',
        roleSlug: 'designer',
        roleName: 'Graphic Designer',
        roleNameBn: 'ডিজাইনার',
        email: 'designer.beta@test.com',
        name: 'Beta Designer',
        department: 'Pre-Press',
      },
      {
        userId: 'b0000000-0000-0000-0000-000000000045',
        companyUserId: 'b0000000-0000-0000-0000-000000000035',
        roleId: 'b0000000-0000-0000-0000-000000000025',
        roleSlug: 'general_staff',
        roleName: 'Employee',
        roleNameBn: 'কর্মী',
        email: 'employee.beta@test.com',
        name: 'Beta Employee',
        department: 'Bindery',
      },
    ],
    customers: [
      {
        id: 'b0000000-0000-0000-0000-000000000051',
        name: 'Beta Retail Distribution Ltd',
        type: 'corporate',
        phone: '+8801700200001',
        address: 'Motijheel C/A, Dhaka',
      },
      {
        id: 'b0000000-0000-0000-0000-000000000052',
        name: 'Ms. Nusrat Jahan (Retail)',
        type: 'retail',
        phone: '+8801700200002',
        address: 'Dhanmondi 27, Dhaka',
      },
    ],
    materials: [
      {
        id: 'b0000000-0000-0000-0000-000000000061',
        sku: 'MAT-B-ARTPAPER150',
        name: 'Art Paper 150gsm Sheet (23x36 in)',
        category: 'Paper',
        unit: 'pcs',
        type: 'sheet',
        currentStock: 5000,
        avgCost: 12.0,
      },
      {
        id: 'b0000000-0000-0000-0000-000000000062',
        sku: 'MAT-B-OFFSET-INK-CYAN',
        name: 'Process Cyan Offset Ink (1kg)',
        category: 'Ink',
        unit: 'kg',
        type: 'sheet',
        currentStock: 25,
        avgCost: 850.0,
      },
    ],
    products: [
      {
        id: 'b0000000-0000-0000-0000-000000000071',
        sku: 'PRD-B-CATALOGUE',
        name: 'Annual Product Catalog (A4 16p)',
        category: 'Publishing',
        productType: 'production_product',
        unit: 'pcs',
        price: 120.0,
      },
      {
        id: 'b0000000-0000-0000-0000-000000000072',
        sku: 'PRD-B-FLYER',
        name: 'Marketing Flyer (A5 150gsm)',
        category: 'Commercial',
        productType: 'ready_product',
        unit: 'pcs',
        price: 4.5,
      },
    ],
    invoices: [
      {
        id: 'b0000000-0000-0000-0000-000000000081',
        number: 'INV-BETA-001',
        customerId: 'b0000000-0000-0000-0000-000000000051',
        customerName: 'Beta Retail Distribution Ltd',
        customerPhone: '+8801700200001',
        status: 'partially_paid',
        grandTotal: 12000,
        paidAmount: 6000,
        dueAmount: 6000,
        items: [
          {
            id: 'b0000000-0000-0000-0000-000000000091',
            productId: 'b0000000-0000-0000-0000-000000000071',
            description: 'Annual Product Catalog - 100 Copies',
            qty: 100,
            unit: 'pcs',
            unitPrice: 120.0,
            total: 12000,
          },
        ],
      },
    ],
    payments: [
      {
        id: 'b0000000-0000-0000-0000-000000000101',
        receiptNo: 'REC-BETA-001',
        customerId: 'b0000000-0000-0000-0000-000000000051',
        customerName: 'Beta Retail Distribution Ltd',
        amount: 6000,
        type: 'partial_payment',
        method: 'cheque',
      },
    ],
  },

  // TENANT C: GAMMA PACKAGING
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    slug: 'gamma-packaging',
    name: 'Gamma Packaging & Labels Ltd.',
    nameBn: 'গামা প্যাকেজিং অ্যান্ড লেবেলস লিঃ',
    phone: '+8801711000003',
    email: 'owner@gamma-packaging.com',
    branchId: 'c0000000-0000-0000-0000-000000000010',
    branchCode: 'BR-GAMMA-MAIN',
    branchName: 'Gamma Packaging Plant',
    users: [
      {
        userId: 'c0000000-0000-0000-0000-000000000041',
        companyUserId: 'c0000000-0000-0000-0000-000000000031',
        roleId: 'c0000000-0000-0000-0000-000000000021',
        roleSlug: 'business_owner',
        roleName: 'Business Owner',
        roleNameBn: 'মালিক',
        email: 'owner.gamma@test.com',
        name: 'Gamma Owner',
        department: 'Executive',
      },
      {
        userId: 'c0000000-0000-0000-0000-000000000042',
        companyUserId: 'c0000000-0000-0000-0000-000000000032',
        roleId: 'c0000000-0000-0000-0000-000000000022',
        roleSlug: 'accountant',
        roleName: 'Accountant',
        roleNameBn: 'হিসাবরক্ষক',
        email: 'accountant.gamma@test.com',
        name: 'Gamma Accountant',
        department: 'Finance',
      },
      {
        userId: 'c0000000-0000-0000-0000-000000000043',
        companyUserId: 'c0000000-0000-0000-0000-000000000033',
        roleId: 'c0000000-0000-0000-0000-000000000023',
        roleSlug: 'operator',
        roleName: 'Machine Operator',
        roleNameBn: 'অপারেটর',
        email: 'operator.gamma@test.com',
        name: 'Gamma Operator',
        department: 'Die-cutting Floor',
      },
      {
        userId: 'c0000000-0000-0000-0000-000000000044',
        companyUserId: 'c0000000-0000-0000-0000-000000000034',
        roleId: 'c0000000-0000-0000-0000-000000000024',
        roleSlug: 'designer',
        roleName: 'Graphic Designer',
        roleNameBn: 'ডিজাইনার',
        email: 'designer.gamma@test.com',
        name: 'Gamma Designer',
        department: 'Packaging CAD',
      },
      {
        userId: 'c0000000-0000-0000-0000-000000000045',
        companyUserId: 'c0000000-0000-0000-0000-000000000035',
        roleId: 'c0000000-0000-0000-0000-000000000025',
        roleSlug: 'general_staff',
        roleName: 'Employee',
        roleNameBn: 'কর্মী',
        email: 'employee.gamma@test.com',
        name: 'Gamma Employee',
        department: 'Finishing & Packing',
      },
    ],
    customers: [
      {
        id: 'c0000000-0000-0000-0000-000000000051',
        name: 'Gamma Pharma Laboratories Ltd',
        type: 'corporate',
        phone: '+8801700300001',
        address: 'Tejgaon I/A, Dhaka',
      },
      {
        id: 'c0000000-0000-0000-0000-000000000052',
        name: 'Mr. Tareq Mahmud (Retail)',
        type: 'retail',
        phone: '+8801700300002',
        address: 'Uttara Sector 7, Dhaka',
      },
    ],
    materials: [
      {
        id: 'c0000000-0000-0000-0000-000000000061',
        sku: 'MAT-C-DUPLEX350',
        name: 'Duplex Board 350gsm Sheet',
        category: 'Board',
        unit: 'pcs',
        type: 'sheet',
        currentStock: 8000,
        avgCost: 16.5,
      },
      {
        id: 'c0000000-0000-0000-0000-000000000062',
        sku: 'MAT-C-FOIL-GOLD',
        name: 'Hot Stamping Foil Roll (Gold 2ft)',
        category: 'Foil',
        unit: 'roll',
        type: 'roll',
        currentStock: 15,
        avgCost: 1250.0,
      },
    ],
    products: [
      {
        id: 'c0000000-0000-0000-0000-000000000071',
        sku: 'PRD-C-MEDBOX',
        name: 'Embossed Medicine Box (100x40x40mm)',
        category: 'Packaging',
        productType: 'production_product',
        unit: 'pcs',
        price: 8.5,
      },
      {
        id: 'c0000000-0000-0000-0000-000000000072',
        sku: 'PRD-C-LABEL',
        name: 'Barcode Self-Adhesive Roll Labels',
        category: 'Labels',
        productType: 'ready_product',
        unit: 'roll',
        price: 450.0,
      },
    ],
    invoices: [
      {
        id: 'c0000000-0000-0000-0000-000000000081',
        number: 'INV-GAMMA-001',
        customerId: 'c0000000-0000-0000-0000-000000000051',
        customerName: 'Gamma Pharma Laboratories Ltd',
        customerPhone: '+8801700300001',
        status: 'unpaid',
        grandTotal: 17000,
        paidAmount: 0,
        dueAmount: 17000,
        items: [
          {
            id: 'c0000000-0000-0000-0000-000000000091',
            productId: 'c0000000-0000-0000-0000-000000000071',
            description: 'Custom Embossed Medicine Box - 2000 pcs',
            qty: 2000,
            unit: 'pcs',
            unitPrice: 8.5,
            total: 17000,
          },
        ],
      },
    ],
    payments: [],
  },
]

// 3. EXECUTION LOGIC (IDEMPOTENT UPSERTS)
async function seedTestTenants() {
  console.log('\n--- INKFLOW ERP: SEEDING TEST TENANTS (PHASE-0 ISOLATION DATASET) ---')
  console.log(`Connecting to Postgres database...`)

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })

  await client.connect()
  console.log('✓ Connected successfully.')

  try {
    for (const tenant of TENANTS) {
      console.log(`\n======================================================`)
      console.log(`Seeding Tenant: [${tenant.name}] (${tenant.slug})`)
      console.log(`======================================================`)

      // A. Seed / Upsert Company
      await client.query(
        `
        INSERT INTO public.companies (
          id, slug, name, name_bn, phone, email, currency, default_locale, is_active, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'BDT', 'bn', true, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          name_bn = EXCLUDED.name_bn,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          is_active = true,
          updated_at = NOW();
      `,
        [tenant.id, tenant.slug, tenant.name, tenant.nameBn, tenant.phone, tenant.email]
      )
      console.log(`  ✓ Company row upserted: ${tenant.slug}`)

      // B. Seed Company Settings (1:1)
      await client.query(
        `
        INSERT INTO public.company_settings (
          company_id, default_currency, default_language, vat_enabled, vat_rate, phone, email
        ) VALUES ($1, 'BDT', 'bn', true, 7.50, $2, $3)
        ON CONFLICT (company_id) DO NOTHING;
      `,
        [tenant.id, tenant.phone, tenant.email]
      )
      console.log(`  ✓ Company settings verified`)

      // C. Seed Primary Branch
      await client.query(
        `
        INSERT INTO public.branches (
          id, company_id, name, code, phone, is_main, is_active
        ) VALUES ($1, $2, $3, $4, $5, true, true)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          is_active = true;
      `,
        [tenant.branchId, tenant.id, tenant.branchName, tenant.branchCode, tenant.phone]
      )
      console.log(`  ✓ Primary branch verified: ${tenant.branchCode}`)

      // D. Seed Roles & Users (Owner, Accountant, Operator, Designer, Employee)
      for (const u of tenant.users) {
        // 1. Ensure auth.users placeholder exists (FK requirement)
        await client.query(
          `
          INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous, created_at, updated_at
          ) VALUES (
            $1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            $2, '', NOW(), '{"provider":"email","providers":["email"]}'::jsonb,
            json_build_object('full_name', $3::text), false, false, NOW(), NOW()
          ) ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            updated_at = NOW();
        `,
          [u.userId, u.email, u.name]
        )

        // 2. Ensure public.user_profiles exists
        await client.query(
          `
          INSERT INTO public.user_profiles (
            id, email, full_name, full_name_bn
          ) VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name;
        `,
          [u.userId, u.email, u.name, u.roleNameBn]
        )

        // 3. Upsert Role in public.roles
        await client.query(
          `
          INSERT INTO public.roles (
            id, company_id, name, name_bn, slug, description, is_system, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, true, true)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            name_bn = EXCLUDED.name_bn,
            is_active = true;
        `,
          [u.roleId, tenant.id, u.roleName, u.roleNameBn, u.roleSlug, `${u.roleName} role for test tenant`]
        )

        // 4. Upsert Company User in public.company_users
        await client.query(
          `
          INSERT INTO public.company_users (
            id, company_id, user_id, branch_id, status, invited_email,
            department, responsibilities, raw_overrides, data_scopes, is_active
          ) VALUES ($1, $2, $3, $4, 'active', $5, $6, ARRAY[$7::text], '{}'::jsonb, '{}'::jsonb, true)
          ON CONFLICT (id) DO UPDATE SET
            status = 'active',
            is_active = true,
            invited_email = EXCLUDED.invited_email,
            responsibilities = EXCLUDED.responsibilities;
        `,
          [u.companyUserId, tenant.id, u.userId, tenant.branchId, u.email, u.department, u.roleSlug]
        )

        // 5. Link User Role in public.user_roles
        await client.query(
          `
          INSERT INTO public.user_roles (
            company_user_id, role_id, company_id
          ) VALUES ($1, $2, $3)
          ON CONFLICT (company_user_id, role_id) DO NOTHING;
        `,
          [u.companyUserId, u.roleId, tenant.id]
        )

        console.log(`    • Role & User created: ${u.roleName} (${u.email})`)
      }

      // E. Seed Customers
      for (const c of tenant.customers) {
        await client.query(
          `
          INSERT INTO public.customers (
            id, company_id, name, customer_type, mobile, address, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, true)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            mobile = EXCLUDED.mobile,
            address = EXCLUDED.address;
        `,
          [c.id, tenant.id, c.name, c.type, c.phone, c.address]
        )
        console.log(`  ✓ Customer: ${c.name} (${c.type})`)
      }

      // F. Seed Raw Materials
      for (const m of tenant.materials) {
        await client.query(
          `
          INSERT INTO public.materials (
            id, company_id, branch_id, sku, name, category, unit, material_type,
            current_stock, average_cost, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            current_stock = EXCLUDED.current_stock,
            average_cost = EXCLUDED.average_cost;
        `,
          [m.id, tenant.id, tenant.branchId, m.sku, m.name, m.category, m.unit, m.type, m.currentStock, m.avgCost]
        )
        console.log(`  ✓ Material: ${m.name} [Stock: ${m.currentStock} ${m.unit}]`)
      }

      // G. Seed Products
      for (const p of tenant.products) {
        await client.query(
          `
          INSERT INTO public.products (
            id, company_id, branch_id, sku, name, category, product_type, unit, selling_price, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            product_type = EXCLUDED.product_type,
            selling_price = EXCLUDED.selling_price;
        `,
          [p.id, tenant.id, tenant.branchId, p.sku, p.name, p.category, p.productType, p.unit, p.price]
        )
        console.log(`  ✓ Product: ${p.name} [Price: ৳${p.price}/${p.unit}]`)
      }

      // H. Seed Invoices & Items
      for (const inv of tenant.invoices) {
        await client.query(
          `
          INSERT INTO public.invoices (
            id, company_id, branch_id, invoice_number, customer_id, customer_name,
            customer_phone, status, grand_total, paid_amount, due_amount,
            created_by_name, invoice_date, due_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Seed Admin', CURRENT_DATE, CURRENT_DATE + INTERVAL '15 days')
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            grand_total = EXCLUDED.grand_total,
            paid_amount = EXCLUDED.paid_amount,
            due_amount = EXCLUDED.due_amount,
            due_date = EXCLUDED.due_date;
        `,
          [
            inv.id,
            tenant.id,
            tenant.branchId,
            inv.number,
            inv.customerId,
            inv.customerName,
            inv.customerPhone,
            inv.status,
            inv.grandTotal,
            inv.paidAmount,
            inv.dueAmount,
          ]
        )

        for (const itm of inv.items) {
          await client.query(
            `
            INSERT INTO public.invoice_items (
              id, invoice_id, product_id, item_description, quantity, unit, unit_price, total_price
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (id) DO NOTHING;
          `,
            [itm.id, inv.id, itm.productId, itm.description, itm.qty, itm.unit, itm.unitPrice, itm.total]
          )
        }
        console.log(`  ✓ Invoice: ${inv.number} [Status: ${inv.status}, Total: ৳${inv.grandTotal}]`)
      }

      // I. Seed Payments
      for (const p of tenant.payments) {
        await client.query(
          `
          INSERT INTO public.payments (
            id, company_id, branch_id, receipt_number, customer_id, customer_name,
            payment_type, payment_method, amount, received_by_name, payment_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Cashier', CURRENT_DATE)
          ON CONFLICT (id) DO UPDATE SET
            amount = EXCLUDED.amount,
            payment_type = EXCLUDED.payment_type,
            payment_method = EXCLUDED.payment_method;
        `,
          [p.id, tenant.id, tenant.branchId, p.receiptNo, p.customerId, p.customerName, p.type || 'full_payment', p.method, p.amount]
        )
        console.log(`  ✓ Payment: ${p.receiptNo} [৳${p.amount} via ${p.method}]`)
      }
    }

    console.log('\n🎉 SUCCESS: All 3 test tenants seeded successfully with full multi-tenant isolation data!')
  } finally {
    await client.end()
  }
}

seedTestTenants().catch((err) => {
  console.error('\nFatal error running seed-test-tenants:', err)
  process.exit(1)
})
