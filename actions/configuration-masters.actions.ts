'use server'

import { withTenantAction } from '@/lib/actions/action-wrapper'


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
export const getPrintingMethodsAction = withTenantAction(
  {
    permission: "settings.view",
    entityType: "configuration-masters"
  },
  async (ctx) => {
  try {
    const tenant = await getOptionalTenant()
    if (!tenant) return []
    const data = await PrintingMethodRepository.getPrintingMethods(tenant.companyId, { includeInactive: true })
    return Array.isArray(data) ? data : []
  } catch (err: any) {
    console.warn('[Action] getPrintingMethodsAction error:', err?.message)
    return []
  }

})

export const savePrintingMethodAction = withTenantAction(
  {
    permission: "settings.manage",
    entityType: "configuration-masters"
  },
  async (ctx, data: Partial<PrintingMethod>) => {
  const tenant = await getVerifiedTenant()
  if (data.id) {
    const res = await PrintingMethodRepository.updatePrintingMethod(tenant.companyId, data.id, data)
    revalidatePath(`/${tenant.companySlug}/products`)
    return res
  }
  const res = await PrintingMethodRepository.createPrintingMethod(tenant.companyId, data)
  revalidatePath(`/${tenant.companySlug}/products`)
  return res

})

export const deletePrintingMethodAction = withTenantAction(
  {
    permission: "settings.manage",
    destructive: true,
    auditAction: "configuration-masters.deleteprintingmethod",
    entityType: "configuration-masters"
  },
  async (ctx, id: string) => {
  const tenant = await getVerifiedTenant()
  const res = await PrintingMethodRepository.deletePrintingMethod(tenant.companyId, id)
  revalidatePath(`/${tenant.companySlug}/products`)
  return res

})

// 2. MATERIAL PURCHASE CONFIG ACTIONS
export const getMaterialPurchaseConfigsAction = withTenantAction(
  {
    permission: "settings.view",
    entityType: "configuration-masters"
  },
  async (ctx, materialId: string) => {
  try {
    const tenant = await getOptionalTenant()
    if (!tenant) return []
    const data = await MaterialPurchaseConfigRepository.getConfigsByMaterial(tenant.companyId, materialId, { includeInactive: true })
    return Array.isArray(data) ? data : []
  } catch (err: any) {
    console.warn('[Action] getMaterialPurchaseConfigsAction error:', err?.message)
    return []
  }

})

export const saveMaterialPurchaseConfigAction = withTenantAction(
  {
    permission: "settings.manage",
    entityType: "configuration-masters"
  },
  async (ctx, data: Partial<MaterialPurchaseConfig>) => {
  const tenant = await getVerifiedTenant()
  if (data.id) {
    const res = await MaterialPurchaseConfigRepository.updateConfig(tenant.companyId, data.id, data)
    revalidatePath(`/${tenant.companySlug}/products`)
    return res
  }
  const res = await MaterialPurchaseConfigRepository.createConfig(tenant.companyId, data)
  revalidatePath(`/${tenant.companySlug}/products`)
  return res

})

export const deleteMaterialPurchaseConfigAction = withTenantAction(
  {
    permission: "settings.manage",
    destructive: true,
    auditAction: "configuration-masters.deletematerialpurchaseconfig",
    entityType: "configuration-masters"
  },
  async (ctx, id: string) => {
  const tenant = await getVerifiedTenant()
  const res = await MaterialPurchaseConfigRepository.deleteConfig(tenant.companyId, id)
  revalidatePath(`/${tenant.companySlug}/products`)
  return res

})

// 3. FINISHING OPTION ACTIONS
export const getFinishingOptionsAction = withTenantAction(
  {
    permission: "settings.view",
    entityType: "configuration-masters"
  },
  async (ctx) => {
  try {
    const tenant = await getOptionalTenant()
    if (!tenant) return []
    const data = await FinishingOptionRepository.getFinishingOptions(tenant.companyId, { includeInactive: true })
    return Array.isArray(data) ? data : []
  } catch (err: any) {
    console.warn('[Action] getFinishingOptionsAction error:', err?.message)
    return []
  }

})

export const saveFinishingOptionAction = withTenantAction(
  {
    permission: "settings.manage",
    entityType: "configuration-masters"
  },
  async (ctx, data: Partial<FinishingOptionRecord>) => {
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

})

export const deleteFinishingOptionAction = withTenantAction(
  {
    permission: "settings.manage",
    destructive: true,
    auditAction: "configuration-masters.deletefinishingoption",
    entityType: "configuration-masters"
  },
  async (ctx, id: string) => {
  const tenant = await getVerifiedTenant()
  if (!tenant) throw new Error('Unauthorized')
  const res = await FinishingOptionRepository.deleteFinishingOption(tenant.companyId, id)
  revalidatePath(`/${tenant.companySlug}/products`)
  return res

})

// 4. ADDITIONAL OPTION ACTIONS
export const getAdditionalOptionsAction = withTenantAction(
  {
    permission: "settings.view",
    entityType: "configuration-masters"
  },
  async (ctx) => {
  try {
    const tenant = await getOptionalTenant()
    if (!tenant) return []
    const data = await AdditionalOptionRepository.getAdditionalOptions(tenant.companyId, { includeInactive: true })
    return Array.isArray(data) ? data : []
  } catch (err: any) {
    console.warn('[Action] getAdditionalOptionsAction error:', err?.message)
    return []
  }

})

export const saveAdditionalOptionAction = withTenantAction(
  {
    permission: "settings.manage",
    entityType: "configuration-masters"
  },
  async (ctx, data: Partial<AdditionalOptionRecord>) => {
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

})

export const deleteAdditionalOptionAction = withTenantAction(
  {
    permission: "settings.manage",
    destructive: true,
    auditAction: "configuration-masters.deleteadditionaloption",
    entityType: "configuration-masters"
  },
  async (ctx, id: string) => {
  const tenant = await getVerifiedTenant()
  if (!tenant) throw new Error('Unauthorized')
  const res = await AdditionalOptionRepository.deleteAdditionalOption(tenant.companyId, id)
  revalidatePath(`/${tenant.companySlug}/products`)
  return res

})

// 5. INSTALLATION OPTION ACTIONS
export const getInstallationOptionsAction = withTenantAction(
  {
    permission: "settings.view",
    entityType: "configuration-masters"
  },
  async (ctx) => {
  try {
    const tenant = await getOptionalTenant()
    if (!tenant) return []
    const data = await InstallationOptionRepository.getInstallationOptions(tenant.companyId, { includeInactive: true })
    return Array.isArray(data) ? data : []
  } catch (err: any) {
    console.warn('[Action] getInstallationOptionsAction error:', err?.message)
    return []
  }

})

export const saveInstallationOptionAction = withTenantAction(
  {
    permission: "settings.manage",
    entityType: "configuration-masters"
  },
  async (ctx, data: Partial<InstallationOptionRecord>) => {
  const tenant = await getVerifiedTenant()
  if (data.id) {
    const res = await InstallationOptionRepository.updateInstallationOption(tenant.companyId, data.id, data)
    revalidatePath(`/${tenant.companySlug}/products`)
    return res
  }
  const res = await InstallationOptionRepository.createInstallationOption(tenant.companyId, data)
  revalidatePath(`/${tenant.companySlug}/products`)
  return res

})

export const deleteInstallationOptionAction = withTenantAction(
  {
    permission: "settings.manage",
    destructive: true,
    auditAction: "configuration-masters.deleteinstallationoption",
    entityType: "configuration-masters"
  },
  async (ctx, id: string) => {
  const tenant = await getVerifiedTenant()
  const res = await InstallationOptionRepository.deleteInstallationOption(tenant.companyId, id)
  revalidatePath(`/${tenant.companySlug}/products`)
  return res

})
