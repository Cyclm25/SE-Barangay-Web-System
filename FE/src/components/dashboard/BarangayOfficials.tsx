import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
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
import { User, Lock, Eye, EyeOff, Calendar } from "lucide-react";
import { ProfileImageUpload } from "../ui/ProfileImageUpload";
import { OfficialForgotPasswordPage } from "./OfficialForgotPasswordPage";
import { toast } from "sonner";
import { api } from "../../utils/api";

type StatusText = "Active" | "Inactive";

interface Official {
  barangayadminid: string;
  adminname: string;
  position: string | null;
  email: string;
  status: boolean; // true=Active, false=Inactive
  datecreated?: string;

  // Optional UI fields (only if your backend/table also has these)
  contactnumber?: string;
  termstart?: string;
  termend?: string;
  profileimage?: string;
}

interface OfficialEditForm {
  adminname: string;
  position: string;
  email: string;
  contactnumber: string;
  termstart: string;
  termend: string;
  status: boolean;
  profileimage: string;
}

function toStatusText(statusBool: boolean): StatusText {
  return statusBool ? "Active" : "Inactive";
}

function formatDateOnly(value?: string | null) {
  if (!value) return "";
  const normalized = String(value).trim();
  if (!normalized) return "";
  return normalized.includes("T") ? normalized.split("T")[0] : normalized;
}

function normalizeDateInputValue(value?: string | null) {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return formatDateOnly(raw);
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parsed);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : formatDateOnly(raw);
}

function formatDisplayDate(value?: string | null) {
  const dateOnly = normalizeDateInputValue(value);
  if (!dateOnly) return "";

  const [year, month, day] = dateOnly.split("-").map(Number);
  if (!year || !month || !day) return dateOnly;

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function normalizeOfficialRecord(source: any, fallback?: Official): Official {
  return {
    barangayadminid:
      source?.barangayadminid || source?.BarangayAdminID || fallback?.barangayadminid || "",
    adminname:
      source?.adminname || source?.AdminName || fallback?.adminname || "",
    position:
      source?.position || source?.Position || fallback?.position || null,
    email:
      source?.email || source?.Email || fallback?.email || "",
    status:
      typeof source?.status === "boolean"
        ? source.status
        : typeof source?.Status === "boolean"
        ? source.Status
        : !!fallback?.status,
    datecreated:
      normalizeDateInputValue(source?.datecreated || source?.DateCreated) ||
      fallback?.datecreated,
    contactnumber:
      source?.contactnumber || source?.ContactNumber || fallback?.contactnumber || "",
    termstart:
      normalizeDateInputValue(source?.termstart || source?.TermStart) ||
      fallback?.termstart ||
      undefined,
    termend:
      normalizeDateInputValue(source?.termend || source?.TermEnd) ||
      fallback?.termend ||
      undefined,
    profileimage:
      source?.profileimage || source?.ProfileImage || fallback?.profileimage || undefined,
  };
}

function formatStatusLabel(status: boolean) {
  return status ? "Active" : "Inactive";
}

function buildOfficialEditForm(official: Official): OfficialEditForm {
  return {
    adminname: official.adminname || "",
    position: official.position || "Kagawad",
    email: official.email || "",
    contactnumber: official.contactnumber || "",
    termstart: normalizeDateInputValue(official.termstart),
    termend: normalizeDateInputValue(official.termend),
    status: !!official.status,
    profileimage: official.profileimage || "",
  };
}

function toUppercaseInput(value: string) {
  return value.toUpperCase();
}

export function BarangayOfficials() {
  const dataPrivacyHighlights = [
    "The information you provide is accurate and complete.",
    "You consent to the collection and processing of your data for legitimate barangay operations.",
    "You understand your rights to access, correct, or request deletion of your personal data, subject to applicable regulations.",
  ];
  const initialFormData = {
    profileImage: "",
    name: "",
    position: "Kagawad",
    contactNumber: "",
    email: "",
    termStart: "",
    termEnd: "",
    status: "Active" as StatusText,
  };

  const [officials, setOfficials] = useState<Official[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [resetPasswordOfficial, setResetPasswordOfficial] = useState<Official | null>(null);
  const [confirmResetOfficial, setConfirmResetOfficial] = useState<Official | null>(null);
  const [viewingOfficial, setViewingOfficial] = useState<Official | null>(null);
  const [editingOfficial, setEditingOfficial] = useState<OfficialEditForm | null>(null);
  const [showDiscardEditDialog, setShowDiscardEditDialog] = useState(false);
  const [showConfirmSaveEditDialog, setShowConfirmSaveEditDialog] = useState(false);
  const [profileImagePreview, setProfileImagePreview] = useState<string>("");
  const [showDiscardOfficialDialog, setShowDiscardOfficialDialog] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [nameWarning, setNameWarning] = useState("");

  // STEP 2 + STEP 3 dialog states
  const [showDataPrivacyDialog, setShowDataPrivacyDialog] = useState(false);
  const [officialPrivacyAccepted, setOfficialPrivacyAccepted] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  // password fields
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState<{
    profileImage: string;
    name: string;
    position: string;
    contactNumber: string;
    email: string;
    termStart: string;
    termEnd: string;
    status: StatusText;
  }>(initialFormData);

  const resetForm = () => {
    setFormData(initialFormData);

    setProfileImagePreview("");
    setSaveAttempted(false);
    setNameWarning("");

    setShowDataPrivacyDialog(false);
    setShowPasswordDialog(false);
    setOfficialPrivacyAccepted(false);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  };

  const hasUnsavedOfficialForm =
    JSON.stringify(formData) !== JSON.stringify(initialFormData) ||
    !!profileImagePreview ||
    !!password ||
    !!confirmPassword;

  const handleOfficialDialogOpenChange = (open: boolean) => {
    if (open) {
      setShowDiscardOfficialDialog(false);
      setIsDialogOpen(true);
      return;
    }

    if (showDataPrivacyDialog || showPasswordDialog) {
      setIsDialogOpen(true);
      return;
    }

    if (hasUnsavedOfficialForm) {
      setShowDiscardOfficialDialog(true);
      return;
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const handleConfirmDiscardOfficial = () => {
    setShowDiscardOfficialDialog(false);
    resetForm();
    setIsDialogOpen(false);
  };

  // read SuperAdminID from localStorage (as stored in App.tsx -> app_user.id)
  const superAdminId = useMemo(() => {
    try {
      const raw = localStorage.getItem("app_user");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.id ?? null;
    } catch {
      return null;
    }
  }, []);

  // FETCH (single source of truth)
  useEffect(() => {
    const fetchOfficials = async () => {
      try {
        setLoading(true);
        const res = await api.get("/api/officials");
        setOfficials(
          Array.isArray(res.data)
            ? res.data.map((official) => normalizeOfficialRecord(official))
            : []
        );
      } catch (err) {
        console.error("Fetch error:", err);
        toast.error("Failed to load officials");
        setOfficials([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOfficials();
  }, []);

  const filteredOfficials = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return officials;

    return officials.filter((o) => {
      const name = (o.adminname ?? "").toLowerCase();
      const pos = (o.position ?? "").toLowerCase();
      const id = (o.barangayadminid ?? "").toLowerCase();
      return name.includes(term) || pos.includes(term) || id.includes(term);
    });
  }, [officials, searchTerm]);

  const gmailRegex = /^[a-z0-9](\.?[a-z0-9]){5,29}@gmail\.com$/i;
  const hasInvalidNameCharacters =
    formData.name.trim().length > 0 && /[^A-Z\s]/i.test(formData.name);
  const emailInvalidFormat =
    formData.email.trim().length > 0 && !gmailRegex.test(formData.email.trim());
  const emailValidFormat =
    formData.email.trim().length > 0 && gmailRegex.test(formData.email.trim());
  const contactDigits = formData.contactNumber.replace(/\D/g, "");
  const contactTooLong = contactDigits.length > 11;
  const contactComplete = contactDigits.length === 11;
  const contactInvalid =
    saveAttempted && (!contactDigits || contactDigits.length !== 11);

  // STEP 1: start submit -> show privacy
  const handleStartSubmit = () => {
    setSaveAttempted(true);

    if (!formData.name.trim()) {
      toast.error("Full Name is required");
      return;
    }
    if (hasInvalidNameCharacters) {
      toast.error("Full Name must contain letters and spaces only");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!gmailRegex.test(formData.email.trim())) {
      toast.error("Only Gmail addresses are allowed");
      return;
    }
    if (contactDigits.length !== 11) {
      toast.error("Contact number must be exactly 11 digits");
      return;
    }
    if (!formData.position) {
      toast.error("Position is required");
      return;
    }
    console.log("Form data validated, showing privacy dialog");
    setShowDataPrivacyDialog(true);
  };

  const handleCancelDataPrivacy = () => {
    setShowDataPrivacyDialog(false);
    setOfficialPrivacyAccepted(false);
    setShowDiscardOfficialDialog(false);
    setIsDialogOpen(true);
  };

  const handleConfirmPrivacy = () => {
    if (!officialPrivacyAccepted) {
      toast.error("Please confirm the data privacy agreement before continuing.");
      return;
    }
    setShowDataPrivacyDialog(false);
    setShowPasswordDialog(true);
  };

  const handleFinalSubmit = async () => {
    if (!password) {
      toast.error("Password is required");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    console.log("Passwords validated, calling handleAddOfficial");
    await handleAddOfficial(password);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setProfileImagePreview(result);
      setFormData((prev) => ({ ...prev, profileImage: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddOfficial = async (finalPassword: string) => {
    if (!superAdminId) {
      toast.error("Missing SuperAdminID", {
        description: "Please log in again as Super Admin.",
      });
      return;
    }

    try {
      setLoading(true);

      // match your backend POST exactly
      const payload = {
        adminname: formData.name.trim(),
        position: formData.position || null,
        email: formData.email.trim(),
        contactnumber: formData.contactNumber.trim() || "",
        termStart: formData.termStart || null,
        termEnd: formData.termEnd || null,
        password: finalPassword,
        superadminid: superAdminId,
        profileImage: formData.profileImage || null,
      };

      console.log("Sending payload:", payload);
      const res = await api.post("/api/officials", payload);
      console.log("API response:", res.data);

      // Backend returns { official: {...}, residentaccount: {...} }
      const created = (res.data?.official || res.data) as Official;
      console.log("Created official:", created);

      // Normalize keys (backend may return PascalCase or lowercase)
      const normalized = normalizeOfficialRecord(created, {
        barangayadminid: "",
        adminname: formData.name.trim(),
        position: formData.position || null,
        email: formData.email.trim(),
        status: true,
        contactnumber: formData.contactNumber.trim(),
        termstart: normalizeDateInputValue(formData.termStart) || undefined,
        termend: normalizeDateInputValue(formData.termEnd) || undefined,
        profileimage: formData.profileImage || undefined,
      });

      if (!normalized.barangayadminid) {
        throw new Error("Invalid response from server");
      }

      setOfficials((prev) => [normalized, ...prev]);

      setShowPasswordDialog(false);
      setShowDataPrivacyDialog(false);
      setIsDialogOpen(false);

      resetForm();

      toast.success("Barangay official successfully added!", {
        description: `${normalized.adminname} has been registered as ${normalized.position ?? "Official"
          }.`,
      });
    } catch (err: any) {
      console.error("Error adding official:", err);
      console.error("Error response data:", err?.response?.data);
      console.error("Error status:", err?.response?.status);
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Unknown error";
      console.error("Final error message:", errorMessage);
      toast.error("Failed to add official", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const setOfficialStatus = async (id: string, nextStatus: boolean) => {
    try {
      setLoading(true);

      const res = await api.patch(`/api/officials/${id}/status`, {
        status: nextStatus,
      });
      const currentOfficial = officials.find((o) => o.barangayadminid === id);
      const updated = normalizeOfficialRecord(res.data, currentOfficial);

      setOfficials((prev) =>
        prev.map((o) => (o.barangayadminid === id ? updated : o))
      );

      toast.success(
        nextStatus ? "Official record reactivated" : "Official record inactivated",
        {
          description: `${updated.adminname}'s record has been marked as ${nextStatus ? "active" : "inactive"
            }.`,
        }
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status", {
        description: "Check your backend PATCH route for status updates.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (official: Official) => {
    if (!official.email?.trim()) {
      toast.error("No Gmail address found for this official.");
      return;
    }

    setConfirmResetOfficial(official);
  };

  const openEditOfficial = (official: Official) => {
    setViewingOfficial(official);
    setEditingOfficial(buildOfficialEditForm(official));
    setShowDiscardEditDialog(false);
  };

  const hasUnsavedEditChanges = !!(
    viewingOfficial &&
    editingOfficial &&
    JSON.stringify(editingOfficial) !== JSON.stringify(buildOfficialEditForm(viewingOfficial))
  );

  const handleCancelEdit = () => {
    if (!hasUnsavedEditChanges) {
      setViewingOfficial(null);
      setEditingOfficial(null);
      setShowDiscardEditDialog(false);
      return;
    }
    setShowDiscardEditDialog(true);
  };

  const handleStartSaveOfficialEdit = () => {
    if (!viewingOfficial || !editingOfficial) return;
    const hasChanges =
      JSON.stringify(editingOfficial) !==
      JSON.stringify(buildOfficialEditForm(viewingOfficial));
    if (!hasChanges) {
      setViewingOfficial(null);
      setEditingOfficial(null);
      return;
    }
    setShowConfirmSaveEditDialog(true);
  };

  const handleConfirmDiscardEdit = () => {
    setShowDiscardEditDialog(false);
    setViewingOfficial(null);
    setEditingOfficial(null);
  };

  const handleSaveOfficialEdit = async () => {
    if (!viewingOfficial || !editingOfficial) return;

    const trimmedEmail = editingOfficial.email.trim();
    const trimmedName = editingOfficial.adminname.trim();
    const digits = editingOfficial.contactnumber.replace(/\D/g, "");

    if (!trimmedName) {
      toast.error("Full Name is required.");
      return;
    }
    if (!trimmedEmail) {
      toast.error("Email is required.");
      return;
    }
    if (!gmailRegex.test(trimmedEmail)) {
      toast.error("Only Gmail addresses are allowed.");
      return;
    }
    if (digits && digits.length !== 11) {
      toast.error("Contact number must be exactly 11 digits.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.put(`/api/officials/${viewingOfficial.barangayadminid}`, {
        adminname: trimmedName,
        position: editingOfficial.position,
        email: trimmedEmail,
        contactnumber: digits,
        termStart: editingOfficial.termstart || null,
        termEnd: editingOfficial.termend || null,
        status: editingOfficial.status,
        profileImage: editingOfficial.profileimage || null,
      });

      const updated = res.data || {};
      const normalized = normalizeOfficialRecord(updated, {
        ...viewingOfficial,
        adminname: trimmedName,
        position: editingOfficial.position || null,
        email: trimmedEmail,
        status: editingOfficial.status,
        contactnumber: digits,
        termstart: normalizeDateInputValue(editingOfficial.termstart) || undefined,
        termend: normalizeDateInputValue(editingOfficial.termend) || undefined,
        profileimage: editingOfficial.profileimage || undefined,
      });

      setOfficials((prev) =>
        prev.map((official) =>
          official.barangayadminid === normalized.barangayadminid ? normalized : official
        )
      );
      setShowConfirmSaveEditDialog(false);
      setViewingOfficial(null);
      setEditingOfficial(null);
      toast.success("Official information updated.");
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to update official information.";
      toast.error("Unable to update official.", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  if (resetPasswordOfficial) {
    return (
      <OfficialForgotPasswordPage
        official={resetPasswordOfficial}
        onBack={() => setResetPasswordOfficial(null)}
      />
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Barangay Officials ({officials.length})
          </h1>
          <p className="text-gray-600 mt-1">
            Manage barangay officials and positions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name / position / ID…"
            className="w-64"
          />

          <Dialog
            open={isDialogOpen}
            onOpenChange={handleOfficialDialogOpenChange}
          >
            <DialogTrigger asChild>
              <Button
                className="bg-[#2957a1] hover:bg-[#1e3f7a] text-white"
                disabled={loading}
              >
                ADD NEW OFFICIAL
              </Button>
            </DialogTrigger>

        <DialogContent
          className="w-[95vw] sm:max-w-[700px] md:max-w-[850px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto"
          onInteractOutside={(event) => {
            event.preventDefault();
            handleOfficialDialogOpenChange(false);
              }}
              onEscapeKeyDown={(event) => {
                event.preventDefault();
                handleOfficialDialogOpenChange(false);
              }}
            >
              <DialogHeader className="-mx-6 -mt-6 border-b bg-gray-50 px-6 py-4 rounded-t-[inherit]">
                <DialogTitle>Add New Official</DialogTitle>
              </DialogHeader>
              <DialogDescription className="px-0 pt-2">
                Provide the official's details to register their account and maintain their records in the barangay system.
              </DialogDescription>

              <div className="space-y-4 py-4">
                {/* Profile Image Upload */}
                <div className="flex justify-center">
                  <ProfileImageUpload
                    onImageReady={(imageUrl, previewUrl) => {
                      setFormData((prev) => ({ ...prev, profileImage: imageUrl }));
                      setProfileImagePreview(previewUrl);
                    }}
                    currentImage={profileImagePreview || undefined}
                    size="lg"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => {
                        const rawValue = e.target.value;
                        const hasInvalidCharacters = /[^a-zA-Z\s]/.test(rawValue);
                        const sanitizedValue = toUppercaseInput(
                          rawValue.replace(/[^a-zA-Z\s]/g, "")
                        );

                        setFormData({
                          ...formData,
                          name: sanitizedValue,
                        });
                        setNameWarning(
                          hasInvalidCharacters
                            ? "Full Name must contain letters only. Numbers and special characters are not allowed."
                            : ""
                        );
                      }}
                      placeholder="Enter full name"
                      className={
                        (saveAttempted && !formData.name.trim()) || nameWarning
                          ? "border-red-500 ring-red-500"
                          : ""
                      }
                    />
                    {nameWarning && (
                      <p className="text-xs text-red-500 mt-1">{nameWarning}</p>
                    )}
                    {saveAttempted && !formData.name.trim() && !nameWarning && (
                      <p className="text-xs text-red-500 mt-1">
                        Full Name is required.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position">Position *</Label>
                    <Select
                      value={formData.position}
                      onValueChange={(value) =>
                        setFormData({ ...formData, position: value })
                      }
                    >
                      <SelectTrigger id="position">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Barangay Captain">
                          Barangay Captain
                        </SelectItem>
                        <SelectItem value="Kagawad">Kagawad</SelectItem>
                        <SelectItem value="SK Chairman">SK Chairman</SelectItem>
                        <SelectItem value="Secretary">Secretary</SelectItem>
                        <SelectItem value="Treasurer">Treasurer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          email: e.target.value,
                        })
                      }
                      placeholder="example@gmail.com"
                      className={
                        saveAttempted && (!formData.email.trim() || emailInvalidFormat)
                          ? "border-red-500 ring-red-500"
                          : ""
                      }
                    />
                    {emailInvalidFormat && (
                      <p className="text-xs text-red-500 mt-1">
                        Only Gmail addresses are allowed (example@gmail.com).
                      </p>
                    )}
                    {emailValidFormat && !emailInvalidFormat && (
                      <p className="text-xs text-green-600 mt-1">
                        Valid Gmail format
                      </p>
                    )}
                    {saveAttempted && !formData.email.trim() && (
                      <p className="text-xs text-red-500 mt-1">
                        Email is required.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactNumber">Contact Number *</Label>
                    <Input
                      id="contactNumber"
                      value={formData.contactNumber}
                      inputMode="numeric"
                      maxLength={11}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contactNumber: e.target.value.replace(/\D/g, ""),
                        })
                      }
                      placeholder="09XX XXX XXXX"
                      className={
                        contactTooLong || contactInvalid
                          ? "border-red-500 ring-red-500"
                          : contactComplete
                            ? "border-green-500 ring-green-500"
                            : ""
                      }
                    />
                    {contactComplete && !contactTooLong && (
                      <p className="text-xs text-green-600 mt-1">
                        Contact number is valid.
                      </p>
                    )}
                    {contactInvalid && !contactTooLong && (
                      <p className="text-xs text-red-500 mt-1">
                        Please enter the contact number.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="termStart">Term Start</Label>
                    <div className="relative">
                      <Input
                        id="termStart"
                        type="date"
                        className="pr-11 [&::-webkit-calendar-picker-indicator]:opacity-0"
                        value={formData.termStart}
                        onChange={(e) =>
                          setFormData({ ...formData, termStart: e.target.value })
                        }
                      />
                      <button
                        type="button"
                        aria-label="Open term start calendar"
                        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-600 hover:text-black"
                        onClick={() => {
                          const input = document.getElementById("termStart") as HTMLInputElement | null;
                          input?.showPicker?.();
                          input?.focus();
                        }}
                      >
                        <Calendar className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="termEnd">Term End</Label>
                    <div className="relative">
                      <Input
                        id="termEnd"
                        type="date"
                        className="pr-11 [&::-webkit-calendar-picker-indicator]:opacity-0"
                        value={formData.termEnd}
                        onChange={(e) =>
                          setFormData({ ...formData, termEnd: e.target.value })
                        }
                      />
                      <button
                        type="button"
                        aria-label="Open term end calendar"
                        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-600 hover:text-black"
                        onClick={() => {
                          const input = document.getElementById("termEnd") as HTMLInputElement | null;
                          input?.showPicker?.();
                          input?.focus();
                        }}
                      >
                        <Calendar className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          status: value as StatusText,
                        })
                      }
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter className="-mx-6 -mb-6 mt-6 border-t bg-gray-50 px-6 py-4 rounded-b-[inherit]">
                <Button
                  variant="outline"
                  onClick={() => handleOfficialDialogOpenChange(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStartSubmit}
                  className="bg-[#2957a1] hover:bg-[#1e3f7a]"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Add Official"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog
            open={showDiscardOfficialDialog}
            onOpenChange={setShowDiscardOfficialDialog}
          >
            <AlertDialogContent className="max-w-[400px]">
              <AlertDialogHeader>
                <AlertDialogTitle>Discard official creation?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your unsaved barangay official information will be lost if you continue.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={loading}>Keep Editing</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmDiscardOfficial}
                  className="bg-[#2957a1]"
                  disabled={loading}
                >
                  Discard
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* STEP 2: DATA PRIVACY DIALOG */}
      <AlertDialog
        open={showDataPrivacyDialog}
        onOpenChange={(open) => {
          setShowDataPrivacyDialog(open);
          if (!open) {
            setOfficialPrivacyAccepted(false);
          }
        }}
      >
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Data Privacy Agreement</AlertDialogTitle>
            <AlertDialogDescription>
              Do you agree to process this barangay official’s information for
              management and record-keeping purposes?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-2 text-sm leading-7 text-gray-700">
            <p>
              By accessing and using the Tondocs Barangay Management Web Application, you agree to the
              collection, use, and processing of your personal information in accordance with applicable
              data privacy laws and regulations.
            </p>
            <p>
              The system collects personal data such as your name, address, contact information, and
              other relevant details solely for the purpose of processing barangay service requests,
              maintaining resident records, and improving service delivery.
            </p>
            <p>
              All personal information provided will be treated with strict confidentiality and will only
              be accessed by authorized barangay personnel. The system implements appropriate security
              measures to protect your data from unauthorized access, disclosure, alteration, or destruction.
            </p>
            <p>
              Your information will not be shared with third parties without your consent, unless
              required by law or necessary for official government functions.
            </p>
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="font-semibold text-[#2957a1]">By continuing to use this system, you confirm that:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
                {dataPrivacyHighlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <p>If you do not agree with this policy, please discontinue use of the system.</p>
            <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <input
                type="checkbox"
                checked={officialPrivacyAccepted}
                onChange={(event) => setOfficialPrivacyAccepted(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-800">
                I have read and understood the Data Privacy Agreement, and I consent to the collection
                and processing of this official’s information for legitimate barangay operations.
              </span>
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleCancelDataPrivacy}
              disabled={loading}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmPrivacy}
              className="bg-[#2957a1]"
              disabled={loading || !officialPrivacyAccepted}
            >
              Agree and Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* STEP 3: PASSWORD POP-UP */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-[400px] p-6 bg-white rounded-lg shadow-xl border-none">
          <DialogHeader className="text-left mb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Lock className="w-5 h-5 text-[#2957a1]" />
              </div>
              <DialogTitle className="text-lg font-bold text-gray-900">
                Set Official Account Password
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-gray-500">
              Create and confirm the password for this barangay official’s
              account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700">
                Initial Password *
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  maxLength={50}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="h-10 pr-10 border-gray-200 focus:ring-1 focus:ring-[#2957a1]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center justify-center text-gray-400 hover:text-[#2957a1]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700">
                Confirm Password *
              </Label>
              <Input
                type={showPassword ? "text" : "password"}
                maxLength={50}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type password"
                className={`h-10 border-gray-200 focus:ring-1 focus:ring-[#2957a1] ${confirmPassword && password !== confirmPassword
                    ? "border-red-500 ring-red-500"
                    : ""
                  }`}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-[10px] text-red-500 mt-1">
                  Passwords do not match
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordDialog(false);
                  setConfirmPassword("");
                  setShowDiscardOfficialDialog(false);
                  setIsDialogOpen(true);
                }}
                className="h-9 px-4 text-xs font-semibold text-gray-600"
                disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFinalSubmit}
              className="h-9 px-4 bg-[#2957a1] text-white text-xs font-bold rounded-md hover:bg-[#1e3f7a]"
              disabled={loading}
            >
              Create Account &amp; Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!viewingOfficial}
        onOpenChange={(open) => {
          if (!open) {
            if (showConfirmSaveEditDialog) {
              return;
            }
            handleCancelEdit();
            return;
          }
        }}
      >
        <DialogContent
          className="w-[95vw] sm:max-w-[700px] md:max-w-[850px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto overflow-x-hidden"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
          }}
          onInteractOutside={(event) => {
            event.preventDefault();
            if (showConfirmSaveEditDialog) {
              return;
            }
            handleCancelEdit();
          }}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            if (showConfirmSaveEditDialog) {
              return;
            }
            handleCancelEdit();
          }}
        >
          <DialogHeader className="-mx-6 -mt-6 border-b bg-gray-50 px-6 py-4 rounded-t-[inherit]">
            <DialogTitle>Edit Official Information</DialogTitle>
            <DialogDescription>
              Review and update the saved barangay official information.
            </DialogDescription>
          </DialogHeader>

          {viewingOfficial && editingOfficial && (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center gap-4 text-center md:flex-row md:items-start md:text-left">
                <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#2957a1] bg-[#2957a1]">
                  {editingOfficial.profileimage ? (
                    <img
                      src={
                        editingOfficial.profileimage.startsWith("data:")
                          ? editingOfficial.profileimage
                          : `http://localhost:5001${editingOfficial.profileimage}`
                      }
                      alt={viewingOfficial.adminname}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-12 w-12 text-white" />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap justify-center gap-2 md:justify-start">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                      Username: {viewingOfficial.barangayadminid}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        viewingOfficial.status
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {formatStatusLabel(viewingOfficial.status)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-8 lg:grid-cols-[1.45fr_1.1fr]">
                <Card className="bg-gray-50">
                  <CardContent className="space-y-4 p-9">
                    <h4 className="text-base font-semibold text-[#2957a1]">
                      Account Information
                    </h4>
                    <div className="space-y-4 rounded-xl bg-gray-100 p-4 text-sm">
                      <div>
                        <Label className="text-xs uppercase tracking-wide text-gray-500">
                          Full Name
                        </Label>
                        <Input
                          value={editingOfficial.adminname}
                          readOnly
                          disabled
                          className="mt-1 bg-white text-black disabled:opacity-100 disabled:text-black disabled:bg-white cursor-default"
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wide text-gray-500">
                          Position
                        </Label>
                        <Input
                          value={editingOfficial.position}
                          readOnly
                          disabled
                          className="mt-1 bg-white text-black disabled:opacity-100 disabled:text-black disabled:bg-white cursor-default"
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wide text-gray-500">
                          Email
                        </Label>
                        <Input
                          type="email"
                          value={editingOfficial.email}
                          onChange={(e) =>
                            setEditingOfficial((prev) =>
                              prev ? { ...prev, email: e.target.value } : prev
                            )
                          }
                          onFocus={(e) => {
                            const end = e.target.value.length;
                            e.target.setSelectionRange(end, end);
                          }}
                          className="mt-1 bg-white focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wide text-gray-500">
                          Contact Number
                        </Label>
                        <Input
                          value={editingOfficial.contactnumber}
                          inputMode="numeric"
                          maxLength={11}
                          onChange={(e) =>
                            setEditingOfficial((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    contactnumber: e.target.value.replace(/\D/g, ""),
                                  }
                                : prev
                            )
                          }
                          className="mt-1 bg-white"
                        />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          Date Created
                        </p>
                        <p className="font-medium text-gray-900">
                          {formatDisplayDate(viewingOfficial.datecreated) || "Not available"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-50">
                  <CardContent className="space-y-4 p-5">
                    <h4 className="text-base font-semibold text-[#2957a1]">
                      Term Information
                    </h4>
                    <div className="space-y-4 rounded-xl bg-gray-100 p-4 text-sm">
                      <div>
                        <Label className="text-xs uppercase tracking-wide text-gray-500">
                          Status
                        </Label>
                        <Select
                          value={editingOfficial.status ? "Active" : "Inactive"}
                          onValueChange={(value) =>
                            setEditingOfficial((prev) =>
                              prev ? { ...prev, status: value === "Active" } : prev
                            )
                          }
                        >
                          <SelectTrigger className="mt-1 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wide text-gray-500">
                          Term Start
                        </Label>
                        <Input
                          type="date"
                          value={editingOfficial.termstart}
                          readOnly
                          disabled
                          className="mt-1 bg-white text-black disabled:opacity-100 disabled:text-black disabled:bg-white cursor-default"
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wide text-gray-500">
                          Term End
                        </Label>
                        <Input
                          type="date"
                          value={editingOfficial.termend}
                          readOnly
                          disabled
                          className="mt-1 bg-white text-black disabled:opacity-100 disabled:text-black disabled:bg-white cursor-default"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <DialogFooter className="-mx-6 -mb-6 mt-100 border-t bg-gray-50 px-6 py-4 rounded-b-[inherit]">
            <Button
              variant="outline"
              onClick={handleCancelEdit}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#2957a1] hover:bg-[#1e3f7a]"
              onClick={handleStartSaveOfficialEdit}
              disabled={loading}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={showConfirmSaveEditDialog}
        onOpenChange={setShowConfirmSaveEditDialog}
      >
        <AlertDialogContent className="max-w-[420px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Save official changes?</AlertDialogTitle>
            <AlertDialogDescription>
              {viewingOfficial
                ? `Are you sure you want to save the changes for ${viewingOfficial.adminname}?`
                : "Are you sure you want to save these official changes?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleSaveOfficialEdit()}
              className="bg-[#2957a1] hover:bg-[#1e3f7a]"
              disabled={loading}
            >
              Confirm Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showDiscardEditDialog}
        onOpenChange={setShowDiscardEditDialog}
      >
        <AlertDialogContent className="max-w-[420px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              If you continue, the edit dialog will be closed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDiscardEdit}
              className="bg-[#2957a1] hover:bg-[#1e3f7a]"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!confirmResetOfficial}
        onOpenChange={(open) => {
          if (!open) setConfirmResetOfficial(null);
        }}
      >
        <AlertDialogContent className="max-w-[420px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Change official password?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmResetOfficial
                ? `Are you sure you want to edit the password of ${confirmResetOfficial.adminname}?`
                : "Are you sure you want to edit this official's password?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#2957a1] hover:bg-[#1e3f7a]"
              onClick={() => {
                if (confirmResetOfficial) {
                  setResetPasswordOfficial(confirmResetOfficial);
                }
                setConfirmResetOfficial(null);
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Officials Grid */}
      {loading ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-600">
            Loading officials…
          </CardContent>
        </Card>
      ) : filteredOfficials.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No officials found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOfficials.map((official) => {
            const statusText = toStatusText(official.status);

            return (
              <Card
                key={official.barangayadminid}
                className="hover:shadow-lg transition-shadow bg-white"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#2957a1] bg-[#2957a1] flex items-center justify-center">
                      {official.profileimage ? (
                        <img
                          src={
                            official.profileimage.startsWith('data:')
                              ? official.profileimage
                              : `http://localhost:5001${official.profileimage}`
                          }
                          alt={official.adminname}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-8 h-8 text-white" />
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        onClick={() => openEditOfficial(official)}
                      >
                        Edit Info
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-sm font-medium text-[#2957a1] hover:text-[#1e3f7a] hover:bg-blue-50"
                        onClick={() => handleForgotPassword(official)}
                      >
                        Forgot Password
                      </Button>
                      {statusText === "Active" ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              disabled={loading}
                            >
                              Deactivate
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Deactivate the account of this Barangay Official?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to inactivate{" "}
                                {official.adminname}'s record? This will mark the
                                official as inactive, but the data will be
                                preserved.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={loading}>
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  void setOfficialStatus(
                                    official.barangayadminid,
                                    false
                                  )
                                }
                                className="bg-orange-600 hover:bg-orange-700"
                                disabled={loading}
                              >
                                Deactivate
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        // ADDED CONFIRMATION FOR REACTIVATE
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50"
                              disabled={loading}
                            >
                              Reactivate
                            </Button>
                          </AlertDialogTrigger>

                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Reactivate the account of this Barangay Official?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to reactivate{" "}
                                {official.adminname}'s record? This will restore
                                the official’s active status.
                              </AlertDialogDescription>
                            </AlertDialogHeader>

                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={loading}>
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  void setOfficialStatus(
                                    official.barangayadminid,
                                    true
                                  )
                                }
                                className="bg-green-600 hover:bg-green-700"
                                disabled={loading}
                              >
                                Reactivate
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-bold text-lg text-gray-900">
                      {official.adminname}
                    </h3>
                    <p className="text-sm font-semibold text-[#2957a1]">
                      {official.position ?? "-"}
                    </p>
                    <p className="font - semibold text-sm text-gray-500">
                      Username: {official.barangayadminid}
                    </p>
                    {(official.termstart || official.termend) && (
                      <div className="space-y-1">
                        {official.termstart && (
                          <p className="text-sm text-gray-600">
                            Term Start: {formatDisplayDate(official.termstart)}
                          </p>
                        )}
                        {official.termend && (
                          <p className="text-sm text-gray-600">
                            Term End: {formatDisplayDate(official.termend)}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="pt-2 space-y-1">
                      {official.email ? (
                        <p className="text-sm text-gray-600">📧 {official.email}</p>
                      ) : null}
                    </div>

                    <div className="pt-2">
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded-full ${statusText === "Active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                          }`}
                      >
                        {statusText}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
