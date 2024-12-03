import type { Database } from '@/types/supabase'

// Document type from Supabase
export type Document = Database['public']['Tables']['documents']['Row']

// Suggestion type
export interface Suggestion {
  id: string
  documentId: string
  originalText: string
  suggestedText: string
  description: string
  isResolved: boolean
  created_at: string
  document_created_at: string
} 