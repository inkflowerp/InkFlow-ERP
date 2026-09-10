'use client'

import React, { useState } from 'react'
import {
  GitBranch,
  Plus,
  Building,
  Phone,
  MapPin,
  CheckCircle2,
  Check,
  Star,
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
import { Crown } from 'lucide-react'

interface BranchItem {
  id: string
  code: string
  name: string
  nameBn: string
  phone: string
  address: string
  isMain: boolean
  isActive: boolean
}

const INITIAL_BRANCHES: BranchItem[] = [
  {
    id: 'b-01',
    code: 'HQ-MTJ',
    name: 'Head Office & Commercial Counter',
    nameBn: 'মতিঝিল প্রধান কার্যালয় ও সেলস কাউন্টার',
    phone: '+880 1711-234567',
    address: '14/B Motijheel C/A, Dhaka-1000',
    isMain: true,
    isActive: true,
  },
  {
    id: 'b-02',
    code: 'PLT-FKP',
    name: 'Fakirapool Heavy Offset Plant',
    nameBn: 'ফকিরারপুল হেভি অফসেট কারখানা',
    phone: '+880 1711-889900',
    address: '88/1 Fakirapool Press Lane, Dhaka-1000',
    isMain: false,
    isActive: true,
  },
  {
    id: 'b-03',
    code: 'CTG-HUB',
    name: 'Chattogram Port Commercial Signage Hub',
    nameBn: 'চট্টগ্রাম কমার্শিয়াল সাইন হাব',
    phone: '+880 1819-334455',
    address: '112 Anderkilla, Kotwali, Chattogram-4000',
    isMain: false,
    isActive: true,
  },
]

import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

export default function BranchesSettingsPage() {
  const { locale, tBilingual } = useI18n()
  const { checkCanCreate, openLimitExceededModal, openUpgradeModal, currentPlan } = useSubscription()
  const [branches, setBranches] = useDataStore<BranchItem[]>(STORAGE_KEYS.BRANCHES, INITIAL_BRANCHES)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  const branchCheck = checkCanCreate('max_branches')

  const handleOpenAddBranch = () => {
    if (!branchCheck.allowed) {
      openLimitExceededModal('max_branches')
      return
    }
    setIsAddOpen(true)
  }

  // Form State
  const [newBranch, setNewBranch] = useState({
    code: '',
    name: '',
    nameBn: '',
    phone: '',
    address: '',
  })

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const handleMakeMain = (id: string) => {
    setBranches(
      branches.map((b) => ({ ...b, isMain: b.id === id }))
    )
    showNotification('Main headquarters branch updated.')
  }

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!branchCheck.allowed) {
      openLimitExceededModal('max_branches')
      return
    }
    const created: BranchItem = {
      id: `b-${Date.now()}`,
      code: newBranch.code.toUpperCase(),
      name: newBranch.name,
      nameBn: newBranch.nameBn,
      phone: newBranch.phone,
      address: newBranch.address,
      isMain: false,
      isActive: true,
    }
    setBranches([...branches, created])
    setIsAddOpen(false)
    setNewBranch({ code: '', name: '', nameBn: '', phone: '', address: '' })
    showNotification(`Branch '${created.name}' created successfully.`)
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
          <Button onClick={handleOpenAddBranch} className="bg-blue-600 hover:bg-blue-700 bangla-text">
            <Plus className="mr-1.5 h-4 w-4" />
            {tBilingual('Add New Branch', 'নতুন শাখা যোগ করুন')}
          </Button>
        }
      />

      <SettingsNav />

      {/* Branch Quota Alert */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-slate-50/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-600 text-white font-bold">
            <Building className="h-4 w-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white bangla-text">
              {tBilingual(
                `Branch Limit: ${branches.length} of ${currentPlan.max_branches} locations active`,
                `শাখা সীমা: ${currentPlan.max_branches} টির মধ্যে ${branches.length} টি শাখা সক্রিয়`
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

      <div className="space-y-4">
        {branches.map((branch) => (
          <Card key={branch.id} className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400">
                    {branch.code}
                  </span>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {branch.name}
                  </h3>
                  {branch.isMain && (
                    <Badge variant="default" className="text-[10px] bg-blue-600">
                      <Star className="h-3 w-3 mr-1 fill-white" />
                      Head Office
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-slate-500">{branch.nameBn}</div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {branch.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {branch.address}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!branch.isMain && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleMakeMain(branch.id)}
                  >
                    Set as Head Office
                  </Button>
                )}
                <Badge
                  variant="outline"
                  className="text-xs bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Operational
                </Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* MODAL: ADD BRANCH */}
      <ModalDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        title="Add Printing Branch or Factory Hub"
        description="Register a new showroom counter or production workshop location."
      >
        <form onSubmit={handleCreateBranch} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="branchCode" required>
                Branch Code
              </Label>
              <Input
                id="branchCode"
                placeholder="e.g. FCT-UTTR"
                value={newBranch.code}
                onChange={(e) => setNewBranch({ ...newBranch, code: e.target.value })}
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
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="branchName" required>
              Branch Name (English)
            </Label>
            <Input
              id="branchName"
              placeholder="e.g. Uttara Signage & Fast Print Hub"
              value={newBranch.name}
              onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="branchNameBn">
              শাখার নাম (বাংলা)
            </Label>
            <Input
              id="branchNameBn"
              placeholder="যেমন: উত্তরা সাইনেজ অ্যান্ড ফাস্ট প্রিন্ট হাব"
              value={newBranch.nameBn}
              onChange={(e) => setNewBranch({ ...newBranch, nameBn: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="branchAddress" required>
              Full Address
            </Label>
            <Input
              id="branchAddress"
              placeholder="Sector 3, Uttara, Dhaka-1230"
              value={newBranch.address}
              onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              Create Branch
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}
