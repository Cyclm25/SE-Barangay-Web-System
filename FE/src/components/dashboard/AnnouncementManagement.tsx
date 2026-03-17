import React, { useEffect, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import {
  Megaphone,
  Plus,
  Edit,
  Eye,
  Archive,
  Clock,
  User,
  Calendar,
  Send,
  ImageIcon,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../utils/api";

interface Announcement {
  id: string;
  title: string;
  content: string;
  images: string[];
  targetAudience: string;
  dateCreated: string;
  datePosted?: string;
  scheduledPublishDate?: string;
  isScheduled?: boolean;
  expirationDate?: string;
  postedBy: string;
  postedByName?: string;
  status: "draft" | "posted" | "archived";
  tags: string[];
}

/**
 * Robust mapper:
 * - supports DB shapes with either Status or IsPublished
 * - supports Body/content naming
 * - constructs full name from FirstName and LastName
 */
function mapApiAnnouncementToUI(a: any): Announcement {
  const rawStatus = (a.Status ?? a.status ?? "").toString().toLowerCase();

  let status: Announcement["status"] = "posted";

  if (rawStatus === "archived") status = "archived";
  else if (rawStatus === "draft" || rawStatus === "drafts") status = "draft";
  else if (rawStatus === "posted" || rawStatus === "active") status = "posted";
  else {
    // fallback if your DB uses IsPublished boolean
    if (typeof a.IsPublished === "boolean") {
      status = a.IsPublished ? "posted" : "draft";
    }
  }

  // Build full name from FirstName and LastName
  const buildFullName = () => {
    const firstName = a.FirstName ?? a.firstName ?? "";
    const lastName = a.LastName ?? a.lastName ?? "";
    const fullName = `${firstName} ${lastName}`.trim();
    
    return fullName || (a.PostedByName ?? a.postedBy ?? "Admin");
  };

  return {
    id: String(a.AnnouncementID ?? a.announcementid ?? a.id),
    title: a.Title ?? a.title ?? "",
    content: a.Body ?? a.body ?? a.Content ?? a.content ?? "",
    images: Array.isArray(a.Images ?? a.images) ? (a.Images ?? a.images) : [],
    targetAudience: a.TargetAudience ?? a.targetAudience ?? a.Category ?? a.category ?? "all",
    dateCreated: a.CreatedAt ?? a.createdat ?? new Date().toISOString(),
    datePosted:
      a.PostedAt ??
      a.postedat ??
      a.DatePosted ??
      a.datePosted ??
      a.PublishedDate ??
      a.publisheddate ??
      a.CreatedAt ??
      a.createdat ??
      undefined,
    scheduledPublishDate: a.ScheduledPublishDate ?? a.scheduledPublishDate ?? undefined,
    isScheduled: a.IsScheduled ?? a.isScheduled ?? false,
    expirationDate: a.ExpirationDate ?? a.expirationDate ?? undefined,
    postedBy: buildFullName(),
    postedByName: a.PostedByName ?? a.postedByName ?? buildFullName(),
    status,
    tags: Array.isArray(a.Tags ?? a.tags) ? (a.Tags ?? a.tags) : [],
  };
}

export function AnnouncementManagement() {
  const [isSaving, setIsSaving] = useState(false);

  const [customTargetAudiences, setCustomTargetAudiences] = useState<string[]>([
  
  ]);

  // NOW: announcements come from DB/API (not hardcoded)
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);
  const [viewingAnnouncement, setViewingAnnouncement] =
    useState<Announcement | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    images: [] as string[],
    targetAudience: "all" as Announcement["targetAudience"],
    tags: [] as string[],
    isScheduled: false,
    scheduledDate: "",
    scheduledTime: "",
    hasExpiration: false,
    expirationDate: "",
    expirationTime: "",
  });

  const [newCustomAudience, setNewCustomAudience] = useState("");

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      images: [],
      targetAudience: "all",
      tags: [],
      isScheduled: false,
      scheduledDate: "",
      scheduledTime: "",
      hasExpiration: false,
      expirationDate: "",
      expirationTime: "",
    });
    setEditingAnnouncement(null);
    setNewCustomAudience("");
  };

  // ✅ Reusable fetch so we can refresh after archive/post
  const fetchAnnouncements = async () => {
    try {
      const res = await api.get("/api/announcements");
      const mapped: Announcement[] = (Array.isArray(res.data) ? res.data : []).map(
        mapApiAnnouncementToUI
      );
      setAnnouncements(mapped);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load announcements");
      setAnnouncements([]);
    }
  };

  // ✅ FETCH announcements on load
  useEffect(() => {
    fetchAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddCustomAudience = () => {
    if (!newCustomAudience.trim()) {
      toast.error("Please enter a custom target audience");
      return;
    }

    if (customTargetAudiences.includes(newCustomAudience.trim())) {
      toast.error("This target audience already exists");
      return;
    }

    setCustomTargetAudiences([...customTargetAudiences, newCustomAudience.trim()]);
    setFormData({ ...formData, targetAudience: newCustomAudience.trim() });
    toast.success(`Added "${newCustomAudience.trim()}" to target audiences`);
    setNewCustomAudience("");
  };

  // ✅ CREATE/UPDATE announcement via API (POST)
  if (isSaving) return;
  const handleCreateOrUpdate = async (saveAsDraft: boolean = false) => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const raw = localStorage.getItem("app_user");
      const user = raw ? JSON.parse(raw) : null;

      const postedByRole = user?.role; // expect: "BarangayAdmin" or "SuperAdmin"
      const postedById = user?.id;

      if (!postedByRole || !postedById) {
        toast.error("Missing user session. Please log in again.");
        return;
      }

      const payload = {
        title: formData.title.trim(),
        body: formData.content.trim(),
        images: formData.images,
        targetAudience: formData.targetAudience,
        tags: formData.tags,
        status: saveAsDraft ? "draft" : "posted",
        postedByRole,
        postedById,
        // NEW: Scheduled publishing
        isScheduled: formData.isScheduled && !!formData.scheduledDate,
        scheduledPublishDate: formData.isScheduled && formData.scheduledDate 
          ? `${formData.scheduledDate}T${formData.scheduledTime || "00:00"}:00`
          : null,
        // NEW: Expiration
        expirationDate: formData.hasExpiration && formData.expirationDate
          ? `${formData.expirationDate}T${formData.expirationTime || "23:59"}:59`
          : null,
      };

      setIsSaving(true);
      try {
        await api.post("/api/announcements", payload);

        toast.success(
          saveAsDraft ? "Announcement saved as draft" : "Announcement posted successfully"
        );

        setIsDialogOpen(false);
        resetForm();
        await fetchAnnouncements();
      } finally {
        setIsSaving(false);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save announcement", {
        description: err?.response?.data?.error || err?.message || "Check backend /api/announcements",
      });
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      images: announcement.images,
      targetAudience: announcement.targetAudience,
      tags: announcement.tags,
      isScheduled: announcement.isScheduled ?? false,
      scheduledDate: "",
      scheduledTime: "",
      hasExpiration: false,
      expirationDate: "",
      expirationTime: "",
    });
    setIsDialogOpen(true);
  };

  /**
   * ✅ ARCHIVE (PERSISTENT)
   * Calls backend PATCH /api/announcements/:id/archive
   * then refreshes list from DB
   */
  const handleArchive = async (id: string) => {
    try {
      await api.patch(`/api/announcements/${id}/archive`);
      toast.success("Announcement archived");
      await fetchAnnouncements();
    } catch (err) {
      console.error(err);
      toast.error("Failed to archive announcement");
    }
  };

  /**
   * NOTE: publish is still UI-only unless you add backend route for it.
   * (You can add PATCH /api/announcements/:id/publish later.)
   */
  const handlePublish = (id: string) => {
    setAnnouncements((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "posted", datePosted: new Date().toISOString() } : a
      )
    );
    toast.success("Announcement published (UI only)");
  };

  const postedAnnouncements = announcements.filter((a) => a.status === "posted");
  const draftAnnouncements = announcements.filter((a) => a.status === "draft");
  const archivedAnnouncements = announcements.filter((a) => a.status === "archived");

  const getTargetAudienceBadge = (targetAudience: string) => {
  switch (targetAudience) {
    case 'all': return 'All';
    case 'students': return 'Students';
    case 'senior-citizens': return 'Senior Citizen';
    case 'health': return 'Health';
    case 'events': return 'Events';
    default: return targetAudience;
  }
};

  const AnnouncementCard = ({ announcement }: { announcement: Announcement }) => (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="flex gap-4 p-4">
          {/* Image Thumbnail */}
          <div className="flex-shrink-0">
            {announcement.images && announcement.images.length > 0 ? (
              <div className="relative">
                <img
                  src={announcement.images[0]}
                  alt={announcement.title}
                  className="w-32 h-32 object-cover rounded-lg"
                />
                {announcement.images.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    +{announcement.images.length - 1}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 line-clamp-1">
                {announcement.title}
              </h3>
              <div className="flex items-center gap-1 flex-shrink-0">
                {announcement.expirationDate && new Date(announcement.expirationDate) < new Date() && (
                  <Badge className="bg-red-100 text-red-800 border-0 text-xs">
                    ⏰ Expired
                  </Badge>
                )}
                {announcement.isScheduled && (
                  <Badge className="bg-blue-100 text-blue-800 border-0 text-xs">
                    📅 Scheduled
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {getTargetAudienceBadge(announcement.targetAudience)}
                </Badge>
              </div>
            </div>

            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
              {announcement.content}
            </p>

            <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>Posted by: {announcement.postedByName || announcement.postedBy}</span>
              </div>
              {announcement.expirationDate && (
                <div className="flex items-center gap-1 font-semibold text-red-600">
                  <Calendar className="w-3 h-3" />
                  <span>
                    Expires: {new Date(announcement.expirationDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {announcement.isScheduled && announcement.scheduledPublishDate ? (
                <div className="flex items-center gap-1 font-semibold text-blue-600">
                  <Clock className="w-3 h-3" />
                  <span>
                    Scheduled: {new Date(announcement.scheduledPublishDate).toLocaleDateString()} at{" "}
                    {new Date(announcement.scheduledPublishDate).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ) : announcement.datePosted ? (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(announcement.datePosted).toLocaleDateString()}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    Created: {new Date(announcement.dateCreated).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingAnnouncement(announcement)}
                className="gap-1"
              >
                <Eye className="w-3 h-3" />
                View
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(announcement)}
                className="gap-1"
              >
                <Edit className="w-3 h-3" />
                Edit
              </Button>

              {announcement.status === "draft" && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handlePublish(announcement.id)}
                  className="gap-1"
                >
                  <Send className="w-3 h-3" />
                  Publish
                </Button>
              )}

              {/* ✅ Archive only (no delete) + confirmation */}
              {announcement.status === "posted" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Archive className="w-3 h-3" />
                      Archive
                    </Button>
                  </AlertDialogTrigger>

                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Archive Announcement?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to archive this announcement? Residents will no longer see it.
                      </AlertDialogDescription>

                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => void handleArchive(announcement.id)}
                      > Yes, archive it
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Megaphone className="w-6 h-6" />
            Announcements
          </h1>
          <p className="text-gray-600 mt-1">Create and manage barangay announcements</p>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#2957a1] text-white hover:bg-[#1e3f7a]">
              <Plus className="w-4 h-4" />
              ADD NEW ANNOUNCEMENT
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAnnouncement ? "Edit Announcement" : "Create New Announcement"}
              </DialogTitle>
              <DialogDescription>
                {editingAnnouncement
                  ? "Update the announcement details below."
                  : "Fill in the details to create a new announcement for the community."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter announcement title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter announcement content"
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label>Images (Optional, Max 5)</Label>
                <div className="space-y-2">
                  {[0, 1, 2, 3, 4].map((index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={formData.images[index] || ""}
                        onChange={(e) => {
                          const newImages = [...formData.images];
                          if (e.target.value) newImages[index] = e.target.value;
                          else newImages.splice(index, 1);
                          setFormData({ ...formData, images: newImages.filter((img) => img) });
                        }}
                        placeholder={`Image ${index + 1} URL`}
                      />
                      {index === 0 && (
                        <Button variant="outline" size="icon" type="button">
                          <Upload className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {formData.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {formData.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}
              </div>

<div className="space-y-2">
  <Label htmlFor="targetAudience">Target Audience</Label>
  <Select
    value={formData.targetAudience}
    onValueChange={(value) =>
      setFormData({
        ...formData,
        targetAudience: value as Announcement["targetAudience"],
      })
    }
  >
    <SelectTrigger id="targetAudience">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All</SelectItem>
      <SelectItem value="students">Students</SelectItem>
      <SelectItem value="senior-citizens">Senior Citizen</SelectItem>
      <SelectItem value="health">Health</SelectItem>
      <SelectItem value="events">Events</SelectItem>
      {customTargetAudiences.map((audience) => (
        <SelectItem key={audience} value={audience}>
          {audience}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
 


              {/* NEW: Scheduled Publishing Section */}
              <div className="space-y-2 border-t pt-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isScheduled"
                    checked={formData.isScheduled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isScheduled: e.target.checked,
                        scheduledDate: e.target.checked ? formData.scheduledDate : "",
                        scheduledTime: e.target.checked ? formData.scheduledTime : "",
                      })
                    }
                    className="w-4 h-4 rounded border border-gray-300 cursor-pointer"
                  />
                  <Label htmlFor="isScheduled" className="font-semibold cursor-pointer">
                    Schedule this announcement for later
                  </Label>
                </div>

                {formData.isScheduled && (
                  <div className="space-y-3 mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="scheduledDate">Date *</Label>
                        <Input
                          id="scheduledDate"
                          type="date"
                          value={formData.scheduledDate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              scheduledDate: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="scheduledTime">Time (UTC)</Label>
                        <Input
                          id="scheduledTime"
                          type="time"
                          value={formData.scheduledTime}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              scheduledTime: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <p className="text-sm text-gray-600">
                      📅 This announcement will be automatically published on{" "}
                      {formData.scheduledDate
                        ? new Date(`${formData.scheduledDate}T${formData.scheduledTime || "00:00"}`).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          ) + ` at ${formData.scheduledTime || "00:00"}`
                        : "the selected date"}
                    </p>
                  </div>
                )}
              </div>

              {/* NEW: Expiration Date Section */}
              <div className="space-y-2 border-t pt-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hasExpiration"
                    checked={formData.hasExpiration}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        hasExpiration: e.target.checked,
                        expirationDate: e.target.checked ? formData.expirationDate : "",
                        expirationTime: e.target.checked ? formData.expirationTime : "",
                      })
                    }
                    className="w-4 h-4 rounded border border-gray-300 cursor-pointer"
                  />
                  <Label htmlFor="hasExpiration" className="font-semibold cursor-pointer">
                    Set an expiration date for this announcement
                  </Label>
                </div>

                {formData.hasExpiration && (
                  <div className="space-y-3 mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="expirationDate">Date *</Label>
                        <Input
                          id="expirationDate"
                          type="date"
                          value={formData.expirationDate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              expirationDate: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="expirationTime">Time</Label>
                        <Input
                          id="expirationTime"
                          type="time"
                          value={formData.expirationTime}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              expirationTime: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <p className="text-sm text-gray-600">
                      🗂️ This announcement will be automatically archived on{" "}
                      {formData.expirationDate
                        ? new Date(`${formData.expirationDate}T${formData.expirationTime || "23:59"}`).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          ) + ` at ${formData.expirationTime || "23:59"}`
                        : "the selected date"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
                Cancel
              </Button>

              <Button variant="outline" onClick={() => handleCreateOrUpdate(true)} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save as Draft"}
              </Button>

              <Button onClick={() => handleCreateOrUpdate(false)} disabled={isSaving}>
                {isSaving ? "Processing..." : formData.isScheduled 
                  ? "Schedule Announcement" 
                  : (editingAnnouncement ? "Update & Publish" : "Post Announcement")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Posted Announcements</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {postedAnnouncements.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Send className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Draft Announcements</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {draftAnnouncements.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Edit className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Archived</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {archivedAnnouncements.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Archive className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Announcements Tabs */}
      <Tabs defaultValue="posted" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="posted">Posted</TabsTrigger>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value="posted" className="space-y-4">
          {postedAnnouncements.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Megaphone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No posted announcements yet</p>
              </CardContent>
            </Card>
          ) : (
            postedAnnouncements.map((announcement) => (
              <AnnouncementCard key={announcement.id} announcement={announcement} />
            ))
          )}
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          {draftAnnouncements.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Edit className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No draft announcements</p>
              </CardContent>
            </Card>
          ) : (
            draftAnnouncements.map((announcement) => (
              <AnnouncementCard key={announcement.id} announcement={announcement} />
            ))
          )}
        </TabsContent>

        <TabsContent value="archived" className="space-y-4">
          {archivedAnnouncements.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Archive className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No archived announcements</p>
              </CardContent>
            </Card>
          ) : (
            archivedAnnouncements.map((announcement) => (
              <AnnouncementCard key={announcement.id} announcement={announcement} />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* View Announcement Dialog */}
      <Dialog
        open={!!viewingAnnouncement}
        onOpenChange={(open) => !open && setViewingAnnouncement(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {viewingAnnouncement && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{viewingAnnouncement.title}</DialogTitle>
                <DialogDescription>View announcement details and content</DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {viewingAnnouncement.images && viewingAnnouncement.images.length > 0 && (
                  <div
                    className={`grid ${viewingAnnouncement.images.length > 1 ? "grid-cols-2" : "grid-cols-1"
                      } gap-2`}
                  >
                    {viewingAnnouncement.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`${viewingAnnouncement.title} - Image ${idx + 1}`}
                        className="w-full h-64 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}

                {viewingAnnouncement.tags && viewingAnnouncement.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {viewingAnnouncement.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap text-base leading-relaxed">
                    {viewingAnnouncement.content}
                  </p>
                </div>

                <div className="border-t pt-4 space-y-3 bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span className="font-medium">Posted by:</span> {viewingAnnouncement.postedBy}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">
                      {viewingAnnouncement.datePosted
                        ? `Posted: ${new Date(viewingAnnouncement.datePosted).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}`
                        : `Created: ${new Date(viewingAnnouncement.dateCreated).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Megaphone className="w-4 h-4" />
                    <span className="font-medium">Target Audience:</span>
                    <span>{getTargetAudienceBadge(viewingAnnouncement.targetAudience)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
