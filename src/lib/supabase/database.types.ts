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
      achievements: {
        Row: {
          created_at: string | null
          id: string
          les_type: string
          level: number | null
          module_page: string | null
          notes: string | null
          recorded_by: string | null
          score: number | null
          student_id: string
          student_les_id: string | null
          topic: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          les_type: string
          level?: number | null
          module_page?: string | null
          notes?: string | null
          recorded_by?: string | null
          score?: number | null
          student_id: string
          student_les_id?: string | null
          topic?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          les_type?: string
          level?: number | null
          module_page?: string | null
          notes?: string | null
          recorded_by?: string | null
          score?: number | null
          student_id?: string
          student_les_id?: string | null
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "achievements_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievements_student_les_id_fkey"
            columns: ["student_les_id"]
            isOneToOne: false
            referencedRelation: "student_les"
            referencedColumns: ["id"]
          },
        ]
      }
      class_members: {
        Row: {
          class_id: string
          id: string
          joined_at: string | null
          student_id: string
        }
        Insert: {
          class_id: string
          id?: string
          joined_at?: string | null
          student_id: string
        }
        Update: {
          class_id?: string
          id?: string
          joined_at?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_members_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_members_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          capacity: number | null
          created_at: string | null
          id: string
          les_mapel_name: string | null
          les_type: string
          level: number | null
          name: string
          room: string | null
          schedule: string | null
          status: string | null
          teacher_id: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          id?: string
          les_mapel_name?: string | null
          les_type: string
          level?: number | null
          name: string
          room?: string | null
          schedule?: string | null
          status?: string | null
          teacher_id?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          id?: string
          les_mapel_name?: string | null
          les_type?: string
          level?: number | null
          name?: string
          room?: string | null
          schedule?: string | null
          status?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_folders: {
        Row: {
          created_at: string | null
          folder_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          folder_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          folder_id?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      evaluations: {
        Row: {
          created_at: string | null
          current_level: number
          duration_days: number | null
          end_date: string | null
          eval_number: string
          evaluated_by: string | null
          id: string
          les_type: string
          notes: string | null
          photo_url: string | null
          score: number | null
          start_date: string | null
          status: string | null
          student_id: string
          student_les_id: string | null
          target_level: number
          updated_at: string | null
          wa_notif_sent: boolean | null
        }
        Insert: {
          created_at?: string | null
          current_level: number
          duration_days?: number | null
          end_date?: string | null
          eval_number: string
          evaluated_by?: string | null
          id?: string
          les_type: string
          notes?: string | null
          photo_url?: string | null
          score?: number | null
          start_date?: string | null
          status?: string | null
          student_id: string
          student_les_id?: string | null
          target_level: number
          updated_at?: string | null
          wa_notif_sent?: boolean | null
        }
        Update: {
          created_at?: string | null
          current_level?: number
          duration_days?: number | null
          end_date?: string | null
          eval_number?: string
          evaluated_by?: string | null
          id?: string
          les_type?: string
          notes?: string | null
          photo_url?: string | null
          score?: number | null
          start_date?: string | null
          status?: string | null
          student_id?: string
          student_les_id?: string | null
          target_level?: number
          updated_at?: string | null
          wa_notif_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_evaluated_by_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_student_les_id_fkey"
            columns: ["student_les_id"]
            isOneToOne: false
            referencedRelation: "student_les"
            referencedColumns: ["id"]
          },
        ]
      }
      graduations: {
        Row: {
          certificate_number: string | null
          certificate_url: string | null
          created_at: string | null
          graduation_date: string
          id: string
          les_type: string
          notes: string | null
          photo_url: string | null
          student_id: string
          student_les_id: string | null
        }
        Insert: {
          certificate_number?: string | null
          certificate_url?: string | null
          created_at?: string | null
          graduation_date: string
          id?: string
          les_type: string
          notes?: string | null
          photo_url?: string | null
          student_id: string
          student_les_id?: string | null
        }
        Update: {
          certificate_number?: string | null
          certificate_url?: string | null
          created_at?: string | null
          graduation_date?: string
          id?: string
          les_type?: string
          notes?: string | null
          photo_url?: string | null
          student_id?: string
          student_les_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "graduations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "graduations_student_les_id_fkey"
            columns: ["student_les_id"]
            isOneToOne: false
            referencedRelation: "student_les"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          class_id: string | null
          date: string
          id: string
          processed_by: string | null
          reason: string
          status: string | null
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          class_id?: string | null
          date: string
          id?: string
          processed_by?: string | null
          reason: string
          status?: string | null
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          class_id?: string | null
          date?: string
          id?: string
          processed_by?: string | null
          reason?: string
          status?: string | null
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      merchandise: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          points_required: number
          stock: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          points_required: number
          stock?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          points_required?: number
          stock?: number | null
        }
        Relationships: []
      }
      payment_bills: {
        Row: {
          amount: number
          bill_month: string | null
          created_at: string | null
          due_date: string | null
          id: string
          les_type: string | null
          payment_type_id: string | null
          status: string | null
          student_id: string
        }
        Insert: {
          amount: number
          bill_month?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          les_type?: string | null
          payment_type_id?: string | null
          status?: string | null
          student_id: string
        }
        Update: {
          amount?: number
          bill_month?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          les_type?: string | null
          payment_type_id?: string | null
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_bills_payment_type_id_fkey"
            columns: ["payment_type_id"]
            isOneToOne: false
            referencedRelation: "payment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_bills_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          bill_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          receipt_number: string | null
          received_by: string | null
          student_id: string
        }
        Insert: {
          amount: number
          bill_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          received_by?: string | null
          student_id: string
        }
        Update: {
          amount?: number
          bill_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          received_by?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "payment_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_types: {
        Row: {
          amount: number | null
          created_at: string | null
          id: string
          is_recurring: boolean | null
          les_type: string | null
          name: string
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          id?: string
          is_recurring?: boolean | null
          les_type?: string | null
          name: string
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          id?: string
          is_recurring?: boolean | null
          les_type?: string | null
          name?: string
        }
        Relationships: []
      }
      point_redemptions: {
        Row: {
          id: string
          merchandise_id: string | null
          points_used: number
          processed_by: string | null
          redeemed_at: string | null
          status: string | null
          student_id: string
        }
        Insert: {
          id?: string
          merchandise_id?: string | null
          points_used: number
          processed_by?: string | null
          redeemed_at?: string | null
          status?: string | null
          student_id: string
        }
        Update: {
          id?: string
          merchandise_id?: string | null
          points_used?: number
          processed_by?: string | null
          redeemed_at?: string | null
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_redemptions_merchandise_id_fkey"
            columns: ["merchandise_id"]
            isOneToOne: false
            referencedRelation: "merchandise"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_redemptions_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_redemptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      point_transactions: {
        Row: {
          attendance_id: string | null
          created_at: string | null
          description: string | null
          id: string
          points: number
          redemption_id: string | null
          student_id: string
          type: string
        }
        Insert: {
          attendance_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          points: number
          redemption_id?: string | null
          student_id: string
          type: string
        }
        Update: {
          attendance_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          points?: number
          redemption_id?: string | null
          student_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "student_attendance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          id: string
          role: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          address: string | null
          birth_date: string | null
          birth_place: string | null
          district: string | null
          father_name: string | null
          full_name: string
          gender: string | null
          guardian_name: string | null
          id: string
          les_mapel_detail: string | null
          les_types: string[] | null
          mother_name: string | null
          nickname: string | null
          photo_url: string | null
          regency: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rt: string | null
          rw: string | null
          school_class: string | null
          school_origin: string | null
          status: string | null
          submitted_at: string | null
          village: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          birth_place?: string | null
          district?: string | null
          father_name?: string | null
          full_name: string
          gender?: string | null
          guardian_name?: string | null
          id?: string
          les_mapel_detail?: string | null
          les_types?: string[] | null
          mother_name?: string | null
          nickname?: string | null
          photo_url?: string | null
          regency?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rt?: string | null
          rw?: string | null
          school_class?: string | null
          school_origin?: string | null
          status?: string | null
          submitted_at?: string | null
          village?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          birth_place?: string | null
          district?: string | null
          father_name?: string | null
          full_name?: string
          gender?: string | null
          guardian_name?: string | null
          id?: string
          les_mapel_detail?: string | null
          les_types?: string[] | null
          mother_name?: string | null
          nickname?: string | null
          photo_url?: string | null
          regency?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rt?: string | null
          rw?: string | null
          school_class?: string | null
          school_origin?: string | null
          status?: string | null
          submitted_at?: string | null
          village?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_accounts: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "savings_accounts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string | null
          description: string | null
          id: string
          payment_transaction_id: string | null
          processed_by: string | null
          savings_id: string
          student_id: string
          type: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          payment_transaction_id?: string | null
          processed_by?: string | null
          savings_id: string
          student_id: string
          type: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          payment_transaction_id?: string | null
          processed_by?: string | null
          savings_id?: string
          student_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_transactions_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "savings_transactions_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "savings_transactions_savings_id_fkey"
            columns: ["savings_id"]
            isOneToOne: false
            referencedRelation: "savings_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "savings_transactions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_attendance: {
        Row: {
          checked_by: string | null
          class_id: string | null
          created_at: string | null
          date: string
          id: string
          les_type: string | null
          notes: string | null
          points_earned: number | null
          status: string
          student_id: string
        }
        Insert: {
          checked_by?: string | null
          class_id?: string | null
          created_at?: string | null
          date?: string
          id?: string
          les_type?: string | null
          notes?: string | null
          points_earned?: number | null
          status: string
          student_id: string
        }
        Update: {
          checked_by?: string | null
          class_id?: string | null
          created_at?: string | null
          date?: string
          id?: string
          les_type?: string | null
          notes?: string | null
          points_earned?: number | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_attendance_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_les: {
        Row: {
          current_level: number | null
          graduated_at: string | null
          id: string
          les_mapel_name: string | null
          les_type: string
          max_level: number | null
          start_date: string | null
          status: string | null
          student_id: string
        }
        Insert: {
          current_level?: number | null
          graduated_at?: string | null
          id?: string
          les_mapel_name?: string | null
          les_type: string
          max_level?: number | null
          start_date?: string | null
          status?: string | null
          student_id: string
        }
        Update: {
          current_level?: number | null
          graduated_at?: string | null
          id?: string
          les_mapel_name?: string | null
          les_type?: string
          max_level?: number | null
          start_date?: string | null
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_les_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_points: {
        Row: {
          id: string
          redeemed_points: number | null
          student_id: string
          total_points: number | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          redeemed_points?: number | null
          student_id: string
          total_points?: number | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          redeemed_points?: number | null
          student_id?: string
          total_points?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_points_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          birth_cert_url: string | null
          birth_date: string | null
          birth_place: string | null
          created_at: string | null
          district: string | null
          enrollment_date: string | null
          father_name: string | null
          full_name: string
          gender: string | null
          id: string
          kk_number: string | null
          kk_url: string | null
          mother_name: string | null
          nickname: string | null
          nik: string | null
          nis: string
          photo_url: string | null
          regency: string | null
          registration_id: string | null
          rt: string | null
          rw: string | null
          school_class: string | null
          school_origin: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          village: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          birth_cert_url?: string | null
          birth_date?: string | null
          birth_place?: string | null
          created_at?: string | null
          district?: string | null
          enrollment_date?: string | null
          father_name?: string | null
          full_name: string
          gender?: string | null
          id?: string
          kk_number?: string | null
          kk_url?: string | null
          mother_name?: string | null
          nickname?: string | null
          nik?: string | null
          nis: string
          photo_url?: string | null
          regency?: string | null
          registration_id?: string | null
          rt?: string | null
          rw?: string | null
          school_class?: string | null
          school_origin?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          village?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          birth_cert_url?: string | null
          birth_date?: string | null
          birth_place?: string | null
          created_at?: string | null
          district?: string | null
          enrollment_date?: string | null
          father_name?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          kk_number?: string | null
          kk_url?: string | null
          mother_name?: string | null
          nickname?: string | null
          nik?: string | null
          nis?: string
          photo_url?: string | null
          regency?: string | null
          registration_id?: string | null
          rt?: string | null
          rw?: string | null
          school_class?: string | null
          school_origin?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          village?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_attendance: {
        Row: {
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          date: string
          id: string
          notes: string | null
          status: string
          teacher_id: string
        }
        Insert: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          status: string
          teacher_id: string
        }
        Update: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          status?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_attendance_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          address: string | null
          birth_date: string | null
          birth_place: string | null
          created_at: string | null
          district: string | null
          full_name: string
          gender: string | null
          id: string
          ijazah_url: string | null
          kk_url: string | null
          ktp_url: string | null
          nik: string | null
          nip: string | null
          photo_url: string | null
          position: string | null
          regency: string | null
          rt: string | null
          rw: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          village: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          birth_place?: string | null
          created_at?: string | null
          district?: string | null
          full_name: string
          gender?: string | null
          id?: string
          ijazah_url?: string | null
          kk_url?: string | null
          ktp_url?: string | null
          nik?: string | null
          nip?: string | null
          photo_url?: string | null
          position?: string | null
          regency?: string | null
          rt?: string | null
          rw?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          village?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          birth_place?: string | null
          created_at?: string | null
          district?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          ijazah_url?: string | null
          kk_url?: string | null
          ktp_url?: string | null
          nik?: string | null
          nip?: string | null
          photo_url?: string | null
          position?: string | null
          regency?: string | null
          rt?: string | null
          rw?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          village?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      wa_notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          recipient: string
          reference_id: string | null
          sent_at: string | null
          status: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          recipient: string
          reference_id?: string | null
          sent_at?: string | null
          status?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          recipient?: string
          reference_id?: string | null
          sent_at?: string | null
          status?: string | null
          type?: string
        }
        Relationships: []
      }
      wa_templates: {
        Row: {
          content: string
          id: string
          name: string
          template_type: string
          updated_at: string | null
        }
        Insert: {
          content: string
          id: string
          name: string
          template_type: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          id?: string
          name?: string
          template_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_certificate_number: {
        Args: { p_les_type: string }
        Returns: string
      }
      generate_eval_number: { Args: never; Returns: string }
      generate_nis: { Args: never; Returns: string }
      generate_receipt_number: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
