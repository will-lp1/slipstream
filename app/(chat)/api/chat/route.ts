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
    }: { messages: Array<Message>; modelId: string } = await request.json();

    const model = models.find((model) => model.id === modelId);
    if (!model) {
      return new Response('Model not found', { status: 404 });
    }

    const streamingData = new StreamData();

    const result = await streamText({
      model: anthropic('claude-3-haiku-20240307'),
      system: systemPrompt,
      messages: convertToCoreMessages(messages),
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
          execute: async ({ title }: { title: string }) => {
            const documentId = generateUUID();
            
            // Create document through your API route
            const response = await fetch(`/api/document?id=${documentId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title,
                content: '', // Initial empty content
              }),
            });

            if (!response.ok) {
              throw new Error('Failed to create document');
            }

            // Send document info to client
            streamingData.append({
              type: 'id',
              content: documentId,
            });

            streamingData.append({
              type: 'title',
              content: title,
            });

            return { documentId, title };
          },
        },
        updateDocument: {
          name: 'updateDocument',
          description: 'Update a document with the given description',
          parameters: z.object({
            id: z.string(),
            description: z.string(),
          }),
          execute: async ({ id, description }: { id: string; description: string }) => {
            // Get current document
            const getResponse = await fetch(`/api/document?id=${id}`);
            if (!getResponse.ok) {
              throw new Error('Document not found');
            }
            const document = await getResponse.json();

            // Update through your API route
            const updateResponse = await fetch(`/api/document?id=${id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: document.title,
                content: description,
              }),
            });

            if (!updateResponse.ok) {
              throw new Error('Failed to update document');
            }

            return {
              id,
              title: document.title,
              message: 'Document updated successfully',
            };
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
    });

    return result.toDataStreamResponse({
      data: streamingData,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in chat route:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500 }
    );
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
