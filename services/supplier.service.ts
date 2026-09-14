// ==============================================================================
// PrintERP / InkFlow SaaS - Supplier Service (V5)
// Multi-Tenant Supplier Operations, Item Mapping & Price Intelligence
// ==============================================================================

import type { SupplierRecord } from '../types/crm.types.ts'
import type {
  SupplierItemRecord,
  SupplierPriceHistoryRecord,
  SupplierPriceBenchmark,
  SupplierLedgerEntryRecord,
} from '../types/purchase.types.ts'
import { SupplierRepository } from '../lib/repositories/supplier.repository.ts'
import { AuditService } from './audit.service.ts'

export class SupplierService {
  // ==========================================
  // SUPPLIER MASTER
  // ==========================================

  static async getSuppliers(
    companyId: string = 'c-01',
    options?: { branchId?: string | null; category?: string; isActive?: boolean; search?: string }
  ): Promise<SupplierRecord[]> {
    return SupplierRepository.getSuppliers(companyId, options)
  }

  static async getSupplierById(id: string, companyId: string = 'c-01'): Promise<SupplierRecord | null> {
    return SupplierRepository.getSupplierById(id, companyId)
  }

  static async createSupplier(
    data: Partial<SupplierRecord> & {
      company_id: string
      supplier_name: string
      mobile: string
      category: any
    },
    actorId?: string,
    actorEmail?: string
  ): Promise<SupplierRecord> {
    const created = await SupplierRepository.createSupplier(data)

    await AuditService.logEvent(
      data.company_id,
      actorId || null,
      actorEmail || null,
      'create',
      'supplier',
      created.id,
      null,
      { supplier_code: created.supplier_code, supplier_name: created.supplier_name, category: created.category },
      `Created supplier ${created.supplier_name} (${created.supplier_code})`
    )

    return created
  }

  static async updateSupplier(
    id: string,
    updates: Partial<SupplierRecord>,
    companyId: string = 'c-01',
    actorId?: string,
    actorEmail?: string
  ): Promise<SupplierRecord | null> {
    const updated = await SupplierRepository.updateSupplier(id, updates, companyId)
    if (updated) {
      await AuditService.logEvent(
        companyId,
        actorId || null,
        actorEmail || null,
        'update',
        'supplier',
        id,
        null,
        updates,
        `Updated supplier ${updated.supplier_name}`
      )
    }
    return updated
  }

  static async deleteSupplier(
    id: string,
    companyId: string = 'c-01',
    actorId?: string,
    actorEmail?: string
  ): Promise<boolean> {
    const existing = await this.getSupplierById(id, companyId)
    const success = await SupplierRepository.deleteSupplier(id, companyId)
    if (success && existing) {
      await AuditService.logEvent(
        companyId,
        actorId || null,
        actorEmail || null,
        'delete',
        'supplier',
        id,
        { supplier_name: existing.supplier_name },
        null,
        `Deleted supplier ${existing.supplier_name}`
      )
    }
    return success
  }

  // ==========================================
  // SUPPLIER ITEMS CATALOG
  // ==========================================

  static async getSupplierItems(
    companyId: string = 'c-01',
    options?: { supplierId?: string; materialId?: string }
  ): Promise<SupplierItemRecord[]> {
    return SupplierRepository.getSupplierItems(companyId, options)
  }

  static async createSupplierItem(
    data: Partial<SupplierItemRecord> & {
      company_id: string
      supplier_id: string
      material_id: string
      unit_price: number
    },
    actorId?: string,
    actorEmail?: string
  ): Promise<SupplierItemRecord> {
    const created = await SupplierRepository.createSupplierItem(data)

    await AuditService.logEvent(
      data.company_id,
      actorId || null,
      actorEmail || null,
      'create',
      'supplier_item',
      created.id,
      null,
      { supplier_id: created.supplier_id, material_id: created.material_id, unit_price: created.unit_price },
      `Mapped material to supplier with price ৳${created.unit_price}`
    )

    return created
  }

  static async updateSupplierItem(
    id: string,
    updates: Partial<SupplierItemRecord>,
    companyId: string = 'c-01'
  ): Promise<SupplierItemRecord | null> {
    return SupplierRepository.updateSupplierItem(id, updates, companyId)
  }

  static async deleteSupplierItem(id: string, companyId: string = 'c-01'): Promise<boolean> {
    return SupplierRepository.deleteSupplierItem(id, companyId)
  }

  // ==========================================
  // SUPPLIER PRICE HISTORY & BENCHMARKS
  // ==========================================

  static async getPriceHistory(
    companyId: string = 'c-01',
    options?: { materialId?: string; supplierId?: string }
  ): Promise<SupplierPriceHistoryRecord[]> {
    return SupplierRepository.getSupplierPriceHistory(companyId, options)
  }

  static async getSupplierPriceBenchmark(
    materialId: string,
    materialName: string,
    companyId: string = 'c-01'
  ): Promise<SupplierPriceBenchmark> {
    const history = await this.getPriceHistory(companyId, { materialId })

    if (history.length === 0) {
      return {
        material_id: materialId,
        material_name: materialName,
        last_price: 0,
        average_price: 0,
        lowest_price: 0,
        highest_price: 0,
        history: [],
      }
    }

    const prices = history.map((r) => r.purchase_price)
    const last_price = history[0].purchase_price
    const lowest_price = Math.min(...prices)
    const highest_price = Math.max(...prices)
    const average_price = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)

    return {
      material_id: materialId,
      material_name: materialName,
      last_price,
      average_price,
      lowest_price,
      highest_price,
      history,
    }
  }

  // ==========================================
  // SUPPLIER LEDGER
  // ==========================================

  static async getSupplierLedger(companyId: string, supplierId: string): Promise<SupplierLedgerEntryRecord[]> {
    return SupplierRepository.getSupplierLedger(companyId, supplierId)
  }
}
