import { createContext, useContext } from 'react';
import type { PilotSession } from './types';

export interface AgentSessionContextValue {
  enabled: boolean;
  loading: boolean;
  session: PilotSession | null;
  error: string | null;
  login: (pilotCode: string, pin: string) => Promise<PilotSession | null>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const AgentSessionContext = createContext<AgentSessionContextValue | null>(null);

export function useAgentSession(): AgentSessionContextValue {
  const context = useContext(AgentSessionContext);
  if (!context) {
    throw new Error('useAgentSession must be used within AgentSessionProvider');
  }
  return context;
}
