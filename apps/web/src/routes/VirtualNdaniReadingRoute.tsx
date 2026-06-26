import { Navigate, useLocation } from 'react-router-dom';
import { VIRTUAL_NDANI_ENABLED } from '../agent/api';
import { useAgentSession } from '../agent/agentSessionContext';
import { VirtualNdaniReadingScreen } from '../screens/VirtualNdaniReading';
import { PilotLoading } from './PilotLoginRoute';

export function VirtualNdaniReadingRoute() {
  const agent = useAgentSession();
  const location = useLocation();

  if (!VIRTUAL_NDANI_ENABLED) return <Navigate to="/farm-assistant" replace />;
  if (agent.loading) return <PilotLoading label="Preparing today’s reading…" />;
  if (!agent.session) {
    return <Navigate to="/pilot-login" state={{ from: location.pathname }} replace />;
  }
  if (agent.session.farmer.system_role === 'coordinator') {
    return <Navigate to="/coordinator" replace />;
  }
  return <VirtualNdaniReadingScreen />;
}
