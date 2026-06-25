import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  loadPilotSession,
  loginPilotFarmer,
  logoutPilotFarmer,
  PILOT_AGENT_ENABLED,
} from './api';
import type { PilotSession } from './types';
import {
  AgentSessionContext,
  type AgentSessionContextValue,
} from './agentSessionContext';

export function AgentSessionProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(PILOT_AGENT_ENABLED);
  const [session, setSession] = useState<PilotSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!PILOT_AGENT_ENABLED) {
      setLoading(false);
      setSession(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setSession(await loadPilotSession());
    } catch (refreshError) {
      setSession(null);
      setError(toMessage(refreshError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (pilotCode: string, pin: string) => {
    setError(null);
    await loginPilotFarmer(pilotCode, pin);
    const loaded = await loadPilotSession();
    setSession(loaded);
    return loaded;
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await logoutPilotFarmer();
    } finally {
      setSession(null);
    }
  }, []);

  const value = useMemo<AgentSessionContextValue>(() => ({
    enabled: PILOT_AGENT_ENABLED,
    loading,
    session,
    error,
    login,
    logout,
    refresh,
  }), [loading, session, error, login, logout, refresh]);

  return (
    <AgentSessionContext.Provider value={value}>
      {children}
    </AgentSessionContext.Provider>
  );
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to load the pilot session';
}
