/**
 * Sensors Header
 * 
 * Interface for environmental sensors:
 * - BME280 (temperature, humidity, pressure)
 * - Capacitive soil moisture sensor
 */

#ifndef SENSORS_H
#define SENSORS_H

#include <Arduino.h>

// Sensor data structure
struct SensorData {
  float temperature;    // Celsius
  float humidity;       // Percentage (0-100)
  float pressure;       // hPa
  float soilMoisture;   // Percentage (0-100)
  uint32_t timestamp;   // Milliseconds since boot
  bool valid;           // True if all readings valid
};

// Data packet for transmission
struct DataPacket {
  uint8_t commitment[32];   // Device commitment H(pk || r)
  float temperature;
  float humidity;
  float soilMoisture;
  uint32_t timestamp;
  uint8_t nullifier[32];    // H(device_secret || epoch)
  uint8_t signature[64];    // P-256 signature (R || S)
};

class Sensors {
public:
  /**
   * Initialize all sensors
   * @return true if all sensors initialized successfully
   */
  bool begin();
  
  /**
   * Read all sensor values
   * @param data Output structure
   * @return true if at least temperature and humidity valid
   */
  bool readAll(SensorData* data);
  
  /**
   * Read temperature only
   * @return Temperature in Celsius
   */
  float readTemperature();
  
  /**
   * Read humidity only
   * @return Humidity percentage (0-100)
   */
  float readHumidity();
  
  /**
   * Read soil moisture
   * @return Soil moisture percentage (0-100)
   */
  float readSoilMoisture();
  
  /**
   * Get sensor status
   * @return Bitmap of sensor status (bit 0 = BME280, bit 1 = soil)
   */
  uint8_t getStatus();

private:
  bool _bme280Init = false;
  bool _soilInit = false;
  
  float calibrateSoilReading(int rawValue);
};

#endif // SENSORS_H
