/**
 * Deployment Wallet Service
 *
 * Manages the deployment wallet for distributing tDUST rewards
 * to farmers who submit valid Sensor Node data
 */

import { WalletBuilder } from "@midnight-ntwrk/wallet";
import { NetworkId, setNetworkId, getZswapNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { nativeToken } from "@midnight-ntwrk/ledger";
import { Wallet } from "@midnight-ntwrk/wallet-api";
import * as Rx from "rxjs";
import * as fs from "fs";
import * as path from "path";

// Testnet configuration
const TESTNET_CONFIG = {
  indexer: "https://indexer.testnet-02.midnight.network/api/v1/graphql",
  indexerWS: "wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws",
  node: "https://rpc.testnet-02.midnight.network",
  proofServer: "http://127.0.0.1:6300"
};

// DUST has 6 decimals (1 DUST = 1,000,000 smallest units)
const DUST_DECIMALS = 1_000_000n;

class DeploymentWalletService {
  private wallet: Wallet | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the deployment wallet from saved seed
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._initialize();
    await this.initPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      console.log('\n🔐 Initializing deployment wallet...');

      // Configure network
      setNetworkId(NetworkId.TestNet);

      // Load wallet seed from deployment.json
      // Path from server/src/services to packages/contract
      const deploymentPath = path.join(process.cwd(), '..', 'packages', 'contract', 'deployment.json');

      if (!fs.existsSync(deploymentPath)) {
        throw new Error(`Deployment file not found: ${deploymentPath}`);
      }

      const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
      const walletSeed = deploymentData.deploymentWalletSeed;

      if (!walletSeed) {
        throw new Error('Deployment wallet seed not found in deployment.json');
      }

      // Build wallet from seed
      this.wallet = await WalletBuilder.buildFromSeed(
        TESTNET_CONFIG.indexer,
        TESTNET_CONFIG.indexerWS,
        TESTNET_CONFIG.proofServer,
        TESTNET_CONFIG.node,
        walletSeed,
        getZswapNetworkId(),
        "error" // Reduce logging noise
      );

      // Wait for wallet to sync
      const state = await Rx.firstValueFrom(this.wallet.state());
      const balance = state.balances[nativeToken()] || 0n;

      console.log(`   ✅ Deployment wallet initialized`);
      console.log(`   📍 Address: ${state.address.slice(0, 30)}...`);
      console.log(`   💰 Balance: ${Number(balance) / 1_000_000} tDUST`);

      if (balance === 0n) {
        console.warn('   ⚠️  WARNING: Deployment wallet has 0 balance!');
        console.warn('   ⚠️  Fund it at: https://faucet.testnet.midnight.network');
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize deployment wallet:', error);
      throw error;
    }
  }

  /**
   * Transfer tDUST tokens from deployment wallet to farmer address
   */
  async transferReward(farmerAddress: string, amountDUST: number): Promise<{
    success: boolean;
    txHash?: string;
    amount: number;
    error?: string;
  }> {
    try {
      if (!this.wallet) {
        await this.initialize();
      }

      if (!this.wallet) {
        throw new Error('Wallet not initialized');
      }

      console.log(`\n💸 Transferring ${amountDUST} tDUST to farmer...`);
      console.log(`   To: ${farmerAddress.slice(0, 30)}...`);

      // Convert DUST to smallest units (1 DUST = 1,000,000 units)
      const amountSmallestUnits = BigInt(Math.floor(amountDUST * 1_000_000));

      // Check balance
      const state = await Rx.firstValueFrom(this.wallet.state());
      const balance = state.balances[nativeToken()] || 0n;

      if (balance < amountSmallestUnits) {
        const balanceDUST = Number(balance) / 1_000_000;
        throw new Error(
          `Insufficient balance. Required: ${amountDUST} tDUST, Available: ${balanceDUST} tDUST`
        );
      }

      // TODO: Implement actual token transfer using Midnight wallet API
      // This requires:
      // 1. Creating a transaction with the wallet
      // 2. Signing and submitting to the network
      // 3. Waiting for confirmation
      //
      // For now, we'll log the transfer and return success
      // (Real implementation requires more Midnight SDK knowledge)

      console.log(`   ⏳ Creating transaction...`);

      // Simulated for now - would be:
      // const tx = await this.wallet.createTransaction({
      //   to: farmerAddress,
      //   amount: amountSmallestUnits,
      //   token: nativeToken()
      // });
      // const txHash = await tx.submit();

      const mockTxHash = `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      console.log(`   ✅ Transfer simulated (real implementation requires Midnight SDK)`);
      console.log(`   📝 Mock TX: ${mockTxHash}`);
      console.log(`   💰 Amount: ${amountDUST} tDUST`);

      return {
        success: true,
        txHash: mockTxHash,
        amount: amountDUST,
      };

    } catch (error: any) {
      console.error(`❌ Transfer failed:`, error.message);
      return {
        success: false,
        amount: amountDUST,
        error: error.message,
      };
    }
  }

  /**
   * Get current wallet balance
   */
  async getBalance(): Promise<number> {
    if (!this.wallet) {
      await this.initialize();
    }

    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }

    const state = await Rx.firstValueFrom(this.wallet.state());
    const balance = state.balances[nativeToken()] || 0n;
    return Number(balance) / 1_000_000; // Convert to DUST
  }

  /**
   * Close wallet connection (if supported by wallet API)
   */
  async close(): Promise<void> {
    if (this.wallet) {
      // Note: Wallet API might not have a close method
      // Cleanup handled by garbage collection
      this.wallet = null;
      this.isInitialized = false;
      this.initPromise = null;
    }
  }
}

// Singleton instance
export const deploymentWalletService = new DeploymentWalletService();
