import { Navigate, useLocation } from 'react-router-dom';
import { VIRTUAL_NDANI_ENABLED } from '../agent/api';
import { useAgentSession } from '../agent/agentSessionContext';
import { VirtualNdani } from '../screens/VirtualNdani';
import { PilotLoading } from './PilotLoginRoute';

export function VirtualNdaniRoute() {
  const agent = useAgentSession();
  const location = useLocation();

  if (!VIRTUAL_NDANI_ENABLED) {
    return <Navigate to="/farm-assistant" replace />;
  }
  if (agent.loading) {
    return <PilotLoading label="Opening your Virtual Ndani Kit…" />;
  }
  if (!agent.session) {
    return (
      <Navigate
        to="/pilot-login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  return <VirtualNdani session={agent.session} onLogout={agent.logout} />;
}
