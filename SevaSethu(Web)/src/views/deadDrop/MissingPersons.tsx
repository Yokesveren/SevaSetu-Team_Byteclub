import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, X, ChevronRight, AlertTriangle } from "lucide-react";
import { PageBand } from "../../components/PageBand";
import {
  subscribeEntities,
  subscribeOps,
  type DDEntity,
  type DDOp,
} from "../../lib/deadDropFirebase";
import { formatHLC } from "../../lib/deadDropEngine";

type StatusFilter = "All" | "Missing" | "Found" | "Critical" | "Safe";
type RegionFilter = "All" | "A" | "B" | "C";

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; pulse?: boolean }> = {
  Missing:  { bg: "#FEE2E2", text: "#991B1B", dot: "#EF4444", pulse: true },
  Found:    { bg: "#D1FAE5", text: "#065F46", dot: "#10B981" },
  Critical: { bg: "#FEE2E2", text: "#7F1D1D", dot: "#EF4444", pulse: true },
  Safe:     { bg: "#D1FAE5", text: "#065F46", dot: "#10B981" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { bg: "#F3F4F6", text: "#374151", dot: "#9CA3AF" };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold"
      style={{ background: s.bg, color: s.text }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.pulse ? "animate-pulse" : ""}`}
        style={{ background: s.dot }}
      />
      {status}
    </span>
  );
}

function PersonCard({
  entity,
  onSelect,
}: {
  entity: DDEntity;
  onSelect: (e: DDEntity) => void;
}) {
  const status = entity.fields.status ?? "Unknown";
  const isCritical = status === "Critical" || status === "Missing";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`rounded-2xl border bg-white p-5 cursor-pointer hover:shadow-md transition-all ${
        isCritical ? "border-red-200 shadow-red-50 shadow-sm" : "border-[#e3eaf0]"
      }`}
      onClick={() => onSelect(entity)}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="font-black text-[#0b2a3c] text-base">{entity.fields.displayName ?? entity.entityId}</h3>
          <p className="text-xs text-[#7a98a8] font-mono mt-0.5">{entity.entityId}</p>
        </div>
        <ChevronRight size={16} className="text-[#b4b4b4] flex-shrink-0 mt-1" />
      </div>
      <StatusBadge status={status} />
      {entity.fields.condition && (
        <p className="text-xs text-[#56636b] mt-2">
          Condition: <strong>{entity.fields.condition}</strong>
        </p>
      )}
      {entity.fields.whereNow && (
        <p className="text-xs text-[#56636b] mt-0.5">
          Location: <strong>{entity.fields.whereNow}</strong>
        </p>
      )}
      {(entity.conflicts?.length ?? 0) > 0 && (
        <div className="mt-3 flex items-center gap-1.5 text-amber-600">
          <AlertTriangle size={12} />
          <span className="text-xs font-bold">{entity.conflicts!.length} conflict(s) detected</span>
        </div>
      )}
    </motion.div>
  );
}

function ConflictDrawer({
  entity,
  ops,
  onClose,
}: {
  entity: DDEntity;
  ops: DDOp[];
  onClose: () => void;
}) {
  const entityOps = ops.filter(
    (o) => o.kind === "SET" && o.body.startsWith(entity.entityId)
  ).sort((a, b) => b.hlc - a.hlc);

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col"
      style={{ borderLeft: "1px solid #e3eaf0" }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#e3eaf0] flex items-center gap-3">
        <div className="flex-1">
          <h2 className="font-black text-[#0b2a3c] text-sm uppercase tracking-widest">Op History</h2>
          <p className="text-xs text-[#7a98a8] mt-0.5">{entity.fields.displayName}</p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#f0f5fa] text-[#56636b]"
        >
          <X size={16} />
        </button>
      </div>

      {/* Current State */}
      <div className="px-5 py-4 bg-[#f7fbff] border-b border-[#e3eaf0]">
        <p className="text-xs font-bold tracking-widest uppercase text-[#56636b] mb-2">Current State (HLC Winner)</p>
        <StatusBadge status={entity.fields.status ?? "Unknown"} />
        <div className="mt-2 space-y-1">
          {Object.entries(entity.fields).map(([k, v]) => (
            <p key={k} className="text-xs text-[#56636b]">
              <span className="font-bold text-[#0b2a3c]">{k}:</span> {String(v)}
            </p>
          ))}
        </div>
      </div>

      {/* Op list */}
      <div className="flex-1 overflow-y-auto">
        {entityOps.length === 0 ? (
          <p className="text-sm text-[#56636b] text-center py-8">No SET ops found for this entity</p>
        ) : (
          entityOps.map((op, i) => (
            <div
              key={op.opId}
              className={`px-5 py-4 border-b border-[#f0f5fa] ${i === 0 ? "bg-emerald-50" : ""}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  i === 0
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : "bg-[#f0f5fa] text-[#56636b] border-[#e3eaf0]"
                }`}>
                  {i === 0 ? "✓ WINNER" : "SUPERSEDED"}
                </span>
                <span className="text-xs font-mono text-[#7a98a8]">{op.opId}</span>
              </div>
              <p className="text-xs font-bold text-[#0b2a3c] break-all">{op.body}</p>
              <p className="text-[10px] text-[#7a98a8] mt-1 font-mono">
                HLC: {op.hlc} · {formatHLC(op.hlc)} · dev:{op.dev}
              </p>
              {op.sig && (
                <p className="text-[10px] text-[#b4b4b4] font-mono mt-0.5 truncate">{op.sig}</p>
              )}
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

export default function MissingPersons() {
  const [entities, setEntities] = useState<DDEntity[]>([]);
  const [ops, setOps] = useState<DDOp[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("All");
  const [selected, setSelected] = useState<DDEntity | null>(null);

  useEffect(() => {
    const unsubs = [
      subscribeEntities(setEntities),
      subscribeOps(setOps),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const persons = entities.filter((e) => e.type === "person");

  const filtered = persons.filter((p) => {
    const name = (p.fields.displayName ?? "").toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (statusFilter !== "All" && p.fields.status !== statusFilter) return false;
    if (regionFilter !== "All" && p.fields.region !== regionFilter) return false;
    return true;
  });

  const counts = {
    Missing: persons.filter((p) => p.fields.status === "Missing").length,
    Critical: persons.filter((p) => p.fields.status === "Critical").length,
    Found: persons.filter((p) => p.fields.status === "Found").length,
    Safe: persons.filter((p) => p.fields.status === "Safe").length,
  };

  return (
    <div>
      <PageBand
        tone="night"
        title="Missing Persons"
        subtitle={`${persons.length} tracked · ${counts.Missing + counts.Critical} still missing`}
        badge={
          counts.Critical > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              {counts.Critical} CRITICAL
            </span>
          ) : undefined
        }
      />

      <div className="p-6 space-y-5">
        {/* Search + Filter */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a98a8]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-[#e3eaf0] rounded-xl focus:outline-none focus:border-[#0b7a75] transition-colors"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(["All", "Missing", "Critical", "Found", "Safe"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                  statusFilter === s
                    ? "bg-[#0b2a3c] text-white border-[#0b2a3c]"
                    : "bg-white text-[#56636b] border-[#e3eaf0] hover:border-[#0b2a3c]"
                }`}
              >
                {s}
                {s !== "All" && counts[s as keyof typeof counts] !== undefined && (
                  <span className="ml-1 opacity-60">({counts[s as keyof typeof counts]})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Region filter row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-[#7a98a8] uppercase tracking-widest">Region:</span>
          {(["All", "A", "B", "C"] as RegionFilter[]).map((r) => (
            <button
              key={r}
              onClick={() => setRegionFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                regionFilter === r
                  ? "bg-[#EF4444] text-white border-[#EF4444]"
                  : "bg-white text-[#56636b] border-[#e3eaf0] hover:border-[#EF4444] hover:text-[#EF4444]"
              }`}
            >
              {r === "All" ? "All Regions" : `Region ${r}`}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-[#7a98a8]">
            <p className="text-lg font-black">No persons found</p>
            <p className="text-sm mt-1">Seed demo data from the Command Center</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map((e) => (
                <PersonCard key={e.entityId} entity={e} onSelect={setSelected} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Conflict Drawer Overlay */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setSelected(null)}
            />
            <ConflictDrawer
              entity={selected}
              ops={ops}
              onClose={() => setSelected(null)}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
