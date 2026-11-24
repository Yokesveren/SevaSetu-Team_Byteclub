import { useEffect, useState } from "react";
import { ref, onValue, off } from "firebase/database";
import { rtdb } from "./firebase";
import { DeadDropOp, DeadDropNode, UplinkStatus } from "../types";

export interface DeadDropSyncState {
  ops: DeadDropOp[];
  nodes: Record<string, DeadDropNode>;
  uplinkStatus: UplinkStatus | null;
  loading: boolean;
  error: string | null;
}

export function useDeadDropSync(): DeadDropSyncState {
  const [ops, setOps] = useState<DeadDropOp[]>([]);
  const [nodes, setNodes] = useState<Record<string, DeadDropNode>>({});
  const [uplinkStatus, setUplinkStatus] = useState<UplinkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rtdb) {
      setError("Firebase Realtime Database instance is not available.");
      setLoading(false);
      return;
    }

    const opsRef = ref(rtdb, "ops");
    const nodesRef = ref(rtdb, "nodes");
    const uplinkRef = ref(rtdb, "uplink_status");

    // 1. Listen for /ops
    const unsubscribeOps = onValue(
      opsRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const opsList: DeadDropOp[] = Object.values(data);
          // Sort descending by hlc or timestamp
          opsList.sort((a, b) => (b.hlc || 0) - (a.hlc || 0));
          setOps(opsList);
        } else {
          setOps([]);
        }
        setLoading(false);
      },
      (err) => {
        console.warn("RTDB /ops subscription error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    // 2. Listen for /nodes
    const unsubscribeNodes = onValue(
      nodesRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setNodes(data as Record<string, DeadDropNode>);
        } else {
          setNodes({});
        }
      },
      (err) => {
        console.warn("RTDB /nodes subscription error:", err);
      }
    );

    // 3. Listen for /uplink_status
    const unsubscribeUplink = onValue(
      uplinkRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setUplinkStatus(data as UplinkStatus);
        } else {
          setUplinkStatus(null);
        }
      },
      (err) => {
        console.warn("RTDB /uplink_status subscription error:", err);
      }
    );

    return () => {
      off(opsRef);
      off(nodesRef);
      off(uplinkRef);
    };
  }, []);

  return { ops, nodes, uplinkStatus, loading, error };
}

