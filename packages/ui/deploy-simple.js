#!/usr/bin/env node
/**
 * EdgeChain Contract Deployment Script
 * Based on midnight-deploy tool's working pattern
 */

import { WalletBuilder } from '@midnight-ntwrk/wallet';
import { NetworkId, nativeToken, Transaction as ZswapTransaction } from '@midnight-ntwrk/zswap';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { createBalancedTx } from '@midnight-ntwrk/midnight-js-types';
import { Transaction } from '@midnight-ntwrk/ledger';
import { getLedgerNetworkId, getZswapNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { firstValueFrom, filter } from 'rxjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const DEVNET_CONFIG = {
  indexerUrl: 'https://indexer.testnet-02.midnight.network/api/v1/graphql',
  indexerWsUrl: 'wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws',
  proverServerUrl: 'http://localhost:6300',
  nodeUrl: 'https://rpc.testnet-02.midnight.network',
  networkId: NetworkId.TestNet,
};

// Create wallet and Midnight provider wrapper (from midnight-deploy pattern)
async function createWalletAndMidnightProvider(wallet) {
  const state = await firstValueFrom(wallet.state());
  if (!state) {
    throw new Error("Wallet state is unavailable.");
  }

  return {
    coinPublicKey: state.coinPublicKey,
    encryptionPublicKey: state.encryptionPublicKey,
    balanceTx(tx, newCoins) {
      return wallet.balanceTransaction(
        ZswapTransaction.deserialize(tx.serialize(getLedgerNetworkId()), getZswapNetworkId()),
        newCoins
      )
        .then((tx) => wallet.proveTransaction(tx))
        .then((zswapTx) => Transaction.deserialize(
          zswapTx.serialize(getZswapNetworkId()),
          getLedgerNetworkId()
        ))
        .then(createBalancedTx);
    },
    submitTx(tx) {
      return wallet.submitTransaction(tx);
    },
  };
}

// Wait for wallet to have sufficient funds
async function waitForFunds(wallet) {
  console.log('⏳ Waiting for wallet sync and balance...');

  const state = await firstValueFrom(
    wallet.state().pipe(
      filter((s) => (s.balances[nativeToken()] || 0n) > 1000000n)
    )
  );

  return state;
}

// Configure Midnight providers (from midnight-deploy pattern)
async function configureProviders(wallet, managedPath) {
  const walletAndMidnightProvider = await createWalletAndMidnightProvider(wallet);

  return {
    privateStateProvider: levelPrivateStateProvider({ privateStateStoreName: 'deployer-private-store' }),
    publicDataProvider: indexerPublicDataProvider(DEVNET_CONFIG.indexerUrl, DEVNET_CONFIG.indexerWsUrl),
    zkConfigProvider: new NodeZkConfigProvider(managedPath),
    proofProvider: httpClientProofProvider(DEVNET_CONFIG.proverServerUrl),
    walletProvider: walletAndMidnightProvider,
    midnightProvider: walletAndMidnightProvider,
  };
}

async function deployEdgeChainContract() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║    EdgeChain Midnight Contract Deployment (Devnet)            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // 1. Check wallet seed
  const walletSeed = process.env.DEPLOYER_MNEMONIC;
  if (!walletSeed) {
    console.error('❌ Error: DEPLOYER_MNEMONIC environment variable not set\n');
    console.log('Usage:');
    console.log('  export DEPLOYER_MNEMONIC="your-24-word-seed-phrase"');
    console.log('  node deploy-simple.js\n');
    process.exit(1);
  }

  console.log('✅ Deployer mnemonic found\n');

  // 2. Load compiled contract
  // Find the correct path whether we're in root or packages/ui
  const contractPath = resolve(__dirname, __dirname.includes('/packages/ui') ? '../contract/dist/managed/edgechain' : 'packages/contract/dist/managed/edgechain');
  const contractModulePath = resolve(contractPath, 'contract/index.cjs');

  console.log('📦 Loading compiled contract...');
  console.log(`   Path: ${contractModulePath}\n`);

  let Contract;
  try {
    const module = await import(contractModulePath);
    Contract = module.Contract;
    console.log('✅ Contract module loaded\n');
  } catch (error) {
    console.error('❌ Failed to load contract:', error.message);
    console.error('\nMake sure the contract is compiled:');
    console.error('  cd packages/contract');
    console.error('  npm run compact');
    console.error('  npm run build\n');
    process.exit(1);
  }

  let wallet;

  try {
    // 3. Build wallet
    console.log('🔐 Building wallet...');
    console.log(`   Network: TestNet`);
    console.log(`   Indexer: ${DEVNET_CONFIG.indexerUrl}`);
    console.log(`   Proof Server: ${DEVNET_CONFIG.proverServerUrl}\n`);

    wallet = await WalletBuilder.build(
      DEVNET_CONFIG.indexerUrl,
      DEVNET_CONFIG.indexerWsUrl,
      DEVNET_CONFIG.proverServerUrl,
      DEVNET_CONFIG.nodeUrl,
      walletSeed,
      DEVNET_CONFIG.networkId,
      'info'  // log level
    );

    // Start wallet
    wallet.start();
    console.log('✅ Wallet built and started\n');

    // 4. Wait for sync and check balance
    const walletState = await waitForFunds(wallet);

    const balance = walletState.balances[nativeToken()] || 0n;

    console.log('✅ Wallet synced');
    console.log(`   Address: ${walletState.address}`);
    console.log(`   Balance: ${balance} tDUST\n`);

    // 5. Configure providers
    console.log('⚙️  Configuring Midnight providers...\n');
    const providers = await configureProviders(wallet, contractPath);
    console.log('✅ Providers configured\n');

    // 6. Create contract instance
    // EdgeChain contract has a witness function farmerSecretKey()
    // We need to provide a witness implementation
    const witnesses = {
      farmerSecretKey: () => [{}, new Uint8Array(32)]  // Empty witness for deployment
    };

    const contractInstance = new Contract(witnesses);

    // 7. Deploy contract
    console.log('🚀 Deploying EdgeChain contract to devnet...');
    console.log('   This may take 2-5 minutes (generating ZK proofs)...\n');

    const deployed = await deployContract(providers, {
      contract: contractInstance,
      privateStateId: 'EdgeChainFL-private',
      initialPrivateState: {},
    });

    const contractAddress = deployed.deployTxData.public.contractAddress;

    console.log('✅ Contract deployed successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📝 Deployment Details:\n');
    console.log(`   Contract Address: ${contractAddress}`);
    console.log(`   Transaction ID: ${deployed.deployTxData.public.txId || 'N/A'}`);
    console.log('');

    // 8. Save contract address
    const envPath = resolve(__dirname, __dirname.includes('/packages/ui') ? '.env.local' : 'packages/ui/.env.local');
    const envContent = `# EdgeChain Midnight Contract Address
# Deployed: ${new Date().toISOString()}
# Network: Midnight Testnet-02
VITE_CONTRACT_ADDRESS=${contractAddress}

# Midnight Devnet Configuration
VITE_MIDNIGHT_INDEXER_URL=${DEVNET_CONFIG.indexerUrl}
VITE_MIDNIGHT_INDEXER_WS=${DEVNET_CONFIG.indexerWsUrl}
VITE_MIDNIGHT_NODE_URL=${DEVNET_CONFIG.nodeUrl}
VITE_MIDNIGHT_PROOF_SERVER=${DEVNET_CONFIG.proverServerUrl}
`;

    writeFileSync(envPath, envContent);
    console.log('✅ Contract address saved to:', envPath);
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎯 Next Steps:\n');
    console.log('1. Implement real circuit calls in ContractProvider');
    console.log('2. Restart UI: yarn dev:ui');
    console.log('3. Connect your Lace wallet in the browser');
    console.log('4. Test the FL workflow with real transactions!\n');

    // Cleanup
    await wallet.close();

    return contractAddress;
  } catch (error) {
    console.error('\n❌ Deployment failed!\n');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }

    // Cleanup wallet if it was created
    if (wallet) {
      try {
        await wallet.close();
      } catch (closeError) {
        // Ignore cleanup errors
      }
    }

    process.exit(1);
  }
}

// Run deployment
deployEdgeChainContract()
  .then((address) => {
    console.log('🎉 Deployment complete!');
    console.log(`   Contract Address: ${address}\n`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
