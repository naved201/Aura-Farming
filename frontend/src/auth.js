// Authentication utilities for the frontend dashboard
import { supabase } from './config.js';

/**
 * Check if user is authenticated
 * @returns {Promise<{isAuthenticated: boolean, user: object|null, session: object|null}>}
 */
export async function checkAuth() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Auth check error:', error);
      return { isAuthenticated: false, user: null, session: null };
    }
    
    return {
      isAuthenticated: !!session,
      user: session?.user || null,
      session: session
    };
  } catch (err) {
    console.error('Auth check error:', err);
    return { isAuthenticated: false, user: null, session: null };
  }
}

/**
 * Get current user
 * @returns {Promise<object|null>}
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Get user profile from profiles table
 * @returns {Promise<object|null>}
 */
export async function getUserProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    
    return profile;
  } catch (err) {
    console.error('Error getting profile:', err);
    return null;
  }
}

/**
 * Logout user
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
      throw error;
    }
    // Redirect to login page (root)
    window.location.href = '/';
  } catch (err) {
    console.error('Logout error:', err);
    throw err;
  }
}

/**
 * Protect route - redirect to login if not authenticated
 * Call this at the start of your dashboard
 */
export async function protectRoute() {
  const { isAuthenticated } = await checkAuth();
  
  if (!isAuthenticated) {
    // Redirect to login page (root)
    window.location.href = '/';
    return false;
  }
  
  return true;
}
