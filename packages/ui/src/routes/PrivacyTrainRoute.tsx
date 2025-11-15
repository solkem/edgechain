import { Navigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { PrivacyFLDashboard } from '../components/PrivacyFLDashboard';

export function PrivacyTrainRoute() {
  const { farmer, wallet } = useAppContext();

  if (!farmer || !wallet) {
    return <Navigate to="/" replace />;
  }

  // Use the NEW privacy-preserving FL Dashboard
  return <PrivacyFLDashboard />;
}

