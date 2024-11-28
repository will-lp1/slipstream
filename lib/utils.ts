import type {
  CoreAssistantMessage,
  CoreMessage,
  CoreToolMessage,
  Message,
  ToolContent,
  ToolInvocation,
  TextPart,
  ToolCallPart,
  ToolResultPart,
} from 'ai';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import type { Message as DBMessage, Document } from '@/lib/db/schema';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ApplicationError extends Error {
  info: string;
  status: number;
}

export const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error(
      'An error occurred while fetching the data.',
    ) as ApplicationError;

    error.info = await res.json();
    error.status = res.status;

    throw error;
  }

  return res.json();
};

export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  return [];
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function addToolMessageToChat({
  toolMessage,
  messages,
}: {
  toolMessage: CoreToolMessage;
  messages: Array<Message>;
}): Array<Message> {
  return messages.map((message) => {
    if (message.toolInvocations) {
      return {
        ...message,
        toolInvocations: message.toolInvocations.map((toolInvocation) => {
          const toolResult = toolMessage.content.find(
            (tool) => tool.toolCallId === toolInvocation.toolCallId,
          );

          if (toolResult) {
            return {
              ...toolInvocation,
              state: 'result',
              result: toolResult.result,
            };
          }

          return toolInvocation;
        }),
      };
    }

    return message;
  });
}

// Add type guard for ToolContent
function isToolContent(content: any): content is ToolContent {
  return Array.isArray(content) && content.every(item => 
    'type' in item && 
    (item.type === 'tool-result' || item.type === 'tool-call')
  );
}

// Add type guard for CoreToolMessage
function isCoreToolMessage(message: DBMessage): message is CoreToolMessage & DBMessage {
  return message.role === 'tool' && 
         typeof message.content !== 'string' && 
         isToolContent(message.content);
}

// Add type definitions for message content
interface TextContent {
  type: 'text';
  text: string;
}

interface ToolCallContent {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
}

interface ToolResultContent {
  type: 'tool-result';
  toolCallId: string;
  result: unknown;
}

type MessageContent = TextContent | ToolCallContent | ToolResultContent;

export function convertToUIMessages(
  messages: Array<DBMessage>,
): Array<Message> {
  return messages.reduce((chatMessages: Array<Message>, message) => {
    if (message.role === 'tool') {
      // Only convert to CoreToolMessage if it matches the expected structure
      if (isCoreToolMessage(message)) {
        return addToolMessageToChat({
          toolMessage: message,
          messages: chatMessages,
        });
      }
      // If it doesn't match, skip this message
      return chatMessages;
    }

    let textContent = '';
    const toolInvocations: Array<ToolInvocation> = [];

    if (typeof message.content === 'string') {
      textContent = message.content;
    } else if (message.content && typeof message.content === 'object') {
      const contentArray = Array.isArray(message.content) 
        ? message.content as MessageContent[]
        : [message.content as MessageContent];
        
      for (const content of contentArray) {
        if (content.type === 'text') {
          textContent += content.text;
        } else if (content.type === 'tool-call') {
          toolInvocations.push({
            state: 'call',
            toolCallId: content.toolCallId,
            toolName: content.toolName,
            args: content.args,
          });
        }
      }
    }

    chatMessages.push({
      id: message.id,
      role: message.role as Message['role'],
      content: textContent,
      toolInvocations,
    });

    return chatMessages;
  }, []);
}

// Update sanitizeResponseMessages for better type safety
export function sanitizeResponseMessages(
  messages: Array<CoreToolMessage | CoreAssistantMessage>,
): Array<CoreToolMessage | CoreAssistantMessage> {
  const toolResultIds: Set<string> = new Set();

  for (const message of messages) {
    if (message.role === 'tool' && Array.isArray(message.content)) {
      for (const content of message.content) {
        if ('type' in content && content.type === 'tool-result' && 'toolCallId' in content) {
          toolResultIds.add(content.toolCallId);
        }
      }
    }
  }

  const messagesBySanitizedContent = messages.map((message) => {
    if (message.role !== 'assistant') return message;
    if (typeof message.content === 'string') return message;
    if (!Array.isArray(message.content)) return message;

    const sanitizedContent = message.content.filter((content): content is TextPart | ToolCallPart =>
      'type' in content && (
        content.type === 'tool-call'
          ? 'toolCallId' in content && toolResultIds.has(content.toolCallId)
          : content.type === 'text'
            ? 'text' in content && content.text.length > 0
            : false
      )
    );

    return {
      ...message,
      content: sanitizedContent,
    };
  });

  return messagesBySanitizedContent.filter(
    (message) => 
      typeof message.content === 'string' || 
      (Array.isArray(message.content) && message.content.length > 0)
  );
}

export function sanitizeUIMessages(messages: Array<Message>): Array<Message> {
  const messagesBySanitizedToolInvocations = messages.map((message) => {
    if (message.role !== 'assistant') return message;

    if (!message.toolInvocations) return message;

    const toolResultIds: Array<string> = [];

    for (const toolInvocation of message.toolInvocations) {
      if (toolInvocation.state === 'result') {
        toolResultIds.push(toolInvocation.toolCallId);
      }
    }

    const sanitizedToolInvocations = message.toolInvocations.filter(
      (toolInvocation) =>
        toolInvocation.state === 'result' ||
        toolResultIds.includes(toolInvocation.toolCallId),
    );

    return {
      ...message,
      toolInvocations: sanitizedToolInvocations,
    };
  });

  return messagesBySanitizedToolInvocations.filter(
    (message) =>
      message.content.length > 0 ||
      (message.toolInvocations && message.toolInvocations.length > 0),
  );
}

export function getMostRecentUserMessage(messages: Array<CoreMessage>) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: Array<Document>,
  index: number,
) {
  if (!documents) return new Date();
  if (index > documents.length) return new Date();

  return new Date(documents[index].created_at);
}

// Add type definition for MessageAnnotation
interface MessageAnnotation {
  messageIdFromServer?: string;
  [key: string]: unknown;
}

// Update getMessageIdFromAnnotations with proper typing
export function getMessageIdFromAnnotations(message: Message & { annotations?: MessageAnnotation[] }) {
  if (!message.annotations?.length) return message.id;
  return message.annotations[0]?.messageIdFromServer ?? message.id;
}
