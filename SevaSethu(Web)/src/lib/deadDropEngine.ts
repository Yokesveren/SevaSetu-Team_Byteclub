// DeadDrop Client-Side State Engine
// Pure functions for conflict detection, equivocation, ledger integrity, etc.

import type { DDOp, DDEntity, DDLedger } from "./deadDropFirebase";

// ─── Conflict Detection ───────────────────────────────────────────────────────

export interface ConflictResult {
  entityId: string;
  field: string;
  winnerOp: DDOp;
  loserOps: DDOp[];
}

/**
 * Find SET ops targeting the same entity field.
 * The op with the highest HLC wins; all others are "conflicts".
 */
export function detectConflicts(ops: DDOp[]): ConflictResult[] {
  const setOps = ops.filter((o) => o.kind === "SET");
  // Group by entityId:field
  const groups: Record<string, DDOp[]> = {};
  for (const op of setOps) {
    const parts = op.body.split("|");
    const entityId = parts[0];
    for (let i = 1; i < parts.length; i++) {
      const kv = parts[i].split("=");
      if (kv.length < 2) continue;
      const field = kv[0];
      const key = `${entityId}::${field}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(op);
    }
  }

  const results: ConflictResult[] = [];
  for (const [key, group] of Object.entries(groups)) {
    if (group.length <= 1) continue;
    const sorted = [...group].sort((a, b) => b.hlc - a.hlc);
    const [entityId, field] = key.split("::");
    results.push({
      entityId,
      field,
      winnerOp: sorted[0],
      loserOps: sorted.slice(1),
    });
  }
  return results;
}

// ─── Equivocation Detection ───────────────────────────────────────────────────

export interface EquivocationAlert {
  dev: string;
  seq: number;
  ops: DDOp[];
}

/**
 * Same dev:seq pair with different bodies → equivocation (Byzantine fault).
 */
export function detectEquivocation(ops: DDOp[]): EquivocationAlert[] {
  const groups: Record<string, DDOp[]> = {};
  for (const op of ops) {
    const key = `${op.dev}:${op.seq}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(op);
  }

  const alerts: EquivocationAlert[] = [];
  for (const [key, group] of Object.entries(groups)) {
    if (group.length <= 1) continue;
    const bodies = new Set(group.map((o) => o.body));
    if (bodies.size > 1) {
      const [dev, seqStr] = key.split(":");
      alerts.push({ dev, seq: Number(seqStr), ops: group });
    }
  }
  return alerts;
}

// ─── Ledger Integrity Check ───────────────────────────────────────────────────

export interface LedgerAlert {
  account: string;
  item: string;
  totalIn: number;
  totalOut: number;
  deficit: number;
}

/**
 * Alert if totalOut > totalIn for any account/item combination.
 */
export function checkLedgerIntegrity(
  _ops: DDOp[],
  ledger: DDLedger[]
): LedgerAlert[] {
  // Simple check: flag any balance that is negative
  const alerts: LedgerAlert[] = [];
  for (const entry of ledger) {
    for (const [item, balance] of Object.entries(entry.balances)) {
      if (balance < 0) {
        alerts.push({
          account: entry.account,
          item,
          totalIn: 0,
          totalOut: Math.abs(balance),
          deficit: Math.abs(balance),
        });
      }
    }
  }
  return alerts;
}

// ─── State Hash ───────────────────────────────────────────────────────────────

/**
 * Compute a simple deterministic "state hash" from sorted op IDs.
 * Used to show consensus state across devices.
 */
export function computeStateHash(ops: DDOp[]): string {
  const sorted = [...ops].sort((a, b) => a.opId.localeCompare(b.opId));
  const joined = sorted.map((o) => o.opId).join("|");
  // djb2 hash
  let h = 5381;
  for (let i = 0; i < joined.length; i++) {
    h = ((h << 5) + h) ^ joined.charCodeAt(i);
    h = h >>> 0;
  }
  return h.toString(16).padStart(8, "0") + "a3f7";
}

// ─── Metric Computations ──────────────────────────────────────────────────────

export function computeFoundPercent(entities: DDEntity[]): number {
  const persons = entities.filter((e) => e.type === "person");
  if (persons.length === 0) return 0;
  const found = persons.filter(
    (e) => e.fields.status === "Found" || e.fields.status === "Safe"
  ).length;
  return Math.round((found / persons.length) * 100);
}

export function computeShelterOccupancy(entities: DDEntity[]): number {
  const shelters = entities.filter((e) => e.type === "shelter");
  if (shelters.length === 0) return 0;
  let totalCap = 0;
  let totalOcc = 0;
  for (const s of shelters) {
    totalCap += (s.fields.capacity as number) || 0;
    totalOcc += (s.fields.occupancy as number) || 0;
  }
  if (totalCap === 0) return 0;
  return Math.round((totalOcc / totalCap) * 100);
}

export function formatHLC(hlc: number): string {
  return new Date(hlc).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  return `${Math.round(diff / 3_600_000)}h ago`;
}
