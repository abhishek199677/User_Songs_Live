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
      .select('role, name, identifier')
      .ilike('identifier', identifier)
      .single();

    const isHardcodedAdmin = ['puttapoguabhishek1007@gmail.com', 'admin'].includes(identifier?.toLowerCase());
    if (!isHardcodedAdmin && (authError || user?.role !== 'admin')) {
      return NextResponse.json({ text: "❌ Access Denied: Admin only." });
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

    const systemPrompt = `You are the Admin AI Manager.
CONTEXT:
${songContext}
COMMANDS: [RENAME_SONG:id|New Title], [DELETE_SONG:id], [DELETE_VIDEO:id].
USER: ${adminName}. Execute commands exactly.`;

    let botResponse = "";
    let provider = "Ollama (Local)";

    // --- NEW: BASIC NON-AI COMMAND PARSER (Emergency Fallback) ---
    // If user says "rename song 123 to New Title"
    const simpleRenameMatch = message.match(/rename song (.*?) to (.*)/i);
    if (simpleRenameMatch) {
        const targetId = simpleRenameMatch[1].trim();
        const targetTitle = simpleRenameMatch[2].trim();
        botResponse = `[RENAME_SONG:${targetId}|${targetTitle}] I've processed your simplified rename request.`;
        provider = "System Command Parser (Direct)";
    }

    // 3. Try Local Ollama (if no basic command detected)
    if (!botResponse) {
        console.log("Calling Ollama at localhost:11434...");
        try {
            const ollamaRes = await fetch('http://localhost:11434/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: "llama3:latest",
                messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
                stream: false
              }),
              signal: AbortSignal.timeout(60000)
            });
            
            if (ollamaRes.ok) {
                const data = await ollamaRes.json();
                botResponse = data.message?.content || "";
            }
        } catch (err) {
            console.warn("Ollama connection failed:", err.message);
        }
    }

    // 4. Fallback to Gemini
    if (!botResponse && GEMINI_API_KEY) {
        provider = "Gemini (Cloud)";
        try {
            const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
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
        } catch (gErr) {}
    }

    // 5. Ultimate Fallback
    if (!botResponse) {
        provider = "Manual Mode";
        botResponse = `Currently, there are ${songCount} songs. \nStatus: AI providers (Ollama/Gemini) timed out. \nPossible fix: Ensure Ollama is running and not busy with another task.`;
    }

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

    const deleteVideoRegex = /\[DELETE_VIDEO:(.*?)\]/g;
    while ((match = deleteVideoRegex.exec(botResponse)) !== null) {
      const id = match[1].trim();
      const { error } = await supabase.from('videos').delete().eq('id', id);
      if (!error) actionLogs.push(`Deleted video ${id}`);
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
    console.error('API Error:', error);
    return NextResponse.json({ text: `System Error: ${error.message}` });
  }
}






