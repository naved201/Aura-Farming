# How to Link New Supabase Database to Arduino Code

## Step 1: Get Your New Supabase Credentials

1. **Open your new Supabase project** (the one with URL containing `nuxiembmbwigfamnyplw`)

2. **Get the Project URL:**
   - Go to **Settings** → **API** (in the left sidebar)
   - Copy the **Project URL** (looks like: `https://nuxiembmbwigfamnyplw.supabase.co`)
   - You'll use this to create the REST URL: `https://nuxiembmbwigfamnyplw.supabase.co/rest/v1`

3. **Get the Anon Key:**
   - In the same **Settings** → **API** page
   - Under **Project API keys**, copy the **`anon` `public`** key
   - This is a long JWT token starting with `eyJ...`

## Step 2: Get Your Zone ID

1. **Create a zone in your new database:**
   - Go to **Table Editor** → **zones** table
   - Click **Insert** → **Insert row**
   - Fill in:
     - `name`: e.g., "Zone 1"
     - `crop_type`: (optional)
     - `watering_amount_l`: (optional)
     - `auto_irrigation_enabled`: (optional)
   - Click **Save**
   - Copy the `id` (UUID) from the created row

2. **Or use SQL to create a zone:**
   ```sql
   INSERT INTO zones (name) 
   VALUES ('Zone 1') 
   RETURNING id;
   ```
   Copy the returned UUID.

## Step 3: Set Up RLS Policies

Your table shows "RLS disabled" - you need to enable it:

1. **Enable RLS:**
   ```sql
   ALTER TABLE telemetry ENABLE ROW LEVEL SECURITY;
   ```

2. **Create policy to allow anonymous inserts:**
   ```sql
   CREATE POLICY "Allow anon insert telemetry" ON telemetry
     FOR INSERT 
     TO anon
     WITH CHECK (true);
   ```

3. **Create policy to allow reads:**
   ```sql
   CREATE POLICY "Allow read telemetry" ON telemetry
     FOR SELECT 
     USING (true);
   ```

## Step 4: Update Arduino Code

Update these values in `aura_farming_esp32.ino`:

```cpp
/*** SUPABASE (edit) ***/
const char* SUPABASE_REST = "https://YOUR_NEW_PROJECT_URL.supabase.co/rest/v1";
const char* SUPABASE_ANON = "YOUR_NEW_ANON_KEY";
const char* TELEMETRY_TABLE = "telemetry";
const char* ZONE_ID = "YOUR_NEW_ZONE_UUID";
```

Replace:
- `YOUR_NEW_PROJECT_URL` → Your project URL (e.g., `nuxiembmbwigfamnyplw`)
- `YOUR_NEW_ANON_KEY` → Your new anon key from Step 1
- `YOUR_NEW_ZONE_UUID` → Your zone ID from Step 2

## Step 5: Verify Table Structure

Make sure your `telemetry` table has these columns:
- `id` (bigserial, primary key) - auto-generated
- `zone_id` (uuid) - references zones table
- `ts` (timestamptz) - timestamp
- `moisture` (numeric/float) - 0-100
- `rain` (boolean) - true/false
- `status` (text) - "dry", "moist", or "wet"

## Step 6: Test the Connection

1. Upload the updated code to ESP32
2. Open Serial Monitor (115200 baud)
3. Check for:
   - `POST ✓` → Success!
   - `POST ✗ -1` → WiFi/connection issue
   - `POST ✗ 401` → Wrong anon key
   - `POST ✗ 42501` → RLS policy issue

## Quick Checklist

- [ ] Got new Supabase URL
- [ ] Got new anon key
- [ ] Created zone and got zone_id
- [ ] Enabled RLS on telemetry table
- [ ] Created "Allow anon insert telemetry" policy
- [ ] Updated Arduino code with new credentials
- [ ] Uploaded code to ESP32
- [ ] Verified data appears in Supabase table

