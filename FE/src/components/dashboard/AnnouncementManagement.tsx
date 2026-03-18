import React, { useEffect, useRef, useState } from "react";
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
  X,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../utils/api";

interface Announcement {
  id: string;
  title: string;
  content: string;
  images: string[];
  targetAudience: string[];
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

function formatAnnouncementDate(dateValue?: string | null) {
  if (!dateValue) return "";
  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return "";

  return parsedDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatAnnouncementTime(dateValue?: string | null) {
  if (!dateValue) return "";
  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return "";

  return parsedDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeTargetAudienceValue(value: unknown): string {
  const cleaned = String(value ?? "")
    .replace(/[\{\}\[\]\\"]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  switch (cleaned) {
    case "":
    case "all":
      return "all";
    case "students":
    case "student":
      return "students";
    case "senior-citizens":
    case "senior citizen":
    case "seniorcitizen":
    case "senior":
      return "senior-citizens";
    case "health":
      return "health";
    case "events":
    case "event":
      return "events";
    default:
      return cleaned || "all";
  }
}

function parseTargetAudienceValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeTargetAudienceValue(item))
      .filter(Boolean);
  }

  const raw = String(value ?? "").trim();
  if (!raw) return ["all"];

  const cleaned = raw.replace(/^\{+|\}+$/g, "");
  const parts = cleaned
    .split(",")
    .map((item) => normalizeTargetAudienceValue(item))
    .filter(Boolean);

  return parts.length ? Array.from(new Set(parts)) : ["all"];
}

function normalizeTargetAudienceArray(value: unknown): string[] {
  const normalized = parseTargetAudienceValues(value);
  if (normalized.includes("all")) return ["all"];
  return Array.from(new Set(normalized)).slice(0, 3);
}

function mapApiAnnouncementToUI(a: any): Announcement {
  const rawStatus = (a.Status ?? a.status ?? "").toString().toLowerCase();
  let status: Announcement["status"] = "posted";
  if (rawStatus === "archived") status = "archived";
  else if (rawStatus === "draft" || rawStatus === "drafts") status = "draft";
  else if (rawStatus === "posted" || rawStatus === "active") status = "posted";
  else if (typeof a.IsPublished === "boolean") {
    status = a.IsPublished ? "posted" : "draft";
  }

  const buildFullName = () => {
    const firstName = a.FirstName ?? a.firstName ?? "";
    const lastName = a.LastName ?? a.lastName ?? "";
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || a.PostedByName || a.PostedByRole || "Admin";
  };

  const rawImages = a.Images ?? a.images;
  let parsedImages: string[] = [];
  
  if (Array.isArray(rawImages)) {
    parsedImages = rawImages;
  } else if (typeof rawImages === 'string') {
    try {
      parsedImages = JSON.parse(rawImages);
    } catch {
      const cleaned = rawImages.replace(/^{|}$/g, '');
      parsedImages = cleaned ? cleaned.split(',').map(s => s.replace(/(^"|"$)/g, '').trim()) : [];
    }
  }

  const fixedImages = parsedImages
    .filter((img: string) => img && img.trim() !== "")
    .map((img: string) => {
      let cleanUrl = img.trim();
      if (cleanUrl.startsWith('/uploads')) {
        return `http://localhost:5001${cleanUrl}`;
      }
      return cleanUrl;
    });

  return {
    id: String(a.AnnouncementID ?? a.announcementid ?? a.id),
    title: a.Title ?? a.title ?? "",
    content: a.Body ?? a.body ?? a.Content ?? a.content ?? "",
    images: fixedImages, 
    targetAudience: normalizeTargetAudienceArray(
      Array.isArray(a.Category)
        ? a.Category
        : a.TargetAudience ?? a.targetAudience ?? a.Category ?? "all"
    ),
    dateCreated: a.CreatedAt ?? a.createdat ?? new Date().toISOString(),
    datePosted:
      a.PostedAt ?? a.PublishedDate ?? a.CreatedAt ?? undefined,
    scheduledPublishDate:
      a.ScheduledPublishDate ?? a.scheduledPublishDate ?? undefined,
    isScheduled: a.IsScheduled ?? a.isScheduled ?? false,
    expirationDate: a.ExpirationDate ?? a.expirationDate ?? undefined,
    postedBy: a.PostedByName || buildFullName(),
    postedByName: a.PostedByName || buildFullName(),
    status,
    tags: Array.isArray(a.Tags ?? a.tags) ? (a.Tags ?? a.tags) : [],
  };
}

export function AnnouncementManagement() {
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [customTargetAudiences, setCustomTargetAudiences] = useState<string[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [viewingAnnouncement, setViewingAnnouncement] = useState<Announcement | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [imageUploadSizes, setImageUploadSizes] = useState<Record<number, number>>({});
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [publishTarget, setPublishTarget] = useState<Announcement | null>(null);
  const [isScheduleConfirmOpen, setIsScheduleConfirmOpen] = useState(false);
  const [activeAnnouncementTab, setActiveAnnouncementTab] = useState("posted");
  const previousDraftIdsRef = useRef<string[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    images: [] as string[],
    targetAudience: ["all"] as string[],
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
      targetAudience: ["all"],
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
    setImageUploadSizes({});
  };

  const closeAnnouncementDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const requestAnnouncementDialogClose = () => {
    if (editingAnnouncement) {
      setIsCancelConfirmOpen(true);
      return;
    }

    closeAnnouncementDialog();
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get("/api/announcements");
      const mapped: Announcement[] = (
        Array.isArray(res.data) ? res.data : []
      ).map(mapApiAnnouncementToUI);
      setAnnouncements(mapped);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load announcements");
      setAnnouncements([]);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleImageFileUpload = async (file: File, index: number) => {
    if (!file) return;
    try {
      const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedImageTypes.includes(file.type)) {
        throw new Error("Only JPG, PNG, and WebP images are allowed.");
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Image must be 5MB or smaller.");
      }

      setUploadingIndex(index);
      setImageUploadSizes((prev) => ({ ...prev, [index]: file.size }));
      const fd = new FormData();
      fd.append("image", file);
      const token = localStorage.getItem("token") || "";

      const res = await api.post("/api/upload/announcement-image", fd, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = res.data;
      const imageUrl = `http://localhost:5001${data.imageUrl}`;

      setFormData((prev) => {
        const imgs = [...prev.images];
        imgs[index] = imageUrl;
        return { ...prev, images: imgs.filter(Boolean) };
      });

      toast.success("Image uploaded successfully");
    } catch (err: any) {
      console.error("Image upload error:", err);
      toast.error(err.message || "Failed to upload image. Try a URL instead.");
    } finally {
      setUploadingIndex(null);
    }
  };

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
    toast.success(`Added "${newCustomAudience.trim()}" to target audiences`);
    setNewCustomAudience("");
  };

  const toggleTargetAudience = (value: string) => {
    const normalizedValue = normalizeTargetAudienceValue(value);

    setFormData((prev) => {
      const current = normalizeTargetAudienceArray(prev.targetAudience);

      if (normalizedValue === "all") {
        return { ...prev, targetAudience: ["all"] };
      }

      const withoutAll = current.filter((item) => item !== "all");
      if (withoutAll.includes(normalizedValue)) {
        const next = withoutAll.filter((item) => item !== normalizedValue);
        return {
          ...prev,
          targetAudience: next.length > 0 ? next : ["all"],
        };
      }

      if (withoutAll.length >= 3) {
        toast.error("You can select up to 3 target audiences only.");
        return prev;
      }

      return {
        ...prev,
        targetAudience: [...withoutAll, normalizedValue],
      };
    });
  };

  // FIX: Handles UPDATE via PUT route and logs Transactions
  const handleCreateOrUpdate = async (saveAsDraft: boolean = false) => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const raw = localStorage.getItem("app_user");
      const user = raw ? JSON.parse(raw) : null;
      const postedByRole = user?.role || localStorage.getItem("role") || "Admin";
      const postedById = user?.id || localStorage.getItem("userId") || "SYSTEM";

      if (!postedByRole || !postedById) {
        toast.error("Missing user session. Please log in again.");
        return;
      }

      const payload = {
        title: formData.title.trim(),
        body: formData.content.trim(),
        images: formData.images.filter(Boolean),
        targetAudience: normalizeTargetAudienceArray(formData.targetAudience),
        tags: formData.tags,
        status: saveAsDraft ? "draft" : "posted",
        postedByRole,
        postedById,
        isScheduled: formData.isScheduled && !!formData.scheduledDate,
        scheduledPublishDate:
          formData.isScheduled && formData.scheduledDate
            ? `${formData.scheduledDate}T${formData.scheduledTime || "00:00"}:00`
            : null,
        expirationDate:
          formData.hasExpiration && formData.expirationDate
            ? `${formData.expirationDate}T${formData.expirationTime || "23:59"}:59`
            : null,
      };

      setIsSaving(true);
      try {
        if (editingAnnouncement) {
          await api.put(`/api/announcements/${editingAnnouncement.id}`, payload);
        } else {
          await api.post("/api/announcements", payload);
        }

        try {
          const actionType = editingAnnouncement ? "Updated Announcement" : "Created Announcement";
          const actionDetails = `Announcements - ${editingAnnouncement ? 'Updated' : 'Created'} announcement: ${formData.title.trim()} (Success)`;
          
          await api.post("/api/transactions", {
            accountId: postedById,
            type: postedByRole,
            action: actionType,
            details: actionDetails,
            module: "Announcements"
          });
        } catch (txErr) {
          console.error("Failed to log transaction:", txErr);
        }

        toast.success(
          saveAsDraft
            ? "Announcement saved as draft"
            : formData.isScheduled
            ? "Announcement scheduled successfully"
            : editingAnnouncement
            ? "Announcement updated successfully"
            : "Announcement posted successfully"
        );
        closeAnnouncementDialog();
        await fetchAnnouncements();
      } finally {
        setIsSaving(false);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save announcement", {
        description:
          err?.response?.data?.error ||
          err?.message ||
          "Check backend /api/announcements",
      });
      setIsSaving(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    
    let extractedSchDate = "";
    let extractedSchTime = "";
    if (announcement.scheduledPublishDate) {
      const d = new Date(announcement.scheduledPublishDate);
      extractedSchDate = d.toISOString().split("T")[0];
      extractedSchTime = d.toTimeString().substring(0, 5);
    }

    let extractedExpDate = "";
    let extractedExpTime = "";
    if (announcement.expirationDate) {
      const d = new Date(announcement.expirationDate);
      extractedExpDate = d.toISOString().split("T")[0];
      extractedExpTime = d.toTimeString().substring(0, 5);
    }

    setFormData({
      title: announcement.title,
      content: announcement.content,
      images: announcement.images,
      targetAudience: announcement.targetAudience,
      tags: announcement.tags,
      isScheduled: announcement.isScheduled ?? false,
      scheduledDate: extractedSchDate,
      scheduledTime: extractedSchTime,
      hasExpiration: !!announcement.expirationDate,
      expirationDate: extractedExpDate,
      expirationTime: extractedExpTime,
    });
    setIsDialogOpen(true);
  };

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

  const handleDelete = async (id: string) => {
    try {
      await api.patch(`/api/announcements/${id}/archive`);
      toast.success("Announcement removed");
      await fetchAnnouncements();
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove announcement");
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const target = announcements.find(a => a.id === id);
      if (target) {
         await api.put(`/api/announcements/${id}`, {
           title: target.title,
           body: target.content,
           targetAudience: target.targetAudience,
           status: 'posted',
           images: target.images,
           isScheduled: false,
         });
         toast.success("Announcement published");
         await fetchAnnouncements();
      }
    } catch(err) {
      toast.error("Failed to publish");
    }
  };

  const handlePrimaryAnnouncementAction = () => {
    if (formData.isScheduled && !editingAnnouncement) {
      setIsScheduleConfirmOpen(true);
      return;
    }

    void handleCreateOrUpdate(false);
  };

  const postedAnnouncements = announcements.filter((a) => a.status === "posted");
  const draftAnnouncements = announcements.filter((a) => a.status === "draft");
  const archivedAnnouncements = announcements.filter((a) => a.status === "archived");

  useEffect(() => {
    const previousDraftIds = previousDraftIdsRef.current;
    const currentDraftIds = draftAnnouncements.map((announcement) => announcement.id);
    const currentPostedIds = new Set(
      postedAnnouncements.map((announcement) => announcement.id)
    );

    const movedFromDraftToPosted = previousDraftIds.some(
      (id) => !currentDraftIds.includes(id) && currentPostedIds.has(id)
    );

    if (activeAnnouncementTab === "drafts" && movedFromDraftToPosted) {
      setActiveAnnouncementTab("posted");
    }

    previousDraftIdsRef.current = currentDraftIds;
  }, [activeAnnouncementTab, draftAnnouncements, postedAnnouncements]);

  const getTargetAudienceBadge = (t: string | string[]) => {
    const value = Array.isArray(t) ? t[0] ?? "all" : t;
    switch (value) {
      case "all": return "All";
      case "students": return "Students";
      case "senior-citizens": return "Senior Citizen";
      case "health": return "Health";
      case "events": return "Events";
      default: return value;
    }
  };

  const getTargetAudienceBadges = (targets: string[]) =>
    normalizeTargetAudienceArray(targets).map(getTargetAudienceBadge);

  const AnnouncementCard = ({ announcement }: { announcement: Announcement }) => (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="flex gap-4 p-4">
          <div className="flex-shrink-0">
            {announcement.images && announcement.images.length > 0 ? (
              <div className="relative cursor-pointer hover:opacity-90" onClick={() => setFullScreenImage(announcement.images[0])}>
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

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 line-clamp-1">
                {announcement.title}
              </h3>
              <div className="hidden">
                {announcement.expirationDate &&
                  new Date(announcement.expirationDate) < new Date() && (
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

            <div className="mb-3 flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1 font-semibold">
                <User className="w-3 h-3" />
                <span>
                  Posted by: {announcement.postedByName || announcement.postedBy}
                </span>
              </div>
              {announcement.expirationDate && (
                <div className="flex items-center gap-1 text-base font-bold text-red-600">
                  <Calendar className="w-3 h-3" />
                  <span>
                    Expires:{" "}
                    {formatAnnouncementDate(announcement.expirationDate)}
                  </span>
                </div>
              )}
              {announcement.isScheduled && announcement.scheduledPublishDate ? (
                <div className="flex items-center gap-1 text-base font-bold text-blue-600">
                  <Clock className="w-3 h-3" />
                  <span>
                    Scheduled:{" "}
                    {formatAnnouncementDate(announcement.scheduledPublishDate)}{" "}
                    at{" "}
                    {formatAnnouncementTime(announcement.scheduledPublishDate)}
                  </span>
                </div>
              ) : announcement.datePosted ? (
                <div className="flex items-center gap-1 text-base font-bold text-gray-700">
                  <Calendar className="w-3 h-3" />
                  <span>
                    Posted: {formatAnnouncementDate(announcement.datePosted)} at{" "}
                    {formatAnnouncementTime(announcement.datePosted)}
                  </span>
                </div>
              ) : null}
              {announcement.dateCreated && (
                <div className="flex items-center gap-1 text-base font-bold text-gray-700">
                  <Clock className="w-3 h-3" />
                  <span>
                    Created:{" "}
                    {formatAnnouncementDate(announcement.dateCreated)} at{" "}
                    {formatAnnouncementTime(announcement.dateCreated)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
                        Residents will no longer see this announcement.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => void handleArchive(announcement.id)}
                      >
                        Yes, archive it
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {announcement.expirationDate &&
                new Date(announcement.expirationDate) < new Date() && (
                  <Badge className="border-0 bg-red-100 text-xs font-medium text-red-700">
                    Expired
                  </Badge>
                )}
              {announcement.isScheduled && (
                <Badge className="border-0 bg-blue-100 text-xs font-medium text-blue-700">
                  Scheduled {formatAnnouncementTime(announcement.scheduledPublishDate)}
                </Badge>
              )}
              <Badge
                variant="outline"
                className="border-gray-200 bg-gray-50 text-xs font-medium text-gray-700"
              >
                {getTargetAudienceBadge(announcement.targetAudience)}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const visibleImageSlotCount = Math.min(
    Math.max(formData.images.filter(Boolean).length + 1, 1),
    5
  );

  const AnnouncementTableRow = ({
    announcement,
  }: {
    announcement: Announcement;
  }) => (
    <Card className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
      <CardContent className="p-0">
        <div className="hidden grid-cols-[1.5fr_2fr_1.2fr_1.2fr_0.9fr_1.1fr] gap-4 bg-[#2957a1] px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-white lg:grid">
          <div>Announcement Title</div>
          <div>Description</div>
          <div>Start Date</div>
          <div>End Date</div>
          <div>Attachment</div>
          <div>Action</div>
        </div>

        <div className="border-t border-gray-100 px-4 py-4 lg:px-6">
          <div className="space-y-4 lg:hidden">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                {announcement.images && announcement.images.length > 0 ? (
                  <div
                    className="relative cursor-pointer hover:opacity-90"
                    onClick={() => setFullScreenImage(announcement.images[0])}
                  >
                    <img
                      src={announcement.images[0]}
                      alt={announcement.title}
                      className="h-24 w-24 rounded-xl object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-gray-100">
                    <ImageIcon className="h-6 w-6 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="mb-2 line-clamp-2 text-lg font-semibold text-gray-900">
                  {announcement.title}
                </h3>
                <p className="mb-3 line-clamp-3 text-sm leading-6 text-gray-600">
                  {announcement.content}
                </p>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="font-medium">
                    Start:{" "}
                    {announcement.datePosted
                      ? `${formatAnnouncementDate(announcement.datePosted)} at ${formatAnnouncementTime(announcement.datePosted)}`
                      : `${formatAnnouncementDate(announcement.dateCreated)} at ${formatAnnouncementTime(announcement.dateCreated)}`}
                  </div>
                  <div className="font-medium">
                    End:{" "}
                    {announcement.expirationDate
                      ? `${formatAnnouncementDate(announcement.expirationDate)} at ${formatAnnouncementTime(announcement.expirationDate)}`
                      : "No end date"}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {getTargetAudienceBadges(announcement.targetAudience).map((badge) => (
                <Badge
                  key={badge}
                  variant="outline"
                  className="border-gray-200 bg-gray-50 text-xs font-medium text-gray-700"
                >
                  {badge}
                </Badge>
              ))}
              {announcement.expirationDate &&
                new Date(announcement.expirationDate) < new Date() && (
                  <Badge className="border-0 bg-red-100 text-xs font-medium text-red-700">
                    Expired
                  </Badge>
                )}
              {announcement.isScheduled && (
                <Badge className="border-0 bg-blue-100 text-xs font-medium text-blue-700">
                  Scheduled
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingAnnouncement(announcement)}
                className="gap-1"
              >
                <Eye className="h-3 w-3" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(announcement)}
                className="gap-1"
              >
                <Edit className="h-3 w-3" />
                Edit
              </Button>
              {announcement.status === "draft" && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setPublishTarget(announcement)}
                  className="gap-1"
                >
                  <Send className="h-3 w-3" />
                  Publish
                </Button>
              )}
              {announcement.status === "posted" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Archive className="h-3 w-3" />
                      Archive
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Archive Announcement?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Residents will no longer see this announcement.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => void handleArchive(announcement.id)}
                      >
                        Yes, archive it
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          <div className="hidden items-center gap-4 lg:grid lg:grid-cols-[1.5fr_2fr_1.2fr_1.2fr_0.9fr_1.1fr]">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-gray-900">
                {announcement.title}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Posted by {announcement.postedByName || announcement.postedBy}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {getTargetAudienceBadges(announcement.targetAudience).map((badge) => (
                  <Badge
                    key={badge}
                    variant="outline"
                    className="border-gray-200 bg-gray-50 text-xs font-medium text-gray-700"
                  >
                    {badge}
                  </Badge>
                ))}
                {announcement.expirationDate &&
                  new Date(announcement.expirationDate) < new Date() && (
                    <Badge className="border-0 bg-red-100 text-xs font-medium text-red-700">
                      Expired
                    </Badge>
                  )}
                {announcement.isScheduled && (
                  <Badge className="border-0 bg-blue-100 text-xs font-medium text-blue-700">
                    Scheduled - {formatAnnouncementTime(announcement.scheduledPublishDate)}
                  </Badge>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <p className="line-clamp-3 text-sm leading-6 text-gray-600">
                {announcement.content}
              </p>
            </div>

            <div className="text-sm font-semibold text-gray-800">
              {announcement.isScheduled && announcement.scheduledPublishDate
                ? formatAnnouncementDate(announcement.scheduledPublishDate)
                : announcement.datePosted
                ? formatAnnouncementDate(announcement.datePosted)
                : formatAnnouncementDate(announcement.dateCreated)}
              <div className="mt-1 text-xs font-medium text-gray-500">
                {announcement.isScheduled && announcement.scheduledPublishDate
                  ? formatAnnouncementTime(announcement.scheduledPublishDate)
                  : announcement.datePosted
                  ? formatAnnouncementTime(announcement.datePosted)
                  : formatAnnouncementTime(announcement.dateCreated)}
              </div>
            </div>

            <div className="text-sm font-semibold text-gray-800">
              {announcement.expirationDate
                ? formatAnnouncementDate(announcement.expirationDate)
                : "No end date"}
              {announcement.expirationDate && (
                <div className="mt-1 text-xs font-medium text-gray-500">
                  {formatAnnouncementTime(announcement.expirationDate)}
                </div>
              )}
            </div>

            <div>
              {announcement.images && announcement.images.length > 0 ? (
                <div
                  className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white p-2 hover:bg-gray-50"
                  onClick={() => setFullScreenImage(announcement.images[0])}
                >
                  <img
                    src={announcement.images[0]}
                    alt={announcement.title}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                </div>
              ) : (
                <div className="inline-flex h-20 w-20 items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
                  <ImageIcon className="h-6 w-6 text-gray-400" />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingAnnouncement(announcement)}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(announcement)}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              {announcement.status === "draft" && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setPublishTarget(announcement)}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  Publish
                </Button>
              )}
              {announcement.status === "posted" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Archive className="h-4 w-4" />
                      Archive
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Archive Announcement?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Residents will no longer see this announcement.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => void handleArchive(announcement.id)}
                      >
                        Yes, archive it
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
    <>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Megaphone className="w-6 h-6" />
              Announcements
            </h1>
            <p className="text-gray-600 mt-1">
              Create and manage barangay announcements
            </p>
          </div>

          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              if (open) {
                setIsDialogOpen(true);
                return;
              }

              requestAnnouncementDialogClose();
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2 bg-[#2957a1] text-white hover:bg-[#1e3f7a]">
                <Plus className="w-4 h-4" />
                ADD NEW ANNOUNCEMENT
              </Button>
            </DialogTrigger>

            <DialogContent
              className="max-w-2xl max-h-[90vh] overflow-y-auto"
              onInteractOutside={(event) => {
                if (editingAnnouncement) {
                  event.preventDefault();
                  setIsCancelConfirmOpen(true);
                }
              }}
              onEscapeKeyDown={(event) => {
                if (editingAnnouncement) {
                  event.preventDefault();
                  setIsCancelConfirmOpen(true);
                }
              }}
              onPointerDownOutside={(event) => {
                if (editingAnnouncement) {
                  event.preventDefault();
                  setIsCancelConfirmOpen(true);
                }
              }}
            >
              <DialogHeader>
                <DialogTitle>
                  {editingAnnouncement
                    ? "Edit Announcement"
                    : "Create New Announcement"}
                </DialogTitle>
                <DialogDescription>
                  {editingAnnouncement
                    ? "Update the announcement details below."
                    : "Fill in the details to create a new announcement for the community."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Enter announcement title"
                  />
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    placeholder="Enter announcement content"
                    rows={6}
                  />
                </div>

                {/* ── Images: file upload + URL ── */}
                <div className="space-y-2">
                  <Label>Images (Optional, Max 5)</Label>
                  <div className="space-y-3">
                    {Array.from(
                      { length: visibleImageSlotCount },
                      (_, index) => index
                    ).map((index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex gap-2 items-center">
                          {/* URL input */}
                          <Input
                            value={formData.images[index] || ""}
                            onChange={(e) => {
                              setFormData((prev) => {
                                const imgs = [...prev.images];
                                if (e.target.value) imgs[index] = e.target.value;
                                else imgs.splice(index, 1);
                                return {
                                  ...prev,
                                  images: imgs.filter(Boolean),
                                };
                              });
                              setImageUploadSizes((prev) => {
                                const next = { ...prev };
                                delete next[index];
                                return next;
                              });
                            }}
                            placeholder={`Image ${index + 1} URL (paste link)`}
                            className="flex-1"
                          />

                          {/* File upload button */}
                          <label
                            className={`cursor-pointer flex items-center gap-1 px-3 py-2 rounded-md border text-sm font-medium transition-colors whitespace-nowrap ${
                              uploadingIndex === index
                                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                : "bg-white text-[#2957a1] border-[#2957a1] hover:bg-blue-50"
                            }`}
                          >
                            {uploadingIndex === index ? (
                              <span className="text-xs">Uploading…</span>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                <span className="text-xs hidden sm:inline">
                                  Upload
                                </span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/webp"
                              className="hidden"
                              disabled={uploadingIndex !== null}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageFileUpload(file, index);
                                e.target.value = "";
                              }}
                            />
                          </label>

                          {/* Clear button */}
                          {formData.images[index] && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((prev) => {
                                  const imgs = [...prev.images];
                                  imgs.splice(index, 1);
                                  return {
                                    ...prev,
                                    images: imgs.filter(Boolean),
                                  };
                                });
                                setImageUploadSizes((prev) => {
                                  const next = { ...prev };
                                  delete next[index];
                                  return next;
                                });
                              }}
                              className="text-red-400 hover:text-red-600 p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {typeof imageUploadSizes[index] === "number" && (
                          <p className="text-xs text-gray-500">
                            {uploadingIndex === index ? "Uploading: " : "File size: "}
                            {(imageUploadSizes[index] / (1024 * 1024)).toFixed(2)} MB / 5.00 MB
                          </p>
                        )}

                        {/* Preview */}
                        {formData.images[index] && (
                          <img
                            src={formData.images[index]}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90"
                            onClick={() => setFullScreenImage(formData.images[index])}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">
                    Upload from your computer or paste an image URL. Only JPG,
                    PNG, or WebP files are allowed, with a maximum of 5MB per
                    image.
                  </p>
                </div>

                {/* Target Audience */}
                <div className="space-y-3">
                  <Label htmlFor="targetAudience">Target Audience</Label>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="mb-3 flex flex-wrap gap-2">
                      {getTargetAudienceBadges(formData.targetAudience).map((badge) => (
                        <Badge
                          key={badge}
                          className="border-0 bg-[#2957a1] text-white"
                        >
                          {badge}
                        </Badge>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {[
                        { value: "all", label: "All" },
                        { value: "students", label: "Students" },
                        { value: "senior-citizens", label: "Senior Citizen" },
                        { value: "health", label: "Health" },
                        { value: "events", label: "Events" },
                        ...customTargetAudiences.map((audience) => ({
                          value: audience,
                          label: audience,
                        })),
                      ].map((option) => {
                        const isSelected = normalizeTargetAudienceArray(
                          formData.targetAudience
                        ).includes(normalizeTargetAudienceValue(option.value));

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => toggleTargetAudience(option.value)}
                            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                              isSelected
                                ? "border-[#2957a1] bg-blue-50 text-[#2957a1]"
                                : "border-gray-200 bg-white text-gray-700 hover:border-[#2957a1]/40"
                            }`}
                          >
                            <span>{option.label}</span>
                            <span className="text-xs font-semibold">
                              {isSelected ? "Selected" : "Select"}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <p className="mt-3 text-xs text-gray-500">
                      Choose up to 3 target audiences. Selecting All will override the other choices.
                    </p>
                  </div>
                </div>

                {/* Scheduled Publishing */}
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
                          scheduledDate: e.target.checked
                            ? formData.scheduledDate
                            : "",
                          scheduledTime: e.target.checked
                            ? formData.scheduledTime
                            : "",
                        })
                      }
                      className="w-4 h-4 rounded border border-gray-300 cursor-pointer"
                    />
                    <Label
                      htmlFor="isScheduled"
                      className="font-semibold cursor-pointer"
                    >
                      Schedule this announcement for later
                    </Label>
                  </div>

                  {formData.isScheduled && (
                    <div className="space-y-3 mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                          <Label htmlFor="scheduledTime">Time</Label>
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
                        📅 Will be published on{" "}
                        {formData.scheduledDate
                          ? new Date(
                              `${formData.scheduledDate}T${
                                formData.scheduledTime || "00:00"
                              }`
                            ).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }) +
                            ` at ${new Date(`2000-01-01T${formData.scheduledTime || "00:00"}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
                          : "the selected date"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Expiration Date */}
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
                          expirationDate: e.target.checked
                            ? formData.expirationDate
                            : "",
                          expirationTime: e.target.checked
                            ? formData.expirationTime
                            : "",
                        })
                      }
                      className="w-4 h-4 rounded border border-gray-300 cursor-pointer"
                    />
                    <Label
                      htmlFor="hasExpiration"
                      className="font-semibold cursor-pointer"
                    >
                      Set an expiration date
                    </Label>
                  </div>

                  {formData.hasExpiration && (
                    <div className="space-y-3 mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                        🗂️ Will be archived on{" "}
                        {formData.expirationDate
                          ? new Date(
                              `${formData.expirationDate}T${
                                formData.expirationTime || "23:59"
                              }`
                            ).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }) +
                            ` at ${new Date(`2000-01-01T${formData.expirationTime || "23:59"}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
                          : "the selected date"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={requestAnnouncementDialogClose}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleCreateOrUpdate(true)}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save as Draft"}
                </Button>
                <Button
                  onClick={handlePrimaryAnnouncementAction}
                  disabled={isSaving}
                >
                  {isSaving
                    ? "Processing..."
                    : formData.isScheduled
                    ? editingAnnouncement
                      ? "Save Edit"
                      : "Schedule Announcement"
                    : editingAnnouncement
                    ? "Save Edit"
                    : "Post Announcement"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog
            open={isCancelConfirmOpen}
            onOpenChange={setIsCancelConfirmOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel announcement editing?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to cancel editing this announcement? Any unsaved changes will be lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Editing</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setIsCancelConfirmOpen(false);
                    closeAnnouncementDialog();
                  }}
                >
                  Yes, discard changes
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog
            open={!!publishTarget}
            onOpenChange={(open) => {
              if (!open) {
                setPublishTarget(null);
              }
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Publish Announcement?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to publish
                  {publishTarget ? ` "${publishTarget.title}"` : " this announcement"}?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (publishTarget) {
                      void handlePublish(publishTarget.id);
                    }
                    setPublishTarget(null);
                  }}
                >
                  Yes, publish it
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog
            open={isScheduleConfirmOpen}
            onOpenChange={setIsScheduleConfirmOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Schedule Announcement?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to schedule this announcement for{" "}
                  {formData.scheduledDate
                    ? `${new Date(`${formData.scheduledDate}T00:00:00`).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })} at ${new Date(`2000-01-01T${formData.scheduledTime || "00:00"}`).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}`
                    : "the selected date and time"}
                  ?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setIsScheduleConfirmOpen(false);
                    void handleCreateOrUpdate(false);
                  }}
                >
                  Yes, schedule it
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Stats */}
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

        {/* Tabs */}
        <Tabs
          value={activeAnnouncementTab}
          onValueChange={setActiveAnnouncementTab}
          className="space-y-4"
        >
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
              postedAnnouncements.map((a) => (
                <AnnouncementTableRow key={a.id} announcement={a} />
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
              draftAnnouncements.map((a) => (
                <AnnouncementTableRow key={a.id} announcement={a} />
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
              archivedAnnouncements.map((a) => (
                <AnnouncementTableRow key={a.id} announcement={a} />
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* View Dialog */}
        <Dialog
          open={!!viewingAnnouncement}
          onOpenChange={(open) => !open && setViewingAnnouncement(null)}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {viewingAnnouncement && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">
                    {viewingAnnouncement.title}
                  </DialogTitle>
                  <DialogDescription>
                    View announcement details and content
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {viewingAnnouncement.images &&
                    viewingAnnouncement.images.length > 0 && (
                      <div
                        className={`grid ${
                          viewingAnnouncement.images.length > 1
                            ? "grid-cols-2"
                            : "grid-cols-1"
                        } gap-2`}
                      >
                        {viewingAnnouncement.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`${viewingAnnouncement.title} - Image ${idx + 1}`}
                            className="w-full h-64 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setFullScreenImage(img)}
                          />
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
                      <span className="font-medium">Posted by:</span>{" "}
                      {viewingAnnouncement.postedByName ||
                        viewingAnnouncement.postedBy}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span className="font-medium">
                        {viewingAnnouncement.datePosted
                          ? `Posted: ${new Date(
                              viewingAnnouncement.datePosted
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}`
                          : `Created: ${new Date(
                              viewingAnnouncement.dateCreated
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Megaphone className="w-4 h-4" />
                      <span className="font-medium">Target Audience:</span>
                      <span>
                        {getTargetAudienceBadges(
                          viewingAnnouncement.targetAudience
                        ).join(", ")}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Fullscreen Image Modal */}
      {fullScreenImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setFullScreenImage(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white hover:text-gray-300 bg-black/50 hover:bg-black/80 rounded-full p-2 transition-colors"
            onClick={(e) => { e.stopPropagation(); setFullScreenImage(null); }}
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
