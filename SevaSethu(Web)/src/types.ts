export type ViewType =
  // ── DeadDrop HQ ──────────────────────────────────────────────────────────
  | "dd-overview"
  | "dd-missing-persons"
  | "dd-shelter-occupancy"
  | "dd-supply-ledger"
  | "dd-field-nodes"
  | "dd-crypto-audit"
  // ── SevaSethu PHC Portal ──────────────────────────────────────────────────
  | "dashboard"
  | "patients"
  | "triage"
  | "referrals"
  | "appointments"
  | "admin-appointments"
  | "asha"
  | "inventory"
  | "admin-doctors"
  | "followups"
  | "sos"
  | "reports"
  | "settings"
  | "design-system"
  | "register-admin"
  | "register-doctor";

// ── DeadDrop Realtime Types ─────────────────────────────────────────────────
export interface DeadDropOp {
  opId: string;
  dev: string;
  seq: number;
  kind: 'SET' | 'MINT' | 'MOVE';
  region: string;
  priority: number;
  hlc: number;
  body: string;
  sig: string;
  uploadedByDevice: string;
  timestamp: string;
}

export interface DeadDropNode {
  deviceId: string;
  userName: string;
  role: string;
  region: string;
  onlineStatus: 'ONLINE' | 'OFFLINE';
  lastInternetSync: number;
  totalOpsHeld: number;
  batteryPercent: number;
  lastStateHash: string;
}

export interface UplinkStatus {
  activeGatewayDevice: string;
  gatewayUserName: string;
  lastUplinkTimestamp: number;
  totalOpsPushed: number;
}

