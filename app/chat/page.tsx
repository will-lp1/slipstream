import { Chat } from '@/components/chat';
import { DEFAULT_MODEL_NAME } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';

export default function Page() {
  const id = generateUUID();

  return (
    <Chat
      key={id}
      id={id}
      initialMessages={[]}
      selectedModelId={DEFAULT_MODEL_NAME}
    />
  );
} 