/**
 * Configuration header for Msingi ESP32-S3 firmware
 * 
 * Hardware configuration and pin definitions for:
 * - ESP32-S3-WROOM-1
 * - ATECC608B Secure Element
 * - RYLR896 LoRa Module
 * - BME280 + Soil Moisture Sensor
 */

#ifndef MSINGI_CONFIG_H
#define MSINGI_CONFIG_H

// ============= VERSION =============
#define FIRMWARE_VERSION "1.0.0"
#define DEVICE_TYPE "MSINGI_IOT"

// ============= PIN DEFINITIONS =============

// I2C Bus (ATECC608B + BME280)
#define I2C_SDA_PIN 21
#define I2C_SCL_PIN 22
#define I2C_SPEED 100000  // 100kHz for ATECC608B compatibility

// ATECC608B Secure Element
#define ATECC608B_I2C_ADDR 0x60

// LoRa RYLR896 (UART)
#define LORA_RX_PIN 16
#define LORA_TX_PIN 17
#define LORA_UART_BAUD 115200

// Soil Moisture Sensor (ADC)
#define SOIL_SENSOR_PIN 34
#define SOIL_SENSOR_AIR_VALUE 3500
#define SOIL_SENSOR_WATER_VALUE 1500

// Status LED
#define STATUS_LED_PIN 2

// ============= LORA CONFIGURATION =============

// Frequency (868MHz for EU, 915MHz for US)
#ifndef LORA_FREQUENCY
#define LORA_FREQUENCY 868000000
#endif

// LoRa parameters for long-range agricultural use
#define LORA_SPREADING_FACTOR 10    // SF10 for ~2km range
#define LORA_BANDWIDTH 125          // 125kHz bandwidth
#define LORA_CODING_RATE 5          // 4/5 coding rate
#define LORA_TX_POWER 20            // Maximum power (20dBm)

// Network ID (must match proof server)
#define LORA_NETWORK_ID 7

// ============= TIMING CONFIGURATION =============

// Sensor reading interval (30 minutes in production)
#define SENSOR_INTERVAL_MS (30 * 60 * 1000)

// Transmission retry settings
#define LORA_RETRY_COUNT 3
#define LORA_RETRY_DELAY_MS 5000

// Deep sleep between readings (saves power)
#define ENABLE_DEEP_SLEEP true
#define DEEP_SLEEP_DURATION_US (SENSOR_INTERVAL_MS * 1000ULL)

// ============= SECURITY CONFIGURATION =============

// ATECC608B slot allocations
#define SLOT_DEVICE_KEY 0          // Device P-256 private key
#define SLOT_BLINDING_FACTOR 1     // Random blinding factor (for BRACE)
#define SLOT_EPOCH_COUNTER 2       // Current epoch counter

// Key derivation
#define NULLIFIER_DOMAIN "msingi:nullifier:v1"
#define COMMITMENT_DOMAIN "msingi:commitment:v1"

// ============= PROOF SERVER CONFIGURATION =============

// If using LoRa (default)
// No URL needed - communicates via AT commands

// If using WiFi (for development only)
#define PROOF_SERVER_URL "http://192.168.1.100:3001"

// ============= SENSOR CALIBRATION =============

// Temperature bounds (Celsius)
#define TEMP_MIN -10.0
#define TEMP_MAX 50.0

// Humidity bounds (percentage)
#define HUMIDITY_MIN 0.0
#define HUMIDITY_MAX 100.0

// Soil moisture bounds (percentage after calibration)
#define SOIL_MOISTURE_MIN 0.0
#define SOIL_MOISTURE_MAX 100.0

// ============= DEBUG FLAGS =============

// Set to 0 in production
#define DEBUG_SERIAL 1
#define DEBUG_CRYPTO 0
#define DEBUG_LORA 1
#define DEBUG_SENSORS 1

#endif // MSINGI_CONFIG_H
