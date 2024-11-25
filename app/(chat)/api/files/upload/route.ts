import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { unstable_noStore as noStore } from 'next/cache';

const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: 'File size should be less than 5MB',
    })
    .refine((file) => ['image/jpeg', 'image/png'].includes(file.type), {
      message: 'File type should be JPEG or PNG',
    }),
});

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  noStore();
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file
    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(', ');
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create unique filename
    const uniqueFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = `${user.id}/${uniqueFilename}`;

    try {
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('documents')
        .upload(filePath, buffer, {
          contentType: file.type,
          duplex: 'half',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase
        .storage
        .from('documents')
        .getPublicUrl(filePath);

      return NextResponse.json({
        url: publicUrl,
        pathname: filePath,
        contentType: file.type,
      });
    } catch (error) {
      console.error('Failed to upload file:', error);
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : 'Upload failed' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}
