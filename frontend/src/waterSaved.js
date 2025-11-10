// Water Saved Card - Shows water savings over selectable window
import { supabase } from './config.js';
import { getCurrentUser } from './auth.js';

/**
 * Calculate water saved using new formula for ALL zones of a user:
 * y = sum of [(watering_amount_l * days_since_creation) - sum(inches_saved)] for each zone
 * 
 * This calculates the total water saved across all zones by:
 * 1. For each zone: (watering_amount_l * days_since_creation) - sum(inches_saved for that zone)
 * 2. Sum all zone values to get total saved
 */
function calcWaterSaved(zones, wateringActivities) {
  let totalSaved = 0;
  
  // Process all zones for the user
  for (const zone of zones) {
    // Get watering_amount_l from zone (entered when zone was created)
    const wateringAmountL = zone.watering_amount_l || 0;
    
    // Calculate days since zone creation
    const createdAt = new Date(zone.created_at);
    const now = new Date();
    const daysSinceCreation = Math.max(1, Math.ceil((now.getTime() - createdAt.getTime()) / 86400000));
    
    // Sum all inches_saved for this zone from watering_activity table
    const zoneActivities = wateringActivities.filter(activity => activity.zone_id === zone.id);
    const sumInchesSaved = zoneActivities.reduce((sum, activity) => {
      const inches = activity.inches_saved || 0;
      return sum + inches;
    }, 0);
    
    // Calculate: (watering_amount_l * days_since_creation) - sum(inches_saved)
    const zoneSaved = (wateringAmountL * daysSinceCreation) - sumInchesSaved;
    totalSaved += Math.max(0, zoneSaved); // Don't allow negative values, add to total
  }
  
  // Return total saved across all zones
  return { saved_l: totalSaved };
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

/**
 * Setup Water Saved Card
 */
export async function setupWaterSavedCard() {
  const contentEl = document.getElementById('water-saved-content');
  if (!contentEl) {
    setTimeout(setupWaterSavedCard, 100);
    return;
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      contentEl.innerHTML = '<div class="water-saved-empty">Please log in to view water savings</div>';
      return;
    }

    // Fetch zones with watering_amount_l and created_at
    const { data: zones, error: zonesError } = await supabase
      .from('zones')
      .select('id, name, watering_amount_l, created_at')
      .eq('owner', user.id);

    if (zonesError || !zones || zones.length === 0) {
      contentEl.innerHTML = '<div class="water-saved-empty">Add zones to view water savings.</div>';
      return;
    }

    // Fetch all watering activities (inches_saved)
    const { data: wateringActivities, error: activitiesError } = await supabase
      .from('watering_activity')
      .select('zone_id, inches_saved')
      .in('zone_id', zones.map(z => z.id));

    if (activitiesError) {
      console.error('Error fetching watering activities:', activitiesError);
      // Continue with empty activities array
    }

    const activities = wateringActivities || [];

    // Calculate water saved using new formula
    const { saved_l } = calcWaterSaved(zones, activities);

    // Render card content (simplified - just show the total)
    renderWaterSavedContent(contentEl, { saved_l });

    // Refresh every 30 seconds
    setInterval(async () => {
      const { data: updatedZones } = await supabase
        .from('zones')
        .select('id, name, watering_amount_l, created_at')
        .eq('owner', user.id);

      if (!updatedZones) return;

      const { data: updatedActivities } = await supabase
        .from('watering_activity')
        .select('zone_id, inches_saved')
        .in('zone_id', updatedZones.map(z => z.id));

      const newStats = calcWaterSaved(updatedZones, updatedActivities || []);
      
      renderWaterSavedContent(contentEl, {
        saved_l: newStats.saved_l
      });
    }, 30000);

  } catch (error) {
    console.error('Error setting up water saved card:', error);
    contentEl.innerHTML = '<div class="water-saved-empty">Error loading savings data</div>';
  }
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

