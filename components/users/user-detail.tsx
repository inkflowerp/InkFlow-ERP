'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
 X,
 User,
 Shield,
 Briefcase,
 GitBranch,
 KeyRound,
 History,
 AlertTriangle,
 UserX,
 CheckCircle2,
 XCircle,
 HelpCircle,
 Lock,
 Mail,
 Phone,
 Calendar,
 Clock,
 Layers,
 Check,
 Edit2,
 Trash2,
 Sliders,
 Loader2,
 UserCheck,
} from 'lucide-react'
import { CompanyUserWithProfile, RoleRow, BranchRow } from '@/types/tenant.types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import {
 toggleUserStatusAction,
 resetUserAccessAction,
 removeLoginAction,
 unlinkEmployeeFromUserAction,
 getAccountHealthAction,
 getUserAuditActivityAction,
} from '@/actions/company-users.actions'
import { useToast } from '@/components/shared/toast-feedback'
import { useI18n } from '@/i18n/context'
import { ROLE_NAMES_BN } from './roles-matrix-tab'
import { formatDateTime } from '@/lib/formatters'
import { resolveUserRole } from './user-resolvers'

interface UserDetailProps {
 user: CompanyUserWithProfile | null
 isOpen: boolean
 onClose: () => void
 companyId: string
 tenantSlug: string
 onEditAccess: (user: CompanyUserWithProfile) => void
 onLinkEmployee: (user: CompanyUserWithProfile) => void
 onOpenAdvancedPermissions?: (user: CompanyUserWithProfile) => void
 onRefresh: () => void
}

type DetailTab = 'account' | 'access' | 'data' | 'branch' | 'security' | 'activity'

export function UserDetailDrawer({
 user,
 isOpen,
 onClose,
 companyId,
 tenantSlug,
 onEditAccess,
 onLinkEmployee,
 onOpenAdvancedPermissions,
 onRefresh,
}: UserDetailProps) {
 const { showToast } = useToast()
  const { locale, tBilingual } = useI18n()
  const isBn = locale === 'bn'
 const [activeTab, setActiveTab] = useState<DetailTab>('account')

  // Diagnostic health state
 const [healthData, setHealthData] = useState<any>(null)
 const [isLoadingHealth, setIsLoadingHealth] = useState(false)

  // Audit activity state
 const [activities, setActivities] = useState<any[]>([])
 const [isLoadingActivities, setIsLoadingActivities] = useState(false)

  // Confirmation dialogs
 const [isDisableConfirmOpen, setIsDisableConfirmOpen] = useState(false)
 const [isEnableConfirmOpen, setIsEnableConfirmOpen] = useState(false)
 const [isRemoveLoginConfirmOpen, setIsRemoveLoginConfirmOpen] = useState(false)
 const [isUnlinkConfirmOpen, setIsUnlinkConfirmOpen] = useState(false)
 const [isResetPasswordConfirmOpen, setIsResetPasswordConfirmOpen] = useState(false)

 const [actionLoading, setActionLoading] = useState(false)

  // Fetch health and activity when user opens
 useEffect(() => {
 if (isOpen && user) {
 setActiveTab('account')
 loadHealth()
 loadActivity()
    }
  }, [isOpen, user?.id])

 const loadHealth = async () => {
 if (!user) return
 setIsLoadingHealth(true)
 try {
 const res = await getAccountHealthAction(user.id, companyId)
 if (res && res.success) {
 setHealthData(res.data)
      }
    } catch {
      // Non-blocking
    } finally {
 setIsLoadingHealth(false)
    }
  }

 const loadActivity = async () => {
 if (!user) return
 setIsLoadingActivities(true)
 try {
 const logs = await getUserAuditActivityAction(user.id, companyId)
 setActivities(logs || [])
    } catch {
      // Non-blocking
    } finally {
 setIsLoadingActivities(false)
    }
  }

  // High-Risk Action Handlers
 const handleToggleStatus = async (newStatus: 'active' | 'disabled') => {
 if (!user) return
 setActionLoading(true)
 try {
 const res = await toggleUserStatusAction(user.id, newStatus, tenantSlug)
 if (res.success) {
 showToast({
 type: 'success',
 title: newStatus === 'active' ? 'Login Enabled' : 'Login Disabled',
 titleBn: newStatus === 'active' ? 'লগইন সক্রিয় করা হয়েছে' : 'লগইন নিষ্ক্রিয় করা হয়েছে',
 message: res.message || 'User status updated successfully.',
        })
 onRefresh()
      } else {
 showToast({
 type: 'error',
 title: 'Action Failed',
 titleBn: 'কার্য ব্যর্থ হয়েছে',
 message: res.message || 'Could not update user status.',
        })
      }
    } catch (err: any) {
 showToast({
 type: 'error',
 title: 'Error',
 titleBn: 'ত্রুটি',
 message: err.message || 'An unexpected error occurred',
      })
    } finally {
 setActionLoading(false)
 setIsDisableConfirmOpen(false)
 setIsEnableConfirmOpen(false)
    }
  }

 const handleResetPassword = async () => {
 const email = user?.profile?.email || user?.invited_email
 if (!email) return
 setActionLoading(true)
 try {
 const res = await resetUserAccessAction(email)
 if (res.success) {
 showToast({
 type: 'success',
 title: 'Password Reset Dispatched',
 titleBn: 'পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে',
 message: `A password reset link has been dispatched to ${email}.`,
        })
      } else {
 showToast({
 type: 'error',
 title: 'Reset Failed',
 titleBn: 'রিসেট ব্যর্থ হয়েছে',
 message: res.message || res.error || 'Failed to dispatch reset email.',
        })
      }
    } catch (err: any) {
 showToast({
 type: 'error',
 title: 'Error',
 titleBn: 'ত্রুটি',
 message: err.message || 'An unexpected error occurred',
      })
    } finally {
 setActionLoading(false)
 setIsResetPasswordConfirmOpen(false)
    }
  }

 const handleRemoveLogin = async () => {
 if (!user) return
 setActionLoading(true)
 try {
 const res = await removeLoginAction({
 companyUserId: user.id,
 companyId,
 tenantSlug,
      })
 if (res.success) {
 showToast({
 type: 'success',
 title: 'Login Removed',
 titleBn: 'লগইন মুছে ফেলা হয়েছে',
 message: 'Login relationship removed. Employee workforce records and history remain preserved.',
        })
 onRefresh()
 onClose()
      } else {
 showToast({
 type: 'error',
 title: 'Remove Failed',
 titleBn: 'ব্যর্থ হয়েছে',
 message: res.message || res.error || 'Failed to remove login.',
        })
      }
    } catch (err: any) {
 showToast({
 type: 'error',
 title: 'Error',
 titleBn: 'ত্রুটি',
 message: err.message || 'An unexpected error occurred',
      })
    } finally {
 setActionLoading(false)
 setIsRemoveLoginConfirmOpen(false)
    }
  }

 const handleUnlinkEmployee = async () => {
 if (!user) return
 setActionLoading(true)
 try {
 const res = await unlinkEmployeeFromUserAction({
 companyUserId: user.id,
 companyId,
 tenantSlug,
      })
 if (res.success) {
 showToast({
 type: 'success',
 title: 'Employee Unlinked',
 titleBn: 'কর্মী বিচ্ছিন্ন করা হয়েছে',
 message: 'Employee unlinked successfully. Workforce history preserved.',
        })
 onRefresh()
 loadHealth()
      } else {
 showToast({
 type: 'error',
 title: 'Unlink Failed',
 titleBn: 'ব্যর্থ হয়েছে',
 message: res.message || res.error || 'Failed to unlink employee.',
        })
      }
    } catch (err: any) {
 showToast({
 type: 'error',
 title: 'Error',
 titleBn: 'ত্রুটি',
 message: err.message || 'An unexpected error occurred',
      })
    } finally {
 setActionLoading(false)
 setIsUnlinkConfirmOpen(false)
    }
  }

 if (!isOpen || !user) return null

 const fullName = user.profile?.full_name || 'Team User'
 const email = user.profile?.email || user.invited_email || 'No email'
 const username = user.profile?.email ? user.profile.email.split('@')[0] : ''
 const phone = user.profile?.phone || ''
  const primaryRole = user.roles?.[0]
  const resolvedRole = resolveUserRole(user)
 const status = user.status
 const linkedEmployee = user.linked_employee

 const statusColor =
 status === 'active'
      ? 'bg-success'
      : status === 'invited'
      ? 'bg-warning'
      : 'bg-destructive'

 const statusText = isBn ? (status === 'active' ? 'সক্রিয়' : status === 'invited' ? 'আমন্ত্রিত' : 'নিষ্ক্রিয়') : (status === 'active' ? 'Active' : status === 'invited' ? 'Invited' : 'Disabled')

 return (
    <>
      {/* Backdrop */}
      <div
 className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40 transition-opacity"onClick={onClose}
 aria-hidden="true"/>

      {/* Drawer Container */}
      <aside
 className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-card shadow-lg border-l border-border flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"role="dialog"aria-modal="true"aria-label={`User Details: ${fullName}`}
      >
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-border flex items-start justify-between gap-3 bg-muted/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded-full bg-primary/10 bg-primary/40 text-primary text-primary font-bold text-lg flex items-center justify-center shrink-0 border border-primary/20 border-border">
              {fullName.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
                  {fullName}
                </h2>
                <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border border-border bg-card">
                  <span className={`h-1.5 w-1.5 rounded-full ${statusColor}`} />
                  <span>{statusText}</span>
                </span>
              </div>

              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs font-medium">
                  {isBn ? resolvedRole.nameBn : resolvedRole.name}
                </Badge>

                {linkedEmployee ? (
                  <span className="flex items-center gap-1 text-primary text-primary font-medium">
                    <UserCheck className="h-3 w-3"/>
                    <span>EMP: {linkedEmployee.employee_id_number || linkedEmployee.name}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">{tBilingual('Not Linked to Employee', 'কর্মী প্রোফাইল সংযুক্ত নেই')}</span>
                )}
              </div>
            </div>
          </div>

          <button
 type="button"onClick={onClose}
 className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"aria-label="Close user details">
            <X className="h-5 w-5"/>
          </button>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex border-b border-border px-4 overflow-x-auto gap-1 text-xs scrollbar-none">
          {[
            { id: 'account', label: tBilingual('Account', 'অ্যাকাউন্ট') },
            { id: 'access', label: tBilingual('Role & Duties', 'রোল ও দায়িত্ব') },
            { id: 'data', label: tBilingual('Data Scope', 'ডেটা স্কোপ') },
            { id: 'branch', label: tBilingual('Branches', 'শাখাসমূহ') },
            { id: 'security', label: tBilingual('Security', 'নিরাপত্তা') },
            { id: 'activity', label: tBilingual('Activity', 'অ্যাক্টিভিটি') },
          ].map((tab) => (
            <button
 key={tab.id}
 type="button"onClick={() => setActiveTab(tab.id as DetailTab)}
 className={`py-3 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
 activeTab === tab.id
                  ? 'border-border text-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: ACCOUNT */}
          {activeTab === 'account' && (
            <div className="space-y-5 text-sm">
              <div className="bg-muted border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
 Login Identity
                  </span>
                  <Badge variant="outline"className="text-xs font-mono">
 ID: {user.user_id?.slice(0, 8) || 'local'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Email Address</span>
                    <div className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground"/>
                      <span>{email}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Username</span>
                    <div className="font-semibold text-foreground mt-0.5">
                      {username ? `@${username}` : '—'}
                    </div>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Mobile Phone</span>
                    <div className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground"/>
                      <span>{phone || '—'}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <div className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                      <span className={`h-2 w-2 rounded-full ${statusColor}`} />
                      <span>{statusText}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Created At</span>
                    <div className="font-semibold text-foreground mt-0.5">
                      {formatDateTime(user.created_at)}
                    </div>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Last Login</span>
                    <div className="font-semibold text-foreground mt-0.5">
                      {user.last_login_at ? formatDateTime(user.last_login_at) : 'Never'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Linked Employee Card */}
              <div className="border border-border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
 Linked Workforce Profile
                  </span>
                  {linkedEmployee ? (
                    <Button
 variant="ghost"size="sm"onClick={() => setIsUnlinkConfirmOpen(true)}
 className="text-xs text-destructive hover:text-destructive h-6 px-2">
 Unlink
                    </Button>
                  ) : (
                    <Button
 variant="outline"size="sm"onClick={() => onLinkEmployee(user)}
 className="text-xs h-7 gap-1">
                      <UserCheck className="h-3.5 w-3.5"/>
                      <span>Link Employee</span>
                    </Button>
                  )}
                </div>

                {linkedEmployee ? (
                  <div className="p-3 bg-primary/10/50 bg-primary/10 border border-primary/20 border-border/40 rounded-lg text-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-foreground text-sm">
                        {linkedEmployee.name}
                      </div>
                      <div className="text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span>ID: {linkedEmployee.employee_id_number || 'EMP'}</span>
                        <span>•</span>
                        <span>{linkedEmployee.department || 'Operations'}</span>
                        {linkedEmployee.role && (
                          <>
                            <span>•</span>
                            <span>{linkedEmployee.role}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline"className="text-xs text-primary text-primary">
 Linked
                    </Badge>
                  </div>
                ) : (
                  <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground text-center">
 This login account is not currently linked to any employee record.
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
 variant="outline"size="sm"onClick={() => setIsResetPasswordConfirmOpen(true)}
 className="text-xs gap-1.5">
                  <KeyRound className="h-3.5 w-3.5"/>
                  <span>Reset Password</span>
                </Button>

                {status === 'active' ? (
                  <Button
 variant="outline"size="sm"onClick={() => setIsDisableConfirmOpen(true)}
 className="text-xs text-destructive hover:text-destructive hover:bg-danger-surface dark:hover:bg-danger-surface gap-1.5">
                    <UserX className="h-3.5 w-3.5"/>
                    <span>Disable Login</span>
                  </Button>
                ) : (
                  <Button
 variant="outline"size="sm"onClick={() => setIsEnableConfirmOpen(true)}
 className="text-xs text-success hover:text-success hover:bg-success-surface dark:hover:bg-success-surface gap-1.5">
                    <Check className="h-3.5 w-3.5"/>
                    <span>Enable Login</span>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ROLE & DUTIES */}
          {activeTab === 'access' && (
            <div className="space-y-5 text-sm">
              <div className="p-4 border border-border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">{tBilingual('Current Role', 'বর্তমান রোল')}</span>
                    <h3 className="font-bold text-foreground text-base mt-0.5">
                      {isBn ? resolvedRole.nameBn : resolvedRole.name}
                    </h3>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => onEditAccess(user)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5">
                    <Edit2 className="h-3.5 w-3.5"/>
                    <span>{tBilingual('Edit Access', 'অ্যাক্সেস সম্পাদনা')}</span>
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  {primaryRole?.description || (isBn ? 'স্ট্যান্ডার্ড প্রিন্টিং দায়িত্বসহ অপারেশনাল রোল টেমপ্লেট।' : 'Operational role template with standard printing responsibilities.')}
                </p>
              </div>

              {/* Responsibilities Cloud */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {tBilingual('Assigned Responsibilities', 'নির্ধারিত দায়িত্বসমূহ')} ({user.responsibilities?.length || 0})
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {(user.responsibilities || []).map((resp) => (
                    <Badge
                      key={resp}
                      variant="secondary"
                      className="px-2.5 py-1 text-xs font-medium bg-muted text-foreground">
                      {isBn ? (ROLE_NAMES_BN[resp] || resp) : resp}
                    </Badge>
                  ))}
                  {(!user.responsibilities || user.responsibilities.length === 0) && (
                    <span className="text-xs text-muted-foreground">{tBilingual('No responsibilities assigned', 'কোনো দায়িত্ব বরাদ্দ করা হয়নি')}</span>
                  )}
                </div>
              </div>

              {/* Advanced Overrides Trigger */}
              {onOpenAdvancedPermissions && (
                <div className="p-3 bg-muted border border-border rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-foreground">
 Granular Permission Overrides
                    </span>
                    <div className="text-muted-foreground text-xs mt-0.5">
 Explicit Allow/Deny controls for advanced administrators
                    </div>
                  </div>

                  <Button
 variant="outline"size="sm"onClick={() => onOpenAdvancedPermissions(user)}
 className="text-xs gap-1.5 h-8">
                    <Sliders className="h-3.5 w-3.5"/>
                    <span>Customize</span>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DATA SCOPE */}
          {activeTab === 'data' && (
            <div className="space-y-4 text-sm">
              <div className="p-4 border border-border rounded-lg space-y-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Operational Scope</span>
                <div className="font-bold text-foreground text-base">
                  {user.data_scopes?.orders === 'company'
                    ? 'Entire Company'
                    : user.data_scopes?.orders === 'branch'
                    ? 'Branch Wide'
                    : 'Assigned Work'}
                </div>
                <p className="text-xs text-muted-foreground">
 Determines which customer orders, jobs, and invoices this user can view within authorized modules.
                </p>
              </div>

              {user.data_scopes?.orders === 'company' && (
                <div className="p-3 bg-primary/10/70 bg-primary/10 border border-primary/20 border-border/40 rounded-lg text-xs text-primary text-primary flex items-start gap-2">
                  <Shield className="h-4 w-4 shrink-0 text-primary text-primary mt-0.5"/>
                  <div>
                    <strong>Company-Wide Visibility:</strong> This user may access records across all branches allowed by their role permissions.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BRANCH ACCESS */}
          {activeTab === 'branch' && (
            <div className="space-y-4 text-sm">
              <div className="p-4 border border-border rounded-lg space-y-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Primary Branch</span>
                <div className="font-bold text-foreground text-base">
                  {user.branch?.name || 'Head Office (Main)'}
                </div>
                <p className="text-xs text-muted-foreground">
 Default branch for orders, jobs, and inventory requisitions.
                </p>
              </div>

              {user.authorized_branch_ids && user.authorized_branch_ids.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
 Authorized Branch Access ({user.authorized_branch_ids.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {user.authorized_branch_ids.map((bId) => (
                      <Badge key={bId} variant="outline"className="text-xs">
                        {bId === user.branch_id ? `${user.branch?.name || bId} (Primary)` : bId}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SECURITY & DIAGNOSTICS */}
          {activeTab === 'security' && (
            <div className="space-y-5 text-sm">
              {/* Account Health Diagnostics (Prompt Sec 61) */}
              <div className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Account Health Diagnostic
                  </span>
                  {isLoadingHealth ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground"/>
                  ) : (
                    <span className="text-xs text-muted-foreground">Real-time check</span>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground">Auth Identity (auth.users)</span>
                    {healthData?.authOk ? (
                      <span className="text-success flex items-center gap-1 font-medium">
                        <Check className="h-3.5 w-3.5"/> Verified
                      </span>
                    ) : (
                      <span className="text-destructive flex items-center gap-1 font-medium">
                        <XCircle className="h-3.5 w-3.5"/> Missing
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground">Profile Record (user_profiles)</span>
                    {healthData?.profileOk ? (
                      <span className="text-success flex items-center gap-1 font-medium">
                        <Check className="h-3.5 w-3.5"/> Verified
                      </span>
                    ) : (
                      <span className="text-warning flex items-center gap-1 font-medium">
                        <AlertTriangle className="h-3.5 w-3.5"/> Incomplete
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground">Company Membership</span>
                    {healthData?.membershipOk ? (
                      <span className="text-success flex items-center gap-1 font-medium">
                        <Check className="h-3.5 w-3.5"/> Active
                      </span>
                    ) : (
                      <span className="text-muted-foreground font-medium">Inactive</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground">Workforce Link (employees)</span>
                    {healthData?.employeeOk ? (
                      <span className="text-success flex items-center gap-1 font-medium">
                        <Check className="h-3.5 w-3.5"/> Linked ({healthData.linkedEmployee?.employee_id_number || 'EMP'})
                      </span>
                    ) : (
                      <span className="text-warning text-warning flex items-center gap-1 font-medium">
                        <AlertTriangle className="h-3.5 w-3.5"/> Not Linked
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground">Role Assignment</span>
                    {healthData?.roleOk ? (
                      <span className="text-success flex items-center gap-1 font-medium">
                        <Check className="h-3.5 w-3.5"/> Assigned
                      </span>
                    ) : (
                      <span className="text-destructive flex items-center gap-1 font-medium">
                        <XCircle className="h-3.5 w-3.5"/> No Role
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground">Branch Allocation</span>
                    {healthData?.branchOk ? (
                      <span className="text-success flex items-center gap-1 font-medium">
                        <Check className="h-3.5 w-3.5"/> Configured
                      </span>
                    ) : (
                      <span className="text-warning flex items-center gap-1 font-medium">
                        <AlertTriangle className="h-3.5 w-3.5"/> Unassigned
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* High-Risk Actions (Prompt Sec 50-53) */}
              <div className="border border-danger-border border-danger-border/40 rounded-lg p-4 space-y-3 bg-danger-surface/20 bg-danger-surface/10">
                <span className="text-xs font-bold uppercase tracking-wider text-destructive text-destructive">
 High-Risk Management
                </span>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-foreground">
 Remove System Login
                      </div>
                      <div className="text-muted-foreground text-xs">
 Detaches login access. Employee records, attendance, and payroll are preserved.
                      </div>
                    </div>
                    <Button
 variant="outline"size="sm"onClick={() => setIsRemoveLoginConfirmOpen(true)}
 className="text-xs text-destructive border-danger-border hover:bg-danger-surface dark:hover:bg-danger-surface shrink-0">
 Remove Login
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: ACTIVITY TIMELINE */}
          {activeTab === 'activity' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground text-xs">
 Recent Access Events
                </span>
                {isLoadingActivities && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground"/>}
              </div>

              {activities.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground border border-border rounded-lg">
 No audit logs recorded for this user yet.
                </div>
              ) : (
                <div className="divide-y divide-border border border-border rounded-lg">
                  {activities.map((log) => (
                    <div key={log.id} className="p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">
                          {log.action || 'Access Updated'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(log.created_at)}
                        </span>
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {log.details?.message || log.description || `Performed by ${log.actor_name || 'Admin'}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* CONFIRMATION DIALOGS */}
      {/* 1. Disable Login */}
      <ConfirmDialog
 open={isDisableConfirmOpen}
 onOpenChange={setIsDisableConfirmOpen}
 onConfirm={() => handleToggleStatus('disabled')}
 title="Disable this user's login?"titleBn="এই ব্যবহারকারীর লগইন নিষ্ক্রিয় করবেন?"message="They will no longer be able to sign in or access PrintERP. All linked employee records, attendance, and payroll will remain intact."confirmText={tBilingual('Disable Login', 'লগইন নিষ্ক্রিয় করুন')} cancelText={tBilingual('Cancel', 'বাতিল')}isDestructive={true}
 isLoading={actionLoading}
      />

      {/* 2. Enable Login */}
      <ConfirmDialog
 open={isEnableConfirmOpen}
 onOpenChange={setIsEnableConfirmOpen}
 onConfirm={() => handleToggleStatus('active')}
 title="Enable this user's login?"titleBn="এই ব্যবহারকারীর লগইন সক্রিয় করবেন?"message="They will be granted sign-in access under their current role, responsibilities, and branch assignments."confirmText={tBilingual('Enable Login', 'লগইন সক্রিয় করুন')} cancelText={tBilingual('Cancel', 'বাতিল')}isDestructive={false}
 isLoading={actionLoading}
      />

      {/* 3. Reset Password */}
      <ConfirmDialog
 open={isResetPasswordConfirmOpen}
 onOpenChange={setIsResetPasswordConfirmOpen}
 onConfirm={handleResetPassword}
 title="Send Password Reset Email?"titleBn="পাসওয়ার্ড রিসেট ইমেইল পাঠাবেন?"message={`A secure recovery link will be dispatched to ${email}. They can click the link to configure a new password.`}
 confirmText={tBilingual('Send Reset Link', 'রিসেট লিংক পাঠান')} cancelText={tBilingual('Cancel', 'বাতিল')}isDestructive={false}
 isLoading={actionLoading}
      />

      {/* 4. Remove Login */}
      <ConfirmDialog
 open={isRemoveLoginConfirmOpen}
 onOpenChange={setIsRemoveLoginConfirmOpen}
 onConfirm={handleRemoveLogin}
 title="Remove system login?"titleBn="লগইন অ্যাকাউন্ট মুছে ফেলবেন?"message="This removes login credentials and system access. IMPORTANT: The linked employee profile, historical attendance, advances, and payroll sheets will NOT be deleted."confirmText={tBilingual('Remove Login', 'লগইন মুছুন')} cancelText={tBilingual('Cancel', 'বাতিল')}isDestructive={true}
 isLoading={actionLoading}
      />

      {/* 5. Unlink Employee */}
      <ConfirmDialog
 open={isUnlinkConfirmOpen}
 onOpenChange={setIsUnlinkConfirmOpen}
 onConfirm={handleUnlinkEmployee}
 title="Unlink employee profile?"titleBn="কর্মী প্রোফাইল বিচ্ছিন্ন করবেন?"message={`Disconnect ${linkedEmployee?.name || 'employee'} from this login account. Both the login account and employee record will remain, but separated.`}
 confirmText={tBilingual('Unlink', 'বিচ্ছিন্ন করুন')} cancelText={tBilingual('Cancel', 'বাতিল')}isDestructive={true}
 isLoading={actionLoading}
      />
    </>
  )
}
