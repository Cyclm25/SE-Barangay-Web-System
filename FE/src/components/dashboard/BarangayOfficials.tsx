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
import { User, Upload, Lock, Eye, EyeOff } from "lucide-react";
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

function toStatusText(statusBool: boolean): StatusText {
  return statusBool ? "Active" : "Inactive";
}

export function BarangayOfficials() {
  const [officials, setOfficials] = useState<Official[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [profileImagePreview, setProfileImagePreview] = useState<string>("");

  // STEP 2 + STEP 3 dialog states
  const [showDataPrivacyDialog, setShowDataPrivacyDialog] = useState(false);
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
  }>({
    profileImage: "",
    name: "",
    position: "Kagawad",
    contactNumber: "",
    email: "",
    termStart: "",
    termEnd: "",
    status: "Active",
  });

  const resetForm = () => {
    setFormData({
      profileImage: "",
      name: "",
      position: "Kagawad",
      contactNumber: "",
      email: "",
      termStart: "",
      termEnd: "",
      status: "Active",
    });

    setProfileImagePreview("");

    setShowDataPrivacyDialog(false);
    setShowPasswordDialog(false);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
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
        setOfficials(Array.isArray(res.data) ? res.data : []);
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

  // STEP 1: start submit -> show privacy
  const handleStartSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("Full Name is required");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Email is required");
      return;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast.error("Invalid email format");
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
  };

  const handleConfirmPrivacy = () => {
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
        password: finalPassword,
        superadminid: superAdminId,
      };

      console.log("Sending payload:", payload);
      const res = await api.post("/api/officials", payload);
      console.log("API response:", res.data);
      
      // Backend returns { official: {...}, residentaccount: {...} }
      const created = (res.data?.official || res.data) as Official;
      console.log("Created official:", created);
      
      if (!created || !created.barangayadminid) {
        throw new Error("Invalid response from server");
      }

      setOfficials((prev) => [created, ...prev]);

      setShowPasswordDialog(false);
      setShowDataPrivacyDialog(false);
      setIsDialogOpen(false);

      resetForm();

      toast.success("Barangay official successfully added!", {
        description: `${created.adminname} has been registered as ${created.position ?? "Official"}.`,
      });
    } catch (err: any) {
      console.error("Error adding official:", err);
      console.error('Error response data:', err?.response?.data);
      console.error('Error status:', err?.response?.status);
      const errorMessage = err?.response?.data?.message || 
                          err?.response?.data?.error || 
                          err?.message || 
                          'Unknown error';
      console.error('Final error message:', errorMessage);
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

      const res = await api.patch(`/api/officials/${id}/status`, { status: nextStatus });
      const updated = res.data as Official;

      setOfficials((prev) => prev.map((o) => (o.barangayadminid === id ? updated : o)));

      toast.success(nextStatus ? "Official record reactivated" : "Official record inactivated", {
        description: `${updated.adminname}'s record has been marked as ${
          nextStatus ? "active" : "inactive"
        }.`,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status", {
        description: "Check your backend PATCH route for status updates.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Barangay Officials ({officials.length})
          </h1>
          <p className="text-gray-600 mt-1">Manage barangay officials and positions</p>
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
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-[#2957a1] hover:bg-[#1e3f7a] text-white" disabled={loading}>
                ADD NEW OFFICIAL
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Official</DialogTitle>
              </DialogHeader>
              <DialogDescription>Add a new barangay official to the system.</DialogDescription>

              <div className="space-y-4 py-4">
                {/* Profile Image Upload */}
                <div className="flex justify-center">
                  <div className="space-y-2 text-center">
                    <div className="w-32 h-32 mx-auto rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-[#2957a1]">
                      {profileImagePreview ? (
                        <img
                          src={profileImagePreview}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-16 h-16 text-gray-400" />
                      )}
                    </div>

                    <Label htmlFor="profileImage" className="cursor-pointer">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#2957a1] text-white rounded-md hover:bg-[#1e3f7a] transition-colors">
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">Upload Profile Picture</span>
                      </div>
                      <Input
                        id="profileImage"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </Label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position">Position *</Label>
                    <Select
                      value={formData.position}
                      onValueChange={(value) => setFormData({ ...formData, position: value })}
                    >
                      <SelectTrigger id="position">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Barangay Captain">Barangay Captain</SelectItem>
                        <SelectItem value="Kagawad">Kagawad</SelectItem>
                        <SelectItem value="SK Chairman">SK Chairman</SelectItem>
                        <SelectItem value="Secretary">Secretary</SelectItem>
                        <SelectItem value="Treasurer">Treasurer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactNumber">Contact Number</Label>
                    <Input
                      id="contactNumber"
                      value={formData.contactNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, contactNumber: e.target.value })
                      }
                      placeholder="09XX XXX XXXX"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="termStart">Term Start</Label>
                    <Input
                      id="termStart"
                      type="date"
                      value={formData.termStart}
                      onChange={(e) => setFormData({ ...formData, termStart: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="termEnd">Term End</Label>
                    <Input
                      id="termEnd"
                      type="date"
                      value={formData.termEnd}
                      onChange={(e) => setFormData({ ...formData, termEnd: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value as StatusText })
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

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={loading}>
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
        </div>
      </div>

      {/* STEP 2: DATA PRIVACY DIALOG */}
      <AlertDialog open={showDataPrivacyDialog} onOpenChange={setShowDataPrivacyDialog}>
        <AlertDialogContent className="max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Data Privacy Agreement</AlertDialogTitle>
            <AlertDialogDescription>
              Do you agree to process this barangay official’s information for management and record-keeping purposes?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDataPrivacy} disabled={loading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPrivacy} className="bg-[#2957a1]" disabled={loading}>
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
              Create and confirm the password for this barangay official’s account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700">Initial Password *</Label>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2957a1]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700">Confirm Password *</Label>
              <Input
                type={showPassword ? "text" : "password"}
                maxLength={50}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type password"
                className={`h-10 border-gray-200 focus:ring-1 focus:ring-[#2957a1] ${
                  confirmPassword && password !== confirmPassword ? "border-red-500 ring-red-500" : ""
                }`}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-[10px] text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false);
                setConfirmPassword("");
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

      {/* Officials Grid (FIXED: ACTUALLY RENDERS ITEMS) */}
      {loading ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-600">Loading officials…</CardContent>
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
              <Card key={official.barangayadminid} className="hover:shadow-lg transition-shadow bg-white">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-16 h-16 bg-[#2957a1] rounded-full flex items-center justify-center overflow-hidden">
                      <User className="w-8 h-8 text-white" />
                    </div>

                    <div className="flex gap-2">
                      {statusText === "Active" ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              disabled={loading}
                            >
                              Inactivate
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Inactivate Official?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to inactivate {official.adminname}'s record?
                                This will mark the official as inactive but the data will be preserved.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => void setOfficialStatus(official.barangayadminid, false)}
                                className="bg-orange-600 hover:bg-orange-700"
                                disabled={loading}
                              >
                                Inactivate
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void setOfficialStatus(official.barangayadminid, true)}
                          className="h-8 px-3 text-green-600 hover:text-green-700 hover:bg-green-50"
                          disabled={loading}
                        >
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-bold text-lg text-gray-900">{official.adminname}</h3>
                    <p className="text-sm font-semibold text-[#2957a1]">
                      {official.position ?? "—"}
                    </p>
                    <p className="text-xs text-gray-500">{official.barangayadminid}</p>

                    <div className="pt-2 space-y-1">
                      {official.email ? (
                        <p className="text-xs text-gray-600">📧 {official.email}</p>
                      ) : null}
                    </div>

                    <div className="pt-2">
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded-full ${
                          statusText === "Active"
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
