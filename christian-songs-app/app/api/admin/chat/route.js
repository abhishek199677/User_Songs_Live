import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request) {
  console.log("--- Chat API Request Started ---");
  try {
    const { message, identifier } = await request.json();
    console.log(`User: ${identifier} | Message: ${message}`);

    // 1. Authenticate Admin
    const { data: user, error: authError } = await supabase
      .from('users')
      .select('role, name, identifier')
      .ilike('identifier', identifier) // Case-insensitive match
      .single();

    const isHardcodedAdmin = ['puttapoguabhishek1007@gmail.com', 'admin'].includes(identifier?.toLowerCase());

    if (!isHardcodedAdmin && (authError || user?.role !== 'admin')) {
      console.warn("Auth failed for:", identifier);
      return NextResponse.json({ text: "❌ Access Denied: Admin authorization failed. Are you logged in as an admin?" });
    }

    const adminName = user?.name || "Administrator";
    console.log("Authenticated as:", adminName);

    // 2. Prepare Database Context
    console.log("Fetching database context...");
    const { data: songs } = await supabase.from('songs').select('id, title, status, file_type').order('title');
    const { data: videos } = await supabase.from('videos').select('id, title').order('title');
    
    const songCount = songs?.length || 0;
    const videoCount = videos?.length || 0;

    let songContext = `--- SONGS (Total: ${songCount}) ---\n`;
    if (songs && songs.length > 0) {
      songContext += songs.map(s => `- ID: ${s.id} | Title: ${s.title} | Status: ${s.status}`).join('\n');
    }

    let videoContext = `\n--- VIDEOS (Total: ${videoCount}) ---\n`;
    if (videos && videos.length > 0) {
      videoContext += videos.map(v => `- ID: ${v.id} | Title: ${v.title}`).join('\n');
    }

    const systemPrompt = `You are the Admin AI Assistant. DATA: ${songCount} songs, ${videoCount} videos.
${songContext}
${videoContext}
COMMANDS: [RENAME_SONG:id|Title], [DELETE_SONG:id], [DELETE_VIDEO:id].
USER: ${adminName}. Be direct and execute commands.`;

    let botResponse = "";
    let provider = "Ollama";

    // 3. Try Local Ollama (Free Tier)
    console.log("Checking local Ollama...");
    try {
        const ollamaRes = await fetch('http://localhost:11434/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: "llama3",
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
            stream: false
          }),
          signal: AbortSignal.timeout(10000)
        });
        
        if (ollamaRes.ok) {
            const data = await ollamaRes.json();
            botResponse = data.message?.content || "";
            console.log("Ollama response received.");
        } else {
            console.log("Ollama returned error status:", ollamaRes.status);
        }
    } catch (err) {
        console.log("Ollama connection failed or timed out.");
    }

    // 4. Fallback to Gemini (Free Tier)
    if (!botResponse && GEMINI_API_KEY) {
        provider = "Gemini (Free Tier)";
        console.log("Ollama failed. Trying Gemini Fallback...");
        try {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
            const geminiRes = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: `System: ${systemPrompt}\n\nUser: ${message}` }] }]
                }),
                signal: AbortSignal.timeout(10000)
            });
            if (geminiRes.ok) {
                const data = await geminiRes.json();
                botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                console.log("Gemini response received.");
            } else {
                console.log("Gemini API error:", geminiRes.status);
            }
        } catch (gErr) {
            console.error("Gemini failed too.");
        }
    }

    // 5. Ultimate Fallback (No AI)
    if (!botResponse) {
        provider = "System Manual Mode";
        console.log("All AI failed. Using manual fallback.");
        if (message.toLowerCase().includes('list') || message.toLowerCase().includes('songs')) {
            botResponse = `Currently, there are ${songCount} songs in the database. I am currently operating in Manual Mode because AI services (Ollama/Gemini) are unavailable. \n\n${songs.slice(0,10).map(s=>`- ${s.title} (ID: ${s.id})`).join('\n')}${songCount > 10 ? '\n...and more.' : ''}`;
        } else {
            botResponse = "I am currently unable to process complex AI requests. Please check if Ollama is running or if your Gemini API key is valid. \n\nStatus: Connection to AI providers timed out.";
        }
    }

    let actionLogs = [];
    const renameSongRegex = /\[RENAME_SONG:(.*?)\|(.*?)\]/g;
    let match;
    while ((match = renameSongRegex.exec(botResponse)) !== null) {
      const id = match[1].trim(); const newTitle = match[2].trim();
      const { error } = await supabase.from('songs').update({ title: newTitle, lastEditedBy: adminName, lastEditedAt: new Date().toISOString() }).eq('id', id);
      if (!error) actionLogs.push(`Renamed song ${id}`);
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

    console.log("Sending response to UI.");
    return NextResponse.json({ 
      text: finalText + (actionLogs.length > 0 ? `\n\n*(Actions: ${actionLogs.join(', ')})*` : '') + `\n\n*(Powered by: ${provider})*`,
      actions: actionLogs 
    });

  } catch (error) {
    console.error('CRITICAL API ERROR:', error);
    return NextResponse.json({ text: `System Error: ${error.message}. Please check your internet and refresh.` });
  }
}




