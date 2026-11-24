/**
 * OfflineVitalsPanel
 *
 * Renders inside the patient EHR modal ("Device Sync" tab).
 * When offline mode is ON and the ESP is connected the doctor can
 * "Approve & Sync" the incoming vitals + image to this specific patient.
 */

import { useState } from "react";
import {
  Usb,
  Wifi,
  WifiOff,
  Heart,
  Droplets,
  Thermometer,
  Activity,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Loader,
  RefreshCcw,
  Trash2,
  Info,
  ZapOff,
} from "lucide-react";
import { useOfflineMode, DeviceReading } from "../services/OfflineModeContext";
import { useDeadDropSync } from "../services/useDeadDropSync";
import { Radio, Battery } from "lucide-react";

// ── Vitals card ───────────────────────────────────────────────────────────────

function VitalBadge({
  icon,
  label,
  value,
  unit,
  ok,
  flagged,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit: string;
  ok: boolean;
  flagged?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl px-4 py-3 border ${
        !ok
          ? "bg-slate-50 border-slate-200 opacity-50"
          : flagged
          ? "bg-red-50 border-red-200"
          : "bg-white border-slate-200"
      } shadow-xs min-w-[90px]`}
    >
      <span className={`${flagged ? "text-red-500" : "text-phc-blue"} mb-1`}>
        {icon}
      </span>
      <span className="text-[11px] text-slate-400 font-display uppercase tracking-wide leading-none">
        {label}
      </span>
      <span
        className={`text-[22px] font-display font-black leading-none mt-0.5 ${
          !ok ? "text-slate-300" : flagged ? "text-red-600" : "text-slate-800"
        }`}
      >
        {ok ? value : "—"}
      </span>
      <span className="text-[10px] text-slate-400 mt-0.5">{unit}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface OfflineVitalsPanelProps {
  patientId: string;
  patientName: string;
}

export default function OfflineVitalsPanel({
  patientId,
  patientName,
}: OfflineVitalsPanelProps) {
  const {
    offlineEnabled,
    toggleOffline,
    isSupported,
    status,
    connect,
    disconnect,
    liveVitals,
    liveImage,
    imageProgress,
    syncedRecords,
    assignToPatient,
    removeSynced,
  } = useOfflineMode();

  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState<DeviceReading | null>(null);
  const { nodes, uplinkStatus } = useDeadDropSync();

  // Records for THIS patient
  const myRecords = syncedRecords.filter((r) => r.patientId === patientId);

  const handleSync = async () => {
    if (!liveVitals && !liveImage) return;
    setSyncing(true);
    await new Promise((r) => setTimeout(r, 600)); // brief UI feedback
    const record = assignToPatient(patientId);
    setSyncing(false);
    setJustSynced(record);
    setTimeout(() => setJustSynced(null), 4000);
  };

  const isConnecting = status === "connecting";
  const isConnected  = status === "connected";
  const isError      = status === "error";
  const isIdle       = status === "idle";

  const hasLiveData  = !!(liveVitals || liveImage);
  const finger       = liveVitals?.finger ?? false;

  // ── Offline mode disabled ────────────────────────────────────────────────
  if (!offlineEnabled) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
          <ZapOff size={28} className="text-slate-400" />
        </div>
        <div>
          <h3 className="font-display font-bold text-slate-700 text-[15px]">
            Offline Hardware Mode is Off
          </h3>
          <p className="text-[12.5px] text-slate-400 mt-1 max-w-xs mx-auto">
            Enable Offline Mode in the sidebar to connect the ESP32 receiver
            node via USB and sync vitals &amp; images directly to this patient.
          </p>
        </div>
        <button
          onClick={toggleOffline}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0b7a75] hover:bg-[#0d918c] text-white rounded-xl text-[13px] font-display font-bold transition-all cursor-pointer shadow-xs"
        >
          <Usb size={15} />
          Enable Offline Mode
        </button>
      </div>
    );
  }

  // ── Web Serial not supported ─────────────────────────────────────────────
  if (!isSupported) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <AlertTriangle size={36} className="text-amber-400" />
        <div>
          <h3 className="font-display font-bold text-amber-700 text-[15px]">
            Web Serial Not Supported
          </h3>
          <p className="text-[12.5px] text-slate-500 mt-1 max-w-xs mx-auto">
            Please use <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> (desktop)
            to use the USB hardware sync feature.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── DeadDrop Mobile Mesh Telemetry ─────────────────────────── */}
      <div className="bg-[#0b2a3c] text-white border border-[#133a53] rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio size={16} className="text-[#9fe5cf]" />
            <h4 className="font-display font-bold text-white text-[14px]">
              DeadDrop P2P Mesh Rescuers (Mobile Gateway)
            </h4>
          </div>
          {uplinkStatus && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-400/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Gateway: dev:{uplinkStatus.activeGatewayDevice} ({uplinkStatus.gatewayUserName}) · {uplinkStatus.totalOpsPushed} ops
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {Object.keys(nodes).length === 0 ? (
            <div className="col-span-3 text-center py-3 text-xs text-slate-400 font-mono">
              Listening for mobile app nodes on /nodes...
            </div>
          ) : (
            Object.values(nodes).map((node) => {
              const isOnline = node.onlineStatus === "ONLINE";
              return (
                <div
                  key={node.deviceId}
                  className="bg-[#133a53] border border-[#1c4b69] rounded-xl p-3 flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[13px] text-white">
                      dev:{node.deviceId} ({node.userName})
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isOnline
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-slate-500/20 text-slate-300"
                      }`}
                    >
                      {node.onlineStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1">
                      <Battery size={12} className={node.batteryPercent < 20 ? "text-red-400" : "text-emerald-400"} />
                      {node.batteryPercent}%
                    </span>
                    <span className="font-mono text-[11px] text-[#9fe5cf]">
                      {node.totalOpsHeld} ops
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Connection bar ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-5 py-3.5 shadow-xs">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isConnected
                ? "bg-[#0b7a75] text-white"
                : isError
                ? "bg-red-100 text-red-500"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            <Usb size={18} />
          </div>
          <div>
            <div className="font-display font-bold text-[13.5px] text-slate-800 flex items-center gap-2">
              SevaSetu Receiver Node (USB / Serial)
              {isConnected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#9fe5cf] text-[#0b2a3c] text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0b7a75] animate-pulse" />
                  LIVE
                </span>
              )}
              {isError && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                  ERROR
                </span>
              )}
            </div>
            <div className="text-[11.5px] text-slate-400 mt-0.5">
              {isIdle       && "Plug in the receiver ESP32 then click Connect."}
              {isConnecting && "Opening serial port…"}
              {isConnected  && "Reading vitals and image data from hardware."}
              {isError      && "Serial connection lost. Please reconnect."}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isConnected ? (
            <button
              onClick={connect}
              disabled={isConnecting}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0b7a75] hover:bg-[#0d918c] text-white rounded-xl text-[12.5px] font-display font-bold transition-all cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isConnecting ? (
                <Loader size={13} className="animate-spin" />
              ) : (
                <Usb size={13} />
              )}
              {isConnecting ? "Connecting…" : "Connect USB"}
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-xl text-[12.5px] font-display font-semibold transition-all cursor-pointer"
            >
              <WifiOff size={13} />
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* ── Live vitals ──────────────────────────────────────────────── */}
      {isConnected && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-phc-blue" />
              <h4 className="font-display font-bold text-slate-800 text-[14px]">
                Live Vitals — Incoming via ESP-NOW
              </h4>
            </div>
            {liveVitals && (
              <span className="text-[10.5px] font-mono text-slate-400">
                seq #{liveVitals.seq} ·{" "}
                {new Date(liveVitals.receivedAt).toLocaleTimeString("en-IN")}
              </span>
            )}
          </div>

          {!liveVitals ? (
            <div className="flex items-center justify-center gap-2 py-6 text-slate-400 text-[13px]">
              <Loader size={16} className="animate-spin" />
              Waiting for packets from wearable node…
            </div>
          ) : (
            <>
              {!finger && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[12px]">
                  <Info size={14} />
                  Finger not detected on MAX30102 — HR &amp; SpO₂ readings unavailable.
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <VitalBadge
                  icon={<Heart size={18} />}
                  label="Heart Rate"
                  value={liveVitals.hr}
                  unit="bpm"
                  ok={liveVitals.hrOk}
                  flagged={liveVitals.hr > 100 || liveVitals.hr < 50}
                />
                <VitalBadge
                  icon={<Droplets size={18} />}
                  label="SpO₂"
                  value={liveVitals.spo2}
                  unit="%"
                  ok={liveVitals.spo2Ok}
                  flagged={liveVitals.spo2 < 95}
                />
                <VitalBadge
                  icon={<Thermometer size={18} />}
                  label="Temperature"
                  value={liveVitals.temp.toFixed(1)}
                  unit="°C"
                  ok={liveVitals.tempOk}
                  flagged={liveVitals.temp > 37.5 || liveVitals.temp < 35}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Live image ───────────────────────────────────────────────── */}
      {isConnected && (imageProgress > 0 || liveImage) && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Camera size={16} className="text-phc-blue" />
            <h4 className="font-display font-bold text-slate-800 text-[14px]">
              Incoming Image — ESP-NOW Transfer
            </h4>
            {imageProgress < 100 && imageProgress > 0 && (
              <span className="ml-auto text-[11px] font-mono text-phc-blue font-bold">
                {imageProgress}%
              </span>
            )}
          </div>

          {imageProgress > 0 && imageProgress < 100 && (
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-2 bg-[#0b7a75] rounded-full transition-all duration-300"
                style={{ width: `${imageProgress}%` }}
              />
            </div>
          )}

          {liveImage && (
            <img
              src={liveImage}
              alt="Captured by wearable"
              className="w-full max-h-72 object-contain rounded-xl border border-slate-100 bg-slate-50"
            />
          )}
        </div>
      )}

      {/* ── Approve & Sync CTA ───────────────────────────────────────── */}
      {isConnected && hasLiveData && (
        <div className="bg-[#f0fbf8] border border-[#9fe5cf] rounded-2xl p-5 flex items-center justify-between gap-4">
          <div>
            <div className="font-display font-bold text-[#0b2a3c] text-[14px]">
              Approve &amp; Sync to <span className="text-[#0b7a75]">{patientName}</span>
            </div>
            <p className="text-[12px] text-slate-500 mt-0.5">
              The incoming vitals{liveImage ? " and image" : ""} will be recorded
              under this patient's EHR.
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0b7a75] hover:bg-[#0d918c] text-white rounded-xl text-[13px] font-display font-bold transition-all cursor-pointer disabled:opacity-60 shadow-sm flex-shrink-0"
          >
            {syncing ? (
              <Loader size={15} className="animate-spin" />
            ) : (
              <CheckCircle2 size={15} />
            )}
            {syncing ? "Syncing…" : "Approve & Sync"}
          </button>
        </div>
      )}

      {/* Success toast */}
      {justSynced && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#9fe5cf] border border-[#0b7a75]/30 text-[#0b2a3c] text-[13px] font-display font-semibold animate-in fade-in">
          <CheckCircle2 size={16} className="text-[#0b7a75]" />
          Synced successfully to {patientName} at{" "}
          {new Date(justSynced.syncedAt).toLocaleTimeString("en-IN")}
        </div>
      )}

      {/* ── History: readings already synced to this patient ─────────── */}
      {myRecords.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-slate-700">
            <RefreshCcw size={14} className="text-slate-400" />
            <span className="font-display font-bold text-[13px]">
              Device Readings Synced to {patientName} ({myRecords.length})
            </span>
          </div>

          {myRecords.map((rec) => (
            <div
              key={rec.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-mono text-slate-500">
                  {new Date(rec.syncedAt).toLocaleString("en-IN")}
                </span>
                <button
                  onClick={() => removeSynced(rec.id)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                  title="Remove reading"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {rec.vitals && (
                <div className="flex flex-wrap gap-2">
                  {rec.vitals.hrOk && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[12.5px] font-mono text-slate-700">
                      <Heart size={12} className="text-red-400" />
                      {rec.vitals.hr} bpm
                    </span>
                  )}
                  {rec.vitals.spo2Ok && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[12.5px] font-mono text-slate-700">
                      <Droplets size={12} className="text-blue-400" />
                      {rec.vitals.spo2}% SpO₂
                    </span>
                  )}
                  {rec.vitals.tempOk && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[12.5px] font-mono text-slate-700">
                      <Thermometer size={12} className="text-amber-400" />
                      {rec.vitals.temp.toFixed(1)}°C
                    </span>
                  )}
                </div>
              )}

              {rec.image && (
                <img
                  src={rec.image}
                  alt="Synced from wearable"
                  className="w-full max-h-56 object-contain rounded-xl border border-slate-100 bg-slate-50"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Idle / disconnected notice ────────────────────────────────── */}
      {!isConnected && myRecords.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center text-slate-400">
          <Wifi size={32} className="text-slate-200" />
          <p className="text-[13px]">
            Connect the receiver ESP32 via USB to begin reading live vitals and images.
          </p>
        </div>
      )}
    </div>
  );
}

