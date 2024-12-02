import {
  type Message,
  StreamData,
  convertToCoreMessages,
  streamObject,
  streamText,
  type TextPart,
  type ImagePart,
  type FilePart,
  type ToolCallPart,
  type ToolResultPart,
} from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

import { createApiClient } from '@/lib/supabase/api';
import { customModel } from '@/lib/ai';
import { models } from '@/lib/ai/models';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  getChatById,
  getDocumentById,
  saveChat,
  saveDocument,
  saveMessages,
  saveSuggestions,
} from '@/lib/db/queries';
import type { Suggestion } from '@/lib/db/schema';
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from '@/lib/utils';

import { generateTitleFromUserMessage } from '@/app/actions';
import { deleteChat } from '@/app/(chat)/actions';

import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type AllowedTools =
  | 'createDocument'
  | 'updateDocument'
  | 'requestSuggestions'
  | 'getWeather';

const blocksTools: AllowedTools[] = [
  'createDocument',
  'updateDocument',
  'requestSuggestions',
];

const weatherTools: AllowedTools[] = ['getWeather'];

const allTools: AllowedTools[] = [...blocksTools, ...weatherTools];

interface ImagePartWithUrl extends ImagePart {
  imageUrl: { url: string };
}

interface FilePartWithUrl extends FilePart {
  fileUrl: { url: string };
}

interface ExtendedToolCallPart extends ToolCallPart {
  toolCall: any;
}

interface WeatherParams {
  latitude: number;
  longitude: number;
}

interface CreateDocumentParams {
  title: string;
}

interface UpdateDocumentParams {
  id: string;
  description: string;
}

interface RequestSuggestionsParams {
  documentId: string;
}

export async function POST(request: Request) {
  noStore();
  
  try {
    const {
      messages,
      modelId,
    }: { messages: Array<Message>; modelId: string } =
      await request.json();

    const model = models.find((model) => model.id === modelId);

    if (!model) {
      return new Response('Model not found', { status: 404 });
    }

    const coreMessages = convertToCoreMessages(messages);
    const userMessage = getMostRecentUserMessage(coreMessages);

    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    const streamingData = new StreamData();

    const result = await streamText({
      model: anthropic('claude-3-haiku-20240307'),
      system: systemPrompt,
      messages: coreMessages,
      maxSteps: 5,
      tools: {
        getWeather: {
          name: 'getWeather',
          description: 'Get the current weather at a location',
          parameters: z.object({
            latitude: z.number(),
            longitude: z.number(),
          }),
          execute: async ({ latitude, longitude }: WeatherParams) => {
            const response = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
            );

            const weatherData = await response.json();
            return weatherData;
          },
        },
        createDocument: {
          name: 'createDocument',
          description: 'Create a document for a writing activity',
          parameters: z.object({
            title: z.string(),
          }),
          execute: async ({ title }: CreateDocumentParams) => {
            const documentId = generateUUID();
            let draftText = '';

            streamingData.append({
              type: 'id',
              content: documentId,
            });

            streamingData.append({
              type: 'title',
              content: title,
            });

            streamingData.append({
              type: 'clear',
              content: '',
            });

            const { fullStream } = await streamText({
              model: anthropic('claude-3-haiku-20240307'),
              system: 'Write about the given topic. Markdown is supported. Use headings wherever appropriate.',
              prompt: title,
            });

            for await (const delta of fullStream) {
              const { type } = delta;

              if (type === 'text-delta') {
                const { textDelta } = delta;
                draftText += textDelta;
                streamingData.append({
                  type: 'text-delta',
                  content: textDelta,
                });
              }
            }

            streamingData.append({ type: 'finish', content: '' });

            try {
              const userId = generateUUID();
              await saveDocument({
                id: documentId,
                title,
                content: draftText,
                userId,
              });

              return {
                id: documentId,
                title,
                content: draftText,
                message: 'Document created successfully',
              };
            } catch (error) {
              console.error('Failed to save document:', error);
              throw error;
            }
          },
        },
        updateDocument: {
          name: 'updateDocument',
          description: 'Update a document with the given description',
          parameters: z.object({
            id: z.string().describe('The ID of the document to update'),
            description: z.string().describe('The description of changes that need to be made'),
          }),
          execute: async ({ id, description }: UpdateDocumentParams) => {
            const document = await getDocumentById({ id });

            if (!document) {
              throw new Error('Document not found');
            }

            const { content: currentContent } = document;
            let draftText = '';

            streamingData.append({
              type: 'clear',
              content: document.title,
            });

            const { fullStream } = await streamText({
              model: anthropic('claude-3-haiku-20240307'),
              system: 'You are a helpful writing assistant. Based on the description, please update the piece of writing.',
              messages: [
                {
                  role: 'user',
                  content: `Original text:\n${currentContent}\n\nUpdate request: ${description}`,
                },
              ],
            });

            for await (const delta of fullStream) {
              const { type } = delta;

              if (type === 'text-delta') {
                const { textDelta } = delta;
                draftText += textDelta;
                streamingData.append({
                  type: 'text-delta',
                  content: textDelta,
                });
              }
            }

            streamingData.append({ type: 'finish', content: '' });

            try {
              const userId = generateUUID();
              await saveDocument({
                id,
                title: document.title,
                content: draftText,
                userId,
              });

              return {
                id,
                title: document.title,
                content: draftText,
                message: 'Document updated successfully',
              };
            } catch (error) {
              console.error('Failed to update document:', error);
              throw error;
            }
          },
        },
        requestSuggestions: {
          name: 'requestSuggestions',
          description: 'Request suggestions for a document',
          parameters: z.object({
            documentId: z.string().describe('The ID of the document to request edits'),
          }),
          execute: async ({ documentId }: RequestSuggestionsParams) => {
            const document = await getDocumentById({ id: documentId });

            if (!document || !document.content) {
              return {
                error: 'Document not found',
              };
            }

            const suggestions: Array<
              Omit<Suggestion, 'userId' | 'createdAt' | 'documentCreatedAt'>
            > = [];

            const { elementStream } = await streamObject({
              model: customModel(model.apiIdentifier),
              system:
                'You are a help writing assistant. Given a piece of writing, please offer suggestions to improve the piece of writing and describe the change. It is very important for the edits to contain full sentences instead of just words. Max 5 suggestions.',
              prompt: document.content,
              output: 'array',
              schema: z.object({
                originalSentence: z.string().describe('The original sentence'),
                suggestedSentence: z.string().describe('The suggested sentence'),
                description: z
                  .string()
                  .describe('The description of the suggestion'),
              }),
            });

            for await (const element of elementStream) {
              const suggestion = {
                originalText: element.originalSentence,
                suggestedText: element.suggestedSentence,
                description: element.description,
                id: generateUUID(),
                documentId: documentId,
                isResolved: false,
              };

              streamingData.append({
                type: 'suggestion',
                content: suggestion,
              });

              suggestions.push(suggestion);
            }

            try {
              const userId = generateUUID();
              await saveSuggestions({
                suggestions: suggestions.map((suggestion) => ({
                  ...suggestion,
                  userId,
                  createdAt: new Date(),
                  documentCreatedAt: document.createdAt,
                })),
              });
            } catch (error) {
              console.error('Failed to save suggestions:', error);
              throw error;
            }

            return {
              id: documentId,
              title: document.title,
              message: 'Suggestions have been added to the document',
            };
          },
        },
      },
      onFinish: () => {
        streamingData.close();
      },
    });

    return result.toDataStreamResponse({
      data: streamingData,
    });
  } catch (error) {
    console.error('Error in POST /api/chat:', error);
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}

export async function DELETE(request: Request) {
  const supabase = createApiClient(request);
  const { data: { session }, error: authError } = await supabase.auth.getSession();

  if (authError || !session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  try {
    await deleteChat(id);
    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return new Response('Unauthorized', { status: 401 });
    }
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}
