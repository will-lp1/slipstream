import type { Database } from '../supabase/types';

export type Chat = Database['public']['Tables']['chat']['Row'];
export type Message = Database['public']['Tables']['message']['Row'];
export type Document = Database['public']['Tables']['documents']['Row'];
export type Embedding = Database['public']['Tables']['embeddings']['Row'];

export interface Suggestion {
  id: string;
  documentId: string;
  userId: string;
  originalText: string;
  suggestedText: string;
  description: string;
  isResolved: boolean;
  createdAt: Date;
  documentCreatedAt: Date;
}
