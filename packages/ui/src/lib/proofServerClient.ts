/**
 * Proof Server API Client
 * 
 * React hook and client for connecting to the EdgeChain proof server
 */

export interface ProofServerStatus {
    version: string;
    loraStats: {
        packetsReceived: number;
        packetsDropped: number;
        lastPacketTime: number | null;
        averageRssi: number;
    };
    proofsGenerated: number;
    deviceCount: number;
    lastProofTime: number | null;
}

export interface HealthStatus {
    status: 'healthy' | 'unhealthy';
    components: {
        lora: boolean;
        midnight: boolean;
        merkleTree: {
            root: string;
            leafCount: number;
        };
    };
    uptime: number;
}

export interface RegistrationResult {
    success: boolean;
    merkleRoot?: string;
    leafIndex?: number;
    error?: string;
}

export interface RewardClaimResult {
    success: boolean;
    nullifier: string;
    reward?: number;
    txHash?: string;
    error?: string;
}

export interface MerkleProof {
    commitment: string;
    proof: string[];
    pathBits: boolean[];
    root: string;
}

export interface WebSocketMessage {
    event: string;
    data: unknown;
    timestamp: number;
}

class ProofServerClient {
    private baseUrl: string;
    private ws: WebSocket | null = null;
    private eventHandlers: Map<string, Set<(data: unknown) => void>> = new Map();
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    constructor(baseUrl: string = 'http://localhost:3002') {
        this.baseUrl = baseUrl;
    }

    // ==================== HTTP API ====================

    async getHealth(): Promise<HealthStatus> {
        const response = await fetch(`${this.baseUrl}/health`);
        return response.json();
    }

    async getStatus(): Promise<ProofServerStatus> {
        const response = await fetch(`${this.baseUrl}/status`);
        return response.json();
    }

    async registerCommitment(commitment: string): Promise<RegistrationResult> {
        const response = await fetch(`${this.baseUrl}/register-commitment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ commitment })
        });
        return response.json();
    }

    async getMerkleProof(commitment: string): Promise<MerkleProof | null> {
        const response = await fetch(`${this.baseUrl}/merkle-proof/${commitment}`);
        if (response.status === 404) return null;
        return response.json();
    }

    async claimReward(
        nullifier: string,
        proof: string,
        sensorDataHash: string
    ): Promise<RewardClaimResult> {
        const response = await fetch(`${this.baseUrl}/claim-reward`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nullifier, proof, sensorDataHash })
        });
        return response.json();
    }

    // ==================== WebSocket ====================

    connect(): void {
        if (this.ws?.readyState === WebSocket.OPEN) return;

        const wsUrl = this.baseUrl.replace('http', 'ws') + '/ws';
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('[ProofServer] WebSocket connected');
            this.reconnectAttempts = 0;
            this.emit('connected', null);
        };

        this.ws.onmessage = (event) => {
            try {
                const message: WebSocketMessage = JSON.parse(event.data);
                this.emit(message.event, message.data);
            } catch (error) {
                console.error('[ProofServer] Failed to parse message:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('[ProofServer] WebSocket disconnected');
            this.emit('disconnected', null);
            this.scheduleReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('[ProofServer] WebSocket error:', error);
            this.emit('error', error);
        };
    }

    disconnect(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('[ProofServer] Max reconnect attempts reached');
            return;
        }

        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectAttempts++;

        console.log(`[ProofServer] Reconnecting in ${delay}ms...`);
        this.reconnectTimeout = setTimeout(() => this.connect(), delay);
    }

    // ==================== Event Handling ====================

    on(event: string, handler: (data: unknown) => void): () => void {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event)!.add(handler);

        // Return unsubscribe function
        return () => {
            this.eventHandlers.get(event)?.delete(handler);
        };
    }

    private emit(event: string, data: unknown): void {
        this.eventHandlers.get(event)?.forEach(handler => handler(data));
        this.eventHandlers.get('*')?.forEach(handler => handler({ event, data }));
    }

    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    getBaseUrl(): string {
        return this.baseUrl;
    }
}

// Default singleton instance
export const proofServer = new ProofServerClient();

// Factory function for custom URLs
export function createProofServerClient(baseUrl: string): ProofServerClient {
    return new ProofServerClient(baseUrl);
}

export default ProofServerClient;
