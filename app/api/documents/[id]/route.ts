import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching the document.' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, title } = await request.json();

    const { data, error } = await supabase
      .from('documents')
      .upsert({
        id: params.id,
        content,
        title,
        user_id: session.user.id,
        updated_at: new Date().toISOString()
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to save document' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'An error occurred while saving the document.' },
      { status: 500 }
    );
  }
} 