// Water Saved Card - Shows water savings over selectable window
import { supabase } from './config.js';
import { getCurrentUser } from './auth.js';

/**
 * Calculate water saved for a given period
 */
function calcWaterSaved(zones, events, period) {
  const days = Math.max(1, Math.ceil((period.to.getTime() - period.from.getTime()) / 86400000));
  
  const baseline = zones.reduce((sum, z) => {
    const expectedEvents = (z.baseline_days_per_week ?? 7) * (days / 7);
    return sum + (z.water_litres ?? 0) * expectedEvents;
  }, 0);
  
  const actual = events
    .filter(e => e.source !== 'skipped_due_to_rain')
    .reduce((s, e) => s + (e.litres ?? 0), 0);
  
  const saved_l = Math.max(baseline - actual, 0);
  const saved_pct = baseline > 0 ? Math.round((saved_l / baseline) * 100) : 0;
  
  return { baseline, actual, saved_l, saved_pct };
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

    // Fetch zones
    const { data: zones, error: zonesError } = await supabase
      .from('zones')
      .select('id, name, water_litres, baseline_days_per_week')
      .eq('owner', user.id);

    if (zonesError || !zones || zones.length === 0) {
      contentEl.innerHTML = '<div class="water-saved-empty">Add zone defaults to estimate savings.</div>';
      return;
    }

    // Check if zones have baseline configured
    const hasBaseline = zones.some(z => z.baseline_days_per_week && z.water_litres);
    if (!hasBaseline) {
      contentEl.innerHTML = '<div class="water-saved-empty">Set zone defaults to estimate savings.</div>';
      return;
    }

    // Calculate period (last 7 days)
    const to = new Date();
    const from = new Date(to.getTime() - 7 * 86400000);

    // Fetch irrigation events
    const { data: events, error: eventsError } = await supabase
      .from('irrigation_events')
      .select('zone_id, ts, litres, source')
      .gte('ts', from.toISOString())
      .lte('ts', to.toISOString())
      .order('ts', { ascending: true });

    if (eventsError) {
      console.error('Error fetching irrigation events:', eventsError);
      contentEl.innerHTML = '<div class="water-saved-empty">Error loading data</div>';
      return;
    }

    const irrigationEvents = events || [];

    // Calculate water saved
    const { baseline, actual, saved_l, saved_pct } = calcWaterSaved(zones, irrigationEvents, { from, to });

    // Calculate daily cumulative for sparkline
    const dailyData = dailyCumulativeSaved(zones, irrigationEvents, { from, to });

    // Render card content
    renderWaterSavedContent(contentEl, { baseline, actual, saved_l, saved_pct, dailyData });

    // Refresh every 30 seconds
    setInterval(async () => {
      const { data: updatedZones } = await supabase
        .from('zones')
        .select('id, name, water_litres, baseline_days_per_week')
        .eq('owner', user.id);

      if (!updatedZones) return;

      const { data: updatedEvents } = await supabase
        .from('irrigation_events')
        .select('zone_id, ts, litres, source')
        .gte('ts', from.toISOString())
        .lte('ts', to.toISOString())
        .order('ts', { ascending: true });

      const newStats = calcWaterSaved(updatedZones, updatedEvents || [], { from, to });
      const newDaily = dailyCumulativeSaved(updatedZones, updatedEvents || [], { from, to });
      
      renderWaterSavedContent(contentEl, {
        baseline: newStats.baseline,
        actual: newStats.actual,
        saved_l: newStats.saved_l,
        saved_pct: newStats.saved_pct,
        dailyData: newDaily
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
function renderWaterSavedContent(contentEl, { baseline, actual, saved_l, saved_pct, dailyData }) {
  // Handle edge cases
  if (baseline === 0) {
    contentEl.innerHTML = '<div class="water-saved-empty">Set zone defaults to estimate savings.</div>';
    return;
  }

  const overBaseline = actual > baseline;
  const displaySaved = overBaseline ? 0 : saved_l;
  const displayPct = overBaseline ? 0 : saved_pct;

  const actualPct = Math.min(100, (actual / baseline) * 100);
  const savedPct = Math.min(100, (saved_l / baseline) * 100);

  contentEl.innerHTML = `
    <div class="water-saved-primary-stat">${Math.round(displaySaved)} L saved this week</div>
    <div class="water-saved-percentage">${displayPct}% less vs schedule</div>
    ${overBaseline ? '<div class="water-saved-empty" style="color: #f44336; font-size: 11px;">↑ Over baseline this week</div>' : ''}
    
    <div class="water-saved-bar-container">
      <div class="water-saved-bar-labels">
        <span>Actual: ${Math.round(actual)} L</span>
        <span>Baseline: ${Math.round(baseline)} L</span>
      </div>
      <div class="water-saved-bar-track">
        <div class="water-saved-bar-fill" style="width: ${actualPct}%;">
          ${!overBaseline ? `<div class="water-saved-bar-saved" style="width: ${(savedPct / actualPct) * 100}%;"></div>` : ''}
        </div>
      </div>
    </div>
    
    <canvas class="water-saved-sparkline" id="water-saved-sparkline"></canvas>
  `;

  // Render sparkline
  renderSparkline(dailyData);
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

