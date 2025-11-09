# Aura Farming ESP32 Setup Guide

## Database Setup

### 1. Run the SQL Schema

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `database_schema.sql`
3. Run the SQL script to create:
   - `profiles` table (linked to auth.users)
   - `zones` table (linked to profiles via `owner`)
   - `telemetry` table (linked to zones via `zone_id`)
   - RLS policies for security
   - Indexes for performance

### 2. Get Your Zone ID

1. In Supabase Dashboard → Table Editor → `zones`
2. Find your zone (or create one in the app)
3. Copy the `id` (UUID) from the zone row
4. Update `ZONE_ID` in the Arduino code

### 3. Verify RLS Policies

The schema includes a policy that allows anonymous inserts to `telemetry`:
```sql
CREATE POLICY "Allow anon insert telemetry" ON telemetry
  FOR INSERT TO anon
  WITH CHECK (true);
```

This allows your ESP32 to post data using the anon key. If you want more security, you can:
- Use Supabase service role key (keep it secret!)
- Create a service account with specific permissions
- Use Supabase Edge Functions as a proxy

## Sensor Calibration

### Understanding Your Sensors

Most soil moisture sensors work as follows:
- **Dry soil**: High resistance → High ADC reading (close to 4095)
- **Wet soil/Water**: Low resistance → Low ADC reading (close to 0)

However, some sensors work in reverse. You need to calibrate based on YOUR sensor's behavior.

### Calibration Steps

1. **Test with dry sensor:**
   - Remove sensor from soil/water
   - Let it dry completely
   - Note the raw ADC reading (check Serial Monitor)
   - Update `SOIL_ADC_DRY` in the code

2. **Test with wet sensor:**
   - Submerge sensor in water
   - Wait a few seconds for reading to stabilize
   - Note the raw ADC reading
   - Update `SOIL_ADC_WET` in the code

3. **Verify calibration:**
   - Dry sensor should show ~0% moisture
   - Wet sensor should show ~100% moisture
   - Adjust values if needed

### Current Calibration (Default)

```cpp
int SOIL_ADC_DRY = 4095;   // High reading when dry
int SOIL_ADC_WET = 0;      // Low reading when wet
```

If your sensor reads **0 when in water** but shows **0% moisture**, your sensor might be inverted. Try:

```cpp
int SOIL_ADC_DRY = 0;      // Low reading when dry
int SOIL_ADC_WET = 4095;   // High reading when wet
```

### Rain Sensor Calibration

Rain sensors typically work the same way:
- **Dry**: High ADC reading
- **Wet/Raining**: Low ADC reading

The code uses hysteresis thresholds to prevent flickering:
- `RAIN_ON_ADC`: Triggers "raining" when reading drops below this
- `RAIN_OFF_ADC`: Clears "raining" when reading rises above this

## Troubleshooting

### Sensor Reads 0% When in Water

If the sensor reads 0% when submerged in water:
1. Check the raw ADC reading in Serial Monitor
2. If raw ADC is **high** (3000-4095) when wet:
   - Your sensor is inverted
   - Swap `SOIL_ADC_DRY` and `SOIL_ADC_WET` values
3. If raw ADC is **0** when wet:
   - Sensor might be disconnected
   - Check wiring
   - Verify power supply

### Database Error 42501 (RLS Policy)

This means the Row Level Security policy is blocking the insert. Solutions:
1. Verify the RLS policy exists (see Database Setup)
2. Check that you're using the correct anon key
3. Verify the `zone_id` exists in the `zones` table
4. Check that the zone belongs to a valid user

### Sensor Values Always 100%

If moisture always shows 100%:
1. Check if `SOIL_ADC_DRY == SOIL_ADC_WET` (they shouldn't be the same)
2. Verify the raw ADC readings are changing
3. Recalibrate with actual dry/wet measurements

## Database Schema Overview

```
profiles (id UUID PRIMARY KEY)
  └─ zones (id UUID PRIMARY KEY, owner UUID → profiles.id)
      └─ telemetry (id BIGSERIAL PRIMARY KEY, zone_id UUID → zones.id)
```

- Each user has a profile in `profiles` table
- Each user can have multiple zones in `zones` table
- Each zone can have multiple telemetry readings in `telemetry` table
- Zones are linked to users via `owner` column (foreign key)
- Telemetry is linked to zones via `zone_id` column (foreign key)

## Security Notes

1. **Anon Key**: The current setup uses the anon key, which is public. This is fine for development but consider:
   - Using service role key for production (keep it secret!)
   - Implementing authentication for ESP32 devices
   - Using Supabase Edge Functions as a secure proxy

2. **RLS Policies**: The policies ensure:
   - Users can only see their own zones and telemetry
   - ESP32 can insert telemetry (anon policy)
   - Users cannot modify other users' data

## Next Steps

1. ✅ Set up database schema
2. ✅ Get zone_id from Supabase
3. ✅ Update ZONE_ID in Arduino code
4. ✅ Calibrate sensors
5. ✅ Upload code to ESP32
6. ✅ Verify data appears in Supabase
7. ✅ Check dashboard displays data correctly

