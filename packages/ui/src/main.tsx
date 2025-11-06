import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
// Import providers
import { WalletProvider } from './providers/WalletProvider';
// ContractProvider import disabled - causes Vite WASM bundling error
// import { ContractProvider } from './providers/ContractProvider';

// Get the root element
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element. Make sure your index.html has a <div id="root"></div>');
}

/**
 * App Structure:
 *
 * StrictMode → Helps catch bugs during development
 *   ↓
 * WalletProvider → Provides Midnight wallet connection
 *   ↓
 * ContractProvider → Provides EdgeChain smart contract access
 *   ↓
 * App → Your main application
 *
 * Now any component inside App can use:
 *   const { isConnected, address, connectWallet } = useWallet();
 *   const { submitModel, completeAggregation, ledger } = useContract();
 */
ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <WalletProvider>
      {/* ContractProvider disabled - causes Vite WASM bundling error */}
      {/* <ContractProvider> */}
        <App />
      {/* </ContractProvider> */}
    </WalletProvider>
  </StrictMode>
);
