import { Navigate, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useWallet } from '../providers/WalletProvider';
import { AIDashboard } from '../screens/AIDashboard';

export function PredictionsRoute() {
  const { farmer, disconnect } = useAppContext();
  const { disconnectWallet } = useWallet();
  const navigate = useNavigate();

  if (!farmer) {
    return <Navigate to="/" replace />;
  }

  return (
    <AIDashboard
      farmer={farmer}
      onFL={() => navigate('/train')}
      onDisconnect={() => {
        disconnect();
        disconnectWallet();
        navigate('/');
      }}
    />
  );
}

