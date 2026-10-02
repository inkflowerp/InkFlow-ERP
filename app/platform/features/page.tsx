'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
 Flag,
 CheckCircle2,
 AlertTriangle,
 Building2,
 Globe,
 SlidersHorizontal,
 MessageSquare,
 FileCheck2,
 Sparkles,
 PhoneCall,
 Printer,
 GitFork,
 X,
 Plus,
 RefreshCw,
 Info,
 Trash2,
 Search,
 Download,
 Edit,
 Check,
 Ban,
 Shield,
 Layers,
 Cpu,
 Boxes,
 HelpCircle,
 ExternalLink,
 ChevronRight,
 Filter,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
 getPlatformFeatureFlagsAction,
 getPlatformCompaniesAction,
} from '@/actions/platform-data.actions'
import {
 toggleGlobalFeatureFlagAction,
 setTenantFeatureFlagAction,
 removeTenantFeatureFlagAction,
 createFeatureFlagAction,
 updateFeatureFlagAction,
 deleteFeatureFlagAction,
 bulkSetTenantFeatureFlagsAction,
} from '@/actions/platform.actions'
import {
 PlatformFeatureFlagItem,
 PlatformFeatureFlagsOverview,
 PlatformTenantCompany,
 FeatureFlagCategory,
 CreateFeatureFlagInput,
 UpdateFeatureFlagInput,
} from '@/types/platform.types'
import { formatDate } from '@/lib/formatters'
import { useI18n } from '@/lib/i18n'

const CATEGORY_META: Record<
 string,
 { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string; border: string }
> = {
 core: {
 label: 'Core ERP',
 icon: Boxes,
 color: 'text-primary',
 bg: 'bg-primary/10',
 border: 'border-primary/20',
 },
 localization: {
 label: 'BD Localization',
 icon: PhoneCall,
 color: 'text-success',
 bg: 'bg-success/10',
 border: 'border-success/30',
 },
 finance: {
 label: 'Finance & VAT',
 icon: FileCheck2,
 color: 'text-warning',
 bg: 'bg-warning/10',
 border: 'border-warning/30',
 },
 ai: {
 label: 'AI & Smart Tools',
 icon: Sparkles,
 color: 'text-primary',
 bg: 'bg-primary/10',
 border: 'border-primary/20',
 },
 hardware: {
 label: 'Hardware & POS',
 icon: Printer,
 color: 'text-primary',
 bg: 'bg-primary/10',
 border: 'border-primary/20',
 },
 logistics: {
 label: 'Logistics & Dispatch',
 icon: GitFork,
 color: 'text-primary',
 bg: 'bg-primary/10',
 border: 'border-primary/20',
 },
 general: {
 label: 'General Modules',
 icon: Flag,
 color: 'text-muted-foreground',
 bg: 'bg-muted',
 border: 'border-border',
 },
}

const FLAG_CUSTOM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
 whatsapp_notifications: MessageSquare,
 mushak_6_3: FileCheck2,
 ai_job_estimator: Sparkles,
 bd_sms_gateway: PhoneCall,
 thermal_receipt_esc_pos: Printer,
 multi_branch_dispatch: GitFork,
 customer_portal_access: Globe,
 batch_production_tracking: Boxes,
 automated_cheque_reconciliation: FileCheck2,
 vendor_rate_matrix: Layers,
 advance_salary_loans: Building2,
 realtime_machine_telemetry: Cpu,
}

export default function PlatformFeaturesPage() {
  const { tBilingual } = useI18n()
 const [overview, setOverview] = useState<PlatformFeatureFlagsOverview | null>(null)
 const [companies, setCompanies] = useState<PlatformTenantCompany[]>([])
 const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
 const [loading, setLoading] = useState(true)
 const [isSubmitting, setIsSubmitting] = useState(false)

 // Navigation & Filtering State
 const [activeTab, setActiveTab] = useState<'global' | 'tenants'>('global')
 const [search, setSearch] = useState('')
 const [selectedCategory, setSelectedCategory] = useState<string>('all')
 const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled' | 'beta' | 'overridden'>('all')

 // Notification Toast
 const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

 const showToast = (text: string, type: 'success' | 'error' = 'success') => {
 setNotification({ text, type })
 setTimeout(() => setNotification(null), 4000)
 }

 // Modals
 const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
 const [editingFlag, setEditingFlag] = useState<PlatformFeatureFlagItem | null>(null)
 const [deletingFlag, setDeletingFlag] = useState<PlatformFeatureFlagItem | null>(null)
 const [overrideModalFlag, setOverrideModalFlag] = useState<PlatformFeatureFlagItem | null>(null)

 // Form States - Create Flag
 const [createForm, setCreateForm] = useState<CreateFeatureFlagInput>({
 key: '',
 name: '',
 description: '',
 category: 'core',
 is_enabled: true,
 is_beta: false,
 is_critical: false,
 min_plan: 'starter',
 })

 // Form States - Edit Flag
 const [editForm, setEditForm] = useState<UpdateFeatureFlagInput>({
 name: '',
 description: '',
 category: 'core',
 is_enabled: true,
 is_beta: false,
 is_critical: false,
 min_plan: 'starter',
 })

 // Form States - Tenant Override
 const [overrideCompanyId, setOverrideCompanyId] = useState<string>('')
 const [overrideState, setOverrideState] = useState<boolean>(true)
 const [overrideNotes, setOverrideNotes] = useState<string>('')

 // Load Data
 const loadData = async () => {
 setLoading(true)
 try {
 const [flagRes, compRes] = await Promise.all([
 getPlatformFeatureFlagsAction(),
 getPlatformCompaniesAction({ pageSize: 100 }),
 ])

 if (flagRes.success && flagRes.data) {
 setOverview(flagRes.data)
 } else {
 showToast(flagRes.error || 'Failed to load feature flags', 'error')
 }

 if (compRes.success && compRes.data) {
 const compList = Array.isArray(compRes.data) ? compRes.data : compRes.data?.companies || []
 setCompanies(compList)
 if (compList.length > 0 && !selectedCompanyId) {
 setSelectedCompanyId(compList[0].id)
 }
 }
 } catch (err: any) {
 showToast(err?.message || 'Error communicating with server', 'error')
 } finally {
 setLoading(false)
 }
 }

 useEffect(() => {
 loadData()
 }, [])

 // Filtered Flags
 const filteredFlags = useMemo(() => {
 if (!overview?.flags) return []

 return overview.flags.filter((flag) => {
 // Search filter
 const matchesSearch =
 search === '' ||
 flag.name.toLowerCase().includes(search.toLowerCase()) ||
 flag.key.toLowerCase().includes(search.toLowerCase()) ||
 flag.description.toLowerCase().includes(search.toLowerCase())

 // Category filter
 const matchesCategory =
 selectedCategory === 'all' || (flag.category || 'general') === selectedCategory

 // Status filter
 let matchesStatus = true
 if (statusFilter === 'enabled') matchesStatus = flag.is_enabled
 else if (statusFilter === 'disabled') matchesStatus = !flag.is_enabled
 else if (statusFilter === 'beta') matchesStatus = Boolean(flag.is_beta)
 else if (statusFilter === 'overridden') matchesStatus = flag.overrides_count > 0

 return matchesSearch && matchesCategory && matchesStatus
 })
 }, [overview, search, selectedCategory, statusFilter])

 // Toggle Global Flag
 const handleToggleGlobal = async (flag: PlatformFeatureFlagItem) => {
 const nextState = !flag.is_enabled

 // Optimistic UI Update
 setOverview((prev) => {
 if (!prev) return prev
 const updatedFlags = prev.flags.map((f) =>
 f.id === flag.id ? { ...f, is_enabled: nextState } : f
 )
 const enabledCount = updatedFlags.filter((f) => f.is_enabled).length
 return {
 ...prev,
 flags: updatedFlags,
 enabled_globally: enabledCount,
 disabled_globally: updatedFlags.length - enabledCount,
 }
 })

 const res = await toggleGlobalFeatureFlagAction(
 flag.id,
 nextState,
 `Toggled globally to ${nextState ? 'ENABLED' : 'DISABLED'} from platform features dashboard`
 )

 if (res.success) {
 showToast(`Feature "${flag.name}" set to ${nextState ? 'ENABLED' : 'DISABLED'} platform-wide.`)
 } else {
 showToast(res.error || 'Failed to toggle global feature flag', 'error')
 await loadData()
 }
 }

 // Open Create Modal
 const handleOpenCreateModal = () => {
 setCreateForm({
 key: '',
 name: '',
 description: '',
 category: 'core',
 is_enabled: true,
 is_beta: false,
 is_critical: false,
 min_plan: 'starter',
 })
 setIsCreateModalOpen(true)
 }

 // Submit Create Flag
 const handleSaveCreateFlag = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!createForm.key.trim() || !createForm.name.trim()) {
 showToast('Key slug and Name are required', 'error')
 return
 }

 setIsSubmitting(true)
 try {
 const res = await createFeatureFlagAction(createForm)
 if (res.success) {
 showToast(`Feature flag "${createForm.name}" created successfully.`)
 setIsCreateModalOpen(false)
 await loadData()
 } else {
 showToast(res.error || 'Failed to create feature flag', 'error')
 }
 } catch (err: any) {
 showToast(err?.message || 'Error creating feature flag', 'error')
 } finally {
 setIsSubmitting(false)
 }
 }

 // Open Edit Modal
 const handleOpenEditModal = (flag: PlatformFeatureFlagItem) => {
 setEditingFlag(flag)
 setEditForm({
 name: flag.name,
 description: flag.description,
 category: flag.category || 'core',
 is_enabled: flag.is_enabled,
 is_beta: Boolean(flag.is_beta),
 is_critical: Boolean(flag.is_critical),
 min_plan: flag.min_plan || 'starter',
 })
 }

 // Submit Edit Flag
 const handleSaveEditFlag = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!editingFlag) return

 setIsSubmitting(true)
 try {
 const res = await updateFeatureFlagAction(editingFlag.id, editForm)
 if (res.success) {
 showToast(`Feature flag "${editForm.name}" updated successfully.`)
 setEditingFlag(null)
 await loadData()
 } else {
 showToast(res.error || 'Failed to update feature flag', 'error')
 }
 } catch (err: any) {
 showToast(err?.message || 'Error updating feature flag', 'error')
 } finally {
 setIsSubmitting(false)
 }
 }

 // Submit Delete Flag
 const handleConfirmDelete = async () => {
 if (!deletingFlag) return
 setIsSubmitting(true)
 try {
 const res = await deleteFeatureFlagAction(deletingFlag.id)
 if (res.success) {
 showToast(`Feature flag "${deletingFlag.name}" deleted.`)
 setDeletingFlag(null)
 await loadData()
 } else {
 showToast(res.error || 'Failed to delete feature flag', 'error')
 }
 } catch (err: any) {
 showToast(err?.message || 'Error deleting feature flag', 'error')
 } finally {
 setIsSubmitting(false)
 }
 }

 // Open Override Modal
 const handleOpenOverrideModal = (flag: PlatformFeatureFlagItem, targetCompanyId?: string) => {
 setOverrideModalFlag(flag)
 setOverrideCompanyId(targetCompanyId || selectedCompanyId || companies[0]?.id || '')
 const existing = flag.overrides.find((o) => o.company_id === (targetCompanyId || selectedCompanyId))
 setOverrideState(existing !== undefined ? !existing.is_enabled : !flag.is_enabled)
 setOverrideNotes(existing?.notes || '')
 }

 // Save Tenant Override
 const handleSaveTenantOverride = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!overrideModalFlag || !overrideCompanyId) return

 setIsSubmitting(true)
 try {
 const res = await setTenantFeatureFlagAction(
 overrideModalFlag.id,
 overrideCompanyId,
 overrideState,
 overrideNotes || `Custom tenant override set from platform features panel`
 )

 if (res.success) {
 const comp = companies.find((c) => c.id === overrideCompanyId)
 showToast(
 `Tenant override applied for "${comp?.name || 'Company'}": ${overrideState ? 'FORCED ON' : 'FORCED OFF'}.`
 )
 setOverrideModalFlag(null)
 await loadData()
 } else {
 showToast(res.error || 'Failed to save tenant override', 'error')
 }
 } catch (err: any) {
 showToast(err?.message || 'Error saving override', 'error')
 } finally {
 setIsSubmitting(false)
 }
 }

 // Remove Tenant Override
 const handleRemoveOverride = async (flag: PlatformFeatureFlagItem, companyId: string) => {
 try {
 const res = await removeTenantFeatureFlagAction(flag.id, companyId)
 if (res.success) {
 const comp = companies.find((c) => c.id === companyId)
 showToast(`Reverted override for "${comp?.name || 'Company'}". Now using global default (${flag.is_enabled ? 'Enabled' : 'Disabled'}).`)
 await loadData()
 } else {
 showToast(res.error || 'Failed to remove tenant override', 'error')
 }
 } catch (err: any) {
 showToast(err?.message || 'Error removing override', 'error')
 }
 }

 // Export CSV
 const handleExportCSV = () => {
 if (!overview?.flags || overview.flags.length === 0) {
 showToast('No feature flag data to export', 'error')
 return
 }

 const headers = ['Flag Key', 'Flag Name', 'Category', 'Global Status', 'Is Beta', 'Is Critical', 'Min Plan', 'Overrides Count', 'Description']
 const rows = overview.flags.map((f) => [
 `"${f.key}"`,
 `"${f.name.replace(/"/g, '""')}"`,
 `"${f.category || 'general'}"`,
 f.is_enabled ? 'ENABLED' : 'DISABLED',
 f.is_beta ? 'YES' : 'NO',
 f.is_critical ? 'YES' : 'NO',
 `"${f.min_plan || 'all'}"`,
 f.overrides_count,
 `"${f.description.replace(/"/g, '""')}"`,
 ])

 const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
 const encodedUri = encodeURI(csvContent)
 const link = document.createElement('a')
 link.setAttribute('href', encodedUri)
 link.setAttribute('download', `printerp_features_${new Date().toISOString().slice(0, 10)}.csv`)
 document.body.appendChild(link)
 link.click()
 document.body.removeChild(link)
 showToast('Exported feature flags matrix to CSV.')
 }

 const selectedCompany = companies.find((c) => c.id === selectedCompanyId)

 return (
 <div className="space-y-6 max-w-7xl mx-auto pb-12">
 {/* Header Banner */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
 <div>
 <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
 <span className="h-2 w-2 rounded-full bg-primary/10 animate-pulse" />
 Module Rollouts &amp; Entitlements Engine
 </div>
 <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
 <Flag className="h-7 w-7 text-primary" />
 Feature Engine &amp; Entitlements
 </h1>
 <p className="text-xs sm:text-sm text-muted-foreground mt-1">
 Govern platform-wide product modules, experimental print algorithms, beta rollouts, and tenant-specific feature overrides.
 </p>
 </div>

 {/* Top Header Actions */}
 <div className="flex flex-wrap items-center gap-2">
 <button
 type="button"
 onClick={handleOpenCreateModal}
 className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold flex items-center gap-1.5 h-9 shadow-md transition-colors cursor-pointer"
 >
 <Plus className="h-4 w-4" />
 <span>Register Flag</span>
 </button>

 <button
 type="button"
 onClick={handleExportCSV}
 className="px-3 py-2 rounded-xl bg-card hover:bg-muted text-foreground hover:text-foreground border border-border text-xs font-semibold flex items-center gap-1.5 h-9 transition-colors cursor-pointer"
 >
 <Download className="h-3.5 w-3.5 text-primary" />
 <span>Export CSV</span>
 </button>

 <button
 type="button"
 onClick={loadData}
 disabled={loading}
 className="h-9 w-9 p-0 rounded-xl bg-card hover:bg-muted text-foreground hover:text-foreground border border-border flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 shrink-0"
 title="Refresh"
 aria-label="Refresh"
 >
 <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
 </button>
 </div>
 </div>

 {/* Toast Notification */}
 {notification && (
 <div
 className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in border ${
 notification.type === 'success'
 ? 'bg-success-surface border-success/30 text-success shadow-lg'
 : 'bg-destructive/10 border-destructive/30 text-destructive shadow-lg'
 }`}
 >
 <div className="flex items-center gap-2">
 {notification.type === 'success' ? (
 <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
 ) : (
 <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
 )}
 <span>{notification.text}</span>
 </div>
 <button
 onClick={() => setNotification(null)}
 className="text-muted-foreground hover:text-foreground cursor-pointer"
 >
 <X className="h-4 w-4" />
 </button>
 </div>
 )}

 {/* Executive Metric Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {/* Total Modules */}
 <Card className="bg-card border-border p-4">
 <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
 <span>Total Feature Modules</span>
 <Boxes className="h-4 w-4 text-primary" />
 </div>
 <div className="text-2xl font-black text-foreground mt-1">
 {overview?.total_flags || 0}
 </div>
 <div className="text-2xs text-primary mt-1">
 Across {overview?.categories?.length || 6} ERP domains
 </div>
 </Card>

 {/* Globally Active */}
 <Card className="bg-card border-border p-4">
 <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
 <span>Active Globally</span>
 <Globe className="h-4 w-4 text-success" />
 </div>
 <div className="text-2xl font-black text-success mt-1">
 {overview?.enabled_globally || 0}
 </div>
 <div className="text-2xs text-muted-foreground mt-1">
 {overview && overview.total_flags > 0
 ? `${Math.round((overview.enabled_globally / overview.total_flags) * 100)}% platform enablement`
 : '0% enabled'}
 </div>
 </Card>

 {/* Beta / Experimental Modules */}
 <Card className="bg-card border-border p-4">
 <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
 <span>Beta &amp; Experimental</span>
 <Sparkles className="h-4 w-4 text-primary" />
 </div>
 <div className="text-2xl font-black text-primary mt-1">
 {overview?.beta_flags_count || 0}
 </div>
 <div className="text-2xs text-primary mt-1">
 Pilot features in testing
 </div>
 </Card>

 {/* Tenant Custom Overrides */}
 <Card className="bg-card border-border p-4">
 <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
 <span>{tBilingual('Client Settings', 'বিশেষ ফিচার')}</span>
 <Building2 className="h-4 w-4 text-primary" />
 </div>
 <div className="text-2xl font-black text-primary mt-1">
 {overview?.total_overrides_count || 0}
 </div>
 <div className="text-2xs text-primary mt-1">
 Custom VIP / SLA company rules
 </div>
 </Card>
 </div>

 {/* Main Tab Bar & Search / Category Filters */}
 <div className="space-y-3 bg-card p-3.5 rounded-2xl border border-border">
 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
 {/* Main Tabs */}
 <div className="flex items-center p-1 bg-card border border-border rounded-xl shrink-0">
 <button
 type="button"
 onClick={() => setActiveTab('global')}
 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
 activeTab === 'global'
 ? 'bg-primary text-foreground shadow-xs'
 : 'text-muted-foreground hover:text-primary-foreground'
 }`}
 >
 <Globe className="h-3.5 w-3.5" />
 <span>Global Modules ({overview?.total_flags || 0})</span>
 </button>
 <button
 type="button"
 onClick={() => setActiveTab('tenants')}
 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
 activeTab === 'tenants'
 ? 'bg-primary text-foreground shadow-xs'
 : 'text-muted-foreground hover:text-primary-foreground'
 }`}
 >
 <Building2 className="h-3.5 w-3.5" />
 <span>{tBilingual('Client Features', 'নির্দিষ্ট ক্লায়েন্ট')}</span>
 </button>
 </div>

 {/* Search Box */}
 <div className="relative w-full lg:w-80">
 <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
 <Input
 placeholder="Search by module name, key, description..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pl-8 h-8 text-xs bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary/20"
 />
 {search && (
 <button
 onClick={() => setSearch('')}
 className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
 >
 <X className="h-3.5 w-3.5" />
 </button>
 )}
 </div>
 </div>

 {/* Secondary Category & Status Filter Row */}
 <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border text-xs">
 {/* Category Chips */}
 <div className="flex flex-wrap items-center gap-1.5">
 <span className="text-muted-foreground text-2xs mr-1">Category:</span>
 {[
 { id: 'all', label: 'All Domains' },
 { id: 'core', label: 'Core ERP' },
 { id: 'localization', label: 'BD Local' },
 { id: 'finance', label: 'Finance' },
 { id: 'ai', label: 'AI Tools' },
 { id: 'hardware', label: 'Hardware' },
 { id: 'logistics', label: 'Logistics' },
 ].map((cat) => (
 <button
 key={cat.id}
 type="button"
 onClick={() => setSelectedCategory(cat.id)}
 className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
 selectedCategory === cat.id
 ? 'bg-primary text-foreground shadow-xs'
 : 'bg-card border border-border text-muted-foreground hover:text-primary-foreground hover:bg-muted'
 }`}
 >
 {cat.label}
 </button>
 ))}
 </div>

 {/* Status Filter */}
 <div className="flex items-center gap-1.5 text-muted-foreground">
 <span>Filter Status:</span>
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value as any)}
 className="bg-card border border-border rounded-lg px-2.5 py-1 text-foreground text-xs"
 >
 <option value="all">All Statuses</option>
 <option value="enabled">Globally Enabled</option>
 <option value="disabled">Globally Disabled</option>
 <option value="beta">Beta / Pilot Only</option>
 <option value="overridden">{tBilingual('Special Setting', 'বিশেষ সেটিং')}</option>
 </select>
 </div>
 </div>
 </div>

 {/* ========================================================================= */}
 {/* TAB 1: GLOBAL PLATFORM-WIDE FEATURE FLAGS */}
 {/* ========================================================================= */}
 {activeTab === 'global' && (
 <div className="space-y-4">
 <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
 <span>{tBilingual('Settings apply to all clients unless changed individually.', 'সবার জন্য চালু থাকে যদি না আলাদা পরিবর্তন করা হয়।')}</span>
 <span className="tabular-nums text-muted-foreground">
 Showing {filteredFlags.length} of {overview?.total_flags || 0} Modules
 </span>
 </div>

 {loading ? (
 <div className="py-16 text-center text-muted-foreground bg-card rounded-2xl border border-border">
 <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
 <span>Loading feature flags telemetry...</span>
 </div>
 ) : filteredFlags.length === 0 ? (
 <div className="py-16 text-center text-muted-foreground bg-card rounded-2xl border border-border">
 <Flag className="h-8 w-8 mx-auto mb-2 text-foreground" />
 <p className="font-semibold text-muted-foreground">No feature flags match your search or filter.</p>
 <p className="text-xs mt-1">Try selecting a different category or clearing filters.</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 gap-3.5">
 {filteredFlags.map((flag) => {
 const Icon = FLAG_CUSTOM_ICONS[flag.key] || CATEGORY_META[flag.category]?.icon || Flag
 const catInfo = CATEGORY_META[flag.category] || CATEGORY_META.general

 return (
 <Card
 key={flag.id}
 className="bg-card border-border hover:border-border p-4 sm:p-5 rounded-2xl transition-all shadow-md"
 >
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 {/* Left: Icon & Description */}
 <div className="flex items-start gap-4">
 <div
 className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
 flag.is_enabled
 ? `${catInfo.bg} ${catInfo.color} border ${catInfo.border}`
 : 'bg-muted text-muted-foreground border border-border'
 }`}
 >
 <Icon className="h-5 w-5" />
 </div>

 <div className="space-y-1.5">
 <div className="flex flex-wrap items-center gap-2">
 <h3 className="font-bold text-sm text-foreground">{flag.name}</h3>
 <span className="tabular-nums text-2xs px-2 py-0.5 rounded bg-card text-muted-foreground border border-border">
 {flag.key}
 </span>
 <span
 className={`text-2xs font-bold px-2 py-0.5 rounded border ${catInfo.bg} ${catInfo.color} ${catInfo.border}`}
 >
 {catInfo.label}
 </span>
 {flag.is_beta && (
 <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
 Beta / Pilot
 </span>
 )}
 {flag.is_critical && (
 <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/30">
 Critical System
 </span>
 )}
 {flag.overrides_count > 0 && (
 <span className="text-2xs tabular-nums px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
 {flag.overrides_count} Tenant Override{flag.overrides_count > 1 ? 's' : ''}
 </span>
 )}
 </div>

 <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
 {flag.description}
 </p>

 <div className="text-2xs text-muted-foreground flex items-center gap-3 pt-0.5">
 <span>Min Plan Tier: <strong className="text-muted-foreground capitalize">{flag.min_plan || 'all'}</strong></span>
 <span>•</span>
 <span>Global Status: <strong className={flag.is_enabled ? 'text-success' : 'text-muted-foreground'}>{flag.is_enabled ? 'Active / Enabled' : 'Inactive / Disabled'}</strong></span>
 </div>
 </div>
 </div>

 {/* Right: Actions & High-Contrast Toggle */}
 <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
 {/* Edit Button */}
 <button
 type="button"
 onClick={() => handleOpenEditModal(flag)}
 className="h-8 px-2.5 text-xs font-semibold text-foreground hover:text-foreground bg-muted hover:bg-muted border border-border rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
 title="Edit flag metadata"
 >
 <Edit className="h-3.5 w-3.5 text-primary" />
 <span>Edit</span>
 </button>

 {/* Override Tenant Button */}
 <button
 type="button"
 onClick={() => handleOpenOverrideModal(flag)}
 className="h-8 px-2.5 text-xs font-semibold text-primary hover:text-foreground bg-primary/10 hover:bg-primary/90 border border-primary/20 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
 title="Set tenant override for a specific company"
 >
 <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
 <span>{tBilingual('Set for Client', 'ক্লায়েন্টে পরিবর্তন')}</span>
 </button>

 {/* Switch Toggle Button */}
 <button
 type="button"
 onClick={() => handleToggleGlobal(flag)}
 className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
 flag.is_enabled
 ? 'bg-primary shadow-xs'
 : 'bg-muted'
 }`}
 title={`Click to ${flag.is_enabled ? 'disable' : 'enable'} globally`}
 >
 <span
 className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-card shadow-lg ring-0 transition duration-200 ease-in-out ${
 flag.is_enabled ? 'translate-x-5' : 'translate-x-0'
 }`}
 />
 </button>

 {/* Delete Button (Only for custom flags) */}
 {!['whatsapp_notifications', 'mushak_6_3', 'ai_job_estimator', 'bd_sms_gateway', 'thermal_receipt_esc_pos'].includes(flag.key) && (
 <button
 type="button"
 onClick={() => setDeletingFlag(flag)}
 className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-destructive bg-card border border-border hover:border-destructive/30 rounded-xl transition-colors cursor-pointer"
 title="Delete custom feature flag"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 )}
 </div>
 </div>
 </Card>
 )
 })}
 </div>
 )}
 </div>
 )}

 {/* ========================================================================= */}
 {/* TAB 2: TENANT-SPECIFIC FEATURE OVERRIDES */}
 {/* ========================================================================= */}
 {activeTab === 'tenants' && (
 <div className="space-y-6">
 {/* Company Picker Bar */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border">
 <div className="flex items-center gap-3">
 <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
 <Building2 className="h-5 w-5" />
 </div>
 <div>
 <div className="text-2xs text-muted-foreground font-semibold uppercase tracking-wider">
 {tBilingual('Selected Client', 'বাছাইকৃত ক্লায়েন্ট')}
 </div>
 <div className="font-bold text-sm text-foreground flex items-center gap-2">
 <span>{selectedCompany ? selectedCompany.name : 'Choose a tenant'}</span>
 {selectedCompany && (
 <span className="text-2xs uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-bold">
 {selectedCompany.plan} Plan
 </span>
 )}
 </div>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <span className="text-xs text-muted-foreground font-semibold">{tBilingual('Select Client:', 'ক্লায়েন্ট বাছুন:')}</span>
 <select
 value={selectedCompanyId}
 onChange={(e) => setSelectedCompanyId(e.target.value)}
 className="bg-card border border-border text-foreground rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-hidden focus:border-primary/20 max-w-xs"
 >
 {companies.map((comp) => (
 <option key={comp.id} value={comp.id}>
 {comp.name} ({comp.plan.toUpperCase()})
 </option>
 ))}
 </select>
 </div>
 </div>

 {/* List of Flags with Tenant Status */}
 <div className="space-y-3.5">
 {filteredFlags.map((flag) => {
 const Icon = FLAG_CUSTOM_ICONS[flag.key] || CATEGORY_META[flag.category]?.icon || Flag
 const override = flag.overrides.find((o) => o.company_id === selectedCompanyId)
 const effectiveStatus = override !== undefined ? override.is_enabled : flag.is_enabled
 const isOverridden = override !== undefined

 return (
 <Card
 key={flag.id}
 className={`p-4 sm:p-5 rounded-2xl transition-all ${
 isOverridden
 ? 'bg-card border-primary/20 shadow-xs'
 : 'bg-card border-border'
 }`}
 >
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div className="flex items-start gap-3.5">
 <div
 className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
 effectiveStatus
 ? 'bg-success/10 text-success border border-success/30'
 : 'bg-muted text-muted-foreground border border-border'
 }`}
 >
 <Icon className="h-5 w-5" />
 </div>

 <div className="space-y-1">
 <div className="flex items-center gap-2 flex-wrap">
 <h4 className="font-bold text-sm text-foreground">{flag.name}</h4>
 <span className="tabular-nums text-2xs px-2 py-0.5 rounded bg-card text-muted-foreground border border-border">
 {flag.key}
 </span>
 {isOverridden ? (
 <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/20">
 {tBilingual('Custom Setting Active', 'বিশেষ সেটিং চালু')}
 </span>
 ) : (
 <span className="text-2xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
 Inherited Global Default ({flag.is_enabled ? 'Enabled' : 'Disabled'})
 </span>
 )}
 </div>

 <p className="text-xs text-muted-foreground max-w-2xl">{flag.description}</p>

 {override?.notes && (
 <div className="text-2xs text-primary tabular-nums mt-1 bg-primary/10 p-1.5 rounded-lg border border-primary/20 inline-block">
 Override Note: {override.notes} • Updated {formatDate(override.updated_at)}
 </div>
 )}
 </div>
 </div>

 {/* Actions */}
 <div className="flex items-center gap-2.5 self-end sm:self-center">
 {isOverridden ? (
 <>
 <span
 className={`text-xs font-bold px-3 py-1 rounded-lg border ${
 effectiveStatus
 ? 'bg-success-surface text-success border-success/30 shadow-sm'
 : 'bg-destructive/10 text-destructive border-destructive/30 shadow-sm'
 }`}
 >
 {effectiveStatus ? 'FORCED ON' : 'FORCED OFF'}
 </span>

 <button
 type="button"
 onClick={() => handleOpenOverrideModal(flag, selectedCompanyId)}
 className="h-8 px-2.5 text-xs font-semibold text-foreground hover:text-foreground bg-muted hover:bg-muted border border-border rounded-xl transition-colors cursor-pointer"
 >
 Edit Override
 </button>

 <button
 type="button"
 onClick={() => handleRemoveOverride(flag, selectedCompanyId)}
 className="h-8 px-2.5 text-xs font-semibold text-destructive hover:text-destructive bg-destructive/10 hover:bg-destructive/90 border border-destructive/30 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
 title="Revert to Platform Global Default"
 >
 <Trash2 className="h-3.5 w-3.5 text-destructive" />
 <span>Revert</span>
 </button>
 </>
 ) : (
 <button
 type="button"
 onClick={() => handleOpenOverrideModal(flag, selectedCompanyId)}
 className="h-8 px-3 text-xs font-bold text-primary hover:text-foreground bg-primary/10 hover:bg-primary/90 border border-primary/20 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
 >
 <Plus className="h-3.5 w-3.5 text-primary" />
 <span>Set Custom Override</span>
 </button>
 )}
 </div>
 </div>
 </Card>
 )
 })}
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* MODAL 1: REGISTER NEW FEATURE FLAG */}
 {/* ========================================================================= */}
 {isCreateModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-card backdrop-blur-sm animate-in fade-in">
 <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xs p-5 space-y-4">
 <div className="flex items-center justify-between border-b border-border pb-3">
 <div className="font-bold text-foreground text-sm flex items-center gap-2">
 <Flag className="h-4 w-4 text-primary" />
 <span>Register Platform Feature Module</span>
 </div>
 <button
 onClick={() => setIsCreateModalOpen(false)}
 className="text-muted-foreground hover:text-foreground cursor-pointer"
 >
 <X className="h-4 w-4" />
 </button>
 </div>

 <form onSubmit={handleSaveCreateFlag} className="space-y-3.5 text-xs">
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-muted-foreground font-semibold block mb-1">Feature Key Slug</label>
 <Input
 required
 placeholder="e.g. ai_photo_enhancer"
 value={createForm.key}
 onChange={(e) =>
 setCreateForm({
 ...createForm,
 key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
 })
 }
 className="bg-card border-border text-foreground tabular-nums text-xs h-9"
 />
 </div>

 <div>
 <label className="text-muted-foreground font-semibold block mb-1">Module Title / Name</label>
 <Input
 required
 placeholder="e.g. AI Image Res Enhancer"
 value={createForm.name}
 onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
 className="bg-card border-border text-foreground text-xs h-9"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-muted-foreground font-semibold block mb-1">Module Category</label>
 <select
 value={createForm.category}
 onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
 className="w-full bg-card border border-border rounded-xl p-2 text-foreground text-xs capitalize"
 >
 <option value="core">Core ERP</option>
 <option value="localization">BD Localization</option>
 <option value="finance">Finance &amp; VAT</option>
 <option value="ai">AI &amp; Smart Tools</option>
 <option value="hardware">Hardware &amp; POS</option>
 <option value="logistics">Logistics &amp; Dispatch</option>
 <option value="general">General</option>
 </select>
 </div>

 <div>
 <label className="text-muted-foreground font-semibold block mb-1">Minimum Plan Tier</label>
 <select
 value={createForm.min_plan}
 onChange={(e) => setCreateForm({ ...createForm, min_plan: e.target.value })}
 className="w-full bg-card border border-border rounded-xl p-2 text-foreground text-xs capitalize"
 >
 <option value="starter">Starter Plan</option>
 <option value="growth">Growth Plan</option>
 <option value="business">Business Plan</option>
 <option value="enterprise">Enterprise Plan</option>
 <option value="all">All Plans</option>
 </select>
 </div>
 </div>

 <div>
 <label className="text-muted-foreground font-semibold block mb-1">Description &amp; Capabilities</label>
 <textarea
 rows={2}
 required
 placeholder="Describe what this feature provides to the printing press..."
 value={createForm.description}
 onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
 className="w-full bg-card border border-border rounded-xl p-2.5 text-foreground text-xs"
 />
 </div>

 {/* Toggles */}
 <div className="grid grid-cols-3 gap-2 pt-1">
 <label className="flex items-center gap-2 p-2 bg-card border border-border rounded-xl cursor-pointer">
 <input
 type="checkbox"
 checked={createForm.is_enabled}
 onChange={(e) => setCreateForm({ ...createForm, is_enabled: e.target.checked })}
 className="rounded text-primary focus:ring-0"
 />
 <span className="text-foreground text-2xs font-semibold">Enabled Globally</span>
 </label>

 <label className="flex items-center gap-2 p-2 bg-card border border-border rounded-xl cursor-pointer">
 <input
 type="checkbox"
 checked={createForm.is_beta}
 onChange={(e) => setCreateForm({ ...createForm, is_beta: e.target.checked })}
 className="rounded text-primary focus:ring-0"
 />
 <span className="text-primary text-2xs font-semibold">Beta / Pilot</span>
 </label>

 <label className="flex items-center gap-2 p-2 bg-card border border-border rounded-xl cursor-pointer">
 <input
 type="checkbox"
 checked={createForm.is_critical}
 onChange={(e) => setCreateForm({ ...createForm, is_critical: e.target.checked })}
 className="rounded text-destructive focus:ring-0"
 />
 <span className="text-destructive text-2xs font-semibold">Critical System</span>
 </label>
 </div>

 <div className="flex justify-end gap-2 pt-3 border-t border-border">
 <button
 type="button"
 onClick={() => setIsCreateModalOpen(false)}
 className="px-4 py-2 rounded-xl border border-border bg-muted hover:bg-muted text-foreground hover:text-foreground text-xs font-semibold transition-colors cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={isSubmitting}
 className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
 >
 {isSubmitting ? 'Registering...' : 'Register Feature Flag'}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* MODAL 2: EDIT FEATURE FLAG */}
 {/* ========================================================================= */}
 {editingFlag && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-card backdrop-blur-sm animate-in fade-in">
 <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xs p-5 space-y-4">
 <div className="flex items-center justify-between border-b border-border pb-3">
 <div className="font-bold text-foreground text-sm flex items-center gap-2">
 <Edit className="h-4 w-4 text-primary" />
 <span>Edit Feature Flag: {editingFlag.name}</span>
 </div>
 <button
 onClick={() => setEditingFlag(null)}
 className="text-muted-foreground hover:text-foreground cursor-pointer"
 >
 <X className="h-4 w-4" />
 </button>
 </div>

 <form onSubmit={handleSaveEditFlag} className="space-y-3.5 text-xs">
 <div className="p-2.5 bg-card border border-border rounded-xl flex items-center justify-between">
 <div>
 <div className="text-2xs text-muted-foreground">Key Slug</div>
 <div className="tabular-nums text-foreground text-xs font-bold">{editingFlag.key}</div>
 </div>
 <span className="text-2xs px-2 py-0.5 rounded bg-muted text-muted-foreground tabular-nums">
 ID: {editingFlag.id.slice(0, 8)}...
 </span>
 </div>

 <div>
 <label className="text-muted-foreground font-semibold block mb-1">Module Title / Name</label>
 <Input
 required
 value={editForm.name}
 onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
 className="bg-card border-border text-foreground text-xs h-9"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-muted-foreground font-semibold block mb-1">Module Category</label>
 <select
 value={editForm.category}
 onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
 className="w-full bg-card border border-border rounded-xl p-2 text-foreground text-xs capitalize"
 >
 <option value="core">Core ERP</option>
 <option value="localization">BD Localization</option>
 <option value="finance">Finance &amp; VAT</option>
 <option value="ai">AI &amp; Smart Tools</option>
 <option value="hardware">Hardware &amp; POS</option>
 <option value="logistics">Logistics &amp; Dispatch</option>
 <option value="general">General</option>
 </select>
 </div>

 <div>
 <label className="text-muted-foreground font-semibold block mb-1">Minimum Plan Tier</label>
 <select
 value={editForm.min_plan}
 onChange={(e) => setEditForm({ ...editForm, min_plan: e.target.value })}
 className="w-full bg-card border border-border rounded-xl p-2 text-foreground text-xs capitalize"
 >
 <option value="starter">Starter Plan</option>
 <option value="growth">Growth Plan</option>
 <option value="business">Business Plan</option>
 <option value="enterprise">Enterprise Plan</option>
 <option value="all">All Plans</option>
 </select>
 </div>
 </div>

 <div>
 <label className="text-muted-foreground font-semibold block mb-1">Description</label>
 <textarea
 rows={2}
 value={editForm.description}
 onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
 className="w-full bg-card border border-border rounded-xl p-2.5 text-foreground text-xs"
 />
 </div>

 <div className="flex justify-end gap-2 pt-3 border-t border-border">
 <button
 type="button"
 onClick={() => setEditingFlag(null)}
 className="px-4 py-2 rounded-xl border border-border bg-muted hover:bg-muted text-foreground hover:text-foreground text-xs font-semibold transition-colors cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={isSubmitting}
 className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
 >
 {isSubmitting ? 'Saving...' : 'Save Changes'}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* MODAL 3: ASSIGN TENANT OVERRIDE */}
 {/* ========================================================================= */}
 {overrideModalFlag && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-card backdrop-blur-sm animate-in fade-in">
 <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xs p-5 space-y-4">
 <div className="flex items-center justify-between border-b border-border pb-3">
 <div className="font-bold text-foreground text-sm flex items-center gap-2">
 <SlidersHorizontal className="h-4 w-4 text-primary" />
 <span>{tBilingual('Client Feature Setting', 'ক্লায়েন্ট ফিচার নির্ধারণ')}</span>
 </div>
 <button
 onClick={() => setOverrideModalFlag(null)}
 className="text-muted-foreground hover:text-foreground cursor-pointer"
 >
 <X className="h-4 w-4" />
 </button>
 </div>

 <form onSubmit={handleSaveTenantOverride} className="space-y-3.5 text-xs">
 <div>
 <label className="text-muted-foreground font-semibold block mb-1">Target Feature Flag</label>
 <div className="p-2.5 bg-card border border-border rounded-xl text-foreground tabular-nums font-bold flex items-center justify-between">
 <span>{overrideModalFlag.name}</span>
 <span className="text-2xs text-muted-foreground tabular-nums">({overrideModalFlag.key})</span>
 </div>
 </div>

 <div>
 <label className="text-muted-foreground font-semibold block mb-1">{tBilingual('Select Client', 'ক্লায়েন্ট বাছুন')}</label>
 <select
 value={overrideCompanyId}
 onChange={(e) => setOverrideCompanyId(e.target.value)}
 className="w-full bg-card border border-border text-foreground rounded-xl p-2.5 text-xs font-semibold focus:outline-hidden focus:border-primary/20"
 >
 {companies.map((c) => (
 <option key={c.id} value={c.id}>
 {c.name} ({c.plan.toUpperCase()})
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="text-muted-foreground font-semibold block mb-1">Target Override State</label>
 <div className="grid grid-cols-2 gap-2">
 <button
 type="button"
 onClick={() => setOverrideState(true)}
 className={`py-2 px-3 rounded-xl font-bold border text-center transition-all cursor-pointer ${
 overrideState
 ? 'bg-success-surface text-success border-success/30 shadow-sm'
 : 'bg-card text-muted-foreground border-border hover:text-foreground'
 }`}
 >
 FORCED ENABLED
 </button>
 <button
 type="button"
 onClick={() => setOverrideState(false)}
 className={`py-2 px-3 rounded-xl font-bold border text-center transition-all cursor-pointer ${
 !overrideState
 ? 'bg-destructive/10 text-destructive border-destructive/30 shadow-sm'
 : 'bg-card text-muted-foreground border-border hover:text-foreground'
 }`}
 >
 FORCED DISABLED
 </button>
 </div>
 </div>

 <div>
 <label className="text-muted-foreground font-semibold block mb-1">Reason / Justification Note</label>
 <Input
 value={overrideNotes}
 onChange={(e) => setOverrideNotes(e.target.value)}
 placeholder="e.g. Granted VIP Enterprise access on custom contract..."
 className="bg-card border-border text-foreground text-xs h-9"
 />
 </div>

 <div className="flex justify-end gap-2 pt-3 border-t border-border">
 <button
 type="button"
 onClick={() => setOverrideModalFlag(null)}
 className="px-4 py-2 rounded-xl border border-border bg-muted hover:bg-muted text-foreground hover:text-foreground text-xs font-semibold transition-colors cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={isSubmitting}
 className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
 >
 {isSubmitting ? tBilingual('Saving...', 'সেভ হচ্ছে...') : tBilingual('Save Setting', 'সেভ করুন')}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* MODAL 4: DELETE CONFIRMATION */}
 {/* ========================================================================= */}
 {deletingFlag && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-card backdrop-blur-sm animate-in fade-in">
 <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xs p-5 space-y-4">
 <div className="flex items-center justify-between border-b border-border pb-3">
 <div className="font-bold text-foreground text-sm flex items-center gap-2">
 <Trash2 className="h-4 w-4 text-destructive" />
 <span>Delete Feature Flag</span>
 </div>
 <button
 onClick={() => setDeletingFlag(null)}
 className="text-muted-foreground hover:text-foreground cursor-pointer"
 >
 <X className="h-4 w-4" />
 </button>
 </div>

 <div className="space-y-3 text-xs">
 <p className="text-muted-foreground">
 Are you sure you want to permanently delete <strong>{deletingFlag.name}</strong> (<code>{deletingFlag.key}</code>)?
 </p>
 <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-2xs">
 Deleting this flag will remove all global settings and cascade delete any active tenant overrides.
 </div>

 <div className="flex justify-end gap-2 pt-3 border-t border-border">
 <button
 type="button"
 onClick={() => setDeletingFlag(null)}
 className="px-4 py-2 rounded-xl border border-border bg-muted hover:bg-muted text-foreground hover:text-foreground text-xs font-semibold transition-colors cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={handleConfirmDelete}
 disabled={isSubmitting}
 className="px-5 py-2 rounded-xl bg-destructive hover:bg-destructive text-destructive-foreground font-bold text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
 >
 {isSubmitting ? 'Deleting...' : 'Delete Feature Flag'}
 </button>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 )
}
