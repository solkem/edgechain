import { Navigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ArduinoDashboard } from '../components/ArduinoDashboard';

export function ArduinoRoute() {
  const { farmer } = useAppContext();

  if (!farmer) {
    return <Navigate to="/" replace />;
  }

  return <ArduinoDashboard />;
}

