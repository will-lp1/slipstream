import {
    type Message,
    StreamData,
    convertToCoreMessages,
    streamText,
    type CoreMessage,
  } from 'ai';
  import { anthropic } from '@ai-sdk/anthropic';
  import { z } from 'zod';
  import { cookies } from 'next/headers';
  
  import { createServerClient } from '@/lib/supabase/server';
  import { customModel } from '@/lib/ai';
  import { models, DEFAULT_MODEL_NAME } from '@/lib/ai/models';
  import { systemPrompt } from '@/lib/ai/prompts';
  import {
    getChatById,
    saveChat,
    saveMessages,
  } from '@/lib/db/queries';
  import {
    generateUUID,
    getMostRecentUserMessage,
  } from '@/lib/utils';
  
  import { generateTitleFromUserMessage } from '@/app/actions';
  import { deleteChat } from '@/app/(chat)/actions';
  import { unstable_noStore as noStore } from 'next/cache';
  
  export const dynamic = 'force-dynamic';
  export const maxDuration = 60;
  
  type SearchResponse = {
    query: string;
    results: {
      title: string;
      url: string;
      snippet: string;
      content: string;
      metadata?: {
        title?: string;
        description?: string;
        author?: string;
        published_date?: string;
        main_image?: string;
        links?: string[];
      };
      img_src?: string;
    }[];
  };
  
  export async function POST(request: Request) {
    noStore();
    const cookieStore = cookies();
    const supabase = createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
  
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }
  
    try {
      const json = await request.json();
      const messages = convertToCoreMessages(json.messages);
      const userMessage = getMostRecentUserMessage(messages);
      const modelId = json.modelId || DEFAULT_MODEL_NAME;
  
      if (!userMessage) {
        return new Response('No user message found', { status: 400 });
      }
  
      // Create new chat if it doesn't exist
      const chat = await getChatById({ id: json.id });
      
      if (!chat) {
        const title = await generateTitleFromUserMessage({ message: userMessage });
        await saveChat({ 
          id: json.id, 
          userId: session.user.id, 
          title 
        });
      }
  
      // Save the user message
      await saveMessages({
        messages: [
          {
            chat_id: json.id,
            role: userMessage.role,
            content: typeof userMessage.content === 'string' 
              ? userMessage.content 
              : JSON.stringify(userMessage.content),
            created_at: new Date().toISOString(),
          },
        ],
      });
  
      const streamingData = new StreamData();
  
      try {
        // Query the search API and generate response
        const searchResponse = await fetch('http://localhost:8000/api/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: typeof userMessage.content === 'string' 
              ? userMessage.content 
              : JSON.stringify(userMessage.content),
          }),
        });
  
        if (!searchResponse.ok) {
          // Instead of throwing, handle the error gracefully
          const errorData = await searchResponse.text();
          console.error('Search API error:', errorData);
          
          // Fall back to regular chat without search results
          const result = await streamText({
            model: anthropic('claude-3-haiku-20240307'),
            messages: [
              {
                role: 'user',
                content: userMessage.content,
              }
            ],
            onFinish: async ({ responseMessages }) => {
              if (session.user?.id) {
                await saveMessages({
                  messages: responseMessages.map(message => ({
                    chat_id: json.id,
                    role: message.role,
                    content: typeof message.content === 'string' 
                      ? message.content 
                      : JSON.stringify(message.content),
                    created_at: new Date().toISOString(),
                  })),
                });
              }
              streamingData.close();
            }
          });
  
          return result.toDataStreamResponse({
            data: streamingData,
          });
        }
  
        const results = await searchResponse.json() as SearchResponse;
        const processedResults = results.results.map(result => ({
          title: result.title,
          url: result.url,
          snippet: result.snippet,
        }));
  
        // Format sources and generate AI response
        const formattedSources = processedResults
          .map((result, index) => 
            `[${index + 1}] "${result.snippet}" (Source: ${result.title})`
          )
          .join('\n\n');
  
        const result = await streamText({
          model: anthropic('claude-3-haiku-20240307'),
          messages: [
            {
              role: 'user',
              content: `Based on these search results, please provide a comprehensive answer:

Search Query: "${typeof userMessage.content === 'string' 
                ? userMessage.content 
                : JSON.stringify(userMessage.content)}"

Sources:
${formattedSources}

Please provide a clear and accurate response using the above sources. Include relevant source citations using [1], [2], etc.

End your response with a "Sources:" section that lists all references with their URLs in markdown format.`,
            }
          ],
          onFinish: async ({ responseMessages }) => {
            if (session.user?.id) {
              // Add sources to the final message
              const finalMessage = responseMessages[responseMessages.length - 1];
              const messageWithSources = {
                ...finalMessage,
                content: `${finalMessage.content}\n\n---\n\nSources:\n${processedResults
                  .map(
                    (result, index) =>
                      `${index + 1}. [${result.title}](${result.url})`
                  )
                  .join('\n')}`
              };

              await saveMessages({
                messages: [messageWithSources].map(message => ({
                  chat_id: json.id,
                  role: message.role,
                  content: typeof message.content === 'string' 
                    ? message.content 
                    : JSON.stringify(message.content),
                  created_at: new Date().toISOString(),
                })),
              });
            }
            streamingData.close();
          }
        });
  
        return result.toDataStreamResponse({
          data: streamingData,
        });
  
      } catch (searchError) {
        console.error('Search API error:', searchError);
        
        // Fall back to regular chat without search results
        const result = await streamText({
          model: anthropic('claude-3-haiku-20240307'),
          messages: [
            {
              role: 'user',
              content: userMessage.content,
            }
          ],
          onFinish: async ({ responseMessages }) => {
            if (session.user?.id) {
              await saveMessages({
                messages: responseMessages.map(message => ({
                  chat_id: json.id,
                  role: message.role,
                  content: typeof message.content === 'string' 
                    ? message.content 
                    : JSON.stringify(message.content),
                  created_at: new Date().toISOString(),
                })),
              });
            }
            streamingData.close();
          }
        });
  
        return result.toDataStreamResponse({
          data: streamingData,
        });
      }
  
    } catch (error) {
      console.error('Error in POST /api/search:', error);
      return new Response('An error occurred while processing your request', {
        status: 500,
      });
    }
  }
  
  export async function DELETE(request: Request) {
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
  