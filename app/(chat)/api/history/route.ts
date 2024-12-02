import { generateUUID } from '@/lib/utils';
import { getChatsByUserId } from '@/lib/db/queries';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  noStore();
  
  try {
    const userId = generateUUID();
    const chats = await getChatsByUserId({ id: userId });
    return Response.json(chats);
  } catch (error) {
    console.error('Failed to get chats:', error);
    return Response.json('Failed to get chats', { status: 500 });
  }
}
