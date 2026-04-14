import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function PUT(request) {
  try {
    const { orderIds } = await request.json();
    if (!Array.isArray(orderIds)) return NextResponse.json({ error: 'Invalid orderIds array' }, { status: 400 });

    // Update each song's order using their ID
    const updates = orderIds.map((id, index) => ({
      id,
      order: index
    }));

    // Perform upsert (since ID is primary key, it will update)
    const { error } = await supabase
      .from('songs')
      .upsert(updates, { onConflict: 'id' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 });
  }
}
