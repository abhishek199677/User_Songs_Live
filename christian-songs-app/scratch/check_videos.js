const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function checkVideos() {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const url = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
    const key = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
    const supabase = createClient(url, key);
    
    console.log("🔍 Checking 'videos' table...");
    const { data, error } = await supabase.from('videos').select('*');
    
    if (error) {
        console.error("❌ Error fetching videos:", error.message);
        if (error.message.includes("does not exist")) {
            console.log("💡 TIP: Table 'videos' is missing!");
        }
    } else {
        console.log(`✅ Success! Found ${data.length} videos.`);
        console.log(JSON.stringify(data, null, 2));
    }
}

checkVideos();
