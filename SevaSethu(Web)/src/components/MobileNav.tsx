import { useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { Role } from "../auth/authService";
import { ViewType } from "../types";
import { useAuth } from "../auth/AuthContext";

const ICON_PATHS: Record<string, string> = {
  dashboard:          "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  patients:           "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  triage:             "M22 12h-4l-3 9L9 3l-3 9H2",
  referrals:          "M18 8l4 4-4 4M6 8l-4 4 4 4M14 4l-4 16",
  appointments:       "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  asha:               "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8",
  "admin-doctors":    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8",
  "admin-appointments": "M8 2v4M16 2v4M3 10h18",
  inventory:          "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8",
  followups:          "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4",
  sos:                "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  reports:            "M18 20V10M12 20V4M6 20v-6",
  settings:           "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  "design-system":    "M12 2L2 7l10 5 10-5-10-5z",
  menu:               "M4 7h16M4 12h16M4 17h16",
  close:              "M6 6l12 12M18 6L6 18",
};

function Icon({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICON_PATHS[id] ?? ICON_PATHS["dashboard"]} />
    </svg>
  );
}

function BridgeMark() {
  return (
    <svg viewBox="0 0 30 30" width="24" height="24" aria-hidden>
      <rect width="30" height="30" rx="6" fill="#0b7a75" />
      <path d="M5 21 Q15 5 25 21" fill="none" stroke="#ffffff" strokeWidth="3.2" />
      <rect x="4" y="21" width="22" height="3.2" fill="#ffffff" />
    </svg>
  );
}

const ALL_NAV = [
  { id: "dashboard" as ViewType, label: "Dashboard",     roles: ["ADMIN", "DOCTOR"] },
  { id: "patients"  as ViewType, label: "Patients",      roles: ["ADMIN", "DOCTOR"] },
  { id: "triage"    as ViewType, label: "Triage",        roles: ["DOCTOR"] },
  { id: "referrals" as ViewType, label: "Referrals",     roles: ["DOCTOR"] },
  { id: "appointments" as ViewType, label: "My Queue",   roles: ["DOCTOR"] },
  { id: "admin-appointments" as ViewType, label: "Appointments", roles: ["ADMIN"] },
  { id: "asha"      as ViewType, label: "ASHA Workers",  roles: ["ADMIN"] },
  { id: "admin-doctors" as ViewType, label: "Doctors",   roles: ["ADMIN"] },
  { id: "inventory" as ViewType, label: "Inventory",     roles: ["ADMIN"] },
  { id: "followups" as ViewType, label: "Follow-ups",    roles: ["DOCTOR"] },
  { id: "sos"       as ViewType, label: "SOS",           roles: ["DOCTOR"] },
  { id: "reports"   as ViewType, label: "Reports",       roles: ["ADMIN", "DOCTOR"] },
  { id: "settings"  as ViewType, label: "Settings",      roles: ["ADMIN", "DOCTOR"] },
];

interface MobileNavProps {
  activeView: ViewType;
  onNavigate: (v: ViewType) => void;
  role: Role;
}

export default function MobileNav({ activeView, onNavigate, role }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const items = ALL_NAV.filter((n) => n.roles.includes(role));

  return (
    <MotionConfig reducedMotion="user">
      {/* Mobile sticky header bar */}
      <header
        className="sticky top-0 z-40 flex h-14 items-center gap-3 px-3 lg:hidden"
        style={{ background: "#0b2a3c" }}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Menu"
          className="grid h-10 w-10 place-items-center rounded-lg text-white hover:bg-white/10 transition-colors"
        >
          <Icon id={open ? "close" : "menu"} />
        </button>
        <BridgeMark />
        <span className="text-sm font-black uppercase tracking-tight text-white truncate">
          SeVaSetu PHC
        </span>
        <span className="ml-auto text-xs font-bold text-[#9fe5cf] tabular-nums">
          {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}
        </span>
      </header>

      {/* Slide-down mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-x-0 bottom-0 top-14 z-40 flex flex-col overflow-y-auto pt-4 pb-6 lg:hidden"
            style={{ background: "#0b2a3c" }}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <div className="px-2 flex flex-col gap-0.5">
              {items.map((n) => {
                const active = activeView === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => { onNavigate(n.id); setOpen(false); }}
                    className={`relative flex h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-bold transition-colors ${
                      active ? "text-[#0b2a3c]" : "text-[#c9d2d9] hover:bg-[#133a53] hover:text-white"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="mobile-nav-pill"
                        className="absolute inset-0 rounded-xl bg-[#9fe5cf]"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-3">
                      <Icon id={n.id} />
                      {n.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sign-out */}
            <div className="mt-auto px-3">
              <div className="flex items-center gap-3 rounded-xl bg-[#113650] p-2.5 mt-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#0b7a75] text-sm font-black text-white">
                  {(user?.name || user?.email || "?").charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-white">{user?.name || user?.email}</span>
                  <span className="block text-[11px] text-[#7a98a8] capitalize">
                    {user?.role === "ADMIN" ? "PHC Administrator" : "Medical Officer"}
                  </span>
                </span>
                <button
                  onClick={logout}
                  className="grid h-9 w-9 place-items-center rounded-lg text-[#c9d2d9] hover:bg-[#1c4a60] transition-colors"
                  aria-label="Sign out"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
