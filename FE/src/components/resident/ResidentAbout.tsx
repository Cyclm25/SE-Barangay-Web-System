import { useState, useEffect, useCallback } from 'react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import imgBarangayLogo from "../../assets/barangaylogo.png";
import { api } from "../../utils/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Official {
  id: string;
  name: string;
  position: string;
  image: string | null;
}

// Matches the shape returned by /api/announcements/resident
interface DBAnnouncement {
  AnnouncementID: string;
  Title: string;
  Body: string;
  CreatedAt: string;
  PublishedDate: string | null;
  Images: string[];            // array of image URLs / paths
  Status: string;
  IsPublished: boolean;
}

// ─── Fallback data ─────────────────────────────────────────────────────────────

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1758599668299-beebedfabf7b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21tdW5pdHklMjB2b2x1bnRlZXJzJTIwY2xlYW5pbmd8ZW58MXx8fHwxNzY5MzMyNzk3fDA&ixlib=rb-4.1.0&q=80&w=1080',
  'https://images.unsplash.com/photo-1759922378100-89dca9fe3c98?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21tdW5pdHklMjBtZWV0aW5nJTIwc2VtaW5hcnxlbnwxfHx8fDE3NjkzMzI3MzZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
  'https://images.unsplash.com/photo-1666887360726-f55472d96c34?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGglMjBjaGVja3VwJTIwbWVkaWNhbHxlbnwxfHx8fDE3NjkzMzI3Mzh8MA&ixlib=rb-4.1.0&q=80&w=1080',
];

const mockOfficials: Official[] = [
  {
    id: 'mock1',
    name: 'Roberto Martinez',
    position: 'Barangay Captain',
    image: 'https://images.unsplash.com/photo-1717985498747-f081679d2c33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBmaWxpcGluYSUyMG1hbiUyMHBvcnRyYWl0fGVufDF8fHx8MTc2OTc0NTg0OHww&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    id: 'mock2',
    name: 'Maria Santos',
    position: 'Barangay Kagawad',
    image: 'https://images.unsplash.com/photo-1718006915613-bcb972cabdb1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBmaWxpcGluYSUyMHdvbWFuJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzY5NzQ1ODQ4fDA&ixlib=rb-4.1.0&q=80&w=1080',
  },
];

const MAX_CAROUSEL_IMAGES = 15;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fisher-Yates shuffle — returns a new shuffled array */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Resolves a raw image value from the DB into a usable URL.
 * Handles:
 *   - Already-absolute URLs  (http/https)
 *   - Relative server paths  (/uploads/...)
 *   - Base64 data URIs       (data:image/...)
 */
function resolveImageUrl(raw: string): string {
  if (!raw) return '';
  const s = raw.trim();
  if (s.startsWith('data:') || s.startsWith('http://') || s.startsWith('https://')) return s;
  // Relative path — prepend the API base
  return `http://localhost:5001${s.startsWith('/') ? '' : '/'}${s}`;
}

/** Collect every non-empty image URL from all published announcements */
function collectAnnouncementImages(announcements: DBAnnouncement[]): string[] {
  const urls: string[] = [];
  for (const a of announcements) {
    if (!Array.isArray(a.Images)) continue;
    for (const raw of a.Images) {
      const url = resolveImageUrl(raw);
      if (url) urls.push(url);
    }
  }
  return urls;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ResidentAbout() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [carouselImages, setCarouselImages] = useState<string[]>(FALLBACK_IMAGES);
  const [isLoadingImages, setIsLoadingImages] = useState(true);

  const [officials, setOfficials] = useState<Official[]>([]);
  const [isLoadingOfficials, setIsLoadingOfficials] = useState(true);

  // ── Fetch announcement images ──────────────────────────────────────────────
  const fetchCarouselImages = useCallback(async () => {
    try {
      setIsLoadingImages(true);
      const res = await api.get<DBAnnouncement[]>('/api/announcements/resident');
      const announcements: DBAnnouncement[] = Array.isArray(res.data) ? res.data : [];

      const allUrls = collectAnnouncementImages(announcements);

      if (allUrls.length === 0) {
        // No images in any announcement — keep fallback
        setCarouselImages(FALLBACK_IMAGES);
      } else {
        // Shuffle and cap at MAX_CAROUSEL_IMAGES
        const selected = shuffle(allUrls).slice(0, MAX_CAROUSEL_IMAGES);
        setCarouselImages(selected);
      }
    } catch (err) {
      console.error('Failed to load announcement images', err);
      setCarouselImages(FALLBACK_IMAGES);
    } finally {
      setIsLoadingImages(false);
      setCurrentImageIndex(0); // reset to first slide whenever images refresh
    }
  }, []);

  useEffect(() => {
    fetchCarouselImages();
  }, [fetchCarouselImages]);

  // ── Fetch barangay officials ───────────────────────────────────────────────
  useEffect(() => {
    const fetchOfficials = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/officials');
        if (response.ok) {
          const data = await response.json();
          const activeOfficials: Official[] = data
            .filter((item: any) => item.status === true)
            .map((item: any) => ({
              id: item.barangayadminid,
              name: item.adminname,
              position: item.position || 'Barangay Official',
              image: item.profileimage
                ? resolveImageUrl(item.profileimage)
                : null,
            }));
          setOfficials(activeOfficials.length > 0 ? activeOfficials : mockOfficials);
        } else {
          setOfficials(mockOfficials);
        }
      } catch (error) {
        console.error('Error fetching officials data:', error);
        setOfficials(mockOfficials);
      } finally {
        setIsLoadingOfficials(false);
      }
    };
    fetchOfficials();
  }, []);

  // ── Carousel auto-advance every 5 s ───────────────────────────────────────
  useEffect(() => {
    if (carouselImages.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [carouselImages]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="pt-[73px] md:pt-[93px] min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-12">

        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-block mb-4 md:mb-6">
            <img
              src={imgBarangayLogo}
              alt="Barangay 160 Logo"
              className="w-16 h-16 md:w-24 md:h-24 object-contain mx-auto drop-shadow-lg"
            />
          </div>
          <h1 className="text-[28px] md:text-[40px] font-bold text-[#2957a1] mb-2">About Barangay 160</h1>
          <div className="w-24 md:w-32 h-1 bg-gradient-to-r from-transparent via-[#2957a1] to-transparent mx-auto mb-3 md:mb-4" />
          <p className="text-gray-600 text-[14px] md:text-[16px] max-w-2xl mx-auto">
            Zone 14, District 2, Tondo, Manila
          </p>
        </div>

        <div className="space-y-6 md:space-y-8">

          {/* Introduction */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-5 md:p-8">
            <h2 className="text-[20px] md:text-[24px] font-bold text-[#2957a1] mb-3 md:mb-4">Our Barangay</h2>
            <div className="space-y-3 md:space-y-4 text-gray-700 text-[14px] md:text-[15px] leading-relaxed">
              <p>
                Barangay 160, located in Zone 14, District II of the City of Manila, is a progressive
                and community-driven barangay dedicated to promoting good governance, peace, and
                sustainable development.
              </p>
              <p>
                Under the leadership of Hon. Michael Jordan Castillo, Barangay 160 continues to
                implement programs and initiatives that enhance public service delivery, ensure the
                safety and welfare of its constituents, and strengthen the spirit of unity among residents.
              </p>
              <p>
                We are committed to creating a safe, healthy, and prosperous community where every
                resident can thrive and contribute to the collective growth of our barangay.
              </p>
            </div>
          </div>

          {/* Vision & Mission */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            <div className="bg-gradient-to-br from-[#2957a1] to-[#1e4380] rounded-xl md:rounded-2xl shadow-lg p-6 md:p-8 text-white">
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                  </svg>
                </div>
                <h3 className="text-[19px] md:text-[22px] font-bold">Our Vision</h3>
              </div>
              <p className="text-white/95 text-[14px] md:text-[15px] leading-relaxed">
                A united, peaceful, and progressive Barangay 160 where residents enjoy quality
                public services, equal opportunities, and active participation in community development.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#5CE36C] to-[#4bc95b] rounded-xl md:rounded-2xl shadow-lg p-6 md:p-8 text-white">
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" />
                  </svg>
                </div>
                <h3 className="text-[19px] md:text-[22px] font-bold">Our Mission</h3>
              </div>
              <p className="text-white/95 text-[14px] md:text-[15px] leading-relaxed">
                To provide excellent public service, promote transparency and accountability,
                implement sustainable programs for health, education, and livelihood, and foster
                a culture of bayanihan and community solidarity.
              </p>
            </div>
          </div>

          {/* ── Community Activities Carousel ─────────────────────────────────── */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-5 md:p-8">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-[20px] md:text-[24px] font-bold text-[#2957a1]">Community Activities</h2>
              {!isLoadingImages && (
                <span className="text-xs text-gray-400 font-medium">
                  {currentImageIndex + 1} / {carouselImages.length}
                </span>
              )}
            </div>

            {isLoadingImages ? (
              /* Skeleton while images load */
              <div className="h-[250px] md:h-[400px] rounded-lg md:rounded-xl bg-gray-100 animate-pulse flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                </svg>
              </div>
            ) : (
              <div className="relative">
                {/* Main image */}
                <div className="relative h-[250px] md:h-[400px] rounded-lg md:rounded-xl overflow-hidden shadow-md bg-gray-100">
                  <ImageWithFallback
                    key={carouselImages[currentImageIndex]} // re-mount on src change for clean fade
                    src={carouselImages[currentImageIndex]}
                    alt={`Community activity ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover transition-opacity duration-500"
                  />
                  {/* Subtle gradient overlay at bottom */}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
                </div>

                {/* Prev button */}
                <button
                  onClick={() =>
                    setCurrentImageIndex((prev) =>
                      prev === 0 ? carouselImages.length - 1 : prev - 1
                    )
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2.5 md:p-3 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
                  aria-label="Previous image"
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-[#2957a1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Next button */}
                <button
                  onClick={() =>
                    setCurrentImageIndex((prev) =>
                      prev === carouselImages.length - 1 ? 0 : prev + 1
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2.5 md:p-3 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
                  aria-label="Next image"
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-[#2957a1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Dot indicators — show up to 15 dots */}
                <div className="flex justify-center gap-1.5 mt-4 flex-wrap">
                  {carouselImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        currentImageIndex === index
                          ? 'bg-[#2957a1] w-6'
                          : 'bg-gray-300 w-2 hover:bg-gray-400'
                      }`}
                      aria-label={`View image ${index + 1}`}
                    />
                  ))}
                </div>

                {/* Thumbnail strip — only shown when ≥ 4 images */}
                {carouselImages.length >= 4 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-1 snap-x scrollbar-hide">
                    {carouselImages.map((src, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden border-2 snap-start transition-all ${
                          currentImageIndex === index
                            ? 'border-[#2957a1] opacity-100 scale-105'
                            : 'border-transparent opacity-60 hover:opacity-90'
                        }`}
                        aria-label={`Jump to image ${index + 1}`}
                      >
                        <img
                          src={src}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-5 md:p-8">
            <h3 className="text-[22px] font-bold text-[#2957a1] mb-6 flex items-center gap-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-[#2957a1] mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                <div>
                  <p className="font-semibold text-gray-900">Address</p>
                  <p className="text-gray-600 text-[14px]">Zone 14, District 2, Tondo, Manila</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-[#2957a1] mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                </svg>
                <div>
                  <p className="font-semibold text-gray-900">Office Hours</p>
                  <p className="text-gray-600 text-[14px]">Monday - Friday, 8:00 AM - 5:00 PM</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-[#2957a1] mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
                <div>
                  <p className="font-semibold text-gray-900">Contact</p>
                  <p className="text-gray-600 text-[14px]">(02) 1234-5678</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-[#2957a1] mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
                <div>
                  <p className="font-semibold text-gray-900">Email</p>
                  <p className="text-gray-600 text-[14px]">barangay160@manila.gov.ph</p>
                </div>
              </div>
            </div>
          </div>

          {/* Barangay Officials */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-5 md:p-8">
            <h2 className="text-[20px] md:text-[24px] font-bold text-[#2957a1] mb-4 md:mb-6">Barangay Officials</h2>
            {isLoadingOfficials ? (
              <div className="flex justify-center py-8">
                <p className="text-gray-500 animate-pulse font-medium">Loading officials data...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {officials.map((official) => (
                  <div key={official.id} className="flex items-center gap-4">
                    <img
                      src={
                        official.image ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(official.name)}&background=2957a1&color=fff`
                      }
                      alt={`${official.name} - ${official.position}`}
                      className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-full shadow-md bg-white border border-gray-100"
                    />
                    <div>
                      <p className="font-bold text-gray-900">{official.name}</p>
                      <p className="text-gray-600 text-[14px]">{official.position}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}