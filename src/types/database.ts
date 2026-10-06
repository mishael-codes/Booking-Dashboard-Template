export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show'
  | 'expired';

export type PaymentStatus =
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'refunded';

export type ResourceKind =
  | 'staff'
  | 'room'
  | 'equipment'
  | 'other';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      admins: {
        Row: {
          user_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admins_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      business_settings: {
        Row: {
          id: boolean;
          business_name: string;
          timezone: string;
          currency: string;
          slot_interval_minutes: number;
          min_notice_minutes: number;
          max_advance_days: number;
          cancellation_window_hours: number;
          hold_minutes: number;
          max_pending_per_user: number;
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          business_name: string;
          timezone?: string;
          currency?: string;
          slot_interval_minutes?: number;
          min_notice_minutes?: number;
          max_advance_days?: number;
          cancellation_window_hours?: number;
          hold_minutes?: number;
          max_pending_per_user?: number;
          updated_at?: string;
        };
        Update: {
          id?: boolean;
          business_name?: string;
          timezone?: string;
          currency?: string;
          slot_interval_minutes?: number;
          min_notice_minutes?: number;
          max_advance_days?: number;
          cancellation_window_hours?: number;
          hold_minutes?: number;
          max_pending_per_user?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          duration_minutes: number;
          price_minor: number;
          currency: string;
          image_url: string | null;
          is_active: boolean;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          duration_minutes: number;
          price_minor?: number;
          currency?: string;
          image_url?: string | null;
          is_active?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          duration_minutes?: number;
          price_minor?: number;
          currency?: string;
          image_url?: string | null;
          is_active?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      resources: {
        Row: {
          id: string;
          name: string;
          kind: ResourceKind;
          description: string | null;
          image_url: string | null;
          is_active: boolean;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          kind?: ResourceKind;
          description?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          kind?: ResourceKind;
          description?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      service_resources: {
        Row: {
          service_id: string;
          resource_id: string;
        };
        Insert: {
          service_id: string;
          resource_id: string;
        };
        Update: {
          service_id?: string;
          resource_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_resources_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_resources_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "resources";
            referencedColumns: ["id"];
          }
        ];
      };
      resource_staff: {
        Row: {
          resource_id: string;
          user_id: string;
        };
        Insert: {
          resource_id: string;
          user_id: string;
        };
        Update: {
          resource_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resource_staff_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "resources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resource_staff_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      availability_rules: {
        Row: {
          id: string;
          resource_id: string;
          weekday: number;
          start_time: string;
          end_time: string;
        };
        Insert: {
          id?: string;
          resource_id: string;
          weekday: number;
          start_time: string;
          end_time: string;
        };
        Update: {
          id?: string;
          resource_id?: string;
          weekday?: number;
          start_time?: string;
          end_time?: string;
        };
        Relationships: [
          {
            foreignKeyName: "availability_rules_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "resources";
            referencedColumns: ["id"];
          }
        ];
      };
      time_off: {
        Row: {
          id: string;
          resource_id: string;
          starts_at: string;
          ends_at: string;
          reason: string | null;
          during?: unknown;
        };
        Insert: {
          id?: string;
          resource_id: string;
          starts_at: string;
          ends_at: string;
          reason?: string | null;
        };
        Update: {
          id?: string;
          resource_id?: string;
          starts_at?: string;
          ends_at?: string;
          reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "time_off_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "resources";
            referencedColumns: ["id"];
          }
        ];
      };
      bookings: {
        Row: {
          id: string;
          reference: string;
          customer_id: string | null;
          service_id: string;
          resource_id: string;
          starts_at: string;
          ends_at: string;
          status: BookingStatus;
          hold_expires_at: string | null;
          price_minor: number;
          currency: string;
          contact_name: string;
          contact_email: string;
          contact_phone: string | null;
          notes: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reference?: string;
          customer_id?: string | null;
          service_id: string;
          resource_id: string;
          starts_at: string;
          ends_at: string;
          status?: BookingStatus;
          hold_expires_at?: string | null;
          price_minor: number;
          currency?: string;
          contact_name: string;
          contact_email: string;
          contact_phone?: string | null;
          notes?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reference?: string;
          customer_id?: string | null;
          service_id?: string;
          resource_id?: string;
          starts_at?: string;
          ends_at?: string;
          status?: BookingStatus;
          hold_expires_at?: string | null;
          price_minor?: number;
          currency?: string;
          contact_name?: string;
          contact_email?: string;
          contact_phone?: string | null;
          notes?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "resources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      booking_notes: {
        Row: {
          booking_id: string;
          note: string;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          booking_id: string;
          note: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          booking_id?: string;
          note?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_notes_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          }
        ];
      };
      payments: {
        Row: {
          id: string;
          booking_id: string;
          provider: string;
          provider_reference: string;
          amount_minor: number;
          currency: string;
          status: PaymentStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          provider: string;
          provider_reference: string;
          amount_minor: number;
          currency?: string;
          status?: PaymentStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          provider?: string;
          provider_reference?: string;
          amount_minor?: number;
          currency?: string;
          status?: PaymentStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          }
        ];
      };
      audit_log: {
        Row: {
          id: number;
          actor_id: string | null;
          table_name: string;
          record_id: string;
          action: 'INSERT' | 'UPDATE' | 'DELETE';
          old_data: Record<string, unknown> | null;
          new_data: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_dashboard_stats: {
        Args: {
          p_from: string;
          p_to: string;
        };
        Returns: {
          bookings_total: number;
          bookings_confirmed: number;
          bookings_cancelled: number;
          revenue_minor: number;
        }[];
      };
      get_available_slots: {
        Args: {
          p_service_id: string;
          p_day: string;
          p_resource_id?: string | null;
        };
        Returns: {
          resource_id: string;
          starts_at: string;
          ends_at: string;
        }[];
      };
      admin_bookings_by_day: {
        Args: {
          p_from: string;
          p_to: string;
        };
        Returns: {
          day: string;
          bookings: number;
          booked_value_minor: number;
        }[];
      };
    };
    Enums: {
      booking_status: BookingStatus;
      payment_status: PaymentStatus;
      resource_kind: ResourceKind;
    };
  };
}
