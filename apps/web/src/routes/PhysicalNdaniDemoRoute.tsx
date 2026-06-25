import { Navigate, useLocation } from 'react-router-dom';
import {
  VIRTUAL_NDANI_PIPELINE_DEMO_ENABLED,
} from '../agent/api';
import { useAgentSession } from '../agent/agentSessionContext';
import { PhysicalNdaniDemo } from '../screens/PhysicalNdaniDemo';
import { PilotLoading } from './PilotLoginRoute';

export function PhysicalNdaniDemoRoute() {
  const agent = useAgentSession();
  const location = useLocation();

  if (!VIRTUAL_NDANI_PIPELINE_DEMO_ENABLED) {
    return <Navigate to="/virtual-ndani" replace />;
  }
  if (agent.loading) {
    return <PilotLoading label="Preparing the Physical Ndani Kit demonstration…" />;
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
  return <PhysicalNdaniDemo session={agent.session} />;
}
