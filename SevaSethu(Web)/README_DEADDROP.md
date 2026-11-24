# DeadDrop HQ — Integration Guide

> Disaster Relief P2P Mesh Ledger Command Dashboard, embedded inside the **SevaSethu(Web)** portal.

---

## Overview

DeadDrop HQ adds a **6-view emergency command layer** to the SevaSethu portal.  
All existing SevaSethu routes continue to work. DeadDrop is accessible via the **⬡ DEADROP HQ** sidebar section.

| View | Route Key | Purpose |
|------|-----------|---------|
| Command Center | `dd-overview` | Live feed, metric cards, device row, shelter bars |
| Missing Persons | `dd-missing-persons` | Searchable person tracker with conflict drawer |
| Shelter Grid | `dd-shelter-occupancy` | Per-shelter occupancy bars + live adjust +/− |
| Supply Ledger | `dd-supply-ledger` | Double-entry balance matrix, MINT/MOVE log |
| Field Nodes | `dd-field-nodes` | Device cards, battery bars, SVG mesh topology |
| Crypto & Audit | `dd-crypto-audit` | Ed25519 keys, equivocation detector, sig table, Byzantine fault simulator |

---

## Firebase / Firestore Collections

All DeadDrop data lives in **the same `seva-sethu-1ae78` Firebase project**, but in four new collections:

| Collection | Description |
|------------|-------------|
| `deaddrop_ops` | All append-only operation records (MINT / MOVE / SET) |
| `deaddrop_nodes` | Field device heartbeats (battery, status, ops held) |
| `deaddrop_entities` | Persons and shelters (resolved state) |
| `deaddrop_ledger` | Per-account balance snapshots |

---

## Firestore Security Rules

Add these rules to your `firestore.rules` (or in the Firebase Console under **Firestore → Rules**):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ── Existing SevaSethu collections (keep as-is) ──────────────────────────
    // ... your existing rules ...

    // ── DeadDrop HQ collections ──────────────────────────────────────────────
    match /deaddrop_ops/{id} {
      allow read, write: if request.auth != null;
    }
    match /deaddrop_nodes/{id} {
      allow read, write: if request.auth != null;
    }
    match /deaddrop_entities/{id} {
      allow read, write: if request.auth != null;
    }
    match /deaddrop_ledger/{id} {
      allow read, write: if request.auth != null;
    }
  }
}
```

> **For local dev / demo**, you can temporarily use `allow read, write: if true;`  
> (but never deploy this to production).

---

## Getting Started (Demo Flow)

1. `npm run dev` → opens on `http://localhost:8443/`
2. Log in with any SevaSethu account (admin or doctor)
3. The dashboard defaults to **Command Center** (`dd-overview`)
4. Click **"Seed Demo Data"** to populate Firestore with:
   - 3 field devices (Arjun/ONLINE, Bhavna/MESH_ONLY, Charan/MESH_ONLY)
   - 10 operations (MINT, MOVE, SET)
   - 3 persons (Ravi/Found, Priya/Critical, Suresh/Safe)
   - 2 shelters (Community Hall 147/200, Base Camp 23/80)
   - 4 ledger accounts (pool:A, dev:A1, dev:B1, dev:C1)

---

## Key Files

```
src/
├── lib/
│   ├── deadDropFirebase.ts     # Firestore subscriptions + seed functions
│   └── deadDropEngine.ts       # Pure: conflict detection, equivocation, hash, metrics
├── views/deadDrop/
│   ├── Overview.tsx            # Command Center (live feed)
│   ├── MissingPersons.tsx      # Person tracker with conflict drawer
│   ├── ShelterOccupancy.tsx    # Shelter grid with live occupancy adjust
│   ├── SupplyLedger.tsx        # Balance matrix + MINT/MOVE log
│   ├── FieldNodes.tsx          # Node cards + mesh topology SVG
│   └── CryptoAudit.tsx         # Key registry + equivocation + Byzantine sim
├── types.ts                    # ViewType union includes all dd-* routes
├── App.tsx                     # Router switch includes all dd-* cases
└── components/Sidebar.tsx      # ⬡ DEADROP HQ nav section
```

---

## Data Model

### DDOp
```typescript
{
  opId:   "A1:14",           // "dev:seq"
  dev:    "A1",
  seq:    14,
  kind:   "SET" | "MINT" | "MOVE",
  region: "A",
  hlc:    1731536510000,     // Hybrid Logical Clock (ms)
  body:   "entity|field=val|field=val",
  sig?:   "ed25519:...",
}
```

### Body encoding
| Kind | Body format |
|------|-------------|
| `SET` | `entityId\|field=val\|field=val` |
| `MINT` | `item=qty,item=qty` |
| `MOVE` | `item=qty\|from->to` |

### Equivocation
Same `dev:seq` → different `body` = **Byzantine fault**.  
The Crypto & Audit view includes a **"Inject Equivocation"** button that writes a conflicting `B1:8` body to trigger live detection.

---

## Design Language

DeadDrop HQ reuses the SevaSethu **Byteclub** visual language:
- Sidebar: `#0b2a3c` navy, `#9fe5cf` active pill
- Content sheet: white `#ffffff`, rounded 20px inset
- Status palette: Emerald `#10B981` (safe), Amber `#F59E0B` (warning), Red `#EF4444` (critical)
- Font: Chivo (font-display), `font-mono` for all hashes and IDs

