import { useCallback, useEffect, useState, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { debounce } from 'lodash';
import type { Database } from '../supabase/types';
import type { UseDocumentProps, UseDocumentReturn } from '../types/document';

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
  const saveQueue = useRef<Map<string, { content: string, title: string, version: number }>>(new Map());
  const currentVersion = useRef<Map<string, number>>(new Map());

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

  // Create debounced save function with queue processing
  const debouncedSave = useCallback(
    debounce(async (documentId: string) => {
      try {
        const queuedItem = saveQueue.current.get(documentId);
        if (!queuedItem) return;

        const { content, title, version } = queuedItem;

        // Only proceed if this is still the latest version
        if (version !== currentVersion.current.get(documentId)) {
          return;
        }

        setIsSaving(true);
        const response = await fetch(`/api/document?id=${documentId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, title }),
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/auth');
            return;
          }
          throw new Error('Failed to save document');
        }

        // Only update state if this was the latest version
        if (version === currentVersion.current.get(documentId)) {
          setLastSaved(new Date());
          saveQueue.current.delete(documentId);
        }
      } catch (err) {
        console.error('Error saving document:', err);
        setError(err instanceof Error ? err : new Error('Failed to save document'));
      } finally {
        setIsSaving(false);
      }
    }, 1000),
    [router]
  );

  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
    debouncedSave(id);
  }, [id, debouncedSave]);

  const updateTitle = useCallback((newTitle: string) => {
    setTitle(newTitle);
    debouncedSave(id);
  }, [id, debouncedSave]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
      saveQueue.current.clear();
      currentVersion.current.clear();
    };
  }, [debouncedSave]);

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