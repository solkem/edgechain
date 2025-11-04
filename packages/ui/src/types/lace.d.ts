/**
 * lace.d.ts
 *
 * TypeScript type definitions for the Lace wallet browser extension.
 *
 * Lace wallet injects a global `cardano` object into the browser window.
 * This file tells TypeScript what that object looks like, so we get:
 * - Autocomplete in our IDE
 * - Type checking
 * - Better error messages
 */

/**
 * Extend the browser's Window interface
 * This adds the `cardano` property that Lace injects
 */
interface Window {
  cardano?: {
    /**
     * The Lace wallet API
     * This is injected by the Lace browser extension
     */
    lace?: {
      /**
       * Request permission to connect to the wallet
       * Returns true if user approves, false if they decline
       */
      enable(): Promise<boolean>;

      /**
       * Check if the wallet API is already enabled
       */
      isEnabled(): Promise<boolean>;

      /**
       * Get the network ID
       * - 1 = Mainnet
       * - 0 = Testnet
       */
      getNetworkId(): Promise<number>;

      /**
       * Get addresses that have been used (have transactions)
       * Returns an array of bech32-encoded addresses
       */
      getUsedAddresses(): Promise<string[]>;

      /**
       * Get unused addresses (no transactions yet)
       * Returns an array of bech32-encoded addresses
       */
      getUnusedAddresses(): Promise<string[]>;

      /**
       * Get the current change address
       * This is where change from transactions goes
       */
      getChangeAddress(): Promise<string>;

      /**
       * Get the total balance of the wallet
       * Returns value in lovelace (smallest ADA unit)
       */
      getBalance(): Promise<string>;

      /**
       * Get UTXOs (Unspent Transaction Outputs)
       * These are the "coins" the wallet can spend
       */
      getUtxos(): Promise<string[]>;

      /**
       * Get collateral UTXOs
       * Used for smart contract transactions
       */
      getCollateral(): Promise<string[]>;

      /**
       * Sign a transaction
       * @param tx - The transaction to sign (CBOR hex string)
       * @param partialSign - Whether to partially sign (for multi-sig)
       */
      signTx(tx: string, partialSign?: boolean): Promise<string>;

      /**
       * Sign arbitrary data
       * Used for authentication/verification
       * @param address - The address to sign with
       * @param payload - The data to sign (hex string)
       */
      signData(address: string, payload: string): Promise<{
        signature: string;
        key: string;
      }>;

      /**
       * Submit a signed transaction to the network
       * @param tx - The signed transaction (CBOR hex string)
       */
      submitTx(tx: string): Promise<string>;

      /**
       * Event listener for account changes
       * Called when user switches accounts in Lace
       */
      on?(event: 'accountsChanged', handler: (accounts: string[]) => void): void;

      /**
       * Remove event listener
       */
      off?(event: 'accountsChanged', handler: (accounts: string[]) => void): void;

      /**
       * Get the wallet's icon (for display in UI)
       * Returns a URL to the wallet logo
       */
      icon?: string;

      /**
       * Get the wallet's name
       */
      name?: string;

      /**
       * API version
       */
      apiVersion?: string;
    };

    /**
     * Other wallet providers might also inject here
     * (Nami, Eternl, etc.)
     */
    [key: string]: any;
  };
}

/**
 * Type for a Cardano address
 * Addresses are bech32-encoded strings starting with "addr1"
 *
 * Example: "addr1qyxq3k4..."
 */
export type CardanoAddress = string;

/**
 * Type for transaction hex (CBOR-encoded)
 */
export type TransactionHex = string;

/**
 * Network ID enum for clarity
 */
export enum NetworkId {
  Testnet = 0,
  Mainnet = 1,
}

/**
 * Wallet connection error types
 * These help us show better error messages to users
 */
export class WalletConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WalletConnectionError';
  }
}

export class WalletNotInstalledError extends WalletConnectionError {
  constructor() {
    super('Lace wallet is not installed. Please install it from https://www.lace.io/');
    this.name = 'WalletNotInstalledError';
  }
}

export class WalletUserRejectedError extends WalletConnectionError {
  constructor() {
    super('User rejected the connection request');
    this.name = 'WalletUserRejectedError';
  }
}

/**
 * How to use these types:
 *
 * 1. Access Lace wallet:
 *    const lace = window.cardano?.lace;
 *
 * 2. Connect:
 *    const enabled = await lace?.enable();
 *
 * 3. Get address:
 *    const addresses: CardanoAddress[] = await lace?.getUsedAddresses();
 *
 * TypeScript will now autocomplete these methods and check types!
 */
