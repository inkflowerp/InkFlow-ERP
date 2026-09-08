import { createClient } from '@/lib/supabase/client'
import { ProfileRow } from '@/types/auth.types'
import { ApiResponse } from '@/types/common.types'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { CompanyUserWithProfile } from '@/types/tenant.types'
import { DEMO_COMPANY_USERS } from '@/services/company-users.service'
import { TENANT_SESSION_COOKIE, TenantSessionData } from '@/lib/auth/types'

export class UserService {
  static async getProfile(userId: string): Promise<ApiResponse<ProfileRow>> {
    try {
      // 1. Check DataStore
      const users =
        PrintERPDataStore.get<CompanyUserWithProfile[]>(STORAGE_KEYS.COMPANY_USERS) ||
        DEMO_COMPANY_USERS

      const userMatch = users.find((u) => u.user_id === userId || u.id === userId)
      if (userMatch && userMatch.profile) {
        return { success: true, data: userMatch.profile as ProfileRow }
      }

      // 2. Query Supabase
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle()

        if (!error && data) {
          return { success: true, data: data as ProfileRow }
        }
      } catch {
        // Continue
      }

      return {
        success: false,
        error: 'User profile not found',
      }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch user profile',
      }
    }
  }

  static async updateProfile(
    userId: string,
    updates: Partial<ProfileRow>
  ): Promise<ApiResponse<ProfileRow>> {
    try {
      // 1. Update in DataStore
      const users =
        PrintERPDataStore.get<CompanyUserWithProfile[]>(STORAGE_KEYS.COMPANY_USERS) ||
        DEMO_COMPANY_USERS

      let updatedProfile: ProfileRow | null = null

      const updatedUsers = users.map((u) => {
        if (u.user_id === userId || u.id === userId) {
          const currentProfile = u.profile || {
            id: userId,
            email: u.invited_email || '',
            full_name: 'User',
            full_name_bn: null,
            phone: null,
            avatar_url: null,
            preferred_locale: 'bn',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          updatedProfile = {
            ...currentProfile,
            ...updates,
            updated_at: new Date().toISOString(),
          }

          return {
            ...u,
            profile: updatedProfile,
            updated_at: new Date().toISOString(),
          }
        }
        return u
      })

      PrintERPDataStore.set(STORAGE_KEYS.COMPANY_USERS, updatedUsers)

      // 2. If this is the current active session user, update session cookie
      if (typeof document !== 'undefined' && updatedProfile) {
        const match = document.cookie
          .split('; ')
          .find((row) => row.startsWith(`${TENANT_SESSION_COOKIE}=`))
        if (match) {
          try {
            const raw = match.split('=')[1]
            const session: TenantSessionData = JSON.parse(decodeURIComponent(raw))
            if (session.userId === userId) {
              session.fullName = (updatedProfile as ProfileRow).full_name || session.fullName
              session.fullNameBn = (updatedProfile as ProfileRow).full_name_bn || session.fullNameBn
              session.phone = (updatedProfile as ProfileRow).phone || session.phone
              const encoded = encodeURIComponent(JSON.stringify(session))
              document.cookie = `${TENANT_SESSION_COOKIE}=${encoded}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax;`
              window.dispatchEvent(new CustomEvent('printerp_auth_changed', { detail: session }))
            }
          } catch {
            // Ignore
          }
        }
      }

      // 3. Attempt Supabase profile update
      try {
        const supabase = createClient()
        await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId)
      } catch {
        // Fallback to local DataStore result
      }

      if (updatedProfile) {
        return { success: true, data: updatedProfile }
      }

      return { success: false, error: 'User not found to update' }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update profile',
      }
    }
  }
}
