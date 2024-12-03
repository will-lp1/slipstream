'use server';

import { type Message } from 'ai';
import { generateUUID } from '@/lib/utils';
import { 
  deleteChatById,
  getChatById, 
  saveChat, 
  saveMessages
} from '@/lib/db/queries';
import { revalidatePath } from 'next/cache';

export async function deleteChat(id: string) {
  try {
    await deleteChatById({ id });
    revalidatePath('/');
  } catch (error) {
    console.error('Error deleting chat:', error);
    throw new Error('Failed to delete chat');
  }
}

export async function saveChatAndMessages({
  id,
  title,
  messages,
}: {
  id: string;
  title: string;
  messages: Message[];
}) {
  try {
    await saveChat({ id, title });
    
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

    revalidatePath('/');
  } catch (error) {
    console.error('Error saving chat and messages:', error);
    throw new Error('Failed to save chat and messages');
  }
} 