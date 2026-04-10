import type { DAppConnectorAPI } from '@midnight-ntwrk/dapp-connector-api';

type MidnightBrowserWalletApi = Partial<DAppConnectorAPI> & {
  enable?: () => Promise<MidnightBrowserWalletApi>;
  state?: () => Promise<{ address?: string; network?: string | number } | undefined>;
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
      wallet?: MidnightBrowserWalletApi;
      connector?: MidnightBrowserWalletApi;
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
