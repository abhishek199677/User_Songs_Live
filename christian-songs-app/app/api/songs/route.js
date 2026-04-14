import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'approved';
    
    const { data: songs, error } = await supabase
      .from('songs')
      .select('*')
      .eq('status', status)
      .order('order', { ascending: true })
      .order('title', { ascending: true });

    if (error) throw error;
    
    // Map database snake_case to frontend camelCase
    const formattedSongs = songs.map(s => ({
      id: s.id,
      title: s.title,
      fileName: s.file_name,
      fileType: s.file_type,
      fileUrl: s.file_url,
      status: s.status,
      uploadedAt: s.uploaded_at,
      order: s.order,
      lastEditedBy: s.last_edited_by,
      lastEditedAt: s.last_edited_at
    }));

    return NextResponse.json(formattedSongs);
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json({ error: 'Failed to read database' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const title = formData.get('title');

    if (!file || !title) {
      return NextResponse.json({ error: 'Missing file or title' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;

    // 1. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('presentations')
      .upload(filename, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('presentations')
      .getPublicUrl(filename);

    // 3. Save to Supabase DB
    const newSong = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: title,
      file_name: file.name,
      file_type: ext || 'unknown',
      file_url: publicUrl,
      status: 'pending',
      uploaded_at: new Date().toISOString(),
      order: 9999
    };

    const { error: dbError } = await supabase.from('songs').insert([newSong]);
    if (dbError) throw dbError;

    // Return camelCase for frontend compatibility
    return NextResponse.json({
        ...newSong,
        fileName: newSong.file_name,
        fileType: newSong.file_type,
        fileUrl: newSong.file_url,
        uploadedAt: newSong.uploaded_at
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload to cloud storage' }, { status: 500 });
  }
}
