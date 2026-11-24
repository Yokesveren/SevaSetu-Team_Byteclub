/**
 * OfflineModeContext — global state for Offline (USB/ESP) mode.
 *
 * "Offline mode" means the doctor has connected the receiver ESP32 node
 * via USB and wants to read vitals / images directly from hardware
 * instead of (or in addition to) Firebase.
 *
 * The context exposes:
 *   - offlineEnabled / toggleOffline
 *   - ESP serial connection controls and live data
 *   - pendingSync: { vitals, image } that the doctor hasn't yet assigned
 *   - assignToPatient(patientId): stamps the pending data with a patient ID
 *   - syncedRecords[patientId]: array of synced device readings
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useOfflineESP, ESPVitals, ESPStatus } from "./useOfflineESP";

// ── Types ────────────────────────────────────────────────────────────────────

export interface DeviceReading {
  id: string;             // unique reading id
  patientId: string;
  vitals: ESPVitals | null;
  image: string | null;   // data-URL
  syncedAt: string;       // ISO timestamp
}

interface OfflineModeContextValue {
  // feature flag
  offlineEnabled:  boolean;
  toggleOffline:   () => void;

  // ESP connection
  isSupported:     boolean;
  status:          ESPStatus;
  connect:         () => Promise<void>;
  disconnect:      () => Promise<void>;

  // live data from the device (un-assigned to any patient yet)
  liveVitals:      ESPVitals | null;
  liveImage:       string | null;
  imageProgress:   number;

  // history of readings already assigned to patients
  syncedRecords:   DeviceReading[];

  /** Stamp the current live vitals+image to a specific patient, then clear live buffers. */
  assignToPatient: (patientId: string) => DeviceReading | null;

  /** Clear a previously synced reading */
  removeSynced:    (id: string) => void;
}

const OfflineModeContext = createContext<OfflineModeContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function OfflineModeProvider({ children }: { children: ReactNode }) {
  const [offlineEnabled, setOfflineEnabled] = useState(false);
  const [syncedRecords,  setSyncedRecords]  = useState<DeviceReading[]>([]);

  // Locally captured snapshots (so "assign" is instant even if sensor updates)
  const [capturedVitals, setCapturedVitals] = useState<ESPVitals | null>(null);
  const [capturedImage,  setCapturedImage]  = useState<string | null>(null);

  const esp = useOfflineESP();

  const toggleOffline = useCallback(() => {
    setOfflineEnabled((prev) => {
      if (prev) {
        // Turning off → disconnect gracefully
        void esp.disconnect();
      }
      return !prev;
    });
  }, [esp]);

  // Keep local snapshots in sync with live data so the UI can always see the
  // "latest" reading independently from rapid sensor updates
  React.useEffect(() => {
    if (esp.vitals) setCapturedVitals(esp.vitals);
  }, [esp.vitals]);

  React.useEffect(() => {
    if (esp.image) setCapturedImage(esp.image);
  }, [esp.image]);

  const assignToPatient = useCallback(
    (patientId: string): DeviceReading | null => {
      if (!capturedVitals && !capturedImage) return null;
      const record: DeviceReading = {
        id:        `dr-${Date.now()}`,
        patientId,
        vitals:    capturedVitals,
        image:     capturedImage,
        syncedAt:  new Date().toISOString(),
      };
      setSyncedRecords((prev) => [record, ...prev]);
      // Clear captured buffers so next reading starts fresh
      setCapturedVitals(null);
      setCapturedImage(null);
      return record;
    },
    [capturedVitals, capturedImage]
  );

  const removeSynced = useCallback((id: string) => {
    setSyncedRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const value: OfflineModeContextValue = {
    offlineEnabled,
    toggleOffline,
    isSupported:   esp.isSupported,
    status:        esp.status,
    connect:       esp.connect,
    disconnect:    esp.disconnect,
    liveVitals:    esp.vitals,
    liveImage:     esp.image,
    imageProgress: esp.imageProgress,
    syncedRecords,
    assignToPatient,
    removeSynced,
  };

  return (
    <OfflineModeContext.Provider value={value}>
      {children}
    </OfflineModeContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useOfflineMode() {
  const ctx = useContext(OfflineModeContext);
  if (!ctx) throw new Error("useOfflineMode must be used inside OfflineModeProvider");
  return ctx;
}

