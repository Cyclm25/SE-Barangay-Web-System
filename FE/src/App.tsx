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
import { toast } from 'sonner@2.0.3';

interface User {
  id: string;
  name: string;
  role: 'admin' | 'resident' | 'official';
}

type ActiveTab = 'dashboard' | 'residents' | 'officials' | 'requests' | 'announcements' | 'transactions';
type AuthView = 'login' | 'forgot-password' | 'set-new-password' | 'dashboard';

export default function App() {
  const [authView, setAuthView] = useState<AuthView>('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [user, setUser] = useState<User | null>(null);

  const handleLoginSuccess = (username: string) => {
    // Determine user role based on username
    // For demo: if username contains "admin", it's admin
    // if username contains "official", it's official
    // otherwise it's resident
    const lowerUsername = username.toLowerCase();
    let role: 'admin' | 'resident' | 'official';
    let userId: string;
    let userName: string;
    
    if (lowerUsername.includes('admin')) {
      role = 'admin';
      userId = 'AD20260001';
      userName = 'Maria Santos';
    } else if (lowerUsername.includes('official')) {
      role = 'official';
      userId = 'OF20260001';
      userName = 'Roberto Cruz';
    } else {
      role = 'resident';
      userId = 'RS20260001';
      userName = 'Juan';
    }
    
    setUser({
      id: userId,
      name: userName,
      role: role
    });
    
    setIsAuthenticated(true);
    setAuthView('dashboard');
  };

  const handleForgotPassword = () => {
    setAuthView('forgot-password');
  };

  const handleOTPVerified = () => {
    setAuthView('set-new-password');
  };

  const handlePasswordReset = () => {
    toast.success('Password has been reset successfully!', {
      description: 'You can now login with your new password.'
    });
    setAuthView('login');
  };

  const handleBackToLogin = () => {
    setAuthView('login');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthView('login');
    setActiveTab('dashboard');
    setUser(null);
    toast.success('Logged out successfully.');
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as ActiveTab);
  };

  const renderMainContent = () => {
    if (!user) return null;

    switch (activeTab) {
      case 'dashboard':
        return <DashboardHome adminName={user.name} />;
      case 'residents':
        return <ResidentRecords />;
      case 'officials':
        return <BarangayOfficials />;
      case 'requests':
        return <OnlineRequests />;
      case 'announcements':
        return <AnnouncementManagement />;
      case 'transactions':
        return <TransactionHistory />;
      default:
        return <DashboardHome adminName={user.name} />;
    }
  };

  // Show authentication views
  if (!isAuthenticated) {
    return (
      <>
        {authView === 'login' && (
          <LoginPage 
            onLoginSuccess={handleLoginSuccess}
            onForgotPassword={handleForgotPassword}
          />
        )}
        {authView === 'forgot-password' && (
          <ForgotPasswordPage 
            onBack={handleBackToLogin}
            onOTPVerified={handleOTPVerified}
          />
        )}
        {authView === 'set-new-password' && (
          <SetNewPasswordPage 
            onPasswordReset={handlePasswordReset}
          />
        )}
        <Toaster position="top-right" />
      </>
    );
  }

  // Show Resident Portal if user is a resident
  if (user?.role === 'resident') {
    return (
      <>
        <ResidentPortal 
          residentName={user.name}
          onLogout={handleLogout}
        />
        <Toaster position="top-right" />
      </>
    );
  }

  // Show Admin Dashboard if user is an admin or official
  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={handleLogout}
        adminName={user.name}
        adminId={user.id}
        userRole={user.role === 'official' ? 'official' : 'admin'}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {renderMainContent()}
      </div>

      {/* Toast Notifications */}
      <Toaster position="top-right" />
    </div>
  );
}