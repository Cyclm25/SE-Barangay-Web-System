import { useState, useEffect } from 'react';
import { ResidentHeader } from './ResidentHeader';
import { ProfileSidebar } from './ProfileSidebar';
import { ResidentHome, Announcement } from './ResidentHome';
import { AnnouncementDetail } from './AnnouncementDetail';
import { ResidentServices } from './ResidentServices';
import { ResidentAbout } from './ResidentAbout';
import { ResidentProfile } from './ResidentProfile';
import { TrackRequest } from './TrackRequest';
import { toast } from 'sonner';

type Page = 'home' | 'services' | 'track' | 'about' | 'announcement-detail' | 'profile' | 'track-request';

interface ResidentPortalProps {
  residentName: string;
  onLogout: () => void;
}

export function ResidentPortal({ residentName, onLogout }: ResidentPortalProps) {
  const storedResidentPage =
    typeof window !== 'undefined'
      ? localStorage.getItem('resident_portal_page')
      : null;
  const [currentPage, setCurrentPage] = useState<Page>(
    storedResidentPage === 'services' ||
      storedResidentPage === 'track' ||
      storedResidentPage === 'about' ||
      storedResidentPage === 'profile' ||
      storedResidentPage === 'track-request'
      ? storedResidentPage
      : 'home'
  );
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isProfileSidebarOpen, setIsProfileSidebarOpen] = useState(false);
  const [profileImage, setProfileImage] = useState<string | undefined>(undefined);

  // Load resident profile image on mount
  useEffect(() => {
    const residentId = localStorage.getItem('residentId');
    if (!residentId) return;
    fetch(`http://localhost:5001/residents/${encodeURIComponent(residentId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ProfileImage) {
          const imgUrl = data.ProfileImage.startsWith('data:')
            ? data.ProfileImage
            : `http://localhost:5001${data.ProfileImage}`;
          setProfileImage(imgUrl);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const pageToPersist =
      currentPage === 'announcement-detail' ? 'home' : currentPage;
    localStorage.setItem('resident_portal_page', pageToPersist);
  }, [currentPage]);

  const handleNavigate = (page: 'home' | 'services' | 'track' | 'about') => {
    setCurrentPage(page);
    setSelectedAnnouncement(null);
  };

  const handleAnnouncementClick = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setCurrentPage('announcement-detail');
  };

  const handleBackToHome = () => {
    setCurrentPage('home');
    setSelectedAnnouncement(null);
  };

  const handleProfileNavigate = (tab: 'profile' | 'track-request') => {
    setCurrentPage(tab);
  };

  const handleRequestSubmit = (requestData: any) => {
    toast.success('Document request submitted successfully!', {
      description: 'You will be notified once your request is processed.'
    });
    setCurrentPage('track-request');
  };

  const handleLogout = () => {
    toast.success('Logged out successfully.');
    onLogout();
  };

  const getActivePage = (): 'home' | 'services' | 'track' | 'about' | null => {
    if (currentPage === 'services') return 'services';
    if (currentPage === 'about') return 'about';
    if (currentPage === 'track' || currentPage === 'track-request') return 'track';
    if (currentPage === 'home' || currentPage === 'announcement-detail') return 'home';
    return null;
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'home':
        return <ResidentHome onAnnouncementClick={handleAnnouncementClick} />;
      
      case 'announcement-detail':
        return selectedAnnouncement ? (
          <AnnouncementDetail 
            announcement={selectedAnnouncement} 
            onBack={handleBackToHome} 
          />
        ) : (
          <ResidentHome onAnnouncementClick={handleAnnouncementClick} />
        );
      
      case 'services':
        return <ResidentServices onRequestSubmit={handleRequestSubmit} />;
      
      case 'about':
        return <ResidentAbout />;
      
      case 'profile':
        return <ResidentProfile />;

      case 'track':
        return <TrackRequest />;
      
      case 'track-request':
        return <TrackRequest />;
      
      default:
        return <ResidentHome onAnnouncementClick={handleAnnouncementClick} />;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <ResidentHeader
        residentName={residentName}
        activePage={getActivePage()}
        onNavigate={handleNavigate}
        onProfileClick={() => setIsProfileSidebarOpen(true)}
        profileImage={profileImage}
      />
      
      <ProfileSidebar
        isOpen={isProfileSidebarOpen}
        onClose={() => setIsProfileSidebarOpen(false)}
        onNavigate={handleProfileNavigate}
        onLogout={handleLogout}
        residentName={residentName}
      />

      {renderContent()}
    </div>
  );
}
