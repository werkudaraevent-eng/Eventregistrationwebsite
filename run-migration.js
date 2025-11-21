// Quick script to run email_templates migration
// Run with: node run-migration.js

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://xtrognfmzyzqhsfvtgne.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0cm9nbmZtenl6cWhzZnZ0Z25lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjE1NDcsImV4cCI6MjA3NjY5NzU0N30.eHPZYU7pHDzseAF4UDtjHCqJO6_MYMZy8UpqL-YViCU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Read migration SQL
const migrationSQL = fs.readFileSync('./supabase/migrations/003_create_email_templates.sql', 'utf8');

console.log('Running migration...');
console.log('SQL:', migrationSQL);

// Note: This won't work with anon key - needs service_role key
// But let's try anyway
const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

if (error) {
  console.error('❌ Migration failed:', error);
  console.log('\n⚠️  Cannot run DDL with anon key.');
  console.log('📝 Please run the migration manually via Supabase Dashboard:');
  console.log('   1. Go to https://supabase.com/dashboard');
  console.log('   2. Select your project');
  console.log('   3. Go to SQL Editor (left sidebar)');
  console.log('   4. Click "New query"');
  console.log('   5. Paste the SQL from supabase/migrations/003_create_email_templates.sql');
  console.log('   6. Click "Run" button');
} else {
  console.log('✅ Migration successful!', data);
}
