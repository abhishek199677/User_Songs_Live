const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8').split('\n').reduce((acc, line) => {
    const [key, ...val] = line.split('=');
    if (key && val) acc[key.trim()] = val.join('=').trim();
    return acc;
}, {});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fullMigrate() {
    console.log('🚀 Starting Full Database Migration...');

    // 1. Migrate Songs
    const dbPath = path.join(__dirname, '..', 'database.json');
    if (fs.existsSync(dbPath)) {
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        if (db.songs && db.songs.length > 0) {
            console.log(`🎵 Migrating ${db.songs.length} songs...`);
            const formattedSongs = db.songs.map(s => ({
                id: s.id,
                title: s.title,
                file_name: s.fileName,
                file_type: s.fileType,
                file_url: s.fileUrl,
                status: s.status,
                uploaded_at: s.uploadedAt,
                order: s.order
            }));
            
            const { error } = await supabase.from('songs').upsert(formattedSongs);
            if (error) console.error('❌ Songs Error:', error.message);
            else console.log('✅ Songs Migrated.');
        }

        if (db.videos && db.videos.length > 0) {
            console.log(`🎬 Migrating ${db.videos.length} videos...`);
            const formattedVideos = db.videos.map(v => ({
                id: v.id,
                title: v.title,
                video_id: v.videoId,
                added_at: v.addedAt
            }));
            const { error } = await supabase.from('videos').upsert(formattedVideos);
            if (error) console.error('❌ Videos Error:', error.message);
            else console.log('✅ Videos Migrated.');
        }
    }

    // 2. Migrate Users
    const usersPath = path.join(__dirname, '..', 'users.json');
    if (fs.existsSync(usersPath)) {
        const udb = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
        if (udb.users && udb.users.length > 0) {
            console.log(`👥 Migrating ${udb.users.length} users...`);
            const formattedUsers = udb.users.map(u => ({
                id: u.id,
                identifier: u.identifier,
                registered_at: u.registeredAt
            }));
            const { error } = await supabase.from('users').upsert(formattedUsers);
            if (error) console.error('❌ Users Error:', error.message);
            else console.log('✅ Users Migrated.');
        }
    }

    console.log('\n🏁 Full Migration Complete!');
}

fullMigrate();
