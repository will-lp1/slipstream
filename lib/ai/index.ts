import { type Message } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export function customModel(modelId: string) {
  return anthropic(modelId);
}

export type { Message }; 