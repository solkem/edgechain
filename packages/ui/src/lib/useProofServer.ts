/**
 * React hooks for Proof Server integration
 */

import { useState, useEffect, useCallback } from 'react';
import { proofServer, HealthStatus, ProofServerStatus, RewardClaimResult } from './proofServerClient';

/**
 * Hook for proof server connection status
 */
export function useProofServerConnection() {
    const [connected, setConnected] = useState(false);
    const [health, setHealth] = useState<HealthStatus | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Connect WebSocket
        proofServer.connect();

        const unsubConnected = proofServer.on('connected', () => {
            setConnected(true);
            setError(null);
        });

        const unsubDisconnected = proofServer.on('disconnected', () => {
            setConnected(false);
        });

        const unsubError = proofServer.on('error', (err) => {
            setError(String(err));
        });

        // Initial health check
        proofServer.getHealth()
            .then(setHealth)
            .catch(err => setError(err.message));

        return () => {
            unsubConnected();
            unsubDisconnected();
            unsubError();
            proofServer.disconnect();
        };
    }, []);

    const refresh = useCallback(async () => {
        try {
            const h = await proofServer.getHealth();
            setHealth(h);
            setError(null);
        } catch (err) {
            setError((err as Error).message);
        }
    }, []);

    return { connected, health, error, refresh };
}

/**
 * Hook for proof server status and statistics
 */
export function useProofServerStatus(pollInterval = 5000) {
    const [status, setStatus] = useState<ProofServerStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const s = await proofServer.getStatus();
            setStatus(s);
            setError(null);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, pollInterval);
        return () => clearInterval(interval);
    }, [fetchStatus, pollInterval]);

    return { status, loading, error, refresh: fetchStatus };
}

/**
 * Hook for real-time proof events
 */
export function useProofEvents() {
    const [lastProof, setLastProof] = useState<{
        nullifier: string;
        txHash: string;
        timestamp: number;
    } | null>(null);
    const [proofHistory, setProofHistory] = useState<typeof lastProof[]>([]);

    useEffect(() => {
        proofServer.connect();

        const unsubProof = proofServer.on('proof:submitted', (data: unknown) => {
            const proof = data as { nullifier: string; txHash: string };
            const entry = { ...proof, timestamp: Date.now() };
            setLastProof(entry);
            setProofHistory(prev => [...prev.slice(-99), entry]); // Keep last 100
        });

        return () => unsubProof();
    }, []);

    return { lastProof, proofHistory };
}

/**
 * Hook for device registration
 */
export function useDeviceRegistration() {
    const [registering, setRegistering] = useState(false);
    const [result, setResult] = useState<{
        success: boolean;
        merkleRoot?: string;
        leafIndex?: number;
        error?: string;
    } | null>(null);

    const register = useCallback(async (commitment: string) => {
        setRegistering(true);
        try {
            const res = await proofServer.registerCommitment(commitment);
            setResult(res);
            return res;
        } catch (err) {
            const result = { success: false, error: (err as Error).message };
            setResult(result);
            return result;
        } finally {
            setRegistering(false);
        }
    }, []);

    return { register, registering, result };
}

/**
 * Hook for ACR reward claims
 */
export function useRewardClaim() {
    const [claiming, setClaiming] = useState(false);
    const [result, setResult] = useState<RewardClaimResult | null>(null);

    const claim = useCallback(async (
        nullifier: string,
        proof: string,
        sensorDataHash: string
    ) => {
        setClaiming(true);
        try {
            const res = await proofServer.claimReward(nullifier, proof, sensorDataHash);
            setResult(res);
            return res;
        } catch (err) {
            const result: RewardClaimResult = {
                success: false,
                nullifier,
                error: (err as Error).message
            };
            setResult(result);
            return result;
        } finally {
            setClaiming(false);
        }
    }, []);

    return { claim, claiming, result };
}

/**
 * Hook for Merkle proof retrieval
 */
export function useMerkleProof(commitment: string | null) {
    const [proof, setProof] = useState<{
        proof: string[];
        pathBits: boolean[];
        root: string;
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!commitment) {
            setProof(null);
            return;
        }

        setLoading(true);
        proofServer.getMerkleProof(commitment)
            .then(result => {
                if (result) {
                    setProof({
                        proof: result.proof,
                        pathBits: result.pathBits,
                        root: result.root
                    });
                } else {
                    setError('Commitment not found');
                }
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [commitment]);

    return { proof, loading, error };
}
