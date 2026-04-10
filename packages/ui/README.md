# EdgeChain UI

The user interface for EdgeChain, a privacy-preserving federated learning platform built on Midnight.

## Overview

This React application provides the farmer-facing interface for:
- Connecting a compatible Midnight wallet
- Registering farmer profiles
- Selecting training models
- Monitoring federated learning progress
- Submitting model updates with zero-knowledge proofs
- Viewing aggregation results and predictions

## Tech Stack

- React 19 with TypeScript
- React Router v7
- Tailwind CSS v4
- Vite v7
- Midnight wallet adapter layer with current Lace Midnight support
- Midnight Network SDK packages

## Prerequisites

### Required software

1. Node.js v22.17.0+ or v20.19+
2. A compatible Midnight wallet

Recommended wallet setup:
- Lace with Midnight/Beta features enabled, then add a Midnight wallet
- Or use another compatible wallet such as 1AM Wallet

Installation references:
- [Midnight installation guide](https://docs.midnight.network/getting-started/installation)
- [Midnight documentation](https://docs.midnight.network/)

## Getting Started

### Installation

```bash
yarn install
```

### Development

```bash
yarn dev
```

### Build

```bash
yarn build
```

## Wallet Integration

The UI now uses a pluggable wallet adapter interface instead of hard-coding the old Lace Midnight Preview flow.

Current adapter behavior:
- Prefers Lace Midnight when available
- Supports a clean integration point for 1AM Wallet
- Stores the connected address, network, and wallet id in local storage for reconnects
- Avoids assuming a single global injection path

Typical usage from components:

```ts
import { useWallet } from './providers/WalletProvider';

function MyComponent() {
  const {
    isConnected,
    address,
    isWalletInstalled,
    connectedWallet,
    connectWallet,
  } = useWallet();

  if (!isWalletInstalled) {
    return <p>Install a compatible Midnight wallet first.</p>;
  }

  return (
    <button onClick={() => void connectWallet()}>
      {isConnected ? `Connected: ${address}` : `Connect ${connectedWallet?.name ?? 'Wallet'}`}
    </button>
  );
}
```

## Important Notes

- Prefer the adapter layer over direct `window` access in app code
- Network may be preview, preprod, mainnet, or unknown depending on the wallet
- Midnight addresses and assets differ from Cardano ADA flows
- The adapter layer is the right place to add future wallet support

## Troubleshooting

### "No compatible Midnight wallet was detected"

Try this:
- Install Lace and enable Midnight/Beta support
- Or install 1AM Wallet
- Refresh the page after wallet installation

### "Failed to connect wallet"

Possible causes:
1. The wallet is locked
2. The connection request was rejected
3. No Midnight account is available in the selected wallet

### Build verification

This package uses Yarn via Corepack. If local verification fails with a missing install-state file, run the workspace install first so Yarn can rebuild its state.

## Contributing

When modifying wallet integration:

1. Do not hard-code a single wallet
2. Use the wallet adapter layer for detection and connection
3. Test with real Midnight wallets when possible
4. Keep this README aligned with the current integration approach

## Resources

- [Midnight documentation](https://docs.midnight.network/)
- [Midnight installation guide](https://docs.midnight.network/getting-started/installation)
- [React documentation](https://react.dev/)
- [Vite documentation](https://vite.dev/)

## Support

For issues specific to:
- EdgeChain UI: open an issue in this repo
- Lace Midnight mode: check Midnight support channels
- 1AM Wallet: check the 1AM project docs/support
- Midnight network: check the Midnight forum or Discord
