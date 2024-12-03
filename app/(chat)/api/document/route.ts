import { NextRequest, NextResponse } from 'next/server';
import { createApiClient } from '@/lib/supabase/api';
import { unstable_noStore as noStore } from 'next/cache';

export async function POST(request: Request) {
  noStore();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid document ID format' }, { status: 400 });
  }

  try {
    const { supabase } = createApiClient(request);
    const { content, title } = await request.json();

    const { data, error } = await supabase
      .from('documents')
      .upsert({
        id,
        content,
        title,
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