import {
  getDocumentById,
  saveDocument,
} from '@/lib/db/queries';
import { createServerClient } from '@/lib/supabase/server';
import { unstable_noStore as noStore } from 'next/cache';

export async function GET(request: Request) {
  noStore();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  try {
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const document = await getDocumentById({ id });

    if (!document) {
      return new Response('Not Found', { status: 404 });
    }

    // Check if document belongs to user
    if (document.user_id !== session.user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return Response.json(document, { status: 200 });
  } catch (error) {
    console.error('Error fetching document:', error);
    return Response.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  noStore();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  try {
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, title }: { content: string; title: string } =
      await request.json();

    const document = await saveDocument({
      id,
      content,
      title,
      userId: session.user.id,
    });

    return Response.json(document, { status: 200 });
  } catch (error) {
    console.error('Error saving document:', error);
    return Response.json(
      { error: 'Failed to save document' },
      { status: 500 }
    );
  }
}
