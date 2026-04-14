import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('last_login', { ascending: false });

    if (error) throw error;

    const formatted = users.map(u => ({
        id: u.id,
        identifier: u.identifier,
        name: u.name,
        branch: u.branch,
        role: u.role || 'user',
        registeredAt: u.registered_at,
        lastLogin: u.last_login,
        loginCount: u.login_count || 0
    }));

    return NextResponse.json(formatted);
  } catch(e) {
    return NextResponse.json([]);
  }
}
