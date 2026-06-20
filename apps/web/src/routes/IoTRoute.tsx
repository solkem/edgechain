import { Navigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { IoTDashboard } from '../components/IoTDashboard';

export function IoTRoute() {
  const { farmer } = useAppContext();

  if (!farmer) {
    return <Navigate to="/" replace />;
  }

  return <IoTDashboard />;
}

