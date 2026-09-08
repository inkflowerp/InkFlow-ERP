'use client'

import React, { useState } from 'react'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BD_DIVISIONS, BD_DISTRICTS, KEY_PRINTING_UPAZILAS } from '@/i18n/geo-data'
import { useI18n } from '@/i18n/context'

interface BangladeshAddressPickerProps {
  divisionId?: number
  districtId?: number
  upazilaId?: number
  address?: string
  addressBn?: string
  onChange: (addressData: {
    divisionId?: number
    districtId?: number
    upazilaId?: number
    address: string
    addressBn?: string
  }) => void
}

export function BangladeshAddressPicker({
  divisionId = 1, // Default Dhaka
  districtId = 1, // Default Dhaka District
  upazilaId,
  address = '',
  addressBn = '',
  onChange,
}: BangladeshAddressPickerProps) {
  const { locale, t, tBilingual } = useI18n()

  const [selectedDivision, setSelectedDivision] = useState<number>(divisionId)
  const [selectedDistrict, setSelectedDistrict] = useState<number>(districtId)
  const [selectedUpazila, setSelectedUpazila] = useState<number | undefined>(upazilaId)
  const [streetAddress, setStreetAddress] = useState<string>(address)
  const [streetAddressBn, setStreetAddressBn] = useState<string>(addressBn)

  // Filter districts by division
  const availableDistricts = BD_DISTRICTS.filter((d) => d.division_id === selectedDivision)

  // Filter upazilas by district
  const availableUpazilas = KEY_PRINTING_UPAZILAS.filter((u) => u.district_id === selectedDistrict)

  const handleDivisionChange = (divId: number) => {
    setSelectedDivision(divId)
    const firstDistrict = BD_DISTRICTS.find((d) => d.division_id === divId)
    const newDistrictId = firstDistrict ? firstDistrict.id : 1
    setSelectedDistrict(newDistrictId)
    setSelectedUpazila(undefined)

    onChange({
      divisionId: divId,
      districtId: newDistrictId,
      upazilaId: undefined,
      address: streetAddress,
      addressBn: streetAddressBn,
    })
  }

  const handleDistrictChange = (distId: number) => {
    setSelectedDistrict(distId)
    setSelectedUpazila(undefined)

    onChange({
      divisionId: selectedDivision,
      districtId: distId,
      upazilaId: undefined,
      address: streetAddress,
      addressBn: streetAddressBn,
    })
  }

  const handleUpazilaChange = (upId: number) => {
    setSelectedUpazila(upId)
    onChange({
      divisionId: selectedDivision,
      districtId: selectedDistrict,
      upazilaId: upId,
      address: streetAddress,
      addressBn: streetAddressBn,
    })
  }

  const handleAddressChange = (text: string) => {
    setStreetAddress(text)
    onChange({
      divisionId: selectedDivision,
      districtId: selectedDistrict,
      upazilaId: selectedUpazila,
      address: text,
      addressBn: streetAddressBn,
    })
  }

  const handleAddressBnChange = (text: string) => {
    setStreetAddressBn(text)
    onChange({
      divisionId: selectedDivision,
      districtId: selectedDistrict,
      upazilaId: selectedUpazila,
      address: streetAddress,
      addressBn: text,
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Division */}
        <div className="space-y-1.5">
          <Label required>{t('onboarding.division')}</Label>
          <Select
            value={selectedDivision}
            onChange={(e) => handleDivisionChange(Number(e.target.value))}
          >
            {BD_DIVISIONS.map((div) => (
              <option key={div.id} value={div.id}>
                {tBilingual(div.name, div.name_bn)}
              </option>
            ))}
          </Select>
        </div>

        {/* District */}
        <div className="space-y-1.5">
          <Label required>{t('onboarding.district')}</Label>
          <Select
            value={selectedDistrict}
            onChange={(e) => handleDistrictChange(Number(e.target.value))}
          >
            {availableDistricts.map((dist) => (
              <option key={dist.id} value={dist.id}>
                {tBilingual(dist.name, dist.name_bn)}
              </option>
            ))}
          </Select>
        </div>

        {/* Upazila / Thana */}
        <div className="space-y-1.5">
          <Label>{t('onboarding.upazila')}</Label>
          <Select
            value={selectedUpazila || ''}
            onChange={(e) => handleUpazilaChange(Number(e.target.value))}
          >
            <option value="">{t('common.select_option')}</option>
            {availableUpazilas.map((up) => (
              <option key={up.id} value={up.id}>
                {tBilingual(up.name, up.name_bn)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Street Address in English & Bengali */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label required>{t('onboarding.address')}</Label>
          <Input
            value={streetAddress}
            onChange={(e) => handleAddressChange(e.target.value)}
            placeholder="e.g., Plot 12, Fakirapool Printing Market, Motijheel"
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t('onboarding.address_bn')}</Label>
          <Input
            value={streetAddressBn}
            onChange={(e) => handleAddressBnChange(e.target.value)}
            placeholder="যেমন: প্লট ১২, ফকিরাপুল প্রিন্টিং মার্কেট, মতিঝিল"
          />
        </div>
      </div>
    </div>
  )
}
