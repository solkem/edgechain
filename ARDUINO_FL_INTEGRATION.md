# Arduino IoT + Federated Learning Integration

## Overview

This integration connects Arduino sensor data collection with the federated learning training pipeline, enabling farmers to use real-time IoT sensor data from their farms to train crop yield prediction models.

## Architecture

```
Arduino Devices (Temperature + Humidity)
    ↓
BLE Gateway / Simulation API
    ↓
Arduino Dashboard (UI)
    ↓
Data Conversion Service
    ↓
FL Training Pipeline
    ↓
Model Submission (with ZK-Proofs)
    ↓
Global Federated Model
```

## Components

### 1. Arduino Dashboard (`packages/ui/src/components/ArduinoDashboard.tsx`)

**Purpose**: Collect and display sensor data from Arduino devices

**Features**:
- Device registration with backend registry
- Real-time sensor data collection (temperature & humidity)
- Auto-collection mode (every 10 seconds)
- Manual reading collection
- Data summary and statistics
- Farm metadata configuration (crop, soil, irrigation, etc.)
- Direct navigation to FL training with collected data

**Key Functions**:
- `handleRegisterDevice()` - Register Arduino with backend
- `collectReading()` - Collect sensor reading (simulated or BLE)
- `getAverageConditions()` - Calculate average environmental conditions
- `handleTrainWithSensorData()` - Store data and navigate to training

**Route**: `/arduino`

### 2. Arduino Integration Service (`packages/ui/src/fl/arduinoIntegration.ts`)

**Purpose**: Convert Arduino sensor data into FL training format

**Key Functions**:

#### `convertArduinoDataToFLDataset()`
Converts Arduino sensor readings to FarmDataset format:
- Uses actual temperature from sensors
- Uses actual humidity from sensors
- Estimates rainfall from humidity patterns
- Combines with farm metadata
- Generates historical training samples with realistic variation

#### `estimateRainfallFromHumidity()`
Estimates seasonal rainfall from average humidity:
- Low humidity (< 50%): 200-400mm
- Medium humidity (50-70%): 400-800mm
- High humidity (> 70%): 800-1200mm

#### `calculateYield()`
Calculates realistic crop yields based on:
- Temperature (optimal varies by crop)
- Rainfall (optimal ~600mm)
- Soil type
- Irrigation method
- Fertilizer input
- Pesticide applications
- Random variation & extreme events

#### Helper Functions:
- `loadArduinoSensorData()` - Load from localStorage
- `clearArduinoSensorData()` - Clear after use
- `getArduinoDataSummary()` - Get display summary
- `hasValidArduinoData()` - Check if data is available

### 3. FL Dashboard Updates (`packages/ui/src/components/FLDashboard.tsx`)

**Integration**: Modified `handleTrainModel()` to:
1. Check for Arduino sensor data in localStorage
2. If available, convert to FL dataset using `convertArduinoDataToFLDataset()`
3. Log data quality metrics
4. Train model with Arduino data
5. Clear Arduino data after use
6. Fall back to simulated data if no Arduino data

### 4. App Routing Updates (`packages/ui/src/App.tsx`)

**Changes**:
- Added `/arduino` route → `ArduinoRoute`
- Updated Selection screen to show 3 options (Arduino IoT, FL Training, AI Predictions)
- Arduino option appears as first card with teal theme

## End-to-End Flow

### Step 1: Collect Sensor Data
1. Navigate to **Selection Screen**
2. Click **"Arduino IoT"** card
3. Click **"Register Arduino Device"**
4. Click **"Start Collecting"** (auto-collects every 10s) or **"Manual Read"**
5. Configure farm metadata (crop type, soil, irrigation, etc.)
6. Wait until at least 5 readings are collected

### Step 2: Train with Sensor Data
1. Click **"Train FL Model (X readings) →"**
2. System stores sensor data in localStorage
3. Navigate to FL Training dashboard

### Step 3: FL Training
1. FL Dashboard detects Arduino data
2. Converts sensor data to training format
3. Logs data quality metrics:
   - Temperature
   - Humidity
   - Estimated rainfall
   - Data quality (good/fair/poor)
4. Trains model on Arduino-based dataset
5. Clears Arduino data after use

### Step 4: Model Submission
1. Submit trained model with Midnight wallet signature
2. ZK-proof generated for privacy
3. Model aggregated with other farmers' models
4. Global model updated

## Data Conversion Logic

### Arduino Sensors → Training Data

**Input (from Arduino)**:
```typescript
{
  temperature: 25.3,  // °C
  humidity: 68.5,     // %
  timestamp: 1234567890
}
```

**Farm Metadata (configured by user)**:
```typescript
{
  cropType: 'maize',
  soilType: 'loamy',
  irrigationType: 'drip',
  farmSize: 5,        // hectares
  fertilizer: 100,    // kg/ha
  pesticides: 3       // applications
}
```

**Output (FL Training Data)**:
```typescript
{
  rainfall: 720,      // mm (estimated from humidity)
  temperature: 25.3,  // °C (from sensor)
  soilType: 'loamy',
  irrigationType: 'drip',
  farmSize: 5,
  fertilizer: 100,
  pesticides: 3,
  yield: 4.2,         // tons/ha (calculated)
  cropType: 'maize',
  season: '2024-spring',
  timestamp: 1234567890
}
```

## Backend API Integration

### Endpoints Used

1. **POST /api/arduino/registry/register**
   - Register device with collection mode
   - Returns device registration and global Merkle roots

2. **POST /api/arduino/simulate**
   - Simulate sensor reading (for demo without hardware)
   - Returns signed reading in Arduino format

3. **POST /api/arduino/prove** (future)
   - Generate ZK proof for sensor reading
   - Verify device in registry

4. **POST /api/arduino/submit-proof** (future)
   - Submit proof to verifier
   - Earn rewards for data contribution

## Storage

### localStorage Keys

1. **`arduino_sensor_data`**
   ```typescript
   {
     sensorData: ArduinoSensorData[],
     averages: { temperature, humidity, readings },
     farmMetadata: FarmMetadata,
     timestamp: number
   }
   ```
   - Stored when user clicks "Train with Sensor Data"
   - Cleared after FL training uses it

## Future Enhancements

### Phase 1: Real Hardware Integration
- [ ] BLE Gateway implementation
- [ ] Real-time data from Arduino via Web Bluetooth API
- [ ] Support for multiple sensors
- [ ] Historical data persistence
- [ ] Data sync across devices

### Phase 2: Enhanced Data Collection
- [ ] Rainfall sensor integration (real data, not estimated)
- [ ] Soil moisture sensors
- [ ] pH sensors
- [ ] NPK (nitrogen, phosphorus, potassium) sensors
- [ ] Camera-based crop health monitoring

### Phase 3: Privacy-Preserving Data Sharing
- [ ] ZK-proofs for sensor data authenticity
- [ ] On-chain verification of readings
- [ ] Reward farmers for contributing quality data
- [ ] Data marketplace for agricultural insights

### Phase 4: Advanced Analytics
- [ ] Real-time crop health monitoring
- [ ] Predictive alerts (drought, pests, diseases)
- [ ] Automated irrigation recommendations
- [ ] Fertilizer optimization
- [ ] Yield forecasting with confidence intervals

## Testing

### Manual Test Flow

1. **Start the application**:
   ```bash
   cd packages/ui
   npm run dev
   ```

2. **Navigate through the flow**:
   - Connect Midnight wallet
   - Register/login
   - Click "Arduino IoT"
   - Register device
   - Collect 5+ readings
   - Train with sensor data
   - Observe console logs for Arduino data usage
   - Submit model

3. **Check console output**:
   ```
   📡 Using Arduino sensor data for training!
      Temperature: 25.3°C
      Humidity: 68.5%
      Estimated Rainfall: 720.0mm/season
      Data Quality: good
   🔄 Converting Arduino sensor data to FL training dataset...
   ✅ Generated 30 training samples from Arduino data
   ```

### Verification Points

- ✅ Arduino dashboard renders correctly
- ✅ Device registration succeeds
- ✅ Sensor data collection works
- ✅ Data is stored in localStorage
- ✅ FL dashboard detects Arduino data
- ✅ Data conversion produces valid FarmDataset
- ✅ Model training succeeds with Arduino data
- ✅ Arduino data is cleared after use
- ✅ Falls back to simulated data if no Arduino data

## Benefits

### For Farmers
- Use their own farm data for training
- More accurate predictions for their specific conditions
- Privacy-preserving (data stays local)
- Low-cost sensors (~$30-50 for Arduino setup)
- Real-time monitoring of farm conditions

### For the FL Network
- Higher quality training data
- Real-world agricultural conditions
- More diverse dataset (different climates, regions)
- Continuous model improvement
- Decentralized data collection

### For the Ecosystem
- Democratizes agricultural AI
- Empowers smallholder farmers
- Reduces dependency on expensive sensors
- Open-source hardware and software
- Community-driven innovation

## Deployment

The Arduino integration is included in the unified deployment:

```bash
# From project root
cd server
fly deploy --config fly.toml
```

The `/api/arduino/*` endpoints are served by the same backend that handles FL aggregation.

## References

- Arduino IoT Documentation: [arduino/ARDUINO_INTEGRATION.md](arduino/ARDUINO_INTEGRATION.md)
- Incentive Layer: [INCENTIVE_LAYER_SUMMARY.md](INCENTIVE_LAYER_SUMMARY.md)
- FL Training: [packages/ui/src/fl/training.ts](packages/ui/src/fl/training.ts)
- Data Collection: [packages/ui/src/fl/dataCollection.ts](packages/ui/src/fl/dataCollection.ts)
