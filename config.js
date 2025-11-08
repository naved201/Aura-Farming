// Supabase Configuration
// Replace these values with your Supabase project credentials
// You can find these in your Supabase project settings: https://app.supabase.com/project/_/settings/api

const SUPABASE_URL = 'https://buqsqvmyyjrpzfrrnnti.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1cXNxdm15eWpycHpmcnJubnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NTY4MzcsImV4cCI6MjA3ODEzMjgzN30.H7mjJxkj-T-h6kusXvt80NI6BlazsjGti2rDWJ8V06Y';

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

