const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const PPT_DIR = 'C:\\Users\\hi\\OneDrive\\Desktop\\ppts';
const BUCKET_NAME = 'presentations';

// Read .env.local manually
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeTitle(name) {
    return name
        .replace(/\.[^/.]+$/, "") 
        .replace(/\s*-\s*Copy(\s*\(\d+\))?$/i, "") 
        .replace(/\s*\(\d+\)$/i, "") 
        .replace(/\s*-\s*Copy\s*-\s*Copy$/i, "") 
        .trim()
        .toLowerCase();
}

async function migrate() {
    try {
        console.log('--- Phase 1: Robust Cleanup ---');
        
        // 1. Delete all database records (Small batches not needed for delete but let's be safe)
        const { error: dbDelError } = await supabase.from('songs').delete().neq('id', '0');
        if (dbDelError) console.error('DB Clear error:', dbDelError.message);
        else console.log('Database records cleared.');

        // 2. Clear storage bucket (CHUNKED)
        console.log('Cleaning storage bucket in chunks...');
        let hasMore = true;
        while (hasMore) {
            const { data: files, error: listError } = await supabase.storage.from(BUCKET_NAME).list();
            if (listError) break;
            if (!files || files.length === 0) {
                hasMore = false;
                break;
            }
            const filePaths = files.map(f => f.name);
            process.stdout.write(`Deleting batch of ${filePaths.length} files... `);
            const { error: remError } = await supabase.storage.from(BUCKET_NAME).remove(filePaths);
            if (remError) console.log('Partial failure:', remError.message);
            else console.log('DONE');
        }

        console.log('--- Phase 2: Deduplication & Upload ---');

        const allFiles = fs.readdirSync(PPT_DIR)
            .filter(f => /\.(ppt|pptx|pdf)$/i.test(f));

        const uniqueMap = new Map();
        allFiles.forEach(file => {
            const normalized = normalizeTitle(file);
            if (!uniqueMap.has(normalized) || (!file.toLowerCase().includes('copy') && uniqueMap.get(normalized).toLowerCase().includes('copy'))) {
                uniqueMap.set(normalized, file);
            }
        });

        const finalFiles = Array.from(uniqueMap.values());
        console.log(`Original: ${allFiles.length} files. Deduplicated: ${finalFiles.length} files.`);

        for (let i = 0; i < finalFiles.length; i++) {
            const fileName = finalFiles[i];
            const filePath = path.join(PPT_DIR, fileName);
            const fileBuffer = fs.readFileSync(filePath);
            const ext = path.extname(fileName).toLowerCase().replace('.', '');
            const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;

            process.stdout.write(`[${i + 1}/${finalFiles.length}] Uploading ${fileName}... `);

            // Add backoff/retry logic if needed, but let's try simple first
            try {
                const { error: uploadError } = await supabase.storage
                    .from(BUCKET_NAME)
                    .upload(safeName, fileBuffer, { contentType: 'application/octet-stream' });

                if (uploadError) {
                    console.log('FAILED STORAGE:', uploadError.message);
                    continue;
                }

                const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(safeName);

                const { error: insertError } = await supabase.from('songs').insert([{
                    id: (Date.now().toString() + i),
                    title: fileName.replace(/\.[^/.]+$/, ""),
                    file_name: fileName,
                    file_type: ext,
                    file_url: publicUrl,
                    status: 'approved',
                    uploaded_at: new Date().toISOString(),
                    order: i
                }]);

                if (insertError) console.log('FAILED DB:', insertError.message);
                else console.log('DONE');
            } catch (e) {
                console.log('NETWORK ERROR:', e.message);
            }
        }

        console.log('\nMigration Successful!');

    } catch (err) {
        console.error('Migration Failed:', err);
    }
}

migrate();
