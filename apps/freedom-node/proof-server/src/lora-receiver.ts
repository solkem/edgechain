/**
 * LoRa Receiver - RYLR896 Module Interface
 * 
 * Handles serial communication with the LoRa transceiver module
 * Uses AT commands to configure and receive packets
 */

import { EventEmitter } from 'events';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { logger } from './utils/logger';

export interface LoRaConfig {
    serialPort: string;
    baudRate: number;
    networkId: number;
    address: number;
    frequency: number;
    spreadingFactor: number;
    bandwidth: number;
    txPower: number;
}

export interface LoRaPacket {
    sourceAddress: number;
    commitment: string;      // 32 bytes hex
    sensorData: {
        temperature: number;
        humidity: number;
        pressure: number;
        soilMoisture: number;
    };
    signature: string;       // 64 bytes hex (P-256)
    timestamp: number;
    rssi: number;
    snr: number;
}

export interface LoRaStats {
    packetsReceived: number;
    packetsDropped: number;
    lastPacketTime: number | null;
    averageRssi: number;
}

export class LoRaReceiver extends EventEmitter {
    private port: SerialPort | null = null;
    private parser: ReadlineParser | null = null;
    private config: LoRaConfig;
    private connected = false;
    private stats: LoRaStats = {
        packetsReceived: 0,
        packetsDropped: 0,
        lastPacketTime: null,
        averageRssi: 0
    };

    constructor(config: LoRaConfig) {
        super();
        this.config = config;
    }

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            // Check if serial port exists first (graceful handling for dev without hardware)
            try {
                this.port = new SerialPort({
                    path: this.config.serialPort,
                    baudRate: this.config.baudRate,
                    autoOpen: false // Don't auto-open, we'll do it manually
                });
            } catch (error: any) {
                return reject(new Error(`Failed to create serial port: ${error.message}`));
            }

            this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

            this.port.on('open', async () => {
                logger.info(`Serial port ${this.config.serialPort} opened`);

                try {
                    // Configure LoRa module
                    await this.configureModule();
                    this.connected = true;
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });

            this.port.on('error', (err) => {
                logger.error('Serial port error:', err);
                this.connected = false;
                this.emit('error', err);
                reject(err);
            });

            this.parser.on('data', (line: string) => {
                this.handleData(line);
            });

            // Now open the port
            this.port.open((err) => {
                if (err) {
                    reject(new Error(`Failed to open ${this.config.serialPort}: ${err.message}`));
                }
            });
        });
    }

    private async configureModule(): Promise<void> {
        // Set network ID
        await this.sendCommand(`AT+NETWORKID=${this.config.networkId}`);

        // Set device address
        await this.sendCommand(`AT+ADDRESS=${this.config.address}`);

        // Set frequency (Hz)
        await this.sendCommand(`AT+BAND=${this.config.frequency}`);

        // Set parameters: SF, BW, CR, Preamble
        // RYLR896 format: AT+PARAMETER=SF,BW,CR,Preamble
        await this.sendCommand(`AT+PARAMETER=${this.config.spreadingFactor},${this.getBandwidthCode()},1,12`);

        // Set TX power
        await this.sendCommand(`AT+CRFOP=${this.config.txPower}`);

        logger.info('LoRa module configured:', {
            networkId: this.config.networkId,
            address: this.config.address,
            frequency: this.config.frequency,
            sf: this.config.spreadingFactor
        });
    }

    private getBandwidthCode(): number {
        // RYLR896 bandwidth codes: 7=125kHz, 8=250kHz, 9=500kHz
        switch (this.config.bandwidth) {
            case 125: return 7;
            case 250: return 8;
            case 500: return 9;
            default: return 7;
        }
    }

    private sendCommand(command: string): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this.port) {
                return reject(new Error('Serial port not open'));
            }

            const timeout = setTimeout(() => {
                reject(new Error(`Command timeout: ${command}`));
            }, 2000);

            const handler = (line: string) => {
                if (line.startsWith('+OK') || line.startsWith('+ERR')) {
                    clearTimeout(timeout);
                    this.parser?.removeListener('data', handler);

                    if (line.startsWith('+ERR')) {
                        reject(new Error(`Command failed: ${line}`));
                    } else {
                        resolve(line);
                    }
                }
            };

            this.parser?.on('data', handler);
            this.port.write(command + '\r\n');
        });
    }

    private handleData(line: string): void {
        // Check for received data: +RCV=<Address>,<Length>,<Data>,<RSSI>,<SNR>
        if (line.startsWith('+RCV=')) {
            try {
                const packet = this.parsePacket(line);

                if (packet) {
                    this.stats.packetsReceived++;
                    this.stats.lastPacketTime = Date.now();
                    this.updateAverageRssi(packet.rssi);

                    this.emit('packet', packet);
                }
            } catch (error) {
                logger.error('Failed to parse packet:', error);
                this.stats.packetsDropped++;
            }
        }
    }

    private parsePacket(line: string): LoRaPacket | null {
        // Format: +RCV=<Address>,<Length>,<HexData>,<RSSI>,<SNR>
        const match = line.match(/\+RCV=(\d+),(\d+),([0-9A-Fa-f]+),(-?\d+),(-?\d+)/);

        if (!match) {
            logger.warn('Invalid packet format:', line);
            return null;
        }

        const [, sourceAddr, length, hexData, rssi, snr] = match;
        const data = Buffer.from(hexData, 'hex');

        // Expected packet structure (116 bytes):
        // - Commitment: 32 bytes
        // - Sensor data: 16 bytes (4 x 4-byte floats)
        // - Signature: 64 bytes (P-256)
        // - Timestamp: 4 bytes

        if (data.length < 116) {
            logger.warn(`Packet too short: ${data.length} bytes`);
            return null;
        }

        const commitment = data.subarray(0, 32).toString('hex');

        const sensorData = {
            temperature: data.readFloatLE(32),
            humidity: data.readFloatLE(36),
            pressure: data.readFloatLE(40),
            soilMoisture: data.readFloatLE(44)
        };

        const signature = data.subarray(48, 112).toString('hex');
        const timestamp = data.readUInt32LE(112);

        return {
            sourceAddress: parseInt(sourceAddr),
            commitment,
            sensorData,
            signature,
            timestamp,
            rssi: parseInt(rssi),
            snr: parseInt(snr)
        };
    }

    private updateAverageRssi(rssi: number): void {
        const alpha = 0.1; // Exponential moving average factor
        this.stats.averageRssi = this.stats.averageRssi === 0
            ? rssi
            : (alpha * rssi) + ((1 - alpha) * this.stats.averageRssi);
    }

    isConnected(): boolean {
        return this.connected;
    }

    getStats(): LoRaStats {
        return { ...this.stats };
    }

    disconnect(): void {
        if (this.port) {
            this.port.close();
            this.port = null;
            this.connected = false;
            logger.info('LoRa receiver disconnected');
        }
    }
}
