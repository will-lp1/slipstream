import { useCallback, useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { debounce } from 'lodash';
import type { Database } from '@/lib/supabase/types';
import type { UseDocumentProps, UseDocumentReturn } from '@/lib/types/document';

export function useDocument({
  id,
  initialContent = '',
  initialTitle = 'Untitled'
}: UseDocumentProps): UseDocumentReturn {
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [title, setTitle] = useState(initialTitle);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date>();
  const [error, setError] = useState<Error | null>(null);

  // Load document
  useEffect(() => {
    async function loadDocument() {
      if (!id) return;

      try {
        const response = await fetch(`/api/document?id=${id}`);
        
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/auth');
            return;
          }
          throw new Error('Failed to load document');
        }

        const document = await response.json();
        if (document) {
          setContent(document.content || '');
          setTitle(document.title || 'Untitled');
          setLastSaved(new Date(document.updated_at || document.created_at));
        }
      } catch (err) {
        console.error('Error loading document:', err);
        setError(err instanceof Error ? err : new Error('Failed to load document'));
      }
    }

    loadDocument();
  }, [id, router]);

  // Save document
  const saveDocument = useCallback(
    debounce(async (newContent: string, newTitle: string) => {
      if (!id) return;

      setIsSaving(true);
      try {
        const response = await fetch(`/api/document?id=${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: newContent, title: newTitle }),
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/auth');
            return;
          }
          throw new Error('Failed to save document');
        }

        setLastSaved(new Date());
        router.refresh();
      } catch (err) {
        console.error('Error saving document:', err);
        setError(err instanceof Error ? err : new Error('Failed to save document'));
      } finally {
        setIsSaving(false);
      }
    }, 1000),
    [id, router]
  );

  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
    saveDocument(newContent, title);
  }, [title, saveDocument]);

  const updateTitle = useCallback((newTitle: string) => {
    setTitle(newTitle);
    saveDocument(content, newTitle);
  }, [content, saveDocument]);

  return {
    content,
    title,
    setContent: updateContent,
    setTitle: updateTitle,
    isSaving,
    lastSaved,
    error
  };
} 