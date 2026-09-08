// ==============================================================================
// PrintERP / InkFlow SaaS - CRM & Customer Management Service
// Authoritative PostgreSQL persistence via CustomerRepository
// ==============================================================================

import {
  CustomerRecord,
  CustomerCommunication,
  SupplierRecord,
  SupplierMaterialPrice,
} from '@/types/crm.types'
import { CustomerRepository } from '@/lib/repositories/customer.repository'

/**
 * Normalizes a Bangladeshi phone number into standard comparison form
 */
export function normalizeBdPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('880')) return `+${digits}`
  if (digits.startsWith('01')) return `+88${digits}`
  return phone.trim()
}

export interface DuplicateMatchResult {
  customer: CustomerRecord
  matchReason: string
  matchField: 'mobile' | 'whatsapp' | 'name' | 'company_name'
  confidence: 'exact' | 'high' | 'possible'
}

export interface DuplicateCheckResponse {
  hasDuplicate: boolean
  matches: DuplicateMatchResult[]
}

export class CrmService {
  /**
   * Normalizes a Bangladeshi phone number into standard international format (+8801XXXXXXXXX)
   */
  static normalizePhone(phone: string): string {
    return normalizeBdPhone(phone)
  }

  /**
   * Extracts raw 11-digit national phone or digits for strict comparison
   */
  static cleanPhoneDigits(phone: string): string {
    const digits = phone.replace(/\D/g, '')
    if (digits.startsWith('880') && digits.length === 13) {
      return digits.substring(2) // 01XXXXXXXXX
    }
    return digits
  }

  /**
   * Validates if a phone number matches standard Bangladesh format (013-019, 11 digits)
   */
  static isValidBdPhone(phone: string): boolean {
    const cleaned = this.cleanPhoneDigits(phone)
    if (!cleaned) return false
    return /^01[3-9]\d{8}$/.test(cleaned)
  }

  /**
   * Retrieves all customers for a given company/tenant
   */
  static async getCustomers(companyId: string): Promise<CustomerRecord[]> {
    if (!companyId) return []
    return await CustomerRepository.getCustomers(companyId)
  }

  /**
   * Retrieves a specific customer by ID
   */
  static async getCustomerById(
    id: string,
    companyId: string
  ): Promise<CustomerRecord | null> {
    if (!id || !companyId) return null
    return await CustomerRepository.getCustomerById(id, companyId)
  }

  /**
   * Search customers by query across Name, Bangla Name, Company, Phone, Email, Area
   */
  static async searchCustomers(
    query: string,
    companyId: string
  ): Promise<CustomerRecord[]> {
    const q = query.trim().toLowerCase()
    const customers = await this.getCustomers(companyId)
    if (!q) return customers

    const cleanedQ = this.cleanPhoneDigits(query)

    return customers.filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(q)
      const nameBnMatch = c.name_bn ? c.name_bn.includes(query.trim()) : false
      const companyMatch =
        (c.company_name && c.company_name.toLowerCase().includes(q)) || false
      const emailMatch = c.email ? c.email.toLowerCase().includes(q) : false
      const areaMatch = c.area ? c.area.toLowerCase().includes(q) : false

      const custDigits = this.cleanPhoneDigits(c.mobile)
      const phoneMatch =
        c.mobile.includes(q) || (cleanedQ.length >= 3 && custDigits.includes(cleanedQ))

      return (
        nameMatch ||
        nameBnMatch ||
        companyMatch ||
        emailMatch ||
        areaMatch ||
        phoneMatch
      )
    })
  }

  /**
   * Real-time duplicate detection matching on Mobile, WhatsApp, Name, and Company Name
   */
  static async findDuplicates(
    candidate: {
      mobile?: string
      whatsapp?: string
      name?: string
      company_name?: string
      excludeId?: string
    },
    companyId: string
  ): Promise<DuplicateCheckResponse> {
    const matches: DuplicateMatchResult[] = []
    const seenIds = new Set<string>()

    const candidateMobileClean = candidate.mobile
      ? this.cleanPhoneDigits(candidate.mobile)
      : ''
    const candidateWhatsappClean = candidate.whatsapp
      ? this.cleanPhoneDigits(candidate.whatsapp)
      : ''
    const candidateNameClean = candidate.name ? candidate.name.trim().toLowerCase() : ''
    const candidateCompanyClean = candidate.company_name
      ? candidate.company_name.trim().toLowerCase()
      : ''

    const customers = await this.getCustomers(companyId)

    for (const c of customers) {
      if (candidate.excludeId && c.id === candidate.excludeId) continue

      const custMobileClean = this.cleanPhoneDigits(c.mobile)
      const custWhatsappClean = c.whatsapp ? this.cleanPhoneDigits(c.whatsapp) : ''
      const custNameClean = c.name.trim().toLowerCase()
      const custCompanyClean = c.company_name ? c.company_name.trim().toLowerCase() : ''

      // 1. Exact Mobile Match
      if (
        candidateMobileClean &&
        candidateMobileClean.length >= 10 &&
        custMobileClean === candidateMobileClean
      ) {
        if (!seenIds.has(c.id)) {
          matches.push({
            customer: c,
            matchReason: `Exact mobile number match (${c.mobile})`,
            matchField: 'mobile',
            confidence: 'exact',
          })
          seenIds.add(c.id)
        }
      }

      // 2. WhatsApp Match
      if (
        candidateWhatsappClean &&
        candidateWhatsappClean.length >= 10 &&
        (custWhatsappClean === candidateWhatsappClean ||
          custMobileClean === candidateWhatsappClean)
      ) {
        if (!seenIds.has(c.id)) {
          matches.push({
            customer: c,
            matchReason: `WhatsApp number match (${c.whatsapp || c.mobile})`,
            matchField: 'whatsapp',
            confidence: 'exact',
          })
          seenIds.add(c.id)
        }
      }

      // 3. Exact Name Match
      if (
        candidateNameClean &&
        candidateNameClean.length >= 3 &&
        custNameClean === candidateNameClean
      ) {
        if (!seenIds.has(c.id)) {
          matches.push({
            customer: c,
            matchReason: `Identical customer name ("${c.name}")`,
            matchField: 'name',
            confidence: 'high',
          })
          seenIds.add(c.id)
        }
      }

      // 4. Exact Company Name Match
      if (
        candidateCompanyClean &&
        candidateCompanyClean.length >= 4 &&
        (custCompanyClean === candidateCompanyClean ||
          custNameClean === candidateCompanyClean)
      ) {
        if (!seenIds.has(c.id)) {
          matches.push({
            customer: c,
            matchReason: `Matching company name ("${c.company_name || c.name}")`,
            matchField: 'company_name',
            confidence: 'high',
          })
          seenIds.add(c.id)
        }
      }
    }

    return {
      hasDuplicate: matches.length > 0,
      matches,
    }
  }

  /**
   * Creates a new customer with server-validated tenant isolation and PostgreSQL persistence
   */
  static async createCustomer(
    data: Partial<CustomerRecord>,
    companyId: string,
    _userId?: string
  ): Promise<CustomerRecord> {
    if (!companyId) {
      throw new Error('Active company context is required to create a customer.')
    }

    const rawMobile = data.mobile || ''
    const normalizedMobile = this.normalizePhone(rawMobile)
    const normalizedWhatsapp = data.whatsapp ? this.normalizePhone(data.whatsapp) : null

    const category = data.customer_category || data.customer_type || 'regular'
    const tags = data.tags && data.tags.length > 0 ? data.tags : [category.toUpperCase()]

    const newCustomer = await CustomerRepository.createCustomer({
      ...data,
      company_id: companyId,
      name: (data.name || '').trim(),
      name_bn: data.name_bn ? data.name_bn.trim() : null,
      company_name: data.company_name ? data.company_name.trim() : null,
      contact_person: data.contact_person ? data.contact_person.trim() : null,
      mobile: normalizedMobile,
      whatsapp: normalizedWhatsapp,
      email: data.email ? data.email.trim().toLowerCase() : null,
      customer_type: category,
      customer_category: category,
      tags,
    })

    return newCustomer
  }

  /**
   * Updates an existing customer profile
   */
  static async updateCustomer(
    id: string,
    data: Partial<CustomerRecord>,
    companyId: string
  ): Promise<CustomerRecord | null> {
    if (!id || !companyId) return null
    return await CustomerRepository.updateCustomer(id, data, companyId)
  }

  /**
   * Deletes a customer profile
   */
  static async deleteCustomer(id: string, companyId: string): Promise<boolean> {
    if (!id || !companyId) return false
    return await CustomerRepository.deleteCustomer(id, companyId)
  }
}
