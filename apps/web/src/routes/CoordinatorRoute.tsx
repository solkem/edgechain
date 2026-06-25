import { Navigate, useLocation } from 'react-router-dom';
import { useAgentSession } from '../agent/agentSessionContext';
import { CoordinatorDashboard } from '../screens/CoordinatorDashboard';
import { PilotLoading } from './PilotLoginRoute';
import { VIRTUAL_NDANI_COORDINATOR_ENABLED } from '../agent/api';

export function CoordinatorRoute() {
  const agent = useAgentSession();
  const location = useLocation();

  if (!VIRTUAL_NDANI_COORDINATOR_ENABLED) {
    return <Navigate to="/pilot-login" replace />;
  }
  if (agent.loading) return <PilotLoading label="Loading the coordinator dashboard…" />;
  if (!agent.session) {
    return <Navigate to="/pilot-login" state={{ from: location.pathname }} replace />;
  }
  if (agent.session.farmer.system_role !== 'coordinator') {
    return <Navigate to="/virtual-ndani" replace />;
  }
  return <CoordinatorDashboard session={agent.session} onLogout={agent.logout} />;
}
