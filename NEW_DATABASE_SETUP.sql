-- ============================================================================
-- Setup Script for New Supabase Database
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ZONES TABLE (if it doesn't exist)
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

-- Policy: Allow all users to read zones
CREATE POLICY "Allow read zones" ON zones
  FOR SELECT USING (true);

-- Policy: Allow authenticated users to insert/update/delete zones
CREATE POLICY "Allow insert zones" ON zones
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update zones" ON zones
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow delete zones" ON zones
  FOR DELETE TO authenticated USING (true);

-- ----------------------------------------------------------------------------
-- 2. TELEMETRY TABLE (if it doesn't exist)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS telemetry (
  id BIGSERIAL PRIMARY KEY,
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE NOT NULL,
  ts TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  moisture NUMERIC(5,2) NOT NULL CHECK (moisture >= 0 AND moisture <= 100),
  rain BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL CHECK (status IN ('dry', 'moist', 'wet'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_telemetry_zone_id ON telemetry(zone_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_ts ON telemetry(ts DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_zone_ts ON telemetry(zone_id, ts DESC);

-- Enable RLS on telemetry
ALTER TABLE telemetry ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all users to read telemetry
CREATE POLICY "Allow read telemetry" ON telemetry
  FOR SELECT USING (true);

-- Policy: Allow anonymous users to insert telemetry (for ESP32 devices)
-- This is CRITICAL for your Arduino code to work!
DROP POLICY IF EXISTS "Allow anon insert telemetry" ON telemetry;
CREATE POLICY "Allow anon insert telemetry" ON telemetry
  FOR INSERT TO anon
  WITH CHECK (true);

-- Policy: Allow authenticated users to insert telemetry
CREATE POLICY "Allow authenticated insert telemetry" ON telemetry
  FOR INSERT TO authenticated
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
-- 4. CREATE A TEST ZONE (optional - you can create zones via the app too)
-- ----------------------------------------------------------------------------
-- Uncomment and modify this to create a test zone:
-- INSERT INTO zones (name, crop_type, watering_amount_l)
-- VALUES ('Test Zone', 'Tomatoes', 10)
-- ON CONFLICT DO NOTHING
-- RETURNING id;
-- 
-- Copy the returned UUID and use it as ZONE_ID in your Arduino code

-- ----------------------------------------------------------------------------
-- VERIFICATION QUERIES
-- ----------------------------------------------------------------------------
-- Run these to verify everything is set up correctly:

-- Check if tables exist:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check RLS policies:
-- SELECT * FROM pg_policies WHERE tablename = 'telemetry';

-- Check zones:
-- SELECT id, name FROM zones;

-- Check telemetry (should be empty initially):
-- SELECT COUNT(*) FROM telemetry;

-- ============================================================================

