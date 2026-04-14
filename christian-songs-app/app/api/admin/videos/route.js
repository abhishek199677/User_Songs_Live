import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database.json');

async function getDB() {
  try {
    const data = await fs.readFile(dbPath, 'utf8');
    const parsed = JSON.parse(data);
    if (!parsed.videos) parsed.videos = [];
    return parsed;
  } catch(e) { return { songs: [], videos: [] }; }
}

async function saveDB(data) {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const db = await getDB();
    db.videos = db.videos.filter(v => v.id !== id);
    await saveDB(db);
    return NextResponse.json({success: true});
  } catch(e) {
    return NextResponse.json({error: 'Failed to delete video'}, {status: 500});
  }
}
