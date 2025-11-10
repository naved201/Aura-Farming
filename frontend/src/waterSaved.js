// Water Saved Card - Shows water savings over selectable window
import { supabase } from './config.js';
import { getCurrentUser } from './auth.js';

/**
 * Calculate water saved using formula:
 * x = (sum(water_amount_l from zones) - sum(inches_saved from watering_activity)) + 0.85
 * Value always increases (uses maximum of calculated value and previous max)
 */
function calcWaterSaved(zones, wateringActivities, userId) {
  if (!zones || zones.length === 0) {
    console.warn('[Water Saved Calc] No zones provided');
    return { saved_l: 0 };
  }

  // Calculate the normal calculation
  // Sum all water_amount_l from all zones
  const totalWaterAmountL = zones.reduce((sum, zone) => {
    const wateringAmountL = parseFloat(zone.watering_amount_l) || 0;
    return sum + wateringAmountL;
  }, 0);
  
  // Sum all inches_saved from watering_activity table
  const totalInchesSaved = (wateringActivities || []).reduce((sum, activity) => {
    const inches = parseFloat(activity.inches_saved) || 0;
    return sum + inches;
  }, 0);
  
  // Normal calculation: sum(water_amount_l) - sum(inches_saved)
  const normalCalculation = totalWaterAmountL - totalInchesSaved;
  
  // Add 0.85 to the normal calculation
  const calculatedX = normalCalculation + 0.85;
  
  // Ensure calculated value is not negative
  const calculatedXNonNegative = Math.max(0, calculatedX);
  
  // Get the previous value from localStorage
  const storageKey = `water_saved_${userId}`;
  let previousX = parseFloat(localStorage.getItem(storageKey));
  
  // If no previous value exists or is invalid, start with calculated value
  if (isNaN(previousX) || previousX === null || previousX === undefined) {
    previousX = 0;
  }
  
  console.log(`[Water Saved Calc] ===== Calculation Start =====`);
  console.log(`[Water Saved Calc] Zones count: ${zones.length}`);
  console.log(`[Water Saved Calc] totalWaterAmountL: ${totalWaterAmountL}`);
  console.log(`[Water Saved Calc] totalInchesSaved: ${totalInchesSaved}`);
  console.log(`[Water Saved Calc] normalCalculation: ${normalCalculation}`);
  console.log(`[Water Saved Calc] calculatedX (with +0.85): ${calculatedX}`);
  console.log(`[Water Saved Calc] calculatedXNonNegative: ${calculatedXNonNegative}`);
  console.log(`[Water Saved Calc] previousX from localStorage: ${previousX}`);
  
  // Ensure x always increases: 
  // - If calculated value is higher than previous, use it
  // - If calculated value is same or lower, add 0.85 to previous to ensure increase
  let finalX;
  if (calculatedXNonNegative > previousX) {
    // New calculation is higher - use it
    finalX = calculatedXNonNegative;
    console.log(`[Water Saved Calc] ✓ Using calculated value (higher than previous): ${finalX}`);
  } else {
    // New calculation is same or lower - add 0.85 to ensure it always increases
    finalX = previousX + 0.85;
    console.log(`[Water Saved Calc] ✓ Calculated (${calculatedXNonNegative}) <= previous (${previousX}), adding 0.85: ${finalX}`);
  }
  
  console.log(`[Water Saved Calc] Final x value: ${finalX}`);
  console.log(`[Water Saved Calc] ===== Calculation End =====`);
  
  // Always update localStorage with the new value (ensures it always increases)
  localStorage.setItem(storageKey, finalX.toString());
  console.log(`[Water Saved Calc] ✓ Updated localStorage key "${storageKey}" with value: ${finalX}`);
  
  return { saved_l: finalX };
}

/**
 * Build daily cumulative saved data for sparkline
 */
function dailyCumulativeSaved(zones, events, period) {
  const days = [];
  
  for (let d = 0; d < 7; d++) {
    const dayStart = new Date(period.from.getTime() + d * 86400000);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    
    const { baseline, actual, saved_l } = calcWaterSaved(
      zones,
      events.filter(e => {
        const eventDate = new Date(e.ts);
        return eventDate >= dayStart && eventDate < dayEnd;
      }),
      { from: dayStart, to: dayEnd }
    );
    
    const prev = days[days.length - 1]?.cum ?? 0;
    days.push({ day: d, saved: saved_l, cum: prev + saved_l });
  }
  
  return days;
}

// Store interval ID to prevent multiple intervals
let waterSavedIntervalId = null;

/**
 * Update water saved card with latest data
 */
async function updateWaterSavedCard() {
  const contentEl = document.getElementById('water-saved-content');
  if (!contentEl) {
    console.warn('[Water Saved] Content element not found');
    return;
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      contentEl.innerHTML = '<div class="water-saved-empty">Please log in to view water savings</div>';
      return;
    }

    console.log('[Water Saved] Fetching data for user:', user.id);

    // Fetch zones with watering_amount_l
    const { data: zones, error: zonesError } = await supabase
      .from('zones')
      .select('id, name, watering_amount_l, created_at')
      .eq('owner', user.id);

    if (zonesError) {
      console.error('[Water Saved] Error fetching zones:', zonesError);
      return;
    }

    if (!zones || zones.length === 0) {
      contentEl.innerHTML = '<div class="water-saved-empty">Add zones to view water savings.</div>';
      return;
    }

    console.log(`[Water Saved] Found ${zones.length} zones`);
    const totalWaterAmountL = zones.reduce((sum, zone) => sum + (zone.watering_amount_l || 0), 0);
    console.log(`[Water Saved] Total water_amount_l: ${totalWaterAmountL}`);

    // Fetch all watering activities (inches_saved) for this user
    const { data: wateringActivities, error: activitiesError } = await supabase
      .from('watering_activity')
      .select('inches_saved')
      .eq('user_id', user.id);

    if (activitiesError) {
      console.error('[Water Saved] Error fetching watering activities:', activitiesError);
      // Continue with empty activities array
    }

    const activities = wateringActivities || [];
    console.log(`[Water Saved] Found ${activities.length} watering activities`);
    const totalInchesSaved = activities.reduce((sum, activity) => sum + (activity.inches_saved || 0), 0);
    console.log(`[Water Saved] Total inches_saved: ${totalInchesSaved}`);

    // Calculate water saved using new formula (pass userId to track max value)
    const { saved_l } = calcWaterSaved(zones, activities, user.id);
    console.log(`[Water Saved] Calculated saved_l: ${saved_l}`);

    // Render card content
    renderWaterSavedContent(contentEl, { saved_l });

  } catch (error) {
    console.error('[Water Saved] Error updating water saved card:', error);
    const contentEl = document.getElementById('water-saved-content');
    if (contentEl) {
      contentEl.innerHTML = '<div class="water-saved-empty">Error loading savings data</div>';
    }
  }
}

/**
 * Setup Water Saved Card
 */
export async function setupWaterSavedCard() {
  const contentEl = document.getElementById('water-saved-content');
  if (!contentEl) {
    setTimeout(setupWaterSavedCard, 100);
    return;
  }

  // Clear existing interval if any
  if (waterSavedIntervalId !== null) {
    clearInterval(waterSavedIntervalId);
    waterSavedIntervalId = null;
  }

  // Update immediately
  await updateWaterSavedCard();

  // Refresh every 30 seconds (don't refresh too frequently to avoid rapid increases)
  waterSavedIntervalId = setInterval(async () => {
    await updateWaterSavedCard();
  }, 30000);
}

/**
 * Force immediate update of water saved card (for external calls like after starting sprinklers)
 */
export async function refreshWaterSavedCard() {
  await updateWaterSavedCard();
}

/**
 * Render water saved content
 */
function renderWaterSavedContent(contentEl, { saved_l }) {
  // Display the calculated value y
  const displayValue = Math.round(saved_l * 100) / 100; // Round to 2 decimal places
  
  contentEl.innerHTML = `
    <div class="water-saved-primary-stat">${displayValue.toFixed(2)} inches</div>
    <div class="water-saved-percentage">Water saved</div>
  `;
}

/**
 * Render sparkline chart
 */
function renderSparkline(dailyData) {
  const canvas = document.getElementById('water-saved-sparkline');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.offsetWidth;
  const height = 32;

  canvas.width = width;
  canvas.height = height;

  if (dailyData.length === 0) {
    ctx.clearRect(0, 0, width, height);
    return;
  }

  const maxCum = Math.max(...dailyData.map(d => d.cum), 1);
  const padding = 4;
  const pointRadius = 3;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw line
  ctx.strokeStyle = '#4caf50';
  ctx.lineWidth = 2;
  ctx.beginPath();

  dailyData.forEach((d, i) => {
    const x = padding + (i / Math.max(dailyData.length - 1, 1)) * (width - 2 * padding);
    const y = height - padding - ((d.cum / maxCum) * (height - 2 * padding));

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  // Draw dots
  dailyData.forEach((d, i) => {
    const x = padding + (i / Math.max(dailyData.length - 1, 1)) * (width - 2 * padding);
    const y = height - padding - ((d.cum / maxCum) * (height - 2 * padding));

    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.arc(x, y, pointRadius, 0, 2 * Math.PI);
    ctx.fill();

    // White outline
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
}

