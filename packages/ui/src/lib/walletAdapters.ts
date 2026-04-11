import type { DAppConnectorAPI } from '@midnight-ntwrk/dapp-connector-api';

export type MidnightNetwork = 'preview' | 'preprod' | 'mainnet' | 'testnet' | 'devnet' | 'unknown';
export type WalletAdapterId = 'lace' | '1am';

export interface MidnightWalletApi extends Partial<DAppConnectorAPI> {
  enable?: () => Promise<MidnightWalletApi>;
  connect?: (networkId?: string) => Promise<MidnightWalletApi>;
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
  signData?: (address: string, payload: string) => Promise<{ signature: string; key?: string }>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  off?: (event: string, handler: (...args: any[]) => void) => void;
  name?: string;
  icon?: string;
  apiVersion?: string;
  [key: string]: unknown;
}

export interface DetectedWallet {
  id: WalletAdapterId;
  name: string;
  installUrl?: string;
}

export interface ConnectedWallet {
  adapter: DetectedWallet;
  api: MidnightWalletApi;
  address: string;
  network: MidnightNetwork;
}

export interface MidnightWalletAdapter extends DetectedWallet {
  detect: () => boolean;
  connect: () => Promise<ConnectedWallet>;
  getEventSource?: () => MidnightWalletApi | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const hasEnable = (value: unknown): value is MidnightWalletApi =>
  isRecord(value) && typeof value.enable === 'function';

const hasConnect = (value: unknown): value is MidnightWalletApi =>
  isRecord(value) && typeof value.connect === 'function';

const hasConnector = (value: unknown): value is MidnightWalletApi =>
  hasConnect(value) || hasEnable(value);

const withTimeout = async <T,>(promise: Promise<T>, message: string, timeoutMs = 30_000): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const pickApi = (...candidates: unknown[]): MidnightWalletApi | null => {
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (hasConnector(candidate)) return candidate;
    if (!isRecord(candidate)) continue;

    if (hasConnector(candidate.midnight)) return candidate.midnight;

    for (const key of ['mnLace', 'mLace', 'wallet', 'api', 'connector', 'dappConnector']) {
      if (hasConnector(candidate[key])) {
        return candidate[key];
      }
    }
  }

  return null;
};

const toMidnightNetwork = (value: unknown): MidnightNetwork => {
  if (typeof value === 'string') {
    const lowered = value.toLowerCase();
    if (lowered.includes('main')) return 'mainnet';
    if (lowered.includes('preprod')) return 'preprod';
    if (lowered.includes('preview')) return 'preview';
    if (lowered.includes('test')) return 'testnet';
    if (lowered.includes('dev')) return 'devnet';
  }

  if (typeof value === 'number') {
    if (value === 0) return 'devnet';
    if (value === 1) return 'mainnet';
  }

  return 'unknown';
};

const inferWalletNetworkId = (): string | undefined => {
  const configuredNetwork = import.meta.env.VITE_MIDNIGHT_WALLET_NETWORK;
  if (configuredNetwork && configuredNetwork !== 'auto') return configuredNetwork;

  const configuredUrls = [
    import.meta.env.MODE,
    import.meta.env.VITE_MIDNIGHT_INDEXER_URL,
    import.meta.env.VITE_MIDNIGHT_NODE_URL,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return ['mainnet', 'testnet', 'devnet', 'qanet', 'preprod', 'preview', 'undeployed'].find(
    (networkId) => configuredUrls.includes(networkId),
  );
};

const getWalletNetworkIds = (): string[] => {
  const configuredNetwork = import.meta.env.VITE_MIDNIGHT_WALLET_NETWORK;
  if (configuredNetwork && configuredNetwork !== 'auto') {
    const currentConnectorNetworks = ['mainnet', 'preview', 'preprod', 'undeployed'];
    return currentConnectorNetworks.includes(configuredNetwork)
      ? [configuredNetwork]
      : [configuredNetwork, ...currentConnectorNetworks];
  }

  const inferredNetwork = inferWalletNetworkId();

  // Keep the full current Lace list as fallbacks because wallet/network names changed across Midnight releases.
  const candidates = [
    inferredNetwork,
    'preview',
    'preprod',
    'mainnet',
    'undeployed',
  ].filter((networkId): networkId is string => Boolean(networkId));

  return [...new Set(candidates)];
};

const isNetworkSelectionError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return /network/i.test(message) && /(mismatch|unsupported|invalid)/i.test(message);
};

const isAccessDeniedError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return /(denied|rejected|cancelled|canceled|unauthorized|permission)/i.test(message);
};

const connectWithNetworkFallback = async (api: MidnightWalletApi): Promise<MidnightWalletApi> => {
  if (!hasConnect(api)) {
    return api.enable!();
  }

  let lastNetworkError: unknown;

  for (const networkId of getWalletNetworkIds()) {
    try {
      return await api.connect(networkId);
    } catch (error) {
      if (isAccessDeniedError(error)) {
        throw new Error('Access to the Lace Midnight wallet API was denied. Open Lace, approve EdgeChain/127.0.0.1 if prompted, or remove the site from Lace connected apps and try again.');
      }
      if (!isNetworkSelectionError(error)) {
        throw error;
      }
      lastNetworkError = error;
    }
  }

  throw lastNetworkError instanceof Error
    ? lastNetworkError
    : new Error('Unable to connect to a supported Midnight network.');
};

const resolveAddress = async (api: MidnightWalletApi): Promise<string | null> => {
  if (typeof api.getShieldedAddresses === 'function') {
    const addresses = await api.getShieldedAddresses();
    if (addresses.shieldedAddress) return addresses.shieldedAddress;
    if (addresses.shieldedCoinPublicKey) return addresses.shieldedCoinPublicKey;
    if (addresses.shieldedEncryptionPublicKey) return addresses.shieldedEncryptionPublicKey;
  }

  if (typeof api.getUnshieldedAddress === 'function') {
    const address = await api.getUnshieldedAddress();
    if (address.unshieldedAddress) return address.unshieldedAddress;
  }

  if (typeof api.getDustAddress === 'function') {
    const address = await api.getDustAddress();
    if (address.dustAddress) return address.dustAddress;
  }

  if (typeof api.state === 'function') {
    const stateResult = await api.state();
    if (stateResult?.address) {
      return stateResult.address;
    }
    if (stateResult?.coinPublicKey) {
      return stateResult.coinPublicKey;
    }
    if (stateResult?.encryptionPublicKey) {
      return stateResult.encryptionPublicKey;
    }
  }

  if (typeof api.getUsedAddresses === 'function') {
    const addresses = await api.getUsedAddresses();
    if (addresses.length > 0) return addresses[0];
  }

  if (typeof api.getUnusedAddresses === 'function') {
    const addresses = await api.getUnusedAddresses();
    if (addresses.length > 0) return addresses[0];
  }

  if (typeof api.getChangeAddress === 'function') {
    return await api.getChangeAddress();
  }

  return null;
};

const resolveNetwork = async (api: MidnightWalletApi): Promise<MidnightNetwork> => {
  if (typeof api.getConnectionStatus === 'function') {
    const status = await api.getConnectionStatus();
    const network = toMidnightNetwork(status.networkId);
    if (network !== 'unknown') return network;
  }

  if (typeof api.getConfiguration === 'function') {
    const config = await api.getConfiguration();
    const network = toMidnightNetwork(config.networkId);
    if (network !== 'unknown') return network;
  }

  if (typeof api.state === 'function') {
    const stateResult = await api.state();
    const network = toMidnightNetwork(stateResult?.network);
    if (network !== 'unknown') return network;
  }

  if (typeof api.getNetworkId === 'function') {
    const networkId = await api.getNetworkId();
    return toMidnightNetwork(networkId);
  }

  return 'unknown';
};

const connectWithApi = async (
  adapter: DetectedWallet,
  api: MidnightWalletApi | null,
): Promise<ConnectedWallet> => {
  if (!api || (!hasConnect(api) && !hasEnable(api))) {
    throw new Error(
      `${adapter.name} was detected, but its Midnight connector is not available. ` +
        'Open Lace settings and enable Midnight/Beta support, then refresh EdgeChain.',
    );
  }

  const enabledApi = await withTimeout(
    connectWithNetworkFallback(api),
    `${adapter.name} did not finish connecting. If the Lace popup is still loading, unlock Lace, enable Midnight/Beta support, and try again.`,
  );
  const address = await resolveAddress(enabledApi);

  if (!address) {
    throw new Error(`Connected to ${adapter.name}, but could not read a Midnight address.`);
  }

  const network = await resolveNetwork(enabledApi);

  return {
    adapter,
    api: enabledApi,
    address,
    network,
  };
};

const findMidnightWallet = (matches: (key: string, candidate: Record<string, unknown>) => boolean) => {
  if (typeof window === 'undefined') return null;

  const directMidnight = (window as Window & { midnight?: Record<string, unknown> }).midnight;
  if (!isRecord(directMidnight)) return null;

  for (const [key, candidate] of Object.entries(directMidnight)) {
    if (isRecord(candidate) && hasConnector(candidate) && matches(key, candidate)) {
      return candidate;
    }
  }

  return null;
};

const getLaceSource = () => {
  if (typeof window === 'undefined') return null;

  const cardano = (window as Window & { cardano?: Record<string, unknown> }).cardano;
  const cardanoLace = isRecord(cardano?.lace) ? cardano.lace : null;
  const cardanoMidnight = isRecord(cardano?.midnight) ? cardano.midnight : null;
  const directLace = (window as Window & { lace?: MidnightWalletApi }).lace;
  const directMidnight = (window as Window & { midnight?: Record<string, unknown> }).midnight;

  return pickApi(
    isRecord(directMidnight) ? directMidnight.mnLace : null,
    isRecord(directMidnight) ? directMidnight.mLace : null,
    findMidnightWallet((key, candidate) => {
      const name = String(candidate.name ?? '');
      const rdns = String(candidate.rdns ?? '');
      return /lace/i.test(`${key} ${name} ${rdns}`);
    }),
    isRecord(directLace) ? directLace.midnight : null,
    cardanoLace ? cardanoLace.midnight : null,
    cardanoMidnight ? { mnLace: cardanoMidnight.mnLace, mLace: cardanoMidnight.mLace } : null,
  );
};

const isLaceInstalled = () => {
  if (typeof window === 'undefined') return false;

  const cardano = (window as Window & { cardano?: Record<string, unknown> }).cardano;
  const cardanoLace = isRecord(cardano?.lace) ? cardano.lace : null;
  const directLace = (window as Window & { lace?: MidnightWalletApi }).lace;

  return getLaceSource() !== null || isRecord(directLace) || isRecord(cardanoLace);
};

const getOneAMSource = () => {
  if (typeof window === 'undefined') return null;

  const cardano = (window as Window & { cardano?: Record<string, unknown> }).cardano;
  const cardanoMidnight = isRecord(cardano?.midnight) ? cardano.midnight : null;
  const directMidnight = (window as Window & { midnight?: MidnightWalletApi }).midnight;

  return pickApi(
    (window as Window & { oneam?: unknown }).oneam,
    findMidnightWallet((key, candidate) => {
      const name = String(candidate.name ?? '');
      const rdns = String(candidate.rdns ?? '');
      return /(^|[^a-z0-9])1am([^a-z0-9]|$)|oneam/i.test(`${key} ${name} ${rdns}`);
    }),
    directMidnight,
    isRecord(directMidnight) ? directMidnight.wallet : null,
    isRecord(directMidnight) ? directMidnight.connector : null,
    cardanoMidnight ? { wallet: cardanoMidnight.wallet, connector: cardanoMidnight.connector } : null,
  );
};

export const midnightWalletAdapters: MidnightWalletAdapter[] = [
  {
    id: 'lace',
    name: 'Lace Midnight',
    installUrl: 'https://docs.midnight.network/getting-started/installation',
    detect: isLaceInstalled,
    connect: () =>
      connectWithApi(
        {
          id: 'lace',
          name: 'Lace Midnight',
          installUrl: 'https://docs.midnight.network/getting-started/installation',
        },
        getLaceSource(),
      ),
    getEventSource: () => getLaceSource(),
  },
  {
    id: '1am',
    name: '1AM Wallet',
    installUrl: 'https://1am.xyz',
    detect: () => getOneAMSource() !== null,
    connect: () =>
      connectWithApi(
        {
          id: '1am',
          name: '1AM Wallet',
          installUrl: 'https://1am.xyz',
        },
        getOneAMSource(),
      ),
    getEventSource: () => getOneAMSource(),
  },
];

export const detectAvailableWallets = (): DetectedWallet[] =>
  midnightWalletAdapters
    .filter((adapter) => adapter.detect())
    .map(({ id, name, installUrl }) => ({ id, name, installUrl }));

export const getWalletAdapter = (id?: WalletAdapterId | null): MidnightWalletAdapter | null => {
  if (!id) return null;
  return midnightWalletAdapters.find((adapter) => adapter.id === id) ?? null;
};

export const getPreferredWalletAdapter = (preferredId?: WalletAdapterId | null): MidnightWalletAdapter | null => {
  const preferred = getWalletAdapter(preferredId);
  if (preferred?.detect()) {
    return preferred;
  }

  return midnightWalletAdapters.find((adapter) => adapter.detect()) ?? null;
};
