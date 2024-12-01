'use client';

import type {
  Attachment,
  ChatRequestOptions,
  CreateMessage,
  Message,
} from 'ai';
import cx from 'classnames';
import { motion } from 'framer-motion';
import type React from 'react';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';

import { sanitizeUIMessages } from '@/lib/utils';

import { ArrowUpIcon, PaperclipIcon, StopIcon } from './icons';
import { PreviewAttachment } from './preview-attachment';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

interface ChatFunction {
  id: string;
  label: string;
  description: string;
}

const availableFunctions: ChatFunction[] = [
  {
    id: 'web',
    label: 'Web Search',
    description: 'Search the web for information',
  },
  {
    id: 'vault',
    label: 'Vault',
    description: 'Access your document vault',
  },
];

const suggestedActions = [
  {
    title: 'What is the weather',
    label: 'in San Francisco?',
    action: 'What is the weather in San Francisco?',
  },
  {
    title: 'Help me draft an essay',
    label: 'about Silicon Valley',
    action: 'Help me draft a short essay about Silicon Valley',
  },
];

export function MultimodalInput({
  chatId,
  input,
  setInput,
  isLoading,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  append,
  handleSubmit,
  className,
}: {
  chatId: string;
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<Message>;
  setMessages: Dispatch<SetStateAction<Array<Message>>>;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
  handleSubmit: (
    event?: {
      preventDefault?: () => void;
    },
    chatRequestOptions?: ChatRequestOptions,
  ) => void;
  className?: string;
}) {
  const [showFunctionMenu, setShowFunctionMenu] = useState(false);
  const [functionMenuPosition, setFunctionMenuPosition] = useState({ top: 0, left: 0 });
  const [selectedFunctionIndex, setSelectedFunctionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useWindowSize();

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    'input',
    '',
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || '';
      setInput(finalValue);
      adjustHeight();
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const calculateMenuPosition = (textarea: HTMLTextAreaElement, lineHeight: number) => {
    const rect = textarea.getBoundingClientRect();
    const { selectionStart } = textarea;
    const textBeforeCursor = textarea.value.substring(0, selectionStart);
    const lines = textBeforeCursor.split('\n');
    const currentLineNumber = lines.length - 1;
    
    const top = rect.top + window.scrollY + (currentLineNumber * lineHeight);
    const left = rect.left + window.scrollX + 20;

    return { top, left };
  };

  const updateFunctionMenu = useCallback(() => {
    if (!textareaRef.current || !containerRef.current) return;
    
    const cursorPosition = textareaRef.current.selectionStart;
    const textBeforeCursor = input.slice(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    
    // Show menu whenever @ is present and cursor is after it
    const shouldShowMenu = lastAtSymbol !== -1 && lastAtSymbol < cursorPosition;
    
    if (!shouldShowMenu) {
      setShowFunctionMenu(false);
      return;
    }

    // Get the text between @ and cursor for filtering
    const searchTerm = textBeforeCursor.slice(lastAtSymbol + 1).toLowerCase();
    
    // Filter functions based on search term
    const filteredFunctions = availableFunctions.filter(fn => 
      fn.id.toLowerCase().includes(searchTerm) ||
      fn.label.toLowerCase().includes(searchTerm)
    );

    // Only hide menu if we have a search term and no matches
    if (filteredFunctions.length === 0 && searchTerm.length > 0) {
      setShowFunctionMenu(false);
      return;
    }

    // Position menu above the textarea
    const textareaRect = textareaRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    setFunctionMenuPosition({
      top: textareaRect.top - containerRect.top - 120,
      left: 0
    });
    
    setShowFunctionMenu(true);
  }, [input]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInput(newValue);
    
    // Always check for @ and update menu
    if (textareaRef.current) {
      const cursorPosition = e.target.selectionStart;
      const textBeforeCursor = newValue.slice(0, cursorPosition);
      const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

      if (lastAtSymbol !== -1) {
        const searchTerm = textBeforeCursor.slice(lastAtSymbol + 1).toLowerCase();
        const filteredFunctions = availableFunctions.filter(fn => 
          fn.id.toLowerCase().includes(searchTerm) ||
          fn.label.toLowerCase().includes(searchTerm)
        );

        if (filteredFunctions.length > 0) {
          const rect = textareaRef.current.getBoundingClientRect();
          setFunctionMenuPosition({
            top: rect.top - 120,
            left: rect.left
          });
          setShowFunctionMenu(true);
          setSelectedFunctionIndex(0); // Reset selection when filtering
        } else {
          setShowFunctionMenu(false);
        }
      } else {
        setShowFunctionMenu(false);
      }
    }
  }, []);

  const insertFunction = useCallback((functionId: string) => {
    if (!textareaRef.current) return;
    
    const cursorPosition = textareaRef.current.selectionStart;
    const textBeforeCursor = input.slice(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtSymbol === -1) return;
    
    // Replace just the @command portion
    const newText = 
      input.slice(0, lastAtSymbol) + 
      '@' + functionId + ' ' + 
      input.slice(cursorPosition);
    
    setInput(newText);
    setShowFunctionMenu(false);
    
    // Focus and move cursor after insertion
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = lastAtSymbol + functionId.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  }, [input]);

  const submitForm = useCallback(() => {
    window.history.replaceState({}, '', `/chat/${chatId}`);

    handleSubmit(undefined, {
      experimental_attachments: attachments,
    });

    setAttachments([]);
    setLocalStorageInput('');

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    attachments,
    handleSubmit,
    setAttachments,
    setLocalStorageInput,
    width,
    chatId,
  ]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (showFunctionMenu) {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedFunctionIndex(i => 
            i < availableFunctions.length - 1 ? i + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedFunctionIndex(i => 
            i > 0 ? i - 1 : availableFunctions.length - 1
          );
          break;
        case 'Tab':
        case 'Enter':
          if (!event.shiftKey) {
            event.preventDefault();
            insertFunction(availableFunctions[selectedFunctionIndex].id);
          }
          break;
        case 'Escape':
          event.preventDefault();
          setShowFunctionMenu(false);
          break;
      }
    } else if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (isLoading) {
        toast.error('Please wait for the model to finish its response!');
      } else {
        submitForm();
      }
    }
  }, [showFunctionMenu, selectedFunctionIndex, availableFunctions, isLoading, insertFunction, submitForm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowFunctionMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();
      return {
        name: data.pathname,
        url: data.url,
        contentType: data.contentType,
      };
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file');
      return undefined;
    }
  };

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) return;

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        
        const successfulUploads = uploadedAttachments.filter((attachment): attachment is NonNullable<typeof attachment> => 
          attachment !== undefined
        );

        if (successfulUploads.length > 0) {
          setAttachments((currentAttachments) => [
            ...currentAttachments,
            ...successfulUploads,
          ]);
        }

        if (successfulUploads.length !== files.length) {
          toast.error(`Failed to upload ${files.length - successfulUploads.length} files`);
        }
      } catch (error) {
        console.error('Error uploading files:', error);
        toast.error('Failed to upload files');
      } finally {
        setUploadQueue([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [setAttachments],
  );

  return (
    <div ref={containerRef} className="relative w-full flex flex-col gap-4">
      {messages.length === 0 &&
        attachments.length === 0 &&
        uploadQueue.length === 0 && (
          <div className="grid sm:grid-cols-2 gap-2 w-full">
            {suggestedActions.map((suggestedAction, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.05 * index }}
                key={`suggested-action-${suggestedAction.title}-${index}`}
                className={index > 1 ? 'hidden sm:block' : 'block'}
              >
                <Button
                  variant="ghost"
                  onClick={async () => {
                    window.history.replaceState({}, '', `/chat/${chatId}`);

                    append({
                      role: 'user',
                      content: suggestedAction.action,
                    });
                  }}
                  className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start"
                >
                  <span className="font-medium">{suggestedAction.title}</span>
                  <span className="text-muted-foreground">
                    {suggestedAction.label}
                  </span>
                </Button>
              </motion.div>
            ))}
          </div>
        )}

      <input
        type="file"
        className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        tabIndex={-1}
      />

      {(attachments.length > 0 || uploadQueue.length > 0) && (
        <div className="flex flex-row gap-2 overflow-x-scroll items-end">
          {attachments.map((attachment) => (
            <PreviewAttachment key={attachment.url} attachment={attachment} />
          ))}

          {uploadQueue.map((filename) => (
            <PreviewAttachment
              key={filename}
              attachment={{
                url: '',
                name: filename,
                contentType: '',
              }}
              isUploading={true}
            />
          ))}
        </div>
      )}

      <div className="relative w-full">
        {showFunctionMenu && (
          <div
            ref={menuRef}
            className="absolute bottom-full mb-2 w-full bg-background border rounded-md shadow-lg overflow-hidden"
            style={{
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 50
            }}
          >
            {availableFunctions.map((fn, index) => (
              <div
                key={fn.id}
                className={cx(
                  'px-4 py-3 hover:bg-accent cursor-pointer flex flex-col transition-colors duration-150',
                  'relative', // Added for hover effect
                  index === selectedFunctionIndex && 'bg-accent'
                )}
                onClick={() => insertFunction(fn.id)}
                onMouseEnter={() => setSelectedFunctionIndex(index)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-base">@{fn.label}</span>
                </div>
                <span className="text-sm text-muted-foreground mt-0.5">{fn.description}</span>
              </div>
            ))}
          </div>
        )}

        <Textarea
          ref={textareaRef}
          placeholder="Send a message... (Type @ to use commands)"
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          className={cx(
            'min-h-[24px] max-h-[calc(75dvh)] overflow-hidden resize-none rounded-xl text-base bg-muted',
            className,
          )}
          rows={3}
          autoFocus
        />

        {isLoading ? (
          <Button
            className="rounded-full p-1.5 h-fit absolute bottom-2 right-2 m-0.5 border dark:border-zinc-600"
            onClick={(event) => {
              event.preventDefault();
              stop();
              setMessages((messages) => sanitizeUIMessages(messages));
            }}
          >
            <StopIcon size={14} />
          </Button>
        ) : (
          <Button
            className="rounded-full p-1.5 h-fit absolute bottom-2 right-2 m-0.5 border dark:border-zinc-600"
            onClick={(event) => {
              event.preventDefault();
              submitForm();
            }}
            disabled={input.length === 0 || uploadQueue.length > 0}
          >
            <ArrowUpIcon size={14} />
          </Button>
        )}

        <Button
          className="rounded-full p-1.5 h-fit absolute bottom-2 right-11 m-0.5 dark:border-zinc-700"
          onClick={(event) => {
            event.preventDefault();
            fileInputRef.current?.click();
          }}
          variant="outline"
          disabled={isLoading}
        >
          <PaperclipIcon size={14} />
        </Button>
      </div>
    </div>
  );
}
