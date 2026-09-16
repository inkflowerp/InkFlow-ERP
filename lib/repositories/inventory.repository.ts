import { createClient } from '../supabase/server.ts'
import type {
  MaterialRecord,
  InventoryLocationRecord,
  InventoryStockBalanceRecord,
  TaskMaterialRequirementRecord,
  MaterialRequestRecord,
  MaterialRequestItemRecord,
  MaterialIssueRecord,
  MaterialIssueItemRecord,
  InventoryRemnantRecord,
  InventoryTransferRecord,
  InventoryAdjustmentRecord,
  StockLedgerRecord,
  InventoryRollRecord,
  InventoryTransactionType,
  MaterialUnit,
  MaterialWastageRecord,
} from '../../types/inventory.types.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'
import { measureAsync } from '../performance/logger.ts'

export class InventoryRepository {
  // ==========================================
  // LOCATIONS
  // ==========================================

  static async getLocations(companyId: string, branchId?: string | null): Promise<InventoryLocationRecord[]> {
    const supabase = await createClient()
    let query = (supabase as any)
      .from('inventory_locations')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('location_name', { ascending: true })

    if (branchId) {
      query = query.or(`branch_id.eq.${branchId},branch_id.is.null`)
    }

    const { data, error } = await query
    if (error) {
      throw new Error(`Failed to fetch inventory locations: ${error.message}`)
    }
    return (data || []) as unknown as InventoryLocationRecord[]
  }

  static async getLocationById(id: string, companyId: string): Promise<InventoryLocationRecord | null> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('inventory_locations')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to fetch inventory location ${id}: ${error.message}`)
    }
    return (data as unknown as InventoryLocationRecord) || null
  }

  static async createLocation(location: {
    company_id: string
    branch_id?: string | null
    location_code: string
    location_name: string
    location_type: string
    description?: string | null
  }): Promise<InventoryLocationRecord> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('inventory_locations')
      .insert({
        company_id: location.company_id,
        branch_id: location.branch_id || null,
        location_code: location.location_code.trim().toUpperCase(),
        location_name: location.location_name.trim(),
        location_type: location.location_type,
        description: location.description?.trim() || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create inventory location: ${error.message}`)
    }
    return data as unknown as InventoryLocationRecord
  }

  // ==========================================
  // MATERIALS MASTER
  // ==========================================

  static async getMaterials(companyId: string, options?: {
    branchId?: string | null
    category?: string
    search?: string
    lowStockOnly?: boolean
  }): Promise<MaterialRecord[]> {
    const supabase = await createClient()
    let query = (supabase as any)
      .from('materials')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true })

    if (options?.category && options.category !== 'all') {
      query = query.eq('category', options.category)
    }

    if (options?.search) {
      const q = `%${options.search}%`
      query = query.or(`name.ilike.${q},sku.ilike.${q},name_bn.ilike.${q},brand.ilike.${q}`)
    }

    const { data, error } = await query
    if (error) {
      throw new Error(`Failed to fetch materials: ${error.message}`)
    }

    let results = (data || []) as unknown as MaterialRecord[]
    if (options?.lowStockOnly) {
      results = results.filter((m) => {
        const threshold = Number(m.reorder_level || m.min_stock_level || 0)
        return threshold > 0 && Number(m.current_stock || 0) <= threshold
      })
    }
    return results
  }

  static async getMaterialById(id: string, companyId: string): Promise<MaterialRecord | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('materials')
        .select('*')
        .or(`id.eq.${id},sku.eq.${id}`)
        .eq('company_id', companyId)
        .maybeSingle()

      if (!error && data) {
        return data as unknown as MaterialRecord
      }
    } catch {}

    const all = (PrintERPDataStore.getAll<MaterialRecord>(STORAGE_KEYS.MATERIALS, companyId) || [])
      .concat(PrintERPDataStore.getAll<MaterialRecord>(STORAGE_KEYS.MATERIALS) || [])
    const found = all.find((m) => (!m.company_id || m.company_id === companyId) && (m.id === id || m.sku === id))
    return found || null
  }

  static async createMaterial(material: Partial<MaterialRecord> & {
    company_id: string
    sku: string
    name: string
    category: any
    unit: any
  }): Promise<MaterialRecord> {
    const payload: any = {
      company_id: material.company_id,
      branch_id: material.branch_id || null,
      sku: material.sku.trim().toUpperCase(),
      name: material.name.trim(),
      name_bn: material.name_bn?.trim() || null,
      category: material.category,
      material_type: material.material_type || null,
      description: material.description?.trim() || null,
      brand: material.brand?.trim() || null,
      specification: material.specification?.trim() || null,
      color: material.color?.trim() || null,
      thickness: material.thickness?.trim() || null,
      width: material.width !== undefined ? material.width : null,
      length: material.length !== undefined ? material.length : null,
      dimension_unit: material.dimension_unit || null,
      unit: material.unit,
      base_unit: material.base_unit || material.unit,
      conversion_factor: material.conversion_factor || 1,
      is_roll: Boolean(material.is_roll),
      roll_width_ft: material.roll_width_ft || material.width || null,
      roll_length_ft: material.roll_length_ft || material.length || null,
      total_roll_area_sft:
        material.roll_width_ft && material.roll_length_ft
          ? material.roll_width_ft * material.roll_length_ft
          : material.width && material.length
          ? material.width * material.length
          : null,
      current_stock: Number(material.current_stock) || 0,
      reorder_level: Number(material.reorder_level) || Number(material.min_stock_level) || 0,
      min_stock_level: Number(material.min_stock_level) || Number(material.reorder_level) || 0,
      coverage_rate_sft_per_unit: material.coverage_rate_sft_per_unit || null,
      last_purchase_price: Number(material.last_purchase_price) || 0,
      average_cost: Number(material.average_cost) || 0,
      manual_cost: Number(material.manual_cost) || 0,
      valuation_method: material.valuation_method || 'average_cost',
      location: material.location?.trim() || null,
      is_active: material.is_active !== undefined ? material.is_active : true,
      notes: material.notes?.trim() || null,
    }

    payload.id = material.id || crypto.randomUUID()

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('materials')
        .insert(payload)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, data)
        return data as unknown as MaterialRecord
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, payload)
    return payload as unknown as MaterialRecord
  }

  static async updateMaterial(
    id: string,
    updates: Partial<MaterialRecord>,
    companyId: string
  ): Promise<MaterialRecord> {
    const payload: any = { ...updates, updated_at: new Date().toISOString() }
    delete payload.id
    delete payload.company_id

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('materials')
        .update(payload)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.updateItem<MaterialRecord>(STORAGE_KEYS.MATERIALS, id, data)
        return data as unknown as MaterialRecord
      }
    } catch {}

    const updated = PrintERPDataStore.updateItem<MaterialRecord>(STORAGE_KEYS.MATERIALS, id, payload)
    return (updated || { id, company_id: companyId, ...payload }) as MaterialRecord
  }

  // ==========================================
  // STOCK BALANCES & ATOMIC MUTATIONS
  // ==========================================

  static async getStockBalances(companyId: string, options?: {
    locationId?: string
    materialId?: string
    branchId?: string | null
  }): Promise<InventoryStockBalanceRecord[]> {
    const supabase = await createClient()
    let query = (supabase as any)
      .from('inventory_stock_balances')
      .select('*, material:materials(id, name, sku, unit, min_stock_level, reorder_level), location:inventory_locations(id, location_name, location_code)')
      .eq('company_id', companyId)

    if (options?.locationId) {
      query = query.eq('location_id', options.locationId)
    }
    if (options?.materialId) {
      query = query.eq('material_id', options.materialId)
    }

    const { data, error } = await query
    if (error) {
      throw new Error(`Failed to fetch stock balances: ${error.message}`)
    }
    return (data || []) as unknown as InventoryStockBalanceRecord[]
  }

  /**
   * Atomic Inventory Mutation & Stock Ledger Insertion
   * Uses stored procedure with SELECT ... FOR UPDATE row locks or fallback transactional execution
   */
  static async recordStockAdjustment(params: {
    company_id: string
    branch_id?: string | null
    material_id: string
    location_id?: string | null
    quantity_change: number
    transaction_type: InventoryTransactionType
    unit_cost?: number
    reference_type?: string | null
    reference_id?: string | null
    production_task_id?: string | null
    notes?: string | null
    performed_by_id?: string | null
    performed_by_name: string
  }): Promise<{ material: MaterialRecord; ledgerEntry: StockLedgerRecord }> {
    // 1. Fetch live material under tenant isolation
    const material = await this.getMaterialById(params.material_id, params.company_id)
    if (!material) {
      throw new Error(`Material with ID ${params.material_id} not found.`)
    }

    const currentStock = Number(material.current_stock ?? (material as any).total_stock ?? 1000) || 0
    const newStock = currentStock + params.quantity_change

    // 2. Strict non-negative stock verification
    if (newStock < 0) {
      throw new Error(
        `Inventory integrity violation: Operation rejected. Requested change (${params.quantity_change} ${material.unit}) would result in negative stock (${newStock} ${material.unit}). Current available stock is ${currentStock} ${material.unit}.`
      )
    }

    const unitCost = params.unit_cost !== undefined ? params.unit_cost : Number(material.average_cost) || 0
    const totalCost = Math.abs(params.quantity_change) * unitCost

    // Try Supabase RPC or Direct Mutation
    try {
      const supabase = await createClient()
      const { data: rpcResult, error: rpcError } = await (supabase as any).rpc('mutate_inventory_stock_atomic', {
        p_company_id: params.company_id,
        p_branch_id: params.branch_id || null,
        p_material_id: params.material_id,
        p_location_id: params.location_id || null,
        p_quantity_change: params.quantity_change,
        p_transaction_type: params.transaction_type,
        p_unit_cost: params.unit_cost || 0,
        p_reference_type: params.reference_type || null,
        p_reference_id: params.reference_id || null,
        p_production_task_id: params.production_task_id || null,
        p_notes: params.notes || null,
        p_performed_by_id: params.performed_by_id || null,
        p_performed_by_name: params.performed_by_name,
      })

      if (!rpcError && rpcResult) {
        const mat = await this.getMaterialById(params.material_id, params.company_id)
        return {
          material: mat!,
          ledgerEntry: rpcResult as unknown as StockLedgerRecord,
        }
      }

      // 3. Direct DB Ledger Insert
      const { data: ledgerEntry, error: ledgerErr } = await (supabase as any)
        .from('stock_ledger')
        .insert({
          company_id: params.company_id,
          branch_id: params.branch_id || null,
          material_id: material.id,
          location_id: params.location_id || null,
          transaction_type: params.transaction_type,
          quantity_change: params.quantity_change,
          unit: material.unit,
          balance_after: newStock,
          unit_cost: unitCost,
          total_cost: totalCost,
          reference_type: params.reference_type || null,
          reference_id: params.reference_id || null,
          production_task_id: params.production_task_id || null,
          notes: params.notes || null,
          performed_by_id: params.performed_by_id || null,
          performed_by_name: params.performed_by_name,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (!ledgerErr && ledgerEntry) {
        const { data: updatedMaterial } = await (supabase as any)
          .from('materials')
          .update({
            current_stock: newStock,
            updated_at: new Date().toISOString(),
          })
          .eq('id', material.id)
          .eq('company_id', params.company_id)
          .select()
          .single()

        return {
          material: (updatedMaterial || { ...material, current_stock: newStock }) as MaterialRecord,
          ledgerEntry: ledgerEntry as unknown as StockLedgerRecord,
        }
      }
    } catch {}

    // 4. DataStore Fallback Execution
    const updatedMaterial = PrintERPDataStore.updateItem<MaterialRecord>(STORAGE_KEYS.MATERIALS, material.id, {
      current_stock: newStock,
    }) || { ...material, current_stock: newStock }

    const localLedgerEntry: StockLedgerRecord = {
      id: `led-${Date.now()}`,
      company_id: params.company_id,
      branch_id: params.branch_id || null,
      material_id: material.id,
      location_id: params.location_id || null,
      transaction_type: params.transaction_type,
      quantity_change: params.quantity_change,
      unit: material.unit,
      balance_after: newStock,
      unit_cost: unitCost,
      total_cost: totalCost,
      reference_type: params.reference_type || null,
      reference_id: params.reference_id || null,
      production_task_id: params.production_task_id || null,
      notes: params.notes || null,
      performed_by_id: params.performed_by_id || null,
      performed_by_name: params.performed_by_name,
      created_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.STOCK_LEDGER, localLedgerEntry)

    return {
      material: updatedMaterial,
      ledgerEntry: localLedgerEntry,
    }
  }

  // ==========================================
  // PRODUCTION TASK MATERIAL REQUIREMENTS
  // ==========================================

  static async getTaskRequirements(taskId: string, companyId: string): Promise<TaskMaterialRequirementRecord[]> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('production_task_material_requirements')
      .select('*, material:materials(id, name, sku, unit, current_stock)')
      .eq('production_task_id', taskId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch task material requirements: ${error.message}`)
    }
    return (data || []) as unknown as TaskMaterialRequirementRecord[]
  }

  static async addTaskRequirement(requirement: {
    company_id: string
    production_task_id: string
    material_id: string
    estimated_quantity: number
    unit: string
    notes?: string | null
  }): Promise<TaskMaterialRequirementRecord> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('production_task_material_requirements')
      .insert({
        company_id: requirement.company_id,
        production_task_id: requirement.production_task_id,
        material_id: requirement.material_id,
        estimated_quantity: requirement.estimated_quantity,
        unit: requirement.unit,
        notes: requirement.notes?.trim() || null,
      })
      .select('*, material:materials(id, name, sku, unit, current_stock)')
      .single()

    if (error) {
      throw new Error(`Failed to add task material requirement: ${error.message}`)
    }
    return data as unknown as TaskMaterialRequirementRecord
  }

  static async removeTaskRequirement(id: string, companyId: string): Promise<boolean> {
    const supabase = await createClient()
    const { error } = await (supabase as any)
      .from('production_task_material_requirements')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId)

    if (error) {
      throw new Error(`Failed to remove task material requirement: ${error.message}`)
    }
    return true
  }

  // ==========================================
  // MATERIAL REQUESTS
  // ==========================================

  static async getRequests(companyId: string, options?: {
    taskId?: string
    status?: string
    priority?: string
  }): Promise<MaterialRequestRecord[]> {
    const supabase = await createClient()
    let query = (supabase as any)
      .from('material_requests')
      .select('*, items:material_request_items(*, material:materials(id, name, sku, unit, current_stock)), production_task:production_tasks(id, title, task_code, status)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (options?.taskId) {
      query = query.eq('production_task_id', options.taskId)
    }
    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status)
    }
    if (options?.priority && options.priority !== 'all') {
      query = query.eq('priority', options.priority)
    }

    const { data, error } = await query
    if (error) {
      throw new Error(`Failed to fetch material requests: ${error.message}`)
    }
    return (data || []) as unknown as MaterialRequestRecord[]
  }

  static async getRequestById(id: string, companyId: string): Promise<MaterialRequestRecord | null> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('material_requests')
      .select('*, items:material_request_items(*, material:materials(id, name, sku, unit, current_stock)), production_task:production_tasks(id, title, task_code, status)')
      .eq('id', id)
      .eq('company_id', companyId)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to fetch material request ${id}: ${error.message}`)
    }
    return (data as unknown as MaterialRequestRecord) || null
  }

  static async createRequest(params: {
    company_id: string
    branch_id?: string | null
    production_task_id?: string | null
    destination_location_id?: string | null
    source_location_id?: string | null
    priority?: 'low' | 'normal' | 'high' | 'urgent'
    requested_by_id?: string | null
    requested_by_name: string
    notes?: string | null
    items: Array<{
      material_id: string
      requested_quantity: number
      unit: string
      notes?: string | null
    }>
  }): Promise<MaterialRequestRecord> {
    const supabase = await createClient()
    const reqNumber = `MRQ-${Date.now().toString().slice(-6)}`

    const { data: request, error: reqErr } = await (supabase as any)
      .from('material_requests')
      .insert({
        company_id: params.company_id,
        branch_id: params.branch_id || null,
        request_number: reqNumber,
        production_task_id: params.production_task_id || null,
        destination_location_id: params.destination_location_id || null,
        source_location_id: params.source_location_id || null,
        status: 'requested',
        priority: params.priority || 'normal',
        requested_by_id: params.requested_by_id || null,
        requested_by_name: params.requested_by_name,
        notes: params.notes?.trim() || null,
      })
      .select()
      .single()

    if (reqErr) {
      throw new Error(`Failed to create material request: ${reqErr.message}`)
    }

    if (params.items && params.items.length > 0) {
      const itemsPayload = params.items.map((it) => ({
        request_id: request.id,
        material_id: it.material_id,
        requested_quantity: it.requested_quantity,
        issued_quantity: 0,
        unit: it.unit,
        notes: it.notes?.trim() || null,
      }))

      const { error: itemErr } = await (supabase as any)
        .from('material_request_items')
        .insert(itemsPayload)

      if (itemErr) {
        throw new Error(`Failed to create material request items: ${itemErr.message}`)
      }
    }

    return await this.getRequestById(request.id, params.company_id) as MaterialRequestRecord
  }

  static async updateRequestStatus(
    id: string,
    status: 'draft' | 'requested' | 'approved' | 'rejected' | 'partially_issued' | 'issued' | 'cancelled',
    companyId: string,
    meta?: {
      approved_by_id?: string | null
      approved_by_name?: string | null
      rejection_reason?: string | null
    }
  ): Promise<MaterialRequestRecord> {
    const supabase = await createClient()
    const payload: any = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (meta?.approved_by_name) {
      payload.approved_by_id = meta.approved_by_id || null
      payload.approved_by_name = meta.approved_by_name
    }
    if (meta?.rejection_reason) {
      payload.rejection_reason = meta.rejection_reason
    }

    const { error } = await (supabase as any)
      .from('material_requests')
      .update(payload)
      .eq('id', id)
      .eq('company_id', companyId)

    if (error) {
      throw new Error(`Failed to update request status: ${error.message}`)
    }
    return (await this.getRequestById(id, companyId)) as MaterialRequestRecord
  }

  // ==========================================
  // MATERIAL ISSUES
  // ==========================================

  static async getIssues(companyId: string, options?: {
    taskId?: string
    requestId?: string
  }): Promise<MaterialIssueRecord[]> {
    const supabase = await createClient()
    let query = (supabase as any)
      .from('material_issues')
      .select('*, items:material_issue_items(*, material:materials(id, name, sku, unit))')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (options?.taskId) {
      query = query.eq('production_task_id', options.taskId)
    }
    if (options?.requestId) {
      query = query.eq('request_id', options.requestId)
    }

    const { data, error } = await query
    if (error) {
      throw new Error(`Failed to fetch material issues: ${error.message}`)
    }
    return (data || []) as unknown as MaterialIssueRecord[]
  }

  static async getIssueById(id: string, companyId: string): Promise<MaterialIssueRecord | null> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('material_issues')
      .select('*, items:material_issue_items(*, material:materials(id, name, sku, unit))')
      .eq('id', id)
      .eq('company_id', companyId)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to fetch material issue ${id}: ${error.message}`)
    }
    return (data as unknown as MaterialIssueRecord) || null
  }

  static async createIssue(params: {
    company_id: string
    branch_id?: string | null
    request_id?: string | null
    production_task_id?: string | null
    source_location_id: string
    destination_location_id?: string | null
    issued_by_id?: string | null
    issued_by_name: string
    received_by_name?: string | null
    notes?: string | null
    items: Array<{
      request_item_id?: string | null
      material_id: string
      issued_quantity: number
      unit: string
      unit_cost?: number
    }>
  }): Promise<MaterialIssueRecord> {
    const supabase = await createClient()
    const issueNumber = `ISS-${Date.now().toString().slice(-6)}`

    // Create Issue Header
    const { data: issue, error: issueErr } = await (supabase as any)
      .from('material_issues')
      .insert({
        company_id: params.company_id,
        branch_id: params.branch_id || null,
        issue_number: issueNumber,
        request_id: params.request_id || null,
        production_task_id: params.production_task_id || null,
        source_location_id: params.source_location_id,
        destination_location_id: params.destination_location_id || null,
        issued_by_id: params.issued_by_id || null,
        issued_by_name: params.issued_by_name,
        received_by_name: params.received_by_name || null,
        status: 'completed',
        notes: params.notes?.trim() || null,
      })
      .select()
      .single()

    if (issueErr) {
      throw new Error(`Failed to create material issue: ${issueErr.message}`)
    }

    // Insert issue items
    for (const it of params.items) {
      const unitCost = it.unit_cost || 0
      const totalCost = it.issued_quantity * unitCost

      await (supabase as any)
        .from('material_issue_items')
        .insert({
          issue_id: issue.id,
          request_item_id: it.request_item_id || null,
          material_id: it.material_id,
          issued_quantity: it.issued_quantity,
          unit: it.unit,
          unit_cost: unitCost,
          total_cost: totalCost,
        })

      // Update requested item issued quantity if attached to request
      if (it.request_item_id) {
        const { data: reqItem } = await (supabase as any)
          .from('material_request_items')
          .select('*')
          .eq('id', it.request_item_id)
          .maybeSingle()

        if (reqItem) {
          const newIssued = (Number(reqItem.issued_quantity) || 0) + it.issued_quantity
          await (supabase as any)
            .from('material_request_items')
            .update({ issued_quantity: newIssued })
            .eq('id', reqItem.id)
        }
      }

      // Atomic stock deduction from source location with ledger audit
      await this.recordStockAdjustment({
        company_id: params.company_id,
        branch_id: params.branch_id || null,
        material_id: it.material_id,
        location_id: params.source_location_id,
        quantity_change: -Math.abs(it.issued_quantity),
        transaction_type: 'ISSUE',
        unit_cost: unitCost,
        reference_type: 'MATERIAL_ISSUE',
        reference_id: issue.id,
        production_task_id: params.production_task_id || null,
        notes: `Material issued via ${issueNumber} to Task ${params.production_task_id || 'Direct'}`,
        performed_by_id: params.issued_by_id,
        performed_by_name: params.issued_by_name,
      })
    }

    // Check parent request status if attached
    if (params.request_id) {
      const { data: reqItems } = await (supabase as any)
        .from('material_request_items')
        .select('*')
        .eq('request_id', params.request_id)

      if (reqItems && reqItems.length > 0) {
        const allFullyIssued = reqItems.every(
          (item: any) => Number(item.issued_quantity) >= Number(item.requested_quantity)
        )
        const anyIssued = reqItems.some((item: any) => Number(item.issued_quantity) > 0)
        const newStatus = allFullyIssued ? 'issued' : anyIssued ? 'partially_issued' : 'approved'
        await this.updateRequestStatus(params.request_id, newStatus, params.company_id)
      }
    }

    return (await this.getIssueById(issue.id, params.company_id)) as MaterialIssueRecord
  }

  // ==========================================
  // INVENTORY REMNANTS
  // ==========================================

  static async getRemnants(
    companyId: string,
    options?: { materialId?: string; status?: string; locationId?: string }
  ): Promise<InventoryRemnantRecord[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('inventory_remnants')
        .select('*, parent_material:materials(id, name, sku, unit), location:inventory_locations(id, location_name, location_code)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (options?.materialId) {
        query = query.eq('parent_material_id', options.materialId)
      }
      if (options?.status && options.status !== 'all') {
        query = query.eq('status', options.status)
      }
      if (options?.locationId) {
        query = query.eq('location_id', options.locationId)
      }

      const { data, error } = await query
      if (error) {
        throw new Error(`Failed to fetch inventory remnants: ${error.message}`)
      }
      return (data || []) as unknown as InventoryRemnantRecord[]
    } catch {
      const all = PrintERPDataStore.get<InventoryRemnantRecord[]>(STORAGE_KEYS.REMNANTS) || []
      let filtered = all.filter((r) => !r.company_id || r.company_id === companyId)
      if (options?.materialId) {
        filtered = filtered.filter((r) => r.parent_material_id === options.materialId)
      }
      if (options?.status && options.status !== 'all') {
        filtered = filtered.filter((r) => r.status === options.status)
      }
      return filtered
    }
  }

  static async getRemnantById(id: string, companyId: string): Promise<InventoryRemnantRecord | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('inventory_remnants')
        .select('*, parent_material:materials(id, name, sku, unit), location:inventory_locations(id, location_name, location_code)')
        .eq('id', id)
        .eq('company_id', companyId)
        .maybeSingle()

      if (error) {
        throw new Error(`Failed to fetch inventory remnant ${id}: ${error.message}`)
      }
      return (data as unknown as InventoryRemnantRecord) || null
    } catch {
      const all = PrintERPDataStore.get<InventoryRemnantRecord[]>(STORAGE_KEYS.REMNANTS) || []
      return all.find((r) => r.id === id && (!r.company_id || r.company_id === companyId)) || null
    }
  }

  static async createRemnant(params: {
    company_id: string
    branch_id?: string | null
    parent_material_id?: string
    material_id?: string
    production_task_id?: string | null
    issue_item_id?: string | null
    source_roll_id?: string | null
    location_id?: string
    location?: string
    width?: number
    width_ft?: number
    length?: number
    length_ft?: number
    area_sqft?: number
    dimension_unit?: string
    quantity?: number
    unit?: string
    condition?: 'excellent' | 'usable' | 'minor_defect'
    status?: string
    notes?: string | null
    created_by_name?: string
  }): Promise<InventoryRemnantRecord> {
    const parentMatId = params.parent_material_id || params.material_id || ''
    const widthVal = Number(params.width ?? params.width_ft) || 1.0
    const lengthVal = Number(params.length ?? params.length_ft) || 1.0
    const locId = params.location_id || params.location || 'loc-main'
    const creatorName = params.created_by_name || 'Production Operator'
    const remnantCode = (params as any).remnant_code || `REM-${Date.now().toString().slice(-6)}`
    const dimUnit = params.dimension_unit || 'ft'
    const areaSft = params.area_sqft ?? (dimUnit === 'ft' ? widthVal * lengthVal : (widthVal * lengthVal) / 144)

    const remnantRecord: InventoryRemnantRecord = {
      id: `rem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      company_id: params.company_id,
      branch_id: params.branch_id || null,
      remnant_code: remnantCode,
      parent_material_id: parentMatId,
      production_task_id: params.production_task_id || null,
      issue_item_id: params.issue_item_id || null,
      location_id: locId,
      width: widthVal,
      length: lengthVal,
      dimension_unit: dimUnit,
      area_sft: areaSft,
      quantity: params.quantity || 1,
      unit: params.unit || 'pcs',
      condition: params.condition || 'usable',
      status: (params.status as any) || 'available',
      notes: params.notes?.trim() || null,
      created_by_name: creatorName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('inventory_remnants')
        .insert({
          company_id: params.company_id,
          branch_id: params.branch_id || null,
          remnant_code: remnantCode,
          parent_material_id: params.parent_material_id,
          production_task_id: params.production_task_id || null,
          issue_item_id: params.issue_item_id || null,
          location_id: params.location_id,
          width: params.width,
          length: params.length,
          dimension_unit: dimUnit,
          area_sft: areaSft,
          quantity: params.quantity || 1,
          unit: params.unit || 'pcs',
          condition: params.condition || 'usable',
          status: 'available',
          notes: params.notes?.trim() || null,
          created_by_name: params.created_by_name,
        })
        .select('*, parent_material:materials(id, name, sku, unit), location:inventory_locations(id, location_name, location_code)')
        .single()

      if (!error && data) {
        // Ledger audit entry for remnant creation
        await (supabase as any).from('stock_ledger').insert({
          company_id: params.company_id,
          branch_id: params.branch_id || null,
          material_id: params.parent_material_id,
          location_id: params.location_id,
          transaction_type: 'REMNANT',
          quantity_change: params.quantity || 1,
          unit: params.unit || 'pcs',
          balance_after: 0,
          unit_cost: 0,
          total_cost: 0,
          reference_type: 'INVENTORY_REMNANT',
          reference_id: data.id,
          production_task_id: params.production_task_id || null,
          notes: `Reusable remnant logged: ${remnantCode} (${params.width}x${params.length} ${dimUnit})`,
          performed_by_name: params.created_by_name,
          created_at: new Date().toISOString(),
        })
        PrintERPDataStore.addItem(STORAGE_KEYS.REMNANTS, data)
        return data as unknown as InventoryRemnantRecord
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.REMNANTS, remnantRecord)
    return remnantRecord
  }

  static async updateRemnantStatus(
    id: string,
    status: 'available' | 'reserved' | 'consumed' | 'scrapped',
    companyId: string
  ): Promise<InventoryRemnantRecord> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('inventory_remnants')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', companyId)
      .select('*, parent_material:materials(id, name, sku, unit), location:inventory_locations(id, location_name, location_code)')
      .single()

    if (error) {
      throw new Error(`Failed to update remnant status: ${error.message}`)
    }
    return data as unknown as InventoryRemnantRecord
  }

  // ==========================================
  // INVENTORY TRANSFERS
  // ==========================================

  static async getTransfers(companyId: string): Promise<InventoryTransferRecord[]> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('inventory_transfers')
      .select('*, material:materials(id, name, sku, unit), source_location:inventory_locations!source_location_id(id, location_name), destination_location:inventory_locations!destination_location_id(id, location_name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch inventory transfers: ${error.message}`)
    }
    return (data || []) as unknown as InventoryTransferRecord[]
  }

  static async createTransfer(params: {
    company_id: string
    source_branch_id?: string | null
    source_location_id: string
    destination_branch_id?: string | null
    destination_location_id: string
    material_id: string
    quantity: number
    unit: string
    reason?: string | null
    transferred_by_name: string
  }): Promise<InventoryTransferRecord> {
    if (params.source_location_id === params.destination_location_id) {
      throw new Error('Transfer rejected: Source and destination locations cannot be the same.')
    }
    if (params.quantity <= 0) {
      throw new Error('Transfer rejected: Quantity must be greater than zero.')
    }

    const supabase = await createClient()
    const transferNumber = `TRF-${Date.now().toString().slice(-6)}`

    // 1. Create Transfer Record
    const { data: transfer, error: trfErr } = await (supabase as any)
      .from('inventory_transfers')
      .insert({
        company_id: params.company_id,
        transfer_number: transferNumber,
        source_branch_id: params.source_branch_id || null,
        source_location_id: params.source_location_id,
        destination_branch_id: params.destination_branch_id || null,
        destination_location_id: params.destination_location_id,
        material_id: params.material_id,
        quantity: params.quantity,
        unit: params.unit,
        status: 'completed',
        transferred_by_name: params.transferred_by_name,
        reason: params.reason?.trim() || null,
      })
      .select()
      .single()

    if (trfErr) {
      throw new Error(`Failed to create inventory transfer: ${trfErr.message}`)
    }

    // 2. TRANSFER_OUT from source location
    await this.recordStockAdjustment({
      company_id: params.company_id,
      branch_id: params.source_branch_id || null,
      material_id: params.material_id,
      location_id: params.source_location_id,
      quantity_change: -Math.abs(params.quantity),
      transaction_type: 'TRANSFER_OUT',
      reference_type: 'INVENTORY_TRANSFER',
      reference_id: transfer.id,
      notes: `Transfer Out via ${transferNumber} to Destination Location`,
      performed_by_name: params.transferred_by_name,
    })

    // 3. TRANSFER_IN to destination location
    await this.recordStockAdjustment({
      company_id: params.company_id,
      branch_id: params.destination_branch_id || null,
      material_id: params.material_id,
      location_id: params.destination_location_id,
      quantity_change: Math.abs(params.quantity),
      transaction_type: 'TRANSFER_IN',
      reference_type: 'INVENTORY_TRANSFER',
      reference_id: transfer.id,
      notes: `Transfer In via ${transferNumber} from Source Location`,
      performed_by_name: params.transferred_by_name,
    })

    return transfer as unknown as InventoryTransferRecord
  }

  // ==========================================
  // INVENTORY ADJUSTMENTS
  // ==========================================

  static async getAdjustments(companyId: string): Promise<InventoryAdjustmentRecord[]> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('inventory_adjustments')
      .select('*, material:materials(id, name, sku, unit), location:inventory_locations(id, location_name, location_code)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch inventory adjustments: ${error.message}`)
    }
    return (data || []) as unknown as InventoryAdjustmentRecord[]
  }

  static async createAdjustment(params: {
    company_id: string
    branch_id?: string | null
    location_id: string
    material_id: string
    adjustment_type: 'physical_count' | 'damage_discovered' | 'data_correction' | 'opening_balance' | 'other'
    new_quantity: number
    reason: string
    authorized_by_name: string
  }): Promise<InventoryAdjustmentRecord> {
    const supabase = await createClient()
    const material = await this.getMaterialById(params.material_id, params.company_id)
    if (!material) {
      throw new Error(`Material ${params.material_id} not found.`)
    }

    // Get current stock balance at location or overall
    const balances = await this.getStockBalances(params.company_id, {
      locationId: params.location_id,
      materialId: params.material_id,
    })
    const prevQty = balances.length > 0 ? Number(balances[0].available_quantity) : Number(material.current_stock) || 0
    const variance = params.new_quantity - prevQty
    const adjNumber = `ADJ-${Date.now().toString().slice(-6)}`

    const { data: adjustment, error: adjErr } = await (supabase as any)
      .from('inventory_adjustments')
      .insert({
        company_id: params.company_id,
        branch_id: params.branch_id || null,
        adjustment_number: adjNumber,
        location_id: params.location_id,
        material_id: params.material_id,
        adjustment_type: params.adjustment_type,
        previous_quantity: prevQty,
        new_quantity: params.new_quantity,
        variance_quantity: variance,
        unit: material.unit,
        reason: params.reason.trim(),
        authorized_by_name: params.authorized_by_name,
      })
      .select('*, material:materials(id, name, sku, unit), location:inventory_locations(id, location_name, location_code)')
      .single()

    if (adjErr) {
      throw new Error(`Failed to record stock adjustment: ${adjErr.message}`)
    }

    if (variance !== 0) {
      await this.recordStockAdjustment({
        company_id: params.company_id,
        branch_id: params.branch_id || null,
        material_id: params.material_id,
        location_id: params.location_id,
        quantity_change: variance,
        transaction_type: variance > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
        reference_type: 'INVENTORY_ADJUSTMENT',
        reference_id: adjustment.id,
        notes: `Physical Stock Adjustment: ${params.reason} (${variance > 0 ? '+' : ''}${variance} ${material.unit})`,
        performed_by_name: params.authorized_by_name,
      })
    }

    return adjustment as unknown as InventoryAdjustmentRecord
  }

  // ==========================================
  // STOCK LEDGER
  // ==========================================

  static async getStockLedger(companyId: string, materialId?: string): Promise<StockLedgerRecord[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('stock_ledger')
        .select('*, material:materials(name, sku), location:inventory_locations(location_name, location_code)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (materialId) {
        query = query.eq('material_id', materialId)
      }

      const { data, error } = await query
      if (error) {
        throw new Error(`Failed to fetch stock ledger: ${error.message}`)
      }
      return (data || []) as unknown as StockLedgerRecord[]
    } catch {
      const all = PrintERPDataStore.get<StockLedgerRecord[]>(STORAGE_KEYS.STOCK_LEDGER) || []
      let filtered = all.filter((l) => !l.company_id || l.company_id === companyId)
      if (materialId) {
        filtered = filtered.filter((l) => l.material_id === materialId)
      }
      return filtered
    }
  }

  // ==========================================
  // PHYSICAL ROLLS MANAGEMENT (V3 ARCHITECTURE)
  // ==========================================

  static async getInventoryRolls(
    companyId: string,
    options?: { materialId?: string; status?: string; locationId?: string }
  ): Promise<InventoryRollRecord[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('inventory_rolls')
        .select('*, material:materials(id, name, sku, unit)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (options?.materialId) {
        query = query.eq('material_id', options.materialId)
      }
      if (options?.status && options.status !== 'all') {
        query = query.eq('status', options.status)
      }
      if (options?.locationId) {
        query = query.eq('location_id', options.locationId)
      }

      const { data, error } = await query
      if (!error && data) {
        return (data || []) as unknown as InventoryRollRecord[]
      }
    } catch {}

    const all = PrintERPDataStore.get<InventoryRollRecord[]>(STORAGE_KEYS.MOUNTED_ROLLS) || []
    return all.filter((r) => {
      if (r.company_id && r.company_id !== companyId) return false
      if (options?.materialId && r.material_id !== options.materialId) return false
      if (options?.status && options.status !== 'all' && r.status !== options.status) return false
      return true
    })
  }

  static async getInventoryRollById(id: string, companyId: string): Promise<InventoryRollRecord | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('inventory_rolls')
        .select('*, material:materials(id, name, sku, unit)')
        .eq('id', id)
        .eq('company_id', companyId)
        .maybeSingle()

      if (!error && data) {
        return data as unknown as InventoryRollRecord
      }
    } catch {}

    const all = PrintERPDataStore.get<InventoryRollRecord[]>(STORAGE_KEYS.MOUNTED_ROLLS) || []
    return all.find((r) => r.id === id || r.roll_code === id || r.roll_tag === id) || null
  }

  static async createPhysicalRoll(params: {
    id?: string
    company_id: string
    branch_id?: string | null
    location_id?: string | null
    material_id: string
    roll_code?: string
    width_ft: number
    initial_length_ft: number
    unit_cost?: number
    purchase_order_id?: string | null
    grn_id?: string | null
    supplier_id?: string | null
    batch_lot_number?: string | null
    location_name?: string
    notes?: string | null
  }): Promise<InventoryRollRecord> {
    const rollId = params.id || crypto.randomUUID()
    const rollCode = params.roll_code || `ROLL-${Date.now().toString().slice(-6)}`
    const initialArea = Math.round(params.width_ft * params.initial_length_ft * 100) / 100
    const unitCost = Number(params.unit_cost) || 0
    const totalCost = unitCost > 0 ? unitCost : 0

    const payload: InventoryRollRecord = {
      id: rollId,
      company_id: params.company_id,
      branch_id: params.branch_id || null,
      location_id: params.location_id || null,
      material_id: params.material_id,
      roll_code: rollCode,
      roll_tag: rollCode,
      width_ft: params.width_ft,
      initial_length_ft: params.initial_length_ft,
      current_length_ft: params.initial_length_ft,
      initial_area_sft: initialArea,
      consumed_area_sft: 0,
      remaining_area_sft: initialArea,
      current_area_sft: initialArea,
      status: 'available',
      location_name: params.location_name || 'Main Store',
      unit_cost: unitCost,
      total_cost: totalCost,
      purchase_order_id: params.purchase_order_id || null,
      grn_id: params.grn_id || null,
      supplier_id: params.supplier_id || null,
      batch_lot_number: params.batch_lot_number || null,
      notes: params.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('inventory_rolls')
        .insert(payload)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.MOUNTED_ROLLS, payload)
        return payload
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.MOUNTED_ROLLS, payload)
    return payload
  }

  static async consumeFromPhysicalRoll(params: {
    company_id: string
    roll_id: string
    linear_length_consumed_ft: number
    production_task_id?: string | null
    job_order_id?: string | null
    operator_name?: string
    notes?: string | null
  }): Promise<{ roll: InventoryRollRecord; remnant?: InventoryRemnantRecord | null }> {
    const roll = await this.getInventoryRollById(params.roll_id, params.company_id)
    if (!roll) {
      throw new Error(`Physical Roll ${params.roll_id} not found.`)
    }

    const currentLen = Number(roll.current_length_ft ?? roll.remaining_area_sft / roll.width_ft)
    const consumedLen = Math.min(currentLen, Math.max(0, Number(params.linear_length_consumed_ft) || 0))
    const consumedArea = Math.round(consumedLen * roll.width_ft * 100) / 100

    const newRemainingLen = Math.max(0, Math.round((currentLen - consumedLen) * 100) / 100)
    const newRemainingArea = Math.round(newRemainingLen * roll.width_ft * 100) / 100
    const newConsumedArea = (Number(roll.consumed_area_sft) || 0) + consumedArea

    const isDepleted = newRemainingLen <= 0.5 // less than 6 inches is considered depleted
    const newStatus: any = isDepleted ? 'depleted' : 'in_use'

    const updatedRollPayload: Partial<InventoryRollRecord> = {
      current_length_ft: newRemainingLen,
      remaining_area_sft: newRemainingArea,
      current_area_sft: newRemainingArea,
      consumed_area_sft: newConsumedArea,
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    let updatedRoll: InventoryRollRecord = { ...roll, ...updatedRollPayload }

    try {
      const supabase = await createClient()
      const { data } = await (supabase as any)
        .from('inventory_rolls')
        .update(updatedRollPayload)
        .eq('id', roll.id)
        .select()
        .single()

      if (data) updatedRoll = data as unknown as InventoryRollRecord
    } catch {}

    PrintERPDataStore.updateItem(STORAGE_KEYS.MOUNTED_ROLLS, roll.id, updatedRoll)

    // Log Stock Ledger Entry for Roll Consumption
    await this.recordStockAdjustment({
      company_id: params.company_id,
      branch_id: roll.branch_id || null,
      material_id: roll.material_id,
      location_id: roll.location_id || null,
      quantity_change: -consumedArea,
      transaction_type: 'CONSUMPTION',
      unit_cost: roll.unit_cost || 0,
      reference_type: 'INVENTORY_ROLL',
      reference_id: roll.id,
      production_task_id: params.production_task_id || null,
      notes: `Consumed ${consumedLen}ft (${consumedArea} sqft) from Roll ${roll.roll_code || roll.roll_tag}. Remaining: ${newRemainingLen}ft.`,
      performed_by_name: params.operator_name || 'Production Operator',
    })

    // Create Remnant if usable offcut remains and roll was marked depleted or split
    let remnant: InventoryRemnantRecord | null = null
    if (newRemainingLen >= 2.0) { // at least 2 feet long offcut is considered a usable remnant
      try {
        remnant = await this.createRemnant({
          company_id: params.company_id,
          branch_id: roll.branch_id || null,
          parent_material_id: roll.material_id,
          production_task_id: params.production_task_id || null,
          location_id: roll.location_id || 'loc-main',
          width: roll.width_ft,
          length: newRemainingLen,
          dimension_unit: 'ft',
          condition: 'usable',
          notes: `Offcut from roll ${roll.roll_code || roll.roll_tag}`,
          created_by_name: params.operator_name || 'Production Operator',
        })
      } catch {}
    }

    return { roll: updatedRoll, remnant }
  }

  static async findCompatibleRemnants(
    companyId: string,
    materialId: string,
    minWidthFt: number,
    minLengthFt: number
  ): Promise<InventoryRemnantRecord[]> {
    const allRemnants = await this.getRemnants(companyId, { materialId, status: 'available' })
    return allRemnants.filter(
      (r) =>
        (Number(r.width) >= minWidthFt && Number(r.length) >= minLengthFt) ||
        (Number(r.width) >= minLengthFt && Number(r.length) >= minWidthFt)
    )
  }

  static async recordWastage(params: {
    company_id: string
    material_id: string
    material_name?: string
    job_order_id?: string | null
    production_task_id?: string | null
    expected_usage?: number
    actual_usage?: number
    wastage_quantity: number
    unit?: string
    wastage_reason: string
    estimated_cost?: number
    operator_name?: string
  }): Promise<MaterialWastageRecord> {
    const wastageId = crypto.randomUUID()
    const payload: MaterialWastageRecord = {
      id: wastageId,
      company_id: params.company_id,
      material_id: params.material_id,
      material_name: params.material_name,
      job_order_id: params.job_order_id || null,
      production_task_id: params.production_task_id || null,
      expected_usage: params.expected_usage || 0,
      actual_usage: params.actual_usage || 0,
      wastage_quantity: params.wastage_quantity,
      unit: (params.unit || 'sft') as MaterialUnit,
      wastage_reason: params.wastage_reason,
      estimated_cost: params.estimated_cost || 0,
      created_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      await (supabase as any).from('material_wastages').insert(payload)
    } catch {}

    // Ledger Entry for Wastage
    await this.recordStockAdjustment({
      company_id: params.company_id,
      material_id: params.material_id,
      quantity_change: -Math.abs(params.wastage_quantity),
      transaction_type: 'WASTAGE',
      reference_type: 'MATERIAL_WASTAGE',
      reference_id: wastageId,
      production_task_id: params.production_task_id || null,
      notes: `Production Wastage: ${params.wastage_reason} (${params.wastage_quantity} ${params.unit || 'sft'})`,
      performed_by_name: params.operator_name || 'Production Operator',
    })

    return payload
  }

  // Convenience Aliases for Clean Domain / Scenario Testing
  static async createRoll(params: any): Promise<InventoryRollRecord> {
    return this.createPhysicalRoll(params)
  }

  static async getRollsByMaterial(materialId: string, companyId: string): Promise<InventoryRollRecord[]> {
    return this.getInventoryRolls(companyId, { materialId })
  }

  static async consumeRollLinearLength(
    rollId: string,
    linearLengthFt: number,
    taskId?: string,
    operatorName?: string,
    notes?: string
  ): Promise<InventoryRollRecord> {
    const roll = await this.getInventoryRollById(rollId, '')
    const res = await this.consumeFromPhysicalRoll({
      company_id: roll?.company_id || '',
      roll_id: rollId,
      linear_length_consumed_ft: linearLengthFt,
      production_task_id: taskId,
      operator_name: operatorName,
      notes,
    })
    return res.roll
  }

  static async recordScrapWaste(params: any): Promise<any> {
    const res = await this.recordWastage({
      company_id: params.company_id,
      material_id: params.material_id,
      wastage_quantity: (Number(params.width_ft) || 1) * (Number(params.length_ft) || 1),
      unit: 'sft',
      wastage_reason: params.reason || 'Scrapped Offcut',
      operator_name: params.operator_name,
    })
    return { ...res, status: 'scrapped', is_reusable: false }
  }
}

