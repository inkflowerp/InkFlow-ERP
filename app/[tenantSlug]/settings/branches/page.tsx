'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  GitBranch,
  Plus,
  Building,
  Phone,
  MapPin,
  CheckCircle2,
  Check,
  Star,
  Edit2,
  Power,
  Search,
  Crown,
  User,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useSubscription } from '@/hooks/use-subscription'
import { useI18n } from '@/i18n/context'
import { SettingsNav } from '@/components/settings/settings-nav'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { PageHeader } from '@/components/shared/page-header'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { toBengaliDigits } from '@/hooks/use-public-plans'
import {
  listBranchesAction,
  createBranchAction,
  updateBranchAction,
  setBranchStatusAction,
} from '@/actions/branch.actions'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'

interface BranchItem {
  id: string
  code: string
  name: string
  nameBn?: string | null
  phone?: string | null
  address?: string | null
  managerName?: string | null
  isMain: boolean
  isActive: boolean
}

const DEFAULT_MAIN_BRANCH: BranchItem[] = [
  {
    id: 'b-01',
    code: 'HQ-MAIN',
    name: 'Head Office & Main Facility',
    nameBn: 'প্রধান কার্যালয় ও কেন্দ্রীয় কারখানা',
    phone: '+880 1700-000000',
    address: 'Dhaka, Bangladesh',
    managerName: 'Operations Lead',
    isMain: true,
    isActive: true,
  },
]

export default function BranchesSettingsPage() {
  const { company, refreshTenant } = useTenant()
  const { locale, tBilingual } = useI18n()
  const [mounted, setMounted] = useState(false)
  const { checkCanCreate, openLimitExceededModal, openUpgradeModal, currentPlan, refreshUsage } = useSubscription()
  const [branches, setBranches] = useDataStore<BranchItem[]>(STORAGE_KEYS.BRANCHES, DEFAULT_MAIN_BRANCH)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<BranchItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const loadLiveBranches = useCallback(async () => {
    try {
      const res = await listBranchesAction({ includeInactive: true })
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        const mapped: BranchItem[] = res.data.map((b: any) => ({
          id: b.id,
          code: b.code || 'BR',
          name: b.name,
          nameBn: b.name_bn || b.name,
          phone: b.phone || b.contact_phone || '',
          address: b.full_address || b.address || '',
          managerName: b.manager_name || b.contact_person || '',
          isMain: !!b.is_main,
          isActive: b.status === 'active' || b.status === undefined || b.is_active !== false,
        }))
        setBranches(mapped)
      }
    } catch {
      // Fallback to existing store
    }
  }, [setBranches])

  useEffect(() => {
    loadLiveBranches()

    const handleSync = () => {
      loadLiveBranches()
    }
    window.addEventListener('printerp_table_synced:branches', handleSync)
    window.addEventListener('printerp_data_sync', handleSync)

    return () => {
      window.removeEventListener('printerp_table_synced:branches', handleSync)
      window.removeEventListener('printerp_data_sync', handleSync)
    }
  }, [loadLiveBranches, company?.id])

  const branchCheck = checkCanCreate('max_branches')

  const handleOpenAddBranch = () => {
    const check = checkCanCreate('max_branches')
    if (!check.allowed) {
      openLimitExceededModal('max_branches')
      return
    }
    setIsAddOpen(true)
  }

  // Form States
  const [newBranch, setNewBranch] = useState({
    code: '',
    name: '',
    nameBn: '',
    phone: '',
    address: '',
    managerName: '',
  })

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const broadcastSync = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('printerp_table_synced:branches'))
      window.dispatchEvent(new CustomEvent('printerp_data_sync'))
    }
  }

  const handleMakeMain = async (id: string) => {
    try {
      const res = await updateBranchAction(id, { is_main: true })
      if (res.success) {
        await loadLiveBranches()
        await refreshTenant()
        showNotification(tBilingual('Main headquarters branch updated.', 'প্রধান কার্যালয় শাখা সফলভাবে পরিবর্তন করা হয়েছে।'))
        broadcastSync()
      } else {
        setBranches(branches.map((b) => ({ ...b, isMain: b.id === id })))
        showNotification(tBilingual('Main headquarters branch updated.', 'প্রধান কার্যালয় শাখা আপডেট হয়েছে।'))
        broadcastSync()
      }
    } catch {
      setBranches(branches.map((b) => ({ ...b, isMain: b.id === id })))
      showNotification(tBilingual('Main headquarters branch updated.', 'প্রধান কার্যালয় শাখা আপডেট হয়েছে।'))
      broadcastSync()
    }
  }

  const handleToggleStatus = async (branch: BranchItem) => {
    if (branch.isMain) {
      showNotification(tBilingual('Primary Head Office branch cannot be deactivated.', 'প্রধান কার্যালয় নিষ্ক্রিয় করা যাবে না।'))
      return
    }
    const nextStatus = branch.isActive ? 'inactive' : 'active'
    try {
      const res = await setBranchStatusAction(branch.id, nextStatus)
      if (res.success) {
        await loadLiveBranches()
        showNotification(
          nextStatus === 'active'
            ? tBilingual(`Branch '${branch.name}' activated.`, `'${branch.name}' শাখা সক্রিয় করা হয়েছে।`)
            : tBilingual(`Branch '${branch.name}' deactivated.`, `'${branch.name}' শাখা নিষ্ক্রিয় করা হয়েছে।`)
        )
        broadcastSync()
      } else {
        setBranches(branches.map((b) => (b.id === branch.id ? { ...b, isActive: !branch.isActive } : b)))
        showNotification(tBilingual('Branch status toggled.', 'শাখার স্ট্যাটাস পরিবর্তন করা হয়েছে।'))
        broadcastSync()
      }
    } catch {
      setBranches(branches.map((b) => (b.id === branch.id ? { ...b, isActive: !branch.isActive } : b)))
      showNotification(tBilingual('Branch status toggled.', 'শাখার স্ট্যাটাস পরিবর্তন করা হয়েছে।'))
      broadcastSync()
    }
  }

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!branchCheck.allowed) {
      openLimitExceededModal('max_branches')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        code: newBranch.code.toUpperCase().trim(),
        name: newBranch.name.trim(),
        name_bn: newBranch.nameBn?.trim() || null,
        phone: newBranch.phone?.trim() || null,
        address: newBranch.address?.trim() || null,
        full_address: newBranch.address?.trim() || null,
        manager_name: newBranch.managerName?.trim() || null,
        contact_phone: newBranch.phone?.trim() || null,
        is_main: false,
      }

      const res = await createBranchAction(payload)
      if (res.success && res.data) {
        await loadLiveBranches()
        await refreshTenant()
        refreshUsage()
        setIsAddOpen(false)
        setNewBranch({ code: '', name: '', nameBn: '', phone: '', address: '', managerName: '' })
        showNotification(tBilingual(`Branch '${res.data.name}' created successfully.`, `'${res.data.name}' শাখা সফলভাবে যোগ করা হয়েছে।`))
        broadcastSync()
      } else {
        const created: BranchItem = {
          id: `b-${Date.now()}`,
          code: newBranch.code.toUpperCase().trim(),
          name: newBranch.name.trim(),
          nameBn: newBranch.nameBn?.trim() || newBranch.name.trim(),
          phone: newBranch.phone?.trim() || '',
          address: newBranch.address?.trim() || '',
          managerName: newBranch.managerName?.trim() || '',
          isMain: false,
          isActive: true,
        }
        setBranches([...branches, created])
        refreshUsage()
        setIsAddOpen(false)
        setNewBranch({ code: '', name: '', nameBn: '', phone: '', address: '', managerName: '' })
        showNotification(tBilingual(`Branch '${created.name}' created successfully.`, `'${created.name}' শাখা সফলভাবে যোগ করা হয়েছে।`))
        broadcastSync()
      }
    } catch (err: any) {
      showNotification(`Failed: ${err.message || 'Error creating branch'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenEdit = (branch: BranchItem) => {
    setEditingBranch({ ...branch })
    setIsEditOpen(true)
  }

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBranch) return

    setIsSubmitting(true)
    try {
      const payload = {
        code: editingBranch.code.toUpperCase().trim(),
        name: editingBranch.name.trim(),
        name_bn: editingBranch.nameBn?.trim() || null,
        phone: editingBranch.phone?.trim() || null,
        address: editingBranch.address?.trim() || null,
        full_address: editingBranch.address?.trim() || null,
        manager_name: editingBranch.managerName?.trim() || null,
        contact_phone: editingBranch.phone?.trim() || null,
      }

      const res = await updateBranchAction(editingBranch.id, payload)
      if (res.success) {
        await loadLiveBranches()
        await refreshTenant()
        setIsEditOpen(false)
        setEditingBranch(null)
        showNotification(tBilingual(`Branch '${editingBranch.name}' updated.`, `'${editingBranch.name}' শাখার তথ্য আপডেট হয়েছে।`))
        broadcastSync()
      } else {
        setBranches(branches.map((b) => (b.id === editingBranch.id ? { ...editingBranch } : b)))
        setIsEditOpen(false)
        setEditingBranch(null)
        showNotification(tBilingual(`Branch '${editingBranch.name}' updated.`, `'${editingBranch.name}' শাখার তথ্য আপডেট হয়েছে।`))
        broadcastSync()
      }
    } catch (err: any) {
      showNotification(`Failed: ${err.message || 'Error updating branch'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredBranches = branches.filter((b) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      b.name.toLowerCase().includes(q) ||
      (b.nameBn && b.nameBn.toLowerCase().includes(q)) ||
      b.code.toLowerCase().includes(q) ||
      (b.phone && b.phone.toLowerCase().includes(q)) ||
      (b.address && b.address.toLowerCase().includes(q)) ||
      (b.managerName && b.managerName.toLowerCase().includes(q))
    )
  })

  if (!mounted) {
    return (
      <div className="space-y-6 max-w-5xl animate-pulse">
        <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
        <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl w-3/4" />
        <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        titleEn="Branches, Factories & Hubs"
        titleBn="শাখা ও কারখানা ব্যবস্থাপনা"
        descriptionEn="Manage showroom sales counters, printing plants, and regional fabrication facilities."
        descriptionBn="শোরুম কাউন্টার, প্রিন্টিং কারখানা এবং আঞ্চলিক ফেব্রিকেশন সুবিধা পরিচালনা করুন।"
        icon={GitBranch}
        iconColor="text-blue-600"
        actions={
          <Button
            onClick={handleOpenAddBranch}
            title={!branchCheck.allowed ? branchCheck.reason : undefined}
            className="bg-blue-600 hover:bg-blue-700 bangla-text"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {tBilingual('Add New Branch', 'নতুন শাখা যোগ করুন')}
          </Button>
        }
      />

      <SettingsNav />

      {/* Branch Quota Alert */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-slate-50/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'p-1.5 rounded-lg text-white font-bold shrink-0',
            branchCheck.exceeded ? 'bg-red-500' : branchCheck.warning ? 'bg-amber-500' : 'bg-blue-600'
          )}>
            <Building className="h-4 w-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white bangla-text">
              {branchCheck.exceeded
                ? tBilingual(
                    `Plan Limit Reached: Your current plan allows up to ${currentPlan.max_branches} Branches quota (currently at ${branches.length}). Please upgrade your subscription to continue.`,
                    `প্ল্যান লিমিট পূর্ণ: আপনার বর্তমান প্ল্যানে সর্বোচ্চ ${toBengaliDigits(currentPlan.max_branches)} শাখা কোটা অনুমোদিত (বর্তমানে ${toBengaliDigits(branches.length)})। চালিয়ে যেতে অনুগ্রহ করে সাবস্ক্রিপশন আপগ্রেড করুন।`
                  )
                : tBilingual(
                    `Branch Limit: ${branches.length} of ${currentPlan.max_branches} locations active`,
                    `শাখা সীমা: ${toBengaliDigits(currentPlan.max_branches)} টির মধ্যে ${toBengaliDigits(branches.length)} টি শাখা সক্রিয়`
                  )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 bangla-text">
              {branchCheck.exceeded
                ? tBilingual('Branch limit reached. Upgrade to Enterprise to add multi-branch factory locations.', 'শাখার সর্বোচ্চ সীমা পূর্ণ হয়েছে। নতুন হাব/শাখা যোগ করতে প্ল্যান আপগ্রেড করুন।')
                : tBilingual(`Configured for ${currentPlan.name}.`, `${currentPlan.name_bn}-এ পরিচালিত।`)}
            </p>
          </div>
        </div>

        {currentPlan.code !== 'enterprise' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => openUpgradeModal('enterprise')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 bangla-text shrink-0"
          >
            <Crown className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
            {tBilingual('Expand Branch Limit', 'শাখা সীমা বৃদ্ধি')}
          </Button>
        )}
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Search Filter Bar */}
      {branches.length > 1 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder={tBilingual('Search branches by name, code, phone, or location...', 'শাখার নাম, কোড, ফোন বা ঠিকানা দিয়ে খুঁজুন...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl"
          />
        </div>
      )}

      {/* Branches List */}
      <div className="space-y-4">
        {filteredBranches.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            {tBilingual('No branches matching your search criteria.', 'কোন শাখা খুঁজে পাওয়া যায়নি।')}
          </div>
        ) : (
          filteredBranches.map((branch) => (
            <Card key={branch.id} className={cn('p-5 transition-all', !branch.isActive && 'opacity-65 bg-slate-50/40 dark:bg-slate-900/40')}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400">
                      {branch.code}
                    </span>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {branch.name}
                    </h3>
                    {branch.isMain && (
                      <Badge variant="default" className="text-[10px] bg-blue-600">
                        <Star className="h-3 w-3 mr-1 fill-white" />
                        {tBilingual('Head Office', 'প্রধান কার্যালয়')}
                      </Badge>
                    )}
                    {!branch.isActive && (
                      <Badge variant="outline" className="text-[10px] border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300">
                        {tBilingual('Inactive', 'নিষ্ক্রিয়')}
                      </Badge>
                    )}
                  </div>
                  {branch.nameBn && (
                    <div className="text-xs text-slate-500">{branch.nameBn}</div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400 pt-1">
                    {branch.phone && (
                      <a href={`tel:${branch.phone}`} className="flex items-center gap-1 hover:text-blue-600">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-mono">{branch.phone}</span>
                      </a>
                    )}
                    {branch.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span>{branch.address}</span>
                      </span>
                    )}
                    {branch.managerName && (
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>Manager: {branch.managerName}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 px-2.5 rounded-lg"
                    onClick={() => handleOpenEdit(branch)}
                    title="Edit Branch Information"
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-1 text-slate-500" />
                    {tBilingual('Edit', 'এডিট')}
                  </Button>

                  {!branch.isMain && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 px-2.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                        onClick={() => handleMakeMain(branch.id)}
                      >
                        {tBilingual('Set as Main', 'প্রধান করুন')}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          'text-xs h-8 px-2 rounded-lg',
                          branch.isActive ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                        )}
                        onClick={() => handleToggleStatus(branch)}
                        title={branch.isActive ? 'Deactivate Branch' : 'Activate Branch'}
                      >
                        <Power className="h-3.5 w-3.5 mr-1" />
                        {branch.isActive ? tBilingual('Deactivate', 'নিষ্ক্রিয়') : tBilingual('Activate', 'সক্রিয়')}
                      </Button>
                    </>
                  )}

                  {branch.isActive && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 py-1 sm:py-0.5 justify-center font-medium"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      {tBilingual('Operational', 'চলমান')}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* MODAL 1: ADD BRANCH */}
      <ModalDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        title={tBilingual('Add Printing Branch or Factory Hub', 'নতুন শাখা বা কারখানা যোগ করুন')}
        description={tBilingual('Register a new showroom counter or production workshop location.', 'নতুন শোরুম কাউন্টার বা প্রোডাকশন ওয়ার্কশপ নিবন্ধন করুন।')}
        hideFooter
      >
        <form onSubmit={handleCreateBranch} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="branchCode" required>
                Branch Code
              </Label>
              <Input
                id="branchCode"
                placeholder="e.g. TEJ-PLANT"
                value={newBranch.code}
                onChange={(e) => setNewBranch({ ...newBranch, code: e.target.value })}
                className="h-9 text-xs font-mono uppercase"
                required
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="branchPhone" required>
                Branch Contact Phone
              </Label>
              <Input
                id="branchPhone"
                placeholder="+880 1711-XXXXXX"
                value={newBranch.phone}
                onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="branchName" required>
                Branch Name (English)
              </Label>
              <Input
                id="branchName"
                placeholder="e.g. Tejgaon Industrial Offset Plant"
                value={newBranch.name}
                onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branchNameBn">
                শাখার নাম (বাংলা)
              </Label>
              <Input
                id="branchNameBn"
                placeholder="যেমন: তেজগাঁও অফসেট প্রিন্টিং কারখানা"
                value={newBranch.nameBn}
                onChange={(e) => setNewBranch({ ...newBranch, nameBn: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="branchManager">
                Manager / Contact Person
              </Label>
              <Input
                id="branchManager"
                placeholder="e.g. Md. Kabir Hossain"
                value={newBranch.managerName}
                onChange={(e) => setNewBranch({ ...newBranch, managerName: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branchAddress" required>
                Full Address
              </Label>
              <Input
                id="branchAddress"
                placeholder="Plot 42, Tejgaon I/A, Dhaka-1208"
                value={newBranch.address}
                onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="w-full sm:w-auto h-9 text-xs">
              {tBilingual('Cancel', 'বাতিল')}
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto h-9 text-xs font-semibold"
            >
              {tBilingual('Create Branch', 'শাখা তৈরি করুন')}
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL 2: EDIT BRANCH */}
      {editingBranch && (
        <ModalDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          title={tBilingual('Edit Branch Details', 'শাখার তথ্য পরিবর্তন')}
          description={tBilingual(`Update contact info and location for ${editingBranch.name}.`, `${editingBranch.name} এর যোগাযোগের তথ্য ও ঠিকানা পরিবর্তন করুন।`)}
          hideFooter
        >
          <form onSubmit={handleUpdateBranch} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="editCode" required>
                  Branch Code
                </Label>
                <Input
                  id="editCode"
                  value={editingBranch.code}
                  onChange={(e) => setEditingBranch({ ...editingBranch, code: e.target.value })}
                  className="h-9 text-xs font-mono uppercase"
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="editPhone">
                  Contact Phone
                </Label>
                <Input
                  id="editPhone"
                  value={editingBranch.phone || ''}
                  onChange={(e) => setEditingBranch({ ...editingBranch, phone: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="editName" required>
                  Branch Name (English)
                </Label>
                <Input
                  id="editName"
                  value={editingBranch.name}
                  onChange={(e) => setEditingBranch({ ...editingBranch, name: e.target.value })}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editNameBn">
                  নাম (বাংলা)
                </Label>
                <Input
                  id="editNameBn"
                  value={editingBranch.nameBn || ''}
                  onChange={(e) => setEditingBranch({ ...editingBranch, nameBn: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="editManager">
                  Manager / In-Charge
                </Label>
                <Input
                  id="editManager"
                  value={editingBranch.managerName || ''}
                  onChange={(e) => setEditingBranch({ ...editingBranch, managerName: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editAddress">
                  Address
                </Label>
                <Input
                  id="editAddress"
                  value={editingBranch.address || ''}
                  onChange={(e) => setEditingBranch({ ...editingBranch, address: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="w-full sm:w-auto h-9 text-xs">
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button
                type="submit"
                isLoading={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto h-9 text-xs font-semibold"
              >
                {tBilingual('Save Changes', 'সংরক্ষণ করুন')}
              </Button>
            </div>
          </form>
        </ModalDialog>
      )}
    </div>
  )
}
