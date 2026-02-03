/**
 * Configuration loader
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

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
            networkId: 18,
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
    // Server
    if (process.env.PORT) {
        config.server.port = parseInt(process.env.PORT);
    }
    if (process.env.HOST) {
        config.server.host = process.env.HOST;
    }

    // LoRa
    if (process.env.LORA_PORT) {
        config.lora.serialPort = process.env.LORA_PORT;
    }
    if (process.env.LORA_BAUD) {
        config.lora.baudRate = parseInt(process.env.LORA_BAUD);
    }

    // Midnight
    if (process.env.MIDNIGHT_NODE_URL) {
        config.midnight.nodeUrl = process.env.MIDNIGHT_NODE_URL;
    }
    if (process.env.MIDNIGHT_CONTRACT) {
        config.midnight.contractAddress = process.env.MIDNIGHT_CONTRACT;
    }

    // Logging
    if (process.env.LOG_LEVEL) {
        config.logging.level = process.env.LOG_LEVEL;
    }
}
