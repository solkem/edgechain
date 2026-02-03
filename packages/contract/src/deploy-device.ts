/**
 * Arduino IoT Contract Deployment Script
 *
 * Deploys the Arduino IoT contract with dual Merkle roots to Midnight Testnet
 */

import { WalletBuilder } from "@midnight-ntwrk/wallet";
import { deployContract } from "@midnight-ntwrk/midnight-js-contracts";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import {
  NetworkId,
  setNetworkId,
  getZswapNetworkId,
  getLedgerNetworkId
} from "@midnight-ntwrk/midnight-js-network-id";
import { createBalancedTx } from "@midnight-ntwrk/midnight-js-types";
import { nativeToken, Transaction } from "@midnight-ntwrk/ledger";
import { Transaction as ZswapTransaction } from "@midnight-ntwrk/zswap";
import { WebSocket } from "ws";
import * as fs from "fs";
import * as path from "path";
import * as Rx from "rxjs";
import { type Wallet } from "@midnight-ntwrk/wallet-api";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fix WebSocket for Node.js environment
// @ts-ignore
globalThis.WebSocket = WebSocket;

// Configure for Midnight Testnet
setNetworkId(NetworkId.TestNet);

// Testnet connection endpoints
const TESTNET_CONFIG = {
  indexer: "https://indexer.testnet-02.midnight.network/api/v1/graphql",
  indexerWS: "wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws",
  node: "https://rpc.testnet-02.midnight.network",
  proofServer: "http://127.0.0.1:6300"
};

const waitForFunds = (wallet: Wallet) =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.tap((state) => {
        if (state.syncProgress) {
          console.log(
            `   Sync: ${state.syncProgress.synced ? '✅' : '⏳'} | sourceGap=${state.syncProgress.lag.sourceGap}, applyGap=${state.syncProgress.lag.applyGap}`
          );
        }
      }),
      Rx.filter((state) => state.syncProgress?.synced === true),
      Rx.map((s) => s.balances[nativeToken()] ?? 0n),
      Rx.filter((balance) => balance > 0n),
      Rx.tap((balance) => console.log(`\n   ✅ Tokens received! Balance: ${balance}`))
    )
  );

async function main() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║         Arduino IoT Contract Deployment to Midnight           ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  console.log("📝 This script will:");
  console.log("   1. Load or generate deployment wallet");
  console.log("   2. Deploy Arduino IoT contract with dual Merkle roots");
  console.log("   3. Save contract address for backend integration\n");

  try {
    // Check for existing deployment file
    const deploymentFilePath = path.join(__dirname, "..", "deployment.json");
    let walletSeed: string;
    let deploymentData: any = {};

    if (fs.existsSync(deploymentFilePath)) {
      console.log("📂 Loading existing deployment wallet...");
      deploymentData = JSON.parse(fs.readFileSync(deploymentFilePath, 'utf-8'));
      walletSeed = deploymentData.deploymentWalletSeed;
      console.log("   ✅ Deployment wallet loaded\n");
    } else {
      console.log("🎲 Generating new deployment wallet...");
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      walletSeed = Array.from(bytes, (b) =>
        b.toString(16).padStart(2, "0")
      ).join("");

      deploymentData.deploymentWalletSeed = walletSeed;
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("⚠️  NEW DEPLOYMENT WALLET SEED:");
      console.log(`   ${walletSeed}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    }

    // Build wallet from seed
    console.log("🔐 Building deployment wallet...");
    const wallet = await WalletBuilder.buildFromSeed(
      TESTNET_CONFIG.indexer,
      TESTNET_CONFIG.indexerWS,
      TESTNET_CONFIG.proofServer,
      TESTNET_CONFIG.node,
      walletSeed,
      getZswapNetworkId(),
      "info"
    );

    wallet.start();

    const state = await Rx.firstValueFrom(wallet.state());
    console.log("   ✅ Wallet connected!\n");

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📍 DEPLOYMENT WALLET ADDRESS:");
    console.log(`   ${state.address}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    deploymentData.deploymentWalletAddress = state.address;

    let balance = state.balances[nativeToken()] || 0n;

    if (balance === 0n) {
      console.log("💰 Current balance: 0 tDUST\n");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🚰 GET tDUST FROM FAUCET:");
      console.log("");
      console.log("   1. Open: https://faucet.testnet.midnight.network");
      console.log(`   2. Paste address: ${state.address}`);
      console.log("   3. Click 'Request tDUST'");
      console.log("   4. Wait 2-3 minutes");
      console.log("");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      console.log("⏳ Waiting for tDUST tokens...");
      console.log("   (Will auto-continue when received)\n");

      balance = await waitForFunds(wallet);
    } else {
      console.log(`✅ Balance: ${Number(balance) / 1_000_000} tDUST\n`);
    }

    // Load compiled Arduino IoT contract
    console.log("📦 Loading Arduino IoT contract...");
    const contractPath = path.join(__dirname, "..", "dist", "managed", "arduino-iot");
    const contractModulePath = path.join(contractPath, "contract", "index.cjs");

    if (!fs.existsSync(contractModulePath)) {
      console.error("\n❌ Arduino IoT contract not found!");
      console.error(`   Expected: ${contractModulePath}\n`);
      console.error("   Please run:");
      console.error("   cd packages/contract");
      console.error("   compact compile src/arduino-iot.compact ./src/managed/arduino-iot");
      console.error("   npm run build\n");
      process.exit(1);
    }

    const ArduinoIoTModule = await import(contractModulePath);

    // Get wallet state first (needed for walletProvider)
    const walletState = await Rx.firstValueFrom(wallet.state());

    // Generate admin pubkey (32 bytes) - in production, derive from deployer key
    const adminPubkey = new Uint8Array(32);
    crypto.getRandomValues(adminPubkey);
    console.log(`   Admin pubkey (hex): ${Buffer.from(adminPubkey).toString('hex').slice(0, 32)}...`);

    // Create witness functions for the contract
    const witnesses = {
      deviceSignature: () => {
        // Placeholder - real signatures come from Arduino devices
        const signature = new Uint8Array(64);
        crypto.getRandomValues(signature);
        return signature;
      },
      merkleSiblings: () => {
        // Placeholder - real Merkle proofs come from device registry
        const siblings: Uint8Array[] = [];
        for (let i = 0; i < 8; i++) {
          const sibling = new Uint8Array(32);
          crypto.getRandomValues(sibling);
          siblings.push(sibling);
        }
        return siblings;
      }
    };

    // Create contract instance with ONLY witnesses
    // Constructor parameters are passed during deployment, not instantiation
    const contractInstance = new ArduinoIoTModule.Contract(witnesses);
    console.log("   ✅ Contract loaded\n");

    const walletProvider = {
      coinPublicKey: walletState.coinPublicKey,
      encryptionPublicKey: walletState.encryptionPublicKey,
      balanceTx(tx: any, newCoins: any) {
        return wallet
          .balanceTransaction(
            ZswapTransaction.deserialize(
              tx.serialize(getLedgerNetworkId()),
              getZswapNetworkId()
            ),
            newCoins
          )
          .then((tx) => wallet.proveTransaction(tx))
          .then((zswapTx) =>
            Transaction.deserialize(
              zswapTx.serialize(getZswapNetworkId()),
              getLedgerNetworkId()
            )
          )
          .then(createBalancedTx);
      },
      submitTx(tx: any) {
        return wallet.submitTransaction(tx);
      }
    };

    // Configure all required providers
    console.log("⚙️  Setting up providers...");
    const zkConfigPath = contractPath;
    const providers = {
      privateStateProvider: levelPrivateStateProvider({
        privateStateStoreName: "arduino-iot-deployment-state"
      }),
      publicDataProvider: indexerPublicDataProvider(
        TESTNET_CONFIG.indexer,
        TESTNET_CONFIG.indexerWS
      ),
      zkConfigProvider: new NodeZkConfigProvider(zkConfigPath),
      proofProvider: httpClientProofProvider(TESTNET_CONFIG.proofServer),
      walletProvider: walletProvider,
      midnightProvider: walletProvider
    };
    console.log("   ✅ Providers configured\n");

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🚀 DEPLOYING ARDUINO IOT CONTRACT TO MIDNIGHT TESTNET");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("   ⏳ Generating zero-knowledge proofs...");
    console.log("   This takes 30-60 seconds - please be patient!\n");

    // Deploy the contract with constructor parameters
    // The Midnight SDK will call contractInstance.initialState() internally with these args
    const deployed = await deployContract(providers, {
      contract: contractInstance,
      privateStateId: "arduinoIoTDeploymentState",
      initialPrivateState: {},
      args: [adminPubkey]  // Pass admin pubkey to constructor (field name is 'args' not 'constructorArguments')
    } as any);  // Type assertion since args may not be in official types yet

    const contractAddress = deployed.deployTxData.public.contractAddress;

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎉 ARDUINO IOT CONTRACT DEPLOYED SUCCESSFULLY!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("📝 CONTRACT DETAILS:\n");
    console.log(`   Address: ${contractAddress}`);
    console.log(`   Admin Pubkey: ${Buffer.from(adminPubkey).toString('hex').slice(0, 32)}...`);
    console.log(`   Deployed at: ${new Date().toISOString()}`);
    console.log(`   Network: Midnight Testnet (testnet-02)`);
    console.log(`   Deployment wallet: ${state.address}\n`);

    // Save deployment info
    deploymentData.arduinoIoT = {
      contractAddress,
      adminPubkey: Buffer.from(adminPubkey).toString('hex'),
      deployedAt: new Date().toISOString(),
      network: 'testnet-02',
      deploymentWalletAddress: state.address,
      features: {
        dualMerkleRoots: true,
        autoCollectionReward: '0.1 tDUST',
        manualEntryReward: '0.02 tDUST',
        nullifierTracking: true
      }
    };

    fs.writeFileSync(deploymentFilePath, JSON.stringify(deploymentData, null, 2));
    console.log(`✅ Deployment info saved to: ${deploymentFilePath}\n`);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 NEXT STEPS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("1. ✅ Contract is deployed and ready");
    console.log("2. 🔧 Update backend to use contract address");
    console.log("3. 📱 Register Arduino devices to build Merkle roots");
    console.log("4. 🚀 Start collecting sensor data with ZK proofs");
    console.log("5. 💰 Rewards will be distributed automatically\n");

    console.log("🌐 View contract on Midnight Explorer:");
    console.log(`   https://explorer.testnet.midnight.network/contract/${deployed.deployTxData.public.contractAddress}\n`);

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Deployment failed:");
    console.error(`   ${error.message}\n`);
    if (error.stack) {
      console.error("Stack trace:");
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
