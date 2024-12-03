import { NextResponse, NextRequest } from 'next/server'
import {
  type Message,
  StreamData,
  convertToCoreMessages,
  streamText,
  tool
} from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { unstable_noStore as noStore } from 'next/cache'
import { models } from '@/lib/ai/models'
import { systemPrompt } from '@/lib/ai/prompts'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { Database } from '@/types/supabase'
import { generateUUID } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  noStore()

  try {
    const {
      messages,
      modelId,
    }: { messages: Array<Message>; modelId: string } = await request.json()

    // Get the base URL from the request
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('host')
    const baseUrl = `${protocol}://${host}`

    // Setup auth client
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              console.error('Cookie set error:', error)
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              console.error('Cookie remove error:', error)
            }
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const streamingData = new StreamData()

    try {
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
            execute: async ({ latitude, longitude }) => {
              const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
              )
              return await response.json()
            },
          },
          createDocument: tool({
            description: 'Create a document with markdown content',
            parameters: z.object({
              title: z.string().describe('The title of the document'),
            }),
            execute: async ({ title }) => {
              const id = generateUUID()
              let draftText = ''

              // Send initial document info to client
              streamingData.append({
                type: 'id',
                content: id,
              })

              streamingData.append({
                type: 'title',
                content: title,
              })

              streamingData.append({
                type: 'clear',
                content: '',
              })

              // Generate document content
              const { fullStream } = await streamText({
                model: anthropic('claude-3-haiku-20240307'),
                system: 'Write about the given topic. Markdown is supported. Use headings wherever appropriate.',
                prompt: title,
              })

              // Stream content updates to client
              for await (const delta of fullStream) {
                if (delta.type === 'text-delta') {
                  draftText += delta.textDelta
                  streamingData.append({
                    type: 'text-delta',
                    content: delta.textDelta,
                  })
                }
              }

              // Save document using the correct endpoint
              const response = await fetch(`${baseUrl}/api/documents`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Cookie: request.headers.get('cookie') || '',
                },
                body: JSON.stringify({
                  title,
                  content: draftText,
                }),
              })

              if (!response.ok) {
                throw new Error('Failed to save document')
              }

              const document = await response.json()

              // Send finish signal after document is saved
              streamingData.append({ 
                type: 'finish', 
                content: '' 
              })

              return {
                id: document.id,
                title: document.title,
                content: 'Document created successfully',
              }
            },
          }),
        },
        onFinish: () => {
          streamingData.close()
        },
      })

      return result.toDataStreamResponse({
        data: streamingData,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    } catch (err) {
      console.error('Streaming error:', err)
      streamingData.close()
      return NextResponse.json(
        { error: 'An error occurred during streaming' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    )
  }
} 