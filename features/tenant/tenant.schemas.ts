import { z } from 'zod'

export const onboardingSchema = z.object({
  // Step 1: Company Name
  name: z.string().min(2, 'Company name is required'),
  name_bn: z.string().optional(),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(40, 'Slug must be at most 40 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),

  // Step 2: Business Type
  business_type: z.string().min(1, 'Please select your business type'),

  // Step 3: Company Contact Information
  phone: z.string().min(11, 'Please enter a valid phone number'),
  whatsapp: z.string().optional(),
  email: z.string().email('Please enter a valid official email address'),

  // Step 4: Address
  division_id: z.number().min(1, 'Please select your division'),
  district_id: z.number().min(1, 'Please select your district'),
  upazila_id: z.number().optional(),
  area: z.string().optional(),
  address: z.string().min(3, 'Street address is required'),
  address_bn: z.string().optional(),

  // Step 5: Currency
  currency: z.string(),

  // Step 6: Language
  default_language: z.enum(['en', 'bn']),

  // Step 7: Create Owner Account
  owner_name: z.string().min(2, 'Owner full name is required'),
  owner_email: z.string().email('Owner email is required'),
  owner_phone: z.string().min(11, 'Owner phone is required'),
  owner_password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
})

export type OnboardingFormData = z.infer<typeof onboardingSchema>

export const companySettingsSchema = z.object({
  name: z.string().min(2, 'Company name is required'),
  name_bn: z.string().optional(),
  logo_url: z.string().optional().nullable(),
  phone: z.string().min(11, 'Phone is required'),
  whatsapp: z.string().optional().nullable(),
  email: z.string().email('Valid email is required'),
  address: z.string().min(3, 'Address is required'),
  address_bn: z.string().optional().nullable(),
  area: z.string().optional().nullable(),
  bin_no: z.string().optional().nullable(),
  tin_no: z.string().optional().nullable(),
  trade_license_no: z.string().optional().nullable(),
  invoice_prefix: z.string().min(1, 'Invoice prefix is required'),
  quotation_prefix: z.string().min(1, 'Quotation prefix is required'),
  challan_prefix: z.string().min(1, 'Challan prefix is required'),
  default_currency: z.string(),
  default_language: z.enum(['en', 'bn']),
  vat_enabled: z.boolean(),
  vat_rate: z.number().min(0).max(100),
})

export type CompanySettingsFormData = z.infer<typeof companySettingsSchema>

export const inviteUserSchema = z.object({
  email: z.string().email('Valid email is required'),
  role_id: z.string().min(1, 'Please select a role'),
  branch_id: z.string().optional().nullable(),
})

export type InviteUserFormData = z.infer<typeof inviteUserSchema>

export const addUserSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  fullNameBn: z.string().optional(),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(11, 'Valid phone number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role_id: z.string().min(1, 'Please select a role'),
  branch_id: z.string().optional().nullable(),
})

export type AddUserFormData = z.infer<typeof addUserSchema>
