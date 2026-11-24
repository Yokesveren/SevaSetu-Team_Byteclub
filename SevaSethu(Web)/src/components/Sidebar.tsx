import { motion, MotionConfig } from "motion/react";
import { type LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Activity,
  ArrowRightLeft,
  Calendar,
  UserCheck,
  Package,
  ClipboardList,
  Siren,
  BarChart2,
  Settings,
  Palette,
  LogOut,
  Usb,
} from "lucide-react";
import { Role } from "../auth/authService";
import { ViewType } from "../types";
import { useAuth } from "../auth/AuthContext";
import { useOfflineMode } from "../services/OfflineModeContext";

/* ── SVG icon paths for mini sidebar icons ─────────────────────── */
const ICON_PATHS: Record<string, string> = {
  dashboard: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  patients:  "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  triage:    "M22 12h-4l-3 9L9 3l-3 9H2",
  referrals: "M18 8l4 4-4 4M6 8l-4 4 4 4M14 4l-4 16",
  appointments: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  asha:      "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  "admin-doctors": "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  "admin-appointments": "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  inventory: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  followups: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
  sos:       "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  reports:   "M18 20V10M12 20V4M6 20v-6",
  settings:  "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  "design-system": "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  out:       "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
  // ── DeadDrop icon paths ──────────────────────────────────────────
  "dd-overview":           "M12 2L2 7l10 5 10-5-10-5M2 17l10 5 10-5M2 12l10 5 10-5",
  "dd-missing-persons":    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 11l-4 4 4 4",
  "dd-shelter-occupancy":  "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
  "dd-supply-ledger":      "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  "dd-field-nodes":        "M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01",
  "dd-crypto-audit":       "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
};

function SvgIcon({ id }: { id: string }) {
  const d = ICON_PATHS[id] ?? ICON_PATHS["dashboard"];
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

/* ── SevaSetu bridge mark ─────────────────────────────────────────── */
function BridgeMark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 30 30" width={size} height={size} aria-hidden>
      <rect width="30" height="30" rx="6" fill="#0b7a75" />
      <path d="M5 21 Q15 5 25 21" fill="none" stroke="#ffffff" strokeWidth="3.2" />
      <rect x="4" y="21" width="22" height="3.2" fill="#ffffff" />
    </svg>
  );
}

interface NavItem {
  id: ViewType;
  label: string;
  badge?: number;
  badgeColor?: "red" | "amber" | "blue";
  roles: Role[];
}

const DD_NAV_ITEMS: NavItem[] = [
  { id: "dd-overview",          label: "Command Center",    roles: ["ADMIN", "DOCTOR"] },
  { id: "dd-missing-persons",   label: "Missing Persons",   roles: ["ADMIN", "DOCTOR"] },
  { id: "dd-shelter-occupancy", label: "Shelter Grid",      roles: ["ADMIN", "DOCTOR"] },
  { id: "dd-supply-ledger",     label: "Supply Ledger",     roles: ["ADMIN", "DOCTOR"] },
  { id: "dd-field-nodes",       label: "Field Nodes",       roles: ["ADMIN", "DOCTOR"] },
  { id: "dd-crypto-audit",      label: "Crypto & Audit",    roles: ["ADMIN", "DOCTOR"] },
];

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard",           label: "Dashboard",      roles: ["ADMIN", "DOCTOR"] },
  { id: "patients",            label: "Patients",       roles: ["ADMIN", "DOCTOR"] },
  { id: "triage",              label: "Triage & Cases", roles: ["DOCTOR"] },
  { id: "referrals",           label: "Referrals",      badge: 6, badgeColor: "blue",  roles: ["DOCTOR"] },
  { id: "appointments",        label: "My Queue",       roles: ["DOCTOR"] },
  { id: "admin-appointments",  label: "Appointments",   roles: ["ADMIN"] },
  { id: "asha",                label: "ASHA Workers",   roles: ["ADMIN"] },
  { id: "admin-doctors",       label: "Doctors",        roles: ["ADMIN"] },
  { id: "inventory",           label: "Inventory",      badge: 3, badgeColor: "amber", roles: ["ADMIN"] },
  { id: "followups",           label: "Follow-ups",     roles: ["DOCTOR"] },
  { id: "sos",                 label: "SOS / Emergency",badge: 1, badgeColor: "red",   roles: ["DOCTOR"] },
  { id: "reports",             label: "Reports",        roles: ["ADMIN", "DOCTOR"] },
];

const BOTTOM_ITEMS: NavItem[] = [
  { id: "settings",      label: "Settings",      roles: ["ADMIN", "DOCTOR"] },
  { id: "design-system", label: "Design System", roles: ["ADMIN"] },
];

const BADGE_CLS: Record<string, string> = {
  red:   "bg-red-500 text-white",
  amber: "bg-amber-500 text-white",
  blue:  "bg-[#0b7a75] text-white",
};

interface SidebarProps {
  activeView: ViewType;
  onNavigate: (view: ViewType) => void;
  role: Role;
}

function NavPill({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: (v: ViewType) => void;
}) {
  const isSOS = item.id === "sos";
  return (
    <button
      onClick={() => onNavigate(item.id)}
      aria-current={active ? "page" : undefined}
      className={`relative w-full flex items-center gap-3 h-10 rounded-xl px-3 text-[13.5px] font-bold transition-colors ${
        active
          ? "text-[#0b2a3c]"
          : isSOS && item.badge
          ? "text-red-300 hover:text-red-100"
          : "text-[#c9d2d9] hover:bg-[#133a53] hover:text-white"
      }`}
    >
      {/* Animated mint pill for active state */}
      {active && (
        <motion.span
          layoutId="sidebar-nav-pill"
          className="absolute inset-0 rounded-xl bg-[#9fe5cf]"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-3 w-full">
        <span
          className={
            active
              ? "text-[#0b2a3c]"
              : isSOS && item.badge
              ? "text-red-400"
              : "text-[#7a98a8]"
          }
        >
          <SvgIcon id={item.id} />
        </span>
        <span className="flex-1 text-left leading-none">{item.label}</span>
        {item.badge !== undefined && (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none flex-shrink-0 ${
              BADGE_CLS[item.badgeColor || "blue"]
            }`}
          >
            {item.badge}
          </span>
        )}
      </span>
    </button>
  );
}

export default function Sidebar({ activeView, onNavigate, role }: SidebarProps) {
  const { user, logout } = useAuth();
  const { offlineEnabled, toggleOffline, status: espStatus } = useOfflineMode();
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });

  const ddItems = DD_NAV_ITEMS.filter((n) => n.roles.includes(role));
  const main   = NAV_ITEMS.filter((n) => n.roles.includes(role));
  const bottom = BOTTOM_ITEMS.filter((n) => n.roles.includes(role));

  const isDeadDropActive = (activeView as string).startsWith("dd-");

  return (
    <MotionConfig reducedMotion="user">
      <aside
        className="sidebar-root flex-shrink-0 hidden lg:flex flex-col overflow-y-auto"
        style={{ width: "248px" }}
        aria-label="Primary navigation"
      >
        {/* Logo mark */}
        <div className="flex items-center gap-3 px-4 pt-5 mb-4">
          {isDeadDropActive ? (
            /* DeadDrop hexagon mark */
            <svg viewBox="0 0 30 30" width={30} height={30} aria-hidden>
              <polygon points="15,2 27,8.5 27,21.5 15,28 3,21.5 3,8.5" fill="#EF4444" />
              <text x="15" y="20" textAnchor="middle" fill="white" fontSize="11" fontWeight="900">⬡</text>
            </svg>
          ) : (
            <BridgeMark size={30} />
          )}
          <div>
            <span className="text-[17px] font-black uppercase tracking-[-0.04em] text-white leading-none block">
              {isDeadDropActive ? "DeadDrop HQ" : "SeVaSetu"}
            </span>
            <span className="text-[10px] text-[#7a98a8] leading-none tracking-wide">
              {isDeadDropActive ? "Emergency Command" : "ಸೇವಾಸೇತು · PHC Portal"}
            </span>
          </div>
        </div>

        {/* Online indicator */}
        <div className="px-3 mb-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 animate-pulse" />
            <span className="text-[11px] text-[#c9d2d9]">System Online</span>
            <span className="ml-auto text-[10px] font-mono text-[#7a98a8]">{timeStr}</span>
          </div>
        </div>

        {/* Offline Mode toggle */}
        <div className="px-3 mb-4">
          <button
            onClick={toggleOffline}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer text-[11.5px] font-display font-bold ${
              offlineEnabled
                ? "bg-[#0b7a75]/20 border-[#0b7a75]/40 text-[#9fe5cf]"
                : "bg-white/5 border-white/8 text-[#7a98a8] hover:text-[#c9d2d9]"
            }`}
          >
            <Usb size={13} className={offlineEnabled ? "text-[#9fe5cf]" : "text-[#7a98a8]"} />
            <span className="flex-1 text-left">Offline Mode</span>
            <span className={`w-7 h-4 rounded-full flex items-center transition-colors ${offlineEnabled ? "bg-[#0b7a75] justify-end" : "bg-white/10 justify-start"}`}>
              <span className="w-3 h-3 rounded-full bg-white mx-0.5 shadow" />
            </span>
          </button>
          {offlineEnabled && espStatus === "connected" && (
            <div className="flex items-center gap-1.5 mt-1.5 px-1 text-[10px] text-[#9fe5cf]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9fe5cf] animate-pulse" />
              ESP32 Connected
            </div>
          )}
          {offlineEnabled && espStatus === "error" && (
            <div className="flex items-center gap-1.5 mt-1.5 px-1 text-[10px] text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              Serial Error
            </div>
          )}
        </div>

        {/* ── DeadDrop HQ Section ────────────────────────────────────── */}
        <div className="px-2 mb-1">
          <div className="flex items-center gap-2 px-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            <p className="text-[10px] font-bold tracking-widest text-red-400 uppercase">
              ⬡ DeadDrop HQ
            </p>
          </div>
          <nav className="flex flex-col gap-0.5">
            {ddItems.map((item) => (
              <NavPill
                key={item.id}
                item={item}
                active={activeView === item.id}
                onNavigate={onNavigate}
              />
            ))}
          </nav>
        </div>

        {/* Divider */}
        <div className="mx-3 my-3 border-t border-white/10" />

        {/* Main nav — SevaSethu */}
        <div className="px-2 mb-1">
          <p className="text-[10px] font-bold tracking-widest text-[#7a98a8] uppercase px-2 mb-2">
            SeVaSetu PHC
          </p>
          <nav className="flex flex-col gap-0.5">
            {main.map((item) => (
              <NavPill
                key={item.id}
                item={item}
                active={activeView === item.id}
                onNavigate={onNavigate}
              />
            ))}
          </nav>
        </div>

        {/* Divider */}
        <div className="mx-3 my-3 border-t border-white/10" />

        {/* Bottom nav */}
        <div className="px-2">
          <nav className="flex flex-col gap-0.5">
            {bottom.map((item) => (
              <NavPill
                key={item.id}
                item={item}
                active={activeView === item.id}
                onNavigate={onNavigate}
              />
            ))}
          </nav>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User card */}
        <div className="px-3 pb-5">
          <div className="flex items-center gap-3 rounded-xl bg-[#113650] p-2.5">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#0b7a75] text-sm font-black text-white"
              aria-hidden
            >
              {(user?.name || user?.email || "?").charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-white leading-tight">
                {user?.name || user?.email || "Staff"}
              </span>
              <span className="block text-[11px] text-[#7a98a8] capitalize">
                {user?.role === "ADMIN" ? "PHC Administrator" : "Medical Officer"}
              </span>
            </span>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={logout}
              className="grid h-9 w-9 place-items-center rounded-lg text-[#c9d2d9] hover:bg-[#1c4a60] hover:text-white transition-colors"
              aria-label="Sign out"
              title="Sign out"
            >
              <SvgIcon id="out" />
            </motion.button>
          </div>

          {/* NHM Karnataka branding */}
          <div className="mt-2.5 px-1">
            <p className="text-[9px] text-[#56636b] leading-tight">
              National Health Mission · Karnataka
            </p>
            <p className="text-[9px] font-mono text-emerald-500 mt-0.5">
              ABDM · HMIS · FHIR R4 Compliant
            </p>
          </div>
        </div>
      </aside>
    </MotionConfig>
  );
}
