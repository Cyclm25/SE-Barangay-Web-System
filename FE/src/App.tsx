import { useState, useEffect } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { DashboardHome } from "./components/dashboard/DashboardHome";
import { ResidentRecords } from "./components/dashboard/ResidentRecords";
import { BarangayOfficials } from "./components/dashboard/BarangayOfficials";
import { OnlineRequests } from "./components/dashboard/OnlineRequests";
import { AnnouncementManagement } from "./components/dashboard/AnnouncementManagement";
import { TransactionHistory } from "./components/dashboard/TransactionHistory";
import { LoginPage } from "./components/auth/LoginPage";
import  ForgotPasswordPage  from "./components/auth/ForgotPasswordPage";
import { SetNewPasswordPage } from "./components/auth/SetNewPasswordPage";
import { ResidentPortal } from "./components/resident/ResidentPortal";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  role: "admin" | "official" | "resident";
}

type ActiveTab =
  | "dashboard"
  | "residents"
  | "officials"
  | "requests"
  | "announcements"
  | "transactions";

type AuthView = "login" | "forgot-password" | "set-new-password" | "dashboard";

type ResetIdentity = {
  type: "resident" | "barangayadmin";
  email: string;
  firstName: string;
  username: string;
};

type ResetState = {
  residentAccountId: number;
  otpCode: string;
  identity: ResetIdentity;
};

export default function App() {
  const [authView, setAuthView] = useState<AuthView>("login");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [user, setUser] = useState<User | null>(null);

  const [resetState, setResetState] = useState<ResetState | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("app_user");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setIsAuthenticated(true);
      setAuthView("dashboard");
    }
  }, []);

  const handleLoginSuccess = (username: string, roleFromDb: string, firstName: string) => {
    let normalizedRole: "admin" | "official" | "resident";

    const dbRole = roleFromDb.toLowerCase().replace(/\s+/g, "").trim();

    if (dbRole === "superadmin") {
      normalizedRole = "admin";
    } else if (dbRole === "barangayadmin" || dbRole === "admin") {
      normalizedRole = "official";
    } else {
      normalizedRole = "resident";
    }

    const userData: User = {
      id: username,
      name: firstName,
      role: normalizedRole,
    };

    setUser(userData);
    setIsAuthenticated(true);
    setAuthView("dashboard");

    localStorage.setItem("app_user", JSON.stringify(userData));
    toast.success(`Welcome back, ${firstName}!`);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthView("login");
    setActiveTab("dashboard");
    setUser(null);
    localStorage.removeItem("app_user");
    toast.success("Logged out successfully.");
  };

  const renderMainContent = () => {
    if (!user) return null;

    switch (activeTab) {
      case "dashboard":
        return <DashboardHome adminName={user.name} />;
      case "residents":
        return <ResidentRecords />;
      case "officials":
        return user.role === "admin" ? <BarangayOfficials /> : <DashboardHome adminName={user.name} />;
      case "requests":
        return <OnlineRequests />;
      case "announcements":
        return <AnnouncementManagement />;
      case "transactions":
        return user.role === "admin" ? <TransactionHistory /> : <DashboardHome adminName={user.name} />;
      default:
        return <DashboardHome adminName={user.name} />;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white">
        {authView === "login" && (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onForgotPassword={() => {
              setResetState(null);
              setAuthView("forgot-password");
            }}
          />
        )}

        {authView === "forgot-password" && (
          <ForgotPasswordPage
            onBack={() => {
              setResetState(null);
              setAuthView("login");
            }}
            onOTPVerified={(payload) => {
              setResetState(payload);
              setAuthView("set-new-password");
            }}
          />
        )}

        {authView === "set-new-password" && (
          <SetNewPasswordPage
            residentAccountId={resetState?.residentAccountId || 0}
            otpCode={resetState?.otpCode || ""}
            identity={
              resetState?.identity || { type: "resident", email: "", firstName: "", username: "" }
            }
            onPasswordReset={() => {
              setResetState(null);
              toast.success("Password reset!");
              setAuthView("login");
            }}
          />
        )}

        <Toaster position="top-right" />
      </div>
    );
  }

  if (user?.role === "resident") {
    return (
      <>
        <ResidentPortal residentName={user.name} onLogout={handleLogout} />
        <Toaster position="top-right" />
      </>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50">
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as ActiveTab)}
        onLogout={handleLogout}
        adminName={user.name}
        adminId={user.id}
        userRole={user.role}
      />
      <div className="flex-1 overflow-auto">{renderMainContent()}</div>
      <Toaster position="top-right" />
    </div>
  );
}