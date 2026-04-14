import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request) {
  console.log("--- Chat API Request (Ollama Priority) ---");
  try {
    const { message, identifier } = await request.json();
    console.log(`User: ${identifier} | Message: ${message}`);

    // 1. Authenticate Admin
    const { data: user, error: authError } = await supabase
      .from('users')
      .select('role, name, identifier')
      .ilike('identifier', identifier)
      .single();

    const isHardcodedAdmin = ['puttapoguabhishek1007@gmail.com', 'admin'].includes(identifier?.toLowerCase());

    if (!isHardcodedAdmin && (authError || user?.role !== 'admin')) {
      return NextResponse.json({ text: "❌ Access Denied: Admin authorization failed." });
    }

    const adminName = user?.name || "Administrator";

    // 2. Prepare Database Context
    const { data: songs } = await supabase.from('songs').select('id, title, status, file_type').order('title');
    const { data: videos } = await supabase.from('videos').select('id, title').order('title');
    
    const songCount = songs?.length || 0;
    const videoCount = videos?.length || 0;

    let songContext = `--- SONGS (Total: ${songCount}) ---\n`;
    if (songs && songs.length > 0) {
      songContext += songs.map(s => `- ID: ${s.id} | Title: ${s.title}`).join('\n');
    }

    const systemPrompt = `You are the Admin AI Manager. DATA: ${songCount} songs, ${videoCount} videos.
CONTEXT:
${songContext}
COMMANDS: [RENAME_SONG:id|New Title], [DELETE_SONG:id], [DELETE_VIDEO:id].
USER: ${adminName}. Execute commands exactly as requested.`;

    let botResponse = "";
    let provider = "Ollama (Local)";

    // 3. Try Local Ollama (Priority)
    console.log("Calling local Ollama (llama3:latest)...");
    try {
        const ollamaRes = await fetch('http://127.0.0.1:11434/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: "llama3:latest",
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
            stream: false,
            options: {
              num_predict: 1024,
              temperature: 0.1
            }
          }),
          signal: AbortSignal.timeout(60000) // 60s for local models
        });
        
        if (ollamaRes.ok) {
            const data = await ollamaRes.json();
            botResponse = data.message?.content || "";
            console.log("Success: Ollama responded.");
        } else {
            console.warn("Ollama Error Code:", ollamaRes.status);
        }
    } catch (err) {
        console.error("Connection to Ollama failed:", err.message);
    }

    // 4. Fallback to Gemini if Ollama fails
    if (!botResponse && GEMINI_API_KEY) {
        provider = "Gemini (Cloud Fallback)";
        console.log("Ollama failed. Falling back to Gemini...");
        try {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
            const geminiRes = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nUser Question: ${message}` }] }]
                }),
                signal: AbortSignal.timeout(15000)
            });
            if (geminiRes.ok) {
                const data = await geminiRes.json();
                botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            }
        } catch (gErr) {
            console.error("Gemini also failed.");
        }
    }

    // 5. Ultimate Fallback (Manual UI)
    if (!botResponse) {
        provider = "Manual Maintenance Mode";
        if (message.toLowerCase().includes('list')) {
            botResponse = `Currently, there are ${songCount} songs in the database. I am currently operating in Manual Mode because AI services are unavailable. \n\n${songs.slice(0,10).map(s=>`- ${s.title} (ID: ${s.id})`).join('\n')}${songCount > 10 ? '\n...and more.' : ''}`;
        } else {
            botResponse = "I'm having trouble connecting to your local Ollama server. Please ensure 'ollama run llama3' is active or try again in a few seconds.";
        }
    }

    console.log("Final response provider:", provider);

    let actionLogs = [];
    const renameSongRegex = /\[RENAME_SONG:(.*?)\|(.*?)\]/g;
    let match;
    while ((match = renameSongRegex.exec(botResponse)) !== null) {
      const id = match[1].trim(); const newTitle = match[2].trim();
      const { error } = await supabase.from('songs').update({ title: newTitle, lastEditedBy: adminName, lastEditedAt: new Date().toISOString() }).eq('id', id);
      if (!error) actionLogs.push(`Renamed song (ID: ${id}) to "${newTitle}"`);
    }

    const deleteSongRegex = /\[DELETE_SONG:(.*?)\]/g;
    while ((match = deleteSongRegex.exec(botResponse)) !== null) {
      const id = match[1].trim();
      const { error } = await supabase.from('songs').delete().eq('id', id);
      if (!error) actionLogs.push(`Deleted song ${id}`);
    }

    const finalText = botResponse
        .replace(/\[RENAME_SONG:.*?\]/g, '')
        .replace(/\[DELETE_SONG:.*?\]/g, '')
        .replace(/\[DELETE_VIDEO:.*?\]/g, '')
        .trim();

    return NextResponse.json({ 
      text: finalText + (actionLogs.length > 0 ? `\n\n*(System Actions: ${actionLogs.join('; ')})*` : '') + `\n\n*(Powered by: ${provider})*`,
      actions: actionLogs 
    });

  } catch (error) {
    console.error('API Router Error:', error);
    return NextResponse.json({ text: `System Error: ${error.message}. Please refresh the page.` });
  }
}





