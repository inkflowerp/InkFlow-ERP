export const APP_NAME = 'PrintERP SaaS'
export const DEFAULT_CURRENCY = 'BDT'
export const DEFAULT_CURRENCY_SYMBOL = '৳'
export const DEFAULT_LOCALE = 'bn'

export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  OPERATOR: 'operator',
  ACCOUNTANT: 'accountant',
  DESIGNER: 'designer',
  INSTALLER: 'installer',
} as const

export const STORAGE_BUCKETS = {
  COMPANY_LOGOS: 'company-logos',
  CUSTOMER_FILES: 'customer-files',
  JOB_DESIGNS: 'job-designs',
  INVOICE_PDFS: 'invoice-pdfs',
} as const
