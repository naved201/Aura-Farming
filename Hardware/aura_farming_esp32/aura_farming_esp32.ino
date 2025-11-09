/*
 * Aura Farming — ESP32 Feather V2 (LM393 D0 → boolean moisture)
 * Sends to Supabase table `telemetry`:
 *   { zone_id uuid, ts timestamptz, moisture float, rain bool, status text }
 *
 * Wiring (LM393 soil board):
 *   VCC → 3V
 *   GND → GND
 *   D0  → GPIO26  (change PIN_SOIL_DO if you prefer another GPIO)
 *
 * Notes:
 * - LM393 D0 is a digital comparator output (threshold set by trim-pot).
 * - Typically D0 == LOW means WET, HIGH means DRY. If yours is flipped,
 *   set WET_IS_LOW=false below.
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

/*** WIFI (edit) ***/
const char* WIFI_SSID = "Naved";
const char* WIFI_PASS = "BANGLADESH";

/*** SUPABASE (edit) ***/
// Get these from Supabase Settings → API. REST base must end in /rest/v1
const char* SUPABASE_REST = "https://nuxiembmbwigfamnyplw.supabase.co/rest/v1";
const char* SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51eGllbWJtYndpZ2ZhbW55cGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MjQzMTEsImV4cCI6MjA3ODIwMDMxMX0.JATKR6lo6jFKa4L8h16UN6L5c-tfAPL0CnIc-BmAnbM";
const char* TELEMETRY_TABLE = "telemetry";
const char* ZONE_ID = "3df4a873-0086-469d-b5ac-8249b59112c6";  // your zone UUID

/*** Pins (digital D0) ***/
const int PIN_SOIL_DO = 26;    // D0 → this GPIO
const bool WET_IS_LOW = true;  // typical LM393 boards: LOW = wet, HIGH = dry

/*** Cadence ***/
const unsigned long SENSOR_PERIOD_MS = 30UL * 1000UL;  // how often to send
const unsigned long WIFI_CHECK_MS    = 60UL * 1000UL;  // Wi-Fi health

/*** Debounce / majority filter for D0 ***/
const int   DO_SAMPLES    = 9;   // number of quick samples
const int   DO_SAMPLE_MS  = 5;   // gap between samples

/*** State ***/
unsigned long lastSensorMs = 0, lastWiFiMs = 0;

/*** Time (UTC ISO) ***/
void syncTime(){
  if (WiFi.status()!=WL_CONNECTED) return;
  configTime(0,0,"pool.ntp.org","time.nist.gov");
  struct tm ti;
  for(int i=0;i<10;i++){ if(getLocalTime(&ti)) return; delay(300); }
}
String isoNow(){
  struct tm ti; 
  if(!getLocalTime(&ti)) return "";  // DB will default NOW() if empty
  char buf[30];
  snprintf(buf,sizeof(buf),"%04d-%02d-%02dT%02d:%02d:%02dZ",
           ti.tm_year+1900,ti.tm_mon+1,ti.tm_mday,ti.tm_hour,ti.tm_min,ti.tm_sec);
  return String(buf);
}

/*** Wi-Fi ***/
void wifiConnect(){
  Serial.printf("Wi-Fi → %s\n", WIFI_SSID);
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true,true);
  delay(150);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long t0=millis();
  while(WiFi.status()!=WL_CONNECTED && millis()-t0<15000){ delay(250); Serial.print("."); }
  Serial.println();
  if(WiFi.status()==WL_CONNECTED){
    Serial.printf("✅ IP=%s  RSSI=%d dBm\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
    syncTime();
  } else {
    Serial.println("❌ Wi-Fi failed (will retry)");
  }
}
bool wifiShouldReconnect(){
  wl_status_t s = WiFi.status();
  return (s==WL_DISCONNECTED||s==WL_IDLE_STATUS||s==WL_NO_SSID_AVAIL||
          s==WL_CONNECTION_LOST||s==WL_CONNECT_FAILED);
}

/*** Supabase POST ***/
bool postTelemetry(float moisturePct, bool rain, const String& status){
  if (WiFi.status()!=WL_CONNECTED) return false;

  StaticJsonDocument<256> doc;
  doc["zone_id"]  = ZONE_ID;
  doc["moisture"] = moisturePct;   // 0 or 100 in this D0 mode
  doc["rain"]     = rain;          // still false for now
  doc["status"]   = status;        // "dry" or "wet"
  String ts = isoNow();
  if (ts.length() > 0) doc["ts"] = ts;

  String payload; serializeJson(doc, payload);

  WiFiClientSecure tls; tls.setInsecure();   // OK for demo
  HTTPClient http;
  String url = String(SUPABASE_REST) + "/" + TELEMETRY_TABLE;

  if(!http.begin(tls, url)){ Serial.println("HTTP begin() failed"); return false; }
  http.addHeader("Content-Type","application/json");
  http.addHeader("apikey", SUPABASE_ANON);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON);
  http.addHeader("Prefer","return=representation");

  int code = http.POST(payload);
  String body = http.getString();
  http.end();

  if(code==200 || code==201){ Serial.println("POST ✓"); return true; }

  Serial.printf("POST ✗ %d\n", code);
  if(body.length() && body.length()<300) Serial.println(body);
  return false;
}

/*** Read D0 with majority filter ***/
bool readWetBool(){
  // sample DO multiple times and take majority to avoid chatter
  int lows = 0, highs = 0;
  for(int i=0;i<DO_SAMPLES;i++){
    int v = digitalRead(PIN_SOIL_DO);
    if (v==LOW) lows++; else highs++;
    delay(DO_SAMPLE_MS);
  }
  bool lineLow = (lows > highs);
  // interpret based on board polarity
  return WET_IS_LOW ? lineLow : !lineLow;   // true = WET
}

/*** Read + send ***/
void readAndSend(){
  bool isWet = readWetBool();
  float moisturePercent = isWet ? 100.0f : 0.0f;  // binary for D0 mode
  String status = isWet ? "wet" : "dry";

  Serial.printf("[D0] %s -> %.1f%% (%s)\n", isWet?"WET":"DRY", moisturePercent, status.c_str());
  postTelemetry(moisturePercent, /*rain=*/false, status);
}

/*** Setup / loop ***/
void setup(){
  Serial.begin(115200);
  delay(300);

  pinMode(PIN_SOIL_DO, INPUT);      // LM393 actively drives the line
  // If you see flicker with long wires, try INPUT_PULLUP:
  // pinMode(PIN_SOIL_DO, INPUT_PULLUP);

  wifiConnect();
}

void loop(){
  if(millis()-lastWiFiMs >= WIFI_CHECK_MS){
    if(wifiShouldReconnect()) wifiConnect();
    lastWiFiMs = millis();
  }
  if(millis()-lastSensorMs >= SENSOR_PERIOD_MS){
    readAndSend();
    lastSensorMs = millis();
  }
  delay(10);
}
