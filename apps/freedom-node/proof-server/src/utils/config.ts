/**
 * Configuration loader
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { config as loadDotenv } from 'dotenv';

loadDotenv();

interface Config {
    server: {
        port: number;
        host: string;
    };
    lora: {
        serialPort: string;
        baudRate: number;
        networkId: number;
        address: number;
        frequency: number;
        spreadingFactor: number;
        bandwidth: number;
        txPower: number;
    };
    midnight: {
        nodeUrl: string;
        contractAddress: string;
        walletPath: string;
    };
    merkleTree: {
        depth: number;
        storagePath: string;
    };
    logging: {
        level: string;
        file: string;
    };
    security: {
        enableEncryption: boolean;
        sharedSecretPath: string;
    };
}

let cachedConfig: Config | null = null;

export function loadConfig(): Config {
    if (cachedConfig) {
        return cachedConfig;
    }

    // Try to load from config file
    const configPaths = [
        join(process.cwd(), 'config', 'default.json'),
        join(__dirname, '../../config/default.json'),
        '/etc/edgechain/proof-server.json'
    ];

    for (const configPath of configPaths) {
        if (existsSync(configPath)) {
            try {
                const configData = readFileSync(configPath, 'utf-8');
                cachedConfig = JSON.parse(configData) as Config;

                // Override with environment variables
                applyEnvOverrides(cachedConfig);

                return cachedConfig;
            } catch (error) {
                console.error(`Failed to load config from ${configPath}:`, error);
            }
        }
    }

    // Return default config
    cachedConfig = getDefaultConfig();
    applyEnvOverrides(cachedConfig);

    return cachedConfig;
}

function getDefaultConfig(): Config {
    return {
        server: {
            port: 3002,
            host: '0.0.0.0'
        },
        lora: {
            serialPort: '/dev/ttyUSB0',
            baudRate: 115200,
            networkId: 6,
            address: 1,
            frequency: 915000000,
            spreadingFactor: 9,
            bandwidth: 125,
            txPower: 20
        },
        midnight: {
            nodeUrl: 'https://testnet.midnight.network',
            contractAddress: '',
            walletPath: './wallet.json'
        },
        merkleTree: {
            depth: 20,
            storagePath: './data/merkle-tree.json'
        },
        logging: {
            level: 'info',
            file: './logs/proof-server.log'
        },
        security: {
            enableEncryption: true,
            sharedSecretPath: './secrets/lora-key.bin'
        }
    };
}

function applyEnvOverrides(config: Config): void {
    const env = process.env;
    const parseIntEnv = (value: string | undefined): number | null => {
        if (!value) return null;
        const parsed = parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : null;
    };

    // Server
    const serverPort = parseIntEnv(env.PORT ?? env.SERVER_PORT);
    if (serverPort !== null) {
        config.server.port = serverPort;
    }
    if (env.HOST ?? env.SERVER_HOST) {
        config.server.host = env.HOST ?? env.SERVER_HOST ?? config.server.host;
    }

    // LoRa
    if (env.LORA_PORT ?? env.LORA_SERIAL_PORT) {
        config.lora.serialPort = env.LORA_PORT ?? env.LORA_SERIAL_PORT ?? config.lora.serialPort;
    }
    const loraBaud = parseIntEnv(env.LORA_BAUD ?? env.LORA_BAUD_RATE);
    if (loraBaud !== null) {
        config.lora.baudRate = loraBaud;
    }
    const loraNetworkId = parseIntEnv(env.LORA_NETWORK_ID);
    if (loraNetworkId !== null) {
        config.lora.networkId = loraNetworkId;
    }
    const loraAddress = parseIntEnv(env.LORA_ADDRESS);
    if (loraAddress !== null) {
        config.lora.address = loraAddress;
    }
    const loraFrequency = parseIntEnv(env.LORA_FREQUENCY);
    if (loraFrequency !== null) {
        config.lora.frequency = loraFrequency;
    }
    const loraSf = parseIntEnv(env.LORA_SF ?? env.LORA_SPREADING_FACTOR);
    if (loraSf !== null) {
        config.lora.spreadingFactor = loraSf;
    }
    const loraBw = parseIntEnv(env.LORA_BW ?? env.LORA_BANDWIDTH);
    if (loraBw !== null) {
        config.lora.bandwidth = loraBw;
    }
    const loraTxPower = parseIntEnv(env.LORA_TX_POWER);
    if (loraTxPower !== null) {
        config.lora.txPower = loraTxPower;
    }

    // Midnight
    if (env.MIDNIGHT_NODE_URL) {
        config.midnight.nodeUrl = env.MIDNIGHT_NODE_URL;
    }
    if (env.MIDNIGHT_CONTRACT ?? env.MIDNIGHT_CONTRACT_ADDRESS) {
        config.midnight.contractAddress = env.MIDNIGHT_CONTRACT ?? env.MIDNIGHT_CONTRACT_ADDRESS ?? config.midnight.contractAddress;
    }
    if (env.MIDNIGHT_WALLET_PATH) {
        config.midnight.walletPath = env.MIDNIGHT_WALLET_PATH;
    }

    // Logging
    if (env.LOG_LEVEL) {
        config.logging.level = env.LOG_LEVEL;
    }
    if (env.LOG_FILE) {
        config.logging.file = env.LOG_FILE;
    }

    if (env.MERKLE_STORAGE_PATH) {
        config.merkleTree.storagePath = env.MERKLE_STORAGE_PATH;
    }
}
