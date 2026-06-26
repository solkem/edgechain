import { Navigate, useLocation } from 'react-router-dom';
import { useAgentSession } from '../agent/agentSessionContext';
import { FarmAssistant } from '../screens/FarmAssistant';
import { PilotLoading } from './PilotLoginRoute';

export function FarmAssistantRoute() {
  const agent = useAgentSession();
  const location = useLocation();

  if (!agent.enabled) {
    return <Navigate to="/predictions" replace />;
  }
  if (agent.loading) {
    return <PilotLoading label="Loading your farm assistant…" />;
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

  return (
    <FarmAssistant
      session={agent.session}
      onLogout={agent.logout}
    />
  );
}
