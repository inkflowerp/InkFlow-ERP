import { createClient } from '@/lib/supabase/server'
import {
  MachineryRecord,
  MachineryAssignmentRecord,
  MachineryMaintenanceRecord,
  MachineryBreakdownRecord,
  MachineryFilterOptions,
  CreateMachineryInput,
  UpdateMachineryInput,
  MachineryStatus,
  AssignmentStatus,
  MaintenanceStatus,
  BreakdownStatus,
} from '@/types/machinery.types'

export class MachineryRepository {
  /**
   * Fetches all machineries for a tenant with optional filtering
   */
  static async getMachineries(
    companyId: string,
    filters?: MachineryFilterOptions
  ): Promise<MachineryRecord[]> {
    const supabase = await createClient()
    let query = (supabase as any)
      .from('machineries')
      .select('*, branch:branches(id, name, code)')
      .eq('company_id', companyId)

    if (!filters?.includeArchived) {
      query = query.eq('is_archived', false)
    }

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters?.machine_type && filters.machine_type !== 'all') {
      query = query.eq('machine_type', filters.machine_type)
    }

    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }

    if (filters?.department && filters.department !== 'all') {
      query = query.eq('department', filters.department)
    }

    if (filters?.branch_id && filters.branch_id !== 'all') {
      query = query.eq('branch_id', filters.branch_id)
    }

    if (filters?.availabilityOnly) {
      query = query.eq('status', 'available')
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch machineries: ${error.message}`)
    }

    let records = (data || []) as unknown as MachineryRecord[]

    // Search query filter (client-safe pattern matching)
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim()
      records = records.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.code.toLowerCase().includes(q) ||
          (m.brand && m.brand.toLowerCase().includes(q)) ||
          (m.model && m.model.toLowerCase().includes(q)) ||
          (m.serial_number && m.serial_number.toLowerCase().includes(q)) ||
          (m.location && m.location.toLowerCase().includes(q))
      )
    }

    return records
  }

  /**
   * Fetches a single machinery by ID within tenant context
   */
  static async getMachineryById(
    id: string,
    companyId: string
  ): Promise<MachineryRecord | null> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('machineries')
      .select('*, branch:branches(id, name, code)')
      .eq('id', id)
      .eq('company_id', companyId)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to fetch machinery ${id}: ${error.message}`)
    }

    if (!data) return null

    const machine = data as unknown as MachineryRecord

    // Fetch active assignment if present
    const { data: assignments } = await (supabase as any)
      .from('machinery_assignments')
      .select('*, job_order:job_orders(id, job_number, product_name, customer_name, quantity, deadline, status), production_job:production_jobs(id, production_job_number, product_name, customer_name, department, status)')
      .eq('machine_id', id)
      .eq('company_id', companyId)
      .in('status', ['scheduled', 'in_progress'])
      .order('scheduled_start', { ascending: true })
      .limit(1)

    if (assignments && assignments.length > 0) {
      machine.current_assignment = assignments[0] as unknown as MachineryAssignmentRecord
    }

    // Fetch latest breakdown if present
    const { data: breakdowns } = await (supabase as any)
      .from('machinery_breakdowns')
      .select('*, affected_job_order:job_orders(id, job_number, product_name, customer_name)')
      .eq('machine_id', id)
      .eq('company_id', companyId)
      .order('reported_at', { ascending: false })
      .limit(1)

    if (breakdowns && breakdowns.length > 0) {
      machine.latest_breakdown = breakdowns[0] as unknown as MachineryBreakdownRecord
    }

    // Fetch next scheduled maintenance
    const { data: maintenances } = await (supabase as any)
      .from('machinery_maintenances')
      .select('*')
      .eq('machine_id', id)
      .eq('company_id', companyId)
      .eq('status', 'scheduled')
      .order('scheduled_date', { ascending: true })
      .limit(1)

    if (maintenances && maintenances.length > 0) {
      machine.next_maintenance = maintenances[0] as unknown as MachineryMaintenanceRecord
    }

    return machine
  }

  /**
   * Checks if machine code already exists in tenant
   */
  static async checkCodeExists(
    code: string,
    companyId: string,
    excludeId?: string
  ): Promise<boolean> {
    const supabase = await createClient()
    let query = (supabase as any)
      .from('machineries')
      .select('id')
      .eq('company_id', companyId)
      .ilike('code', code.trim())

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query
    if (error) return false
    return Boolean(data && data.length > 0)
  }

  /**
   * Creates a new machinery record
   */
  static async createMachinery(
    input: CreateMachineryInput & { company_id: string }
  ): Promise<MachineryRecord> {
    const supabase = await createClient()
    const payload = {
      company_id: input.company_id,
      branch_id: input.branch_id || null,
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      machine_type: input.machine_type,
      category: input.category || 'printing',
      brand: input.brand?.trim() || null,
      model: input.model?.trim() || null,
      serial_number: input.serial_number?.trim() || null,
      description: input.description?.trim() || null,
      photo_url: input.photo_url || null,
      purchase_date: input.purchase_date || null,
      installation_date: input.installation_date || null,
      supplier: input.supplier?.trim() || null,
      supplier_id: input.supplier_id || null,
      warranty_expiry: input.warranty_expiry || null,
      location: input.location?.trim() || null,
      department: input.department || 'printing',
      status: 'available',
      is_archived: false,

      // Production specs
      supported_production_types: input.supported_production_types || [],
      supported_materials: input.supported_materials || [],
      supported_units: input.supported_units || [],
      max_width: input.max_width ?? null,
      max_height: input.max_height ?? null,
      max_length: input.max_length ?? null,
      min_width: input.min_width ?? null,
      min_height: input.min_height ?? null,
      dimension_unit: input.dimension_unit || 'inch',
      production_capacity: input.production_capacity || 0,
      capacity_unit: input.capacity_unit || 'sft/hour',
      estimated_speed: input.estimated_speed || 0,
      speed_unit: input.speed_unit || 'sft/hour',
      setup_time_mins: input.setup_time_mins || 0,
      changeover_time_mins: input.changeover_time_mins || 0,
      default_operator_requirement: input.default_operator_requirement?.trim() || null,
      operators_required_count: input.operators_required_count || 1,

      // Costing specs
      purchase_cost: input.purchase_cost || 0,
      hourly_machine_cost: input.hourly_machine_cost || 0,
      per_unit_machine_cost: input.per_unit_machine_cost || 0,
      electricity_cost_per_hour: input.electricity_cost_per_hour || 0,
      maintenance_cost_per_hour: input.maintenance_cost_per_hour || 0,
      other_operating_cost_per_hour: input.other_operating_cost_per_hour || 0,
    }

    const { data, error } = await (supabase as any)
      .from('machineries')
      .insert(payload)
      .select('*, branch:branches(id, name, code)')
      .single()

    if (error) {
      throw new Error(`Failed to create machinery: ${error.message}`)
    }

    return data as unknown as MachineryRecord
  }

  /**
   * Updates an existing machinery record
   */
  static async updateMachinery(
    id: string,
    companyId: string,
    updates: UpdateMachineryInput
  ): Promise<MachineryRecord> {
    const supabase = await createClient()
    const payload: Record<string, any> = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    if (updates.code) {
      payload.code = updates.code.trim().toUpperCase()
    }
    if (updates.status) {
      payload.status_updated_at = new Date().toISOString()
    }

    const { data, error } = await (supabase as any)
      .from('machineries')
      .update(payload)
      .eq('id', id)
      .eq('company_id', companyId)
      .select('*, branch:branches(id, name, code)')
      .single()

    if (error) {
      throw new Error(`Failed to update machinery ${id}: ${error.message}`)
    }

    return data as unknown as MachineryRecord
  }

  /**
   * Updates machine status
   */
  static async updateStatus(
    id: string,
    companyId: string,
    status: MachineryStatus,
    statusNotes?: string | null
  ): Promise<MachineryRecord> {
    return this.updateMachinery(id, companyId, {
      status,
      status_notes: statusNotes || null,
    })
  }

  /**
   * Soft archives / retires a machinery
   */
  static async archiveMachinery(id: string, companyId: string): Promise<MachineryRecord> {
    return this.updateMachinery(id, companyId, {
      is_archived: true,
      status: 'retired',
      status_notes: 'Archived / Retired from fleet service',
    })
  }

  // ============================================================================
  // ASSIGNMENTS
  // ============================================================================

  static async getAssignments(
    machineId: string,
    companyId: string
  ): Promise<MachineryAssignmentRecord[]> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('machinery_assignments')
      .select('*, job_order:job_orders(id, job_number, product_name, customer_name, quantity, deadline, status), production_job:production_jobs(id, production_job_number, product_name, customer_name, department, status)')
      .eq('machine_id', machineId)
      .eq('company_id', companyId)
      .order('scheduled_start', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch assignments for machine ${machineId}: ${error.message}`)
    }

    return (data || []) as unknown as MachineryAssignmentRecord[]
  }

  static async getOverlappingAssignments(
    machineId: string,
    companyId: string,
    start: string,
    end: string,
    excludeAssignmentId?: string
  ): Promise<MachineryAssignmentRecord[]> {
    const supabase = await createClient()
    let query = (supabase as any)
      .from('machinery_assignments')
      .select('*, job_order:job_orders(id, job_number, product_name, customer_name)')
      .eq('machine_id', machineId)
      .eq('company_id', companyId)
      .in('status', ['scheduled', 'in_progress'])
      .lt('scheduled_start', end)
      .gt('scheduled_end', start)

    if (excludeAssignmentId) {
      query = query.neq('id', excludeAssignmentId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to check overlapping assignments: ${error.message}`)
    }

    return (data || []) as unknown as MachineryAssignmentRecord[]
  }

  static async createAssignment(
    input: Partial<MachineryAssignmentRecord> & {
      company_id: string
      machine_id: string
      scheduled_start: string
      scheduled_end: string
    }
  ): Promise<MachineryAssignmentRecord> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('machinery_assignments')
      .insert({
        company_id: input.company_id,
        branch_id: input.branch_id || null,
        machine_id: input.machine_id,
        job_order_id: input.job_order_id || null,
        production_job_id: input.production_job_id || null,
        task_type: input.task_type || null,
        task_name: input.task_name || null,
        operator_id: input.operator_id || null,
        operator_name: input.operator_name || null,
        scheduled_start: input.scheduled_start,
        scheduled_end: input.scheduled_end,
        actual_start: input.actual_start || null,
        actual_end: input.actual_end || null,
        status: input.status || 'scheduled',
        notes: input.notes || null,
        created_by: input.created_by || null,
      })
      .select('*, machine:machineries(*), job_order:job_orders(id, job_number, product_name, customer_name), production_job:production_jobs(id, production_job_number, product_name, customer_name)')
      .single()

    if (error) {
      throw new Error(`Failed to create machinery assignment: ${error.message}`)
    }

    return data as unknown as MachineryAssignmentRecord
  }

  static async getAssignmentById(
    id: string,
    companyId: string
  ): Promise<MachineryAssignmentRecord | null> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('machinery_assignments')
      .select('*, machine:machineries(*), job_order:job_orders(id, job_number, product_name, customer_name), production_job:production_jobs(id, production_job_number, product_name, customer_name)')
      .eq('id', id)
      .eq('company_id', companyId)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to fetch assignment ${id}: ${error.message}`)
    }

    return data as unknown as MachineryAssignmentRecord | null
  }

  /**
   * Fetches all machine assignments for a given Job Order (e.g. Printing, Lamination, Cutting)
   */
  static async getAssignmentsByJobOrder(
    jobOrderId: string,
    companyId: string
  ): Promise<MachineryAssignmentRecord[]> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('machinery_assignments')
      .select('*, machine:machineries(*)')
      .eq('job_order_id', jobOrderId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch assignments for job order ${jobOrderId}: ${error.message}`)
    }

    return (data || []) as unknown as MachineryAssignmentRecord[]
  }

  /**
   * Fetches all machine assignments for a given Production Job
   */
  static async getAssignmentsByProductionJob(
    productionJobId: string,
    companyId: string
  ): Promise<MachineryAssignmentRecord[]> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('machinery_assignments')
      .select('*, machine:machineries(*)')
      .eq('production_job_id', productionJobId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch assignments for production job ${productionJobId}: ${error.message}`)
    }

    return (data || []) as unknown as MachineryAssignmentRecord[]
  }

  static async updateAssignmentStatus(
    id: string,
    companyId: string,
    status: AssignmentStatus,
    extraUpdates?: Partial<MachineryAssignmentRecord>
  ): Promise<MachineryAssignmentRecord> {
    const supabase = await createClient()
    const payload: Record<string, any> = {
      status,
      ...extraUpdates,
      updated_at: new Date().toISOString(),
    }

    if (status === 'in_progress' && !payload.actual_start) {
      payload.actual_start = new Date().toISOString()
    }
    if (status === 'completed' && !payload.actual_end) {
      payload.actual_end = new Date().toISOString()
    }

    const { data, error } = await (supabase as any)
      .from('machinery_assignments')
      .update(payload)
      .eq('id', id)
      .eq('company_id', companyId)
      .select('*, machine:machineries(*), job_order:job_orders(id, job_number, product_name, customer_name), production_job:production_jobs(id, production_job_number, product_name, customer_name)')
      .single()

    if (error) {
      throw new Error(`Failed to update assignment status: ${error.message}`)
    }

    return data as unknown as MachineryAssignmentRecord
  }

  // ============================================================================
  // MAINTENANCES
  // ============================================================================

  static async getMaintenances(
    machineId: string,
    companyId: string
  ): Promise<MachineryMaintenanceRecord[]> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('machinery_maintenances')
      .select('*')
      .eq('machine_id', machineId)
      .eq('company_id', companyId)
      .order('scheduled_date', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch maintenances for machine ${machineId}: ${error.message}`)
    }

    return (data || []) as unknown as MachineryMaintenanceRecord[]
  }

  static async createMaintenance(
    input: Partial<MachineryMaintenanceRecord> & {
      company_id: string
      machine_id: string
      maintenance_type: any
      scheduled_date: string
    }
  ): Promise<MachineryMaintenanceRecord> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('machinery_maintenances')
      .insert({
        company_id: input.company_id,
        machine_id: input.machine_id,
        maintenance_type: input.maintenance_type,
        status: input.status || 'scheduled',
        scheduled_date: input.scheduled_date,
        start_time: input.start_time || null,
        end_time: input.end_time || null,
        technician_name: input.technician_name || null,
        vendor_name: input.vendor_name || null,
        problem_description: input.problem_description || null,
        work_performed: input.work_performed || null,
        parts_used: input.parts_used || null,
        cost: input.cost || 0,
        notes: input.notes || null,
        attachment_url: input.attachment_url || null,
        next_maintenance_date: input.next_maintenance_date || null,
        created_by: input.created_by || null,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create maintenance record: ${error.message}`)
    }

    return data as unknown as MachineryMaintenanceRecord
  }

  static async updateMaintenance(
    id: string,
    companyId: string,
    updates: Partial<MachineryMaintenanceRecord>
  ): Promise<MachineryMaintenanceRecord> {
    const supabase = await createClient()
    const payload = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await (supabase as any)
      .from('machinery_maintenances')
      .update(payload)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update maintenance record: ${error.message}`)
    }

    return data as unknown as MachineryMaintenanceRecord
  }

  // ============================================================================
  // BREAKDOWNS
  // ============================================================================

  static async getBreakdowns(
    machineId: string,
    companyId: string
  ): Promise<MachineryBreakdownRecord[]> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('machinery_breakdowns')
      .select('*, affected_job_order:job_orders(id, job_number, product_name, customer_name)')
      .eq('machine_id', machineId)
      .eq('company_id', companyId)
      .order('reported_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch breakdowns for machine ${machineId}: ${error.message}`)
    }

    return (data || []) as unknown as MachineryBreakdownRecord[]
  }

  static async getBreakdownById(
    id: string,
    companyId: string
  ): Promise<MachineryBreakdownRecord | null> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('machinery_breakdowns')
      .select('*, affected_job_order:job_orders(id, job_number, product_name, customer_name)')
      .eq('id', id)
      .eq('company_id', companyId)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to fetch breakdown ${id}: ${error.message}`)
    }

    return (data as unknown as MachineryBreakdownRecord) || null
  }

  static async createBreakdown(
    input: Partial<MachineryBreakdownRecord> & {
      company_id: string
      machine_id: string
      reported_by_name: string
      problem_title: string
      problem_description: string
    }
  ): Promise<MachineryBreakdownRecord> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('machinery_breakdowns')
      .insert({
        company_id: input.company_id,
        machine_id: input.machine_id,
        reported_by_id: input.reported_by_id || null,
        reported_by_name: input.reported_by_name,
        reported_at: input.reported_at || new Date().toISOString(),
        problem_title: input.problem_title.trim(),
        problem_description: input.problem_description.trim(),
        severity: input.severity || 'medium',
        production_impact: input.production_impact || 'minor_delay',
        affected_job_order_id: input.affected_job_order_id || null,
        affected_production_job_id: input.affected_production_job_id || null,
        attachment_url: input.attachment_url || null,
        status: 'reported',
      })
      .select('*, affected_job_order:job_orders(id, job_number, product_name, customer_name)')
      .single()

    if (error) {
      throw new Error(`Failed to report breakdown: ${error.message}`)
    }

    return data as unknown as MachineryBreakdownRecord
  }

  static async resolveBreakdown(
    id: string,
    companyId: string,
    resolution: {
      diagnosis?: string | null
      repair_action?: string | null
      technician_name?: string | null
      parts_replaced?: string | null
      repair_cost?: number
      downtime_minutes?: number
      resolved_by_name?: string | null
      resolution_notes?: string | null
      status?: BreakdownStatus
    }
  ): Promise<MachineryBreakdownRecord> {
    const supabase = await createClient()
    const payload = {
      diagnosis: resolution.diagnosis || null,
      repair_action: resolution.repair_action || null,
      technician_name: resolution.technician_name || null,
      parts_replaced: resolution.parts_replaced || null,
      repair_cost: resolution.repair_cost || 0,
      downtime_minutes: resolution.downtime_minutes || 0,
      resolved_at: new Date().toISOString(),
      resolved_by_name: resolution.resolved_by_name || null,
      resolution_notes: resolution.resolution_notes || null,
      status: resolution.status || 'resolved',
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await (supabase as any)
      .from('machinery_breakdowns')
      .update(payload)
      .eq('id', id)
      .eq('company_id', companyId)
      .select('*, affected_job_order:job_orders(id, job_number, product_name, customer_name)')
      .single()

    if (error) {
      throw new Error(`Failed to resolve breakdown: ${error.message}`)
    }

    return data as unknown as MachineryBreakdownRecord
  }
}
