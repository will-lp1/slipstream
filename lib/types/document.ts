export interface Document {
  id: string;
  title: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
}

export interface UseDocumentProps {
  id?: string;
  initialContent?: string;
  initialTitle?: string;
}

export interface UseDocumentReturn {
  content: string;
  title: string;
  setContent: (content: string) => void;
  setTitle: (title: string) => void;
  isSaving: boolean;
  lastSaved?: Date;
  error: Error | null;
} 