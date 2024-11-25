import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { experimental_wrapLanguageModel as wrapLanguageModel, type Experimental_LanguageModelV1Middleware } from 'ai';

export const customModel = (apiIdentifier: string) => {
  return wrapLanguageModel({
    model: anthropic(apiIdentifier),
    middleware: {
      transformParams: async ({ params }) => params,
      wrapGenerate: async ({ doGenerate }) => doGenerate(),
      wrapStream: async ({ doStream }) => doStream(),
    } satisfies Experimental_LanguageModelV1Middleware,
  });
};
