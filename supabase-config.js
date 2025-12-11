// Supabase Configuration
// Ganti dengan kredensial dari Supabase Dashboard > Settings > API

const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // https://njwsolyhdtogeqgkqpzn.supabase.co
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qd3NvbHloZHRvZ2VxZ2txcHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTg2OTQsImV4cCI6MjA4MTAzNDY5NH0.AB7RoJfYlHmpsBUjEnVPzF0hP8Ydjh0GUucqpwpBWCA

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export untuk digunakan di file lain
window.supabaseClient = supabase;
