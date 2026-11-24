import { useState, useEffect } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import GlobalSOSBanner from "./components/GlobalSOSBanner";
import MobileNav from "./components/MobileNav";
import Dashboard from "./views/Dashboard";
import Patients from "./views/Patients";
import Triage from "./views/Triage";
import Referrals from "./views/Referrals";
import Appointments from "./views/Appointments";
import AdminAppointments from "./views/AdminAppointments";
import ASHAWorkers from "./views/ASHAWorkers";
import AdminManagement from "./views/AdminManagement";
import Settings from "./views/Settings";
import Inventory from "./views/Inventory";
import SOS from "./views/SOS";
import Reports from "./views/Reports";
import Followups from "./views/Followups";
import DesignSystem from "./views/DesignSystem";
import Login from "./views/Login";
import RegisterAdmin from "./views/RegisterAdmin";
import RegisterDoctor from "./views/RegisterDoctor";
import WelcomeScreen from "./components/WelcomeScreen";
import { EmergencySOSModal, AshaConnectionApprovalModal } from "./components/DoctorNotificationModals";
import RealtimePatientModal from "./components/RealtimePatientModal";
import { LocalUplinkBanner } from "./components/LocalUplinkBanner";
import { useAuth } from "./auth/AuthContext";
import { ViewType } from "./types";
// DeadDrop HQ views
import DDOverview from "./views/deadDrop/Overview";
import DDMissingPersons from "./views/deadDrop/MissingPersons";
import DDShelterOccupancy from "./views/deadDrop/ShelterOccupancy";
import DDSupplyLedger from "./views/deadDrop/SupplyLedger";
import DDFieldNodes from "./views/deadDrop/FieldNodes";
import DDCryptoAudit from "./views/deadDrop/CryptoAudit";

/* ── Bridge mark (same as Sidebar, self-contained for the loader) ── */
function BridgeMark({ size = 48 }: { size?: number }) {
  return (
    <svg viewBox="0 0 30 30" width={size} height={size} aria-hidden>
      <rect width="30" height="30" rx="6" fill="#0b7a75" />
      <path d="M5 21 Q15 5 25 21" fill="none" stroke="#ffffff" strokeWidth="3.2" />
      <rect x="4" y="21" width="22" height="3.2" fill="#ffffff" />
    </svg>
  );
}

/* ── Branded loading screen ──────────────────────────────────────── */
function AppLoader({ message }: { message?: string }) {
  return (
    <div
      className="min-h-screen grid place-items-center p-6 text-white"
      style={{ background: "#0b2a3c" }}
    >
      <div className="flex flex-col items-center text-center">
        <motion.div
          animate={{ scale: [1, 1.14, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <BridgeMark size={52} />
        </motion.div>
        <p className="mt-6 text-2xl font-black uppercase tracking-[-0.04em]">
          {message ?? "Opening the dashboard"}
        </p>
        <p className="mt-2 text-sm text-[#7a98a8]">SeVaSetu · ಸೇವಾಸೇತು</p>
        <p className="mt-1 text-xs text-[#56636b]">
          PHC Portal · Karnataka Health Mission
        </p>
      </div>
    </div>
  );
}

/* ── Access denied / not active screens ─────────────────────────── */
function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 p-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mb-4">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#c4242a" strokeWidth="2">
          <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        </svg>
      </div>
      <h2 className="text-lg font-black uppercase tracking-tight text-red-700">Access Denied</h2>
      <p className="mt-1 text-sm text-[#56636b]">You do not have permission to access this area.</p>
    </div>
  );
}

function AccountNotActive() {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 p-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#d99a00" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </div>
      <h2 className="text-lg font-black uppercase tracking-tight text-amber-700">Account Not Active</h2>
      <p className="mt-1 text-sm text-[#56636b]">
        Please contact the PHC Administrator to activate your account.
      </p>
    </div>
  );
}

export default function App() {
  const { isAuthenticated, user } = useAuth();
  const [activeView, setActiveView] = useState<ViewType>("dd-overview");
  const [showWelcome, setShowWelcome] = useState(true);

  const navigate = (view: ViewType) => setActiveView(view);

  /* ── Auth / onboarding screens ──────────────────────────────── */
  if (!isAuthenticated || !user) {
    if (activeView === "register-admin")  return <RegisterAdmin  onNavigate={navigate} />;
    if (activeView === "register-doctor") return <RegisterDoctor onNavigate={navigate} />;
    if (showWelcome) return <WelcomeScreen onComplete={() => setShowWelcome(false)} />;
    return <Login onNavigate={navigate} onBackToWelcome={() => setShowWelcome(true)} />;
  }

  /* ── Route guard ─────────────────────────────────────────────── */
  const renderView = () => {
    const isAdminOnly = ["asha", "inventory", "admin-doctors", "admin-registrations", "admin-appointments"].includes(activeView);
    if (isAdminOnly && user.role !== "ADMIN") return <AccessDenied />;
    if (user.role === "DOCTOR" && user.status !== "Active") return <AccountNotActive />;

    switch (activeView) {
      // ── DeadDrop HQ ──────────────────────────────────────────────────────
      case "dd-overview":          return <DDOverview />;
      case "dd-missing-persons":   return <DDMissingPersons />;
      case "dd-shelter-occupancy": return <DDShelterOccupancy />;
      case "dd-supply-ledger":     return <DDSupplyLedger />;
      case "dd-field-nodes":       return <DDFieldNodes />;
      case "dd-crypto-audit":      return <DDCryptoAudit />;
      // ── SevaSethu PHC Portal ──────────────────────────────────────────────
      case "dashboard":           return <Dashboard onNavigate={navigate} />;
      case "patients":            return <Patients />;
      case "triage":              return <Triage />;
      case "referrals":           return <Referrals />;
      case "appointments":        return <Appointments />;
      case "admin-appointments":  return <AdminAppointments />;
      case "asha":                return <ASHAWorkers />;
      case "admin-doctors":       return <AdminManagement />;
      case "inventory":           return <Inventory />;
      case "followups":           return <Followups />;
      case "sos":                 return <SOS />;
      case "reports":             return <Reports />;
      case "design-system":       return <DesignSystem />;
      case "settings":            return <Settings />;
      default:                    return <DDOverview />;
    }
  };

  /* ── Authenticated shell ─────────────────────────────────────── */
  return (
    <MotionConfig reducedMotion="user">
      {/* Global modals / banners — sit outside the sheet so they span full viewport */}
      <GlobalSOSBanner onNavigate={navigate} />
      {(user.role === "DOCTOR" || user.role === "ADMIN") && (
        <>
          <EmergencySOSModal onNavigate={navigate} />
          <AshaConnectionApprovalModal onNavigate={navigate} />
          <RealtimePatientModal onNavigate={navigate} />
        </>
      )}

      {/*
        Outer div = dark navy "app-frame" (full viewport).
        On ≥1024px it becomes a 2-column grid: fixed sidebar + scrollable sheet.
        The sheet has 8px inset + 20px rounded corners — the Byteclub language.
      */}
      <div
        className="app-frame min-h-screen lg:grid"
        style={{ gridTemplateColumns: "248px minmax(0,1fr)" }}
      >
        {/* Desktop sidebar — sticky, full height */}
        <Sidebar activeView={activeView} onNavigate={navigate} role={user.role} />

        {/* White content sheet */}
        <div className="app-sheet flex flex-col min-w-0">
          {/* Local network uplink banner from mobile device */}
          <LocalUplinkBanner />

          {/* Sticky top header (inside the sheet) */}
          <Header onNavigate={navigate} />

          {/* Mobile nav bar */}
          <MobileNav activeView={activeView} onNavigate={navigate} role={user.role} />

          {/* Page content — animated on route change */}
          <main className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ type: "spring", stiffness: 280, damping: 28 }}
                className="h-full"
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </MotionConfig>
  );
}
