/**
 * Sensors Implementation
 * 
 * BME280 environmental sensor and capacitive soil moisture sensor.
 */

#include "sensors.h"
#include "config.h"
#include <Adafruit_BME280.h>

// BME280 instance
static Adafruit_BME280 bme;

bool Sensors::begin() {
  _bme280Init = false;
  _soilInit = false;
  
  // Initialize BME280
  if (bme.begin(0x76) || bme.begin(0x77)) {
    _bme280Init = true;
    
    // Configure for weather monitoring
    bme.setSampling(
      Adafruit_BME280::MODE_FORCED,
      Adafruit_BME280::SAMPLING_X1,  // Temperature
      Adafruit_BME280::SAMPLING_X1,  // Pressure
      Adafruit_BME280::SAMPLING_X1,  // Humidity
      Adafruit_BME280::FILTER_OFF
    );
    
    if (DEBUG_SENSORS) {
      Serial.println("BME280: Initialized at 0x76/0x77");
    }
  } else {
    Serial.println("BME280: Not found!");
  }
  
  // Initialize soil moisture sensor (ADC)
  pinMode(SOIL_SENSOR_PIN, INPUT);
  _soilInit = true;
  
  if (DEBUG_SENSORS) {
    Serial.printf("Soil sensor: Pin %d configured\n", SOIL_SENSOR_PIN);
  }
  
  // Consider successful if at least BME280 works
  return _bme280Init;
}

bool Sensors::readAll(SensorData* data) {
  if (!data) return false;
  
  data->valid = false;
  data->timestamp = millis();
  
  // Read BME280
  if (_bme280Init) {
    bme.takeForcedMeasurement();
    
    data->temperature = bme.readTemperature();
    data->humidity = bme.readHumidity();
    data->pressure = bme.readPressure() / 100.0F; // Convert to hPa
    
    // Validate readings
    if (data->temperature >= TEMP_MIN && data->temperature <= TEMP_MAX &&
        data->humidity >= HUMIDITY_MIN && data->humidity <= HUMIDITY_MAX) {
      data->valid = true;
    }
  } else {
    data->temperature = 0;
    data->humidity = 0;
    data->pressure = 0;
  }
  
  // Read soil moisture
  if (_soilInit) {
    int rawValue = analogRead(SOIL_SENSOR_PIN);
    data->soilMoisture = calibrateSoilReading(rawValue);
  } else {
    data->soilMoisture = 0;
  }
  
  return data->valid;
}

float Sensors::readTemperature() {
  if (!_bme280Init) return 0;
  bme.takeForcedMeasurement();
  return bme.readTemperature();
}

float Sensors::readHumidity() {
  if (!_bme280Init) return 0;
  bme.takeForcedMeasurement();
  return bme.readHumidity();
}

float Sensors::readSoilMoisture() {
  if (!_soilInit) return 0;
  int rawValue = analogRead(SOIL_SENSOR_PIN);
  return calibrateSoilReading(rawValue);
}

uint8_t Sensors::getStatus() {
  uint8_t status = 0;
  if (_bme280Init) status |= 0x01;
  if (_soilInit) status |= 0x02;
  return status;
}

float Sensors::calibrateSoilReading(int rawValue) {
  // Calibration: 
  // - AIR_VALUE: Reading when dry (high value)
  // - WATER_VALUE: Reading when fully wet (low value)
  
  // Map to 0-100% (inverted because lower value = more water)
  float moisture = (float)(SOIL_SENSOR_AIR_VALUE - rawValue) * 100.0 / 
                   (float)(SOIL_SENSOR_AIR_VALUE - SOIL_SENSOR_WATER_VALUE);
  
  // Clamp to valid range
  if (moisture < 0) moisture = 0;
  if (moisture > 100) moisture = 100;
  
  return moisture;
}
