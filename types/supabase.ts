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
      documents: {
        Row: {
          id: string
          title: string
          content: string | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content?: string | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      suggestions: {
        Row: {
          id: string
          document_id: string
          user_id: string
          original_text: string
          suggested_text: string
          description: string
          is_resolved: boolean
          created_at: string
          document_created_at: string
        }
        Insert: {
          id: string
          document_id: string
          user_id: string
          original_text: string
          suggested_text: string
          description: string
          is_resolved?: boolean
          created_at?: string
          document_created_at: string
        }
        Update: {
          id?: string
          document_id?: string
          user_id?: string
          original_text?: string
          suggested_text?: string
          description?: string
          is_resolved?: boolean
          created_at?: string
          document_created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Export commonly used types
