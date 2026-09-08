import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CustomerRecord, CustomerCommunication } from '@/types/crm.types'

export class CustomerRepository {
  static async getCustomers(companyId: string): Promise<CustomerRecord[]> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('customers')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch customers: ${error.message}`)
    }
    return (data || []) as unknown as CustomerRecord[]
  }

  static async getCustomerById(id: string, companyId: string): Promise<CustomerRecord | null> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('customers')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to fetch customer ${id}: ${error.message}`)
    }
    return (data as unknown as CustomerRecord) || null
  }

  static async createCustomer(customer: Partial<CustomerRecord> & { company_id: string; name: string; mobile: string }): Promise<CustomerRecord> {
    const supabase = await createClient()
    const payload: any = {
      company_id: customer.company_id,
      name: customer.name.trim(),
      name_bn: customer.name_bn?.trim() || null,
      customer_type: customer.customer_type || customer.customer_category || 'regular',
      contact_person: customer.contact_person?.trim() || null,
      mobile: customer.mobile.trim(),
      whatsapp: customer.whatsapp?.trim() || null,
      email: customer.email?.trim().toLowerCase() || null,
      division_id: customer.division_id || null,
      district_id: customer.district_id || null,
      upazila_id: customer.upazila_id || null,
      area: customer.area?.trim() || null,
      address: customer.address?.trim() || null,
      address_bn: customer.address_bn?.trim() || null,
      bin_no: customer.bin_no?.trim() || null,
      tin_no: customer.tin_no?.trim() || null,
      credit_limit: typeof customer.credit_limit === 'number' ? customer.credit_limit : 0,
      payment_terms: customer.payment_terms || 'cash_on_delivery',
      notes: customer.notes?.trim() || null,
      tags: customer.tags || [],
      is_active: customer.is_active !== undefined ? customer.is_active : true,
    }

    if (customer.id) {
      payload.id = customer.id
    }

    const { data, error } = await (supabase as any)
      .from('customers')
      .insert(payload)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create customer: ${error.message}`)
    }
    return data as unknown as CustomerRecord
  }

  static async updateCustomer(id: string, updates: Partial<CustomerRecord>, companyId: string): Promise<CustomerRecord> {
    const supabase = await createClient()
    const payload: any = { ...updates, updated_at: new Date().toISOString() }
    delete payload.id
    delete payload.company_id

    const { data, error } = await (supabase as any)
      .from('customers')
      .update(payload)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update customer: ${error.message}`)
    }
    return data as unknown as CustomerRecord
  }

  static async deleteCustomer(id: string, companyId: string): Promise<boolean> {
    const supabase = await createClient()
    const { error } = await (supabase as any)
      .from('customers')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId)

    if (error) {
      throw new Error(`Failed to delete customer: ${error.message}`)
    }
    return true
  }

  static async getCommunications(customerId: string, companyId: string): Promise<CustomerCommunication[]> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('customer_communications')
      .select('*')
      .eq('customer_id', customerId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch communications: ${error.message}`)
    }
    return (data || []) as unknown as CustomerCommunication[]
  }

  static async addCommunication(comm: {
    company_id: string
    customer_id: string
    type: 'phone_call' | 'whatsapp_message' | 'email' | 'meeting' | 'site_visit'
    summary: string
    details?: string | null
    logged_by?: string | null
  }): Promise<CustomerCommunication> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('customer_communications')
      .insert(comm)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to log customer communication: ${error.message}`)
    }
    return data as unknown as CustomerCommunication
  }
}
