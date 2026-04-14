import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request) {
  try {
    const { message, identifier } = await request.json();

    // 1. Authenticate Admin
    const { data: user, error: authError } = await supabase
      .from('users')
      .select('role, name')
      .eq('identifier', identifier)
      .single();

    if (authError || user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 403 });
    }

    // 2. Prepare Database Context
    const { data: songs } = await supabase.from('songs').select('id, title, status, file_type').order('title');
    const { data: videos } = await supabase.from('videos').select('id, title').order('title');
    const { data: users } = await supabase.from('users').select('id, name, identifier, role, branch');
    
    const songCount = songs?.length || 0;
    const videoCount = videos?.length || 0;

    let songContext = `--- SONGS (Total: ${songCount}) ---\n`;
    if (songs && songs.length > 0) {
      songContext += songs.map(s => `- ID: ${s.id} | Title: ${s.title} | Status: ${s.status}`).join('\n');
    } else {
      songContext += "No songs found.";
    }

    let videoContext = `\n--- VIDEOS (Total: ${videoCount}) ---\n`;
    if (videos && videos.length > 0) {
      videoContext += videos.map(v => `- ID: ${v.id} | Title: ${v.title}`).join('\n');
    } else videoContext += "No videos.";

    let userContext = "\n--- USERS ---\n";
    if (users && users.length > 0) {
      userContext += users.map(u => `- ID: ${u.id} | Name: ${u.name} | Role: ${u.role}`).join('\n');
    }

    const systemPrompt = `You are a Free Admin AI Assistant for "Heavenly Harmony".
CONTEXT:
${songContext}
${videoContext}
${userContext}

COMMANDS:
- Rename Song: [RENAME_SONG:id|New Title]
- Delete Song: [DELETE_SONG:id]
- Rename Video: [RENAME_VIDEO:id|New Title]
- Delete Video: [DELETE_VIDEO:id]

INSTRUCTIONS:
- You help ${user.name} manage the app.
- When asked for lyrics or songs, list them. You know there are exactly ${songCount} songs.
- Use tags for edits/deletions.
- Keep responses concise and friendly.`;

    let botResponse = "";
    let provider = "Ollama";

    // 3. Try Local Ollama First
    try {
        const ollamaRes = await fetch('http://127.0.0.1:11434/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: "llama3",
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
            stream: false
          }),
          signal: AbortSignal.timeout?.(15000) || null // 15s timeout
        });
        
        if (ollamaRes.ok) {
            const data = await ollamaRes.json();
            botResponse = data.message?.content || "";
        }
    } catch (err) {
        console.log("Ollama failed, trying Gemini fallback...");
    }

    // 4. Fallback to Gemini (Free Tier) if Ollama failed or returned empty
    if (!botResponse && GEMINI_API_KEY) {
        provider = "Gemini (Free Tier)";
        try {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
            const geminiRes = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nUser Question: ${message}` }] }]
                })
            });
            if (geminiRes.ok) {
                const data = await geminiRes.json();
                botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            }
        } catch (gErr) {
            console.error("Gemini fallback failed:", gErr);
        }
    }

    if (!botResponse) {
        botResponse = `⚠️ AI Services Unavailable. 
        - Local Ollama: Not responding (Checked 'llama3' model).
        - Gemini API: Fallback failed or key missing.
        
        System Info: There are currently ${songCount} songs and ${videoCount} videos in the collection.`;
    }

    let actionLogs = [];

    // 5. Parse Actions
    const renameSongRegex = /\[RENAME_SONG:(.*?)\|(.*?)\]/g;
    let match;
    while ((match = renameSongRegex.exec(botResponse)) !== null) {
      const id = match[1].trim(); const newTitle = match[2].trim();
      const { error } = await supabase.from('songs').update({ title: newTitle, lastEditedBy: user.name, lastEditedAt: new Date().toISOString() }).eq('id', id);
      if (!error) actionLogs.push(`Renamed song ${id}`);
    }

    const deleteSongRegex = /\[DELETE_SONG:(.*?)\]/g;
    while ((match = deleteSongRegex.exec(botResponse)) !== null) {
      const id = match[1].trim();
      const { error } = await supabase.from('songs').delete().eq('id', id);
      if (!error) actionLogs.push(`Deleted song ${id}`);
    }

    const deleteVideoRegex = /\[DELETE_VIDEO:(.*?)\]/g;
    while ((match = deleteVideoRegex.exec(botResponse)) !== null) {
      const id = match[1].trim();
      const { error } = await supabase.from('videos').delete().eq('id', id);
      if (!error) actionLogs.push(`Deleted video ${id}`);
    }

    // Clean text
    const finalText = botResponse
        .replace(/\[RENAME_SONG:.*?\]/g, '')
        .replace(/\[DELETE_SONG:.*?\]/g, '')
        .replace(/\[DELETE_VIDEO:.*?\]/g, '')
        .trim();

    return NextResponse.json({ 
      text: finalText + (actionLogs.length > 0 ? `\n\n*(Actions: ${actionLogs.join(', ')})*` : '') + `\n\n*(Powered by: ${provider})*`,
      actions: actionLogs 
    });

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ text: `System Error: ${error.message}. Please refresh the page.` });
  }
}



