import React, { useState, useEffect, useRef } from "react";
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
import { Search, Eye, EyeOff, Upload, User, Lock, Settings, X, FileText, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { validatePassword, validateResidentForm } from "../../utils/validation";
import { formatId } from "../../utils/formatId";
import OcrScanner from "../../OcrScanner";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import dayjs from "dayjs";
import { cn } from "../../utils/cn";
import { ProfileImageUpload } from "../ui/ProfileImageUpload";
import { api } from "../../utils/api";

// Helper: Get default cutoff date (30 days ago)
const getDefaultCutoffDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
};

interface ResidentRecordsProps {
  initialFilter?: 'all' | 'new';
  registrationCutoffDate?: string;
  onUpdateCutoffDate?: (date: string) => void;
  userRole?: 'admin' | 'official' | 'sk_kagawad';
}

type ResidentStatus = "Active" | "Inactive";

interface Resident {
  barangayCard: string;
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
  voterStatus: "Voter" | "Non-Voter";
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
  religion?: string | null;

}

const dataPrivacyHighlights = [
  "The information provided is true and correct to the best of your knowledge.",
  "The collected data will only be used for legitimate barangay management and record-keeping purposes.",
  "Authorized barangay personnel may access and process the information in accordance with applicable data privacy laws.",
  "Reasonable security measures will be applied to protect personal information from unauthorized access or disclosure.",
];

const RELIGION_OPTIONS = [
  { value: "Roman Catholic", label: "ROMAN CATHOLIC" },
  { value: "Islam", label: "ISLAM" },
  { value: "Iglesia ni Cristo", label: "IGLESIA NI CRISTO" },
  { value: "Aglipayan", label: "AGLIPAYAN (PHILIPPINE INDEPENDENT CHURCH)" },
  { value: "Seventh-day Adventist", label: "SEVENTH-DAY ADVENTIST" },
  { value: "Bible Baptist Church", label: "BIBLE BAPTIST CHURCH" },
  { value: "United Church of Christ", label: "UNITED CHURCH OF CHRIST" },
  { value: "Jehovah's Witnesses", label: "JEHOVAH'S WITNESSES" },
  { value: "The Church of Jesus Christ", label: "THE CHURCH OF JESUS CHRIST (LDS)" },
  { value: "Born Again Christian", label: "BORN AGAIN CHRISTIAN" },
  { value: "Dating Daan", label: "DATING DAAN (MCGI)" },
  { value: "Buddhism", label: "BUDDHISM" },
  { value: "Hinduism", label: "HINDUISM" },
  { value: "None", label: "NONE / NO RELIGION" },
  { value: "Other", label: "OTHER" },
];

type ResidentRow = {
  ResidentID: string;
  BarangayCard?: string;
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
  Religion?: string | null;
  religion?: string | null;
};

const API_BASE = "http://localhost:5001";

const normalizeVoterStatus = (value: unknown): "Voter" | "Non-Voter" => {
  if (value === true) return "Voter";
  if (value === false || value == null) return "Non-Voter";
  if (typeof value === "number") return value === 1 ? "Voter" : "Non-Voter";

  const normalized = String(value).trim().toLowerCase();
  if (
    normalized === "true" ||
    normalized === "1" ||
    normalized === "yes" ||
    normalized === "voter" ||
    normalized === "registered"
  ) {
    return "Voter";
  }

  return "Non-Voter";
};

function mapRowToResident(r: ResidentRow): Resident {
  return {
    id: r.ResidentID,
    residentNo: r.ResidentID,
    barangayCard: r.BarangayCard ?? "",
    profileImage: (r as any).ProfileImage
      ? (r as any).ProfileImage.startsWith('data:')
        ? (r as any).ProfileImage
        : `http://localhost:5001${(r as any).ProfileImage}`
      : undefined,
    firstName: r.FirstName ?? "",
    middleName: r.MiddleName ?? "",
    lastName: r.LastName ?? "",
    age: Number(r.Age ?? 0),
    birthday: (r.Birthday as any) ?? "",
    gender: (r.Gender as any) ?? "Male",
    civilStatus: r.CivilStatus ?? "",
    residentType: r.ResidentType ?? "",
    voterStatus: normalizeVoterStatus(r.VoterStatus),
    houseNo: r.HouseNumber ?? "",
    streetAddress: r.StreetAddress ?? "",
    city: ((r as any).City ?? (r as any).city ?? "Manila City") as string,
    postalCode: ((r as any).ZipCode ?? (r as any).zipcode ?? (r as any).PostalCode ?? "1013") as string,
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
    religion: (r as any).Religion ?? (r as any).religion ?? null,
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

const toUppercaseInput = (value: string) => value.toUpperCase();

const parseOcrField = (text: string, labels: string[]) => {
  for (const label of labels) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const inlineMatch = text.match(
      new RegExp(`${escapedLabel}\\s*[:\\-]?\\s*([A-Z][A-Z\\s,'.-]{1,60})`, "i")
    );
    if (inlineMatch?.[1]) {
      return inlineMatch[1].trim();
    }

    const nextLineMatch = text.match(
      new RegExp(`${escapedLabel}\\s*[:\\-]?\\s*\\n\\s*([A-Z][A-Z\\s,'.-]{1,60})`, "i")
    );
    if (nextLineMatch?.[1]) {
      return nextLineMatch[1].trim();
    }
  }

  return "";
};

const parseOcrDate = (text: string) => {
  const match = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (!match) return "";

  const month = match[1].padStart(2, "0");
  const day = match[2].padStart(2, "0");
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${year}-${month}-${day}`;
};

const getMeaningfulOcrLines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim().toUpperCase())
    .filter(
      (line) =>
        line.length >= 3 &&
        !/^[0-9\s\-\/]+$/.test(line) &&
      !["REPUBLIC OF THE PHILIPPINES", "LAND TRANSPORTATION OFFICE", "DRIVER LICENSE", "DRIVER'S LICENSE", "PHILIPPINE IDENTIFICATION CARD"].includes(line)
    );

const looksLikePersonNameLine = (line: string) =>
  /^[A-Z][A-Z\s,'.-]{2,}$/.test(line) &&
  !line.includes("ADDRESS") &&
  !line.includes("NATIONALITY") &&
  !line.includes("SEX") &&
  !line.includes("BIRTH") &&
  !line.includes("HEIGHT") &&
  !line.includes("WEIGHT") &&
  !line.includes("EYES") &&
  !line.includes("LICENSE");

const normalizeOcrValue = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .replace(/\bPHL\b/g, "")
    .replace(/\bNONE\b/g, "")
    .replace(/\bNON[-\s]?PROFESSIONAL\b/g, "")
    .replace(/\bUNIT\/HOUSE NO\.?\b/g, "")
    .replace(/\bHOUSE NO\.?\b/g, "")
    .replace(/\bBUILDING\b/g, "")
    .replace(/\bSTREET NAME\b/g, "")
    .replace(/\bBARANGAY\b/g, "BRGY")
    .replace(/\bCITY\/MUNICIPALITY\b/g, "")
    .replace(/\bDISTRICT\b/g, "")
    .replace(/^\.*N\b[.\s,-]*/g, "")
    .replace(/^[,.\-:\s]+|[,.\-:\s]+$/g, "")
    .trim();

const sanitizeNameField = (value: string) =>
  normalizeOcrValue(value)
    .replace(/[^A-Z\s.'-]/g, " ")
    .replace(/\b(?:LTO|LTFRB|DL|LICENSE|PHILIPPINES|REPUBLIC|TRANSPORTATION|OFFICE)\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

const sanitizeAddressField = (value: string) =>
  normalizeOcrValue(value)
    .replace(/[^A-Z0-9#/\-.,\s]/g, " ")
    .replace(/\b(?:REPUBLIC|PHILIPPINES|TRANSPORTATION|OFFICE|LICENSE|DL)\b/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,.\-:\s]+|[,.\-:\s]+$/g, "")
    .trim();

const sanitizeHouseNoField = (value: string) =>
  (normalizeOcrValue(value).match(/\d+/)?.[0] || "").trim();

const sanitizeStreetAddressField = (value: string) =>
  sanitizeAddressField(value)
    .replace(/\d+/g, " ")
    .replace(/\b(?:BRGY\.?\s*\d+|BARANGAY\s*\d+)\b/gi, "")
    .replace(/\s*,\s*,+/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,.\-:\s]+|[,.\-:\s]+$/g, "")
    .trim();

const splitLicenseAddress = (rawAddress: string) => {
  const cleaned = sanitizeAddressField(rawAddress)
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!cleaned) {
    return { houseNo: "", streetAddress: "" };
  }

  const addressBeforeCity =
    cleaned.split(
      /\s*,\s*(?:BRGY\.?\s*\d+|BARANGAY\s*\d+|BARANGAY|DISTRICT(?:\s*\d+)?|CITY|MUNICIPALITY|MANILA(?:\s+CITY)?|METRO\s+MANILA|NCR|\d{4,})\b/i
    )[0] || cleaned;
  const houseNoMatch = addressBeforeCity.match(/^\s*(\d+)\s*[,\-]?\s*(.*)$/);

  if (!houseNoMatch) {
    return {
      houseNo: "",
      streetAddress: sanitizeStreetAddressField(addressBeforeCity)
        .replace(/^\s*\d+\s*[,\-]?\s*/, "")
        .trim(),
    };
  }

  return {
    houseNo: sanitizeHouseNoField(houseNoMatch[1]),
    streetAddress: sanitizeStreetAddressField(houseNoMatch[2])
      .replace(/^\s*\d+\s*[,\-]?\s*/, "")
      .replace(/\s*,\s*(?:BRGY\.?\s*\d+|BARANGAY\s*\d+|BARANGAY|DISTRICT(?:\s*\d+)?|MANILA(?:\s+CITY)?|METRO\s+MANILA|NCR)\b.*$/i, "")
      .replace(/\s{2,}/g, " ")
      .replace(/^[,.\-:\s]+|[,.\-:\s]+$/g, ""),
  };
};

const normalizeDetectedNameParts = (firstName: string, middleName: string) => {
  const cleanedFirstName = sanitizeNameField(firstName);
  const cleanedMiddleName = sanitizeNameField(middleName);

  if (cleanedMiddleName) {
    return {
      firstName: cleanedFirstName,
      middleName: cleanedMiddleName,
    };
  }

  const words = cleanedFirstName.split(/\s+/).filter(Boolean);
  if (words.length >= 3) {
      return {
      firstName: sanitizeNameField(words.slice(0, -1).join(" ")),
      middleName: sanitizeNameField(words[words.length - 1]),
    };
  }

  return {
    firstName: cleanedFirstName,
    middleName: cleanedMiddleName,
  };
};

const parsePhilippineDriversLicense = (text: string) => {
  const normalizedText = text.toUpperCase();
  const lines = getMeaningfulOcrLines(normalizedText);
  const result: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    houseNo?: string;
    streetAddress?: string;
    gender?: "Male" | "Female";
    birthday?: string;
  } = {};

  const skipNameFragments = [
    "REPUBLIC OF THE PHILIPPINES",
    "DEPARTMENT OF TRANSPORTATION",
    "LAND TRANSPORTATION OFFICE",
    "NON-PROFESSIONAL DRIVER",
    "PROFESSIONAL DRIVER",
    "PHILIPPINE DRIVER",
    "DRIVER'S LICENSE",
    "DRIVER LICENSE",
    "LAST NAME",
    "FIRST NAME",
    "MIDDLE NAME",
    "NATIONALITY",
    "ADDRESS",
    "LICENSE NO",
    "EXPIRATION",
    "AGENCY CODE",
    "BLOOD TYPE",
    "EYES COLOR",
    "RESTRICTIONS",
    "CONDITIONS",
    "SIGNATURE",
  ];

  const fullNameLine =
    lines.find((line) => {
      if (!line.includes(",")) {
        return false;
      }

      if (skipNameFragments.some((fragment) => line.includes(fragment))) {
        return false;
      }

      return /[A-Z]{2,},\s*[A-Z]{2,}/.test(line);
    }) || "";

  if (fullNameLine) {
    const nameParts = fullNameLine.split(",").map((part) => sanitizeNameField(part));
    if (nameParts[0]) result.lastName = nameParts[0];
    if (nameParts[1]) {
      const givenNameWords = nameParts[1].split(/\s+/).filter(Boolean);
      if (nameParts[2]) {
        result.firstName = nameParts[1];
      } else if (givenNameWords.length >= 3) {
        result.firstName = normalizeOcrValue(givenNameWords.slice(0, -1).join(" "));
        result.middleName = sanitizeNameField(givenNameWords[givenNameWords.length - 1]);
      } else {
        result.firstName = nameParts[1];
      }
    }
    if (nameParts[2]) {
      result.middleName = nameParts[2];
    }
  }

  if (!result.firstName || !result.lastName) {
    const fallbackNameLine = lines.find((line) => {
      if (skipNameFragments.some((fragment) => line.includes(fragment))) {
        return false;
      }

      const words = line.split(/\s+/).filter(Boolean);
      return words.length >= 2 && words.length <= 6 && words.every((word) => /^[A-Z.'-]{2,}$/.test(word));
    });

    if (fallbackNameLine) {
      const fallbackWords = fallbackNameLine.split(/\s+/);
      if (!result.lastName) {
        result.lastName = sanitizeNameField(fallbackWords[0] || "");
      }
      if (!result.firstName) {
        result.firstName = sanitizeNameField(fallbackWords.slice(1).join(" "));
      }
    }
  }

  const birthDateMatch =
    normalizedText.match(/\b(\d{4})[\/\-](\d{2})[\/\-](\d{2})\b/) ||
    normalizedText.match(/\b(\d{2})[\/\-](\d{2})[\/\-](\d{4})\b/);
  if (birthDateMatch) {
    if (birthDateMatch[1].length === 4) {
      result.birthday = `${birthDateMatch[1]}-${birthDateMatch[2]}-${birthDateMatch[3]}`;
    } else {
      result.birthday = `${birthDateMatch[3]}-${birthDateMatch[1]}-${birthDateMatch[2]}`;
    }
  }

  if (/\bSEX\b[\s:]*F\b|\bFEMALE\b/.test(normalizedText)) {
    result.gender = "Female";
  } else if (/\bSEX\b[\s:]*M\b|\bMALE\b/.test(normalizedText)) {
    result.gender = "Male";
  }

  const addressLabelIndex = lines.findIndex(
    (line) => line.includes("ADDRESS") || line.includes("UNIT/HOUSE") || line.includes("BARANGAY")
  );
  if (addressLabelIndex >= 0) {
    const addressParts = [];
    const startsOnSameLine = lines[addressLabelIndex].includes("ADDRESS")
      ? normalizeOcrValue(lines[addressLabelIndex].replace(/^.*ADDRESS\s*[:\-]?\s*/, ""))
      : "";

    if (startsOnSameLine && startsOnSameLine !== lines[addressLabelIndex]) {
      addressParts.push(startsOnSameLine);
    }

    for (let i = addressLabelIndex + 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (
        line.includes("LICENSE NO") ||
        line.includes("EXPIRATION") ||
        line.includes("AGENCY CODE") ||
        line.includes("BLOOD TYPE") ||
        line.includes("EYES COLOR") ||
        line.includes("RESTRICTIONS") ||
        line.includes("CONDITIONS")
      ) {
        break;
      }
      if (line.length > 3) {
        addressParts.push(line);
      }
    }
    if (addressParts.length > 0) {
      const parsedAddress = splitLicenseAddress(addressParts.join(" "));
      if (parsedAddress.houseNo) {
        result.houseNo = parsedAddress.houseNo;
      }
      if (parsedAddress.streetAddress) {
        result.streetAddress = parsedAddress.streetAddress;
      }
    }
  }

  return result;
};

export function ResidentRecords({
  initialFilter = 'all',
  registrationCutoffDate = getDefaultCutoffDate(),
  onUpdateCutoffDate,
  userRole = 'admin',
}: ResidentRecordsProps) {
  // Dual-check: prop takes priority, but also verify via localStorage as a safety net
  const isSkKagawad = userRole === 'sk_kagawad' || (() => {
    try {
      const appUser = JSON.parse(localStorage.getItem('app_user') || '{}');
      return appUser?.role === 'sk_kagawad';
    } catch { return false; }
  })();

  const initialFormData = {
    profileImage: "",
    firstName: "",
    middleName: "",
    lastName: "",
    age: "",
    birthday: "",
    gender: "Male" as "Male" | "Female",
    civilStatus: "Single",
    religion: "",
    residentType: "",
    voterStatus: "Non-Voter" as "Voter" | "Non-Voter",
    houseNo: "",
    streetAddress: "",
    city: "MANILA CITY",
    postalCode: "1013",
    country: "PHILIPPINES",
    contactNumber: "",
    email: "",
    fatherName: "",
    motherName: "",
    spouseName: "",
    numberOfChildren: "",
    emergencyContactName: "",
    emergencyContactNumber: "",
    emergencyContactAddress: "",
  };

  const [residents, setResidents] = useState<Resident[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [viewingResident, setViewingResident] = useState<Resident | null>(null);
  const [isResidentDetailsOpen, setIsResidentDetailsOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [showDataPrivacyDialog, setShowDataPrivacyDialog] = useState(false);
  const [residentPrivacyAccepted, setResidentPrivacyAccepted] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pendingResident, setPendingResident] = useState<Resident | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>("");
  const [saveAttempted, setSaveAttempted] = useState(false);

  type SortField =
    | "residentNo"
    | "firstName"
    | "lastName"
    | "residentType"
    | "status"
    | "dateRegistered";
  type SortDirection = "asc" | "desc";

  const [sortBy, setSortBy] = useState<SortField>("residentNo");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleColumnSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDirection("asc");
    }
  };


  const [activeFilter, setActiveFilter] = useState<'all' | 'new'>(initialFilter);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [tempCutoffDate, setTempCutoffDate] = useState(registrationCutoffDate);
  const [showDiscardResidentDialog, setShowDiscardResidentDialog] = useState(false);
  const [showScannerInfoDialog, setShowScannerInfoDialog] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailAlreadyExists, setEmailAlreadyExists] = useState(false);
  const [isCheckingContactNumber, setIsCheckingContactNumber] = useState(false);
  const [contactNumberAlreadyExists, setContactNumberAlreadyExists] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formData, setFormData] = useState(initialFormData);

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
  const contactError =
    saveAttempted &&
    (invalidContact(formData.contactNumber) || contactNumberAlreadyExists);
  const emailError =
    saveAttempted && (invalidEmail(formData.email) || emailAlreadyExists);
  // Address & Contact required fields
  const houseNoError = saveAttempted && isBlank(formData.houseNo);
  const streetAddressError = saveAttempted && isBlank(formData.streetAddress);
  // Emergency contact required fields
  const emergencyNameError = saveAttempted && isBlank(formData.emergencyContactName);
  const emergencyNumberError = saveAttempted && invalidContact(formData.emergencyContactNumber);
  const emergencyAddressError = saveAttempted && isBlank(formData.emergencyContactAddress);

  // ADDED FEATURE: SETTINGS HANDLER
  const handleSaveSettings = () => {
    onUpdateCutoffDate?.(tempCutoffDate);
    setShowSettingsDialog(false);
    toast.success("Settings updated");
  };

  // Reset to page 1 when search/sort/filter changes
  useEffect(() => { setCurrentPage(1); }, [searchTerm, sortBy, sortDirection, activeFilter]);

  const hasUnsavedResidentForm =
    JSON.stringify(formData) !== JSON.stringify(initialFormData) ||
    !!profileImagePreview ||
    !!password ||
    !!confirmPassword;

  const handleAddDialogOpenChange = (open: boolean) => {
    if (open) {
      setShowDiscardResidentDialog(false);
      setIsAddDialogOpen(true);
      return;
    }

    if (showDataPrivacyDialog || showPasswordDialog) {
      setIsAddDialogOpen(true);
      return;
    }

    if (hasUnsavedResidentForm) {
      setShowDiscardResidentDialog(true);
      return;
    }

    resetForm();
    setIsAddDialogOpen(false);
  };

  const handleConfirmDiscardResident = () => {
    setShowDiscardResidentDialog(false);
    resetForm();
    setIsAddDialogOpen(false);
  };

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

  useEffect(() => {
    const trimmedEmail = formData.email.trim().toLowerCase();

    if (!trimmedEmail || !gmailRegex.test(trimmedEmail)) {
      setEmailAlreadyExists(false);
      setIsCheckingEmail(false);
      return;
    }

    let cancelled = false;
    const localDuplicate = residents.some(
      (resident) =>
        resident.email?.trim().toLowerCase() === trimmedEmail &&
        resident.residentNo !== editingResident?.residentNo
    );

    if (localDuplicate) {
      setEmailAlreadyExists(true);
      setIsCheckingEmail(false);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setIsCheckingEmail(true);
        const response = await fetch(
          `${API_BASE}/residents/check-email/${encodeURIComponent(trimmedEmail)}`
        );
        const data = await response.json();

        if (!cancelled) {
          setEmailAlreadyExists(Boolean(data?.exists));
        }
      } catch (err) {
        if (!cancelled) {
          setEmailAlreadyExists(false);
        }
        console.error(err);
      } finally {
        if (!cancelled) {
          setIsCheckingEmail(false);
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [editingResident?.residentNo, formData.email, residents]);

  useEffect(() => {
    const trimmedContactNumber = formData.contactNumber.trim();

    if (!trimmedContactNumber || trimmedContactNumber.length !== 11) {
      setContactNumberAlreadyExists(false);
      setIsCheckingContactNumber(false);
      return;
    }

    let cancelled = false;
    const localDuplicate = residents.some(
      (resident) =>
        resident.contactNumber?.trim() === trimmedContactNumber &&
        resident.residentNo !== editingResident?.residentNo
    );

    if (localDuplicate) {
      setContactNumberAlreadyExists(true);
      setIsCheckingContactNumber(false);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setIsCheckingContactNumber(true);
        const response = await fetch(
          `${API_BASE}/residents/check-contact/${encodeURIComponent(trimmedContactNumber)}`
        );
        const data = await response.json();

        if (!cancelled) {
          setContactNumberAlreadyExists(Boolean(data?.exists));
        }
      } catch (err) {
        if (!cancelled) {
          setContactNumberAlreadyExists(false);
        }
        console.error(err);
      } finally {
        if (!cancelled) {
          setIsCheckingContactNumber(false);
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [editingResident?.residentNo, formData.contactNumber, residents]);

  // Sync activeFilter with initialFilter prop changes
  useEffect(() => {
    setActiveFilter(initialFilter);
  }, [initialFilter]);

  const resetForm = () => {
    setFormData(initialFormData);
    setProfileImagePreview("");
    setPassword("");
    setConfirmPassword("");
    setEditingResident(null);
    setResidentPrivacyAccepted(false);
    setSaveAttempted(false);
    setIsCheckingContactNumber(false);
    setContactNumberAlreadyExists(false);
    setIsCheckingEmail(false);
    setEmailAlreadyExists(false);
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

    const errors = validateResidentForm(formData);
    if (
      Object.keys(errors).length > 0 ||
      contactNumberAlreadyExists ||
      emailAlreadyExists
    ) {
      toast.error(errors.contactNumber || errors.email || Object.values(errors)[0] || "Please fill in all required fields correctly.");
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
      religion: formData.religion || undefined,
      residentType: formData.residentType || "Resident",
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
      barangayCard: ""
    };

    setPendingResident(newResident);
    setIsAddDialogOpen(false);
    setShowDataPrivacyDialog(true);
  };

  const openResidentEdit = (resident: Resident) => {
    setEditingResident(resident);
    setFormData({
      profileImage: resident.profileImage || "",
      firstName: resident.firstName || "",
      middleName: resident.middleName || "",
      lastName: resident.lastName || "",
      age: String(resident.age || ""),
      birthday: resident.birthday || "",
      gender: resident.gender || "Male",
      civilStatus: resident.civilStatus || "Single",
      religion: resident.religion || "",
      residentType: resident.residentType || "",
      voterStatus: resident.voterStatus || "Non-Voter",
      houseNo: resident.houseNo || "",
      streetAddress: resident.streetAddress || "",
      city: resident.city || "MANILA CITY",
      postalCode: resident.postalCode || "1013",
      country: resident.country || "PHILIPPINES",
      contactNumber: resident.contactNumber || "",
      email: resident.email || "",
      fatherName: resident.fatherName || "",
      motherName: resident.motherName || "",
      spouseName: resident.spouseName || "",
      numberOfChildren: resident.numberOfChildren ? String(resident.numberOfChildren) : "",
      emergencyContactName: resident.emergencyContactName || "",
      emergencyContactNumber: resident.emergencyContactNumber || "",
      emergencyContactAddress: resident.emergencyContactAddress || "",
    });
    setProfileImagePreview(resident.profileImage || "");
    setSaveAttempted(false);
    setEmailAlreadyExists(false);
    setContactNumberAlreadyExists(false);
    setIsAddDialogOpen(true);
  };

  const handleConfirmPrivacy = () => {
    if (!residentPrivacyAccepted) {
      toast.error("Please confirm the data privacy agreement before continuing.");
      return;
    }
    setShowDataPrivacyDialog(false);
    setShowPasswordDialog(true);
  };

  const handleFinalSubmit = async () => {
    const passwordErrors = validatePassword(password, confirmPassword);
    if (Object.keys(passwordErrors).length > 0) {
      toast.error(Object.values(passwordErrors)[0]);
      return;
    }
    if (!pendingResident) return;

    try {
      const nextNo = `RS${new Date().getFullYear()}${String(
        Math.floor(Math.random() * 9999)
      ).padStart(4, "0")}`;

      const response = await api.post("/residents/register", {
          residentNo: nextNo,
          profileImage: pendingResident.profileImage,
          firstName: pendingResident.firstName,
          middleName: pendingResident.middleName,
          lastName: pendingResident.lastName,
          age: pendingResident.age,
          birthday: pendingResident.birthday,
          gender: pendingResident.gender,
          civilStatus: pendingResident.civilStatus,
          religion: pendingResident.religion,
          residentType: pendingResident.residentType,
          voterStatus: pendingResident.voterStatus,
          houseNo: pendingResident.houseNo,
          streetAddress: pendingResident.streetAddress,
          city: pendingResident.city,
          zipCode: pendingResident.postalCode,
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
      });
      const data = response.data;

      if (response.status >= 200 && response.status < 300) {
        toast.success("Resident and Account successfully saved!");
        await loadResidents();
        setShowPasswordDialog(false);
        setPendingResident(null);
        resetForm();
      } else {
        if (response.status === 409) {
          const message = String(data?.error || "").toLowerCase();
          if (message.includes("email")) {
            setEmailAlreadyExists(true);
          }
          if (message.includes("contact")) {
            setContactNumberAlreadyExists(true);
          }
        }
        toast.error(data?.error || "Database failed to save record.");
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      if (status === 409) {
        const message = String(data?.error || "").toLowerCase();
        if (message.includes("email")) {
          setEmailAlreadyExists(true);
        }
        if (message.includes("contact")) {
          setContactNumberAlreadyExists(true);
        }
      }
      toast.error(data?.error || "Could not reach backend server.");
      console.error(err);
    }
  };

  const handleUpdateResident = async () => {
    if (!editingResident) return;

    setSaveAttempted(true);

    if (
      isBlank(formData.firstName) ||
      isBlank(formData.lastName) ||
      isBlank(formData.birthday) ||
      invalidContact(formData.contactNumber) ||
      contactNumberAlreadyExists ||
      invalidEmail(formData.email) ||
      emailAlreadyExists
    ) {
      toast.error("Please fill in all required fields correctly.");
      return;
    }

    try {
      const response = await api.put(`/residents/${editingResident.residentNo}`, {
          profileImage: formData.profileImage,
          firstName: formData.firstName,
          middleName: formData.middleName,
          lastName: formData.lastName,
          age: formData.age,
          birthday: formData.birthday,
          gender: formData.gender,
          civilStatus: formData.civilStatus,
          religion: formData.religion,
          residentType: formData.residentType || "Resident",
          voterStatus: formData.voterStatus,
          houseNo: formData.houseNo,
          streetAddress: formData.streetAddress,
          city: formData.city,
          zipCode: formData.postalCode,
          contactNumber: formData.contactNumber,
          email: formData.email,
          fatherName: formData.fatherName,
          motherName: formData.motherName,
          spouseName: formData.spouseName,
          numberOfChildren: formData.numberOfChildren,
          emergencyContactName: formData.emergencyContactName,
          emergencyContactNumber: formData.emergencyContactNumber,
          emergencyContactAddress: formData.emergencyContactAddress,
      });
      const data = response.data;

      if (response.status < 200 || response.status >= 300) {
        if (response.status === 409) {
          const message = String(data?.error || "").toLowerCase();
          if (message.includes("email")) setEmailAlreadyExists(true);
          if (message.includes("contact")) setContactNumberAlreadyExists(true);
        }
        toast.error(data?.error || "Failed to update resident.");
        return;
      }

      toast.success("Resident information updated successfully.");
      setIsAddDialogOpen(false);
      setIsResidentDetailsOpen(false);
      setViewingResident(null);
      setEditingResident(null);
      resetForm();
      await loadResidents();
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      if (status === 409) {
        const message = String(data?.error || "").toLowerCase();
        if (message.includes("email")) setEmailAlreadyExists(true);
        if (message.includes("contact")) setContactNumberAlreadyExists(true);
      }
      toast.error(data?.error || "Could not reach backend server.");
      console.error(err);
    }
  };

  const handleCancelDataPrivacy = () => {
    setShowDataPrivacyDialog(false);
    setResidentPrivacyAccepted(false);
    setShowDiscardResidentDialog(false);
    setIsAddDialogOpen(true);
  };

  const handleInactivate = async (id: string) => {
    try {
      const response = await api.patch(`/residents/${id}/status`, { status: "Inactive" });
      const data = response.data;

      if (response.status >= 200 && response.status < 300) {
        await loadResidents();
        toast.success("Record updated to Inactive");
      } else {
        toast.error(data?.error || "Update failed.");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Update failed.");
      console.error(err);
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      const response = await api.patch(`/residents/${id}/status`, { status: "Active" });
      const data = response.data;

      if (response.status >= 200 && response.status < 300) {
        await loadResidents();
        toast.success("Record reactivated");
      } else {
        toast.error(data?.error || "Reactivation failed.");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Reactivation failed.");
      console.error(err);
    }
  };

  const filteredResidents = residents
    .filter((resident) => {
      const normalizedSearchTerm = searchTerm.trim().toLowerCase();
      const normalizedVoterSearchTerm = normalizedSearchTerm.replace(/[\s-]/g, "");
      const matchesVoterStatus =
        normalizedVoterSearchTerm === "voter"
          ? resident.voterStatus === "Voter"
          : normalizedVoterSearchTerm === "nonvoter"
            ? resident.voterStatus === "Non-Voter"
            : false;

      const matchesSearch =
        resident.firstName.toLowerCase().includes(normalizedSearchTerm) ||
        resident.lastName.toLowerCase().includes(normalizedSearchTerm) ||
        resident.residentNo.toLowerCase().includes(normalizedSearchTerm) ||
        (resident.residentType && resident.residentType.toLowerCase().includes(normalizedSearchTerm)) ||
        matchesVoterStatus;

      // ADDED LOGIC: FILTER BY DATE CUTOFF
      if (activeFilter === 'new') {
        return (
          matchesSearch &&
          new Date(resident.dateRegistered) > new Date(registrationCutoffDate));
      }
      return matchesSearch;
    })
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
        case "dateRegistered":
          comparison =
            new Date(a.dateRegistered).getTime() -
            new Date(b.dateRegistered).getTime();
          break;
        default:
          comparison = a.residentNo.localeCompare(b.residentNo);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

  const totalPages = Math.max(1, Math.ceil(filteredResidents.length / pageSize));
  const paginatedResidents = filteredResidents.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = filteredResidents.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredResidents.length);

  const handleOcrData = (extractedText: string) => {
    const text = extractedText.toUpperCase();
    const lines = getMeaningfulOcrLines(text);
    const licenseData = parsePhilippineDriversLicense(text);
    const firstName =
      licenseData.firstName ||
      parseOcrField(text, ["FIRST NAME", "GIVEN NAME"]) ||
      lines.find((line) => looksLikePersonNameLine(line) && line.split(" ").length >= 2)?.split(" ").slice(1).join(" ") ||
      "";
    const middleName =
      licenseData.middleName ||
      parseOcrField(text, ["MIDDLE NAME", "MIDDLE INITIAL"]) ||
      "";
    const lastName =
      licenseData.lastName ||
      parseOcrField(text, ["LAST NAME", "SURNAME"]) ||
      lines.find((line) => looksLikePersonNameLine(line) && line.split(" ").length >= 2)?.split(" ")[0] ||
      "";
    const houseNo = licenseData.houseNo || "";
    const streetAddress =
      licenseData.streetAddress ||
      parseOcrField(text, ["ADDRESS"]);
    const genderRaw = licenseData.gender || parseOcrField(text, ["SEX", "GENDER"]);
    const birthday = licenseData.birthday || parseOcrDate(text);
    const normalizedNames = normalizeDetectedNameParts(firstName, middleName);
    const normalizedHouseNo = sanitizeHouseNoField(houseNo);
    const normalizedStreetAddress = sanitizeStreetAddressField(streetAddress);

    setFormData((prev) => ({
      ...prev,
      firstName: normalizedNames.firstName || prev.firstName,
      middleName: normalizedNames.middleName || prev.middleName,
      lastName: sanitizeNameField(lastName) || prev.lastName,
      houseNo: normalizedHouseNo || prev.houseNo,
      streetAddress: normalizedStreetAddress || prev.streetAddress,
      gender:
        genderRaw === "Female" || genderRaw.includes("FEMALE")
          ? "Female"
          : genderRaw === "Male" || genderRaw.includes("MALE")
          ? "Male"
          : prev.gender,
      birthday: birthday || prev.birthday,
      age: birthday ? calculateAge(birthday) : prev.age,
    }));
    toast.success("ID text detected. Review the autofilled fields.");
  };

  const handleGenerateList = () => {
    // Define the headers for the CSV file
    const headers = [
      "Resident No", "First Name", "Middle Name", "Last Name",
      "Resident Type", "Age", "Gender", "Voter Status", "Status", "Date Registered"
    ];

    // Map the currently filtered residents into rows
    const rows = filteredResidents.map(r => [
      r.residentNo,
      r.firstName,
      r.middleName,
      r.lastName,
      r.residentType,
      r.age,
      r.gender,
      r.voterStatus,
      r.status,
      r.dateRegistered
    ]);

    // Combine headers and rows, formatting as CSV
    const csvContent = [
      headers.join(","),
      // Wrap cells in quotes to prevent commas inside names/text from breaking columns
      ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(","))
    ].join("\n");

    // Create a downloadable file and trigger the download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Resident_Records_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Resident list downloaded successfully!");
  };


  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 bg-gray-50 min-h-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              Resident Records ({residents.filter((r) => r.status === "Active").length})
            </h1>
            {activeFilter === 'new' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                <span>New Since: {format(new Date(registrationCutoffDate), "MM/dd/yyyy")}</span>
                <button
                  onClick={() => setActiveFilter('all')}
                  className="hover:bg-green-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          <p className="text-gray-600 mt-1">
            {activeFilter === 'new'
              ? `Showing residents registered after ${format(new Date(registrationCutoffDate), "MM/dd/yyyy")}`
              : 'Manage all registered residents'
            }
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={handleGenerateList}
            className="flex items-center gap-2 border-[#2957a1] text-[#2957a1] hover:bg-blue-50"
          >
            <FileText className="w-4 h-4" />
            <span>Generate List</span>
          </Button>

          {/* Settings Button */}
          <Button
            variant="outline"
            onClick={() => {
              setTempCutoffDate(registrationCutoffDate);
              setShowSettingsDialog(true);
            }}
            className="flex items-center gap-2 border-gray-300"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </Button>

          {/* Add New Resident Dialog — hidden for SK Kagawad (view-only role) */}
          {!isSkKagawad && (
          <Dialog
            open={isAddDialogOpen}
            onOpenChange={handleAddDialogOpenChange}
          >
            <DialogTrigger asChild>
              <Button className="bg-[#2957a1] hover:bg-[#1e3f7a] text-white">
                ADD NEW RESIDENT
              </Button>
            </DialogTrigger>

            <DialogContent
              className="w-[95vw] sm:max-w-[700px] md:max-w-[850px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto"
              onInteractOutside={(event) => {
                event.preventDefault();
                handleAddDialogOpenChange(false);
              }}
              onEscapeKeyDown={(event) => {
                event.preventDefault();
                handleAddDialogOpenChange(false);
              }}
            >
              <DialogHeader className="-mx-6 -mt-6 border-b bg-gray-50 px-6 py-4 rounded-t-[inherit]">
                <DialogTitle className="text-xl">
                  {editingResident ? "Edit Resident Information" : "Add New Resident"}
                </DialogTitle>
                <DialogDescription>
                  {editingResident
                    ? "Update the resident's information and save the changes to the system."
                    : "Fill in the resident's information to register them in the system."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="flex flex-col items-center gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <OcrScanner onDataExtracted={handleOcrData} />
                    <button
                      type="button"
                      onClick={() => setShowScannerInfoDialog(true)}
                      className="w-6 h-6 rounded-full border-2 border-[#2957a1] text-[#2957a1] text-xs font-bold flex items-center justify-center hover:bg-blue-50 transition-colors flex-shrink-0"
                      title="What's Camera Scanner?"
                    >
                      ?
                    </button>
                  </div>
                </div>
              </div>

              <Dialog
                open={showScannerInfoDialog}
                onOpenChange={setShowScannerInfoDialog}
              >
                <DialogContent className="w-[95vw] max-w-xl">
                  <DialogHeader>
                    <DialogTitle>What's Camera Scanner?</DialogTitle>
                    <DialogDescription>
                      The scanner automatically looks for a valid resident ID and
                      extracts readable details from it to help fill out the form
                      faster.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-3 text-sm text-gray-700">
                    <p>Common government IDs in the Philippines include:</p>
                    <ul className="list-disc space-y-1 pl-5">
                      <li>PhilSys National ID</li>
                      <li>UMID</li>
                      <li>Driver's License</li>
                      <li>Passport</li>
                      <li>Postal ID</li>
                    </ul>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="flex justify-center">
                <ProfileImageUpload
                  onImageReady={(imageUrl, previewUrl) => {
                    setFormData({ ...formData, profileImage: imageUrl });
                    setProfileImagePreview(previewUrl);
                  }}
                  currentImage={profileImagePreview || undefined}
                  size="lg"
                />
              </div>

              {/* PERSONAL INFO */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#2957a1] border-b pb-2">
                  Personal Information
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>First Name *</Label>
                    <Input
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          firstName: toUppercaseInput(e.target.value),
                        })
                      }
                      placeholder="Enter first name"
                      className={
                        firstNameError ? "border-red-500 ring-red-500" : ""
                      }
                    />
                    {firstNameError && (
                      <p className="text-xs text-red-500 mt-1">
                        First name is required.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Middle Name</Label>
                    <Input
                      value={formData.middleName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          middleName: toUppercaseInput(e.target.value),
                        })
                      }
                      placeholder="Enter middle name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Last Name *</Label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          lastName: toUppercaseInput(e.target.value),
                        })
                      }
                      placeholder="Enter last name"
                      className={
                        lastNameError ? "border-red-500 ring-red-500" : ""
                      }
                    />
                    {lastNameError && (
                      <p className="text-xs text-red-500 mt-1">
                        Last name is required.
                      </p>
                    )}
                  </div>
                </div>

                {/* PERSONAL INFO */}
                <div className="space-y-4">

                  {/* BIRTHDAY + AGE + GENDER on same row */}
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-end">
                    <div className="space-y-2">
                      <Label>Birthday *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal bg-gray-100",
                              !formData.birthday && "text-muted-foreground",
                              birthdayError && "border-red-500 ring-red-500"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                            {formData.birthday
                              ? format(new Date(formData.birthday + "T00:00:00"), "MM/dd/yyyy")
                              : <span>Select date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.birthday ? new Date(formData.birthday + "T00:00:00") : undefined}
                            onSelect={(date) => {
                              if (!date) return;
                              const ymd = date.toISOString().split("T")[0];
                              setFormData({ ...formData, birthday: ymd, age: calculateAge(ymd) });
                            }}
                            disabled={(date) => date > new Date()}
                            initialFocus
                            captionLayout="dropdown-buttons"
                            fromYear={1900}
                            toYear={new Date().getFullYear()}
                            className="rounded-md"
                          />
                        </PopoverContent>
                      </Popover>
                      {birthdayError && (
                        <p className="text-xs text-red-500 mt-1">Birthday is required.</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Age</Label>
                      <Input
                        type="number"
                        value={formData.age}
                        readOnly
                        placeholder="—"
                        className="w-24 text-center bg-gray-100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select
                        value={formData.gender}
                        onValueChange={(v) =>
                          setFormData({ ...formData, gender: v as any })
                        }
                      >
                        <SelectTrigger className="uppercase">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="uppercase">
                          <SelectItem value="Male" className="uppercase">MALE</SelectItem>
                          <SelectItem value="Female" className="uppercase">FEMALE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* CIVIL STATUS + RELIGION on same row with equal widths */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Civil Status</Label>
                      <Select
                        value={formData.civilStatus}
                        onValueChange={(v) =>
                          setFormData({ ...formData, civilStatus: v })
                        }
                      >
                        <SelectTrigger className="uppercase">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="uppercase">
                          <SelectItem value="Single" className="uppercase">SINGLE</SelectItem>
                          <SelectItem value="Married" className="uppercase">MARRIED</SelectItem>
                          <SelectItem value="Widowed" className="uppercase">WIDOWED</SelectItem>
                          <SelectItem value="Separated" className="uppercase">SEPARATED</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Religion</Label>
                      <Select
                        value={formData.religion || ""}
                        onValueChange={(v) =>
                          setFormData({ ...formData, religion: v })
                        }
                      >
                        <SelectTrigger className="uppercase">
                          <SelectValue placeholder="SELECT RELIGION" />
                        </SelectTrigger>
                        <SelectContent className="uppercase">
                          {RELIGION_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Resident Type</Label>
                      <Select
                        value={formData.residentType}
                        onValueChange={(v) =>
                          setFormData({ ...formData, residentType: v })
                        }
                      >
                        <SelectTrigger className="uppercase">
                          <SelectValue placeholder="RESIDENT" />
                        </SelectTrigger>
                        <SelectContent className="uppercase">
                          <SelectItem value="Student" className="uppercase">STUDENT</SelectItem>
                          <SelectItem value="Senior Citizen">
                            SENIOR CITIZEN
                          </SelectItem>
                          <SelectItem value="PWD" className="uppercase">PWD</SelectItem>
                          <SelectItem value="Indigenous" className="uppercase">INDIGENOUS</SelectItem>
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
                        <SelectTrigger className="uppercase">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="uppercase">
                          <SelectItem value="Voter" className="uppercase">VOTER</SelectItem>
                          <SelectItem value="Non-Voter" className="uppercase">NON-VOTER</SelectItem>
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

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>House No. *</Label>
                      <Input
                        value={formData.houseNo}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            houseNo: toUppercaseInput(e.target.value),
                          })
                        }
                        placeholder="House number"
                        className={houseNoError ? "border-red-500 ring-red-500" : ""}
                      />
                      {houseNoError && (
                        <p className="text-xs text-red-500 mt-1">House number is required.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Street Address *</Label>
                      <Input
                        value={formData.streetAddress}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            streetAddress: toUppercaseInput(e.target.value),
                          })
                        }
                        placeholder="Street address"
                        className={streetAddressError ? "border-red-500 ring-red-500" : ""}
                      />
                      {streetAddressError && (
                        <p className="text-xs text-red-500 mt-1">Street address is required.</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        className="uppercase"
                        value={formData.city}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            city: toUppercaseInput(e.target.value),
                          })
                        }
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
                          setFormData({
                            ...formData,
                            country: toUppercaseInput(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* CONTACT NUMBER */}
                    <div className="space-y-2">
                      <Label>Contact Number *</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        maxLength={11}
                        value={formData.contactNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          setFormData({ ...formData, contactNumber: value });
                        }}
                        className={
                          contactNumberAlreadyExists
                            ? "border-yellow-400 ring-yellow-400"
                            : contactError || contactTooLong
                              ? "border-red-500 ring-red-500"
                              : contactComplete
                                ? "border-green-500 ring-green-500"
                                : ""
                        }
                        placeholder="09XX XXX XXXX"
                      />

                      {contactNumberAlreadyExists && (
                        <p className="text-xs text-yellow-600 mt-1">
                          This contact number is already registered. Please use a different number.
                        </p>
                      )}

                      {isCheckingContactNumber && contactComplete && !contactTooLong && !contactNumberAlreadyExists && (
                        <p className="text-xs text-gray-500 mt-1">
                          Checking contact number availability...
                        </p>
                      )}

                      {contactComplete && !contactTooLong && !isCheckingContactNumber && !contactNumberAlreadyExists && (
                        <p className="text-xs text-green-600 mt-1">
                          Contact number complete (11 digits)
                        </p>
                      )}

                      {contactError && !contactNumberAlreadyExists && (
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
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            email: e.target.value,
                          })
                        }
                        placeholder="example@gmail.com"
                        className={
                          emailAlreadyExists
                            ? "border-yellow-400 ring-yellow-400"
                            : emailError || emailInvalidFormat
                            ? "border-red-500 ring-red-500"
                            : ""
                        }
                      />

                      {emailInvalidFormat && (
                        <p className="text-xs text-red-500 mt-1">
                          Only Gmail addresses are allowed (example@gmail.com).
                        </p>
                      )}

                      {emailAlreadyExists && (
                        <p className="text-xs text-yellow-600 mt-1">
                          This Gmail address is already registered. Please use a different email.
                        </p>
                      )}

                      {isCheckingEmail && emailValidFormat && !emailInvalidFormat && (
                        <p className="text-xs text-gray-500 mt-1">
                          Checking email availability...
                        </p>
                      )}

                      {emailValidFormat && !emailInvalidFormat && !isCheckingEmail && !emailAlreadyExists && (
                        <p className="text-xs text-green-600 mt-1">
                          Valid and available Gmail address
                        </p>
                      )}

                      {emailError && !emailAlreadyExists && !emailInvalidFormat && (
                        <p className="text-xs text-red-500 mt-1">
                          Email is required.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* FAMILY */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#2957a1] border-b pb-2">
                    Family Background
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Father's Name</Label>
                      <Input
                        value={formData.fatherName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            fatherName: toUppercaseInput(e.target.value),
                          })
                        }
                        placeholder="Father's full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mother's Name</Label>
                      <Input
                        value={formData.motherName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            motherName: toUppercaseInput(e.target.value),
                          })
                        }
                        placeholder="Mother's full name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Spouse's Name</Label>
                      <Input
                        value={formData.spouseName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            spouseName: toUppercaseInput(e.target.value),
                          })
                        }
                        placeholder="Spouse's full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>No. of Children</Label>
                      <Input
                        type="number"
                        min="0"
                        max="17"
                        value={formData.numberOfChildren}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            numberOfChildren: e.target.value,
                          })
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
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input
                        value={formData.emergencyContactName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            emergencyContactName: toUppercaseInput(
                              e.target.value
                            ),
                          })
                        }
                        placeholder="Emergency contact name"
                        className={emergencyNameError ? "border-red-500 ring-red-500" : ""}
                      />
                      {emergencyNameError && (
                        <p className="text-xs text-red-500 mt-1">Emergency contact name is required.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Emergency Contact Number *</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        maxLength={11}
                        value={formData.emergencyContactNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          setFormData({
                            ...formData,
                            emergencyContactNumber: value,
                          });
                        }}
                        className={
                          formData.emergencyContactNumber.length > 11 || emergencyNumberError
                            ? "border-red-500 ring-red-500"
                            : formData.emergencyContactNumber.length === 11
                              ? "border-green-500 ring-green-500"
                              : ""
                        }
                        placeholder="09XX XXX XXXX"
                      />
                      {formData.emergencyContactNumber.length > 11 && (
                        <p className="text-xs text-red-500 mt-1">
                          Contact number must not exceed 11 digits.
                        </p>
                      )}
                      {emergencyNumberError && formData.emergencyContactNumber.length <= 11 && (
                        <p className="text-xs text-red-500 mt-1">
                          Emergency contact number must be 11 digits.
                        </p>
                      )}
                      {formData.emergencyContactNumber.length === 11 && (
                        <p className="text-xs text-green-600 mt-1">Contact number complete (11 digits)</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Address *</Label>
                    <Input
                      value={formData.emergencyContactAddress}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergencyContactAddress: toUppercaseInput(
                            e.target.value
                          ),
                        })
                      }
                      placeholder="Emergency contact address"
                      className={emergencyAddressError ? "border-red-500 ring-red-500" : ""}
                    />
                    {emergencyAddressError && (
                      <p className="text-xs text-red-500 mt-1">Emergency contact address is required.</p>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="-mx-6 -mb-6 mt-6 border-t bg-gray-50 px-6 py-4 rounded-b-[inherit]">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingResident(null);
                    handleAddDialogOpenChange(false);
                  }}
                >
                  Cancel
                </Button>
                {editingResident ? (
                  <Button
                    onClick={handleUpdateResident}
                    className="bg-[#2957a1] hover:bg-[#1e3f7a]"
                  >
                    Save Edit
                  </Button>
                ) : (
                  <Button
                    onClick={handleSaveResident}
                    className="bg-[#2957a1] hover:bg-[#1e3f7a]"
                  >
                    Save Resident
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
          )} {/* end sk_kagawad gate */}
        </div>
      </div>

      {/* TABLE */}
      <Card className="border border-gray-300 shadow-sm">
        <CardContent className="p-4">
          <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:justify-end sm:items-center gap-3 border-b bg-gray-50 -m-4 mb-4">
            <div className="flex items-center gap-2">
              <Label className="font-semibold text-sm">Search:</Label>
              <div className="relative w-full sm:w-48">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="pr-8 h-9"
              />

              <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            </div>
          </div>

          <div className="overflow-x-auto -mx-4 px-4">

          {/* ── DESKTOP TABLE (hidden on mobile) ── */}
          <div className="hidden sm:block">
          <Table>
            <TableHeader className="bg-[#2957a1]">
              <TableRow className="hover:bg-[#2957a1] border-b-0">
                {(
                  [
                    { label: "RESIDENT NO / USERNAME", field: "residentNo" as const },
                    { label: "FIRST NAME", field: "firstName" as const },
                    { label: "MIDDLE NAME", field: null },
                    { label: "LAST NAME", field: "lastName" as const },
                    { label: "RESIDENT TYPE", field: "residentType" as const },
                    { label: "GENDER", field: null },
                    { label: "VOTER STATUS", field: null },
                    { label: "STATUS", field: "status" as const },
                  ] as { label: string; field: SortField | null }[]
                ).map(({ label, field }) =>
                  field ? (
                    <TableHead
                      key={label}
                      className="h-11 cursor-pointer select-none px-3"
                      onClick={() => handleColumnSort(field)}
                    >
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition-all duration-150 ${
                        sortBy === field
                          ? "bg-white/20 text-white font-bold"
                          : "text-white/80 font-bold hover:bg-white/10 hover:text-white"
                      } text-xs`}>
                        {label}
                        <span className={`flex items-center justify-center w-4 h-4 rounded-sm transition-all ${
                          sortBy === field
                            ? "bg-white/30 text-white"
                            : "text-white/50"
                        }`}>
                          {sortBy === field ? (
                            sortDirection === "asc" ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )
                          ) : (
                            <ChevronsUpDown className="w-3 h-3" />
                          )}
                        </span>
                      </div>
                    </TableHead>
                  ) : (
                    <TableHead key={label} className="text-white/80 font-bold text-xs h-11 px-3">
                      {label}
                    </TableHead>
                  )
                )}
                <TableHead className="text-white/80 font-bold text-xs h-11 px-3">ACTION</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedResidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-14 text-center">
                    <div className="text-sm font-semibold text-gray-700">
                      {residents.length === 0 ? "No resident records available." : "No matching resident records found."}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedResidents.map((resident, index) => (
                  <TableRow key={resident.residentNo} className={`hover:bg-gray-50 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                    <TableCell className="font-medium text-xs py-3">{String(resident.residentNo).replace(/-/g, "")}</TableCell>
                    <TableCell className="text-xs py-3">{resident.firstName}</TableCell>
                    <TableCell className="text-xs py-3">{resident.middleName}</TableCell>
                    <TableCell className="text-xs py-3">{resident.lastName}</TableCell>
                    <TableCell className="text-xs py-3 uppercase">{resident.residentType}</TableCell>
                    <TableCell className="text-xs py-3 uppercase">{resident.gender}</TableCell>
                    <TableCell className="text-xs py-3 uppercase">{resident.voterStatus}</TableCell>
                    <TableCell className="text-xs py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${resident.status === "Active" ? "bg-green-100 text-green-700 border border-green-300" : "bg-red-100 text-red-700 border border-red-300"}`}>
                        {resident.status}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-5">
                        <Button size="sm" className="flex items-center gap-2 bg-gray-100 text-black hover:bg-gray-300 transition-colors" onClick={() => { setViewingResident(resident); setIsResidentDetailsOpen(true); }}>
                          <Eye className="w-6 h-6" /><span>View Info</span>
                        </Button>
                        {resident.status === "Active" ? (
                          !isSkKagawad && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white text-[10px] h-7 px-2">DEACTIVATE</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="sm:max-w-xl p-8">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-2xl font-bold">Deactivate this account?</AlertDialogTitle>
                                  <AlertDialogDescription>Are you certain you want to deactivate the account of <span className="font-semibold">{resident.firstName} {resident.lastName}</span>? This will set the account to inactive.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleInactivate(resident.residentNo)} className="bg-orange-600">Deactivate</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )
                        ) : (
                          !isSkKagawad && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white text-[10px] h-7 px-2">REACTIVATE</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="sm:max-w-xl p-8">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-2xl font-bold">Reactivate Account?</AlertDialogTitle>
                                  <AlertDialogDescription>Are you certain you want to activate the account of <span className="font-semibold">{resident.firstName} {resident.lastName}</span>? This will set the account to active.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleReactivate(resident.residentNo)} className="bg-green-600">Reactivate</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>

          {/* ── MOBILE CARDS (visible only on mobile) ── */}
          <div className="sm:hidden space-y-3 py-1">
            {paginatedResidents.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <User className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-medium">{residents.length === 0 ? "No resident records available." : "No matching records found."}</p>
              </div>
            ) : (
              paginatedResidents.map((resident) => (
                <div key={resident.residentNo} className="rounded-lg border bg-white p-3 shadow-sm space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{resident.firstName} {resident.middleName ? resident.middleName + " " : ""}{resident.lastName}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{String(resident.residentNo).replace(/-/g, "")}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${resident.status === "Active" ? "bg-green-100 text-green-700 border border-green-300" : "bg-red-100 text-red-700 border border-red-300"}`}>{resident.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
                    <span><span className="font-medium text-gray-500">Type:</span> {resident.residentType}</span>
                    <span><span className="font-medium text-gray-500">Gender:</span> {resident.gender}</span>
                    <span className="col-span-2"><span className="font-medium text-gray-500">Voter:</span> {resident.voterStatus}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t">
                    <Button size="sm" className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 text-black hover:bg-gray-200 text-xs h-8" onClick={() => { setViewingResident(resident); setIsResidentDetailsOpen(true); }}>
                      <Eye className="w-3.5 h-3.5" />View Info
                    </Button>
                    {!isSkKagawad && resident.status === "Active" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs h-8">Deactivate</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="w-[95vw] max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Deactivate this account?</AlertDialogTitle>
                            <AlertDialogDescription>This will set <span className="font-semibold">{resident.firstName} {resident.lastName}</span>'s account to inactive.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleInactivate(resident.residentNo)} className="bg-orange-600">Deactivate</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {!isSkKagawad && resident.status !== "Active" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs h-8">Reactivate</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="w-[95vw] max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reactivate Account?</AlertDialogTitle>
                            <AlertDialogDescription>This will set <span className="font-semibold">{resident.firstName} {resident.lastName}</span>'s account to active.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleReactivate(resident.residentNo)} className="bg-green-600">Reactivate</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          </div>

          {/* ── PAGINATION FOOTER ── */}
          {filteredResidents.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t mt-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 shrink-0">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#2957a1]"
                  >
                    {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <span className="text-xs text-gray-500">{rangeStart}–{rangeEnd} of {filteredResidents.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition-colors" aria-label="First page"><ChevronsLeft className="w-3.5 h-3.5" /></button>
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition-colors" aria-label="Previous page"><ChevronLeft className="w-3.5 h-3.5" /></button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                  const page = start + i;
                  return page <= totalPages ? (
                    <button key={page} onClick={() => setCurrentPage(page)} className={`w-7 h-7 rounded border text-xs font-semibold transition-colors ${page === currentPage ? "bg-[#2957a1] text-white border-[#2957a1]" : "border-gray-300 hover:bg-gray-100"}`}>{page}</button>
                  ) : null;
                })}
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition-colors" aria-label="Next page"><ChevronRight className="w-3.5 h-3.5" /></button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition-colors" aria-label="Last page"><ChevronsRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* STEP 2: DATA PRIVACY DIALOG */}
      <AlertDialog
        open={showDataPrivacyDialog}
        onOpenChange={(open) => {
          setShowDataPrivacyDialog(open);
          if (!open) {
            setResidentPrivacyAccepted(false);
          }
        }}
      >
        <AlertDialogContent className="w-[95vw] sm:max-w-[700px] md:max-w-[850px] lg:max-w-[1000px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-[#2957a1]">Data Privacy Agreement</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-gray-600 mt-1">
              Please review and confirm the data privacy terms before creating this resident account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-[55vh] space-y-5 overflow-y-auto pr-2 text-base leading-8 text-gray-700">
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
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4">
              <p className="text-base font-bold text-[#2957a1]">By continuing to use this system, you confirm that:</p>
              <ul className="mt-3 list-disc space-y-3 pl-6 text-base text-gray-700">
                {dataPrivacyHighlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <p>If you do not agree with this policy, please discontinue use of the system.</p>
            <label className="flex items-start gap-4 rounded-lg border border-gray-200 bg-gray-50 px-5 py-4 cursor-pointer">
              <input
                type="checkbox"
                checked={residentPrivacyAccepted}
                onChange={(event) => setResidentPrivacyAccepted(event.target.checked)}
                className="mt-1 h-5 w-5 rounded border-gray-300"
              />
              <span className="text-base font-medium text-gray-800">
                I have read and understood the Data Privacy Agreement, and I consent to the collection
                and processing of this resident’s information for legitimate barangay operations.
              </span>
            </label>
          </div>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel onClick={handleCancelDataPrivacy} className="text-base px-6 py-2">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmPrivacy}
              className="bg-[#2957a1] text-base px-6 py-2"
              disabled={!residentPrivacyAccepted}
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
                Set Account Password
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-gray-500">
              Create and confirm the password for this resident account.
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
                  className="absolute inset-y-0 right-0 flex h-full items-center justify-center px-3 text-gray-400 transition-colors hover:text-[#2957a1]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700">
                Confirm Password *
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  maxLength={50}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="h-10 pr-10 border-gray-200 focus:ring-1 focus:ring-[#2957a1]"
                />
                {/* <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex h-full items-center justify-center px-3 text-gray-400 transition-colors hover:text-[#2957a1]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button> */}
              </div>
            </div>

            <DialogFooter className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordDialog(false);
                  setConfirmPassword("");
                  setShowDiscardResidentDialog(false);
                  setIsAddDialogOpen(true);
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
          </div>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={showDiscardResidentDialog}
          onOpenChange={setShowDiscardResidentDialog}
        >
          <AlertDialogContent className="max-w-[400px]">
            <AlertDialogHeader>
              <AlertDialogTitle>Discard account creation?</AlertDialogTitle>
              <AlertDialogDescription>
                Your unsaved resident information will be lost if you continue.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Editing</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDiscardResident}
                className="bg-[#2957a1]"
              >
                Discard
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* VIEW RESIDENT DETAILS */}
        <Dialog
          open={false}
          onOpenChange={(open) => {
            if (!open) setViewingResident(null);
          }}
        >
          <DialogContent
            // âœ… FIX 1: Override Shadcn's narrow defaults using specific breakpoints
            className="w-[95vw] sm:max-w-[700px] md:max-w-[850px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto p-0"
          >
            {/* Sticky header */}
            <div className="sticky top-0 z-10 bg-white border-b">
              <DialogHeader className="px-4 sm:px-6 py-4">
                <DialogTitle className="text-xl font-bold text-[#2957a1]">Resident Details</DialogTitle>
              </DialogHeader>
            </div>

            {false && viewingResident && (
              <div className="p-4 sm:p-6 space-y-8">
                {/* Top Profile Section */}
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Avatar */}
                  {/* âœ… FIX 2: Give the avatar column a fixed width (280px) so buttons fit nicely */}
                  <div className="flex flex-col items-center justify-start md:w-[280px] flex-shrink-0">
                    <ProfileImageUpload
                      residentId={viewingResident.residentNo}
                      currentImage={viewingResident.profileImage}
                      onImageReady={(imageUrl, previewUrl) => {
                        setViewingResident({ ...viewingResident, profileImage: previewUrl });
                        loadResidents();
                      }}
                      size="lg"
                    />
                  </div>

                  {/* Header Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-3xl font-bold text-gray-900 break-words capitalize">
                      {viewingResident.firstName}{" "}
                      {viewingResident.middleName ? viewingResident.middleName + " " : ""}
                      {viewingResident.lastName}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-semibold">
                        Resident No: {formatId(viewingResident.residentNo)}
                      </span>

                      {viewingResident.residentType && (
                        <span className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold">
                          Type: {String(viewingResident.residentType).toUpperCase()}
                        </span>
                      )}

                      {typeof viewingResident.voterStatus !== "undefined" && (
                        <span className="text-xs px-3 py-1.5 rounded-full bg-orange-50 text-orange-700 border border-orange-100 font-semibold">
                          Voter: {String(viewingResident.voterStatus).toUpperCase()}
                        </span>
                      )}

                      {viewingResident.status && (
                        <span
                          className={`text-xs px-3 py-1.5 rounded-full border font-semibold ${String(viewingResident.status).toLowerCase() === "active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-red-50 text-red-700 border-red-100"
                            }`}
                        >
                          {viewingResident.status}
                        </span>
                      )}
                    </div>

                    {/* Quick Info Cards */}
                    {/* âœ… FIX 3: Change to a 4-column grid so these sit side-by-side */}
                    <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 rounded-xl border bg-gray-50/50">
                        <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Gender</p>
                        <p className="text-sm font-bold text-gray-900">
                          {viewingResident.gender || "â€”"}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl border bg-gray-50/50">
                        <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Age</p>
                        <p className="text-sm font-bold text-gray-900">
                          {typeof viewingResident.age !== "undefined" ? viewingResident.age : "â€”"}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl border bg-gray-50/50">
                        <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Birthday</p>
                        <p className="text-sm font-bold text-gray-900 break-words">
                          {viewingResident.birthday || "â€”"}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl border bg-gray-50/50">
                        <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Civil Status</p>
                        <p className="text-sm font-bold text-gray-900">
                          {viewingResident.civilStatus || "â€”"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                  {/* Family Information Card */}
                  <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                    <div className="px-5 py-4 bg-gray-50/80 border-b">
                      <p className="text-sm font-bold text-[#2957a1]">Family Information</p>
                      <p className="text-xs text-gray-500 mt-0.5">Parents and spouse details</p>
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Father</p>
                        <p className="text-sm font-medium text-gray-900 sm:col-span-2 break-words capitalize">
                          {viewingResident.fatherName || "â€”"}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Mother</p>
                        <p className="text-sm font-medium text-gray-900 sm:col-span-2 break-words capitalize">
                          {viewingResident.motherName || "â€”"}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Spouse</p>
                        <p className="text-sm font-medium text-gray-900 sm:col-span-2 break-words capitalize">
                          {viewingResident.spouseName || "â€”"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Contact & Address Card */}
                  <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                    <div className="px-5 py-4 bg-gray-50/80 border-b">
                      <p className="text-sm font-bold text-[#2957a1]">Contact & Address</p>
                      <p className="text-xs text-gray-500 mt-0.5">How to reach this resident</p>
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Contact No.</p>
                        <p className="text-sm font-medium text-gray-900 sm:col-span-2 break-words">
                          {viewingResident.contactNumber || "â€”"}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Email</p>
                        <p className="text-sm font-medium text-gray-900 sm:col-span-2 break-all">
                          {viewingResident.email || "â€”"}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                        <p className="text-xs font-semibold text-gray-500 uppercase mt-1">Address</p>
                        <p className="text-sm font-medium text-gray-900 sm:col-span-2 break-words leading-relaxed uppercase">
                          {`${viewingResident.houseNo || ""} ${viewingResident.streetAddress || ""} ${viewingResident.city || ""}`.trim() ||
                            "â€”"}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Brgy Card</p>
                        <p className="text-sm font-medium text-gray-900 sm:col-span-2 break-words">
                          {viewingResident.barangayCard || "â€”"}
                        </p>
                      </div>

                        <div className="flex flex-col gap-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase">Date Registered</p>
                          <p className="text-sm font-medium text-gray-900">
                            {viewingResident?.dateRegistered
                              ? dayjs(viewingResident.dateRegistered).format('MMMM DD, YYYY')
                              : "â€”"}
                          </p>
                        </div>

                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sticky footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t px-4 sm:px-6 py-4">
              <DialogFooter className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setViewingResident(null)} className="font-semibold shadow-sm">
                  Close
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

      {/* VIEW RESIDENT DETAILS */}
      <Dialog
        open={isResidentDetailsOpen && !!viewingResident}
        onOpenChange={(open) => {
          setIsResidentDetailsOpen(open);
          if (!open) setViewingResident(null);
        }}
      >
        <DialogContent
          // âœ… FIX 1: Override Shadcn's narrow defaults using specific breakpoints
          className="w-[95vw] sm:max-w-[700px] md:max-w-[850px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto p-0"
        >
          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-white border-b">
            <DialogHeader className="px-4 sm:px-6 py-4">
              <DialogTitle className="text-xl font-bold text-[#2957a1]">Resident Details</DialogTitle>
            </DialogHeader>
          </div>

          {viewingResident && (
            <div className="p-4 sm:p-6 space-y-8">
              {/* Top Profile Section */}
              <div className="flex flex-col md:flex-row gap-8">
                {/* Avatar */}
                {/* âœ… FIX 2: Give the avatar column a fixed width (280px) so buttons fit nicely */}
                <div className="flex flex-col items-center justify-start md:w-[280px] flex-shrink-0">
                  <ProfileImageUpload
                    residentId={viewingResident.residentNo}
                    currentImage={viewingResident.profileImage}
                    onImageReady={(imageUrl, previewUrl) => {
                      setViewingResident({ ...viewingResident, profileImage: previewUrl });
                      loadResidents();
                    }}
                    size="lg"
                  />
                </div>

                {/* Header Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-3xl font-bold text-gray-900 break-words capitalize">
                    {viewingResident.firstName}{" "}
                    {viewingResident.middleName ? viewingResident.middleName + " " : ""}
                    {viewingResident.lastName}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-semibold">
                      Resident No: {formatId(viewingResident.residentNo)}
                    </span>

                    {viewingResident.residentType && (
                      <span className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold">
                        Type: {String(viewingResident.residentType).toUpperCase()}
                      </span>
                    )}

                    {typeof viewingResident.voterStatus !== "undefined" && (
                      <span className="text-xs px-3 py-1.5 rounded-full bg-orange-50 text-orange-700 border border-orange-100 font-semibold">
                        Voter: {String(viewingResident.voterStatus).toUpperCase()}
                      </span>
                    )}

                    {viewingResident.status && (
                      <span
                        className={`text-xs px-3 py-1.5 rounded-full border font-semibold ${String(viewingResident.status).toLowerCase() === "active"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : "bg-red-50 text-red-700 border-red-100"
                          }`}
                      >
                        {viewingResident.status}
                      </span>
                    )}
                  </div>

                  {/* Quick Info Cards */}
                  {/* âœ… FIX 3: Change to a 4-column grid so these sit side-by-side */}
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="p-3 rounded-xl border bg-gray-50/50">
                      <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Gender</p>
                      <p className="text-sm font-bold text-gray-900">
                        {viewingResident.gender || "â€”"}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl border bg-gray-50/50">
                      <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Age</p>
                      <p className="text-sm font-bold text-gray-900">
                        {typeof viewingResident.age !== "undefined" ? viewingResident.age : "â€”"}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl border bg-gray-50/50">
                      <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Birthday</p>
                      <p className="text-sm font-bold text-gray-900 break-words">
                        {viewingResident.birthday || "â€”"}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl border bg-gray-50/50">
                      <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Civil Status</p>
                      <p className="text-sm font-bold text-gray-900">
                        {viewingResident.civilStatus || "â€”"}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl border bg-gray-50/50">
                      <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Religion</p>
                      <p className="text-sm font-bold text-gray-900 break-words">
                        {viewingResident.religion || "Not provided"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                {/* Family Information Card */}
                <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                  <div className="px-5 py-4 bg-gray-50/80 border-b">
                    <p className="text-sm font-bold text-[#2957a1]">Family Information</p>
                    <p className="text-xs text-gray-500 mt-0.5">Parents and spouse details</p>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Father</p>
                      <p className="text-sm font-medium text-gray-900 sm:col-span-2 break-words capitalize">
                        {viewingResident.fatherName || "Not provided"}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Mother</p>
                      <p className="text-sm font-medium text-gray-900 sm:col-span-2 break-words capitalize">
                        {viewingResident.motherName || "Not provided"}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Spouse</p>
                      <p className="text-sm font-medium text-gray-900 sm:col-span-2 break-words capitalize">
                        {viewingResident.spouseName || "Not provided"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact & Address Card */}
                <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                  <div className="px-5 py-4 bg-gray-50/80 border-b">
                    <p className="text-sm font-bold text-[#2957a1]">Contact & Address</p>
                    <p className="text-xs text-gray-500 mt-0.5">How to reach this resident</p>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Contact No.</p>
                      <p className="text-sm font-medium text-gray-900 sm:col-span-2 break-words">
                        {viewingResident.contactNumber || "Not provided"}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Email</p>
                      <p className="text-sm font-medium text-gray-900 sm:col-span-2 break-all">
                        {viewingResident.email || "Not provided"}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                      <p className="text-xs font-semibold text-gray-500 uppercase mt-1">Address</p>
                      <p className="text-sm font-medium text-gray-900 sm:col-span-2 break-words leading-relaxed uppercase">
                        {`${viewingResident.houseNo || ""} ${viewingResident.streetAddress || ""} ${viewingResident.city || ""} ${viewingResident.postalCode || ""}`.trim() ||
                          "Not provided"}
                      </p>
                    </div>

                    {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Brgy Card</p>
                      <p className="text-sm font-medium text-gray-900 sm:col-span-2 break-words">
                        {viewingResident.barangayCard || ""}
                      </p>
                    </div> */}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sticky footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t px-4 sm:px-6 py-4">
            <DialogFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsResidentDetailsOpen(false);
                  setViewingResident(null);
                }}
                className="font-semibold shadow-sm"
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resident Records Settings</DialogTitle>
            <DialogDescription>
              Configure the cutoff date for identifying new residents
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Resident Cutoff Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-gray-100",
                      !tempCutoffDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />

                    {tempCutoffDate ? (
                      format(new Date(tempCutoffDate), "MM/dd/yyyy")
                    ) : (
                      <span>MM/DD/YYYY</span>
                    )}
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={tempCutoffDate ? new Date(tempCutoffDate) : undefined}
                    onSelect={(date) => {
                      if (!date) return;

                      setTempCutoffDate(date.toISOString().split("T")[0]);
                    }}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-gray-500">
                Residents registered after this date will be considered &quot;new residents&quot;
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings} className="bg-[#2957a1]">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}