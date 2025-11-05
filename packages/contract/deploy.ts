#!/usr/bin/env node
/**
 * EdgeChain Contract Deployment Script
 *
 * This script deploys the EdgeChain Compact contract to Midnight devnet.
 *
 * Prerequisites:
 * 1. Lace Midnight Preview wallet installed in browser
 * 2. tDUST tokens in wallet (get from faucet: https://faucet.devnet.midnight.network)
 * 3. Contract compiled (yarn compact)
 *
 * Usage:
 *   yarn deploy
 *   # or
 *   node --loader ts-node/esm deploy.ts
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║         EdgeChain Midnight Contract Deployment                ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('📋 Deployment Information:');
console.log('   Network: Midnight Devnet');
console.log('   Contract: edgechain.compact\n');

// Check if contract file exists
const contractPath = resolve(__dirname, 'dist/edgechain.compact');
try {
  const contractFile = readFileSync(contractPath, 'utf-8');
  console.log('✅ Contract file found:', contractPath);
  console.log(`   Size: ${(contractFile.length / 1024).toFixed(2)} KB\n`);
} catch (error) {
  console.error('❌ Contract file not found!');
  console.error('   Expected:', contractPath);
  console.error('\n📝 Please run: yarn compact\n');
  process.exit(1);
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('🚀 Deployment Methods:\n');
console.log('Option 1: Browser-Based Deployment (Recommended for Hackathon)');
console.log('──────────────────────────────────────────────────────────────');
console.log('1. Install Lace Midnight Preview wallet extension');
console.log('   → https://chromewebstore.google.com/detail/lace-midnight-preview/');
console.log('');
console.log('2. Get tDUST tokens from faucet');
console.log('   → https://faucet.devnet.midnight.network');
console.log('   → Paste your Lace wallet address');
console.log('   → Wait for confirmation (usually 1-2 minutes)');
console.log('');
console.log('3. Deploy using Midnight DApp Connector:');
console.log('   a) Create a simple HTML deployment page');
console.log('   b) Use @midnight-ntwrk/dapp-connector-api to connect wallet');
console.log('   c) Use wallet.deployContract() method');
console.log('   d) Wallet will prompt for transaction approval');
console.log('');
console.log('   Example code:');
console.log('   ');
console.log('   const api = await getDAppConnectorAPI();');
console.log('   const wallet = await api.enable();');
console.log('   const contractData = readFileSync("dist/edgechain.compact");');
console.log('   const tx = await wallet.deployContract(contractData);');
console.log('   console.log("Contract address:", tx.contractAddress);');
console.log('');

console.log('\nOption 2: Programmatic Deployment (Production)');
console.log('──────────────────────────────────────────────────────────────');
console.log('This requires:');
console.log('- Midnight Wallet SDK (@midnight-ntwrk/wallet)');
console.log('- Node.js environment with ZK proof server');
console.log('- Private key management');
console.log('- More complex setup (not recommended for hackathon)');
console.log('');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📦 Next Steps:\n');
console.log('1. ✅ Contract compiled and ready');
console.log('2. ⏳ Install Lace Midnight Preview wallet');
console.log('3. ⏳ Get tDUST tokens from faucet');
console.log('4. ⏳ Create deployment UI (or use existing FLDashboard)');
console.log('5. ⏳ Deploy contract via wallet');
console.log('6. ⏳ Save contract address to .env file\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('💡 Quick Start:\n');
console.log('For fastest hackathon deployment, we recommend:');
console.log('1. Add a "Deploy Contract" button to FLDashboard');
console.log('2. Use existing DApp Connector integration');
console.log('3. Deploy directly from the UI');
console.log('');
console.log('This way, you leverage the wallet connection you already have!\n');

console.log('📚 Resources:');
console.log('   Docs: https://docs.midnight.network');
console.log('   Faucet: https://faucet.devnet.midnight.network');
console.log('   Wallet: https://lace.io/midnight-preview\n');
