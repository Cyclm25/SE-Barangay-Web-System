import { useState, useEffect } from 'react';
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

// 1. User Interface definition matching your DB User data [cite: 462-479]
interface User {
  id: string;
  name: string;
  role: 'admin' | 'official' | 'resident';
}

type ActiveTab = 'dashboard' | 'residents' | 'officials' | 'requests' | 'announcements' | 'transactions';
type AuthView = 'login' | 'forgot-password' | 'set-new-password' | 'dashboard';

export default function App() {
  const [authView, setAuthView] = useState<AuthView>('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [user, setUser] = useState<User | null>(null);

  // SHARED STATE: Filter and cutoff date management
  const [residentFilter, setResidentFilter] = useState<'all' | 'new'>('all');
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'pickup'>('all');
  const [requestTab, setRequestTab] = useState<'certificates' | 'other'>('certificates');
  const [registrationCutoffDate, setRegistrationCutoffDate] = useState(loadCutoffDate);

  // Save cutoff date to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('registrationCutoffDate', registrationCutoffDate);
  }, [registrationCutoffDate]);

  // Persistence logic to keep user logged in on refresh [cite: 293-295]
  useEffect(() => {
    const savedUser = localStorage.getItem('app_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setIsAuthenticated(true);
      setAuthView('dashboard');
    }
  }, []);

  // 2. CRITICAL FIX: Logic to map Database Roles to Frontend Views [cite: 315-325]
  const handleLoginSuccess = (username: string, roleFromDb: string, firstName: string) => {
    let normalizedRole: 'admin' | 'official' | 'resident';
    
    // Strips all spaces and converts to lowercase to handle "Super Admin" vs "superadmin"
    const dbRole = roleFromDb.toLowerCase().replace(/\s+/g, '').trim();

    if (dbRole === 'superadmin') {
      normalizedRole = 'admin'; // Mapping Super Admin (SA20260001) to top-level Admin access [cite: 315]
    } else if (dbRole === 'barangayadmin' || dbRole === 'admin') {
      normalizedRole = 'official'; // Mapping Barangay Admin to official-level access [cite: 305-313]
    } else {
      normalizedRole = 'resident'; // Default to resident portal [cite: 291-302]
    }
    
    const userData: User = {
      id: username, 
      name: firstName,
      role: normalizedRole
    };

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

  // 3. Routing Logic: Gates features based on authorized roles 
  const renderMainContent = () => {
    if (!user) return null;

    switch (activeTab) {
      case 'dashboard': 
        return (
          <DashboardHome 
            adminName={user.name}
            onNavigate={handleDashboardNavigate}
            registrationCutoffDate={registrationCutoffDate}
          />
        );
      case 'residents': 
        return (
          <ResidentRecords 
            initialFilter={residentFilter}
            registrationCutoffDate={registrationCutoffDate}
            onUpdateCutoffDate={(date) => setRegistrationCutoffDate(date)}
          />
        );
      case 'officials': 
        // Only the Super Admin ('admin') can manage officials [cite: 319-320]
        return user.role === 'admin' ? <BarangayOfficials /> : <DashboardHome adminName={user.name} onNavigate={handleDashboardNavigate} registrationCutoffDate={registrationCutoffDate} />;
      case 'requests': 
        return (
          <OnlineRequests 
            initialFilter={requestFilter}
            initialTab={requestTab}
            onFilterChange={(filter) => setRequestFilter(filter as any)}
            onTabChange={(tab) => setRequestTab(tab)}
          />
        );
      case 'announcements': 
        return <AnnouncementManagement />;
      case 'transactions': 
        // Only the Super Admin ('admin') sees full transaction summaries [cite: 325]
        return user.role === 'admin' ? <TransactionHistory /> : <DashboardHome adminName={user.name} onNavigate={handleDashboardNavigate} registrationCutoffDate={registrationCutoffDate} />;
      default: 
        return <DashboardHome adminName={user.name} onNavigate={handleDashboardNavigate} registrationCutoffDate={registrationCutoffDate} />;
    }
  };

  // View Gating for Authentication states
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

  // 4. Resident Portal Separation [cite: 291-302]
  if (user?.role === 'resident') {
    return (
      <>
        <ResidentPortal residentName={user.name} onLogout={handleLogout} />
        <Toaster position="top-right" />
      </>
    );
  }

  // 5. Admin and Official Shared Dashboard Wrapper [cite: 305-325]
  return (
    <div className="h-screen flex bg-gray-50">
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab as ActiveTab);
          // Reset filters when manually changing tabs via sidebar
          if (tab === 'residents') setResidentFilter('all');
          if (tab === 'requests') {
            setRequestFilter('all');
            setRequestTab('certificates');
          }
        }}
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