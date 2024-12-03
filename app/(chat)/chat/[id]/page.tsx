import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { Chat as PreviewChat } from '@/components/chat';
import { DEFAULT_MODEL_NAME, models } from '@/lib/ai/models';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';
import { convertToUIMessages } from '@/lib/utils';
import { createServerClient } from '@/lib/supabase/server';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    notFound();
  }

  if (session.user.id !== chat.userId) {
    notFound();
  }

  const messagesFromDb = await getMessagesByChatId(id);

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('model-id')?.value;
  const selectedModelId =
    models.find((model) => model.id === modelIdFromCookie)?.id ||
    DEFAULT_MODEL_NAME;

  return (
    <PreviewChat
      id={chat.id}
      initialMessages={convertToUIMessages(messagesFromDb)}
      selectedModelId={selectedModelId}
    />
  );
}
