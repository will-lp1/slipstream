import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { unstable_noStore as noStore } from 'next/cache'

export async function POST(request: Request) {
  noStore()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Verify authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content, title } = await request.json()

    const { data, error } = await supabase
      .from('documents')
      .upsert({
        id,
        content,
        title,
        user_id: session.user.id,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', session.user.id) // Ensure user can only update their own documents
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to save document' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'An error occurred while saving the document.' },
      { status: 500 }
    )
  }
}