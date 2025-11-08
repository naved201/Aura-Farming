// Supabase Configuration for Frontend
const SUPABASE_URL = 'https://buqsqvmyyjrpzfrrnnti.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1cXNxdm15eWpycHpmcnJubnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NTY4MzcsImV4cCI6MjA3ODEzMjgzN30.H7mjJxkj-T-h6kusXvt80NI6BlazsjGti2rDWJ8V06Y';

// Initialize Supabase client (using global supabase from script tag)
function getSupabaseClient() {
  if (typeof window === 'undefined' || !window.supabase) {
    throw new Error('Supabase script not loaded. Make sure the script tag is in index.html');
  }
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Create client - will be initialized when first accessed
let supabaseClient = null;

export const supabase = {
  get auth() {
    if (!supabaseClient) {
      supabaseClient = getSupabaseClient();
    }
    return supabaseClient.auth;
  },
  get from() {
    if (!supabaseClient) {
      supabaseClient = getSupabaseClient();
    }
    return supabaseClient.from;
  },
  get rpc() {
    if (!supabaseClient) {
      supabaseClient = getSupabaseClient();
    }
    return supabaseClient.rpc;
  }
};
