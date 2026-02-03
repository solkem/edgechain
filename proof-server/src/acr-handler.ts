/**
 * ACR Handler - Anonymous Contribution Rewards
 * 
 * Processes reward claims from devices using nullifier-based anonymity
 * Devices can earn rewards without revealing their identity
 */

import { MidnightProver, ZKProof } from './midnight-prover';
import { MerkleTree } from './merkle-tree';
import { logger } from './utils/logger';

export interface RewardClaim {
    nullifier: string;
    proof: string;
    sensorDataHash: string;
}

export interface RewardResult {
    success: boolean;
    nullifier: string;
    reward?: number;
    txHash?: string;
    error?: string;
}

interface NullifierRecord {
    epoch: number;
    claimedAt: number;
    reward: number;
}

export class AcrHandler {
    private prover: MidnightProver;
    private merkleTree: MerkleTree;

    // Track spent nullifiers locally (also tracked on-chain)
    private spentNullifiers: Map<string, NullifierRecord> = new Map();

    // Reward tiers based on consistency
    private static readonly REWARD_TIERS = {
        HIGH: 0.1,    // 98%+ consistency
        MEDIUM: 0.05, // 90-97% consistency
        LOW: 0.02     // <90% consistency
    };

    constructor(prover: MidnightProver, merkleTree: MerkleTree) {
        this.prover = prover;
        this.merkleTree = merkleTree;
    }

    /**
     * Process a reward claim from a device
     * 
     * ACR Protocol:
     * 1. Device computes nullifier N = H(device_secret || epoch)
     * 2. Device generates ZK proof proving:
     *    - They know a valid commitment in the Merkle tree
     *    - N is correctly computed from their secret
     *    - They have valid sensor data to contribute
     * 3. Claim is accepted if nullifier hasn't been used this epoch
     */
    async processRewardClaim(claim: RewardClaim): Promise<RewardResult> {
        logger.info('Processing reward claim:', {
            nullifier: claim.nullifier.slice(0, 16) + '...'
        });

        try {
            // 1. Check nullifier format
            if (!/^[0-9a-fA-F]{64}$/.test(claim.nullifier)) {
                return {
                    success: false,
                    nullifier: claim.nullifier,
                    error: 'Invalid nullifier format'
                };
            }

            // 2. Check if nullifier already spent
            if (this.isNullifierSpent(claim.nullifier)) {
                logger.warn('Replay attempt detected:', {
                    nullifier: claim.nullifier.slice(0, 16) + '...'
                });

                return {
                    success: false,
                    nullifier: claim.nullifier,
                    error: 'Nullifier already spent (replay attack prevented)'
                };
            }

            // 3. Verify the ZK proof
            const proofValid = await this.verifyRewardProof(claim);

            if (!proofValid) {
                return {
                    success: false,
                    nullifier: claim.nullifier,
                    error: 'Invalid proof'
                };
            }

            // 4. Calculate reward amount
            const reward = this.calculateReward();

            // 5. Submit to Midnight (if connected)
            let txHash: string | undefined;

            if (this.prover.isConnected()) {
                const zkProof: ZKProof = {
                    proof: claim.proof,
                    publicInputs: {
                        nullifier: claim.nullifier,
                        dataHash: claim.sensorDataHash,
                        epoch: this.getCurrentEpoch(),
                        merkleRoot: this.merkleTree.getRoot()
                    },
                    generationTime: 0,
                    isMock: false
                };

                const txResult = await this.prover.submitProof(zkProof);
                txHash = txResult.txHash;
            }

            // 6. Mark nullifier as spent
            this.markNullifierSpent(claim.nullifier, reward);

            logger.info('Reward claimed successfully:', {
                nullifier: claim.nullifier.slice(0, 16) + '...',
                reward,
                txHash: txHash?.slice(0, 16) + '...'
            });

            return {
                success: true,
                nullifier: claim.nullifier,
                reward,
                txHash
            };

        } catch (error: any) {
            logger.error('Reward claim failed:', error);

            return {
                success: false,
                nullifier: claim.nullifier,
                error: error.message
            };
        }
    }

    /**
     * Check if a nullifier has been spent in the current epoch
     */
    isNullifierSpent(nullifier: string): boolean {
        const record = this.spentNullifiers.get(nullifier);

        if (!record) {
            return false;
        }

        // Nullifiers are valid for one epoch (24 hours)
        // After that, the same device can claim again with a new nullifier
        return record.epoch === this.getCurrentEpoch();
    }

    /**
     * Mark a nullifier as spent
     */
    private markNullifierSpent(nullifier: string, reward: number): void {
        this.spentNullifiers.set(nullifier, {
            epoch: this.getCurrentEpoch(),
            claimedAt: Date.now(),
            reward
        });
    }

    /**
     * Verify the ZK proof for a reward claim
     * 
     * TODO: Implement actual proof verification with Midnight SDK
     */
    private async verifyRewardProof(claim: RewardClaim): Promise<boolean> {
        // In production, this would verify the ZK proof:
        // - Commitment is in Merkle tree
        // - Nullifier is correctly computed
        // - Sensor data hash is valid

        // For now, accept all proofs (mock)
        logger.info('Verifying reward proof (mock)');

        // Basic validation
        if (!claim.proof || claim.proof.length < 64) {
            return false;
        }

        if (!claim.sensorDataHash || claim.sensorDataHash.length !== 64) {
            return false;
        }

        return true;
    }

    /**
     * Calculate reward based on consistency
     * 
     * TODO: Track device consistency over time
     */
    private calculateReward(): number {
        // For now, give base reward
        // In production, would check device's consistency score
        return AcrHandler.REWARD_TIERS.MEDIUM;
    }

    /**
     * Get current epoch (24-hour window)
     */
    private getCurrentEpoch(): number {
        return Math.floor(Date.now() / (24 * 60 * 60 * 1000));
    }

    /**
     * Clean up old nullifiers (older than current epoch)
     */
    cleanupOldNullifiers(): number {
        const currentEpoch = this.getCurrentEpoch();
        let cleaned = 0;

        for (const [nullifier, record] of this.spentNullifiers.entries()) {
            if (record.epoch < currentEpoch) {
                this.spentNullifiers.delete(nullifier);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.info(`Cleaned up ${cleaned} expired nullifiers`);
        }

        return cleaned;
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            spentNullifiersCount: this.spentNullifiers.size,
            currentEpoch: this.getCurrentEpoch(),
            rewardTiers: AcrHandler.REWARD_TIERS
        };
    }
}
