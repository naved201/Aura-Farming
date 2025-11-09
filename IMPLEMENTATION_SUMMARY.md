# Implementation Summary

## What Was Done

### 1. Database Schema (`database_schema.sql`)

Created a complete database schema with:
- **profiles** table: Links to Supabase auth.users
- **zones** table: Contains user zones, linked to profiles via `owner` (foreign key)
- **telemetry** table: Contains sensor data, linked to zones via `zone_id` (foreign key)
- **RLS Policies**: Secure access control
  - Users can only see their own zones and telemetry
  - Anonymous users (ESP32) can insert telemetry data
- **Indexes**: Optimized for fast queries
- **Triggers**: Auto-update timestamps

### 2. Arduino Code Updates (`aura_farming_esp32.ino`)

**Fixed Issues:**
- ✅ Corrected sensor calibration logic
- ✅ Improved moisture percentage calculation
- ✅ Fixed rain detection with hysteresis
- ✅ Added validation and error handling
- ✅ Simplified serial output format
- ✅ Added calibration instructions

**Output Format:**
```
45.2% moist
NO
```

**Key Features:**
- Exponential Moving Average (EMA) filtering for stable readings
- Median filtering to remove noise
- Hysteresis for rain detection (prevents flickering)
- Automatic time synchronization (NTP)
- Periodic time re-sync

### 3. Documentation

- **SETUP_GUIDE.md**: Complete setup instructions
- **database_schema.sql**: Database schema with comments
- **IMPLEMENTATION_SUMMARY.md**: This file

## Next Steps

### 1. Set Up Database

1. Open Supabase Dashboard → SQL Editor
2. Run `database_schema.sql`
3. Verify tables were created:
   - `profiles`
   - `zones`
   - `telemetry`

### 2. Fix RLS Policy Error (42501)

If you're getting error 42501 (RLS policy violation):

1. **Check if policy exists:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'telemetry';
   ```

2. **If policy doesn't exist, run this:**
   ```sql
   CREATE POLICY "Allow anon insert telemetry" ON telemetry
     FOR INSERT 
     TO anon
     WITH CHECK (true);
   ```

3. **Verify RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'telemetry';
   ```

4. **If needed, temporarily disable RLS for testing:**
   ```sql
   ALTER TABLE telemetry DISABLE ROW LEVEL SECURITY;
   ```
   ⚠️ **Warning**: Only for testing! Re-enable RLS after testing.

### 3. Get Zone ID

1. Create a zone in your app (User Preferences)
2. Or create one manually in Supabase:
   ```sql
   INSERT INTO zones (owner, name, crop_type, watering_amount_l)
   VALUES (
     '<your-user-id-from-profiles-table>',
     'Zone 1',
     'Tomatoes',
     10
   )
   RETURNING id;
   ```
3. Copy the `id` (UUID)
4. Update `ZONE_ID` in Arduino code

### 4. Calibrate Sensors

**Problem**: Sensor shows 0% when in water

**Solution**:
1. Uncomment the calibration debug line in `readAndSend()`:
   ```cpp
   Serial.printf("[CAL] soilRaw=%d -> %.1f%%, rainRaw=%d\n", soilRaw, soilPct, rainRaw);
   ```

2. Test the sensor:
   - Place sensor in DRY soil/air → Note raw ADC value
   - Place sensor in WATER → Note raw ADC value

3. Update calibration values:
   - If raw ADC is **HIGH** when dry and **LOW** when wet:
     ```cpp
     int SOIL_ADC_DRY = 4095;  // Your dry reading
     int SOIL_ADC_WET = 0;     // Your wet reading
     ```
   
   - If raw ADC is **LOW** when dry and **HIGH** when wet (inverted):
     ```cpp
     int SOIL_ADC_DRY = 0;     // Your dry reading
     int SOIL_ADC_WET = 4095;  // Your wet reading
     ```

4. Verify calibration:
   - Dry sensor should show ~0% moisture
   - Wet sensor should show ~100% moisture

### 5. Test the System

1. Upload code to ESP32
2. Open Serial Monitor (115200 baud)
3. Check output:
   - Should show moisture percentage and status
   - Should show rain YES/NO
4. Check Supabase:
   - Go to Table Editor → `telemetry`
   - Verify new rows are being inserted
   - Check that `zone_id` matches your zone
   - Verify `moisture`, `rain`, and `status` values are correct

### 6. Verify Database Relationships

1. **Check user-zone relationship:**
   ```sql
   SELECT z.id, z.name, z.owner, p.email
   FROM zones z
   JOIN profiles p ON z.owner = p.id;
   ```

2. **Check zone-telemetry relationship:**
   ```sql
   SELECT t.id, t.zone_id, z.name, t.moisture, t.rain, t.status, t.ts
   FROM telemetry t
   JOIN zones z ON t.zone_id = z.id
   ORDER BY t.ts DESC
   LIMIT 10;
   ```

3. **Verify user can only see their own data:**
   - Login as user A → Should only see zones owned by user A
   - Login as user B → Should only see zones owned by user B

## Troubleshooting

### Database Error 42501

**Cause**: RLS policy is blocking the insert

**Solutions**:
1. Verify the anon insert policy exists (see step 2 above)
2. Check that you're using the correct anon key
3. Verify the `zone_id` exists in the `zones` table
4. Check Supabase logs for more details

### Sensor Always Shows 0% or 100%

**Cause**: Incorrect calibration values

**Solutions**:
1. Check raw ADC values (uncomment debug line)
2. Recalibrate based on actual sensor readings
3. Verify sensor is connected properly
4. Check if sensor is inverted (swap DRY/WET values)

### No Data in Database

**Cause**: Multiple possible issues

**Solutions**:
1. Check WiFi connection (ESP32 should connect to WiFi)
2. Check Serial Monitor for error messages
3. Verify Supabase URL and anon key are correct
4. Verify `zone_id` is correct
5. Check RLS policies
6. Check Supabase logs

### Zone ID Not Found

**Cause**: Zone doesn't exist or wrong UUID

**Solutions**:
1. Verify zone exists in `zones` table
2. Copy the exact UUID (including hyphens)
3. Update `ZONE_ID` in Arduino code
4. Ensure zone belongs to a valid user

## Security Considerations

### Current Setup (Development)
- Uses anon key (public)
- Allows anonymous inserts to telemetry
- Users can only see their own data (RLS)

### Production Recommendations
1. **Use service role key** for ESP32 devices (keep it secret!)
2. **Implement device authentication** (API keys, JWT tokens)
3. **Use Supabase Edge Functions** as a secure proxy
4. **Rate limiting** to prevent abuse
5. **Input validation** on Edge Functions
6. **Monitor and log** all database access

## File Structure

```
Aura-Farming/
├── database_schema.sql          # Database schema and policies
├── IMPLEMENTATION_SUMMARY.md    # This file
├── Hardware/
│   ├── SETUP_GUIDE.md          # Setup instructions
│   └── aura_farming_esp32/
│       └── aura_farming_esp32.ino  # Arduino code
└── frontend/
    └── src/                    # Frontend code (unchanged)
```

## Support

If you encounter issues:
1. Check Serial Monitor output
2. Check Supabase logs
3. Verify database schema is correct
4. Verify RLS policies are enabled
5. Check sensor calibration values
6. Verify WiFi connection

## Notes

- The `telemetry` table uses `id` as primary key (auto-increment), NOT `zone_id`
- Multiple telemetry records can have the same `zone_id` (this is correct!)
- The RLS policy allows anonymous inserts, which is needed for ESP32 devices
- Sensor calibration values should be adjusted based on your specific sensors
- The code uses EMA and median filtering for stable readings

