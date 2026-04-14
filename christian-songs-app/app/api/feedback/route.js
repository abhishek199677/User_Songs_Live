import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    const { data: feedback, error } = await supabase
      .from('feedback')
      .select('*, users!fk_user(name, identifier)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(feedback);
  } catch (error) {
    console.error('Feedback fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { userId, rating, comment } = await request.json();
    if (!userId || !rating) {
      return NextResponse.json({ error: 'Missing userId or rating' }, { status: 400 });
    }

    const { error } = await supabase.from('feedback').insert([{
      user_id: userId,
      rating,
      comment,
      created_at: new Date().toISOString()
    }]);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Feedback submit error:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}
