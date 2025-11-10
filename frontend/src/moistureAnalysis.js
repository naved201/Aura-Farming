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

    // Get telemetry data if not provided (use all available data, like graph and soil health)
    let telemetryReadings = hourlyData;
    if (!telemetryReadings) {
      console.log(`[Threshold Crossings] Fetching ALL telemetry data for zone ${zoneId}`);
      
      // Fetch ALL telemetry data for this zone (no time restrictions, same as graph)
      const { data: telemetryData, error } = await supabase
        .from('telemetry')
        .select('ts, moisture')
        .eq('zone_id', zoneId)
        .not('moisture', 'is', null)
        .order('ts', { ascending: true })
        .limit(100); // Get last 100 readings

      if (error) {
        console.error(`[Threshold Crossings] Error fetching telemetry data:`, error);
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

      if (!telemetryData || telemetryData.length === 0) {
        console.warn(`[Threshold Crossings] No telemetry data found for zone ${zoneId}`);
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

      // Filter out invalid readings and convert to array with timestamps
      const validReadings = telemetryData
        .filter(r => r.moisture !== null && r.moisture !== undefined && !isNaN(r.moisture))
        .map(r => ({
          timestamp: new Date(r.ts),
          moisture: parseFloat(r.moisture)
        }))
        .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp

      console.log(`[Threshold Crossings] Found ${validReadings.length} valid readings`);
      
      // Use individual readings directly for more accurate crossing detection
      telemetryReadings = validReadings;
    }

    if (!telemetryReadings || telemetryReadings.length === 0) {
      console.warn(`[Threshold Crossings] No telemetry data available for zone ${zoneId}`);
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

    // Track threshold crossings by analyzing the sequence of readings
    // A crossing occurs when moisture transitions from one side of a threshold to the other
    let crossingsAboveMax = 0;
    let crossingsBelowMin = 0;
    let previousMoisture = null;
    let previousWasAboveMax = false;
    let previousWasBelowMin = false;
    let previousWasInRange = true; // Start assuming we're in range

    // Process readings in chronological order
    for (let i = 0; i < telemetryReadings.length; i++) {
      const reading = telemetryReadings[i];
      const moisture = reading.moisture;
      
      if (moisture === null || moisture === undefined || isNaN(moisture)) {
        continue; // Skip invalid readings
      }

      // Determine current state relative to thresholds
      const isAboveMax = moisture > maxMoisture;
      const isBelowMin = moisture < minMoisture;
      const isInRange = !isAboveMax && !isBelowMin;
      
      // Count crossings above max (transition from not above to above)
      // This happens when we cross FROM (in range OR below min) TO above max
      if (isAboveMax && !previousWasAboveMax && previousMoisture !== null) {
        crossingsAboveMax++;
        const prevState = previousWasBelowMin ? 'below min' : 'in range';
        console.log(`[Threshold Crossings] Crossing above max: ${prevState} (${previousMoisture.toFixed(1)}%) -> above max (${moisture.toFixed(1)}%)`);
      }
      
      // Count crossings below min (transition from not below to below)
      // This happens when we cross FROM (in range OR above max) TO below min
      if (isBelowMin && !previousWasBelowMin && previousMoisture !== null) {
        crossingsBelowMin++;
        const prevState = previousWasAboveMax ? 'above max' : 'in range';
        console.log(`[Threshold Crossings] Crossing below min: ${prevState} (${previousMoisture.toFixed(1)}%) -> below min (${moisture.toFixed(1)}%)`);
      }
      
      // Update previous state for next iteration
      previousMoisture = moisture;
      previousWasAboveMax = isAboveMax;
      previousWasBelowMin = isBelowMin;
      previousWasInRange = isInRange;
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

    // Get telemetry data if not provided (use all available data, like the graph)
    let telemetryReadings = hourlyData;
    if (!telemetryReadings) {
      console.log(`[Soil Health Risk] Fetching ALL telemetry data for zone ${zoneId}`);
      
      // Fetch ALL telemetry data for this zone (no time restrictions, same as graph)
      const { data: telemetryData, error } = await supabase
        .from('telemetry')
        .select('ts, moisture')
        .eq('zone_id', zoneId)
        .not('moisture', 'is', null)
        .order('ts', { ascending: true })
        .limit(100); // Get last 100 readings

      if (error) {
        console.error(`[Soil Health Risk] Error fetching telemetry data:`, error);
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
        console.warn(`[Soil Health Risk] No telemetry data found for zone ${zoneId}`);
        return {
          risk: 'no_data',
          hoursAboveMax: 0,
          message: 'Insufficient data to assess soil health risk. No telemetry data available for this zone.',
          maxMoisture: maxMoisture,
          moderateRiskHours: moderateRiskHours,
          highRiskHours: highRiskHours
        };
      }

      // Filter out invalid readings and convert to array with timestamps
      telemetryReadings = telemetryData
        .filter(r => r.moisture !== null && r.moisture !== undefined && !isNaN(r.moisture))
        .map(r => ({
          timestamp: new Date(r.ts),
          moisture: parseFloat(r.moisture)
        }))
        .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp

      console.log(`[Soil Health Risk] Found ${telemetryReadings.length} valid readings`);
    }

    if (!telemetryReadings || telemetryReadings.length === 0) {
      return {
        risk: 'no_data',
        hoursAboveMax: 0,
        message: 'No telemetry data available',
        maxMoisture: maxMoisture,
        moderateRiskHours: moderateRiskHours,
        highRiskHours: highRiskHours
      };
    }

    // Calculate the longest continuous period (in hours) where moisture is above max_moisture
    // Find consecutive readings above max and calculate the time span
    let longestPeriodHours = 0;
    let currentPeriodStart = null;
    let currentPeriodEnd = null;

    for (let i = 0; i < telemetryReadings.length; i++) {
      const reading = telemetryReadings[i];
      const isAboveMax = reading.moisture > maxMoisture;

      if (isAboveMax) {
        // Start or continue a period above max
        if (currentPeriodStart === null) {
          currentPeriodStart = reading.timestamp;
        }
        currentPeriodEnd = reading.timestamp;
      } else {
        // End of period above max - calculate duration
        if (currentPeriodStart !== null && currentPeriodEnd !== null) {
          // Calculate duration in hours from first to last reading in the period
          const periodDurationHours = (currentPeriodEnd.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60);
          
          // If we only have one reading, estimate duration based on reading frequency
          // Otherwise use actual time difference
          if (currentPeriodStart.getTime() === currentPeriodEnd.getTime()) {
            // Single reading above max
            // Estimate: assume it lasted at least until the next reading (if exists)
            if (i < telemetryReadings.length - 1) {
              const nextReading = telemetryReadings[i + 1];
              const timeUntilNext = (nextReading.timestamp.getTime() - reading.timestamp.getTime()) / (1000 * 60 * 60);
              // Use half the time until next reading, minimum 0.5 hours
              const estimatedHours = Math.max(0.5, timeUntilNext / 2);
              if (estimatedHours > longestPeriodHours) {
                longestPeriodHours = estimatedHours;
              }
            }
          } else {
            // Multiple readings - use actual time difference
            if (periodDurationHours > longestPeriodHours) {
              longestPeriodHours = periodDurationHours;
            }
          }
          
          currentPeriodStart = null;
          currentPeriodEnd = null;
        }
      }
    }

    // Check if we ended while still above max (last reading is above max)
    if (currentPeriodStart !== null && currentPeriodEnd !== null) {
      const periodDurationHours = (currentPeriodEnd.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60);
      
      if (currentPeriodStart.getTime() === currentPeriodEnd.getTime()) {
        // Single reading at the end - estimate at least 0.5 hours
        if (0.5 > longestPeriodHours) {
          longestPeriodHours = 0.5;
        }
      } else {
        // Multiple readings - use actual time difference
        if (periodDurationHours > longestPeriodHours) {
          longestPeriodHours = periodDurationHours;
        }
      }
    }

    console.log(`[Soil Health Risk] Zone: ${zoneId}, Crop: ${cropType}`);
    console.log(`[Soil Health Risk] Max Moisture: ${maxMoisture}%, Moderate Risk: ${moderateRiskHours}h, High Risk: ${highRiskHours}h`);
    console.log(`[Soil Health Risk] Longest continuous period above max: ${longestPeriodHours.toFixed(2)} hours`);
    console.log(`[Soil Health Risk] Comparison: ${longestPeriodHours.toFixed(2)} > ${highRiskHours} = ${longestPeriodHours > highRiskHours} (high risk)`);
    console.log(`[Soil Health Risk] Comparison: ${longestPeriodHours.toFixed(2)} > ${moderateRiskHours} = ${longestPeriodHours > moderateRiskHours} (moderate risk)`);

    // Determine risk level based on longest continuous period above max
    // High risk: hours > high_risk value
    // Moderate risk: hours > moderate_risk value (but <= high_risk if high_risk exists)
    // Healthy: hours <= moderate_risk (or no period above max)
    let risk = 'none';
    let message = 'Healthy';

    // Convert to numbers to ensure proper comparison
    const highRiskHoursNum = highRiskHours ? Number(highRiskHours) : null;
    const moderateRiskHoursNum = moderateRiskHours ? Number(moderateRiskHours) : null;
    const longestPeriodHoursNum = Number(longestPeriodHours);

    // Determine soil health risk
    if (highRiskHoursNum !== null && longestPeriodHoursNum >= highRiskHoursNum) {
      risk = 'high';
      message = `High risk - moisture has been above the maximum threshold (${maxMoisture}%) for ${longestPeriodHoursNum.toFixed(1)} hours`;
    } else if (moderateRiskHoursNum !== null && longestPeriodHoursNum >= moderateRiskHoursNum) {
      risk = 'moderate';
      message = `Moderate risk - moisture has been above the maximum threshold (${maxMoisture}%) for ${longestPeriodHoursNum.toFixed(1)} hours`;
    } else {
      risk = 'none';
      message = 'Healthy';
    }

    console.log(`[Soil Health Risk] Final risk determination: ${risk} (${longestPeriodHoursNum.toFixed(2)}h vs high:${highRiskHoursNum}h, moderate:${moderateRiskHoursNum}h)`);

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

