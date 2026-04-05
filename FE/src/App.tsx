import { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardHome } from './components/dashboard/DashboardHome';
import { ResidentRecords } from './components/dashboard/ResidentRecords';
import { BarangayOfficials } from './components/dashboard/BarangayOfficials';
import { OnlineRequests } from './components/dashboard/OnlineRequests';
import { AnnouncementManagement } from './components/dashboard/AnnouncementManagement';
import { TransactionHistory } from './components/dashboard/TransactionHistory';
import { LoginPage } from './components/auth/LoginPage';
import ForgotPassword from './components/auth/ForgotPasswordPage';
import { SetNewPasswordPage } from './components/auth/SetNewPasswordPage';
import { ResidentPortal } from './components/resident/ResidentPortal';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

// Helper: Get default cutoff date (30 days ago)
const getDefaultCutoffDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
};

// Helper: Load cutoff date from localStorage or use default
const loadCutoffDate = () => {
  const saved = localStorage.getItem('registrationCutoffDate');
  return saved || getDefaultCutoffDate();
};

interface User {
  id: string;
  name: string;
  role: 'admin' | 'official' | 'resident' | 'sk_kagawad';
  position?: string;
}

type ActiveTab =
  | 'dashboard'
  | 'residents'
  | 'officials'
  | 'requests'
  | 'announcements'
  | 'transactions';

type AuthView = 'login' | 'forgot-password' | 'set-new-password' | 'dashboard';

type ResetIdentity = {
  type: 'resident' | 'barangayadmin' | 'superadmin';
  email: string;
  firstName: string;
  username: string;
};

type RecentActivityApiRow = {
  account?: string | null;
  action?: string | null;
  module?: string | null;
  details?: string | null;
  timestamp?: string | null;
};

type ResetState = {
  residentAccountId: number;
  otpCode: string;
  identity: ResetIdentity;
};

export default function App() {
  const [authView, setAuthView] = useState<AuthView>('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [resetState, setResetState] = useState<ResetState | null>(null);

  // SHARED STATE: Filter and cutoff date management
  const [residentFilter, setResidentFilter] = useState<'all' | 'new'>('all');
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'pickup'>('all');
  const [requestTab, setRequestTab] = useState<'certificates' | 'other'>('certificates');
  const [registrationCutoffDate, setRegistrationCutoffDate] = useState(loadCutoffDate);

  // Save cutoff date to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('registrationCutoffDate', registrationCutoffDate);
  }, [registrationCutoffDate]);

  // Persistence logic to keep user logged in on refresh
  useEffect(() => {
    const savedUser = localStorage.getItem('app_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setIsAuthenticated(true);
      setAuthView('dashboard');
      // Restore position to localStorage so components can read it
      if (parsedUser.position) {
        localStorage.setItem('position', parsedUser.position);
      }
    }
  }, []);

  const handleLoginSuccess = (username: string, roleFromDb: string, firstName: string) => {
    let normalizedRole: 'admin' | 'official' | 'resident' | 'sk_kagawad';

    const dbRole = roleFromDb.toLowerCase().replace(/\s+/g, '').trim();
    const rawPosition = localStorage.getItem('position') ?? '';
    const position = rawPosition.toLowerCase().replace(/\s+/g, ' ').trim();

    if (dbRole === 'superadmin') {
      normalizedRole = 'admin';
    } else if (dbRole === 'barangayadmin' || dbRole === 'admin') {
      // Check if this admin is SK Kagawad — handle any casing/spacing variant
      const isSkKagawad = position.includes('sk') && position.includes('kagawad');
      normalizedRole = isSkKagawad ? 'sk_kagawad' : 'official';
    } else {
      normalizedRole = 'resident';
    }

    const userData: User = {
      id: username,
      name: firstName,
      role: normalizedRole,
      position: rawPosition,
    };

    // Keep position in sync so components can read it independently
    localStorage.setItem('position', rawPosition);
    setUser(userData);
    setIsAuthenticated(true);
    setAuthView('dashboard');

    localStorage.setItem('app_user', JSON.stringify(userData));
    toast.success(`Welcome back, ${firstName}!`);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthView('login');
    setActiveTab('dashboard');
    setUser(null);
    localStorage.removeItem('app_user');
    localStorage.removeItem('position');
    toast.success('Logged out successfully.');
  };

  // HANDLER: Integrated Dashboard Navigation Logic
  const handleDashboardNavigate = (tab: string, filter?: string) => {
    setActiveTab(tab as ActiveTab);

    if (tab === 'residents') {
      setResidentFilter((filter as 'all' | 'new') || 'all');
    } else if (tab === 'requests') {
      if (filter === 'pending') {
        setRequestTab('certificates');
        setRequestFilter('pending');
      } else if (filter === 'pickup') {
        setRequestTab('certificates');
        setRequestFilter('pickup');
      }
    }
  };

  // Routing Logic: Gates features based on authorized roles
  const renderMainContent = () => {
    if (!user) return null;

    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardHome
            adminName={user.name}
            onNavigate={handleDashboardNavigate}
            registrationCutoffDate={registrationCutoffDate}
            userRole={user.role === 'sk_kagawad' ? 'official' : user.role}
          />
        );
      case 'residents':
        return (
          <ResidentRecords
            initialFilter={residentFilter}
            registrationCutoffDate={registrationCutoffDate}
            onUpdateCutoffDate={(date) => setRegistrationCutoffDate(date)}
            userRole={user.role === 'admin' ? 'admin' : user.role === 'sk_kagawad' ? 'sk_kagawad' : 'official'}
          />
        );
      case 'officials':
        return (user.role === 'admin' || user.role === 'official') ? (
          <BarangayOfficials />
        ) : (
          <DashboardHome
            adminName={user.name}
            onNavigate={handleDashboardNavigate}
            registrationCutoffDate={registrationCutoffDate}
            userRole={user.role === 'sk_kagawad' ? 'official' : user.role}
          />
        );
      case 'requests':
        return (
          <OnlineRequests
            initialFilter={requestFilter}
            initialTab={requestTab}
            onFilterChange={(filter) => setRequestFilter(filter as any)}
            onTabChange={(tab) => setRequestTab(tab)}
            userRole={user.role === 'admin' ? 'admin' : user.role === 'sk_kagawad' ? 'sk_kagawad' : 'official'}
          />
        );
      case 'announcements':
        return <AnnouncementManagement />;
      case 'transactions':
        return (user.role === 'admin' || user.role === 'official') ? (
          <TransactionHistory />
        ) : (
          <DashboardHome
            adminName={user.name}
            onNavigate={handleDashboardNavigate}
            registrationCutoffDate={registrationCutoffDate}
            userRole={user.role === 'sk_kagawad' ? 'official' : user.role}
          />
        );
      default:
        return (
          <DashboardHome
            adminName={user.name}
            onNavigate={handleDashboardNavigate}
            registrationCutoffDate={registrationCutoffDate}
            userRole={user.role === 'sk_kagawad' ? 'official' : user.role}
          />
        );
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white">
        {authView === 'login' && (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onForgotPassword={() => {
              setResetState(null);
              setAuthView('forgot-password');
            }}
          />
        )}

        {authView === 'forgot-password' && (
          <ForgotPassword
            onBack={() => {
              setResetState(null);
              setAuthView('login');
            }}
            onOTPVerified={(payload) => {
              setResetState(payload);
              setAuthView('set-new-password');
            }}
          />
        )}

        {authView === 'set-new-password' && (
          <SetNewPasswordPage
            residentAccountId={resetState?.residentAccountId || 0}
            otpCode={resetState?.otpCode || ''}
            identity={
              resetState?.identity || { type: 'resident', email: '', firstName: '', username: '' }
            }
            onPasswordReset={() => {
              setResetState(null);
              toast.success('Password reset!');
              setAuthView('login');
            }}
          />
        )}

        <Toaster position="top-right" />
      </div>
    );
  }

  if (user?.role === 'resident') {
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
        onTabChange={(tab) => {
          setActiveTab(tab as ActiveTab);
          if (tab === 'residents') setResidentFilter('all');
          if (tab === 'requests') {
            setRequestFilter('all');
            setRequestTab('certificates');
          }
        }}
        onLogout={handleLogout}
        adminName={user.name}
        adminId={user.id}
        userRole={user.role === 'admin' ? 'admin' : user.role === 'sk_kagawad' ? 'sk_kagawad' : user.role === 'official' ? 'official' : 'admin'}
      />
      <div className="flex-1 overflow-auto">{renderMainContent()}</div>
      <Toaster position="top-right" />
    </div>
  );
}