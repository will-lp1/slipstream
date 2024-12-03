export type Database = {
  public: {
    Tables: {
      chats: {
        Row: {
          id: string
          user_id: string
          title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          chat_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          created_at?: string
        }
      }
    }
  }
}

// Export commonly used types
export type Chat = Database['public']['Tables']['chats']['Row']
export type Message = Database['public']['Tables']['messages']['Row'] 