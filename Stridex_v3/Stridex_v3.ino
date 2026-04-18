/*
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║              STRIDEX v3.4  —  WROOM-DA Hack Firmware            ║
 * ║   ESP32-WROOM-DA · MPU6050 · HC-SR04 · Buzzer GPIO2 · Motor    ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 *  CHANGES IN v3.4 (WROOM-DA ANTENNA OVERRIDE)
 *  ────────────────────────────────────────────────────────────────
 *  1. WIFI GPIO2 BUZZING FIX: WROOM-DA uses GPIO2 for antenna 
 *     switching. Added esp_wifi_set_ant() to lock the antenna 
 *     and aggressive ledcDetachPin() to float the buzzer pin.
 *  2. RTOS MULTI-THREADING: Firebase moved to Core 0 task.
 *  3. I2C DEADLOCK FIX: Wire.setTimeOut(20) stops loop freezing.
 */

// ═══════════════════════════════════════════════════════════════════
//  COMPILE SWITCH
// ═══════════════════════════════════════════════════════════════════
//#define DEBUG_HW_ONLY
#define ENABLE_FIREBASE

// ═══════════════════════════════════════════════════════════════════
//  FIREBASE CREDENTIALS
// ═══════════════════════════════════════════════════════════════════
#ifdef ENABLE_FIREBASE
  #define WIFI_SSID      "WiFu_uWu 4G"
  #define WIFI_PASS      "yametekudasai"
  #define FIREBASE_HOST  "smart-shoe-001a-default-rtdb.asia-southeast1.firebasedatabase.app"
  #define FIREBASE_PATH  "/stridex.json"
  #define UPLOAD_INTERVAL_MS  2000
#endif

// ═══════════════════════════════════════════════════════════════════
//  PIN MAP
// ═══════════════════════════════════════════════════════════════════
#define PIN_BUZZER   2     
#define PIN_MOTOR    19    
#define PIN_TRIG     18    
#define PIN_ECHO     5     

#define LEDC_CH      0
#define LEDC_RES     8

// ═══════════════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════════════
#define STEP_LOW          0.20f   
#define STEP_HIGH         0.60f   
#define STEP_MAX          2.20f   
#define STEP_DEBOUNCE_MS  270     
#define STRIDE_M          0.70f   
#define BUZZ_STEP_LOCKOUT_MS  350

#define RUN_INTERVAL_MS   650
#define WALK_INTERVAL_MS  1000

#define POSTURE_TOLERANCE   12.0f
#define POSTURE_HYSTERESIS   3.0f   
#define POSTURE_CONFIRM_MS   400
#define POSTURE_RECOVER_MS   600

#define OBSTACLE_DIST_CM     20
#define OBSTACLE_MIN_CM       2
#define OBSTACLE_MAX_CM     400
#define OBSTACLE_COOLDOWN_MS 2000

#define IMU_INTERVAL_MS      20   
#define OBSTACLE_INTERVAL_MS 200  
#define CALIB_SAMPLES        60   

// ═══════════════════════════════════════════════════════════════════
//  INCLUDES
// ═══════════════════════════════════════════════════════════════════
#include <Wire.h>
#include <math.h>

#ifdef ENABLE_FIREBASE
  #include <WiFi.h>
  #include <WiFiClientSecure.h>
  #include <HTTPClient.h>   
  #include <esp_wifi.h>     // REQUIRED TO RE-PROGRAM WROOM-DA ANTENNA
#endif

#define MPU_ADDR          0x68
#define REG_PWR_MGMT_1    0x6B
#define REG_WHO_AM_I      0x75
#define REG_ACCEL_XOUT_H  0x3B
#define ACCEL_SCALE       16384.0f

// ═══════════════════════════════════════════════════════════════════
//  TONE SEQUENCER
// ═══════════════════════════════════════════════════════════════════
struct ToneStep { uint16_t freq; uint16_t ms; };

const ToneStep TONE_BAD[] = { {1000, 200}, {0, 80}, {700, 200}, {0, 80}, {400, 300}, {0, 0} };
const ToneStep TONE_GOOD[] = { {400, 120}, {0, 60}, {700, 120}, {0, 60}, {1100, 250}, {0, 0} };
const ToneStep TONE_OBSTACLE[] = { {1200, 100}, {0, 50}, {1200, 100}, {0, 50}, {1200, 100}, {0, 50}, {1200, 100}, {0, 0} };

const ToneStep* g_toneSeq    = nullptr;
uint8_t         g_toneIdx    = 0;
unsigned long   g_toneStepMs = 0;
volatile bool   g_tonePlaying= false;
unsigned long   g_toneEndMs  = 0;    
unsigned long   g_lastToneMs = 0;
#define TONE_COOLDOWN_MS 3500

// ═══════════════════════════════════════════════════════════════════
//  MOTOR SEQUENCER
// ═══════════════════════════════════════════════════════════════════
struct MotorStep { uint16_t on_ms; uint16_t off_ms; };

const MotorStep MOTOR_BAD[] = { {1500, 0}, {0, 0} };
const MotorStep MOTOR_GOOD[] = { {80, 0}, {0, 0} };
const MotorStep MOTOR_OBSTACLE[] = { {120, 80}, {120, 80}, {120, 0}, {0, 0} };

#define MOTOR_COOLDOWN_MS 3500
const MotorStep* g_motorSeq    = nullptr;
uint8_t          g_motorIdx    = 0;
unsigned long    g_motorStepMs = 0;
volatile bool    g_motorActive = false;
volatile bool    g_motorPinOn  = false;
unsigned long    g_lastMotorMs = 0;

// ═══════════════════════════════════════════════════════════════════
//  GLOBAL STATE
// ═══════════════════════════════════════════════════════════════════
float g_roll = 0.0f, g_smoothRoll = 0.0f, g_neutralRoll = 0.0f;
float g_postureError = 0.0f, g_postureScore = 100.0f, g_avgRoll = 0.0f;
float g_distanceCm = 0.0f, g_motionSignal = 0.0f, g_stabilityIndex = 100.0f, g_distanceWalked = 0.0f;

unsigned long g_totalSamples = 0, g_goodPostureSamples = 0, g_rollSamples = 0, g_motionCount = 0;
float g_rollSum = 0.0f, g_motionSum = 0.0f;

enum PostureState { PS_GOOD, PS_BAD };
PostureState  g_postureState = PS_GOOD;
bool          g_inBadZone = false, g_inGoodZone = false;
unsigned long g_zoneEntryMs = 0;

const char*   g_postureLabel = "Good Posture";
const char*   g_activity     = "Idle";

int           g_stepCount = 0, g_alertCount = 0;
bool          g_stepArmed = true;
unsigned long g_stepReadyMs = 0, g_lastStepMs = 0;

unsigned long g_lastIMUMs = 0, g_lastObstacleMs = 0, g_lastObstAlertMs = 0, g_loopTick = 0;

// ═══════════════════════════════════════════════════════════════════
//  PROTOTYPES
// ═══════════════════════════════════════════════════════════════════
void calibrateNeutral();
void readMPU6050(float &ax, float &ay, float &az);
void updatePosture(float roll);
void detectStep(float sig, unsigned long now);
float measureDistanceCm();
void requestTone(const ToneStep* seq);
void serviceTone();
void requestMotor(const MotorStep* seq);
void serviceMotor();
void computeStats(float sig, bool bad);
void printDebug();
void hardwareTask(void * pvParameters); // Core 1 High-Priority Safety Task

#ifdef ENABLE_FIREBASE
  void wifiConnect();
  void sendToFirebase();
  void firebaseTask(void * pvParameters); 
  String jsonEscape(const String &s);
#endif

// ═══════════════════════════════════════════════════════════════════
//  SETUP
// ═══════════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(400);

  Serial.println(F("\n╔══════════════════════════════════╗"));
  Serial.println(F(  "║      STRIDEX v3.4  BOOT          ║"));
  Serial.println(F(  "╚══════════════════════════════════╝"));

  pinMode(PIN_MOTOR, OUTPUT); digitalWrite(PIN_MOTOR, LOW);
  pinMode(PIN_TRIG,  OUTPUT); digitalWrite(PIN_TRIG,  LOW);
  pinMode(PIN_ECHO,  INPUT);

  ledcSetup(LEDC_CH, 2000, LEDC_RES);
  
  // Detach instantly unless beeping
  ledcWriteTone(LEDC_CH, 0);
  ledcDetachPin(PIN_BUZZER);
  pinMode(PIN_BUZZER, INPUT);

  // START HARDWARE SAFETY TASK IMMEDIATELY (Prevents sticking)
  xTaskCreatePinnedToCore(hardwareTask, "HardwareTask", 2048, NULL, 2, NULL, 1);

  Serial.println(F("[HW]  Self-test: ascending chime + motor..."));
  ledcAttachPin(PIN_BUZZER, LEDC_CH);
  ledcWriteTone(LEDC_CH, 400); delay(120); ledcWriteTone(LEDC_CH, 0); delay(60);
  ledcWriteTone(LEDC_CH, 700); delay(120); ledcWriteTone(LEDC_CH, 0); delay(60);
  ledcWriteTone(LEDC_CH, 1100); delay(250); ledcWriteTone(LEDC_CH, 0);
  ledcDetachPin(PIN_BUZZER); pinMode(PIN_BUZZER, INPUT);

  digitalWrite(PIN_MOTOR, HIGH); delay(400); digitalWrite(PIN_MOTOR, LOW);
  Serial.println(F("[HW]  Self-test done."));

  // I2C SETUP WITH 20ms DEADLOCK TIMEOUT to prevent loop freezes
  Wire.begin(21, 22);
  Wire.setTimeOut(20); 
  delay(50);

  Wire.beginTransmission(MPU_ADDR);
  Wire.write(REG_PWR_MGMT_1);
  Wire.write(0x00);
  byte err = Wire.endTransmission(true);
  if (err) {
    Serial.printf("[MPU] I2C error %d — check SDA=21 SCL=22 VCC=3.3V\n", err);
    while (true) delay(1000);
  }
  delay(100);

  Wire.beginTransmission(MPU_ADDR);
  Wire.write(REG_WHO_AM_I);
  Wire.endTransmission(false);
  Wire.requestFrom((uint8_t)MPU_ADDR, (uint8_t)1, (bool)true);
  uint8_t id = Wire.available() ? Wire.read() : 0x00;
  if (id != 0x68) {
    Serial.printf("[MPU] WHO_AM_I = 0x%02X (expected 0x68) — halting.\n", id);
    while (true) delay(1000);
  }

  Serial.println(F("[CAL] Keep shoe flat and still..."));
  calibrateNeutral();
  g_smoothRoll = g_neutralRoll;

  #ifdef ENABLE_FIREBASE
    Serial.println(F("[MODE] ENABLE_FIREBASE — connecting WiFi..."));
    wifiConnect();
    // Launch background Core 0 task
    xTaskCreatePinnedToCore(firebaseTask, "FirebaseTask", 8192, NULL, 1, NULL, 0);
  #endif

  Serial.println(F("[OK]  Running.\n"));
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN LOOP
// ═══════════════════════════════════════════════════════════════════
void loop() {
  unsigned long now = millis();

  // ── A. IMU
  if (now - g_lastIMUMs >= IMU_INTERVAL_MS) {
    g_lastIMUMs = now;
    g_loopTick++;

    float ax, ay, az;
    readMPU6050(ax, ay, az);

    float mag = sqrtf(ax*ax + ay*ay + az*az);
    g_motionSignal = fabsf(mag - 1.0f);

    float rawRoll = atan2f(ay, az) * (180.0f / PI);
    g_smoothRoll  = 0.5f * g_smoothRoll + 0.5f * rawRoll;
    g_roll        = g_smoothRoll;

    g_rollSum    += g_roll;
    g_rollSamples++;
    g_avgRoll     = g_rollSum / g_rollSamples;

    updatePosture(g_roll);
    detectStep(g_motionSignal, now);
    computeStats(g_motionSignal, g_postureState == PS_BAD);

    if (g_loopTick % 50 == 0) printDebug();
  }

  // ── B. HC-SR04
  if (now - g_lastObstacleMs >= OBSTACLE_INTERVAL_MS) {
    g_lastObstacleMs = now;
    float d = measureDistanceCm();
    if (d > OBSTACLE_MIN_CM && d < OBSTACLE_MAX_CM) g_distanceCm = d;

    // Trigger obstacle alert
    if (g_distanceCm > 0 && g_distanceCm < OBSTACLE_DIST_CM && (now - g_lastObstAlertMs) > OBSTACLE_COOLDOWN_MS) {
      requestTone(TONE_OBSTACLE);
      requestMotor(MOTOR_OBSTACLE);
      g_alertCount++;
      g_lastObstAlertMs = now;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
//  HARDWARE ANTI-LOCKUP TASK (Runs freely on Core 1, Priority 2)
// ═══════════════════════════════════════════════════════════════════
void hardwareTask(void * pvParameters) {
  for(;;) {
    serviceTone();
    serviceMotor();
    vTaskDelay(10 / portTICK_PERIOD_MS); // Force preempt loop every 10ms
  }
}

// ═══════════════════════════════════════════════════════════════════
//  CALIBRATION & SENSORS
// ═══════════════════════════════════════════════════════════════════
void calibrateNeutral() {
  float sum = 0.0f;
  for (int i = 0; i < CALIB_SAMPLES; i++) {
    float ax, ay, az;
    readMPU6050(ax, ay, az);
    sum += atan2f(ay, az) * (180.0f / PI);
    delay(15);
  }
  g_neutralRoll = sum / CALIB_SAMPLES;
}

void readMPU6050(float &ax, float &ay, float &az) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(REG_ACCEL_XOUT_H);
  
  // Abort if the bus glitches
  if(Wire.endTransmission(false) != 0) return; 
  
  Wire.requestFrom((uint8_t)MPU_ADDR, (uint8_t)14, (bool)true);
  if (Wire.available() < 14) return;

  int16_t rax = ((int16_t)Wire.read() << 8) | Wire.read();
  int16_t ray = ((int16_t)Wire.read() << 8) | Wire.read();
  int16_t raz = ((int16_t)Wire.read() << 8) | Wire.read();
  Wire.read(); Wire.read();            
  for (int i = 0; i < 6; i++) Wire.read(); 

  ax = rax / ACCEL_SCALE;
  ay = ray / ACCEL_SCALE;
  az = raz / ACCEL_SCALE;
}

// ═══════════════════════════════════════════════════════════════════
//  POSTURE & STEP
// ═══════════════════════════════════════════════════════════════════
void updatePosture(float roll) {
  unsigned long now  = millis();
  g_postureError     = fabsf(roll - g_neutralRoll);
  const float BAD_T  = POSTURE_TOLERANCE;
  const float GOOD_T = POSTURE_TOLERANCE - POSTURE_HYSTERESIS;

  if (g_postureState == PS_GOOD) {
    if (g_postureError > BAD_T) {
      if (!g_inBadZone) { g_inBadZone = true; g_zoneEntryMs = now; }
      if (now - g_zoneEntryMs >= POSTURE_CONFIRM_MS) {
        g_postureState = PS_BAD; g_postureLabel = "Bad Posture";
        g_inBadZone = false; g_inGoodZone = false;
        g_alertCount++;
        requestTone(TONE_BAD); requestMotor(MOTOR_BAD);
      }
    } else g_inBadZone = false; 
  } else {
    if (g_postureError < GOOD_T) {
      if (!g_inGoodZone) { g_inGoodZone = true; g_zoneEntryMs = now; }
      if (now - g_zoneEntryMs >= POSTURE_RECOVER_MS) {
        g_postureState = PS_GOOD; g_postureLabel = "Good Posture";
        g_inGoodZone = false; g_inBadZone = false;
        requestTone(TONE_GOOD); requestMotor(MOTOR_GOOD);
      }
    } else g_inGoodZone = false; 
  }
}

void detectStep(float sig, unsigned long now) {
  if (g_tonePlaying || (now - g_toneEndMs < BUZZ_STEP_LOCKOUT_MS)) {
    g_stepArmed = false; return;
  }
  if ((sig > STEP_HIGH && sig < STEP_MAX) && g_stepArmed && (now - g_stepReadyMs) > STEP_DEBOUNCE_MS) {
    unsigned long interval = now - g_lastStepMs;
    g_stepArmed = false; g_stepCount++;
    g_distanceWalked = g_stepCount * STRIDE_M;
    g_stepReadyMs = now; g_lastStepMs = now;
    g_activity = (interval < RUN_INTERVAL_MS) ? "Running" : (interval < WALK_INTERVAL_MS) ? "Walking" : "Idle";
  }
  if (sig < STEP_LOW) g_stepArmed = true;
}

float measureDistanceCm() {
  digitalWrite(PIN_TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  long dur = pulseIn(PIN_ECHO, HIGH, 25000UL); // 25ms timeout
  return (dur == 0) ? 0.0f : dur * 0.0343f / 2.0f;
}

// ═══════════════════════════════════════════════════════════════════
//  HARDWARE OUTPUT MECHANISMS (Aggressive detach to silence GPIO2)
// ═══════════════════════════════════════════════════════════════════
void requestTone(const ToneStep* seq) {
  unsigned long now = millis();
  if (g_tonePlaying) return;
  if (now - g_lastToneMs < TONE_COOLDOWN_MS) return;
  g_toneSeq = seq;
  g_toneIdx = 0;
  g_tonePlaying = true;
  g_toneStepMs = now;
  g_lastToneMs = now;
  ledcAttachPin(PIN_BUZZER, LEDC_CH);
  ledcWriteTone(LEDC_CH, seq[0].freq);
}

void serviceTone() {
  if (!g_tonePlaying || g_toneSeq == nullptr) return;
  unsigned long now = millis();
  if (now - g_toneStepMs < g_toneSeq[g_toneIdx].ms) return;
  
  g_toneIdx++;
  const ToneStep &next = g_toneSeq[g_toneIdx];
  
  if (next.freq == 0 && next.ms == 0) {
    // FORCE HARD SHUTOFF: Detach pin and free to WiFi physical layer
    ledcWriteTone(LEDC_CH, 0);
    ledcDetachPin(PIN_BUZZER);
    pinMode(PIN_BUZZER, INPUT);
    
    g_tonePlaying = false;
    g_toneSeq = nullptr;
    g_toneEndMs = now;           
  } else {
    ledcAttachPin(PIN_BUZZER, LEDC_CH);
    ledcWriteTone(LEDC_CH, next.freq);
    g_toneStepMs = now;
  }
}

void requestMotor(const MotorStep* seq) {
  unsigned long now = millis();
  if (g_motorActive) return;
  if (now - g_lastMotorMs < MOTOR_COOLDOWN_MS) return;
  g_motorSeq = seq;
  g_motorIdx = 0;
  g_motorActive = true;
  g_motorPinOn = true;
  g_motorStepMs = now;
  g_lastMotorMs = now;
  digitalWrite(PIN_MOTOR, HIGH);
}

void serviceMotor() {
  if (!g_motorActive || g_motorSeq == nullptr) return;
  unsigned long now = millis();
  const MotorStep &step = g_motorSeq[g_motorIdx];
  if (g_motorPinOn) {
    if (now - g_motorStepMs >= step.on_ms) {
      digitalWrite(PIN_MOTOR, LOW);
      g_motorPinOn = false;
      g_motorStepMs = now;
      if (step.off_ms == 0) {
        g_motorIdx++;
        if (g_motorSeq[g_motorIdx].on_ms == 0) {
          g_motorActive = false; g_motorSeq = nullptr;
        } else {
          digitalWrite(PIN_MOTOR, HIGH); g_motorPinOn = true; g_motorStepMs = now;
        }
      }
    }
  } else {
    if (now - g_motorStepMs >= step.off_ms) {
      g_motorIdx++;
      if (g_motorSeq[g_motorIdx].on_ms == 0) {
        g_motorActive = false; g_motorSeq = nullptr;
      } else {
        digitalWrite(PIN_MOTOR, HIGH); g_motorPinOn = true; g_motorStepMs = now;
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
//  STATS & DEBUG
// ═══════════════════════════════════════════════════════════════════
void computeStats(float sig, bool bad) {
  g_totalSamples++;
  if (!bad) g_goodPostureSamples++;
  g_postureScore = (g_goodPostureSamples * 100.0f) / g_totalSamples;
  g_motionSum += sig;
  g_motionCount++;
  float avg = g_motionSum / g_motionCount;
  g_stabilityIndex = constrain(100.0f - avg * 100.0f, 0.0f, 100.0f);
}

void printDebug() {
  Serial.printf(
    "%7.1fcm | %6.2f° | %5.2f° | %-13s | %5.1f%% | %5d | %5.2fm | %5.1f%% | %7.2f° | %5d | %s\n",
    g_distanceCm, g_roll, g_postureError, g_postureLabel, g_postureScore,
    g_stepCount, g_distanceWalked, g_stabilityIndex, g_avgRoll, g_alertCount, g_activity
  );
}

// ═══════════════════════════════════════════════════════════════════
//  FIREBASE TASK
// ═══════════════════════════════════════════════════════════════════
#ifdef ENABLE_FIREBASE
String jsonEscape(const String &s) {
  String out; out.reserve(s.length() + 8);
  for (size_t i = 0; i < s.length(); i++) {
    char c = s[i];
    if (c == '\\' || c == '"') out += '\\';
    out += c;
  }
  return out;
}

void wifiConnect() {
  WiFi.mode(WIFI_STA); WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print(F("[WIFI] Connecting"));
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 15000UL) { delay(300); Serial.print('.'); }
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print(F("[WIFI] Connected — IP: ")); Serial.println(WiFi.localIP());
    
    // WROOM-DA GPIO2 HACK: 
    // Force PHY to stop oscillating GPIO2 by disabling dual-antenna switching
    wifi_ant_config_t ant_config;
    ant_config.rx_ant_mode = WIFI_ANT_MODE_ANT0;
    ant_config.tx_ant_mode = WIFI_ANT_MODE_ANT0;
    ant_config.rx_ant_default = WIFI_ANT_ANT0;
    esp_wifi_set_ant(&ant_config);
    Serial.println(F("[WIFI] Antenna Locked to ANT0 to free GPIO2 Buzzer"));
  } else {
    Serial.println(F("[WIFI] FAILED — running without network."));
  }
}

void sendToFirebase() {
  if (WiFi.status() != WL_CONNECTED) return;
  String payload = "{";
  payload += "\"distance\":" + String(g_distanceCm, 2) + ",";
  payload += "\"steps\":" + String(g_stepCount) + ",";
  payload += "\"roll\":" + String(g_roll, 2) + ",";
  payload += "\"avgRoll\":" + String(g_avgRoll, 2) + ",";
  payload += "\"postureScore\":" + String(g_postureScore, 2) + ",";
  payload += "\"stability\":" + String(g_stabilityIndex, 2) + ",";
  payload += "\"walked\":" + String(g_distanceWalked, 2) + ",";
  payload += "\"alerts\":" + String(g_alertCount) + ",";
  payload += "\"posture\":\"" + jsonEscape(String(g_postureLabel)) + "\",";
  payload += "\"activity\":\"" + jsonEscape(String(g_activity)) + "\"}";

  WiFiClientSecure client; client.setInsecure();
  HTTPClient http;
  
  if (!http.begin(client, String("https://") + FIREBASE_HOST + FIREBASE_PATH)) return;

  http.setFollowRedirects(HTTPC_FORCE_FOLLOW_REDIRECTS);
  http.setTimeout(6000); 
  http.addHeader("Content-Type", "application/json");

  int code = http.PUT(payload);
  if (code > 0) Serial.printf("[FB]  HTTP %d\n", code);  
  else Serial.printf("[FB]  Error: %s\n", http.errorToString(code).c_str());
  http.end();
}

void firebaseTask(void * pvParameters) {
  unsigned long lastUploadTime = millis();
  for(;;) {
    unsigned long now = millis();
    if (WiFi.status() == WL_CONNECTED && (now - lastUploadTime >= UPLOAD_INTERVAL_MS)) {
      lastUploadTime = now;
      sendToFirebase();
    }
    vTaskDelay(10 / portTICK_PERIOD_MS);
  }
}
#endif
