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
          content: string | null
          user_id: string
          title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          content?: string | null
          user_id: string
          title: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          content?: string | null
          user_id?: string
          title?: string
          created_at?: string
          updated_at?: string
        }
      }
      // Add other tables as needed
    }
  }
} 