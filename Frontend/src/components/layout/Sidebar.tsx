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
import imgImage3 from "figma:asset/7511a4e875c007913e79ed3aaafb18e5fbc9b003.png";
import { formatId } from '../../utils/formatId';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  adminName: string;
  adminId: string;
  userRole?: 'admin' | 'official';
}

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'official'] },
  { id: 'residents', label: 'Resident Records', icon: Users, roles: ['admin', 'official'] },
  { id: 'officials', label: 'Barangay Officials', icon: User, roles: ['admin'] },
  { id: 'requests', label: 'Online Requests', icon: FileText, roles: ['admin', 'official'] },
  { id: 'announcements', label: 'Announcements', icon: Megaphone, roles: ['admin', 'official'] },
  { id: 'transactions', label: 'Transaction History', icon: History, roles: ['admin'] },
];

export function Sidebar({ activeTab, onTabChange, onLogout, adminName, adminId, userRole = 'admin' }: SidebarProps) {
  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item => item.roles.includes(userRole));
  
  return (
    <div className="w-[320px] bg-[#2957a1] text-white" style={{ height: '100vh', display: 'grid', gridTemplateRows: 'auto 1fr auto' }}>
      {/* Logo and Brand - Row 1 */}
      <div className="p-6 flex flex-col items-center pt-8 border-b border-white/10">
        <div className="relative mb-4">
          <div className="w-[80px] h-[80px] bg-white rounded-full flex items-center justify-center">
            <img src={imgImage3} alt="Barangay Logo" className="w-[70px] h-[70px] object-cover" />
          </div>
        </div>
        <p className="text-[24px] font-bold text-center">Barangay 160</p>
        <div className="mt-3 text-center pt-2 w-full">
          <p className="text-[16px] text-white/90">{formatId(adminId)}</p>
        </div>
      </div>

      {/* Navigation - Row 2 (grows and scrolls) */}
      <nav className="px-5 py-6 overflow-y-auto overflow-x-hidden">
        <ul className="space-y-2">
          {filteredNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 h-14 text-white hover:bg-white/10 transition-all text-[17px] rounded-none",
                    isActive && "font-semibold border-t border-b border-white bg-transparent"
                  )}
                  onClick={() => onTabChange(item.id)}
                >
                  <Icon className="w-6 h-6" />
                  <span>{item.label}</span>
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Admin Info & Logout - Row 3 */}
      <div className="p-6 border-t border-white/20 space-y-4 bg-[#2957a1]">
        <div className="flex items-center gap-4 pb-2">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
            <User className="w-8 h-8 text-[#2957a1]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[17px] font-semibold truncate">{adminName}</p>
            <p className="text-[14px] text-white/70 truncate">
              {userRole === 'admin' ? 'Barangay Secretary' : 'Barangay Official'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-14 text-white hover:bg-white/20 hover:bg-opacity-100 text-[18px] font-semibold rounded-md"
          onClick={onLogout}
        >
          <LogOut className="w-6 h-6" />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );
}
