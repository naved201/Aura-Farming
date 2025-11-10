// Supabase Configuration for Frontend
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nuxiembmbwigfamnyplw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51eGllbWJtYndpZ2ZhbW55cGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MjQzMTEsImV4cCI6MjA3ODIwMDMxMX0.JATKR6lo6jFKa4L8h16UN6L5c-tfAPL0CnIc-BmAnbM';

// Create and export Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);