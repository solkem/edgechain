import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAgentSession } from '../agent/agentSessionContext';
import { PilotLogin } from '../screens/PilotLogin';
import {
  VIRTUAL_NDANI_COORDINATOR_ENABLED,
  VIRTUAL_NDANI_ENABLED,
} from '../agent/api';

export function PilotLoginRoute() {
  const agent = useAgentSession();
  const navigate = useNavigate();
  const location = useLocation();

  if (!agent.enabled) {
    return <Navigate to="/" replace />;
  }
  if (agent.loading) {
    return <PilotLoading label="Checking your EdgeChain access…" />;
  }
  if (agent.session) {
    const destination = typeof location.state?.from === 'string'
      ? location.state.from
      : agent.session.farmer.system_role === 'coordinator'
        && VIRTUAL_NDANI_COORDINATOR_ENABLED
        ? '/coordinator'
        : VIRTUAL_NDANI_ENABLED ? '/virtual-ndani' : '/farm-assistant';
    return <Navigate to={destination} replace />;
  }

  return (
    <PilotLogin
      onSubmit={async (pilotCode, pin) => {
        const session = await agent.login(pilotCode, pin);
        navigate(
          session?.farmer.system_role === 'coordinator'
            && VIRTUAL_NDANI_COORDINATOR_ENABLED
            ? '/coordinator'
            : VIRTUAL_NDANI_ENABLED ? '/virtual-ndani' : '/farm-assistant',
          { replace: true }
        );
      }}
      onWalletAccess={() => navigate('/')}
    />
  );
}

export function PilotLoading({ label }: { label: string }) {
  return (
    <main className="min-h-screen bg-[#f7f7f2] flex items-center justify-center p-6">
      <div className="max-w-md w-full border-2 border-black bg-white p-8 text-center shadow-[8px_8px_0_#000]">
        <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-700" />
        <p className="text-lg font-semibold text-black">{label}</p>
      </div>
    </main>
  );
}
