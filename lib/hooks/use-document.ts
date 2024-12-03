import { useCallback, useEffect, useState, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { debounce } from 'lodash';
import type { Database } from '@/types/supabase';
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
  const [documentId, setDocumentId] = useState<string>(id);
  
  // Save queue management
  const saveQueue = useRef<{
    content?: string;
    title?: string;
    version: number;
  } | null>(null);
  const currentVersion = useRef<number>(0);
  const isNewDocument = !id || id === 'undefined';

  // Debounced save function with version tracking
  const saveChanges = useCallback(
    debounce(async () => {
      if (!saveQueue.current) return;

      const changes = saveQueue.current;
      const version = changes.version;

      // Only proceed if this is still the latest version
      if (version !== currentVersion.current) return;

      setIsSaving(true);
      try {
        const response = await fetch('/api/documents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: documentId,
            title: changes.title || title,
            content: changes.content || content,
          }),
        });

        if (!response.ok) throw new Error('Failed to save document');

        const data = await response.json();

        // Only update state if this was the latest version
        if (version === currentVersion.current) {
          setLastSaved(new Date(data.updated_at));
          saveQueue.current = null;
          setDocumentId(data.id);
          
          // Update URL if this was a new document
          if (isNewDocument) {
            window.history.replaceState({}, '', `/document/${data.id}`);
          }
        }
      } catch (err) {
        console.error('Error saving document:', err);
        setError(err instanceof Error ? err : new Error('Failed to save document'));
      } finally {
        setIsSaving(false);
      }
    }, 500),
    [documentId, isNewDocument, content, title]
  );

  // Update content with version tracking
  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
    
    const newVersion = currentVersion.current + 1;
    currentVersion.current = newVersion;

    saveQueue.current = {
      ...saveQueue.current,
      content: newContent,
      version: newVersion,
    };
    saveChanges();
  }, [saveChanges]);

  // Update title with version tracking
  const updateTitle = useCallback((newTitle: string) => {
    setTitle(newTitle);
    
    const newVersion = currentVersion.current + 1;
    currentVersion.current = newVersion;

    saveQueue.current = {
      ...saveQueue.current,
      title: newTitle,
      version: newVersion,
    };
    saveChanges();
  }, [saveChanges]);

  // Initial document fetch if needed
  useEffect(() => {
    if (!isNewDocument) {
      updateContent(initialContent);
      updateTitle(initialTitle);
    }
  }, [isNewDocument, initialContent, initialTitle, updateContent, updateTitle]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      saveChanges.flush();
      saveChanges.cancel();
      saveQueue.current = null;
      currentVersion.current = 0;
    };
  }, [saveChanges]);

  return {
    content,
    title,
    setContent: updateContent,
    setTitle: updateTitle,
    isSaving,
    lastSaved,
    error,
    id: documentId
  };
} 