export const TRASH_RETENTION_DAYS = 30

export type TrashCategory =
  | 'quotations'
  | 'invoices'
  | 'customers'
  | 'products'
  | 'materials'
  | 'suppliers'

export interface TrashRecord {
  id: string
  company_id: string
  category: TrashCategory
  original_id: string
  title: string
  subtitle?: string
  reference_number?: string
  deleted_at: string
  expires_at: string
  deleted_by_name?: string
  payload: any
}

export interface TrashSummary {
  total: number
  quotations: number
  invoices: number
  customers: number
  products: number
  materials: number
  suppliers: number
}

/**
 * Computes the expiration date (ISO string) given a deletion timestamp and retention days.
 */
export function computeTrashExpiration(
  deletedAtISO: string = new Date().toISOString(),
  retentionDays: number = TRASH_RETENTION_DAYS
): string {
  const deletedTime = new Date(deletedAtISO).getTime()
  const validDeletedTime = isNaN(deletedTime) ? Date.now() : deletedTime
  const expiresTime = validDeletedTime + retentionDays * 24 * 60 * 60 * 1000
  return new Date(expiresTime).toISOString()
}

/**
 * Calculates remaining days before an item is permanently auto-deleted.
 */
export function getTrashDaysRemaining(
  expiresAtISO?: string,
  deletedAtISO?: string,
  retentionDays: number = TRASH_RETENTION_DAYS
): number {
  let expiryTime: number
  if (expiresAtISO) {
    expiryTime = new Date(expiresAtISO).getTime()
  } else if (deletedAtISO) {
    expiryTime = new Date(deletedAtISO).getTime() + retentionDays * 24 * 60 * 60 * 1000
  } else {
    return retentionDays
  }

  if (isNaN(expiryTime)) return 0
  const msRemaining = expiryTime - Date.now()
  return Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)))
}

/**
 * Checks if a trash item has exceeded the 30-day retention period.
 */
export function isTrashExpired(
  expiresAtISO?: string,
  deletedAtISO?: string,
  retentionDays: number = TRASH_RETENTION_DAYS
): boolean {
  let expiryTime: number
  if (expiresAtISO) {
    expiryTime = new Date(expiresAtISO).getTime()
  } else if (deletedAtISO) {
    expiryTime = new Date(deletedAtISO).getTime() + retentionDays * 24 * 60 * 60 * 1000
  } else {
    return false
  }

  if (isNaN(expiryTime)) return false
  return Date.now() >= expiryTime
}

