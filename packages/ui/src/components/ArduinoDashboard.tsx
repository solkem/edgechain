/**
 * IoT Kit Dashboard Component
 *
 * Collects sensor data from IoT Kit devices and integrates it into FL training
 *
 * Flow:
 * 1. Connect to BLE gateway / IoT Kit device
 * 2. Collect temperature & humidity readings
 * 3. Convert sensor data to FL training format
 * 4. Train model on IoT data
 * 5. Submit to federated learning
 */

import { useState, useEffect } from 'react';
import { useWallet } from '../providers/WalletProvider';
import { useNavigate } from 'react-router-dom';

interface IoTReading {
  t: number; // temperature °C
  h: number; // humidity %
  ts: number; // timestamp
}

interface SensorData {
  timestamp: number;
  temperature: number;
  humidity: number;
  source: 'iot-kit' | 'simulated';
}

interface DeviceInfo {
  deviceId: string;
  pubkey: string;
  registered: boolean;
  collectionMode: 'auto' | 'manual';
}

// Use relative URL in production, localhost in development
const API_BASE = import.meta.env.VITE_API_BASE_URL ||
  (window.location.hostname === 'localhost' ? 'http://localhost:3001' : '');

export function ArduinoDashboard() {
  const wallet = useWallet();
  const navigate = useNavigate();

  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [currentReading, setCurrentReading] = useState<SensorData | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [farmMetadata, setFarmMetadata] = useState({
    cropType: 'maize',
    soilType: 'loamy',
    irrigationType: 'drip',
    farmSize: 5,
    fertilizer: 100,
    pesticides: 3,
  });

  // Auto-collect sensor data every 10 seconds when active
  useEffect(() => {
    if (!isCollecting) return;

    const interval = setInterval(async () => {
      await collectReading();
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [isCollecting]);

  /**
   * Register device with backend
   */
  const handleRegisterDevice = async () => {
    if (!wallet.isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setError(null);
      const devicePubkey = `device_${wallet.address?.substring(0, 16)}`;

      const response = await fetch(`${API_BASE}/api/arduino/registry/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_pubkey: devicePubkey,
          collection_mode: 'auto',
          device_id: 'iot-kit-001',
          metadata: {
            owner: wallet.address,
            location: 'Farm',
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setDeviceInfo({
        deviceId: 'iot-kit-001',
        pubkey: devicePubkey,
        registered: true,
        collectionMode: 'auto',
      });

      console.log('✅ Device registered:', data);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message);
    }
  };

  /**
   * Connect to IoT Kit via Web Bluetooth API
   */
  const connectBLE = async () => {
    try {
      setError(null);
      console.log('🔍 Scanning for EdgeChain IoT Kit devices...');

      const BLE_SERVICE_UUID = '12345678-1234-5678-1234-56789abcdef0';
      const DATA_CHAR_UUID = '87654321-4321-8765-4321-fedcba987654';

      // Request BLE device
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: [BLE_SERVICE_UUID] }],
      });

      console.log(`✓ Found device: ${device.name}`);

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(BLE_SERVICE_UUID);
      const characteristic = await service.getCharacteristic(DATA_CHAR_UUID);

      await characteristic.startNotifications();

      // Listen for sensor readings
      characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
        const buffer = event.target.value.buffer;
        const reading = parseIoTPayload(buffer);

        const sensorReading: SensorData = {
          timestamp: Date.now(),
          temperature: reading.t,
          humidity: reading.h,
          source: 'iot-kit',
        };

        setCurrentReading(sensorReading);
        setSensorData((prev) => [...prev, sensorReading].slice(-100));

        console.log('📊 BLE reading:', sensorReading);
      });

      setIsCollecting(true);
      console.log('✓ Connected to IoT Kit, listening for readings...');
    } catch (err: any) {
      console.error('BLE connection error:', err);
      setError(err.message || 'Failed to connect to IoT Kit via BLE');
    }
  };

  /**
   * Parse IoT Kit BLE payload
   */
  const parseIoTPayload = (buffer: ArrayBuffer) => {
    const view = new Uint8Array(buffer);
    let idx = 0;

    // Read JSON length
    const json_len = view[idx++];

    // Read JSON
    const json_bytes = view.slice(idx, idx + json_len);
    const reading_json = new TextDecoder().decode(json_bytes);
    const reading = JSON.parse(reading_json);

    return reading;
  };

  /**
   * Collect a sensor reading (fallback simulation for testing without hardware)
   */
  const collectReading = async () => {
    try {
      setError(null);

      // Simulate realistic agricultural sensor data
      const response = await fetch(`${API_BASE}/api/arduino/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temperature: 20 + Math.random() * 10,
          humidity: 50 + Math.random() * 30,
          device_pubkey: deviceInfo?.pubkey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to collect reading');
      }

      const reading: IoTReading = JSON.parse(data.reading.reading_json);

      const sensorReading: SensorData = {
        timestamp: Date.now(),
        temperature: reading.t,
        humidity: reading.h,
        source: 'simulated',
      };

      setCurrentReading(sensorReading);
      setSensorData((prev) => [...prev, sensorReading].slice(-100)); // Keep last 100

      console.log('📊 Sensor reading:', sensorReading);
    } catch (err: any) {
      console.error('Collection error:', err);
      setError(err.message);
    }
  };

  /**
   * Calculate average conditions from collected sensor data
   */
  const getAverageConditions = () => {
    if (sensorData.length === 0) return null;

    const avgTemp = sensorData.reduce((sum, d) => sum + d.temperature, 0) / sensorData.length;
    const avgHumidity = sensorData.reduce((sum, d) => sum + d.humidity, 0) / sensorData.length;

    return {
      temperature: avgTemp,
      humidity: avgHumidity,
      readings: sensorData.length,
    };
  };

  /**
   * Start training FL model with Arduino sensor data
   */
  const handleTrainWithSensorData = () => {
    // Store sensor data in localStorage for FL training to access
    const averages = getAverageConditions();

    if (!averages) {
      setError('No sensor data collected yet');
      return;
    }

    localStorage.setItem('arduino_sensor_data', JSON.stringify({
      sensorData,
      averages,
      farmMetadata,
      timestamp: Date.now(),
    }));

    // Navigate to FL training
    navigate('/train');
  };

  const averageConditions = getAverageConditions();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-teal-900 to-blue-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 pt-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <span>🌡️</span> IoT Kit Sensors
            </h1>
            <p className="text-green-200 text-sm mt-1">
              Collect real-time farm data for federated learning
            </p>
          </div>
          <button
            onClick={() => navigate('/selection')}
            className="px-4 py-2 bg-slate-800/60 text-white rounded-lg hover:bg-slate-800 transition-all"
          >
            ← Back
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500/50 rounded-lg">
            <p className="text-red-200">❌ {error}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Device Setup Panel */}
          <div className="bg-slate-800/60 backdrop-blur-md border border-green-500/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>📡</span> Device Setup
            </h2>

            {!deviceInfo?.registered ? (
              <div className="space-y-4">
                <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
                  <p className="text-blue-200 text-sm mb-3">
                    Register your IoT Kit to start collecting sensor data.
                    Data includes temperature and humidity for agricultural insights.
                  </p>
                  <button
                    onClick={handleRegisterDevice}
                    disabled={!wallet.isConnected}
                    className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {wallet.isConnected ? 'Register IoT Kit' : 'Connect Wallet First'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-green-400 text-2xl">✅</span>
                    <p className="text-green-300 font-semibold">Device Registered</p>
                  </div>
                  <div className="text-xs text-green-100 space-y-1">
                    <p>Device ID: {deviceInfo.deviceId}</p>
                    <p className="font-mono text-[10px] break-all">
                      Pubkey: {deviceInfo.pubkey}
                    </p>
                    <p>Mode: {deviceInfo.collectionMode}</p>
                  </div>
                </div>

                <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 mb-4">
                  <p className="text-blue-200 text-sm mb-3">
                    <strong>🔵 Real Hardware:</strong> Connect IoT Kit via Web Bluetooth
                  </p>
                  <button
                    onClick={connectBLE}
                    disabled={isCollecting}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-3 px-6 rounded-xl transition-all disabled:opacity-50"
                  >
                    {isCollecting ? '✅ Connected to IoT Kit' : '🔗 Connect IoT Kit BLE'}
                  </button>
                </div>

                <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-4">
                  <p className="text-purple-200 text-sm mb-3">
                    <strong>🟣 Simulation:</strong> Test without hardware
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setIsCollecting(!isCollecting);
                        if (!isCollecting) collectReading();
                      }}
                      className={`flex-1 font-semibold py-3 px-6 rounded-xl transition-all ${
                        isCollecting
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                      }`}
                    >
                      {isCollecting ? 'Stop Auto-Sim' : 'Start Auto-Sim'}
                    </button>
                    <button
                      onClick={collectReading}
                      disabled={isCollecting}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
                    >
                      Manual Sim
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Current Reading */}
          <div className="bg-slate-800/60 backdrop-blur-md border border-green-500/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>📊</span> Current Reading
            </h2>

            {currentReading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-orange-900/30 border border-orange-500/50 rounded-lg p-4">
                    <p className="text-orange-300 text-sm mb-1">Temperature</p>
                    <p className="text-3xl font-bold text-white">
                      {currentReading.temperature.toFixed(1)}°C
                    </p>
                  </div>
                  <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
                    <p className="text-blue-300 text-sm mb-1">Humidity</p>
                    <p className="text-3xl font-bold text-white">
                      {currentReading.humidity.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="text-xs text-gray-300">
                  Last updated: {new Date(currentReading.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>No readings yet</p>
                <p className="text-xs mt-2">Start collecting to see sensor data</p>
              </div>
            )}
          </div>

          {/* Collected Data Summary */}
          <div className="bg-slate-800/60 backdrop-blur-md border border-green-500/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>📈</span> Data Summary
            </h2>

            {averageConditions ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-3">
                    <p className="text-purple-300 text-xs mb-1">Avg Temperature</p>
                    <p className="text-2xl font-bold text-white">
                      {averageConditions.temperature.toFixed(1)}°C
                    </p>
                  </div>
                  <div className="bg-cyan-900/30 border border-cyan-500/50 rounded-lg p-3">
                    <p className="text-cyan-300 text-xs mb-1">Avg Humidity</p>
                    <p className="text-2xl font-bold text-white">
                      {averageConditions.humidity.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3">
                  <p className="text-green-300 text-sm">
                    Total Readings: <strong>{averageConditions.readings}</strong>
                  </p>
                  <p className="text-green-200 text-xs mt-1">
                    Collected over {Math.floor((Date.now() - sensorData[0]?.timestamp) / 60000)} minutes
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>No data collected</p>
              </div>
            )}
          </div>

          {/* Farm Metadata */}
          <div className="bg-slate-800/60 backdrop-blur-md border border-green-500/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>🌾</span> Farm Details
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-green-200 mb-1">Crop Type</label>
                <select
                  value={farmMetadata.cropType}
                  onChange={(e) => setFarmMetadata({ ...farmMetadata, cropType: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="maize">Maize</option>
                  <option value="wheat">Wheat</option>
                  <option value="rice">Rice</option>
                  <option value="soybeans">Soybeans</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-green-200 mb-1">Soil Type</label>
                  <select
                    value={farmMetadata.soilType}
                    onChange={(e) => setFarmMetadata({ ...farmMetadata, soilType: e.target.value })}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    <option value="loamy">Loamy</option>
                    <option value="clay">Clay</option>
                    <option value="sandy">Sandy</option>
                    <option value="silty">Silty</option>
                    <option value="peaty">Peaty</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-green-200 mb-1">Irrigation</label>
                  <select
                    value={farmMetadata.irrigationType}
                    onChange={(e) =>
                      setFarmMetadata({ ...farmMetadata, irrigationType: e.target.value })
                    }
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    <option value="drip">Drip</option>
                    <option value="sprinkler">Sprinkler</option>
                    <option value="flood">Flood</option>
                    <option value="rainfed">Rainfed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-green-200 mb-1">Farm Size (ha)</label>
                  <input
                    type="number"
                    value={farmMetadata.farmSize}
                    onChange={(e) =>
                      setFarmMetadata({ ...farmMetadata, farmSize: parseFloat(e.target.value) })
                    }
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-green-200 mb-1">Fertilizer (kg/ha)</label>
                  <input
                    type="number"
                    value={farmMetadata.fertilizer}
                    onChange={(e) =>
                      setFarmMetadata({ ...farmMetadata, fertilizer: parseFloat(e.target.value) })
                    }
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-green-200 mb-1">Pesticides</label>
                  <input
                    type="number"
                    value={farmMetadata.pesticides}
                    onChange={(e) =>
                      setFarmMetadata({ ...farmMetadata, pesticides: parseInt(e.target.value) })
                    }
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="mt-6 bg-gradient-to-r from-purple-900/50 to-blue-900/50 backdrop-blur-md border border-purple-500/30 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>🚀</span> Train with Sensor Data
          </h2>

          <div className="mb-4 text-purple-100 text-sm space-y-2">
            <p>
              ✓ Use your Arduino sensor data to train a federated learning model for crop yield
              prediction
            </p>
            <p>✓ Your data stays private - only model updates are shared</p>
            <p>✓ Contribute to a global agricultural intelligence network</p>
          </div>

          <button
            onClick={handleTrainWithSensorData}
            disabled={!averageConditions || sensorData.length < 5}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {averageConditions && sensorData.length >= 5
              ? `Train FL Model (${sensorData.length} readings) →`
              : 'Collect at least 5 readings to train'}
          </button>
        </div>
      </div>
    </div>
  );
}
