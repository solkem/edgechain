# EdgeChain UI

The user interface for EdgeChain - a privacy-preserving federated learning platform for farmers on the Midnight Network.

## Overview

This React application provides the farmer-facing interface for:
- Connecting Lace Midnight Preview wallet
- Registering farmer profiles
- Selecting training models
- Monitoring federated learning progress
- Submitting model updates with zero-knowledge proofs
- Viewing aggregation results and predictions

## Tech Stack

- **React 19** with TypeScript
- **React Router v7** for client-side routing
- **Tailwind CSS v4** for styling
- **Vite v7** as build tool
- **Lace Midnight Preview** for wallet integration
- **Midnight Network SDK** for privacy features

## Prerequisites

### Required Software

1. **Node.js v22.17.0+** (or v20.19+)
   ```bash
   # Check your version
   node --version

   # If you need to upgrade, use nvm:
   nvm install 22.17.0
   nvm use 22.17.0
   ```

2. **Lace Midnight Preview Extension**

   **IMPORTANT:** This application requires **Lace Midnight Preview**, NOT the regular Lace wallet!

   - **What is it?** Specialized browser extension for Midnight devnet development
   - **Purpose:** Enables privacy-preserving DApps with zero-knowledge proofs
   - **Network:** Midnight devnet only (not Cardano mainnet/testnet)
   - **Tokens:** Uses tDUST (test DUST tokens), not ADA

   **Installation:**
   - Visit [Midnight Network Documentation](https://docs.midnight.network/)
   - Download and install Lace Midnight Preview for your browser
   - Create/restore a wallet
   - Request tDUST tokens from the devnet faucet

   **Key Differences from Regular Lace:**
   ```
   Regular Lace Wallet         →   Lace Midnight Preview
   ───────────────────────────────────────────────────────
   window.cardano.lace         →   window.cardano.midnight
   Cardano mainnet/testnet     →   Midnight devnet
   ADA tokens                  →   tDUST tokens
   Standard transactions       →   Privacy-preserving ZK transactions
   ```

## Getting Started

### Installation

```bash
# From the root of the monorepo
yarn install

# Or from packages/ui directory
cd packages/ui
yarn install
```

### Development

```bash
# Start the dev server (from monorepo root)
yarn dev

# Or from packages/ui directory
cd packages/ui
yarn dev
```

The app will be available at: **http://localhost:8080**

Features:
- ✅ Hot module reloading (HMR)
- ✅ TypeScript type checking
- ✅ Tailwind CSS with custom theme
- ✅ Source maps for debugging

### Build for Production

```bash
# From packages/ui
yarn build

# Output will be in packages/ui/dist/
```

## Project Structure

```
packages/ui/
├── src/
│   ├── App.tsx                    # Main app component with routing
│   ├── main.tsx                   # App entry point
│   ├── index.css                  # Global styles and Tailwind
│   ├── providers/
│   │   └── WalletProvider.tsx     # Midnight Preview wallet integration
│   └── types/
│       └── lace.d.ts              # TypeScript definitions for Midnight API
├── index.html                     # HTML template
├── vite.config.ts                 # Vite configuration
├── tailwind.config.js             # Tailwind theme customization
└── tsconfig.json                  # TypeScript configuration
```

## Wallet Integration

### How It Works

The wallet integration connects to **Lace Midnight Preview** to:

1. **Detect Installation**
   ```typescript
   const hasMidnightPreview = window.cardano?.midnight !== undefined;
   ```

2. **Request Connection**
   ```typescript
   const midnight = window.cardano.midnight;
   const isEnabled = await midnight.enable();
   ```

3. **Get Midnight Address**
   ```typescript
   const addresses = await midnight.getUsedAddresses();
   const address = addresses[0]; // Midnight-format address
   ```

4. **Network Detection**
   ```typescript
   // Midnight Preview always returns devnet
   const network = 'devnet';
   ```

### Using the Wallet in Components

```typescript
import { useWallet } from './providers/WalletProvider';

function MyComponent() {
  const {
    isConnected,
    address,
    isMidnightPreviewInstalled,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
  } = useWallet();

  if (!isMidnightPreviewInstalled) {
    return <InstallMidnightPreview />;
  }

  return (
    <button onClick={connectWallet} disabled={isConnecting}>
      {isConnected ? `Connected: ${address}` : 'Connect Midnight Preview'}
    </button>
  );
}
```

### Important Notes

- **Always use `window.cardano.midnight`**, NOT `window.cardano.lace`
- **Network is always `'devnet'`**, there's no mainnet/testnet
- **Addresses use Midnight format**, may differ from Cardano bech32
- **Balances are in tDUST**, the smallest unit of test DUST tokens
- **LocalStorage keys** use `midnightAddress` and `midnightNetwork`

## Features & Screens

### 1. Login (`/`)
- Connect Lace Midnight Preview wallet
- Installation detection and guidance
- Error handling with user-friendly messages

### 2. Registration (`/register`)
- Create farmer profile
- Input farm name, region, and crops
- Links profile to Midnight wallet address

### 3. Model Selection (`/selection`)
- Choose AI models to train
- View model descriptions and requirements
- Navigate to training interface

### 4. Training (`/train`)
- Submit model updates with ZK-proofs
- Real-time training status
- View submission history

### 5. Aggregation (`/aggregation`)
- Monitor global model aggregation
- View aggregation progress and status
- See when new model versions are ready

### 6. Predictions (`/predictions`)
- Test AI predictions
- Chat-based interface for queries
- View prediction results and confidence

## Troubleshooting

### "Midnight Preview is not installed"

**Solution:** Install Lace Midnight Preview extension (NOT regular Lace)
- Visit Midnight Network documentation
- Download the specialized devnet extension
- Regular Lace wallet will NOT work for this app

### "Failed to connect wallet"

**Possible causes:**
1. User denied permission in popup
2. Midnight Preview extension is locked
3. No accounts in Midnight Preview

**Solution:**
- Unlock Midnight Preview
- Approve connection request
- Ensure you have at least one account

### "Node.js version error"

```
You are using Node.js 18.x. Vite requires Node.js version 20.19+ or 22.12+
```

**Solution:**
```bash
# Switch to Node 22
nvm use 22.17.0

# Or install it first
nvm install 22.17.0
nvm use 22.17.0
```

### Port 8080 already in use

**Solution:**
```bash
# Kill the process using port 8080
lsof -ti:8080 | xargs kill -9

# Or change the port in vite.config.ts
```

### TypeScript errors after pulling updates

**Solution:**
```bash
# Clear Vite cache and rebuild
rm -rf packages/ui/.vite
rm -rf packages/ui/node_modules/.vite
yarn dev
```

## Environment Variables

Currently, the app doesn't require environment variables. Configuration is handled through:
- Midnight Preview extension (injected at runtime)
- LocalStorage (for session persistence)
- In-code constants (for network settings)

Future versions may add:
- `VITE_MIDNIGHT_NETWORK_ID` - Override network ID
- `VITE_API_ENDPOINT` - Backend API URL
- `VITE_INDEXER_URL` - Midnight indexer endpoint

## Contributing

When modifying the wallet integration:

1. **Never remove Midnight Preview checks**
   - Always detect `window.cardano.midnight`
   - Never assume regular Lace API compatibility

2. **Keep extensive comments**
   - This is a learning resource
   - Explain WHY, not just WHAT

3. **Test with actual Midnight Preview**
   - Don't just check TypeScript compilation
   - Verify with the real extension

4. **Update documentation**
   - Keep this README in sync with code
   - Document breaking changes
   - Add troubleshooting for new errors

## Resources

- [Midnight Network Documentation](https://docs.midnight.network/)
- [Lace Midnight Preview Guide](https://docs.midnight.network/develop/wallet-integration)
- [Midnight SDK Reference](https://docs.midnight.network/develop/midnight-js)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vite.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

## License

See root [LICENSE](../../LICENSE) file.

## Support

For issues specific to:
- **EdgeChain UI:** Open issue in this repo
- **Lace Midnight Preview:** Visit Midnight Network support
- **Midnight devnet:** Check Midnight Network Discord/forum
