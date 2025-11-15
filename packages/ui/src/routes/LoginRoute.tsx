import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useWallet } from '../providers/WalletProvider';
import { useContract } from '../providers/ContractProvider';
import { Login } from '../screens/Login';

export function LoginRoute() {
  const { setWallet, setFarmer } = useAppContext();
  const navigate = useNavigate();
  const [isDeploying, setIsDeploying] = useState(false);

  /**
   * Use the real Midnight wallet from WalletProvider instead of mock
   * This gives us:
   * - Real Lace Midnight Preview wallet connection
   * - Wallet installation detection
   * - Actual Midnight wallet address from extension
   * - Connection to Midnight devnet with tDUST tokens
   */
  const walletContext = useWallet();
  const {
    isConnected,
    address,
    isMidnightPreviewInstalled,
    isConnecting,
    error,
    connectWallet,
  } = walletContext;

  /**
   * Get contract context for deployment functionality
   */
  const contractContext = useContract();

  /**
   * When wallet connects successfully, update AppContext
   * and navigate to registration or selection
   * BUT ONLY if contract is already deployed (not during deployment)
   */
  useEffect(() => {
    if (isConnected && address && contractContext.isDeployed && !isDeploying) {
      // Update the app's wallet state
      setWallet({ address });

      // Check if farmer profile exists
      const saved = localStorage.getItem(`farmer_${address}`);
      if (saved) {
        const parsedFarmer = JSON.parse(saved);
        parsedFarmer.joinedAt = new Date(parsedFarmer.joinedAt);
        setFarmer(parsedFarmer);
        navigate('/selection');
      } else {
        navigate('/register');
      }
    }
  }, [isConnected, address, contractContext.isDeployed, isDeploying, setWallet, setFarmer, navigate]);

  /**
   * Pass Midnight wallet state, contract context, and real connect function to Login component
   */
  return (
    <Login
      onConnect={connectWallet}
      isConnecting={isConnecting}
      isMidnightPreviewInstalled={isMidnightPreviewInstalled}
      error={error}
      contractContext={contractContext}
      walletContext={walletContext}
      isDeploying={isDeploying}
      setIsDeploying={setIsDeploying}
    />
  );
}

