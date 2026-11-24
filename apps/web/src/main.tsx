import './globals';
import ReactDOM from 'react-dom/client';
import App from './App';
import { WalletProvider } from './providers/WalletProvider';
import { ContractProvider } from './providers/ContractProvider';
import './index.css'

if (import.meta.env.PROD && import.meta.env.VITE_AGENT_ENABLED === 'true'
  && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/ndani-worker.js').catch(() => {});
  }, { once: true });
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element. Make sure your index.html has a <div id="root"></div>');
}

ReactDOM.createRoot(rootElement).render(
  
    <WalletProvider>
      <ContractProvider>
        <App />
      </ContractProvider>
    </WalletProvider>
);
