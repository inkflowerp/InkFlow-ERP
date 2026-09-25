'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentTenant } from '../lib/auth/tenant-auth.ts'
import { PrintingMethodRepository } from '../lib/repositories/printing-method.repository.ts'
import { MaterialPurchaseConfigRepository } from '../lib/repositories/material-purchase-config.repository.ts'
import { FinishingOptionRepository } from '../lib/repositories/finishing-option.repository.ts'
import { AdditionalOptionRepository } from '../lib/repositories/additional-option.repository.ts'
import { InstallationOptionRepository } from '../lib/repositories/installation-option.repository.ts'
import type {
  PrintingMethod,
  MaterialPurchaseConfig,
  FinishingOptionRecord,
  AdditionalOptionRecord,
  InstallationOptionRecord,
} from '../types/product.types.ts'

async function getVerifiedTenant() {
  const tenant = await getCurrentTenant()
  if (!tenant || !tenant.companyId) {
    throw new Error('Unauthorized: Authenticated tenant session required')
  }
  return tenant
}

async function getOptionalTenant() {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant || !tenant.companyId) {
      return null
    }
    return tenant
  } catch {
    return null
  }
}

// 1. PRINTING METHODS ACTIONS
export async function getPrintingMethodsAction() {
  try {
    const tenant = await getOptionalTenant()
    if (!tenant) return []
    const data = await PrintingMethodRepository.getPrintingMethods(tenant.companyId, { includeInactive: true })
    return Array.isArray(data) ? data : []
  } catch (err: any) {
    console.warn('[Action] getPrintingMethodsAction error:', err?.message)
    return []
  }
}

export async function savePrintingMethodAction(data: Partial<PrintingMethod>) {
  const tenant = await getVerifiedTenant()
  if (data.id) {
    const res = await PrintingMethodRepository.updatePrintingMethod(tenant.companyId, data.id, data)
    revalidatePath(`/${tenant.companySlug}/products`)
    return res
  }
  const res = await PrintingMethodRepository.createPrintingMethod(tenant.companyId, data)
  revalidatePath(`/${tenant.companySlug}/products`)
  return res
}

export async function deletePrintingMethodAction(id: string) {
  const tenant = await getVerifiedTenant()
  const res = await PrintingMethodRepository.deletePrintingMethod(tenant.companyId, id)
  revalidatePath(`/${tenant.companySlug}/products`)
  return res
}

// 2. MATERIAL PURCHASE CONFIG ACTIONS
export async function getMaterialPurchaseConfigsAction(materialId: string) {
  try {
    const tenant = await getOptionalTenant()
    if (!tenant) return []
    const data = await MaterialPurchaseConfigRepository.getConfigsByMaterial(tenant.companyId, materialId, { includeInactive: true })
    return Array.isArray(data) ? data : []
  } catch (err: any) {
    console.warn('[Action] getMaterialPurchaseConfigsAction error:', err?.message)
    return []
  }
}

export async function saveMaterialPurchaseConfigAction(data: Partial<MaterialPurchaseConfig>) {
  const tenant = await getVerifiedTenant()
  if (data.id) {
    const res = await MaterialPurchaseConfigRepository.updateConfig(tenant.companyId, data.id, data)
    revalidatePath(`/${tenant.companySlug}/products`)
    return res
  }
  const res = await MaterialPurchaseConfigRepository.createConfig(tenant.companyId, data)
  revalidatePath(`/${tenant.companySlug}/products`)
  return res
}

export async function deleteMaterialPurchaseConfigAction(id: string) {
  const tenant = await getVerifiedTenant()
  const res = await MaterialPurchaseConfigRepository.deleteConfig(tenant.companyId, id)
  revalidatePath(`/${tenant.companySlug}/products`)
  return res
}

// 3. FINISHING OPTION ACTIONS
export async function getFinishingOptionsAction() {
  try {
    const tenant = await getOptionalTenant()
    if (!tenant) return []
    const data = await FinishingOptionRepository.getFinishingOptions(tenant.companyId, { includeInactive: true })
    return Array.isArray(data) ? data : []
  } catch (err: any) {
    console.warn('[Action] getFinishingOptionsAction error:', err?.message)
    return []
  }
}

export async function saveFinishingOptionAction(data: Partial<FinishingOptionRecord>) {
  const tenant = await getVerifiedTenant()
  if (!tenant) throw new Error('Unauthorized')
  if (data.id) {
    const res = await FinishingOptionRepository.updateFinishingOption(tenant.companyId, data.id, data)
    revalidatePath(`/${tenant.companySlug}/products`)
    return res
  }
  const res = await FinishingOptionRepository.createFinishingOption(tenant.companyId, data)
  revalidatePath(`/${tenant.companySlug}/products`)
  return res
}

export async function deleteFinishingOptionAction(id: string) {
  const tenant = await getVerifiedTenant()
  if (!tenant) throw new Error('Unauthorized')
  const res = await FinishingOptionRepository.deleteFinishingOption(tenant.companyId, id)
  revalidatePath(`/${tenant.companySlug}/products`)
  return res
}

// 4. ADDITIONAL OPTION ACTIONS
export async function getAdditionalOptionsAction() {
  try {
    const tenant = await getOptionalTenant()
    if (!tenant) return []
    const data = await AdditionalOptionRepository.getAdditionalOptions(tenant.companyId, { includeInactive: true })
    return Array.isArray(data) ? data : []
  } catch (err: any) {
    console.warn('[Action] getAdditionalOptionsAction error:', err?.message)
    return []
  }
}

export async function saveAdditionalOptionAction(data: Partial<AdditionalOptionRecord>) {
  const tenant = await getVerifiedTenant()
  if (!tenant) throw new Error('Unauthorized')
  if (data.id) {
    const res = await AdditionalOptionRepository.updateAdditionalOption(tenant.companyId, data.id, data)
    revalidatePath(`/${tenant.companySlug}/products`)
    return res
  }
  const res = await AdditionalOptionRepository.createAdditionalOption(tenant.companyId, data)
  revalidatePath(`/${tenant.companySlug}/products`)
  return res
}

export async function deleteAdditionalOptionAction(id: string) {
  const tenant = await getVerifiedTenant()
  if (!tenant) throw new Error('Unauthorized')
  const res = await AdditionalOptionRepository.deleteAdditionalOption(tenant.companyId, id)
  revalidatePath(`/${tenant.companySlug}/products`)
  return res
}

// 5. INSTALLATION OPTION ACTIONS
export async function getInstallationOptionsAction() {
  try {
    const tenant = await getOptionalTenant()
    if (!tenant) return []
    const data = await InstallationOptionRepository.getInstallationOptions(tenant.companyId, { includeInactive: true })
    return Array.isArray(data) ? data : []
  } catch (err: any) {
    console.warn('[Action] getInstallationOptionsAction error:', err?.message)
    return []
  }
}

export async function saveInstallationOptionAction(data: Partial<InstallationOptionRecord>) {
  const tenant = await getVerifiedTenant()
  if (data.id) {
    const res = await InstallationOptionRepository.updateInstallationOption(tenant.companyId, data.id, data)
    revalidatePath(`/${tenant.companySlug}/products`)
    return res
  }
  const res = await InstallationOptionRepository.createInstallationOption(tenant.companyId, data)
  revalidatePath(`/${tenant.companySlug}/products`)
  return res
}

export async function deleteInstallationOptionAction(id: string) {
  const tenant = await getVerifiedTenant()
  const res = await InstallationOptionRepository.deleteInstallationOption(tenant.companyId, id)
  revalidatePath(`/${tenant.companySlug}/products`)
  return res
}
