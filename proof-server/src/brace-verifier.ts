/**
 * BRACE Verifier - Blind Registration via Anonymous Commitment Enrollment
 * 
 * Handles device registration using commitments instead of public keys
 * Device identity (pk) never leaves the device
 */

import { createHash } from 'crypto';
import { MerkleTree } from './merkle-tree';
import { LoRaPacket } from './lora-receiver';
import { logger } from './utils/logger';

export interface RegistrationResult {
    commitment: string;
    newRoot: string;
    leafIndex: number;
}

export class BraceVerifier {
    private merkleTree: MerkleTree;

    constructor(merkleTree: MerkleTree) {
        this.merkleTree = merkleTree;
    }

    /**
     * Register a new device commitment
     * 
     * In BRACE protocol:
     * - Device computes C = H(pk || r) locally
     * - Only C is transmitted, pk remains secret
     * - We add C to the Merkle tree
     */
    async registerCommitment(commitment: string): Promise<RegistrationResult> {
        // Validate commitment format (32 bytes hex = 64 chars)
        if (!/^[0-9a-fA-F]{64}$/.test(commitment)) {
            throw new Error('Invalid commitment format: must be 32 bytes hex');
        }

        // Check if already registered
        if (this.merkleTree.hasLeaf(commitment)) {
            const existingIndex = this.merkleTree.getLeafIndex(commitment);
            logger.info('Commitment already registered:', {
                commitment: commitment.slice(0, 16) + '...',
                leafIndex: existingIndex
            });

            return {
                commitment,
                newRoot: this.merkleTree.getRoot(),
                leafIndex: existingIndex!
            };
        }

        // Add to Merkle tree
        const leafIndex = this.merkleTree.insert(commitment);
        const newRoot = this.merkleTree.getRoot();

        logger.info('Commitment registered:', {
            commitment: commitment.slice(0, 16) + '...',
            leafIndex,
            newRoot: newRoot.slice(0, 16) + '...'
        });

        return {
            commitment,
            newRoot,
            leafIndex
        };
    }

    /**
     * Verify a LoRa packet signature
     * 
     * The packet contains:
     * - Commitment (used to look up device in Merkle tree)
     * - Sensor data
     * - P-256 signature over (commitment || sensorData || timestamp)
     * 
     * Note: We can't verify the signature directly because we don't have
     * the public key. The signature is verified during ZK proof generation
     * using the commitment's relationship to the public key.
     */
    async verifyPacket(packet: LoRaPacket): Promise<boolean> {
        try {
            // 1. Check if commitment is in our Merkle tree
            if (!this.merkleTree.hasLeaf(packet.commitment)) {
                logger.warn('Unknown commitment:', packet.commitment.slice(0, 16) + '...');

                // Auto-register new devices (BRACE enrollment)
                await this.registerCommitment(packet.commitment);
                logger.info('Auto-registered new device via BRACE');
            }

            // 2. Validate packet structure
            if (!this.validatePacketStructure(packet)) {
                logger.warn('Invalid packet structure');
                return false;
            }

            // 3. Check timestamp is reasonable (within 5 minutes)
            const now = Math.floor(Date.now() / 1000);
            const timeDiff = Math.abs(now - packet.timestamp);

            if (timeDiff > 300) {
                logger.warn('Packet timestamp too old/future:', {
                    packetTime: packet.timestamp,
                    serverTime: now,
                    diff: timeDiff
                });
                return false;
            }

            // 4. Validate sensor data ranges
            if (!this.validateSensorData(packet.sensorData)) {
                logger.warn('Sensor data out of range');
                return false;
            }

            // Note: Actual P-256 signature verification happens in the ZK circuit
            // The prover must prove knowledge of (pk, r) such that:
            // - H(pk || r) = commitment
            // - verify(pk, message, signature) = true

            return true;

        } catch (error) {
            logger.error('Packet verification failed:', error);
            return false;
        }
    }

    /**
     * Validate packet has all required fields
     */
    private validatePacketStructure(packet: LoRaPacket): boolean {
        if (!packet.commitment || packet.commitment.length !== 64) {
            return false;
        }

        if (!packet.signature || packet.signature.length !== 128) {
            return false;
        }

        if (!packet.sensorData) {
            return false;
        }

        return true;
    }

    /**
     * Validate sensor readings are within reasonable ranges
     */
    private validateSensorData(data: LoRaPacket['sensorData']): boolean {
        // Temperature: -40°C to 85°C (extended range for sensors)
        if (data.temperature < -40 || data.temperature > 85) {
            return false;
        }

        // Humidity: 0% to 100%
        if (data.humidity < 0 || data.humidity > 100) {
            return false;
        }

        // Pressure: 300 to 1100 hPa
        if (data.pressure < 300 || data.pressure > 1100) {
            return false;
        }

        // Soil moisture: 0% to 100%
        if (data.soilMoisture < 0 || data.soilMoisture > 100) {
            return false;
        }

        return true;
    }

    /**
     * Compute commitment from public key and blinding factor
     * (For testing/debugging only - devices compute this locally)
     */
    static computeCommitment(publicKey: string, blindingFactor: string): string {
        const hash = createHash('sha256');
        hash.update(Buffer.from(publicKey, 'hex'));
        hash.update(Buffer.from(blindingFactor, 'hex'));
        return hash.digest('hex');
    }
}
