import { supabase } from './config.js';
import { getCurrentUser } from './auth.js';

/**
 * Fetch all thresholds from the thresholds table
 * Returns a map of crop_name -> { min_moisture, max_moisture }
 */
export async function fetchThresholds() {
  try {
    const { data: thresholds, error } = await supabase
      .from('thresholds')
      .select('crop_name, min_moisture, max_moisture')
      .order('crop_name', { ascending: true });

    if (error) {
      console.error('Error fetching thresholds:', error);
      return new Map();
    }

    // Create a map for quick lookup (case-insensitive)
    const thresholdsMap = new Map();
    if (thresholds && thresholds.length > 0) {
      thresholds.forEach(threshold => {
        const cropName = threshold.crop_name?.toLowerCase().trim();
        if (cropName) {
          thresholdsMap.set(cropName, {
            min_moisture: threshold.min_moisture,
            max_moisture: threshold.max_moisture,
            crop_name: threshold.crop_name
          });
        }
      });
    }

    return thresholdsMap;
  } catch (error) {
    console.error('Error in fetchThresholds:', error);
    return new Map();
  }
}

/**
 * Analyze moisture status for a single zone
 * Returns status object with threshold comparison and recommendations
 */
export async function analyzeZoneMoistureStatus(zoneId, zoneName, cropType) {
  try {
    // Fetch thresholds
    const thresholds = await fetchThresholds();
    
    // Get threshold for this crop (case-insensitive match)
    const cropNameLower = cropType?.toLowerCase().trim();
    const threshold = thresholds.get(cropNameLower);
    
    if (!threshold) {
      return {
        zoneId,
        zoneName,
        cropType,
        status: 'unknown',
        message: `No threshold data found for crop: ${cropType || 'Unknown'}`,
        currentMoisture: null,
        minMoisture: null,
        maxMoisture: null,
        needsWatering: false,
        urgency: null
      };
    }

    // Fetch latest moisture reading for this zone
    const { data: telemetry, error } = await supabase
      .from('telemetry')
      .select('moisture, ts')
      .eq('zone_id', zoneId)
      .order('ts', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching telemetry for zone ${zoneName}:`, error);
      return {
        zoneId,
        zoneName,
        cropType,
        status: 'error',
        message: 'Error fetching moisture data',
        currentMoisture: null,
        minMoisture: threshold.min_moisture,
        maxMoisture: threshold.max_moisture,
        needsWatering: false,
        urgency: null
      };
    }

    if (!telemetry || telemetry.moisture === null || telemetry.moisture === undefined) {
      return {
        zoneId,
        zoneName,
        cropType,
        status: 'no_data',
        message: 'No moisture data available',
        currentMoisture: null,
        minMoisture: threshold.min_moisture,
        maxMoisture: threshold.max_moisture,
        needsWatering: false,
        urgency: null
      };
    }

    const currentMoisture = telemetry.moisture;
    const minMoisture = threshold.min_moisture;
    const maxMoisture = threshold.max_moisture;

    // Determine status
    let status, message, needsWatering, urgency;
    
    if (currentMoisture < minMoisture) {
      status = 'critical';
      const deviation = minMoisture - currentMoisture;
      message = `Moisture level (${currentMoisture.toFixed(1)}%) is below minimum threshold (${minMoisture}%). Water immediately!`;
      needsWatering = true;
      urgency = 'high';
    } else if (currentMoisture >= minMoisture && currentMoisture <= maxMoisture) {
      // Check if it's close to minimum (within 5% of range)
      const range = maxMoisture - minMoisture;
      const distanceFromMin = currentMoisture - minMoisture;
      const percentOfRange = (distanceFromMin / range) * 100;
      
      if (percentOfRange < 10) {
        status = 'low';
        message = `Moisture level (${currentMoisture.toFixed(1)}%) is approaching minimum threshold (${minMoisture}%). Consider watering soon.`;
        needsWatering = true;
        urgency = 'medium';
      } else {
        status = 'normal';
        message = `Moisture level (${currentMoisture.toFixed(1)}%) is within normal range (${minMoisture}-${maxMoisture}%)`;
        needsWatering = false;
        urgency = 'low';
      }
    } else {
      status = 'saturated';
      message = `Moisture level (${currentMoisture.toFixed(1)}%) is above maximum threshold (${maxMoisture}%). May need drainage.`;
      needsWatering = false;
      urgency = 'low';
    }

    return {
      zoneId,
      zoneName,
      cropType,
      status,
      message,
      currentMoisture,
      minMoisture,
      maxMoisture,
      needsWatering,
      urgency,
      lastReadingTime: telemetry.ts,
      deviation: currentMoisture - minMoisture,
      percentOfRange: status === 'normal' || status === 'low' ? ((currentMoisture - minMoisture) / (maxMoisture - minMoisture)) * 100 : null
    };
  } catch (error) {
    console.error('Error in analyzeZoneMoistureStatus:', error);
    return {
      zoneId,
      zoneName,
      cropType,
      status: 'error',
      message: 'Error analyzing moisture status',
      currentMoisture: null,
      minMoisture: null,
      maxMoisture: null,
      needsWatering: false,
      urgency: null
    };
  }
}

/**
 * Analyze moisture trend for a zone over the last N hours
 * Returns trend data including rate of change and predictions
 */
export async function analyzeMoistureTrend(zoneId, hours = 24) {
  try {
    const now = new Date();
    const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
    
    // Fetch historical moisture readings
    const { data: telemetryData, error } = await supabase
      .from('telemetry')
      .select('ts, moisture')
      .eq('zone_id', zoneId)
      .gte('ts', startTime.toISOString())
      .order('ts', { ascending: true });

    if (error) {
      console.error('Error fetching trend data:', error);
      return null;
    }

    if (!telemetryData || telemetryData.length < 2) {
      return {
        trend: 'insufficient_data',
        rateOfChange: 0,
        predictedHoursUntilThreshold: null,
        readings: []
      };
    }

    // Calculate rate of change (moisture per hour)
    const firstReading = telemetryData[0];
    const lastReading = telemetryData[telemetryData.length - 1];
    
    const timeDiff = (new Date(lastReading.ts) - new Date(firstReading.ts)) / (1000 * 60 * 60); // hours
    const moistureDiff = lastReading.moisture - firstReading.moisture;
    const rateOfChange = timeDiff > 0 ? moistureDiff / timeDiff : 0; // moisture per hour

    // Determine trend direction
    let trend;
    if (rateOfChange < -0.5) {
      trend = 'declining_fast';
    } else if (rateOfChange < -0.1) {
      trend = 'declining';
    } else if (rateOfChange > 0.1) {
      trend = 'rising';
    } else {
      trend = 'stable';
    }

    // Calculate moving average (last 6 readings)
    const recentReadings = telemetryData.slice(-6);
    const avgMoisture = recentReadings.reduce((sum, r) => sum + r.moisture, 0) / recentReadings.length;

    return {
      trend,
      rateOfChange,
      averageMoisture: avgMoisture,
      currentMoisture: lastReading.moisture,
      firstMoisture: firstReading.moisture,
      timeSpan: timeDiff,
      readings: telemetryData.map(r => ({
        timestamp: r.ts,
        moisture: r.moisture
      }))
    };
  } catch (error) {
    console.error('Error in analyzeMoistureTrend:', error);
    return null;
  }
}

/**
 * Analyze all zones for the current user and generate watering suggestions
 */
export async function analyzeAllZones() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('User not authenticated');
      return [];
    }

    // Fetch all zones for the user
    const { data: zones, error: zonesError } = await supabase
      .from('zones')
      .select('id, name, crop_type')
      .eq('owner', user.id);

    if (zonesError) {
      console.error('Error fetching zones:', zonesError);
      return [];
    }

    if (!zones || zones.length === 0) {
      return [];
    }

    // Analyze each zone
    const analyses = await Promise.all(
      zones.map(zone => 
        analyzeZoneMoistureStatus(zone.id, zone.name, zone.crop_type)
      )
    );

    // Sort by urgency (critical first, then by needsWatering)
    analyses.sort((a, b) => {
      const urgencyOrder = { 'high': 0, 'medium': 1, 'low': 2, null: 3 };
      if (a.urgency !== b.urgency) {
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      }
      if (a.needsWatering !== b.needsWatering) {
        return b.needsWatering - a.needsWatering;
      }
      return 0;
    });

    return analyses;
  } catch (error) {
    console.error('Error in analyzeAllZones:', error);
    return [];
  }
}

/**
 * Generate watering suggestions based on zone analysis
 * Returns zones that need watering, prioritized by urgency
 */
export async function generateWateringSuggestions() {
  try {
    const analyses = await analyzeAllZones();
    
    // Filter zones that need watering
    const suggestions = analyses
      .filter(analysis => analysis.needsWatering)
      .map(analysis => ({
        zoneId: analysis.zoneId,
        zoneName: analysis.zoneName,
        cropType: analysis.cropType,
        currentMoisture: analysis.currentMoisture,
        minMoisture: analysis.minMoisture,
        maxMoisture: analysis.maxMoisture,
        status: analysis.status,
        urgency: analysis.urgency,
        message: analysis.message,
        suggestedAction: analysis.status === 'critical' 
          ? 'Water this zone immediately'
          : 'Consider watering this zone soon',
        lastReadingTime: analysis.lastReadingTime
      }));

    return suggestions;
  } catch (error) {
    console.error('Error in generateWateringSuggestions:', error);
    return [];
  }
}

/**
 * Predict when moisture will reach threshold based on trend
 */
export async function predictThresholdCrossing(zoneId, targetMoisture) {
  try {
    const trend = await analyzeMoistureTrend(zoneId, 24);
    
    if (!trend || trend.trend === 'insufficient_data' || trend.rateOfChange >= 0) {
      return null; // Not declining or insufficient data
    }

    if (trend.currentMoisture <= targetMoisture) {
      return {
        willCross: true,
        hoursUntilCrossing: 0,
        message: 'Moisture is already below threshold'
      };
    }

    // Calculate hours until reaching target moisture
    const moistureToDrop = trend.currentMoisture - targetMoisture;
    const hoursUntilCrossing = Math.abs(moistureToDrop / trend.rateOfChange);

    return {
      willCross: true,
      hoursUntilCrossing,
      predictedCrossingTime: new Date(Date.now() + hoursUntilCrossing * 60 * 60 * 1000),
      message: `Moisture is predicted to reach threshold in ${hoursUntilCrossing.toFixed(1)} hours`
    };
  } catch (error) {
    console.error('Error in predictThresholdCrossing:', error);
    return null;
  }
}

