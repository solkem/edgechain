/**
 * lace.d.ts
 *
 * TypeScript type definitions for the Lace Midnight Preview browser extension.
 *
 * IMPORTANT: This is for Lace Midnight Preview, NOT regular Lace wallet!
 * - Lace Midnight Preview: Specialized extension for Midnight devnet
 * - Supports: tDUST tokens (test tokens for Midnight blockchain)
 * - Purpose: Developer tool for privacy-preserving DApps with zero-knowledge proofs
 * - Network: Midnight devnet only (not Cardano mainnet/testnet)
 *
 * Lace Midnight Preview injects a global `cardano.lace` object into the browser window
 * (same API path as regular Lace, but connects to Midnight devnet instead of Cardano).
 * This file tells TypeScript what that object looks like, so we get:
 * - Autocomplete in our IDE
 * - Type checking
 * - Better error messages
 */

/**
 * Extend the browser's Window interface
 * This adds the `cardano.lace` property that Lace Midnight Preview injects
 */
interface Window {
  cardano?: {
    /**
     * The Lace Midnight Preview wallet API
     * This is injected by the Lace Midnight Preview browser extension
     *
     * IMPORTANT: Uses window.cardano.lace (same as regular Lace) but connects to
     * the Midnight blockchain devnet with privacy features and ZK-proofs.
     */
    lace?: {
      /**
       * Request permission to connect to the Midnight Preview wallet
       * Returns true if user approves, false if they decline
       *
       * This will show a popup in Lace Midnight Preview asking for permission.
       */
      enable(): Promise<boolean>;

      /**
       * Check if the Midnight wallet API is already enabled
       */
      isEnabled(): Promise<boolean>;

      /**
       * Get the network ID
       * For Midnight Preview, this should always return the devnet ID
       * (Midnight Preview only works on the development network)
       *
       * Note: This may differ from Cardano's network IDs
       */
      getNetworkId(): Promise<number>;

      /**
       * Get Midnight addresses that have been used (have transactions)
       * Returns an array of Midnight-formatted addresses
       *
       * Note: Midnight addresses may use different encoding than Cardano bech32
       */
      getUsedAddresses(): Promise<string[]>;

      /**
       * Get unused Midnight addresses (no transactions yet)
       * Returns an array of Midnight-formatted addresses
       */
      getUnusedAddresses(): Promise<string[]>;

      /**
       * Get the current change address
       * This is where change from Midnight transactions goes
       */
      getChangeAddress(): Promise<string>;

      /**
       * Get the total balance of the Midnight wallet
       * Returns value in the smallest tDUST unit (test tokens for Midnight devnet)
       *
       * IMPORTANT: This returns tDUST balance, NOT ADA!
       * tDUST = test DUST tokens for Midnight development network
       */
      getBalance(): Promise<string>;

      /**
       * Get UTXOs (Unspent Transaction Outputs) for Midnight
       * These are the "coins" the wallet can spend on Midnight devnet
       *
       * Note: Midnight UTXOs may have different structure than Cardano UTXOs
       * due to privacy features and zero-knowledge proofs
       */
      getUtxos(): Promise<string[]>;

      /**
       * Get collateral UTXOs
       * Used for Midnight smart contract transactions with ZK-proofs
       *
       * Collateral is required when executing privacy-preserving smart contracts
       */
      getCollateral(): Promise<string[]>;

      /**
       * Sign a Midnight transaction
       * @param tx - The Midnight transaction to sign (format may differ from Cardano)
       * @param partialSign - Whether to partially sign (for multi-sig)
       *
       * IMPORTANT: This signs Midnight transactions with privacy features,
       * not standard Cardano transactions!
       */
      signTx(tx: string, partialSign?: boolean): Promise<string>;

      /**
       * Sign arbitrary data
       * Used for authentication/verification on Midnight network
       * @param address - The Midnight address to sign with
       * @param payload - The data to sign (hex string)
       */
      signData(address: string, payload: string): Promise<{
        signature: string;
        key: string;
      }>;

      /**
       * Submit a signed transaction to the Midnight devnet
       * @param tx - The signed Midnight transaction
       *
       * Returns transaction hash/ID from Midnight network
       */
      submitTx(tx: string): Promise<string>;

      /**
       * Event listener for account changes
       * Called when user switches accounts in Lace Midnight Preview
       */
      on?(event: 'accountsChanged', handler: (accounts: string[]) => void): void;

      /**
       * Remove event listener
       */
      off?(event: 'accountsChanged', handler: (accounts: string[]) => void): void;

      /**
       * Get the wallet's icon (for display in UI)
       * Returns a URL to the Lace Midnight Preview logo
       */
      icon?: string;

      /**
       * Get the wallet's name
       * Should return "Lace Midnight Preview" or similar
       */
      name?: string;

      /**
       * API version for Midnight Preview
       */
      apiVersion?: string;
    };

    /**
     * Other wallet providers might also inject here
     * Regular Lace (window.cardano.lace), Nami, Eternl, etc.
     *
     * Note: Make sure to use window.cardano.midnight for Midnight Preview,
     * NOT window.cardano.lace!
     */
    [key: string]: any;
  };
}

/**
 * Type for a Midnight address
 * Note: Midnight addresses may use different encoding than Cardano bech32
 *
 * Check Midnight documentation for exact address format.
 * May start with a different prefix than Cardano's "addr1"
 */
export type MidnightAddress = string;

/**
 * Type for Midnight transaction hex
 * Note: Format may differ from Cardano CBOR due to privacy features
 */
export type MidnightTransactionHex = string;

/**
 * Network ID enum for Midnight
 * Midnight Preview only supports devnet (development network)
 */
export enum MidnightNetworkId {
  Devnet = 0, // Adjust based on actual Midnight network ID
}

/**
 * Midnight wallet connection error types
 * These help us show better error messages to users
 */
export class MidnightWalletConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MidnightWalletConnectionError';
  }
}

export class MidnightWalletNotInstalledError extends MidnightWalletConnectionError {
  constructor() {
    super(
      'Lace Midnight Preview is not installed. ' +
      'This is a specialized extension for Midnight devnet development. ' +
      'Please install it to connect to Midnight blockchain.'
    );
    this.name = 'MidnightWalletNotInstalledError';
  }
}

export class MidnightWalletUserRejectedError extends MidnightWalletConnectionError {
  constructor() {
    super('User rejected the Midnight wallet connection request');
    this.name = 'MidnightWalletUserRejectedError';
  }
}

/**
 * How to use these types:
 *
 * 1. Access Lace Midnight Preview wallet:
 *    const lace = window.cardano?.lace;
 *
 * 2. Connect to Midnight devnet:
 *    const enabled = await lace?.enable();
 *
 * 3. Get Midnight address:
 *    const addresses: MidnightAddress[] = await lace?.getUsedAddresses();
 *
 * 4. Get tDUST balance (test tokens):
 *    const balance = await lace?.getBalance();
 *
 * TypeScript will now autocomplete these methods and check types!
 *
 * IMPORTANT REMINDERS:
 * - Use window.cardano.lace (same API as regular Lace)
 * - Lace Midnight Preview uses this same API path
 * - This is for Midnight devnet only, not Cardano mainnet/testnet
 * - Uses tDUST tokens (test tokens), not ADA
 * - Supports privacy features and zero-knowledge proofs
 */
