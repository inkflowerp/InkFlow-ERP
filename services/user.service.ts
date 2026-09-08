import { createClient } from '@/lib/supabase/client'
import { ProfileRow } from '@/types/auth.types'
import { ApiResponse } from '@/types/common.types'
import { TENANT_SESSION_COOKIE, TenantSessionData } from '@/lib/auth/types'

export class UserService {
  static async getProfile(userId: string): Promise<ApiResponse<ProfileRow>> {
    try {
      if (!userId) return { success: false, error: 'User ID is required' }
      const supabase = createClient()
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (!error && data) {
        return { success: true, data: data as ProfileRow }
      }

      // Check profiles view/table fallback
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (!profileErr && profileData) {
        return { success: true, data: profileData as ProfileRow }
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
      if (!userId) return { success: false, error: 'User ID is required' }
      const supabase = createClient()
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .maybeSingle()

      if (error) {
        // Fallback update to profiles
        await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId)
      }

      // Update session cookie if active in browser
      if (typeof document !== 'undefined') {
        const match = document.cookie
          .split('; ')
          .find((row) => row.startsWith(`${TENANT_SESSION_COOKIE}=`))
        if (match) {
          try {
            const raw = match.split('=')[1]
            const session: TenantSessionData = JSON.parse(decodeURIComponent(raw))
            if (session.userId === userId) {
              if (updates.full_name) session.fullName = updates.full_name
              if (updates.full_name_bn) session.fullNameBn = updates.full_name_bn
              if (updates.phone) session.phone = updates.phone
              const encoded = encodeURIComponent(JSON.stringify(session))
              document.cookie = `${TENANT_SESSION_COOKIE}=${encoded}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax;`
              window.dispatchEvent(new CustomEvent('printerp_auth_changed', { detail: session }))
            }
          } catch {
            // Ignore
          }
        }
      }

      return {
        success: true,
        data: (data || updates) as ProfileRow,
      }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update profile',
      }
    }
  }
}

