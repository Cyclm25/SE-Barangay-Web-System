import { ArrowLeft, Calendar, User } from 'lucide-react';
import { Announcement } from './ResidentHome';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useState } from 'react';

interface AnnouncementDetailProps {
  announcement: Announcement;
  onBack: () => void;
}

const getPriorityBadge = (tags: string[]) => {
  if (tags.includes('Events')) {
    return { text: 'Event', color: 'bg-blue-500' };
  }
  if (tags.includes('Senior Citizen')) {
    return { text: 'Important', color: 'bg-orange-500' };
  }
  return { text: 'Announcement', color: 'bg-[#2957a1]' };
};

export function AnnouncementDetail({ announcement, onBack }: AnnouncementDetailProps) {
  const priority = getPriorityBadge(announcement.tags);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Use images array if available, otherwise use single image
  const displayImages = announcement.images || [announcement.image];
  const hasMultipleImages = displayImages.length > 1;

  return (
    <div className="pt-[93px] min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-[900px] mx-auto px-6 py-8">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#2957a1] text-[16px] font-semibold hover:text-[#1e4380] transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Announcements
        </button>

        {/* Facebook-Style Post Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Post Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                {/* Barangay Logo */}
                <div className="w-14 h-14 bg-[#2957a1] rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-[18px] font-bold text-gray-900">Barangay 160</h3>
                  <div className="flex items-center gap-2 text-[13px] text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{announcement.date}</span>
                    <span className="text-gray-400">•</span>
                    <span className={`${priority.color} text-white px-3 py-0.5 rounded-full text-[11px] font-semibold`}>
                      {priority.text}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {announcement.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 rounded-full bg-blue-50 border border-[#2957a1]/30 text-[11px] font-semibold text-[#2957a1]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Title */}
            <h1 className="text-[28px] font-bold text-[#2957a1] leading-tight">
              {announcement.title}
            </h1>
          </div>

          {/* Post Images */}
          <div className="relative bg-gray-100">
            {displayImages.length === 1 && (
              <ImageWithFallback
                src={displayImages[0]}
                alt={announcement.title}
                className="w-full h-auto max-h-[500px] object-cover"
              />
            )}

            {displayImages.length === 2 && (
              <div className="grid grid-cols-2 gap-1">
                {displayImages.map((img, idx) => (
                  <ImageWithFallback
                    key={idx}
                    src={img}
                    alt={`${announcement.title} ${idx + 1}`}
                    className="w-full h-[350px] object-cover"
                  />
                ))}
              </div>
            )}

            {displayImages.length === 3 && (
              <div className="grid grid-cols-2 gap-1">
                <ImageWithFallback
                  src={displayImages[0]}
                  alt={`${announcement.title} 1`}
                  className="w-full h-[500px] object-cover row-span-2"
                />
                <ImageWithFallback
                  src={displayImages[1]}
                  alt={`${announcement.title} 2`}
                  className="w-full h-[249px] object-cover"
                />
                <ImageWithFallback
                  src={displayImages[2]}
                  alt={`${announcement.title} 3`}
                  className="w-full h-[249px] object-cover"
                />
              </div>
            )}

            {displayImages.length === 4 && (
              <div className="grid grid-cols-2 gap-1">
                {displayImages.map((img, idx) => (
                  <ImageWithFallback
                    key={idx}
                    src={img}
                    alt={`${announcement.title} ${idx + 1}`}
                    className="w-full h-[300px] object-cover"
                  />
                ))}
              </div>
            )}

            {displayImages.length === 5 && (
              <div className="grid grid-cols-3 gap-1">
                <ImageWithFallback
                  src={displayImages[0]}
                  alt={`${announcement.title} 1`}
                  className="w-full h-[400px] object-cover col-span-2"
                />
                <ImageWithFallback
                  src={displayImages[1]}
                  alt={`${announcement.title} 2`}
                  className="w-full h-[400px] object-cover"
                />
                <ImageWithFallback
                  src={displayImages[2]}
                  alt={`${announcement.title} 3`}
                  className="w-full h-[199px] object-cover"
                />
                <ImageWithFallback
                  src={displayImages[3]}
                  alt={`${announcement.title} 4`}
                  className="w-full h-[199px] object-cover"
                />
                <ImageWithFallback
                  src={displayImages[4]}
                  alt={`${announcement.title} 5`}
                  className="w-full h-[199px] object-cover"
                />
              </div>
            )}
          </div>

          {/* Post Content */}
          <div className="p-6">
            {/* Description */}
            <div className="mb-6">
              <p className="text-[16px] text-gray-800 leading-relaxed">
                {announcement.details}
              </p>
            </div>

            {/* Posted By */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-4 h-4" />
                <span className="text-[14px]">
                  <span className="font-semibold">Posted by:</span> {announcement.postedBy}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}