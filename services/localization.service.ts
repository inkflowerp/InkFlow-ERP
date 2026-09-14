// ==============================================================================
// InkFlow ERP - Authoritative Bangladesh Localization Service (V7)
// Address Hierarchy, Profile Localizer, Bilingual Formatters & Region Master
// ==============================================================================

import { LocalizationRepository } from '../lib/repositories/localization.repository.ts'
import type {
  CompanyBangladeshProfile,
  BranchBangladeshProfile,
  BangladeshAddressRecord,
} from '../types/localization.types.ts'
import {
  formatBDT,
  formatDate,
  formatTime,
  formatDateTime,
  toBengaliNumerals,
  normalizeBdPhone,
  numberToWordsBDT,
  numberToWordsBangla,
} from '../lib/formatters.ts'

export class LocalizationService {
  // ============================================================================
  // 1. COMPANY & BRANCH PROFILES
  // ============================================================================

  static async getCompanyProfile(companyId: string) {
    return LocalizationRepository.getCompanyProfile(companyId)
  }

  static async updateCompanyProfile(companyId: string, updates: Partial<CompanyBangladeshProfile>) {
    return LocalizationRepository.updateCompanyProfile(companyId, updates)
  }

  static async getBranchProfile(branchId: string, companyId: string) {
    return LocalizationRepository.getBranchProfile(branchId, companyId)
  }

  static async updateBranchProfile(branchId: string, companyId: string, updates: Partial<BranchBangladeshProfile>) {
    return LocalizationRepository.updateBranchProfile(branchId, companyId, updates)
  }

  // ============================================================================
  // 2. ADMINISTRATIVE REGIONS & ADDRESS STRINGIFICATION
  // ============================================================================

  static getDivisions() {
    return LocalizationRepository.getDivisions()
  }

  static getDistricts(divisionId?: number) {
    return LocalizationRepository.getDistricts(divisionId)
  }

  /**
   * Builds formatted hierarchical address string in English or Bengali
   * e.g. "House 12, Road 4, Banani, Dhaka North, Dhaka - 1213"
   */
  static formatAddress(addr: BangladeshAddressRecord, locale: 'en' | 'bn' = 'en'): string {
    const parts: string[] = []

    if (locale === 'bn') {
      if (addr.full_address_bn) return addr.full_address_bn
      if (addr.area) parts.push(addr.area)
      if (addr.upazila_name_bn) parts.push(addr.upazila_name_bn)
      if (addr.district_name_bn) parts.push(addr.district_name_bn)
      if (addr.division_name_bn) parts.push(addr.division_name_bn)
      if (addr.post_code) parts.push(toBengaliNumerals(addr.post_code))
    } else {
      if (addr.full_address) return addr.full_address
      if (addr.area) parts.push(addr.area)
      if (addr.upazila_name) parts.push(addr.upazila_name)
      if (addr.district_name) parts.push(addr.district_name)
      if (addr.division_name) parts.push(addr.division_name)
      if (addr.post_code) parts.push(addr.post_code)
    }

    return parts.filter(Boolean).join(', ') || addr.full_address || ''
  }

  // ============================================================================
  // 3. FORMATTER RE-EXPORTS FOR CONSISTENT LOCALIZATION PIPELINES
  // ============================================================================

  static formatCurrency(amount: number, useBengaliNumerals = false) {
    return formatBDT(amount, { useBengaliNumerals })
  }

  static formatDate(date: string | number | Date, locale: 'en' | 'bn' = 'en') {
    return formatDate(date, locale)
  }

  static formatDateTime(date: string | number | Date, locale: 'en' | 'bn' = 'en') {
    return formatDateTime(date, locale)
  }

  static normalizePhone(phone: string) {
    return normalizeBdPhone(phone)
  }

  static amountInWords(amount: number, locale: 'en' | 'bn' = 'en') {
    return locale === 'bn' ? numberToWordsBangla(amount) : numberToWordsBDT(amount)
  }
}
