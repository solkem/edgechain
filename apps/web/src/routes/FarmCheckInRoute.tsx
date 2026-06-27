import { Navigate, useLocation } from 'react-router-dom';
import { useAgentSession } from '../agent/agentSessionContext';
import { VIRTUAL_NDANI_ENABLED } from '../agent/api';
import { FarmCheckIn } from '../screens/FarmCheckIn';
import { PilotLoading } from './PilotLoginRoute';

export function FarmCheckInRoute() {
  const agent = useAgentSession();
  const location = useLocation();

  if (!VIRTUAL_NDANI_ENABLED) {
    return <Navigate to="/farm-assistant" replace />;
  }
  if (agent.loading) {
    return <PilotLoading label="Opening your weekly farm check-in…" />;
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
  if (agent.session.farmer.system_role === 'coordinator') {
    return <Navigate to="/coordinator" replace />;
  }

  return <FarmCheckIn session={agent.session} onLogout={agent.logout} />;
}
