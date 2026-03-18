import { useEffect, useMemo, useState, useCallback } from "react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { api } from "../../utils/api";

export interface Announcement {
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

type DBAnnouncement = {
  AnnouncementID?: number | string;
  Title?: string;
  Body?: string;
  Category?: string[] | string;
  CreatedAt?: string;
  PublishedDate?: string | null;
  PostedByRole?: string;
  PostedByID?: string | number;
  Images?: string[];
  Status?: string;
  IsScheduled?: boolean;
  IsPublished?: boolean;
  ExpirationDate?: string | null;
};

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80";

const POLL_INTERVAL_MS = 60 * 1000;

/**
 * Normalize a single category value -> filter button label.
 * Handles all casings and formats the admin form may send.
 *
 * Admin dropdown values:  "all" | "students" | "senior-citizens" | "health" | "events"
 * Filter button labels:   "Students" | "Senior Citizen" | "Health" | "Events"
 */
function normalizeCategory(raw: string): string {
  const c = raw.toLowerCase().trim();
  if (!c || c === "all") return "";
  if (c === "students" || c === "student") return "Students";
  if (
    c === "senior-citizens" ||
    c === "senior citizen" ||
    c === "seniorcitizen" ||
    c === "senior"
  )
    return "Senior Citizen";
  if (c === "events" || c === "event") return "Events";
  if (c === "health") return "Health";
  if (c === "pwd") return "PWD";
  return raw.trim();
}

/**
 * Category can come back as TEXT[] array OR a plain string depending
 * on how old/new the row is. Handle both safely.
 */
function categoryArrayToTags(
  category: string[] | string | null | undefined
): string[] {
  if (!category) return [];
  const arr = Array.isArray(category) ? category : [String(category)];
  return arr.map(normalizeCategory).filter((t) => t.length > 0);
}

function mapDbToResident(a: DBAnnouncement): Announcement {
  const id = String(a.AnnouncementID ?? "");
  const title = a.Title ?? "";
  const details = a.Body ?? "";
  const tags = categoryArrayToTags(a.Category);

  const dateSource = a.PublishedDate ?? a.CreatedAt;
  const created = dateSource ? new Date(dateSource) : new Date();
  const date = created.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const postedByRole = a.PostedByRole ?? "Admin";
  const postedById = a.PostedByID ?? "";
  const postedBy = postedById
    ? `${postedByRole} (${postedById})`
    : postedByRole;

  const imgs = Array.isArray(a.Images) ? a.Images : [];
  const image = imgs.length > 0 ? imgs[0] : PLACEHOLDER_IMAGE;

  const description =
    details.length > 120 ? `${details.slice(0, 120).trim()}…` : details;

  return {
    id,
    title,
    tags: tags.length ? tags : ["Announcement"],
    image,
    images: imgs.length ? imgs : undefined,
    description,
    details,
    date,
    postedBy,
  };
}

export function ResidentHome({ onAnnouncementClick }: ResidentHomeProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);

  // These must exactly match the output of normalizeCategory()
  const tags = ["Students", "Senior Citizen", "Health", "Events"];

  const fetchResidentAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/announcements/resident");
      const rows = Array.isArray(res.data)
        ? (res.data as DBAnnouncement[])
        : [];
      setItems(rows.map(mapDbToResident));
    } catch (err) {
      console.error("Failed to load resident announcements:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResidentAnnouncements();
    const interval = setInterval(fetchResidentAnnouncements, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchResidentAnnouncements]);

  const filteredAnnouncements = useMemo(() => {
    if (!selectedTag) return items;
    return items.filter((a) => a.tags.includes(selectedTag));
  }, [items, selectedTag]);

  return (
    <div className="pt-[73px] md:pt-[93px] min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-10">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-[24px] md:text-[32px] font-bold text-[#2957a1] mb-2">
            Announcements
          </h1>
          <p className="text-gray-600 text-[13px] md:text-[14px]">
            Stay updated with the latest news and events from Barangay 160
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="mb-6 md:mb-8 flex flex-wrap items-center gap-2 md:gap-3 bg-white p-3 md:p-4 rounded-lg shadow-sm">
          <span className="text-[13px] md:text-[14px] font-semibold text-[#2957a1] w-full md:w-auto mb-1 md:mb-0">
            FILTER BY:
          </span>

          <button
            onClick={() => setSelectedTag(null)}
            className={`px-4 md:px-5 py-2 rounded-full border-2 font-semibold text-[11px] transition-all ${
              selectedTag === null
                ? "bg-[#2957a1] text-white border-[#2957a1] shadow-md"
                : "bg-white text-gray-700 border-gray-300 hover:border-[#2957a1] hover:text-[#2957a1]"
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
                  ? "bg-[#2957a1] text-white border-[#2957a1] shadow-md"
                  : "bg-white text-gray-700 border-gray-300 hover:border-[#2957a1] hover:text-[#2957a1]"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && items.length === 0 && (
          <div className="text-center py-14 bg-white rounded-xl shadow-sm">
            <p className="text-gray-500 text-lg font-medium">
              Loading announcements…
            </p>
          </div>
        )}

        {/* Grid */}
        {(!loading || items.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                onClick={() => onAnnouncementClick(announcement)}
                className="cursor-pointer group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1"
              >
                <div className="relative bg-gray-200 overflow-hidden h-[180px] md:h-[220px]">
                  <ImageWithFallback
                    src={announcement.image}
                    alt={announcement.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 md:top-3 right-2 md:right-3 bg-white/95 backdrop-blur-sm px-2 md:px-3 py-1 rounded-full shadow-md">
                    <p className="text-[10px] md:text-[11px] font-bold text-[#2957a1]">
                      {announcement.date}
                    </p>
                  </div>
                </div>

                <div className="p-4 md:p-5">
                  <h3 className="text-[18px] md:text-[20px] text-[#2957a1] font-bold mb-2 md:mb-3 line-clamp-2 group-hover:text-[#1e4380] transition-colors">
                    {announcement.title}
                  </h3>

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

                  <p className="text-gray-600 text-[12px] md:text-[13px] line-clamp-2 leading-relaxed">
                    {announcement.description}
                  </p>

                  <div className="mt-4 flex items-center text-[#2957a1] text-[12px] font-semibold group-hover:gap-2 transition-all">
                    <span>Read more</span>
                    <svg
                      className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredAnnouncements.length === 0 && (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <p className="text-gray-500 text-lg font-medium">
              No announcements found
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Try selecting a different filter
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export type { Announcement as ResidentAnnouncement };