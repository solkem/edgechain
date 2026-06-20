/**
 * Privacy Demo Component
 *
 * Demonstrates EdgeChain's 4-tier privacy architecture
 * Focus: Layer 1 (L1) - Local encrypted storage
 */

import React, { useState, useEffect } from 'react';
import { localVault, RawIoTReading } from '../iot/localDataVault';
import { PRIVACY_LAYERS, EDGECHAIN_PRIVACY_GUARANTEES } from '../iot/privacyTypes';

export const PrivacyDemo: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [password, setPassword] = useState('demo_password_123');
  const [readings, setReadings] = useState<RawIoTReading[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleInitialize = async () => {
    try {
      addLog('🔐 Initializing Local Data Vault...');
      await localVault.initialize(password, 'DEMO_DEVICE_001');
      setIsInitialized(true);
      addLog('✅ Vault initialized with AES-256-GCM encryption');
      updateStats();
    } catch (error) {
      addLog(`❌ Error: ${(error as Error).message}`);
    }
  };

  const handleStoreReading = async () => {
    if (!isInitialized) {
      addLog('❌ Vault not initialized. Please initialize first.');
      return;
    }

    const reading: RawIoTReading = {
      temperature: 20 + Math.random() * 15,
      humidity: 50 + Math.random() * 30,
      soil_moisture: 30 + Math.random() * 40,
      pH: 6 + Math.random() * 2,
      timestamp: Date.now(),
      device_id: 'DEMO_DEVICE_001',
      location: {
        latitude: -19.015438, // Manicaland, Zimbabwe
        longitude: 32.673260
      }
    };

    try {
      addLog(`💾 L1: Storing reading (Temp: ${reading.temperature.toFixed(1)}°C, Humidity: ${reading.humidity.toFixed(1)}%)`);
      await localVault.storeReading(reading);
      addLog('✅ Reading encrypted and stored locally');
      await loadReadings();
      updateStats();
    } catch (error) {
      addLog(`❌ Error: ${(error as Error).message}`);
    }
  };

  const loadReadings = async () => {
    if (!isInitialized) return;

    try {
      const allReadings = await localVault.getAllReadings();
      setReadings(allReadings);
    } catch (error) {
      addLog(`❌ Error loading readings: ${(error as Error).message}`);
    }
  };

  const updateStats = () => {
    const storageStats = localVault.getStorageStats();
    setStats(storageStats);
  };

  const handleClearData = async () => {
    if (window.confirm('Are you sure you want to clear all data?')) {
      await localVault.clearAllData();
      setReadings([]);
      setStats(null);
      setIsInitialized(false);
      addLog('⚠️  All data cleared');
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>🔐 EdgeChain Privacy Demo</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Demonstrating Layer 1 (L1): Local Encrypted Storage - Raw data NEVER leaves your device
      </p>

      {/* Privacy Architecture Overview */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px'
      }}>
        <h2>🏗️ 4-Tier Privacy Architecture</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
          {Object.values(PRIVACY_LAYERS).map(layer => (
            <div key={layer.layer} style={{
              backgroundColor: 'white',
              padding: '15px',
              borderRadius: '6px',
              border: layer.layer === 'L1' ? '2px solid #28a745' : '1px solid #dee2e6'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: layer.layer === 'L1' ? '#28a745' : '#333' }}>
                {layer.layer}: {layer.description}
              </h3>
              <p style={{ fontSize: '14px', margin: '5px 0', color: '#666' }}>
                <strong>Storage:</strong> {layer.storage_location}
              </p>
              <p style={{ fontSize: '14px', margin: '5px 0', color: '#666' }}>
                <strong>Encryption:</strong> {layer.encryption}
              </p>
              <p style={{ fontSize: '14px', margin: '5px 0', color: '#666' }}>
                <strong>Visibility:</strong> {layer.visibility}
              </p>
              <p style={{ fontSize: '14px', margin: '5px 0', fontWeight: 'bold' }}>
                {layer.data_retained ? '✅ Retained' : '🗑️  Deleted after use'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy Guarantees */}
      <div style={{
        backgroundColor: '#e7f3ff',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px',
        border: '2px solid #007bff'
      }}>
        <h2>🛡️ Privacy Guarantees</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
          {Object.entries(EDGECHAIN_PRIVACY_GUARANTEES).map(([key, guarantee]) => (
            <div key={key} style={{ padding: '10px' }}>
              <h4 style={{ margin: '0 0 5px 0', color: '#007bff' }}>
                {guarantee.guaranteed ? '✅' : '❌'} {key.replace(/_/g, ' ').toUpperCase()}
              </h4>
              <p style={{ fontSize: '14px', margin: 0, color: '#333' }}>
                {guarantee.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #dee2e6',
        marginBottom: '20px'
      }}>
        <h2>🎮 L1 Demo Controls</h2>

        {!isInitialized ? (
          <div>
            <label style={{ display: 'block', marginBottom: '10px' }}>
              <strong>Farmer Password (for encryption):</strong>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px',
                  marginTop: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
                placeholder="Enter password for encryption"
              />
            </label>
            <button
              onClick={handleInitialize}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              🔐 Initialize Vault
            </button>
          </div>
        ) : (
          <div>
            <button
              onClick={handleStoreReading}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                marginRight: '10px'
              }}
            >
              💾 Store Random IoT Reading
            </button>
            <button
              onClick={loadReadings}
              style={{
                backgroundColor: '#17a2b8',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                marginRight: '10px'
              }}
            >
              📖 Load Readings
            </button>
            <button
              onClick={handleClearData}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              🗑️  Clear All Data
            </button>
          </div>
        )}

        {stats && (
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <h4>📊 Storage Statistics</h4>
            <p><strong>Device ID:</strong> {stats.device_id}</p>
            <p><strong>Total Readings:</strong> {stats.reading_count}</p>
            <p><strong>Last Encrypted:</strong> {new Date(stats.encrypted_at).toLocaleString()}</p>
            <p><strong>Version:</strong> {stats.version}</p>
          </div>
        )}
      </div>

      {/* Stored Readings */}
      {readings.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          marginBottom: '20px'
        }}>
          <h2>📊 Stored Readings ({readings.length})</h2>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Time</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Temp (°C)</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Humidity (%)</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Soil (%)</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>pH</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Location</th>
                </tr>
              </thead>
              <tbody>
                {readings.slice().reverse().map((reading, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '10px' }}>{new Date(reading.timestamp).toLocaleTimeString()}</td>
                    <td style={{ padding: '10px' }}>{reading.temperature.toFixed(1)}</td>
                    <td style={{ padding: '10px' }}>{reading.humidity.toFixed(1)}</td>
                    <td style={{ padding: '10px' }}>{reading.soil_moisture?.toFixed(1) || 'N/A'}</td>
                    <td style={{ padding: '10px' }}>{reading.pH?.toFixed(1) || 'N/A'}</td>
                    <td style={{ padding: '10px', fontSize: '12px' }}>
                      {reading.location ?
                        `${reading.location.latitude.toFixed(4)}, ${reading.location.longitude.toFixed(4)}`
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: '15px', color: '#28a745', fontWeight: 'bold' }}>
            🔒 All data encrypted with AES-256-GCM. Location data NEVER transmitted over network.
          </p>
        </div>
      )}

      {/* Activity Log */}
      <div style={{
        backgroundColor: '#1e1e1e',
        padding: '20px',
        borderRadius: '8px',
        color: '#00ff00',
        fontFamily: 'monospace',
        fontSize: '14px',
        maxHeight: '300px',
        overflowY: 'auto'
      }}>
        <h3 style={{ color: '#00ff00', marginTop: 0 }}>📜 Activity Log</h3>
        {log.map((entry, idx) => (
          <div key={idx}>{entry}</div>
        ))}
      </div>
    </div>
  );
};

export default PrivacyDemo;
