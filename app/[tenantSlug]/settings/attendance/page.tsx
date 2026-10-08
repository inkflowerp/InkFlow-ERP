'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { BRAND } from '@/config/brand'
import {
 QrCode,
 MapPin,
 Plus,
 RefreshCw,
 Printer,
 CheckCircle2,
 AlertTriangle,
 Trash2,
 Edit,
 Check,
 X,
 Compass,
 Building,
 Download,
 Search,
 Eye,
 Ban,
 ShieldCheck,
 Clock,
 Radio,
 Copy,
 Layers,
 Activity,
 Navigation,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { PageHeader } from '@/components/shared/page-header'
import { KpiCard, KpiGrid } from '@/components/shared/kpi-card'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { QRCodeSVG } from '@/components/attendance/qr-code-svg'
import { PrintableQrPoster } from '@/components/attendance/printable-qr-poster'
import {
 getAttendanceLocationsAction,
 createAttendanceLocationAction,
 updateAttendanceLocationAction,
 deleteAttendanceLocationAction,
 regenerateLocationQrAction,
 revokeLocationQrAction,
 getAttendanceCorrectionsAction,
 reviewAttendanceCorrectionAction,
 getAttendanceAuditLogsAction,
 getTenantBranchesForAttendanceAction,
} from '@/actions/attendance.actions'
import {
 AttendanceLocationRecord,
 AttendanceCorrectionRecord,
 AttendanceAuditLogRecord,
} from '@/types/attendance.types'

export default function AttendanceSettingsPage() {
 const params = useParams()
 const { company } = useTenant()
 const { locale, tBilingual } = useI18n()
 const tenantSlug = (params?.tenantSlug as string) || company?.slug || ''

 const [mounted, setMounted] = useState(false)
 const [activeTab, setActiveTab] = useState<'locations' | 'qr_management' | 'corrections' | 'audit'>('locations')
 const [locations, setLocations] = useState<AttendanceLocationRecord[]>([])
 const [branches, setBranches] = useState<Array<{ id: string; name: string; code: string; is_main?: boolean }>>([])
 const [corrections, setCorrections] = useState<AttendanceCorrectionRecord[]>([])
 const [auditLogs, setAuditLogs] = useState<AttendanceAuditLogRecord[]>([])
 const [isLoading, setIsLoading] = useState(true)

 useEffect(() => {
 setMounted(true)
  }, [])

  // Filters & Search
 const [searchTerm, setSearchTerm] = useState('')
 const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all')
 const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'disabled'>('all')
 const [correctionFilter, setCorrectionFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
 const [auditFilter, setAuditFilter] = useState<string>('all')

  // Modals
 const [isAddLocationOpen, setIsAddLocationOpen] = useState(false)
 const [isEditLocationOpen, setIsEditLocationOpen] = useState(false)
 const [isQrDetailOpen, setIsQrDetailOpen] = useState(false)
 const [selectedLocation, setSelectedLocation] = useState<AttendanceLocationRecord | null>(null)
 const [isPrintPosterOpen, setIsPrintPosterOpen] = useState(false)
 const [isRegenerateConfirmOpen, setIsRegenerateConfirmOpen] = useState(false)
 const [isRevokeConfirmOpen, setIsRevokeConfirmOpen] = useState(false)
 const [isDeleteLocationConfirmOpen, setIsDeleteLocationConfirmOpen] = useState(false)
 const [locationToDelete, setLocationToDelete] = useState<AttendanceLocationRecord | null>(null)
 const [isSubmitting, setIsSubmitting] = useState(false)
 const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Location Form State
 const [locName, setLocName] = useState('')
 const [locBranchId, setLocBranchId] = useState('')
 const [locAddress, setLocAddress] = useState('')
 const [locLat, setLocLat] = useState<number>(0)
 const [locLng, setLocLng] = useState<number>(0)
 const [locRadius, setLocRadius] = useState<number>(100)
 const [locMaxAccuracy, setLocMaxAccuracy] = useState<number>(100)
 const [locActive, setLocActive] = useState(true)
 const [isDetectingGps, setIsDetectingGps] = useState(false)
 const [gpsAccuracyCaptured, setGpsAccuracyCaptured] = useState<number | null>(null)

  // Review Correction State
 const [selectedCorrection, setSelectedCorrection] = useState<AttendanceCorrectionRecord | null>(null)
 const [reviewNotes, setReviewNotes] = useState('')
 const [copiedText, setCopiedText] = useState<string | null>(null)

 const showNotification = (type: 'success' | 'error', message: string) => {
 setNotification({ type, message })
 setTimeout(() => setNotification(null), 4000)
  }

 const handleCopy = (text: string, label: string) => {
 if (typeof navigator !== 'undefined' && navigator.clipboard) {
 navigator.clipboard.writeText(text)
 setCopiedText(label)
 showNotification('success', `${label} copied to clipboard!`)
 setTimeout(() => setCopiedText(null), 2500)
    }
  }

 const loadAllData = async () => {
 setIsLoading(true)
 try {
 const targetCompany = company?.id || (params?.tenantSlug as string) || company?.slug || ''
 const locRes = await getAttendanceLocationsAction(targetCompany)
 if (locRes.success && locRes.data) {
 setLocations(locRes.data)
      }

 if (targetCompany) {
 const branchRes = await getTenantBranchesForAttendanceAction(targetCompany)
 if (branchRes.success && branchRes.data) {
 setBranches(branchRes.data)
        }

 const corrRes = await getAttendanceCorrectionsAction(targetCompany)
 if (corrRes.success && corrRes.data) {
 setCorrections(corrRes.data)
        }

 const auditRes = await getAttendanceAuditLogsAction(targetCompany)
 if (auditRes.success && auditRes.data) {
 setAuditLogs(auditRes.data)
        }
      }
    } catch (e) {
 console.error(e)
    } finally {
 setIsLoading(false)
    }
  }

 useEffect(() => {
 loadAllData()
  }, [company?.id, params?.tenantSlug])

  // Detect GPS Coordinates via Browser
 const detectCurrentGps = () => {
 if (typeof navigator === 'undefined' || !navigator.geolocation) {
 showNotification('error', 'Geolocation is not supported by your browser.')
 return
    }

 setIsDetectingGps(true)
 navigator.geolocation.getCurrentPosition(
      (pos) => {
 setLocLat(Number(pos.coords.latitude.toFixed(6)))
 setLocLng(Number(pos.coords.longitude.toFixed(6)))
 const acc = Math.round(pos.coords.accuracy)
 setGpsAccuracyCaptured(acc)
 setLocMaxAccuracy(Math.max(50, Math.round(acc * 1.5)))
 setIsDetectingGps(false)
 showNotification('success', `GPS coordinates captured (Accuracy: ±${acc}m)`)
      },
      (err) => {
 setIsDetectingGps(false)
 showNotification('error', 'Failed to detect GPS: ' + err.message)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Handle Create Location
 const handleCreateLocation = async (e: React.FormEvent) => {
 e.preventDefault()
 const targetCompany = company?.id || (params?.tenantSlug as string) || company?.slug || ''
 if (!locName.trim() || !targetCompany) return

 if (!locLat || !locLng || isNaN(locLat) || isNaN(locLng) || locLat === 0 || locLng === 0) {
 showNotification('error', 'Please capture or enter valid GPS coordinates (Latitude & Longitude).')
 return
    }

 if (locLat < -90 || locLat > 90 || locLng < -180 || locLng > 180) {
 showNotification('error', 'Invalid GPS coordinates. Latitude must be -90 to +90, Longitude -180 to +180.')
 return
    }

 setIsSubmitting(true)
 try {
 const res = await createAttendanceLocationAction({
 company_id: targetCompany,
 branch_id: locBranchId.trim() ? locBranchId.trim() : undefined,
 name: locName.trim(),
 address: locAddress.trim() || null,
 latitude: locLat,
 longitude: locLng,
 radius_meters: locRadius,
 max_accuracy_meters: locMaxAccuracy,
 is_active: locActive,
      })

 if (res.success && res.data) {
 showNotification('success', `Location"${res.data.location.name}"created with active QR token.`)
 setIsAddLocationOpen(false)
 resetLocationForm()
 loadAllData()
      } else {
 showNotification('error', res.error || 'Failed to create location.')
      }
    } catch (err: any) {
 showNotification('error', err.message)
    } finally {
 setIsSubmitting(false)
    }
  }

  // Handle Update Location
 const handleUpdateLocation = async (e: React.FormEvent) => {
 e.preventDefault()
 const targetCompany = company?.id || (params?.tenantSlug as string) || company?.slug || ''
 if (!selectedLocation || !targetCompany) return

 setIsSubmitting(true)
 try {
 const res = await updateAttendanceLocationAction(
 selectedLocation.id,
        {
 name: locName.trim(),
 branch_id: locBranchId.trim() ? locBranchId.trim() : undefined,
 address: locAddress.trim() || null,
 latitude: locLat,
 longitude: locLng,
 radius_meters: locRadius,
 max_accuracy_meters: locMaxAccuracy,
 is_active: locActive,
        },
 targetCompany
      )

 if (res.success) {
 showNotification('success', 'Location updated successfully.')
 setIsEditLocationOpen(false)
 loadAllData()
      } else {
 showNotification('error', res.error || 'Failed to update location.')
      }
    } catch (err: any) {
 showNotification('error', err.message)
    } finally {
 setIsSubmitting(false)
    }
  }

  // Handle Delete Location Confirmation
 const openDeleteConfirm = (loc: AttendanceLocationRecord) => {
 setLocationToDelete(loc)
 setIsDeleteLocationConfirmOpen(true)
  }

 const handleConfirmDeleteLocation = async () => {
 const targetCompany = company?.id || (params?.tenantSlug as string) || company?.slug || ''
 if (!locationToDelete || !targetCompany) return

 setIsSubmitting(true)
 try {
 const res = await deleteAttendanceLocationAction(locationToDelete.id, targetCompany)
 if (res.success) {
 showNotification('success', `Location"${locationToDelete.name}"and QR terminal deleted.`)
 setIsDeleteLocationConfirmOpen(false)
 setLocationToDelete(null)
 setIsQrDetailOpen(false)
 loadAllData()
      } else {
 showNotification('error', res.error || 'Failed to delete location.')
      }
    } catch (err: any) {
 showNotification('error', err.message)
    } finally {
 setIsSubmitting(false)
    }
  }

  // Handle QR Regeneration
 const handleRegenerateQr = async () => {
 const targetCompany = company?.id || (params?.tenantSlug as string) || company?.slug || ''
 if (!selectedLocation || !targetCompany) return

 setIsSubmitting(true)
 try {
 const res = await regenerateLocationQrAction(selectedLocation.id, targetCompany)
 if (res.success && res.data) {
 showNotification('success', `New QR code generated! Previous QR code has been invalidated immediately.`)
 setIsRegenerateConfirmOpen(false)
 setIsQrDetailOpen(false)
 loadAllData()
      } else {
 showNotification('error', res.error || 'Failed to regenerate QR code.')
      }
    } catch (err: any) {
 showNotification('error', err.message)
    } finally {
 setIsSubmitting(false)
    }
  }

  // Handle QR Revocation
 const handleRevokeQr = async () => {
 const targetCompany = company?.id || (params?.tenantSlug as string) || company?.slug || ''
 if (!selectedLocation || !targetCompany) return

 setIsSubmitting(true)
 try {
 const res = await revokeLocationQrAction(selectedLocation.id, targetCompany)
 if (res.success) {
 showNotification('success', `QR code for"${selectedLocation.name}"has been revoked and deactivated.`)
 setIsRevokeConfirmOpen(false)
 setIsQrDetailOpen(false)
 loadAllData()
      } else {
 showNotification('error', res.error || 'Failed to revoke QR code.')
      }
    } catch (err: any) {
 showNotification('error', err.message)
    } finally {
 setIsSubmitting(false)
    }
  }

  // Direct Download QR as SVG
 const handleDownloadQrSvg = async (loc: AttendanceLocationRecord) => {
    try {
      const activeToken = loc.active_qr_token
      const qrPayload =
        activeToken?.qr_payload_url ||
        (activeToken?.raw_token ? `PRINTFLOW:ATT:v1:${activeToken.raw_token}` : null) ||
        `PRINTFLOW:ATT:LOC:${loc.id}`

      const QRCode = (await import('qrcode')).default
      const svgString = await QRCode.toString(qrPayload, {
        type: 'svg',
        margin: 2,
        errorCorrectionLevel: 'H',
      })

      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${loc.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-qr.svg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      showNotification('success', `Vector QR downloaded: ${link.download}`)
    } catch (e: any) {
      showNotification('error', 'Download failed: ' + e?.message)
    }
  }

  // Handle Review Correction
 const handleReviewCorrection = async (status: 'approved' | 'rejected') => {
 const targetCompany = company?.id || (params?.tenantSlug as string) || company?.slug || ''
 if (!selectedCorrection || !targetCompany) return

 setIsSubmitting(true)
 try {
 const res = await reviewAttendanceCorrectionAction({
 id: selectedCorrection.id,
 status,
 reviewNotes,
 companyId: targetCompany,
      })

 if (res.success) {
 showNotification('success', `Correction request ${status}.`)
 setSelectedCorrection(null)
 setReviewNotes('')
 loadAllData()
      } else {
 showNotification('error', res.error || 'Failed to review correction.')
      }
    } catch (err: any) {
 showNotification('error', err.message)
    } finally {
 setIsSubmitting(false)
    }
  }

 const resetLocationForm = () => {
 setLocName('')
 setLocBranchId('')
 setLocAddress('')
 setLocLat(0)
 setLocLng(0)
 setLocRadius(100)
 setLocMaxAccuracy(100)
 setLocActive(true)
 setGpsAccuracyCaptured(null)
  }

 const openEditModal = (loc: AttendanceLocationRecord) => {
 setSelectedLocation(loc)
 setLocName(loc.name)
 setLocBranchId(loc.branch_id || '')
 setLocAddress(loc.address || '')
 setLocLat(loc.latitude)
 setLocLng(loc.longitude)
 setLocRadius(loc.radius_meters)
 setLocMaxAccuracy(loc.max_accuracy_meters)
 setLocActive(loc.is_active)
 setGpsAccuracyCaptured(null)
 setIsEditLocationOpen(true)
  }

 const openQrDetailModal = (loc: AttendanceLocationRecord) => {
 setSelectedLocation(loc)
 setIsQrDetailOpen(true)
  }

  // Filtered Locations
 const filteredLocations = locations.filter((loc) => {
 const matchesSearch =
 loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (loc.address && loc.address.toLowerCase().includes(searchTerm.toLowerCase()))
 const matchesBranch = selectedBranchFilter === 'all' || loc.branch_id === selectedBranchFilter
 const matchesStatus =
 selectedStatusFilter === 'all' ||
      (selectedStatusFilter === 'active' && loc.is_active) ||
      (selectedStatusFilter === 'disabled' && !loc.is_active)

 return matchesSearch && matchesBranch && matchesStatus
  })

  // Filtered Corrections
 const filteredCorrections = corrections.filter((c) => {
 if (correctionFilter === 'all') return true
 return c.status === correctionFilter
  })

  // Filtered Audit Logs
 const filteredAuditLogs = auditLogs.filter((log) => {
 if (auditFilter === 'all') return true
 return log.action_type.toLowerCase().includes(auditFilter.toLowerCase())
  })

  // Quick Stats
 const activeLocationsCount = locations.filter((l) => l.is_active).length
 const activeQrCount = locations.filter((l) => l.active_qr_token && l.active_qr_token.is_active).length
 const pendingCorrectionsCount = corrections.filter((c) => c.status === 'pending').length

 if (!mounted) {
 return (
      <div className="mx-auto space-y-6 pb-20 px-4 sm:px-0 animate-pulse">
        <div className="h-20 bg-muted rounded-xl w-full"/>
        <div className="h-12 bg-muted rounded-xl w-3/4"/>
        <div className="h-64 bg-muted rounded-xl w-full"/>
      </div>
    )
  }

 return (
    <div className="mx-auto space-y-6 pb-20 px-4 sm:px-0">
      {/* Page Header */}
      <PageHeader
 titleEn="Attendance Setup"titleBn="কর্মস্থল লোকেশন ও কিউআর ব্যবস্থাপনা"descriptionEn="Configure physical workplace GPS boundaries, generate rotatable cryptographic QR tokens, and print on-site entrance posters."descriptionBn="কর্মস্থলের জিপিএস সীমানা নির্ধারণ করুন, কিউআর কোড তৈরি ও রোটেট করুন এবং অন-সাইট পোস্টার প্রিন্ট করুন।"icon={QrCode}
 iconColor="text-primary"actions={
          <div className="flex items-center gap-2">
            <Button
 type="button"variant="outline"size="sm"onClick={loadAllData}
 disabled={isLoading}
 className="border-border text-foreground hover:bg-muted h-9 w-9 p-0 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"title={tBilingual('Refresh', 'রিফ্রেশ')}
 aria-label={tBilingual('Refresh', 'রিফ্রেশ')}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
            </Button>

            <Button
 type="button"onClick={() => {
 resetLocationForm()
 setIsAddLocationOpen(true)
              }}
 className="bg-primary hover:bg-primary text-white font-bold text-xs h-9 rounded-xl flex items-center gap-1.5 shadow-sm transition-all">
              <Plus className="h-4 w-4"/>
              <span>{tBilingual('Add Location', 'নতুন লোকেশন')}</span>
            </Button>
          </div>
        }
      />

      {/* Notification Toast */}
      {notification && (
        <div
 className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg transition-all animate-in slide-in- ${
 notification.type === 'success'
              ? 'bg-success-surface bg-success-surface/80 border border-success-border border-success-border text-success text-success'
              : 'bg-danger-surface bg-danger-surface/80 border border-danger-border border-danger-border text-destructive text-destructive'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success text-success"/>
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-destructive text-destructive"/>
            )}
            <span>{notification.message}</span>
          </div>
          <button
 type="button"onClick={() => setNotification(null)}
 className="text-muted-foreground hover:text-muted-foreground dark:hover:text-foreground p-1 rounded-md">
            <X className="h-4 w-4"/>
          </button>
        </div>
      )}

      {/* KPI Metric Cards */}
      <KpiGrid columns={4}>
        <KpiCard
 titleEn="Total Locations"titleBn="মোট লোকেশন"value={isLoading ? '...' : locations.length}
 icon={MapPin}
 colorVariant="slate"subtitleEn="Configured Sites"subtitleBn="নির্ধারিত সাইট"/>

        <KpiCard
 titleEn="Active Geofences"titleBn="সক্রিয় জিওফেন্স"value={isLoading ? '...' : activeLocationsCount}
 icon={Radio}
 colorVariant="emerald"subtitleEn="Enforcing GPS Bounds"subtitleBn="জিপিএস বলয় সক্রিয়"/>

        <KpiCard
 titleEn="Rotatable QR Tokens"titleBn="রোটেট কিউআর টোকেন"value={isLoading ? '...' : activeQrCount}
 icon={QrCode}
 colorVariant="indigo"subtitleEn="Live Cryptographic Terminals"subtitleBn="লাইভ সিকিউর টার্মিনাল"/>

        <KpiCard
 titleEn="Corrections Inbox"titleBn="সংশোধন আবেদন"value={isLoading ? '...' : pendingCorrectionsCount}
 icon={Clock}
 colorVariant="amber"subtitleEn={pendingCorrectionsCount > 0 ? 'Awaiting Review' : 'All Clear'}
 subtitleBn={pendingCorrectionsCount > 0 ? 'অনুমোদনের অপেক্ষায়' : 'সব অনুমোদিত'}
 badge={pendingCorrectionsCount > 0 ? 'Pending' : 'Clear'}
 badgeColor={pendingCorrectionsCount > 0 ? 'amber' : 'emerald'}
        />
      </KpiGrid>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border gap-2 pb-px overflow-x-auto scrollbar-none">
        <button
 type="button"onClick={() => setActiveTab('locations')}
 className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
 activeTab === 'locations'
              ? 'border-border text-primary border-border text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-foreground'
          }`}
        >
          <MapPin className="h-3.5 w-3.5"/>
          <span>{tBilingual('Attendance Locations', 'কর্মস্থল লোকেশন')}</span>
          <Badge variant="outline"className="ml-1 text-xs px-1.5 py-0">
            {locations.length}
          </Badge>
        </button>

        <button
 type="button"onClick={() => setActiveTab('qr_management')}
 className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
 activeTab === 'qr_management'
              ? 'border-border text-primary border-border text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-foreground'
          }`}
        >
          <QrCode className="h-3.5 w-3.5"/>
          <span>{tBilingual('QR Management & Posters', 'কিউআর ও পোস্টার')}</span>
        </button>

        <button
 type="button"onClick={() => setActiveTab('corrections')}
 className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
 activeTab === 'corrections'
              ? 'border-border text-primary border-border text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-foreground'
          }`}
        >
          <Clock className="h-3.5 w-3.5"/>
          <span>{tBilingual('Correction Requests', 'সংশোধন অনুরোধ')}</span>
          {pendingCorrectionsCount > 0 && (
            <Badge className="bg-warning text-white bg-warning/20 text-warning border-warning-border/30 text-xs px-1.5 py-0 font-bold animate-pulse">
              {pendingCorrectionsCount}
            </Badge>
          )}
        </button>

        <button
 type="button"onClick={() => setActiveTab('audit')}
 className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
 activeTab === 'audit'
              ? 'border-border text-primary border-border text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-foreground'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5"/>
          <span>{tBilingual('Audit Log', 'অডিট হিস্ট্রি')}</span>
          <Badge variant="outline"className="ml-1 text-xs px-1.5 py-0">
            {auditLogs.length}
          </Badge>
        </button>
      </div>

      {/* SKELETON LOADING STATE */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((n) => (
            <div
 key={n}
 className="p-6 rounded-xl bg-card border border-border space-y-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-5 w-40 bg-muted rounded-lg"/>
                <div className="h-5 w-20 bg-muted rounded-full"/>
              </div>
              <div className="flex gap-4">
                <div className="h-24 w-24 bg-muted rounded-xl"/>
                <div className="space-y-2 flex-1 pt-2">
                  <div className="h-3 w-full bg-muted rounded"/>
                  <div className="h-3 w-3/4 bg-muted rounded"/>
                  <div className="h-3 w-1/2 bg-muted rounded"/>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="h-9 bg-muted rounded-xl"/>
                <div className="h-9 bg-muted rounded-xl"/>
                <div className="h-9 bg-muted rounded-xl"/>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 1: LOCATIONS & GEOFENCES */}
      {!isLoading && activeTab === 'locations' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-card border border-border rounded-xl shadow-sm">
            <div className="relative w-full sm:w-72">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <Input
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 placeholder={tBilingual('Search locations or addresses...', 'লোকেশন বা ঠিকানা খুঁজুন...')}
 className="pl-9 bg-muted border-border text-foreground text-xs h-9 rounded-xl"/>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Branch Filter */}
              {branches.length > 0 && (
                <select
 value={selectedBranchFilter}
 onChange={(e) => setSelectedBranchFilter(e.target.value)}
 className="bg-muted border border-border text-foreground text-xs rounded-xl px-3 h-9 font-medium">
                  <option value="all">{tBilingual('All Branches', 'সকল শাখা')}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Status Filter */}
              <select
 value={selectedStatusFilter}
 onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
 className="bg-muted border border-border text-foreground text-xs rounded-xl px-3 h-9 font-medium">
                <option value="all">{tBilingual('All Statuses', 'সকল স্ট্যাটাস')}</option>
                <option value="active">{tBilingual('Active Only', 'শুধু সক্রিয়')}</option>
                <option value="disabled">{tBilingual('Disabled Only', 'নিষ্ক্রিয়')}</option>
              </select>
            </div>
          </div>

          {/* Locations Grid */}
          {filteredLocations.length === 0 ? (
            <Card className="border-border bg-card p-12 text-center space-y-3 rounded-xl shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-primary/10 bg-primary/10 flex items-center justify-center mx-auto text-primary text-primary">
                <MapPin className="h-6 w-6"/>
              </div>
              <h3 className="text-base font-bold text-foreground">
                {tBilingual('No Attendance Locations Found', 'কোন কর্মস্থল লোকেশন পাওয়া যায়নি')}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {searchTerm || selectedBranchFilter !== 'all' || selectedStatusFilter !== 'all'
                  ? tBilingual('No locations match your filter criteria.', 'আপনার ফিল্টারের সাথে কোনো লোকেশন মিলেনি।')
                  : tBilingual(
                      'Create your first workplace geofence (e.g. Head Office, Printing Press Floor, Warehouse, or Job Site).',
                      'আপনার প্রথম কর্মস্থল জিপিএস লোকেশন ও কিউআর টার্মিনাল যুক্ত করুন।'
                    )}
              </p>
              <Button
 type="button"onClick={() => {
 resetLocationForm()
 setIsAddLocationOpen(true)
                }}
 className="bg-primary hover:bg-primary text-white font-bold text-xs h-9 rounded-xl shadow-sm">
                <Plus className="h-3.5 w-3.5 mr-1"/>
                <span>{tBilingual('Create Location', 'লোকেশন তৈরি করুন')}</span>
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLocations.map((loc) => {
 const activeToken = loc.active_qr_token
 const qrValue = activeToken?.raw_token
                  ? `PRINTFLOW:ATT:v1:${activeToken.raw_token}`
                  : `PRINTFLOW:ATT:LOC:${loc.id}`

 return (
                  <Card
 key={loc.id}
 className="border-border bg-card shadow-sm hover:shadow-xs transition-all rounded-xl overflow-hidden flex flex-col justify-between group">
                    <CardHeader className="p-5 pb-3 border-b border-border /80">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base text-foreground font-bold">
                              {loc.name}
                            </CardTitle>
                            <Badge
 className={`text-xs font-bold ${
 loc.is_active
                                  ? 'bg-success-surface text-success border-success-border bg-success-surface text-success border-success-border'
                                  : 'bg-muted text-muted-foreground border-border '
                              }`}
                            >
                              {loc.is_active ? tBilingual('Active Geofence', 'সক্রিয় জিওফেন্স') : tBilingual('Disabled', 'নিষ্ক্রিয়')}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {loc.branch_name && (
                              <Badge
 variant="outline"className="bg-muted text-primary text-primary border-border text-xs px-2 py-0.5 flex items-center gap-1 rounded-md">
                                <Building className="h-2.5 w-2.5"/>
                                <span>{loc.branch_name}</span>
                              </Badge>
                            )}
                            {loc.address && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <MapPin className="h-3 w-3 text-muted-foreground shrink-0"/>
                                <span>{loc.address}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
 type="button"onClick={() => openEditModal(loc)}
 className="p-1.5 text-muted-foreground hover:text-primary dark:hover:text-foreground rounded-lg hover:bg-muted transition-colors"title="Edit Location">
                            <Edit className="h-4 w-4"/>
                          </button>
                          <button
 type="button"onClick={() => openDeleteConfirm(loc)}
 className="p-1.5 text-muted-foreground hover:text-destructive dark:hover:text-destructive rounded-lg hover:bg-muted transition-colors"title="Delete Location & QR Terminal">
                            <Trash2 className="h-4 w-4"/>
                          </button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 space-y-4">
                      {/* QR Preview & Specs */}
                      <div className="flex items-center gap-4 bg-muted p-4 rounded-xl border border-border">
                        <div
 id={`qr-container-${loc.id}`}
 onClick={() => openQrDetailModal(loc)}
 className="p-2.5 bg-card rounded-xl shrink-0 shadow-sm border border-border dark:border-transparent cursor-pointer hover:ring-2 hover:focus:ring-ring transition-all group-hover:scale-105"title="Click to zoom & inspect QR details">
                          <QRCodeSVG value={qrValue} size={84} includeMargin={false} />
                        </div>

                        <div className="space-y-1 text-xs flex-1">
                          <div className="flex justify-between items-center text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Compass className="h-3 w-3 text-primary"/>
                              <span>{tBilingual('GPS Center', 'জিপিএস অবস্থান')}:</span>
                            </span>
                            <button
 type="button"onClick={() => handleCopy(`${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`, 'GPS')}
 className="tabular-nums text-foreground font-semibold hover:text-primary flex items-center gap-1 cursor-pointer"title="Copy Coordinates">
                              <span>{loc.latitude.toFixed(4)}°, {loc.longitude.toFixed(4)}°</span>
                              <Copy className="h-2.5 w-2.5 text-muted-foreground"/>
                            </button>
                          </div>

                          <div className="flex justify-between text-muted-foreground">
                            <span>{tBilingual('Radius Geofence', 'অনুমোদিত ব্যাসার্ধ')}:</span>
                            <span className="font-semibold text-primary text-primary tabular-nums">{loc.radius_meters}m</span>
                          </div>

                          <div className="flex justify-between text-muted-foreground">
                            <span>{tBilingual('Max Tolerance', 'সর্বোচ্চ নির্ভুলতা')}:</span>
                            <span className="tabular-nums text-foreground">±{loc.max_accuracy_meters}m</span>
                          </div>

                          <div className="flex justify-between text-muted-foreground pt-1 border-t border-border">
                            <span>{tBilingual('Token Prefix', 'কিউআর টোকেন')}:</span>
                            <span className="tabular-nums text-xs text-success text-success font-bold">
                              {activeToken?.token_prefix || 'ACTIVE'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <Button
 type="button"variant="outline"onClick={() => {
 setSelectedLocation(loc)
 setIsPrintPosterOpen(true)
                          }}
 className="border-border bg-card text-foreground hover:bg-muted dark:hover:bg-card-elevated text-xs h-9 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-none">
                          <Printer className="h-3.5 w-3.5 text-primary text-primary"/>
                          <span>{tBilingual('Poster', 'পোস্টার')}</span>
                        </Button>

                        <Button
 type="button"variant="outline"onClick={() => handleDownloadQrSvg(loc)}
 className="border-border bg-card text-foreground hover:bg-muted dark:hover:bg-card-elevated text-xs h-9 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-none">
                          <Download className="h-3.5 w-3.5 text-success text-success"/>
                          <span>{tBilingual('Vector', 'ভেক্টর')}</span>
                        </Button>

                        <Button
 type="button"variant="outline"onClick={() => {
 setSelectedLocation(loc)
 setIsRegenerateConfirmOpen(true)
                          }}
 className="border-warning-border border-warning-border/20 bg-warning-surface text-warning text-warning hover:bg-warning-surface dark:hover:bg-card-elevated text-xs h-9 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-none">
                          <RefreshCw className="h-3.5 w-3.5 text-warning text-warning"/>
                          <span>{tBilingual('Rotate', 'রোটেট')}</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DEDICATED QR MANAGEMENT */}
      {!isLoading && activeTab === 'qr_management' && (
        <Card className="border-border bg-card rounded-xl shadow-sm overflow-hidden">
          <CardHeader className="p-5 pb-4 border-b border-border">
            <CardTitle className="text-foreground text-base">
              {tBilingual('QR Codes & Physical Terminal Management', 'কিউআর কোড ও ফিজিক্যাল টার্মিনাল')}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {tBilingual(
                'Audit active cryptographic tokens, generate printable A4 posters, or instantly rotate compromised QR codes.',
                'সক্রিয় টোকেন পর্যবেক্ষণ করুন, প্রবেশদ্বারের পোস্টার প্রিন্ট করুন বা পুরাতন কিউআর পরিবর্তন করুন।'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border dark:divide-border">
            {locations.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                {tBilingual('No active locations available for QR management.', 'কিউআর ব্যবস্থাপনার জন্য কোনো সক্রিয় লোকেশন নেই।')}
              </div>
            ) : (
 locations.map((loc) => {
 const activeToken = loc.active_qr_token
 const qrValue = activeToken?.raw_token
                  ? `PRINTFLOW:ATT:v1:${activeToken.raw_token}`
                  : `PRINTFLOW:ATT:LOC:${loc.id}`

 return (
                  <div
 key={loc.id}
 className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted dark:hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-4">
                      <div
 id={`qr-container-${loc.id}`}
 onClick={() => openQrDetailModal(loc)}
 className="p-2 bg-card rounded-xl shrink-0 shadow-sm border border-border dark:border-transparent cursor-pointer hover:ring-2 hover:focus:ring-ring transition-all"title="Click to inspect">
                        <QRCodeSVG value={qrValue} size={76} includeMargin={false} />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-sm">{loc.name}</span>
                          <Badge
 className={`text-xs font-bold ${
 activeToken?.is_active
                                ? 'bg-success-surface text-success border-success-border bg-success-surface text-success border-success-border'
                                : 'bg-danger-surface text-destructive border-danger-border bg-danger-surface text-destructive border-danger-border'
                            }`}
                          >
                            {activeToken?.is_active ? 'ACTIVE TOKEN' : 'INACTIVE'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground tabular-nums">
 Prefix: <strong className="text-primary text-primary">{activeToken?.token_prefix || 'ACTIVE'}</strong> • Radius: {loc.radius_meters}m • Max Accuracy: ±{loc.max_accuracy_meters}m
                        </p>
                        {activeToken?.created_at && (
                          <p className="text-xs text-muted-foreground tabular-nums">
 Last Rotated: {new Date(activeToken.created_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
 type="button"variant="outline"size="sm"onClick={() => openQrDetailModal(loc)}
 className="border-border text-foreground text-xs h-8 rounded-lg">
                        <Eye className="h-3.5 w-3.5 mr-1 text-muted-foreground"/>
                        <span>Inspect</span>
                      </Button>
                      <Button
 type="button"size="sm"onClick={() => {
 setSelectedLocation(loc)
 setIsPrintPosterOpen(true)
                        }}
 className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8 rounded-lg font-bold">
                        <Printer className="h-3.5 w-3.5 mr-1"/>
                        <span>Poster</span>
                      </Button>
                      <Button
 type="button"variant="outline"size="sm"onClick={() => {
 setSelectedLocation(loc)
 setIsRegenerateConfirmOpen(true)
                        }}
 className="border-warning-border border-warning-border/30 text-warning text-warning hover:bg-warning-surface text-xs h-8 rounded-lg font-bold">
                        <RefreshCw className="h-3.5 w-3.5 mr-1 text-warning"/>
                        <span>Regenerate</span>
                      </Button>
                      <Button
 type="button"variant="outline"size="sm"onClick={() => {
 setSelectedLocation(loc)
 setIsRevokeConfirmOpen(true)
                        }}
 className="border-danger-border border-danger-border/30 text-destructive text-destructive hover:bg-danger-surface text-xs h-8 rounded-lg font-bold">
                        <Ban className="h-3.5 w-3.5 mr-1 text-destructive"/>
                        <span>Revoke</span>
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: CORRECTION REQUESTS */}
      {!isLoading && activeTab === 'corrections' && (
        <Card className="border-border bg-card rounded-xl shadow-sm overflow-hidden">
          <CardHeader className="p-5 pb-4 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-foreground text-base">
                  {tBilingual('Employee Attendance Corrections Inbox', 'হাজিরা সংশোধন ইনবক্স')}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {tBilingual(
                    'Review and approve or reject missed punch correction requests submitted by staff members.',
                    'কর্মীদের জমা দেওয়া অনুপস্থিতি বা ভুলে যাওয়া পাঞ্চ সংশোধনের আবেদন রিভিউ করুন।'
                  )}
                </CardDescription>
              </div>

              <select
 value={correctionFilter}
 onChange={(e) => setCorrectionFilter(e.target.value as any)}
 className="bg-muted border border-border text-foreground text-xs rounded-xl px-3 h-8 self-start sm:self-auto font-medium">
                <option value="all">{tBilingual('All Corrections', 'সকল আবেদন')}</option>
                <option value="pending">{tBilingual('Pending Only', 'অপেক্ষমান')}</option>
                <option value="approved">{tBilingual('Approved Only', 'অনুমোদিত')}</option>
                <option value="rejected">{tBilingual('Rejected Only', 'প্রত্যাখ্যাত')}</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border dark:divide-border">
            {filteredCorrections.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground">
                {tBilingual('No correction requests found matching filter.', 'কোনো সংশোধন আবেদন পাওয়া যায়নি।')}
              </div>
            ) : (
 filteredCorrections.map((corr) => (
                <div
 key={corr.id}
 className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted dark:hover:bg-muted/30 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-xs">
                        {corr.employee_name || 'Staff Member'}
                      </span>
                      <Badge className="text-xs bg-primary/10 text-primary border-primary/20 text-primary">
                        {corr.requested_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {corr.attendance_date} at {corr.requested_time}
                      </span>
                      <Badge
 className={`text-xs font-bold ${
 corr.status === 'approved'
                            ? 'bg-success-surface text-success border-success-border bg-success-surface text-success border-success-border'
                            : corr.status === 'rejected'
                            ? 'bg-danger-surface text-destructive border-danger-border bg-danger-surface text-destructive border-danger-border'
                            : 'bg-warning-surface text-warning border-warning-border bg-warning-surface text-warning border-warning-border'
                        }`}
                      >
                        {corr.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
 Reason: <strong className="text-foreground">{corr.reason}</strong>
                    </p>
                    {corr.review_notes && (
                      <p className="text-xs text-muted-foreground italic">
 Manager Note: &ldquo;{corr.review_notes}&rdquo;
                      </p>
                    )}
                  </div>

                  {corr.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <Button
 type="button"size="sm"onClick={() => {
 setSelectedCorrection(corr)
 handleReviewCorrection('approved')
                        }}
 className="bg-success hover:bg-success text-white text-xs h-8 rounded-lg font-bold">
                        <Check className="h-3.5 w-3.5 mr-1"/>
                        <span>Approve</span>
                      </Button>
                      <Button
 type="button"size="sm"variant="outline"onClick={() => {
 setSelectedCorrection(corr)
 handleReviewCorrection('rejected')
                        }}
 className="border-danger-border text-destructive text-destructive hover:bg-danger-surface text-xs h-8 rounded-lg font-bold">
                        <X className="h-3.5 w-3.5 mr-1"/>
                        <span>Reject</span>
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {!isLoading && activeTab === 'audit' && (
        <Card className="border-border bg-card rounded-xl shadow-sm overflow-hidden">
          <CardHeader className="p-5 pb-4 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-foreground text-base">
                  {tBilingual('Authoritative Attendance Audit Trail', 'নিরাপদ অডিট ট্রেইল')}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {tBilingual(
                    'Immutable cryptographic ledger of all location setups, QR token rotations, and punch events.',
                    'সকল লোকেশন তৈরি, কিউআর কোড রোটেশন ও উপস্থিতি যাচাইকরণের সম্পূর্ণ রেকর্ড।'
                  )}
                </CardDescription>
              </div>

              <select
 value={auditFilter}
 onChange={(e) => setAuditFilter(e.target.value)}
 className="bg-muted border border-border text-foreground text-xs rounded-xl px-3 h-8 self-start sm:self-auto font-medium">
                <option value="all">{tBilingual('All Actions', 'সকল কার্যক্রম')}</option>
                <option value="location">{tBilingual('Location Events', 'লোকেশন ইভেন্ট')}</option>
                <option value="qr">{tBilingual('QR Rotations', 'কিউআর রোটেশন')}</option>
                <option value="attendance">{tBilingual('Punch Events', 'উপস্থিতি পাঞ্চ')}</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border dark:divide-border">
            {filteredAuditLogs.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground">
                {tBilingual('No audit entries matching filter.', 'কোনো অডিট লগ পাওয়া যায়নি।')}
              </div>
            ) : (
 filteredAuditLogs.map((log) => (
                <div
 key={log.id}
 className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-muted dark:hover:bg-muted/30 transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge
 variant="outline"className="text-xs tabular-nums bg-muted text-primary text-primary border-border">
                        {log.action_type}
                      </Badge>
                      <span className="font-semibold text-foreground">{log.actor_name}</span>
                      {log.location_name && (
                        <span className="text-muted-foreground">• Location: {log.location_name}</span>
                      )}
                    </div>
                    <span className="text-muted-foreground text-xs block tabular-nums truncate max-w-xl">
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* CREATE LOCATION MODAL */}
      <ModalDialog
 open={isAddLocationOpen}
 onOpenChange={(v) => !v && setIsAddLocationOpen(false)}
 title={tBilingual('Add New Attendance Location', 'নতুন কর্মস্থল লোকেশন যুক্ত করুন')}
 description={tBilingual(
          'Configure a physical workplace with geofence radius and GPS coordinates.',
          'কর্মস্থলের জিপিএস অবস্থান ও অনুমোদিত সীমানা ব্যাসার্ধ নির্ধারণ করুন।'
        )}
      >
        <form onSubmit={handleCreateLocation} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="locName"className="text-xs font-semibold text-foreground">
              {tBilingual('Location Name', 'লোকেশন নাম')} *
            </Label>
            <Input
 id="locName"value={locName}
 onChange={(e) => setLocName(e.target.value)}
 placeholder="e.g. Head Office / Fakirapool Press Zone / Gazipur Warehouse"className="bg-muted border-border text-foreground text-xs h-10 rounded-xl"required
            />
          </div>

          {/* Branch Selection Dropdown */}
          {branches.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="locBranch"className="text-xs font-semibold text-foreground">
                {tBilingual('Assign to Branch', 'শাখা নির্বাচন')}
              </Label>
              <select
 id="locBranch"value={locBranchId}
 onChange={(e) => setLocBranchId(e.target.value)}
 className="w-full bg-muted border border-border text-foreground text-xs rounded-xl px-3 h-10">
                <option value="">{tBilingual('Default Company Location (All Branches)', 'ডিফল্ট কেন্দ্রীয় লোকেশন (সকল শাখা)')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="locAddress"className="text-xs font-semibold text-foreground">
              {tBilingual('Address', 'ঠিকানা')}
            </Label>
            <Input
 id="locAddress"value={locAddress}
 onChange={(e) => setLocAddress(e.target.value)}
 placeholder="e.g. Motijheel C/A, Dhaka"className="bg-muted border-border text-foreground text-xs h-10 rounded-xl"/>
          </div>

          {/* GPS Coordinate Inputs & Auto-detect Button */}
          <div className="p-4 rounded-xl bg-muted border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Compass className="h-4 w-4 text-primary text-primary"/>
                <span>{tBilingual('Geofence GPS Coordinates', 'জিওফেন্স জিপিএস কো-অর্ডিনেট')}</span>
              </span>

              <Button
 type="button"variant="outline"size="sm"onClick={detectCurrentGps}
 disabled={isDetectingGps}
 className="h-8 text-xs border-primary/20 border-primary/20/40 text-primary text-primary hover:bg-primary/10 rounded-xl font-bold">
                <Navigation className={`h-3.5 w-3.5 mr-1 ${isDetectingGps ? 'animate-spin' : ''}`} />
                <span>{isDetectingGps ? tBilingual('Detecting GPS...', 'জিপিএস ধরা হচ্ছে...') : tBilingual('Capture Current GPS', 'বর্তমান অবস্থান নিন')}</span>
              </Button>
            </div>

            {gpsAccuracyCaptured && (
              <div className="text-xs text-success text-success bg-success-surface bg-success-surface p-2 rounded-lg border border-success-border border-success-border flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0"/>
                <span>Device Satellite Accuracy: ±{gpsAccuracyCaptured}m (Verified)</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="locLat"className="text-xs text-muted-foreground font-semibold">
                  {tBilingual('Latitude (°N)', 'অক্ষাংশ')}
                </Label>
                <Input
 id="locLat"type="number"step="0.000001"value={locLat}
 onChange={(e) => setLocLat(parseFloat(e.target.value))}
 placeholder="23.853600"className="bg-card border-border text-foreground tabular-nums text-xs h-9 rounded-xl"required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="locLng"className="text-xs text-muted-foreground font-semibold">
                  {tBilingual('Longitude (°E)', 'দ্রাঘিমাংশ')}
                </Label>
                <Input
 id="locLng"type="number"step="0.000001"value={locLng}
 onChange={(e) => setLocLng(parseFloat(e.target.value))}
 placeholder="90.417400"className="bg-card border-border text-foreground tabular-nums text-xs h-9 rounded-xl"required
                />
              </div>
            </div>
          </div>

          {/* Sliders with Explanations */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 p-3 rounded-xl bg-muted border border-border">
              <div className="flex justify-between items-center">
                <Label htmlFor="locRadius"className="text-xs font-semibold text-foreground">
 Radius: <strong className="text-primary text-primary tabular-nums">{locRadius}m</strong>
                </Label>
              </div>
              <input
 id="locRadius"type="range"min={20}
 max={500}
 step={10}
 value={locRadius}
 onChange={(e) => setLocRadius(parseInt(e.target.value))}
 className="w-full accent-indigo-600"/>
              <p className="text-xs text-muted-foreground">
                {tBilingual('Allowed punch circle diameter.', 'অনুমোদিত উপস্থিতি বলয়।')}
              </p>
            </div>

            <div className="space-y-1.5 p-3 rounded-xl bg-muted border border-border">
              <div className="flex justify-between items-center">
                <Label htmlFor="locAcc"className="text-xs font-semibold text-foreground">
 Max Accuracy: <strong className="text-foreground tabular-nums">±{locMaxAccuracy}m</strong>
                </Label>
              </div>
              <input
 id="locAcc"type="range"min={20}
 max={250}
 step={10}
 value={locMaxAccuracy}
 onChange={(e) => setLocMaxAccuracy(parseInt(e.target.value))}
 className="w-full accent-indigo-600"/>
              <p className="text-xs text-muted-foreground">
                {tBilingual('Rejects inaccurate GPS satellite signals.', 'দুর্বল জিপিএস সিগন্যাল বাতিল করবে।')}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
 type="button"variant="outline"size="sm"onClick={() => setIsAddLocationOpen(false)}
 className="border-border text-foreground text-xs rounded-xl">
              {tBilingual('Cancel', 'বাতিল')}
            </Button>
            <Button
 type="submit"size="sm"disabled={isSubmitting}
 className="bg-primary hover:bg-primary text-white font-bold text-xs rounded-xl shadow-sm">
              {isSubmitting ? tBilingual('Creating...', 'তৈরি হচ্ছে...') : tBilingual('Create Location & Generate QR', 'লোকেশন তৈরি ও কিউআর জেনারেট')}
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* EDIT LOCATION MODAL */}
      <ModalDialog
 open={isEditLocationOpen}
 onOpenChange={(v) => !v && setIsEditLocationOpen(false)}
 title={tBilingual('Edit Attendance Location', 'লোকেশন সম্পাদনা করুন')}
 description={tBilingual('Update location details and geofence parameters.', 'লোকেশন তথ্য ও জিপিএস বলয় পরিবর্তন করুন।')}
      >
        <form onSubmit={handleUpdateLocation} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="editName"className="text-xs font-semibold text-foreground">
              {tBilingual('Location Name', 'লোকেশন নাম')} *
            </Label>
            <Input
 id="editName"value={locName}
 onChange={(e) => setLocName(e.target.value)}
 className="bg-muted border-border text-foreground text-xs h-10 rounded-xl"required
            />
          </div>

          {branches.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="editBranch"className="text-xs font-semibold text-foreground">
                {tBilingual('Branch', 'শাখা')}
              </Label>
              <select
 id="editBranch"value={locBranchId}
 onChange={(e) => setLocBranchId(e.target.value)}
 className="w-full bg-muted border border-border text-foreground text-xs rounded-xl px-3 h-10">
                <option value="">{tBilingual('Default Company Location (All Branches)', 'ডিফল্ট কেন্দ্রীয় লোকেশন (সকল শাখা)')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="editAddress"className="text-xs font-semibold text-foreground">
              {tBilingual('Address', 'ঠিকানা')}
            </Label>
            <Input
 id="editAddress"value={locAddress}
 onChange={(e) => setLocAddress(e.target.value)}
 className="bg-muted border-border text-foreground text-xs h-10 rounded-xl"/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-semibold">{tBilingual('Latitude (°N)', 'অক্ষাংশ')}</Label>
              <Input
 type="number"step="0.000001"value={locLat}
 onChange={(e) => setLocLat(parseFloat(e.target.value))}
 className="bg-card border-border text-foreground tabular-nums text-xs h-9 rounded-xl"required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-semibold">{tBilingual('Longitude (°E)', 'দ্রাঘিমাংশ')}</Label>
              <Input
 type="number"step="0.000001"value={locLng}
 onChange={(e) => setLocLng(parseFloat(e.target.value))}
 className="bg-card border-border text-foreground tabular-nums text-xs h-9 rounded-xl"required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 p-3 rounded-xl bg-muted border border-border">
              <Label className="text-xs font-semibold text-foreground">
 Radius: <strong className="text-primary text-primary tabular-nums">{locRadius}m</strong>
              </Label>
              <input
 type="range"min={20}
 max={500}
 step={10}
 value={locRadius}
 onChange={(e) => setLocRadius(parseInt(e.target.value))}
 className="w-full accent-indigo-600"/>
            </div>

            <div className="space-y-1.5 p-3 rounded-xl bg-muted border border-border">
              <Label className="text-xs font-semibold text-foreground">
 Max Accuracy: <strong className="text-foreground tabular-nums">±{locMaxAccuracy}m</strong>
              </Label>
              <input
 type="range"min={20}
 max={250}
 step={10}
 value={locMaxAccuracy}
 onChange={(e) => setLocMaxAccuracy(parseInt(e.target.value))}
 className="w-full accent-indigo-600"/>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
 type="checkbox"id="locActive"checked={locActive}
 onChange={(e) => setLocActive(e.target.checked)}
 className="rounded accent-indigo-600 h-4 w-4"/>
            <Label htmlFor="locActive"className="text-xs cursor-pointer text-foreground font-semibold">
              {tBilingual('Active Geofence Location', 'সক্রিয় উপস্থিতি বলয়')}
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
 type="button"variant="outline"size="sm"onClick={() => setIsEditLocationOpen(false)}
 className="border-border text-foreground text-xs rounded-xl">
              {tBilingual('Cancel', 'বাতিল')}
            </Button>
            <Button
 type="submit"size="sm"disabled={isSubmitting}
 className="bg-primary hover:bg-primary text-white font-bold text-xs rounded-xl shadow-sm">
              {isSubmitting ? tBilingual('Saving...', 'সংরক্ষণ হচ্ছে...') : tBilingual('Save Changes', 'সংরক্ষণ করুন')}
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* QR DETAIL / INSPECT MODAL */}
      {selectedLocation && (
        <ModalDialog
 open={isQrDetailOpen}
 onOpenChange={(v) => !v && setIsQrDetailOpen(false)}
 title={`Terminal QR: ${selectedLocation.name}`}
 description="Detailed cryptographic token metadata and terminal actions">
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-muted border border-border">
              <div
 id={`qr-container-${selectedLocation.id}`}
 className="p-3 bg-card rounded-xl shadow-xs shrink-0 border border-border dark:border-transparent">
                <QRCodeSVG
 value={
 selectedLocation.active_qr_token?.raw_token
                      ? `PRINTFLOW:ATT:v1:${selectedLocation.active_qr_token.raw_token}`
                      : `PRINTFLOW:ATT:LOC:${selectedLocation.id}`
                  }
 size={120}
 includeMargin={false}
                />
              </div>

              <div className="space-y-1.5 text-xs flex-1 w-full">
                <div className="flex justify-between border-b border-border pb-1">
                  <span className="text-muted-foreground">Token Status:</span>
                  <Badge className="bg-success-surface text-success border-success-border bg-success-surface text-success border-success-border text-xs font-bold">
                    {selectedLocation.active_qr_token?.is_active ? 'ACTIVE & VERIFIED' : 'REVOKED'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Token Prefix:</span>
                  <span className="tabular-nums text-primary text-primary font-bold">
                    {selectedLocation.active_qr_token?.token_prefix || 'ACTIVE'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Geofence Center:</span>
                  <span className="tabular-nums text-foreground">
                    {selectedLocation.latitude.toFixed(6)}°N, {selectedLocation.longitude.toFixed(6)}°E
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Radius & Tolerance:</span>
                  <span className="tabular-nums text-foreground">
                    {selectedLocation.radius_meters}m (Max: ±{selectedLocation.max_accuracy_meters}m)
                  </span>
                </div>
                {selectedLocation.active_qr_token?.created_at && (
                  <div className="flex justify-between pt-1 border-t border-border text-muted-foreground text-xs">
                    <span>Generated:</span>
                    <span>{new Date(selectedLocation.active_qr_token.created_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
              <Button
 type="button"size="sm"onClick={() => {
 setIsQrDetailOpen(false)
 setIsPrintPosterOpen(true)
                }}
 className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl">
                <Printer className="h-3.5 w-3.5 mr-1"/>
                <span>Print Poster</span>
              </Button>

              <Button
 type="button"variant="outline"size="sm"onClick={() => handleDownloadQrSvg(selectedLocation)}
 className="border-border text-success text-success text-xs font-bold rounded-xl">
                <Download className="h-3.5 w-3.5 mr-1"/>
                <span>Download</span>
              </Button>

              <Button
 type="button"variant="outline"size="sm"onClick={() => {
 setIsQrDetailOpen(false)
 setIsRegenerateConfirmOpen(true)
                }}
 className="border-warning-border border-warning-border/30 text-warning text-warning text-xs font-bold rounded-xl">
                <RefreshCw className="h-3.5 w-3.5 mr-1"/>
                <span>Rotate</span>
              </Button>

              <Button
 type="button"variant="outline"size="sm"onClick={() => {
 setIsQrDetailOpen(false)
 setIsRevokeConfirmOpen(true)
                }}
 className="border-danger-border border-danger-border/30 text-destructive text-destructive text-xs font-bold rounded-xl">
                <Ban className="h-3.5 w-3.5 mr-1"/>
                <span>Revoke</span>
              </Button>

              <Button
 type="button"variant="outline"size="sm"onClick={() => {
 setIsQrDetailOpen(false)
 openDeleteConfirm(selectedLocation)
                }}
 className="border-danger-border border-danger-border/40 text-destructive text-destructive hover:bg-danger-surface dark:hover:bg-danger-surface text-xs font-bold rounded-xl">
                <Trash2 className="h-3.5 w-3.5 mr-1"/>
                <span>Delete</span>
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* REGENERATE QR CONFIRMATION MODAL */}
      <ModalDialog
 open={isRegenerateConfirmOpen}
 onOpenChange={(v) => !v && setIsRegenerateConfirmOpen(false)}
 title="Regenerate QR Code?"description="Immediate cryptographic invalidation warning">
        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-xl bg-warning-surface bg-warning/15 border border-warning-border border-warning-border/30 text-warning text-warning text-xs flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning text-warning shrink-0 mt-0.5"/>
            <div className="space-y-1">
              <h4 className="font-bold text-foreground">Warning: Immediate Invalidation</h4>
              <p>
 Regenerating this QR will <strong>immediately invalidate the previous QR code</strong>. Employees scanning the old printed QR code will be rejected. You must print and post the new QR code.
              </p>
            </div>
          </div>

          <div className="p-3 bg-muted rounded-xl text-xs text-muted-foreground border border-border">
 Target Location: <strong className="text-foreground">{selectedLocation?.name}</strong>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
 type="button"variant="outline"size="sm"onClick={() => setIsRegenerateConfirmOpen(false)}
 className="border-border text-foreground text-xs rounded-xl">
 Cancel
            </Button>
            <Button
 type="button"size="sm"disabled={isSubmitting}
 onClick={handleRegenerateQr}
 className="bg-warning hover:bg-warning/90 text-white font-bold text-xs rounded-xl shadow-sm">
              {isSubmitting ? 'Rotating...' : 'Confirm & Invalidate Previous QR'}
            </Button>
          </div>
        </div>
      </ModalDialog>

      {/* REVOKE QR CONFIRMATION MODAL */}
      <ModalDialog
 open={isRevokeConfirmOpen}
 onOpenChange={(v) => !v && setIsRevokeConfirmOpen(false)}
 title="Revoke QR Code?"description="Deactivates terminal until newly generated">
        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-xl bg-danger-surface bg-destructive/15 border border-danger-border border-danger-border/30 text-destructive text-destructive text-xs flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive text-destructive shrink-0 mt-0.5"/>
            <div className="space-y-1">
              <h4 className="font-bold text-foreground">Warning: Terminal Deactivation</h4>
              <p>
 Revoking this QR code will immediately disable scanning at <strong>{selectedLocation?.name}</strong>. Employees will not be able to punch attendance until a new QR is generated.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
 type="button"variant="outline"size="sm"onClick={() => setIsRevokeConfirmOpen(false)}
 className="border-border text-foreground text-xs rounded-xl">
 Cancel
            </Button>
            <Button
 type="button"size="sm"disabled={isSubmitting}
 onClick={handleRevokeQr}
 className="bg-destructive hover:bg-destructive text-destructive-foreground font-bold text-xs rounded-xl shadow-sm">
              {isSubmitting ? 'Revoking...' : 'Confirm Revocation'}
            </Button>
          </div>
        </div>
      </ModalDialog>

      {/* DELETE LOCATION & QR CONFIRMATION MODAL */}
      <ModalDialog
 open={isDeleteLocationConfirmOpen}
 onOpenChange={(v) => !v && setIsDeleteLocationConfirmOpen(false)}
 title={tBilingual('Delete Location & QR Terminal?', 'লোকেশন ও কিউআর টার্মিনাল মুছবেন?')}
 description={tBilingual(
          'Permanent deletion of physical location and cryptographic QR token',
          'লোকেশন এবং সংশ্লিষ্ট সকল কিউআর টোকেন স্থায়ীভাবে মুছে ফেলা হবে'
        )}
      >
        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-xl bg-danger-surface bg-destructive/15 border border-danger-border border-danger-border/30 text-destructive text-destructive text-xs flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive text-destructive shrink-0 mt-0.5"/>
            <div className="space-y-1">
              <h4 className="font-bold text-foreground">{tBilingual('Permanent Deletion Warning', 'স্থায়ীভাবে মুছে ফেলার সতর্কতা')}</h4>
              <p>
 Deleting <strong>&ldquo;{locationToDelete?.name}&rdquo;</strong> will permanently remove this location and immediately deactivate all associated QR codes. This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="p-3 bg-muted rounded-xl text-xs text-muted-foreground tabular-nums border border-border">
 Target Location: <strong className="text-foreground">{locationToDelete?.name}</strong> • Prefix:{' '}
            <strong className="text-primary text-primary">
              {locationToDelete?.active_qr_token?.token_prefix || 'ACTIVE'}
            </strong>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
 type="button"variant="outline"size="sm"onClick={() => setIsDeleteLocationConfirmOpen(false)}
 className="border-border text-foreground text-xs rounded-xl">
 {tBilingual('Cancel', 'বাতিল')}
            </Button>
            <Button
 type="button"size="sm"disabled={isSubmitting}
 onClick={handleConfirmDeleteLocation}
 className="bg-destructive hover:bg-destructive text-white font-bold text-xs rounded-xl shadow-sm">
              {isSubmitting ? tBilingual('Deleting...', 'মুছে ফেলা হচ্ছে...') : tBilingual('Confirm Delete', 'মুছে ফেলুন')}
            </Button>
          </div>
        </div>
      </ModalDialog>

      {/* PRINT POSTER MODAL */}
      {selectedLocation && (
        <ModalDialog
          open={isPrintPosterOpen}
          onOpenChange={(v) => !v && setIsPrintPosterOpen(false)}
          size="3xl"
          hideFooter
          title="Printable QR Code Poster"
          description="High-resolution poster for on-site attendance entrance"
        >
          <PrintableQrPoster
 location={selectedLocation}
 companyName={company?.name || `${BRAND.name} Press`}
 companyNameBn={company?.name_bn}
 logoUrl={company?.logo_url}
 onClose={() => setIsPrintPosterOpen(false)}
          />
        </ModalDialog>
      )}
    </div>
  )
}
