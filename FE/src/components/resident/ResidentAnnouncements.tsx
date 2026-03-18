import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "../ui/card";
import { toast } from "sonner";
import { api } from "../../utils/api";

// Expanded type to include all columns the backend actually returns.
// Previously missing: Status, PublishedDate, ScheduledPublishDate,
// ExpirationDate, Images, Category — causing silent undefined errors.
export type DBAnnouncement = {
  AnnouncementID: string;
  Title: string;
  Body: string;
  CreatedAt: string;
  PublishedDate: string | null;
  ScheduledPublishDate: string | null;
  ExpirationDate: string | null;
  Status: string;
  IsScheduled: boolean;
  IsPublished: boolean;
  PostedByRole: string;
  PostedByID: string;
  Images: string[];
  PostedByName?: string;
  Category: string[];
};

// How often (ms) the resident view re-fetches announcements.
// Keeps the page in sync with the server-side scheduler without
// requiring a full page reload.
const POLL_INTERVAL_MS = 60 * 1000; // 60 seconds

export function ResidentAnnouncements() {
  const [items, setItems] = useState<DBAnnouncement[]>([]);
  const [loading, setLoading] = useState(false);

  // Extracted into useCallback so the same reference can
  // be passed to both the initial useEffect call and setInterval.
  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/announcements/resident");
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load announcements", err);
      toast.error("Failed to load announcements");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch immediately on mount.
    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchAnnouncements]);

  if (loading && items.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-600">
          Loading announcements…
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-600">
          No announcements yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {items.map((a) => (
        <Card key={a.AnnouncementID}>
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{a.Title}</h2>

              <span className="text-xs text-gray-500">
                {new Date(a.PublishedDate ?? a.CreatedAt).toLocaleString()}
              </span>
            </div>

            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {a.Body}
            </p>

            {/* Category tags */}
            {Array.isArray(a.Category) && a.Category.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {a.Category.map((cat) => (
                  <span
                    key={cat}
                    className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[11px] font-semibold text-blue-700"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <div className="text-xs text-gray-500">
                Posted by: {a.PostedByRole} ({a.PostedByID})
              </div>

              {/* Expiration notice */}
              {a.ExpirationDate && (
                <div className="text-xs text-orange-500">
                  Expires:{" "}
                  {new Date(a.ExpirationDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}