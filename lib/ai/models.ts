// Define your models here.

export interface Model {
  id: string;
  label: string;
  apiIdentifier: string;
  description: string;
}

export const models: Array<Model> = [
  {
    id: 'claude-haiku',
    label: 'Claude Haiku',
    apiIdentifier: 'claude-haiku-20240307',
    description: 'Fast and efficient model for everyday tasks',
  },
  {
    id: 'claude-haiku-search',
    label: 'Claude Haiku with Web Search',
    apiIdentifier: 'claude-haiku-20240307',
    description: 'Claude Haiku enhanced with web search capabilities',
  },
] as const;

export const DEFAULT_MODEL_NAME: string = 'claude-haiku';
