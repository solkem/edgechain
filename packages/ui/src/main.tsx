import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
// Import the WalletProvider we created in Chunk 1
import { WalletProvider } from './providers/WalletProvider';

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
 * WalletProvider → Provides wallet state to entire app
 *   ↓
 * App → Your main application
 *
 * Now any component inside App can use:
 *   const { isConnected, address, connectWallet } = useWallet();
 */
ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </StrictMode>
);
