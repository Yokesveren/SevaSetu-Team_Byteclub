import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  Wifi,
  ShieldCheck,
  Users,
  Activity,
  Home,
  Search,
  Zap,
  Database,
  RefreshCw,
  Radio,
  TrendingUp,
  Eye,
} from "lucide-react";
import { PageBand } from "../../components/PageBand";
import {
  subscribeOps,
  subscribeNodes,
  subscribeEntities,
  subscribeLedger,
  seedDemoData,
  type DDOp,
  type DDNode,
  type DDEntity,
  type DDLedger,
} from "../../lib/deadDropFirebase";
import {
  detectEquivocation,
  checkLedgerIntegrity,
  computeStateHash,
  computeFoundPercent,
  computeShelterOccupancy,
  formatHLC,
  timeAgo,
} from "../../lib/deadDropEngine";
import { useDeadDropSync } from "../../services/useDeadDropSync";

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  unit?: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[#e3eaf0] bg-white p-5 flex flex-col gap-3 shadow-sm"
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: color + "18" }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-xs font-bold tracking-widest uppercase text-[#56636b]">{label}</p>
        <p className="mt-0.5 text-3xl font-black tracking-tight text-[#0b2a3c] leading-none">
          {value}
          {unit && <span className="text-base font-bold text-[#56636b] ml-1">{unit}</span>}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Op Kind Badge ────────────────────────────────────────────────────────────

function KindBadge({ kind }: { kind: string }) {
  const styles: Record<string, string> = {
    SET:  "bg-blue-100 text-blue-700 border-blue-200",
    MINT: "bg-emerald-100 text-emerald-700 border-emerald-200",
    MOVE: "bg-amber-100 text-amber-700 border-amber-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase border tracking-wide ${styles[kind] ?? "bg-gray-100 text-gray-700"}`}>
      {kind}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Overview() {
  const [ops, setOps] = useState<DDOp[]>([]);
  const [nodes, setNodes] = useState<DDNode[]>([]);
  const [entities, setEntities] = useState<DDEntity[]>([]);
  const [ledger, setLedger] = useState<DDLedger[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);

  // Realtime Database sync directly from mobile app
  const { ops: rtdbOps, nodes: rtdbNodes, uplinkStatus } = useDeadDropSync();

  useEffect(() => {
    const unsubs = [
      subscribeOps(setOps),
      subscribeNodes(setNodes),
      subscribeEntities(setEntities),
      subscribeLedger(setLedger),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  // Merge Firestore demo ops with live Realtime Database ops from mobile
  const allOps = [...rtdbOps.map(o => ({
    opId: o.opId,
    dev: o.dev,
    seq: o.seq,
    kind: o.kind,
    region: o.region,
    hlc: o.hlc,
    body: o.body,
    sig: o.sig,
    uploadedByDevice: o.uploadedByDevice,
    timestamp: typeof o.timestamp === "string" ? new Date(o.timestamp).getTime() : o.timestamp,
  })), ...ops].filter((op, idx, self) => self.findIndex(o => o.opId === op.opId) === idx);

  const equivAlerts = detectEquivocation(allOps);
  const ledgerAlerts = checkLedgerIntegrity(allOps, ledger);
  const stateHash = computeStateHash(allOps);
  const foundPct = computeFoundPercent(entities);
  const shelterOccPct = computeShelterOccupancy(entities);
  const onlineNode = nodes.find((n) => n.onlineStatus === "ONLINE") || (uplinkStatus ? {
    deviceId: uplinkStatus.activeGatewayDevice,
    userName: uplinkStatus.gatewayUserName,
    totalOpsHeld: uplinkStatus.totalOpsPushed,
    lastInternetSync: uplinkStatus.lastUplinkTimestamp,
  } : undefined);
  const recentOps = allOps.slice(0, 7);
  const shelters = entities.filter((e) => e.type === "shelter");

  async function handleSeed() {
    setSeeding(true);
    await seedDemoData();
    setSeeding(false);
    setSeeded(true);
  }

  return (
    <div>
      {/* Page Band */}
      <PageBand
        tone="night"
        title="Command Center"
        subtitle="DeadDrop HQ · Disaster Relief Operations"
        badge={
          <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Feed Active
          </span>
        }
        aside={
          <div className="text-right">
            <p className="text-xs text-[#7a98a8] font-mono">STATE HASH</p>
            <p className="text-sm font-black font-mono text-emerald-400">{stateHash}</p>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Seed Button */}
        {ops.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#b8d4ea] bg-[#f0f7ff] p-6 flex flex-col items-center gap-3 text-center">
            <Database size={32} className="text-[#0b7a75]" />
            <p className="font-black text-[#0b2a3c] text-lg">No DeadDrop data found</p>
            <p className="text-sm text-[#56636b] max-w-sm">
              Seed Firestore with demo data to see the dashboard in action — 3 devices, ops, persons, and ledger entries.
            </p>
            <button
              onClick={handleSeed}
              disabled={seeding || seeded}
              className="mt-1 px-6 py-2.5 rounded-xl bg-[#0b2a3c] text-white text-sm font-bold hover:bg-[#133a53] transition-colors disabled:opacity-50"
            >
              {seeding ? "Seeding…" : seeded ? "✓ Seeded!" : "Seed Demo Data"}
            </button>
          </div>
        )}

        {/* Uplink Banner */}
        {onlineNode && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-3 flex items-center gap-3"
          >
            <Wifi size={18} className="text-amber-600 flex-shrink-0" />
            <p className="text-sm font-bold text-amber-800 flex-1">
              Uplink Active via Device {onlineNode.deviceId} ({onlineNode.userName}) · Pushed {onlineNode.totalOpsHeld} ops
            </p>
            <span className="text-xs font-mono text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
              {timeAgo(onlineNode.lastInternetSync ?? Date.now())}
            </span>
          </motion.div>
        )}

        {/* Alerts Row */}
        {(equivAlerts.length > 0 || ledgerAlerts.length > 0) && (
          <div className="space-y-2">
            {equivAlerts.map((a, i) => (
              <div key={i} className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 flex items-center gap-3">
                <AlertTriangle size={16} className="text-red-600 flex-shrink-0" />
                <p className="text-sm font-bold text-red-800">
                  ⚠ EQUIVOCATION — Device {a.dev} seq {a.seq}: {a.ops.length} conflicting bodies detected. Device quarantined.
                </p>
              </div>
            ))}
            {ledgerAlerts.map((a, i) => (
              <div key={i} className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 flex items-center gap-3">
                <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
                <p className="text-sm font-bold text-amber-800">
                  Overspend: {a.account}/{a.item} deficit of {a.deficit} units
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Activity}
            label="Total Ops"
            value={ops.length}
            color="#0b7a75"
          />
          <StatCard
            icon={Users}
            label="Active Rescuers"
            value={nodes.length}
            color="#3B82F6"
          />
          <StatCard
            icon={Search}
            label="Missing Found"
            value={foundPct}
            unit="%"
            color="#10B981"
          />
          <StatCard
            icon={Home}
            label="Shelter Occupancy"
            value={shelterOccPct}
            unit="%"
            color="#F59E0B"
          />
        </div>

        {/* Two-column: Recent Ops + Shelters */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Ops Feed */}
          <div className="rounded-2xl border border-[#e3eaf0] bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e3eaf0] flex items-center gap-2">
              <Zap size={16} className="text-[#0b7a75]" />
              <h2 className="text-sm font-black uppercase tracking-widest text-[#0b2a3c]">
                Recent Ops Feed
              </h2>
            </div>
            <div className="divide-y divide-[#f0f5fa]">
              {recentOps.length === 0 ? (
                <p className="px-5 py-6 text-sm text-[#56636b] text-center">No ops yet — seed demo data above</p>
              ) : (
                recentOps.map((op) => (
                  <div key={op.opId} className="px-5 py-3 flex items-center gap-3">
                    <KindBadge kind={op.kind} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#0b2a3c] truncate">{op.body}</p>
                      <p className="text-[10px] text-[#7a98a8] font-mono mt-0.5">
                        {op.dev} · {formatHLC(op.hlc)} · Region {op.region}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-[#b4b4b4] flex-shrink-0">
                      #{op.opId}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Shelter Occupancy */}
          <div className="rounded-2xl border border-[#e3eaf0] bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e3eaf0] flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#0b7a75]" />
              <h2 className="text-sm font-black uppercase tracking-widest text-[#0b2a3c]">
                Shelter Status
              </h2>
            </div>
            <div className="p-5 space-y-5">
              {shelters.length === 0 ? (
                <p className="text-sm text-[#56636b] text-center py-4">No shelter data</p>
              ) : (
                shelters.map((s) => {
                  const cap = (s.fields.capacity as number) || 0;
                  const occ = (s.fields.occupancy as number) || 0;
                  const pct = cap > 0 ? Math.round((occ / cap) * 100) : 0;
                  const color = pct > 85 ? "#EF4444" : pct > 65 ? "#F59E0B" : "#10B981";
                  return (
                    <div key={s.entityId}>
                      <div className="flex justify-between items-baseline mb-2">
                        <span className="text-sm font-bold text-[#0b2a3c]">{s.fields.displayName}</span>
                        <span className="text-xs font-mono text-[#56636b]">{occ}/{cap}</span>
                      </div>
                      <div className="h-2 bg-[#f0f5fa] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, type: "spring" }}
                          className="h-full rounded-full"
                          style={{ background: color }}
                        />
                      </div>
                      <p className="text-[10px] text-[#7a98a8] mt-1">{pct}% occupied</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Device Status Row */}
        <div className="rounded-2xl border border-[#e3eaf0] bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e3eaf0]">
            <h2 className="text-sm font-black uppercase tracking-widest text-[#0b2a3c]">Field Devices</h2>
          </div>
          <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#f0f5fa]">
            {nodes.length === 0 ? (
              <p className="px-5 py-6 text-sm text-[#56636b] col-span-3 text-center">No nodes yet</p>
            ) : (
              nodes.map((node) => {
                const isOnline = node.onlineStatus === "ONLINE";
                const isMesh = node.onlineStatus === "MESH_ONLY";
                const statusColor = isOnline ? "#10B981" : isMesh ? "#F59E0B" : "#EF4444";
                return (
                  <div key={node.deviceId} className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: statusColor }}
                      />
                      <span className="font-black text-[#0b2a3c] text-sm">dev:{node.deviceId}</span>
                      <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full border"
                        style={{ color: statusColor, borderColor: statusColor + "40", background: statusColor + "10" }}>
                        {node.onlineStatus}
                      </span>
                    </div>
                    <p className="text-xs text-[#56636b]">{node.userName} · {node.role}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[#f0f5fa] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${node.batteryPercent}%`,
                            background: node.batteryPercent > 50 ? "#10B981" : node.batteryPercent > 20 ? "#F59E0B" : "#EF4444",
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-[#56636b]">{node.batteryPercent}%</span>
                    </div>
                    <p className="text-[10px] text-[#7a98a8] mt-1">{node.totalOpsHeld} ops · Region {node.region}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
