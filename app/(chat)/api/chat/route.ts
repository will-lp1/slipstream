import {
  type Message,
  StreamData,
  convertToCoreMessages,
  streamText,
} from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { unstable_noStore as noStore } from 'next/cache';
import { NextResponse } from 'next/server';

import { models } from '@/lib/ai/models';
import { systemPrompt } from '@/lib/ai/prompts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  noStore();
  
  try {
    const {
      messages,
      modelId,
    }: { messages: Array<Message>; modelId: string } = await request.json();

    const model = models.find((model) => model.id === modelId);
    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    const streamingData = new StreamData();

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
              );
              return await response.json();
            },
          }
        },
        onFinish: () => {
          streamingData.close();
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
    } catch (err) {
      console.error('Streaming error:', err);
      return NextResponse.json(
        { error: 'An error occurred during streaming' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in chat route:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}
