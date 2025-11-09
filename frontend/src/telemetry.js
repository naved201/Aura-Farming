// Telemetry service for fetching and subscribing to real-time sensor data
import { supabase } from './config.js';
import { getCurrentUser } from './auth.js';

// Helper to get full Supabase client (needed for channels)
function getSupabaseClient() {
  if (typeof window === 'undefined' || !window.supabase) {
    throw new Error('Supabase script not loaded. Make sure the script tag is in index.html');
  }
  const SUPABASE_URL = 'https://sxserhbozsmqbyninsbq.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4c2VyaGJvenNtcWJ5bmluc2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MjM0MDQsImV4cCI6MjA3ODE5OTQwNH0.WGZfUuLU5Ug0FH6RCwl2RE8F89FqP--qtBhe8ENZ8r0';
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * Get latest telemetry data for a specific zone
 * @param {string} zoneId - UUID of the zone
 * @param {number} limit - Number of recent records to fetch (default: 1)
 * @returns {Promise<Array>}
 */
export async function getLatestTelemetry(zoneId, limit = 1) {
  try {
    const { data, error } = await supabase
      .from('telemetry')
      .select('*')
      .eq('zone_id', zoneId)
      .order('ts', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching telemetry:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Error getting telemetry:', err);
    return [];
  }
}

/**
 * Get telemetry data for all user's zones
 * @param {number} limit - Number of recent records per zone (default: 1)
 * @returns {Promise<Object>} Object with zone_id as keys and telemetry arrays as values
 */
export async function getAllZonesTelemetry(limit = 1) {
  try {
    const user = await getCurrentUser();
    if (!user) return {};
    
    // First, get all zones for the user
    const { data: zones, error: zonesError } = await supabase
      .from('zones')
      .select('id')
      .eq('owner', user.id);
    
    if (zonesError || !zones || zones.length === 0) {
      console.log('No zones found for user');
      return {};
    }
    
    // Get latest telemetry for each zone
    const telemetryData = {};
    
    for (const zone of zones) {
      const telemetry = await getLatestTelemetry(zone.id, limit);
      if (telemetry.length > 0) {
        telemetryData[zone.id] = telemetry;
      }
    }
    
    return telemetryData;
  } catch (err) {
    console.error('Error getting all zones telemetry:', err);
    return {};
  }
}

/**
 * Subscribe to real-time telemetry updates for a specific zone
 * @param {string} zoneId - UUID of the zone
 * @param {Function} callback - Callback function called with new telemetry data
 * @returns {Function} Unsubscribe function
 */
export function subscribeToTelemetry(zoneId, callback) {
  const client = getSupabaseClient();
  const channel = client
    .channel(`telemetry:${zoneId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'telemetry',
        filter: `zone_id=eq.${zoneId}`
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();
  
  // Return unsubscribe function
  return () => {
    client.removeChannel(channel);
  };
}

/**
 * Subscribe to real-time telemetry updates for all user's zones
 * @param {Function} callback - Callback function called with (zoneId, telemetryData)
 * @returns {Function} Unsubscribe function
 */
export async function subscribeToAllZonesTelemetry(callback) {
  try {
    const user = await getCurrentUser();
    if (!user) return () => {};
    
    // Get all zones for the user
    const { data: zones, error: zonesError } = await supabase
      .from('zones')
      .select('id')
      .eq('owner', user.id);
    
    if (zonesError || !zones || zones.length === 0) {
      console.log('No zones found for user');
      return () => {};
    }
    
    // Create a channel for all zones
    const client = getSupabaseClient();
    const channelName = `telemetry:user:${user.id}`;
    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'telemetry'
        },
        async (payload) => {
          // Verify this zone belongs to the user
          const { data: zone } = await client
            .from('zones')
            .select('id, owner')
            .eq('id', payload.new.zone_id)
            .single();
          
          if (zone && zone.owner === user.id) {
            callback(payload.new.zone_id, payload.new);
          }
        }
      )
      .subscribe();
    
    // Return unsubscribe function
    return () => {
      client.removeChannel(channel);
    };
  } catch (err) {
    console.error('Error subscribing to telemetry:', err);
    return () => {};
  }
}

/**
 * Get telemetry history for a zone (for charts/graphs)
 * @param {string} zoneId - UUID of the zone
 * @param {number} hours - Number of hours of history to fetch (default: 24)
 * @returns {Promise<Array>}
 */
export async function getTelemetryHistory(zoneId, hours = 24) {
  try {
    const since = new Date();
    since.setHours(since.getHours() - hours);
    
    const { data, error } = await supabase
      .from('telemetry')
      .select('*')
      .eq('zone_id', zoneId)
      .gte('ts', since.toISOString())
      .order('ts', { ascending: true });
    
    if (error) {
      console.error('Error fetching telemetry history:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Error getting telemetry history:', err);
    return [];
  }
}

