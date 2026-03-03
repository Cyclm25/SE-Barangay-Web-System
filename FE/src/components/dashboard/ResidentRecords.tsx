import React, { useState, useEffect } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Search, Eye, EyeOff, Upload, User, Lock } from "lucide-react";
import { toast } from "sonner";
import { formatId } from "../../utils/formatId";
import OcrScanner from "../../OcrScanner";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"; ``
import dayjs, { Dayjs } from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";


type ResidentStatus = "Active" | "Inactive";

interface Resident {
  id: string;
  residentNo: string;
  profileImage?: string;
  firstName: string;
  middleName: string;
  lastName: string;
  age: number;
  birthday: string; // YYYY-MM-DD
  gender: "Male" | "Female";
  civilStatus: string;
  residentType: string;
  voterStatus: "Yes" | "No";
  houseNo: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  country: string;
  contactNumber: string;
  email: string;
  fatherName: string;
  motherName: string;
  spouseName?: string;
  numberOfChildren?: number;
  emergencyContactName: string;
  emergencyContactNumber: string;
  emergencyContactAddress: string;
  dateRegistered: string;
  status: ResidentStatus;
}

type ResidentRow = {
  ResidentID: string;
  FirstName: string;
  MiddleName: string | null;
  LastName: string;
  Age: number | null;
  Birthday: string | null;
  Gender: "Male" | "Female" | null;
  CivilStatus: string | null;
  ResidentType: string | null;
  VoterStatus: boolean | null;
  HouseNumber: string | null;
  StreetAddress: string | null;
  ContactNumber: string | null;
  Email: string | null;
  FatherName: string | null;
  MotherName: string | null;
  SpouseName: string | null;
  NoOfChildren: number | null;
  ContactPerson: string | null;
  ContactPersonNo: string | null;
  ContactPersonAddress: string | null;
  status: ResidentStatus | null;
  dateRegistered?: string | null;
};

const API_BASE = "http://localhost:5001";

function mapRowToResident(r: ResidentRow): Resident {
  return {
    id: r.ResidentID,
    residentNo: r.ResidentID,
    profileImage: undefined,
    firstName: r.FirstName ?? "",
    middleName: r.MiddleName ?? "",
    lastName: r.LastName ?? "",
    age: Number(r.Age ?? 0),
    birthday: (r.Birthday as any) ?? "",
    gender: (r.Gender as any) ?? "Male",
    civilStatus: r.CivilStatus ?? "",
    residentType: r.ResidentType ?? "",
    voterStatus: r.VoterStatus === true ? "Yes" : "No",
    houseNo: r.HouseNumber ?? "",
    streetAddress: r.StreetAddress ?? "",
    city: "Manila City",
    postalCode: "1013",
    country: "Philippines",
    contactNumber: r.ContactNumber ?? "",
    email: r.Email ?? "",
    fatherName: r.FatherName ?? "",
    motherName: r.MotherName ?? "",
    spouseName: r.SpouseName ?? undefined,
    numberOfChildren: r.NoOfChildren ?? undefined,
    emergencyContactName: r.ContactPerson ?? "",
    emergencyContactNumber: r.ContactPersonNo ?? "",
    emergencyContactAddress: r.ContactPersonAddress ?? "",
    status: (r.status ?? "Active") as ResidentStatus,
    dateRegistered: r.dateRegistered ?? new Date().toISOString().split("T")[0],
  };
}

const normalizeDateOnly = (v: any): string => {
  if (!v) return "";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  if (typeof v === "string" && v.includes("T")) return v.slice(0, 10);
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const calculateAge = (birthdate: any) => {
  const dateOnly = normalizeDateOnly(birthdate);
  if (!dateOnly) return "";
  const [year, month, day] = dateOnly.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;
  if (
    today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day)
  ) {
    age--;
  }
  return age < 0 ? "" : String(age);
};

export function ResidentRecords() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [viewingResident, setViewingResident] = useState<Resident | null>(null);
  const [showDataPrivacyDialog, setShowDataPrivacyDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pendingResident, setPendingResident] = useState<Resident | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>("");
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [sortBy, setSortBy] = useState<"residentNo" | "firstName" | "lastName" | "residentType" | "status">("residentNo");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [formData, setFormData] = useState({
    profileImage: "",
    firstName: "",
    middleName: "",
    lastName: "",
    age: "",
    birthday: "", // YYYY-MM-DD
    gender: "Male" as "Male" | "Female",
    civilStatus: "Single",
    residentType: "Resident",
    voterStatus: "No" as "Yes" | "No",
    houseNo: "",
    streetAddress: "",
    city: "Manila City",
    postalCode: "1013",
    country: "Philippines",
    contactNumber: "",
    email: "",
    fatherName: "",
    motherName: "",
    spouseName: "",
    numberOfChildren: "",
    emergencyContactName: "",
    emergencyContactNumber: "",
    emergencyContactAddress: "",
  });

  // required-field helpers
  const isBlank = (v: string) => !v || !v.trim();
  const invalidEmail = (v: string) =>
    isBlank(v) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const invalidContact = (v: string) => isBlank(v) || v.length !== 11;

  const contactTooLong = formData.contactNumber.length > 11;
  const contactComplete = formData.contactNumber.length === 11;

  const gmailRegex = /^[a-z0-9](\.?[a-z0-9]){5,29}@gmail\.com$/i;

  const emailInvalidFormat =
    formData.email.trim().length > 0 && !gmailRegex.test(formData.email.trim());

  const emailValidFormat =
    formData.email.trim().length > 0 && gmailRegex.test(formData.email.trim());

  const firstNameError = saveAttempted && isBlank(formData.firstName);
  const lastNameError = saveAttempted && isBlank(formData.lastName);
  const birthdayError = saveAttempted && isBlank(formData.birthday);
  const contactError = saveAttempted && invalidContact(formData.contactNumber);
  const emailError = saveAttempted && invalidEmail(formData.email);

  const loadResidents = async () => {
    try {
      const response = await fetch(`${API_BASE}/residents`);
      const data = await response.json();

      if (!response.ok) {
        toast.error(data?.error || "Failed to load residents.");
        return;
      }

      const rows: ResidentRow[] = Array.isArray(data)
        ? data
        : data?.residents ?? [];
      const mapped = rows.map(mapRowToResident);

      const userType = localStorage.getItem("userType");
      const residentId = localStorage.getItem("residentId");

      if (userType === "resident" && residentId) {
        setResidents(mapped.filter((r) => r.residentNo === residentId));
      } else {
        setResidents(mapped);
      }
    } catch (err) {
      toast.error("Could not reach backend server.");
      console.error(err);
    }
  };

  useEffect(() => {
    loadResidents();
  }, []);

  const resetForm = () => {
    setFormData({
      profileImage: "",
      firstName: "",
      middleName: "",
      lastName: "",
      age: "",
      birthday: "",
      gender: "Male",
      civilStatus: "Single",
      residentType: "Resident",
      voterStatus: "No",
      houseNo: "",
      streetAddress: "",
      city: "Manila City",
      postalCode: "1013",
      country: "Philippines",
      contactNumber: "",
      email: "",
      fatherName: "",
      motherName: "",
      spouseName: "",
      numberOfChildren: "",
      emergencyContactName: "",
      emergencyContactNumber: "",
      emergencyContactAddress: "",
    });
    setProfileImagePreview("");
    setPassword("");
    setConfirmPassword("");
    setSaveAttempted(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setProfileImagePreview(result);
        setFormData({ ...formData, profileImage: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveResident = () => {
    setSaveAttempted(true);

    if (
      isBlank(formData.firstName) ||
      isBlank(formData.lastName) ||
      isBlank(formData.birthday) ||
      invalidContact(formData.contactNumber) ||
      invalidEmail(formData.email)
    ) {
      toast.error("Please fill in all required fields correctly.");
      return;
    }

    const newResident: Resident = {
      id: `TMP_${Date.now()}`,
      residentNo: `TMP_${Date.now()}`,
      profileImage: formData.profileImage || undefined,
      firstName: formData.firstName,
      middleName: formData.middleName,
      lastName: formData.lastName,
      age: parseInt(formData.age) || 0,
      birthday: formData.birthday,
      gender: formData.gender,
      civilStatus: formData.civilStatus,
      residentType: formData.residentType,
      voterStatus: formData.voterStatus,
      houseNo: formData.houseNo,
      streetAddress: formData.streetAddress,
      city: formData.city,
      postalCode: formData.postalCode,
      country: formData.country,
      contactNumber: formData.contactNumber,
      email: formData.email,
      fatherName: formData.fatherName,
      motherName: formData.motherName,
      spouseName: formData.spouseName || undefined,
      numberOfChildren: formData.numberOfChildren
        ? parseInt(formData.numberOfChildren)
        : undefined,
      emergencyContactName: formData.emergencyContactName,
      emergencyContactNumber: formData.emergencyContactNumber,
      emergencyContactAddress: formData.emergencyContactAddress,
      dateRegistered: new Date().toISOString().split("T")[0],
      status: "Active",
    };

    setPendingResident(newResident);
    setIsAddDialogOpen(false);
    setShowDataPrivacyDialog(true);
  };

  const handleConfirmPrivacy = () => {
    setShowDataPrivacyDialog(false);
    setShowPasswordDialog(true);
  };

  const handleFinalSubmit = async () => {
    if (!password || !confirmPassword) {
      toast.error("Please fill in both password fields.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }
    if (!pendingResident) return;

    try {
      const nextNo = `RS${new Date().getFullYear()}${String(
        Math.floor(Math.random() * 9999)
      ).padStart(4, "0")}`;

      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("jwt") ||
        null;

      if (!token) {
        toast.error("Missing login token. Please log in again.");
        return;
      }

      const response = await fetch(`${API_BASE}/residents/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          residentNo: nextNo,
          firstName: pendingResident.firstName,
          middleName: pendingResident.middleName,
          lastName: pendingResident.lastName,
          age: pendingResident.age,
          birthday: pendingResident.birthday, // YYYY-MM-DD
          gender: pendingResident.gender,
          civilStatus: pendingResident.civilStatus,
          residentType: pendingResident.residentType,
          voterStatus: pendingResident.voterStatus,
          houseNo: pendingResident.houseNo,
          streetAddress: pendingResident.streetAddress,
          contactNumber: pendingResident.contactNumber,
          email: pendingResident.email,
          fatherName: pendingResident.fatherName,
          motherName: pendingResident.motherName,
          spouseName: pendingResident.spouseName ?? "",
          numberOfChildren: pendingResident.numberOfChildren ?? "",
          emergencyContactName: pendingResident.emergencyContactName,
          emergencyContactNumber: pendingResident.emergencyContactNumber,
          emergencyContactAddress: pendingResident.emergencyContactAddress,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Resident and Account successfully saved!");
        await loadResidents();
        setShowPasswordDialog(false);
        setPendingResident(null);
        resetForm();
      } else {
        toast.error(data?.error || "Database failed to save record.");
      }
    } catch (err) {
      toast.error("Could not reach backend server.");
      console.error(err);
    }
  };

  const handleCancelDataPrivacy = () => {
    setShowDataPrivacyDialog(false);
    setPendingResident(null);
    resetForm();
  };

  const handleInactivate = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/residents/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Inactive" }),
      });
      const data = await response.json();

      if (response.ok) {
        await loadResidents();
        toast.success("Record updated to Inactive");
      } else {
        toast.error(data?.error || "Update failed.");
      }
    } catch (err) {
      toast.error("Update failed.");
      console.error(err);
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/residents/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Active" }),
      });
      const data = await response.json();

      if (response.ok) {
        await loadResidents();
        toast.success("Record reactivated");
      } else {
        toast.error(data?.error || "Reactivation failed.");
      }
    } catch (err) {
      toast.error("Reactivation failed.");
      console.error(err);
    }
  };

  const filteredResidents = residents
    .filter(
      (resident) =>
        resident.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resident.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resident.residentNo.includes(searchTerm)
    )
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "firstName":
          comparison = a.firstName.localeCompare(b.firstName);
          break;
        case "lastName":
          comparison = a.lastName.localeCompare(b.lastName);
          break;
        case "residentType":
          comparison = a.residentType.localeCompare(b.residentType);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = a.residentNo.localeCompare(b.residentNo);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

  const handleOcrData = (extractedText: string) => {
    const text = extractedText.toUpperCase();
    setFormData((prev) => ({
      ...prev,
      firstName: text.substring(0, 20),
    }));
    toast.success("Check the First Name box!");
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <div className="p-6 space-y-6 bg-gray-50 min-h-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Resident Records ({residents.filter((r) => r.status === "Active").length})
            </h1>
            <p className="text-gray-600 mt-1">Manage all registered residents</p>
          </div>

          <Dialog
            open={isAddDialogOpen}
            onOpenChange={(open) => {
              if (!open) resetForm();
              setIsAddDialogOpen(open);
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-[#2957a1] hover:bg-[#1e3f7a] text-white">
                ADD NEW RESIDENT
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-[1200px] w-[95vw] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">Add New Resident</DialogTitle>
                <DialogDescription>
                  Fill in the resident's information to register them in the system.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="flex justify-center mb-2">
                  <OcrScanner onDataExtracted={handleOcrData} />
                </div>

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
                        <Upload className="w-4 h-4" />{" "}
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

                {/* PERSONAL INFO */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#2957a1] border-b pb-2">
                    Personal Information
                  </h3>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>First Name *</Label>
                      <Input
                        value={formData.firstName}
                        onChange={(e) =>
                          setFormData({ ...formData, firstName: e.target.value })
                        }
                        placeholder="Enter first name"
                        className={firstNameError ? "border-red-500 ring-red-500" : ""}
                      />
                      {firstNameError && (
                        <p className="text-xs text-red-500 mt-1">First name is required.</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Middle Name</Label>
                      <Input
                        value={formData.middleName}
                        onChange={(e) =>
                          setFormData({ ...formData, middleName: e.target.value })
                        }
                        placeholder="Enter middle name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Last Name *</Label>
                      <Input
                        value={formData.lastName}
                        onChange={(e) =>
                          setFormData({ ...formData, lastName: e.target.value })
                        }
                        placeholder="Enter last name"
                        className={lastNameError ? "border-red-500 ring-red-500" : ""}
                      />
                      {lastNameError && (
                        <p className="text-xs text-red-500 mt-1">Last name is required.</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Age</Label>
                      <Input type="number" value={formData.age} readOnly placeholder="Auto-calculated" />
                    </div>

                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select
                        value={formData.gender}
                        onValueChange={(v) => setFormData({ ...formData, gender: v as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Civil Status</Label>
                      <Select
                        value={formData.civilStatus}
                        onValueChange={(v) =>
                          setFormData({ ...formData, civilStatus: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Single">Single</SelectItem>
                          <SelectItem value="Married">Married</SelectItem>
                          <SelectItem value="Widowed">Widowed</SelectItem>
                          <SelectItem value="Separated">Separated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* ✅ BIRTHDAY (MUI year grid like your screenshot) */}
                    <div className="space-y-2">
                      <Label>Birthday *</Label>

                      <DatePicker
                        value={formData.birthday ? dayjs(formData.birthday) : null}
                        onChange={(newValue: Dayjs | null) => {
                          if (!newValue || !newValue.isValid()) {
                            setFormData({ ...formData, birthday: "", age: "" });
                            return;
                          }
                          const ymd = newValue.format("YYYY-MM-DD");
                          setFormData({ ...formData, birthday: ymd, age: calculateAge(ymd) });
                        }}
                        openTo="year"
                        views={["year", "month", "day"]}
                        disableFuture
                        format="MM/DD/YYYY"
                        slotProps={{
                          popper: { disablePortal: true, sx: { zIndex: 999999 } },
                          textField: {
                            fullWidth: true,
                            className: "shadcn-date-field",
                            error: birthdayError,
                            helperText: birthdayError ? "Birthday is required." : "",
                          },
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Resident Type</Label>
                      <Select
                        value={formData.residentType}
                        onValueChange={(v) =>
                          setFormData({ ...formData, residentType: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Resident">Resident</SelectItem>
                          <SelectItem value="Student">Student</SelectItem>
                          <SelectItem value="Senior Citizen">Senior Citizen</SelectItem>
                          <SelectItem value="PWD">PWD</SelectItem>
                          <SelectItem value="Indigenous">Indigenous</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Voter Status</Label>
                      <Select
                        value={formData.voterStatus}
                        onValueChange={(v) =>
                          setFormData({ ...formData, voterStatus: v as any })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* ADDRESS & CONTACT */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#2957a1] border-b pb-2">
                    Address & Contact
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>House No.</Label>
                      <Input
                        value={formData.houseNo}
                        onChange={(e) => setFormData({ ...formData, houseNo: e.target.value })}
                        placeholder="House number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Street Address</Label>
                      <Input
                        value={formData.streetAddress}
                        onChange={(e) =>
                          setFormData({ ...formData, streetAddress: e.target.value })
                        }
                        placeholder="Street address"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Postal Code</Label>
                      <Input
                        value={formData.postalCode}
                        onChange={(e) =>
                          setFormData({ ...formData, postalCode: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input
                        value={formData.country}
                        onChange={(e) =>
                          setFormData({ ...formData, country: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* CONTACT NUMBER */}
                    <div className="space-y-2">
                      <Label>Contact Number *</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        maxLength={12}
                        value={formData.contactNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          setFormData({ ...formData, contactNumber: value });
                        }}
                        className={
                          contactTooLong
                            ? "border-red-500 ring-red-500"
                            : contactComplete
                              ? "border-green-500 ring-green-500"
                              : ""
                        }
                        placeholder="09XX XXX XXXX"
                      />

                      {contactTooLong && (
                        <p className="text-xs text-red-500 mt-1">
                          Contact number must not exceed 12 digits.❌
                        </p>
                      )}

                      {contactComplete && !contactTooLong && (
                        <p className="text-xs text-green-600 mt-1">
                          Contact number complete (11 digits)✅
                        </p>
                      )}

                      {contactError && (
                        <p className="text-xs text-red-500 mt-1">
                          Contact number must be exactly 11 digits.
                        </p>
                      )}
                    </div>

                    {/* EMAIL */}
                    <div className="space-y-2">
                      <Label>Email (Gmail only) *</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="example@gmail.com"
                        className={emailInvalidFormat ? "border-red-500 ring-red-500" : ""}
                      />

                      {emailInvalidFormat && (
                        <p className="text-xs text-red-500 mt-1">
                          Only Gmail addresses are allowed (example@gmail.com).
                        </p>
                      )}

                      {emailValidFormat && !emailInvalidFormat && (
                        <p className="text-xs text-green-600 mt-1">Valid email format</p>
                      )}

                      {emailError && (
                        <p className="text-xs text-red-500 mt-1">Email is required.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* FAMILY */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#2957a1] border-b pb-2">
                    Family Background
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Father's Name</Label>
                      <Input
                        value={formData.fatherName}
                        onChange={(e) =>
                          setFormData({ ...formData, fatherName: e.target.value })
                        }
                        placeholder="Father's full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mother's Name</Label>
                      <Input
                        value={formData.motherName}
                        onChange={(e) =>
                          setFormData({ ...formData, motherName: e.target.value })
                        }
                        placeholder="Mother's full name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Spouse's Name</Label>
                      <Input
                        value={formData.spouseName}
                        onChange={(e) =>
                          setFormData({ ...formData, spouseName: e.target.value })
                        }
                        placeholder="Spouse's full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>No. of Children</Label>
                      <Input
                        type="number"
                        value={formData.numberOfChildren}
                        onChange={(e) =>
                          setFormData({ ...formData, numberOfChildren: e.target.value })
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* EMERGENCY CONTACT */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#2957a1] border-b pb-2">
                    Person to Contact in Case of Emergency
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={formData.emergencyContactName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            emergencyContactName: e.target.value,
                          })
                        }
                        placeholder="Emergency contact name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Contact No.</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={formData.emergencyContactNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          setFormData({ ...formData, emergencyContactNumber: value });
                        }}
                        className={
                          formData.emergencyContactNumber.length > 11
                            ? "border-red-500 ring-red-500"
                            : ""
                        }
                        placeholder="09XX XXX XXXX"
                      />
                      {formData.emergencyContactNumber.length > 11 && (
                        <p className="text-xs text-red-500 mt-1">
                          Contact number must not exceed 11 digits.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input
                      value={formData.emergencyContactAddress}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergencyContactAddress: e.target.value,
                        })
                      }
                      placeholder="Emergency contact address"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveResident}
                  className="bg-[#2957a1] hover:bg-[#1e3f7a]"
                >
                  Save Resident
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* TABLE */}
        <Card className="border border-gray-300 shadow-sm">
          <CardContent className="p-4">
            <div className="p-4 flex justify-between items-center gap-4 border-b bg-gray-50 -m-4 mb-4">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-sm">Sort by:</Label>

                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="w-40 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residentNo">Resident No</SelectItem>
                    <SelectItem value="firstName">First Name</SelectItem>
                    <SelectItem value="lastName">Last Name</SelectItem>
                    <SelectItem value="residentType">Resident Type</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortDirection} onValueChange={(v) => setSortDirection(v as any)}>
                  <SelectTrigger className="w-28 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">A–Z</SelectItem>
                    <SelectItem value="desc">Z–A</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label className="font-semibold text-sm">Search:</Label>
                <div className="relative w-48">
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="pr-8 h-9"
                  />
                  <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>

            <Table>
              <TableHeader className="bg-[#2957a1]">
                <TableRow className="hover:bg-[#2957a1] border-b-0">
                  <TableHead className="text-white font-bold text-xs h-10">RESIDENT NO.</TableHead>
                  <TableHead className="text-white font-bold text-xs h-10">FIRST NAME</TableHead>
                  <TableHead className="text-white font-bold text-xs h-10">MIDDLE NAME</TableHead>
                  <TableHead className="text-white font-bold text-xs h-10">LAST NAME</TableHead>
                  <TableHead className="text-white font-bold text-xs h-10">RESIDENT TYPE</TableHead>
                  <TableHead className="text-white font-bold text-xs h-10">GENDER</TableHead>
                  <TableHead className="text-white font-bold text-xs h-10">VOTER STATUS</TableHead>
                  <TableHead className="text-white font-bold text-xs h-10">STATUS</TableHead>
                  <TableHead className="text-white font-bold text-xs h-10">ACTION</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredResidents.map((resident, index) => (
                  <TableRow
                    key={resident.residentNo}
                    className={`hover:bg-gray-50 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}
                  >
                    <TableCell className="font-medium text-xs py-3">{String(resident.residentNo).replace(/-/g, "")}</TableCell>
                    <TableCell className="text-xs py-3">{resident.firstName}</TableCell>
                    <TableCell className="text-xs py-3">{resident.middleName}</TableCell>
                    <TableCell className="text-xs py-3">{resident.lastName}</TableCell>
                    <TableCell className="text-xs py-3">{resident.residentType}</TableCell>
                    <TableCell className="text-xs py-3">{resident.gender}</TableCell>
                    <TableCell className="text-xs py-3">{resident.voterStatus}</TableCell>
                    <TableCell className="text-xs py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${resident.status === "Active"
                          ? "bg-green-100 text-green-700 border border-green-300"
                          : "bg-red-100 text-red-700 border border-red-300"
                          }`}
                      >
                        {resident.status}
                      </span>
                    </TableCell>

                    <TableCell className="py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setViewingResident(resident)}
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                        </Button>

                        {resident.status === "Active" ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] h-7 px-2">
                                DEACTIVATE
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Deactivate Account?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Mark {resident.firstName} {resident.lastName} as inactive?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleInactivate(resident.residentNo)}
                                  className="bg-orange-600"
                                >
                                  Deactivate
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleReactivate(resident.residentNo)}
                            className="bg-green-500 hover:bg-green-600 text-white text-[10px] h-7 px-2"
                          >
                            REACTIVATE
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* STEP 2: DATA PRIVACY DIALOG */}
        <AlertDialog open={showDataPrivacyDialog} onOpenChange={setShowDataPrivacyDialog}>
          <AlertDialogContent className="max-w-[400px]">
            <AlertDialogHeader>
              <AlertDialogTitle>Data Privacy Agreement</AlertDialogTitle>
              <AlertDialogDescription>
                Agree to process information for management purposes?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelDataPrivacy}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmPrivacy} className="bg-[#2957a1]">
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
                <DialogTitle className="text-lg font-bold text-gray-900">Set Account Password</DialogTitle>
              </div>
              <DialogDescription className="text-xs text-gray-500">
                Create and confirm the password for this resident account.
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
                  className={`h-10 border-gray-200 focus:ring-1 focus:ring-[#2957a1] ${confirmPassword && password !== confirmPassword ? "border-red-500 ring-red-500" : ""
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
              >
                Cancel
              </Button>
              <Button
                onClick={handleFinalSubmit}
                className="h-9 px-4 bg-[#2957a1] text-white text-xs font-bold rounded-md hover:bg-[#1e3f7a]"
              >
                Create Account & Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* VIEW RESIDENT DETAILS */}
        <Dialog open={!!viewingResident} onOpenChange={(open) => { if (!open) setViewingResident(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Resident Details</DialogTitle>
            </DialogHeader>

            {viewingResident && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  {viewingResident.profileImage && (
                    <img
                      src={viewingResident.profileImage}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1 space-y-2">
                    <p>
                      <strong>Name:</strong> {viewingResident.firstName} {viewingResident.middleName} {viewingResident.lastName}
                    </p>
                    <p>
                      <strong>Resident No:</strong> {formatId(viewingResident.residentNo)}
                    </p>
                    <p><strong>Age:</strong> {viewingResident.age}</p>
                    <p><strong>Gender:</strong> {viewingResident.gender}</p>
                    <p><strong>Contact:</strong> {viewingResident.contactNumber}</p>
                    <p><strong>Email:</strong> {viewingResident.email}</p>
                    <p>
                      <strong>Address:</strong> {viewingResident.houseNo} {viewingResident.streetAddress} {viewingResident.city}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setViewingResident(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </LocalizationProvider>
  );
}