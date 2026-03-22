import type { MidnightProviders } from "@midnight-ntwrk/midnight-js-types";
import { QuickStarterPrivateStateId as canonicalPrivateStateId } from "@edgechain/api";

// Keep this local compatibility export aligned to the canonical package constant.
export const QuickStarterPrivateStateId = canonicalPrivateStateId;
export type QuickStarterPrivateStateId = typeof QuickStarterPrivateStateId;
export type QuickStarterContractProviders = MidnightProviders<QuickStarterPrivateStateId>;
  
