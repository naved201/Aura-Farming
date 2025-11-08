# Troubleshooting Sign Up / Login Issues

## Common Issues and Solutions

### Issue 1: "An unexpected error occurred" or Network Errors

**Symptoms:**
- Error message: "An unexpected error occurred. Please try again."
- Error message: "Network error: Check CORS settings..."

**Solutions:**

1. **Check Browser Console (F12)**
   - Open browser console (F12 → Console tab)
   - Look for specific error messages
   - Common errors:
     - `Failed to fetch` → CORS issue
     - `Network request failed` → Internet connection or CORS
     - `Invalid API key` → Wrong Supabase credentials

2. **Configure CORS in Supabase**
   - Go to Supabase Dashboard → Settings → API
   - Scroll to "Allowed CORS origins"
   - Add your localhost URL:
     - `http://localhost:5173` (or whatever port you're using)
     - `http://localhost:5174` (if using port 5174)
   - Click **Save**

3. **Verify Supabase Credentials**
   - Check `frontend/src/config.js`
   - Verify `SUPABASE_URL` is correct
   - Verify `SUPABASE_ANON_KEY` is correct
   - Get these from: Supabase Dashboard → Settings → API

### Issue 2: SQL Schema Not Run

**Symptoms:**
- Sign up works but profile not created
- Error when trying to access profile data

**Solutions:**

1. **Run SQL Migration**
   - Go to Supabase Dashboard → SQL Editor
   - Click "New Query"
   - Copy entire contents of `sql_database_corrected.sql`
   - Paste into SQL Editor
   - Click **Run** (or press Cmd/Ctrl + Enter)
   - Should see: "Success. No rows returned"

2. **Verify Tables Created**
   - Go to Supabase Dashboard → Table Editor
   - Check if these tables exist:
     - `profiles`
     - `zones`
     - `rules`
     - `telemetry`

3. **Verify Trigger Created**
   - Go to Supabase Dashboard → Database → Functions
   - Look for `handle_new_user` function
   - Should exist if SQL was run successfully

### Issue 3: Email Verification Required

**Symptoms:**
- Sign up succeeds but can't login
- "Email not confirmed" error

**Solutions:**

1. **Check Email**
   - Check your email inbox (and spam folder)
   - Look for verification email from Supabase
   - Click the verification link

2. **Disable Email Verification (Development Only)**
   - Go to Supabase Dashboard → Authentication → Settings
   - Under "Email Auth", toggle off "Confirm email"
   - **Warning:** Only do this for development/testing

### Issue 4: Profile Not Created After Sign Up

**Symptoms:**
- User created but no profile in `profiles` table

**Solutions:**

1. **Check SQL Trigger**
   - Verify `on_auth_user_created` trigger exists
   - Go to Supabase Dashboard → Database → Functions
   - Look for `handle_new_user` function

2. **Check Supabase Logs**
   - Go to Supabase Dashboard → Logs
   - Look for errors related to `handle_new_user`
   - Check if trigger is firing

3. **Manually Create Profile (Temporary Fix)**
   - Go to Supabase Dashboard → Table Editor → `profiles`
   - Click "Insert row"
   - Add user's UUID (from `auth.users` table)
   - Add display_name
   - Save

### Issue 5: "Failed to fetch" Error

**Symptoms:**
- Error: "Failed to fetch" in console
- Network request fails

**Solutions:**

1. **Check Internet Connection**
   - Verify you're connected to internet
   - Try accessing Supabase dashboard in browser

2. **Check CORS Settings**
   - See Issue 1, Solution 2 above

3. **Check Supabase URL**
   - Verify URL in `config.js` is correct
   - Should be: `https://[your-project].supabase.co`
   - No trailing slash

### Issue 6: Wrong Port in CORS

**Symptoms:**
- Works on one port but not another
- CORS errors

**Solutions:**

1. **Check What Port You're Using**
   - Look at terminal output when running `npm run dev`
   - Should show: `Local: http://localhost:XXXX/`

2. **Add All Ports to CORS**
   - Add both `http://localhost:5173` and `http://localhost:5174`
   - Or use wildcard: `http://localhost:*` (if supported)

## Step-by-Step Debugging

### Step 1: Check Browser Console
1. Open browser (F12)
2. Go to Console tab
3. Try to sign up
4. Look for error messages
5. Copy any red error messages

### Step 2: Check Network Tab
1. In DevTools, go to Network tab
2. Try to sign up
3. Look for failed requests (red)
4. Click on failed request
5. Check "Response" tab for error details

### Step 3: Verify Supabase Setup
1. Go to Supabase Dashboard
2. Check Settings → API for URL and key
3. Verify they match `config.js`
4. Check CORS settings

### Step 4: Verify SQL Migration
1. Go to Supabase Dashboard → Table Editor
2. Check if `profiles` table exists
3. If not, run SQL migration

### Step 5: Test Supabase Connection
In browser console, try:
```javascript
// Check if Supabase is loaded
console.log('Supabase:', window.supabase);

// Try to create a client
const { createClient } = window.supabase;
const testClient = createClient('YOUR_URL', 'YOUR_KEY');
console.log('Client:', testClient);
```

## Quick Checklist

- [ ] SQL migration run in Supabase
- [ ] CORS configured with correct localhost URL
- [ ] Supabase URL correct in `config.js`
- [ ] Supabase anon key correct in `config.js`
- [ ] Browser console checked for errors
- [ ] Network tab checked for failed requests
- [ ] Internet connection working
- [ ] Email verification disabled (if needed for testing)

## Still Having Issues?

1. **Check Browser Console** - Most errors will show here
2. **Check Supabase Logs** - Dashboard → Logs
3. **Verify All Steps** - Go through checklist above
4. **Share Error Messages** - Copy exact error from console

The improved error handling should now show more specific error messages. Check the browser console (F12) to see the actual error!

