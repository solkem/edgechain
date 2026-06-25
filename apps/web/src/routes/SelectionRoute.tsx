import { Navigate, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useWallet } from '../providers/WalletProvider';
import { Selection } from '../screens/Selection';
import { PILOT_AGENT_ENABLED } from '../agent/api';

export function SelectionRoute() {
  const { farmer, disconnect } = useAppContext();
  const { disconnectWallet } = useWallet();
  const navigate = useNavigate();

  if (!farmer) {
    return <Navigate to="/" replace />;
  }

  return (
    <Selection
      farmer={farmer}
      onFL={() => navigate('/train')}
      onAI={() => navigate(PILOT_AGENT_ENABLED ? '/farm-assistant' : '/predictions')}
      onDisconnect={() => {
        disconnect();
        disconnectWallet();
        navigate('/');
      }}
    />
  );
}
