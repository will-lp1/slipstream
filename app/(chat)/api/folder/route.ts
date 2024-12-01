import { type Message } from 'ai';
import { Anthropic } from '@anthropic-ai/sdk';
import { MessageParam } from '@anthropic-ai/sdk/resources/messages.mjs';
import { z } from 'zod';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { createServerClient } from '@/lib/supabase/server';
import { unstable_noStore as noStore } from 'next/cache';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const bodySchema = z.object({
  messages: z.array(
    z.object({
      content: z.string(),
      role: z.enum(['system', 'user', 'assistant']),
      id: z.string().optional(),
      name: z.string().optional(),
    }),
  ),
  path: z.string().optional(),
  pattern: z.string().optional(),
});

export const runtime = 'edge';

async function searchFolder(path: string, pattern?: string) {
  try {
    // Implement folder search using your preferred method
    // This is a placeholder - replace with actual folder search implementation
    const files = await readFile(join(process.cwd(), path), 'utf-8');
    return {
      path,
      files: files.split('\n').filter(file => !pattern || file.includes(pattern)),
    };
  } catch (error) {
    console.error('Folder search error:', error);
    return null;
  }
}

export async function POST(request: Request) {
  noStore();
  const supabase = createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const json = await request.json();
    const body = bodySchema.parse(json);
    const { messages, path, pattern } = body;

    // Extract folder path from last message if not provided
    const searchPath = path || messages[messages.length - 1].content;
    
    // Perform folder search
    const searchResults = await searchFolder(searchPath, pattern);

    // Convert messages to Anthropic format and add system message
    const anthropicMessages: MessageParam[] = messages.map(msg => {
      if (msg.role === 'system') {
        return { role: 'assistant', content: msg.content };
      }
      return { role: msg.role, content: msg.content };
    });

    // Add search results as assistant message at the start
    anthropicMessages.unshift({
      role: 'assistant',
      content: `Folder search results for "${searchPath}":\n${JSON.stringify(searchResults, null, 2)}\n\nPlease provide a helpful response based on these search results.`,
    });

    // Create stream with search results
    const response = await anthropic.messages.create({
      messages: anthropicMessages,
      model: 'claude-3-haiku-20240307',
      max_tokens: 4096,
      temperature: 0.7,
      stream: true,
    });

    // Transform the stream into a Web-compatible stream
    const textEncoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            if (chunk.type === 'content_block_delta') {
              const delta = chunk.delta;
              if ('text' in delta) {
                controller.enqueue(textEncoder.encode(delta.text));
              }
            }
          }
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream);
  } catch (error) {
    console.error('Error in folder search request:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing the folder search request' }), 
      { status: 500 }
    );
  }
} 