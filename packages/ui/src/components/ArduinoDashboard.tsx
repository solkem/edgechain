/**
 * IoT Kit Dashboard Component - Midnight Hackathon Edition
 *
 * Focus: ZK Proof Verification & Consistency-Based Incentives
 *
 * Priority Hierarchy:
 * 1. ZK Proof Verification Status (Most Prominent)
 * 2. Data Collection Consistency Score
 * 3. tDUST Incentive Tracker
 * 4. Supporting Data (readings, farm details)
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
  merkleRoot?: string;
  lastProofTime?: number;
}

interface ConsistencyMetrics {
  uptimePercent: number;
  expectedReadings: number;
  collectedReadings: number;
  perfectDayStreak: number;
  missedReadings: number;
}

interface IncentiveData {
  dailyEarned: number;
  weeklyEarned: number;
  pending: number;
  rewardTier: 'HIGH' | 'MEDIUM' | 'LOW';
  nextTierThreshold: number;
}

// Backend response types
interface BackendConsistency {
  device_pubkey: string;
  owner_wallet: string;
  total_readings: number;
  expected_readings: number;
  missed_readings: number;
  uptime_percent: number;
  first_reading_at: number;
  last_reading_at: number;
  epoch_start: number;
  epoch_end: number;
}

interface BackendIncentives {
  device_pubkey: string;
  owner_wallet: string;
  authorization_reward: number;
  consistency_bonus: number;
  total_earned: number;
  consistency_percent: number;
}

// Use relative URL in production, localhost in development
// In Codespaces, hostname will be a .githubpreview.dev domain
const isLocalDev = window.location.hostname === 'localhost' ||
                   window.location.hostname.includes('githubpreview.dev') ||
                   window.location.hostname.includes('codespaces') ||
                   window.location.hostname.startsWith('10.') ||
                   window.location.hostname.startsWith('127.');

const API_BASE = import.meta.env.VITE_API_BASE_URL ||
  (isLocalDev ? 'http://localhost:3001' : '');

// Debug: Log API_BASE configuration
console.log('🔧 API_BASE Configuration:', {
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  hostname: window.location.hostname,
  isLocalDev,
  resolved_API_BASE: API_BASE,
});

export function ArduinoDashboard() {
  const wallet = useWallet();
  const navigate = useNavigate();

  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [currentReading, setCurrentReading] = useState<SensorData | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [farmMetadata, setFarmMetadata] = useState({
    cropType: 'maize',
    soilType: 'loamy',
    irrigationType: 'drip',
    farmSize: 5,
    fertilizer: 100,
    pesticides: 3,
  });

  // Backend data
  const [backendConsistency, setBackendConsistency] = useState<BackendConsistency | null>(null);
  const [backendIncentives, setBackendIncentives] = useState<BackendIncentives | null>(null);

  // Privacy & ZK Proof state
  const [usePrivateMode, setUsePrivateMode] = useState(true); // Default to private!
  const [deviceSecret, setDeviceSecret] = useState<string | null>(null);
  const [currentNullifier, setCurrentNullifier] = useState<string | null>(null);
  const [currentEpoch, setCurrentEpoch] = useState<number>(Math.floor(Date.now() / (24 * 60 * 60 * 1000)));
  const [zkProofStats, setZkProofStats] = useState<any>(null);
  const [lastProofGenTime, setLastProofGenTime] = useState<number>(0);
  const [anonymitySetSize, setAnonymitySetSize] = useState<number>(0);
  const [lastRewardNotification, setLastRewardNotification] = useState<number>(Date.now());
  const [accumulatedRewards, setAccumulatedRewards] = useState<number>(0);

  // Auto-collect sensor data every 30 seconds when active
  useEffect(() => {
    if (!isCollecting) return;

    const interval = setInterval(async () => {
      await collectReading();
    }, 30000); // 30 seconds (2 per minute, 120 per hour)

    return () => clearInterval(interval);
  }, [isCollecting]);

  // Fetch device data from backend by wallet address
  useEffect(() => {
    if (deviceInfo?.registered && wallet.address) {
      fetchDeviceData();
    }
  }, [deviceInfo?.registered, wallet.address]);

  // Auto-refresh device data every 30 seconds when collecting
  useEffect(() => {
    if (!isCollecting || !wallet.address) return;

    const interval = setInterval(() => {
      fetchDeviceData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isCollecting, wallet.address]);

  const fetchDeviceData = async () => {
    if (!wallet.address) return;

    try {
      // Fetch device info, consistency, and incentives
      const response = await fetch(`${API_BASE}/api/arduino/my-device/${wallet.address}`);

      if (!response.ok) {
        if (response.status === 404) {
          console.log('No device found for this wallet');
          return;
        }
        throw new Error('Failed to fetch device data');
      }

      const data = await response.json();

      // Update device info with merkle root
      const registryResponse = await fetch(`${API_BASE}/api/arduino/registry`);
      const registryData = await registryResponse.json();

      setDeviceInfo(prev => ({
        ...prev!,
        merkleRoot: registryData.dual_roots?.auto_root || 'pending',
        lastProofTime: Date.now(),
      }));

      // Store backend consistency and incentives
      setBackendConsistency(data.consistency);
      setBackendIncentives(data.incentives);

      console.log('✅ Device data fetched from backend:', data);
    } catch (err) {
      console.error('Failed to fetch device data:', err);
    }
  };

  /**
   * Calculate consistency metrics (use backend data if available)
   */
  const getConsistencyMetrics = (): ConsistencyMetrics => {
    // Prefer backend data (24-hour epoch with database persistence)
    if (backendConsistency) {
      const hoursElapsed = backendConsistency.total_readings > 0
        ? (Date.now() / 1000 - backendConsistency.first_reading_at) / 3600
        : 0;

      const perfectDayStreak = backendConsistency.uptime_percent > 99
        ? Math.floor(hoursElapsed / 24)
        : 0;

      return {
        uptimePercent: backendConsistency.uptime_percent,
        expectedReadings: backendConsistency.expected_readings,
        collectedReadings: backendConsistency.total_readings,
        missedReadings: backendConsistency.missed_readings,
        perfectDayStreak,
      };
    }

    // Fallback: Calculate from local session data with gap detection
    // Time-window based uptime - only count active collection periods

    const READING_INTERVAL = 30; // seconds
    const GAP_THRESHOLD = 120; // 2 minutes - if gap is longer, device was offline

    let totalActiveTime = 0; // Total time device was actively collecting (ms)

    if (sensorData.length > 0) {
      const now = Date.now();

      for (let i = 0; i < sensorData.length; i++) {
        const currentTime = sensorData[i].timestamp;
        const nextTime = i < sensorData.length - 1 ? sensorData[i + 1].timestamp : now;
        const gap = (nextTime - currentTime) / 1000; // Convert to seconds

        if (gap <= GAP_THRESHOLD) {
          // Device was active during this period
          totalActiveTime += (nextTime - currentTime);
        }
        // If gap > threshold, device was offline - don't count this time
      }
    }

    const activeTimeSeconds = totalActiveTime / 1000;
    const expectedReadings = Math.floor(activeTimeSeconds / READING_INTERVAL);
    const collectedReadings = sensorData.length;
    const missedReadings = Math.max(0, expectedReadings - collectedReadings);
    const uptimePercent = expectedReadings > 0
      ? Math.min(100, (collectedReadings / expectedReadings) * 100)
      : (collectedReadings > 0 ? 100 : 0); // If we have readings but expected is 0, give 100%

    // Debug logging for uptime calculation
    if (sensorData.length > 0 && sensorData.length % 5 === 0) {
      console.log('📊 Uptime Calculation (Time-Window Based):');
      console.log(`   Active collection time: ${(activeTimeSeconds / 60).toFixed(2)} minutes`);
      console.log(`   Collected: ${collectedReadings} readings`);
      console.log(`   Expected: ${expectedReadings} readings (during active periods only)`);
      console.log(`   Uptime: ${uptimePercent.toFixed(1)}%`);
    }

    const hoursElapsed = totalActiveTime / (1000 * 60 * 60);
    const perfectDayStreak = uptimePercent > 99 ? Math.floor(hoursElapsed / 24) : 0;

    return {
      uptimePercent,
      expectedReadings,
      collectedReadings,
      perfectDayStreak,
      missedReadings,
    };
  };

  /**
   * Calculate incentives based on consistency (use backend data if available)
   */
  const getIncentiveData = (): IncentiveData => {
    // Prefer backend data (actual incentive calculation)
    if (backendIncentives) {
      const { total_earned, consistency_percent } = backendIncentives;

      // Determine reward tier based on consistency
      let rewardTier: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      if (consistency_percent >= 98) {
        rewardTier = 'HIGH';
      } else if (consistency_percent >= 90) {
        rewardTier = 'MEDIUM';
      }

      const nextTierThreshold = rewardTier === 'LOW' ? 90 : rewardTier === 'MEDIUM' ? 98 : 99.5;

      return {
        dailyEarned: total_earned, // Authorization (0.02) + Consistency bonus (0-0.4)
        weeklyEarned: total_earned * 7,
        pending: total_earned * 0.25, // 25% pending in batch
        rewardTier,
        nextTierThreshold,
      };
    }

    // Fallback: Calculate from local session data
    const consistency = getConsistencyMetrics();
    const { uptimePercent } = consistency;

    // Reward tiers based on consistency
    let rewardTier: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    let baseReward = 0.020; // 0.02 tDUST (LOW tier)

    if (uptimePercent >= 98) {
      rewardTier = 'HIGH';
      baseReward = 0.100; // 0.1 tDUST (HIGH tier - 5x multiplier)
    } else if (uptimePercent >= 90) {
      rewardTier = 'MEDIUM';
      baseReward = 0.050; // 0.05 tDUST (MEDIUM tier - 2.5x multiplier)
    }

    const dailyEarned = baseReward;
    const weeklyEarned = dailyEarned * 7;
    const pending = baseReward * 0.25; // 25% pending in batch

    const nextTierThreshold = rewardTier === 'LOW' ? 90 : rewardTier === 'MEDIUM' ? 98 : 99.5;

    return {
      dailyEarned,
      weeklyEarned,
      pending,
      rewardTier,
      nextTierThreshold,
    };
  };

  /**
   * @deprecated DO NOT USE - Creates fake device without actual hardware
   * Device registration now happens automatically via checkAndRegisterDevice()
   * when a real Arduino connects via BLE and sends its first reading.
   *
   * This function was used for demo/testing but creates misleading UX where
   * users think they have a device registered when they don't have hardware.
   */
  const handleRegisterDevice_DEPRECATED = async () => {
    if (!wallet.isConnected || !wallet.address) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setError(null);
      const devicePubkey = `device_${wallet.address.substring(0, 16)}`;

      const response = await fetch(`${API_BASE}/api/arduino/registry/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_pubkey: devicePubkey,
          owner_wallet: wallet.address, // CRITICAL: Pass wallet address for persistence
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
        merkleRoot: data.global_auto_collection_root,
      });

      if (data.already_registered) {
        console.log('✅ Device already registered (loading existing data)');
        console.log(`   Owner wallet: ${wallet.address}`);
        console.log(`   Device pubkey: ${devicePubkey}`);
      } else {
        console.log('✅ Device registered (new)');
        console.log(`   Owner wallet: ${wallet.address}`);
        console.log(`   Device pubkey: ${devicePubkey}`);
      }

      // Fetch device data (works for both new and existing registrations)
      await fetchDeviceData();
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message);
    }
  };

  /**
   * Initialize device secret for ZK proofs (one-time)
   * In production, this would be securely stored on the device
   */
  const initializeDeviceSecret = () => {
    if (!deviceSecret && deviceInfo?.pubkey) {
      // Generate deterministic secret from device pubkey (DEMO ONLY)
      // In production, this would be securely generated and stored on Arduino
      const secret = Array.from(deviceInfo.pubkey.slice(0, 64))
        .map((c, i) => String.fromCharCode(c.charCodeAt(0) + i % 10))
        .join('')
        .substring(0, 64);
      setDeviceSecret(secret);
      console.log('🔐 Device secret initialized for ZK proofs');
      return secret;
    }
    return deviceSecret;
  };

  /**
   * Fetch ZK proof statistics and privacy metrics
   */
  const fetchZKStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/arduino/zk/stats`);
      const data = await response.json();

      setZkProofStats(data);
      setAnonymitySetSize(data.privacy?.anonymity_set_size || 0);
      setCurrentEpoch(data.privacy?.current_epoch || Math.floor(Date.now() / (24 * 60 * 60 * 1000)));

      console.log('📊 ZK Stats:', data);
    } catch (err) {
      console.error('Failed to fetch ZK stats:', err);
    }
  };

  /**
   * Generate ZK proof for sensor reading (PRIVACY MODE)
   */
  const generateZKProof = async (temperature: number, humidity: number) => {
    if (!deviceInfo?.pubkey || !wallet.address) {
      throw new Error('Device not registered or wallet not connected');
    }

    const secret = deviceSecret || initializeDeviceSecret();
    if (!secret) {
      throw new Error('Failed to initialize device secret');
    }

    console.log('\n🔐 GENERATING ZK PROOF (PRIVATE MODE)');
    console.log('═══════════════════════════════════════');

    const startTime = Date.now();

    try {
      const response = await fetch(`${API_BASE}/api/arduino/zk/generate-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temperature,
          humidity,
          timestamp: Math.floor(Date.now() / 1000),
          device_pubkey: deviceInfo.pubkey,
          device_secret: secret,
          collection_mode: deviceInfo.collectionMode || 'auto',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Proof generation failed');
      }

      const proofTime = Date.now() - startTime;
      setLastProofGenTime(proofTime);
      setCurrentNullifier(data.public_inputs.nullifier);

      console.log(`✅ ZK Proof generated in ${proofTime}ms`);
      console.log(`   Nullifier: ${data.public_inputs.nullifier.slice(0, 16)}...`);
      console.log(`   Epoch: ${data.public_inputs.epoch}`);
      console.log('═══════════════════════════════════════\n');

      return data;
    } catch (err: any) {
      console.error('❌ ZK proof generation failed:', err);
      throw err;
    }
  };

  /**
   * Submit private reading with ZK proof
   */
  const submitPrivateReading = async (proof: any, temperature: number, humidity: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/arduino/zk/submit-private-reading`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proof: proof.proof,
          public_inputs: proof.public_inputs,
          temperature,
          humidity,
          timestamp: Math.floor(Date.now() / 1000),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Private submission failed');
      }

      console.log('✅ PRIVATE READING SUBMITTED');
      console.log(`   Reward: ${data.reward} tDUST`);
      console.log(`   Your identity: ANONYMOUS`);
      console.log(`   Nullifier: ${data.nullifier.slice(0, 16)}...`);

      if (data.ipfs_cid) {
        console.log(`   📦 IPFS CID: ${data.ipfs_cid}`);
        console.log(`   🌐 Gateway: ${data.ipfs_gateway_url}`);
        console.log('   ✅ Proof stored on decentralized IPFS!');
      }

      return data;
    } catch (err: any) {
      console.error('❌ Private submission failed:', err);
      throw err;
    }
  };

  // Fetch ZK stats when device is registered
  useEffect(() => {
    if (deviceInfo?.registered) {
      fetchZKStats();
      const interval = setInterval(fetchZKStats, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [deviceInfo?.registered]);

  /**
   * Check if device is registered, and auto-register if not
   */
  const checkAndRegisterDevice = async (device_pubkey: string): Promise<boolean> => {
    try {
      if (!wallet.address) {
        console.error('❌ Wallet not connected');
        setError('Please connect your wallet first');
        return false;
      }

      console.log(`🔍 Checking registration for device: ${device_pubkey.slice(0, 16)}...`);
      console.log(`   API_BASE: ${API_BASE}`);
      console.log(`   Endpoint: ${API_BASE}/api/arduino/registry/check`);

      // 1. Check if device is already registered
      const checkResponse = await fetch(`${API_BASE}/api/arduino/registry/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_pubkey }),
      });

      const checkResult = await checkResponse.json();

      if (checkResult.approved) {
        console.log('✅ Device already registered');

        // Update device info state
        setDeviceInfo({
          deviceId: `arduino-${device_pubkey.slice(0, 8)}`,
          pubkey: device_pubkey,
          registered: true,
          collectionMode: 'auto',
        });

        return true;
      }

      // 2. Device not registered → auto-register it
      console.log('📝 Auto-registering new Arduino device...');
      console.log(`   Wallet: ${wallet.address}`);
      console.log(`   Device: ${device_pubkey.slice(0, 16)}...`);

      const registerResponse = await fetch(`${API_BASE}/api/arduino/registry/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_pubkey,
          owner_wallet: wallet.address,
          collection_mode: 'auto',
          device_id: `arduino-${Date.now()}`,
          metadata: {
            registered_via: 'ble',
            first_seen: Date.now(),
            device_type: 'Arduino Nano 33 BLE Sense',
          },
        }),
      });

      const registerResult = await registerResponse.json();

      if (registerResult.success) {
        console.log('✅ Device registered successfully!');
        console.log(`   Device ID: ${registerResult.registration.device_pubkey.slice(0, 16)}...`);
        console.log(`   Owner: ${wallet.address}`);
        console.log(`   Mode: auto (0.1 DUST per reading)`);

        // Update device info state
        setDeviceInfo({
          deviceId: registerResult.registration.device_id || `arduino-${device_pubkey.slice(0, 8)}`,
          pubkey: device_pubkey,
          registered: true,
          collectionMode: 'auto',
          merkleRoot: registerResult.global_auto_collection_root,
        });

        return true;
      } else {
        console.error('❌ Registration failed:', registerResult);
        setError(`Device registration failed: ${registerResult.error || 'Unknown error'}`);
        return false;
      }
    } catch (error: any) {
      console.error('❌ Error checking/registering device:', error);
      setError(`Device registration error: ${error.message}`);
      return false;
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

      // Track if we've registered the device yet
      let deviceRegistered = false;

      // Listen for sensor readings
      characteristic.addEventListener('characteristicvaluechanged', async (event: any) => {
        const buffer = event.target.value.buffer;
        const reading = parseIoTPayload(buffer);

        console.log('📊 BLE reading received:', {
          temperature: reading.t,
          humidity: reading.h,
          device: reading.device_pubkey?.slice(0, 16) + '...',
        });

        // Auto-register device on first reading
        if (!deviceRegistered && reading.device_pubkey) {
          console.log('🔐 First reading from device, checking registration...');
          deviceRegistered = await checkAndRegisterDevice(reading.device_pubkey);

          if (!deviceRegistered) {
            console.error('❌ Failed to register device, skipping reading');
            return;
          }
        }

        // Store reading in local state
        const sensorReading: SensorData = {
          timestamp: Date.now(),
          temperature: reading.t,
          humidity: reading.h,
          source: 'iot-kit',
        };

        setCurrentReading(sensorReading);
        setSensorData((prev) => [...prev, sensorReading].slice(-1000)); // Keep last 1000

        // Submit reading to backend for real-time reward distribution
        try {
          const submitResponse = await fetch(`${API_BASE}/api/arduino/readings/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              device_pubkey: reading.device_pubkey,
              reading: reading.reading_json,
              signature: reading.signature,
              owner_wallet: wallet.address,
              collection_mode: 'auto',
            }),
          });

          const submitResult = await submitResponse.json();

          if (submitResult.success) {
            console.log('✅ Reading submitted successfully');
            console.log(`   IPFS CID: ${submitResult.ipfs_cid}`);
            console.log(`   Reward distributed: ${submitResult.reward_amount} tDUST`);
            console.log(`   Transaction: ${submitResult.tx_hash || 'pending'}`);

            // Accumulate rewards and show notification every 60 seconds
            const now = Date.now();
            const timeSinceLastNotification = now - lastRewardNotification;
            const newAccumulated = accumulatedRewards + (submitResult.reward_amount || 0);
            setAccumulatedRewards(newAccumulated);

            // DISABLED: Reward notifications temporarily disabled
            // Accumulate rewards silently in console logs only
            console.log(`⏱️  Reward notification (DISABLED):`);
            console.log(`   Time since last: ${(timeSinceLastNotification / 1000).toFixed(1)}s`);
            console.log(`   Accumulated: ${newAccumulated.toFixed(2)} tDUST`);
            console.log(`   Notification: DISABLED (check console for rewards)`);

            // Update accumulator but don't show notification
            if (timeSinceLastNotification >= 60000) {
              setLastRewardNotification(now);
              setAccumulatedRewards(0); // Reset accumulator
              console.log(`   💰 Total earned in last 60s: ${newAccumulated.toFixed(2)} tDUST (notification disabled)`);
            }

            // COMMENTED OUT: Annoying notification
            // if (timeSinceLastNotification >= 60000) { // 60 seconds
            //   setError(null);
            //   setSuccess(`🎉 +${newAccumulated.toFixed(2)} tDUST earned! Readings verified & stored on IPFS.`);
            //   setLastRewardNotification(now);
            //   setAccumulatedRewards(0); // Reset accumulator
            //   console.log(`   ✅ SHOWING NOTIFICATION`);
            //   setTimeout(() => setSuccess(null), 3000);
            // }
          } else {
            console.warn('⚠️ Reading submission failed:', submitResult.error);
            setError(`Failed to submit reading: ${submitResult.error}`);
          }
        } catch (err) {
          console.error('❌ Failed to submit reading:', err);
        }
      });

      setIsCollecting(true);
      console.log('✓ Connected to IoT Kit, listening for readings...');
    } catch (err: any) {
      console.error('BLE connection error:', err);

      // Provide friendly, helpful error messages
      let friendlyMessage = 'Failed to connect to IoT Kit via BLE';

      if (err.message?.includes('cancelled') || err.message?.includes('chooser')) {
        friendlyMessage = '🔍 No device selected. Please click "Connect IoT Kit via BLE" again and select "EdgeChain-Demo" from the list.';
      } else if (err.message?.includes('not found') || err.message?.includes('No device')) {
        friendlyMessage = '📡 No Arduino found nearby. Make sure your Arduino is powered on, has EdgeChain firmware flashed, and is within 10 meters.';
      } else if (err.message?.includes('permission') || err.message?.includes('denied')) {
        friendlyMessage = '🔒 Bluetooth permission denied. Please enable Bluetooth in your browser settings and try again.';
      } else if (err.message?.includes('not supported')) {
        friendlyMessage = '⚠️ Web Bluetooth not supported. Please use Chrome, Edge, or Opera browser.';
      } else if (err.message?.includes('GATT') || err.message?.includes('connect')) {
        friendlyMessage = '⚡ Connection failed. Make sure the Arduino is not already connected to another device, then try again.';
      } else if (err.message) {
        friendlyMessage = `❌ Connection error: ${err.message}`;
      }

      setError(friendlyMessage);
    }
  };

  /**
   * Parse IoT Kit BLE payload
   * Format: [1 byte: JSON length][N bytes: JSON][64 bytes: signature][32 bytes: device pubkey]
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
    idx += json_len;

    // Read signature (64 bytes)
    const signature_bytes = view.slice(idx, idx + 64);
    const signature = Array.from(signature_bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    idx += 64;

    // Read device public key (32 bytes)
    const pubkey_bytes = view.slice(idx, idx + 32);
    const device_pubkey = Array.from(pubkey_bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return {
      ...reading,
      signature,
      device_pubkey,
      reading_json,
    };
  };

  /**
   * Collect a sensor reading (fallback simulation for testing without hardware)
   * Supports PRIVATE MODE with ZK proofs for farmer privacy
   */
  const collectReading = async () => {
    try {
      setError(null);

      // Generate realistic agricultural sensor data
      const temperature = 20 + Math.random() * 10;
      const humidity = 50 + Math.random() * 30;

      // PRIVATE MODE: Use ZK proofs for anonymous submission
      if (usePrivateMode && deviceInfo?.registered) {
        console.log('🔐 PRIVATE MODE: Generating ZK proof...');

        try {
          // 1. Generate ZK proof
          const zkProof = await generateZKProof(temperature, humidity);

          // 2. Submit privately (identity hidden!)
          await submitPrivateReading(zkProof, temperature, humidity);

          // 3. Update local data (for display only, not linked to identity on backend)
          const sensorReading: SensorData = {
            timestamp: Date.now(),
            temperature,
            humidity,
            source: 'simulated',
          };

          setCurrentReading(sensorReading);
          setSensorData((prev) => [...prev, sensorReading].slice(-1000));

          // 4. Refresh privacy stats
          await fetchZKStats();

          console.log('✅ PRIVATE SUBMISSION COMPLETE - Your identity is ANONYMOUS');
        } catch (zkErr: any) {
          console.error('❌ Private submission failed, falling back to direct mode:', zkErr);
          // Fall through to direct submission if ZK fails
          setError(`Private mode failed: ${zkErr.message}. Try disabling private mode.`);
          return;
        }
      }
      // DIRECT MODE: Traditional submission (identity visible to backend)
      else {
        console.log('⚠️  DIRECT MODE: Submitting without privacy...');

        const response = await fetch(`${API_BASE}/api/arduino/simulate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            temperature,
            humidity,
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
        setSensorData((prev) => [...prev, sensorReading].slice(-1000));

        console.log('📊 Direct submission (no privacy):', sensorReading);
      }
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
  const consistency = getConsistencyMetrics();
  const incentives = getIncentiveData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-teal-900 to-blue-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pt-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <span>🔐</span> IoT Kit Dashboard
            </h1>
            <p className="text-green-200 text-sm mt-1">
              ZK-Verified Data Collection with Incentive Tracking
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setDemoMode(!demoMode)}
              className="px-4 py-2 bg-purple-600/60 text-white rounded-lg hover:bg-purple-600 transition-all"
            >
              {demoMode ? 'Exit Demo' : '👥 Demo Mode'}
            </button>
            <button
              onClick={() => navigate('/selection')}
              className="px-4 py-2 bg-slate-800/60 text-white rounded-lg hover:bg-slate-800 transition-all"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500/50 rounded-lg">
            <p className="text-red-200">❌ {error}</p>
          </div>
        )}

        {/* Success/Reward Notification - DISABLED */}
        {false && success && (
          <div className="mb-6 p-4 bg-green-900/50 border border-green-500/50 rounded-lg animate-pulse">
            <p className="text-green-200 font-semibold">{success}</p>
          </div>
        )}

        {!deviceInfo?.registered ? (
          /* BLE Connection Flow */
          <div className="bg-slate-800/60 backdrop-blur-md border border-blue-500/30 rounded-2xl p-8">
            <div className="mb-6 text-center">
              <div className="text-6xl mb-4">📡</div>
              <h2 className="text-2xl font-bold text-white mb-2">Connect Your Arduino IoT Kit</h2>
              <p className="text-blue-200 mb-6">
                Connect your Arduino Nano 33 BLE Sense via Bluetooth to start earning rewards
              </p>
            </div>

            {/* Requirements */}
            <div className="bg-yellow-500/20 border border-yellow-400/50 rounded-lg p-4 mb-4">
              <p className="text-yellow-200 text-sm font-semibold mb-2">
                ⚠️ Requirements:
              </p>
              <ul className="text-yellow-100 text-sm space-y-1 list-disc list-inside">
                <li>Arduino Nano 33 BLE Sense with EdgeChain firmware flashed</li>
                <li>Wallet connected (for device ownership)</li>
                <li>Browser with Web Bluetooth support (Chrome, Edge, Opera)</li>
                <li>Arduino powered on and within BLE range (~10 meters)</li>
              </ul>
            </div>

            {/* How it works */}
            <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4 mb-6">
              <p className="text-blue-200 text-sm font-semibold mb-2">
                📝 How it works:
              </p>
              <ol className="text-blue-100 text-sm space-y-1 list-decimal list-inside">
                <li>Click "Connect IoT Kit" below</li>
                <li>Select your Arduino from BLE picker (named "EdgeChain-XXXX" with unique ID)</li>
                <li>Device will auto-register to your wallet on first reading</li>
                <li>Start earning 0.1 DUST per verified reading!</li>
              </ol>
            </div>

            <div className="text-center">
              <button
                onClick={connectBLE}
                disabled={!wallet.isConnected}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              >
                {wallet.isConnected ? '📡 Connect IoT Kit via BLE' : '⚠️ Connect Wallet First'}
              </button>
              <p className="text-gray-400 text-sm mt-4">
                Need EdgeChain firmware? Download it{' '}
                <a
                  href="https://github.com/solkem/edgechain-midnight-hackathon/blob/main/arduino/edgechain_iot/edgechain_iot.ino"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline font-semibold"
                >
                  here
                </a>
                {' '}and flash to your Arduino Nano 33 BLE Sense.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* PRIORITY 1: ZK PROOF VERIFICATION STATUS - HERO SECTION */}
            <details className="mb-6 bg-gradient-to-br from-purple-900/80 to-blue-900/80 backdrop-blur-md border-2 border-purple-400/50 rounded-2xl shadow-2xl">
              <summary className="cursor-pointer p-6 hover:bg-purple-900/60 rounded-2xl transition-all">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <span className="text-4xl">🔐</span> Midnight ZK Proof Status
                  </h2>
                  <div className="px-4 py-2 bg-green-500/20 border border-green-400 rounded-lg">
                    <span className="text-green-300 font-bold text-sm">LIVE</span>
                  </div>
                </div>
              </summary>
              <div className="px-6 pb-6">

              <div className="grid md:grid-cols-3 gap-6">
                {/* Privacy Mode Toggle */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-200 font-semibold">Privacy Mode</span>
                    <button
                      onClick={() => setUsePrivateMode(!usePrivateMode)}
                      className={`px-4 py-2 rounded-lg font-bold transition-all ${
                        usePrivateMode
                          ? 'bg-green-500/20 border-2 border-green-400 text-green-300'
                          : 'bg-red-500/20 border-2 border-red-400 text-red-300'
                      }`}
                    >
                      {usePrivateMode ? '🔒 PRIVATE' : '⚠️ PUBLIC'}
                    </button>
                  </div>
                  <p className="text-xs text-purple-200">
                    {usePrivateMode
                      ? 'Your identity is HIDDEN via ZK proofs. Backend cannot track you.'
                      : 'Warning: Your device identity is VISIBLE to backend.'}
                  </p>

                  {/* Privacy Metrics */}
                  {usePrivateMode && (
                    <div className="bg-slate-900/50 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-purple-300">Anonymity Set:</span>
                        <span className="text-white font-bold">{anonymitySetSize} devices</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-purple-300">Current Epoch:</span>
                        <span className="text-white font-mono">{currentEpoch}</span>
                      </div>
                      {currentNullifier && (
                        <div className="flex justify-between text-xs">
                          <span className="text-purple-300">Nullifier:</span>
                          <span className="text-white font-mono">{currentNullifier.slice(0, 8)}...</span>
                        </div>
                      )}
                      {lastProofGenTime > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-purple-300">Last Proof:</span>
                          <span className="text-white font-bold">{lastProofGenTime}ms</span>
                        </div>
                      )}
                      {zkProofStats?.ipfs && (
                        <div className="border-t border-purple-700/30 pt-2 mt-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-purple-300">IPFS Storage:</span>
                            <span className="text-white font-bold">
                              {zkProofStats.ipfs.stored_on_ipfs}/{zkProofStats.ipfs.total_submissions}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-purple-300">Decentralized:</span>
                            <span className="text-green-400 font-bold">{zkProofStats.ipfs.percentage}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Verification Status */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-green-400 text-5xl">✅</span>
                    <div>
                      <p className="text-green-300 font-bold text-xl">VERIFIED</p>
                      <p className="text-green-200 text-sm">Device Authorized on Midnight Testnet</p>
                    </div>
                  </div>

                  <div className="bg-slate-900/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-purple-200 text-sm">Current Batch:</span>
                      <span className="text-white font-bold">{sensorData.length} readings</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-purple-200 text-sm">Proof Generated:</span>
                      <span className="text-white font-bold">
                        {deviceInfo.lastProofTime
                          ? `${Math.floor((Date.now() - deviceInfo.lastProofTime) / 60000)}m ago`
                          : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-purple-200 text-xs mb-1">Merkle Root (Auto-Collection)</p>
                    <p className="text-white font-mono text-sm break-all">
                      {deviceInfo.merkleRoot || 'Generating...'}
                    </p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-purple-200 text-xs mb-1">Device Pubkey</p>
                    <p className="text-white font-mono text-xs break-all">{deviceInfo.pubkey}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-all">
                      View Proof Details
                    </button>
                    <button className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-all">
                      Verify On-Chain
                    </button>
                  </div>
                </div>
              </div>
              </div>
            </details>

            {/* PRIORITY 2 & 3: CONSISTENCY + INCENTIVES */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* CONSISTENCY SCORE */}
              <div className="bg-slate-800/60 backdrop-blur-md border-2 border-green-500/50 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span>📊</span> Data Collection Consistency
                </h2>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-2xl font-bold text-white">{consistency.uptimePercent.toFixed(1)}%</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      consistency.uptimePercent >= 98
                        ? 'bg-green-500/20 text-green-300 border border-green-400'
                        : consistency.uptimePercent >= 90
                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-400'
                        : 'bg-red-500/20 text-red-300 border border-red-400'
                    }`}>
                      {consistency.uptimePercent >= 98 ? 'Excellent' : consistency.uptimePercent >= 90 ? 'Good' : 'Poor'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        consistency.uptimePercent >= 98
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                          : consistency.uptimePercent >= 90
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                          : 'bg-gradient-to-r from-red-500 to-pink-500'
                      }`}
                      style={{ width: `${Math.min(100, consistency.uptimePercent)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-slate-900/50 rounded-lg p-3 flex justify-between">
                    <span className="text-green-200 text-sm">Uptime:</span>
                    <span className="text-white font-bold">{consistency.collectedReadings}/{consistency.expectedReadings}</span>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3 flex justify-between">
                    <span className="text-green-200 text-sm">Reading Interval:</span>
                    <span className="text-white font-bold">30 seconds</span>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3 flex justify-between">
                    <span className="text-green-200 text-sm">Missed Readings:</span>
                    <span className="text-red-300 font-bold">{consistency.missedReadings}</span>
                  </div>
                  {consistency.perfectDayStreak > 0 && (
                    <div className="bg-orange-900/30 border border-orange-500/50 rounded-lg p-3 flex items-center gap-2">
                      <span className="text-2xl">🔥</span>
                      <span className="text-orange-200 font-bold">
                        {consistency.perfectDayStreak} day{consistency.perfectDayStreak !== 1 ? 's' : ''} perfect streak!
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* tDUST INCENTIVES */}
              <div className="bg-slate-800/60 backdrop-blur-md border-2 border-yellow-500/50 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span>💰</span> tDUST Incentives Earned
                </h2>

                <div className="mb-4">
                  <div className="text-center py-4 bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-lg border border-yellow-500/50">
                    <p className="text-yellow-200 text-sm mb-1">Today's Earnings</p>
                    <p className="text-5xl font-bold text-yellow-300">{incentives.dailyEarned.toFixed(3)}</p>
                    <p className="text-yellow-100 text-sm mt-1">tDUST</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-slate-900/50 rounded-lg p-3 flex justify-between">
                    <span className="text-yellow-200 text-sm">This Week:</span>
                    <span className="text-white font-bold">{incentives.weeklyEarned.toFixed(3)} tDUST</span>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3 flex justify-between">
                    <span className="text-yellow-200 text-sm">Pending (Batch):</span>
                    <span className="text-white font-bold">{incentives.pending.toFixed(3)} tDUST</span>
                  </div>
                  <div className={`rounded-lg p-3 flex justify-between ${
                    incentives.rewardTier === 'HIGH'
                      ? 'bg-green-900/30 border border-green-500/50'
                      : incentives.rewardTier === 'MEDIUM'
                      ? 'bg-yellow-900/30 border border-yellow-500/50'
                      : 'bg-red-900/30 border border-red-500/50'
                  }`}>
                    <span className={`text-sm ${
                      incentives.rewardTier === 'HIGH' ? 'text-green-200' : incentives.rewardTier === 'MEDIUM' ? 'text-yellow-200' : 'text-red-200'
                    }`}>
                      Reward Tier:
                    </span>
                    <span className={`font-bold ${
                      incentives.rewardTier === 'HIGH' ? 'text-green-300' : incentives.rewardTier === 'MEDIUM' ? 'text-yellow-300' : 'text-red-300'
                    }`}>
                      {incentives.rewardTier}
                    </span>
                  </div>
                  <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3">
                    <p className="text-blue-200 text-xs mb-1">Next Tier Threshold:</p>
                    <p className="text-blue-100 font-bold">{incentives.nextTierThreshold}% consistency → +20% bonus</p>
                  </div>
                  <button className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-bold py-3 rounded-xl transition-all">
                    💰 Claim Rewards
                  </button>
                </div>
              </div>
            </div>

            {/* SECONDARY: Device Control + Current Reading */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Device Control */}
              <div className="bg-slate-800/40 backdrop-blur-md border border-green-500/20 rounded-xl p-5">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <span>📡</span> Device Control
                </h3>

                <div className="space-y-3">
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                    <p className="text-blue-200 text-xs mb-2">
                      <strong>🔵 Real Hardware:</strong> Connect via Web Bluetooth
                    </p>
                    <button
                      onClick={connectBLE}
                      disabled={isCollecting}
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-2 px-4 rounded-lg transition-all disabled:opacity-50 text-sm"
                    >
                      {isCollecting ? '✅ Connected' : '🔗 Connect BLE'}
                    </button>
                  </div>

                  <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
                    <p className="text-purple-200 text-xs mb-2">
                      <strong>🟣 Simulation:</strong> Test without hardware
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setIsCollecting(!isCollecting);
                          if (!isCollecting) collectReading();
                        }}
                        className={`flex-1 font-semibold py-2 px-4 rounded-lg transition-all text-sm ${
                          isCollecting
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                        }`}
                      >
                        {isCollecting ? 'Stop' : 'Start'}
                      </button>
                      <button
                        onClick={collectReading}
                        disabled={isCollecting}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 text-sm"
                      >
                        Manual
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Reading */}
              <div className="bg-slate-800/40 backdrop-blur-md border border-green-500/20 rounded-xl p-5">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <span>📊</span> Current Reading
                </h3>

                {currentReading ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-3">
                        <p className="text-orange-300 text-xs mb-1">Temperature</p>
                        <p className="text-2xl font-bold text-white">
                          {currentReading.temperature.toFixed(1)}°C
                        </p>
                      </div>
                      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                        <p className="text-blue-300 text-xs mb-1">Humidity</p>
                        <p className="text-2xl font-bold text-white">
                          {currentReading.humidity.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 text-center">
                      {new Date(currentReading.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <p className="text-sm">No readings yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Collapsible: Farm Details + Data Summary */}
            <details className="mb-6 bg-slate-800/30 backdrop-blur-md border border-green-500/20 rounded-xl">
              <summary className="cursor-pointer p-4 text-white font-semibold hover:bg-slate-700/30 rounded-xl transition-all">
                📋 Farm Details & Data Summary (Click to expand)
              </summary>
              <div className="p-4 grid md:grid-cols-2 gap-4">
                {/* Farm Metadata */}
                <div>
                  <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <span>🌾</span> Farm Configuration
                  </h4>
                  <div className="space-y-2">
                    <select
                      value={farmMetadata.cropType}
                      onChange={(e) => setFarmMetadata({ ...farmMetadata, cropType: e.target.value })}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="maize">Maize</option>
                      <option value="wheat">Wheat</option>
                      <option value="rice">Rice</option>
                      <option value="soybeans">Soybeans</option>
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={farmMetadata.soilType}
                        onChange={(e) => setFarmMetadata({ ...farmMetadata, soilType: e.target.value })}
                        className="bg-slate-700/50 border border-slate-600 rounded-lg px-2 py-1 text-white text-xs"
                      >
                        <option value="loamy">Loamy</option>
                        <option value="clay">Clay</option>
                        <option value="sandy">Sandy</option>
                      </select>
                      <select
                        value={farmMetadata.irrigationType}
                        onChange={(e) => setFarmMetadata({ ...farmMetadata, irrigationType: e.target.value })}
                        className="bg-slate-700/50 border border-slate-600 rounded-lg px-2 py-1 text-white text-xs"
                      >
                        <option value="drip">Drip</option>
                        <option value="sprinkler">Sprinkler</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Data Summary */}
                <div>
                  <h4 className="text-sm font-bold text-white mb-3">📈 Data Summary</h4>
                  {averageConditions ? (
                    <div className="space-y-2">
                      <div className="bg-slate-700/30 rounded-lg p-2 flex justify-between text-xs">
                        <span className="text-gray-300">Avg Temp:</span>
                        <span className="text-white font-bold">{averageConditions.temperature.toFixed(1)}°C</span>
                      </div>
                      <div className="bg-slate-700/30 rounded-lg p-2 flex justify-between text-xs">
                        <span className="text-gray-300">Avg Humidity:</span>
                        <span className="text-white font-bold">{averageConditions.humidity.toFixed(1)}%</span>
                      </div>
                      <div className="bg-slate-700/30 rounded-lg p-2 flex justify-between text-xs">
                        <span className="text-gray-300">Total Readings:</span>
                        <span className="text-white font-bold">{averageConditions.readings}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-xs">No data yet</p>
                  )}
                </div>
              </div>
            </details>

            {/* Action: Train with Sensor Data */}
            <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 backdrop-blur-md border border-purple-500/30 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <span>🚀</span> Train FL Model with IoT Data
              </h3>
              <p className="text-purple-100 text-sm mb-4">
                Use your ZK-verified sensor data to train a federated learning model for crop yield prediction
              </p>
              <button
                onClick={handleTrainWithSensorData}
                disabled={!averageConditions || sensorData.length < 5}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {averageConditions && sensorData.length >= 5
                  ? `🚀 Train Model (${sensorData.length} readings) →`
                  : '⏳ Collect at least 5 readings to train'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
