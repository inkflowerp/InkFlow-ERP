import { BD_DIVISIONS, BD_DISTRICTS, KEY_PRINTING_UPAZILAS } from '@/i18n/geo-data'
import { Division, District, Upazila } from '@/types/geo.types'

export class GeoService {
  static getDivisions(): Division[] {
    return BD_DIVISIONS
  }

  static getDistrictsByDivision(divisionId: number): District[] {
    return BD_DISTRICTS.filter((d) => d.division_id === divisionId)
  }

  static getDistrictById(districtId: number): District | undefined {
    return BD_DISTRICTS.find((d) => d.id === districtId)
  }

  static getUpazilasByDistrict(districtId: number): Upazila[] {
    return KEY_PRINTING_UPAZILAS.filter((u) => u.district_id === districtId)
  }
}
