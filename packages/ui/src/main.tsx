import './globals';
import ReactDOM from 'react-dom/client';
import App from './App';
import { WalletProvider } from './providers/WalletProvider';
import { ContractProvider } from './providers/ContractProvider';
import './index.css'

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
