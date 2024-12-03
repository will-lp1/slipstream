'server-only';

import { createServerClient } from '@/lib/supabase/server';
import type { Chat, Message } from '@/lib/db/schema';

export async function saveChat({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from('chat')
      .insert({ 
        id, 
        title, 
        created_at: new Date().toISOString() 
      });

    if (error) throw error;
  } catch (error) {
    console.error('Failed to save chat in database');
    throw error;
  }
}

export async function saveMessages({ 
  messages 
}: { 
  messages: Array<Partial<Message>> 
}) {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from('message')
      .insert(messages.map(msg => ({
        ...msg,
        created_at: msg.created_at || new Date().toISOString()
      })));

    if (error) throw error;
  } catch (error) {
    console.error('Failed to save messages in database');
    throw error;
  }
}

export async function deleteChatById({ 
  id 
}: { 
  id: string 
}) {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from('chat')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to delete chat from database');
    throw error;
  }
}

export async function getChatById({ 
  id 
}: { 
  id: string 
}) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('chat')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to get chat from database');
    throw error;
  }
}
