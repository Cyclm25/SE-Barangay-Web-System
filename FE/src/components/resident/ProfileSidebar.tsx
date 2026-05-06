import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface ProfileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: 'profile' | 'track-request') => void;
  onLogout: () => void;
  residentName: string;
}

export function ProfileSidebar({
  isOpen,
  onClose,
  onNavigate,
  onLogout,
  residentName
}: ProfileSidebarProps) {

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [residentId, setResidentId] = useState<string>("");
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("residentId");
    if (!id) return;

    const fetchResident = async () => {
      try {
        const res = await fetch(`https://se-barangay-web-system.onrender.com/residents/${id}`);
        const data = await res.json();

        if (!res.ok) return;

        setResidentId(data.ResidentID);
        if (data.ProfileImage) {
          const imageUrl = data.ProfileImage.startsWith("data:")
            ? data.ProfileImage
            : `https://se-barangay-web-system.onrender.com${data.ProfileImage}`;
          setProfileImage(imageUrl);
        } else {
          setProfileImage(null);
        }
      } catch (err) {
        console.error("Failed to load resident:", err);
      }
    };

    fetchResident();
  }, []);

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
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 bottom-0 w-[350px] bg-white shadow-2xl z-50 flex flex-col">
        <div className="bg-gradient-to-r from-[#2957a1] to-[#1e4380] px-6 py-8 flex items-center justify-between">
          <div>
            <h2 className="text-white text-[22px] font-bold">Profile</h2>
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
            <div className="w-16 h-16 rounded-full shadow-lg overflow-hidden bg-gradient-to-br from-[#2957a1] to-[#1e4380] flex items-center justify-center">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={`${residentName} profile`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-[22px]">
                  {residentName?.charAt(0)}
                </span>
              )}
            </div>
            <div>
              <p className="font-bold text-gray-900 text-[16px]">{residentName}</p>
              <p className="text-[13px] text-gray-600 mt-0.5">
                Resident ID: {residentId}
              </p>
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

          {/* <button
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
          </button> */}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-3 shadow-md"
          >
            Log Out
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          onLogout();
          onClose();
        }}
        title="Confirm Logout"
        message="Are you sure you want to log out?"
        confirmText="Log Out"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
}
