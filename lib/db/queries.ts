'server-only';

import { createServerClient } from '@/lib/supabase/server';
import type { Chat, Document, Message, Embedding, Suggestion } from '@/lib/db/schema';

export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from('chat')
      .insert({ id, user_id: userId, title, created_at: new Date().toISOString() });

    if (error) throw error;
  } catch (error) {
    console.error('Failed to save chat in database');
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('chat')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to get chats from database');
    throw error;
  }
}

export async function saveMessage({
  content,
  role,
  chatId,
}: {
  content: string;
  role: string;
  chatId: string;
}) {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from('message')
      .insert({ content, role, chat_id: chatId });

    if (error) throw error;
  } catch (error) {
    console.error('Failed to save message in database');
    throw error;
  }
}

export async function getMessagesByChatId(chatId: string) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('message')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to get messages from database');
    throw error;
  }
}

export async function saveEmbedding({
  content,
  embedding,
  documentId,
}: {
  content: string;
  embedding: number[];
  documentId: string;
}) {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from('embeddings')
      .insert({ content, embedding, document_id: documentId });

    if (error) throw error;
  } catch (error) {
    console.error('Failed to save embedding in database');
    throw error;
  }
}

export async function searchEmbeddings({
  embedding,
  threshold = 0.7,
  limit = 5,
}: {
  embedding: number[];
  threshold?: number;
  limit?: number;
}) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .rpc('match_embeddings', {
        query_embedding: embedding,
        match_threshold: threshold,
        match_count: limit,
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to search embeddings');
    throw error;
  }
}

export async function saveDocument({
  id,
  content,
  userId,
  title,
}: {
  id: string;
  content: string;
  userId: string;
  title: string;
}) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('documents')
      .insert({ 
        id, 
        content, 
        user_id: userId,
        title,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to save document in database');
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to get document from database');
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)
      .gt('created_at', timestamp.toISOString());

    if (error) throw error;
  } catch (error) {
    console.error('Failed to delete documents from database');
    throw error;
  }
}

export async function saveDocumentWithEmbeddings({
  id,
  content,
  title,
  userId,
}: {
  id: string;
  content: string;
  title: string;
  userId: string;
}) {
  try {
    const supabase = await createServerClient();
    
    // First save the document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({ 
        id,
        content, 
        title,
        user_id: userId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (docError) throw docError;

    // Generate and save embeddings
    const embeddings = await generateEmbeddings(content);
    
    const { error: embeddingError } = await supabase
      .from('embeddings')
      .insert(
        embeddings.map(({ content, embedding }) => ({
          content,
          embedding,
          document_id: document.id,
        }))
      );

    if (embeddingError) throw embeddingError;

    return document;
  } catch (error) {
    console.error('Failed to save document with embeddings:', error);
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
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

export async function getChatById({ id }: { id: string }) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('chat')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Chat not found
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to get chat from database');
    throw error;
  }
}

export async function saveMessages({ messages }: { messages: Array<Partial<Message>> }) {
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

export async function saveSuggestions({ suggestions }: { suggestions: Array<Suggestion> }) {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from('suggestions')
      .insert(suggestions.map(suggestion => ({
        ...suggestion,
        created_at: suggestion.createdAt.toISOString(),
        document_created_at: suggestion.documentCreatedAt.toISOString()
      })));

    if (error) throw error;
  } catch (error) {
    console.error('Failed to save suggestions in database');
    throw error;
  }
}

async function generateEmbeddings(content: string) {
  // This is a placeholder - you'll need to implement your own embedding generation
  // using a service like OpenAI's embedding API
  return [{
    content: content,
    embedding: [] // Replace with actual embedding vector
  }];
}
