import { supabase } from './config.js';
import { getCurrentUser } from './auth.js';

/**
 * Fetch all thresholds from the thresholds table
 * Returns a map of crop_name -> { min_moisture, max_moisture, moderate_risk, high_risk }
 */
export async function fetchThresholds() {
  try {
    const { data: thresholds, error } = await supabase
      .from('thresholds')
      .select('crop_name, min_moisture, max_moisture, moderate_risk, high_risk')
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
            moderate_risk: threshold.moderate_risk,
            high_risk: threshold.high_risk,
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

/**
 * Calculate threshold crossings for a zone (separate from soil health risk)
 * Tracks how many times moisture crosses above max or below min thresholds
 * 
 * @param {string} zoneId - UUID of the zone
 * @param {string} cropType - Type of crop (to get thresholds)
 * @param {Array} hourlyData - Optional: hourly data array. If not provided, will fetch it.
 * @returns {Promise<{crossingsAboveMax: number, crossingsBelowMin: number, maxMoisture: number, minMoisture: number, hasError: boolean, errorType: string|null, suggestions: string[]}>}
 */
export async function calculateThresholdCrossings(zoneId, cropType, hourlyData = null) {
  try {
    // Fetch thresholds for this crop
    const thresholds = await fetchThresholds();
    const cropNameLower = cropType?.toLowerCase().trim();
    const threshold = thresholds.get(cropNameLower);
    
    if (!threshold) {
      return {
        crossingsAboveMax: 0,
        crossingsBelowMin: 0,
        maxMoisture: null,
        minMoisture: null,
        hasError: false,
        errorType: null,
        suggestions: []
      };
    }

    const maxMoisture = threshold.max_moisture;
    const minMoisture = threshold.min_moisture;

    // Get hourly data if not provided
    let hourlyReadings = hourlyData;
    if (!hourlyReadings) {
      // Calculate yesterday in UTC (same as graph and soil health)
      const now = new Date();
      const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      const startOfYesterday = new Date(todayUTC);
      startOfYesterday.setUTCDate(startOfYesterday.getUTCDate() - 1);
      const endOfYesterday = new Date(todayUTC);
      
      // Fetch telemetry data from yesterday (UTC)
      const { data: telemetryData, error } = await supabase
        .from('telemetry')
        .select('ts, moisture')
        .eq('zone_id', zoneId)
        .gte('ts', startOfYesterday.toISOString())
        .lt('ts', endOfYesterday.toISOString())
        .order('ts', { ascending: true });

      if (error || !telemetryData || telemetryData.length === 0) {
        return {
          crossingsAboveMax: 0,
          crossingsBelowMin: 0,
          maxMoisture: maxMoisture,
          minMoisture: minMoisture,
          hasError: false,
          errorType: null,
          suggestions: []
        };
      }

      // Filter out invalid readings
      const validReadings = telemetryData.filter(
        r => r.moisture !== null && r.moisture !== undefined
      );
      
      if (validReadings.length === 0) {
        return {
          crossingsAboveMax: 0,
          crossingsBelowMin: 0,
          maxMoisture: maxMoisture,
          minMoisture: minMoisture,
          hasError: false,
          errorType: null,
          suggestions: []
        };
      }

      // Group by UTC hour (0-23) and calculate averages
      const hourlyDataMap = new Map();
      validReadings.forEach(reading => {
        const readingDate = new Date(reading.ts);
        const hour = readingDate.getUTCHours();
        
        if (!hourlyDataMap.has(hour)) {
          hourlyDataMap.set(hour, { sum: 0, count: 0 });
        }
        
        const hourData = hourlyDataMap.get(hour);
        hourData.sum += reading.moisture;
        hourData.count += 1;
      });

      // Convert to array format, sorted by hour (0-23)
      hourlyReadings = [];
      for (let hour = 0; hour < 24; hour++) {
        if (hourlyDataMap.has(hour)) {
          const hourData = hourlyDataMap.get(hour);
          hourlyReadings.push({
            hour: hour,
            moisture: hourData.sum / hourData.count
          });
        }
      }
      
      hourlyReadings.sort((a, b) => a.hour - b.hour);
    }

    if (!hourlyReadings || hourlyReadings.length === 0) {
      return {
        crossingsAboveMax: 0,
        crossingsBelowMin: 0,
        maxMoisture: maxMoisture,
        minMoisture: minMoisture,
        hasError: false,
        errorType: null,
        suggestions: []
      };
    }

    // Create a complete 24-hour array (0-23), filling in missing hours with null
    const hourlyArray = new Array(24).fill(null);
    hourlyReadings.forEach(reading => {
      if (reading.hour >= 0 && reading.hour < 24) {
        hourlyArray[reading.hour] = reading.moisture;
      }
    });

    // Track threshold crossings (count how many times moisture exceeds max or goes below min)
    let crossingsAboveMax = 0;
    let crossingsBelowMin = 0;
    let previousMoisture = null;
    let previousWasAboveMax = false;
    let previousWasBelowMin = false;

    for (let hour = 0; hour < 24; hour++) {
      const moisture = hourlyArray[hour];
      
      if (moisture !== null) {
        // Track threshold crossings
        const isAboveMax = moisture > maxMoisture;
        const isBelowMin = moisture < minMoisture;
        
        // Count crossings above max (transition from not above to above)
        if (isAboveMax && !previousWasAboveMax && previousMoisture !== null) {
          crossingsAboveMax++;
          console.log(`[Threshold Crossings] Crossing above max at hour ${hour}: ${previousMoisture.toFixed(1)}% -> ${moisture.toFixed(1)}%`);
        }
        
        // Count crossings below min (transition from not below to below)
        if (isBelowMin && !previousWasBelowMin && previousMoisture !== null) {
          crossingsBelowMin++;
          console.log(`[Threshold Crossings] Crossing below min at hour ${hour}: ${previousMoisture.toFixed(1)}% -> ${moisture.toFixed(1)}%`);
        }
        
        // Update previous state
        previousMoisture = moisture;
        previousWasAboveMax = isAboveMax;
        previousWasBelowMin = isBelowMin;
      }
    }

    console.log(`[Threshold Crossings] Zone: ${zoneId}, Crop: ${cropType}`);
    console.log(`[Threshold Crossings] Crossings above max: ${crossingsAboveMax} times`);
    console.log(`[Threshold Crossings] Crossings below min: ${crossingsBelowMin} times`);

    // Determine if there's an error (3+ crossings)
    let hasError = false;
    let errorType = null;
    const suggestions = [];

    if (crossingsAboveMax >= 3) {
      hasError = true;
      errorType = 'above_max';
      suggestions.push(`Reduce watering - soil moisture exceeded maximum threshold (${maxMoisture}%) ${crossingsAboveMax} times.`);
    }

    if (crossingsBelowMin >= 3) {
      hasError = true;
      errorType = errorType ? 'both' : 'below_min';
      suggestions.push(`Add more water - soil moisture fell below minimum threshold (${minMoisture}%) ${crossingsBelowMin} times.`);
    }

    return {
      crossingsAboveMax: crossingsAboveMax,
      crossingsBelowMin: crossingsBelowMin,
      maxMoisture: maxMoisture,
      minMoisture: minMoisture,
      hasError: hasError,
      errorType: errorType,
      suggestions: suggestions
    };
  } catch (error) {
    console.error('Error in calculateThresholdCrossings:', error);
    return {
      crossingsAboveMax: 0,
      crossingsBelowMin: 0,
      maxMoisture: null,
      minMoisture: null,
      hasError: false,
      errorType: null,
      suggestions: []
    };
  }
}

/**
 * Calculate soil health risk based on hourly moisture data from the graph (previous day)
 * Uses the same data source as the graph - hourly aggregated data from yesterday
 * 
 * Risk calculation:
 * - If moisture is above max_moisture for longer than moderate_risk hours → moderate risk (yellow)
 * - If moisture is above max_moisture for longer than high_risk hours → high risk (red)
 * - Otherwise → healthy (green)
 * 
 * @param {string} zoneId - UUID of the zone
 * @param {string} cropType - Type of crop (to get thresholds)
 * @param {Array} hourlyData - Optional: hourly data array from graph. If not provided, will fetch it.
 * @returns {Promise<{risk: string, hoursAboveMax: number, message: string, maxMoisture: number, moderateRiskHours: number, highRiskHours: number}>}
 */
export async function calculateSoilHealthRisk(zoneId, cropType, hourlyData = null) {
  try {
    // Fetch thresholds for this crop
    const thresholds = await fetchThresholds();
    const cropNameLower = cropType?.toLowerCase().trim();
    const threshold = thresholds.get(cropNameLower);
    
    if (!threshold) {
      return {
        risk: 'unknown',
        hoursAboveMax: 0,
        message: 'No threshold data available',
        maxMoisture: null,
        moderateRiskHours: null,
        highRiskHours: null
      };
    }

    const maxMoisture = threshold.max_moisture;
    const minMoisture = threshold.min_moisture;
    const moderateRiskHours = threshold.moderate_risk;
    const highRiskHours = threshold.high_risk;

    // Log threshold values for debugging
    console.log(`[Soil Health Risk] Thresholds for ${cropType}: min_moisture=${minMoisture}%, max_moisture=${maxMoisture}%, moderate_risk=${moderateRiskHours}, high_risk=${highRiskHours}`);

    // If risk thresholds are not set, return healthy
    if (!moderateRiskHours && !highRiskHours) {
      console.log(`[Soil Health Risk] No risk thresholds set for ${cropType}, returning healthy`);
      return {
        risk: 'none',
        hoursAboveMax: 0,
        message: 'Healthy',
        maxMoisture: maxMoisture,
        moderateRiskHours: moderateRiskHours,
        highRiskHours: highRiskHours
      };
    }

    // Get hourly data if not provided (use the same logic as the graph - UTC time)
    let hourlyReadings = hourlyData;
    if (!hourlyReadings) {
      // Calculate yesterday in UTC (same as graph) to ensure we're analyzing the same data
      const now = new Date();
      const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      const startOfYesterday = new Date(todayUTC);
      startOfYesterday.setUTCDate(startOfYesterday.getUTCDate() - 1);
      const endOfYesterday = new Date(todayUTC);
      
      console.log(`[Soil Health Risk] Fetching data for zone ${zoneId}`);
      console.log(`[Soil Health Risk] UTC - Start of yesterday: ${startOfYesterday.toISOString()}`);
      console.log(`[Soil Health Risk] UTC - End of yesterday: ${endOfYesterday.toISOString()}`);
      
      // Fetch telemetry data from yesterday (UTC, same as graph)
      const { data: telemetryData, error } = await supabase
        .from('telemetry')
        .select('ts, moisture')
        .eq('zone_id', zoneId)
        .gte('ts', startOfYesterday.toISOString())
        .lt('ts', endOfYesterday.toISOString())
        .order('ts', { ascending: true });

      if (error) {
        console.error('[Soil Health Risk] Error fetching telemetry:', error);
        return {
          risk: 'error',
          hoursAboveMax: 0,
          message: 'Error fetching data',
          maxMoisture: maxMoisture,
          moderateRiskHours: moderateRiskHours,
          highRiskHours: highRiskHours
        };
      }

      if (!telemetryData || telemetryData.length === 0) {
        console.log(`[Soil Health Risk] No telemetry data found for zone ${zoneId}`);
        return {
          risk: 'no_data',
          hoursAboveMax: 0,
          message: 'No data available',
          maxMoisture: maxMoisture,
          moderateRiskHours: moderateRiskHours,
          highRiskHours: highRiskHours
        };
      }

      console.log(`[Soil Health Risk] Found ${telemetryData.length} total readings`);

      // Filter out invalid readings
      const validReadings = telemetryData.filter(
        r => r.moisture !== null && r.moisture !== undefined
      );
      
      if (validReadings.length === 0) {
        console.log(`[Soil Health Risk] No valid moisture readings`);
        return {
          risk: 'no_data',
          hoursAboveMax: 0,
          message: 'No valid moisture data',
          maxMoisture: maxMoisture,
          moderateRiskHours: moderateRiskHours,
          highRiskHours: highRiskHours
        };
      }

      // Group by UTC hour (0-23) and calculate averages
      // This matches the graph's timezone and ensures we're analyzing the same period
      const hourlyDataMap = new Map();
      validReadings.forEach(reading => {
        const readingDate = new Date(reading.ts);
        // Use UTC hour (0-23) to match the graph
        const hour = readingDate.getUTCHours();
        
        if (!hourlyDataMap.has(hour)) {
          hourlyDataMap.set(hour, { sum: 0, count: 0 });
        }
        
        const hourData = hourlyDataMap.get(hour);
        hourData.sum += reading.moisture;
        hourData.count += 1;
      });

      console.log(`[Soil Health Risk] Grouped into ${hourlyDataMap.size} hours with data`);

      // Convert to array format, sorted by hour (0-23)
      hourlyReadings = [];
      for (let hour = 0; hour < 24; hour++) {
        if (hourlyDataMap.has(hour)) {
          const hourData = hourlyDataMap.get(hour);
          const avgMoisture = hourData.sum / hourData.count;
          hourlyReadings.push({
            hour: hour,
            moisture: avgMoisture
          });
          console.log(`[Soil Health Risk] Hour ${hour}: avg=${avgMoisture.toFixed(1)}%, above max(${maxMoisture}%)=${avgMoisture > maxMoisture}`);
        }
      }
      
      // Sort by hour to ensure correct order
      hourlyReadings.sort((a, b) => a.hour - b.hour);
    }

    if (!hourlyReadings || hourlyReadings.length === 0) {
      return {
        risk: 'no_data',
        hoursAboveMax: 0,
        message: 'No hourly data available',
        maxMoisture: maxMoisture,
        moderateRiskHours: moderateRiskHours,
        highRiskHours: highRiskHours
      };
    }

    // Analyze hourly data to find continuous periods above max_moisture
    // Create a complete 24-hour array (0-23), filling in missing hours with null
    const hourlyArray = new Array(24).fill(null);
    hourlyReadings.forEach(reading => {
      if (reading.hour >= 0 && reading.hour < 24) {
        hourlyArray[reading.hour] = reading.moisture;
      }
    });

    // Debug logging
    console.log(`[Soil Health Risk] Zone: ${zoneId}, Crop: ${cropType}`);
    console.log(`[Soil Health Risk] Min Moisture: ${minMoisture}%, Max Moisture: ${maxMoisture}%, Moderate Risk: ${moderateRiskHours}h, High Risk: ${highRiskHours}h`);
    console.log(`[Soil Health Risk] Hourly readings count: ${hourlyReadings.length}`);
    console.log(`[Soil Health Risk] Hourly array:`, hourlyArray.map((m, h) => m !== null ? `H${h}:${m.toFixed(1)}%` : `H${h}:null`).join(', '));

    // Find the longest continuous period where moisture is above max_moisture
    // Missing hours (null) break continuity - we only count consecutive hours with data above max
    let longestPeriodHours = 0;
    let currentPeriodHours = 0;
    let longestPeriodStart = -1;
    let currentPeriodStart = -1;

    for (let hour = 0; hour < 24; hour++) {
      const moisture = hourlyArray[hour];
      
      if (moisture !== null) {
        // Track continuous periods above max (for soil health risk)
        const isAboveMax = moisture > maxMoisture;
        
        if (isAboveMax) {
          // This hour has data and is above max - add 1 hour to current period
          if (currentPeriodHours === 0) {
            currentPeriodStart = hour;
          }
          currentPeriodHours += 1;
        } else {
          // This hour is below max or has no data - end current period
          if (currentPeriodHours > longestPeriodHours) {
            longestPeriodHours = currentPeriodHours;
            longestPeriodStart = currentPeriodStart;
          }
          currentPeriodHours = 0;
          currentPeriodStart = -1;
        }
      } else {
        // No data for this hour - end current period
        if (currentPeriodHours > longestPeriodHours) {
          longestPeriodHours = currentPeriodHours;
          longestPeriodStart = currentPeriodStart;
        }
        currentPeriodHours = 0;
        currentPeriodStart = -1;
      }
    }

    // Check if we ended while still above max
    if (currentPeriodHours > longestPeriodHours) {
      longestPeriodHours = currentPeriodHours;
      longestPeriodStart = currentPeriodStart;
    }

    console.log(`[Soil Health Risk] Longest period above max: ${longestPeriodHours} hours (starting at hour ${longestPeriodStart})`);
    console.log(`[Soil Health Risk] Comparison: ${longestPeriodHours} > ${highRiskHours} = ${longestPeriodHours > highRiskHours} (high risk)`);
    console.log(`[Soil Health Risk] Comparison: ${longestPeriodHours} > ${moderateRiskHours} = ${longestPeriodHours > moderateRiskHours} (moderate risk)`);

    // Determine risk level based on longest continuous period above max
    // Soil health risk is INDEPENDENT of threshold crossings
    // High risk: hours > high_risk value
    // Moderate risk: hours > moderate_risk value (but <= high_risk if high_risk exists)
    // Low risk: hours > 0 (but <= moderate_risk if moderate_risk exists)
    // Healthy: hours = 0
    let risk = 'none';
    let message = 'Healthy';

    // Convert to numbers to ensure proper comparison
    const highRiskHoursNum = highRiskHours ? Number(highRiskHours) : null;
    const moderateRiskHoursNum = moderateRiskHours ? Number(moderateRiskHours) : null;
    const longestPeriodHoursNum = Number(longestPeriodHours);

    // Determine soil health risk (independent of threshold crossings)
    if (highRiskHoursNum !== null && longestPeriodHoursNum > highRiskHoursNum) {
      risk = 'high';
      message = `High risk - moisture has been above the maximum threshold for ${longestPeriodHoursNum.toFixed(1)} hours`;
    } else if (moderateRiskHoursNum !== null && longestPeriodHoursNum > moderateRiskHoursNum) {
      risk = 'moderate';
      message = `Moderate risk - moisture has been above the maximum threshold for ${longestPeriodHoursNum.toFixed(1)} hours`;
    } else if (longestPeriodHoursNum > 0) {
      risk = 'low';
      message = `Low risk - moisture has been above the maximum threshold for ${longestPeriodHoursNum.toFixed(1)} hours`;
    } else {
      risk = 'none';
      message = 'Healthy';
    }

    console.log(`[Soil Health Risk] Final risk determination: ${risk} (${longestPeriodHoursNum}h > high:${highRiskHoursNum}h, moderate:${moderateRiskHoursNum}h)`);

    return {
      risk,
      hoursAboveMax: longestPeriodHours,
      message,
      maxMoisture: maxMoisture,
      minMoisture: minMoisture,
      moderateRiskHours: moderateRiskHours,
      highRiskHours: highRiskHours
    };
  } catch (error) {
    console.error('Error in calculateSoilHealthRisk:', error);
    return {
      risk: 'error',
      hoursAboveMax: 0,
      message: 'Error calculating risk',
      maxMoisture: null,
      minMoisture: null,
      moderateRiskHours: null,
      highRiskHours: null
    };
  }
}

