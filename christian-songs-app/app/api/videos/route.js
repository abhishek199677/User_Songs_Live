import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    const { data: videos, error } = await supabase
      .from('videos')
      .select('*')
      .order('added_at', { ascending: false });

    if (error) throw error;

    // Map to camelCase Safely
    const formatted = (videos || []).map(v => ({
      id: v.id,
      title: v.title || 'Untitled Video',
      videoId: v.video_id,
      addedAt: v.added_at
    }));

    return NextResponse.json(formatted);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { title, url } = await request.json();
    
    let videoId = '';
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/);
    if (match && match[1]) videoId = match[1];

    if (!videoId) return NextResponse.json({error: "Invalid youtube link"}, {status: 400});

    const newVideo = {
      id: Date.now().toString(),
      title,
      video_id: videoId,
      added_at: new Date().toISOString()
    };
    
    const { error } = await supabase.from('videos').insert([newVideo]);
    if (error) throw error;

    return NextResponse.json({
        success: true, 
        video: {
            id: newVideo.id,
            title: newVideo.title,
            videoId: newVideo.video_id,
            addedAt: newVideo.added_at
        }
    });
  } catch(e) {
    console.error(e);
    return NextResponse.json({error: 'Failed to add video'}, {status: 500});
  }
}

export async function DELETE(request) {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  
      const { error } = await supabase.from('videos').delete().eq('id', id);
      if (error) throw error;
  
      return NextResponse.json({ success: true });
    } catch (e) {
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
