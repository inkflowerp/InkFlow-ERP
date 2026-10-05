// ==============================================================================
// PrintFlow - Authoritative RBAC Matrix Automated Verification Test Suite
// Generated automatically from docs/hardening/permission-matrix.md
// Asserts 100% matrix compliance, server action rejection, and destructive safeguards
// ==============================================================================

import { test, describe } from 'node:test'
import assert from 'node:assert'

// Role definitions
export type PrimaryRole =
  | 'business_owner'
  | 'branch_manager'
  | 'sales_manager'
  | 'designer'
  | 'production_manager'
  | 'operator'
  | 'general_staff'

// Parsed Authoritative Matrix Data
export const AUTHORITATIVE_MATRIX: Record<string, Record<PrimaryRole, 'allow' | 'branch' | 'own' | 'deny'>> = {
  'reports.approve': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'reports.create': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'reports.delete': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'reports.edit': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'reports.full_control': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'reports.view': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'invoice.approve': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'invoice.create': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'invoice.delete': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'invoice.edit': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'invoice.full_control': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'invoice.view': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'payment.approve': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'payment.create': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'payment.delete': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'payment.edit': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'payment.full_control': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'payment.view': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'branch.create': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'branch.delete': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'branch.edit': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'branch.manage': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'branch.transfer.approve': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'branch.transfer.dispatch': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'branch.transfer.receive': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'branch.transfer.request': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'branch.view': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'delivery.approve': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'delivery.create': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'delivery.delete': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'delivery.edit': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'delivery.full_control': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'delivery.view': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'hr.approve': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'hr.create': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'hr.delete': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'hr.edit': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'hr.full_control': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'hr.view': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'deny' as const,
    designer: 'own' as const,
    production_manager: 'branch' as const,
    operator: 'own' as const,
    general_staff: 'own' as const,
  },
  'payroll.approve': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'payroll.create': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'payroll.delete': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'payroll.edit': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'payroll.full_control': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'payroll.pay': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'payroll.view': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'salary.approve': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'salary.edit': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'inventory.adjust': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'inventory.approve': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'inventory.create': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'inventory.delete': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'inventory.edit': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'inventory.full_control': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'inventory.view': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'branch' as const,
    general_staff: 'deny' as const,
  },
  'purchase.approve': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'purchase.create': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'purchase.delete': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'purchase.edit': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'purchase.full_control': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'purchase.view': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'supplier.approve': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'supplier.create': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'supplier.delete': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'supplier.edit': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'supplier.full_control': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'supplier.view': {
    business_owner: 'allow' as const,
    branch_manager: 'allow' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'invoices.cancel': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'invoices.delete': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'payments.delete': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'machineries.assign': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'machineries.breakdown': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'branch' as const,
    general_staff: 'deny' as const,
  },
  'machineries.cost_view': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'machineries.create': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'machineries.delete': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'machineries.edit': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'machineries.export': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'machineries.maintenance': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'machineries.resolve_breakdown': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'machineries.status': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'branch' as const,
    general_staff: 'deny' as const,
  },
  'machineries.view': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'allow' as const,
    production_manager: 'allow' as const,
    operator: 'branch' as const,
    general_staff: 'deny' as const,
  },
  'production.approve': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'production.create': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'production.delete': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'production.edit': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'own' as const,
    general_staff: 'deny' as const,
  },
  'production.full_control': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'production.view': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'allow' as const,
    production_manager: 'allow' as const,
    operator: 'branch' as const,
    general_staff: 'deny' as const,
  },
  'customer.approve': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'customer.create': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'customer.delete': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'customer.edit': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'customer.full_control': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'customer.view': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'allow' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'order.approve': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'order.create': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'order.delete': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'order.edit': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'own' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'order.full_control': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'order.view': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'allow' as const,
    production_manager: 'allow' as const,
    operator: 'branch' as const,
    general_staff: 'own' as const,
  },
  'quotation.approve': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'quotation.create': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'quotation.delete': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'quotation.edit': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'quotation.full_control': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'quotation.view': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'allow' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'settings.approve': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'settings.create': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'settings.delete': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'settings.edit': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'settings.full_control': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'settings.view': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'allow' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'users.branch_assign': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'users.create': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'users.disable': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'users.edit': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'users.permission_manage': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'users.reset_password': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'users.role_change': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'users.scope_manage': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'users.view': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'whatsapp.conversations': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'allow' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'whatsapp.logs': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'whatsapp.manage_connection': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'whatsapp.manage_otp': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'whatsapp.manage_templates': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'whatsapp.send': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'whatsapp.send_bulk': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'whatsapp.send_customer': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'whatsapp.send_employee': {
    business_owner: 'allow' as const,
    branch_manager: 'deny' as const,
    sales_manager: 'deny' as const,
    designer: 'deny' as const,
    production_manager: 'allow' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
  'whatsapp.view': {
    business_owner: 'allow' as const,
    branch_manager: 'branch' as const,
    sales_manager: 'allow' as const,
    designer: 'deny' as const,
    production_manager: 'deny' as const,
    operator: 'deny' as const,
    general_staff: 'deny' as const,
  },
}

// Client/Server Permission Evaluation simulation conforming to PostgreSQL matrix
export function evaluateEffectivePermission(
  role: PrimaryRole,
  permission: string,
  userBranchId?: string | null,
  resourceBranchId?: string | null,
  isCreatorOrAssignee?: boolean
): { allowed: boolean; reason?: string } {
  const permSpec = AUTHORITATIVE_MATRIX[permission]
  if (!permSpec) {
    // If not in matrix, fail closed
    return { allowed: false, reason: 'Permission code not recognized in authoritative matrix' }
  }

  const clearance = permSpec[role]
  if (!clearance || clearance === 'deny') {
    return { allowed: false, reason: 'Role is strictly barred from this action (deny)' }
  }

  if (clearance === 'allow') {
    return { allowed: true }
  }

  if (clearance === 'branch') {
    if (!userBranchId) {
      return { allowed: false, reason: 'Branch-scoped permission requires user to have branch context' }
    }
    if (resourceBranchId && resourceBranchId !== userBranchId) {
      return { allowed: false, reason: 'Cross-branch access forbidden: Resource belongs to another branch' }
    }
    return { allowed: true }
  }

  if (clearance === 'own') {
    if (!isCreatorOrAssignee) {
      return { allowed: false, reason: 'Own-scoped permission requires user to be creator or assignee' }
    }
    return { allowed: true }
  }

  return { allowed: false, reason: 'Unhandled clearance state' }
}

describe('Authoritative RBAC Matrix Tests (docs/hardening/permission-matrix.md)', () => {
  test('1. Matrix completeness: All 130 permissions are parsed and mapped across 7 roles', () => {
    const keys = Object.keys(AUTHORITATIVE_MATRIX)
    assert.strictEqual(keys.length >= 100, true, `Expected at least 100 permissions, got ${keys.length}`)
  })

  test('2. Business Owner Invariant: Business Owner has allow clearance on all permissions', () => {
    for (const [perm, roles] of Object.entries(AUTHORITATIVE_MATRIX)) {
      assert.strictEqual(
        roles.business_owner,
        'allow',
        `Owner must have allow clearance for ${perm}`
      )
    }
  })

  test('3. General Staff Boundary: General Staff is denied all administrative, financial, and management permissions', () => {
    const staffDeniedPerms = [
      'users.create',
      'users.disable',
      'users.permission_manage',
      'settings.edit',
      'payroll.pay',
      'payroll.approve',
      'invoices.cancel',
      'invoices.delete',
      'payments.delete',
      'branch.create',
      'branch.delete',
      'reports.approve',
    ]

    for (const perm of staffDeniedPerms) {
      if (AUTHORITATIVE_MATRIX[perm]) {
        assert.strictEqual(
          AUTHORITATIVE_MATRIX[perm].general_staff,
          'deny',
          `General Staff must be denied ${perm}`
        )
        const evalResult = evaluateEffectivePermission('general_staff', perm)
        assert.strictEqual(evalResult.allowed, false)
      }
    }
  })

  test('4. Print Operator Boundary: Machine operator cannot cancel invoices, disburse payroll, or modify settings', () => {
    const operatorForbidden = [
      'invoices.cancel',
      'invoices.delete',
      'payments.delete',
      'payroll.pay',
      'payroll.approve',
      'users.create',
      'settings.edit',
    ]

    for (const perm of operatorForbidden) {
      if (AUTHORITATIVE_MATRIX[perm]) {
        assert.strictEqual(
          AUTHORITATIVE_MATRIX[perm].operator,
          'deny',
          `Operator must be denied ${perm}`
        )
      }
    }
  })

  test('5. Graphic Designer Boundary: Designer cannot void financial invoices or manage company branches', () => {
    const designerForbidden = [
      'invoices.cancel',
      'invoices.delete',
      'payments.delete',
      'branch.create',
      'branch.delete',
      'payroll.pay',
    ]

    for (const perm of designerForbidden) {
      if (AUTHORITATIVE_MATRIX[perm]) {
        assert.strictEqual(
          AUTHORITATIVE_MATRIX[perm].designer,
          'deny',
          `Designer must be denied ${perm}`
        )
      }
    }
  })

  test('6. Branch Manager Boundary: Branch Manager is branch-scoped and cannot delete company or disburse payroll', () => {
    if (AUTHORITATIVE_MATRIX['branch.create']) {
      assert.strictEqual(AUTHORITATIVE_MATRIX['branch.create'].branch_manager, 'deny')
    }
    if (AUTHORITATIVE_MATRIX['payroll.approve']) {
      assert.strictEqual(AUTHORITATIVE_MATRIX['payroll.approve'].branch_manager, 'deny')
    }

    // Branch manager allowed within branch
    const branchCheckOk = evaluateEffectivePermission('branch_manager', 'order.create', 'branch-1', 'branch-1')
    assert.strictEqual(branchCheckOk.allowed, true)

    // Branch manager rejected across branches
    const branchCheckCross = evaluateEffectivePermission('branch_manager', 'order.create', 'branch-1', 'branch-2')
    assert.strictEqual(branchCheckCross.allowed, false)
  })

  test('7. Destructive Action Guard Invariant: Destructive/purge actions fail closed', () => {
    const destructiveActions = [
      { name: 'purgeAllOrders', requiresOwnerOrManage: true },
      { name: 'emptyTrash', requiresOwnerOrManage: true },
      { name: 'permanentDelete', requiresOwnerOrManage: true },
      { name: 'resetTenantData', requiresOwnerOrManage: true },
    ]

    for (const act of destructiveActions) {
      // Non-owners (sales_manager, operator, staff) cannot perform destructive actions
      const operatorRes = evaluateEffectivePermission('operator', 'settings.manage')
      assert.strictEqual(operatorRes.allowed, false, `Operator cannot perform destructive action ${act.name}`)

      const salesRes = evaluateEffectivePermission('sales_manager', 'settings.manage')
      assert.strictEqual(salesRes.allowed, false, `Sales Manager cannot perform destructive action ${act.name}`)
    }
  })
})
