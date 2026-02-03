/**
 * EdgeChain Proof Server - Entry Point
 * 
 * Farmer-owned proof server running on Raspberry Pi 5
 * Receives LoRa transmissions from ESP32-S3 devices and generates ZK proofs
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { LoRaReceiver } from './lora-receiver';
import { MidnightProver } from './midnight-prover';
import { BraceVerifier } from './brace-verifier';
import { AcrHandler } from './acr-handler';
import { MerkleTree } from './merkle-tree';
import { logger } from './utils/logger';
import { loadConfig } from './utils/config';

const config = loadConfig();

// Initialize components
const merkleTree = new MerkleTree(config.merkleTree.depth);
const braceVerifier = new BraceVerifier(merkleTree);
const midnightProver = new MidnightProver(config.midnight);
const acrHandler = new AcrHandler(midnightProver, merkleTree);
const loraReceiver = new LoRaReceiver(config.lora);

// Express app for status/management API
const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
    res.json({
        status: 'healthy',
        components: {
            lora: loraReceiver.isConnected(),
            midnight: midnightProver.isConnected(),
            merkleTree: {
                root: merkleTree.getRoot(),
                leafCount: merkleTree.getLeafCount()
            }
        },
        uptime: process.uptime()
    });
});

// Get server status
app.get('/status', (_req, res) => {
    res.json({
        version: '1.0.0',
        loraStats: loraReceiver.getStats(),
        proofsGenerated: midnightProver.getProofCount(),
        deviceCount: merkleTree.getLeafCount(),
        lastProofTime: midnightProver.getLastProofTime()
    });
});

// Manual registration endpoint (for testing)
app.post('/register-commitment', async (req, res) => {
    try {
        const { commitment } = req.body;

        if (!commitment || typeof commitment !== 'string') {
            return res.status(400).json({ error: 'Invalid commitment' });
        }

        const result = await braceVerifier.registerCommitment(commitment);

        res.json({
            success: true,
            merkleRoot: result.newRoot,
            leafIndex: result.leafIndex
        });
    } catch (error: any) {
        logger.error('Registration failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get Merkle proof for a commitment
app.get('/merkle-proof/:commitment', (req, res) => {
    try {
        const { commitment } = req.params;
        const proof = merkleTree.getProof(commitment);

        if (!proof) {
            return res.status(404).json({ error: 'Commitment not found' });
        }

        res.json({
            commitment,
            proof: proof.siblings,
            pathBits: proof.pathBits,
            root: merkleTree.getRoot()
        });
    } catch (error: any) {
        logger.error('Proof retrieval failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// ACR claim endpoint
app.post('/claim-reward', async (req, res) => {
    try {
        const { nullifier, proof, sensorDataHash } = req.body;

        const result = await acrHandler.processRewardClaim({
            nullifier,
            proof,
            sensorDataHash
        });

        res.json(result);
    } catch (error: any) {
        logger.error('Reward claim failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create HTTP server
const server = createServer(app);

// WebSocket for real-time updates
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
    logger.info('WebSocket client connected');

    ws.on('close', () => {
        logger.info('WebSocket client disconnected');
    });
});

// Broadcast function for real-time updates
function broadcast(event: string, data: any) {
    const message = JSON.stringify({ event, data, timestamp: Date.now() });
    wss.clients.forEach((client) => {
        if (client.readyState === 1) { // OPEN
            client.send(message);
        }
    });
}

// LoRa message handler
loraReceiver.on('packet', async (packet) => {
    logger.info('Received LoRa packet:', {
        commitment: packet.commitment.slice(0, 16) + '...',
        rssi: packet.rssi
    });

    try {
        // 1. Verify the packet signature
        const isValid = await braceVerifier.verifyPacket(packet);

        if (!isValid) {
            logger.warn('Invalid packet signature, discarding');
            broadcast('packet:invalid', { reason: 'signature' });
            return;
        }

        // 2. Generate ZK proof
        const proof = await midnightProver.generateAttestationProof({
            commitment: packet.commitment,
            merkleProof: merkleTree.getProof(packet.commitment),
            sensorData: packet.sensorData,
            timestamp: packet.timestamp
        });

        logger.info('ZK proof generated:', {
            nullifier: proof.publicInputs.nullifier.slice(0, 16) + '...',
            proofTime: proof.generationTime
        });

        // 3. Submit to Midnight
        const txResult = await midnightProver.submitProof(proof);

        logger.info('Proof submitted to Midnight:', {
            txHash: txResult.txHash,
            status: txResult.status
        });

        // 4. Broadcast success
        broadcast('proof:submitted', {
            nullifier: proof.publicInputs.nullifier,
            txHash: txResult.txHash
        });

    } catch (error: any) {
        logger.error('Packet processing failed:', error);
        broadcast('packet:error', { error: error.message });
    }
});

// Start server
async function main() {
    try {
        // Load persisted Merkle tree
        await merkleTree.load(config.merkleTree.storagePath);
        logger.info(`Loaded Merkle tree with ${merkleTree.getLeafCount()} commitments`);

        // Connect to LoRa module
        await loraReceiver.connect();
        logger.info('LoRa receiver connected');

        // Connect to Midnight (optional - can run in offline mode)
        try {
            await midnightProver.connect();
            logger.info('Connected to Midnight network');
        } catch (error) {
            logger.warn('Midnight connection failed - running in offline mode');
        }

        // Start HTTP/WebSocket server
        server.listen(config.server.port, config.server.host, () => {
            logger.info(`Proof server running on http://${config.server.host}:${config.server.port}`);
            logger.info('Waiting for LoRa packets from devices...');
        });

    } catch (error) {
        logger.error('Failed to start proof server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down...');

    // Save Merkle tree state
    await merkleTree.save(config.merkleTree.storagePath);

    // Close connections
    loraReceiver.disconnect();
    await midnightProver.disconnect();

    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

main();
