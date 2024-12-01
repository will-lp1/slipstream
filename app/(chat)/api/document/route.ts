import { createServerClient } from '@/lib/supabase/server';
import { auth } from '@/lib/auth';
import {
  deleteDocumentsByIdAfterTimestamp,
  getDocumentById,
  saveDocument,
} from '@/lib/db/queries';

export async function GET(request: Request) {
  const supabase = createServerClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session?.user) {
    console.error('Auth error:', error);
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const document = await getDocumentById({ id });

  if (!document) {
    return new Response('Not Found', { status: 404 });
  }

  if (document.user_id !== session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  return Response.json([document], { status: 200 });
}

export async function POST(request: Request) {
  const user = await auth();
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const { content, title }: { content: string; title: string } =
    await request.json();

  if (user?.id) {
    const document = await saveDocument({
      id,
      content,
      title,
      userId: user.id,
    });

    return Response.json(document, { status: 200 });
  }
  return new Response('Unauthorized', { status: 401 });
}

export async function PATCH(request: Request) {
  const user = await auth();
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const { timestamp }: { timestamp: string } = await request.json();

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const documents = await getDocumentById({ id });

  const [document] = documents;

  if (document.userId !== user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  await deleteDocumentsByIdAfterTimestamp({
    id,
    timestamp: new Date(timestamp),
  });

  return new Response('Deleted', { status: 200 });
}
