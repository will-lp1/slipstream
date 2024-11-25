import { createServerClient } from '@/lib/supabase/server';
import { getChatsByUserId } from '@/lib/db/queries';

export async function GET() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    return Response.json('Unauthorized!', { status: 401 });
  }

  try {
    const chats = await getChatsByUserId({ id: session.user.id });
    return Response.json(chats);
  } catch (error) {
    console.error('Failed to get chats:', error);
    return Response.json('Failed to get chats', { status: 500 });
  }
}
