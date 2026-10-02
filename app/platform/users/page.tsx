'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
 Users,
 Search,
 Building2,
 Shield,
 UserCheck,
 UserX,
 Clock,
 Filter,
 RefreshCw,
 Mail,
 Phone,
 ArrowUpRight,
 ExternalLink,
 ChevronLeft,
 ChevronRight,
 Check,
 Copy,
 Crown,
 Headphones,
 AlertTriangle,
 Lock,
 X,
 ShieldCheck,
 ShieldAlert,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDate } from '@/lib/formatters'
import { Badge } from '@/components/ui/badge'
import { getPlatformTenantUsersAction, getPlatformCompaniesAction } from '@/actions/platform-data.actions'
import {
 updateTenantUserStatusAction,
 startTenantSupportSessionAction,
} from '@/actions/platform.actions'
import { PlatformTenantUserItem, PlatformTenantCompany } from '@/types/platform.types'

export default function PlatformTenantUsersPage() {
 const [users, setUsers] = useState<PlatformTenantUserItem[]>([])
 const [totalCount, setTotalCount] = useState(0)
 const [page, setPage] = useState(1)
 const [pageSize] = useState(25)
 const [search, setSearch] = useState('')
 const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled' | 'suspended'>('all')
 const [companyFilter, setCompanyFilter] = useState<string>('all')
 const [companies, setCompanies] = useState<PlatformTenantCompany[]>([])
 const [loading, setLoading] = useState(true)

 // Status Modal State
 const [statusModalUser, setStatusModalUser] = useState<PlatformTenantUserItem | null>(null)
 const [targetStatus, setTargetStatus] = useState<'active' | 'disabled'>('disabled')
 const [statusReason, setStatusReason] = useState('')
 const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

 // Support Session Trigger State
 const [isStartingSupport, setIsStartingSupport] = useState(false)

 // Notification State
 const [notification, setNotification] = useState<string | null>(null)
 const [copiedField, setCopiedField] = useState<string | null>(null)

 const showNotification = (msg: string) => {
 setNotification(msg)
 setTimeout(() => setNotification(null), 3500)
 }

 const handleCopyText = (text: string, fieldKey: string) => {
 navigator.clipboard.writeText(text)
 setCopiedField(fieldKey)
 setTimeout(() => setCopiedField(null), 2500)
 }

 const loadData = async () => {
 setLoading(true)
 try {
 const [usersRes, compRes] = await Promise.all([
 getPlatformTenantUsersAction({
 search: search.trim() || undefined,
 companyId: companyFilter !== 'all' ? companyFilter : undefined,
 status: statusFilter !== 'all' ? statusFilter : undefined,
 page,
 pageSize,
 }),
 getPlatformCompaniesAction({ pageSize: 100 }),
 ])

 if (usersRes.success && usersRes.data) {
 setUsers(usersRes.data.users)
 setTotalCount(usersRes.data.total)
 }

 if (compRes.success && compRes.data) {
 const compList = Array.isArray(compRes.data) ? compRes.data : compRes.data?.companies || []
 setCompanies(compList)
 }
 } catch {
 // Ignore
 } finally {
 setLoading(false)
 }
 }

 useEffect(() => {
 loadData()
 }, [page, statusFilter, companyFilter])

 const handleOpenStatusModal = (user: PlatformTenantUserItem) => {
 setStatusModalUser(user)
 setTargetStatus(user.status === 'active' ? 'disabled' : 'active')
 setStatusReason('')
 }

 const handleConfirmStatusChange = async () => {
 if (!statusModalUser) return
 setIsUpdatingStatus(true)
 const res = await updateTenantUserStatusAction(statusModalUser.id, targetStatus, statusReason)
 if (res.success) {
 showNotification(`User "${statusModalUser.full_name}" status updated to ${targetStatus.toUpperCase()}.`)
 setStatusModalUser(null)
 setStatusReason('')
 loadData()
 } else {
 showNotification(res.error || 'Failed to update user status')
 }
 setIsUpdatingStatus(false)
 }

 const totalPages = Math.ceil(totalCount / pageSize) || 1

 const handleSearchSubmit = (e: React.FormEvent) => {
 e.preventDefault()
 setPage(1)
 loadData()
 }

 const handleStartSupport = async (companyId: string, companySlug: string, companyName: string) => {
 setIsStartingSupport(true)
 const res = await startTenantSupportSessionAction(
 companyId,
 companySlug,
 companyName,
 `Direct platform support initiated from Client Users for ${companyName}`,
 'full_support'
 )
 if (res.success && (res as any).redirectUrl) {
 showNotification(`Support session initialized for ${companyName}. Token active for 2 hours.`)
 window.open((res as any).redirectUrl, '_blank')
 } else if (!res.success) {
 showNotification(res.error || 'Failed to start support session')
 }
 setIsStartingSupport(false)
 }

 const getRoleBadge = (role: string) => {
 const r = (role || '').toLowerCase()
 if (r.includes('owner')) {
 return (
 <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-black uppercase tracking-wider bg-warning-surface border border-warning/30 text-warning">
 <Crown className="h-3 w-3 text-warning" />
 Owner
 </span>
 )
 }
 if (r.includes('admin')) {
 return (
 <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-primary/15 border border-primary/20 text-primary">
 <Shield className="h-3 w-3 text-primary" />
 Admin
 </span>
 )
 }
 if (r.includes('manager')) {
 return (
 <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-primary/10 border border-primary/20 text-primary">
 Manager
 </span>
 )
 }
 if (r.includes('operator')) {
 return (
 <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-success-surface border border-success/30 text-success">
 Operator
 </span>
 )
 }
 return (
 <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-muted border border-border text-muted-foreground capitalize">
 {role.replace(/_/g, ' ')}
 </span>
 )
 }

 return (
 <div className="space-y-6 max-w-7xl">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
 <div>
 <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
 <span className="h-2 w-2 rounded-full bg-primary/10" />
 All Users
 </div>
 <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
 <Users className="h-7 w-7 text-primary" />
 Tenant Users Directory
 </h1>
 <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
 List of all user accounts across client shops.
 </p>
 </div>

 <div className="flex items-center gap-2">
 <Link href="/platform/admins">
 <Button
 size="sm"
 variant="outline"
 className="h-9 text-xs border-primary/20 bg-primary/10 text-primary hover:bg-primary/90 hover:text-foreground cursor-pointer font-medium"
 >
 <Shield className="h-3.5 w-3.5 mr-1.5" />
 Manage Platform Admins
 </Button>
 </Link>
 <Button
 size="sm"
 variant="outline"
 onClick={() => loadData()}
 className="h-9 text-xs border-border bg-card text-foreground hover:bg-muted hover:text-foreground cursor-pointer"
 >
 <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
 Refresh
 </Button>
 </div>
 </div>

 {/* Notification */}
 {notification && (
 <div className="p-3 bg-success-surface border border-success/30 text-success rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in-0 shadow-lg">
 <Check className="h-4 w-4 text-success shrink-0" />
 <span>{notification}</span>
 </div>
 )}

 {/* Metrics Row */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <Card className="border-border bg-card p-4 shadow-sm">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Registered Users</span>
 <Users className="h-4 w-4 text-primary" />
 </div>
 <p className="text-2xl font-black text-foreground mt-2">{totalCount.toLocaleString()}</p>
 <p className="text-2xs text-muted-foreground mt-1 font-medium">Across all clients</p>
 </Card>

 <Card className="border-border bg-card p-4 shadow-sm">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Organizations</span>
 <Building2 className="h-4 w-4 text-success" />
 </div>
 <p className="text-2xl font-black text-foreground mt-2">{companies.length}</p>
 <p className="text-2xs text-muted-foreground mt-1 font-medium">Active client shops</p>
 </Card>

 <Card className="border-border bg-card p-4 shadow-sm">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Isolation Policy</span>
 <ShieldCheck className="h-4 w-4 text-primary" />
 </div>
 <p className="text-sm font-bold text-primary mt-2">Database RLS Enforced</p>
 <p className="text-2xs text-muted-foreground mt-1 font-medium">Accounts strictly protected</p>
 </Card>
 </div>

 {/* Filter & Search Bar */}
 <Card className="border-border bg-card p-4 shadow-sm">
 <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
 <div className="relative flex-1">
 <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder="Search user name, email, phone, role, or company..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pl-9 bg-card border-border text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50"
 />
 </div>

 <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
 <div className="flex items-center gap-2">
 <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
 <select
 value={companyFilter}
 onChange={(e) => {
 setCompanyFilter(e.target.value)
 setPage(1)
 }}
 className="bg-card border border-border text-xs text-foreground rounded-lg px-3 py-2 focus:outline-none focus:border-primary/20"
 >
 <option value="all">All Clients</option>
 {companies.map((c) => (
 <option key={c.id} value={c.id}>
 {c.name} ({c.slug})
 </option>
 ))}
 </select>
 </div>

 <div className="flex items-center gap-2">
 <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
 <select
 value={statusFilter}
 onChange={(e) => {
 setStatusFilter(e.target.value as any)
 setPage(1)
 }}
 className="bg-card border border-border text-xs text-foreground rounded-lg px-3 py-2 focus:outline-none focus:border-primary/20"
 >
 <option value="all">All Statuses</option>
 <option value="active">Active Only</option>
 <option value="disabled">Disabled Only</option>
 <option value="suspended">Suspended Only</option>
 </select>
 </div>

 <Button
 type="submit"
 size="sm"
 className="bg-primary hover:bg-primary text-primary-foreground text-xs h-9 px-4 cursor-pointer font-bold shadow-xs"
 >
 Search
 </Button>
 </div>
 </form>
 </Card>

 {/* Users Table */}
 <Card className="border-border bg-card overflow-hidden shadow-sm">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead className="bg-card text-foreground font-bold border-b border-border">
 <tr>
 <th className="py-3.5 px-4 font-bold text-foreground">User</th>
 <th className="py-3.5 px-4 font-bold text-foreground">Client Shop</th>
 <th className="py-3.5 px-4 font-bold text-foreground">Role</th>
 <th className="py-3.5 px-4 font-bold text-foreground">Status</th>
 <th className="py-3.5 px-4 font-bold text-foreground">Joined Date</th>
 <th className="py-3.5 px-4 font-bold text-foreground text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-700/80">
 {loading ? (
 <tr>
 <td colSpan={6} className="py-12 text-center text-muted-foreground">
 <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
 Loading users...
 </td>
 </tr>
 ) : users.length === 0 ? (
 <tr>
 <td colSpan={6} className="py-12 text-center text-muted-foreground">
 <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
 <p className="font-semibold text-foreground">No users found</p>
 <p className="text-2xs text-muted-foreground mt-1">Try refining your search or filter parameters.</p>
 </td>
 </tr>
 ) : (
 users.map((u) => (
 <tr key={u.id} className="hover:bg-muted transition-colors">
 {/* User */}
 <td className="py-3 px-4">
 <div className="flex items-center gap-3">
 <div className="h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center text-primary font-bold shrink-0">
 {u.full_name ? u.full_name[0].toUpperCase() : u.email[0].toUpperCase()}
 </div>
 <div>
 <div className="flex items-center gap-1.5">
 <p className="font-bold text-foreground text-xs">{u.full_name || 'Unnamed User'}</p>
 {u.full_name_bn && (
 <span className="text-2xs text-muted-foreground font-normal">({u.full_name_bn})</span>
 )}
 </div>
 <div className="flex items-center gap-2 text-2xs text-muted-foreground mt-0.5 font-medium">
 <span className="flex items-center gap-1">
 <Mail className="h-3 w-3 text-muted-foreground" />
 <span className="text-foreground">{u.email}</span>
 <button
 type="button"
 onClick={() => handleCopyText(u.email, `email-${u.id}`)}
 className="text-muted-foreground hover:text-foreground ml-0.5 cursor-pointer"
 title="Copy Email"
 >
 {copiedField === `email-${u.id}` ? (
 <Check className="h-2.5 w-2.5 text-success" />
 ) : (
 <Copy className="h-2.5 w-2.5" />
 )}
 </button>
 </span>
 {u.phone && (
 <span className="flex items-center gap-1">
 <Phone className="h-3 w-3 text-muted-foreground" />
 <span className="text-foreground">{u.phone}</span>
 <button
 type="button"
 onClick={() => handleCopyText(u.phone!, `phone-${u.id}`)}
 className="text-muted-foreground hover:text-foreground ml-0.5 cursor-pointer"
 title="Copy Phone"
 >
 {copiedField === `phone-${u.id}` ? (
 <Check className="h-2.5 w-2.5 text-success" />
 ) : (
 <Copy className="h-2.5 w-2.5" />
 )}
 </button>
 </span>
 )}
 </div>
 </div>
 </div>
 </td>

 {/* Company */}
 <td className="py-3 px-4">
 <Link
 href={`/platform/tenants/${u.company_id}`}
 className="inline-flex items-center gap-1.5 text-primary hover:text-primary font-medium group"
 >
 <Building2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
 <span>{u.company_name}</span>
 <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
 </Link>
 <p className="text-2xs text-muted-foreground mt-0.5 tabular-nums font-mono">/{u.company_slug}</p>
 </td>

 {/* Role */}
 <td className="py-3 px-4">
 {getRoleBadge(u.primary_role)}
 {u.branch_name && (
 <p className="text-2xs text-muted-foreground mt-0.5">Branch: {u.branch_name}</p>
 )}
 </td>

 {/* Status */}
 <td className="py-3 px-4">
 {u.status === 'active' ? (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-success-surface border border-success/30 text-success">
 <UserCheck className="h-3 w-3" />
 Active
 </span>
 ) : u.status === 'disabled' ? (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-destructive/10 border border-destructive/30 text-destructive">
 <UserX className="h-3 w-3" />
 Disabled
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-warning-surface border border-warning/30 text-warning">
 <Clock className="h-3 w-3" />
 {u.status}
 </span>
 )}
 </td>

 {/* Created */}
 <td className="py-3 px-4 text-muted-foreground font-medium text-2xs">
 {formatDate(u.created_at)}
 </td>

 {/* Actions */}
 <td className="py-3 px-4 text-right">
 <div className="flex items-center justify-end gap-1.5">
 <Button
 size="sm"
 variant="outline"
 onClick={() => handleOpenStatusModal(u)}
 className="h-7 text-2xs border-border bg-card hover:bg-muted text-foreground px-2 cursor-pointer font-medium"
 >
 {u.status === 'active' ? 'Disable' : 'Enable'}
 </Button>

 <Button
 size="sm"
 variant="outline"
 disabled={isStartingSupport}
 onClick={() => handleStartSupport(u.company_id, u.company_slug, u.company_name)}
 className="h-7 text-2xs border-primary/20 bg-primary/10 hover:bg-primary/90 text-primary px-2 cursor-pointer font-medium"
 title="Open as Client"
 >
 <Headphones className="h-3 w-3 mr-1" />
 Support
 </Button>

 <Link href={`/platform/tenants/${u.company_id}`}>
 <Button
 size="sm"
 variant="ghost"
 className="h-7 text-2xs text-primary hover:text-foreground hover:bg-muted px-2 cursor-pointer"
 >
 Tenant
 <ExternalLink className="h-3 w-3 ml-1" />
 </Button>
 </Link>
 </div>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>

 {/* Pagination */}
 {totalPages > 1 && (
 <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card text-xs text-muted-foreground font-medium">
 <div>
 Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} users
 </div>
 <div className="flex items-center gap-1">
 <Button
 size="sm"
 variant="outline"
 disabled={page <= 1 || loading}
 onClick={() => setPage((p) => Math.max(1, p - 1))}
 className="h-8 w-8 p-0 border-border bg-card text-foreground disabled:opacity-40 cursor-pointer"
 >
 <ChevronLeft className="h-4 w-4" />
 </Button>
 <span className="px-2 font-medium text-foreground">
 Page {page} of {totalPages}
 </span>
 <Button
 size="sm"
 variant="outline"
 disabled={page >= totalPages || loading}
 onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
 className="h-8 w-8 p-0 border-border bg-card text-foreground disabled:opacity-40 cursor-pointer"
 >
 <ChevronRight className="h-4 w-4" />
 </Button>
 </div>
 </div>
 )}
 </Card>

 {/* Status Toggle Modal */}
 {statusModalUser && (
 <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xs shadow-black/90 ring-1 ring-slate-700/60 relative animate-in fade-in-0 zoom-in-95">
 <div className="flex items-center justify-between border-b border-border pb-3">
 <div className="flex items-center gap-2">
 <AlertTriangle className={`h-5 w-5 ${targetStatus === 'disabled' ? 'text-destructive' : 'text-success'}`} />
 <h3 className="font-bold text-foreground text-base">
 {targetStatus === 'disabled' ? 'Stop User' : 'Activate User'}
 </h3>
 </div>
 <button
 onClick={() => setStatusModalUser(null)}
 className="text-muted-foreground hover:text-foreground cursor-pointer"
 >
 <X className="h-4 w-4" />
 </button>
 </div>

 <div className="space-y-3 text-xs text-foreground">
 <p>
 You are about to modify the membership status for user{' '}
 <strong className="text-foreground">{statusModalUser.full_name}</strong> ({statusModalUser.email}) in tenant{' '}
 <strong className="text-foreground">{statusModalUser.company_name}</strong>.
 </p>

 <div>
 <label className="block text-xs font-semibold text-foreground mb-1">Select Target Status</label>
 <select
 value={targetStatus}
 onChange={(e) => setTargetStatus(e.target.value as any)}
 className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground"
 >
 <option value="active">Active</option>
 <option value="disabled">Stopped</option>
 </select>
 </div>

 <div>
 <label className="block text-xs font-semibold text-foreground mb-1">Reason for Status Change</label>
 <Input
 value={statusReason}
 onChange={(e) => setStatusReason(e.target.value)}
 placeholder="e.g. Account locked by admin or requested by tenant owner"
 className="bg-card border-border text-xs text-foreground placeholder:text-muted-foreground"
 />
 </div>
 </div>

 <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
 <Button
 variant="outline"
 size="sm"
 onClick={() => setStatusModalUser(null)}
 className="border-border text-muted-foreground hover:text-foreground text-xs cursor-pointer"
 >
 Cancel
 </Button>
 <Button
 size="sm"
 disabled={isUpdatingStatus}
 onClick={handleConfirmStatusChange}
 className={`text-foreground text-xs font-bold cursor-pointer shadow-md ${
 targetStatus === 'disabled'
 ? 'bg-destructive hover:bg-destructive shadow-xs'
 : 'bg-success hover:bg-success shadow-xs'
 }`}
 >
 {isUpdatingStatus ? 'Updating...' : `Confirm ${targetStatus === 'disabled' ? 'Disable' : 'Enable'}`}
 </Button>
 </div>
 </div>
 </div>
 )}
 </div>
 )
}
