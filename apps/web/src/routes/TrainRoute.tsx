import { Navigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { FLDashboard as FLDashboardComponent } from '../components/FLDashboard';

export function TrainRoute() {
  const { farmer, wallet } = useAppContext();

  if (!farmer || !wallet) {
    return <Navigate to="/" replace />;
  }

  // Use the real FL Dashboard component with working training functionality
  // It gets wallet and contract context from providers automatically
  return <FLDashboardComponent />;
}

