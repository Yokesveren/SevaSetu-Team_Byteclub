// DeadDrop Firebase Service
// Subscribes to and seeds the 4 DeadDrop Firestore collections.

import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "../services/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OpKind = "SET" | "MINT" | "MOVE";
export type OnlineStatus = "ONLINE" | "MESH_ONLY" | "OFFLINE";

export interface DDOp {
  opId: string;
  dev: string;
  seq: number;
  kind: OpKind;
  region: string;
  priority?: string;
  hlc: number;           // Hybrid Logical Clock (ms)
  body: string;
  sig?: string;
  uploadedByDevice?: string;
  timestamp?: number;
}

export interface DDNode {
  deviceId: string;
  userName: string;
  role: string;
  region: string;
  onlineStatus: OnlineStatus;
  lastInternetSync?: number;
  totalOpsHeld: number;
  batteryPercent: number;
  lastStateHash?: string;
}

export interface DDEntityFields {
  displayName?: string;
  status?: string;
  condition?: string;
  whereNow?: string;
  capacity?: number;
  occupancy?: number;
  [key: string]: string | number | undefined;
}

export interface DDEntity {
  entityId: string;
  type: "person" | "shelter" | string;
  fields: DDEntityFields;
  conflicts?: string[];
}

export interface DDLedgerBalances {
  water: number;
  blanket: number;
  boat: number;
  medkit: number;
  food: number;
  [key: string]: number;
}

export interface DDLedger {
  account: string;
  balances: DDLedgerBalances;
}

// ─── Subscription Helpers ────────────────────────────────────────────────────

export function subscribeOps(
  onUpdate: (ops: DDOp[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  if (!db) return () => {};
  return onSnapshot(
    collection(db, "deaddrop_ops"),
    (snap) => {
      const list: DDOp[] = [];
      snap.forEach((d) => list.push(d.data() as DDOp));
      list.sort((a, b) => b.hlc - a.hlc);
      onUpdate(list);
    },
    (err) => { console.warn("subscribeOps error:", err); onError?.(err); }
  );
}

export function subscribeNodes(
  onUpdate: (nodes: DDNode[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  if (!db) return () => {};
  return onSnapshot(
    collection(db, "deaddrop_nodes"),
    (snap) => {
      const list: DDNode[] = [];
      snap.forEach((d) => list.push(d.data() as DDNode));
      onUpdate(list);
    },
    (err) => { console.warn("subscribeNodes error:", err); onError?.(err); }
  );
}

export function subscribeEntities(
  onUpdate: (entities: DDEntity[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  if (!db) return () => {};
  return onSnapshot(
    collection(db, "deaddrop_entities"),
    (snap) => {
      const list: DDEntity[] = [];
      snap.forEach((d) => list.push(d.data() as DDEntity));
      onUpdate(list);
    },
    (err) => { console.warn("subscribeEntities error:", err); onError?.(err); }
  );
}

export function subscribeLedger(
  onUpdate: (ledger: DDLedger[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  if (!db) return () => {};
  return onSnapshot(
    collection(db, "deaddrop_ledger"),
    (snap) => {
      const list: DDLedger[] = [];
      snap.forEach((d) => list.push(d.data() as DDLedger));
      onUpdate(list);
    },
    (err) => { console.warn("subscribeLedger error:", err); onError?.(err); }
  );
}

// ─── Demo Data Seed ───────────────────────────────────────────────────────────

export async function seedDemoData(): Promise<void> {
  if (!db) return;

  // ── Nodes ──────────────────────────────────────────────────────────────────
  const nodes: DDNode[] = [
    {
      deviceId: "A1",
      userName: "Arjun",
      role: "Field Rescuer · North Street",
      region: "A",
      onlineStatus: "ONLINE",
      lastInternetSync: Date.now() - 120_000,
      totalOpsHeld: 42,
      batteryPercent: 84,
      lastStateHash: "a3f7c2d1e8b946",
    },
    {
      deviceId: "B1",
      userName: "Bhavna",
      role: "Field Rescuer · East Zone",
      region: "A",
      onlineStatus: "MESH_ONLY",
      lastInternetSync: Date.now() - 900_000,
      totalOpsHeld: 31,
      batteryPercent: 61,
      lastStateHash: "9e2b4d6f1c08a3",
    },
    {
      deviceId: "C1",
      userName: "Charan",
      role: "Lead Coordinator",
      region: "A",
      onlineStatus: "MESH_ONLY",
      lastInternetSync: Date.now() - 1_800_000,
      totalOpsHeld: 18,
      batteryPercent: 45,
      lastStateHash: "b1a5d3e7f2c904",
    },
  ];

  for (const node of nodes) {
    await setDoc(doc(db, "deaddrop_nodes", node.deviceId), node);
  }

  // ── Ops ────────────────────────────────────────────────────────────────────
  const ops: DDOp[] = [
    {
      opId: "A1:1",
      dev: "A1",
      seq: 1,
      kind: "MINT",
      region: "A",
      hlc: 1731536100000,
      body: "water=50,blanket=20,boat=2,medkit=15,food=100",
      sig: "ed25519:a1b2c3d4...",
      uploadedByDevice: "A1",
      timestamp: 1731536100000,
    },
    {
      opId: "A1:2",
      dev: "A1",
      seq: 2,
      kind: "MOVE",
      region: "A",
      hlc: 1731536200000,
      body: "medkit=5|pool:A->dev:A1",
      sig: "ed25519:b2c3d4e5...",
      uploadedByDevice: "A1",
      timestamp: 1731536200000,
    },
    {
      opId: "A1:3",
      dev: "A1",
      seq: 3,
      kind: "MOVE",
      region: "A",
      hlc: 1731536300000,
      body: "food=30|pool:A->dev:A1",
      sig: "ed25519:c3d4e5f6...",
      uploadedByDevice: "A1",
      timestamp: 1731536300000,
    },
    {
      opId: "A1:14",
      dev: "A1",
      seq: 14,
      kind: "SET",
      region: "A",
      hlc: 1731536510000,
      body: "person:genesis:1|displayName=Ravi|status=Missing|condition=Unknown|whereNow=Unknown",
      sig: "ed25519:d4e5f6a7...",
      uploadedByDevice: "A1",
      timestamp: 1731536510000,
    },
    {
      opId: "B1:7",
      dev: "B1",
      seq: 7,
      kind: "MOVE",
      region: "A",
      hlc: 1731536700000,
      body: "water=5|pool:A->dev:B1",
      sig: "ed25519:e5f6a7b8...",
      uploadedByDevice: "A1",
      timestamp: 1731536700000,
    },
    {
      opId: "B1:8",
      dev: "B1",
      seq: 8,
      kind: "SET",
      region: "A",
      hlc: 1731536750000,
      body: "person:genesis:2|displayName=Priya|status=Missing|condition=Critical|whereNow=Unknown",
      sig: "ed25519:f6a7b8c9...",
      uploadedByDevice: "A1",
      timestamp: 1731536750000,
    },
    {
      opId: "C1:3",
      dev: "C1",
      seq: 3,
      kind: "SET",
      region: "A",
      hlc: 1731536800000,
      body: "person:genesis:1|status=Found|condition=Safe|whereNow=Community Hall",
      sig: "ed25519:a7b8c9d0...",
      uploadedByDevice: "A1",
      timestamp: 1731536800000,
    },
    {
      opId: "C1:4",
      dev: "C1",
      seq: 4,
      kind: "SET",
      region: "A",
      hlc: 1731536900000,
      body: "person:genesis:3|displayName=Suresh|status=Safe|condition=Minor Injury|whereNow=Base Camp Shelter",
      sig: "ed25519:b8c9d0e1...",
      uploadedByDevice: "A1",
      timestamp: 1731536900000,
    },
    {
      opId: "A1:15",
      dev: "A1",
      seq: 15,
      kind: "MOVE",
      region: "A",
      hlc: 1731537000000,
      body: "blanket=10|pool:A->dev:C1",
      sig: "ed25519:c9d0e1f2...",
      uploadedByDevice: "A1",
      timestamp: 1731537000000,
    },
    {
      opId: "A1:16",
      dev: "A1",
      seq: 16,
      kind: "MINT",
      region: "A",
      hlc: 1731537100000,
      body: "water=20",
      sig: "ed25519:d0e1f2a3...",
      uploadedByDevice: "A1",
      timestamp: 1731537100000,
    },
  ];

  for (const op of ops) {
    await setDoc(doc(db, "deaddrop_ops", op.opId), op);
  }

  // ── Entities ───────────────────────────────────────────────────────────────
  const entities: DDEntity[] = [
    {
      entityId: "person:genesis:1",
      type: "person",
      fields: {
        displayName: "Ravi",
        status: "Found",
        condition: "Safe",
        whereNow: "Community Hall",
      },
      conflicts: [],
    },
    {
      entityId: "person:genesis:2",
      type: "person",
      fields: {
        displayName: "Priya",
        status: "Critical",
        condition: "Critical",
        whereNow: "Unknown",
      },
      conflicts: ["B1:8"],
    },
    {
      entityId: "person:genesis:3",
      type: "person",
      fields: {
        displayName: "Suresh",
        status: "Safe",
        condition: "Minor Injury",
        whereNow: "Base Camp Shelter",
      },
      conflicts: [],
    },
    {
      entityId: "shelter:community-hall",
      type: "shelter",
      fields: {
        displayName: "Community Hall",
        capacity: 200,
        occupancy: 147,
      },
      conflicts: [],
    },
    {
      entityId: "shelter:base-camp",
      type: "shelter",
      fields: {
        displayName: "Base Camp Shelter",
        capacity: 80,
        occupancy: 23,
      },
      conflicts: [],
    },
  ];

  for (const entity of entities) {
    await setDoc(doc(db, "deaddrop_entities", entity.entityId), entity);
  }

  // ── Ledger ─────────────────────────────────────────────────────────────────
  const ledger: DDLedger[] = [
    {
      account: "pool:A",
      balances: { water: 45, blanket: 10, boat: 2, medkit: 10, food: 70 },
    },
    {
      account: "dev:A1",
      balances: { water: 0, blanket: 0, boat: 0, medkit: 5, food: 30 },
    },
    {
      account: "dev:B1",
      balances: { water: 5, blanket: 0, boat: 0, medkit: 0, food: 0 },
    },
    {
      account: "dev:C1",
      balances: { water: 0, blanket: 10, boat: 0, medkit: 0, food: 0 },
    },
  ];

  for (const entry of ledger) {
    await setDoc(doc(db, "deaddrop_ledger", entry.account), entry);
  }

  console.log("DeadDrop demo data seeded successfully.");
}

// ─── Equivocation Simulation ─────────────────────────────────────────────────
// Writes a conflicting body for an existing op ID to simulate a Byzantine fault.

export async function seedEquivocation(): Promise<void> {
  if (!db) return;
  // Write two conflicting bodies for opId "B1:8" (same dev:seq, different body)
  const badOp: DDOp = {
    opId: "B1:8-eqv",          // Firestore doc for the equivocating copy
    dev: "B1",
    seq: 8,                     // Same sequence number as B1:8
    kind: "SET",
    region: "A",
    hlc: 1731536750001,         // Slightly later HLC — attacker replay
    body: "person:genesis:2|displayName=Priya|status=Missing|condition=Unknown|whereNow=Flood Zone 3",
    sig: undefined,             // No valid sig → forgery
    uploadedByDevice: "UNKNOWN",
    timestamp: Date.now(),
  };
  await setDoc(doc(db, "deaddrop_ops", badOp.opId), badOp);
  console.log("Equivocation seeded — device B1 seq 8 now has two conflicting bodies.");
}

// ─── Reset DeadDrop Collections ──────────────────────────────────────────────
// Removes the equivocation test document (clean-up helper).

export async function clearEquivocation(): Promise<void> {
  if (!db) return;
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(db, "deaddrop_ops", "B1:8-eqv"));
  console.log("Equivocation document removed.");
}
