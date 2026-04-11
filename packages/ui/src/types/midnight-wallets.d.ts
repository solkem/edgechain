import type { DAppConnectorAPI } from '@midnight-ntwrk/dapp-connector-api';

type MidnightBrowserWalletApi = Partial<DAppConnectorAPI> & {
  enable?: () => Promise<MidnightBrowserWalletApi>;
  connect?: (networkId?: string) => Promise<MidnightBrowserWalletApi>;
  state?: () => Promise<{
    address?: string;
    coinPublicKey?: string;
    encryptionPublicKey?: string;
    network?: string | number;
  } | undefined>;
  getShieldedAddresses?: () => Promise<{
    shieldedAddress?: string;
    shieldedCoinPublicKey?: string;
    shieldedEncryptionPublicKey?: string;
  }>;
  getUnshieldedAddress?: () => Promise<{ unshieldedAddress?: string }>;
  getDustAddress?: () => Promise<{ dustAddress?: string }>;
  getConnectionStatus?: () => Promise<{ status: string; networkId?: string }>;
  getConfiguration?: () => Promise<{ networkId?: string }>;
  getUsedAddresses?: () => Promise<string[]>;
  getUnusedAddresses?: () => Promise<string[]>;
  getChangeAddress?: () => Promise<string>;
  getNetworkId?: () => Promise<number>;
  signData?: (address: string, payload: string) => Promise<{
    signature: string;
    key?: string;
  }>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  off?: (event: string, handler: (...args: any[]) => void) => void;
  name?: string;
  icon?: string;
  apiVersion?: string;
  [key: string]: unknown;
};

declare global {
  interface Window {
    lace?: MidnightBrowserWalletApi & {
      midnight?: MidnightBrowserWalletApi;
    };
    midnight?: MidnightBrowserWalletApi & {
      mnLace?: MidnightBrowserWalletApi;
      mLace?: MidnightBrowserWalletApi;
      wallet?: MidnightBrowserWalletApi;
      connector?: MidnightBrowserWalletApi;
      [key: string]: unknown;
    };
    oneam?: MidnightBrowserWalletApi;
    cardano?: {
      lace?: MidnightBrowserWalletApi & {
        midnight?: MidnightBrowserWalletApi;
        mnLace?: MidnightBrowserWalletApi;
        mLace?: MidnightBrowserWalletApi;
      };
      midnight?: MidnightBrowserWalletApi & {
        mnLace?: MidnightBrowserWalletApi;
        mLace?: MidnightBrowserWalletApi;
        wallet?: MidnightBrowserWalletApi;
        connector?: MidnightBrowserWalletApi;
      };
      [key: string]: unknown;
    };
  }
}

export {};
