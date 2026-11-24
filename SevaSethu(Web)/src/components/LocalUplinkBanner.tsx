import React, { useEffect, useState } from 'react';

export interface LocalUplinkData {
  gatewayDevice: string;
  gatewayUser: string;
  role: string;
  opsPushed: number;
  timestamp: number;
}

export function LocalUplinkBanner() {
  const [uplink, setUplink] = useState<LocalUplinkData | null>(null);

  useEffect(() => {
    const fetchUplink = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/uplink');
        const data = await res.json();
        if (data && data.gatewayDevice) {
          setUplink(data);
        }
      } catch (e) {
        // server offline
      }
    };

    fetchUplink();
    const interval = setInterval(fetchUplink, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!uplink) return null;

  return (
    <div className="bg-emerald-950 border-b border-emerald-500/50 text-white px-4 py-3 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
        <span className="font-bold text-sm text-emerald-400 tracking-wider">
          🟢 LOCAL NETWORK UPLINK ESTABLISHED
        </span>
      </div>
      <div className="text-sm font-medium">
        First-to-Sync Gateway: <strong className="text-white font-bold">Device {uplink.gatewayDevice} ({uplink.gatewayUser})</strong>
        {" • "}<span className="text-slate-300">{uplink.role}</span>
        {" • "}Pushed <strong className="text-emerald-400 font-bold">{uplink.opsPushed} ops</strong> to HQ
      </div>
    </div>
  );
}

