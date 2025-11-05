// Type stubs for @edgechain/contract
// This allows the UI to build without the contract package dependency

declare module '@edgechain/contract/dist/managed/edgechain/contract/index.cjs' {
  export interface Contract {
    // Contract interface stub - add actual types as needed
    [key: string]: any;
  }

  export interface Ledger {
    // Ledger interface stub - add actual types as needed
    [key: string]: any;
  }
}

declare module '@edgechain/api' {
  // API module stub - add actual exports as needed
  export const api: any;
}
