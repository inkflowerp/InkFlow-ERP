export interface Division {
  id: number
  name: string
  name_bn: string
  code: string
}

export interface District {
  id: number
  division_id: number
  name: string
  name_bn: string
  code: string
}

export interface Upazila {
  id: number
  district_id: number
  name: string
  name_bn: string
}

export interface BangladeshAddress {
  division_id?: number
  district_id?: number
  upazila_id?: number
  area?: string
  full_address: string
  full_address_bn?: string
}
