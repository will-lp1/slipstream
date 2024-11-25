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
        }
        Insert: {
          id: string
          content?: string | null
          user_id: string
          title: string
          created_at?: string
        }
        Update: {
          id?: string
          content?: string | null
          user_id?: string
          title?: string
          created_at?: string
        }
      }
      message: {
        Row: {
          id: string
          content: string
          role: string
          chat_id: string
          created_at: string
        }
        Insert: {
          id?: string
          content: string
          role: string
          chat_id: string
          created_at?: string
        }
        Update: {
          id?: string
          content?: string
          role?: string
          chat_id?: string
          created_at?: string
        }
      }
      chat: {
        Row: {
          id: string
          user_id: string
          title: string
          created_at: string
        }
        Insert: {
          id: string
          user_id: string
          title: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          created_at?: string
        }
      }
      embeddings: {
        Row: {
          id: string
          content: string
          embedding: number[]
          document_id: string
          created_at: string
        }
        Insert: {
          id?: string
          content: string
          embedding: number[]
          document_id: string
          created_at?: string
        }
        Update: {
          id?: string
          content?: string
          embedding?: number[]
          document_id?: string
          created_at?: string
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
          is_resolved: boolean
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
    Functions: {
      match_embeddings: {
        Args: {
          query_embedding: number[]
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          content: string
          similarity: number
        }[]
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Functions<T extends keyof Database['public']['Functions']> = Database['public']['Functions'][T]

// Derived types for use in the application
export type Document = Tables<'documents'>
export type Message = Tables<'message'>
export type Chat = Tables<'chat'>
export type Embedding = Tables<'embeddings'>
