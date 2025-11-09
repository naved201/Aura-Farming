/*
 * Aura Farming – ESP32 (LilyGo T-Display compatible)
 * Standalone soil moisture + rain → Supabase (telemetry)
 * Sends: { moisture (0–100), rain (bool), status ("dry"|"moist"|"wet") }
 * DB timestamp is filled by the DB (default NOW()).
 *
 * Pins:
 *   Soil sensor  -> GPIO 36 (VP, ADC)
 *   Rain sensor  -> GPIO 34 (ADC or digital; here read as ADC)
 *
 * NOTES:
 * - Use a 2.4 GHz Wi-Fi network (ESP32 won’t join 5 GHz).
 * - This demo posts directly to Supabase REST with the anon key.
 *   For production, use a Supabase Edge Function + service key.
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ======== WIFI (EDIT THESE) ========
// ⚠️ REPLACE WITH YOUR ACTUAL WiFi CREDENTIALS ⚠️
const char* ssid     = "Naved";       // 2.4 GHz - REPLACE THIS!
const char* password = "BANGLADESH";   // exact case - REPLACE THIS!

// ======== SUPABASE (EDIT THESE) ========
const char* supabaseUrl     = "https://sxserhbozsmqbyninsbq.supabase.co";          // no trailing slash
const char* supabaseRestUrl = "https://sxserhbozsmqbyninsbq.supabase.co/rest/v1";  // REST endpoint
const char* supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4c2VyaGJvenNtcWJ5bmluc2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MjM0MDQsImV4cCI6MjA3ODE5OTQwNH0.WGZfUuLU5Ug0FH6RCwl2RE8F89FqP--qtBhe8ENZ8r0";             // anon key

// ======== TABLE / OPTIONAL FK ========
const char* TELEMETRY_TABLE = "telemetry";
// ⚠️ REPLACE WITH ONE OF YOUR ZONE UUIDs FROM SUPABASE ⚠️
// You have Zone 7, Zone 6, Zone 5 - use one of their UUIDs
const char* DEFAULT_ZONE_ID = "04086384-6695-4760-b118-d58beb5bf8c7";

// ======== PINS ========
const int SOIL_SENSOR_PIN = 36;   // ADC1_CH0 (VP)
const int RAIN_SENSOR_PIN = 34;   // ADC1_CH6

// ======== SENSOR CALIBRATION ========
// Measure raw ADC in DRY air/soil and in fully WET conditions, then adjust.
const int ADC_DRY = 4095;   // raw ADC when dry
const int ADC_WET = 1500;   // raw ADC when fully wet
const float RAIN_THRESHOLD = 30.0f; // % from rain sensor above which we call it “raining”

// ======== TIMING ========
const unsigned long SENSOR_READ_INTERVAL = 30UL * 1000UL; // 30 s
const unsigned long WIFI_CHECK_INTERVAL  = 60UL * 1000UL; // 60 s

// ======== STATE ========
unsigned long lastSensorRead = 0;
unsigned long lastWiFiCheck  = 0;

// ======== HELPERS ========
static float clampf(float v, float a, float b) { return v < a ? a : (v > b ? b : v); }

// Convert raw ADC → moisture percentage (0 dry … 100 wet) using your calibration.
float adcToPercent(int raw) {
  int lo = min(ADC_DRY, ADC_WET);
  int hi = max(ADC_DRY, ADC_WET);
  if (raw < lo) raw = lo;
  if (raw > hi) raw = hi;

  // t goes 0→1 from dry to wet
  float t = (float)(raw - ADC_DRY) / (float)(ADC_WET - ADC_DRY);
  t = clampf(t, 0.0f, 1.0f);
  return t * 100.0f;
}

String statusFromMoisture(float pct) {
  if (pct < 35.0f) return "dry";
  if (pct <= 70.0f) return "moist";
  return "wet";
}

// ======== WIFI ========
void connectToWiFi() {
  Serial.printf("Connecting to WiFi: %s\n", ssid);

  WiFi.persistent(false);          // don't write creds to flash
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true, true);     // stop in-flight connect & clear
  delay(200);

  WiFi.begin(ssid, password);

  const unsigned long TIMEOUT = 15000; // 15 s
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < TIMEOUT) {
    delay(250);
    Serial.print(".");
  }

  wl_status_t st = WiFi.status();
  if (st == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connected!");
    Serial.print("IP: ");   Serial.println(WiFi.localIP());
    Serial.print("RSSI: "); Serial.print(WiFi.RSSI()); Serial.println(" dBm");
  } else {
    Serial.println("\n❌ WiFi connection failed.");
    // ESP32 common codes: 0=IDLE,1=NO_SSID_AVAIL,3=CONNECTED,4=CONNECT_FAILED,5=CONNECTION_LOST,6=DISCONNECTED
    Serial.printf("Status: %d (0 idle,1 no-ssid,4 connect-failed,5 lost,6 disconnected)\n", (int)st);
    Serial.println("Will retry later…");
  }
}

bool shouldReconnect() {
  wl_status_t st = WiFi.status();
  // Keep it simple; no WL_WRONG_PASSWORD on ESP32 core
  return (st == WL_DISCONNECTED ||
          st == WL_IDLE_STATUS ||
          st == WL_NO_SSID_AVAIL ||
          st == WL_CONNECT_FAILED ||
          st == WL_CONNECTION_LOST);
}

// ======== HTTP POST → SUPABASE ========
bool postTelemetry(float moisturePct, bool rain, const String& status) {
  if (WiFi.status() != WL_CONNECTED) return false;

  // Build JSON payload with only the needed fields
  StaticJsonDocument<256> doc;
  doc["zone_id"] = DEFAULT_ZONE_ID;           // Zone ID (required by schema)
  doc["moisture"] = moisturePct;              // Float percentage (0-100)
  doc["rain"]     = rain;                     // Send as boolean (true/false) - ArduinoJson handles this
  doc["status"]   = status;                   // "dry"|"moist"|"wet"
  String payload;
  serializeJson(doc, payload);

  WiFiClientSecure client;
  client.setInsecure(); // OK for demos. Consider certificate pinning for production.

  HTTPClient http;
  const String endpoint = String(supabaseRestUrl) + "/" + TELEMETRY_TABLE;
  if (!http.begin(client, endpoint)) {
    Serial.println("⚠️  HTTP begin() failed");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseAnonKey);
  http.addHeader("Authorization", String("Bearer ") + supabaseAnonKey);
  http.addHeader("Prefer", "return=representation");

  int code = http.POST(payload);
  String resp = http.getString();
  http.end();

  if (code == 200 || code == 201) return true;

  Serial.print("⚠️  HTTP ");
  Serial.print(code);
  Serial.print(": ");
  if (resp.length() > 0 && resp.length() < 300) Serial.println(resp);
  else Serial.println("error");
  return false;
}

// ======== SENSOR READING ========
int readAveragedADC(int pin, int samples = 5, int delayMs = 40) {
  long sum = 0;
  for (int i = 0; i < samples; ++i) {
    sum += analogRead(pin);
    delay(delayMs);
  }
  return (int)(sum / samples);
}

void readAndSendOnce() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️  WiFi not connected. Skipping upload.");
    return;
  }

  Serial.println("\n--- Reading sensors ---");
  int soilRaw = readAveragedADC(SOIL_SENSOR_PIN);
  int rainRaw = readAveragedADC(RAIN_SENSOR_PIN);

  float soilPct = adcToPercent(soilRaw);
  float rainPct = adcToPercent(rainRaw);
  bool  raining = (rainPct >= RAIN_THRESHOLD);
  String stat   = statusFromMoisture(soilPct);

  Serial.printf("Soil(GPIO36) raw=%d  -> %.1f%%  status=%s\n", soilRaw, soilPct, stat.c_str());
  Serial.printf("Rain(GPIO34) raw=%d  -> %.1f%%  raining=%s\n", rainRaw, rainPct, raining ? "YES" : "NO");

  Serial.print("📤 Sending to Supabase… ");
  bool ok = postTelemetry(soilPct, raining, stat);
  Serial.println(ok ? "✅" : "❌");
}

// ======== SETUP / LOOP ========
void setup() {
  Serial.begin(115200);
  delay(300);

  pinMode(SOIL_SENSOR_PIN, INPUT);  // 34/36 are input-only, pinMode is harmless
  pinMode(RAIN_SENSOR_PIN, INPUT);

  connectToWiFi();
  Serial.println("\nAura Farming – ESP32 ready.");
}

void loop() {
  // Wi-Fi health check
  if (millis() - lastWiFiCheck >= WIFI_CHECK_INTERVAL) {
    if (shouldReconnect()) {
      Serial.println("⚠️  WiFi lost. Reconnecting…");
      connectToWiFi();
    }
    lastWiFiCheck = millis();
  }

  // Periodic telemetry
  if (millis() - lastSensorRead >= SENSOR_READ_INTERVAL) {
    readAndSendOnce();
    lastSensorRead = millis();
  }

  delay(50);
}
