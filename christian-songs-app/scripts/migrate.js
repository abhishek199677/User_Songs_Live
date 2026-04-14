const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ==========================================
// CONFIGURATION - UPDATED WITH YOUR KEYS
// ==========================================
const SUPABASE_URL = 'https://ooupoixvzwhnmlfnnpkw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vdXBvaXh2endobm1sZm5ucGt3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY0Mzg5MSwiZXhwIjoyMDkxMjE5ODkxfQ.qDNT-UOYbnCV4tE1PmrD0Q0q5Bx_xE8OQkvg9bVCkhE'; 
const BUCKET_NAME = 'presentations';
const SOURCE_FOLDER = 'C:\\Users\\hi\\OneDrive\\Desktop\\ppts'; 
const DB_PATH = path.join(__dirname, '..', 'database.json');
// ==========================================

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrate() {
    console.log('🚀 Starting migration...');

    if (!fs.existsSync(SOURCE_FOLDER)) {
        console.error(`❌ Source folder not found: ${SOURCE_FOLDER}`);
        return;
    }

    // 1. Get all files
    const files = fs.readdirSync(SOURCE_FOLDER).filter(f => 
        f.toLowerCase().endsWith('.ppt') || f.toLowerCase().endsWith('.pptx') || f.toLowerCase().endsWith('.pdf')
    );
    console.log(`\n📂 Found ${files.length} files to upload.`);

    if (files.length === 0) {
        console.log('No files found. Please ensure your PPTs are in ' + SOURCE_FOLDER);
        return;
    }

    // 2. Load current DB
    let db = { songs: [] };
    if (fs.existsSync(DB_PATH)) {
        try {
            db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        } catch(e) { db = { songs: [] }; }
    }

    // 3. Upload loop
    for (let i = 0; i < files.length; i++) {
        const fileName = files[i];
        const filePath = path.join(SOURCE_FOLDER, fileName);
        const fileExt = path.extname(fileName).replace('.', '').toLowerCase();
        
        console.log(`[${i + 1}/${files.length}] Uploading: ${fileName}...`);

        try {
            const fileBuffer = fs.readFileSync(filePath);
            const fileNameClean = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            const uniqueName = `${Date.now()}-${fileNameClean}`;

            const { data, error } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(uniqueName, fileBuffer, {
                    contentType: fileExt === 'pdf' ? 'application/pdf' : 'application/vnd.ms-powerpoint',
                    upsert: true,
                    cacheControl: '3600'
                });

            if (error) throw error;

            // Get Public URL
            const { data: urlData } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(uniqueName);

            const publicUrl = urlData.publicUrl;

            // Add to DB if not exists (by title)
            const songTitle = fileName.replace(/\.[^/.]+$/, "");
            const exists = db.songs.find(s => s.title === songTitle);

            if (!exists) {
                db.songs.push({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    title: songTitle,
                    fileName: fileName,
                    fileType: fileExt,
                    fileUrl: publicUrl,
                    status: 'approved',
                    uploadedAt: new Date().toISOString(),
                    order: db.songs.length
                });
            } else {
                exists.fileUrl = publicUrl; // Update URL if it already exists
            }

            // Save DB every file to be safe during migration
            fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

        } catch (err) {
            console.error(`❌ Failed to upload ${fileName}:`, err.message);
        }
    }

    console.log('\n✅ Migration Complete! Your database.json has been updated.');
    console.log('🚀 You can now run the project with "npm run dev".');
}

migrate();
