// ==============================================================================
// PrintFlow SaaS - Platform Landing Page Configuration Types
// ==============================================================================

export type LandingLanguage = 'en' | 'bn'
export type LandingTheme = 'system' | 'light' | 'dark'

export interface LandingSectionConfig {
  id: string
  key: string
  nameEn: string
  nameBn: string
  enabled: boolean
  order: number
}

export interface LandingHeroConfig {
  eyebrowEn: string
  eyebrowBn: string
  headlineEn: string
  headlineBn: string
  descriptionEn: string
  descriptionBn: string
  primaryCtaEn: string
  primaryCtaBn: string
  primaryCtaLink: string
  secondaryCtaEn: string
  secondaryCtaBn: string
  secondaryCtaLink: string
  imageUrl?: string
}

export interface LandingCompanyConfig {
  id: string
  name: string
  logoUrl: string
  city?: string
  websiteUrl?: string
  isPublic: boolean
  status: 'active' | 'archived'
  displayMode: 'logo_name' | 'logo_only'
  order: number
}

export interface LandingPricingConfig {
  showPricing: boolean
  showMonthly: boolean
  showYearly: boolean
  featuredPlanCode: string
  titleEn: string
  titleBn: string
  descriptionEn: string
  descriptionBn: string
}

export interface LandingFaqItem {
  id: string
  questionEn: string
  questionBn: string
  answerEn: string
  answerBn: string
  enabled: boolean
  order: number
}

export interface LandingSeoConfig {
  metaTitle: string
  metaDescription: string
  ogImageUrl: string
  canonicalUrl: string
}

export interface LandingGeneralConfig {
  enabled: boolean
  defaultLanguage: LandingLanguage
  theme: LandingTheme
}

export interface ComparisonItemConfig {
  id: string
  categoryEn: string
  categoryBn: string
  beforeEn: string
  beforeBn: string
  afterEn: string
  afterBn: string
  beforeTagEn?: string
  beforeTagBn?: string
  afterTagEn?: string
  afterTagBn?: string
}

export interface LandingComparisonConfig {
  eyebrowEn?: string
  eyebrowBn?: string
  headlineEn?: string
  headlineBn?: string
  descriptionEn?: string
  descriptionBn?: string
  withoutTitleEn?: string
  withoutTitleBn?: string
  withTitleEn?: string
  withTitleBn?: string
  items?: ComparisonItemConfig[]
}

export interface LandingCompaniesSectionConfig {
  eyebrowEn?: string
  eyebrowBn?: string
  headlineEn?: string
  headlineBn?: string
  descriptionEn?: string
  descriptionBn?: string
  autoScroll?: boolean
  scrollSpeed?: 'slow' | 'medium' | 'fast'
}

export interface LandingFinalCtaConfig {
  eyebrowEn?: string
  eyebrowBn?: string
  headlineEn?: string
  headlineBn?: string
  descriptionEn?: string
  descriptionBn?: string
  primaryCtaEn?: string
  primaryCtaBn?: string
  primaryCtaLink?: string
  secondaryCtaEn?: string
  secondaryCtaBn?: string
}

export interface LandingWorkflowSectionConfig {
  eyebrowEn?: string
  eyebrowBn?: string
  headlineEn?: string
  headlineBn?: string
  descriptionEn?: string
  descriptionBn?: string
}

export interface LandingEmployeesSectionConfig {
  eyebrowEn?: string
  eyebrowBn?: string
  headlineEn?: string
  headlineBn?: string
  descriptionEn?: string
  descriptionBn?: string
}

export interface LandingFeaturesSectionConfig {
  eyebrowEn?: string
  eyebrowBn?: string
  headlineEn?: string
  headlineBn?: string
  descriptionEn?: string
  descriptionBn?: string
}

export interface LandingPageConfig {
  general: LandingGeneralConfig
  sections: LandingSectionConfig[]
  hero: LandingHeroConfig
  comparison?: LandingComparisonConfig
  companies: LandingCompanyConfig[]
  companiesSection?: LandingCompaniesSectionConfig
  pricing: LandingPricingConfig
  faq: LandingFaqItem[]
  finalCta?: LandingFinalCtaConfig
  workflow?: LandingWorkflowSectionConfig
  employees?: LandingEmployeesSectionConfig
  whatWeManage?: LandingFeaturesSectionConfig
  seo: LandingSeoConfig
}

export interface LandingPageRecord {
  id: string
  is_published: boolean
  published_config: LandingPageConfig
  draft_config: LandingPageConfig
  published_at?: string | null
  published_by?: string | null
  updated_at: string
  updated_by?: string | null
}
