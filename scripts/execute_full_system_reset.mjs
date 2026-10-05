import { Client } from 'pg';

async function executeFullReset() {
  console.log('===========================================================');
  console.log('⚡ PrintFlow SaaS - Executing Full Application System Reset ⚡');
  console.log('===========================================================\n');

  const client = new Client({
    host: 'aws-0-ap-northeast-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.liqhihsqcblddqfjmmse',
    password: 'Shamol199431)!',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  try {
    // 1. Verify Platform Owner auth user exists or obtain ID
    const ownerEmail = 'bdinfosky@gmail.com';
    const ownerPassword = 's19943101';
    
    console.log(`Step 1: Locating Platform Owner account (${ownerEmail})...`);
    let ownerRes = await client.query(
      `SELECT id, email FROM auth.users WHERE lower(email) = lower($1);`,
      [ownerEmail]
    );

    let ownerUserId;
    if (ownerRes.rows.length === 0) {
      console.log('Creating platform owner in auth.users...');
      const createRes = await client.query(`
        INSERT INTO auth.users (
          id,
          instance_id,
          aud,
          role,
          email,
          encrypted_password,
          email_confirmed_at,
          raw_app_meta_data,
          raw_user_meta_data,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          '00000000-0000-0000-0000-000000000000',
          'authenticated',
          'authenticated',
          $1,
          crypt($2, gen_salt('bf')),
          NOW(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          '{"full_name":"Shahidur Rahman"}'::jsonb,
          NOW(),
          NOW()
        ) RETURNING id;
      `, [ownerEmail, ownerPassword]);
      ownerUserId = createRes.rows[0].id;
    } else {
      ownerUserId = ownerRes.rows[0].id;
      console.log(`Found owner user id: ${ownerUserId}. Updating credentials...`);
      await client.query(`
        UPDATE auth.users
        SET 
          encrypted_password = crypt($2, gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
          banned_until = NULL,
          raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
          raw_user_meta_data = '{"full_name":"Shahidur Rahman"}'::jsonb,
          updated_at = NOW()
        WHERE id = $1;
      `, [ownerUserId, ownerPassword]);
    }
    console.log(`✓ Platform Owner account configured (${ownerEmail}) with updated password.`);

    // 2. Clear all other user accounts from auth.users
    console.log('\nStep 2: Deleting all non-platform-owner accounts from auth.users...');
    const deletedUsersRes = await client.query(
      `DELETE FROM auth.users WHERE lower(email) != lower($1) RETURNING email;`,
      [ownerEmail]
    );
    console.log(`✓ Deleted ${deletedUsersRes.rows.length} account(s):`, deletedUsersRes.rows.map(r => r.email).join(', ') || 'None');

    // 3. Clear public user profile tables
    console.log('\nStep 3: Cleaning public profiles and user_profiles...');
    await client.query(`DELETE FROM public.user_profiles;`);
    console.log('✓ Cleared public.user_profiles');

    if (await tableExists(client, 'profiles')) {
      await client.query(`DELETE FROM public.profiles WHERE id != $1;`, [ownerUserId]);
      console.log('✓ Cleared public.profiles (kept owner profile)');
    }

    // 4. Configure public.platform_admins (keep ONLY bdinfosky@gmail.com)
    console.log('\nStep 4: Securing platform_admins...');
    await client.query(`DELETE FROM public.platform_admins WHERE lower(email) != lower($1);`, [ownerEmail]);

    const adminCheck = await client.query(
      `SELECT id FROM public.platform_admins WHERE lower(email) = lower($1);`,
      [ownerEmail]
    );

    if (adminCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO public.platform_admins (
          user_id,
          email,
          full_name,
          role,
          is_active,
          mfa_enabled,
          responsibilities,
          preferences,
          created_at,
          updated_at
        ) VALUES (
          $1,
          $2,
          'Shahidur Rahman',
          'platform_owner',
          true,
          false,
          '["platform_owner"]'::jsonb,
          '{"currency":"BDT","language":"en","timezone":"Asia/Dhaka","date_format":"YYYY-MM-DD"}'::jsonb,
          NOW(),
          NOW()
        );
      `, [ownerUserId, ownerEmail]);
      console.log('✓ Inserted Platform Owner into platform_admins.');
    } else {
      await client.query(`
        UPDATE public.platform_admins
        SET 
          user_id = $1,
          full_name = 'Shahidur Rahman',
          role = 'platform_owner',
          is_active = true,
          mfa_enabled = false,
          responsibilities = '["platform_owner"]'::jsonb,
          preferences = '{"currency":"BDT","language":"en","timezone":"Asia/Dhaka","date_format":"YYYY-MM-DD"}'::jsonb,
          last_login_at = NULL,
          updated_at = NOW()
        WHERE lower(email) = lower($2);
      `, [ownerUserId, ownerEmail]);
      console.log('✓ Updated Platform Owner in platform_admins.');
    }

    // 5. Purge all operational logs, telemetry, sessions and gateway records
    console.log('\nStep 5: Purging telemetry, gateway records, sessions and transient logs...');
    const logAndTransientTables = [
      'platform_active_sessions',
      'gateway_audit_logs',
      'gateway_transactions',
      'gateway_webhooks',
      'gateway_integrations',
      'platform_subscription_events',
      'platform_subscriptions',
      'platform_notifications',
      'platform_background_jobs',
      'platform_system_health_events',
      'platform_incidents',
      'auth_verifications',
      'email_logs',
      'email_queue',
      'communication_messages',
      'communication_logs',
      'communication_jobs',
      'whatsapp_messages',
      'whatsapp_chats',
      'whatsapp_contacts',
      'tenant_whatsapp_connections',
      'otp_requests',
      'sync_outbox'
    ];

    for (const tbl of logAndTransientTables) {
      if (await tableExists(client, tbl)) {
        await client.query(`TRUNCATE TABLE public."${tbl}" CASCADE;`);
        console.log(`✓ Truncated ${tbl}`);
      }
    }

    // 6. Purge all Tenant Business & Operational tables
    console.log('\nStep 6: Purging all Tenant Business, Mock & Sample Data...');
    const tenantTables = [
      'support_attachments',
      'support_messages',
      'support_conversations',
      'platform_support_sessions',
      'saas_subscription_invoice_items',
      'saas_subscription_invoices',
      'saas_tenant_storage_usage',
      'platform_tenant_feature_flags',
      'platform_tenant_exports',
      'company_subscriptions',
      'billing_history',
      'saas_invoices',
      'workflow_execution_logs',
      'workflow_rules',
      'workflow_configurations',
      'automation_rules',
      'saved_views',
      'in_app_notifications',
      'tenant_email_configs',
      'client_devices',
      'workforce_audit_logs',
      'daily_labor_logs',
      'salary_payments',
      'payroll_items',
      'payroll_periods',
      'salary_advances',
      'overtime_records',
      'attendance_audit_logs',
      'attendance_corrections',
      'attendance_qr_tokens',
      'attendance_daily_summaries',
      'attendance_records',
      'attendance_locations',
      'attendances',
      'employee_shifts',
      'shifts',
      'employee_branch_assignments',
      'employees',
      'installations',
      'delivery_challan_items',
      'challan_items',
      'delivery_challans',
      'tax_transaction_lines',
      'tax_profiles',
      'financial_write_offs',
      'payment_adjustments',
      'payment_allocations',
      'payments',
      'invoice_items',
      'invoice_requests',
      'invoices',
      'journal_entry_lines',
      'financial_transactions',
      'cash_book_entries',
      'cash_closings',
      'account_transfers',
      'inter_branch_financial_transfers',
      'bank_statement_lines',
      'bank_statements',
      'bank_accounts',
      'expenses',
      'financial_periods',
      'accounts',
      'supplier_ledger_entries',
      'supplier_payments',
      'supplier_return_items',
      'supplier_returns',
      'goods_received_note_items',
      'goods_received_notes',
      'purchase_order_items',
      'purchase_orders',
      'purchase_request_items',
      'purchase_requests',
      'product_supplier_prices',
      'supplier_price_history',
      'supplier_material_prices',
      'supplier_items',
      'suppliers',
      'material_issue_items',
      'material_issues',
      'material_request_items',
      'material_requests',
      'inventory_transfers',
      'inventory_adjustments',
      'inventory_remnants',
      'material_wastages',
      'mounted_rolls',
      'inventory_rolls',
      'paper_stocks',
      'stock_ledger',
      'inventory_stock_balances',
      'inventory_locations',
      'materials',
      'production_problem_reports',
      'machinery_breakdowns',
      'machinery_maintenances',
      'machinery_assignments',
      'machineries',
      'machine_profiles',
      'production_task_material_requirements',
      'production_tasks',
      'production_reworks',
      'operator_jobs',
      'job_costings',
      'production_jobs',
      'job_orders',
      'design_feedback_logs',
      'design_versions',
      'design_jobs',
      'order_timeline_events',
      'sales_order_items',
      'order_items',
      'sales_orders',
      'quotation_activities',
      'quotation_items',
      'quotations',
      'customer_communications',
      'customer_rates',
      'customers',
      'pricing_rules',
      'price_overrides',
      'price_list_items',
      'price_lists',
      'product_formulas',
      'product_variants',
      'product_price_history',
      'price_history',
      'installation_options',
      'additional_options',
      'finishing_options',
      'material_purchase_configs',
      'printing_methods',
      'product_categories',
      'products',
      'document_sequences',
      'document_number_counters',
      'document_numbering_configs',
      'document_templates_config',
      'branding_settings',
      'company_tax_settings',
      'tenant_domains',
      'company_settings',
      'branch_transfer_requests',
      'branch_transfers',
      'branches',
      'user_branch_access',
      'user_permission_overrides',
      'user_roles',
      'company_users',
      'tenant_memberships',
      'audit_logs',
      'platform_companies',
      'companies'
    ];

    for (const tbl of tenantTables) {
      if (await tableExists(client, tbl)) {
        try {
          await client.query(`TRUNCATE TABLE public."${tbl}" CASCADE;`);
          console.log(`✓ Truncated ${tbl}`);
        } catch (e) {
          try {
            await client.query(`DELETE FROM public."${tbl}";`);
            console.log(`✓ Deleted from ${tbl}`);
          } catch (e2) {
            console.warn(`! Note on ${tbl}: ${e2.message}`);
          }
        }
      }
    }

    // 7. Reset Platform Audit Logs and record pristine initialization
    console.log('\nStep 7: Resetting Platform Audit Ledger...');
    if (await tableExists(client, 'platform_audit_logs')) {
      await client.query(`TRUNCATE TABLE public.platform_audit_logs;`);
      
      const adminIdRes = await client.query(
        `SELECT id FROM public.platform_admins WHERE lower(email) = lower($1);`,
        [ownerEmail]
      );
      const adminId = adminIdRes.rows[0]?.id || null;

      await client.query(`
        INSERT INTO public.platform_audit_logs (
          platform_admin_id,
          actor_email,
          action,
          entity_type,
          entity_id,
          details
        ) VALUES (
          $1,
          $2,
          'platform.system_reset',
          'system',
          'cluster-root',
          $3
        );
      `, [
        adminId,
        ownerEmail,
        JSON.stringify({
          event: 'Full application reset executed upon owner request',
          timestamp: new Date().toISOString(),
          preserved_owner: ownerEmail,
          zero_tenant_state: true
        })
      ]);
      console.log('✓ Platform audit logs initialized with authoritative root initialization record.');
    }

    // 8. Ensure Platform System Settings are default & active
    console.log('\nStep 8: Validating Platform System Settings...');
    if (await tableExists(client, 'platform_system_settings')) {
      const settingsRes = await client.query(`SELECT id FROM public.platform_system_settings LIMIT 1;`);
      if (settingsRes.rows.length === 0) {
        await client.query(`
          INSERT INTO public.platform_system_settings (
            id,
            app_name,
            contact_email,
            default_currency,
            maintenance_mode_enabled,
            mfa_required_for_admins
          ) VALUES (
            'default',
            'PrintFlow SaaS',
            'bdinfosky@gmail.com',
            'BDT',
            false,
            false
          );
        `);
        console.log('✓ Initialized default platform_system_settings.');
      } else {
        await client.query(`
          UPDATE public.platform_system_settings
          SET 
            maintenance_mode_enabled = false,
            mfa_required_for_admins = false,
            contact_email = 'bdinfosky@gmail.com',
            updated_at = NOW()
          WHERE id = $1;
        `, [settingsRes.rows[0].id]);
        console.log('✓ Verified and updated platform_system_settings.');
      }
    }

    console.log('\n===========================================================');
    console.log('🎉 FULL APPLICATION RESET COMPLETED SUCCESSFULLY!');
    console.log(`- Only Account: ${ownerEmail} (role: platform_owner)`);
    console.log(`- Password: ${ownerPassword}`);
    console.log('- Zero tenants, zero mock/demo data, zero telemetry logs.');
    console.log('===========================================================\n');

  } catch (err) {
    console.error('❌ Reset failed with error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

async function tableExists(client, tableName) {
  const res = await client.query(`
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = $1;
  `, [tableName]);
  return res.rows.length > 0;
}

executeFullReset();
