import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Home, Plus, Minus, AlertTriangle, Users } from "lucide-react";
import { PageBand } from "../../components/PageBand";
import {
  subscribeEntities,
  subscribeOps,
  type DDEntity,
  type DDOp,
} from "../../lib/deadDropFirebase";
import { formatHLC, timeAgo } from "../../lib/deadDropEngine";
import { db } from "../../services/firebase";
import { doc, setDoc } from "firebase/firestore";

// ─── Shelter Card ─────────────────────────────────────────────────────────────

function ShelterCard({ shelter, onAdjust }: {
  shelter: DDEntity;
  onAdjust: (entityId: string, delta: number) => void;
}) {
  const cap = (shelter.fields.capacity as number) || 0;
  const occ = (shelter.fields.occupancy as number) || 0;
  const pct = cap > 0 ? Math.round((occ / cap) * 100) : 0;
  const remaining = cap - occ;
  const color = pct > 85 ? "#EF4444" : pct > 65 ? "#F59E0B" : "#10B981";
  const bgColor = pct > 85 ? "#FEF2F2" : pct > 65 ? "#FFFBEB" : "#F0FDF4";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border bg-white overflow-hidden shadow-sm"
      style={{ borderTopColor: color, borderTopWidth: 3, borderColor: "#e3eaf0" }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: color + "18" }}
            >
              <Home size={18} style={{ color }} />
            </div>
            <div>
              <h3 className="font-black text-[#0b2a3c] text-base leading-tight">
                {shelter.fields.displayName ?? shelter.entityId}
              </h3>
              <p className="text-xs text-[#7a98a8] font-mono mt-0.5">{shelter.entityId}</p>
            </div>
          </div>
          {/* Status pill */}
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ background: bgColor, color }}
          >
            {pct > 85 ? "⚠ NEAR CAPACITY" : pct > 65 ? "FILLING UP" : "AVAILABLE"}
          </span>
        </div>
      </div>

      {/* Occupancy bar */}
      <div className="px-5 pb-4">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-sm font-bold text-[#56636b]">Occupancy</span>
          <div className="text-right">
            <span className="text-2xl font-black" style={{ color }}>{occ}</span>
            <span className="text-sm text-[#7a98a8] ml-1">/ {cap}</span>
          </div>
        </div>
        <div className="h-3 bg-[#f0f5fa] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(pct, 100)}%` }}
            transition={{ duration: 0.9, type: "spring", stiffness: 200, damping: 25 }}
            className="h-full rounded-full"
            style={{ background: color }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-[#7a98a8]">{pct}% occupied</span>
          <span className="text-xs font-bold" style={{ color: remaining > 0 ? "#10B981" : "#EF4444" }}>
            {remaining > 0 ? `${remaining} spaces free` : "FULL"}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 border-t border-[#f0f5fa]">
        {[
          { label: "Capacity", value: cap, icon: null },
          { label: "Occupied", value: occ, icon: null },
          { label: "Free", value: remaining, icon: null },
        ].map((s) => (
          <div key={s.label} className="text-center py-3">
            <p className="text-lg font-black text-[#0b2a3c]">{s.value}</p>
            <p className="text-[10px] text-[#7a98a8] uppercase tracking-wide mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Adjust occupancy */}
      <div className="px-5 py-4 border-t border-[#f0f5fa] flex items-center justify-between">
        <span className="text-xs font-bold text-[#56636b] uppercase tracking-widest">Adjust Occupancy</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAdjust(shelter.entityId, -1)}
            disabled={occ <= 0}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#f0f5fa] text-[#0b2a3c] hover:bg-[#e3eaf0] transition-colors disabled:opacity-30"
          >
            <Minus size={14} />
          </button>
          <span className="text-sm font-black text-[#0b2a3c] w-8 text-center">{occ}</span>
          <button
            onClick={() => onAdjust(shelter.entityId, +1)}
            disabled={occ >= cap}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#0b2a3c] text-white hover:bg-[#133a53] transition-colors disabled:opacity-30"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Recent Shelter Ops ───────────────────────────────────────────────────────

function ShelterOpLog({ ops }: { ops: DDOp[] }) {
  const shelterOps = ops
    .filter((o) => o.kind === "SET" && o.body.includes("shelter:"))
    .slice(0, 10);

  if (shelterOps.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[#e3eaf0] bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-[#e3eaf0] flex items-center gap-2">
        <AlertTriangle size={15} className="text-[#0b7a75]" />
        <h2 className="text-sm font-black uppercase tracking-widest text-[#0b2a3c]">Shelter Update Log</h2>
      </div>
      <div className="divide-y divide-[#f0f5fa]">
        {shelterOps.map((op) => (
          <div key={op.opId} className="px-5 py-3 flex items-center gap-3">
            <span className="font-mono text-[10px] text-[#b4b4b4] flex-shrink-0">#{op.opId}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#0b2a3c] truncate">{op.body}</p>
              <p className="text-[10px] text-[#7a98a8] font-mono mt-0.5">
                {op.dev} · {formatHLC(op.hlc)} · {timeAgo(op.hlc)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ShelterOccupancy() {
  const [entities, setEntities] = useState<DDEntity[]>([]);
  const [ops, setOps] = useState<DDOp[]>([]);

  useEffect(() => {
    const unsubs = [
      subscribeEntities(setEntities),
      subscribeOps(setOps),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const shelters = entities.filter((e) => e.type === "shelter");

  const totalCap = shelters.reduce((s, e) => s + ((e.fields.capacity as number) || 0), 0);
  const totalOcc = shelters.reduce((s, e) => s + ((e.fields.occupancy as number) || 0), 0);
  const totalFree = totalCap - totalOcc;
  const overallPct = totalCap > 0 ? Math.round((totalOcc / totalCap) * 100) : 0;
  const critical = shelters.filter((s) => {
    const cap = (s.fields.capacity as number) || 0;
    const occ = (s.fields.occupancy as number) || 0;
    return cap > 0 && occ / cap > 0.85;
  }).length;

  async function handleAdjust(entityId: string, delta: number) {
    if (!db) return;
    const entity = entities.find((e) => e.entityId === entityId);
    if (!entity) return;
    const current = (entity.fields.occupancy as number) || 0;
    const cap = (entity.fields.capacity as number) || 0;
    const newOcc = Math.max(0, Math.min(cap, current + delta));
    await setDoc(
      doc(db, "deaddrop_entities", entityId),
      { ...entity, fields: { ...entity.fields, occupancy: newOcc } }
    );
  }

  return (
    <div>
      <PageBand
        tone="night"
        title="Shelter Occupancy"
        subtitle={`${shelters.length} shelters · ${totalOcc} / ${totalCap} total occupants`}
        badge={
          critical > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              {critical} NEAR CAPACITY
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              All shelters operational
            </span>
          )
        }
      />

      <div className="p-6 space-y-6">
        {/* Summary metric row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Shelters",   value: shelters.length,  color: "#3B82F6",  icon: Home },
            { label: "Total Occupants",  value: totalOcc,         color: "#F59E0B",  icon: Users },
            { label: "Total Capacity",   value: totalCap,         color: "#0b7a75",  icon: Home },
            { label: "Spaces Remaining", value: totalFree,        color: "#10B981",  icon: Users },
          ].map(({ label, value, color, icon: Icon }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-[#e3eaf0] bg-white p-5 flex flex-col gap-3"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: color + "18" }}
              >
                <Icon size={18} style={{ color }} />
              </div>
              <div>
                <p className="text-xs font-bold tracking-widest uppercase text-[#56636b]">{label}</p>
                <p className="mt-0.5 text-3xl font-black tracking-tight text-[#0b2a3c] leading-none">{value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Overall progress bar */}
        <div className="rounded-2xl border border-[#e3eaf0] bg-white px-6 py-5">
          <div className="flex justify-between items-baseline mb-3">
            <h3 className="text-sm font-black uppercase tracking-widest text-[#0b2a3c]">Overall Occupancy</h3>
            <span className="text-2xl font-black" style={{ color: overallPct > 85 ? "#EF4444" : overallPct > 65 ? "#F59E0B" : "#10B981" }}>
              {overallPct}%
            </span>
          </div>
          <div className="h-4 bg-[#f0f5fa] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(overallPct, 100)}%` }}
              transition={{ duration: 1, type: "spring", stiffness: 160, damping: 22 }}
              className="h-full rounded-full"
              style={{
                background: overallPct > 85
                  ? "linear-gradient(90deg, #EF4444, #DC2626)"
                  : overallPct > 65
                  ? "linear-gradient(90deg, #F59E0B, #D97706)"
                  : "linear-gradient(90deg, #10B981, #059669)",
              }}
            />
          </div>
          <p className="text-xs text-[#7a98a8] mt-2">{totalOcc} occupants across {shelters.length} shelter{shelters.length !== 1 ? "s" : ""}</p>
        </div>

        {/* Shelter cards grid */}
        {shelters.length === 0 ? (
          <div className="text-center py-16 text-[#7a98a8]">
            <Home size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-black text-lg">No shelter data</p>
            <p className="text-sm mt-1">Seed demo data from the Command Center</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {shelters.map((s) => (
              <ShelterCard key={s.entityId} shelter={s} onAdjust={handleAdjust} />
            ))}
          </div>
        )}

        {/* Shelter op log */}
        <ShelterOpLog ops={ops} />
      </div>
    </div>
  );
}

