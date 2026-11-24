import { useEffect, useState } from "react";
import { ShieldCheck, AlertTriangle, CheckCircle2, HelpCircle, Zap, Trash2 } from "lucide-react";
import { PageBand } from "../../components/PageBand";
import {
  subscribeOps,
  subscribeNodes,
  seedEquivocation,
  clearEquivocation,
  type DDOp,
  type DDNode,
} from "../../lib/deadDropFirebase";
import {
  detectEquivocation,
  type EquivocationAlert,
} from "../../lib/deadDropEngine";

// Demo authority & region keys (static display)
const AUTHORITY_KEY = "ed25519:DeadDropAuthority:a3f7c2d1e8b946520fa1c093d7e8b4a2f63c91d0e5b827a4f1c08e94d2b7c3f6";
const REGION_KEYS: { region: string; hash: string; label: string }[] = [
  { region: "A", hash: "9e2b4d6f1c08a3d7f0b5e1c4a92836d", label: "North Flood Zone" },
  { region: "B", hash: "b1a5d3e7f2c9044b6a8e2d1f7c3b905", label: "East Relief Camp" },
  { region: "C", hash: "c4f8a2e6b3d10957c2b4f1a8e5d7c03", label: "South Evacuation Route" },
];

type SigStatus = "VALID" | "UNVERIFIED" | "QUARANTINED";

function getSigStatus(op: DDOp, quarantinedDevs: Set<string>): SigStatus {
  if (quarantinedDevs.has(op.dev)) return "QUARANTINED";
  if (!op.sig) return "UNVERIFIED";
  return "VALID";
}

function SigBadge({ status }: { status: SigStatus }) {
  const styles: Record<SigStatus, { bg: string; text: string; icon: React.ReactNode }> = {
    VALID: {
      bg: "bg-emerald-100 text-emerald-700 border-emerald-200",
      text: "✓ VALID",
      icon: <CheckCircle2 size={12} />,
    },
    UNVERIFIED: {
      bg: "bg-[#f0f5fa] text-[#56636b] border-[#e3eaf0]",
      text: "UNVERIFIED",
      icon: <HelpCircle size={12} />,
    },
    QUARANTINED: {
      bg: "bg-red-100 text-red-700 border-red-200",
      text: "⚠ QUARANTINED",
      icon: <AlertTriangle size={12} />,
    },
  };
  const s = styles[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${s.bg}`}>
      {s.icon}
      {s.text}
    </span>
  );
}

export default function CryptoAudit() {
  const [ops, setOps] = useState<DDOp[]>([]);
  const [nodes, setNodes] = useState<DDNode[]>([]);
  const [equivAlerts, setEquivAlerts] = useState<EquivocationAlert[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const unsubs = [
      subscribeOps((o) => {
        setOps(o);
        setEquivAlerts(detectEquivocation(o));
      }),
      subscribeNodes(setNodes),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  async function handleSimulate() {
    setSimulating(true);
    await seedEquivocation();
    setSimulating(false);
    setSimulated(true);
  }

  async function handleClear() {
    setClearing(true);
    await clearEquivocation();
    setClearing(false);
    setSimulated(false);
  }

  const quarantinedDevs = new Set(equivAlerts.map((a) => a.dev));
  const displayOps = ops.slice(0, 15);

  return (
    <div>
      <PageBand
        tone="night"
        title="Crypto & Audit"
        subtitle="Ed25519 signatures · Equivocation detection · Key registry"
        badge={
          equivAlerts.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              {equivAlerts.length} EQUIVOCATION ALERT{equivAlerts.length > 1 ? "S" : ""}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              No equivocation detected
            </span>
          )
        }
      />

      <div className="p-6 space-y-6">
        {/* Authority Key */}
        <div className="rounded-2xl border border-[#e3eaf0] bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e3eaf0] flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-600" />
            <h2 className="text-sm font-black uppercase tracking-widest text-[#0b2a3c]">
              Authority Public Key
            </h2>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs text-[#56636b] mb-2">Ed25519 · Base58 Encoded · Trust Root</p>
            <div className="bg-[#0b2a3c] rounded-xl p-4">
              <p className="font-mono text-xs text-emerald-400 break-all leading-relaxed">
                {AUTHORITY_KEY}
              </p>
            </div>
          </div>
        </div>

        {/* Region Keys */}
        <div className="rounded-2xl border border-[#e3eaf0] bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e3eaf0]">
            <h2 className="text-sm font-black uppercase tracking-widest text-[#0b2a3c]">
              Region Key Registry
            </h2>
          </div>
          <div className="divide-y divide-[#f0f5fa]">
            {REGION_KEYS.map((rk) => (
              <div key={rk.region} className="px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#0b2a3c] flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-black text-sm">R{rk.region}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#0b2a3c] text-sm">{rk.label}</p>
                  <p className="font-mono text-xs text-[#7a98a8] truncate mt-0.5">
                    ed25519:{rk.hash}
                  </p>
                </div>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  ACTIVE
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Equivocation / Quarantined Devices */}
        {equivAlerts.length > 0 && (
          <div className="rounded-2xl border border-red-200 bg-red-50 overflow-hidden">
            <div className="px-5 py-4 border-b border-red-200 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-600" />
              <h2 className="text-sm font-black uppercase tracking-widest text-red-800">
                Quarantined Devices
              </h2>
            </div>
            <div className="divide-y divide-red-100">
              {equivAlerts.map((alert, i) => (
                <div key={i} className="px-5 py-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-black text-red-700">dev:{alert.dev}</span>
                    <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-bold">
                      EQUIVOCATION
                    </span>
                  </div>
                  <p className="text-xs text-red-700">
                    Seq {alert.seq}: {alert.ops.length} conflicting bodies — Byzantine fault detected
                  </p>
                  <div className="mt-2 space-y-1">
                    {alert.ops.map((op, j) => (
                      <p key={j} className="text-[10px] font-mono text-red-600 bg-red-100 rounded px-2 py-1 truncate">
                        {op.opId}: {op.body}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Simulate Equivocation Demo */}
        <div className="rounded-2xl border border-[#e3eaf0] bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e3eaf0] flex items-center gap-2">
            <Zap size={16} className="text-amber-500" />
            <h2 className="text-sm font-black uppercase tracking-widest text-[#0b2a3c]">
              Byzantine Fault Simulator
            </h2>
          </div>
          <div className="px-5 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-bold text-[#0b2a3c]">Simulate Equivocation on dev:B1</p>
              <p className="text-xs text-[#56636b] mt-1">
                Writes a conflicting body for <span className="font-mono">B1:8</span> (same dev:seq, different body).
                This triggers the equivocation detector and quarantines device B1.
              </p>
              {simulated && (
                <p className="text-xs font-bold text-red-600 mt-2 flex items-center gap-1.5">
                  <AlertTriangle size={12} />
                  Equivocation injected — B1 should now appear quarantined above
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleSimulate}
                disabled={simulating || simulated || ops.length === 0}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                <Zap size={13} />
                {simulating ? "Injecting…" : simulated ? "✓ Injected" : "Inject Equivocation"}
              </button>
              {simulated && (
                <button
                  onClick={handleClear}
                  disabled={clearing}
                  className="px-4 py-2 rounded-xl bg-[#f0f5fa] text-[#56636b] text-xs font-bold hover:bg-[#e3eaf0] transition-colors disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  {clearing ? "Clearing…" : "Clear"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Signature Validation Table */}
        <div className="rounded-2xl border border-[#e3eaf0] bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e3eaf0]">
            <h2 className="text-sm font-black uppercase tracking-widest text-[#0b2a3c]">
              Op Signature Validation
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f7fbff] border-b border-[#e3eaf0]">
                  <th className="text-left px-5 py-3 text-xs font-black uppercase tracking-widest text-[#56636b]">Op ID</th>
                  <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-[#56636b]">Device</th>
                  <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-[#56636b]">Kind</th>
                  <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-[#56636b]">Signature</th>
                  <th className="text-left px-5 py-3 text-xs font-black uppercase tracking-widest text-[#56636b]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f5fa]">
                {displayOps.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-sm text-[#56636b]">
                      No ops yet — seed demo data from Command Center
                    </td>
                  </tr>
                ) : (
                  displayOps.map((op) => {
                    const status = getSigStatus(op, quarantinedDevs);
                    return (
                      <tr key={op.opId} className={`hover:bg-[#fafcff] transition-colors ${status === "QUARANTINED" ? "bg-red-50" : ""}`}>
                        <td className="px-5 py-3 font-mono text-xs text-[#0b2a3c] font-bold">{op.opId}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[#56636b]">{op.dev}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold text-[#56636b]">{op.kind}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px] text-[#b4b4b4] max-w-xs truncate">
                          {op.sig ?? "—"}
                        </td>
                        <td className="px-5 py-3">
                          <SigBadge status={status} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Device Key Fingerprints */}
        {nodes.length > 0 && (
          <div className="rounded-2xl border border-[#e3eaf0] bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e3eaf0]">
              <h2 className="text-sm font-black uppercase tracking-widest text-[#0b2a3c]">
                Device Key Fingerprints
              </h2>
            </div>
            <div className="divide-y divide-[#f0f5fa]">
              {nodes.map((node) => (
                <div key={node.deviceId} className="px-5 py-4 flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${quarantinedDevs.has(node.deviceId) ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[#0b2a3c]">
                      dev:{node.deviceId} · {node.userName}
                    </p>
                    <p className="font-mono text-[10px] text-[#7a98a8] truncate mt-0.5">
                      state:{node.lastStateHash ?? "—"}
                    </p>
                  </div>
                  {quarantinedDevs.has(node.deviceId) ? (
                    <span className="text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
                      QUARANTINED
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                      TRUSTED
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
