'use server';

import { type Message } from 'ai';
import { createServerClient } from '@/lib/supabase/server';
import { generateUUID } from '@/lib/utils';
import { 
  deleteChatById, 
  getChatById, 
  getDocumentById, 
  saveChat, 
  saveDocument, 
  saveMessages, 
  saveSuggestions 
} from '@/lib/db/queries';
import { revalidatePath } from 'next/cache';

export async function deleteChat(id: string) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const chat = await getChatById({ id });

  if (chat.userId !== session.user.id) {
    throw new Error('Unauthorized');
  }

  await deleteChatById({ id });
}

export async function saveChatAndMessages({
  id,
  title,
  messages,
  userId,
}: {
  id: string;
  title: string;
  messages: Message[];
  userId: string;
}) {
  await saveChat({ id, userId, title });
  
  await saveMessages({
    messages: messages.map(message => ({
      id: generateUUID(),
      chat_id: id,
      role: message.role,
      content: typeof message.content === 'string' 
        ? message.content 
        : JSON.stringify(message.content),
      created_at: new Date().toISOString(),
    })),
  });
}

export async function saveModelId(modelId: string) {
  const supabase = createServerClient();
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: session.user.id,
      model_id: modelId,
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/');
  return { success: true };
} 