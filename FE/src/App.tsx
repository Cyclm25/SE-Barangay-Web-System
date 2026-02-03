import { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardHome } from './components/dashboard/DashboardHome';
import { ResidentRecords } from './components/dashboard/ResidentRecords';
import { BarangayOfficials } from './components/dashboard/BarangayOfficials';
import { OnlineRequests } from './components/dashboard/OnlineRequests';
import { AnnouncementManagement } from './components/dashboard/AnnouncementManagement';
import { TransactionHistory } from './components/dashboard/TransactionHistory';
import { LoginPage } from './components/auth/LoginPage';
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage';
import { SetNewPasswordPage } from './components/auth/SetNewPasswordPage';
import { ResidentPortal } from './components/resident/ResidentPortal';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  // Roles mapped to match your ERD instructions exactly
  role: 'admin' | 'official' | 'resident';
}

type ActiveTab = 'dashboard' | 'residents' | 'officials' | 'requests' | 'announcements' | 'transactions';
type AuthView = 'login' | 'forgot-password' | 'set-new-password' | 'dashboard';

export default function App() {
  const [authView, setAuthView] = useState<AuthView>('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [user, setUser] = useState<User | null>(null);

  const handleLoginSuccess = (username: string, roleFromDb: string, firstName: string) => {
    // Bridges Database strings to Frontend roles based on your ERD
    let normalizedRole: 'admin' | 'official' | 'resident';
    const dbRole = roleFromDb.toLowerCase().trim();

    if (dbRole === 'superadmin') {
      normalizedRole = 'admin'; // ERD SuperAdmin -> System Admin
    } else if (dbRole === 'admin') {
      normalizedRole = 'official'; // ERD BarangayAdmin -> System Official
    } else {
      normalizedRole = 'resident';
    }
    
    setUser({
      id: username,
      name: firstName,
      role: normalizedRole
    });
    
    setIsAuthenticated(true);
    setAuthView('dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthView('login');
    setActiveTab('dashboard');
    setUser(null);
    toast.success('Logged out successfully.');
  };

  const renderMainContent = () => {
    if (!user) return null;

    switch (activeTab) {
      case 'dashboard': 
        return <DashboardHome adminName={user.name} />;
      case 'residents': 
        return <ResidentRecords />;
      case 'officials': 
        // Admin-only access for managing official profiles
        return user.role === 'admin' ? <BarangayOfficials /> : <DashboardHome adminName={user.name} />;
      case 'requests': 
        return <OnlineRequests />;
      case 'announcements': 
        return <AnnouncementManagement />;
      case 'transactions': 
        // Admin-only access for financial auditing
        return user.role === 'admin' ? <TransactionHistory /> : <DashboardHome adminName={user.name} />;
      default: 
        return <DashboardHome adminName={user.name} />;
    }
  };

  // AUTHENTICATION VIEWS: Support for your new Split-Screen Landing Page
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white">
        {authView === 'login' && (
          <LoginPage 
            onLoginSuccess={handleLoginSuccess}
            onForgotPassword={() => setAuthView('forgot-password')}
          />
        )}
        {authView === 'forgot-password' && (
          <ForgotPasswordPage onBack={() => setAuthView('login')} onOTPVerified={() => setAuthView('set-new-password')} />
        )}
        {authView === 'set-new-password' && (
          <SetNewPasswordPage onPasswordReset={() => { toast.success('Password reset!'); setAuthView('login'); }} />
        )}
        <Toaster position="top-right" />
      </div>
    );
  }

  // RESIDENT PORTAL VIEW
  if (user?.role === 'resident') {
    return (
      <>
        <ResidentPortal residentName={user.name} onLogout={handleLogout} />
        <Toaster position="top-right" />
      </>
    );
  }

  // MANAGEMENT DASHBOARD (Admin & Official)
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