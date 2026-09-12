// ==============================================================================
// PrintERP SaaS - Phase 24: Global Search & Quick Actions Types
// ==============================================================================

export type SearchEntity =
  | 'customer'
  | 'order'
  | 'quotation'
  | 'invoice'
  | 'job'
  | 'product'
  | 'material'
  | 'supplier'
  | 'employee'
  | 'inventory'
  | 'production_job'
  | 'design_job'
  | 'challan'

export interface SearchResultItem {
  id: string
  entity: SearchEntity
  title: string
  subtitle: string
  badge?: string
  status?: string
  href: string
  metadata?: Record<string, any>
  requiredPermission?: string
}

export type GroupedSearchResults = {
  [key in SearchEntity]?: SearchResultItem[]
}

export interface QuickCommand {
  id: string
  title: string
  titleBn?: string
  subtitle: string
  subtitleBn?: string
  icon: string
  href: string
  shortcut?: string
  requiredPermission: string
  badge?: string
}

export interface KeyboardShortcutConfig {
  openSearch: string // Default: '/'
  openNewMenu: string // Default: 'n'
  openQuickQuote: string // Default: 'q'
  closeModal: string // Default: 'Escape'
}

export const DEFAULT_SHORTCUTS: KeyboardShortcutConfig = {
  openSearch: '/',
  openNewMenu: 'n',
  openQuickQuote: 'q',
  closeModal: 'Escape',
}
