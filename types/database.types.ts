export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      _printerp_migrations: {
        Row: {
          applied_at: string
          id: number
          name: string
        }
        Insert: {
          applied_at?: string
          id?: number
          name: string
        }
        Update: {
          applied_at?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      account_transfers: {
        Row: {
          amount: number
          branch_id: string | null
          company_id: string
          created_at: string
          created_by_name: string
          fee_amount: number
          from_account_id: string
          id: string
          notes: string | null
          status: string
          to_account_id: string
          transaction_id: string | null
          transfer_date: string
          transfer_number: string
        }
        Insert: {
          amount: number
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by_name: string
          fee_amount?: number
          from_account_id: string
          id?: string
          notes?: string | null
          status?: string
          to_account_id: string
          transaction_id?: string | null
          transfer_date?: string
          transfer_number: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by_name?: string
          fee_amount?: number
          from_account_id?: string
          id?: string
          notes?: string | null
          status?: string
          to_account_id?: string
          transaction_id?: string | null
          transfer_date?: string
          transfer_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_transfers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_transfers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_transfers_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          account_subtype: string
          account_type: string
          branch_id: string | null
          code: string
          company_id: string
          created_at: string
          currency: string
          current_balance: number
          id: string
          is_active: boolean
          is_system: boolean
          metadata: Json | null
          name: string
          name_bn: string | null
          opening_balance: number
          updated_at: string
        }
        Insert: {
          account_subtype: string
          account_type: string
          branch_id?: string | null
          code: string
          company_id: string
          created_at?: string
          currency?: string
          current_balance?: number
          id?: string
          is_active?: boolean
          is_system?: boolean
          metadata?: Json | null
          name: string
          name_bn?: string | null
          opening_balance?: number
          updated_at?: string
        }
        Update: {
          account_subtype?: string
          account_type?: string
          branch_id?: string | null
          code?: string
          company_id?: string
          created_at?: string
          currency?: string
          current_balance?: number
          id?: string
          is_active?: boolean
          is_system?: boolean
          metadata?: Json | null
          name?: string
          name_bn?: string | null
          opening_balance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      additional_options: {
        Row: {
          company_id: string
          cost: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_bn: string | null
          pricing_method: string
          product_id: string | null
          selling_price: number
          updated_at: string
        }
        Insert: {
          company_id: string
          cost?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_bn?: string | null
          pricing_method?: string
          product_id?: string | null
          selling_price?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          cost?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_bn?: string | null
          pricing_method?: string
          product_id?: string | null
          selling_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "additional_options_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "additional_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_audit_logs: {
        Row: {
          action_type: string
          actor_id: string | null
          actor_name: string
          company_id: string
          created_at: string
          details: Json
          employee_id: string | null
          id: string
          ip_address: string | null
          location_id: string | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          actor_id?: string | null
          actor_name: string
          company_id: string
          created_at?: string
          details?: Json
          employee_id?: string | null
          id?: string
          ip_address?: string | null
          location_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string | null
          actor_name?: string
          company_id?: string
          created_at?: string
          details?: Json
          employee_id?: string | null
          id?: string
          ip_address?: string | null
          location_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_audit_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_audit_logs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "attendance_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_corrections: {
        Row: {
          attendance_date: string
          attendance_record_id: string | null
          company_id: string
          created_at: string
          employee_id: string
          id: string
          reason: string
          requested_by: string | null
          requested_time: string
          requested_type: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attendance_date: string
          attendance_record_id?: string | null
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          reason: string
          requested_by?: string | null
          requested_time: string
          requested_type: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          attendance_record_id?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          reason?: string
          requested_by?: string | null
          requested_time?: string
          requested_type?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_corrections_attendance_record_id_fkey"
            columns: ["attendance_record_id"]
            isOneToOne: false
            referencedRelation: "attendance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_corrections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_corrections_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_daily_summaries: {
        Row: {
          approved_by_id: string | null
          approved_by_name: string | null
          approved_ot_minutes: number
          attendance_date: string
          attendance_source: string
          branch_id: string | null
          check_in_at: string | null
          check_in_time: string | null
          check_out_at: string | null
          check_out_time: string | null
          company_id: string
          correction_status: string | null
          created_at: string
          early_leave_minutes: number
          employee_id: string
          id: string
          job_order_id: string | null
          late_minutes: number
          leave_type: string | null
          location_id: string | null
          notes: string | null
          potential_ot_minutes: number
          shift_id: string | null
          status: string
          updated_at: string
          worked_minutes: number
        }
        Insert: {
          approved_by_id?: string | null
          approved_by_name?: string | null
          approved_ot_minutes?: number
          attendance_date?: string
          attendance_source?: string
          branch_id?: string | null
          check_in_at?: string | null
          check_in_time?: string | null
          check_out_at?: string | null
          check_out_time?: string | null
          company_id: string
          correction_status?: string | null
          created_at?: string
          early_leave_minutes?: number
          employee_id: string
          id?: string
          job_order_id?: string | null
          late_minutes?: number
          leave_type?: string | null
          location_id?: string | null
          notes?: string | null
          potential_ot_minutes?: number
          shift_id?: string | null
          status?: string
          updated_at?: string
          worked_minutes?: number
        }
        Update: {
          approved_by_id?: string | null
          approved_by_name?: string | null
          approved_ot_minutes?: number
          attendance_date?: string
          attendance_source?: string
          branch_id?: string | null
          check_in_at?: string | null
          check_in_time?: string | null
          check_out_at?: string | null
          check_out_time?: string | null
          company_id?: string
          correction_status?: string | null
          created_at?: string
          early_leave_minutes?: number
          employee_id?: string
          id?: string
          job_order_id?: string | null
          late_minutes?: number
          leave_type?: string | null
          location_id?: string | null
          notes?: string | null
          potential_ot_minutes?: number
          shift_id?: string | null
          status?: string
          updated_at?: string
          worked_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "attendance_daily_summaries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_daily_summaries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_daily_summaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_daily_summaries_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_daily_summaries_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "attendance_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_daily_summaries_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_locations: {
        Row: {
          address: string | null
          branch_id: string | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          max_accuracy_meters: number
          name: string
          radius_meters: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          branch_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          max_accuracy_meters?: number
          name: string
          radius_meters?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          branch_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          max_accuracy_meters?: number
          name?: string
          radius_meters?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_locations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_qr_tokens: {
        Row: {
          company_id: string
          created_at: string
          expires_at: string | null
          generated_by: string | null
          id: string
          is_active: boolean
          location_id: string
          revoked_at: string | null
          token_hash: string
          token_prefix: string
        }
        Insert: {
          company_id: string
          created_at?: string
          expires_at?: string | null
          generated_by?: string | null
          id?: string
          is_active?: boolean
          location_id: string
          revoked_at?: string | null
          token_hash: string
          token_prefix: string
        }
        Update: {
          company_id?: string
          created_at?: string
          expires_at?: string | null
          generated_by?: string | null
          id?: string
          is_active?: boolean
          location_id?: string
          revoked_at?: string | null
          token_hash?: string
          token_prefix?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_qr_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_qr_tokens_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "attendance_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          approved_overtime_hours: number | null
          attendance_date: string
          attendance_type: string
          branch_id: string | null
          checked_at: string
          company_id: string
          created_at: string
          device_info: Json | null
          distance_from_location_meters: number
          employee_id: string
          gps_accuracy_meters: number
          id: string
          is_overtime_approved: boolean | null
          job_order_id: string | null
          latitude: number
          location_id: string | null
          longitude: number
          notes: string | null
          overtime_minutes: number | null
          qr_token_id: string | null
          shift_id: string | null
          user_id: string | null
          verification_reason: string | null
          verification_status: string
          workforce_labor_cost: number | null
        }
        Insert: {
          approved_overtime_hours?: number | null
          attendance_date?: string
          attendance_type: string
          branch_id?: string | null
          checked_at?: string
          company_id: string
          created_at?: string
          device_info?: Json | null
          distance_from_location_meters: number
          employee_id: string
          gps_accuracy_meters: number
          id?: string
          is_overtime_approved?: boolean | null
          job_order_id?: string | null
          latitude: number
          location_id?: string | null
          longitude: number
          notes?: string | null
          overtime_minutes?: number | null
          qr_token_id?: string | null
          shift_id?: string | null
          user_id?: string | null
          verification_reason?: string | null
          verification_status?: string
          workforce_labor_cost?: number | null
        }
        Update: {
          approved_overtime_hours?: number | null
          attendance_date?: string
          attendance_type?: string
          branch_id?: string | null
          checked_at?: string
          company_id?: string
          created_at?: string
          device_info?: Json | null
          distance_from_location_meters?: number
          employee_id?: string
          gps_accuracy_meters?: number
          id?: string
          is_overtime_approved?: boolean | null
          job_order_id?: string | null
          latitude?: number
          location_id?: string | null
          longitude?: number
          notes?: string | null
          overtime_minutes?: number | null
          qr_token_id?: string | null
          shift_id?: string | null
          user_id?: string | null
          verification_reason?: string | null
          verification_status?: string
          workforce_labor_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "attendance_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_qr_token_id_fkey"
            columns: ["qr_token_id"]
            isOneToOne: false
            referencedRelation: "attendance_qr_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      attendances: {
        Row: {
          attendance_date: string
          check_in_time: string | null
          check_out_time: string | null
          company_id: string
          created_at: string
          employee_id: string
          id: string
          late_minutes: number
          leave_type: string | null
          notes: string | null
          overtime_hours: number
          status: string
        }
        Insert: {
          attendance_date?: string
          check_in_time?: string | null
          check_out_time?: string | null
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          late_minutes?: number
          leave_type?: string | null
          notes?: string | null
          overtime_hours?: number
          status: string
        }
        Update: {
          attendance_date?: string
          check_in_time?: string | null
          check_out_time?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          late_minutes?: number
          leave_type?: string | null
          notes?: string | null
          overtime_hours?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          device_metadata: Json | null
          entity: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_value: Json | null
          new_values: Json | null
          old_values: Json | null
          previous_value: Json | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          device_metadata?: Json | null
          entity?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          previous_value?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          device_metadata?: Json | null
          entity?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          previous_value?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_verifications: {
        Row: {
          attempts: number
          created_at: string
          email: string
          expires_at: string
          id: string
          is_used: boolean
          max_attempts: number
          metadata: Json | null
          otp_hash: string | null
          purpose: string
          resend_available_at: string
          token_hash: string | null
          updated_at: string
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          email: string
          expires_at: string
          id?: string
          is_used?: boolean
          max_attempts?: number
          metadata?: Json | null
          otp_hash?: string | null
          purpose: string
          resend_available_at?: string
          token_hash?: string | null
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          max_attempts?: number
          metadata?: Json | null
          otp_hash?: string | null
          purpose?: string
          resend_available_at?: string
          token_hash?: string | null
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          branch_name: string | null
          company_id: string
          created_at: string
          current_balance: number
          id: string
          is_active: boolean
          opening_balance: number
          routing_number: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          branch_name?: string | null
          company_id: string
          created_at?: string
          current_balance?: number
          id?: string
          is_active?: boolean
          opening_balance?: number
          routing_number?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          branch_name?: string | null
          company_id?: string
          created_at?: string
          current_balance?: number
          id?: string
          is_active?: boolean
          opening_balance?: number
          routing_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statement_lines: {
        Row: {
          balance: number
          company_id: string
          created_at: string
          credit: number
          debit: number
          description: string
          id: string
          line_date: string
          matched_journal_line_id: string | null
          matched_transaction_id: string | null
          reconciled_at: string | null
          reconciliation_status: string
          reference_number: string | null
          statement_id: string
        }
        Insert: {
          balance?: number
          company_id: string
          created_at?: string
          credit?: number
          debit?: number
          description: string
          id?: string
          line_date: string
          matched_journal_line_id?: string | null
          matched_transaction_id?: string | null
          reconciled_at?: string | null
          reconciliation_status?: string
          reference_number?: string | null
          statement_id: string
        }
        Update: {
          balance?: number
          company_id?: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string
          id?: string
          line_date?: string
          matched_journal_line_id?: string | null
          matched_transaction_id?: string | null
          reconciled_at?: string | null
          reconciliation_status?: string
          reference_number?: string | null
          statement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_statement_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_lines_matched_journal_line_id_fkey"
            columns: ["matched_journal_line_id"]
            isOneToOne: false
            referencedRelation: "journal_entry_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_lines_matched_transaction_id_fkey"
            columns: ["matched_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_lines_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "bank_statements"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statements: {
        Row: {
          account_id: string
          branch_id: string | null
          closing_balance: number
          company_id: string
          created_at: string
          end_date: string
          id: string
          imported_by_id: string | null
          imported_by_name: string
          opening_balance: number
          start_date: string
          statement_identifier: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          branch_id?: string | null
          closing_balance?: number
          company_id: string
          created_at?: string
          end_date: string
          id?: string
          imported_by_id?: string | null
          imported_by_name?: string
          opening_balance?: number
          start_date: string
          statement_identifier: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          branch_id?: string | null
          closing_balance?: number
          company_id?: string
          created_at?: string
          end_date?: string
          id?: string
          imported_by_id?: string | null
          imported_by_name?: string
          opening_balance?: number
          start_date?: string
          statement_identifier?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_statements_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          area: string | null
          bin_number: string | null
          branch_name_bn: string | null
          code: string
          company_id: string
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          district_id: number | null
          division_id: number | null
          document_numbering_config: Json | null
          email: string | null
          financial_settings: Json | null
          full_address: string | null
          full_address_bn: string | null
          id: string
          is_active: boolean
          is_main: boolean
          legal_name: string | null
          manager_id: string | null
          manager_name: string | null
          name: string
          name_bn: string | null
          operating_hours: string | null
          phone: string | null
          production_capabilities: Json | null
          status: string
          timezone: string
          upazila_id: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          area?: string | null
          bin_number?: string | null
          branch_name_bn?: string | null
          code: string
          company_id: string
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          district_id?: number | null
          division_id?: number | null
          document_numbering_config?: Json | null
          email?: string | null
          financial_settings?: Json | null
          full_address?: string | null
          full_address_bn?: string | null
          id?: string
          is_active?: boolean
          is_main?: boolean
          legal_name?: string | null
          manager_id?: string | null
          manager_name?: string | null
          name: string
          name_bn?: string | null
          operating_hours?: string | null
          phone?: string | null
          production_capabilities?: Json | null
          status?: string
          timezone?: string
          upazila_id?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          area?: string | null
          bin_number?: string | null
          branch_name_bn?: string | null
          code?: string
          company_id?: string
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          district_id?: number | null
          division_id?: number | null
          document_numbering_config?: Json | null
          email?: string | null
          financial_settings?: Json | null
          full_address?: string | null
          full_address_bn?: string | null
          id?: string
          is_active?: boolean
          is_main?: boolean
          legal_name?: string | null
          manager_id?: string | null
          manager_name?: string | null
          name?: string
          name_bn?: string | null
          operating_hours?: string | null
          phone?: string | null
          production_capabilities?: Json | null
          status?: string
          timezone?: string
          upazila_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      business_categories: {
        Row: {
          code: string
          description_bn: string | null
          description_en: string | null
          icon: string | null
          name_bn: string
          name_en: string
          sort_order: number
        }
        Insert: {
          code: string
          description_bn?: string | null
          description_en?: string | null
          icon?: string | null
          name_bn: string
          name_en: string
          sort_order?: number
        }
        Update: {
          code?: string
          description_bn?: string | null
          description_en?: string | null
          icon?: string | null
          name_bn?: string
          name_en?: string
          sort_order?: number
        }
        Relationships: []
      }
      cash_book_entries: {
        Row: {
          amount: number
          category: string
          company_id: string
          created_at: string
          description: string
          entry_date: string
          entry_type: string
          id: string
          performed_by_name: string
          reference_id: string | null
        }
        Insert: {
          amount: number
          category: string
          company_id: string
          created_at?: string
          description: string
          entry_date?: string
          entry_type: string
          id?: string
          performed_by_name: string
          reference_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          company_id?: string
          created_at?: string
          description?: string
          entry_date?: string
          entry_type?: string
          id?: string
          performed_by_name?: string
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_book_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_closings: {
        Row: {
          account_id: string
          adjustment_transaction_id: string | null
          approved_at: string | null
          approved_by_name: string | null
          branch_id: string | null
          cash_inflows: number
          cash_outflows: number
          closed_by_name: string
          closing_date: string
          closing_number: string
          company_id: string
          counted_cash: number
          created_at: string
          expected_cash: number
          id: string
          opening_cash: number
          status: string
          updated_at: string
          variance: number
          variance_reason: string | null
        }
        Insert: {
          account_id: string
          adjustment_transaction_id?: string | null
          approved_at?: string | null
          approved_by_name?: string | null
          branch_id?: string | null
          cash_inflows?: number
          cash_outflows?: number
          closed_by_name: string
          closing_date?: string
          closing_number: string
          company_id: string
          counted_cash?: number
          created_at?: string
          expected_cash?: number
          id?: string
          opening_cash?: number
          status?: string
          updated_at?: string
          variance?: number
          variance_reason?: string | null
        }
        Update: {
          account_id?: string
          adjustment_transaction_id?: string | null
          approved_at?: string | null
          approved_by_name?: string | null
          branch_id?: string | null
          cash_inflows?: number
          cash_outflows?: number
          closed_by_name?: string
          closing_date?: string
          closing_number?: string
          company_id?: string
          counted_cash?: number
          created_at?: string
          expected_cash?: number
          id?: string
          opening_cash?: number
          status?: string
          updated_at?: string
          variance?: number
          variance_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_closings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_closings_adjustment_transaction_id_fkey"
            columns: ["adjustment_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_closings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_closings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      challan_items: {
        Row: {
          challan_id: string
          created_at: string
          dimensions_spec: string | null
          id: string
          product_description: string
          quantity: number
          remarks: string | null
          unit: string
        }
        Insert: {
          challan_id: string
          created_at?: string
          dimensions_spec?: string | null
          id?: string
          product_description: string
          quantity: number
          remarks?: string | null
          unit: string
        }
        Update: {
          challan_id?: string
          created_at?: string
          dimensions_spec?: string | null
          id?: string
          product_description?: string
          quantity?: number
          remarks?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "challan_items_challan_id_fkey"
            columns: ["challan_id"]
            isOneToOne: false
            referencedRelation: "delivery_challans"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_channels_config: {
        Row: {
          account_or_user_id: string | null
          api_key_or_password: string | null
          channel_type: string
          company_id: string
          extra_settings: Json | null
          id: string
          is_enabled: boolean
          provider_name: string
          sender_id_or_phone: string | null
          updated_at: string
        }
        Insert: {
          account_or_user_id?: string | null
          api_key_or_password?: string | null
          channel_type: string
          company_id: string
          extra_settings?: Json | null
          id?: string
          is_enabled?: boolean
          provider_name: string
          sender_id_or_phone?: string | null
          updated_at?: string
        }
        Update: {
          account_or_user_id?: string | null
          api_key_or_password?: string | null
          channel_type?: string
          company_id?: string
          extra_settings?: Json | null
          id?: string
          is_enabled?: boolean
          provider_name?: string
          sender_id_or_phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_channels_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_jobs: {
        Row: {
          attempts: number
          channel: string
          completed_at: string | null
          created_at: string
          event_type: string | null
          id: string
          idempotency_key: string | null
          last_error: string | null
          locked_at: string | null
          max_attempts: number
          next_attempt_at: string
          next_retry_at: string | null
          payload: Json
          priority: number
          provider: string
          recipient: string
          recipient_customer_id: string | null
          recipient_email: string | null
          recipient_phone: string | null
          recipient_user_id: string | null
          related_id: string | null
          related_type: string | null
          status: string
          template_key: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          channel?: string
          completed_at?: string | null
          created_at?: string
          event_type?: string | null
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          locked_at?: string | null
          max_attempts?: number
          next_attempt_at?: string
          next_retry_at?: string | null
          payload?: Json
          priority?: number
          provider?: string
          recipient: string
          recipient_customer_id?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          recipient_user_id?: string | null
          related_id?: string | null
          related_type?: string | null
          status?: string
          template_key?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          channel?: string
          completed_at?: string | null
          created_at?: string
          event_type?: string | null
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          locked_at?: string | null
          max_attempts?: number
          next_attempt_at?: string
          next_retry_at?: string | null
          payload?: Json
          priority?: number
          provider?: string
          recipient?: string
          recipient_customer_id?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          recipient_user_id?: string | null
          related_id?: string | null
          related_type?: string | null
          status?: string
          template_key?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_logs: {
        Row: {
          channel: string
          company_id: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          failed_at: string | null
          gateway_id: string | null
          id: string
          message_content: string
          metadata: Json | null
          provider_message_id: string | null
          provider_used: string
          recipient_destination: string
          recipient_name: string
          retry_count: number
          sent_at: string | null
          sent_by: string | null
          status: string
        }
        Insert: {
          channel: string
          company_id: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          gateway_id?: string | null
          id?: string
          message_content: string
          metadata?: Json | null
          provider_message_id?: string | null
          provider_used: string
          recipient_destination: string
          recipient_name: string
          retry_count?: number
          sent_at?: string | null
          sent_by?: string | null
          status?: string
        }
        Update: {
          channel?: string
          company_id?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          gateway_id?: string | null
          id?: string
          message_content?: string
          metadata?: Json | null
          provider_message_id?: string | null
          provider_used?: string
          recipient_destination?: string
          recipient_name?: string
          retry_count?: number
          sent_at?: string | null
          sent_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "gateway_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          attempts: number
          branch_id: string | null
          channel: string
          company_id: string
          created_at: string
          delivered_at: string | null
          error_code: string | null
          error_message: string | null
          id: string
          idempotency_key: string | null
          message_content: string
          metadata: Json | null
          provider: string
          provider_message_id: string | null
          read_at: string | null
          recipient_destination: string
          recipient_name: string
          sent_at: string | null
          sent_by: string | null
          status: string
          subject: string | null
          template_key: string | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          attempts?: number
          branch_id?: string | null
          channel: string
          company_id: string
          created_at?: string
          delivered_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          message_content: string
          metadata?: Json | null
          provider: string
          provider_message_id?: string | null
          read_at?: string | null
          recipient_destination: string
          recipient_name: string
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject?: string | null
          template_key?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          attempts?: number
          branch_id?: string | null
          channel?: string
          company_id?: string
          created_at?: string
          delivered_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          message_content?: string
          metadata?: Json | null
          provider?: string
          provider_message_id?: string | null
          read_at?: string | null
          recipient_destination?: string
          recipient_name?: string
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject?: string | null
          template_key?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_messages_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_templates: {
        Row: {
          body_bn: string
          body_en: string
          channel: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_bn: string | null
          subject_bn: string | null
          subject_en: string | null
          template_key: string
          updated_at: string
          variables: Json
        }
        Insert: {
          body_bn: string
          body_en: string
          channel?: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_bn?: string | null
          subject_bn?: string | null
          subject_en?: string | null
          template_key: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          body_bn?: string
          body_en?: string
          channel?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_bn?: string | null
          subject_bn?: string | null
          subject_en?: string | null
          template_key?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "communication_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          address_bn: string | null
          archived_at: string | null
          area: string | null
          bin_no: string | null
          bin_number: string | null
          business_type: string
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          date_format: string | null
          default_currency: string | null
          default_language: string | null
          default_locale: string
          district_id: number | null
          division_id: number | null
          email: string | null
          fiscal_year_start: string | null
          full_address_bn: string | null
          holidays: string | null
          id: string
          is_active: boolean
          legal_name: string | null
          legal_name_bn: string | null
          logo_url: string | null
          name: string
          name_bn: string | null
          number_format: string | null
          office_hours: string | null
          owner_id: string | null
          phone: string | null
          settings: Json
          slug: string
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          tin_no: string | null
          tin_number: string | null
          trade_license_no: string | null
          trade_license_number: string | null
          trade_name: string | null
          trade_name_bn: string | null
          upazila_id: number | null
          updated_at: string
          vat_circle: string | null
          vat_commissionerate: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          address_bn?: string | null
          archived_at?: string | null
          area?: string | null
          bin_no?: string | null
          bin_number?: string | null
          business_type?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          date_format?: string | null
          default_currency?: string | null
          default_language?: string | null
          default_locale?: string
          district_id?: number | null
          division_id?: number | null
          email?: string | null
          fiscal_year_start?: string | null
          full_address_bn?: string | null
          holidays?: string | null
          id?: string
          is_active?: boolean
          legal_name?: string | null
          legal_name_bn?: string | null
          logo_url?: string | null
          name: string
          name_bn?: string | null
          number_format?: string | null
          office_hours?: string | null
          owner_id?: string | null
          phone?: string | null
          settings?: Json
          slug: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          tin_no?: string | null
          tin_number?: string | null
          trade_license_no?: string | null
          trade_license_number?: string | null
          trade_name?: string | null
          trade_name_bn?: string | null
          upazila_id?: number | null
          updated_at?: string
          vat_circle?: string | null
          vat_commissionerate?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          address_bn?: string | null
          archived_at?: string | null
          area?: string | null
          bin_no?: string | null
          bin_number?: string | null
          business_type?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          date_format?: string | null
          default_currency?: string | null
          default_language?: string | null
          default_locale?: string
          district_id?: number | null
          division_id?: number | null
          email?: string | null
          fiscal_year_start?: string | null
          full_address_bn?: string | null
          holidays?: string | null
          id?: string
          is_active?: boolean
          legal_name?: string | null
          legal_name_bn?: string | null
          logo_url?: string | null
          name?: string
          name_bn?: string | null
          number_format?: string | null
          office_hours?: string | null
          owner_id?: string | null
          phone?: string | null
          settings?: Json
          slug?: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          tin_no?: string | null
          tin_number?: string | null
          trade_license_no?: string | null
          trade_license_number?: string | null
          trade_name?: string | null
          trade_name_bn?: string | null
          upazila_id?: number | null
          updated_at?: string
          vat_circle?: string | null
          vat_commissionerate?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_suspended_by_fkey"
            columns: ["suspended_by"]
            isOneToOne: false
            referencedRelation: "platform_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          challan_prefix: string
          company_id: string
          created_at: string
          date_format: string | null
          default_currency: string
          default_language: string
          document_footer_text: string | null
          document_footer_text_bn: string | null
          email: string | null
          holidays: string | null
          id: string
          invoice_logo_url: string | null
          invoice_prefix: string
          logo_url: string | null
          low_stock_alerts: boolean | null
          office_hours: string | null
          phone: string | null
          primary_color: string | null
          quotation_logo_url: string | null
          quotation_prefix: string
          sms_api_key: string | null
          sms_enabled: boolean | null
          sms_sender_id: string | null
          updated_at: string
          vat_enabled: boolean
          vat_rate: number
          whatsapp: string | null
          whatsapp_enabled: boolean | null
        }
        Insert: {
          challan_prefix?: string
          company_id: string
          created_at?: string
          date_format?: string | null
          default_currency?: string
          default_language?: string
          document_footer_text?: string | null
          document_footer_text_bn?: string | null
          email?: string | null
          holidays?: string | null
          id?: string
          invoice_logo_url?: string | null
          invoice_prefix?: string
          logo_url?: string | null
          low_stock_alerts?: boolean | null
          office_hours?: string | null
          phone?: string | null
          primary_color?: string | null
          quotation_logo_url?: string | null
          quotation_prefix?: string
          sms_api_key?: string | null
          sms_enabled?: boolean | null
          sms_sender_id?: string | null
          updated_at?: string
          vat_enabled?: boolean
          vat_rate?: number
          whatsapp?: string | null
          whatsapp_enabled?: boolean | null
        }
        Update: {
          challan_prefix?: string
          company_id?: string
          created_at?: string
          date_format?: string | null
          default_currency?: string
          default_language?: string
          document_footer_text?: string | null
          document_footer_text_bn?: string | null
          email?: string | null
          holidays?: string | null
          id?: string
          invoice_logo_url?: string | null
          invoice_prefix?: string
          logo_url?: string | null
          low_stock_alerts?: boolean | null
          office_hours?: string | null
          phone?: string | null
          primary_color?: string | null
          quotation_logo_url?: string | null
          quotation_prefix?: string
          sms_api_key?: string | null
          sms_enabled?: boolean | null
          sms_sender_id?: string | null
          updated_at?: string
          vat_enabled?: boolean
          vat_rate?: number
          whatsapp?: string | null
          whatsapp_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_subscriptions: {
        Row: {
          billing_interval: string
          cancel_at_period_end: boolean
          cancelled_at: string | null
          change_effective_at: string | null
          company_id: string
          created_at: string
          current_period_end: string
          current_period_start: string
          custom_limits_override: Json | null
          grace_period_ends_at: string | null
          id: string
          last_payment_reference: string | null
          next_plan_id: string | null
          payment_method_type: string | null
          plan_id: string
          started_at: string
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_interval?: string
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          change_effective_at?: string | null
          company_id: string
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          custom_limits_override?: Json | null
          grace_period_ends_at?: string | null
          id?: string
          last_payment_reference?: string | null
          next_plan_id?: string | null
          payment_method_type?: string | null
          plan_id: string
          started_at?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          change_effective_at?: string | null
          company_id?: string
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          custom_limits_override?: Json | null
          grace_period_ends_at?: string | null
          id?: string
          last_payment_reference?: string | null
          next_plan_id?: string | null
          payment_method_type?: string | null
          plan_id?: string
          started_at?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_subscriptions_next_plan_id_fkey"
            columns: ["next_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      company_tax_settings: {
        Row: {
          bin_number: string | null
          company_id: string
          created_at: string
          default_vat_rate: number
          id: string
          pricing_mode: string
          tin_number: string | null
          trade_license_number: string | null
          updated_at: string
          vat_circle: string | null
          vat_commissionerate: string | null
          vat_enabled: boolean
        }
        Insert: {
          bin_number?: string | null
          company_id: string
          created_at?: string
          default_vat_rate?: number
          id?: string
          pricing_mode?: string
          tin_number?: string | null
          trade_license_number?: string | null
          updated_at?: string
          vat_circle?: string | null
          vat_commissionerate?: string | null
          vat_enabled?: boolean
        }
        Update: {
          bin_number?: string | null
          company_id?: string
          created_at?: string
          default_vat_rate?: number
          id?: string
          pricing_mode?: string
          tin_number?: string | null
          trade_license_number?: string | null
          updated_at?: string
          vat_circle?: string | null
          vat_commissionerate?: string | null
          vat_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "company_tax_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_users: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          data_scopes: Json
          department: string | null
          id: string
          invitation_expires_at: string | null
          invited_email: string | null
          is_active: boolean
          raw_overrides: Json | null
          responsibilities: string[] | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          data_scopes?: Json
          department?: string | null
          id?: string
          invitation_expires_at?: string | null
          invited_email?: string | null
          is_active?: boolean
          raw_overrides?: Json | null
          responsibilities?: string[] | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          data_scopes?: Json
          department?: string | null
          id?: string
          invitation_expires_at?: string | null
          invited_email?: string | null
          is_active?: boolean
          raw_overrides?: Json | null
          responsibilities?: string[] | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_users_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_communications: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string
          details: string | null
          id: string
          logged_by: string | null
          summary: string
          type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_id: string
          details?: string | null
          id?: string
          logged_by?: string | null
          summary: string
          type: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string
          details?: string | null
          id?: string
          logged_by?: string | null
          summary?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_communications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_communications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_rates: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string
          id: string
          notes: string | null
          product_id: string
          rate: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_id: string
          id?: string
          notes?: string | null
          product_id: string
          rate: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          notes?: string | null
          product_id?: string
          rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_rates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_rates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_rates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          address_bn: string | null
          area: string | null
          bin_no: string | null
          company_id: string
          company_name: string | null
          contact_person: string | null
          created_at: string
          credit_limit: number
          current_balance: number | null
          customer_code: string | null
          customer_id_no: string | null
          customer_type: string
          district_id: number | null
          division_id: number | null
          email: string | null
          id: string
          is_active: boolean
          last_payment_amount: number | null
          last_payment_date: string | null
          mobile: string
          name: string
          name_bn: string | null
          notes: string | null
          payment_terms: string
          tags: string[] | null
          tin_no: string | null
          total_due_balance: number | null
          total_invoiced_amount: number | null
          total_paid_amount: number | null
          upazila_id: number | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          address_bn?: string | null
          area?: string | null
          bin_no?: string | null
          company_id: string
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          credit_limit?: number
          current_balance?: number | null
          customer_code?: string | null
          customer_id_no?: string | null
          customer_type?: string
          district_id?: number | null
          division_id?: number | null
          email?: string | null
          id?: string
          is_active?: boolean
          last_payment_amount?: number | null
          last_payment_date?: string | null
          mobile: string
          name: string
          name_bn?: string | null
          notes?: string | null
          payment_terms?: string
          tags?: string[] | null
          tin_no?: string | null
          total_due_balance?: number | null
          total_invoiced_amount?: number | null
          total_paid_amount?: number | null
          upazila_id?: number | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          address_bn?: string | null
          area?: string | null
          bin_no?: string | null
          company_id?: string
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          credit_limit?: number
          current_balance?: number | null
          customer_code?: string | null
          customer_id_no?: string | null
          customer_type?: string
          district_id?: number | null
          division_id?: number | null
          email?: string | null
          id?: string
          is_active?: boolean
          last_payment_amount?: number | null
          last_payment_date?: string | null
          mobile?: string
          name?: string
          name_bn?: string | null
          notes?: string | null
          payment_terms?: string
          tags?: string[] | null
          tin_no?: string | null
          total_due_balance?: number | null
          total_invoiced_amount?: number | null
          total_paid_amount?: number | null
          upazila_id?: number | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_upazila_id_fkey"
            columns: ["upazila_id"]
            isOneToOne: false
            referencedRelation: "upazilas"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_labor_logs: {
        Row: {
          assigned_job_number: string | null
          company_id: string
          created_at: string
          daily_rate: number
          employee_id: string
          id: string
          overtime_hours: number
          payment_status: string
          production_contribution: string
          total_payout: number
          work_date: string
        }
        Insert: {
          assigned_job_number?: string | null
          company_id: string
          created_at?: string
          daily_rate: number
          employee_id: string
          id?: string
          overtime_hours?: number
          payment_status?: string
          production_contribution: string
          total_payout: number
          work_date?: string
        }
        Update: {
          assigned_job_number?: string | null
          company_id?: string
          created_at?: string
          daily_rate?: number
          employee_id?: string
          id?: string
          overtime_hours?: number
          payment_status?: string
          production_contribution?: string
          total_payout?: number
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_labor_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_labor_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_challans: {
        Row: {
          challan_number: string
          company_id: string
          created_at: string
          created_by_name: string
          customer_id: string | null
          customer_name: string
          customer_phone: string
          delivered_at: string | null
          delivery_address: string
          delivery_method: string
          delivery_person_name: string | null
          delivery_person_phone: string | null
          id: string
          notes: string | null
          order_number: string | null
          receiver_name: string | null
          receiver_phone: string | null
          receiver_signature: string | null
          sales_order_id: string | null
          scheduled_date: string
          status: string
          transport_cost: number
          updated_at: string
          vehicle_info: string | null
        }
        Insert: {
          challan_number: string
          company_id: string
          created_at?: string
          created_by_name: string
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          delivered_at?: string | null
          delivery_address: string
          delivery_method: string
          delivery_person_name?: string | null
          delivery_person_phone?: string | null
          id?: string
          notes?: string | null
          order_number?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          receiver_signature?: string | null
          sales_order_id?: string | null
          scheduled_date?: string
          status?: string
          transport_cost?: number
          updated_at?: string
          vehicle_info?: string | null
        }
        Update: {
          challan_number?: string
          company_id?: string
          created_at?: string
          created_by_name?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          delivered_at?: string | null
          delivery_address?: string
          delivery_method?: string
          delivery_person_name?: string | null
          delivery_person_phone?: string | null
          id?: string
          notes?: string | null
          order_number?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          receiver_signature?: string | null
          sales_order_id?: string | null
          scheduled_date?: string
          status?: string
          transport_cost?: number
          updated_at?: string
          vehicle_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_challans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_challans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_challans_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      design_feedback_logs: {
        Row: {
          created_at: string
          design_job_id: string
          id: string
          message: string
          sender_name: string
          sender_type: string
          version_number: number
        }
        Insert: {
          created_at?: string
          design_job_id: string
          id?: string
          message: string
          sender_name: string
          sender_type: string
          version_number?: number
        }
        Update: {
          created_at?: string
          design_job_id?: string
          id?: string
          message?: string
          sender_name?: string
          sender_type?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "design_feedback_logs_design_job_id_fkey"
            columns: ["design_job_id"]
            isOneToOne: false
            referencedRelation: "design_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      design_jobs: {
        Row: {
          approval_note: string | null
          approval_timestamp: string | null
          approved_by: string | null
          approved_version: number | null
          commercial_status: string | null
          company_id: string
          created_at: string
          current_version: number
          customer_approval_required: boolean | null
          customer_feedback: string | null
          customer_id: string | null
          customer_name: string
          deadline: string
          design_number: string
          designer_id: string | null
          designer_name: string
          dimensions_spec: string | null
          id: string
          instructions: string | null
          intake_source: string | null
          invoice_id: string | null
          invoice_item_id: string | null
          invoice_number: string | null
          invoice_request_id: string | null
          is_locked: boolean
          job_order_id: string | null
          priority: string
          revision_count: number
          sales_order_id: string | null
          status: string
          title: string
          updated_at: string
          workflow_routing: string | null
        }
        Insert: {
          approval_note?: string | null
          approval_timestamp?: string | null
          approved_by?: string | null
          approved_version?: number | null
          commercial_status?: string | null
          company_id: string
          created_at?: string
          current_version?: number
          customer_approval_required?: boolean | null
          customer_feedback?: string | null
          customer_id?: string | null
          customer_name: string
          deadline: string
          design_number: string
          designer_id?: string | null
          designer_name: string
          dimensions_spec?: string | null
          id?: string
          instructions?: string | null
          intake_source?: string | null
          invoice_id?: string | null
          invoice_item_id?: string | null
          invoice_number?: string | null
          invoice_request_id?: string | null
          is_locked?: boolean
          job_order_id?: string | null
          priority?: string
          revision_count?: number
          sales_order_id?: string | null
          status?: string
          title: string
          updated_at?: string
          workflow_routing?: string | null
        }
        Update: {
          approval_note?: string | null
          approval_timestamp?: string | null
          approved_by?: string | null
          approved_version?: number | null
          commercial_status?: string | null
          company_id?: string
          created_at?: string
          current_version?: number
          customer_approval_required?: boolean | null
          customer_feedback?: string | null
          customer_id?: string | null
          customer_name?: string
          deadline?: string
          design_number?: string
          designer_id?: string | null
          designer_name?: string
          dimensions_spec?: string | null
          id?: string
          instructions?: string | null
          intake_source?: string | null
          invoice_id?: string | null
          invoice_item_id?: string | null
          invoice_number?: string | null
          invoice_request_id?: string | null
          is_locked?: boolean
          job_order_id?: string | null
          priority?: string
          revision_count?: number
          sales_order_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          workflow_routing?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_jobs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_jobs_invoice_item_id_fkey"
            columns: ["invoice_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_jobs_invoice_request_id_fkey"
            columns: ["invoice_request_id"]
            isOneToOne: false
            referencedRelation: "invoice_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_jobs_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_jobs_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      design_versions: {
        Row: {
          change_notes: string | null
          created_at: string
          design_job_id: string
          file_format: string
          file_size_bytes: number | null
          id: string
          is_approved: boolean
          proof_file_name: string
          proof_file_url: string
          source_file_name: string | null
          source_file_url: string | null
          uploaded_by_name: string
          version_label: string
          version_number: number
        }
        Insert: {
          change_notes?: string | null
          created_at?: string
          design_job_id: string
          file_format: string
          file_size_bytes?: number | null
          id?: string
          is_approved?: boolean
          proof_file_name: string
          proof_file_url: string
          source_file_name?: string | null
          source_file_url?: string | null
          uploaded_by_name: string
          version_label: string
          version_number?: number
        }
        Update: {
          change_notes?: string | null
          created_at?: string
          design_job_id?: string
          file_format?: string
          file_size_bytes?: number | null
          id?: string
          is_approved?: boolean
          proof_file_name?: string
          proof_file_url?: string
          source_file_name?: string | null
          source_file_url?: string | null
          uploaded_by_name?: string
          version_label?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "design_versions_design_job_id_fkey"
            columns: ["design_job_id"]
            isOneToOne: false
            referencedRelation: "design_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          code: string
          created_at: string
          division_id: number
          id: number
          name: string
          name_bn: string
        }
        Insert: {
          code: string
          created_at?: string
          division_id: number
          id?: number
          name: string
          name_bn: string
        }
        Update: {
          code?: string
          created_at?: string
          division_id?: number
          id?: number
          name?: string
          name_bn?: string
        }
        Relationships: [
          {
            foreignKeyName: "districts_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      divisions: {
        Row: {
          code: string
          created_at: string
          id: number
          name: string
          name_bn: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: number
          name: string
          name_bn: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: number
          name?: string
          name_bn?: string
        }
        Relationships: []
      }
      document_number_counters: {
        Row: {
          company_id: string
          current_counter: number
          document_type: string
          id: string
          updated_at: string
          year_prefix: number
        }
        Insert: {
          company_id: string
          current_counter?: number
          document_type: string
          id?: string
          updated_at?: string
          year_prefix: number
        }
        Update: {
          company_id?: string
          current_counter?: number
          document_type?: string
          id?: string
          updated_at?: string
          year_prefix?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_number_counters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_sequences: {
        Row: {
          company_id: string
          current_val: number
          doc_type: string
          fiscal_year: string | null
          id: string
          padding: number
          prefix: string
          updated_at: string
        }
        Insert: {
          company_id: string
          current_val?: number
          doc_type: string
          fiscal_year?: string | null
          id?: string
          padding?: number
          prefix: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          current_val?: number
          doc_type?: string
          fiscal_year?: string | null
          id?: string
          padding?: number
          prefix?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_sequences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates_config: {
        Row: {
          authorized_signatory_title: string
          company_id: string
          company_name_bn: string | null
          created_at: string
          default_language: string
          document_type: string
          footer_terms_bn: string | null
          footer_terms_en: string | null
          header_disclaimer: string | null
          id: string
          show_company_logo: boolean
          show_seal_box: boolean
          updated_at: string
        }
        Insert: {
          authorized_signatory_title?: string
          company_id: string
          company_name_bn?: string | null
          created_at?: string
          default_language?: string
          document_type: string
          footer_terms_bn?: string | null
          footer_terms_en?: string | null
          header_disclaimer?: string | null
          id?: string
          show_company_logo?: boolean
          show_seal_box?: boolean
          updated_at?: string
        }
        Update: {
          authorized_signatory_title?: string
          company_id?: string
          company_name_bn?: string | null
          created_at?: string
          default_language?: string
          document_type?: string
          footer_terms_bn?: string | null
          footer_terms_en?: string | null
          header_disclaimer?: string | null
          id?: string
          show_company_logo?: boolean
          show_seal_box?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_gateways: {
        Row: {
          created_at: string
          created_by: string | null
          encrypted_credentials: string | null
          encryption_type: string | null
          extra_settings: Json | null
          gmail_account_email: string | null
          gmail_display_name: string | null
          id: string
          is_default: boolean
          last_checked_at: string | null
          last_sent_at: string | null
          last_test_error: string | null
          last_test_status: string | null
          last_tested_at: string | null
          provider: string
          reply_to_email: string | null
          scope_type: string
          sender_email: string
          sender_name: string
          smtp_host: string | null
          smtp_port: number | null
          smtp_username: string | null
          status: string
          tenant_id: string | null
          token_expires_at: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          encrypted_credentials?: string | null
          encryption_type?: string | null
          extra_settings?: Json | null
          gmail_account_email?: string | null
          gmail_display_name?: string | null
          id?: string
          is_default?: boolean
          last_checked_at?: string | null
          last_sent_at?: string | null
          last_test_error?: string | null
          last_test_status?: string | null
          last_tested_at?: string | null
          provider: string
          reply_to_email?: string | null
          scope_type?: string
          sender_email: string
          sender_name: string
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          status?: string
          tenant_id?: string | null
          token_expires_at?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          encrypted_credentials?: string | null
          encryption_type?: string | null
          extra_settings?: Json | null
          gmail_account_email?: string | null
          gmail_display_name?: string | null
          id?: string
          is_default?: boolean
          last_checked_at?: string | null
          last_sent_at?: string | null
          last_test_error?: string | null
          last_test_status?: string | null
          last_tested_at?: string | null
          provider?: string
          reply_to_email?: string | null
          scope_type?: string
          sender_email?: string
          sender_name?: string
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          status?: string
          tenant_id?: string | null
          token_expires_at?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_gateways_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          gateway_id: string | null
          id: string
          idempotency_key: string | null
          max_retries: number
          metadata: Json | null
          provider_message_id: string | null
          recipient: string
          retry_count: number
          scope_type: string
          sent_at: string | null
          sent_by: string | null
          status: string
          subject: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          gateway_id?: string | null
          id?: string
          idempotency_key?: string | null
          max_retries?: number
          metadata?: Json | null
          provider_message_id?: string | null
          recipient: string
          retry_count?: number
          scope_type?: string
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          gateway_id?: string | null
          id?: string
          idempotency_key?: string | null
          max_retries?: number
          metadata?: Json | null
          provider_message_id?: string | null
          recipient?: string
          retry_count?: number
          scope_type?: string
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "email_gateways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          attachments: Json | null
          attempts: number
          created_at: string
          event_type: string
          html_body: string
          id: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          metadata: Json | null
          next_run_at: string
          recipient: string
          status: string
          subject: string
          tenant_id: string | null
          text_body: string | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          attachments?: Json | null
          attempts?: number
          created_at?: string
          event_type: string
          html_body: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          metadata?: Json | null
          next_run_at?: string
          recipient: string
          status?: string
          subject: string
          tenant_id?: string | null
          text_body?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          attachments?: Json | null
          attempts?: number
          created_at?: string
          event_type?: string
          html_body?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          metadata?: Json | null
          next_run_at?: string
          recipient?: string
          status?: string
          subject?: string
          tenant_id?: string | null
          text_body?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_template: string
          body_template_bn: string | null
          created_at: string
          event_type: string
          id: string
          name: string
          name_bn: string | null
          status: string
          subject_template: string
          subject_template_bn: string | null
          tenant_id: string | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          body_template: string
          body_template_bn?: string | null
          created_at?: string
          event_type: string
          id?: string
          name: string
          name_bn?: string | null
          status?: string
          subject_template: string
          subject_template_bn?: string | null
          tenant_id?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          body_template?: string
          body_template_bn?: string | null
          created_at?: string
          event_type?: string
          id?: string
          name?: string
          name_bn?: string | null
          status?: string
          subject_template?: string
          subject_template_bn?: string | null
          tenant_id?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_shifts: {
        Row: {
          company_id: string
          created_at: string
          effective_from: string
          effective_to: string | null
          employee_id: string
          id: string
          is_active: boolean
          shift_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          employee_id: string
          id?: string
          is_active?: boolean
          shift_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          id?: string
          is_active?: boolean
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_shifts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shifts_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          bank_payment_info: Json | null
          base_salary: number
          branch_id: string | null
          company_id: string
          created_at: string
          current_advance_balance: number
          daily_rate: number
          department: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          employee_id_number: string
          employee_type: string
          hourly_rate: number | null
          id: string
          is_daily_worker: boolean | null
          joining_date: string
          mfs_payment_info: Json | null
          mobile: string
          name: string
          name_bn: string | null
          notes: string | null
          overtime_hourly_rate: number
          portal_credentials: Json | null
          responsibilities: string[] | null
          role: string
          salary_basis: string
          salary_structure: Json | null
          salary_type: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          bank_payment_info?: Json | null
          base_salary?: number
          branch_id?: string | null
          company_id: string
          created_at?: string
          current_advance_balance?: number
          daily_rate?: number
          department: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          employee_id_number: string
          employee_type: string
          hourly_rate?: number | null
          id?: string
          is_daily_worker?: boolean | null
          joining_date?: string
          mfs_payment_info?: Json | null
          mobile: string
          name: string
          name_bn?: string | null
          notes?: string | null
          overtime_hourly_rate?: number
          portal_credentials?: Json | null
          responsibilities?: string[] | null
          role: string
          salary_basis?: string
          salary_structure?: Json | null
          salary_type: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          bank_payment_info?: Json | null
          base_salary?: number
          branch_id?: string | null
          company_id?: string
          created_at?: string
          current_advance_balance?: number
          daily_rate?: number
          department?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          employee_id_number?: string
          employee_type?: string
          hourly_rate?: number | null
          id?: string
          is_daily_worker?: boolean | null
          joining_date?: string
          mfs_payment_info?: Json | null
          mobile?: string
          name?: string
          name_bn?: string | null
          notes?: string | null
          overtime_hourly_rate?: number
          portal_credentials?: Json | null
          responsibilities?: string[] | null
          role?: string
          salary_basis?: string
          salary_structure?: Json | null
          salary_type?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          attachment_url: string | null
          bank_account_id: string | null
          branch_name: string
          category: string
          company_id: string
          created_at: string
          description: string
          expense_date: string
          expense_number: string
          id: string
          idempotency_key: string | null
          payment_method: string
          recorded_by_name: string
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          amount: number
          attachment_url?: string | null
          bank_account_id?: string | null
          branch_name?: string
          category: string
          company_id: string
          created_at?: string
          description: string
          expense_date?: string
          expense_number: string
          id?: string
          idempotency_key?: string | null
          payment_method: string
          recorded_by_name: string
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          bank_account_id?: string | null
          branch_name?: string
          category?: string
          company_id?: string
          created_at?: string
          description?: string
          expense_date?: string
          expense_number?: string
          id?: string
          idempotency_key?: string | null
          payment_method?: string
          recorded_by_name?: string
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      features_catalog: {
        Row: {
          category: string
          created_at: string
          description_bn: string | null
          description_en: string | null
          entitlement_type: string
          id: string
          is_active: boolean
          key: string
          name_bn: string
          name_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          entitlement_type?: string
          id?: string
          is_active?: boolean
          key: string
          name_bn: string
          name_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          entitlement_type?: string
          id?: string
          is_active?: boolean
          key?: string
          name_bn?: string
          name_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      financial_periods: {
        Row: {
          closed_at: string | null
          closed_by_name: string | null
          company_id: string
          created_at: string
          end_date: string
          id: string
          period_name: string
          start_date: string
          status: string
        }
        Insert: {
          closed_at?: string | null
          closed_by_name?: string | null
          company_id: string
          created_at?: string
          end_date: string
          id?: string
          period_name: string
          start_date: string
          status?: string
        }
        Update: {
          closed_at?: string | null
          closed_by_name?: string | null
          company_id?: string
          created_at?: string
          end_date?: string
          id?: string
          period_name?: string
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          id: string
          metadata: Json | null
          narration: string
          posted_at: string
          posted_by_id: string | null
          posted_by_name: string
          reference_id: string | null
          reference_type: string | null
          reversal_of_id: string | null
          status: string
          total_amount: number
          transaction_date: string
          transaction_number: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          narration: string
          posted_at?: string
          posted_by_id?: string | null
          posted_by_name?: string
          reference_id?: string | null
          reference_type?: string | null
          reversal_of_id?: string | null
          status?: string
          total_amount?: number
          transaction_date?: string
          transaction_number: string
          transaction_type: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          narration?: string
          posted_at?: string
          posted_by_id?: string | null
          posted_by_name?: string
          reference_id?: string | null
          reference_type?: string | null
          reversal_of_id?: string | null
          status?: string
          total_amount?: number
          transaction_date?: string
          transaction_number?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_reversal_of_id_fkey"
            columns: ["reversal_of_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_write_offs: {
        Row: {
          actor_user_id: string | null
          amount: number
          authorized_by_name: string
          company_id: string
          created_at: string
          id: string
          invoice_id: string
          reason: string
        }
        Insert: {
          actor_user_id?: string | null
          amount: number
          authorized_by_name: string
          company_id: string
          created_at?: string
          id?: string
          invoice_id: string
          reason: string
        }
        Update: {
          actor_user_id?: string | null
          amount?: number
          authorized_by_name?: string
          company_id?: string
          created_at?: string
          id?: string
          invoice_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_write_offs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_write_offs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      finishing_options: {
        Row: {
          category: string | null
          company_id: string
          cost: number
          created_at: string
          id: string
          is_active: boolean
          material_id: string | null
          name: string
          name_bn: string | null
          pricing_method: string
          selling_price: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          company_id: string
          cost?: number
          created_at?: string
          id?: string
          is_active?: boolean
          material_id?: string | null
          name: string
          name_bn?: string | null
          pricing_method?: string
          selling_price?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          company_id?: string
          cost?: number
          created_at?: string
          id?: string
          is_active?: boolean
          material_id?: string | null
          name?: string
          name_bn?: string | null
          pricing_method?: string
          selling_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finishing_options_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finishing_options_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      gateway_audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json
          gateway_id: string | null
          id: string
          ip_address: string | null
          performed_by: string | null
          tenant_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          gateway_id?: string | null
          id?: string
          ip_address?: string | null
          performed_by?: string | null
          tenant_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          gateway_id?: string | null
          id?: string
          ip_address?: string | null
          performed_by?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gateway_audit_logs_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "gateway_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gateway_audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gateway_integrations: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          encrypted_credentials: string | null
          environment: string
          failure_count: number
          id: string
          is_default: boolean
          is_enabled: boolean
          last_test_error: string | null
          last_test_latency_ms: number | null
          last_test_status: string | null
          last_tested_at: string | null
          name: string
          provider: string
          public_config: Json
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          encrypted_credentials?: string | null
          environment?: string
          failure_count?: number
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          last_test_error?: string | null
          last_test_latency_ms?: number | null
          last_test_status?: string | null
          last_tested_at?: string | null
          name: string
          provider: string
          public_config?: Json
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          encrypted_credentials?: string | null
          environment?: string
          failure_count?: number
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          last_test_error?: string | null
          last_test_latency_ms?: number | null
          last_test_status?: string | null
          last_tested_at?: string | null
          name?: string
          provider?: string
          public_config?: Json
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gateway_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gateway_transactions: {
        Row: {
          amount: number
          billing_context: string
          callback_payload: Json | null
          completed_at: string | null
          created_at: string
          currency: string
          customer_id: string | null
          error_message: string | null
          gateway_id: string | null
          id: string
          idempotency_key: string | null
          initiated_at: string
          internal_trx_id: string
          invoice_id: string | null
          payment_status: string
          payment_url: string | null
          plan_id: string | null
          platform_account_id: string | null
          provider: string
          provider_trx_id: string | null
          subscription_id: string | null
          tenant_id: string | null
          transaction_type: string | null
          updated_at: string
          verification_payload: Json | null
          verification_status: string
          webhook_payload: Json | null
        }
        Insert: {
          amount: number
          billing_context?: string
          callback_payload?: Json | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          error_message?: string | null
          gateway_id?: string | null
          id?: string
          idempotency_key?: string | null
          initiated_at?: string
          internal_trx_id: string
          invoice_id?: string | null
          payment_status?: string
          payment_url?: string | null
          plan_id?: string | null
          platform_account_id?: string | null
          provider: string
          provider_trx_id?: string | null
          subscription_id?: string | null
          tenant_id?: string | null
          transaction_type?: string | null
          updated_at?: string
          verification_payload?: Json | null
          verification_status?: string
          webhook_payload?: Json | null
        }
        Update: {
          amount?: number
          billing_context?: string
          callback_payload?: Json | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          error_message?: string | null
          gateway_id?: string | null
          id?: string
          idempotency_key?: string | null
          initiated_at?: string
          internal_trx_id?: string
          invoice_id?: string | null
          payment_status?: string
          payment_url?: string | null
          plan_id?: string | null
          platform_account_id?: string | null
          provider?: string
          provider_trx_id?: string | null
          subscription_id?: string | null
          tenant_id?: string | null
          transaction_type?: string | null
          updated_at?: string
          verification_payload?: Json | null
          verification_status?: string
          webhook_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "gateway_transactions_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "gateway_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gateway_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gateway_webhooks: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          gateway_id: string | null
          id: string
          is_verified: boolean
          payload: Json
          processed_at: string | null
          provider: string
          provider_event_id: string | null
          signature: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          gateway_id?: string | null
          id?: string
          is_verified?: boolean
          payload?: Json
          processed_at?: string | null
          provider: string
          provider_event_id?: string | null
          signature?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          gateway_id?: string | null
          id?: string
          is_verified?: boolean
          payload?: Json
          processed_at?: string | null
          provider?: string
          provider_event_id?: string | null
          signature?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gateway_webhooks_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "gateway_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_received_note_items: {
        Row: {
          accepted_quantity: number
          batch_lot_number: string | null
          created_at: string
          current_received: number
          damaged_quantity: number
          expiry_date: string | null
          grn_id: string
          id: string
          material_id: string
          material_name: string
          notes: string | null
          po_item_id: string | null
          previously_received: number
          quantity_ordered: number
          rejected_quantity: number
          rejection_reason: string | null
          roll_id: string | null
          total_cost: number
          unit: string
          unit_cost: number
        }
        Insert: {
          accepted_quantity: number
          batch_lot_number?: string | null
          created_at?: string
          current_received: number
          damaged_quantity?: number
          expiry_date?: string | null
          grn_id: string
          id?: string
          material_id: string
          material_name: string
          notes?: string | null
          po_item_id?: string | null
          previously_received?: number
          quantity_ordered?: number
          rejected_quantity?: number
          rejection_reason?: string | null
          roll_id?: string | null
          total_cost: number
          unit: string
          unit_cost: number
        }
        Update: {
          accepted_quantity?: number
          batch_lot_number?: string | null
          created_at?: string
          current_received?: number
          damaged_quantity?: number
          expiry_date?: string | null
          grn_id?: string
          id?: string
          material_id?: string
          material_name?: string
          notes?: string | null
          po_item_id?: string | null
          previously_received?: number
          quantity_ordered?: number
          rejected_quantity?: number
          rejection_reason?: string | null
          roll_id?: string | null
          total_cost?: number
          unit?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "goods_received_note_items_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "goods_received_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_received_note_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_received_note_items_po_item_id_fkey"
            columns: ["po_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_received_notes: {
        Row: {
          accepted_total: number | null
          branch_id: string | null
          challan_number: string | null
          company_id: string
          created_at: string
          damaged_total: number | null
          grn_number: string
          id: string
          notes: string | null
          posted_at: string | null
          posted_by_id: string | null
          posted_by_name: string | null
          purchase_order_id: string
          received_by_name: string
          received_date: string
          receiving_location_id: string | null
          rejected_total: number | null
          status: string | null
          supplier_delivery_note: string | null
          supplier_id: string | null
          supplier_invoice_number: string | null
          supplier_name: string
        }
        Insert: {
          accepted_total?: number | null
          branch_id?: string | null
          challan_number?: string | null
          company_id: string
          created_at?: string
          damaged_total?: number | null
          grn_number: string
          id?: string
          notes?: string | null
          posted_at?: string | null
          posted_by_id?: string | null
          posted_by_name?: string | null
          purchase_order_id: string
          received_by_name: string
          received_date?: string
          receiving_location_id?: string | null
          rejected_total?: number | null
          status?: string | null
          supplier_delivery_note?: string | null
          supplier_id?: string | null
          supplier_invoice_number?: string | null
          supplier_name: string
        }
        Update: {
          accepted_total?: number | null
          branch_id?: string | null
          challan_number?: string | null
          company_id?: string
          created_at?: string
          damaged_total?: number | null
          grn_number?: string
          id?: string
          notes?: string | null
          posted_at?: string | null
          posted_by_id?: string | null
          posted_by_name?: string | null
          purchase_order_id?: string
          received_by_name?: string
          received_date?: string
          receiving_location_id?: string | null
          rejected_total?: number | null
          status?: string | null
          supplier_delivery_note?: string | null
          supplier_id?: string | null
          supplier_invoice_number?: string | null
          supplier_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_received_notes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_received_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_received_notes_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_received_notes_receiving_location_id_fkey"
            columns: ["receiving_location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_received_notes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      in_app_notifications: {
        Row: {
          action_url: string | null
          company_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          message_bn: string | null
          title: string
          title_bn: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          message_bn?: string | null
          title: string
          title_bn?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          message_bn?: string | null
          title?: string
          title_bn?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "in_app_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_options: {
        Row: {
          company_id: string
          cost: number
          created_at: string
          creates_task: boolean
          fulfillment_type: string
          id: string
          is_active: boolean
          name: string
          name_bn: string | null
          pricing_method: string
          selling_price: number
          updated_at: string
        }
        Insert: {
          company_id: string
          cost?: number
          created_at?: string
          creates_task?: boolean
          fulfillment_type?: string
          id?: string
          is_active?: boolean
          name: string
          name_bn?: string | null
          pricing_method?: string
          selling_price?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          cost?: number
          created_at?: string
          creates_task?: boolean
          fulfillment_type?: string
          id?: string
          is_active?: boolean
          name?: string
          name_bn?: string | null
          pricing_method?: string
          selling_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installation_options_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      installations: {
        Row: {
          company_id: string
          confirmed_at: string | null
          created_at: string
          crew_members: string[]
          customer_confirmed_by: string | null
          customer_confirmed_phone: string | null
          customer_id: string | null
          customer_name: string
          customer_rating_or_note: string | null
          equipment_used: string | null
          failure_reason: string | null
          id: string
          installation_date: string
          installation_number: string
          installer_lead_name: string
          labor_cost: number
          notes: string | null
          order_number: string | null
          sales_order_id: string | null
          scheduled_time: string | null
          site_location: string
          site_photos: string[]
          status: string
          transport_cost: number
          updated_at: string
        }
        Insert: {
          company_id: string
          confirmed_at?: string | null
          created_at?: string
          crew_members?: string[]
          customer_confirmed_by?: string | null
          customer_confirmed_phone?: string | null
          customer_id?: string | null
          customer_name: string
          customer_rating_or_note?: string | null
          equipment_used?: string | null
          failure_reason?: string | null
          id?: string
          installation_date?: string
          installation_number: string
          installer_lead_name: string
          labor_cost?: number
          notes?: string | null
          order_number?: string | null
          sales_order_id?: string | null
          scheduled_time?: string | null
          site_location: string
          site_photos?: string[]
          status?: string
          transport_cost?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          confirmed_at?: string | null
          created_at?: string
          crew_members?: string[]
          customer_confirmed_by?: string | null
          customer_confirmed_phone?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_rating_or_note?: string | null
          equipment_used?: string | null
          failure_reason?: string | null
          id?: string
          installation_date?: string
          installation_number?: string
          installer_lead_name?: string
          labor_cost?: number
          notes?: string | null
          order_number?: string | null
          sales_order_id?: string | null
          scheduled_time?: string | null
          site_location?: string
          site_photos?: string[]
          status?: string
          transport_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installations_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_adjustments: {
        Row: {
          adjustment_number: string
          authorized_by_name: string
          company_id: string
          created_at: string
          id: string
          location_id: string | null
          material_id: string
          physical_quantity: number
          quantity_change: number
          reason_code: string
          reason_notes: string | null
          system_quantity_before: number
          unit: string
        }
        Insert: {
          adjustment_number: string
          authorized_by_name: string
          company_id: string
          created_at?: string
          id?: string
          location_id?: string | null
          material_id: string
          physical_quantity: number
          quantity_change: number
          reason_code: string
          reason_notes?: string | null
          system_quantity_before: number
          unit: string
        }
        Update: {
          adjustment_number?: string
          authorized_by_name?: string
          company_id?: string
          created_at?: string
          id?: string
          location_id?: string | null
          material_id?: string
          physical_quantity?: number
          quantity_change?: number
          reason_code?: string
          reason_notes?: string | null
          system_quantity_before?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_locations: {
        Row: {
          branch_id: string | null
          code: string
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          code: string
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          code?: string
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_locations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_remnants: {
        Row: {
          area_sft: number
          branch_id: string | null
          company_id: string
          condition: string
          created_at: string
          created_from_task_id: string | null
          dimension_unit: string
          id: string
          length: number
          location_id: string | null
          material_id: string
          material_name: string
          notes: string | null
          original_roll_id: string | null
          remnant_code: string
          source_roll_id: string | null
          status: string
          updated_at: string
          width: number
        }
        Insert: {
          area_sft?: number
          branch_id?: string | null
          company_id: string
          condition?: string
          created_at?: string
          created_from_task_id?: string | null
          dimension_unit?: string
          id?: string
          length: number
          location_id?: string | null
          material_id: string
          material_name: string
          notes?: string | null
          original_roll_id?: string | null
          remnant_code: string
          source_roll_id?: string | null
          status?: string
          updated_at?: string
          width: number
        }
        Update: {
          area_sft?: number
          branch_id?: string | null
          company_id?: string
          condition?: string
          created_at?: string
          created_from_task_id?: string | null
          dimension_unit?: string
          id?: string
          length?: number
          location_id?: string | null
          material_id?: string
          material_name?: string
          notes?: string | null
          original_roll_id?: string | null
          remnant_code?: string
          source_roll_id?: string | null
          status?: string
          updated_at?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_remnants_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_remnants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_remnants_created_from_task_id_fkey"
            columns: ["created_from_task_id"]
            isOneToOne: false
            referencedRelation: "production_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_remnants_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_remnants_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_remnants_original_roll_id_fkey"
            columns: ["original_roll_id"]
            isOneToOne: false
            referencedRelation: "inventory_rolls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_remnants_source_roll_id_fkey"
            columns: ["source_roll_id"]
            isOneToOne: false
            referencedRelation: "inventory_rolls"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_rolls: {
        Row: {
          allowance_ft: number | null
          batch_lot_number: string | null
          branch_id: string | null
          company_id: string | null
          consumed_area_sft: number
          created_at: string
          current_area_sft: number | null
          current_length_ft: number | null
          finishing: string | null
          grn_id: string | null
          gsm: number | null
          id: string
          initial_area_sft: number
          initial_length_ft: number
          location_id: string | null
          location_name: string | null
          material_id: string
          mounted_press_name: string | null
          notes: string | null
          original_length_ft: number | null
          purchase_order_id: string | null
          remaining_area_sft: number
          remaining_length_ft: number | null
          roll_code: string | null
          roll_tag: string
          status: string
          supplier_id: string | null
          total_cost: number | null
          unit_cost: number | null
          updated_at: string | null
          width_ft: number
        }
        Insert: {
          allowance_ft?: number | null
          batch_lot_number?: string | null
          branch_id?: string | null
          company_id?: string | null
          consumed_area_sft?: number
          created_at?: string
          current_area_sft?: number | null
          current_length_ft?: number | null
          finishing?: string | null
          grn_id?: string | null
          gsm?: number | null
          id?: string
          initial_area_sft: number
          initial_length_ft: number
          location_id?: string | null
          location_name?: string | null
          material_id: string
          mounted_press_name?: string | null
          notes?: string | null
          original_length_ft?: number | null
          purchase_order_id?: string | null
          remaining_area_sft: number
          remaining_length_ft?: number | null
          roll_code?: string | null
          roll_tag: string
          status?: string
          supplier_id?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string | null
          width_ft: number
        }
        Update: {
          allowance_ft?: number | null
          batch_lot_number?: string | null
          branch_id?: string | null
          company_id?: string | null
          consumed_area_sft?: number
          created_at?: string
          current_area_sft?: number | null
          current_length_ft?: number | null
          finishing?: string | null
          grn_id?: string | null
          gsm?: number | null
          id?: string
          initial_area_sft?: number
          initial_length_ft?: number
          location_id?: string | null
          location_name?: string | null
          material_id?: string
          mounted_press_name?: string | null
          notes?: string | null
          original_length_ft?: number | null
          purchase_order_id?: string | null
          remaining_area_sft?: number
          remaining_length_ft?: number | null
          roll_code?: string | null
          roll_tag?: string
          status?: string
          supplier_id?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string | null
          width_ft?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_rolls_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_rolls_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_rolls_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "goods_received_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_rolls_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_rolls_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_rolls_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stock_balances: {
        Row: {
          available_quantity: number
          branch_id: string | null
          company_id: string
          damaged_quantity: number
          id: string
          issued_quantity: number
          location_id: string
          material_id: string
          reserved_quantity: number
          updated_at: string
        }
        Insert: {
          available_quantity?: number
          branch_id?: string | null
          company_id: string
          damaged_quantity?: number
          id?: string
          issued_quantity?: number
          location_id: string
          material_id: string
          reserved_quantity?: number
          updated_at?: string
        }
        Update: {
          available_quantity?: number
          branch_id?: string | null
          company_id?: string
          damaged_quantity?: number
          id?: string
          issued_quantity?: number
          location_id?: string
          material_id?: string
          reserved_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stock_balances_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_balances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_balances_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_balances_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transfers: {
        Row: {
          company_id: string
          created_at: string
          from_branch_id: string | null
          from_location_id: string
          id: string
          material_id: string
          material_name: string
          notes: string | null
          performed_by_name: string
          quantity: number
          status: string
          to_branch_id: string | null
          to_location_id: string
          transfer_number: string
          unit: string
        }
        Insert: {
          company_id: string
          created_at?: string
          from_branch_id?: string | null
          from_location_id: string
          id?: string
          material_id: string
          material_name: string
          notes?: string | null
          performed_by_name: string
          quantity: number
          status?: string
          to_branch_id?: string | null
          to_location_id: string
          transfer_number: string
          unit: string
        }
        Update: {
          company_id?: string
          created_at?: string
          from_branch_id?: string | null
          from_location_id?: string
          id?: string
          material_id?: string
          material_name?: string
          notes?: string | null
          performed_by_name?: string
          quantity?: number
          status?: string
          to_branch_id?: string | null
          to_location_id?: string
          transfer_number?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_from_branch_id_fkey"
            columns: ["from_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_to_branch_id_fkey"
            columns: ["to_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          customer_approval_required: boolean | null
          design_job_id: string | null
          design_required: boolean | null
          dimensions_spec: string | null
          finishing: string | null
          id: string
          invoice_id: string
          item_description: string
          product_id: string | null
          quantity: number
          total_price: number
          unit: string
          unit_price: number
          vat_percentage: number
        }
        Insert: {
          created_at?: string
          customer_approval_required?: boolean | null
          design_job_id?: string | null
          design_required?: boolean | null
          dimensions_spec?: string | null
          finishing?: string | null
          id?: string
          invoice_id: string
          item_description: string
          product_id?: string | null
          quantity: number
          total_price: number
          unit: string
          unit_price: number
          vat_percentage?: number
        }
        Update: {
          created_at?: string
          customer_approval_required?: boolean | null
          design_job_id?: string | null
          design_required?: boolean | null
          dimensions_spec?: string | null
          finishing?: string | null
          id?: string
          invoice_id?: string
          item_description?: string
          product_id?: string | null
          quantity?: number
          total_price?: number
          unit?: string
          unit_price?: number
          vat_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_design_job_id_fkey"
            columns: ["design_job_id"]
            isOneToOne: false
            referencedRelation: "design_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_requests: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          design_job_id: string | null
          design_number: string | null
          estimated_amount: number | null
          id: string
          invoice_id: string | null
          invoice_number: string | null
          items_summary: string | null
          job_number: string | null
          job_order_id: string | null
          notes: string | null
          order_number: string | null
          request_number: string
          requested_by_id: string | null
          requested_by_name: string
          sales_order_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          design_job_id?: string | null
          design_number?: string | null
          estimated_amount?: number | null
          id?: string
          invoice_id?: string | null
          invoice_number?: string | null
          items_summary?: string | null
          job_number?: string | null
          job_order_id?: string | null
          notes?: string | null
          order_number?: string | null
          request_number: string
          requested_by_id?: string | null
          requested_by_name?: string
          sales_order_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          design_job_id?: string | null
          design_number?: string | null
          estimated_amount?: number | null
          id?: string
          invoice_id?: string | null
          invoice_number?: string | null
          items_summary?: string | null
          job_number?: string | null
          job_order_id?: string | null
          notes?: string | null
          order_number?: string | null
          request_number?: string
          requested_by_id?: string | null
          requested_by_name?: string
          sales_order_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_requests_design_job_id_fkey"
            columns: ["design_job_id"]
            isOneToOne: false
            referencedRelation: "design_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_requests_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_requests_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_requests_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          created_by_name: string
          customer_address: string | null
          customer_bin: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string
          customer_tin: string | null
          discount_amount: number
          due_amount: number
          due_date: string
          grand_total: number
          id: string
          idempotency_key: string | null
          invoice_date: string
          invoice_number: string
          invoice_type: string
          is_practice: boolean
          job_number: string | null
          job_order_id: string | null
          notes: string | null
          order_number: string | null
          paid_amount: number
          quotation_id: string | null
          quotation_number: string | null
          sales_order_id: string | null
          salesperson_id: string | null
          salesperson_name: string | null
          status: string
          subtotal: number
          terms_and_conditions: string | null
          updated_at: string
          vat_amount: number
          vat_percentage: number
          write_off_amount: number
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by_name: string
          customer_address?: string | null
          customer_bin?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          customer_tin?: string | null
          discount_amount?: number
          due_amount?: number
          due_date: string
          grand_total?: number
          id?: string
          idempotency_key?: string | null
          invoice_date?: string
          invoice_number: string
          invoice_type?: string
          is_practice?: boolean
          job_number?: string | null
          job_order_id?: string | null
          notes?: string | null
          order_number?: string | null
          paid_amount?: number
          quotation_id?: string | null
          quotation_number?: string | null
          sales_order_id?: string | null
          salesperson_id?: string | null
          salesperson_name?: string | null
          status?: string
          subtotal?: number
          terms_and_conditions?: string | null
          updated_at?: string
          vat_amount?: number
          vat_percentage?: number
          write_off_amount?: number
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by_name?: string
          customer_address?: string | null
          customer_bin?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          customer_tin?: string | null
          discount_amount?: number
          due_amount?: number
          due_date?: string
          grand_total?: number
          id?: string
          idempotency_key?: string | null
          invoice_date?: string
          invoice_number?: string
          invoice_type?: string
          is_practice?: boolean
          job_number?: string | null
          job_order_id?: string | null
          notes?: string | null
          order_number?: string | null
          paid_amount?: number
          quotation_id?: string | null
          quotation_number?: string | null
          sales_order_id?: string | null
          salesperson_id?: string | null
          salesperson_name?: string | null
          status?: string
          subtotal?: number
          terms_and_conditions?: string | null
          updated_at?: string
          vat_amount?: number
          vat_percentage?: number
          write_off_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      job_costings: {
        Row: {
          act_fabrication_cost: number
          act_finishing_cost: number
          act_ink_cost: number
          act_installation_cost: number
          act_labor_cost: number
          act_machine_cost: number | null
          act_margin_percentage: number
          act_material_cost: number
          act_other_cost: number
          act_printing_cost: number
          act_profit: number
          act_total_cost: number
          act_transport_cost: number
          branch_id: string | null
          company_id: string
          costing_snapshot: Json
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string
          dimensions_spec: string | null
          est_fabrication_cost: number
          est_finishing_cost: number
          est_ink_cost: number
          est_installation_cost: number
          est_labor_cost: number
          est_machine_cost: number | null
          est_margin_percentage: number
          est_material_cost: number
          est_other_cost: number
          est_printing_cost: number
          est_profit: number
          est_total_cost: number
          est_transport_cost: number
          id: string
          item_title: string | null
          job_id: string | null
          job_number: string
          job_order_id: string | null
          labor_cost_mode: string
          labor_variance: number
          material_variance: number
          notes: string | null
          product_id: string | null
          quantity: number | null
          quotation_id: string | null
          sales_order_id: string | null
          selling_price: number
          status: string
          total_variance: number
          transport_variance: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          act_fabrication_cost?: number
          act_finishing_cost?: number
          act_ink_cost?: number
          act_installation_cost?: number
          act_labor_cost?: number
          act_machine_cost?: number | null
          act_margin_percentage?: number
          act_material_cost?: number
          act_other_cost?: number
          act_printing_cost?: number
          act_profit?: number
          act_total_cost?: number
          act_transport_cost?: number
          branch_id?: string | null
          company_id: string
          costing_snapshot?: Json
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name: string
          dimensions_spec?: string | null
          est_fabrication_cost?: number
          est_finishing_cost?: number
          est_ink_cost?: number
          est_installation_cost?: number
          est_labor_cost?: number
          est_machine_cost?: number | null
          est_margin_percentage?: number
          est_material_cost?: number
          est_other_cost?: number
          est_printing_cost?: number
          est_profit?: number
          est_total_cost?: number
          est_transport_cost?: number
          id?: string
          item_title?: string | null
          job_id?: string | null
          job_number: string
          job_order_id?: string | null
          labor_cost_mode?: string
          labor_variance?: number
          material_variance?: number
          notes?: string | null
          product_id?: string | null
          quantity?: number | null
          quotation_id?: string | null
          sales_order_id?: string | null
          selling_price: number
          status?: string
          total_variance?: number
          transport_variance?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          act_fabrication_cost?: number
          act_finishing_cost?: number
          act_ink_cost?: number
          act_installation_cost?: number
          act_labor_cost?: number
          act_machine_cost?: number | null
          act_margin_percentage?: number
          act_material_cost?: number
          act_other_cost?: number
          act_printing_cost?: number
          act_profit?: number
          act_total_cost?: number
          act_transport_cost?: number
          branch_id?: string | null
          company_id?: string
          costing_snapshot?: Json
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string
          dimensions_spec?: string | null
          est_fabrication_cost?: number
          est_finishing_cost?: number
          est_ink_cost?: number
          est_installation_cost?: number
          est_labor_cost?: number
          est_machine_cost?: number | null
          est_margin_percentage?: number
          est_material_cost?: number
          est_other_cost?: number
          est_printing_cost?: number
          est_profit?: number
          est_total_cost?: number
          est_transport_cost?: number
          id?: string
          item_title?: string | null
          job_id?: string | null
          job_number?: string
          job_order_id?: string | null
          labor_cost_mode?: string
          labor_variance?: number
          material_variance?: number
          notes?: string | null
          product_id?: string | null
          quantity?: number | null
          quotation_id?: string | null
          sales_order_id?: string | null
          selling_price?: number
          status?: string
          total_variance?: number
          transport_variance?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_costings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_costings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_costings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_costings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_costings_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_costings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_costings_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_costings_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      job_orders: {
        Row: {
          artwork_status: string
          artwork_url: string | null
          assigned_department: string
          assigned_employee_name: string | null
          commercial_status: string | null
          company_id: string
          created_at: string
          customer_name: string
          deadline: string
          id: string
          invoice_id: string | null
          invoice_number: string | null
          job_number: string
          material_spec: string
          notes: string | null
          order_id: string
          order_item_id: string | null
          product_name: string
          production_gate_status: string | null
          production_instructions: string | null
          quantity: number
          size_spec: string
          status: string
          updated_at: string
          workflow_routing: string | null
        }
        Insert: {
          artwork_status?: string
          artwork_url?: string | null
          assigned_department: string
          assigned_employee_name?: string | null
          commercial_status?: string | null
          company_id: string
          created_at?: string
          customer_name: string
          deadline: string
          id?: string
          invoice_id?: string | null
          invoice_number?: string | null
          job_number: string
          material_spec: string
          notes?: string | null
          order_id: string
          order_item_id?: string | null
          product_name: string
          production_gate_status?: string | null
          production_instructions?: string | null
          quantity?: number
          size_spec: string
          status?: string
          updated_at?: string
          workflow_routing?: string | null
        }
        Update: {
          artwork_status?: string
          artwork_url?: string | null
          assigned_department?: string
          assigned_employee_name?: string | null
          commercial_status?: string | null
          company_id?: string
          created_at?: string
          customer_name?: string
          deadline?: string
          id?: string
          invoice_id?: string | null
          invoice_number?: string | null
          job_number?: string
          material_spec?: string
          notes?: string | null
          order_id?: string
          order_item_id?: string | null
          product_name?: string
          production_gate_status?: string | null
          production_instructions?: string | null
          quantity?: number
          size_spec?: string
          status?: string
          updated_at?: string
          workflow_routing?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_orders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_orders_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "sales_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          company_id: string
          created_at: string
          credit: number
          debit: number
          id: string
          memo: string | null
          transaction_id: string
        }
        Insert: {
          account_id: string
          company_id: string
          created_at?: string
          credit?: number
          debit?: number
          id?: string
          memo?: string | null
          transaction_id: string
        }
        Update: {
          account_id?: string
          company_id?: string
          created_at?: string
          credit?: number
          debit?: number
          id?: string
          memo?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      locations_master: {
        Row: {
          created_at: string
          district_id: number
          district_name: string
          district_name_bn: string
          division_id: number
          division_name: string
          division_name_bn: string
          id: string
          is_active: boolean
          post_code: string | null
          upazila_id: number | null
          upazila_name: string | null
          upazila_name_bn: string | null
        }
        Insert: {
          created_at?: string
          district_id: number
          district_name: string
          district_name_bn: string
          division_id: number
          division_name: string
          division_name_bn: string
          id?: string
          is_active?: boolean
          post_code?: string | null
          upazila_id?: number | null
          upazila_name?: string | null
          upazila_name_bn?: string | null
        }
        Update: {
          created_at?: string
          district_id?: number
          district_name?: string
          district_name_bn?: string
          division_id?: number
          division_name?: string
          division_name_bn?: string
          id?: string
          is_active?: boolean
          post_code?: string | null
          upazila_id?: number | null
          upazila_name?: string | null
          upazila_name_bn?: string | null
        }
        Relationships: []
      }
      machineries: {
        Row: {
          branch_id: string | null
          brand: string | null
          capacity_unit: string | null
          category: string
          changeover_time_mins: number | null
          code: string
          company_id: string
          created_at: string
          default_operator_requirement: string | null
          department: string
          description: string | null
          dimension_unit: string | null
          electricity_cost_per_hour: number
          estimated_speed: number | null
          hourly_machine_cost: number
          id: string
          installation_date: string | null
          is_archived: boolean
          location: string | null
          machine_type: string
          maintenance_cost_per_hour: number
          max_height: number | null
          max_length: number | null
          max_width: number | null
          min_height: number | null
          min_width: number | null
          model: string | null
          name: string
          operators_required_count: number
          other_operating_cost_per_hour: number
          per_unit_machine_cost: number
          photo_url: string | null
          production_capacity: number | null
          purchase_cost: number
          purchase_date: string | null
          serial_number: string | null
          setup_time_mins: number | null
          speed_unit: string | null
          status: string
          status_notes: string | null
          status_updated_at: string | null
          supplier: string | null
          supplier_id: string | null
          supported_materials: string[] | null
          supported_production_types: string[] | null
          supported_units: string[] | null
          updated_at: string
          warranty_expiry: string | null
        }
        Insert: {
          branch_id?: string | null
          brand?: string | null
          capacity_unit?: string | null
          category?: string
          changeover_time_mins?: number | null
          code: string
          company_id: string
          created_at?: string
          default_operator_requirement?: string | null
          department?: string
          description?: string | null
          dimension_unit?: string | null
          electricity_cost_per_hour?: number
          estimated_speed?: number | null
          hourly_machine_cost?: number
          id?: string
          installation_date?: string | null
          is_archived?: boolean
          location?: string | null
          machine_type: string
          maintenance_cost_per_hour?: number
          max_height?: number | null
          max_length?: number | null
          max_width?: number | null
          min_height?: number | null
          min_width?: number | null
          model?: string | null
          name: string
          operators_required_count?: number
          other_operating_cost_per_hour?: number
          per_unit_machine_cost?: number
          photo_url?: string | null
          production_capacity?: number | null
          purchase_cost?: number
          purchase_date?: string | null
          serial_number?: string | null
          setup_time_mins?: number | null
          speed_unit?: string | null
          status?: string
          status_notes?: string | null
          status_updated_at?: string | null
          supplier?: string | null
          supplier_id?: string | null
          supported_materials?: string[] | null
          supported_production_types?: string[] | null
          supported_units?: string[] | null
          updated_at?: string
          warranty_expiry?: string | null
        }
        Update: {
          branch_id?: string | null
          brand?: string | null
          capacity_unit?: string | null
          category?: string
          changeover_time_mins?: number | null
          code?: string
          company_id?: string
          created_at?: string
          default_operator_requirement?: string | null
          department?: string
          description?: string | null
          dimension_unit?: string | null
          electricity_cost_per_hour?: number
          estimated_speed?: number | null
          hourly_machine_cost?: number
          id?: string
          installation_date?: string | null
          is_archived?: boolean
          location?: string | null
          machine_type?: string
          maintenance_cost_per_hour?: number
          max_height?: number | null
          max_length?: number | null
          max_width?: number | null
          min_height?: number | null
          min_width?: number | null
          model?: string | null
          name?: string
          operators_required_count?: number
          other_operating_cost_per_hour?: number
          per_unit_machine_cost?: number
          photo_url?: string | null
          production_capacity?: number | null
          purchase_cost?: number
          purchase_date?: string | null
          serial_number?: string | null
          setup_time_mins?: number | null
          speed_unit?: string | null
          status?: string
          status_notes?: string | null
          status_updated_at?: string | null
          supplier?: string | null
          supplier_id?: string | null
          supported_materials?: string[] | null
          supported_production_types?: string[] | null
          supported_units?: string[] | null
          updated_at?: string
          warranty_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "machineries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machineries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machineries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      machinery_assignments: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          job_order_id: string | null
          machine_id: string
          notes: string | null
          operator_id: string | null
          operator_name: string | null
          production_job_id: string | null
          production_task_id: string | null
          scheduled_end: string
          scheduled_start: string
          status: string
          task_name: string | null
          task_type: string | null
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          job_order_id?: string | null
          machine_id: string
          notes?: string | null
          operator_id?: string | null
          operator_name?: string | null
          production_job_id?: string | null
          production_task_id?: string | null
          scheduled_end: string
          scheduled_start: string
          status?: string
          task_name?: string | null
          task_type?: string | null
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          job_order_id?: string | null
          machine_id?: string
          notes?: string | null
          operator_id?: string | null
          operator_name?: string | null
          production_job_id?: string | null
          production_task_id?: string | null
          scheduled_end?: string
          scheduled_start?: string
          status?: string
          task_name?: string | null
          task_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "machinery_assignments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machinery_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machinery_assignments_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machinery_assignments_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machineries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machinery_assignments_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machinery_assignments_production_task_id_fkey"
            columns: ["production_task_id"]
            isOneToOne: false
            referencedRelation: "production_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      machinery_breakdowns: {
        Row: {
          affected_job_order_id: string | null
          affected_production_job_id: string | null
          attachment_url: string | null
          company_id: string
          created_at: string
          diagnosis: string | null
          downtime_minutes: number
          id: string
          machine_id: string
          parts_replaced: string | null
          problem_description: string
          problem_title: string
          production_impact: string
          repair_action: string | null
          repair_cost: number
          reported_at: string
          reported_by_id: string | null
          reported_by_name: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by_name: string | null
          severity: string
          status: string
          technician_name: string | null
          updated_at: string
        }
        Insert: {
          affected_job_order_id?: string | null
          affected_production_job_id?: string | null
          attachment_url?: string | null
          company_id: string
          created_at?: string
          diagnosis?: string | null
          downtime_minutes?: number
          id?: string
          machine_id: string
          parts_replaced?: string | null
          problem_description: string
          problem_title: string
          production_impact?: string
          repair_action?: string | null
          repair_cost?: number
          reported_at?: string
          reported_by_id?: string | null
          reported_by_name: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_name?: string | null
          severity?: string
          status?: string
          technician_name?: string | null
          updated_at?: string
        }
        Update: {
          affected_job_order_id?: string | null
          affected_production_job_id?: string | null
          attachment_url?: string | null
          company_id?: string
          created_at?: string
          diagnosis?: string | null
          downtime_minutes?: number
          id?: string
          machine_id?: string
          parts_replaced?: string | null
          problem_description?: string
          problem_title?: string
          production_impact?: string
          repair_action?: string | null
          repair_cost?: number
          reported_at?: string
          reported_by_id?: string | null
          reported_by_name?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_name?: string | null
          severity?: string
          status?: string
          technician_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "machinery_breakdowns_affected_job_order_id_fkey"
            columns: ["affected_job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machinery_breakdowns_affected_production_job_id_fkey"
            columns: ["affected_production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machinery_breakdowns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machinery_breakdowns_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machineries"
            referencedColumns: ["id"]
          },
        ]
      }
      machinery_maintenances: {
        Row: {
          attachment_url: string | null
          company_id: string
          cost: number
          created_at: string
          created_by: string | null
          end_time: string | null
          id: string
          machine_id: string
          maintenance_type: string
          next_maintenance_date: string | null
          notes: string | null
          parts_used: string | null
          problem_description: string | null
          scheduled_date: string
          start_time: string | null
          status: string
          technician_name: string | null
          updated_at: string
          vendor_name: string | null
          work_performed: string | null
        }
        Insert: {
          attachment_url?: string | null
          company_id: string
          cost?: number
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          id?: string
          machine_id: string
          maintenance_type: string
          next_maintenance_date?: string | null
          notes?: string | null
          parts_used?: string | null
          problem_description?: string | null
          scheduled_date: string
          start_time?: string | null
          status?: string
          technician_name?: string | null
          updated_at?: string
          vendor_name?: string | null
          work_performed?: string | null
        }
        Update: {
          attachment_url?: string | null
          company_id?: string
          cost?: number
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          id?: string
          machine_id?: string
          maintenance_type?: string
          next_maintenance_date?: string | null
          notes?: string | null
          parts_used?: string | null
          problem_description?: string | null
          scheduled_date?: string
          start_time?: string | null
          status?: string
          technician_name?: string | null
          updated_at?: string
          vendor_name?: string | null
          work_performed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "machinery_maintenances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machinery_maintenances_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machineries"
            referencedColumns: ["id"]
          },
        ]
      }
      material_issue_items: {
        Row: {
          company_id: string
          id: string
          issue_id: string
          issued_quantity: number
          location_id: string | null
          material_id: string
          material_name: string
          notes: string | null
          unit: string
          unit_cost: number
        }
        Insert: {
          company_id: string
          id?: string
          issue_id: string
          issued_quantity: number
          location_id?: string | null
          material_id: string
          material_name: string
          notes?: string | null
          unit: string
          unit_cost?: number
        }
        Update: {
          company_id?: string
          id?: string
          issue_id?: string
          issued_quantity?: number
          location_id?: string | null
          material_id?: string
          material_name?: string
          notes?: string | null
          unit?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "material_issue_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_issue_items_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "material_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_issue_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_issue_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      material_issues: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          id: string
          issue_date: string
          issue_number: string
          issued_by_id: string | null
          issued_by_name: string
          issued_to_id: string | null
          issued_to_name: string | null
          job_order_id: string | null
          notes: string | null
          production_task_id: string | null
          request_id: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          issue_date?: string
          issue_number: string
          issued_by_id?: string | null
          issued_by_name: string
          issued_to_id?: string | null
          issued_to_name?: string | null
          job_order_id?: string | null
          notes?: string | null
          production_task_id?: string | null
          request_id?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          issue_date?: string
          issue_number?: string
          issued_by_id?: string | null
          issued_by_name?: string
          issued_to_id?: string | null
          issued_to_name?: string | null
          job_order_id?: string | null
          notes?: string | null
          production_task_id?: string | null
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_issues_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_issues_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_issues_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_issues_production_task_id_fkey"
            columns: ["production_task_id"]
            isOneToOne: false
            referencedRelation: "production_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_issues_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "material_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      material_purchase_configs: {
        Row: {
          company_id: string
          config_name: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          item_code_sku: string | null
          length_ft: number
          material_id: string
          purchase_price: number
          supplier_id: string | null
          unit: string
          updated_at: string
          width_ft: number
        }
        Insert: {
          company_id: string
          config_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          item_code_sku?: string | null
          length_ft?: number
          material_id: string
          purchase_price?: number
          supplier_id?: string | null
          unit?: string
          updated_at?: string
          width_ft: number
        }
        Update: {
          company_id?: string
          config_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          item_code_sku?: string | null
          length_ft?: number
          material_id?: string
          purchase_price?: number
          supplier_id?: string | null
          unit?: string
          updated_at?: string
          width_ft?: number
        }
        Relationships: [
          {
            foreignKeyName: "material_purchase_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_purchase_configs_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_purchase_configs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      material_request_items: {
        Row: {
          approved_quantity: number | null
          company_id: string
          id: string
          issued_quantity: number | null
          location_id: string | null
          material_id: string
          material_name: string
          notes: string | null
          request_id: string
          requested_quantity: number
          status: string
          unit: string
        }
        Insert: {
          approved_quantity?: number | null
          company_id: string
          id?: string
          issued_quantity?: number | null
          location_id?: string | null
          material_id: string
          material_name: string
          notes?: string | null
          request_id: string
          requested_quantity: number
          status?: string
          unit: string
        }
        Update: {
          approved_quantity?: number | null
          company_id?: string
          id?: string
          issued_quantity?: number | null
          location_id?: string | null
          material_id?: string
          material_name?: string
          notes?: string | null
          request_id?: string
          requested_quantity?: number
          status?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_request_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_request_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_request_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "material_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      material_requests: {
        Row: {
          approved_at: string | null
          approved_by_id: string | null
          approved_by_name: string | null
          branch_id: string | null
          company_id: string
          created_at: string
          id: string
          job_order_id: string | null
          notes: string | null
          priority: string
          production_task_id: string | null
          rejection_reason: string | null
          request_number: string
          requested_by_id: string | null
          requested_by_name: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_id?: string | null
          approved_by_name?: string | null
          branch_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          job_order_id?: string | null
          notes?: string | null
          priority?: string
          production_task_id?: string | null
          rejection_reason?: string | null
          request_number: string
          requested_by_id?: string | null
          requested_by_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by_id?: string | null
          approved_by_name?: string | null
          branch_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          job_order_id?: string | null
          notes?: string | null
          priority?: string
          production_task_id?: string | null
          rejection_reason?: string | null
          request_number?: string
          requested_by_id?: string | null
          requested_by_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_requests_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_requests_production_task_id_fkey"
            columns: ["production_task_id"]
            isOneToOne: false
            referencedRelation: "production_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      material_wastages: {
        Row: {
          actual_usage: number
          company_id: string
          created_at: string
          estimated_cost: number
          expected_usage: number
          id: string
          job_order_id: string | null
          material_id: string
          unit: string
          wastage_quantity: number
          wastage_reason: string
        }
        Insert: {
          actual_usage: number
          company_id: string
          created_at?: string
          estimated_cost?: number
          expected_usage: number
          id?: string
          job_order_id?: string | null
          material_id: string
          unit: string
          wastage_quantity: number
          wastage_reason: string
        }
        Update: {
          actual_usage?: number
          company_id?: string
          created_at?: string
          estimated_cost?: number
          expected_usage?: number
          id?: string
          job_order_id?: string | null
          material_id?: string
          unit?: string
          wastage_quantity?: number
          wastage_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_wastages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_wastages_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_wastages_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          available_sheet_sizes: Json | null
          available_widths_ft: number[] | null
          average_cost: number
          base_unit: string | null
          branch_id: string | null
          brand: string | null
          category: string
          color: string | null
          company_id: string
          coverage_rate_sft_per_unit: number | null
          created_at: string
          created_by: string | null
          current_stock: number
          default_allowance_per_side_in: number | null
          dimension_unit: string | null
          finishing: string | null
          gsm: number | null
          id: string
          is_active: boolean
          is_roll: boolean
          last_purchase_price: number
          length: number | null
          location: string | null
          manual_cost: number
          material_config: Json | null
          material_type: string
          min_stock_level: number
          name: string
          name_bn: string | null
          notes: string | null
          production_width_allowance: number | null
          purchase_price_per_sft: number | null
          reorder_level: number | null
          roll_length_ft: number | null
          roll_sizes: Json | null
          roll_width_ft: number | null
          sheet_sizes: Json | null
          sku: string
          specification: string | null
          standard_roll_length_ft: number | null
          thickness: number | null
          total_roll_area_sft: number | null
          unit: string
          updated_at: string
          valuation_method: string
          width: number | null
        }
        Insert: {
          available_sheet_sizes?: Json | null
          available_widths_ft?: number[] | null
          average_cost?: number
          base_unit?: string | null
          branch_id?: string | null
          brand?: string | null
          category: string
          color?: string | null
          company_id: string
          coverage_rate_sft_per_unit?: number | null
          created_at?: string
          created_by?: string | null
          current_stock?: number
          default_allowance_per_side_in?: number | null
          dimension_unit?: string | null
          finishing?: string | null
          gsm?: number | null
          id?: string
          is_active?: boolean
          is_roll?: boolean
          last_purchase_price?: number
          length?: number | null
          location?: string | null
          manual_cost?: number
          material_config?: Json | null
          material_type?: string
          min_stock_level?: number
          name: string
          name_bn?: string | null
          notes?: string | null
          production_width_allowance?: number | null
          purchase_price_per_sft?: number | null
          reorder_level?: number | null
          roll_length_ft?: number | null
          roll_sizes?: Json | null
          roll_width_ft?: number | null
          sheet_sizes?: Json | null
          sku: string
          specification?: string | null
          standard_roll_length_ft?: number | null
          thickness?: number | null
          total_roll_area_sft?: number | null
          unit: string
          updated_at?: string
          valuation_method?: string
          width?: number | null
        }
        Update: {
          available_sheet_sizes?: Json | null
          available_widths_ft?: number[] | null
          average_cost?: number
          base_unit?: string | null
          branch_id?: string | null
          brand?: string | null
          category?: string
          color?: string | null
          company_id?: string
          coverage_rate_sft_per_unit?: number | null
          created_at?: string
          created_by?: string | null
          current_stock?: number
          default_allowance_per_side_in?: number | null
          dimension_unit?: string | null
          finishing?: string | null
          gsm?: number | null
          id?: string
          is_active?: boolean
          is_roll?: boolean
          last_purchase_price?: number
          length?: number | null
          location?: string | null
          manual_cost?: number
          material_config?: Json | null
          material_type?: string
          min_stock_level?: number
          name?: string
          name_bn?: string | null
          notes?: string | null
          production_width_allowance?: number | null
          purchase_price_per_sft?: number | null
          reorder_level?: number | null
          roll_length_ft?: number | null
          roll_sizes?: Json | null
          roll_width_ft?: number | null
          sheet_sizes?: Json | null
          sku?: string
          specification?: string | null
          standard_roll_length_ft?: number | null
          thickness?: number | null
          total_roll_area_sft?: number | null
          unit?: string
          updated_at?: string
          valuation_method?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_units: {
        Row: {
          category: string
          code: string
          name_bn: string
          name_en: string
          symbol_bn: string
          symbol_en: string
        }
        Insert: {
          category: string
          code: string
          name_bn: string
          name_en: string
          symbol_bn: string
          symbol_en: string
        }
        Update: {
          category?: string
          code?: string
          name_bn?: string
          name_en?: string
          symbol_bn?: string
          symbol_en?: string
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          body_bn: string
          body_en: string
          channel: string
          company_id: string
          created_at: string
          id: string
          name: string
          template_key: string
          updated_at: string
        }
        Insert: {
          body_bn: string
          body_en: string
          channel: string
          company_id: string
          created_at?: string
          id?: string
          name: string
          template_key: string
          updated_at?: string
        }
        Update: {
          body_bn?: string
          body_en?: string
          channel?: string
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          event_type: string
          id: string
          in_app_enabled: boolean
          sms_enabled: boolean
          tenant_id: string
          updated_at: string
          whatsapp_enabled: boolean
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          event_type: string
          id?: string
          in_app_enabled?: boolean
          sms_enabled?: boolean
          tenant_id: string
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          event_type?: string
          id?: string
          in_app_enabled?: boolean
          sms_enabled?: boolean
          tenant_id?: string
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      order_timeline_events: {
        Row: {
          actor_name: string
          created_at: string
          description: string | null
          id: string
          order_id: string
          stage: string
          title: string
        }
        Insert: {
          actor_name: string
          created_at?: string
          description?: string | null
          id?: string
          order_id: string
          stage: string
          title: string
        }
        Update: {
          actor_name?: string
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string
          stage?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_timeline_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_requests: {
        Row: {
          attempt_count: number
          channel: string
          created_at: string
          expires_at: string
          id: string
          is_verified: boolean
          max_attempts: number
          metadata: Json | null
          otp_hash: string
          phone_number: string
          purpose: string
          resend_available_at: string
          tenant_id: string | null
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          attempt_count?: number
          channel?: string
          created_at?: string
          expires_at: string
          id?: string
          is_verified?: boolean
          max_attempts?: number
          metadata?: Json | null
          otp_hash: string
          phone_number: string
          purpose: string
          resend_available_at?: string
          tenant_id?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          attempt_count?: number
          channel?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_verified?: boolean
          max_attempts?: number
          metadata?: Json | null
          otp_hash?: string
          phone_number?: string
          purpose?: string
          resend_available_at?: string
          tenant_id?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "otp_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      overtime_records: {
        Row: {
          approved_at: string | null
          approved_by_id: string | null
          approved_by_name: string | null
          attendance_id: string | null
          base_hourly_rate: number
          branch_id: string | null
          calculated_amount: number
          company_id: string
          created_at: string
          duration_hours: number | null
          duration_minutes: number
          effective_ot_rate: number | null
          employee_id: string
          end_time: string | null
          id: string
          multiplier: number
          ot_date: string
          ot_type: string
          payroll_period_id: string | null
          reason: string
          rejection_reason: string | null
          requested_by_id: string | null
          requested_by_name: string
          start_time: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_id?: string | null
          approved_by_name?: string | null
          attendance_id?: string | null
          base_hourly_rate: number
          branch_id?: string | null
          calculated_amount: number
          company_id: string
          created_at?: string
          duration_hours?: number | null
          duration_minutes: number
          effective_ot_rate?: number | null
          employee_id: string
          end_time?: string | null
          id?: string
          multiplier?: number
          ot_date?: string
          ot_type?: string
          payroll_period_id?: string | null
          reason: string
          rejection_reason?: string | null
          requested_by_id?: string | null
          requested_by_name?: string
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by_id?: string | null
          approved_by_name?: string | null
          attendance_id?: string | null
          base_hourly_rate?: number
          branch_id?: string | null
          calculated_amount?: number
          company_id?: string
          created_at?: string
          duration_hours?: number | null
          duration_minutes?: number
          effective_ot_rate?: number | null
          employee_id?: string
          end_time?: string | null
          id?: string
          multiplier?: number
          ot_date?: string
          ot_type?: string
          payroll_period_id?: string | null
          reason?: string
          rejection_reason?: string | null
          requested_by_id?: string | null
          requested_by_name?: string
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "overtime_records_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "attendance_daily_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_records_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_records_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_adjustments: {
        Row: {
          adjusted_amount: number
          authorized_by_id: string | null
          authorized_by_name: string
          company_id: string
          created_at: string
          difference_amount: number
          id: string
          original_amount: number
          payment_id: string
          reason: string
          type: string
        }
        Insert: {
          adjusted_amount: number
          authorized_by_id?: string | null
          authorized_by_name: string
          company_id: string
          created_at?: string
          difference_amount: number
          id?: string
          original_amount: number
          payment_id: string
          reason: string
          type: string
        }
        Update: {
          adjusted_amount?: number
          authorized_by_id?: string | null
          authorized_by_name?: string
          company_id?: string
          created_at?: string
          difference_amount?: number
          id?: string
          original_amount?: number
          payment_id?: string
          reason?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_adjustments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_adjustments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          allocated_amount: number
          created_at: string
          id: string
          invoice_id: string
          payment_id: string
        }
        Insert: {
          allocated_amount: number
          created_at?: string
          id?: string
          invoice_id: string
          payment_id: string
        }
        Update: {
          allocated_amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          actor_user_id: string | null
          amount: number
          bank_name: string | null
          branch_id: string | null
          cheque_date: string | null
          cheque_number: string | null
          company_id: string
          created_at: string
          customer_id: string | null
          customer_name: string
          id: string
          idempotency_key: string | null
          mfs_transaction_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string
          payment_type: string
          receipt_number: string
          received_by_name: string
          unallocated_amount: number
        }
        Insert: {
          actor_user_id?: string | null
          amount: number
          bank_name?: string | null
          branch_id?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          company_id: string
          created_at?: string
          customer_id?: string | null
          customer_name: string
          id?: string
          idempotency_key?: string | null
          mfs_transaction_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method: string
          payment_type: string
          receipt_number: string
          received_by_name: string
          unallocated_amount?: number
        }
        Update: {
          actor_user_id?: string | null
          amount?: number
          bank_name?: string | null
          branch_id?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          company_id?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          id?: string
          idempotency_key?: string | null
          mfs_transaction_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_type?: string
          receipt_number?: string
          received_by_name?: string
          unallocated_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_items: {
        Row: {
          absence_deduction: number
          advance_remaining_balance: number
          advance_salary_deducted: number
          allowances: number
          allowances_breakdown: Json | null
          base_salary: number
          bonuses: number
          company_id: string | null
          created_at: string
          daily_rate: number
          days_present: number
          due_amount: number
          employee_id: string
          employee_type: string
          gross_salary: number
          hourly_rate: number
          hours_worked: number
          id: string
          late_fine: number
          loan_deduction: number
          net_salary: number
          other_deductions: number
          overtime_amount: number
          overtime_hours: number
          paid_amount: number
          payment_status: string
          payroll_period_id: string
          salary_basis: string
          snapshot_data: Json | null
          updated_at: string
        }
        Insert: {
          absence_deduction?: number
          advance_remaining_balance?: number
          advance_salary_deducted?: number
          allowances?: number
          allowances_breakdown?: Json | null
          base_salary?: number
          bonuses?: number
          company_id?: string | null
          created_at?: string
          daily_rate?: number
          days_present?: number
          due_amount?: number
          employee_id: string
          employee_type?: string
          gross_salary?: number
          hourly_rate?: number
          hours_worked?: number
          id?: string
          late_fine?: number
          loan_deduction?: number
          net_salary?: number
          other_deductions?: number
          overtime_amount?: number
          overtime_hours?: number
          paid_amount?: number
          payment_status?: string
          payroll_period_id: string
          salary_basis?: string
          snapshot_data?: Json | null
          updated_at?: string
        }
        Update: {
          absence_deduction?: number
          advance_remaining_balance?: number
          advance_salary_deducted?: number
          allowances?: number
          allowances_breakdown?: Json | null
          base_salary?: number
          bonuses?: number
          company_id?: string | null
          created_at?: string
          daily_rate?: number
          days_present?: number
          due_amount?: number
          employee_id?: string
          employee_type?: string
          gross_salary?: number
          hourly_rate?: number
          hours_worked?: number
          id?: string
          late_fine?: number
          loan_deduction?: number
          net_salary?: number
          other_deductions?: number
          overtime_amount?: number
          overtime_hours?: number
          paid_amount?: number
          payment_status?: string
          payroll_period_id?: string
          salary_basis?: string
          snapshot_data?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          approved_at: string | null
          approved_by_id: string | null
          approved_by_name: string | null
          branch_id: string | null
          company_id: string
          created_at: string
          end_date: string
          id: string
          locked_at: string | null
          notes: string | null
          period_name: string
          start_date: string
          status: string
          total_advances_deducted: number
          total_due_amount: number
          total_gross_salary: number
          total_net_salary: number
          total_ot_amount: number
          total_other_deductions: number
          total_paid_amount: number
          updated_at: string
          working_days_count: number
        }
        Insert: {
          approved_at?: string | null
          approved_by_id?: string | null
          approved_by_name?: string | null
          branch_id?: string | null
          company_id: string
          created_at?: string
          end_date: string
          id?: string
          locked_at?: string | null
          notes?: string | null
          period_name: string
          start_date: string
          status?: string
          total_advances_deducted?: number
          total_due_amount?: number
          total_gross_salary?: number
          total_net_salary?: number
          total_ot_amount?: number
          total_other_deductions?: number
          total_paid_amount?: number
          updated_at?: string
          working_days_count?: number
        }
        Update: {
          approved_at?: string | null
          approved_by_id?: string | null
          approved_by_name?: string | null
          branch_id?: string | null
          company_id?: string
          created_at?: string
          end_date?: string
          id?: string
          locked_at?: string | null
          notes?: string | null
          period_name?: string
          start_date?: string
          status?: string
          total_advances_deducted?: number
          total_due_amount?: number
          total_gross_salary?: number
          total_net_salary?: number
          total_ot_amount?: number
          total_other_deductions?: number
          total_paid_amount?: number
          updated_at?: string
          working_days_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_periods_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string | null
          code: string
          created_at: string
          description: string | null
          id: string
          module: string
          name: string
          resource: string | null
        }
        Insert: {
          action?: string | null
          code: string
          created_at?: string
          description?: string | null
          id?: string
          module: string
          name: string
          resource?: string | null
        }
        Update: {
          action?: string | null
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          module?: string
          name?: string
          resource?: string | null
        }
        Relationships: []
      }
      plan_versions: {
        Row: {
          change_summary: string | null
          code: string
          created_at: string
          created_by: string | null
          currency: string
          features: string[]
          hard_limits: Json
          id: string
          max_branches: number
          max_customers: number
          max_products: number
          max_users: number
          monthly_orders: number
          name: string
          name_bn: string | null
          overage_policy: string
          plan_id: string
          price_monthly: number
          price_yearly: number
          soft_limits: Json
          storage_gb: number
          version: number
        }
        Insert: {
          change_summary?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          currency?: string
          features?: string[]
          hard_limits?: Json
          id?: string
          max_branches: number
          max_customers: number
          max_products: number
          max_users: number
          monthly_orders: number
          name: string
          name_bn?: string | null
          overage_policy?: string
          plan_id: string
          price_monthly: number
          price_yearly: number
          soft_limits?: Json
          storage_gb: number
          version: number
        }
        Update: {
          change_summary?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          features?: string[]
          hard_limits?: Json
          id?: string
          max_branches?: number
          max_customers?: number
          max_products?: number
          max_users?: number
          monthly_orders?: number
          name?: string
          name_bn?: string | null
          overage_policy?: string
          plan_id?: string
          price_monthly?: number
          price_yearly?: number
          soft_limits?: Json
          storage_gb?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_versions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_active_sessions: {
        Row: {
          created_at: string
          device_name: string | null
          id: string
          ip_address: string | null
          is_revoked: boolean
          last_seen_at: string
          location: string | null
          platform_admin_id: string
          session_token_hash: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          device_name?: string | null
          id?: string
          ip_address?: string | null
          is_revoked?: boolean
          last_seen_at?: string
          location?: string | null
          platform_admin_id: string
          session_token_hash: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          device_name?: string | null
          id?: string
          ip_address?: string | null
          is_revoked?: boolean
          last_seen_at?: string
          location?: string | null
          platform_admin_id?: string
          session_token_hash?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_active_sessions_platform_admin_id_fkey"
            columns: ["platform_admin_id"]
            isOneToOne: false
            referencedRelation: "platform_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          last_login_at: string | null
          mfa_enabled: boolean
          phone: string | null
          preferences: Json
          responsibilities: Json
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          mfa_enabled?: boolean
          phone?: string | null
          preferences?: Json
          responsibilities?: Json
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          mfa_enabled?: boolean
          phone?: string | null
          preferences?: Json
          responsibilities?: Json
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_audit_logs: {
        Row: {
          action: string
          actor_email: string
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          platform_admin_id: string | null
          target_company_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          platform_admin_id?: string | null
          target_company_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          platform_admin_id?: string | null
          target_company_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_audit_logs_platform_admin_id_fkey"
            columns: ["platform_admin_id"]
            isOneToOne: false
            referencedRelation: "platform_admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_audit_logs_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_background_jobs: {
        Row: {
          attempts: number
          company_id: string | null
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_log: string | null
          id: string
          job_type: string
          last_error_details: Json | null
          max_attempts: number
          payload: Json | null
          scheduled_for: string
          started_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_log?: string | null
          id?: string
          job_type: string
          last_error_details?: Json | null
          max_attempts?: number
          payload?: Json | null
          scheduled_for?: string
          started_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_log?: string | null
          id?: string
          job_type?: string
          last_error_details?: Json | null
          max_attempts?: number
          payload?: Json | null
          scheduled_for?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_background_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_emergency_controls: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          activated_by_email: string | null
          control_key: string
          created_at: string
          deactivated_at: string | null
          description: string
          id: string
          is_active: boolean
          name: string
          reason: string | null
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          activated_by_email?: string | null
          control_key: string
          created_at?: string
          deactivated_at?: string | null
          description: string
          id?: string
          is_active?: boolean
          name: string
          reason?: string | null
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          activated_by_email?: string | null
          control_key?: string
          created_at?: string
          deactivated_at?: string | null
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_emergency_controls_activated_by_fkey"
            columns: ["activated_by"]
            isOneToOne: false
            referencedRelation: "platform_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_feature_flags: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean
          key: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          key: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          key?: string
          name?: string
        }
        Relationships: []
      }
      platform_incidents: {
        Row: {
          affected_tenants_count: number
          created_at: string
          created_by: string | null
          description: string
          id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          root_cause: string | null
          service_name: string
          severity: string
          started_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          affected_tenants_count?: number
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          root_cause?: string | null
          service_name: string
          severity?: string
          started_at?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          affected_tenants_count?: number
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          root_cause?: string | null
          service_name?: string
          severity?: string
          started_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_incidents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "platform_admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_incidents_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "platform_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_notifications: {
        Row: {
          action_url: string | null
          company_id: string | null
          company_name: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          read_at: string | null
          recipient_user_id: string | null
          severity: string
          target_audience: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          action_url?: string | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          read_at?: string | null
          recipient_user_id?: string | null
          severity?: string
          target_audience?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          action_url?: string | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          read_at?: string | null
          recipient_user_id?: string | null
          severity?: string
          target_audience?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_plans: {
        Row: {
          code: string
          created_at: string
          features: Json
          id: string
          is_active: boolean
          max_branches: number
          max_users: number
          name: string
          price_bdt_monthly: number
          price_bdt_yearly: number
        }
        Insert: {
          code: string
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          max_branches: number
          max_users: number
          name: string
          price_bdt_monthly: number
          price_bdt_yearly: number
        }
        Update: {
          code?: string
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          max_branches?: number
          max_users?: number
          name?: string
          price_bdt_monthly?: number
          price_bdt_yearly?: number
        }
        Relationships: []
      }
      platform_role_template_permissions: {
        Row: {
          action: string
          created_at: string
          id: string
          is_allowed: boolean
          resource: string
          role_template_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          is_allowed?: boolean
          resource: string
          role_template_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          is_allowed?: boolean
          resource?: string
          role_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_role_template_permissions_role_template_id_fkey"
            columns: ["role_template_id"]
            isOneToOne: false
            referencedRelation: "platform_role_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_role_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          name_bn: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          name_bn?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          name_bn?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_saas_plans: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          is_public: boolean
          limits: Json
          monthly_price: number
          name: string
          slug: string
          sort_order: number
          trial_days: number
          updated_at: string
          yearly_price: number
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_public?: boolean
          limits?: Json
          monthly_price: number
          name: string
          slug: string
          sort_order?: number
          trial_days?: number
          updated_at?: string
          yearly_price: number
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_public?: boolean
          limits?: Json
          monthly_price?: number
          name?: string
          slug?: string
          sort_order?: number
          trial_days?: number
          updated_at?: string
          yearly_price?: number
        }
        Relationships: []
      }
      platform_subscription_events: {
        Row: {
          created_at: string
          effective_date: string | null
          event_type: string
          id: string
          metadata: Json
          new_plan_id: string | null
          new_status: string | null
          performed_by: string | null
          platform_account_id: string
          previous_plan_id: string | null
          previous_status: string | null
          reason: string | null
          subscription_id: string | null
          transaction_id: string | null
        }
        Insert: {
          created_at?: string
          effective_date?: string | null
          event_type: string
          id?: string
          metadata?: Json
          new_plan_id?: string | null
          new_status?: string | null
          performed_by?: string | null
          platform_account_id: string
          previous_plan_id?: string | null
          previous_status?: string | null
          reason?: string | null
          subscription_id?: string | null
          transaction_id?: string | null
        }
        Update: {
          created_at?: string
          effective_date?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          new_plan_id?: string | null
          new_status?: string | null
          performed_by?: string | null
          platform_account_id?: string
          previous_plan_id?: string | null
          previous_status?: string | null
          reason?: string | null
          subscription_id?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_subscription_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "platform_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_subscriptions: {
        Row: {
          billing_cycle: string
          cancel_at_period_end: boolean
          cancelled_at: string | null
          change_effective_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          grace_period_end: string | null
          id: string
          metadata: Json
          next_plan_id: string | null
          plan_id: string | null
          platform_account_id: string
          previous_plan_id: string | null
          provider: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          started_at: string
          status: string
          trial_end: string | null
          trial_start: string
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          change_effective_at?: string | null
          created_at?: string
          current_period_end: string
          current_period_start?: string
          grace_period_end?: string | null
          id?: string
          metadata?: Json
          next_plan_id?: string | null
          plan_id?: string | null
          platform_account_id?: string
          previous_plan_id?: string | null
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          started_at?: string
          status?: string
          trial_end?: string | null
          trial_start?: string
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          change_effective_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          grace_period_end?: string | null
          id?: string
          metadata?: Json
          next_plan_id?: string | null
          plan_id?: string | null
          platform_account_id?: string
          previous_plan_id?: string | null
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          started_at?: string
          status?: string
          trial_end?: string | null
          trial_start?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_subscriptions_next_plan_id_fkey"
            columns: ["next_plan_id"]
            isOneToOne: false
            referencedRelation: "platform_saas_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "platform_saas_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_subscriptions_previous_plan_id_fkey"
            columns: ["previous_plan_id"]
            isOneToOne: false
            referencedRelation: "platform_saas_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_support_sessions: {
        Row: {
          access_level: string
          company_id: string
          created_at: string
          expires_at: string
          id: string
          platform_admin_id: string
          reason: string
          revoked_at: string | null
          revoked_by: string | null
          session_token_hash: string
          started_at: string
          status: string
        }
        Insert: {
          access_level?: string
          company_id: string
          created_at?: string
          expires_at?: string
          id?: string
          platform_admin_id: string
          reason: string
          revoked_at?: string | null
          revoked_by?: string | null
          session_token_hash: string
          started_at?: string
          status?: string
        }
        Update: {
          access_level?: string
          company_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          platform_admin_id?: string
          reason?: string
          revoked_at?: string | null
          revoked_by?: string | null
          session_token_hash?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_support_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_support_sessions_platform_admin_id_fkey"
            columns: ["platform_admin_id"]
            isOneToOne: false
            referencedRelation: "platform_admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_support_sessions_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "platform_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_system_health_events: {
        Row: {
          category: string
          company_id: string | null
          created_at: string
          error_details: Json
          id: string
          message: string
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          service_name: string
          severity: string
        }
        Insert: {
          category: string
          company_id?: string | null
          created_at?: string
          error_details?: Json
          id?: string
          message: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          service_name: string
          severity?: string
        }
        Update: {
          category?: string
          company_id?: string | null
          created_at?: string
          error_details?: Json
          id?: string
          message?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          service_name?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_system_health_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_system_health_events_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "platform_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_system_settings: {
        Row: {
          app_description: string
          app_domain: string
          app_logo_url: string | null
          app_name: string
          app_tagline: string
          app_title: string
          auto_backup_enabled: boolean
          backup_retention_days: number
          contact_address: string
          contact_email: string
          contact_phone: string
          default_currency: string
          default_trial_days: number
          default_vat_rate_pct: number
          favicon_url: string
          id: string
          incident_alert_webhook: string | null
          last_backup_at: string
          last_restore_status: string
          last_restore_test_at: string
          maintenance_message: string
          maintenance_mode_enabled: boolean
          max_export_records: number
          mfa_required_for_admins: boolean
          rate_limit_requests_per_minute: number
          session_timeout_minutes: number
          support_helpline: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          app_description?: string
          app_domain?: string
          app_logo_url?: string | null
          app_name?: string
          app_tagline?: string
          app_title?: string
          auto_backup_enabled?: boolean
          backup_retention_days?: number
          contact_address?: string
          contact_email?: string
          contact_phone?: string
          default_currency?: string
          default_trial_days?: number
          default_vat_rate_pct?: number
          favicon_url?: string
          id?: string
          incident_alert_webhook?: string | null
          last_backup_at?: string
          last_restore_status?: string
          last_restore_test_at?: string
          maintenance_message?: string
          maintenance_mode_enabled?: boolean
          max_export_records?: number
          mfa_required_for_admins?: boolean
          rate_limit_requests_per_minute?: number
          session_timeout_minutes?: number
          support_helpline?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          app_description?: string
          app_domain?: string
          app_logo_url?: string | null
          app_name?: string
          app_tagline?: string
          app_title?: string
          auto_backup_enabled?: boolean
          backup_retention_days?: number
          contact_address?: string
          contact_email?: string
          contact_phone?: string
          default_currency?: string
          default_trial_days?: number
          default_vat_rate_pct?: number
          favicon_url?: string
          id?: string
          incident_alert_webhook?: string | null
          last_backup_at?: string
          last_restore_status?: string
          last_restore_test_at?: string
          maintenance_message?: string
          maintenance_mode_enabled?: boolean
          max_export_records?: number
          mfa_required_for_admins?: boolean
          rate_limit_requests_per_minute?: number
          session_timeout_minutes?: number
          support_helpline?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "platform_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_tenant_exports: {
        Row: {
          company_id: string
          created_at: string
          download_count: number
          download_token: string | null
          expires_at: string
          file_format: string
          id: string
          modules: string[]
          requested_by: string | null
          requested_by_email: string
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          download_count?: number
          download_token?: string | null
          expires_at?: string
          file_format?: string
          id?: string
          modules?: string[]
          requested_by?: string | null
          requested_by_email: string
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          download_count?: number
          download_token?: string | null
          expires_at?: string
          file_format?: string
          id?: string
          modules?: string[]
          requested_by?: string | null
          requested_by_email?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_tenant_exports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_tenant_exports_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "platform_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_tenant_feature_flags: {
        Row: {
          company_id: string
          created_at: string
          flag_id: string
          id: string
          is_enabled: boolean
          notes: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          flag_id: string
          id?: string
          is_enabled?: boolean
          notes?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          flag_id?: string
          id?: string
          is_enabled?: boolean
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_tenant_feature_flags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_tenant_feature_flags_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "platform_feature_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_webhook_events: {
        Row: {
          billing_context: string
          created_at: string
          event_id: string | null
          event_type: string
          failure_reason: string | null
          id: string
          payload: Json
          processed: boolean
          processed_at: string | null
          provider: string
          transaction_id: string | null
          verification_status: string
        }
        Insert: {
          billing_context?: string
          created_at?: string
          event_id?: string | null
          event_type: string
          failure_reason?: string | null
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          provider: string
          transaction_id?: string | null
          verification_status?: string
        }
        Update: {
          billing_context?: string
          created_at?: string
          event_id?: string | null
          event_type?: string
          failure_reason?: string | null
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          provider?: string
          transaction_id?: string | null
          verification_status?: string
        }
        Relationships: []
      }
      price_list_items: {
        Row: {
          company_id: string
          created_at: string
          custom_rate: number | null
          discount_percent: number
          id: string
          price_list_id: string
          product_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          custom_rate?: number | null
          discount_percent?: number
          id?: string
          price_list_id: string
          product_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          custom_rate?: number | null
          discount_percent?: number
          id?: string
          price_list_id?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_list_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_list_items_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_list_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      price_lists: {
        Row: {
          code: string
          company_id: string
          created_at: string
          default_markup_percent: number
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          tier_type: string
          updated_at: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          default_markup_percent?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          tier_type?: string
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          default_markup_percent?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          tier_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_lists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      price_overrides: {
        Row: {
          authorized_by: string | null
          authorized_by_name: string | null
          company_id: string
          created_at: string
          document_code: string | null
          document_id: string | null
          document_type: string | null
          id: string
          original_margin_percent: number | null
          original_price: number
          override_margin_percent: number | null
          override_price: number
          product_id: string | null
          product_name: string | null
          reason: string
          tenant_slug: string | null
        }
        Insert: {
          authorized_by?: string | null
          authorized_by_name?: string | null
          company_id: string
          created_at?: string
          document_code?: string | null
          document_id?: string | null
          document_type?: string | null
          id?: string
          original_margin_percent?: number | null
          original_price: number
          override_margin_percent?: number | null
          override_price: number
          product_id?: string | null
          product_name?: string | null
          reason: string
          tenant_slug?: string | null
        }
        Update: {
          authorized_by?: string | null
          authorized_by_name?: string | null
          company_id?: string
          created_at?: string
          document_code?: string | null
          document_id?: string | null
          document_type?: string | null
          id?: string
          original_margin_percent?: number | null
          original_price?: number
          override_margin_percent?: number | null
          override_price?: number
          product_id?: string | null
          product_name?: string | null
          reason?: string
          tenant_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_overrides_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          adjustment_type: string | null
          adjustment_value: number | null
          approved_at: string | null
          approved_by: string | null
          base_price: number
          calculated_price: number
          category: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string | null
          customer_type: string
          effective_from: string | null
          effective_until: string | null
          fixed_price: number | null
          formula_config: Json | null
          id: string
          margin_basis: string
          minimum_billable_quantity: number | null
          minimum_charge: number | null
          notes: string | null
          pricing_method: string
          pricing_rule_type: string
          product_id: string | null
          requires_approval: boolean
          rounding_rule: string
          status: string
          target_margin: number | null
          tier_ranges: Json | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          adjustment_type?: string | null
          adjustment_value?: number | null
          approved_at?: string | null
          approved_by?: string | null
          base_price?: number
          calculated_price: number
          category?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          customer_type: string
          effective_from?: string | null
          effective_until?: string | null
          fixed_price?: number | null
          formula_config?: Json | null
          id?: string
          margin_basis?: string
          minimum_billable_quantity?: number | null
          minimum_charge?: number | null
          notes?: string | null
          pricing_method?: string
          pricing_rule_type: string
          product_id?: string | null
          requires_approval?: boolean
          rounding_rule?: string
          status?: string
          target_margin?: number | null
          tier_ranges?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          adjustment_type?: string | null
          adjustment_value?: number | null
          approved_at?: string | null
          approved_by?: string | null
          base_price?: number
          calculated_price?: number
          category?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          customer_type?: string
          effective_from?: string | null
          effective_until?: string | null
          fixed_price?: number | null
          formula_config?: Json | null
          id?: string
          margin_basis?: string
          minimum_billable_quantity?: number | null
          minimum_charge?: number | null
          notes?: string | null
          pricing_method?: string
          pricing_rule_type?: string
          product_id?: string | null
          requires_approval?: boolean
          rounding_rule?: string
          status?: string
          target_margin?: number | null
          tier_ranges?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_rules_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      printing_methods: {
        Row: {
          category_id: string | null
          code: string | null
          company_id: string
          compatible_material_types: string[] | null
          cost_per_sqft: number | null
          created_at: string
          default_ink_type: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          name_bn: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          code?: string | null
          company_id: string
          compatible_material_types?: string[] | null
          cost_per_sqft?: number | null
          created_at?: string
          default_ink_type?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          name_bn?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          code?: string | null
          company_id?: string
          compatible_material_types?: string[] | null
          cost_per_sqft?: number | null
          created_at?: string
          default_ink_type?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          name_bn?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "printing_methods_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printing_methods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          applies_to_product_types: string[]
          company_id: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          name_bn: string | null
          parent_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          applies_to_product_types?: string[]
          company_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          name_bn?: string | null
          parent_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          applies_to_product_types?: string[]
          company_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          name_bn?: string | null
          parent_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_formulas: {
        Row: {
          company_id: string
          created_at: string
          finishing_operations: Json
          formula_name: string
          id: string
          is_active: boolean
          labor_operations: Json
          machine_operations: Json
          material_requirements: Json
          min_margin_percent: number
          model: string
          other_costs: Json
          product_id: string
          target_margin_percent: number
          updated_at: string
          version: number
          waste_factor_percent: number
        }
        Insert: {
          company_id: string
          created_at?: string
          finishing_operations?: Json
          formula_name?: string
          id?: string
          is_active?: boolean
          labor_operations?: Json
          machine_operations?: Json
          material_requirements?: Json
          min_margin_percent?: number
          model: string
          other_costs?: Json
          product_id: string
          target_margin_percent?: number
          updated_at?: string
          version?: number
          waste_factor_percent?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          finishing_operations?: Json
          formula_name?: string
          id?: string
          is_active?: boolean
          labor_operations?: Json
          machine_operations?: Json
          material_requirements?: Json
          min_margin_percent?: number
          model?: string
          other_costs?: Json
          product_id?: string
          target_margin_percent?: number
          updated_at?: string
          version?: number
          waste_factor_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_formulas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_formulas_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_price_history: {
        Row: {
          changed_by: string | null
          company_id: string
          created_at: string
          id: string
          new_margin_percent: number | null
          new_price: number
          new_purchase_price: number | null
          new_wastage_percent: number | null
          old_margin_percent: number | null
          old_price: number
          old_purchase_price: number | null
          old_wastage_percent: number | null
          product_id: string
          reason: string | null
        }
        Insert: {
          changed_by?: string | null
          company_id: string
          created_at?: string
          id?: string
          new_margin_percent?: number | null
          new_price: number
          new_purchase_price?: number | null
          new_wastage_percent?: number | null
          old_margin_percent?: number | null
          old_price: number
          old_purchase_price?: number | null
          old_wastage_percent?: number | null
          product_id: string
          reason?: string | null
        }
        Update: {
          changed_by?: string | null
          company_id?: string
          created_at?: string
          id?: string
          new_margin_percent?: number | null
          new_price?: number
          new_purchase_price?: number | null
          new_wastage_percent?: number | null
          old_margin_percent?: number | null
          old_price?: number
          old_purchase_price?: number | null
          old_wastage_percent?: number | null
          product_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_price_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_supplier_prices: {
        Row: {
          company_id: string
          conversion_ratio: number
          created_at: string
          id: string
          is_preferred: boolean
          last_purchase_date: string | null
          lead_time_days: number
          moq: number
          notes: string | null
          product_id: string
          purchase_price: number
          purchase_unit: string
          supplier_id: string | null
          supplier_name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          conversion_ratio?: number
          created_at?: string
          id?: string
          is_preferred?: boolean
          last_purchase_date?: string | null
          lead_time_days?: number
          moq?: number
          notes?: string | null
          product_id: string
          purchase_price?: number
          purchase_unit?: string
          supplier_id?: string | null
          supplier_name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          conversion_ratio?: number
          created_at?: string
          id?: string
          is_preferred?: boolean
          last_purchase_date?: string | null
          lead_time_days?: number
          moq?: number
          notes?: string | null
          product_id?: string
          purchase_price?: number
          purchase_unit?: string
          supplier_id?: string | null
          supplier_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_supplier_prices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_supplier_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_supplier_prices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color: string | null
          company_id: string
          cost_adjustment: number
          created_at: string
          finish: string | null
          gsm: number | null
          id: string
          is_active: boolean
          price_adjustment: number
          product_id: string
          size_spec: string | null
          sku_suffix: string | null
          thickness_mm: number | null
          updated_at: string
          variant_name: string
        }
        Insert: {
          color?: string | null
          company_id: string
          cost_adjustment?: number
          created_at?: string
          finish?: string | null
          gsm?: number | null
          id?: string
          is_active?: boolean
          price_adjustment?: number
          product_id: string
          size_spec?: string | null
          sku_suffix?: string | null
          thickness_mm?: number | null
          updated_at?: string
          variant_name: string
        }
        Update: {
          color?: string | null
          company_id?: string
          cost_adjustment?: number
          created_at?: string
          finish?: string | null
          gsm?: number | null
          id?: string
          is_active?: boolean
          price_adjustment?: number
          product_id?: string
          size_spec?: string | null
          sku_suffix?: string | null
          thickness_mm?: number | null
          updated_at?: string
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      production_jobs: {
        Row: {
          artwork_proof_url: string | null
          assigned_workers: string[] | null
          commercial_gate_status: string | null
          company_id: string
          created_at: string
          current_stage: string
          customer_name: string
          deadline: string
          department: string
          dimensions_spec: string
          fabrication_tasks: string[] | null
          finishing_tasks: string[] | null
          has_rework: boolean
          id: string
          invoice_id: string | null
          is_blocked_by_commercial_gate: boolean | null
          is_blocked_by_design_gate: boolean | null
          is_practice: boolean
          job_order_id: string | null
          material_spec: string
          pause_reason: string | null
          priority: string
          product_name: string
          production_instructions: string | null
          production_job_number: string
          quantity: number
          rework_count: number
          sales_order_id: string | null
          stage: string
          status: string
          updated_at: string
        }
        Insert: {
          artwork_proof_url?: string | null
          assigned_workers?: string[] | null
          commercial_gate_status?: string | null
          company_id: string
          created_at?: string
          current_stage?: string
          customer_name: string
          deadline: string
          department: string
          dimensions_spec: string
          fabrication_tasks?: string[] | null
          finishing_tasks?: string[] | null
          has_rework?: boolean
          id?: string
          invoice_id?: string | null
          is_blocked_by_commercial_gate?: boolean | null
          is_blocked_by_design_gate?: boolean | null
          is_practice?: boolean
          job_order_id?: string | null
          material_spec: string
          pause_reason?: string | null
          priority?: string
          product_name: string
          production_instructions?: string | null
          production_job_number: string
          quantity?: number
          rework_count?: number
          sales_order_id?: string | null
          stage?: string
          status?: string
          updated_at?: string
        }
        Update: {
          artwork_proof_url?: string | null
          assigned_workers?: string[] | null
          commercial_gate_status?: string | null
          company_id?: string
          created_at?: string
          current_stage?: string
          customer_name?: string
          deadline?: string
          department?: string
          dimensions_spec?: string
          fabrication_tasks?: string[] | null
          finishing_tasks?: string[] | null
          has_rework?: boolean
          id?: string
          invoice_id?: string | null
          is_blocked_by_commercial_gate?: boolean | null
          is_blocked_by_design_gate?: boolean | null
          is_practice?: boolean
          job_order_id?: string | null
          material_spec?: string
          pause_reason?: string | null
          priority?: string
          product_name?: string
          production_instructions?: string | null
          production_job_number?: string
          quantity?: number
          rework_count?: number
          sales_order_id?: string | null
          stage?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_jobs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_jobs_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_jobs_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      production_problem_reports: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          id: string
          job_order_id: string | null
          notes: string | null
          photo_url: string | null
          problem_number: string
          production_job_id: string | null
          production_task_id: string | null
          reason: string
          reported_by: string | null
          reported_by_name: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolved_by_name: string | null
          status: string
          updated_at: string
          voice_note_url: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          job_order_id?: string | null
          notes?: string | null
          photo_url?: string | null
          problem_number: string
          production_job_id?: string | null
          production_task_id?: string | null
          reason: string
          reported_by?: string | null
          reported_by_name?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_by_name?: string | null
          status?: string
          updated_at?: string
          voice_note_url?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          job_order_id?: string | null
          notes?: string | null
          photo_url?: string | null
          problem_number?: string
          production_job_id?: string | null
          production_task_id?: string | null
          reason?: string
          reported_by?: string | null
          reported_by_name?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_by_name?: string | null
          status?: string
          updated_at?: string
          voice_note_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_problem_reports_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_problem_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_problem_reports_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_problem_reports_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_problem_reports_production_task_id_fkey"
            columns: ["production_task_id"]
            isOneToOne: false
            referencedRelation: "production_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      production_reworks: {
        Row: {
          additional_time_hours: number
          created_at: string
          estimated_wastage_cost: number
          extra_labor_hours: number
          id: string
          material_wastage: string
          production_job_id: string
          reason: string
          reported_by_name: string
          responsible_department: string
          rework_number: string
          status: string
        }
        Insert: {
          additional_time_hours?: number
          created_at?: string
          estimated_wastage_cost?: number
          extra_labor_hours?: number
          id?: string
          material_wastage: string
          production_job_id: string
          reason: string
          reported_by_name: string
          responsible_department: string
          rework_number: string
          status?: string
        }
        Update: {
          additional_time_hours?: number
          created_at?: string
          estimated_wastage_cost?: number
          extra_labor_hours?: number
          id?: string
          material_wastage?: string
          production_job_id?: string
          reason?: string
          reported_by_name?: string
          responsible_department?: string
          rework_number?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_reworks_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      production_task_material_requirements: {
        Row: {
          company_id: string
          created_at: string
          height: number | null
          id: string
          material_id: string | null
          material_name: string
          notes: string | null
          production_task_id: string
          required_quantity: number
          unit: string
          width: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          height?: number | null
          id?: string
          material_id?: string | null
          material_name: string
          notes?: string | null
          production_task_id: string
          required_quantity?: number
          unit?: string
          width?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          height?: number | null
          id?: string
          material_id?: string | null
          material_name?: string
          notes?: string | null
          production_task_id?: string
          required_quantity?: number
          unit?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "production_task_material_requirements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_task_material_requirements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_task_material_requirements_production_task_id_fkey"
            columns: ["production_task_id"]
            isOneToOne: false
            referencedRelation: "production_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      production_tasks: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          assigned_machine_id: string | null
          assigned_machine_name: string | null
          assigned_operator_id: string | null
          assigned_operator_name: string | null
          branch_id: string | null
          company_id: string
          created_at: string
          department: string
          description: string | null
          estimated_duration_minutes: number
          good_quantity: number | null
          height: number | null
          hold_notes: string | null
          hold_reason: string | null
          id: string
          is_rework: boolean
          job_order_id: string | null
          notes: string | null
          priority: string
          production_job_id: string | null
          quantity: number
          rejected_quantity: number | null
          required_machine_type: string | null
          required_material: string | null
          rework_parent_task_id: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          sequence_order: number
          status: string
          task_name: string
          task_number: string
          task_type: string
          unit: string
          updated_at: string
          width: number | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          assigned_machine_id?: string | null
          assigned_machine_name?: string | null
          assigned_operator_id?: string | null
          assigned_operator_name?: string | null
          branch_id?: string | null
          company_id: string
          created_at?: string
          department: string
          description?: string | null
          estimated_duration_minutes?: number
          good_quantity?: number | null
          height?: number | null
          hold_notes?: string | null
          hold_reason?: string | null
          id?: string
          is_rework?: boolean
          job_order_id?: string | null
          notes?: string | null
          priority?: string
          production_job_id?: string | null
          quantity?: number
          rejected_quantity?: number | null
          required_machine_type?: string | null
          required_material?: string | null
          rework_parent_task_id?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          sequence_order?: number
          status?: string
          task_name: string
          task_number: string
          task_type?: string
          unit?: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          assigned_machine_id?: string | null
          assigned_machine_name?: string | null
          assigned_operator_id?: string | null
          assigned_operator_name?: string | null
          branch_id?: string | null
          company_id?: string
          created_at?: string
          department?: string
          description?: string | null
          estimated_duration_minutes?: number
          good_quantity?: number | null
          height?: number | null
          hold_notes?: string | null
          hold_reason?: string | null
          id?: string
          is_rework?: boolean
          job_order_id?: string | null
          notes?: string | null
          priority?: string
          production_job_id?: string | null
          quantity?: number
          rejected_quantity?: number | null
          required_machine_type?: string | null
          required_material?: string | null
          rework_parent_task_id?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          sequence_order?: number
          status?: string
          task_name?: string
          task_number?: string
          task_type?: string
          unit?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "production_tasks_assigned_machine_id_fkey"
            columns: ["assigned_machine_id"]
            isOneToOne: false
            referencedRelation: "machineries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_tasks_assigned_operator_id_fkey"
            columns: ["assigned_operator_id"]
            isOneToOne: false
            referencedRelation: "company_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_tasks_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_tasks_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_tasks_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_tasks_rework_parent_task_id_fkey"
            columns: ["rework_parent_task_id"]
            isOneToOne: false
            referencedRelation: "production_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allow_manual_override: boolean
          base_cost: number
          branch_id: string | null
          category: string
          category_id: string | null
          commercial_type: string
          company_id: string
          components: Json
          conversion_ratio: number
          cost_breakdown: Json
          created_at: string
          created_by: string | null
          default_department: string
          default_finishing: string | null
          default_wastage_percentage: number
          description: string | null
          description_bn: string | null
          dimensions_spec: string | null
          entity_type: string
          estimated_production_time_hours: number
          id: string
          internal_notes: string | null
          is_active: boolean
          is_tax_inclusive: boolean
          material_config: Json
          material_spec: string | null
          measurement_type: string
          min_allowed_margin_percent: number
          min_billable_quantity: number
          min_order_quantity: number
          min_price: number
          minimum_charge: number
          name: string
          name_bn: string | null
          price_tiers: Json
          pricing_formula: Json | null
          pricing_method: string
          product_type: string
          production_instructions: string | null
          production_unit: string | null
          purchase_price: number
          purchase_unit: string | null
          requires_approval: boolean
          requires_delivery: boolean
          requires_design: boolean
          requires_fabrication: boolean
          requires_finishing: boolean
          requires_installation: boolean
          requires_production: boolean
          roll_length_ft: number | null
          roll_width_ft: number | null
          selling_price: number
          selling_unit: string | null
          service_config: Json
          sheet_length_ft: number | null
          sheet_width_ft: number | null
          sku: string
          target_margin_percentage: number
          tax_rate: number
          unit: string
          updated_at: string
          vat_applicable: boolean
        }
        Insert: {
          allow_manual_override?: boolean
          base_cost?: number
          branch_id?: string | null
          category: string
          category_id?: string | null
          commercial_type?: string
          company_id: string
          components?: Json
          conversion_ratio?: number
          cost_breakdown?: Json
          created_at?: string
          created_by?: string | null
          default_department?: string
          default_finishing?: string | null
          default_wastage_percentage?: number
          description?: string | null
          description_bn?: string | null
          dimensions_spec?: string | null
          entity_type?: string
          estimated_production_time_hours?: number
          id?: string
          internal_notes?: string | null
          is_active?: boolean
          is_tax_inclusive?: boolean
          material_config?: Json
          material_spec?: string | null
          measurement_type?: string
          min_allowed_margin_percent?: number
          min_billable_quantity?: number
          min_order_quantity?: number
          min_price?: number
          minimum_charge?: number
          name: string
          name_bn?: string | null
          price_tiers?: Json
          pricing_formula?: Json | null
          pricing_method?: string
          product_type: string
          production_instructions?: string | null
          production_unit?: string | null
          purchase_price?: number
          purchase_unit?: string | null
          requires_approval?: boolean
          requires_delivery?: boolean
          requires_design?: boolean
          requires_fabrication?: boolean
          requires_finishing?: boolean
          requires_installation?: boolean
          requires_production?: boolean
          roll_length_ft?: number | null
          roll_width_ft?: number | null
          selling_price?: number
          selling_unit?: string | null
          service_config?: Json
          sheet_length_ft?: number | null
          sheet_width_ft?: number | null
          sku: string
          target_margin_percentage?: number
          tax_rate?: number
          unit: string
          updated_at?: string
          vat_applicable?: boolean
        }
        Update: {
          allow_manual_override?: boolean
          base_cost?: number
          branch_id?: string | null
          category?: string
          category_id?: string | null
          commercial_type?: string
          company_id?: string
          components?: Json
          conversion_ratio?: number
          cost_breakdown?: Json
          created_at?: string
          created_by?: string | null
          default_department?: string
          default_finishing?: string | null
          default_wastage_percentage?: number
          description?: string | null
          description_bn?: string | null
          dimensions_spec?: string | null
          entity_type?: string
          estimated_production_time_hours?: number
          id?: string
          internal_notes?: string | null
          is_active?: boolean
          is_tax_inclusive?: boolean
          material_config?: Json
          material_spec?: string | null
          measurement_type?: string
          min_allowed_margin_percent?: number
          min_billable_quantity?: number
          min_order_quantity?: number
          min_price?: number
          minimum_charge?: number
          name?: string
          name_bn?: string | null
          price_tiers?: Json
          pricing_formula?: Json | null
          pricing_method?: string
          product_type?: string
          production_instructions?: string | null
          production_unit?: string | null
          purchase_price?: number
          purchase_unit?: string | null
          requires_approval?: boolean
          requires_delivery?: boolean
          requires_design?: boolean
          requires_fabrication?: boolean
          requires_finishing?: boolean
          requires_installation?: boolean
          requires_production?: boolean
          roll_length_ft?: number | null
          roll_width_ft?: number | null
          selling_price?: number
          selling_unit?: string | null
          service_config?: Json
          sheet_length_ft?: number | null
          sheet_width_ft?: number | null
          sku?: string
          target_margin_percentage?: number
          tax_rate?: number
          unit?: string
          updated_at?: string
          vat_applicable?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          full_name_bn: string | null
          id: string
          phone: string | null
          preferred_locale: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          full_name_bn?: string | null
          id: string
          phone?: string | null
          preferred_locale?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          full_name_bn?: string | null
          id?: string
          phone?: string | null
          preferred_locale?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          created_at: string
          discount_percent: number | null
          expected_date: string | null
          id: string
          material_id: string | null
          material_name: string
          notes: string | null
          purchase_order_id: string
          quantity_ordered: number
          quantity_received: number
          quantity_remaining: number
          supplier_sku: string | null
          tax_percent: number | null
          total_cost: number
          unit: string
          unit_cost: number
        }
        Insert: {
          created_at?: string
          discount_percent?: number | null
          expected_date?: string | null
          id?: string
          material_id?: string | null
          material_name: string
          notes?: string | null
          purchase_order_id: string
          quantity_ordered: number
          quantity_received?: number
          quantity_remaining: number
          supplier_sku?: string | null
          tax_percent?: number | null
          total_cost: number
          unit: string
          unit_cost: number
        }
        Update: {
          created_at?: string
          discount_percent?: number | null
          expected_date?: string | null
          id?: string
          material_id?: string | null
          material_name?: string
          notes?: string | null
          purchase_order_id?: string
          quantity_ordered?: number
          quantity_received?: number
          quantity_remaining?: number
          supplier_sku?: string | null
          tax_percent?: number | null
          total_cost?: number
          unit?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by_id: string | null
          approved_by_name: string | null
          branch_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          company_id: string
          created_at: string
          created_by_name: string
          currency: string | null
          discount_amount: number
          due_amount: number
          expected_delivery_date: string
          grand_total: number
          id: string
          notes: string | null
          other_charges: number | null
          paid_amount: number
          payment_terms: string | null
          po_date: string
          po_number: string
          purchase_request_id: string | null
          sent_at: string | null
          shipping_cost: number | null
          status: string
          subtotal: number
          supplier_address: string | null
          supplier_email: string | null
          supplier_id: string | null
          supplier_name: string
          supplier_phone: string
          supplier_reference: string | null
          terms_and_conditions: string | null
          updated_at: string
          vat_amount: number
        }
        Insert: {
          approved_at?: string | null
          approved_by_id?: string | null
          approved_by_name?: string | null
          branch_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          company_id: string
          created_at?: string
          created_by_name: string
          currency?: string | null
          discount_amount?: number
          due_amount?: number
          expected_delivery_date: string
          grand_total?: number
          id?: string
          notes?: string | null
          other_charges?: number | null
          paid_amount?: number
          payment_terms?: string | null
          po_date?: string
          po_number: string
          purchase_request_id?: string | null
          sent_at?: string | null
          shipping_cost?: number | null
          status?: string
          subtotal?: number
          supplier_address?: string | null
          supplier_email?: string | null
          supplier_id?: string | null
          supplier_name: string
          supplier_phone: string
          supplier_reference?: string | null
          terms_and_conditions?: string | null
          updated_at?: string
          vat_amount?: number
        }
        Update: {
          approved_at?: string | null
          approved_by_id?: string | null
          approved_by_name?: string | null
          branch_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          company_id?: string
          created_at?: string
          created_by_name?: string
          currency?: string | null
          discount_amount?: number
          due_amount?: number
          expected_delivery_date?: string
          grand_total?: number
          id?: string
          notes?: string | null
          other_charges?: number | null
          paid_amount?: number
          payment_terms?: string | null
          po_date?: string
          po_number?: string
          purchase_request_id?: string | null
          sent_at?: string | null
          shipping_cost?: number | null
          status?: string
          subtotal?: number
          supplier_address?: string | null
          supplier_email?: string | null
          supplier_id?: string | null
          supplier_name?: string
          supplier_phone?: string
          supplier_reference?: string | null
          terms_and_conditions?: string | null
          updated_at?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_purchase_request_id_fkey"
            columns: ["purchase_request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_request_items: {
        Row: {
          created_at: string
          estimated_amount: number | null
          estimated_unit_price: number | null
          id: string
          material_id: string | null
          material_name: string
          notes: string | null
          preferred_supplier_id: string | null
          purchase_request_id: string
          quantity: number
          required_date: string | null
          unit: string
        }
        Insert: {
          created_at?: string
          estimated_amount?: number | null
          estimated_unit_price?: number | null
          id?: string
          material_id?: string | null
          material_name: string
          notes?: string | null
          preferred_supplier_id?: string | null
          purchase_request_id: string
          quantity: number
          required_date?: string | null
          unit?: string
        }
        Update: {
          created_at?: string
          estimated_amount?: number | null
          estimated_unit_price?: number | null
          id?: string
          material_id?: string | null
          material_name?: string
          notes?: string | null
          preferred_supplier_id?: string | null
          purchase_request_id?: string
          quantity?: number
          required_date?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_request_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_request_items_preferred_supplier_id_fkey"
            columns: ["preferred_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_request_items_purchase_request_id_fkey"
            columns: ["purchase_request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requests: {
        Row: {
          approved_at: string | null
          approved_by_id: string | null
          approved_by_name: string | null
          branch_id: string | null
          company_id: string
          created_at: string
          department: string | null
          id: string
          notes: string | null
          pr_number: string
          priority: string
          reason: string | null
          rejection_reason: string | null
          request_date: string
          requested_by_id: string | null
          requested_by_name: string
          required_date: string
          status: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_id?: string | null
          approved_by_name?: string | null
          branch_id?: string | null
          company_id: string
          created_at?: string
          department?: string | null
          id?: string
          notes?: string | null
          pr_number: string
          priority?: string
          reason?: string | null
          rejection_reason?: string | null
          request_date?: string
          requested_by_id?: string | null
          requested_by_name: string
          required_date?: string
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by_id?: string | null
          approved_by_name?: string | null
          branch_id?: string | null
          company_id?: string
          created_at?: string
          department?: string | null
          id?: string
          notes?: string | null
          pr_number?: string
          priority?: string
          reason?: string | null
          rejection_reason?: string | null
          request_date?: string
          requested_by_id?: string | null
          requested_by_name?: string
          required_date?: string
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_activities: {
        Row: {
          action: string
          actor_name: string
          created_at: string
          details: string | null
          id: string
          quotation_id: string
        }
        Insert: {
          action: string
          actor_name: string
          created_at?: string
          details?: string | null
          id?: string
          quotation_id: string
        }
        Update: {
          action?: string
          actor_name?: string
          created_at?: string
          details?: string | null
          id?: string
          quotation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_activities_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          area_sft: number
          artwork_required: boolean | null
          color_spec: string | null
          created_at: string
          description: string
          description_bn: string | null
          dimension_unit: string
          finishing: string | null
          finishing_cost: number | null
          height: number | null
          id: string
          installation_cost: number | null
          installation_required: boolean | null
          item_total: number
          labor_cost: number | null
          material_cost: number | null
          material_spec: string | null
          product_id: string | null
          quantity: number
          quotation_id: string
          rate_source: string | null
          unit: string
          unit_rate: number
          width: number | null
        }
        Insert: {
          area_sft?: number
          artwork_required?: boolean | null
          color_spec?: string | null
          created_at?: string
          description: string
          description_bn?: string | null
          dimension_unit?: string
          finishing?: string | null
          finishing_cost?: number | null
          height?: number | null
          id?: string
          installation_cost?: number | null
          installation_required?: boolean | null
          item_total: number
          labor_cost?: number | null
          material_cost?: number | null
          material_spec?: string | null
          product_id?: string | null
          quantity?: number
          quotation_id: string
          rate_source?: string | null
          unit?: string
          unit_rate: number
          width?: number | null
        }
        Update: {
          area_sft?: number
          artwork_required?: boolean | null
          color_spec?: string | null
          created_at?: string
          description?: string
          description_bn?: string | null
          dimension_unit?: string
          finishing?: string | null
          finishing_cost?: number | null
          height?: number | null
          id?: string
          installation_cost?: number | null
          installation_required?: boolean | null
          item_total?: number
          labor_cost?: number | null
          material_cost?: number | null
          material_spec?: string | null
          product_id?: string | null
          quantity?: number
          quotation_id?: string
          rate_source?: string | null
          unit?: string
          unit_rate?: number
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          company_id: string
          converted_at: string | null
          converted_invoice_id: string | null
          converted_order_id: string | null
          created_at: string
          customer_address: string | null
          customer_bin: string | null
          customer_company: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_name_bn: string | null
          customer_phone: string
          customer_type: string | null
          customer_whatsapp: string | null
          delivery_date: string | null
          delivery_location: string | null
          delivery_method: string | null
          discount_amount: number
          follow_up_count: number | null
          follow_up_date: string | null
          follow_up_status: string | null
          grand_total: number
          id: string
          installation_required: boolean | null
          internal_notes: string | null
          language_mode: string
          last_follow_up_at: string | null
          last_follow_up_method: string | null
          last_follow_up_note: string | null
          margin_percent: number
          negotiation_discount: number | null
          next_action: string | null
          notes: string | null
          original_grand_total: number | null
          quotation_date: string
          quotation_number: string
          reference_no: string | null
          salesperson_id: string | null
          salesperson_name: string
          status: string
          subtotal: number
          terms_and_conditions: string | null
          total_cost: number
          updated_at: string
          valid_until: string
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          company_id: string
          converted_at?: string | null
          converted_invoice_id?: string | null
          converted_order_id?: string | null
          created_at?: string
          customer_address?: string | null
          customer_bin?: string | null
          customer_company?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_name_bn?: string | null
          customer_phone: string
          customer_type?: string | null
          customer_whatsapp?: string | null
          delivery_date?: string | null
          delivery_location?: string | null
          delivery_method?: string | null
          discount_amount?: number
          follow_up_count?: number | null
          follow_up_date?: string | null
          follow_up_status?: string | null
          grand_total?: number
          id?: string
          installation_required?: boolean | null
          internal_notes?: string | null
          language_mode?: string
          last_follow_up_at?: string | null
          last_follow_up_method?: string | null
          last_follow_up_note?: string | null
          margin_percent?: number
          negotiation_discount?: number | null
          next_action?: string | null
          notes?: string | null
          original_grand_total?: number | null
          quotation_date?: string
          quotation_number: string
          reference_no?: string | null
          salesperson_id?: string | null
          salesperson_name: string
          status?: string
          subtotal?: number
          terms_and_conditions?: string | null
          total_cost?: number
          updated_at?: string
          valid_until: string
          vat_amount?: number
          vat_rate?: number
        }
        Update: {
          company_id?: string
          converted_at?: string | null
          converted_invoice_id?: string | null
          converted_order_id?: string | null
          created_at?: string
          customer_address?: string | null
          customer_bin?: string | null
          customer_company?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_name_bn?: string | null
          customer_phone?: string
          customer_type?: string | null
          customer_whatsapp?: string | null
          delivery_date?: string | null
          delivery_location?: string | null
          delivery_method?: string | null
          discount_amount?: number
          follow_up_count?: number | null
          follow_up_date?: string | null
          follow_up_status?: string | null
          grand_total?: number
          id?: string
          installation_required?: boolean | null
          internal_notes?: string | null
          language_mode?: string
          last_follow_up_at?: string | null
          last_follow_up_method?: string | null
          last_follow_up_note?: string | null
          margin_percent?: number
          negotiation_discount?: number | null
          next_action?: string | null
          notes?: string | null
          original_grand_total?: number | null
          quotation_date?: string
          quotation_number?: string
          reference_no?: string | null
          salesperson_id?: string | null
          salesperson_name?: string
          status?: string
          subtotal?: number
          terms_and_conditions?: string | null
          total_cost?: number
          updated_at?: string
          valid_until?: string
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          name_bn: string | null
          permissions_count: number | null
          slug: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          name_bn?: string | null
          permissions_count?: number | null
          slug: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          name_bn?: string | null
          permissions_count?: number | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_subscription_invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          item_type: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          item_type?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          item_type?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "saas_subscription_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "saas_subscription_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_subscription_invoices: {
        Row: {
          billing_interval: string
          billing_period_end: string
          billing_period_start: string
          company_id: string
          created_at: string
          currency: string
          discount_amount: number
          due_date: string
          gateway_transaction_id: string | null
          id: string
          invoice_number: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          plan_code: string
          plan_id: string | null
          plan_name: string
          plan_version: number
          status: string
          subscription_id: string | null
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          billing_interval?: string
          billing_period_end: string
          billing_period_start: string
          company_id: string
          created_at?: string
          currency?: string
          discount_amount?: number
          due_date: string
          gateway_transaction_id?: string | null
          id?: string
          invoice_number: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          plan_code: string
          plan_id?: string | null
          plan_name: string
          plan_version?: number
          status?: string
          subscription_id?: string | null
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          billing_period_end?: string
          billing_period_start?: string
          company_id?: string
          created_at?: string
          currency?: string
          discount_amount?: number
          due_date?: string
          gateway_transaction_id?: string | null
          id?: string
          invoice_number?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          plan_code?: string
          plan_id?: string | null
          plan_name?: string
          plan_version?: number
          status?: string
          subscription_id?: string | null
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_subscription_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_subscription_invoices_gateway_transaction_id_fkey"
            columns: ["gateway_transaction_id"]
            isOneToOne: false
            referencedRelation: "gateway_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_subscription_invoices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_subscription_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "company_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_tenant_storage_usage: {
        Row: {
          artwork_bytes: number
          company_id: string
          documents_bytes: number
          id: string
          invoices_bytes: number
          last_calculated_at: string
          receipts_bytes: number
          total_bytes_used: number
          total_files_count: number
          updated_at: string
        }
        Insert: {
          artwork_bytes?: number
          company_id: string
          documents_bytes?: number
          id?: string
          invoices_bytes?: number
          last_calculated_at?: string
          receipts_bytes?: number
          total_bytes_used?: number
          total_files_count?: number
          updated_at?: string
        }
        Update: {
          artwork_bytes?: number
          company_id?: string
          documents_bytes?: number
          id?: string
          invoices_bytes?: number
          last_calculated_at?: string
          receipts_bytes?: number
          total_bytes_used?: number
          total_files_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_tenant_storage_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_advances: {
        Row: {
          advance_voucher_number: string
          amount: number
          approved_at: string | null
          approved_by_id: string | null
          approved_by_name: string | null
          branch_id: string | null
          company_id: string
          created_at: string
          deducted_amount: number
          disbursed_date: string
          employee_id: string
          id: string
          is_settled: boolean
          payment_method: string
          reason: string | null
          remaining_amount: number
          settled_in_payroll_period: string | null
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          advance_voucher_number: string
          amount: number
          approved_at?: string | null
          approved_by_id?: string | null
          approved_by_name?: string | null
          branch_id?: string | null
          company_id: string
          created_at?: string
          deducted_amount?: number
          disbursed_date?: string
          employee_id: string
          id?: string
          is_settled?: boolean
          payment_method?: string
          reason?: string | null
          remaining_amount?: number
          settled_in_payroll_period?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          advance_voucher_number?: string
          amount?: number
          approved_at?: string | null
          approved_by_id?: string | null
          approved_by_name?: string | null
          branch_id?: string | null
          company_id?: string
          created_at?: string
          deducted_amount?: number
          disbursed_date?: string
          employee_id?: string
          id?: string
          is_settled?: boolean
          payment_method?: string
          reason?: string | null
          remaining_amount?: number
          settled_in_payroll_period?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_advances_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_advances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_advances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_advances_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_payments: {
        Row: {
          amount: number
          branch_id: string | null
          company_id: string
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          paid_by_id: string | null
          paid_by_name: string
          payment_date: string
          payment_method: string
          payment_voucher_number: string
          payroll_item_id: string
          payroll_period_id: string
          reference_number: string | null
          transaction_id: string | null
        }
        Insert: {
          amount: number
          branch_id?: string | null
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          paid_by_id?: string | null
          paid_by_name?: string
          payment_date?: string
          payment_method?: string
          payment_voucher_number: string
          payroll_item_id: string
          payroll_period_id: string
          reference_number?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          paid_by_id?: string | null
          paid_by_name?: string
          payment_date?: string
          payment_method?: string
          payment_voucher_number?: string
          payroll_item_id?: string
          payroll_period_id?: string
          reference_number?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_payments_payroll_item_id_fkey"
            columns: ["payroll_item_id"]
            isOneToOne: false
            referencedRelation: "payroll_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_payments_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_items: {
        Row: {
          created_at: string
          dimension_unit: string
          height: number | null
          id: string
          item_name: string
          material_spec: string | null
          order_id: string
          product_id: string | null
          quantity: number
          total_price: number
          unit: string
          unit_price: number
          width: number | null
        }
        Insert: {
          created_at?: string
          dimension_unit?: string
          height?: number | null
          id?: string
          item_name: string
          material_spec?: string | null
          order_id: string
          product_id?: string | null
          quantity?: number
          total_price: number
          unit?: string
          unit_price: number
          width?: number | null
        }
        Update: {
          created_at?: string
          dimension_unit?: string
          height?: number | null
          id?: string
          item_name?: string
          material_spec?: string | null
          order_id?: string
          product_id?: string | null
          quantity?: number
          total_price?: number
          unit?: string
          unit_price?: number
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          advance_amount: number
          commercial_status: string | null
          company_id: string
          created_at: string
          customer_address: string | null
          customer_id: string | null
          customer_name: string
          customer_name_bn: string | null
          customer_phone: string
          delivery_date: string
          discount_amount: number
          due_amount: number
          final_price: number
          id: string
          invoice_id: string | null
          invoice_number: string | null
          invoice_requested_at: string | null
          notes: string | null
          order_date: string
          order_number: string
          payment_terms: string
          priority: string
          production_gate_status: string | null
          quotation_id: string | null
          salesperson_name: string
          status: string
          subtotal: number
          updated_at: string
          vat_amount: number
          workflow_routing: string | null
        }
        Insert: {
          advance_amount?: number
          commercial_status?: string | null
          company_id: string
          created_at?: string
          customer_address?: string | null
          customer_id?: string | null
          customer_name: string
          customer_name_bn?: string | null
          customer_phone: string
          delivery_date: string
          discount_amount?: number
          due_amount?: number
          final_price?: number
          id?: string
          invoice_id?: string | null
          invoice_number?: string | null
          invoice_requested_at?: string | null
          notes?: string | null
          order_date?: string
          order_number: string
          payment_terms?: string
          priority?: string
          production_gate_status?: string | null
          quotation_id?: string | null
          salesperson_name: string
          status?: string
          subtotal?: number
          updated_at?: string
          vat_amount?: number
          workflow_routing?: string | null
        }
        Update: {
          advance_amount?: number
          commercial_status?: string | null
          company_id?: string
          created_at?: string
          customer_address?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_name_bn?: string | null
          customer_phone?: string
          delivery_date?: string
          discount_amount?: number
          due_amount?: number
          final_price?: number
          id?: string
          invoice_id?: string | null
          invoice_number?: string | null
          invoice_requested_at?: string | null
          notes?: string | null
          order_date?: string
          order_number?: string
          payment_terms?: string
          priority?: string
          production_gate_status?: string | null
          quotation_id?: string | null
          salesperson_name?: string
          status?: string
          subtotal?: number
          updated_at?: string
          vat_amount?: number
          workflow_routing?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          branch_id: string | null
          break_duration_minutes: number
          company_id: string
          created_at: string
          end_time: string
          grace_period_minutes: number
          id: string
          is_active: boolean
          is_overnight: boolean
          overtime_rules: Json
          shift_code: string
          shift_name: string
          start_time: string
          updated_at: string
          working_days: string[]
        }
        Insert: {
          branch_id?: string | null
          break_duration_minutes?: number
          company_id: string
          created_at?: string
          end_time: string
          grace_period_minutes?: number
          id?: string
          is_active?: boolean
          is_overnight?: boolean
          overtime_rules?: Json
          shift_code: string
          shift_name: string
          start_time: string
          updated_at?: string
          working_days?: string[]
        }
        Update: {
          branch_id?: string | null
          break_duration_minutes?: number
          company_id?: string
          created_at?: string
          end_time?: string
          grace_period_minutes?: number
          id?: string
          is_active?: boolean
          is_overnight?: boolean
          overtime_rules?: Json
          shift_code?: string
          shift_name?: string
          start_time?: string
          updated_at?: string
          working_days?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_ledger: {
        Row: {
          balance_after: number
          branch_id: string | null
          company_id: string
          created_at: string
          id: string
          idempotency_key: string | null
          location_id: string | null
          material_id: string
          normalized_quantity: number | null
          normalized_unit: string | null
          notes: string | null
          performed_by_name: string
          production_task_id: string | null
          quantity_change: number
          reference_id: string | null
          reference_type: string | null
          total_cost: number
          transaction_type: string
          unit: string
          unit_cost: number
        }
        Insert: {
          balance_after: number
          branch_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          material_id: string
          normalized_quantity?: number | null
          normalized_unit?: string | null
          notes?: string | null
          performed_by_name: string
          production_task_id?: string | null
          quantity_change: number
          reference_id?: string | null
          reference_type?: string | null
          total_cost?: number
          transaction_type: string
          unit: string
          unit_cost?: number
        }
        Update: {
          balance_after?: number
          branch_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          material_id?: string
          normalized_quantity?: number | null
          normalized_unit?: string | null
          notes?: string | null
          performed_by_name?: string
          production_task_id?: string | null
          quantity_change?: number
          reference_id?: string | null
          reference_type?: string | null
          total_cost?: number
          transaction_type?: string
          unit?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_ledger_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_production_task_id_fkey"
            columns: ["production_task_id"]
            isOneToOne: false
            referencedRelation: "production_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_events: {
        Row: {
          amount: number | null
          company_id: string
          created_at: string
          currency: string
          effective_at: string
          event_type: string
          id: string
          new_plan_code: string | null
          new_status: string | null
          performed_by: string | null
          previous_plan_code: string | null
          previous_status: string | null
          reason: string | null
          subscription_id: string | null
          transaction_id: string | null
        }
        Insert: {
          amount?: number | null
          company_id: string
          created_at?: string
          currency?: string
          effective_at?: string
          event_type: string
          id?: string
          new_plan_code?: string | null
          new_status?: string | null
          performed_by?: string | null
          previous_plan_code?: string | null
          previous_status?: string | null
          reason?: string | null
          subscription_id?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number | null
          company_id?: string
          created_at?: string
          currency?: string
          effective_at?: string
          event_type?: string
          id?: string
          new_plan_code?: string | null
          new_status?: string | null
          performed_by?: string | null
          previous_plan_code?: string | null
          previous_status?: string | null
          reason?: string | null
          subscription_id?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "company_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "gateway_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          code: string
          created_at: string
          currency: string
          description: string | null
          features: string[]
          hard_limits: Json
          id: string
          is_active: boolean
          is_latest: boolean
          max_branches: number
          max_customers: number
          max_products: number
          max_users: number
          monthly_orders: number
          name: string
          name_bn: string | null
          overage_policy: string
          price_monthly: number
          price_yearly: number
          setup_fee: number
          soft_limits: Json
          sort_order: number
          storage_gb: number
          trial_days: number
          trial_eligible: boolean
          updated_at: string
          version: number
        }
        Insert: {
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: string[]
          hard_limits?: Json
          id?: string
          is_active?: boolean
          is_latest?: boolean
          max_branches: number
          max_customers: number
          max_products: number
          max_users: number
          monthly_orders: number
          name: string
          name_bn?: string | null
          overage_policy?: string
          price_monthly: number
          price_yearly: number
          setup_fee?: number
          soft_limits?: Json
          sort_order?: number
          storage_gb: number
          trial_days?: number
          trial_eligible?: boolean
          updated_at?: string
          version?: number
        }
        Update: {
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: string[]
          hard_limits?: Json
          id?: string
          is_active?: boolean
          is_latest?: boolean
          max_branches?: number
          max_customers?: number
          max_products?: number
          max_users?: number
          monthly_orders?: number
          name?: string
          name_bn?: string | null
          overage_policy?: string
          price_monthly?: number
          price_yearly?: number
          setup_fee?: number
          soft_limits?: Json
          sort_order?: number
          storage_gb?: number
          trial_days?: number
          trial_eligible?: boolean
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      supplier_items: {
        Row: {
          branch_id: string | null
          company_id: string
          conversion_factor: number
          created_at: string
          currency: string
          effective_date: string
          id: string
          is_active: boolean
          is_preferred: boolean
          lead_time_days: number | null
          material_id: string
          moq: number | null
          notes: string | null
          purchase_unit: string
          supplier_id: string
          supplier_item_name: string | null
          supplier_sku: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          conversion_factor?: number
          created_at?: string
          currency?: string
          effective_date?: string
          id?: string
          is_active?: boolean
          is_preferred?: boolean
          lead_time_days?: number | null
          material_id: string
          moq?: number | null
          notes?: string | null
          purchase_unit?: string
          supplier_id: string
          supplier_item_name?: string | null
          supplier_sku?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          conversion_factor?: number
          created_at?: string
          currency?: string
          effective_date?: string
          id?: string
          is_active?: boolean
          is_preferred?: boolean
          lead_time_days?: number | null
          material_id?: string
          moq?: number | null
          notes?: string | null
          purchase_unit?: string
          supplier_id?: string
          supplier_item_name?: string | null
          supplier_sku?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_ledger_entries: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          credit: number
          debit: number
          entry_type: string
          id: string
          notes: string | null
          reference_id: string | null
          reference_type: string | null
          running_balance: number
          supplier_id: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          credit?: number
          debit?: number
          entry_type: string
          id?: string
          notes?: string | null
          reference_id?: string | null
          reference_type?: string | null
          running_balance?: number
          supplier_id: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          credit?: number
          debit?: number
          entry_type?: string
          id?: string
          notes?: string | null
          reference_id?: string | null
          reference_type?: string | null
          running_balance?: number
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_ledger_entries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_ledger_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_ledger_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_material_prices: {
        Row: {
          category: string
          company_id: string
          contract_price_bdt: number
          created_at: string
          effective_date: string
          id: string
          material_name: string
          notes: string | null
          supplier_id: string
          unit: string
        }
        Insert: {
          category: string
          company_id: string
          contract_price_bdt: number
          created_at?: string
          effective_date?: string
          id?: string
          material_name: string
          notes?: string | null
          supplier_id: string
          unit: string
        }
        Update: {
          category?: string
          company_id?: string
          contract_price_bdt?: number
          created_at?: string
          effective_date?: string
          id?: string
          material_name?: string
          notes?: string | null
          supplier_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_material_prices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_material_prices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payments: {
        Row: {
          amount: number
          bank_name: string | null
          cheque_number: string | null
          company_id: string
          created_at: string
          id: string
          mfs_transaction_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string
          purchase_order_id: string | null
          recorded_by_name: string
          supplier_id: string | null
          supplier_name: string
        }
        Insert: {
          amount: number
          bank_name?: string | null
          cheque_number?: string | null
          company_id: string
          created_at?: string
          id?: string
          mfs_transaction_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method: string
          purchase_order_id?: string | null
          recorded_by_name: string
          supplier_id?: string | null
          supplier_name: string
        }
        Update: {
          amount?: number
          bank_name?: string | null
          cheque_number?: string | null
          company_id?: string
          created_at?: string
          id?: string
          mfs_transaction_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          purchase_order_id?: string | null
          recorded_by_name?: string
          supplier_id?: string | null
          supplier_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_price_history: {
        Row: {
          company_id: string
          created_at: string
          id: string
          material_id: string | null
          material_name: string
          po_date: string
          po_id: string | null
          previous_price: number | null
          purchase_price: number
          quantity: number
          supplier_id: string | null
          supplier_name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          material_id?: string | null
          material_name: string
          po_date: string
          po_id?: string | null
          previous_price?: number | null
          purchase_price: number
          quantity: number
          supplier_id?: string | null
          supplier_name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          material_id?: string | null
          material_name?: string
          po_date?: string
          po_id?: string | null
          previous_price?: number | null
          purchase_price?: number
          quantity?: number
          supplier_id?: string | null
          supplier_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_price_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_price_history_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_price_history_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_price_history_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_return_items: {
        Row: {
          created_at: string
          grn_item_id: string | null
          id: string
          location_id: string | null
          material_id: string
          material_name: string
          reason: string | null
          return_id: string
          return_quantity: number
          total_amount: number
          unit: string
          unit_cost: number
        }
        Insert: {
          created_at?: string
          grn_item_id?: string | null
          id?: string
          location_id?: string | null
          material_id: string
          material_name: string
          reason?: string | null
          return_id: string
          return_quantity: number
          total_amount: number
          unit: string
          unit_cost: number
        }
        Update: {
          created_at?: string
          grn_item_id?: string | null
          id?: string
          location_id?: string | null
          material_id?: string
          material_name?: string
          reason?: string | null
          return_id?: string
          return_quantity?: number
          total_amount?: number
          unit?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_return_items_grn_item_id_fkey"
            columns: ["grn_item_id"]
            isOneToOne: false
            referencedRelation: "goods_received_note_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_return_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_return_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "supplier_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_returns: {
        Row: {
          approved_at: string | null
          approved_by_id: string | null
          approved_by_name: string | null
          branch_id: string | null
          company_id: string
          created_at: string
          created_by_name: string
          grn_id: string | null
          id: string
          notes: string | null
          purchase_order_id: string | null
          reason: string
          return_date: string
          return_number: string
          status: string
          supplier_id: string
          supplier_name: string
          total_return_amount: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_id?: string | null
          approved_by_name?: string | null
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by_name: string
          grn_id?: string | null
          id?: string
          notes?: string | null
          purchase_order_id?: string | null
          reason: string
          return_date?: string
          return_number: string
          status?: string
          supplier_id: string
          supplier_name: string
          total_return_amount?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by_id?: string | null
          approved_by_name?: string | null
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by_name?: string
          grn_id?: string | null
          id?: string
          notes?: string | null
          purchase_order_id?: string | null
          reason?: string
          return_date?: string
          return_number?: string
          status?: string
          supplier_id?: string
          supplier_name?: string
          total_return_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_returns_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_returns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_returns_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "goods_received_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_returns_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_returns_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          alt_phone: string | null
          area: string | null
          bin: string | null
          branch_id: string | null
          category: string
          company: string | null
          company_id: string
          contact_person: string | null
          created_at: string
          created_by: string | null
          credit_limit: number | null
          default_currency: string | null
          district: string | null
          division: string | null
          email: string | null
          id: string
          is_active: boolean
          lead_time_days: number | null
          mobile: string
          name_bn: string | null
          notes: string | null
          payment_terms: string
          supplier_code: string | null
          supplier_name: string
          tin: string | null
          trade_license: string | null
          upazila: string | null
          updated_at: string
          updated_by: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          alt_phone?: string | null
          area?: string | null
          bin?: string | null
          branch_id?: string | null
          category: string
          company?: string | null
          company_id: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          default_currency?: string | null
          district?: string | null
          division?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number | null
          mobile: string
          name_bn?: string | null
          notes?: string | null
          payment_terms?: string
          supplier_code?: string | null
          supplier_name: string
          tin?: string | null
          trade_license?: string | null
          upazila?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          alt_phone?: string | null
          area?: string | null
          bin?: string | null
          branch_id?: string | null
          category?: string
          company?: string | null
          company_id?: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          default_currency?: string | null
          district?: string | null
          division?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number | null
          mobile?: string
          name_bn?: string | null
          notes?: string | null
          payment_terms?: string
          supplier_code?: string | null
          supplier_name?: string
          tin?: string | null
          trade_license?: string | null
          upazila?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      support_attachments: {
        Row: {
          company_id: string
          conversation_id: string
          created_at: string
          file_name: string
          file_size: number
          id: string
          message_id: string | null
          mime_type: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          company_id: string
          conversation_id: string
          created_at?: string
          file_name: string
          file_size: number
          id?: string
          message_id?: string | null
          mime_type: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          company_id?: string
          conversation_id?: string
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          message_id?: string | null
          mime_type?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_attachments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "support_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      support_conversations: {
        Row: {
          assigned_to: string | null
          assigned_to_name: string | null
          branch_id: string | null
          category: string
          closed_at: string | null
          closed_by: string | null
          company_id: string
          context_metadata: Json
          created_at: string
          created_by: string | null
          created_by_email: string
          created_by_name: string
          first_response_at: string | null
          id: string
          last_message_at: string
          last_message_by: string | null
          last_message_preview: string | null
          last_message_sender_type: string | null
          priority: string
          reopened_at: string | null
          resolved_at: string | null
          resolved_by: string | null
          source: string
          status: string
          subject: string
          ticket_number: string
          unread_platform_count: number
          unread_tenant_count: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          branch_id?: string | null
          category?: string
          closed_at?: string | null
          closed_by?: string | null
          company_id: string
          context_metadata?: Json
          created_at?: string
          created_by?: string | null
          created_by_email: string
          created_by_name: string
          first_response_at?: string | null
          id?: string
          last_message_at?: string
          last_message_by?: string | null
          last_message_preview?: string | null
          last_message_sender_type?: string | null
          priority?: string
          reopened_at?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string
          status?: string
          subject: string
          ticket_number: string
          unread_platform_count?: number
          unread_tenant_count?: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          branch_id?: string | null
          category?: string
          closed_at?: string | null
          closed_by?: string | null
          company_id?: string
          context_metadata?: Json
          created_at?: string
          created_by?: string | null
          created_by_email?: string
          created_by_name?: string
          first_response_at?: string | null
          id?: string
          last_message_at?: string
          last_message_by?: string | null
          last_message_preview?: string | null
          last_message_sender_type?: string | null
          priority?: string
          reopened_at?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string
          status?: string
          subject?: string
          ticket_number?: string
          unread_platform_count?: number
          unread_tenant_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "platform_admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_conversations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_conversations_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "platform_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          attachments: Json
          body: string
          client_mutation_id: string | null
          company_id: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          message_type: string
          read_at: string | null
          sender_email: string | null
          sender_name: string
          sender_type: string
          sender_user_id: string
        }
        Insert: {
          attachments?: Json
          body: string
          client_mutation_id?: string | null
          company_id: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          message_type?: string
          read_at?: string | null
          sender_email?: string | null
          sender_name: string
          sender_type: string
          sender_user_id: string
        }
        Update: {
          attachments?: Json
          body?: string
          client_mutation_id?: string | null
          company_id?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          message_type?: string
          read_at?: string | null
          sender_email?: string | null
          sender_name?: string
          sender_type?: string
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_domains: {
        Row: {
          created_at: string
          domain: string
          domain_type: string
          id: string
          is_primary: boolean
          metadata: Json | null
          ssl_status: string
          status: string
          tenant_id: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          domain: string
          domain_type?: string
          id?: string
          is_primary?: boolean
          metadata?: Json | null
          ssl_status?: string
          status?: string
          tenant_id: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          domain?: string
          domain_type?: string
          id?: string
          is_primary?: boolean
          metadata?: Json | null
          ssl_status?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_memberships: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_whatsapp_connections: {
        Row: {
          connected_at: string | null
          created_at: string
          daily_send_limit: number
          disconnected_at: string | null
          display_name: string | null
          engine: string
          id: string
          last_error: string | null
          last_seen_at: string | null
          openwa_session_id: string
          openwa_session_uuid: string | null
          phone_country_code: string | null
          phone_number: string | null
          provider: string
          qr_code_raw: string | null
          qr_code_updated_at: string | null
          send_delay_seconds: number
          status: string
          tenant_id: string
          updated_at: string
          webhook_secret: string | null
          webhook_status: string | null
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          daily_send_limit?: number
          disconnected_at?: string | null
          display_name?: string | null
          engine?: string
          id?: string
          last_error?: string | null
          last_seen_at?: string | null
          openwa_session_id: string
          openwa_session_uuid?: string | null
          phone_country_code?: string | null
          phone_number?: string | null
          provider?: string
          qr_code_raw?: string | null
          qr_code_updated_at?: string | null
          send_delay_seconds?: number
          status?: string
          tenant_id: string
          updated_at?: string
          webhook_secret?: string | null
          webhook_status?: string | null
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          daily_send_limit?: number
          disconnected_at?: string | null
          display_name?: string | null
          engine?: string
          id?: string
          last_error?: string | null
          last_seen_at?: string | null
          openwa_session_id?: string
          openwa_session_uuid?: string | null
          phone_country_code?: string | null
          phone_number?: string | null
          provider?: string
          qr_code_raw?: string | null
          qr_code_updated_at?: string | null
          send_delay_seconds?: number
          status?: string
          tenant_id?: string
          updated_at?: string
          webhook_secret?: string | null
          webhook_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_whatsapp_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      upazilas: {
        Row: {
          created_at: string
          district_id: number
          id: number
          name: string
          name_bn: string
        }
        Insert: {
          created_at?: string
          district_id: number
          id?: number
          name: string
          name_bn: string
        }
        Update: {
          created_at?: string
          district_id?: number
          id?: number
          name?: string
          name_bn?: string
        }
        Relationships: [
          {
            foreignKeyName: "upazilas_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_branch_access: {
        Row: {
          branch_id: string
          company_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          branch_id: string
          company_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          branch_id?: string
          company_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_branch_access_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_branch_access_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permission_overrides: {
        Row: {
          company_id: string
          company_user_id: string
          created_at: string
          id: string
          is_granted: boolean
          permission_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          company_user_id: string
          created_at?: string
          id?: string
          is_granted?: boolean
          permission_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          company_user_id?: string
          created_at?: string
          id?: string
          is_granted?: boolean
          permission_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permission_overrides_company_user_id_fkey"
            columns: ["company_user_id"]
            isOneToOne: false
            referencedRelation: "company_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permission_overrides_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          full_name_bn: string | null
          id: string
          is_active: boolean
          phone: string | null
          preferred_locale: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          full_name_bn?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          preferred_locale?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          full_name_bn?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          preferred_locale?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          company_id: string
          company_user_id: string
          created_at: string
          id: string
          role_id: string
        }
        Insert: {
          company_id: string
          company_user_id: string
          created_at?: string
          id?: string
          role_id: string
        }
        Update: {
          company_id?: string
          company_user_id?: string
          created_at?: string
          id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_company_user_id_fkey"
            columns: ["company_user_id"]
            isOneToOne: false
            referencedRelation: "company_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_chats: {
        Row: {
          chat_id: string
          chat_type: string
          connection_id: string
          contact_id: string | null
          created_at: string
          id: string
          last_message_at: string | null
          last_message_body: string | null
          last_message_id: string | null
          name: string
          tenant_id: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          chat_id: string
          chat_type?: string
          connection_id: string
          contact_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_body?: string | null
          last_message_id?: string | null
          name: string
          tenant_id: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          chat_id?: string
          chat_type?: string
          connection_id?: string
          contact_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_body?: string | null
          last_message_id?: string | null
          name?: string
          tenant_id?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_chats_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "tenant_whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_chats_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_chats_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_contacts: {
        Row: {
          avatar_url: string | null
          contact_type: string
          created_at: string
          customer_id: string | null
          display_name: string
          employee_id: string | null
          id: string
          is_opted_in: boolean
          last_message_at: string | null
          phone_number: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          contact_type?: string
          created_at?: string
          customer_id?: string | null
          display_name: string
          employee_id?: string | null
          id?: string
          is_opted_in?: boolean
          last_message_at?: string | null
          phone_number: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          contact_type?: string
          created_at?: string
          customer_id?: string | null
          display_name?: string
          employee_id?: string | null
          id?: string
          is_opted_in?: boolean
          last_message_at?: string | null
          phone_number?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contacts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          body: string | null
          chat_id: string
          connection_id: string
          contact_id: string | null
          created_at: string
          delivered_at: string | null
          direction: string
          error_code: string | null
          error_message: string | null
          id: string
          idempotency_key: string | null
          media_filename: string | null
          media_mime_type: string | null
          media_url: string | null
          message_type: string
          provider_message_id: string | null
          read_at: string | null
          received_at: string | null
          related_id: string | null
          related_type: string | null
          sent_at: string | null
          sent_by_user_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          chat_id: string
          connection_id: string
          contact_id?: string | null
          created_at?: string
          delivered_at?: string | null
          direction: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          message_type?: string
          provider_message_id?: string | null
          read_at?: string | null
          received_at?: string | null
          related_id?: string | null
          related_type?: string | null
          sent_at?: string | null
          sent_by_user_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          chat_id?: string
          connection_id?: string
          contact_id?: string | null
          created_at?: string
          delivered_at?: string | null
          direction?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          message_type?: string
          provider_message_id?: string | null
          read_at?: string | null
          received_at?: string | null
          related_id?: string | null
          related_type?: string | null
          sent_at?: string | null
          sent_by_user_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "tenant_whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_execution_logs: {
        Row: {
          actions_taken: Json
          company_id: string
          entity_id: string | null
          entity_type: string
          error_message: string | null
          executed_at: string
          id: string
          rule_id: string | null
          rule_name: string
          status: string
          trigger_type: string
        }
        Insert: {
          actions_taken?: Json
          company_id: string
          entity_id?: string | null
          entity_type: string
          error_message?: string | null
          executed_at?: string
          id?: string
          rule_id?: string | null
          rule_name: string
          status: string
          trigger_type: string
        }
        Update: {
          actions_taken?: Json
          company_id?: string
          entity_id?: string | null
          entity_type?: string
          error_message?: string | null
          executed_at?: string
          id?: string
          rule_id?: string | null
          rule_name?: string
          status?: string
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_execution_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_execution_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "workflow_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_rules: {
        Row: {
          actions: Json
          company_id: string
          conditions: Json
          created_at: string
          description: string | null
          execution_count: number
          id: string
          is_active: boolean
          last_executed_at: string | null
          name: string
          trigger_config: Json
          trigger_entity: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          company_id: string
          conditions?: Json
          created_at?: string
          description?: string | null
          execution_count?: number
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          name: string
          trigger_config?: Json
          trigger_entity: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          company_id?: string
          conditions?: Json
          created_at?: string
          description?: string | null
          execution_count?: number
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          name?: string
          trigger_config?: Json
          trigger_entity?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      workforce_audit_logs: {
        Row: {
          action_type: string
          actor_id: string | null
          actor_name: string
          after_state: Json | null
          before_state: Json | null
          company_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          reason: string | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          actor_id?: string | null
          actor_name?: string
          after_state?: Json | null
          before_state?: Json | null
          company_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string | null
          actor_name?: string
          after_state?: Json | null
          before_state?: Json | null
          company_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workforce_audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_purge_all_company_catalog_and_orders: {
        Args: { p_company_id: string }
        Returns: Json
      }
      admin_purge_all_company_invoices: {
        Args: { p_company_id: string }
        Returns: Json
      }
      admin_purge_all_company_operational_data: {
        Args: { p_company_id: string }
        Returns: Json
      }
      auth_get_current_company_user_id: {
        Args: { p_company_id: string }
        Returns: string
      }
      auth_get_current_employee_id: {
        Args: { p_company_id: string }
        Returns: string
      }
      auth_get_user_authorized_branches: {
        Args: { p_company_id: string }
        Returns: {
          branch_id: string
        }[]
      }
      auth_get_user_company_role: {
        Args: { target_company_id: string }
        Returns: string
      }
      auth_is_active_company_user: {
        Args: { target_company_id: string }
        Returns: boolean
      }
      auth_is_platform_admin: { Args: never; Returns: boolean }
      auth_is_platform_owner: { Args: never; Returns: boolean }
      auth_user_get_role: {
        Args: { target_company_id: string }
        Returns: string
      }
      auth_user_has_company_access: {
        Args: { target_company_id: string }
        Returns: boolean
      }
      auth_user_has_effective_permission: {
        Args: {
          p_branch_id?: string
          p_company_id: string
          p_permission_code: string
        }
        Returns: boolean
      }
      auth_user_has_permission: {
        Args: { required_permission: string; target_company_id: string }
        Returns: boolean
      }
      auth_validate_support_session: {
        Args: { p_company_id: string; p_token_hash: string }
        Returns: {
          access_level: string
          admin_email: string
          admin_id: string
          admin_name: string
          expires_at: string
          is_valid: boolean
        }[]
      }
      cancel_invoice_atomic: {
        Args: {
          p_actor_name?: string
          p_actor_user_id?: string
          p_company_id: string
          p_invoice_id: string
          p_reason: string
        }
        Returns: Json
      }
      create_invoice_atomic: {
        Args: {
          p_actor_user_id?: string
          p_advance_amount?: number
          p_advance_percentage?: number
          p_branch_id?: string
          p_company_id: string
          p_created_by_name?: string
          p_customer_address?: string
          p_customer_bin?: string
          p_customer_company?: string
          p_customer_email?: string
          p_customer_id?: string
          p_customer_name?: string
          p_customer_phone?: string
          p_customer_tin?: string
          p_customer_type?: string
          p_delivery_date?: string
          p_delivery_location?: string
          p_delivery_method?: string
          p_discount_amount?: number
          p_due_amount?: number
          p_due_date?: string
          p_due_on_delivery?: number
          p_grand_total?: number
          p_idempotency_key?: string
          p_installation_required?: boolean
          p_invoice_date?: string
          p_invoice_type?: string
          p_items?: Json
          p_job_order_id?: string
          p_language_mode?: string
          p_mushak_version?: string
          p_notes?: string
          p_order_number?: string
          p_paid_amount?: number
          p_payment_method?: string
          p_payment_method_note?: string
          p_quotation_id?: string
          p_reference_no?: string
          p_sales_order_id?: string
          p_subtotal?: number
          p_terms_and_conditions?: string
          p_vat_amount?: number
          p_vat_percentage?: number
        }
        Returns: Json
      }
      delete_tenant_permanently: {
        Args: { p_admin_id?: string; p_company_id: string; p_reason?: string }
        Returns: Json
      }
      enforce_tenant_branch_addition_atomic: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      enforce_tenant_order_creation_atomic: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      enforce_tenant_storage_upload_atomic: {
        Args: { p_bytes_to_add: number; p_company_id: string }
        Returns: boolean
      }
      enforce_tenant_user_addition_atomic: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      generate_saas_subscription_invoice_atomic: {
        Args: {
          p_amount: number
          p_company_id: string
          p_discount?: number
          p_interval: string
          p_notes?: string
          p_plan_id: string
          p_tax?: number
        }
        Returns: string
      }
      get_financial_drift_report: {
        Args: { p_company_id: string }
        Returns: Json
      }
      get_next_document_number:
        | {
            Args: { p_company_id: string; p_doc_type: string }
            Returns: string
          }
        | {
            Args: {
              p_company_id: string
              p_doc_type: string
              p_fiscal_year?: string
            }
            Returns: string
          }
      get_next_support_ticket_number: { Args: never; Returns: string }
      get_next_tenant_document_number: {
        Args: {
          p_company_id: string
          p_document_type: string
          p_prefix?: string
        }
        Returns: string
      }
      get_platform_tenant_users_overview: {
        Args: {
          p_company_id?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_status?: string
        }
        Returns: {
          branch_name: string
          company_id: string
          company_name: string
          company_slug: string
          company_user_id: string
          created_at: string
          email: string
          full_name: string
          full_name_bn: string
          phone: string
          primary_role: string
          responsibilities: Json
          status: string
          total_count: number
          user_id: string
        }[]
      }
      get_tenant_dashboard_metrics: {
        Args: { p_company_id: string }
        Returns: Json
      }
      get_tenant_dashboard_metrics_v2: {
        Args: { p_company_id: string }
        Returns: Json
      }
      get_tenant_financial_summary: {
        Args: {
          p_company_id: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: {
          net_cashflow: number
          total_collected: number
          total_expenses: number
          total_invoiced: number
          total_outstanding: number
        }[]
      }
      get_tenant_production_summary: {
        Args: {
          p_company_id: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: {
          completed_jobs: number
          delayed_jobs: number
          rework_count: number
          rework_wastage_cost: number
          total_jobs: number
        }[]
      }
      get_tenant_sales_summary: {
        Args: {
          p_company_id: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: {
          avg_order_value: number
          total_discount: number
          total_orders: number
          total_sales: number
          total_vat: number
        }[]
      }
      increment_account_balance_atomic: {
        Args: { p_account_id: string; p_company_id: string; p_delta: number }
        Returns: {
          account_subtype: string
          account_type: string
          branch_id: string | null
          code: string
          company_id: string
          created_at: string
          currency: string
          current_balance: number
          id: string
          is_active: boolean
          is_system: boolean
          metadata: Json | null
          name: string
          name_bn: string | null
          opening_balance: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      increment_customer_balance_atomic: {
        Args: {
          p_company_id: string
          p_customer_id: string
          p_due_delta?: number
          p_invoiced_delta?: number
          p_last_payment_amount?: number
          p_last_payment_date?: string
          p_paid_delta?: number
        }
        Returns: {
          address: string | null
          address_bn: string | null
          area: string | null
          bin_no: string | null
          company_id: string
          company_name: string | null
          contact_person: string | null
          created_at: string
          credit_limit: number
          current_balance: number | null
          customer_code: string | null
          customer_id_no: string | null
          customer_type: string
          district_id: number | null
          division_id: number | null
          email: string | null
          id: string
          is_active: boolean
          last_payment_amount: number | null
          last_payment_date: string | null
          mobile: string
          name: string
          name_bn: string | null
          notes: string | null
          payment_terms: string
          tags: string[] | null
          tin_no: string | null
          total_due_balance: number | null
          total_invoiced_amount: number | null
          total_paid_amount: number | null
          upazila_id: number | null
          updated_at: string
          whatsapp: string | null
        }
        SetofOptions: {
          from: "*"
          to: "customers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_company_id: string
          p_entity_id?: string
          p_entity_type: string
          p_new_values?: Json
          p_old_values?: Json
        }
        Returns: string
      }
      log_platform_audit_event:
        | {
            Args: {
              p_action: string
              p_details?: Json
              p_entity: string
              p_entity_id?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_action: string
              p_details?: Json
              p_entity_id?: string
              p_entity_type: string
              p_ip_address?: string
              p_target_company_id?: string
            }
            Returns: string
          }
      mutate_inventory_stock_atomic: {
        Args: {
          p_branch_id?: string
          p_company_id: string
          p_location_id?: string
          p_material_id: string
          p_notes?: string
          p_performed_by_id?: string
          p_performed_by_name?: string
          p_production_task_id?: string
          p_quantity_change?: number
          p_reference_id?: string
          p_reference_type?: string
          p_task_id?: string
          p_transaction_type?: string
          p_unit_cost?: number
        }
        Returns: Json
      }
      platform_is_feature_enabled: {
        Args: { p_company_id?: string; p_key: string }
        Returns: boolean
      }
      reconcile_customer_balance_atomic: {
        Args: { p_company_id: string; p_customer_id?: string }
        Returns: Json
      }
      reconcile_inventory_stock_atomic: {
        Args: { p_company_id: string; p_material_id?: string }
        Returns: Json
      }
      record_cheque_dishonor_atomic: {
        Args: {
          p_actor_user_id?: string
          p_authorized_by_name?: string
          p_company_id: string
          p_fee?: number
          p_payment_id: string
          p_reason: string
        }
        Returns: Json
      }
      record_customer_refund_atomic: {
        Args: {
          p_actor_name: string
          p_amount: number
          p_branch_id: string
          p_company_id: string
          p_customer_id: string
          p_customer_name: string
          p_reason: string
          p_refund_account_id: string
          p_refund_date: string
          p_refund_number: string
        }
        Returns: Json
      }
      record_expense_atomic: {
        Args: {
          p_actor_name: string
          p_amount: number
          p_attachment_url: string
          p_branch_id: string
          p_category: string
          p_company_id: string
          p_description: string
          p_expense_account_id: string
          p_expense_date: string
          p_expense_number: string
          p_payment_account_id: string
          p_vendor_name: string
        }
        Returns: Json
      }
      record_expense_with_journal_atomic: {
        Args: {
          p_amount: number
          p_authorized_by?: string
          p_branch_id?: string
          p_category_id: string
          p_company_id: string
          p_expense_date?: string
          p_idempotency_key?: string
          p_is_recurring?: boolean
          p_notes?: string
          p_payee_name?: string
          p_payment_account_id: string
          p_payment_method?: string
          p_recurring_frequency?: string
          p_reference_no?: string
          p_vendor_id?: string
        }
        Returns: Json
      }
      record_financial_transfer_atomic: {
        Args: {
          p_actor_name: string
          p_amount: number
          p_branch_id: string
          p_company_id: string
          p_fee_amount: number
          p_from_account_id: string
          p_notes: string
          p_to_account_id: string
          p_transfer_date: string
          p_transfer_number: string
        }
        Returns: Json
      }
      record_financial_write_off_atomic: {
        Args: {
          p_actor_user_id?: string
          p_amount: number
          p_authorized_by_name: string
          p_company_id: string
          p_invoice_id: string
          p_reason: string
        }
        Returns: Json
      }
      record_inventory_stock_transaction: {
        Args: {
          p_company_id: string
          p_material_id: string
          p_notes: string
          p_performed_by_name: string
          p_quantity_change: number
          p_reference_id: string
          p_transaction_type: string
          p_unit_cost: number
        }
        Returns: number
      }
      record_multi_invoice_payment_atomic: {
        Args: {
          p_actor_user_id?: string
          p_allocations?: Json
          p_amount?: number
          p_bank_name?: string
          p_branch_id?: string
          p_cheque_date?: string
          p_cheque_number?: string
          p_company_id: string
          p_customer_id?: string
          p_customer_name?: string
          p_idempotency_key?: string
          p_mfs_transaction_id?: string
          p_notes?: string
          p_payment_date?: string
          p_payment_method?: string
          p_received_by_name?: string
        }
        Returns: Json
      }
      record_saas_payment_and_settle_atomic: {
        Args: {
          p_actor_id?: string
          p_internal_trx_id: string
          p_paid_amount: number
          p_provider: string
          p_provider_trx_id: string
        }
        Returns: boolean
      }
      record_supplier_payment_atomic: {
        Args: {
          p_actor_name: string
          p_amount: number
          p_branch_id: string
          p_company_id: string
          p_notes: string
          p_payment_account_id: string
          p_payment_date: string
          p_payment_number: string
          p_reference_number: string
          p_supplier_id: string
          p_supplier_name: string
        }
        Returns: Json
      }
      report_production_problem_atomic: {
        Args: {
          p_company_id: string
          p_notes?: string
          p_photo_url?: string
          p_reason: string
          p_reported_by_name?: string
          p_task_id: string
        }
        Returns: Json
      }
      resolve_tenant_by_hostname: {
        Args: { p_hostname: string }
        Returns: {
          domain_type: string
          is_active: boolean
          name: string
          name_bn: string
          slug: string
          status: string
          tenant_id: string
        }[]
      }
      schedule_production_task_atomic: {
        Args: {
          p_company_id: string
          p_duration_minutes: number
          p_machine_id: string
          p_notes: string
          p_operator_id: string
          p_scheduled_end: string
          p_scheduled_start: string
          p_task_id: string
        }
        Returns: Json
      }
      transition_subscription_state_atomic: {
        Args: {
          p_actor_id?: string
          p_company_id: string
          p_new_status: string
          p_reason?: string
        }
        Returns: boolean
      }
      validate_tenant_limit_atomic: {
        Args: {
          p_company_id: string
          p_current_count: number
          p_limit_type: string
        }
        Returns: {
          current_count: number
          effective_limit: number
          is_allowed: boolean
          is_exceeded: boolean
          is_warning: boolean
          rejection_reason: string
          usage_percentage: number
        }[]
      }
      verify_auth_otp_atomic: {
        Args: { p_email: string; p_otp_hash: string; p_purpose: string }
        Returns: Json
      }
      verify_auth_token_atomic: {
        Args: { p_purpose?: string; p_token_hash: string }
        Returns: Json
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
