export type EdgeChainSiteMode = 'farmer' | 'wallet';

const configuredFarmerHosts = hostList(import.meta.env.VITE_FARMER_SITE_HOSTS);
const configuredWalletHosts = hostList(import.meta.env.VITE_WALLET_SITE_HOSTS);

export function siteMode(hostname = window.location.hostname): EdgeChainSiteMode {
  const normalized = hostname.toLowerCase();
  if (matchesHost(normalized, configuredFarmerHosts)) return 'farmer';
  if (matchesHost(normalized, configuredWalletHosts)) return 'wallet';
  if (
    normalized.startsWith('farmer.')
    || normalized.startsWith('farmers.')
    || normalized.startsWith('odzi.')
    || normalized.startsWith('pilot.')
  ) {
    return 'farmer';
  }
  return 'wallet';
}

export function isFarmerSite(hostname?: string): boolean {
  return siteMode(hostname) === 'farmer';
}

function hostList(value: unknown): string[] {
  return String(value || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

function matchesHost(hostname: string, hosts: string[]): boolean {
  return hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}
