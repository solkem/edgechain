import { Navigate, useLocation } from 'react-router-dom';
import { useAgentSession } from '../agent/agentSessionContext';
import { VIRTUAL_NDANI_ENABLED } from '../agent/api';
import { FarmTimelineReport } from '../screens/FarmTimelineReport';
import { PilotLoading } from './PilotLoginRoute';

export function FarmTimelineRoute() {
  const agent = useAgentSession();
  const location = useLocation();

  if (!VIRTUAL_NDANI_ENABLED) {
    return <Navigate to="/farm-assistant" replace />;
  }
  if (agent.loading) {
    return <PilotLoading label="Opening your farm timeline…" />;
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

  return <FarmTimelineReport session={agent.session} onLogout={agent.logout} />;
}
