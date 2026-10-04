import { createAdminClient } from '../supabase/admin.ts'
import { createClient } from '../supabase/server.ts'
import type { Database } from '../../types/database.types.ts'

export interface CreateAuthUserParams {
  email: string
  password?: string
  fullName: string
  fullNameBn?: string | null
  phone?: string | null
}

export interface CompanyUserRecordInput {
  company_id: string
  user_id: string
  branch_id?: string | null
  status: string
  department?: string | null
  responsibilities?: string[] | null
  data_scopes?: Record<string, unknown>
  raw_overrides?: Record<string, unknown> | null
  invited_email?: string | null
  is_active?: boolean
}

export class CompanyUsersRepository {
  /**
   * Repository-mediated admin client accessor for company user operations
   */
  static getAdminClient() {
    return createAdminClient()
  }

  /**
   * Repository-mediated server client accessor
   */
  static async getServerClient() {
    return await createClient()
  }

  /**
   * Find an auth user by email
   */
  static async findAuthUserByEmail(email: string) {
    const admin = createAdminClient()
    const { data: userList } = await admin.auth.admin.listUsers()
    return userList?.users?.find(
      (u: { email?: string; id: string }) => u.email?.toLowerCase() === email.trim().toLowerCase()
    ) || null
  }

  /**
   * Create an auth user via admin API
   */
  static async createAuthUser(params: CreateAuthUserParams) {
    const admin = createAdminClient()
    return await admin.auth.admin.createUser({
      email: params.email.trim().toLowerCase(),
      password: params.password,
      email_confirm: true,
      user_metadata: {
        full_name: params.fullName,
        full_name_bn: params.fullNameBn || null,
        phone: params.phone,
        preferred_locale: 'bn',
      },
    })
  }

  /**
   * Invite an auth user by email via admin API
   */
  static async inviteAuthUserByEmail(email: string, metadata?: Record<string, unknown>) {
    const admin = createAdminClient()
    return await admin.auth.admin.inviteUserByEmail(email.trim().toLowerCase(), {
      data: metadata || { preferred_locale: 'bn' },
    })
  }

  /**
   * Generate an invite or reset link
   */
  static async generateLink(type: 'invite' | 'magiclink' | 'recovery', email: string) {
    const admin = createAdminClient()
    return await admin.auth.admin.generateLink({
      type: type as any,
      email: email.trim().toLowerCase(),
    })
  }

  /**
   * Dispatch password reset email
   */
  static async resetPasswordForEmail(email: string) {
    const supabase = await createClient()
    return await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase())
  }

  /**
   * Update auth user password directly
   */
  static async updateAuthUserPassword(userId: string, newPassword: string) {
    const admin = createAdminClient()
    return await admin.auth.admin.updateUserById(userId, {
      password: newPassword,
    })
  }

  /**
   * Upsert a user profile
   */
  static async upsertUserProfile(profile: {
    id: string
    email?: string | null
    full_name?: string | null
    full_name_bn?: string | null
    phone?: string | null
    is_active?: boolean
    preferred_locale?: string
  }) {
    const admin = createAdminClient()
    return await admin.from('user_profiles').upsert(profile as any)
  }

  /**
   * Get user profile by ID
   */
  static async getUserProfile(userId: string) {
    const admin = createAdminClient()
    const { data } = await admin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    return data
  }

  /**
   * Find company user by company and user ID
   */
  static async findCompanyUser(companyId: string, userId: string) {
    const admin = createAdminClient()
    const { data } = await admin
      .from('company_users')
      .select('*')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .maybeSingle()
    return data
  }

  /**
   * Find company user by membership ID
   */
  static async findCompanyUserById(membershipId: string) {
    const admin = createAdminClient()
    const { data } = await admin
      .from('company_users')
      .select('*')
      .eq('id', membershipId)
      .maybeSingle()
    return data
  }

  /**
   * Insert a company user membership
   */
  static async insertCompanyUser(record: CompanyUserRecordInput) {
    const admin = createAdminClient()
    return await admin.from('company_users').insert(record as any).select().single()
  }

  /**
   * Update a company user membership
   */
  static async updateCompanyUser(id: string, updates: Partial<CompanyUserRecordInput>) {
    const admin = createAdminClient()
    return await admin.from('company_users').update(updates as any).eq('id', id).select().single()
  }

  /**
   * Delete a company user membership
   */
  static async deleteCompanyUser(id: string) {
    const admin = createAdminClient()
    return await admin.from('company_users').delete().eq('id', id)
  }

  /**
   * Assign or update user roles
   */
  static async setUserRole(companyUserId: string, companyId: string, roleId: string) {
    const admin = createAdminClient()
    // Remove existing roles for this company
    await admin.from('user_roles').delete().eq('company_user_id', companyUserId).eq('company_id', companyId)
    // Insert new role
    return await admin.from('user_roles').insert({
      company_user_id: companyUserId,
      company_id: companyId,
      role_id: roleId,
    })
  }

  /**
   * Get active owners count for last-active-owner protection
   */
  static async getActiveOwnersCount(companyId: string): Promise<number> {
    const admin = createAdminClient()
    const { data: ownerRoles } = await admin
      .from('roles')
      .select('id')
      .or(`slug.eq.business_owner,slug.eq.owner`)

    if (!ownerRoles || ownerRoles.length === 0) return 1

    const ownerRoleIds = ownerRoles.map((r: { id: string }) => r.id)
    const { count } = await admin
      .from('user_roles')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .in('role_id', ownerRoleIds)

    return count ?? 0
  }

  /**
   * Authoritative SSR server session establishment
   */
  static async establishServerSession(email: string, customDomain?: string): Promise<boolean> {
    const { establishServerSession } = await import('../supabase/server.ts')
    return establishServerSession(email, customDomain)
  }

  /**
   * OAuth initiation via Supabase Auth
   */
  static async signInWithOAuth(options: { provider: 'google'; redirectTo: string }) {
    const supabase = await createClient()
    return await supabase.auth.signInWithOAuth({
      provider: options.provider,
      options: {
        redirectTo: options.redirectTo,
      },
    })
  }

  /**
   * Resolves platform admin email from input identifier
   */
  static async resolvePlatformAdminEmail(emailInput: string): Promise<string> {
    const adminClient = createAdminClient()
    let resolvedEmail = emailInput.toLowerCase()

    const { classifyLoginIdentifier } = await import('../auth/identifier-helper.ts')
    const classification = classifyLoginIdentifier(emailInput)
    if (classification.type === 'phone' && classification.phoneVariants) {
      const { data: adminByPhone } = await (adminClient as any)
        .from('platform_admins')
        .select('email')
        .in('phone', classification.phoneVariants.candidates)
        .eq('is_active', true)
        .maybeSingle()

      if (adminByPhone?.email) {
        resolvedEmail = adminByPhone.email.toLowerCase()
      }
    } else if (classification.type === 'email') {
      resolvedEmail = classification.normalized
    } else {
      const { data: adminByPrefix } = await (adminClient as any)
        .from('platform_admins')
        .select('email')
        .ilike('email', `${emailInput}@%`)
        .eq('is_active', true)
        .maybeSingle()

      if (adminByPrefix?.email) {
        resolvedEmail = adminByPrefix.email.toLowerCase()
      }
    }

    if (!resolvedEmail.includes('@')) {
      const { AuthService } = await import('../../services/auth.service.ts')
      try {
        resolvedEmail = await AuthService.resolveLoginEmail(emailInput)
      } catch {
        resolvedEmail = emailInput.toLowerCase()
      }
    }

    return resolvedEmail
  }

  /**
   * Authenticates password against Supabase Auth
   */
  static async authenticateWithPassword(email: string, password: string) {
    const supabase = await createClient()
    return await supabase.auth.signInWithPassword({
      email,
      password,
    })
  }

  /**
   * Signs out current Supabase Auth session
   */
  static async signOutSession() {
    const supabase = await createClient()
    return await supabase.auth.signOut()
  }

  /**
   * Verifies and synchronizes active platform admin membership
   */
  static async getAndSyncPlatformAdmin(authUserId: string, email?: string | null): Promise<any | null> {
    const adminClient = createAdminClient()
    let { data: adminRecord, error: adminErr } = await (adminClient as any)
      .from('platform_admins')
      .select('*')
      .eq('user_id', authUserId)
      .eq('is_active', true)
      .maybeSingle()

    if (!adminRecord && email) {
      const emailToMatch = email.toLowerCase()
      const { data: recordByEmail } = await (adminClient as any)
        .from('platform_admins')
        .select('*')
        .ilike('email', emailToMatch)
        .eq('is_active', true)
        .maybeSingle()

      if (recordByEmail) {
        adminRecord = recordByEmail
        if (recordByEmail.user_id !== authUserId) {
          try {
            await (adminClient as any)
              .from('platform_admins')
              .update({ user_id: authUserId, updated_at: new Date().toISOString() })
              .eq('id', recordByEmail.id)
          } catch {}
        }
      }
    }

    if (adminErr || !adminRecord) {
      return null
    }

    return adminRecord
  }

  /**
   * Retrieves current authenticated user from server session
   */
  static async getAuthUser() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    return data?.user || null
  }

  /**
   * Records an active platform admin session
   */
  static async recordPlatformActiveSession(session: {
    platform_admin_id: string
    session_token_hash: string
    ip_address: string | null
    user_agent: string | null
    device_name: string
    location?: string
    is_revoked?: boolean
    last_seen_at?: string
  }) {
    try {
      const admin = createAdminClient()
      await (admin as any).from('platform_active_sessions').insert({
        ...session,
        location: session.location || 'Bangladesh',
        is_revoked: session.is_revoked ?? false,
        last_seen_at: session.last_seen_at || new Date().toISOString(),
      })
    } catch {
      // Non-blocking
    }
  }
}
