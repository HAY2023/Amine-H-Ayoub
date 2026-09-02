import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env manually if not already loaded by the runner
if ((!process.env.SUPABASE_BACKUP_URL || !process.env.SUPABASE_BACKUP_KEY) && fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}

const SUPABASE_URL = process.env.SUPABASE_BACKUP_URL;
const SUPABASE_KEY = process.env.SUPABASE_BACKUP_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Error: SUPABASE_BACKUP_URL or SUPABASE_BACKUP_KEY is not defined in the environment or .env file.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) console.error("Error listing buckets:", error);
  else console.log("Buckets:", buckets.map(b => b.name));

  if (buckets?.find(b => b.name === 'quran-audio')) {
    const { data: files, error: fErr } = await supabase.storage.from('quran-audio').list('surahs');
    if (fErr) console.error("Error listing files:", fErr);
    else console.log(`Found ${files.length} files in quran-audio/surahs`);
  }
}

check();
