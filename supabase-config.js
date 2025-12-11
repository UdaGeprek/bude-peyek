// Supabase Configuration
// Tunggu SDK selesai load sebelum initialize

(function() {
    const SUPABASE_URL = 'https://njwsolyhdtogeqgkqpzn.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qd3NvbHloZHRvZ2VxZ2txcHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTg2OTQsImV4cCI6MjA4MTAzNDY5NH0.AB7RoJfYlHmpsBUjEnVPzF0hP8Ydjh0GUucqpwpBWCA';

    // Cek apakah Supabase SDK sudah load
    function initSupabase() {
        if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            // Initialize Supabase client
            window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase client initialized successfully');
        } else {
            // Retry setelah 100ms jika SDK belum load
            console.log('⏳ Waiting for Supabase SDK...');
            setTimeout(initSupabase, 100);
        }
    }

    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSupabase);
    } else {
        initSupabase();
    }
})();
