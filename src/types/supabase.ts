export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      blocked_dates: {
        Row: {
          created_at: string
          end_date: string
          id: string
          reason: string | null
          start_date: string
          zone_id: string | null
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          zone_id?: string | null
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_dates_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          reservation_id: string
          status: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          reservation_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          reservation_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      pitches: {
        Row: {
          code: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["pitch_status"]
          zone_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["pitch_status"]
          zone_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["pitch_status"]
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pitches_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          check_in: string
          check_out: string
          checked_in_at: string | null
          checked_out_at: string | null
          created_at: string
          expires_at: string | null
          guest_email: string
          guest_name: string
          guest_phone: string
          id: string
          notes: string | null
          num_guests: number
          pitch_id: string | null
          status: Database["public"]["Enums"]["reservation_status"]
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          total_cents: number
          updated_at: string
          vehicle_plate: string | null
          zone_id: string
        }
        Insert: {
          check_in: string
          check_out: string
          checked_in_at?: string | null
          checked_out_at?: string | null
          created_at?: string
          expires_at?: string | null
          guest_email: string
          guest_name: string
          guest_phone: string
          id?: string
          notes?: string | null
          num_guests?: number
          pitch_id?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total_cents: number
          updated_at?: string
          vehicle_plate?: string | null
          zone_id: string
        }
        Update: {
          check_in?: string
          check_out?: string
          checked_in_at?: string | null
          checked_out_at?: string | null
          created_at?: string
          expires_at?: string | null
          guest_email?: string
          guest_name?: string
          guest_phone?: string
          id?: string
          notes?: string | null
          num_guests?: number
          pitch_id?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total_cents?: number
          updated_at?: string
          vehicle_plate?: string | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_pitch_id_fkey"
            columns: ["pitch_id"]
            isOneToOne: false
            referencedRelation: "pitches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_rates: {
        Row: {
          created_at: string
          end_date: string
          id: string
          min_nights: number
          price_cents_per_night: number
          start_date: string
          zone_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          min_nights?: number
          price_cents_per_night: number
          start_date: string
          zone_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          min_nights?: number
          price_cents_per_night?: number
          start_date?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_rates_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          active: boolean
          amenities: Json
          capacity: number
          created_at: string
          description: string | null
          description_en: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          amenities?: Json
          capacity: number
          created_at?: string
          description?: string | null
          description_en?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          amenities?: Json
          capacity?: number
          created_at?: string
          description?: string | null
          description_en?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_zone_bookings: {
        Args: {
          p_check_in: string
          p_check_out: string
          p_exclude_reservation_id?: string
          p_zone_id: string
        }
        Returns: number
      }
      expire_pending_reservations: { Args: never; Returns: number }
      get_zone_availability: {
        Args: { p_check_in: string; p_check_out: string; p_zone_id: string }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      payment_status: "pending" | "succeeded" | "failed" | "refunded"
      pitch_status: "available" | "occupied" | "maintenance"
      reservation_status:
        | "pending_payment"
        | "confirmed"
        | "checked_in"
        | "checked_out"
        | "cancelled"
        | "expired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
