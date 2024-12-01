import { type Message, StreamData, convertToCoreMessages, streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createServerClient } from '@/lib/supabase/server';
import { unstable_noStore as noStore } from 'next/cache';
import { models } from '@/lib/ai/models';
import { systemPrompt } from '@/lib/ai/prompts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ParsedFunctionResponse {
  route: string;
  response: {
    content?: string;
    searchResults?: {
      title: string;
      url: string;
      snippet: string;
    }[];
    vaultContent?: {
      documents?: any[];
      metadata?: any;
      context?: string;
    };
  };
}

export async function POST(request: Request) {
  noStore();
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const {
      id,
      messages,
      modelId,
      functions = [],
    } = await request.json();

    const model = models.find((m) => m.id === modelId);
    if (!model) {
      return new Response('Model not found', { status: 404 });
    }

    const streamingData = new StreamData();
    const functionResponses: ParsedFunctionResponse[] = [];

    // Execute each requested function and collect responses
    for (const functionName of functions) {
      let response;
      try {
        if (functionName === 'web') {
          // Use the existing search route
          response = await fetch(new URL('/api/search', request.url), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id,
              messages,
              modelId,
            }),
          });
        } else {
          response = await fetch(new URL(`/api/${functionName}`, request.url), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id,
              messages,
              modelId,
            }),
          });
        }

        if (!response.ok) {
          console.error(`Error from ${functionName}:`, response.statusText);
          continue;
        }

        const data = await response.json();
        functionResponses.push({
          route: functionName,
          response: data,
        });
      } catch (error) {
        console.error(`Error executing ${functionName}:`, error);
      }
    }

    // If no functions or single function, use existing routing
    if (functions.length <= 1) {
      const routePath = modelId === 'claude-haiku-search' 
        ? '/api/search' 
        : '/api/chat';

      const response = await fetch(new URL(routePath, request.url), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          messages,
          modelId,
        }),
      });

      return response;
    }

    // Enhanced prompt for combining responses
    const coreMessages = convertToCoreMessages(messages);
    const result = await streamText({
      model: anthropic('claude-3-haiku-20240307'),
      system: `${systemPrompt}\n
You have access to multiple data sources including search results and other functions. Your task is to:
1. Analyze information from all available sources
2. Extract key insights and relevant details
3. Compare and contrast information when appropriate
4. Combine the information into a coherent, well-structured response
5. For web search results, cite sources using [1], [2] format and include URLs at the end
6. For other sources, clearly indicate where information comes from

Format web citations with numbers [1] and include a Sources section at the end with numbered URLs.`,
      messages: [
        ...coreMessages,
        {
          role: 'assistant',
          content: `I have responses from multiple sources:\n\n${
            functionResponses.map(fr => {
              if (fr.route === 'web') {
                // Format search results with their URLs
                const searchResults = fr.response.searchResults || [];
                return `=== Search Results ===\n${searchResults.map((result, idx) => 
                  `[${idx + 1}] "${result.snippet}"\nSource: ${result.title} (${result.url})`
                ).join('\n\n')}`;
              }
              return `=== ${fr.route} ===\n${JSON.stringify(fr.response, null, 2)}`;
            }).join('\n\n')
          }\n\nI'll provide a comprehensive analysis combining these sources.`,
        }
      ],
      onFinish: () => {
        streamingData.close();
      },
    });

    return result.toDataStreamResponse({
      data: streamingData,
    });

  } catch (error) {
    console.error('Error in POST /api/:', error);
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}

// Forward DELETE requests to the chat route
export async function DELETE(request: Request) {
  try {
    const response = await fetch(new URL('/api/chat', request.url), {
      method: 'DELETE',
      headers: request.headers,
    });

    return response;
  } catch (error) {
    console.error('Error in DELETE /api/:', error);
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}
  