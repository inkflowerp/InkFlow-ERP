'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
 Building2,
 Search,
 CheckCircle2,
 AlertTriangle,
 ExternalLink,
 ShieldAlert,
 CreditCard,
 Gauge,
 UserCheck,
 RefreshCw,
 X,
 Phone,
 Mail,
 MapPin,
 Calendar,
 Clock,
 HardDrive,
 Users,
 Store,
 Layers,
 FileCheck2,
 MoreVertical,
 Shield,
 Download,
 Ban,
 Activity,
 ArrowRight,
 Sparkles,
 Trash2,
 Plus,
 Copy,
 Check,
 Eye,
 EyeOff,
 Key,
 Globe,
 Lock,
 UserPlus,
 Hourglass,
 Send,
 MailCheck,
 HelpCircle,
 Zap,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { formatDate } from '@/lib/formatters'
import {
 getPlatformCompaniesAction,
 getPlatformPlansAction,
 getPlatformIncompleteRegistrationsAction,
} from '@/actions/platform-data.actions'
import {
 PlatformTenantCompany,
 PlatformCompanyStatus,
 PlatformPlanCode,
 TenantHealthStatus,
 IncompleteRegistrationRecord,
 IncompleteRegistrationStage,
} from '@/types/platform.types'
import { SubscriptionPlanRecord } from '@/types/subscription.types'
import {
 updateCompanyStatusAction,
 changeCompanyPlanAction,
 startTenantSupportSessionAction,
 exportTenantDataAction,
 createBusinessAction,
 deleteBusinessAction,
 deleteAllBusinessesAction,
 resendIncompleteRegistrationVerificationAction,
 deleteIncompleteRegistrationAction,
} from '@/actions/platform.actions'
import { getTenantLink } from '@/lib/tenant/tenant-url'
import { useI18n } from '@/lib/i18n'

export default function PlatformTenantsPage() {
  const { tBilingual } = useI18n()
 const [companies, setCompanies] = useState<PlatformTenantCompany[]>([])
 const [plans, setPlans] = useState<SubscriptionPlanRecord[]>([])
 const [search, setSearch] = useState('')
 const [statusFilter, setStatusFilter] = useState<string>('all')
 const [planFilter, setPlanFilter] = useState<string>('all')
 const [loading, setLoading] = useState(true)

 // Incomplete / Started-but-not-finished Registrations State
 const [incompleteRegistrations, setIncompleteRegistrations] = useState<IncompleteRegistrationRecord[]>([])
 const [incompleteMetrics, setIncompleteMetrics] = useState<{
 total_incomplete: number
 pending_verification_count: number
 verified_pending_onboarding_count: number
 expired_count: number
 }>({
 total_incomplete: 0,
 pending_verification_count: 0,
 verified_pending_onboarding_count: 0,
 expired_count: 0,
 })
 const [incompleteStageFilter, setIncompleteStageFilter] = useState<string>('all')
 const [resendingMap, setResendingMap] = useState<Record<string, boolean>>({})
 const [deleteIncompleteTarget, setDeleteIncompleteTarget] = useState<IncompleteRegistrationRecord | null>(null)
 const [isDeletingIncomplete, setIsDeletingIncomplete] = useState(false)


 // Create Business Modal State
 const [showCreateModal, setShowCreateModal] = useState(false)
 const [isCreatingBusiness, setIsCreatingBusiness] = useState(false)
 const [createError, setCreateError] = useState<string | null>(null)
 const [provisionName, setProvisionName] = useState('')
 const [provisionSlug, setProvisionSlug] = useState('')
 const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
 const [provisionNameBn, setProvisionNameBn] = useState('')
 const [provisionBusinessType, setProvisionBusinessType] = useState('commercial_printing')
 const [provisionOwnerName, setProvisionOwnerName] = useState('')
 const [provisionOwnerEmail, setProvisionOwnerEmail] = useState('')
 const [provisionOwnerPhone, setProvisionOwnerPhone] = useState('')
 const [provisionPassword, setProvisionPassword] = useState('PrintERP2026!Owner')
 const [showPassword, setShowPassword] = useState(false)
 const [provisionAddress, setProvisionAddress] = useState('')
 const [provisionCurrency, setProvisionCurrency] = useState('BDT')
 const [provisionPlan, setProvisionPlan] = useState('trial')

 // Post-Provisioning Credentials Summary State
 const [provisionedResult, setProvisionedResult] = useState<{
 company: any
 credentials: {
 businessName: string
 slug: string
 email: string
 password: string
 loginUrl: string
 dashboardUrl: string
 plan: string
 }
 } | null>(null)
 const [copiedField, setCopiedField] = useState<string | null>(null)

 const generateSlug = (text: string) => {
 return text
 .toLowerCase()
 .trim()
 .replace(/[\s_]+/g, '-')
 .replace(/[^a-z0-9-]/g, '')
 .replace(/-+/g, '-')
 .replace(/^-|-$/g, '')
 }

 const handleNameChange = (val: string) => {
 setProvisionName(val)
 if (!slugManuallyEdited) {
 setProvisionSlug(generateSlug(val))
 }
 }

 const handleGeneratePassword = () => {
 const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*'
 let pwd = ''
 for (let i = 0; i < 14; i++) {
 pwd += chars.charAt(Math.floor(Math.random() * chars.length))
 }
 setProvisionPassword(pwd)
 setShowPassword(true)
 }

 const handleCopyText = (text: string, fieldKey: string) => {
 navigator.clipboard.writeText(text)
 setCopiedField(fieldKey)
 setTimeout(() => setCopiedField(null), 2500)
 }

 // Status Change Modal (Suspend / Reactivate)
 const [statusModalCompany, setStatusModalCompany] = useState<PlatformTenantCompany | null>(null)
 const [targetStatus, setTargetStatus] = useState<PlatformCompanyStatus>('active')
 const [statusReason, setStatusReason] = useState('')
 const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

 // Plan Change Modal
 const [planModalCompany, setPlanModalCompany] = useState<PlatformTenantCompany | null>(null)
 const [targetPlan, setTargetPlan] = useState<PlatformPlanCode>('business')
 const [planReason, setPlanReason] = useState('')
 const [isUpdatingPlan, setIsUpdatingPlan] = useState(false)

 // Support Mode Modal
 const [supportModalCompany, setSupportModalCompany] = useState<PlatformTenantCompany | null>(null)
 const [supportReason, setSupportReason] = useState('')
 const [isStartingSupport, setIsStartingSupport] = useState(false)

 // Delete Single Tenant Modal
 const [deleteModalCompany, setDeleteModalCompany] = useState<PlatformTenantCompany | null>(null)
 const [deleteReason, setDeleteReason] = useState('')
 const [deleteConfirmName, setDeleteConfirmName] = useState('')
 const [deleteError, setDeleteError] = useState<string | null>(null)
 const [isDeletingCompany, setIsDeletingCompany] = useState(false)

 // Purge All Tenants Modal
 const [showPurgeAllModal, setShowPurgeAllModal] = useState(false)
 const [purgeReason, setPurgeReason] = useState('')
 const [purgeConfirmText, setPurgeConfirmText] = useState('')
 const [isPurgingAll, setIsPurgingAll] = useState(false)

 // Notifications
 const [notification, setNotification] = useState<string | null>(null)
 const router = useRouter()

 const showNotification = (msg: string) => {
 setNotification(msg)
 setTimeout(() => setNotification(null), 3500)
 }

 const loadData = async () => {
 setLoading(true)
 try {
 const [compRes, plansRes, incRes] = await Promise.all([
 getPlatformCompaniesAction(),
 getPlatformPlansAction(),
 getPlatformIncompleteRegistrationsAction(),
 ])
 if (compRes.success && compRes.data) {
 const list = Array.isArray(compRes.data) ? compRes.data : compRes.data.companies
 setCompanies(list || [])
 } else if (!compRes.success && compRes.error) {
 showNotification(compRes.error)
 }
 if (plansRes.success && plansRes.data) {
 setPlans(plansRes.data)
 }
 if (incRes.success && incRes.data) {
 setIncompleteRegistrations(incRes.data.registrations || [])
 setIncompleteMetrics(incRes.data.metrics || {
 total_incomplete: (incRes.data.registrations || []).length,
 pending_verification_count: 0,
 verified_pending_onboarding_count: 0,
 expired_count: 0,
 })
 }
 } catch (err: any) {
 showNotification(err?.message || 'Failed to load platform data')
 } finally {
 setLoading(false)
 }
 }

 // Handle Resend Verification OTP / Email for Incomplete Registration
 const handleResendIncompleteOtp = async (reg: IncompleteRegistrationRecord) => {
 setResendingMap((prev) => ({ ...prev, [reg.email]: true }))
 try {
 const res = await resendIncompleteRegistrationVerificationAction(reg.email)
 if (res.success) {
 showNotification(`Verification email & OTP code re-sent to ${reg.email}`)
 loadData()
 } else {
 showNotification(res.error || 'Failed to resend verification code')
 }
 } catch {
 showNotification('Failed to dispatch verification email')
 } finally {
 setResendingMap((prev) => ({ ...prev, [reg.email]: false }))
 }
 }

 // Handle Launch / Provision Tenant from Incomplete Registration
 const handleProvisionIncomplete = (reg: IncompleteRegistrationRecord) => {
 setProvisionOwnerName(reg.full_name || '')
 setProvisionOwnerEmail(reg.email || '')
 setProvisionOwnerPhone(reg.phone || '')
 const baseName = reg.full_name ? `${reg.full_name} Printings` : 'New Print Shop'
 setProvisionName(baseName)
 setProvisionSlug(generateSlug(baseName))
 setSlugManuallyEdited(false)
 setProvisionPlan(reg.plan || 'trial')
 setCreateError(null)
 setShowCreateModal(true)
 }

 // Handle Delete / Purge Incomplete Registration
 const handleDeleteIncomplete = async () => {
 if (!deleteIncompleteTarget) return
 setIsDeletingIncomplete(true)
 try {
 const identifier = deleteIncompleteTarget.email || deleteIncompleteTarget.id
 const res = await deleteIncompleteRegistrationAction(
 identifier,
 'Abandoned incomplete registration purged by platform administrator'
 )
 if (res.success) {
 showNotification((res as any).message || `Incomplete registration for ${deleteIncompleteTarget.email} has been purged.`)
 setDeleteIncompleteTarget(null)
 await loadData()
 } else {
 showNotification(res.error || 'Failed to delete record')
 }
 } catch {
 showNotification('Failed to delete incomplete registration')
 } finally {
 setIsDeletingIncomplete(false)
 }
 }

 useEffect(() => {
 loadData()
 }, [])

 const handleSearchSubmit = (e: React.FormEvent) => {
 e.preventDefault()
 }

 // Handle Create Business
 const handleCreateBusiness = async (e: React.FormEvent<HTMLFormElement>) => {
 e.preventDefault()
 setIsCreatingBusiness(true)
 setCreateError(null)

 const finalSlug = (provisionSlug || generateSlug(provisionName)).trim().toLowerCase()
 const finalName = provisionName.trim()

 if (!finalName) {
 setCreateError('Business Name is required.')
 setIsCreatingBusiness(false)
 return
 }

 if (!finalSlug) {
 setCreateError('URL Slug is required.')
 setIsCreatingBusiness(false)
 return
 }

 const formData = new FormData()
 formData.set('name', finalName)
 formData.set('slug', finalSlug)
 formData.set('name_bn', provisionNameBn.trim())
 formData.set('business_type', provisionBusinessType)
 formData.set('owner_name', provisionOwnerName.trim())
 formData.set('owner_email', provisionOwnerEmail.trim())
 formData.set('owner_phone', provisionOwnerPhone.trim())
 formData.set('owner_password', provisionPassword.trim() || 'PrintERP2026!Owner')
 formData.set('address', provisionAddress.trim())
 formData.set('currency', provisionCurrency)
 formData.set('plan', provisionPlan)

 const res = await createBusinessAction(formData)

 if (res.success && res.data) {
 showNotification(`Tenant organization "${finalName}" provisioned successfully.`)
 setShowCreateModal(false)
 // Open credentials summary
 setProvisionedResult({
 company: res.data,
 credentials: (res as any).credentials || {
 businessName: res.data.name,
 slug: res.data.slug,
 email: provisionOwnerEmail.trim() || res.data.email || `owner@${res.data.slug}.com`,
 password: provisionPassword.trim() || 'PrintERP2026!Owner',
 loginUrl: getTenantLink(res.data.slug, '/login'),
 dashboardUrl: getTenantLink(res.data.slug, '/dashboard'),
 plan: provisionPlan,
 },
 })
 // Reset form fields
 setProvisionName('')
 setProvisionSlug('')
 setSlugManuallyEdited(false)
 setProvisionNameBn('')
 setProvisionOwnerName('')
 setProvisionOwnerEmail('')
 setProvisionOwnerPhone('')
 setProvisionPassword('PrintERP2026!Owner')
 setProvisionAddress('')
 setProvisionPlan('trial')
 loadData()
 } else {
 setCreateError(res.error || 'Failed to provision tenant organization.')
 }
 setIsCreatingBusiness(false)
 }

 // Handle Delete Single Tenant
 const handleDeleteCompany = async () => {
 if (!deleteModalCompany) return
 const reasonTrimmed = deleteReason.trim()
 if (!reasonTrimmed) {
 setDeleteError('Reason for deletion (Audit Trail) is mandatory.')
 return
 }

 const inputTrimmed = deleteConfirmName.trim().toLowerCase()
 const targetName = deleteModalCompany.name.trim().toLowerCase()
 const targetSlug = deleteModalCompany.slug ? deleteModalCompany.slug.trim().toLowerCase() : ''
 const matchesName = inputTrimmed === targetName
 const matchesSlug = Boolean(targetSlug && inputTrimmed === targetSlug)
 const matchesDelete = deleteConfirmName.trim().toUpperCase() === 'DELETE'

 if (!matchesName && !matchesSlug && !matchesDelete) {
 setDeleteError(`Please type "${deleteModalCompany.name}", "${deleteModalCompany.slug}", or "DELETE" to confirm.`)
 return
 }

 setIsDeletingCompany(true)
 setDeleteError(null)

 try {
 const res = await deleteBusinessAction(deleteModalCompany.id, reasonTrimmed)
 if (res.success) {
 showNotification(`Tenant "${deleteModalCompany.name}" and all associated workspace data have been permanently deleted.`)
 setDeleteModalCompany(null)
 setDeleteReason('')
 setDeleteConfirmName('')
 setDeleteError(null)
 await loadData()
 } else {
 setDeleteError(res.error || 'Failed to delete tenant.')
 showNotification(res.error || 'Failed to delete tenant.')
 }
 } catch (err: any) {
 setDeleteError(err?.message || 'Failed to delete tenant.')
 showNotification('Failed to delete tenant.')
 } finally {
 setIsDeletingCompany(false)
 }
 }

 // Handle Purge All Tenants
 const handlePurgeAllCompanies = async () => {
 if (purgeConfirmText !== 'PURGE') return
 setIsPurgingAll(true)
 const res = await deleteAllBusinessesAction(purgeReason || 'All tenants purged by platform administrator')
 if (res.success) {
 showNotification('All tenants and associated workspace data have been completely purged.')
 setShowPurgeAllModal(false)
 setPurgeReason('')
 setPurgeConfirmText('')
 loadData()
 } else {
 showNotification(res.error || 'Failed to purge tenants.')
 }
 setIsPurgingAll(false)
 }

 // Handle Status Update
 const handleUpdateStatus = async () => {
 if (!statusModalCompany || !statusReason.trim()) return
 setIsUpdatingStatus(true)

 const res = await updateCompanyStatusAction(
 statusModalCompany.id,
 targetStatus,
 statusReason
 )

 if (res.success) {
 showNotification(`Tenant status updated to ${targetStatus.toUpperCase()}.`)
 setStatusModalCompany(null)
 setStatusReason('')
 loadData()
 } else {
 showNotification(res.error || 'Failed to update tenant status.')
 }
 setIsUpdatingStatus(false)
 }

 // Handle Plan Change
 const handleChangePlan = async () => {
 if (!planModalCompany || !planReason.trim()) return
 setIsUpdatingPlan(true)

 const res = await changeCompanyPlanAction(
 planModalCompany.id,
 targetPlan,
 planReason
 )

 if (res.success) {
 showNotification(`Tenant subscription plan updated to ${targetPlan.toUpperCase()}.`)
 setPlanModalCompany(null)
 setPlanReason('')
 loadData()
 } else {
 showNotification(res.error || 'Failed to update tenant plan.')
 }
 setIsUpdatingPlan(false)
 }

 // Handle Start Support
 const handleStartSupport = async () => {
 if (!supportModalCompany || !supportReason.trim()) return
 setIsStartingSupport(true)

 const res = await startTenantSupportSessionAction(
 supportModalCompany.id,
 supportModalCompany.slug,
 supportModalCompany.name,
 supportReason
 )

 if (res.success && 'redirectUrl' in res) {
 showNotification('Temporary support access granted. Redirecting to tenant workspace...')
 setSupportModalCompany(null)
 if (res.redirectUrl.startsWith('http://') || res.redirectUrl.startsWith('https://')) {
 window.location.href = res.redirectUrl
 } else {
 router.push(res.redirectUrl)
 }
 } else if (!res.success && 'error' in res) {
 showNotification(res.error)
 }
 setIsStartingSupport(false)
 }

 const filteredCompanies = companies.filter((c) => {
 if (statusFilter !== 'all' && c.status !== statusFilter) return false
 if (planFilter !== 'all' && c.plan !== planFilter) return false
 if (!search.trim()) return true
 const q = search.toLowerCase().trim()
 return (
 c.name.toLowerCase().includes(q) ||
 c.slug.toLowerCase().includes(q) ||
 (c.owner_name && c.owner_name.toLowerCase().includes(q)) ||
 (c.owner_email && c.owner_email.toLowerCase().includes(q)) ||
 (c.owner_phone && c.owner_phone.includes(q))
 )
 })

 const filteredIncomplete = incompleteRegistrations.filter((item) => {
 if (incompleteStageFilter !== 'all' && item.stage !== incompleteStageFilter) return false
 if (planFilter !== 'all' && item.plan !== planFilter) return false
 if (!search.trim()) return true
 const q = search.toLowerCase().trim()
 return (
 item.full_name.toLowerCase().includes(q) ||
 item.email.toLowerCase().includes(q) ||
 (item.phone && item.phone.includes(q))
 )
 })

 return (
 <div className="space-y-6">
 {/* Toast Notification */}
 {notification && (
 <div className="fixed bottom-5 right-5 z-50 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-xs animate-in slide-in-from-bottom-5">
 {notification}
 </div>
 )}

 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
 <div>
 <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
 <span className="h-2 w-2 rounded-full bg-success" />
 Multi-Tenant Portfolio • Bangladesh SaaS
 </div>
 <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
 <Building2 className="h-7 w-7 text-primary" />
 Tenants Management
 </h1>
 <p className="text-xs sm:text-sm text-muted-foreground mt-1">
 Authoritative directory of all organizations on the InkFlow platform with lifecycle governance.
 </p>
 </div>

 <div className="flex items-center gap-2.5 flex-wrap">
 {companies.length > 0 && (
 <Button
 size="sm"
 variant="outline"
 onClick={() => {
 setShowPurgeAllModal(true)
 setPurgeReason('')
 setPurgeConfirmText('')
 }}
 className="border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/90 hover:text-destructive text-xs h-9 px-3 rounded-xl"
 >
 <Trash2 className="h-3.5 w-3.5 mr-1.5" />
 Purge All Tenants
 </Button>
 )}

 <Button
 size="sm"
 onClick={() => setShowCreateModal(true)}
 className="bg-primary hover:bg-primary text-primary-foreground font-bold text-xs h-9 px-4 rounded-xl shadow-xs"
 >
 <Plus className="h-4 w-4 mr-1.5" />
 Add Tenant
 </Button>

 <Button
 size="sm"
 variant="outline"
 onClick={loadData}
 className="border-border bg-card text-muted-foreground hover:bg-muted text-xs h-9"
 >
 <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
 Refresh
 </Button>
 </div>
 </div>

 {/* KPI Metrics Summary Cards */}
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
 <Card className="bg-card border-border py-2.5 px-3.5 rounded-xl relative overflow-hidden group hover:border-border transition-all shadow-lg">
 <div className="flex items-center justify-between">
 <span className="text-2xs sm:text-xs font-semibold text-muted-foreground">{tBilingual('Total Clients', 'মোট ক্লায়েন্ট')}</span>
 <div className="h-7 w-7 rounded-lg bg-primary/15 border border-primary/20 text-primary flex items-center justify-center">
 <Building2 className="h-3.5 w-3.5" />
 </div>
 </div>
 <div className="text-xl font-black text-foreground mt-1 flex items-baseline gap-2">
 {companies.length}
 <span className="text-2xs font-normal text-muted-foreground tabular-nums">orgs</span>
 </div>
 <div className="text-2xs text-muted-foreground mt-0.5 flex items-center gap-1.5 truncate">
 <span className="text-primary font-bold">
 {companies.reduce((acc, c) => acc + (c.users_count || 0), 0)}
 </span>{' '}
 {tBilingual('users', 'ইউজার')}
 </div>
 </Card>

 <Card className="bg-card border-border py-2.5 px-3.5 rounded-xl relative overflow-hidden group hover:border-border transition-all shadow-lg">
 <div className="flex items-center justify-between">
 <span className="text-2xs sm:text-xs font-semibold text-muted-foreground">{tBilingual('Active Clients', 'সচল ক্লায়েন্ট')}</span>
 <div className="h-7 w-7 rounded-lg bg-success/15 border border-success/30 text-success flex items-center justify-center">
 <CheckCircle2 className="h-3.5 w-3.5" />
 </div>
 </div>
 <div className="text-xl font-black text-success mt-1 flex items-baseline gap-2">
 {companies.filter((c) => c.status === 'active').length}
 <span className="text-2xs font-semibold text-success/80 bg-success-surface px-1.5 py-0.2 rounded border border-success/30">
 {companies.length > 0
 ? `${Math.round((companies.filter((c) => c.status === 'active').length / companies.length) * 100)}%`
 : '0%'}
 </span>
 </div>
 <div className="text-2xs text-muted-foreground mt-0.5 truncate">{tBilingual('Working well', 'সচল আছে')}</div>
 </Card>

 <Card className="bg-card border-border py-2.5 px-3.5 rounded-xl relative overflow-hidden group hover:border-border transition-all shadow-lg">
 <div className="flex items-center justify-between">
 <span className="text-2xs sm:text-xs font-semibold text-muted-foreground">{tBilingual('Free Trials', 'ফ্রি ট্রায়াল')}</span>
 <div className="h-7 w-7 rounded-lg bg-primary/15 border border-primary/20 text-primary flex items-center justify-center">
 <Sparkles className="h-3.5 w-3.5" />
 </div>
 </div>
 <div className="text-xl font-black text-primary mt-1 flex items-baseline gap-2">
 {companies.filter((c) => c.status === 'trial').length}
 <span className="text-2xs font-normal text-muted-foreground tabular-nums">evaluating</span>
 </div>
 <div className="text-2xs text-muted-foreground mt-0.5 truncate">{tBilingual('Testing system', 'টেস্টিং')}</div>
 </Card>

 {/* Incomplete / Started-but-not-finished Registrations KPI Card */}
 <Card
 onClick={() => setStatusFilter('incomplete')}
 className={`bg-card border-border py-2.5 px-3.5 rounded-xl relative overflow-hidden group cursor-pointer transition-all shadow-lg hover:border-warning/30 ${
 statusFilter === 'incomplete' ? 'ring-2 ring-amber-500/50 bg-warning-surface' : ''
 }`}
 >
 <div className="flex items-center justify-between">
 <span className="text-2xs sm:text-xs font-semibold text-warning">{tBilingual('Incomplete', 'অসম্পূর্ণ')}</span>
 <div className="h-7 w-7 rounded-lg bg-warning/15 border border-warning/30 text-warning flex items-center justify-center">
 <Hourglass className="h-3.5 w-3.5" />
 </div>
 </div>
 <div className="text-xl font-black text-warning mt-1 flex items-baseline gap-2">
 {incompleteRegistrations.length}
 <span className="text-2xs font-normal text-muted-foreground tabular-nums">pending</span>
 </div>
 <div className="text-2xs text-muted-foreground mt-0.5 flex items-center gap-1.5 truncate">
 <span className="text-warning font-semibold">{incompleteMetrics.pending_verification_count} awaiting OTP</span>
 </div>
 </Card>

 <Card className="bg-card border-border py-2.5 px-3.5 rounded-xl relative overflow-hidden group hover:border-border transition-all shadow-lg">
 <div className="flex items-center justify-between">
 <span className="text-2xs sm:text-xs font-semibold text-muted-foreground">{tBilingual('Stopped', 'বন্ধ')}</span>
 <div className="h-7 w-7 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive flex items-center justify-center">
 <AlertTriangle className="h-3.5 w-3.5" />
 </div>
 </div>
 <div className="text-xl font-black text-destructive mt-1 flex items-baseline gap-2">
 {companies.filter((c) => c.status === 'suspended').length}
 <span className="text-2xs font-normal text-muted-foreground tabular-nums">restricted</span>
 </div>
 <div className="text-2xs text-muted-foreground mt-0.5 truncate">{tBilingual('Access closed', 'লক করা')}</div>
 </Card>

 <Card className="bg-card border-border py-2.5 px-3.5 rounded-xl relative overflow-hidden group hover:border-border transition-all shadow-lg col-span-2 sm:col-span-1">
 <div className="flex items-center justify-between">
 <span className="text-2xs sm:text-xs font-semibold text-muted-foreground">{tBilingual('Monthly Income', 'মাসিক আয়')}</span>
 <div className="h-7 w-7 rounded-lg bg-success/15 border border-success/30 text-success flex items-center justify-center">
 <CreditCard className="h-3.5 w-3.5" />
 </div>
 </div>
 <div className="text-xl font-black text-success mt-1">
 <CurrencyDisplay amount={companies.reduce((acc, c) => acc + (c.monthly_fee || 0), 0)} />
 </div>
 <div className="text-2xs text-muted-foreground mt-0.5 truncate">{tBilingual('Total per month', 'প্রতি মাসে')}</div>
 </Card>
 </div>

 {/* Filter & Search Bar */}
 <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3.5 rounded-2xl border border-border">
 <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
 {[
 { key: 'all', label: 'All Tenants', count: companies.length },
 { key: 'active', label: 'Active', count: companies.filter((c) => c.status === 'active').length },
 { key: 'trial', label: 'Trial', count: companies.filter((c) => c.status === 'trial').length },
 { key: 'suspended', label: 'Suspended', count: companies.filter((c) => c.status === 'suspended').length },
 { key: 'incomplete', label: 'Registration Incomplete', count: incompleteRegistrations.length, isSpecial: true },
 ].map((tab) => {
 const isSelected = statusFilter === tab.key
 return (
 <button
 key={tab.key}
 type="button"
 onClick={() => setStatusFilter(tab.key)}
 className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
 isSelected
 ? tab.isSpecial
 ? 'bg-warning text-foreground shadow-xs'
 : 'bg-primary text-primary-foreground shadow-xs'
 : tab.isSpecial
 ? 'bg-warning-surface text-warning hover:text-warning hover:bg-warning-surface border border-warning/30'
 : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-border'
 }`}
 >
 {tab.isSpecial && <Hourglass className="h-3.5 w-3.5 text-warning shrink-0" />}
 <span>{tab.label}</span>
 <span
 className={`px-1.5 py-0.2 rounded-full text-2xs tabular-nums ${
 isSelected
 ? 'bg-card/20 text-foreground'
 : tab.isSpecial
 ? 'bg-warning-surface text-warning'
 : 'bg-muted text-muted-foreground'
 }`}
 >
 {tab.count}
 </span>
 </button>
 )
 })}
 </div>

 <div className="flex items-center gap-2.5 flex-1 md:max-w-md justify-end">
 <form onSubmit={handleSearchSubmit} className="relative flex-1">
 <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder={
 statusFilter === 'incomplete'
 ? 'Search by registrant name, email, phone...'
 : 'Search by name, slug, owner, phone...'
 }
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pl-9 bg-card border-border text-xs text-foreground placeholder:text-muted-foreground h-9 rounded-xl focus-visible:ring-primary"
 />
 {search && (
 <button
 type="button"
 onClick={() => setSearch('')}
 className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-muted-foreground"
 >
 <X className="h-4 w-4" />
 </button>
 )}
 </form>

 {/* Plan Filter */}
 <select
 value={planFilter}
 onChange={(e) => setPlanFilter(e.target.value)}
 className="h-9 px-3 rounded-xl bg-card border border-border text-xs text-muted-foreground font-medium focus:outline-none focus:border-primary/20 shrink-0"
 >
 <option value="all">{tBilingual('All Plans', 'সব প্ল্যান')}</option>
 <option value="trial">Trial Tier</option>
 <option value="starter">Starter Tier</option>
 <option value="business">Business Tier</option>
 <option value="enterprise">Enterprise Tier</option>
 <option value="growth">Growth Tier</option>
 </select>
 </div>
 </div>

 {/* Cross-tab Search Discovery Banner */}
 {statusFilter !== 'incomplete' && search && filteredIncomplete.length > 0 && (
 <div className="flex items-center justify-between p-3 rounded-xl bg-warning-surface border border-warning/30 text-warning text-xs">
 <div className="flex items-center gap-2">
 <Hourglass className="h-4 w-4 text-warning shrink-0" />
 <span>
 Found <strong>{filteredIncomplete.length}</strong> registration started but not finished tenant(s) matching &quot;{search}&quot;.
 </span>
 </div>
 <button
 type="button"
 onClick={() => setStatusFilter('incomplete')}
 className="font-bold underline hover:text-warning flex items-center gap-1 shrink-0 ml-3"
 >
 View Incomplete Registrations →
 </button>
 </div>
 )}

 {/* Main Content Area */}
 {loading ? (
 <div className="space-y-3">
 {[1, 2, 3, 4].map((i) => (
 <div key={i} className="h-20 bg-card border border-border rounded-2xl animate-pulse" />
 ))}
 </div>
 ) : statusFilter === 'incomplete' ? (
 /* INCOMPLETE REGISTRATIONS TABLE VIEW */
 <div className="space-y-4">
 {/* Incomplete Sub-stage Filter Chips */}
 <div className="flex items-center justify-between gap-3 flex-wrap bg-card p-2.5 rounded-xl border border-border">
 <div className="flex items-center gap-1.5 flex-wrap">
 <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider px-2">Stage:</span>
 {[
 { key: 'all', label: 'All Incomplete', count: incompleteMetrics.total_incomplete },
 { key: 'pending_verification', label: 'Pending Email OTP', count: incompleteMetrics.pending_verification_count },
 { key: 'verified_pending_onboarding', label: 'Email Verified / Onboarding Pending', count: incompleteMetrics.verified_pending_onboarding_count },
 { key: 'verification_expired', label: 'OTP Expired', count: incompleteMetrics.expired_count },
 ].map((sub) => {
 const isSubActive = incompleteStageFilter === sub.key
 return (
 <button
 key={sub.key}
 type="button"
 onClick={() => setIncompleteStageFilter(sub.key)}
 className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
 isSubActive
 ? 'bg-warning-surface text-warning border border-warning/30 shadow-sm'
 : 'bg-card text-muted-foreground hover:text-foreground border border-border'
 }`}
 >
 <span>{sub.label}</span>
 <span className={`px-1.5 py-0.2 rounded-full text-2xs tabular-nums ${isSubActive ? 'bg-warning-surface text-warning' : 'bg-muted text-muted-foreground'}`}>
 {sub.count}
 </span>
 </button>
 )
 })}
 </div>
 <div className="text-2xs text-muted-foreground px-2 flex items-center gap-1.5">
 <Clock className="h-3.5 w-3.5 text-warning" />
 <span>Registration drop-off triage &amp; workspace provisioning</span>
 </div>
 </div>

 {/* Incomplete Registrations Table / Empty State */}
 {filteredIncomplete.length === 0 ? (
 <Card className="bg-card border-border text-center py-16">
 <CardContent className="space-y-3">
 <UserCheck className="h-12 w-12 text-muted-foreground mx-auto" />
 <div className="text-base font-bold text-foreground">No Incomplete Registrations Found</div>
 <p className="text-xs text-muted-foreground max-w-md mx-auto">
 {search || incompleteStageFilter !== 'all' || planFilter !== 'all'
 ? 'No incomplete tenant registrations match your current search or stage criteria.'
 : 'All users who initiated registration have completed onboarding and activated their workspace.'}
 </p>
 </CardContent>
 </Card>
 ) : (
 <div className="overflow-hidden rounded-2xl border border-border bg-card">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead className="bg-card text-2xs uppercase tracking-wider text-muted-foreground border-b border-border">
 <tr>
 <th className="py-3.5 px-4 font-bold">Prospective Owner</th>
 <th className="py-3.5 px-3 font-bold">Contact Details</th>
 <th className="py-3.5 px-3 font-bold">Target Plan</th>
 <th className="py-3.5 px-3 font-bold">Registration Stage</th>
 <th className="py-3.5 px-3 font-bold">Verification Telemetry</th>
 <th className="py-3.5 px-3 font-bold">Started At</th>
 <th className="py-3.5 px-4 font-bold text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/60 text-muted-foreground">
 {filteredIncomplete.map((reg) => {
 const isExpired = reg.stage === 'verification_expired'
 const isVerified = reg.stage === 'verified_pending_onboarding'
 const isPending = reg.stage === 'pending_verification'

 return (
 <tr key={reg.id} className="hover:bg-muted transition-colors group">
 {/* Prospective Owner */}
 <td className="py-3.5 px-4">
 <div className="flex items-center gap-3">
 <div className="h-9 w-9 rounded-xl bg-warning-surface border border-warning/30 text-warning flex items-center justify-center font-bold text-xs shrink-0">
 {reg.full_name ? reg.full_name.slice(0, 2).toUpperCase() : 'UR'}
 </div>
 <div className="min-w-0">
 <div className="font-bold text-foreground truncate">{reg.full_name || 'Anonymous Registrant'}</div>
 <div className="text-2xs text-muted-foreground tabular-nums flex items-center gap-1">
 <span>ID:</span>
 <span className="truncate max-w-28">{reg.id.slice(0, 12)}...</span>
 </div>
 </div>
 </div>
 </td>

 {/* Contact Details */}
 <td className="py-3.5 px-3">
 <div className="flex items-center gap-1.5">
 <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
 <a
 href={`mailto:${reg.email}?subject=${encodeURIComponent('Complete your InkFlow ERP Workspace Setup')}`}
 className="tabular-nums text-foreground hover:text-primary transition-colors truncate max-w-44"
 title="Click to send email"
 >
 {reg.email}
 </a>
 <button
 type="button"
 onClick={() => handleCopyText(reg.email, `email-${reg.id}`)}
 className="text-muted-foreground hover:text-muted-foreground ml-0.5"
 title="Copy Email"
 >
 {copiedField === `email-${reg.id}` ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
 </button>
 </div>
 {reg.phone ? (
 <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground tabular-nums text-2xs">
 <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
 <a href={`tel:${reg.phone}`} className="hover:text-primary transition-colors">
 {reg.phone}
 </a>
 <button
 type="button"
 onClick={() => handleCopyText(reg.phone!, `phone-${reg.id}`)}
 className="text-muted-foreground hover:text-muted-foreground ml-0.5"
 title="Copy Phone"
 >
 {copiedField === `phone-${reg.id}` ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
 </button>
 </div>
 ) : (
 <div className="text-2xs text-muted-foreground italic mt-0.5">No phone provided</div>
 )}
 </td>

 {/* Target Plan */}
 <td className="py-3.5 px-3">
 <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-2xs font-semibold bg-primary/10 border border-primary/20 text-primary capitalize">
 {reg.plan || 'trial'}
 </span>
 </td>

 {/* Registration Stage */}
 <td className="py-3.5 px-3">
 {isVerified ? (
 <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider bg-primary/10 border border-primary/20 text-primary">
 <MailCheck className="h-3 w-3 text-primary" />
 Verified • Onboarding Pending
 </span>
 ) : isExpired ? (
 <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider bg-destructive/10 border border-destructive/30 text-destructive">
 <Clock className="h-3 w-3 text-destructive" />
 OTP Expired
 </span>
 ) : (
 <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider bg-warning-surface border border-warning/30 text-warning">
 <Hourglass className="h-3 w-3 text-warning animate-pulse" />
 Pending Email OTP
 </span>
 )}
 </td>

 {/* Verification Telemetry */}
 <td className="py-3.5 px-3">
 <div className="text-2xs text-muted-foreground">
 {reg.is_email_confirmed ? (
 <span className="text-success font-semibold flex items-center gap-1">
 <CheckCircle2 className="h-3 w-3" /> Email Confirmed
 </span>
 ) : (
 <span className="text-warning">
 {reg.attempts || 0} / 5 OTP Attempts
 </span>
 )}
 </div>
 {reg.expires_at && !reg.is_email_confirmed && (
 <div className="text-2xs text-muted-foreground tabular-nums">
 Expires: {formatDate(reg.expires_at)}
 </div>
 )}
 </td>

 {/* Started At */}
 <td className="py-3.5 px-3 text-2xs text-muted-foreground whitespace-nowrap">
 {formatDate(reg.created_at)}
 </td>

 {/* Actions */}
 <td className="py-3.5 px-4 text-right">
 <div className="flex items-center justify-end gap-1.5">
 <Button
 size="sm"
 onClick={() => handleProvisionIncomplete(reg)}
 className="bg-primary hover:bg-primary text-primary-foreground font-semibold text-xs h-7 px-2.5 rounded-lg shadow-sm"
 title="Complete Tenant Provisioning on Behalf of User"
 >
 <Plus className="h-3.5 w-3.5 mr-1" />
 Provision
 </Button>

 <Button
 size="sm"
 variant="ghost"
 disabled={Boolean(resendingMap[reg.email])}
 onClick={() => handleResendIncompleteOtp(reg)}
 className="h-7 px-2 text-warning hover:text-warning hover:bg-warning-surface text-xs"
 title="Resend Verification OTP Email"
 >
 <RefreshCw className={`h-3.5 w-3.5 ${resendingMap[reg.email] ? 'animate-spin' : ''}`} />
 </Button>

 <Button
 size="sm"
 variant="ghost"
 onClick={() => setDeleteIncompleteTarget(reg)}
 className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
 title="Delete / Purge Incomplete Registration"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </Button>
 </div>
 </td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </div>
 </div>
 )}
 </div>
 ) : filteredCompanies.length === 0 ? (
 <Card className="bg-card border-border text-center py-16">
 <CardContent className="space-y-3">
 <Building2 className="h-12 w-12 text-muted-foreground mx-auto" />
 <div className="text-base font-bold text-foreground">{tBilingual('No clients found', 'কোনো ক্লায়েন্ট পাওয়া যায়নি')}</div>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 {search || statusFilter !== 'all' || planFilter !== 'all'
 ? 'No organizations match your current search or filter criteria.'
 : 'No tenant organizations have been provisioned yet.'}
 </p>
 <Button
 size="sm"
 onClick={() => setShowCreateModal(true)}
 className="bg-primary hover:bg-primary text-primary-foreground font-semibold text-xs h-8 mt-2"
 >
 <Plus className="h-3.5 w-3.5 mr-1" />
 Create First Tenant
 </Button>
 </CardContent>
 </Card>
 ) : (
 <div className="overflow-hidden rounded-2xl border border-border bg-card">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead className="bg-card text-2xs uppercase tracking-wider text-muted-foreground border-b border-border">
 <tr>
 <th className="py-3.5 px-4 font-bold">Business</th>
 <th className="py-3.5 px-3 font-bold">Plan &amp; Pricing</th>
 <th className="py-3.5 px-3 font-bold">Status</th>
 <th className="py-3.5 px-3 font-bold">Owner / Contact</th>
 <th className="py-3.5 px-3 font-bold">Usage</th>
 <th className="py-3.5 px-3 font-bold">Created</th>
 <th className="py-3.5 px-4 font-bold text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/60 text-muted-foreground">
 {filteredCompanies.map((c) => {
 const isSuspended = c.status === 'suspended'
 const isTrial = c.status === 'trial'

 return (
 <tr key={c.id} className="hover:bg-muted transition-colors group">
 {/* Business */}
 <td className="py-3.5 px-4">
 <div className="flex items-center gap-3">
 <div className="h-9 w-9 rounded-xl bg-primary/20 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
 {c.name.slice(0, 2).toUpperCase()}
 </div>
 <div className="min-w-0">
 <Link
 href={`/platform/tenants/${c.id}`}
 className="font-bold text-foreground hover:text-primary transition-colors truncate block"
 >
 {c.name}
 </Link>
 <span className="text-2xs text-muted-foreground tabular-nums">/{c.slug}</span>
 </div>
 </div>
 </td>

 {/* Plan & Pricing */}
 <td className="py-3.5 px-3">
 <div className="font-semibold text-foreground capitalize">{c.plan}</div>
 <div className="text-2xs text-muted-foreground">
 <CurrencyDisplay amount={c.monthly_fee || 0} />
 <span className="text-2xs text-muted-foreground">/mo</span>
 </div>
 </td>

 {/* Status */}
 <td className="py-3.5 px-3">
 <span
 className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider border ${
 c.status === 'active'
 ? 'bg-success-surface text-success border-success/30'
 : isTrial
 ? 'bg-primary/10 text-primary border-primary/20'
 : isSuspended
 ? 'bg-destructive/10 text-destructive border-destructive/30'
 : 'bg-muted text-muted-foreground border-border'
 }`}
 >
 <span
 className={`h-1.5 w-1.5 rounded-full ${
 c.status === 'active'
 ? 'bg-success'
 : isTrial
 ? 'bg-primary/10'
 : isSuspended
 ? 'bg-destructive/10'
 : 'bg-muted'
 }`}
 />
 {c.status}
 </span>
 </td>

 {/* Owner / Contact */}
 <td className="py-3.5 px-3">
 <div className="font-medium text-foreground truncate">{c.owner_name || 'Not set'}</div>
 <div className="text-2xs text-muted-foreground tabular-nums truncate">{c.owner_email || c.owner_phone || 'No contact'}</div>
 </td>

 {/* Usage */}
 <td className="py-3.5 px-3">
 <div className="text-2xs text-muted-foreground">
 {c.users_count || 0}/{c.users_limit || 5} Users
 </div>
 <div className="text-2xs text-muted-foreground tabular-nums">
 {c.branches_count || 1} Branch
 </div>
 </td>

 {/* Created */}
 <td className="py-3.5 px-3 text-2xs text-muted-foreground whitespace-nowrap">
 {formatDate(c.created_at || Date.now())}
 </td>

 {/* Actions */}
 <td className="py-3.5 px-4 text-right">
 <div className="flex items-center justify-end gap-1.5">
 <Link
 href={`/platform/tenants/${c.id}`}
 className="px-2.5 py-1 rounded-lg bg-muted hover:bg-muted text-muted-foreground hover:text-foreground font-medium text-xs transition-colors"
 >
 {tBilingual('View', 'দেখুন')}
 </Link>

 <Button
 size="sm"
 variant="ghost"
 onClick={() => {
 setPlanModalCompany(c)
 setTargetPlan(c.plan as PlatformPlanCode)
 setPlanReason('')
 }}
 className="h-7 px-2 text-primary hover:text-primary hover:bg-primary/90 text-xs"
 title={tBilingual('Change Plan', 'প্ল্যান বদলান')}
 >
 <CreditCard className="h-3.5 w-3.5" />
 </Button>

 <Button
 size="sm"
 variant="ghost"
 onClick={() => {
 setSupportModalCompany(c)
 setSupportReason('')
 }}
 className="h-7 px-2 text-warning hover:text-warning hover:bg-warning-surface text-xs"
 title={tBilingual('Open as Client', 'ক্লায়েন্ট হিসেবে খুলুন')}
 >
 <ShieldAlert className="h-3.5 w-3.5" />
 </Button>

 {isSuspended ? (
 <Button
 size="sm"
 variant="ghost"
 onClick={() => {
 setStatusModalCompany(c)
 setTargetStatus('active')
 setStatusReason('Tenant reactivated by Platform Administrator')
 }}
 className="h-7 px-2 text-success hover:text-success hover:bg-success-surface text-xs"
 title={tBilingual('Restart Client', 'ক্লায়েন্ট চালু করুন')}
 >
 <CheckCircle2 className="h-3.5 w-3.5 text-success" />
 </Button>
 ) : (
 <Button
 size="sm"
 variant="ghost"
 onClick={() => {
 setStatusModalCompany(c)
 setTargetStatus('suspended')
 setStatusReason('')
 }}
 className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
 title={tBilingual('Stop Client', 'ক্লায়েন্ট বন্ধ করুন')}
 >
 <Ban className="h-3.5 w-3.5" />
 </Button>
 )}

 <Button
 size="sm"
 variant="ghost"
 onClick={() => {
 setDeleteModalCompany(c)
 setDeleteReason('')
 setDeleteConfirmName('')
 setDeleteError(null)
 }}
 className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
 title={tBilingual('Delete Client', 'ক্লায়েন্ট মুছুন')}
 >
 <Trash2 className="h-3.5 w-3.5" />
 </Button>
 </div>
 </td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </div>
 </div>
 )}


 {/* 1. CREATE BUSINESS MODAL */}
 {showCreateModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-200 overflow-y-auto">
 <Card className="w-full max-w-2xl bg-card border-border text-foreground shadow-xs my-8 max-h-screen flex flex-col">
 <CardHeader className="border-b border-border pb-4 shrink-0">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/20 flex items-center justify-center text-primary">
 <Building2 className="h-5 w-5" />
 </div>
 <div>
 <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
 Provision New Tenant Organization
 </CardTitle>
 <CardDescription className="text-xs text-muted-foreground">
 Creates a dedicated PostgreSQL partitioned tenant workspace with roles, branches, and subscriptions.
 </CardDescription>
 </div>
 </div>
 <button
 type="button"
 onClick={() => setShowCreateModal(false)}
 className="text-muted-foreground hover:text-foreground p-1.5 rounded-xl hover:bg-muted transition-colors"
 >
 <X className="h-4 w-4" />
 </button>
 </div>
 </CardHeader>

 <form onSubmit={handleCreateBusiness} className="flex flex-col flex-1 overflow-hidden">
 <CardContent className="space-y-5 p-5 text-xs overflow-y-auto flex-1">
 {createError && (
 <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
 <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
 <span>{createError}</span>
 </div>
 )}

 {/* Workspace Live Endpoint Banner */}
 <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary">
 <div className="flex items-center gap-2">
 <Globe className="h-4 w-4 text-primary shrink-0" />
 <span className="text-muted-foreground text-xs">{tBilingual('Link:', 'লিংক:')}</span>
 <span className="tabular-nums text-foreground font-bold text-xs">
 /{provisionSlug || generateSlug(provisionName) || 'tenant-slug'}
 </span>
 </div>
 <span className="text-2xs font-semibold bg-primary/20 text-primary px-2 py-0.5 rounded-md">
 Multi-Tenant Path
 </span>
 </div>

 {/* Section: Organization Identity */}
 <div className="space-y-3">
 <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
 <Building2 className="h-3.5 w-3.5 text-primary" />
 {tBilingual('1. Shop Details', '১. দোকানের তথ্য')}
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="font-semibold text-muted-foreground">
 {tBilingual('Shop Name', 'দোকানের নাম')} <span className="text-destructive">*</span>
 </label>
 <Input
 required
 placeholder="e.g. Dhaka Offset Printers"
 value={provisionName}
 onChange={(e) => handleNameChange(e.target.value)}
 className="bg-card border-border text-foreground text-xs h-9"
 />
 </div>

 <div className="space-y-1">
 <div className="flex items-center justify-between">
 <label className="font-semibold text-muted-foreground">
 {tBilingual('Web Link', 'ওয়েব লিংক')} <span className="text-destructive">*</span>
 </label>
 {slugManuallyEdited && (
 <button
 type="button"
 onClick={() => {
 setSlugManuallyEdited(false)
 setProvisionSlug(generateSlug(provisionName))
 }}
 className="text-2xs text-primary hover:underline"
 >
 Reset to auto
 </button>
 )}
 </div>
 <Input
 required
 placeholder="dhaka-offset"
 value={provisionSlug}
 onChange={(e) => {
 setSlugManuallyEdited(true)
 setProvisionSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
 }}
 className="bg-card border-border text-foreground text-xs h-9 tabular-nums"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="font-semibold text-muted-foreground">{tBilingual('Bangla Name (Optional)', 'বাংলা নাম (ঐচ্ছিক)')}</label>
 <Input
 placeholder="যেমন: ঢাকা অফসেট প্রিন্টার্স"
 value={provisionNameBn}
 onChange={(e) => setProvisionNameBn(e.target.value)}
 className="bg-card border-border text-foreground text-xs h-9"
 />
 </div>

 <div className="space-y-1">
 <label className="font-semibold text-muted-foreground">{tBilingual('Business Type', 'ব্যবসার ধরন')}</label>
 <select
 value={provisionBusinessType}
 onChange={(e) => setProvisionBusinessType(e.target.value)}
 className="w-full h-9 px-3 rounded-xl bg-card border border-border text-xs text-foreground"
 >
 <option value="commercial_printing">Commercial Printing &amp; Offset</option>
 <option value="signage_flex">Outdoor Signage &amp; Flex Banner</option>
 <option value="digital_press">Digital Press &amp; Laser Print</option>
 <option value="packaging">Packaging &amp; Corrugated Box</option>
 <option value="garment_accessories">Garment Accessories &amp; Label</option>
 <option value="sublimation">Sublimation &amp; Promotional Gifts</option>
 <option value="publication">Newspaper &amp; Periodicals Publishing</option>
 </select>
 </div>
 </div>
 </div>

 {/* Section: Owner & Primary Administrator */}
 <div className="space-y-3 border-t border-border pt-4">
 <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
 <UserCheck className="h-3.5 w-3.5 text-primary" />
 {tBilingual('2. Owner Details', '২. মালিকের তথ্য')}
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="font-semibold text-muted-foreground">{tBilingual('Owner Name', 'মালিকের নাম')}</label>
 <Input
 placeholder="e.g. Al-Haj Rafiqul Islam"
 value={provisionOwnerName}
 onChange={(e) => setProvisionOwnerName(e.target.value)}
 className="bg-card border-border text-foreground text-xs h-9"
 />
 </div>

 <div className="space-y-1">
 <label className="font-semibold text-muted-foreground">{tBilingual('Owner Email', 'মালিকের ইমেইল')}</label>
 <Input
 type="email"
 placeholder="owner@dhakapress.com.bd"
 value={provisionOwnerEmail}
 onChange={(e) => setProvisionOwnerEmail(e.target.value)}
 className="bg-card border-border text-foreground text-xs h-9"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="font-semibold text-muted-foreground">{tBilingual('Phone Number', 'ফোন নম্বর')}</label>
 <Input
 placeholder="01711-000000"
 value={provisionOwnerPhone}
 onChange={(e) => setProvisionOwnerPhone(e.target.value)}
 className="bg-card border-border text-foreground text-xs h-9 tabular-nums"
 />
 </div>

 <div className="space-y-1">
 <div className="flex items-center justify-between">
 <label className="font-semibold text-muted-foreground">{tBilingual('Password', 'পাসওয়ার্ড')}</label>
 <button
 type="button"
 onClick={handleGeneratePassword}
 className="text-2xs text-primary hover:text-primary flex items-center gap-1 font-medium"
 >
 <Sparkles className="h-3 w-3" />
 Generate Strong
 </button>
 </div>
 <div className="relative">
 <Input
 type={showPassword ? 'text' : 'password'}
 value={provisionPassword}
 onChange={(e) => setProvisionPassword(e.target.value)}
 placeholder="Password"
 className="bg-card border-border text-foreground text-xs h-9 pr-8 tabular-nums"
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
 >
 {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
 </button>
 </div>
 </div>
 </div>
 </div>

 {/* Section: Location & Currency */}
 <div className="space-y-3 border-t border-border pt-4">
 <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
 <MapPin className="h-3.5 w-3.5 text-primary" />
 {tBilingual('3. Address', '৩. ঠিকানা')}
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div className="sm:col-span-2 space-y-1">
 <label className="font-semibold text-muted-foreground">{tBilingual('Shop Address', 'দোকানের ঠিকানা')}</label>
 <Input
 placeholder="e.g. 14 Arambagh, Motijheel, Dhaka-1000"
 value={provisionAddress}
 onChange={(e) => setProvisionAddress(e.target.value)}
 className="bg-card border-border text-foreground text-xs h-9"
 />
 </div>

 <div className="space-y-1">
 <label className="font-semibold text-muted-foreground">{tBilingual('Currency', 'কারেন্সি')}</label>
 <select
 value={provisionCurrency}
 onChange={(e) => setProvisionCurrency(e.target.value)}
 className="w-full h-9 px-3 rounded-xl bg-card border border-border text-xs text-foreground"
 >
 <option value="BDT">BDT (৳ Bangladesh Taka)</option>
 <option value="USD">USD ($ US Dollar)</option>
 <option value="EUR">EUR (€ Euro)</option>
 </select>
 </div>
 </div>
 </div>

 {/* Section: Subscription Plan Selection */}
 <div className="space-y-3 border-t border-border pt-4">
 <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
 <CreditCard className="h-3.5 w-3.5 text-primary" />
 {tBilingual('4. Choose Plan', '৪. প্ল্যান বাছুন')}
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
 {(() => {
 const trialPlan = plans.find((p) => p.code === 'trial')
 const trialDays = trialPlan?.trial_days || 14
 return (
 <div
 onClick={() => setProvisionPlan('trial')}
 className={`p-3 rounded-xl border cursor-pointer transition-all ${
 provisionPlan === 'trial'
 ? 'bg-primary/15 border-primary/20 ring-1 ring-primary'
 : 'bg-card border-border hover:border-border'
 }`}
 >
 <div className="flex items-center justify-between mb-1">
 <span className="font-bold text-foreground text-xs">Free Trial Evaluation</span>
 <span className="text-2xs font-semibold bg-success-surface text-success px-1.5 py-0.5 rounded">
 ৳0 • {trialDays} Days
 </span>
 </div>
 <p className="text-2xs text-muted-foreground">Full platform evaluation access for {trialDays} days without charge.</p>
 </div>
 )
 })()}

 <div
 onClick={() => setProvisionPlan('starter')}
 className={`p-3 rounded-xl border cursor-pointer transition-all ${
 provisionPlan === 'starter'
 ? 'bg-primary/15 border-primary/20 ring-1 ring-primary'
 : 'bg-card border-border hover:border-border'
 }`}
 >
 <div className="flex items-center justify-between mb-1">
 <span className="font-bold text-foreground text-xs">Starter Plan</span>
 <span className="text-2xs font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
 ৳1,999/mo
 </span>
 </div>
 <p className="text-2xs text-muted-foreground">Up to 3 Users • 1 Branch • Basic Quotations &amp; Billing.</p>
 </div>

 <div
 onClick={() => setProvisionPlan('business')}
 className={`p-3 rounded-xl border cursor-pointer transition-all ${
 provisionPlan === 'business'
 ? 'bg-primary/15 border-primary/20 ring-1 ring-primary'
 : 'bg-card border-border hover:border-border'
 }`}
 >
 <div className="flex items-center justify-between mb-1">
 <span className="font-bold text-foreground text-xs">Business Plan</span>
 <span className="text-2xs font-semibold bg-primary/20 text-primary px-1.5 py-0.5 rounded">
 ৳4,999/mo
 </span>
 </div>
 <p className="text-2xs text-muted-foreground">Up to 10 Users • 3 Branches • Inventory &amp; Production Kanban.</p>
 </div>

 <div
 onClick={() => setProvisionPlan('enterprise')}
 className={`p-3 rounded-xl border cursor-pointer transition-all ${
 provisionPlan === 'enterprise'
 ? 'bg-primary/15 border-primary/20 ring-1 ring-primary'
 : 'bg-card border-border hover:border-border'
 }`}
 >
 <div className="flex items-center justify-between mb-1">
 <span className="font-bold text-foreground text-xs">Enterprise Plan</span>
 <span className="text-2xs font-semibold bg-warning-surface text-warning px-1.5 py-0.5 rounded">
 ৳9,999/mo
 </span>
 </div>
 <p className="text-2xs text-muted-foreground">50+ Users • Unlimited Branches • Dedicated SLA &amp; Support.</p>
 </div>
 </div>
 </div>
 </CardContent>

 <div className="p-4 border-t border-border flex items-center justify-end gap-2.5 bg-card shrink-0">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setShowCreateModal(false)}
 className="text-xs border-border bg-card text-muted-foreground hover:bg-muted"
 >
 Cancel
 </Button>
 <Button
 type="submit"
 disabled={isCreatingBusiness}
 size="sm"
 className="bg-primary hover:bg-primary text-primary-foreground font-bold text-xs px-4"
 >
 {isCreatingBusiness ? (
 <>
 <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
 Provisioning Workspace...
 </>
 ) : (
 <>
 <Plus className="h-3.5 w-3.5 mr-1.5" />
 Provision Tenant Organization
 </>
 )}
 </Button>
 </div>
 </form>
 </Card>
 </div>
 )}

 {/* 1.1 POST-PROVISIONING CREDENTIALS SUMMARY MODAL */}
 {provisionedResult && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-200">
 <Card className="w-full max-w-lg bg-card border-success/30 text-foreground shadow-xs overflow-hidden">
 <div className="bg-success-surface border-b border-success/30 p-5 flex items-start gap-3">
 <div className="h-10 w-10 rounded-xl bg-success-surface border border-success/30 flex items-center justify-center text-success shrink-0">
 <CheckCircle2 className="h-6 w-6" />
 </div>
 <div className="flex-1 min-w-0">
 <h3 className="font-bold text-foreground text-base flex items-center gap-2">
 Tenant Workspace Provisioned!
 </h3>
 <p className="text-xs text-success/80 mt-0.5">
 The organization instance has been partitioned and initialized with administrative privileges.
 </p>
 </div>
 </div>

 <CardContent className="p-5 space-y-4 text-xs">
 {/* Org Details Card */}
 <div className="p-3 rounded-xl bg-card border border-border space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-muted-foreground">Organization:</span>
 <span className="font-bold text-foreground text-sm">{provisionedResult.credentials.businessName}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-muted-foreground">Subscription Tier:</span>
 <span className="font-semibold text-primary uppercase tracking-wider text-2xs">
 {provisionedResult.credentials.plan}
 </span>
 </div>
 </div>

 {/* Login Credentials Box */}
 <div className="p-3.5 rounded-xl bg-card border border-border space-y-3">
 <div className="font-bold text-muted-foreground text-xs flex items-center gap-1.5 border-b border-border pb-2">
 <Key className="h-3.5 w-3.5 text-primary" />
 {tBilingual('Login Details', 'লগইন তথ্য')}
 </div>

 <div className="space-y-2">
 <div>
 <div className="text-2xs text-muted-foreground mb-0.5">Direct Workspace URL</div>
 <div className="flex items-center justify-between bg-card border border-border rounded-lg px-2.5 py-1.5">
 <span className="tabular-nums text-foreground text-xs truncate">
 {provisionedResult.credentials.loginUrl}
 </span>
 <button
 type="button"
 onClick={() =>
 handleCopyText(
 `${window.location.origin}${provisionedResult.credentials.loginUrl}`,
 'url'
 )
 }
 className="text-muted-foreground hover:text-primary p-1 text-xs shrink-0"
 title="Copy Login URL"
 >
 {copiedField === 'url' ? (
 <Check className="h-3.5 w-3.5 text-success" />
 ) : (
 <Copy className="h-3.5 w-3.5" />
 )}
 </button>
 </div>
 </div>

 <div>
 <div className="text-2xs text-muted-foreground mb-0.5">Owner Email</div>
 <div className="flex items-center justify-between bg-card border border-border rounded-lg px-2.5 py-1.5">
 <span className="tabular-nums text-foreground text-xs truncate">
 {provisionedResult.credentials.email}
 </span>
 <button
 type="button"
 onClick={() => handleCopyText(provisionedResult.credentials.email, 'email')}
 className="text-muted-foreground hover:text-primary p-1 text-xs shrink-0"
 title="Copy Email"
 >
 {copiedField === 'email' ? (
 <Check className="h-3.5 w-3.5 text-success" />
 ) : (
 <Copy className="h-3.5 w-3.5" />
 )}
 </button>
 </div>
 </div>

 <div>
 <div className="text-2xs text-muted-foreground mb-0.5">Temporary Access Password</div>
 <div className="flex items-center justify-between bg-card border border-border rounded-lg px-2.5 py-1.5">
 <span className="tabular-nums text-success font-bold text-xs">
 {provisionedResult.credentials.password}
 </span>
 <button
 type="button"
 onClick={() => handleCopyText(provisionedResult.credentials.password, 'password')}
 className="text-muted-foreground hover:text-primary p-1 text-xs shrink-0"
 title="Copy Password"
 >
 {copiedField === 'password' ? (
 <Check className="h-3.5 w-3.5 text-success" />
 ) : (
 <Copy className="h-3.5 w-3.5" />
 )}
 </button>
 </div>
 </div>
 </div>
 </div>

 {/* One-Click Copy All */}
 <Button
 type="button"
 onClick={() => {
 const payload = `🚀 Welcome to InkFlow ERP!\n\nYour organization workspace is ready:\n🏢 Organization: ${provisionedResult.credentials.businessName}\n🌐 Login URL: ${window.location.origin}${provisionedResult.credentials.loginUrl}\n👤 Owner Email: ${provisionedResult.credentials.email}\n🔑 Password: ${provisionedResult.credentials.password}\n📦 Plan: ${provisionedResult.credentials.plan.toUpperCase()}\n\nPlease log in and update your password from your profile settings.`
 handleCopyText(payload, 'all')
 }}
 className="w-full bg-muted hover:bg-muted text-foreground hover:text-foreground font-medium text-xs h-9 border border-border rounded-xl"
 >
 {copiedField === 'all' ? (
 <>
 <Check className="h-3.5 w-3.5 text-success mr-1.5" />
 Onboarding Credentials Copied!
 </>
 ) : (
 <>
 <Copy className="h-3.5 w-3.5 text-primary mr-1.5" />
 {tBilingual('Copy Login Details', 'লগইন তথ্য কপি')}
 </>
 )}
 </Button>
 </CardContent>

 <div className="p-4 border-t border-border flex items-center justify-between gap-2 bg-card">
 <div className="flex items-center gap-2">
 <Link
 href={`/platform/tenants/${provisionedResult.company.id}`}
 className="px-3 py-1.5 rounded-xl bg-muted hover:bg-muted text-muted-foreground hover:text-foreground font-medium text-xs transition-colors"
 >
 View 360° Profile
 </Link>
 <Link
 href={provisionedResult.credentials.loginUrl}
 target="_blank"
 className="px-3 py-1.5 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary font-medium text-xs border border-primary/20 flex items-center gap-1 transition-colors"
 >
 <ExternalLink className="h-3.5 w-3.5" />
 Open Workspace
 </Link>
 </div>

 <Button
 type="button"
 size="sm"
 onClick={() => setProvisionedResult(null)}
 className="bg-success hover:bg-success text-foreground font-bold text-xs px-4"
 >
 Done
 </Button>
 </div>
 </Card>
 </div>
 )}

 {/* 2. CHANGE PLAN MODAL */}
 {planModalCompany && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-200">
 <Card className="w-full max-w-xl bg-card border-border text-foreground shadow-xs my-8 max-h-screen flex flex-col">
 <CardHeader className="border-b border-border pb-4 shrink-0">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/20 flex items-center justify-center text-primary">
 <CreditCard className="h-5 w-5" />
 </div>
 <div>
 <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
 Modify Subscription Plan
 </CardTitle>
 <CardDescription className="text-xs text-muted-foreground">
 Organization: <strong className="text-foreground">{planModalCompany.name}</strong> (/{planModalCompany.slug}) • Current Plan:{' '}
 <span className="font-bold text-primary capitalize">{planModalCompany.plan}</span>
 </CardDescription>
 </div>
 </div>
 <button
 type="button"
 onClick={() => setPlanModalCompany(null)}
 className="text-muted-foreground hover:text-foreground p-1.5 rounded-xl hover:bg-muted transition-colors"
 >
 <X className="h-4 w-4" />
 </button>
 </div>
 </CardHeader>

 <CardContent className="space-y-4 p-5 text-xs overflow-y-auto flex-1">
 <div className="space-y-2">
 <label className="font-semibold text-muted-foreground block">{tBilingual('Select Plan', 'প্ল্যান বাছুন')}</label>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
 {[
 {
 code: 'trial' as PlatformPlanCode,
 title: 'Free Trial',
 price: '৳0 / Free Trial',
 desc: 'Full evaluation access for testing and initial pilot setup.',
 },
 {
 code: 'starter' as PlatformPlanCode,
 title: 'Starter Tier',
 price: '৳1,999 / mo',
 desc: 'Up to 3 Users • 1 Branch • Basic Quotations & POS Invoices.',
 },
 {
 code: 'business' as PlatformPlanCode,
 title: 'Business Tier',
 price: '৳4,999 / mo',
 desc: 'Up to 10 Users • 3 Branches • Inventory & Production Kanban.',
 },
 {
 code: 'enterprise' as PlatformPlanCode,
 title: 'Enterprise Tier',
 price: '৳9,999 / mo',
 desc: '50+ Users • Unlimited Branches • Dedicated Support & Custom SLA.',
 },
 {
 code: 'growth' as PlatformPlanCode,
 title: 'Growth / Scale',
 price: '৳14,999 / mo',
 desc: 'High volume transactional quota • Advanced API integrations.',
 },
 ].map((p) => {
 const isSelected = targetPlan === p.code
 const isCurrent = planModalCompany.plan === p.code
 return (
 <div
 key={p.code}
 onClick={() => setTargetPlan(p.code)}
 className={`p-3 rounded-xl border cursor-pointer transition-all ${
 isSelected
 ? 'bg-primary/15 border-primary/20 ring-1 ring-primary'
 : 'bg-card border-border hover:border-border'
 }`}
 >
 <div className="flex items-center justify-between mb-1">
 <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
 {p.title}
 {isCurrent && (
 <span className="text-2xs bg-muted text-muted-foreground px-1.5 py-0.2 rounded font-normal">
 Current
 </span>
 )}
 </span>
 <span className="text-2xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
 {p.price}
 </span>
 </div>
 <p className="text-2xs text-muted-foreground">{p.desc}</p>
 </div>
 )
 })}
 </div>
 </div>

 <div className="space-y-1">
 <label className="font-semibold text-muted-foreground">
 {tBilingual('Reason', 'কারণ')} <span className="text-destructive">*</span>
 </label>
 <Input
 required
 placeholder="e.g. Upgraded to Business tier following verified payment confirmation..."
 value={planReason}
 onChange={(e) => setPlanReason(e.target.value)}
 className="bg-card border-border text-foreground text-xs h-9"
 />
 </div>
 </CardContent>

 <div className="p-4 border-t border-border flex items-center justify-end gap-2.5 bg-card shrink-0">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setPlanModalCompany(null)}
 className="text-xs border-border bg-card text-muted-foreground hover:bg-muted"
 >
 Cancel
 </Button>
 <Button
 type="button"
 disabled={isUpdatingPlan || !planReason.trim()}
 onClick={handleChangePlan}
 size="sm"
 className="bg-primary hover:bg-primary text-primary-foreground font-bold text-xs px-4"
 >
 {isUpdatingPlan ? (
 <>
 <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
 Updating Plan...
 </>
 ) : (
 tBilingual('Change Plan', 'প্ল্যান পরিবর্তন')
 )}
 </Button>
 </div>
 </Card>
 </div>
 )}

 {/* 3. SUSPEND / REACTIVATE MODAL */}
 {statusModalCompany && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
 <Card className="w-full max-w-md bg-card border-border text-foreground shadow-xs">
 <CardHeader className="border-b border-border pb-3">
 <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
 <Ban className="h-5 w-5 text-destructive" />
 {targetStatus === 'suspended' ? tBilingual('Stop Client', 'ক্লায়েন্ট বন্ধ করুন') : tBilingual('Restart Client', 'ক্লায়েন্ট চালু করুন')}
 </CardTitle>
 <CardDescription className="text-xs text-muted-foreground">
 Organization: <strong className="text-foreground">{statusModalCompany.name}</strong> (/{statusModalCompany.slug})
 </CardDescription>
 </CardHeader>

 <CardContent className="space-y-3 pt-4 text-xs">
 <div className="p-3 rounded-xl bg-warning-surface border border-warning/30 text-warning">
 {targetStatus === 'suspended'
 ? 'Suspending this tenant will block all member logins and API access immediately.'
 : 'Reactivating this tenant will restore operational access for all active organization users.'}
 </div>

 <div className="space-y-1">
 <label className="font-semibold text-muted-foreground">{tBilingual('Reason *', 'কারণ *')}</label>
 <Input
 required
 placeholder="e.g. Non-payment, Terms violation, Owner request..."
 value={statusReason}
 onChange={(e) => setStatusReason(e.target.value)}
 className="bg-card border-border text-foreground text-xs h-9"
 />
 </div>
 </CardContent>

 <div className="p-4 border-t border-border flex items-center justify-end gap-2 bg-card">
 <Button
 variant="outline"
 size="sm"
 onClick={() => setStatusModalCompany(null)}
 className="text-xs border-border bg-card text-muted-foreground"
 >
 Cancel
 </Button>
 <Button
 disabled={isUpdatingStatus || !statusReason.trim()}
 onClick={handleUpdateStatus}
 size="sm"
 className={
 targetStatus === 'suspended'
 ? 'bg-destructive hover:bg-destructive text-foreground font-bold text-xs'
 : 'bg-success hover:bg-success text-destructive-foreground font-bold text-xs'
 }
 >
 {isUpdatingStatus ? tBilingual('Saving...', 'সেভ হচ্ছে...') : targetStatus === 'suspended' ? tBilingual('Stop Client', 'বন্ধ করুন') : tBilingual('Restart Client', 'চালু করুন')}
 </Button>
 </div>
 </Card>
 </div>
 )}

 {/* 3. SUPPORT ACCESS MODAL */}
 {supportModalCompany && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
 <Card className="w-full max-w-md bg-card border-border text-foreground shadow-xs">
 <CardHeader className="border-b border-border pb-3">
 <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
 <ShieldAlert className="h-5 w-5 text-warning" />
 Initiate Time-Limited Support Session
 </CardTitle>
 <CardDescription className="text-xs text-muted-foreground">
 Target Organization: <strong className="text-foreground">{supportModalCompany.name}</strong>
 </CardDescription>
 </CardHeader>

 <CardContent className="space-y-3 pt-4 text-xs">
 <div className="p-3 rounded-xl bg-card border border-border text-muted-foreground space-y-1">
 <div className="font-semibold text-foreground">Zero Trust Protocol:</div>
 <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
 <li>Session expires automatically in 2 hours (TTL)</li>
 <li>Actions are recorded to immutable audit log</li>
 <li>A persistent banner is shown across tenant workspace</li>
 </ul>
 </div>

 <div className="space-y-1">
 <label className="font-semibold text-muted-foreground">{tBilingual('Reason *', 'কারণ *')}</label>
 <Input
 required
 placeholder="e.g. Investigating GST invoice printing layout issue #402"
 value={supportReason}
 onChange={(e) => setSupportReason(e.target.value)}
 className="bg-card border-border text-foreground text-xs h-9"
 />
 </div>
 </CardContent>

 <div className="p-4 border-t border-border flex items-center justify-end gap-2 bg-card">
 <Button
 variant="outline"
 size="sm"
 onClick={() => setSupportModalCompany(null)}
 className="text-xs border-border bg-card text-muted-foreground"
 >
 Cancel
 </Button>
 <Button
 disabled={isStartingSupport || !supportReason.trim()}
 onClick={handleStartSupport}
 size="sm"
 className="bg-warning hover:bg-warning text-foreground font-bold text-xs"
 >
 {isStartingSupport ? tBilingual('Opening...', 'খুলছে...') : tBilingual('Open as Client', 'হিসেবে খুলুন')}
 </Button>
 </div>
 </Card>
 </div>
 )}

 {/* 4. DELETE SINGLE TENANT MODAL */}
 {deleteModalCompany && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-200 overflow-y-auto">
 <Card className="w-full max-w-md bg-card border-destructive/30 text-foreground shadow-xs shadow-red-950/40 my-8">
 <CardHeader className="border-b border-border pb-3">
 <div className="flex items-center justify-between">
 <CardTitle className="text-base font-bold text-destructive flex items-center gap-2">
 <Trash2 className="h-5 w-5 text-destructive" />
 Delete Tenant Organization
 </CardTitle>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => {
 setDeleteModalCompany(null)
 setDeleteReason('')
 setDeleteConfirmName('')
 setDeleteError(null)
 }}
 className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
 >
 <X className="h-4 w-4" />
 </Button>
 </div>
 <CardDescription className="text-xs text-muted-foreground">
 Are you sure you want to permanently delete{' '}
 <strong className="text-foreground">{deleteModalCompany.name}</strong> (/{deleteModalCompany.slug})?
 </CardDescription>
 </CardHeader>

 <form
 onSubmit={(e) => {
 e.preventDefault()
 const isConfirmed = Boolean(
 deleteReason.trim() &&
 (
 deleteConfirmName.trim().toLowerCase() === deleteModalCompany.name.trim().toLowerCase() ||
 (deleteModalCompany.slug && deleteConfirmName.trim().toLowerCase() === deleteModalCompany.slug.trim().toLowerCase()) ||
 deleteConfirmName.trim().toUpperCase() === 'DELETE'
 )
 )
 if (isConfirmed && !isDeletingCompany) {
 handleDeleteCompany()
 }
 }}
 >
 <CardContent className="space-y-3.5 pt-4 text-xs">
 {deleteError && (
 <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive flex items-start gap-2">
 <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
 <div className="text-xs font-medium leading-relaxed">{deleteError}</div>
 </div>
 )}

 <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive space-y-2">
 <div className="font-semibold flex items-center gap-1.5 text-destructive">
 <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
 {tBilingual('Permanent Deletion', 'স্থায়ীভাবে মোছা')}
 </div>
 <p className="text-2xs text-destructive/90 leading-relaxed">
 This operation will physically wipe all records from PostgreSQL and purge all Supabase Storage files for this tenant:
 </p>
 <ul className="text-2xs text-destructive/80 space-y-0.5 list-disc pl-4">
 <li>Company details, branches, and member accounts</li>
 <li>Customer databases, contacts, and communication logs</li>
 <li>Invoices, payments, financial transactions, and cash book</li>
 <li>Products, pricing rules, inventory rolls, and materials</li>
 <li>Job orders, production schedules, tasks, and rework logs</li>
 <li>Storage attachments (artworks, proofs, challans, receipts)</li>
 </ul>
 </div>

 <div className="space-y-1.5">
 <label className="font-semibold text-muted-foreground flex items-center gap-1">
 <span>{tBilingual('Reason', 'কারণ')}</span>
 <span className="text-destructive">*</span>
 </label>
 <Input
 required
 placeholder="e.g. Account closed at owner request / Testing cleanup..."
 value={deleteReason}
 onChange={(e) => {
 setDeleteReason(e.target.value)
 if (deleteError) setDeleteError(null)
 }}
 className="bg-card border-border text-foreground text-xs h-9 focus-visible:ring-red-500"
 />
 <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
 <span className="text-2xs text-muted-foreground">Quick fill:</span>
 <button
 type="button"
 onClick={() => {
 setDeleteReason('Testing cleanup')
 if (deleteError) setDeleteError(null)
 }}
 className="px-1.5 py-0.5 rounded text-2xs bg-muted hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors"
 >
 Testing cleanup
 </button>
 <button
 type="button"
 onClick={() => {
 setDeleteReason('Account closed at owner request')
 if (deleteError) setDeleteError(null)
 }}
 className="px-1.5 py-0.5 rounded text-2xs bg-muted hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors"
 >
 Owner request
 </button>
 <button
 type="button"
 onClick={() => {
 setDeleteReason('Duplicate / abandoned registration')
 if (deleteError) setDeleteError(null)
 }}
 className="px-1.5 py-0.5 rounded text-2xs bg-muted hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors"
 >
 Duplicate
 </button>
 </div>
 </div>

 <div className="space-y-1.5">
 <label className="font-semibold text-muted-foreground flex items-center gap-1">
 <span>Type <strong className="text-destructive">{deleteModalCompany.name}</strong>, <strong className="text-destructive">{deleteModalCompany.slug}</strong>, or <strong className="text-destructive">DELETE</strong></span>
 <span className="text-destructive">*</span>
 </label>
 <Input
 required
 placeholder={`Type "${deleteModalCompany.name}", "${deleteModalCompany.slug}", or "DELETE"`}
 value={deleteConfirmName}
 onChange={(e) => {
 setDeleteConfirmName(e.target.value)
 if (deleteError) setDeleteError(null)
 }}
 className="bg-card border-border text-foreground text-xs h-9 focus-visible:ring-red-500 font-medium"
 />
 <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
 <span className="text-2xs text-muted-foreground">Quick fill:</span>
 <button
 type="button"
 onClick={() => {
 setDeleteConfirmName('DELETE')
 if (deleteError) setDeleteError(null)
 }}
 className="px-2 py-0.5 rounded text-2xs bg-destructive/10 hover:bg-destructive/90 text-destructive tabular-nums font-bold border border-destructive/30 transition-colors"
 >
 DELETE
 </button>
 <button
 type="button"
 onClick={() => {
 setDeleteConfirmName(deleteModalCompany.name)
 if (deleteError) setDeleteError(null)
 }}
 className="px-2 py-0.5 rounded text-2xs bg-muted hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors truncate max-w-36"
 title={deleteModalCompany.name}
 >
 {deleteModalCompany.name}
 </button>
 {deleteModalCompany.slug && (
 <button
 type="button"
 onClick={() => {
 setDeleteConfirmName(deleteModalCompany.slug)
 if (deleteError) setDeleteError(null)
 }}
 className="px-2 py-0.5 rounded text-2xs bg-muted hover:bg-muted text-muted-foreground hover:text-foreground border border-border tabular-nums transition-colors truncate max-w-28"
 title={deleteModalCompany.slug}
 >
 {deleteModalCompany.slug}
 </button>
 )}
 </div>
 </div>
 </CardContent>

 <div className="p-4 border-t border-border flex items-center justify-between gap-2 bg-card">
 <div className="text-2xs">
 {Boolean(
 deleteReason.trim() &&
 (
 deleteConfirmName.trim().toLowerCase() === deleteModalCompany.name.trim().toLowerCase() ||
 (deleteModalCompany.slug && deleteConfirmName.trim().toLowerCase() === deleteModalCompany.slug.trim().toLowerCase()) ||
 deleteConfirmName.trim().toUpperCase() === 'DELETE'
 )
 ) ? (
 <span className="text-success font-semibold flex items-center gap-1">
 <CheckCircle2 className="h-3.5 w-3.5" />
 Ready to delete
 </span>
 ) : !deleteReason.trim() ? (
 <span className="text-warning text-2xs">Reason required</span>
 ) : (
 <span className="text-muted-foreground text-2xs">Awaiting confirmation</span>
 )}
 </div>

 <div className="flex items-center gap-2">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => {
 setDeleteModalCompany(null)
 setDeleteReason('')
 setDeleteConfirmName('')
 setDeleteError(null)
 }}
 className="text-xs border-border bg-card text-muted-foreground"
 >
 Cancel
 </Button>
 <Button
 type="submit"
 disabled={
 isDeletingCompany ||
 !deleteReason.trim() ||
 (
 deleteConfirmName.trim().toLowerCase() !== deleteModalCompany.name.trim().toLowerCase() &&
 (!deleteModalCompany.slug || deleteConfirmName.trim().toLowerCase() !== deleteModalCompany.slug.trim().toLowerCase()) &&
 deleteConfirmName.trim().toUpperCase() !== 'DELETE'
 )
 }
 size="sm"
 className="bg-destructive hover:bg-destructive disabled:bg-destructive/10 disabled:text-muted-foreground disabled:cursor-not-allowed text-destructive-foreground font-bold text-xs"
 >
 {isDeletingCompany ? tBilingual('Deleting...', 'মুছে ফেলা হচ্ছে...') : tBilingual('Delete', 'মুছুন')}
 </Button>
 </div>
 </div>
 </form>
 </Card>
 </div>
 )}

 {/* 5. PURGE ALL TENANTS MODAL */}
 {showPurgeAllModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-200">
 <Card className="w-full max-w-lg bg-card border-destructive/30 text-foreground shadow-xs shadow-red-950/60">
 <CardHeader className="border-b border-border pb-3">
 <CardTitle className="text-base font-bold text-destructive flex items-center gap-2">
 <ShieldAlert className="h-5 w-5 text-destructive" />
 Purge All Tenants (Danger Zone)
 </CardTitle>
 <CardDescription className="text-xs text-muted-foreground">
 You are about to wipe all {companies.length} tenant organization(s) from the platform.
 </CardDescription>
 </CardHeader>

 <CardContent className="space-y-4 pt-4 text-xs">
 <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive space-y-2">
 <div className="font-bold text-sm text-destructive flex items-center gap-2">
 <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
 CRITICAL PLATFORM PURGE
 </div>
 <p className="text-xs text-destructive leading-relaxed">
 This administrative operation will wipe <strong>all registered businesses</strong>, branches,
 customer databases, job orders, and ledger transactions. Platform administrator accounts and system
 roles will be preserved.
 </p>
 </div>

 <div className="space-y-1">
 <label className="font-semibold text-muted-foreground">{tBilingual('Reason *', 'কারণ *')}</label>
 <Input
 required
 placeholder="e.g. System reset, Pre-production data cleanup..."
 value={purgeReason}
 onChange={(e) => setPurgeReason(e.target.value)}
 className="bg-card border-border text-foreground text-xs h-9"
 />
 </div>

 <div className="space-y-1">
 <label className="font-semibold text-muted-foreground">
 Type <span className="tabular-nums text-destructive font-bold">PURGE</span> to confirm:
 </label>
 <Input
 required
 placeholder="PURGE"
 value={purgeConfirmText}
 onChange={(e) => setPurgeConfirmText(e.target.value)}
 className="bg-card border-destructive/30 text-destructive tabular-nums font-bold text-xs h-9 placeholder:text-muted-foreground"
 />
 </div>
 </CardContent>

 <div className="p-4 border-t border-border flex items-center justify-end gap-2 bg-card">
 <Button
 variant="outline"
 size="sm"
 onClick={() => {
 setShowPurgeAllModal(false)
 setPurgeReason('')
 setPurgeConfirmText('')
 }}
 className="text-xs border-border bg-card text-muted-foreground"
 >
 Cancel
 </Button>
 <Button
 disabled={isPurgingAll || purgeConfirmText !== 'PURGE'}
 onClick={handlePurgeAllCompanies}
 size="sm"
 className="bg-destructive hover:bg-destructive disabled:bg-destructive/10 disabled:text-muted-foreground text-destructive-foreground font-bold text-xs"
 >
 {isPurgingAll ? tBilingual('Deleting...', 'মুছে ফেলা হচ্ছে...') : tBilingual('Delete All', 'সব মুছুন')}
 </Button>
 </div>
 </Card>
 </div>
 )}

 {/* 6. DELETE INCOMPLETE REGISTRATION MODAL */}
 {deleteIncompleteTarget && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-200">
 <Card className="w-full max-w-md bg-card border-warning/30 text-foreground shadow-xs shadow-xs">
 <CardHeader className="border-b border-border pb-3">
 <CardTitle className="text-base font-bold text-warning flex items-center gap-2">
 <Trash2 className="h-5 w-5 text-warning" />
 Purge Abandoned Registration
 </CardTitle>
 <CardDescription className="text-xs text-muted-foreground">
 Are you sure you want to remove the incomplete registration for{' '}
 <strong className="text-foreground">{deleteIncompleteTarget.email}</strong>?
 </CardDescription>
 </CardHeader>

 <CardContent className="space-y-3 pt-4 text-xs">
 <div className="p-3 rounded-xl bg-warning-surface border border-warning/30 text-warning space-y-1">
 <div className="font-semibold flex items-center gap-1.5 text-warning">
 <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
 Registration Purge
 </div>
 <p className="text-2xs text-warning/90 leading-relaxed">
 This will purge the pending verification OTP tokens and un-onboarded user profile for{' '}
 <span className="tabular-nums font-semibold">{deleteIncompleteTarget.email}</span>.
 The prospective user will need to register anew at /register if they wish to create a tenant later.
 </p>
 </div>

 <div className="p-3 rounded-xl bg-card border border-border text-muted-foreground space-y-1.5">
 <div className="flex justify-between">
 <span className="text-muted-foreground">Registrant:</span>
 <span className="font-semibold text-foreground">{deleteIncompleteTarget.full_name || 'Anonymous'}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-muted-foreground">Stage:</span>
 <span className="font-semibold text-warning capitalize">{deleteIncompleteTarget.stage.replace(/_/g, ' ')}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-muted-foreground">Target Plan:</span>
 <span className="font-semibold text-primary capitalize">{deleteIncompleteTarget.plan || 'trial'}</span>
 </div>
 </div>
 </CardContent>

 <div className="p-4 border-t border-border flex items-center justify-end gap-2 bg-card">
 <Button
 variant="outline"
 size="sm"
 onClick={() => setDeleteIncompleteTarget(null)}
 className="text-xs border-border bg-card text-muted-foreground"
 >
 Cancel
 </Button>
 <Button
 disabled={isDeletingIncomplete}
 onClick={handleDeleteIncomplete}
 size="sm"
 className="bg-warning hover:bg-warning text-foreground font-bold text-xs"
 >
 {isDeletingIncomplete ? tBilingual('Deleting...', 'মুছে ফেলা হচ্ছে...') : tBilingual('Delete', 'মুছুন')}
 </Button>
 </div>
 </Card>
 </div>
 )}
 </div>
 )
}
