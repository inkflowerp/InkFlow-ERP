export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          slug: string
          name: string
          name_bn: string | null
          legal_name: string | null
          trade_license_no: string | null
          bin_no: string | null
          tin_no: string | null
          business_type: string
          phone: string | null
          whatsapp: string | null
          email: string | null
          website: string | null
          division_id: number | null
          district_id: number | null
          upazila_id: number | null
          area: string | null
          address: string | null
          address_bn: string | null
          office_hours: string | null
          holidays: string | null
          currency: string
          default_locale: string
          logo_url: string | null
          is_active: boolean
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          name_bn?: string | null
          legal_name?: string | null
          trade_license_no?: string | null
          bin_no?: string | null
          tin_no?: string | null
          business_type?: string
          phone?: string | null
          whatsapp?: string | null
          email?: string | null
          website?: string | null
          division_id?: number | null
          district_id?: number | null
          upazila_id?: number | null
          area?: string | null
          address?: string | null
          address_bn?: string | null
          office_hours?: string | null
          holidays?: string | null
          currency?: string
          default_locale?: string
          logo_url?: string | null
          is_active?: boolean
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          name_bn?: string | null
          legal_name?: string | null
          trade_license_no?: string | null
          bin_no?: string | null
          tin_no?: string | null
          business_type?: string
          phone?: string | null
          whatsapp?: string | null
          email?: string | null
          website?: string | null
          division_id?: number | null
          district_id?: number | null
          upazila_id?: number | null
          area?: string | null
          address?: string | null
          address_bn?: string | null
          office_hours?: string | null
          holidays?: string | null
          currency?: string
          default_locale?: string
          logo_url?: string | null
          is_active?: boolean
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          id: string
          company_id: string
          invoice_prefix: string
          quotation_prefix: string
          challan_prefix: string
          vat_enabled: boolean
          vat_rate: number
          default_currency: string
          default_language: string
          phone: string | null
          whatsapp: string | null
          email: string | null
          logo_url: string | null
          office_hours: string | null
          holidays: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          invoice_prefix?: string
          quotation_prefix?: string
          challan_prefix?: string
          vat_enabled?: boolean
          vat_rate?: number
          default_currency?: string
          default_language?: string
          phone?: string | null
          whatsapp?: string | null
          email?: string | null
          logo_url?: string | null
          office_hours?: string | null
          holidays?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          invoice_prefix?: string
          quotation_prefix?: string
          challan_prefix?: string
          vat_enabled?: boolean
          vat_rate?: number
          default_currency?: string
          default_language?: string
          phone?: string | null
          whatsapp?: string | null
          email?: string | null
          logo_url?: string | null
          office_hours?: string | null
          holidays?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      branches: {
        Row: {
          id: string
          company_id: string
          name: string
          name_bn: string | null
          code: string
          legal_name: string | null
          phone: string | null
          email: string | null
          address: string | null
          division_id: number | null
          district_id: number | null
          upazila_id: number | null
          area: string | null
          full_address: string | null
          full_address_bn: string | null
          is_main: boolean
          is_active: boolean
          status: string
          manager_id: string | null
          manager_name: string | null
          operating_hours: string | null
          timezone: string
          document_numbering_config: Json | null
          financial_settings: Json | null
          production_capabilities: Json | null
          contact_person: string | null
          contact_phone: string | null
          contact_email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          name_bn?: string | null
          code: string
          legal_name?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          division_id?: number | null
          district_id?: number | null
          upazila_id?: number | null
          area?: string | null
          full_address?: string | null
          full_address_bn?: string | null
          is_main?: boolean
          is_active?: boolean
          status?: string
          manager_id?: string | null
          manager_name?: string | null
          operating_hours?: string | null
          timezone?: string
          document_numbering_config?: Json | null
          financial_settings?: Json | null
          production_capabilities?: Json | null
          contact_person?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          name_bn?: string | null
          code?: string
          legal_name?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          division_id?: number | null
          district_id?: number | null
          upazila_id?: number | null
          area?: string | null
          full_address?: string | null
          full_address_bn?: string | null
          is_main?: boolean
          is_active?: boolean
          status?: string
          manager_id?: string | null
          manager_name?: string | null
          operating_hours?: string | null
          timezone?: string
          document_numbering_config?: Json | null
          financial_settings?: Json | null
          production_capabilities?: Json | null
          contact_person?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          full_name_bn: string | null
          phone: string | null
          avatar_url: string | null
          preferred_locale: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          full_name_bn?: string | null
          phone?: string | null
          avatar_url?: string | null
          preferred_locale?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          full_name_bn?: string | null
          phone?: string | null
          avatar_url?: string | null
          preferred_locale?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          id: string
          company_id: string | null
          name: string
          name_bn: string | null
          slug: string
          description: string | null
          is_system: boolean
          created_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          name: string
          name_bn?: string | null
          slug: string
          description?: string | null
          is_system?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          name?: string
          name_bn?: string | null
          slug?: string
          description?: string | null
          is_system?: boolean
          created_at?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          id: string
          code: string
          module: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          module: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          module?: string
          name?: string
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          id: string
          role_id: string
          permission_id: string
          created_at: string
        }
        Insert: {
          id?: string
          role_id: string
          permission_id: string
          created_at?: string
        }
        Update: {
          id?: string
          role_id?: string
          permission_id?: string
          created_at?: string
        }
        Relationships: []
      }
      company_users: {
        Row: {
          id: string
          company_id: string
          user_id: string
          branch_id: string | null
          status: 'active' | 'disabled' | 'invited'
          invited_email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          branch_id?: string | null
          status?: 'active' | 'disabled' | 'invited'
          invited_email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string
          branch_id?: string | null
          status?: 'active' | 'disabled' | 'invited'
          invited_email?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          company_user_id: string
          role_id: string
          company_id: string
          created_at: string
        }
        Insert: {
          id?: string
          company_user_id: string
          role_id: string
          company_id: string
          created_at?: string
        }
        Update: {
          id?: string
          company_user_id?: string
          role_id?: string
          company_id?: string
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          full_name_bn: string | null
          phone: string | null
          avatar_url: string | null
          preferred_locale: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          full_name_bn?: string | null
          phone?: string | null
          avatar_url?: string | null
          preferred_locale?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          full_name_bn?: string | null
          phone?: string | null
          avatar_url?: string | null
          preferred_locale?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenant_memberships: {
        Row: {
          id: string
          company_id: string
          user_id: string
          role: 'owner' | 'admin' | 'manager' | 'operator' | 'accountant' | 'designer' | 'installer'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          role: 'owner' | 'admin' | 'manager' | 'operator' | 'accountant' | 'designer' | 'installer'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'manager' | 'operator' | 'accountant' | 'designer' | 'installer'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          company_id: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: []
      }
      divisions: {
        Row: {
          id: number
          name: string
          name_bn: string
          code: string
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          name_bn: string
          code: string
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          name_bn?: string
          code?: string
          created_at?: string
        }
        Relationships: []
      }
      districts: {
        Row: {
          id: number
          division_id: number
          name: string
          name_bn: string
          code: string
          created_at: string
        }
        Insert: {
          id?: number
          division_id: number
          name: string
          name_bn: string
          code: string
          created_at?: string
        }
        Update: {
          id?: number
          division_id?: number
          name?: string
          name_bn?: string
          code?: string
          created_at?: string
        }
        Relationships: []
      }
      upazilas: {
        Row: {
          id: number
          district_id: number
          name: string
          name_bn: string
          created_at: string
        }
        Insert: {
          id?: number
          district_id: number
          name: string
          name_bn: string
          created_at?: string
        }
        Update: {
          id?: number
          district_id?: number
          name?: string
          name_bn?: string
          created_at?: string
        }
        Relationships: []
      }
      branch_transfer_requests: {
        Row: {
          id: string
          company_id: string
          transfer_number: string
          from_branch_id: string
          from_location_id: string | null
          to_branch_id: string
          to_location_id: string | null
          material_id: string
          material_name: string
          quantity: number
          unit: string
          status: string
          requested_by: string | null
          requested_by_name: string | null
          approved_by: string | null
          approved_by_name: string | null
          approved_at: string | null
          dispatched_by: string | null
          dispatched_by_name: string | null
          dispatched_at: string | null
          received_by: string | null
          received_by_name: string | null
          received_at: string | null
          rejection_reason: string | null
          notes: string | null
          idempotency_key: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          transfer_number: string
          from_branch_id: string
          from_location_id?: string | null
          to_branch_id: string
          to_location_id?: string | null
          material_id: string
          material_name: string
          quantity: number
          unit: string
          status?: string
          requested_by?: string | null
          requested_by_name?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          approved_at?: string | null
          dispatched_by?: string | null
          dispatched_by_name?: string | null
          dispatched_at?: string | null
          received_by?: string | null
          received_by_name?: string | null
          received_at?: string | null
          rejection_reason?: string | null
          notes?: string | null
          idempotency_key?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          transfer_number?: string
          from_branch_id?: string
          from_location_id?: string | null
          to_branch_id?: string
          to_location_id?: string | null
          material_id?: string
          material_name?: string
          quantity?: number
          unit?: string
          status?: string
          requested_by?: string | null
          requested_by_name?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          approved_at?: string | null
          dispatched_by?: string | null
          dispatched_by_name?: string | null
          dispatched_at?: string | null
          received_by?: string | null
          received_by_name?: string | null
          received_at?: string | null
          rejection_reason?: string | null
          notes?: string | null
          idempotency_key?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      inter_branch_financial_transfers: {
        Row: {
          id: string
          company_id: string
          transfer_number: string
          from_branch_id: string
          to_branch_id: string
          from_account_id: string | null
          to_account_id: string | null
          amount: number
          currency: string
          status: string
          requested_by: string | null
          requested_by_name: string | null
          approved_by: string | null
          approved_by_name: string | null
          approved_at: string | null
          reference: string | null
          notes: string | null
          idempotency_key: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          transfer_number: string
          from_branch_id: string
          to_branch_id: string
          from_account_id?: string | null
          to_account_id?: string | null
          amount: number
          currency?: string
          status?: string
          requested_by?: string | null
          requested_by_name?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          approved_at?: string | null
          reference?: string | null
          notes?: string | null
          idempotency_key?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          transfer_number?: string
          from_branch_id?: string
          to_branch_id?: string
          from_account_id?: string | null
          to_account_id?: string | null
          amount?: number
          currency?: string
          status?: string
          requested_by?: string | null
          requested_by_name?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          approved_at?: string | null
          reference?: string | null
          notes?: string | null
          idempotency_key?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      employee_branch_assignments: {
        Row: {
          id: string
          company_id: string
          employee_id: string
          branch_id: string
          start_date: string
          end_date: string | null
          is_temporary: boolean
          status: string
          assigned_by: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          employee_id: string
          branch_id: string
          start_date: string
          end_date?: string | null
          is_temporary?: boolean
          status?: string
          assigned_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          employee_id?: string
          branch_id?: string
          start_date?: string
          end_date?: string | null
          is_temporary?: boolean
          status?: string
          assigned_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workflow_configurations: {
        Row: {
          id: string
          company_id: string
          branch_id: string | null
          workflow_type: string
          rules: Json
          is_active: boolean
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          branch_id?: string | null
          workflow_type: string
          rules?: Json
          is_active?: boolean
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          branch_id?: string | null
          workflow_type?: string
          rules?: Json
          is_active?: boolean
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_branch_access: {
        Row: {
          id: string
          company_id: string
          user_id: string
          branch_id: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          branch_id: string
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string
          branch_id?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_user_has_permission: {
        Args: {
          target_company_id: string
          required_permission: string
        }
        Returns: boolean
      }
      auth_get_user_company_role: {
        Args: {
          target_company_id: string
        }
        Returns: string
      }
      auth_is_platform_owner: {
        Args: Record<string, never>
        Returns: boolean
      }
      auth_is_active_company_user: {
        Args: {
          target_company_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
