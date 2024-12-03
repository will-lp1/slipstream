import { Chat } from '@/components/chat';
import { DEFAULT_MODEL_NAME, models } from '@/lib/ai/models';

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params;

  // Use default model ID since we're not persisting preferences
  const selectedModelId = DEFAULT_MODEL_NAME;

  return (
    <Chat
      id={id}
      initialMessages={[]}
      selectedModelId={selectedModelId}
    />
  );
}
