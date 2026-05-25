import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SUPABASE_URL = "https://gimdekpxutvnopovofmc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbWRla3B4dXR2bm9wb3ZvZm1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MjY3MzUsImV4cCI6MjA5MjEwMjczNX0.4WoTbqnsqY8_M3cde1iqk3XCft34_o_5aKhijFq50yI";

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
