-- ============================================================================
-- Aura Farming Database Schema
-- Supabase SQL for tables, constraints, and RLS policies
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ZONES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  crop_type TEXT,
  watering_amount_l NUMERIC,
  auto_irrigation_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on name for faster queries
CREATE INDEX IF NOT EXISTS idx_zones_name ON zones(name);

-- Enable RLS on zones
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all users to read zones (adjust as needed)
CREATE POLICY "Allow read zones" ON zones
  FOR SELECT USING (true);

-- Policy: Allow authenticated users to insert zones
CREATE POLICY "Allow insert zones" ON zones
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated users to update zones
CREATE POLICY "Allow update zones" ON zones
  FOR UPDATE 
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to delete zones
CREATE POLICY "Allow delete zones" ON zones
  FOR DELETE 
  TO authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- 2. TELEMETRY TABLE (linked to zones)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS telemetry (
  id BIGSERIAL PRIMARY KEY,
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE NOT NULL,
  ts TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  moisture NUMERIC(5,2) NOT NULL CHECK (moisture >= 0 AND moisture <= 100),
  rain BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL CHECK (status IN ('dry', 'moist', 'wet'))
);

-- Add created_at column if it doesn't exist (for backward compatibility)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'telemetry' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE telemetry ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_telemetry_zone_id ON telemetry(zone_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_ts ON telemetry(ts DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_zone_ts ON telemetry(zone_id, ts DESC);

-- Enable RLS on telemetry
ALTER TABLE telemetry ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all users to read telemetry (adjust as needed)
CREATE POLICY "Allow read telemetry" ON telemetry
  FOR SELECT USING (true);

-- Policy: Allow anon/service role to insert telemetry (for ESP32 devices)
-- This allows the Arduino code to post data using the anon key
-- NOTE: If you get error 42501, this policy might not exist or be disabled
DROP POLICY IF EXISTS "Allow anon insert telemetry" ON telemetry;
CREATE POLICY "Allow anon insert telemetry" ON telemetry
  FOR INSERT 
  TO anon
  WITH CHECK (true);

-- Policy: Allow authenticated users to insert telemetry
CREATE POLICY "Allow authenticated insert telemetry" ON telemetry
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 3. FUNCTION: Update updated_at timestamp
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for zones table
DROP TRIGGER IF EXISTS update_zones_updated_at ON zones;
CREATE TRIGGER update_zones_updated_at
  BEFORE UPDATE ON zones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4. DROP VIEW: Remove telemetry_with_zone view if it exists
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS telemetry_with_zone;

-- ----------------------------------------------------------------------------
-- NOTES:
-- ----------------------------------------------------------------------------
-- 1. To allow ESP32 devices to insert telemetry:
--    - Use the "Allow anon insert telemetry" policy (already created above)
--    - OR use Supabase service role key in ESP32 (more secure)
--    - OR create a service account with specific permissions
--
-- 2. To get zone_id for your ESP32 device:
--    - Query zones table: SELECT id FROM zones WHERE name = '<zone_name>';
--    - Or use Supabase dashboard to copy the UUID from the zones table
--
-- 3. To verify RLS policies:
--    - Test as authenticated user: Should be able to read/insert/update/delete
--    - Test as anon: Should be able to insert telemetry but not modify zones
--
-- 4. Sensor calibration values in ESP32 code:
--    - SOIL_ADC_DRY: ADC reading when soil is completely dry
--    - SOIL_ADC_WET: ADC reading when soil is fully saturated
--    - Adjust these based on actual sensor readings
-- ============================================================================
