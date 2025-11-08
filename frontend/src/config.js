// Supabase Configuration for Frontend
const SUPABASE_URL = 'https://sxserhbozsmqbyninsbq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4c2VyaGJvenNtcWJ5bmluc2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MjM0MDQsImV4cCI6MjA3ODE5OTQwNH0.WGZfUuLU5Ug0FH6RCwl2RE8F89FqP--qtBhe8ENZ8r0';

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
