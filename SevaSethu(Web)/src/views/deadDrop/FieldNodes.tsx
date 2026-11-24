import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Wifi, WifiOff, Radio, Battery } from "lucide-react";
import { PageBand } from "../../components/PageBand";
import {
  subscribeNodes,
  type DDNode,
} from "../../lib/deadDropFirebase";
import { timeAgo } from "../../lib/deadDropEngine";

function NodeCard({ node }: { node: DDNode }) {
  const isOnline = node.onlineStatus === "ONLINE";
  const isMesh = node.onlineStatus === "MESH_ONLY";
  const statusColor = isOnline ? "#10B981" : isMesh ? "#F59E0B" : "#EF4444";
  const StatusIcon = isOnline ? Wifi : isMesh ? Radio : WifiOff;

  const batColor =
    node.batteryPercent > 50
      ? "#10B981"
      : node.batteryPercent > 20
      ? "#F59E0B"
      : "#EF4444";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[#e3eaf0] bg-white p-5 space-y-4"
      style={{
        borderTopColor: statusColor,
        borderTopWidth: 3,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: statusColor }}
            />
            <span className="font-black text-[#0b2a3c] text-lg leading-none">
              dev:{node.deviceId}
            </span>
          </div>
          <p className="text-sm font-bold text-[#0b2a3c] mt-1">{node.userName}</p>
          <p className="text-xs text-[#7a98a8] mt-0.5">{node.role}</p>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
          style={{
            color: statusColor,
            borderColor: statusColor + "40",
            background: statusColor + "12",
          }}
        >
          <StatusIcon size={12} />
          {node.onlineStatus}
        </div>
      </div>

      {/* Battery */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 text-[#56636b]">
            <Battery size={13} />
            <span className="text-xs font-bold">Battery</span>
          </div>
          <span className="text-xs font-mono font-bold" style={{ color: batColor }}>
            {node.batteryPercent}%
          </span>
        </div>
        <div className="h-2 bg-[#f0f5fa] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${node.batteryPercent}%` }}
            transition={{ duration: 0.8, type: "spring" }}
            className="h-full rounded-full"
            style={{ background: batColor }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center bg-[#f7fbff] rounded-xl p-2">
          <p className="text-lg font-black text-[#0b2a3c]">{node.totalOpsHeld}</p>
          <p className="text-[10px] text-[#7a98a8] uppercase tracking-wide">Ops Held</p>
        </div>
        <div className="text-center bg-[#f7fbff] rounded-xl p-2">
          <p className="text-lg font-black text-[#0b2a3c]">{node.region}</p>
          <p className="text-[10px] text-[#7a98a8] uppercase tracking-wide">Region</p>
        </div>
        <div className="text-center bg-[#f7fbff] rounded-xl p-2">
          <p className="text-sm font-black text-[#0b2a3c] leading-tight">
            {node.lastInternetSync ? timeAgo(node.lastInternetSync) : "N/A"}
          </p>
          <p className="text-[10px] text-[#7a98a8] uppercase tracking-wide">Last Sync</p>
        </div>
      </div>

      {/* State Hash */}
      {node.lastStateHash && (
        <div className="bg-[#0b2a3c] rounded-xl p-2.5">
          <p className="text-[10px] text-[#7a98a8] uppercase tracking-widest mb-1">State Hash</p>
          <p className="text-xs font-mono text-emerald-400 tracking-wider">{node.lastStateHash}…</p>
        </div>
      )}
    </motion.div>
  );
}

function MeshTopology({ nodes }: { nodes: DDNode[] }) {
  if (nodes.length === 0) return null;
  // Simple triangle topology SVG
  const positions = [
    { x: 150, y: 40 },
    { x: 50, y: 180 },
    { x: 250, y: 180 },
  ];
  return (
    <div className="rounded-2xl border border-[#e3eaf0] bg-white p-5">
      <h2 className="text-sm font-black uppercase tracking-widest text-[#0b2a3c] mb-4">
        Mesh Topology
      </h2>
      <div className="flex justify-center">
        <svg viewBox="0 0 300 240" width="300" height="240" aria-label="Mesh topology">
          {/* HQ center */}
          <circle cx="150" cy="120" r="20" fill="#0b2a3c" />
          <text x="150" y="125" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">HQ</text>

          {nodes.slice(0, 3).map((node, i) => {
            const pos = positions[i] ?? { x: 150, y: 120 };
            const isOnline = node.onlineStatus === "ONLINE";
            const isMesh = node.onlineStatus === "MESH_ONLY";
            const color = isOnline ? "#10B981" : isMesh ? "#F59E0B" : "#EF4444";
            const lineStroke = isMesh ? "#F59E0B" : isOnline ? "#10B981" : "#EF4444";
            const lineDash = isMesh ? "5,4" : "none";
            return (
              <g key={node.deviceId}>
                <line
                  x1="150" y1="120"
                  x2={pos.x} y2={pos.y}
                  stroke={lineStroke}
                  strokeWidth="2"
                  strokeDasharray={lineDash}
                  opacity="0.7"
                />
                <circle cx={pos.x} cy={pos.y} r="22" fill={color + "20"} stroke={color} strokeWidth="2" />
                <text x={pos.x} y={pos.y - 2} textAnchor="middle" fill="#0b2a3c" fontSize="10" fontWeight="bold">
                  {node.deviceId}
                </text>
                <text x={pos.x} y={pos.y + 11} textAnchor="middle" fill="#56636b" fontSize="8">
                  {node.userName}
                </text>
              </g>
            );
          })}

          {/* Mesh connections between field nodes */}
          {nodes.length >= 2 && (
            <line
              x1={positions[0].x} y1={positions[0].y}
              x2={positions[1].x} y2={positions[1].y}
              stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.5"
            />
          )}
          {nodes.length >= 3 && (
            <>
              <line
                x1={positions[1].x} y1={positions[1].y}
                x2={positions[2].x} y2={positions[2].y}
                stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.5"
              />
              <line
                x1={positions[0].x} y1={positions[0].y}
                x2={positions[2].x} y2={positions[2].y}
                stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.5"
              />
            </>
          )}
        </svg>
      </div>
      <div className="flex gap-4 justify-center mt-2">
        <div className="flex items-center gap-1.5 text-[10px] text-[#56636b]">
          <span className="w-4 border-t-2 border-emerald-500" />
          Internet uplink
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#56636b]">
          <span className="w-4 border-t-2 border-dashed border-amber-400" />
          Mesh P2P
        </div>
      </div>
    </div>
  );
}

export default function FieldNodes() {
  const [nodes, setNodes] = useState<DDNode[]>([]);

  useEffect(() => {
    return subscribeNodes(setNodes);
  }, []);

  const onlineCount = nodes.filter((n) => n.onlineStatus === "ONLINE").length;
  const meshCount = nodes.filter((n) => n.onlineStatus === "MESH_ONLY").length;
  const offlineCount = nodes.filter((n) => n.onlineStatus === "OFFLINE").length;

  return (
    <div>
      <PageBand
        tone="night"
        title="Field Nodes"
        subtitle={`${nodes.length} devices · ${onlineCount} online · ${meshCount} mesh-only · ${offlineCount} offline`}
      />

      <div className="p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Internet", count: onlineCount, color: "#10B981" },
            { label: "Mesh Only", count: meshCount, color: "#F59E0B" },
            { label: "Offline", count: offlineCount, color: "#EF4444" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-[#e3eaf0] bg-white p-4 text-center">
              <p
                className="text-3xl font-black"
                style={{ color: s.color }}
              >
                {s.count}
              </p>
              <p className="text-xs font-bold text-[#56636b] uppercase tracking-widest mt-1">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Device cards + topology */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-min">
            {nodes.length === 0 ? (
              <div className="col-span-full text-center py-16 text-[#7a98a8]">
                <p className="font-black text-lg">No field nodes yet</p>
                <p className="text-sm mt-1">Seed demo data from Command Center</p>
              </div>
            ) : (
              nodes.map((node) => <NodeCard key={node.deviceId} node={node} />)
            )}
          </div>
          <div>
            <MeshTopology nodes={nodes} />
          </div>
        </div>
      </div>
    </div>
  );
}
