'use client'

import React, { useState } from 'react'
import {
 Clock,
 Plus,
 Users,
 Check,
 AlertCircle,
 MoreVertical,
 Calendar,
 Building,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { ShiftRecord, EmployeeRecord } from '@/types/workforce.types'
import { useI18n } from '@/i18n/context'

export interface ShiftManagerProps {
 shifts: ShiftRecord[]
 employees: EmployeeRecord[]
 isLoading?: boolean
 tenantSlug: string
 onCreateShift: (data: Partial<ShiftRecord>) => Promise<void>
 onAssignEmployeeShift?: (employeeId: string, shiftId: string) => Promise<void>
}

export function ShiftManager({
 shifts,
 employees,
 isLoading = false,
 tenantSlug,
 onCreateShift,
 onAssignEmployeeShift,
}: ShiftManagerProps) {
  const { locale, tBilingual } = useI18n()
 const [modalOpen, setModalOpen] = useState(false)
 const [isSubmitting, setIsSubmitting] = useState(false)
 const [errorMsg, setErrorMsg] = useState<string | null>(null)

 const [shiftData, setShiftData] = useState<Partial<ShiftRecord>>({
 shift_name: '',
 shift_code: '',
 start_time: '09:00',
 end_time: '18:00',
 is_overnight: false,
 grace_period_minutes: 15,
 break_duration_minutes: 60,
 working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday'],
 is_active: true,
  })

 const handleCreate = async () => {
 setErrorMsg(null)
 if (!shiftData.shift_name?.trim()) {
 setErrorMsg('Shift name is required.')
 return
    }
 if (!shiftData.shift_code?.trim()) {
 setErrorMsg('Shift code is required.')
 return
    }

 setIsSubmitting(true)
 try {
 await onCreateShift(shiftData)
 setModalOpen(false)
 setShiftData({
 shift_name: '',
 shift_code: '',
 start_time: '09:00',
 end_time: '18:00',
 is_overnight: false,
 grace_period_minutes: 15,
 break_duration_minutes: 60,
 working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday'],
 is_active: true,
      })
    } catch (err: any) {
 setErrorMsg(err.message || 'Failed to create shift')
    } finally {
 setIsSubmitting(false)
    }
  }

 if (isLoading) {
 return (
      <Card className="bg-card border-border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl"/>
          ))}
        </div>
      </Card>
    )
  }

 return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">{tBilingual('Work Shifts & Timing Rules', 'কাজের শিফট ও সময়সীমা নিয়মাবলী')}</h3>
          <p className="text-xs text-muted-foreground">{tBilingual('Configure factory floor, design and administrative shifts', 'কারখানা ফ্লোর, ডিজাইন ও প্রশাসনিক কাজের শিফট নির্ধারণ করুন')}</p>
        </div>

        <Button
 size="sm"onClick={() => setModalOpen(true)}
 className="h-8 px-3 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground min-h-[32px]">
          <Plus className="w-3.5 h-3.5 mr-1"/>
          <span>{tBilingual('New Shift', 'নতুন শিফট')}</span>
        </Button>
      </div>

      {/* Shifts Grid */}
      {shifts.length === 0 ? (
        <Card className="bg-card border-border py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">{tBilingual('No custom shifts configured yet', 'এখনো কোনো কাস্টম শিফট নির্ধারণ করা হয়নি')}</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            {tBilingual('Standard 09:00 AM - 06:00 PM roster is currently used for all active staff.', 'সকল সক্রিয় কর্মীদের জন্য সাধারণ সকাল ০৯:০০ - সন্ধ্যা ০৬:০০ রোস্টার ব্যবহার করা হচ্ছে।')}
          </p>
          <Button
 size="sm"onClick={() => setModalOpen(true)}
 className="h-8 px-3.5 text-xs bg-blue-600 text-white">
 {tBilingual('Create First Shift', 'প্রথম শিফট তৈরি করুন')}
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map((shift) => (
            <Card
 key={shift.id}
 className="p-4 bg-card border-border shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">{shift.shift_name}</h4>
                    <span className="font-mono text-[11px] text-muted-foreground">{shift.shift_code}</span>
                  </div>
                  <Badge variant="outline"className="bg-muted text-muted-foreground text-[10px]">
                    {shift.is_overnight ? tBilingual('Overnight', 'নৈশ শিফট') : tBilingual('Day Shift', 'দিনের শিফট')}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{tBilingual('Timings:', 'সময়সীমা:')}</span>
                    <span className="font-mono font-medium text-foreground">
                      {shift.start_time} — {shift.end_time}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{tBilingual('Grace Period:', 'বিলম্ব মার্জিন:')}</span>
                    <span className="font-medium text-foreground">{shift.grace_period_minutes} {tBilingual('mins', 'মিনিট')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{tBilingual('Break:', 'বিরতি:')}</span>
                    <span className="font-medium text-foreground">{shift.break_duration_minutes} {tBilingual('mins', 'মিনিট')}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{tBilingual('Status:', 'অবস্থা:')} {shift.is_active ? tBilingual('Active', 'সক্রিয়') : tBilingual('Disabled', 'নিষ্ক্রিয়')}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New Shift Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md p-6 bg-card border-border shadow-xs rounded-xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">{tBilingual('Create Work Shift', 'নতুন কাজের শিফট তৈরি করুন')}</DialogTitle>
          </DialogHeader>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600"/>
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-3 text-xs">
            <div>
              <Label className="text-xs font-semibold text-foreground">{tBilingual('Shift Name *', 'শিফটের নাম *')}</Label>
              <Input
 placeholder="e.g. Morning Offset Shift"value={shiftData.shift_name || ''}
 onChange={(e) => setShiftData({ ...shiftData, shift_name: e.target.value })}
 className="h-8 text-xs mt-1"/>
            </div>

            <div>
              <Label className="text-xs font-semibold text-foreground">{tBilingual('Shift Code *', 'শিফট কোড *')}</Label>
              <Input
 placeholder="e.g. SHT-AM"value={shiftData.shift_code || ''}
 onChange={(e) => setShiftData({ ...shiftData, shift_code: e.target.value })}
 className="h-8 text-xs mt-1 font-mono"/>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-foreground">{tBilingual('Start Time', 'শুরুর সময়')}</Label>
                <Input
 type="time"value={shiftData.start_time || '09:00'}
 onChange={(e) => setShiftData({ ...shiftData, start_time: e.target.value })}
 className="h-8 text-xs mt-1"/>
              </div>
              <div>
                <Label className="text-xs font-semibold text-foreground">{tBilingual('End Time', 'শেষের সময়')}</Label>
                <Input
 type="time"value={shiftData.end_time || '18:00'}
 onChange={(e) => setShiftData({ ...shiftData, end_time: e.target.value })}
 className="h-8 text-xs mt-1"/>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-foreground">{tBilingual('Grace Period (Mins)', 'বিলম্ব মার্জিন (মিনিট)')}</Label>
                <Input
 type="number"value={shiftData.grace_period_minutes ?? 15}
 onChange={(e) => setShiftData({ ...shiftData, grace_period_minutes: parseInt(e.target.value) || 0 })}
 className="h-8 text-xs mt-1"/>
              </div>
              <div>
                <Label className="text-xs font-semibold text-foreground">{tBilingual('Break (Mins)', 'বিরতি (মিনিট)')}</Label>
                <Input
 type="number"value={shiftData.break_duration_minutes ?? 60}
 onChange={(e) => setShiftData({ ...shiftData, break_duration_minutes: parseInt(e.target.value) || 0 })}
 className="h-8 text-xs mt-1"/>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
 type="button"variant="outline"size="sm"onClick={() => setModalOpen(false)}
 className="h-8 text-xs border-border">
 {tBilingual('Cancel', 'বাতিল')}</Button>
            <Button
 type="button"size="sm"onClick={handleCreate}
 disabled={isSubmitting}
 className="h-8 px-4 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground min-h-[32px]">
              {isSubmitting ? tBilingual('Saving...', 'সংরক্ষণ হচ্ছে...') : tBilingual('Save Shift', 'শিফট সংরক্ষণ করুন')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
