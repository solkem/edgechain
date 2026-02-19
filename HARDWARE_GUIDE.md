# EdgeChain Hardware Guide 🔧

Complete bill of materials and assembly instructions for EdgeChain IoT devices.

## Bill of Materials

### IoT Sensor Device (~$50)

| Component | Model | Qty | Price | Source |
|-----------|-------|-----|-------|--------|
| Microcontroller | ESP32-S3-WROOM-1 | 1 | $8 | [AliExpress](https://aliexpress.com), [Mouser](https://mouser.com) |
| Secure Element | ATECC608B-SSHDA | 1 | $2.50 | [DigiKey](https://digikey.com), [Microchip Direct](https://microchipdirect.com) |
| LoRa Module | RYLR896 (868/915MHz) | 1 | $6 | [AliExpress](https://aliexpress.com), [Amazon](https://amazon.com) |
| Temp/Humidity | BME280 breakout | 1 | $4 | [AliExpress](https://aliexpress.com), [Adafruit](https://adafruit.com) |
| Soil Moisture | Capacitive v1.2/v2.0 | 1 | $2 | [AliExpress](https://aliexpress.com) |
| Solar Panel | 6V 1W (110x60mm) | 1 | $3 | [AliExpress](https://aliexpress.com) |
| Battery | 18650 Li-ion 3.7V | 1 | $4 | Local electronics store |
| Charge Controller | TP4056 module | 1 | $1 | [AliExpress](https://aliexpress.com) |
| Voltage Regulator | AMS1117-3.3V | 1 | $0.50 | [AliExpress](https://aliexpress.com) |
| Enclosure | IP65 waterproof (100x68x50mm) | 1 | $5 | [AliExpress](https://aliexpress.com) |
| Cable Glands | PG7 (2-pack) | 1 | $1 | [AliExpress](https://aliexpress.com) |
| Antenna | 868/915MHz SMA | 1 | $2 | [AliExpress](https://aliexpress.com) |
| Misc | Jumper wires, perfboard | 1 | $2 | Local electronics store |

**Subtotal: ~$41**

### Proof Server / Freedom Node (~$255 with existing solar)

| Component | Model | Qty | Price | Source |
|-----------|-------|-----|-------|--------|
| Computer | Dell OptiPlex 7060 Micro (i5-8500T, 16GB, 256GB) | 1 | $209 | Amazon Renewed |
| LTE Modem | Huawei E3372-325 (Band 3) | 1 | $21 | Amazon |
| LTE Antennas | CRC9 antenna pair | 1 | $18 | eBay |
| USB-Serial | CP2102 USB-UART (3.3V) | 1 | $7 | Amazon |
| LoRa Module | RYLR896 (existing) | 1 | $0 | Already owned |

**Subtotal: ~$255**

---

## Wiring Diagrams

### ESP32-S3 + ATECC608B + RYLR896

```
┌──────────────────────────────────────────────────────────────────┐
│                        ESP32-S3-WROOM-1                          │
│                                                                  │
│   3V3 ●────────────────┬───────────────────┬──────────● ATECC VCC │
│                        │                   │                      │
│   GND ●────────────────┼───────────────────┼──────────● ATECC GND │
│                        │                   │                      │
│  GPIO21 (SDA) ●────────┼───────────────────┴──────────● ATECC SDA │
│                        │                              (+ 4.7kΩ pullup)
│  GPIO22 (SCL) ●────────┼──────────────────────────────● ATECC SCL │
│                        │                              (+ 4.7kΩ pullup)
│                        │                                         │
│   3V3 ●────────────────┴──────────────────────────────● RYLR VDD  │
│   GND ●───────────────────────────────────────────────● RYLR GND  │
│  GPIO17 (TX) ●────────────────────────────────────────● RYLR RXD  │
│  GPIO16 (RX) ●────────────────────────────────────────● RYLR TXD  │
│                                                                  │
│   3V3 ●───────────────────────────────────────────────● BME280 VCC│
│   GND ●───────────────────────────────────────────────● BME280 GND│
│  GPIO21 (SDA) ●───────────────────────────────────────● BME280 SDA│
│  GPIO22 (SCL) ●───────────────────────────────────────● BME280 SCL│
│                                                                  │
│  GPIO34 (ADC) ●───────────────────────────────────────● Soil AOUT │
│   3V3 ●───────────────────────────────────────────────● Soil VCC  │
│   GND ●───────────────────────────────────────────────● Soil GND  │
└──────────────────────────────────────────────────────────────────┘
```

### Power Circuit

```
                    ┌─────────────────┐
  Solar Panel (+) ──┤ IN+         B+ ├─── Battery (+)
  Solar Panel (-) ──┤ IN-         B- ├─── Battery (-)
                    │    TP4056      │
                    │                │
                    │ OUT+      OUT- │
                    └──┬──────────┬──┘
                       │          │
            ┌──────────┘          └──────────┐
            │                                │
            ▼                                ▼
     ┌─────────────┐                   ┌───────────┐
     │ AMS1117-3.3 │                   │    GND    │
     │   VIN  VOUT ├───────────────────┤ ESP32 GND │
     │        GND  │                   │           │
     └──┬──────┬───┘                   │ ESP32 3V3 │◄──┐
        │      │                       └───────────┘   │
        │      └───────────────────────────────────────┘
        │
        ▼
       GND
```

---

## Assembly Instructions

### Step 1: Prepare ATECC608B

1. The ATECC608B is a tiny 8-pin SOIC package
2. Solder to a SOIC-8 breakout board or use pre-made module
3. Connect I2C lines (SDA, SCL) with 4.7kΩ pull-up resistors

### Step 2: Wire LoRa Module

1. RYLR896 uses UART at 115200 baud
2. Connect TX→RX and RX→TX (cross-over)
3. Use 3.3V on CP2102 VCC (5V can damage RYLR896)
4. Attach antenna before powering on (to protect RF stage)

### Step 3: Connect Sensors

1. BME280: I2C address 0x76 or 0x77 (check solder bridge)
2. Soil sensor: Connect to ADC pin, calibrate wet/dry values
3. Both share the I2C bus with ATECC608B

### Step 4: Power System

1. Solder TP4056 module for battery charging
2. Add AMS1117-3.3V regulator for stable 3.3V
3. Use 18650 battery holder with protection circuit

### Step 5: Enclosure

1. Drill holes for cable glands (soil sensor, antenna)
2. Mount PCB inside with standoffs
3. Seal with silicone around cable glands
4. Position solar panel facing optimal sun angle

---

## LoRa Configuration

### Default Settings (RYLR896)

| Parameter | Value | AT Command |
|-----------|-------|------------|
| Frequency | 915MHz baseline (Freedom Node deployment) | `AT+BAND=915000000` |
| Spreading Factor | SF9 | `AT+PARAMETER=9,7,1,12` |
| Bandwidth | 125kHz | (part of PARAMETER) |
| Network ID | 6 | `AT+NETWORKID=6` |
| Proof Server Address | 1 | `AT+ADDRESS=1` |

### Range Testing

| Environment | Expected Range |
|-------------|----------------|
| Line of sight | 2-5 km |
| Rural/farmland | 1-3 km |
| Suburban | 500m-1 km |
| Urban/obstacles | 200-500m |

---

## Troubleshooting

### Common Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| ATECC608B not detected | I2C address wrong | Try 0x60 or 0x6A |
| LoRa not transmitting | Missing antenna | Always connect antenna before power |
| Low battery life | Solar insufficient | Add larger panel (2W) |
| Intermittent readings | Loose connections | Re-solder, use hot glue |
| Soil sensor always 0 | ADC pin wrong | Check GPIO34 (ADC1_CH6) |

### LED Indicators

| LED | Meaning |
|-----|---------|
| Solid green | Normal operation |
| Blinking green | Transmitting |
| Red | Low battery |
| Blue (TP4056) | Charging |
| Green (TP4056) | Fully charged |

---

## Regional Compliance

### Frequency Bands

| Region | Frequency | Notes |
|--------|-----------|-------|
| Europe (EU868) | 868 MHz | 1% duty cycle |
| North America (US915) | 902-928 MHz | FCC Part 15 |
| Australia (AU915) | 915-928 MHz | ACMA compliant |
| Africa | 868 MHz or 915 MHz | Check local regulations |

### Zimbabwe

For deployment in Zimbabwe, use the project baseline **915 MHz** profile unless local site testing or regulatory guidance requires otherwise. POTRAZ does not have specific LoRa regulations, but ISM band usage is generally permitted for low-power devices.

---

## Firmware Flashing

```bash
# Install PlatformIO
pip install platformio

# Navigate to firmware directory
cd firmware/esp32-msingi

# Build and upload
pio run --target upload --environment esp32-s3

# Monitor serial output
pio device monitor --baud 115200
```

---

## Resources

- [ESP32-S3 Technical Reference](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
- [ATECC608B Datasheet](https://www.microchip.com/en-us/product/ATECC608B)
- [RYLR896 User Manual](https://reyax.com/products/RYLR896/)
- [BME280 Datasheet](https://www.bosch-sensortec.com/products/environmental-sensors/humidity-sensors-bme280/)

---

*Questions? Open an issue on GitHub or consult the [Msingi Architecture](Msingi.md) guide.*
