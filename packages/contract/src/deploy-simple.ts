// @ts-nocheck
/**
 * Simple EdgeChain Deployment - Generate Fresh Wallet
 *
 * This script generates a new wallet seed and deploys the contract.
 * Your Midnight wallet can be used for UI interaction after deployment.
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
  console.log("║      EdgeChain Deployment - Fresh Wallet Generator            ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  console.log("📝 This script will:");
  console.log("   1. Generate a new wallet seed for deployment");
  console.log("   2. Request tDUST from the faucet");
  console.log("   3. Deploy the EdgeChain contract");
  console.log("   4. Your Midnight wallet can be used in the UI\n");

  try {
    // Generate new wallet seed
    console.log("🎲 Generating new wallet seed...");
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const walletSeed = Array.from(bytes, (b) =>
      b.toString(16).padStart(2, "0")
    ).join("");

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("⚠️  SAVE THIS DEPLOYMENT WALLET SEED:");
    console.log(`   ${walletSeed}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Save to file
    const seedFilePath = path.join(__dirname, "..", "..", "..", "DEPLOYMENT_WALLET_SEED.txt");
    fs.writeFileSync(seedFilePath, `EdgeChain Deployment Wallet Seed\n===============================\n\nSeed: ${walletSeed}\n\nGenerated: ${new Date().toISOString()}\n\nNOTE: This is for contract deployment only.\nUse a compatible Midnight wallet in the UI.\n`);
    console.log(`✅ Seed saved to: ${seedFilePath}\n`);

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
    console.log("   ✅ Wallet created!\n");

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📍 DEPLOYMENT WALLET ADDRESS:");
    console.log(`   ${state.address}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Save address to file
    const addressFilePath = path.join(__dirname, "..", "..", "..", "DEPLOYMENT_WALLET_ADDRESS.txt");
    fs.writeFileSync(addressFilePath, state.address);
    console.log(`✅ Address saved to: ${addressFilePath}\n`);

    let balance = state.balances[nativeToken()] || 0n;

    if (balance === 0n) {
      console.log("💰 Current balance: 0 tDUST\n");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🚰 GET tDUST FROM FAUCET:");
      console.log("");
      console.log("   1. Open: https://faucet.testnet.midnight.network");
      console.log("   2. Copy the address above");
      console.log("   3. Paste and click 'Request tDUST'");
      console.log("   4. Wait 2-3 minutes");
      console.log("");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      console.log("⏳ Waiting for tDUST tokens to arrive...");
      console.log("   (The script will automatically continue when tokens are received)\n");

      balance = await waitForFunds(wallet);
    } else {
      console.log(`✅ Balance: ${balance} tDUST\n`);
    }

    // Load compiled contract files
    console.log("📦 Loading contract...");
    const contractPath = path.join(__dirname, "..", "dist", "managed", "edgechain");
    const contractModulePath = path.join(contractPath, "contract", "index.cjs");

    if (!fs.existsSync(contractModulePath)) {
      console.error("\n❌ Contract not found!");
      console.error(`   Expected: ${contractModulePath}\n`);
      console.error("   Please run:");
      console.error("   cd packages/contract");
      console.error("   npm run compact");
      console.error("   npm run build\n");
      process.exit(1);
    }

    const EdgeChainModule = await import(contractModulePath);

    // Create witness functions for the contract
    const witnesses = {
      farmerSecretKey: () => {
        // Generate a random farmer secret key for witness
        const secretKey = new Uint8Array(32);
        crypto.getRandomValues(secretKey);
        return secretKey;
      }
    };

    const contractInstance = new EdgeChainModule.Contract(witnesses);
    console.log("   ✅ Contract loaded\n");

    // Create wallet provider for transactions
    const walletState = await Rx.firstValueFrom(wallet.state());

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
        privateStateStoreName: "edgechain-deployment-state"
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

    // Deploy contract to blockchain
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🚀 DEPLOYING CONTRACT TO MIDNIGHT TESTNET");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("   ⏳ Generating zero-knowledge proofs...");
    console.log("   This takes 30-60 seconds - please be patient!\n");

    const deployed = await deployContract(providers, {
      contract: contractInstance,
      privateStateId: "edgechainDeploymentState",
      initialPrivateState: {}
    });

    const contractAddress = deployed.deployTxData.public.contractAddress;

    // Save deployment information
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ CONTRACT DEPLOYED SUCCESSFULLY!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("📝 CONTRACT DETAILS:\n");
    console.log(`   Address: ${contractAddress}`);
    console.log(`   Deployed at: ${new Date().toISOString()}`);
    console.log(`   Network: Midnight Testnet`);
    console.log(`   Deployment wallet: ${state.address}\n`);

    const info = {
      contractAddress,
      deployedAt: new Date().toISOString(),
      network: "testnet",
      deploymentWalletAddress: state.address,
      deploymentWalletSeed: walletSeed,
      note: "This wallet was used for deployment only. Use a compatible Midnight wallet for UI interaction."
    };

    const deploymentPath = path.join(__dirname, "..", "deployment.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(info, null, 2));
    console.log(`✅ Deployment info saved to: ${deploymentPath}`);

    // Save to UI env file
    const uiEnvPath = path.join(__dirname, "..", "..", "ui", ".env.local");
    const envContent = `# EdgeChain Midnight Contract Address
# Deployed: ${new Date().toISOString()}
VITE_CONTRACT_ADDRESS=${contractAddress}

# Midnight Testnet Configuration
VITE_MIDNIGHT_INDEXER_URL=${TESTNET_CONFIG.indexer}
VITE_MIDNIGHT_INDEXER_WS=${TESTNET_CONFIG.indexerWS}
VITE_MIDNIGHT_NODE_URL=${TESTNET_CONFIG.node}
VITE_MIDNIGHT_PROOF_SERVER=${TESTNET_CONFIG.proofServer}
`;

    fs.writeFileSync(uiEnvPath, envContent);
    console.log(`✅ Environment variables saved to: ${uiEnvPath}\n`);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎯 NEXT STEPS:\n");
    console.log("1. Keep the proof server running (Terminal 1)");
    console.log("");
    console.log("2. Start the UI:");
    console.log("   cd packages/ui");
    console.log("   npm run dev");
    console.log("");
    console.log("3. Open http://localhost:5173 in your browser");
    console.log("");
    console.log("4. Connect your Midnight wallet");
    console.log("   (Lace with Midnight enabled or another compatible Midnight wallet)");
    console.log("");
    console.log("5. Test the EdgeChain federated learning workflow!");
    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("💡 NOTE:");
    console.log("   • Deployment wallet: Used only for deploying the contract");
    console.log("   • Your Lace wallet: Use this in the UI for transactions");
    console.log("   • Both wallets work with the same deployed contract\n");

    console.log("🎉 EdgeChain is now live on Midnight Testnet!\n");

    // Close wallet connection
    await wallet.close();

  } catch (error) {
    console.error("\n❌ Deployment failed!");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (error instanceof Error) {
      console.error("Error:", error.message);

      if (error.message.includes("balance") || error.message.includes("funds")) {
        console.error("\n💡 Make sure you requested tDUST from the faucet!");
        console.error("   https://faucet.testnet.midnight.network\n");
      } else if (error.message.includes("connection") || error.message.includes("network")) {
        console.error("\n💡 Check:");
        console.error("   - Internet connection");
        console.error("   - Proof server running (port 6300)");
        console.error("   - Midnight Testnet status\n");
      }

      console.error("\nStack trace:");
      console.error(error.stack);
    }

    process.exit(1);
  }
}

main().catch(console.error);
