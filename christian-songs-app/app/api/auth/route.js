import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request) {
  try {
    const body = await request.json();
    const { identifier, action, name, branch } = body;
    if (!identifier) return NextResponse.json({ error: 'Missing phone/email' }, { status: 400 });

    // Try to find the user in Supabase
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('identifier', identifier)
      .single();

    if (action === 'check') {
      if (user) {
        // RECORD LOGIN
        const now = new Date().toISOString();
        const currentCount = user.login_count || 0;
        await supabase.from('users').update({ 
          last_login: now,
          login_count: currentCount + 1 
        }).eq('id', user.id);
        await supabase.from('login_history').insert([{ user_id: user.id, identifier: user.identifier, login_at: now }]);

        // Exists: Map snake_case to camelCase
        const formattedUser = {
            id: user.id,
            identifier: user.identifier,
            name: user.name,
            branch: user.branch,
            role: user.role || 'user',
            registeredAt: user.registered_at,
            lastLogin: now,
            loginCount: currentCount + 1
        };
        return NextResponse.json({ success: true, isNew: false, user: formattedUser });
      } else {
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        return NextResponse.json({ success: true, isNew: true, simulatedOtp: otp });
      }
    }

    if (action === 'register') {
      if (user) {
        return NextResponse.json({ 
            success: true, 
            user: { 
                id: user.id, 
                identifier: user.identifier, 
                name: user.name,
                branch: user.branch,
                role: user.role || 'user', 
                registeredAt: user.registered_at, 
                lastLogin: user.last_login 
            } 
        });
      }
      
      const now = new Date().toISOString();
      const newUser = {
        id: Date.now().toString(),
        identifier,
        name: name || 'Anonymous',
        branch: branch || 'Default',
        role: 'user', 
        registered_at: now,
        last_login: now
      };

      const { error: insertError } = await supabase.from('users').insert([newUser]);
      if (insertError) throw insertError;

      // RECORD Registration Login
      await supabase.from('login_history').insert([{ user_id: newUser.id, identifier: newUser.identifier, login_at: now }]);

      return NextResponse.json({ 
        success: true, 
        user: { 
            id: newUser.id, 
            identifier: newUser.identifier, 
            name: newUser.name,
            branch: newUser.branch,
            role: 'user', 
            registeredAt: newUser.registered_at, 
            lastLogin: now 
        } 
      });
    }

  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }
}
