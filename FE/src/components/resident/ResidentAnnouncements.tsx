import { useEffect, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { toast } from "sonner";
import { api } from "../../utils/api";

type DBAnnouncement = {
  AnnouncementID: string;
  Title: string;
  Body: string;
  CreatedAt: string;
  PostedByRole: string;
  PostedByID: string;
  IsPublished: boolean;
};

export function ResidentAnnouncements() {
  const [items, setItems] = useState<DBAnnouncement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true);

        // Residents fetch only published announcements
        const res = await api.get("/api/announcements/resident");

        setItems(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to load announcements", err);
        toast.error("Failed to load announcements");
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  if (loading) {
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
                {new Date(a.CreatedAt).toLocaleString()}
              </span>
            </div>

            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {a.Body}
            </p>

            <div className="text-xs text-gray-500">
              Posted by: {a.PostedByRole} ({a.PostedByID})
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}