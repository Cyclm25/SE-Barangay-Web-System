import { useState } from 'react';
import { cn } from '../ui/utils';
import { Button } from '../ui/button';
import {
  LayoutDashboard,
  Users,
  User,
  FileText,
  Megaphone,
  History,
  LogOut
} from 'lucide-react';
import imgImage3 from "../../assets/barangaylogo.png";
import { formatId } from '../../utils/formatId';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  adminName: string;
  adminId: string;
  position?: string;
  userRole?: 'admin' | 'official' | 'superadmin' | 'sk_kagawad';
}

const navigation = [
  { id: 'dashboard',     label: 'Dashboard',          icon: LayoutDashboard, roles: ['admin', 'official', 'superadmin', 'sk_kagawad'] },
  { id: 'residents',     label: 'Resident Records',   icon: Users,           roles: ['admin', 'official', 'sk_kagawad'] },
  { id: 'officials',     label: 'Barangay Officials', icon: User,            roles: ['admin', 'superadmin'] },
  { id: 'requests',      label: 'Online Requests',    icon: FileText,        roles: ['admin', 'official', 'sk_kagawad'] },
  { id: 'announcements', label: 'Announcements',      icon: Megaphone,       roles: ['admin', 'official', 'sk_kagawad'] },
  { id: 'transactions',  label: 'Transaction History',icon: History,         roles: ['admin', 'superadmin'] },
];

export function Sidebar({
  activeTab,
  onTabChange,
  onLogout,
  adminName,
  adminId,
  position,
  userRole = 'admin'
}: SidebarProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const displayRoleLabel =
    userRole === 'superadmin'
      ? 'Super Administrator'
      : position?.trim() || (userRole === 'sk_kagawad' ? 'SK Kagawad' : 'Barangay Official');

  // Filters navigation based on the userRole string passed from App.tsx
  const filteredNavigation = navigation.filter(item => item.roles.includes(userRole));

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  return (
    <div className="w-[250px] bg-[#2957a1] text-white flex flex-col h-full">
      {/* Logo and Brand */}
      <div className="p-4 flex flex-col items-center pt-6">
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
                  onClick={() => onTabChange(item.id)}
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
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 h-10 text-white hover:bg-red/10 text-[14px], "
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
}
