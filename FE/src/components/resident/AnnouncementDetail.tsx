import { ArrowLeft, Calendar, User, X } from "lucide-react";
import { InquiryForm } from "./InquiryForm";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { useState, useEffect } from "react";
import { DBAnnouncement } from "./ResidentAnnouncements";

interface AnnouncementDetailProps {
  announcement: DBAnnouncement | any;
  onBack: () => void;
}

/**
 * Normalize a raw DB category value to a display label.
 */
function normalizeCategoryLabel(raw: string): string {
  if (!raw) return "Announcement";
  const c = raw
    .toLowerCase()
    .replace(/[\{\}\[\]\\"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!c || c === "all") return "Announcement";
  if (c === "students" || c === "student") return "Students";
  if (c === "senior-citizens" || c === "senior citizen" || c === "senior")
    return "Senior Citizen";
  if (c === "events" || c === "event") return "Events";
  if (c === "health") return "Health";
  if (c === "pwd") return "PWD";
  return raw.trim();
}

const getPriorityBadge = (categories: string[]) => {
  const normalized = categories.map((c) => normalizeCategoryLabel(c));
  if (normalized.includes("Events"))
    return { text: "Event", color: "bg-blue-500" };
  if (normalized.includes("Senior Citizen"))
    return { text: "Important", color: "bg-orange-500" };
  if (normalized.includes("Students"))
    return { text: "Students", color: "bg-green-500" };
  if (normalized.includes("Health"))
    return { text: "Health", color: "bg-red-500" };
  return { text: "Announcement", color: "bg-[#2957a1]" };
};

export function AnnouncementDetail({
  announcement,
  onBack,
}: AnnouncementDetailProps) {
  const a = announcement || {};
  const [liveData, setLiveData] = useState<any>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  useEffect(() => {
    const id = a.id || a.AnnouncementID || a.announcementid;
    if (!id) return;

    const fetchRawData = async () => {
      try {
        const res = await fetch("https://se-barangay-web-system.onrender.com/api/announcements");
        if (res.ok) {
          const allAnnouncements = await res.json();
          const exactMatch = allAnnouncements.find(
            (x: any) => String(x.AnnouncementID) === String(id)
          );
          if (exactMatch) {
            setLiveData(exactMatch);
          }
        }
      } catch (error) {
        console.error("Failed to fetch live announcement data:", error);
      }
    };

    fetchRawData();
  }, [a.id, a.AnnouncementID, a.announcementid]);

  const source = liveData || a;

  const title = source.Title || source.title || a.title || "Untitled Announcement";
  const announcementId = source.AnnouncementID || source.announcementid || a.id || a.AnnouncementID || a.announcementid || null;
  const body =
    source.Body ||
    source.body ||
    source.content ||
    a.content ||
    "No content available.";

  const rawCategory =
    source.Category || source.category || source.targetAudience || a.targetAudience;

  const categories = Array.isArray(rawCategory)
    ? rawCategory
    : rawCategory && rawCategory !== "all"
      ? [rawCategory]
      : [];

  const rawImages = source.Images || source.images || a.images;
  let parsedImages: string[] = [];

  if (Array.isArray(rawImages)) {
    parsedImages = rawImages;
  } else if (typeof rawImages === "string") {
    try {
      parsedImages = JSON.parse(rawImages);
    } catch {
      const cleaned = rawImages.replace(/^{|}$/g, "");
      parsedImages = cleaned
        ? cleaned.split(",").map((s) => s.replace(/(^"|"$)/g, "").trim())
        : [];
    }
  }

  const displayImages = parsedImages
    .filter((img: string) => img && img.trim() !== "")
    .map((img: string) => {
      const cleanUrl = img.trim();
      if (cleanUrl.startsWith("/uploads")) {
        return `https://se-barangay-web-system.onrender.com${cleanUrl}`;
      }
      return cleanUrl;
    });

  const rawDate =
    source.PublishedDate ||
    source.publisheddate ||
    source.CreatedAt ||
    source.createdat ||
    a.datePosted ||
    a.dateCreated;

  let displayDate = "Date unavailable";
  if (rawDate) {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      displayDate = d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  const expirationDate =
    source.ExpirationDate || source.expirationdate || a.expirationDate;

  const rawName =
    source.PostedByName ||
    source.postedByName ||
    source.postedbyname ||
    a.postedBy ||
    a.postedByName;

  let posterName = typeof rawName === "string" ? rawName.split("(AD")[0].trim() : "";
  if (
    !posterName ||
    posterName.toLowerCase() === "official" ||
    posterName.toLowerCase() === "system"
  ) {
    posterName = "Barangay Official";
  }

  const rawRole =
    source.PostedByRole ||
    source.postedByRole ||
    source.postedbyrole ||
    a.PostedByRole ||
    a.role;

  let posterRole = typeof rawRole === "string" ? rawRole : "Admin";
  if (
    posterRole.toLowerCase() === "official" ||
    posterRole.toLowerCase() === "admin"
  ) {
    posterRole = "Barangay Admin";
  }

  const posterDisplay =
    posterName === posterRole ? posterName : `${posterName} - ${posterRole}`;

  const normalizedCategories = categories.map(normalizeCategoryLabel);
  const priority = getPriorityBadge(categories);

  return (
    <>
      <div className="pt-[93px] min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-[900px] mx-auto px-3 sm:px-6 py-4 sm:py-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#2957a1] text-[14px] sm:text-[16px] font-semibold hover:text-[#1e4380] transition-colors mb-4 sm:mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Announcements
          </button>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 shrink-0 bg-[#2957a1] rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] sm:text-[18px] font-bold text-gray-900">Barangay 160</h3>
                    <div className="flex items-center gap-2 text-[12px] sm:text-[13px] text-gray-600 mt-0.5 flex-wrap">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      <span>{displayDate}</span>
                      <span className="text-gray-400">•</span>
                    </div>
                  </div>
                </div>

                {(() => {
                  const firstCat = normalizedCategories.find((cat) => cat !== "Announcement");
                  return firstCat ? (
                    <span className="shrink-0 px-3 py-1 rounded-full bg-blue-50 border border-[#2957a1]/30 text-[11px] font-semibold text-[#2957a1] whitespace-nowrap">
                      {firstCat}
                    </span>
                  ) : null;
                })()}
              </div>

              <h1 className="text-[20px] sm:text-[28px] font-bold text-[#2957a1] leading-tight">{title}</h1>
            </div>

            {displayImages.length > 0 && (
              <div className="relative bg-gray-100">
                {displayImages.length === 1 && (
                  <div
                    className="cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setFullScreenImage(displayImages[0])}
                  >
                    <ImageWithFallback
                      src={displayImages[0]}
                      alt={title}
                      className="w-full h-auto max-h-[500px] object-cover"
                    />
                  </div>
                )}

                {displayImages.length === 2 && (
                  <div className="grid grid-cols-2 gap-1">
                    {displayImages.map((img: string, idx: number) => (
                      <div
                        key={idx}
                        className="cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setFullScreenImage(img)}
                      >
                        <ImageWithFallback
                          src={img}
                          alt={`${title} ${idx + 1}`}
                          className="w-full h-[350px] object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {displayImages.length === 3 && (
                  <div className="grid grid-cols-2 gap-1">
                    <div
                      className="cursor-pointer hover:opacity-90 transition-opacity row-span-2"
                      onClick={() => setFullScreenImage(displayImages[0])}
                    >
                      <ImageWithFallback
                        src={displayImages[0]}
                        alt={`${title} 1`}
                        className="w-full h-[500px] object-cover"
                      />
                    </div>
                    <div
                      className="cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setFullScreenImage(displayImages[1])}
                    >
                      <ImageWithFallback
                        src={displayImages[1]}
                        alt={`${title} 2`}
                        className="w-full h-[249px] object-cover"
                      />
                    </div>
                    <div
                      className="cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setFullScreenImage(displayImages[2])}
                    >
                      <ImageWithFallback
                        src={displayImages[2]}
                        alt={`${title} 3`}
                        className="w-full h-[249px] object-cover"
                      />
                    </div>
                  </div>
                )}

                {displayImages.length === 4 && (
                  <div className="grid grid-cols-2 gap-1">
                    {displayImages.map((img: string, idx: number) => (
                      <div
                        key={idx}
                        className="cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setFullScreenImage(img)}
                      >
                        <ImageWithFallback
                          src={img}
                          alt={`${title} ${idx + 1}`}
                          className="w-full h-[300px] object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {displayImages.length === 5 && (
                  <div className="grid grid-cols-3 gap-1">
                    <div
                      className="cursor-pointer hover:opacity-90 transition-opacity col-span-2"
                      onClick={() => setFullScreenImage(displayImages[0])}
                    >
                      <ImageWithFallback
                        src={displayImages[0]}
                        alt={`${title} 1`}
                        className="w-full h-[400px] object-cover"
                      />
                    </div>
                    <div
                      className="cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setFullScreenImage(displayImages[1])}
                    >
                      <ImageWithFallback
                        src={displayImages[1]}
                        alt={`${title} 2`}
                        className="w-full h-[400px] object-cover"
                      />
                    </div>
                    <div
                      className="cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setFullScreenImage(displayImages[2])}
                    >
                      <ImageWithFallback
                        src={displayImages[2]}
                        alt={`${title} 3`}
                        className="w-full h-[199px] object-cover"
                      />
                    </div>
                    <div
                      className="cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setFullScreenImage(displayImages[3])}
                    >
                      <ImageWithFallback
                        src={displayImages[3]}
                        alt={`${title} 4`}
                        className="w-full h-[199px] object-cover"
                      />
                    </div>
                    <div
                      className="cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setFullScreenImage(displayImages[4])}
                    >
                      <ImageWithFallback
                        src={displayImages[4]}
                        alt={`${title} 5`}
                        className="w-full h-[199px] object-cover"
                      />
                    </div>
                  </div>
                )}

                {displayImages.length > 5 && (
                  <div className="grid grid-cols-2 gap-1">
                    {displayImages.slice(0, 3).map((img: string, idx: number) => (
                      <div
                        key={idx}
                        className="cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setFullScreenImage(img)}
                      >
                        <ImageWithFallback
                          src={img}
                          alt={`${title} ${idx + 1}`}
                          className="w-full h-[300px] object-cover"
                        />
                      </div>
                    ))}
                    <div
                      className="relative cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setFullScreenImage(displayImages[3])}
                    >
                      <ImageWithFallback
                        src={displayImages[3]}
                        alt={`${title} 4`}
                        className="w-full h-[300px] object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">
                          +{displayImages.length - 4}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="p-4 sm:p-6">
              <div className="mb-6">
                <p className="text-[14px] sm:text-[16px] text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {body}
                </p>
              </div>

              {expirationDate && (
                <div className="mb-4 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
                  This announcement expires on{" "}
                  <span className="font-semibold">
                    {new Date(expirationDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  .
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4" />
                  <span className="text-[14px]">
                    <span className="font-semibold">Posted by:</span> {posterDisplay}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <InquiryForm announcementTitle={title} announcementId={announcementId} inline={true} />
        </div>
      </div>

      {fullScreenImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setFullScreenImage(null)}
        >
          <button
            className="absolute top-6 right-6 text-white hover:text-gray-300 bg-black/50 hover:bg-black/80 rounded-full p-2 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setFullScreenImage(null);
            }}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={fullScreenImage}
            alt="Fullscreen"
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl cursor-default"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
