import { useState } from 'react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface Announcement {
  id: string;
  title: string;
  tags: string[];
  image: string;
  images?: string[];
  description: string;
  details: string;
  requirements?: string[];
  date: string;
  postedBy: string;
}

interface ResidentHomeProps {
  onAnnouncementClick: (announcement: Announcement) => void;
}

const mockAnnouncements: Announcement[] = [
  {
    id: '1',
    title: 'Eskwela School Supplies Project',
    tags: ['Student'],
    image: 'https://images.unsplash.com/photo-1661732017117-ea3165272584?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzY2hvb2wlMjBzdXBwbGllcyUyMG5vdGVib29rc3xlbnwxfHx8fDE3NjkzMzI3MzZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    images: [
      'https://images.unsplash.com/photo-1661732017117-ea3165272584?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzY2hvb2wlMjBzdXBwbGllcyUyMG5vdGVib29rc3xlbnwxfHx8fDE3NjkzMzI3MzZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50JTIwc3R1ZHlpbmd8ZW58MXx8fHwxNzM3NzY5MzM3fDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzY2hvb2wlMjBjaGlsZHJlbnxlbnwxfHx8fDE3Mzc3NjkzMzd8MA&ixlib=rb-4.1.0&q=80&w=1080'
    ],
    description: 'Free school supplies distribution for students',
    details: 'Barangay 160 is proud to announce the Eskwela School Supplies Project, providing free notebooks, pens, and other essential learning materials to students in our community. This program aims to support families and ensure that every child has access to quality education materials.',
    requirements: ['Valid ID', 'Student Certificate', 'Proof of Residency'],
    date: 'January 30, 2026',
    postedBy: 'Maria Santos'
  },
  {
    id: '2',
    title: 'Community Health and Wellness Seminar',
    tags: ['Senior Citizen', 'Events'],
    image: 'https://images.unsplash.com/photo-1759922378100-89dca9fe3c98?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21tdW5pdHklMjBtZWV0aW5nJTIwc2VtaW5hcnxlbnwxfHx8fDE3NjkzMzI3MzZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    images: [
      'https://images.unsplash.com/photo-1759922378100-89dca9fe3c98?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21tdW5pdHklMjBtZWV0aW5nJTIwc2VtaW5hcnxlbnwxfHx8fDE3NjkzMzI3MzZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1666887360726-f55472d96c34?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGglMjBjaGVja3VwJTIwbWVkaWNhbHxlbnwxfHx8fDE3NjkzMzI3Mzh8MA&ixlib=rb-4.1.0&q=80&w=1080'
    ],
    description: 'Join us for a health and wellness seminar focusing on senior citizen care',
    details: 'This seminar will cover important topics such as nutrition, exercise for seniors, common health concerns, and preventive care. Health professionals will be present to provide guidance and answer questions. Free health screening will be available.',
    requirements: ['Senior Citizen ID', 'Barangay ID'],
    date: 'February 5, 2026',
    postedBy: 'John Adebayo'
  },
  {
    id: '3',
    title: 'One Day League Basketball Tournament',
    tags: ['Events'],
    image: 'https://images.unsplash.com/photo-1596831440741-238efd4619cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcG9ydHMlMjBsZWFndWUlMjBiYXNrZXRiYWxsfGVufDF8fHx8MTc2OTMzMjczN3ww&ixlib=rb-4.1.0&q=80&w=1080',
    images: [
      'https://images.unsplash.com/photo-1596831440741-238efd4619cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcG9ydHMlMjBsZWFndWUlMjBiYXNrZXRiYWxsfGVufDF8fHx8MTc2OTMzMjczN3ww&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1546519638-68e109498ffc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXNrZXRiYWxsJTIwZ2FtZXxlbnwxfHx8fDE3Mzc3NjkzMzd8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXNrZXRiYWxsJTIwY291cnR8ZW58MXx8fHwxNzM3NzY5MzM3fDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1608245449230-4ac19066d2d0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXNrZXRiYWxsJTIwdGVhbXxlbnwxfHx8fDE3Mzc3NjkzMzd8MA&ixlib=rb-4.1.0&q=80&w=1080'
    ],
    description: 'Annual basketball tournament for residents',
    details: 'Barangay 160 invites all basketball enthusiasts to participate in our annual One Day League tournament. Teams will compete for prizes and community bragging rights. Registration is open to all residents aged 18 and above.',
    requirements: ['Valid ID', 'Team Registration Form', 'Medical Certificate'],
    date: 'August 30, 2025',
    postedBy: 'Events Committee'
  },
  {
    id: '4',
    title: 'Kids Art Workshop',
    tags: ['Student', 'Events'],
    image: 'https://images.unsplash.com/photo-1642252429939-3f9232959eb9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnQlMjB3b3Jrc2hvcCUyMGtpZHN8ZW58MXx8fHwxNzY5MzMyNzM3fDA&ixlib=rb-4.1.0&q=80&w=1080',
    images: [
      'https://images.unsplash.com/photo-1642252429939-3f9232959eb9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnQlMjB3b3Jrc2hvcCUyMGtpZHN8ZW58MXx8fHwxNzY5MzMyNzM3fDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1596464716127-f2a82984de30?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxraWRzJTIwYXJ0fGVufDF8fHx8MTczNzc2OTMzN3ww&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxraWRzJTIwcGFpbnRpbmd8ZW58MXx8fHwxNzM3NzY5MzM3fDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1572883454114-1cf0031ede2a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlsZHJlbiUyMGNyYWZ0c3xlbnwxfHx8fDE3Mzc3NjkzMzd8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxraWRzJTIwYXJ0JTIwY2xhc3N8ZW58MXx8fHwxNzM3NzY5MzM3fDA&ixlib=rb-4.1.0&q=80&w=1080'
    ],
    description: 'Creative art workshop for children aged 6-12',
    details: 'Let your child\'s creativity shine! Our Kids Art Workshop will teach basic drawing, painting, and crafts. All materials will be provided. Limited slots available, so register early!',
    requirements: ['Birth Certificate', 'Parent/Guardian Consent Form'],
    date: 'March 15, 2026',
    postedBy: 'Maria Santos'
  },
  {
    id: '5',
    title: 'Painting Supplies Donation Drive',
    tags: ['Events'],
    image: 'https://images.unsplash.com/photo-1643290274113-1ff22efe2ce1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYWludCUyMGRvbmF0aW9uJTIwY29tbXVuaXR5fGVufDF8fHx8MTc2OTMzMjczN3ww&ixlib=rb-4.1.0&q=80&w=1080',
    description: 'Community beautification project - accepting paint donations',
    details: 'Join us in beautifying our barangay! We are accepting donations of paint and painting supplies for our community mural project. Volunteers are also welcome to help with the painting activities.',
    date: 'February 20, 2026',
    postedBy: 'Admin Office'
  },
  {
    id: '6',
    title: 'Free Medical Check-up Program',
    tags: ['Senior Citizen', 'Events'],
    image: 'https://images.unsplash.com/photo-1666887360726-f55472d96c34?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGglMjBjaGVja3VwJTIwbWVkaWNhbHxlbnwxfHx8fDE3NjkzMzI3Mzh8MA&ixlib=rb-4.1.0&q=80&w=1080',
    description: 'Free health screening for all residents',
    details: 'Barangay 160 in partnership with local health centers is offering free medical check-ups including blood pressure monitoring, blood sugar testing, and general consultation. Services are available to all residents.',
    requirements: ['Barangay ID', 'Valid ID'],
    date: 'February 10, 2026',
    postedBy: 'Barangay Captain'
  }
];

export function ResidentHome({ onAnnouncementClick }: ResidentHomeProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const tags = ['Student', 'Senior Citizen', 'Events'];

  const filteredAnnouncements = selectedTag
    ? mockAnnouncements.filter(announcement => 
        announcement.tags.includes(selectedTag)
      )
    : mockAnnouncements;

  return (
    <div className="pt-[73px] md:pt-[93px] min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-10">
        {/* Header Section */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-[24px] md:text-[32px] font-bold text-[#2957a1] mb-2">Announcements</h1>
          <p className="text-gray-600 text-[13px] md:text-[14px]">Stay updated with the latest news and events from Barangay 160</p>
        </div>

        {/* Filter Section */}
        <div className="mb-6 md:mb-8 flex flex-wrap items-center gap-2 md:gap-3 bg-white p-3 md:p-4 rounded-lg shadow-sm">
          <span className="text-[13px] md:text-[14px] font-semibold text-[#2957a1] w-full md:w-auto mb-1 md:mb-0">FILTER BY:</span>
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-4 md:px-5 py-2 rounded-full border-2 font-semibold text-[11px] transition-all ${
              selectedTag === null
                ? 'bg-[#2957a1] text-white border-[#2957a1] shadow-md'
                : 'bg-white text-gray-700 border-gray-300 hover:border-[#2957a1] hover:text-[#2957a1]'
            }`}
          >
            All
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`px-4 md:px-5 py-2 rounded-full border-2 font-semibold text-[11px] transition-all ${
                selectedTag === tag
                  ? 'bg-[#2957a1] text-white border-[#2957a1] shadow-md'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-[#2957a1] hover:text-[#2957a1]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Announcements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredAnnouncements.map((announcement) => (
            <div
              key={announcement.id}
              onClick={() => onAnnouncementClick(announcement)}
              className="cursor-pointer group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1"
            >
              {/* Image */}
              <div className="relative bg-gray-200 overflow-hidden h-[180px] md:h-[220px]">
                <ImageWithFallback
                  src={announcement.image}
                  alt={announcement.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* Date Badge */}
                <div className="absolute top-2 md:top-3 right-2 md:right-3 bg-white/95 backdrop-blur-sm px-2 md:px-3 py-1 rounded-full shadow-md">
                  <p className="text-[10px] md:text-[11px] font-bold text-[#2957a1]">{announcement.date}</p>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 md:p-5">
                <h3 className="text-[18px] md:text-[20px] text-[#2957a1] font-bold mb-2 md:mb-3 line-clamp-2 group-hover:text-[#1e4380] transition-colors">
                  {announcement.title}
                </h3>
                
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-2 md:mb-3">
                  {announcement.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 md:px-3 py-1 rounded-full bg-blue-50 border border-[#2957a1]/30 text-[10px] font-semibold text-[#2957a1]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Description Preview */}
                <p className="text-gray-600 text-[12px] md:text-[13px] line-clamp-2 leading-relaxed">
                  {announcement.description}
                </p>

                {/* Read More */}
                <div className="mt-4 flex items-center text-[#2957a1] text-[12px] font-semibold group-hover:gap-2 transition-all">
                  <span>Read more</span>
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredAnnouncements.length === 0 && (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg font-medium">No announcements found</p>
            <p className="text-gray-400 text-sm mt-1">Try selecting a different filter</p>
          </div>
        )}
      </div>
    </div>
  );
}

export type { Announcement };