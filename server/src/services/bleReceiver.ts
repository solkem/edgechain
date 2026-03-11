/**
 * BLE Receiver Service (Node.js Gateway)
 *
 * This is a mock/simulation for the gateway BLE receiver
 * In production, this would use the Web Bluetooth API (browser) or noble (Node.js)
 *
 * For the actual demo, use the browser-based implementation in gateway/ble_receiver.ts
 */

import { SignedReading, ArduinoReading } from '../types/iot';

export class BLEReceiverService {
  private onReadingCallback?: (reading: SignedReading) => void;

  /**
   * Start listening for BLE devices (mock)
   */
  async startListening(
    onReading: (reading: SignedReading) => void
  ): Promise<void> {
    this.onReadingCallback = onReading;
    console.log('🔍 BLE Receiver: Scanning for EdgeChain devices...');
    console.log('   (In production: use Web Bluetooth API or noble)');
  }

  /**
   * Parse Arduino payload
   */
  parseArduinoPayload(buffer: ArrayBuffer): SignedReading {
    const view = new Uint8Array(buffer);
    let idx = 0;

    // Read JSON length
    const json_len = view[idx++];

    // Read JSON
    const json_bytes = view.slice(idx, idx + json_len);
    const reading_json = new TextDecoder().decode(json_bytes);
    idx += json_len;

    // Read signature (64 bytes)
    const signature = Array.from(view.slice(idx, idx + 64))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    idx += 64;

    // Read device pubkey (32 bytes)
    const device_pubkey = Array.from(view.slice(idx, idx + 32))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return {
      reading_json,
      signature,
      device_pubkey,
      timestamp: Date.now(),
    };
  }

  /**
   * Simulate receiving a reading from Arduino (for testing)
   */
  simulateReading(
    temperature: number,
    humidity: number,
    device_pubkey: string = '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20'
  ): SignedReading {
    const ts = Math.floor(Date.now() / 1000);
    const reading_json = JSON.stringify({
      t: temperature,
      h: humidity,
      ts,
    });

    // Mock signature (in real system, this comes from Arduino)
    const signature = 'a'.repeat(128); // 64 bytes = 128 hex chars

    const signedReading: SignedReading = {
      reading_json,
      signature,
      device_pubkey,
      timestamp: Date.now(),
    };

    console.log('\n📊 SIMULATED READING FROM ARDUINO');
    console.log('═══════════════════════════════════════');
    console.log(`🌡️  Temperature: ${temperature}°C`);
    console.log(`💧 Humidity: ${humidity}%`);
    console.log(`📱 Device: ${device_pubkey.slice(0, 16)}...`);
    console.log(`⏰ Timestamp: ${new Date().toLocaleTimeString()}`);
    console.log('═══════════════════════════════════════\n');

    if (this.onReadingCallback) {
      this.onReadingCallback(signedReading);
    }

    return signedReading;
  }

  /**
   * Stop listening
   */
  stop(): void {
    this.onReadingCallback = undefined;
    console.log('🛑 BLE Receiver stopped');
  }
}
