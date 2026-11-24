import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import {
  FrontlineWorkerDoc,
  SOSAlertDoc,
  subscribeFrontlineWorkers,
  subscribeSOSAlerts,
} from "../services/firebase";
import {
  Radio,
  Maximize2,
  UserCheck,
} from "lucide-react";

export interface TamilNaduAshaWorker extends FrontlineWorkerDoc {
  locationName: string;
  district: string;
  patientsAttended: number;
  lastPatientName: string;
  recentCase: string;
}

// ─── Tamil Nadu ASHA Network Dataset ──────────────────────────────────────────
export const TAMIL_NADU_ASHA_WORKERS: TamilNaduAshaWorker[] = [
  {
    ashaId: "ASHA-TN-001",
    ashaName: "Kavitha Selvam",
    district: "Coimbatore",
    locationName: "Gandhipuram Sub-Centre, Ward 4",
    latitude: 11.0168,
    longitude: 76.9558,
    batteryLevel: 94,
    networkState: "5G",
    pendingSyncQueueSize: 0,
    lastUpdated: Date.now(),
    ward: "Ward 4 - Gandhipuram",
    mobile: "+91 98421 23411",
    patientsAttended: 18,
    lastPatientName: "Baby Kaviya (1/F) - Polio Immunization",
    recentCase: "Routine Paediatric Immunization & Growth Tracking",
    status: "active",
  },
  {
    ashaId: "ASHA-TN-002",
    ashaName: "Meenakshi Sundaram",
    district: "Madurai",
    locationName: "Melur Rural PHC, Sector B",
    latitude: 9.9252,
    longitude: 78.1198,
    batteryLevel: 82,
    networkState: "4G",
    pendingSyncQueueSize: 1,
    lastUpdated: Date.now(),
    ward: "Melur Village North",
    mobile: "+91 94432 55621",
    patientsAttended: 24,
    lastPatientName: "Selvi Priya (26/F) - 34 wks High Risk ANC",
    recentCase: "Pre-eclampsia screening: BP 142/92, fetal Doppler normal",
    status: "active",
  },
  {
    ashaId: "ASHA-TN-003",
    ashaName: "Revathi Natarajan",
    district: "Chennai",
    locationName: "Tondiarpet Urban Primary Health Centre",
    latitude: 13.1232,
    longitude: 80.2842,
    batteryLevel: 98,
    networkState: "5G",
    pendingSyncQueueSize: 0,
    lastUpdated: Date.now(),
    ward: "Zone 4 - Ward 42",
    mobile: "+91 98840 99812",
    patientsAttended: 31,
    lastPatientName: "Murugan S. (58/M) - Diabetes Review",
    recentCase: "Fasting Glucose 168 mg/dL, Metformin adherence verified",
    status: "active",
  },
  {
    ashaId: "ASHA-TN-004",
    ashaName: "Priya Murugan",
    district: "Salem",
    locationName: "Attur Tribal Foothills PHC",
    latitude: 11.5976,
    longitude: 78.5982,
    batteryLevel: 76,
    networkState: "4G",
    pendingSyncQueueSize: 2,
    lastUpdated: Date.now(),
    ward: "Attur Sector 2",
    mobile: "+91 94862 11432",
    patientsAttended: 16,
    lastPatientName: "Periasamy K. (64/M) - TB DOTS Followup",
    recentCase: "Day 34/56 Intensive Phase: Sputum follow-up requested",
    status: "active",
  },
  {
    ashaId: "ASHA-TN-005",
    ashaName: "Deepa Krishnan",
    district: "Tiruchirappalli",
    locationName: "Srirangam Riverbank Sub-centre",
    latitude: 10.8643,
    longitude: 78.6946,
    batteryLevel: 89,
    networkState: "5G",
    pendingSyncQueueSize: 0,
    lastUpdated: Date.now(),
    ward: "Srirangam Ward 8",
    mobile: "+91 97910 44533",
    patientsAttended: 21,
    lastPatientName: "Lakshmi Ammal (72/F) - Osteoarthritis",
    recentCase: "Home mobility assessment, pain management advice",
    status: "active",
  },
  {
    ashaId: "ASHA-TN-006",
    ashaName: "Ananthi Rajan",
    district: "Thanjavur",
    locationName: "Kumbakonam Delta Agriculture Belt",
    latitude: 10.9602,
    longitude: 79.3845,
    batteryLevel: 68,
    networkState: "4G",
    pendingSyncQueueSize: 0,
    lastUpdated: Date.now(),
    ward: "Kumbakonam East",
    mobile: "+91 94421 87654",
    patientsAttended: 14,
    lastPatientName: "Anbarasan V. (42/M) - Viral Fever",
    recentCase: "Temperature 38.6°C, paracetamol dispensed, RDT negative",
    status: "active",
  },
  {
    ashaId: "ASHA-TN-007",
    ashaName: "Lakshmi Saravanan",
    district: "Tirunelveli",
    locationName: "Palayamkottai Municipal Outreach",
    latitude: 8.7139,
    longitude: 77.7567,
    batteryLevel: 91,
    networkState: "5G",
    pendingSyncQueueSize: 0,
    lastUpdated: Date.now(),
    ward: "Ward 19 - Palayamkottai",
    mobile: "+91 99431 33211",
    patientsAttended: 19,
    lastPatientName: "Malarvizhi R. (22/F) - Postnatal Day 7",
    recentCase: "Infant umbilical stump check, exclusive breastfeeding guidance",
    status: "active",
  },
  {
    ashaId: "ASHA-TN-008",
    ashaName: "Vijayalakshmi Muthu",
    district: "Vellore",
    locationName: "Katpadi Junction Health Post",
    latitude: 12.9804,
    longitude: 79.1352,
    batteryLevel: 73,
    networkState: "4G",
    pendingSyncQueueSize: 0,
    lastUpdated: Date.now(),
    ward: "Katpadi North",
    mobile: "+91 98433 76543",
    patientsAttended: 22,
    lastPatientName: "Senthil Nathan (39/M) - Dengue Surveillance",
    recentCase: "Platelet check follow-up, fever resolution confirmed",
    status: "active",
  },
  {
    ashaId: "ASHA-TN-009",
    ashaName: "Saranya Raman",
    district: "Erode",
    locationName: "Perundurai Industrial Zone Sub-centre",
    latitude: 11.2764,
    longitude: 77.5828,
    batteryLevel: 85,
    networkState: "4G",
    pendingSyncQueueSize: 1,
    lastUpdated: Date.now(),
    ward: "Perundurai Ward 3",
    mobile: "+91 97871 22345",
    patientsAttended: 17,
    lastPatientName: "Nithya G. (28/F) - Gestational Diabetes",
    recentCase: "Fasting capillary glucose 112 mg/dL, diet review",
    status: "active",
  },
  {
    ashaId: "ASHA-TN-010",
    ashaName: "Bhuvaneshwari K",
    district: "Dindigul",
    locationName: "Palani Foothills Rural Outreach",
    latitude: 10.4500,
    longitude: 77.5167,
    batteryLevel: 62,
    networkState: "3G",
    pendingSyncQueueSize: 3,
    lastUpdated: Date.now(),
    ward: "Palani Rural Block",
    mobile: "+91 94892 44321",
    patientsAttended: 13,
    lastPatientName: "Chinnathambi (55/M) - Chronic COPD",
    recentCase: "SpO2 93%, nebulisation referral at Taluk Hospital",
    status: "active",
  },
  {
    ashaId: "ASHA-TN-011",
    ashaName: "Karpagam Venkat",
    district: "Kanchipuram",
    locationName: "Sriperumbudur Tech Corridor PHC",
    latitude: 12.9675,
    longitude: 79.9427,
    batteryLevel: 88,
    networkState: "5G",
    pendingSyncQueueSize: 0,
    lastUpdated: Date.now(),
    ward: "Sriperumbudur Sector 1",
    mobile: "+91 98402 11988",
    patientsAttended: 25,
    lastPatientName: "Rajeshwari M. (29/F) - Antenatal 28 wks",
    recentCase: "Severe Anaemia Hb 8.1 g/dL, IV Iron Sucrose scheduled",
    status: "active",
  },
  {
    ashaId: "ASHA-TN-012",
    ashaName: "Selvi Thangaraj",
    district: "Cuddalore",
    locationName: "Chidambaram Coastal Belt",
    latitude: 11.3992,
    longitude: 79.6934,
    batteryLevel: 79,
    networkState: "4G",
    pendingSyncQueueSize: 0,
    lastUpdated: Date.now(),
    ward: "Chidambaram Rural",
    mobile: "+91 94435 66789",
    patientsAttended: 15,
    lastPatientName: "Ayyappan T. (67/M) - Hypertension & Stroke Rehab",
    recentCase: "Blood Pressure 134/86 mmHg, motor recovery exercises",
    status: "active",
  },
  {
    ashaId: "ASHA-TN-013",
    ashaName: "Malathi Chandran",
    district: "The Nilgiris",
    locationName: "Coonoor Tea Plantation High Elevation Post",
    latitude: 11.3530,
    longitude: 76.7959,
    batteryLevel: 71,
    networkState: "4G",
    pendingSyncQueueSize: 2,
    lastUpdated: Date.now(),
    ward: "Coonoor Estate Sector",
    mobile: "+91 94861 88990",
    patientsAttended: 12,
    lastPatientName: "Valliamma (60/F) - Bronchial Asthma",
    recentCase: "Peak flow measurement, inhaler technique re-education",
    status: "active",
  },
  {
    ashaId: "ASHA-TN-014",
    ashaName: "Sangeetha Subramani",
    district: "Dharmapuri",
    locationName: "Pennagaram Dry Zone Primary Health Post",
    latitude: 12.1325,
    longitude: 77.8986,
    batteryLevel: 84,
    networkState: "4G",
    pendingSyncQueueSize: 0,
    lastUpdated: Date.now(),
    ward: "Pennagaram Ward 2",
    mobile: "+91 97863 55432",
    patientsAttended: 20,
    lastPatientName: "Karthik R. (3/M) - Moderate Acute Malnutrition",
    recentCase: "MUAC 12.2 cm, nutritional supplements provided",
    status: "active",
  },
  {
    ashaId: "ASHA-TN-015",
    ashaName: "Kalaivani Ponnusamy",
    district: "Kanyakumari",
    locationName: "Nagercoil Southern Coastal Sector",
    latitude: 8.1833,
    longitude: 77.4119,
    batteryLevel: 92,
    networkState: "5G",
    pendingSyncQueueSize: 0,
    lastUpdated: Date.now(),
    ward: "Nagercoil Central",
    mobile: "+91 94438 12345",
    patientsAttended: 23,
    lastPatientName: "Deepika S. (24/F) - Primigravida 20 wks",
    recentCase: "Anomaly scan scheduled at District HQ, Td vaccine given",
    status: "active",
  },
  {
    ashaId: "ASHA-TN-016",
    ashaName: "Amutha Balan",
    district: "Namakkal",
    locationName: "Rasipuram Agro-Rural Outreach",
    latitude: 11.4646,
    longitude: 78.1772,
    batteryLevel: 77,
    networkState: "4G",
    pendingSyncQueueSize: 0,
    lastUpdated: Date.now(),
    ward: "Rasipuram East",
    mobile: "+91 98427 66543",
    patientsAttended: 18,
    lastPatientName: "Ganesan P. (51/M) - Chronic Kidney Disease",
    recentCase: "Serum Creatinine 2.1 mg/dL, Nephrology teleconsult setup",
    status: "active",
  },
  {
    ashaId: "ASHA-TN-017",
    ashaName: "Thenmozhi Gunasekaran",
    district: "Tiruppur",
    locationName: "Avinashi Cotton Belt Industrial Sub-centre",
    latitude: 11.1934,
    longitude: 77.2689,
    batteryLevel: 90,
    networkState: "5G",
    pendingSyncQueueSize: 0,
    lastUpdated: Date.now(),
    ward: "Avinashi Sector 4",
    mobile: "+91 99422 99887",
    patientsAttended: 27,
    lastPatientName: "Mahesh Kumar (33/M) - Occupational Dermatitis",
    recentCase: "Topical emollient prescribed, occupational screening",
    status: "active",
  },
  {
    ashaId: "ASHA-TN-018",
    ashaName: "Shanthi Govindaraj",
    district: "Virudhunagar",
    locationName: "Sivakasi Rural Sub-centre",
    latitude: 9.4532,
    longitude: 77.7984,
    batteryLevel: 81,
    networkState: "4G",
    pendingSyncQueueSize: 0,
    lastUpdated: Date.now(),
    ward: "Sivakasi Ward 11",
    mobile: "+91 94860 33221",
    patientsAttended: 19,
    lastPatientName: "Sudha K. (30/F) - Thyroid Disorder",
    recentCase: "TSH 7.8 mIU/L, Thyroxine 50 mcg adherence follow-up",
    status: "active",
  },
  {
    ashaId: "ASHA-TN-019",
    ashaName: "Geetha Velusamy",
    district: "Thoothukudi",
    locationName: "Kovilpatti Semi-Arid Health Sub-centre",
    latitude: 9.1725,
    longitude: 77.8683,
    batteryLevel: 69,
    networkState: "4G",
    pendingSyncQueueSize: 1,
    lastUpdated: Date.now(),
    ward: "Kovilpatti West",
    mobile: "+91 97891 77654",
    patientsAttended: 15,
    lastPatientName: "Muthuraj S. (47/M) - Uncontrolled Hypertension",
    recentCase: "BP 158/98 mmHg, stepped up to Amlodipine 10mg",
    status: "active",
  },
  {
    ashaId: "ASHA-TN-020",
    ashaName: "Poongodi Manickam",
    district: "Villupuram",
    locationName: "Tindivanam Highway Corridor Post",
    latitude: 12.2312,
    longitude: 79.6542,
    batteryLevel: 86,
    networkState: "5G",
    pendingSyncQueueSize: 0,
    lastUpdated: Date.now(),
    ward: "Tindivanam Ward 7",
    mobile: "+91 98431 88776",
    patientsAttended: 22,
    lastPatientName: "Baby Dhanush (2/M) - Acute Gastroenteritis",
    recentCase: "Oral Rehydration Salts (ORS) + Zinc therapy started",
    status: "active",
  },
];

interface LiveMapProps {
  height?: string;
  selectedWorkerId?: string | null;
  onSelectWorker?: (worker: TamilNaduAshaWorker) => void;
  showSosAlerts?: boolean;
  onSelectSosAlert?: (alert: SOSAlertDoc) => void;
  className?: string;
}

export default function LiveMap({
  height = "380px",
  selectedWorkerId = null,
  onSelectWorker,
  showSosAlerts = true,
  className = "",
}: LiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const sosMarkersRef = useRef<Record<string, L.Marker>>({});

  const [workers, setWorkers] = useState<TamilNaduAshaWorker[]>(TAMIL_NADU_ASHA_WORKERS);
  const [sosAlerts, setSosAlerts] = useState<SOSAlertDoc[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<TamilNaduAshaWorker | null>(null);

  // Subscribe to frontline_workers in real time via Firestore and merge
  useEffect(() => {
    const unsub = subscribeFrontlineWorkers((updatedWorkers) => {
      if (updatedWorkers.length > 0) {
        // Merge live Firestore workers with Tamil Nadu default workers
        const merged: TamilNaduAshaWorker[] = [...TAMIL_NADU_ASHA_WORKERS];
        updatedWorkers.forEach((uw) => {
          const idx = merged.findIndex((m) => m.ashaId === uw.ashaId);
          const enriched: TamilNaduAshaWorker = {
            ...uw,
            district: (uw as any).district || "Tamil Nadu",
            locationName: (uw as any).locationName || uw.ward || "Field Sub-Centre",
            patientsAttended: (uw as any).patientsAttended || 15,
            lastPatientName: (uw as any).lastPatientName || "Attended Patient",
            recentCase: (uw as any).recentCase || "Health Screening & Vitals Sync",
          };
          if (idx >= 0) {
            merged[idx] = enriched;
          } else {
            merged.unshift(enriched);
          }
        });
        setWorkers(merged);
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to sos_alerts in real time via Firestore
  useEffect(() => {
    if (!showSosAlerts) return;
    const unsub = subscribeSOSAlerts((updatedAlerts) => {
      setSosAlerts(updatedAlerts);
    });
    return () => unsub();
  }, [showSosAlerts]);

  // Initialize Leaflet map centered on Tamil Nadu
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Geographic center of Tamil Nadu: [11.0598, 78.3874]
      const map = L.map(mapContainerRef.current, {
        center: [11.0598, 78.3874],
        zoom: 7.2,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | SeVaSetu Tamil Nadu Telemetry',
        maxZoom: 18,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Automatically fit bounds to all Tamil Nadu workers
      const points: [number, number][] = TAMIL_NADU_ASHA_WORKERS.map((w) => [w.latitude, w.longitude]);
      if (points.length > 0) {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [30, 30] });
      }

      // Invalidate size after mount so tiles load immediately
      setTimeout(() => {
        map.invalidateSize();
      }, 150);
      setTimeout(() => {
        map.invalidateSize();
      }, 500);
    }

    const resizeObserver = new ResizeObserver(() => {
      mapInstanceRef.current?.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersRef.current = {};
        sosMarkersRef.current = {};
      }
    };
  }, []);

  // Update ASHA worker markers when workers state changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentMarkerIds = new Set<string>();

    workers.forEach((worker) => {
      if (worker.latitude == null || worker.longitude == null) return;
      currentMarkerIds.add(worker.ashaId);

      const isSelected = selectedWorkerId === worker.ashaId || selectedWorker?.ashaId === worker.ashaId;

      // Battery color
      const batteryBg =
        worker.batteryLevel >= 50
          ? "bg-emerald-500"
          : worker.batteryLevel >= 20
          ? "bg-amber-500"
          : "bg-red-500";

      // Network badge
      const isOnline = worker.networkState !== "OFFLINE";
      const networkBadge = isOnline ? worker.networkState : "OFFLINE";

      // Custom HTML Marker with visible worker name pill
      const iconHtml = `
        <div class="relative group cursor-pointer flex flex-col items-center" style="transform: translate(-50%, -100%);">
          <!-- Outer Pulsing Ring for Active Responders -->
          <div class="absolute top-2 w-8 h-8 bg-blue-500/25 rounded-full animate-ping pointer-events-none"></div>
          
          <!-- Name Tag on Top -->
          <div class="mb-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold font-sans shadow-md border whitespace-nowrap transition-all ${
            isSelected
              ? "bg-blue-600 text-white border-blue-700 ring-2 ring-blue-300"
              : "bg-white/95 text-slate-800 border-slate-300 group-hover:bg-blue-50 group-hover:text-blue-700"
          }">
            ${worker.ashaName}
          </div>

          <!-- Pin Icon Body -->
          <div class="relative flex items-center justify-center w-8 h-8 rounded-full shadow-lg border-2 ${
            isSelected
              ? "border-white bg-blue-600 scale-110 ring-3 ring-blue-400"
              : "border-white bg-gradient-to-tr from-sky-600 to-blue-700 hover:scale-110"
          } text-white transition-all">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            
            <!-- Battery Indicator dot -->
            <div class="absolute -top-1 -right-1 w-3 h-3 rounded-full border border-white ${batteryBg}" title="Battery ${worker.batteryLevel}%"></div>
          </div>

          <!-- Pointer Triangle -->
          <div class="w-2 h-2 -mt-1 bg-blue-700 rotate-45 shadow-sm"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "custom-asha-marker",
        html: iconHtml,
        iconSize: [80, 56],
        iconAnchor: [40, 56],
        popupAnchor: [0, -56],
      });

      // Rich Popup content explicitly showing Worker Name, Location, and Patients Attended
      const popupContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 250px; padding: 2px;">
          <!-- Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px;">
            <div>
              <div style="font-weight: 800; font-size: 15px; color: #0f172a; line-height: 1.2;">
                ${worker.ashaName}
              </div>
              <div style="font-size: 11px; font-weight: 600; color: #2563eb; font-family: monospace;">
                ${worker.ashaId} · ${worker.district} District
              </div>
            </div>
            <span style="font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 9999px; background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;">
              ACTIVE
            </span>
          </div>

          <!-- Key Details Grid -->
          <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11.5px; margin-bottom: 10px;">
            <div style="background-color: #f1f5f9; padding: 6px 8px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <span style="color: #64748b; font-weight: 600;">📍 Location:</span>
              <div style="font-weight: 700; color: #1e293b; margin-top: 2px;">
                ${worker.locationName}
              </div>
            </div>

            <div style="background-color: #ecfdf5; padding: 6px 8px; border-radius: 8px; border: 1px solid #a7f3d0;">
              <span style="color: #047857; font-weight: 600;">👥 Patients Attended:</span>
              <div style="font-weight: 800; font-size: 13px; color: #065f46; margin-top: 1px;">
                ${worker.patientsAttended} Patients today
              </div>
              <div style="font-size: 10.5px; color: #047857; margin-top: 2px;">
                <b>Recent:</b> ${worker.lastPatientName}
              </div>
            </div>

            <div style="background-color: #f8fafc; padding: 5px 8px; border-radius: 6px; font-size: 11px; color: #475569;">
              <span style="color: #64748b;">Clinical Action:</span> ${worker.recentCase}
            </div>
          </div>

          <!-- Telemetry Footer -->
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 10.5px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 6px;">
            <span>🔋 Battery: <b>${worker.batteryLevel}%</b></span>
            <span>📶 Network: <b>${networkBadge}</b></span>
            <span>📞 <b>${worker.mobile || "N/A"}</b></span>
          </div>
        </div>
      `;

      if (markersRef.current[worker.ashaId]) {
        const existingMarker = markersRef.current[worker.ashaId];
        existingMarker.setLatLng([worker.latitude, worker.longitude]);
        existingMarker.setIcon(customIcon);
        existingMarker.setPopupContent(popupContent);
      } else {
        const marker = L.marker([worker.latitude, worker.longitude], { icon: customIcon })
          .addTo(map)
          .bindPopup(popupContent);

        marker.on("click", () => {
          setSelectedWorker(worker);
          onSelectWorker?.(worker);
        });

        markersRef.current[worker.ashaId] = marker;
      }
    });

    // Remove obsolete markers
    Object.keys(markersRef.current).forEach((id) => {
      if (!currentMarkerIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });
  }, [workers, selectedWorkerId, selectedWorker, onSelectWorker]);

  // Recenter and fit bounds
  const handleFitBounds = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const points: [number, number][] = workers
      .filter((w) => w.latitude && w.longitude)
      .map((w) => [w.latitude, w.longitude]);

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
    }
  };

  // Fly to worker on click from bottom bar
  const handleFlyToWorker = (worker: TamilNaduAshaWorker) => {
    const map = mapInstanceRef.current;
    if (!map || !worker.latitude || !worker.longitude) return;

    setSelectedWorker(worker);
    map.flyTo([worker.latitude, worker.longitude], 12, { duration: 1.2 });

    const marker = markersRef.current[worker.ashaId];
    if (marker) {
      setTimeout(() => marker.openPopup(), 1200);
    }
    onSelectWorker?.(worker);
  };

  const totalPatientsAttended = workers.reduce((sum, w) => sum + (w.patientsAttended || 0), 0);
  const activeWorkersCount = workers.filter((w) => w.networkState !== "OFFLINE").length;

  return (
    <div className={`relative bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col ${className}`}>
      {/* Top Map Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-gradient-to-r from-slate-50 via-white to-sky-50 border-b border-slate-200 z-10">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-100 text-sky-800 rounded-lg text-xs font-display font-bold">
            <Radio size={13} className="animate-pulse text-sky-600" />
            Tamil Nadu ASHA Telemetry Grid
          </div>
          <span className="text-[11px] text-slate-500 font-sans hidden md:inline">
            Live GPS tracking across <b>{workers.length}</b> field centres
          </span>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {activeWorkersCount} Active in TN
          </div>

          <div className="hidden sm:flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold">
            <UserCheck size={11} className="text-blue-600" />
            {totalPatientsAttended} Patients Attended
          </div>

          <button
            onClick={handleFitBounds}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            title="Fit Tamil Nadu Map Bounds"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* Map Element Container */}
      <div className="relative w-full" style={{ height: height, minHeight: height }}>
        <div ref={mapContainerRef} className="w-full h-full z-0" style={{ height: "100%", width: "100%" }} />

        {/* Floating Quick Worker Carousel Overlay at Bottom */}
        <div className="absolute bottom-2 left-2 right-2 z-10 flex gap-2 overflow-x-auto pb-1 pointer-events-auto">
          {workers.map((worker) => {
            const isSelected = selectedWorker?.ashaId === worker.ashaId;

            return (
              <button
                key={worker.ashaId}
                onClick={() => handleFlyToWorker(worker)}
                className={`flex-shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-xl backdrop-blur-md transition-all cursor-pointer shadow-md text-left ${
                  isSelected
                    ? "bg-blue-600 text-white ring-2 ring-blue-300 scale-102"
                    : "bg-white/95 text-slate-800 border border-slate-200 hover:bg-white"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10.5px] font-display font-bold flex-shrink-0 ${
                    isSelected ? "bg-white/20 text-white" : "bg-sky-100 text-sky-700"
                  }`}
                >
                  {worker.ashaName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <div className="text-[11.5px] font-display font-bold leading-tight truncate max-w-[120px]">
                    {worker.ashaName}
                  </div>
                  <div className="text-[9.5px] opacity-90 truncate max-w-[120px] text-slate-500">
                    {worker.district} · {worker.patientsAttended} pts
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
