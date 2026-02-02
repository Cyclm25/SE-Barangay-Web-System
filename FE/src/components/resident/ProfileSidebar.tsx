import { X } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface ProfileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: 'profile' | 'track-request') => void;
  onLogout: () => void;
  residentName: string;
}

export function ProfileSidebar({ isOpen, onClose, onNavigate, onLogout, residentName }: ProfileSidebarProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  if (!isOpen) return null;

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    onLogout();
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 bottom-0 w-[350px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2957a1] to-[#1e4380] px-6 py-8 flex items-center justify-between">
          <div>
            <h2 className="text-white text-[22px] font-bold">Profile Menu</h2>
            <p className="text-white/80 text-[13px] mt-1">Manage your account</p>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Profile Info */}
        <div className="px-6 py-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#2957a1] to-[#1e4380] rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-[22px]">
                {residentName.charAt(0)}
              </span>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-[16px]">{residentName}</p>
              <p className="text-[13px] text-gray-600 mt-0.5">Resident ID: RES2026-0123</p>
            </div>
          </div>
        </div>

        {/* Menu Options */}
        <div className="flex-1 py-4 overflow-y-auto">
          <button
            onClick={() => {
              onNavigate('profile');
              onClose();
            }}
            className="w-full px-6 py-4 text-left hover:bg-blue-50 transition-colors flex items-center gap-4 text-gray-700 hover:text-[#2957a1] group"
          >
            <div className="w-10 h-10 bg-gray-100 group-hover:bg-[#2957a1] rounded-lg flex items-center justify-center transition-colors">
              <svg className="w-5 h-5 text-gray-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <span className="font-semibold block">Personal Information</span>
              <span className="text-[12px] text-gray-500">View and edit your profile</span>
            </div>
          </button>

          <button
            onClick={() => {
              onNavigate('track-request');
              onClose();
            }}
            className="w-full px-6 py-4 text-left hover:bg-blue-50 transition-colors flex items-center gap-4 text-gray-700 hover:text-[#2957a1] group"
          >
            <div className="w-10 h-10 bg-gray-100 group-hover:bg-[#2957a1] rounded-lg flex items-center justify-center transition-colors">
              <svg className="w-5 h-5 text-gray-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <span className="font-semibold block">Track My Requests</span>
              <span className="text-[12px] text-gray-500">Monitor document status</span>
            </div>
          </button>
        </div>

        {/* Logout Button */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleLogoutClick}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-4 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-3 shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Log Out
          </button>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmLogout}
        title="Confirm Logout"
        message="Are you sure you want to log out? You will be redirected to the login page."
        confirmText="Log Out"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
}