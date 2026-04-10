// @ts-nocheck
/**
 * View EdgeChain Contract State
 *
 * This tool queries and displays the current state of a deployed contract
 */

import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import {
  NetworkId,
  setNetworkId
} from "@midnight-ntwrk/midnight-js-network-id";
import { WebSocket } from "ws";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fix WebSocket for Node.js environment
// @ts-ignore
globalThis.WebSocket = WebSocket;

// Configure for Midnight Testnet
setNetworkId(NetworkId.TestNet);

const TESTNET_CONFIG = {
  indexer: "https://indexer.testnet-02.midnight.network/api/v1/graphql",
  indexerWS: "wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws"
};

async function viewContract() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║           EdgeChain Contract State Viewer                      ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    // Check for deployment.json
    const deploymentPath = path.join(__dirname, "..", "deployment.json");
    let contractAddress: string;

    if (fs.existsSync(deploymentPath)) {
      const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
      contractAddress = deployment.contractAddress;
      console.log(`📝 Found deployed contract: ${contractAddress}\n`);

      const useThis = await rl.question("Use this address? (y/n): ");
      if (useThis.toLowerCase() !== 'y' && useThis.toLowerCase() !== 'yes') {
        contractAddress = await rl.question("Enter contract address: ");
      }
    } else {
      console.log("No deployment.json found.\n");
      contractAddress = await rl.question("Enter contract address: ");
    }

    console.log("\n🔍 Querying contract state...\n");

    // Create public data provider
    const publicDataProvider = indexerPublicDataProvider(
      TESTNET_CONFIG.indexer,
      TESTNET_CONFIG.indexerWS
    );

    // Query contract state
    const state = await publicDataProvider.queryContractState(contractAddress);

    if (!state) {
      console.log("❌ Contract not found or no state available");
      console.log(`   Address: ${contractAddress}`);
      console.log(`\n   Possible reasons:`);
      console.log(`   - Contract not yet deployed`);
      console.log(`   - Incorrect contract address`);
      console.log(`   - Network sync issue\n`);
      process.exit(1);
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 CONTRACT STATE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log(`📍 Contract Address:\n   ${contractAddress}\n`);

    // Load contract module to decode state
    const contractPath = path.join(__dirname, "..", "dist", "managed", "edgechain");
    const contractModulePath = path.join(contractPath, "contract", "index.cjs");

    if (fs.existsSync(contractModulePath)) {
      const EdgeChainModule = await import(contractModulePath);
      const ledger = EdgeChainModule.ledger(state.data);

      console.log("📋 PUBLIC LEDGER STATE:\n");

      console.log(`   Current Round:          ${ledger.currentRound || 0}`);
      console.log(`   Model Version:          ${ledger.currentModelVersion || 0}`);
      console.log(`   Submission Count:       ${ledger.submissionCount || 0}`);
      console.log(`   Is Aggregating:         ${ledger.isAggregating ? 'Yes' : 'No'}`);

      if (ledger.globalModelHash) {
        const hashBytes = Buffer.from(ledger.globalModelHash);
        const hashHex = hashBytes.toString('hex');
        console.log(`   Global Model Hash:      ${hashHex.substring(0, 16)}...${hashHex.substring(hashHex.length - 16)}`);
      } else {
        console.log(`   Global Model Hash:      (not set)`);
      }

      console.log("");

    } else {
      console.log("⚠️  Contract module not found, showing raw state:\n");
      console.log(JSON.stringify(state.data, null, 2));
      console.log("");
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📈 FEDERATED LEARNING STATUS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (state.data) {
      const contractPath = path.join(__dirname, "..", "dist", "managed", "edgechain");
      const contractModulePath = path.join(contractPath, "contract", "index.cjs");

      if (fs.existsSync(contractModulePath)) {
        const EdgeChainModule = await import(contractModulePath);
        const ledger = EdgeChainModule.ledger(state.data);

        const submissionCount = Number(ledger.submissionCount || 0);
        const isAggregating = ledger.isAggregating;
        const currentRound = Number(ledger.currentRound || 0);

        if (submissionCount === 0) {
          console.log("   Status: Waiting for first model submission");
          console.log("   Action: Farmers can submit model updates\n");
        } else if (isAggregating) {
          console.log("   Status: Aggregation in progress");
          console.log(`   Submissions received: ${submissionCount}`);
          console.log("   Action: Waiting for aggregation to complete\n");
        } else if (submissionCount > 0 && submissionCount < 2) {
          console.log("   Status: Collecting model submissions");
          console.log(`   Progress: ${submissionCount}/2 submissions received`);
          console.log(`   Needed: ${2 - submissionCount} more submission(s)\n`);
        } else {
          console.log("   Status: Round complete, ready for next round");
          console.log(`   Round: ${currentRound}`);
          console.log(`   Total submissions: ${submissionCount}\n`);
        }
      }
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  } catch (error) {
    console.error("\n❌ Error:", error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

viewContract().catch(console.error);
