import { useEffect, useMemo, useState } from "react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { api } from "../../utils/api";

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

/**
 * DB row shape (based on your backend SELECT * FROM announcement)
 */
type DBAnnouncement = {
  AnnouncementID?: number | string;
  Title?: string;
  Body?: string;
  Category?: string; // "students" | "senior-citizens" | "events" | "All" | etc.
  CreatedAt?: string;
  PostedByRole?: string;
  PostedByID?: string | number;
  Images?: string[]; // if you have this column; otherwise undefined
  images?: string[]; // fallback if backend returns lowercase
};

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80";

/**
 * Normalize DB Category -> UI Tags (must match your filter buttons)
 */
function categoryToTags(categoryRaw: string | null | undefined): string[] {
  const c = (categoryRaw || "").toLowerCase().trim();

  // Your admin UI uses values:
  // all, students, senior-citizens, pwd, events, health
  if (!c || c === "all") return [];

  if (c === "students" || c === "student") return ["Student"];
  if (c === "senior-citizens" || c === "senior citizen" || c === "senior") return ["Senior Citizen"];
  if (c === "events" || c === "event") return ["Events"];

  // If you stored custom audiences (e.g. "Primary 4A"), treat as a tag
  // so it still appears and can be filtered later if you add buttons.
  return [categoryRaw as string];
}

/**
 * Map DB row -> Resident UI Announcement
 */
function mapDbToResident(a: DBAnnouncement): Announcement {
  const id = String(a.AnnouncementID ?? "");

  const title = a.Title ?? "";
  const details = a.Body ?? "";

  const tags = categoryToTags(a.Category);

  const created = a.CreatedAt ? new Date(a.CreatedAt) : new Date();
  const date = created.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const postedByRole = a.PostedByRole ?? "Admin";
  const postedById = a.PostedByID ?? "";
  const postedBy = postedById ? `${postedByRole} (${postedById})` : postedByRole;

  const imgs = Array.isArray(a.Images)
    ? a.Images
    : Array.isArray(a.images)
    ? a.images
    : [];

  const image = imgs.length > 0 ? imgs[0] : PLACEHOLDER_IMAGE;

  // description is the short preview shown on the card
  const description =
    details.length > 120 ? `${details.slice(0, 120).trim()}…` : details;

  return {
    id,
    title,
    tags: tags.length ? tags : ["Announcement"], // show something even if Category=All
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

  // Filter buttons (matches your original UI)
  const tags = ["Student", "Senior Citizen", "Events"];

  useEffect(() => {
    const fetchResidentAnnouncements = async () => {
      try {
        setLoading(true);
        const res = await api.get("/api/announcements/resident");
        const rows = Array.isArray(res.data) ? (res.data as DBAnnouncement[]) : [];
        setItems(rows.map(mapDbToResident));
      } catch (err) {
        console.error("Failed to load resident announcements:", err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResidentAnnouncements();
  }, []);

  const filteredAnnouncements = useMemo(() => {
    if (!selectedTag) return items;
    return items.filter((a) => a.tags.includes(selectedTag));
  }, [items, selectedTag]);

  return (
    <div className="pt-[73px] md:pt-[93px] min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-10">
        {/* Header Section */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-[24px] md:text-[32px] font-bold text-[#2957a1] mb-2">
            Announcements
          </h1>
          <p className="text-gray-600 text-[13px] md:text-[14px]">
            Stay updated with the latest news and events from Barangay 160
          </p>
        </div>

        {/* Filter Section */}
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

        {/* Loading State */}
        {loading && (
          <div className="text-center py-14 bg-white rounded-xl shadow-sm">
            <p className="text-gray-500 text-lg font-medium">Loading announcements…</p>
          </div>
        )}

        {/* Announcements Grid */}
        {!loading && (
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
                    <p className="text-[10px] md:text-[11px] font-bold text-[#2957a1]">
                      {announcement.date}
                    </p>
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
            <p className="text-gray-500 text-lg font-medium">No announcements found</p>
            <p className="text-gray-400 text-sm mt-1">Try selecting a different filter</p>
          </div>
        )}
      </div>
    </div>
  );
}

export type { Announcement };