'use client'

import React, { useState, useEffect } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
 MachineryRecord,
 MachineryType,
 MachineryCategory,
 MachineryDepartment,
 DimensionUnit,
} from '@/types/machinery.types'
import {
 createMachineryAction,
 updateMachineryAction,
} from '@/actions/machinery.actions'
import { AlertCircle, Cpu, Sliders, DollarSign } from 'lucide-react'
import { useI18n } from '@/i18n/context'

const MACHINE_TYPES: { value: MachineryType; label: string; labelBn: string }[] = [
  { value: 'digital_printing', label: 'Digital Press (Konica / Xerox / Ricoh)', labelBn: 'ডিজিটাল প্রেস (Konica / Xerox / Ricoh)' },
  { value: 'large_format_printing', label: 'Large-Format Solvent / Latex / UV', labelBn: 'লার্জ-ফরম্যাট সলভেন্ট / ল্যাটেক্স / ইউভি' },
  { value: 'uv_flatbed', label: 'UV Flatbed (Acrylic, Wood, Metal)', labelBn: 'ইউভি ফ্ল্যাটবেড (এক্রিলিক, কাঠ, মেটাল)' },
  { value: 'eco_solvent', label: 'Eco-Solvent Vinyl / Banner', labelBn: 'ইকো-সলভেন্ট ভিনাইল / ব্যানার' },
  { value: 'sublimation', label: 'Sublimation / Apparel Heat Press', labelBn: 'সাবলিমেশন / পোশাক হিট প্রেস' },
  { value: 'dtf_dtg', label: 'DTF / DTG Direct-to-Garment', labelBn: 'DTF / DTG ডিরেক্ট-টু-গার্মেন্ট' },
  { value: 'offset_printing', label: 'Offset Sheetfed / Web Press', labelBn: 'অফসেট শিটফেড / ওয়েব প্রেস' },
  { value: 'cutting_plotter', label: 'Sticker / Vinyl Cutting Plotter', labelBn: 'স্টিকার / ভিনাইল কাটিং প্লটার' },
  { value: 'laser_cutting', label: 'CO2 / Fiber Laser Cutter', labelBn: 'CO2 / ফাইবার লেজার কাটার' },
  { value: 'cnc_router', label: 'CNC Router (Wood / ACP / Foam)', labelBn: 'সিএনসি রাউটার (কাঠ / এসিপি / ফোম)' },
  { value: 'engraving', label: 'Rotary / Laser Engraver', labelBn: 'রোটারি / লেজার এনগ্রেভার' },
  { value: 'acrylic_fabrication', label: 'Acrylic Bending / Flame Polisher', labelBn: 'এক্রিলিক বেন্ডিং / ফ্লেম পলিশার' },
  { value: 'metal_fabrication', label: 'Metal Fabrication & Sheet Bender', labelBn: 'মেটাল ফ্যাব্রিকেশন ও শিট বেন্ডার' },
  { value: 'welding', label: 'MIG / TIG Welding Station', labelBn: 'MIG / TIG ওয়েল্ডিং স্টেশন' },
  { value: 'laminating', label: 'Cold / Thermal Roll Laminator', labelBn: 'কোল্ড / থার্মাল রোল লেমিনেটর' },
  { value: 'binding', label: 'Book Binding / Perfect Binder', labelBn: 'বই বাইন্ডিং / পারফেক্ট বাইন্ডার' },
  { value: 'finishing', label: 'Eyelet / Creasing / Die-Punch', labelBn: 'আইলেট / ক্রিজিং / ডাই-পাঞ্চ' },
  { value: 'installation', label: 'Scaffolding / Boom Lift / Sign Rigging', labelBn: 'স্ক্যাফোল্ডিং / বুম লিফট / সাইন রিগিং' },
  { value: 'other', label: 'Other Equipment', labelBn: 'অন্যান্য যন্ত্রপাতি' },
]

const CATEGORIES: { value: MachineryCategory; label: string; labelBn: string }[] = [
  { value: 'printing', label: 'Printing Press', labelBn: 'প্রিন্টিং প্রেস' },
  { value: 'cutting_cnc', label: 'Cutting & CNC', labelBn: 'কাটিং ও সিএনসি' },
  { value: 'fabrication', label: 'Metal & Acrylic Fab', labelBn: 'মেটাল ও এক্রিলিক ফেব' },
  { value: 'finishing', label: 'Post-Press & Finishing', labelBn: 'পোস্ট-প্রেস ও ফিনিশিং' },
  { value: 'installation', label: 'Installation Rig', labelBn: 'ইনস্টলেশন রিগ' },
  { value: 'other', label: 'General Production', labelBn: 'সাধারণ উৎপাদন' },
]

const DEPARTMENTS: { value: MachineryDepartment; label: string; labelBn: string }[] = [
  { value: 'printing', label: 'Printing Floor', labelBn: 'প্রিন্টিং ফ্লোর' },
  { value: 'finishing', label: 'Finishing & Binding', labelBn: 'ফিনিশিং ও বাইন্ডিং' },
  { value: 'fabrication', label: 'Fabrication Workshop', labelBn: 'ফ্যাব্রিকেশন ওয়ার্কশপ' },
  { value: 'design', label: 'Design & Pre-Press', labelBn: 'ডিজাইন ও প্রি-প্রেস' },
  { value: 'installation', label: 'Installation Fleet', labelBn: 'ইনস্টলেশন বহর' },
  { value: 'other', label: 'General Floor', labelBn: 'সাধারণ ফ্লোর' },
]
interface MachineryFormModalProps {
 open: boolean
 onOpenChange: (open: boolean) => void
 machinery?: MachineryRecord | null
 onSuccess?: (machine: MachineryRecord) => void
}

export function MachineryFormModal({
 open,
 onOpenChange,
 machinery,
 onSuccess,
}: MachineryFormModalProps) {
 const { locale, tBilingual } = useI18n()
  const isEdit = Boolean(machinery?.id)
 const [activeTab, setActiveTab] = useState<'basic' | 'production' | 'costing'>('basic')
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState<string | null>(null)

  // Basic Info Form State
 const [name, setName] = useState('')
 const [code, setCode] = useState('')
 const [machineType, setMachineType] = useState<MachineryType>('large_format_printing')
 const [category, setCategory] = useState<MachineryCategory>('printing')
 const [department, setDepartment] = useState<MachineryDepartment>('printing')
 const [brand, setBrand] = useState('')
 const [model, setModel] = useState('')
 const [serialNumber, setSerialNumber] = useState('')
 const [location, setLocation] = useState('')
 const [supplier, setSupplier] = useState('')
 const [purchaseDate, setPurchaseDate] = useState('')
 const [installationDate, setInstallationDate] = useState('')
 const [warrantyExpiry, setWarrantyExpiry] = useState('')
 const [description, setDescription] = useState('')

  // Production Specs Form State
 const [dimensionUnit, setDimensionUnit] = useState<DimensionUnit>('inch')
 const [maxWidth, setMaxWidth] = useState<string>('')
 const [maxHeight, setMaxHeight] = useState<string>('')
 const [maxLength, setMaxLength] = useState<string>('')
 const [minWidth, setMinWidth] = useState<string>('')
 const [minHeight, setMinHeight] = useState<string>('')
 const [productionCapacity, setProductionCapacity] = useState<string>('150')
 const [capacityUnit, setCapacityUnit] = useState('sft/hour')
 const [estimatedSpeed, setEstimatedSpeed] = useState<string>('200')
 const [speedUnit, setSpeedUnit] = useState('sft/hour')
 const [setupTimeMins, setSetupTimeMins] = useState<string>('10')
 const [changeoverTimeMins, setChangeoverTimeMins] = useState<string>('5')
 const [supportedMaterials, setSupportedMaterials] = useState<string>('Panaflex, Vinyl, Backlit, Mesh, Canvas')
 const [supportedProductionTypes, setSupportedProductionTypes] = useState<string>('Eco-Solvent Print, Outdoor Banner')
 const [defaultOperatorRequirement, setDefaultOperatorRequirement] = useState('Skilled Print Operator')
 const [operatorsRequiredCount, setOperatorsRequiredCount] = useState<string>('1')

  // Costing Specs Form State
 const [purchaseCost, setPurchaseCost] = useState<string>('0')
 const [hourlyMachineCost, setHourlyMachineCost] = useState<string>('350')
 const [perUnitMachineCost, setPerUnitMachineCost] = useState<string>('2.5')
 const [electricityCostPerHour, setElectricityCostPerHour] = useState<string>('80')
 const [maintenanceCostPerHour, setMaintenanceCostPerHour] = useState<string>('40')
 const [otherOperatingCostPerHour, setOtherOperatingCostPerHour] = useState<string>('20')

  // Initialize form when opening or editing
 useEffect(() => {
 if (machinery) {
 setName(machinery.name || '')
 setCode(machinery.code || '')
 setMachineType((machinery.machine_type as MachineryType) || 'large_format_printing')
 setCategory((machinery.category as MachineryCategory) || 'printing')
 setDepartment((machinery.department as MachineryDepartment) || 'printing')
 setBrand(machinery.brand || '')
 setModel(machinery.model || '')
 setSerialNumber(machinery.serial_number || '')
 setLocation(machinery.location || '')
 setSupplier(machinery.supplier || '')
 setPurchaseDate(machinery.purchase_date || '')
 setInstallationDate(machinery.installation_date || '')
 setWarrantyExpiry(machinery.warranty_expiry || '')
 setDescription(machinery.description || '')

 setDimensionUnit((machinery.dimension_unit as DimensionUnit) || 'inch')
 setMaxWidth(machinery.max_width?.toString() || '')
 setMaxHeight(machinery.max_height?.toString() || '')
 setMaxLength(machinery.max_length?.toString() || '')
 setMinWidth(machinery.min_width?.toString() || '')
 setMinHeight(machinery.min_height?.toString() || '')
 setProductionCapacity(machinery.production_capacity?.toString() || '')
 setCapacityUnit(machinery.capacity_unit || 'sft/hour')
 setEstimatedSpeed(machinery.estimated_speed?.toString() || '')
 setSpeedUnit(machinery.speed_unit || 'sft/hour')
 setSetupTimeMins(machinery.setup_time_mins?.toString() || '0')
 setChangeoverTimeMins(machinery.changeover_time_mins?.toString() || '0')
 setSupportedMaterials((machinery.supported_materials || []).join(', '))
 setSupportedProductionTypes((machinery.supported_production_types || []).join(', '))
 setDefaultOperatorRequirement(machinery.default_operator_requirement || '')
 setOperatorsRequiredCount(machinery.operators_required_count?.toString() || '1')

 setPurchaseCost(machinery.purchase_cost?.toString() || '0')
 setHourlyMachineCost(machinery.hourly_machine_cost?.toString() || '0')
 setPerUnitMachineCost(machinery.per_unit_machine_cost?.toString() || '0')
 setElectricityCostPerHour(machinery.electricity_cost_per_hour?.toString() || '0')
 setMaintenanceCostPerHour(machinery.maintenance_cost_per_hour?.toString() || '0')
 setOtherOperatingCostPerHour(machinery.other_operating_cost_per_hour?.toString() || '0')
    } else {
      // Reset to defaults
 setName('')
 setCode('')
 setMachineType('large_format_printing')
 setCategory('printing')
 setDepartment('printing')
 setBrand('')
 setModel('')
 setSerialNumber('')
 setLocation('')
 setSupplier('')
 setPurchaseDate('')
 setInstallationDate('')
 setWarrantyExpiry('')
 setDescription('')

 setDimensionUnit('inch')
 setMaxWidth('126') // 10.5 ft standard banner width
 setMaxHeight('1000')
 setMaxLength('')
 setMinWidth('12')
 setMinHeight('12')
 setProductionCapacity('200')
 setCapacityUnit('sft/hour')
 setEstimatedSpeed('250')
 setSpeedUnit('sft/hour')
 setSetupTimeMins('10')
 setChangeoverTimeMins('5')
 setSupportedMaterials('Panaflex, Vinyl, Backlit, Mesh, Canvas')
 setSupportedProductionTypes('Eco-Solvent Print, Outdoor Banner')
 setDefaultOperatorRequirement('Skilled Print Operator')
 setOperatorsRequiredCount('1')

 setPurchaseCost('1200000')
 setHourlyMachineCost('350')
 setPerUnitMachineCost('2.5')
 setElectricityCostPerHour('80')
 setMaintenanceCostPerHour('40')
 setOtherOperatingCostPerHour('20')
    }
 setError(null)
 setActiveTab('basic')
  }, [machinery, open])

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 setError(null)
 setLoading(true)

 try {
 if (!name.trim()) throw new Error('Machine name is required.')
 if (!code.trim()) throw new Error('Machine code is required.')

 const payload = {
 name: name.trim(),
 code: code.trim().toUpperCase(),
 machine_type: machineType,
 category,
 department,
 brand: brand.trim() || null,
 model: model.trim() || null,
 serial_number: serialNumber.trim() || null,
 location: location.trim() || null,
 supplier: supplier.trim() || null,
 purchase_date: purchaseDate || null,
 installation_date: installationDate || null,
 warranty_expiry: warrantyExpiry || null,
 description: description.trim() || null,

 dimension_unit: dimensionUnit,
 max_width: maxWidth ? Number(maxWidth) : null,
 max_height: maxHeight ? Number(maxHeight) : null,
 max_length: maxLength ? Number(maxLength) : null,
 min_width: minWidth ? Number(minWidth) : null,
 min_height: minHeight ? Number(minHeight) : null,
 production_capacity: Number(productionCapacity) || 0,
 capacity_unit: capacityUnit.trim() || 'sft/hour',
 estimated_speed: Number(estimatedSpeed) || 0,
 speed_unit: speedUnit.trim() || 'sft/hour',
 setup_time_mins: Number(setupTimeMins) || 0,
 changeover_time_mins: Number(changeoverTimeMins) || 0,
 supported_materials: supportedMaterials
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
 supported_production_types: supportedProductionTypes
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
 default_operator_requirement: defaultOperatorRequirement.trim() || null,
 operators_required_count: Number(operatorsRequiredCount) || 1,

 purchase_cost: Number(purchaseCost) || 0,
 hourly_machine_cost: Number(hourlyMachineCost) || 0,
 per_unit_machine_cost: Number(perUnitMachineCost) || 0,
 electricity_cost_per_hour: Number(electricityCostPerHour) || 0,
 maintenance_cost_per_hour: Number(maintenanceCostPerHour) || 0,
 other_operating_cost_per_hour: Number(otherOperatingCostPerHour) || 0,
      }

 let res
 if (isEdit && machinery?.id) {
 res = await updateMachineryAction(machinery.id, payload)
      } else {
 res = await createMachineryAction(payload)
      }

 if (!res.success || !res.data) {
 throw new Error(res.error || 'Failed to save machinery.')
      }

 onOpenChange(false)
 if (onSuccess) onSuccess(res.data)
    } catch (err: any) {
 setError(err.message || 'An error occurred while saving machinery.')
    } finally {
 setLoading(false)
    }
  }

 return (
    <ModalDialog
 open={open}
 onOpenChange={onOpenChange}
 title={isEdit ? tBilingual(`Edit Machinery — ${machinery?.name}`, `যন্ত্রপাতি সম্পাদনা — ${machinery?.name}`) : tBilingual('+ Add New Machinery', '+ নতুন যন্ত্রপাতি যোগ করুন')}
 description={tBilingual('Configure machine specifications, operational limits, maintenance parameters, and costing.', 'মেশিনের স্পেসিফিকেশন, অপারেশনাল সীমা, রক্ষণাবেক্ষণ পরামিতি ও খরচ কনফিগার করুন।')}size="4xl"hideFooter
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <Alert variant="destructive"className="py-2.5">
            <AlertCircle className="h-4 w-4"/>
            <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
          </Alert>
        )}

        {/* Section Tabs */}
        <div className="flex border-b border-border gap-1 sm:gap-2">
          <button
 type="button"onClick={() => setActiveTab('basic')}
 className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-colors ${
 activeTab === 'basic'
                ? 'border-border text-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-foreground'
            }`}
          >
            <Cpu className="h-3.5 w-3.5"/>
            <span>{tBilingual('1. Basic Profile', '১. প্রাথমিক বিবরণ')}</span>
          </button>
          <button
 type="button"onClick={() => setActiveTab('production')}
 className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-colors ${
 activeTab === 'production'
                ? 'border-border text-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-foreground'
            }`}
          >
            <Sliders className="h-3.5 w-3.5"/>
            <span>{tBilingual('2. Production & Dimensions', '২. উৎপাদন ও আকার')}</span>
          </button>
          <button
 type="button"onClick={() => setActiveTab('costing')}
 className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-colors ${
 activeTab === 'costing'
                ? 'border-border text-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-foreground'
            }`}
          >
            <DollarSign className="h-3.5 w-3.5"/>
            <span>{tBilingual('3. Operating Costing', '৩. পরিচালন ও খরচ')}</span>
          </button>
        </div>

        {/* TAB 1: BASIC INFORMATION */}
        {activeTab === 'basic' && (
          <div className="space-y-3.5 py-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mName"required>Machine Name</Label>
                <Input
 id="mName"placeholder={tBilingual('e.g. Flora Polar 3200 Solvent 10ft', 'যেমন: Flora Polar 3200 Solvent 10ft')}value={name}
 onChange={(e) => setName(e.target.value)}
 required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mCode"required>Machine Code / ID</Label>
                <Input
 id="mCode"placeholder={tBilingual('e.g. PRN-01, CNC-02, LAS-01', 'যেমন: PRN-01, CNC-02, LAS-01')}value={code}
 onChange={(e) => setCode(e.target.value)}
 required
 className="tabular-nums uppercase font-bold tracking-wider"/>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mType"required>Machine Type</Label>
                <select
 id="mType"value={machineType}
 onChange={(e) => setMachineType(e.target.value as MachineryType)}
 className="w-full h-10 px-3 rounded-md border border-input bg-card text-xs font-semibold">
                  {MACHINE_TYPES.map((t) => (<option key={t.value} value={t.value}>{locale === 'bn' ? t.labelBn : t.label}</option>))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mCat">{tBilingual('Fleet Category', 'ক্যাটাগরি')}</Label>
                <select
 id="mCat"value={category}
 onChange={(e) => setCategory(e.target.value as MachineryCategory)}
 className="w-full h-10 px-3 rounded-md border border-input bg-card text-xs font-semibold">
                  {CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{locale === 'bn' ? c.labelBn : c.label}</option>))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mDept">{tBilingual('Department', 'বিভাগ')}</Label>
                <select
 id="mDept"value={department}
 onChange={(e) => setDepartment(e.target.value as MachineryDepartment)}
 className="w-full h-10 px-3 rounded-md border border-input bg-card text-xs font-semibold">
                  {DEPARTMENTS.map((d) => (<option key={d.value} value={d.value}>{locale === 'bn' ? d.labelBn : d.label}</option>))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mBrand">{tBilingual('Brand / Manufacturer', 'ব্র্যান্ড / প্রস্তুতকারক')}</Label>
                <Input
 id="mBrand"placeholder={tBilingual('e.g. Roland, Konica Minolta, Flora, Epson', 'যেমন: Roland, Konica Minolta, Flora, Epson')}value={brand}
 onChange={(e) => setBrand(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mModel">{tBilingual('Model Number', 'মডেল নম্বর')}</Label>
                <Input
 id="mModel"placeholder={tBilingual('e.g. AccurioPress C4070, SureColor S80600', 'যেমন: AccurioPress C4070, SureColor S80600')}value={model}
 onChange={(e) => setModel(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mSerial">{tBilingual('Serial Number', 'সিরিয়াল নম্বর')}</Label>
                <Input
 id="mSerial"placeholder={tBilingual('e.g. SN-98234-2023', 'যেমন: SN-98234-2023')}value={serialNumber}
 onChange={(e) => setSerialNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mLoc">{tBilingual('Floor Location', 'ফ্লোর লোকেশন')}</Label>
                <Input
 id="mLoc"placeholder={tBilingual('e.g. Bay 2, Ground Floor Press Hub', 'যেমন: বে ২, নিচতলা প্রেস হাব')}value={location}
 onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mSupp">{tBilingual('Supplier / Vendor', 'সরবরাহকারী / ভেন্ডর')}</Label>
                <Input
 id="mSupp"placeholder={tBilingual('e.g. ACI Machinery, DigiPrint BD', 'যেমন: এসিআই মেশিনারি, ডিজিপিন্ট বিডি')}value={supplier}
 onChange={(e) => setSupplier(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mPurDate">{tBilingual('Purchase Date', 'ক্রয়ের তারিখ')}</Label>
                <Input
 id="mPurDate"type="date"value={purchaseDate}
 onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mWarr">{tBilingual('Warranty Expiry Date', 'ওয়ারেন্টির মেয়াদ উত্তীর্ণের তারিখ')}</Label>
                <Input
 id="mWarr"type="date"value={warrantyExpiry}
 onChange={(e) => setWarrantyExpiry(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mDesc">{tBilingual('Description & Notes', 'বিবরণ ও মন্তব্য')}</Label>
                <Input
 id="mDesc"placeholder={tBilingual('e.g. 4-head Konica 512i printhead configuration with takeup roll', 'যেমন: ৪-হেড কনিকা ৫১২i প্রিন্টহেড ও টেক-আপ রোল')}value={description}
 onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTION SPECIFICATIONS */}
        {activeTab === 'production' && (
          <div className="space-y-3.5 py-1">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mDimUnit">{tBilingual('Dimension Unit', 'পরিমাপের একক')}</Label>
                <select
 id="mDimUnit"value={dimensionUnit}
 onChange={(e) => setDimensionUnit(e.target.value as DimensionUnit)}
 className="w-full h-10 px-3 rounded-md border border-input bg-card text-xs font-semibold">
                  <option value="inch">{tBilingual('Inches (in)', 'ইঞ্চি (in)')}</option>
                  <option value="ft">{tBilingual('Feet (ft)', 'ফুট (ft)')}</option>
                  <option value="mm">{tBilingual('Millimeters (mm)', 'মিলিমিটার (mm)')}</option>
                  <option value="cm">{tBilingual('Centimeters (cm)', 'সেন্টিমিটার (cm)')}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mMaxW">{tBilingual(`Max Width (${dimensionUnit})`, `সর্বোচ্চ প্রস্থ (${dimensionUnit})`)}</Label>
                <Input
 id="mMaxW"type="number"step="0.1"placeholder="e.g. 126"value={maxWidth}
 onChange={(e) => setMaxWidth(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mMaxH">{tBilingual('Max Height / Roll Length', 'সর্বোচ্চ উচ্চতা / রোল দৈর্ঘ্য')}</Label>
                <Input
 id="mMaxH"type="number"step="0.1"placeholder="e.g. 1800"value={maxHeight}
 onChange={(e) => setMaxHeight(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mMinW">{tBilingual(`Min Width (${dimensionUnit})`, `সর্বনিম্ন প্রস্থ (${dimensionUnit})`)}</Label>
                <Input
 id="mMinW"type="number"step="0.1"placeholder="e.g. 12"value={minWidth}
 onChange={(e) => setMinWidth(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mCap">{tBilingual(`Capacity (${capacityUnit})`, `উৎপাদন ক্ষমতা (${capacityUnit})`)}</Label>
                <Input
 id="mCap"type="number"step="1"placeholder="e.g. 200"value={productionCapacity}
 onChange={(e) => setProductionCapacity(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mCapUnit">{tBilingual('Capacity Unit', 'ক্ষমতার একক')}</Label>
                <Input
 id="mCapUnit"placeholder="e.g. sft/hour, pcs/hour, sheets/hr"value={capacityUnit}
 onChange={(e) => setCapacityUnit(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mSpeed">{tBilingual('Estimated Running Speed', 'আনুমানিক কাজের গতি')}</Label>
                <Input
 id="mSpeed"type="number"step="1"placeholder="e.g. 250"value={estimatedSpeed}
 onChange={(e) => setEstimatedSpeed(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mSetup">{tBilingual('Setup Time (Mins)', 'সেটআপ সময় (মিনিট)')}</Label>
                <Input
 id="mSetup"type="number"step="1"placeholder="e.g. 10"value={setupTimeMins}
 onChange={(e) => setSetupTimeMins(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mChange">{tBilingual('Changeover Time (Mins)', 'চেঞ্জওভার সময় (মিনিট)')}</Label>
                <Input
 id="mChange"type="number"step="1"placeholder="e.g. 5"value={changeoverTimeMins}
 onChange={(e) => setChangeoverTimeMins(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mOps">{tBilingual('Operators Required', 'প্রয়োজনীয় অপারেটর সংখ্যা')}</Label>
                <Input
 id="mOps"type="number"step="1"min="1"value={operatorsRequiredCount}
 onChange={(e) => setOperatorsRequiredCount(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mMats">{tBilingual('Supported Materials (Comma separated)', 'সমর্থিত কাঁচামাল (কমা দিয়ে আলাদা)')}</Label>
              <Input
 id="mMats"placeholder="Panaflex 440gsm, PVC Vinyl 100mic, Backlit Film, Mesh, Canvas"value={supportedMaterials}
 onChange={(e) => setSupportedMaterials(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mTypes">{tBilingual('Supported Production Types', 'সমর্থিত উৎপাদন ধরণ')}</Label>
              <Input
 id="mTypes"placeholder="Digital Solvent Print, Outdoor Signage, Vehicle Wrap"value={supportedProductionTypes}
 onChange={(e) => setSupportedProductionTypes(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* TAB 3: COSTING INFORMATION */}
        {activeTab === 'costing' && (
          <div className="space-y-3.5 py-1">
            <div className="p-3 rounded-lg bg-primary/10 bg-primary/10 border border-primary/20 border-border text-xs text-primary text-primary">
              {tBilingual('💡 V4 Costing Readiness: Machine hourly and operating costs are used for accurate live job costing, electricity attribution, and floor profit margin auditing.', '💡 খরচ নির্ধারণ: প্রতি ঘণ্টার মেশিন খরচ ও পরিচালন ব্যয় নির্ভুল জব কস্টিং, বিদ্যুৎ খরচ বণ্টন ও ফ্লোর প্রফিট মার্জিনের জন্য ব্যবহৃত হয়।')}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mPurCost">{tBilingual('Purchase Cost (৳ BDT)', 'ক্রয় মূল্য (৳)')}</Label>
                <Input
 id="mPurCost"type="number"step="1000"placeholder="e.g. 1200000"value={purchaseCost}
 onChange={(e) => setPurchaseCost(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mHourCost">{tBilingual('Hourly Machine Run Rate (৳/Hour)', 'প্রতি ঘণ্টার মেশিন রেট (৳/ঘণ্টা)')}</Label>
                <Input
 id="mHourCost"type="number"step="10"placeholder="e.g. 350"value={hourlyMachineCost}
 onChange={(e) => setHourlyMachineCost(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mPerUnit">{tBilingual('Per-Unit / Per-SFT Overhead (৳)', 'প্রতি ইউনিট / প্রতি SFT খরচ (৳)')}</Label>
                <Input
 id="mPerUnit"type="number"step="0.1"placeholder="e.g. 2.5"value={perUnitMachineCost}
 onChange={(e) => setPerUnitMachineCost(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mElec">{tBilingual('Electricity Cost / Hour (৳)', 'বিদ্যুৎ খরচ / ঘণ্টা (৳)')}</Label>
                <Input
 id="mElec"type="number"step="5"placeholder="e.g. 80"value={electricityCostPerHour}
 onChange={(e) => setElectricityCostPerHour(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mMaintCost">{tBilingual('Maintenance Buffer / Hour (৳)', 'রক্ষণাবেক্ষণ বাফার / ঘণ্টা (৳)')}</Label>
                <Input
 id="mMaintCost"type="number"step="5"placeholder="e.g. 40"value={maintenanceCostPerHour}
 onChange={(e) => setMaintenanceCostPerHour(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mOtherCost">{tBilingual('Other Operating Overheads (৳/Hour)', 'অন্যান্য পরিচালনা ব্যয় (৳/ঘণ্টা)')}</Label>
                <Input
 id="mOtherCost"type="number"step="5"placeholder="e.g. 20"value={otherOperatingCostPerHour}
 onChange={(e) => setOtherOperatingCostPerHour(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-2 pt-3 border-t border-border">
          <Button
 type="button"variant="outline"onClick={() => onOpenChange(false)}
 disabled={loading}
 className="w-full sm:w-auto min-h-[40px]">
 Cancel
          </Button>

          <div className="flex gap-2 w-full sm:w-auto">
            {activeTab !== 'costing' ? (
              <Button
 type="button"variant="outline"onClick={() => {
 if (activeTab === 'basic') setActiveTab('production')
 else if (activeTab === 'production') setActiveTab('costing')
                }}
 className="w-full sm:w-auto min-h-10">{tBilingual('Next Section ➔', 'পরবর্তী ধাপ ➔')}</Button>
            ) : null}

            <Button
 type="submit"isLoading={loading}
 className="w-full sm:w-auto min-h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold">{isEdit ? tBilingual('Save Changes', 'পরিবর্তন সংরক্ষণ') : tBilingual('Register Machine', 'মেশিন নিবন্ধন করুন')}</Button>
          </div>
        </div>
      </form>
    </ModalDialog>
  )
}
