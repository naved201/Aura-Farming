// Supabase Configuration for Frontend
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sxserhbozsmqbyninsbq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4c2VyaGJvenNtcWJ5bmluc2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MjM0MDQsImV4cCI6MjA3ODE5OTQwNH0.WGZfUuLU5Ug0FH6RCwl2RE8F89FqP--qtBhe8ENZ8r0';

// Create and export Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);