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
import { Search, Eye, EyeOff, Upload, User, Lock, Settings, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { formatId } from "../../utils/formatId";
import OcrScanner from "../../OcrScanner";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import dayjs from "dayjs";
import { cn } from "../../utils/cn";
import { ProfileImageUpload } from "../ui/ProfileImageUpload";

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
  religion?: string | null;

}

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
};

type SortMenuValue =
  | "dir:asc"
  | "dir:desc"
  | "field:residentNo:asc"
  | "field:residentNo:desc"
  | "field:lastName"
  | "field:residentType"
  | "field:status";

const API_BASE = "http://localhost:5001";

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
    religion: (r as any).Religion ?? null,
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
}: ResidentRecordsProps) {
  const birthdayInputRef = useRef<HTMLInputElement | null>(null);
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
    voterStatus: "No" as "Yes" | "No",
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
  const [showDataPrivacyDialog, setShowDataPrivacyDialog] = useState(false);
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

  type SortMenuValue =
    | "dir:asc"
    | "dir:desc"
    | "field:residentNo:asc"
    | "field:residentNo:desc"
    | "field:firstName"
    | "field:lastName"
    | "field:residentType"
    | "field:status"
    | "field:dateRegistered";

  const [sortBy, setSortBy] = useState<SortField>("residentNo");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // single source of truth for the dropdown selection
  const [sortMenuValue, setSortMenuValue] = useState<SortMenuValue>(
    "field:residentNo:asc"
  );

  const handleSortMenuChange = (v: SortMenuValue) => {
    setSortMenuValue(v);

    // Aâ€“Z / Zâ€“A must ALWAYS sort by First Name
    if (v === "dir:asc") {
      setSortBy("firstName");
      setSortDirection("asc");
      return;
    }
    if (v === "dir:desc") {
      setSortBy("firstName");
      setSortDirection("desc");
      return;
    }

    // Resident No needs explicit Asc/Desc
    if (v === "field:residentNo:asc") {
      setSortBy("residentNo");
      setSortDirection("asc");
      return;
    }
    if (v === "field:residentNo:desc") {
      setSortBy("residentNo");
      setSortDirection("desc");
      return;
    }

    // Other fields: default to Asc when selected
    if (v.startsWith("field:")) {
      const field = v.replace("field:", "") as SortField;
      setSortBy(field);
      setSortDirection("asc");
      return;
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

  // ADDED FEATURE: SETTINGS HANDLER
  const handleSaveSettings = () => {
    onUpdateCutoffDate?.(tempCutoffDate);
    setShowSettingsDialog(false);
    toast.success("Settings updated");
  };

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
      (resident) => resident.email?.trim().toLowerCase() === trimmedEmail
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
  }, [formData.email, residents]);

  useEffect(() => {
    const trimmedContactNumber = formData.contactNumber.trim();

    if (!trimmedContactNumber || trimmedContactNumber.length !== 11) {
      setContactNumberAlreadyExists(false);
      setIsCheckingContactNumber(false);
      return;
    }

    let cancelled = false;
    const localDuplicate = residents.some(
      (resident) => resident.contactNumber?.trim() === trimmedContactNumber
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
  }, [formData.contactNumber, residents]);

  // Sync activeFilter with initialFilter prop changes
  useEffect(() => {
    setActiveFilter(initialFilter);
  }, [initialFilter]);

  const resetForm = () => {
    setFormData(initialFormData);
    setProfileImagePreview("");
    setPassword("");
    setConfirmPassword("");
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

      let token =
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("jwt") ||
        null;

      if (token) {
        token = token.replace(/^"|"$/g, '');
      }

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
    } catch (err) {
      toast.error("Could not reach backend server.");
      console.error(err);
    }
  };

  const handleCancelDataPrivacy = () => {
    setShowDataPrivacyDialog(false);
    setShowDiscardResidentDialog(false);
    setIsAddDialogOpen(true);
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
    .filter((resident) => {
      const matchesSearch =
        resident.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resident.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resident.residentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (resident.residentType && resident.residentType.toLowerCase().includes(searchTerm.toLowerCase()));

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
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div className="flex items-center justify-between">
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

        <div className="flex items-center gap-2">

          {/* Generate List Button */}
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

          {/* Add New Resident Dialog */}
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
              className="w-[95vw] max-w-6xl max-h-[90vh] overflow-y-auto"
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
                <DialogTitle className="text-xl">Add New Resident</DialogTitle>
                <DialogDescription>
                  Fill in the resident's information to register them in the
                  system.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="flex flex-col items-center gap-3 mb-2">
                  <OcrScanner onDataExtracted={handleOcrData} />
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#2957a1] text-[#2957a1] hover:bg-blue-50"
                    onClick={() => setShowScannerInfoDialog(true)}
                  >
                    WHAT'S CAMERA SCANNER?
                  </Button>
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

                  {/* BIRTHDAY */}
                  <div className="space-y-2">
                    <Label>Birthday *</Label>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        ref={birthdayInputRef}
                        type="date"
                        value={formData.birthday}
                        max={new Date().toISOString().split("T")[0]}
                        onChange={(e) => {
                          const ymd = e.target.value;
                          setFormData({
                            ...formData,
                            birthday: ymd,
                            age: calculateAge(ymd),
                          });
                        }}
                        className={cn(
                          "bg-gray-100",
                          birthdayError && "border-red-500 ring-red-500"
                        )}
                      />

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          birthdayInputRef.current?.focus();
                          birthdayInputRef.current?.showPicker?.();
                        }}
                        className={cn(
                          "w-full justify-center bg-gray-100 hover:bg-gray-200 sm:w-auto sm:px-4",
                          birthdayError && "border-red-500 ring-red-500"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        Show date picker
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Age</Label>
                      <Input
                        type="number"
                        value={formData.age}
                        readOnly
                        placeholder="Auto-calculated"
                        className="uppercase"
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
                      <Input
                        className="text-sm uppercase"
                        value={formData.religion}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            religion: toUppercaseInput(e.target.value),
                          })
                        }
                        placeholder="Enter religion"
                      />
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
                          <SelectItem value="Yes" className="uppercase">VOTER</SelectItem>
                          <SelectItem value="No" className="uppercase">NON-VOTER</SelectItem>
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
                      <Label>House No.</Label>
                      <Input
                        value={formData.houseNo}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            houseNo: toUppercaseInput(e.target.value),
                          })
                        }
                        placeholder="House number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Street Address</Label>
                      <Input
                        value={formData.streetAddress}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            streetAddress: toUppercaseInput(e.target.value),
                          })
                        }
                        placeholder="Street address"
                      />
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
                          Contact number complete (11 digits)âœ…
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
                      <Label>Name</Label>
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
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Emergency Contact Number</Label>
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
                          emergencyContactAddress: toUppercaseInput(
                            e.target.value
                          ),
                        })
                      }
                      placeholder="Emergency contact address"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="-mx-6 -mb-6 mt-6 border-t bg-gray-50 px-6 py-4 rounded-b-[inherit]">
                <Button variant="outline" onClick={() => handleAddDialogOpenChange(false)}>
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
      </div>

      {/* TABLE */}
      <Card className="border border-gray-300 shadow-sm">
        <CardContent className="p-4">
          <div className="p-4 flex justify-between items-center gap-4 border-b bg-gray-50 -m-4 mb-4">
            <div className="flex items-center gap-2">
              <Label className="font-semibold text-sm">Sort by:</Label>
              <Select value={sortMenuValue} onValueChange={(v) => handleSortMenuChange(v as SortMenuValue)}>
                <SelectTrigger className="w-[205px] h-9">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>

                <SelectContent className="min-w-[205px]">
                  <SelectItem value="field:dateRegistered">Newly Added Resident</SelectItem>
                  <SelectItem value="field:status">Status</SelectItem>
                  <SelectItem value="field:residentNo:asc">Resident No (Ascending)</SelectItem>
                  <SelectItem value="field:residentNo:desc">Resident No (Descending)</SelectItem>
                  <SelectItem value="dir:asc">Alphabetical (A-Z)</SelectItem>
                  <SelectItem value="dir:desc">Alphabetical (Z-A)</SelectItem>
                  <SelectItem value="field:lastName">Last Name</SelectItem>
                  <SelectItem value="field:residentType">Resident Type</SelectItem>
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
                <TableHead className="text-white font-bold text-xs h-10">
                  RESIDENT NO / USERNAME
                </TableHead>
                <TableHead className="text-white font-bold text-xs h-10">
                  FIRST NAME
                </TableHead>
                <TableHead className="text-white font-bold text-xs h-10">
                  MIDDLE NAME
                </TableHead>
                <TableHead className="text-white font-bold text-xs h-10">
                  LAST NAME
                </TableHead>
                <TableHead className="text-white font-bold text-xs h-10">
                  RESIDENT TYPE
                </TableHead>
                <TableHead className="text-white font-bold text-xs h-10">
                  GENDER
                </TableHead>
                <TableHead className="text-white font-bold text-xs h-10">
                  VOTER STATUS
                </TableHead>
                <TableHead className="text-white font-bold text-xs h-10">
                  STATUS
                </TableHead>
                <TableHead className="text-white font-bold text-xs h-10">
                  ACTION
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredResidents.map((resident, index) => (
                <TableRow
                  key={resident.residentNo}
                  className={`hover:bg-gray-50 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                    }`}
                >
                  <TableCell className="font-medium text-xs py-3">
                    {String(resident.residentNo).replace(/-/g, "")}
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    {resident.firstName}
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    {resident.middleName}
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    {resident.lastName}
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    {resident.residentType}
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    {resident.gender}
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    {resident.voterStatus}
                  </TableCell>
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
                    <div className="flex items-center gap-5">

                      <Button
                        size="sm"
                        className="flex items-center gap-2 bg-gray-100 text-black hover:bg-gray-300 transition-colors"
                        onClick={() => {
                          setViewingResident(resident);
                          setIsResidentDetailsOpen(true);
                        }}
                      >
                        <Eye className="w-6 h-6" />
                        <span>View Info</span>
                      </Button>

                      {resident.status === "Active" ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] h-7 px-2"
                            >
                              DEACTIVATE
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Deactivate this account?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you certain you want to deactivate the account of{" "}
                                <span className="font-semibold">
                                  {resident.firstName} {resident.lastName}
                                </span>
                                ? This will set the account to inactive.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleInactivate(resident.residentNo)
                                }
                                className="bg-orange-600"
                              >
                                Deactivate
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              className="bg-green-500 hover:bg-green-600 text-white text-[10px] h-7 px-2"
                            >
                              REACTIVATE
                            </Button>
                          </AlertDialogTrigger>

                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Reactivate Account?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you certain you want to activate the account of{" "}
                                <span className="font-semibold">
                                  {resident.firstName} {resident.lastName}
                                </span>
                                ? This will set the account to active.
                              </AlertDialogDescription>
                            </AlertDialogHeader>

                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleReactivate(resident.residentNo)}
                                className="bg-green-600"
                              >
                                Reactivate
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
      <AlertDialog
        open={showDataPrivacyDialog}
        onOpenChange={setShowDataPrivacyDialog}
      >
        <AlertDialogContent className="max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Data Privacy Agreement</AlertDialogTitle>
            <AlertDialogDescription>
              Agree to process information for management purposes?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDataPrivacy}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmPrivacy}
              className="bg-[#2957a1]"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2957a1]"
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
                          Type: {viewingResident.residentType}
                        </span>
                      )}

                      {typeof viewingResident.voterStatus !== "undefined" && (
                        <span className="text-xs px-3 py-1.5 rounded-full bg-orange-50 text-orange-700 border border-orange-100 font-semibold">
                          Voter: {viewingResident.voterStatus ? "Registered" : "Not Registered"}
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
                        Type: {viewingResident.residentType}
                      </span>
                    )}

                    {typeof viewingResident.voterStatus !== "undefined" && (
                      <span className="text-xs px-3 py-1.5 rounded-full bg-orange-50 text-orange-700 border border-orange-100 font-semibold">
                        Voter: {viewingResident.voterStatus ? "Registered" : "Not Registered"}
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
