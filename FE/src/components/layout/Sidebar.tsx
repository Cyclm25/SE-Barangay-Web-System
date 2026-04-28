import { useState, useEffect } from 'react';
import { cn } from '../ui/utils';
import { Button } from '../ui/button';
import {
  LayoutDashboard,
  Users,
  User,
  FileText,
  Megaphone,
  History,
  LogOut,
  X,
  Menu
} from 'lucide-react';
import imgImage3 from "../../assets/barangaylogo.png";
import { formatId } from '../../utils/formatId';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { isAdminViewOnly } from '../../utils/adminAccess';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  adminName: string;
  adminId: string;
  position?: string;
  userRole?: 'admin' | 'official' | 'superadmin' | 'sk_kagawad';
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const navigation = [
  { id: 'dashboard',     label: 'Dashboard',          icon: LayoutDashboard, roles: ['admin', 'official', 'superadmin', 'sk_kagawad'] },
  { id: 'residents',     label: 'Resident Records',   icon: Users,           roles: ['admin', 'official', 'sk_kagawad'] },
  { id: 'officials',     label: 'Barangay Officials', icon: User,            roles: ['admin', 'superadmin'] },
  { id: 'requests',      label: 'Online Requests',    icon: FileText,        roles: ['admin', 'official', 'sk_kagawad'] },
  { id: 'announcements', label: 'Announcements',      icon: Megaphone,       roles: ['admin', 'official', 'sk_kagawad'] },
  { id: 'transactions',  label: 'Activity Logs',      icon: History,         roles: ['admin', 'superadmin'] },
];

export function Sidebar({
  activeTab,
  onTabChange,
  onLogout,
  adminName,
  adminId,
  position,
  userRole = 'admin',
  isMobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const isViewOnly = isAdminViewOnly(userRole, position);

  const displayRoleLabel =
    userRole === 'superadmin'
      ? 'Super Administrator'
      : position?.trim() || (userRole === 'sk_kagawad' ? 'SK Kagawad' : 'Barangay Official');

  const filteredNavigation = navigation.filter(item => item.roles.includes(userRole));

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    onMobileClose?.();
  };

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  const sidebarContent = (
    <div className="w-[250px] bg-[#2957a1] text-white flex flex-col h-full">
      {/* Logo and Brand */}
      <div className="p-4 flex flex-col items-center pt-6 relative">
        {/* Close button - only on mobile */}
        <button
          className="absolute top-3 right-3 lg:hidden text-white/70 hover:text-white p-1 rounded"
          onClick={onMobileClose}
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative mb-3">
          <div className="w-[60px] h-[60px] bg-white rounded-full flex items-center justify-center">
            <img src={imgImage3} alt="Barangay Logo" className="w-[50px] h-[50px] object-cover" />
          </div>
        </div>
        <p className="text-[18px] font-bold text-center">Barangay 160</p>
        <div className="mt-2 text-center pt-2 w-full">
          <p className="text-[13px] text-white/90">{formatId(adminId)}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4">
        <ul className="space-y-1">
          {filteredNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-2 h-10 text-white hover:bg-white/10 transition-all text-[14px] rounded-none",
                    isActive && "font-semibold border-t border-b border-white bg-transparent"
                  )}
                  onClick={() => handleTabChange(item.id)}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Admin Info & Logout */}
      <div className="p-4 border-t border-white/20 space-y-2">
        <div className="flex items-center gap-3 pb-2">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
            <User className="w-6 h-6 text-[#2957a1]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate">{adminName}</p>
            <p className="text-[11px] text-white/70 truncate">
              {displayRoleLabel}
            </p>
            {isViewOnly && (
              <p className="mt-1 inline-flex rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                View Only
              </p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 h-10 text-white hover:bg-red/10 text-[14px]"
          onClick={handleLogoutClick}
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </Button>
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={onLogout}
        title="Logout Confirmation"
        message="Are you sure you want to logout this account?"
        confirmText="Logout"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );

  return (
    <>
      {/* Desktop sidebar - always visible on lg+ */}
      <div className="hidden lg:flex h-full">
        {sidebarContent}
      </div>

      {/* Mobile overlay + drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          {/* Drawer */}
          <div className="relative z-10 flex h-full animate-in slide-in-from-left duration-300">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* MobileHeader – place this in the top-level layout (e.g. App.tsx)   */
/* Renders only on mobile; shows logo, welcome text, and hamburger btn */
/* ------------------------------------------------------------------ */
interface MobileHeaderProps {
  adminName: string;
  onMenuOpen: () => void;
}

export function MobileHeader({ adminName, onMenuOpen }: MobileHeaderProps) {
  return (
    <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center gap-2">
        <img
          src={imgImage3}
          alt="Barangay Logo"
          className="w-7 h-7 object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider leading-none">BARANGAY 160</p>
          <p className="text-[13px] font-bold text-[#2957a1] leading-tight">Welcome, {adminName.split(' ')[0]}!</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <User className="w-4 h-4 text-[#2957a1]" />
        </div>
        <button
          onClick={onMenuOpen}
          className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
