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
import { Search, Eye, EyeOff, Upload, User, Lock, Settings, X, FileText, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronUp, ChevronDown, ChevronsUpDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  MAX_HOUSE_NO_LENGTH,
  MAX_RESIDENT_AGE,
  MIN_RESIDENT_AGE,
  NAME_FIELD_ERROR,
  hasInvalidNameValue,
  normalizeNameInput,
  normalizeNameValue,
  validateNumberOfChildren,
  validatePassword,
  validateResidentAge,
  validateResidentForm,
} from "../../utils/validation";
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
import { cleanupOcrText } from "../../utils/ocrCleanup";

// Helper: Get default cutoff date (30 days ago)
const toLocalYmd = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const fromYmdLocal = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const getDefaultCutoffDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return toLocalYmd(date);
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
  gender: "Male" | "Female" | "Unknown";
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

type ResidentNameField =
  | "firstName"
  | "middleName"
  | "lastName"
  | "fatherName"
  | "motherName"
  | "spouseName"
  | "emergencyContactName";

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
Gender: "Male" | "Female" | "Unknown" | null;
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
    residentType: r.ResidentType ?? "Resident",
    voterStatus: normalizeVoterStatus(r.VoterStatus),
    houseNo: String(r.HouseNumber ?? "").replace(/\D/g, "").slice(0, MAX_HOUSE_NO_LENGTH),
    streetAddress: r.StreetAddress ?? "",
    city: ((r as any).City ?? (r as any).city ?? "Manila City") as string,
    postalCode: ((r as any).ZipCode ?? (r as any).zipcode ?? (r as any).PostalCode ?? "1013") as string,
    country: "PHILIPPINES",
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

const getLatestAllowedBirthDate = () => {
  const today = new Date();
  return new Date(today.getFullYear() - MIN_RESIDENT_AGE, today.getMonth(), today.getDate(), 23, 59, 59, 999);
};

const toUppercaseInput = (value: string) => value.toUpperCase();

const isOcrLabelFragment = (value: string) => {
  const cleaned = value.toUpperCase().replace(/[^A-Z\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return true;
  const labelWords = [
    "LAST NAME", "GIVEN NAMES", "MIDDLE NAME", "DATE OF BIRTH", "ADDRESS",
    "SURNAME", "FIRST NAME", "NAME", "ID NO", "VALID UNTIL", "DATE OF ISSUE",
  ];
  return labelWords.some((label) => cleaned === label || cleaned.endsWith(` ${label}`));
};

const parseOcrField = (text: string, labels: string[]) => {
  for (const label of labels) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const inlineMatch = text.match(
      new RegExp(`${escapedLabel}\\s*[:\\-]?\\s*([^\\n]{2,90})`, "i")
    );
    if (inlineMatch?.[1] && !isOcrLabelFragment(inlineMatch[1])) {
      return inlineMatch[1].replace(/\s{2,}/g, " ").trim();
    }

    const nextLineMatch = text.match(
      new RegExp(`${escapedLabel}\\s*[:\\-]?\\s*\\n\\s*([^\\n]{2,90})`, "i")
    );
    if (nextLineMatch?.[1] && !isOcrLabelFragment(nextLineMatch[1])) {
      return nextLineMatch[1].replace(/\s{2,}/g, " ").trim();
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
  (normalizeOcrValue(value).match(/\d+/)?.[0] || "").trim().slice(0, MAX_HOUSE_NO_LENGTH);

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
    gender?: "Male" | "Female" | "Unknown";
    birthday?: string;
    expirationDate?: string;
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

  if (!result.gender) {
    const licenseSexMatch =
      normalizedText.match(/\bSEX\s+DATE\s+OF\s+BIRTH[\s\S]{0,120}?\b([MF])\s+\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/) ||
      normalizedText.match(/\bSEX[\s:]+([MF])\b/) ||
      normalizedText.match(/\b([MF])\s+\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/) ||
      normalizedText.match(/\b([MF])\s+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/);

    if (licenseSexMatch?.[1] === "F") {
      result.gender = "Female";
    } else if (licenseSexMatch?.[1] === "M") {
      result.gender = "Male";
    }
  }

  if (!result.gender) {
    const sexLabelIndex = lines.findIndex((line) => line.includes("SEX"));
    const valueLine = sexLabelIndex >= 0 ? lines[sexLabelIndex + 1] || "" : "";
    const valueTokens = valueLine.split(/\s+/).filter(Boolean);
    const sexToken =
      valueTokens.find((token) => token === "M" || token === "F" || token === "MALE" || token === "FEMALE") ||
      "";

    if (sexToken === "F" || sexToken === "FEMALE") {
      result.gender = "Female";
    } else if (sexToken === "M" || sexToken === "MALE") {
      result.gender = "Male";
    }
  }

  const dlExpiryMatch =
    normalizedText.match(/\bEXPIRATION\s+DATE[\s:]*([0-9]{4}[\/\-][0-9]{1,2}[\/\-][0-9]{1,2})\b/) ||
    normalizedText.match(/\bEXPIRY\s+DATE[\s:]*([0-9]{4}[\/\-][0-9]{1,2}[\/\-][0-9]{1,2})\b/) ||
    normalizedText.match(/\bVALID\s+(?:UNTIL|THRU)[\s:]*([0-9]{4}[\/\-][0-9]{1,2}[\/\-][0-9]{1,2})\b/) ||
    normalizedText.match(/\bEXPIRATION\s+DATE[\s:]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})\b/) ||
    normalizedText.match(/\bEXPIRY\s+DATE[\s:]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})\b/) ||
    normalizedText.match(/\bVALID\s+(?:UNTIL|THRU)[\s:]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})\b/) ||
    normalizedText.match(/\bEXP\.*\s*DATE[\s:]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})\b/);
  if (dlExpiryMatch?.[1]) {
    result.expirationDate = parseDateTokenToYmd(dlExpiryMatch[1]);
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

type SupportedIdType =
  | "PHILSYS_NATIONAL_ID"
  | "UMID"
  | "DRIVERS_LICENSE"
  | "PASSPORT"
  | "POSTAL_ID"
  | "MANILA_PWD_ID"
  | "MANILA_SENIOR_CITIZEN_ID";

type ParsedIdData = {
  idType?: SupportedIdType;
  fullName?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  idNumber?: string;
  birthday?: string;
  gender?: "Male" | "Female" | "Unknown";
  address?: string;
  issueDate?: string;
  expirationDate?: string;
  expiryPolicy?: "required" | "optional" | "not_expected";
  confidence?: number;
  missingFields?: string[];
  rawText?: string;
};

const ID_TYPE_LABEL: Record<SupportedIdType, string> = {
  PHILSYS_NATIONAL_ID: "PhilSys National ID",
  UMID: "UMID",
  DRIVERS_LICENSE: "Driver's License",
  PASSPORT: "Passport",
  POSTAL_ID: "Postal ID",
  MANILA_PWD_ID: "Manila PWD ID",
  MANILA_SENIOR_CITIZEN_ID: "Manila Senior Citizen ID",
};

type IdRule = {
  label: string;
  keywords: string[];
  negativeKeywords?: string[];
  idLabels: string[];
  birthLabels: string[];
  nameLabels: string[];
  addressLabels: string[];
  issueLabels: string[];
  expiryLabels: string[];
  idPatterns: RegExp[];
  expiryPolicy: "required" | "optional" | "not_expected";
  requiredFields: Array<"name" | "idNumber" | "birthday" | "gender" | "address">;
};

const ID_RULES: Record<SupportedIdType, IdRule> = {
  PHILSYS_NATIONAL_ID: {
    label: ID_TYPE_LABEL.PHILSYS_NATIONAL_ID,
    keywords: ["REPUBLIKA NG PILIPINAS", "PHILIPPINE IDENTIFICATION CARD", "PAMBANSANG PAGKAKAKILANLAN", "PHILSYS", "PSN", "PCN", "PHILID"],
    idLabels: ["CARD NUMBER", "PCN", "PHILSYS CARD NUMBER", "PHILID CARD NUMBER", "ID NO", "ID NUMBER", "PAMBANSANG PAGKAKAKILANLAN"],
    birthLabels: ["DATE OF BIRTH", "PETSA NG KAPANGANAKAN", "BIRTH DATE"],
    nameLabels: ["FULL NAME", "NAME", "APELYIDO", "LAST NAME", "MGA PANGALAN", "GIVEN NAMES", "GITNANG APELYIDO", "MIDDLE NAME"],
    addressLabels: ["ADDRESS", "TIRAHAN"],
    issueLabels: ["DATE OF ISSUE", "ISSUED ON", "PETSA NG PAGKAKALOOB"],
    expiryLabels: [],
    idPatterns: [/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/],
    expiryPolicy: "optional",
    requiredFields: ["name", "idNumber", "birthday", "gender", "address"],
  },
  UMID: {
    label: ID_TYPE_LABEL.UMID,
    keywords: ["UNIFIED MULTI-PURPOSE ID", "UNITED MULTI-PURPOSE ID", "UMID", "CRN", "COMMON REFERENCE NUMBER", "GSIS", "SSS"],
    idLabels: ["CRN", "COMMON REFERENCE NUMBER", "ID NO", "ID NUMBER"],
    birthLabels: ["DATE OF BIRTH", "BIRTH DATE"],
    nameLabels: ["NAME", "FULL NAME", "SURNAME", "GIVEN NAME"],
    addressLabels: ["ADDRESS"],
    issueLabels: ["DATE OF ISSUE", "ISSUED"],
    expiryLabels: ["EXPIRATION DATE", "VALID UNTIL", "VALID THRU", "EXPIRY"],
    idPatterns: [/\b\d{4}[-\s]?\d{7}[-\s]?\d\b/, /\b\d{11,13}\b/],
    expiryPolicy: "optional",
    requiredFields: ["name", "birthday", "gender", "address"],
  },
  DRIVERS_LICENSE: {
    label: ID_TYPE_LABEL.DRIVERS_LICENSE,
    keywords: ["DRIVER'S LICENSE", "DRIVER LICENSE", "LAND TRANSPORTATION OFFICE", "LTO", "NON-PROFESSIONAL DRIVER", "PROFESSIONAL DRIVER"],
    idLabels: ["LICENSE NO", "DL NO", "DRIVER LICENSE NO", "ID NO", "NO"],
    birthLabels: ["DATE OF BIRTH", "BIRTH DATE", "BIRTHDAY"],
    nameLabels: ["NAME", "FULL NAME", "LAST NAME", "FIRST NAME"],
    addressLabels: ["ADDRESS", "UNIT/HOUSE", "STREET NAME"],
    issueLabels: ["DATE OF ISSUE", "ISSUED ON", "ISSUE DATE"],
    expiryLabels: ["EXPIRATION DATE", "VALID UNTIL", "VALID THRU", "EXPIRY"],
    idPatterns: [/\b[A-Z]\d{2}[-\s]?\d{2}[-\s]?\d{6}\b/, /\b[A-Z]\d{7,12}\b/],
    expiryPolicy: "optional",
    requiredFields: ["name", "birthday", "gender", "address"],
  },
  PASSPORT: {
    label: ID_TYPE_LABEL.PASSPORT,
    keywords: ["PASSPORT", "PASAPORTE", "DEPARTMENT OF FOREIGN AFFAIRS", "REPUBLIC OF THE PHILIPPINES", "P<PHL"],
    idLabels: ["PASSPORT NO", "PASSPORT NUMBER", "PASSPORT", "PASAPORTE BLG", "NO"],
    birthLabels: ["DATE OF BIRTH", "BIRTH DATE", "PETSA NG KAPANGANAKAN", "PETSANG KAPANGANAKAN"],
    nameLabels: ["SURNAME", "GIVEN NAMES", "NAME"],
    addressLabels: ["ADDRESS"],
    issueLabels: ["DATE OF ISSUE", "PETSA NG PAGKAKALOOB", "ISSUED ON"],
    expiryLabels: ["DATE OF EXPIRY", "VALID UNTIL", "PETSA NG PAGKAWALANG BISA", "EXPIRATION DATE", "VALID THRU"],
    idPatterns: [/\b[A-Z]\d{7}\b/, /\bP[A-Z0-9]{7,8}\b/],
    expiryPolicy: "optional",
    requiredFields: ["name", "idNumber", "birthday", "gender", "address"],
  },
  POSTAL_ID: {
    label: ID_TYPE_LABEL.POSTAL_ID,
    keywords: ["POSTAL IDENTITY CARD", "POSTAL ID", "PHILPOST", "PHILIPPINE POSTAL CORPORATION"],
    idLabels: ["PRN", "POSTAL REFERENCE NO", "POSTAL ID NO", "POSTAL ID NUMBER", "ID NO", "ID NUMBER"],
    birthLabels: ["DATE OF BIRTH", "BIRTH DATE"],
    nameLabels: ["NAME", "FULL NAME", "SURNAME", "GIVEN NAME"],
    addressLabels: ["ADDRESS"],
    issueLabels: ["DATE OF ISSUE", "ISSUED ON"],
    expiryLabels: ["VALID UNTIL", "VALID THRU", "EXPIRATION DATE", "EXPIRY"],
    idPatterns: [/\bPRN[-\s]?[A-Z0-9]{6,14}\b/, /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, /\b\d{12,15}\b/],
    expiryPolicy: "optional",
    requiredFields: ["name", "idNumber", "birthday", "gender", "address"],
  },
  MANILA_PWD_ID: {
    label: ID_TYPE_LABEL.MANILA_PWD_ID,
    keywords: ["PERSON WITH DISABILITY", "PWD", "TYPE OF DISABILITY", "CITY OF MANILA", "MANILA"],
    idLabels: ["ID NO", "PWD NO", "PWD ID NO", "CONTROL NO", "NO"],
    birthLabels: ["DATE OF BIRTH", "BIRTH DATE"],
    nameLabels: ["NAME", "FULL NAME"],
    addressLabels: ["ADDRESS"],
    issueLabels: ["DATE ISSUED", "DATE OF ISSUE", "ISSUED ON"],
    expiryLabels: ["VALID UNTIL", "EXPIRATION DATE", "VALID THRU"],
    idPatterns: [/\b\d{5,8}\b/, /\bPWD[-\s]?[A-Z0-9-]{5,}\b/],
    expiryPolicy: "optional",
    requiredFields: ["name", "birthday", "gender", "address"],
  },
  MANILA_SENIOR_CITIZEN_ID: {
    label: ID_TYPE_LABEL.MANILA_SENIOR_CITIZEN_ID,
    keywords: ["OFFICE FOR SENIOR CITIZENS AFFAIRS", "SENIOR CITIZEN", "SENIOR ID", "OSCA", "CITY OF MANILA", "MANILA"],
    negativeKeywords: ["PERSON WITH DISABILITY", "PWD"],
    idLabels: ["OSCA ID NO", "OSCA NO", "SENIOR CITIZEN ID NO", "SENIOR ID NO", "ID NO", "CONTROL NO", "NO"],
    birthLabels: ["DATE OF BIRTH", "BIRTH DATE"],
    nameLabels: ["NAME", "FULL NAME"],
    addressLabels: ["ADDRESS"],
    issueLabels: ["DATE ISSUED", "DATE OF ISSUE", "ISSUED ON"],
    expiryLabels: ["VALID UNTIL", "EXPIRATION DATE", "VALID THRU"],
    idPatterns: [/\b(?:OSCA[-\s]?)?\d{2,4}[-\s]?\d{2,4}[-\s]?\d{2,6}\b/, /\b(?:OSCA[-\s]?)?[A-Z0-9]{2,6}[-\s]?\d{4,8}\b/, /\b\d{5,8}\b/],
    expiryPolicy: "optional",
    requiredFields: ["name", "idNumber", "birthday", "gender", "address"],
  },
};

const normalizeYearToken = (year: string) => {
  if (year.length !== 2) return year;
  const currentTwoDigitYear = new Date().getFullYear() % 100;
  const value = Number(year);
  return value > currentTwoDigitYear + 5 ? `19${year}` : `20${year}`;
};

const toYmd = (y: string, m: string, d: string) =>
  `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;

const isRealYmd = (ymd: string) => {
  const match = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

const toValidYmd = (y: string, m: string, d: string) => {
  const ymd = toYmd(y, m, d);
  return isRealYmd(ymd) ? ymd : "";
};

const parseDateTokenToYmd = (token: string): string => {
  const raw = token.trim().toUpperCase().replace(/\./g, "").replace(/\s+/g, " ");
  let m = raw.match(/\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/);
  if (m) return toValidYmd(m[1], m[2], m[3]);
  // Compact YYYYMMDD
  m = raw.match(/\b(19\d{2}|20\d{2})(\d{2})(\d{2})\b/);
  if (m) return toValidYmd(m[1], m[2], m[3]);
  // Compact DDMMYYYY
  m = raw.match(/\b(\d{2})(\d{2})(19\d{2}|20\d{2})\b/);
  if (m) return toValidYmd(m[3], m[2], m[1]);
  m = raw.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (m) {
    const yy = normalizeYearToken(m[3]);
    return toValidYmd(yy, m[1], m[2]);
  }
  m = raw.match(/\b(\d{1,2})\s+([A-Z]{3,9})\s+(\d{2,4})\b/);
  if (m) {
    const months: Record<string, string> = {
      JAN: "01", JANUARY: "01", FEB: "02", FEBRUARY: "02", MAR: "03", MARCH: "03",
      APR: "04", APRIL: "04", MAY: "05", JUN: "06", JUNE: "06", JUL: "07", JULY: "07",
      AUG: "08", AUGUST: "08", SEP: "09", SEPT: "09", SEPTEMBER: "09", OCT: "10",
      OCTOBER: "10", NOV: "11", NOVEMBER: "11", DEC: "12", DECEMBER: "12",
    };
    const yy = normalizeYearToken(m[3]);
    if (months[m[2]]) return toValidYmd(yy, months[m[2]], m[1]);
  }
  m = raw.match(/\b([A-Z]{3,9})\s+(\d{1,2}),?\s+(\d{2,4})\b/);
  if (m) {
    const months: Record<string, string> = {
      JAN: "01", JANUARY: "01", FEB: "02", FEBRUARY: "02", MAR: "03", MARCH: "03",
      APR: "04", APRIL: "04", MAY: "05", JUN: "06", JUNE: "06", JUL: "07", JULY: "07",
      AUG: "08", AUGUST: "08", SEP: "09", SEPT: "09", SEPTEMBER: "09", OCT: "10",
      OCTOBER: "10", NOV: "11", NOVEMBER: "11", DEC: "12", DECEMBER: "12",
    };
    const yy = normalizeYearToken(m[3]);
    if (months[m[1]]) return toValidYmd(yy, months[m[1]], m[2]);
  }
  return "";
};

const isReasonableDob = (ymd: string) => {
  if (!isRealYmd(ymd)) return false;
  const [y] = ymd.split("-").map(Number);
  const currentYear = new Date().getFullYear();
  return y >= 1900 && y <= currentYear;
};

const parseLabeledDate = (text: string, labels: string[]) => {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const inline = text.match(new RegExp(`${escaped}\\s*[:\\-]?\\s*([^\\n]{1,40})`, "i"));
    if (inline?.[1]) {
      const d = parseDateTokenToYmd(inline[1]);
      if (d) return d;
    }
    const nextLine = text.match(new RegExp(`${escaped}\\s*[:\\-]?\\s*\\n\\s*([^\\n]{1,40})`, "i"));
    if (nextLine?.[1]) {
      const d = parseDateTokenToYmd(nextLine[1]);
      if (d) return d;
    }
  }
  return "";
};

const parseAllDateTokens = (text: string) => {
  const tokens = text.match(
    /\b(?:\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+[A-Z]{3,9}\s+\d{2,4}|[A-Z]{3,9}\s+\d{1,2},?\s+\d{2,4})\b/gi
  ) || [];
  return tokens.map(parseDateTokenToYmd).filter(Boolean);
};

const uniqueValues = <T,>(items: T[]) => Array.from(new Set(items.filter(Boolean)));

const getRuleScore = (text: string, rule: IdRule) => {
  const keywordHits = rule.keywords.filter((keyword) => text.includes(keyword)).length;
  const negativeHits = (rule.negativeKeywords || []).filter((keyword) => text.includes(keyword)).length;
  const idLabelHits = rule.idLabels.filter((label) => text.includes(label)).length;
  return keywordHits * 3 + idLabelHits - negativeHits * 4;
};

const detectIdType = (text: string): SupportedIdType | null => {
  const t = text.toUpperCase();
  if ((/\bOFFICE FOR SENIOR CITIZENS AFFAIRS\b|\bSENIOR CITIZEN\b|\bSENIOR ID\b|\bOSCA\b/.test(t)) && !(/\bPWD\b|PERSON WITH DISABILITY/.test(t))) {
    return "MANILA_SENIOR_CITIZEN_ID";
  }
  if (/\bUMID\b|\bUNIFIED\b|\bUNITED\b|\bMULTI-?PURPOSE ID\b|\bCRN\b|\bCOMMON REFERENCE NUMBER\b|\b\d{4}-\d{7}-\d\b/.test(t)) {
    return "UMID";
  }
  if (/\bP<PHL\b|\bPASSPORT\b|\bPASAPORTE\b/.test(t)) {
    return "PASSPORT";
  }
  const ranked = (Object.keys(ID_RULES) as SupportedIdType[])
    .map((idType) => ({ idType, score: getRuleScore(t, ID_RULES[idType]) }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score > 0 ? ranked[0].idType : null;
};

const extractByPatterns = (text: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[0]) return match[0].replace(/\s+/g, "").trim();
  }
  return "";
};

const normalizeIdNumber = (value: string) =>
  value
    .toUpperCase()
    .replace(/\b(?:LICENSE|PASSPORT|NUMBER|NO|ID|CRN|PRN|PWD|OSCA|VALID|UNTIL|DATE|BIRTH)\b/g, " ")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();

const isValidIdNumberForRule = (value: string, rule?: IdRule) => {
  const normalized = normalizeIdNumber(value);
  if (!normalized || normalized.length < 4) return false;
  if (!rule) return /^[A-Z0-9-]{5,}$/.test(normalized);
  return rule.idPatterns.some((pattern) => pattern.test(normalized) || pattern.test(value.toUpperCase()));
};

const parseOcrGender = (text: string): "Male" | "Female" | undefined => {
  const normalized = text.toUpperCase();
  const licenseSexMatch =
    normalized.match(/\bSEX\s+DATE\s+OF\s+BIRTH[\s\S]{0,120}?\b([MF])\s+\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/) ||
    normalized.match(/\bSEX[\s:]+([MF])\b/) ||
    normalized.match(/\b([MF])\s+\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/) ||
    normalized.match(/\b([MF])\s+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/);

  if (licenseSexMatch?.[1] === "F") {
    return "Female";
  }
  if (licenseSexMatch?.[1] === "M") {
    return "Male";
  }

  const labeled = parseOcrField(normalized, ["SEX", "GENDER", "KASARIAN"]);
  const compactLabel = String(labeled || "").trim().toUpperCase();

  if (compactLabel === "F" || compactLabel === "FEMALE") {
    return "Female";
  }
  if (compactLabel === "M" || compactLabel === "MALE") {
    return "Male";
  }

  if (/\b(?:SEX|GENDER|KASARIAN)\s*[:\-]?\s*F(?:\b|[^A-Z])|\bFEMALE\b/.test(normalized)) {
    return "Female";
  }
  if (/\b(?:SEX|GENDER|KASARIAN)\s*[:\-]?\s*M(?:\b|[^A-Z])|\bMALE\b/.test(normalized)) {
    return "Male";
  }

  return undefined;
};

const getDateValidationError = (label: string, ymd?: string) => {
  if (!ymd) return "";
  if (!isRealYmd(ymd)) return `${label} is invalid`;
  const todayYmd = toLocalYmd(new Date());
  if (label === "Date of Birth") {
    if (ymd > todayYmd) return "Date of Birth is invalid";
    const age = Number(calculateAge(ymd));
    if (!Number.isFinite(age) || age < MIN_RESIDENT_AGE || age > MAX_RESIDENT_AGE) return "Date of Birth is invalid";
  }
  if (label === "Issue Date" && ymd > todayYmd) return "Issue Date is invalid";
  return "";
};

const pickLikelyNameLine = (text: string, rule: IdRule) => {
  const lines = getMeaningfulOcrLines(text);
  const blockedWords = uniqueValues([
    ...rule.keywords,
    ...rule.idLabels,
    ...rule.birthLabels,
    ...rule.addressLabels,
    ...rule.issueLabels,
    ...rule.expiryLabels,
    "REPUBLIC OF THE PHILIPPINES",
    "CITY OF MANILA",
    "NATIONALITY",
    "SIGNATURE",
  ]);

  return (
    lines.find((line) => {
      if (!looksLikePersonNameLine(line)) return false;
      if (blockedWords.some((blocked) => line.includes(blocked))) return false;
      const words = line.split(/\s+/).filter(Boolean);
      return words.length >= 2 && words.length <= 6;
    }) || ""
  );
};

const parseNameParts = (fullName: string) => {
  const cleaned = sanitizeNameField(fullName);
  if (!cleaned) return { firstName: "", middleName: "", lastName: "" };

  if (cleaned.includes(",")) {
    const [lastName, firstAndMiddle, explicitMiddle] = cleaned.split(",").map(sanitizeNameField);
    const words = (firstAndMiddle || "").split(/\s+/).filter(Boolean);
    return {
      firstName: explicitMiddle ? firstAndMiddle : sanitizeNameField(words.length > 2 ? words.slice(0, -1).join(" ") : firstAndMiddle),
      middleName: explicitMiddle || sanitizeNameField(words.length > 2 ? words[words.length - 1] : ""),
      lastName,
    };
  }

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 3) {
    return {
      firstName: sanitizeNameField(words.slice(0, -1).join(" ")),
      middleName: "",
      lastName: sanitizeNameField(words[words.length - 1]),
    };
  }

  return { firstName: cleaned, middleName: "", lastName: "" };
};

const parsePassportMrzName = (text: string) => {
  const line = String(text || "").split(/\r?\n/).find((l) => l.includes("P<PHL"));
  if (!line) return { firstName: "", middleName: "", lastName: "" };
  const cleaned = line.replace(/\s+/g, "");
  const payload = cleaned.replace(/^P<PHL/, "");
  const [rawLast, rawGiven = ""] = payload.split("<<");
  const lastName = sanitizeNameField(rawLast.replace(/</g, " "));
  const givenParts = rawGiven.replace(/<+/g, " ").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: sanitizeNameField(givenParts.join(" ")),
    middleName: "",
    lastName,
  };
};

const parsePassportMrzData = (text: string) => {
  const lines = String(text || "").toUpperCase().split(/\r?\n/).map((l) => l.replace(/\s+/g, "").trim()).filter(Boolean);
  const mrzCandidates = lines.filter((l) => /^[A-Z0-9<]{30,}$/.test(l));
  const l1 = mrzCandidates.find((l) => l.startsWith("P<"));
  const l2 = mrzCandidates.find((l) => /PHL/.test(l) && /[0-9O]{6}[MF<][0-9O]{6}/.test(l));
  console.debug("[PassportDOB] MRZ lines detected:", mrzCandidates.length);
  console.debug("[PassportDOB] MRZ raw line1:", l1 || "none");
  console.debug("[PassportDOB] MRZ raw line2:", l2 || "none");
  const out: {
    firstName: string;
    middleName: string;
    lastName: string;
    birthday: string;
    expirationDate: string;
gender?: "Male" | "Female" | "Unknown";
    idNumber: string;
  } = { firstName: "", middleName: "", lastName: "", birthday: "", expirationDate: "", idNumber: "" };

  if (l1) {
    const payload = l1.replace(/^P<PHL/, "");
    const [rawLast, rawGiven = ""] = payload.split("<<");
    out.lastName = sanitizeNameField(rawLast.replace(/</g, " "));
    const givenParts = rawGiven.replace(/<+/g, " ").trim().split(/\s+/).filter(Boolean);
    out.firstName = sanitizeNameField(givenParts.join(" "));
    out.middleName = "";
  }

  if (l2) {
    const compact = l2.replace(/\s+/g, "");
    const passMatch = compact.match(/^[A-Z0-9<]{1,10}/);
    if (passMatch?.[0]) {
      out.idNumber = normalizeIdNumber(passMatch[0].replace(/</g, ""));
    }
    const normalizedCompact = compact.replace(/O/g, "0").replace(/I/g, "1");
    // TD3 passport line 2 fixed-field parsing:
    // 1-9 passport number, 10 check, 11-13 nationality, 14-19 DOB, 20 sex, 21-26 expiry
    const dobYYMMDD = normalizedCompact.slice(13, 19);
    const sexCharByIndex = normalizedCompact.slice(20 - 1, 20);
    const expYYMMDDByIndex = normalizedCompact.slice(21 - 1, 26);
    console.debug("[PassportDOB] MRZ extracted DOB substring:", dobYYMMDD || "none");
    if (/^\d{6}$/.test(dobYYMMDD)) {
      const by = normalizeYearToken(dobYYMMDD.slice(0, 2));
      const bm = dobYYMMDD.slice(2, 4);
      const bd = dobYYMMDD.slice(4, 6);
      out.birthday = toValidYmd(by, bm, bd);
      console.debug("[PassportDOB] Parsed MRZ DOB:", out.birthday || "invalid");
    } else {
      console.debug("[PassportDOB] MRZ DOB parse failed: invalid substring format");
    }
    const expYYMMDDByPattern =
      normalizedCompact.match(/\d{6}[MFX<](\d{6})/)?.[1] ||
      normalizedCompact.match(/PHL\d{6}[MFX<](\d{6})/)?.[1] ||
      "";
    const expYYMMDD = expYYMMDDByPattern || expYYMMDDByIndex;
    console.debug("[PassportExpiry] raw MRZ line 2:", compact || "none");
    console.debug("[PassportExpiry] extracted expiry substring (index):", expYYMMDDByIndex || "none");
    console.debug("[PassportExpiry] extracted expiry substring (pattern):", expYYMMDDByPattern || "none");
    console.debug("[PassportExpiry] extracted expiry substring (final):", expYYMMDD || "none");
    if (/^\d{6}$/.test(expYYMMDD)) {
      const yy = Number(expYYMMDD.slice(0, 2));
      const ey = yy <= 79 ? `20${expYYMMDD.slice(0, 2)}` : `19${expYYMMDD.slice(0, 2)}`;
      const em = expYYMMDD.slice(2, 4);
      const ed = expYYMMDD.slice(4, 6);
      out.expirationDate = toValidYmd(ey, em, ed);
      console.debug("[PassportExpiry] parsed expiration date result:", out.expirationDate || "invalid");
      if (!out.expirationDate) {
        console.debug("[PassportExpiry] MRZ expiry parsing failed: invalid month/day");
      }
    } else {
      console.debug("[PassportExpiry] MRZ expiry parsing failed: invalid substring format");
    }
    // Robust MRZ parse: ... YYMMDD + SEX + YYMMDD ...
    const sexFromPattern =
      normalizedCompact.match(/\d{6}([MFX<])\d{6}/)?.[1] ||
      normalizedCompact.match(/PHL\d{6}([MFX<])\d{6}/)?.[1] ||
      "";
    const sexChar = sexFromPattern || sexCharByIndex;
    out.gender = sexChar === "F" ? "Female" : sexChar === "M" ? "Male" : sexChar === "X" || sexChar === "<" ? "Unknown" : undefined;
    console.debug("[PassportGender] raw MRZ line 2:", compact || "none");
    console.debug("[PassportGender] extracted gender character (index):", sexCharByIndex || "none");
    console.debug("[PassportGender] extracted gender character (pattern):", sexFromPattern || "none");
    console.debug("[PassportGender] extracted gender character (final):", sexChar || "none");
    console.debug("[PassportGender] normalized gender result:", out.gender || "none");
  } else {
    console.debug("[PassportDOB] MRZ not detected: no valid line 2 candidate");
  }

  return out;
};

const parsePassportStrictFields = (text: string) => {
  const upper = String(text || "").toUpperCase();
  const blocked = ["REPUBLIKA", "REPUBLIC", "PASSPORT", "PASAPORTE", "NATIONALITY", "DEPARTMENT", "FOREIGN", "AFFAIRS"];
  const clean = (v: string) => {
    const c = sanitizeNameField(v || "");
    if (!c) return "";
    if (blocked.some((b) => c.includes(b))) return "";
    return c;
  };
  const lastName = clean(parseOcrField(upper, ["APELYIDO/SURNAME", "SURNAME", "APELLIDO", "LAST NAME", "APELYIDO"]) || "");
  const firstName = clean(parseOcrField(upper, ["PANGALAN/GIVEN NAMES", "GIVEN NAMES", "FIRST NAME", "PANGALAN", "GIVEN NAME"]) || "");
  const middleName = clean(parseOcrField(upper, ["PANGGITNANG APELYIDO/MIDDLE NAME", "MIDDLE NAME", "MIDDLE NAMES", "GITNANG PANGALAN"]) || "");
  let birthday = parseLabeledDate(upper, [
    "PETSA NG KAPANGANAKAN/DATE OF BIRTH",
    "DATE OF BIRTH",
    "DATEOFBIRTH",
    "BIRTH DATE",
    "BIRTHDATE",
    "PETSA NG KAPANGANAKAN",
    "DOB",
    "BIRTHDAY",
  ]);
  if (!birthday) {
    const dobLine =
      upper.match(/\b(?:DATE\s*OF\s*BIRTH|DATEOFBIRTH|BIRTH\s*DATE|BIRTHDATE|DOB|BIRTHDAY)\b[^\n]{0,80}/)?.[0] ||
      upper.match(/\b(?:PETSA\s*NG\s*KAPANGANAKAN)\b[^\n]{0,80}/)?.[0] ||
      "";
    const extracted = dobLine.replace(/\b(?:DATE\s*OF\s*BIRTH|DATEOFBIRTH|BIRTH\s*DATE|BIRTHDATE|DOB|BIRTHDAY|PETSA\s*NG\s*KAPANGANAKAN)\b[:\-\s]*/g, "").trim();
    const direct = parseDateTokenToYmd(extracted);
    if (direct) {
      birthday = direct;
    } else {
      const fallbackToken =
        extracted.match(/\b(?:\d{1,2}\s+[A-Z]{3,9}\s+\d{4}|[A-Z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/)?.[0] || "";
      birthday = parseDateTokenToYmd(fallbackToken);
      if (!birthday) {
        const allDates = parseAllDateTokens(extracted);
        birthday = allDates.find(isReasonableDob) || "";
      }
    }
  }
  if (birthday && !isReasonableDob(birthday)) birthday = "";
  const expirationDate = parseLabeledDate(upper, [
    "PETSA NG PAGKAWALANG BISA/VALID UNTIL",
    "PETSA NG PAGKAWALANG-BISA",
    "DATE OF EXPIRY",
    "EXPIRY DATE",
    "EXPIRATION DATE",
    "VALID UNTIL",
    "VALID THRU",
  ]);
  const issueDate = parseLabeledDate(upper, ["PETSA NG PAGKAKALOOB/DATE OF ISSUE", "DATE OF ISSUE", "ISSUED ON", "ISSUE DATE"]);
  const sexRaw = (parseOcrField(upper, ["KASARIAN/SEX", "SEX", "KASARIAN"]) || "").trim().toUpperCase();
  const gender = sexRaw === "F" || sexRaw === "FEMALE" ? "Female" : sexRaw === "M" || sexRaw === "MALE" ? "Male" : undefined;
  return { firstName, middleName, lastName, birthday, expirationDate, issueDate, gender };
};

const parseSeniorStrictFields = (text: string) => {
  const upper = String(text || "").toUpperCase();
  const name = sanitizeNameField(parseOcrField(upper, ["NAME", "FULL NAME", "COMPLETE NAME", "SENIOR CITIZEN NAME"]) || "");
  const address = sanitizeAddressField(parseOcrField(upper, ["ADDRESS", "CITY/MUNICIPALITY", "TIRAHAN"]) || "");
  const birthday = parseLabeledDate(upper, ["DATE OF BIRTH", "BIRTH DATE", "PETSA NG KAPANGANAKAN", "BIRTHDAY"]);
  const idNumber = normalizeIdNumber(parseOcrField(upper, ["ID NO", "ID. NO", "OSCA ID NO", "SENIOR CITIZEN ID NO", "OSCA NO", "CONTROL NO"]) || "");
  return { name, address, birthday, idNumber };
};

const parsePhilSysNameParts = (text: string) => {
  const upper = String(text || "").toUpperCase();
  const lines = upper
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const forbidden = [
    "PAMBANSANG",
    "PAGKAKAKILANLAN",
    "PHILIPPINE IDENTIFICATION CARD",
    "REPUBLIKA",
    "REPUBLIC",
    "CITY",
    "MANILA",
    "BRGY",
    "BARANGAY",
    "ZONE",
    "ADDRESS",
    "TIRAHAN",
    "KAPANGANAKAN",
    "BIRTH",
  ];
  const badLine = (value: string) =>
    !value ||
    forbidden.some((w) => value.includes(w)) ||
    value.split(/\s+/).length > 4 ||
    /[^A-Z\s.'-]/.test(value);

  const pickAfterLabel = (labelPatterns: RegExp[]) => {
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!labelPatterns.some((re) => re.test(line))) continue;

      const inline = line
        .replace(/.*(?:APELYIDO\/LAST NAME|MGA PANGALAN\/GIVEN NAMES|GITNANG APELYIDO\/MIDDLE NAME|APELYIDO|LAST NAME|MGA PANGALAN|GIVEN NAMES|GIVEN NAME|GITNANG APELYIDO|MIDDLE NAME)\s*[:\-]?\s*/i, "")
        .trim();
      if (inline && !badLine(inline)) return inline;

      const next = (lines[i + 1] || "").trim();
      if (next && !badLine(next)) return next;
    }
    return "";
  };

  const lastName = pickAfterLabel([/APELYIDO\/LAST NAME/, /\bAPELYIDO\b/, /\bLAST NAME\b/]);
  const firstName = pickAfterLabel([/MGA PANGALAN\/GIVEN NAMES/, /\bMGA PANGALAN\b/, /\bGIVEN NAMES\b/, /\bGIVEN NAME\b/]);
  const middleName = pickAfterLabel([/GITNANG APELYIDO\/MIDDLE NAME/, /\bGITNANG APELYIDO\b/, /\bMIDDLE NAME\b/]);
  return {
    firstName: sanitizeNameField(firstName),
    middleName: sanitizeNameField(middleName),
    lastName: sanitizeNameField(lastName),
  };
};

const parsePhilSysNameFromBlocks = (text: string) => {
  const src = String(text || "").toUpperCase().replace(/\r/g, "");
  const forbidden = [
    "PAMBANSANG",
    "PAGKAKAKILANLAN",
    "PHILIPPINE IDENTIFICATION CARD",
    "REPUBLIKA",
    "REPUBLIC",
    "ADDRESS",
    "TIRAHAN",
    "BRGY",
    "BARANGAY",
    "ZONE",
    "MANILA",
    "KAPANGANAKAN",
    "BIRTH",
  ];
  const clean = (v: string) =>
    sanitizeNameField(
      String(v || "")
        .replace(/\n+/g, " ")
        .replace(/\s{2,}/g, " ")
        .replace(/[^A-Z\s.'-]/g, " ")
        .trim()
    );
  const validPersonChunk = (v: string) => {
    const t = clean(v);
    if (!t) return "";
    if (forbidden.some((w) => t.includes(w))) return "";
    if (t.split(/\s+/).length > 4) return "";
    return t;
  };

  const capture = (start: RegExp, stop: RegExp[]) => {
    const m = src.match(start);
    if (!m || m.index == null) return "";
    const from = m.index + m[0].length;
    const tail = src.slice(from);
    let end = tail.length;
    for (const s of stop) {
      const sm = tail.match(s);
      if (sm && sm.index != null) end = Math.min(end, sm.index);
    }
    return validPersonChunk(tail.slice(0, end));
  };

  const lastName = capture(
    /(APELYIDO\/LAST NAME|APELYIDO|LAST NAME)\s*[:\-]?\s*/i,
    [/(MGA PANGALAN\/GIVEN NAMES|MGA PANGALAN|GIVEN NAMES|GIVEN NAME)/i]
  );
  const firstName = capture(
    /(MGA PANGALAN\/GIVEN NAMES|MGA PANGALAN|GIVEN NAMES|GIVEN NAME)\s*[:\-]?\s*/i,
    [/(GITNANG APELYIDO\/MIDDLE NAME|GITNANG APELYIDO|MIDDLE NAME|PETSA NG KAPANGANAKAN|DATE OF BIRTH)/i]
  );
  const middleName = capture(
    /(GITNANG APELYIDO\/MIDDLE NAME|GITNANG APELYIDO|MIDDLE NAME)\s*[:\-]?\s*/i,
    [/(PETSA NG KAPANGANAKAN|DATE OF BIRTH|TIRAHAN|ADDRESS)/i]
  );

  return { firstName, middleName, lastName };
};

const parsePhilSysStrictFields = (text: string) => {
  const upper = String(text || "").toUpperCase();
  const lines = upper.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);

  const blockedTokens = [
    "REPUBLIKA",
    "REPUBLIC",
    "PAMBANSANG",
    "PAGKAKAKILANLAN",
    "PHILIPPINE IDENTIFICATION CARD",
  ];

  const cleanName = (v: string) =>
    sanitizeNameField(String(v || "").replace(/[^A-Z\s.'-]/g, " ").replace(/\s{2,}/g, " ").trim());

  const cleanAddress = (v: string) =>
    sanitizeAddressField(String(v || "").replace(/\s{2,}/g, " ").trim());
  const looksLikeBrokenBirthLabel = (v: string) =>
    /(KAPANGANAKAN|DATE OF BIRTH|BIRTH DATE|PETSA NG|PETSANG)/i.test(String(v || ""));

  const isLabelLine = (line: string) =>
    /(APELYIDO\/LAST NAME|MGA PANGALAN\/GIVEN NAMES|GITNANG APELYIDO\/MIDDLE NAME|PETSA NG KAPANGANAKAN\/DATE OF BIRTH|TIRAHAN\/ADDRESS|APELYIDO|LAST NAME|MGA PANGALAN|GIVEN NAMES|GITNANG APELYIDO|MIDDLE NAME|DATE OF BIRTH|PETSA NG KAPANGANAKAN|ADDRESS|TIRAHAN)/i.test(line);

  const captureLabelValue = (labels: RegExp[], stopLabels: RegExp[]) => {
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!labels.some((re) => re.test(line))) continue;
      const parts: string[] = [];
      for (let j = i + 1; j < lines.length; j += 1) {
        const next = lines[j];
        if (stopLabels.some((re) => re.test(next))) break;
        if (isLabelLine(next)) break;
        if (blockedTokens.some((t) => next.includes(t))) continue;
        parts.push(next);
      }
      if (parts.length > 0) {
        const merged = parts.join(" ").trim();
        if (labels.some((re) => /KAPANGANAKAN|DATE OF BIRTH|BIRTH DATE/i.test(String(re))) && looksLikeBrokenBirthLabel(merged)) {
          continue;
        }
        return merged;
      }
    }
    return "";
  };

  const lastNameRaw = captureLabelValue(
    [/APELYIDO\/LAST NAME/i, /\bAPELYIDO\b/i, /\bLAST NAME\b/i],
    [/MGA PANGALAN\/GIVEN NAMES/i, /\bMGA PANGALAN\b/i, /\bGIVEN NAMES\b/i]
  );
  const firstNameRaw = captureLabelValue(
    [/MGA PANGALAN\/GIVEN NAMES/i, /\bMGA PANGALAN\b/i, /\bGIVEN NAMES\b/i],
    [/GITNANG APELYIDO\/MIDDLE NAME/i, /\bGITNANG APELYIDO\b/i, /\bMIDDLE NAME\b/i]
  );
  const middleNameRaw = captureLabelValue(
    [/GITNANG APELYIDO\/MIDDLE NAME/i, /\bGITNANG APELYIDO\b/i, /\bMIDDLE NAME\b/i],
    [/PETSA NG KAPANGANAKAN\/DATE OF BIRTH/i, /\bPETSA NG KAPANGANAKAN\b/i, /\bDATE OF BIRTH\b/i]
  );
  const birthdayRaw = captureLabelValue(
    [/PETSA NG KAPANGANAKAN\/DATE OF BIRTH/i, /\bPETSA NG KAPANGANAKAN\b/i, /\bDATE OF BIRTH\b/i],
    [/TIRAHAN\/ADDRESS/i, /\bTIRAHAN\b/i, /\bADDRESS\b/i]
  );
  const addressRaw = captureLabelValue(
    [/TIRAHAN\/ADDRESS/i, /\bTIRAHAN\b/i, /\bADDRESS\b/i],
    [/^\s*$/]
  );

  const lastName = cleanName(lastNameRaw);
  const firstName = cleanName(firstNameRaw);
  const middleName = cleanName(middleNameRaw);
  const birthday = looksLikeBrokenBirthLabel(birthdayRaw) ? "" : parseDateTokenToYmd(birthdayRaw);
  const address = cleanAddress(addressRaw);

  const hasBlocked = (v: string) => blockedTokens.some((t) => v.includes(t));
  return {
    firstName: hasBlocked(firstName) ? "" : firstName,
    middleName: hasBlocked(middleName) ? "" : middleName,
    lastName: hasBlocked(lastName) ? "" : lastName,
    birthday,
    address: hasBlocked(address) ? "" : address,
  };
};

const parseUmidStrictFields = (text: string) => {
  const upper = String(text || "").toUpperCase();
  const lines = upper.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  console.debug("[UMID Parser] raw OCR boxes (line flow):", lines);

  const dedupe = (values: string[]) => Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
  const isHeaderLike = (v: string) => /\b(REPUBLIC|PHILIPPINES?|UNIFIED|UNITED|MULTI|PURPOSE|UMID|CRN|COMMON REFERENCE NUMBER)\b/.test(v);
  const isLabelLike = (v: string) => /\b(NAME|SURNAME|GIVEN NAME|MIDDLE NAME|ADDRESS|DATE OF BIRTH|BIRTH DATE|DOB|SEX|GENDER)\b/.test(v);
  const isNameToken = (v: string) => /^[A-Z ]{2,40}$/.test(v) && !/\d/.test(v) && !isHeaderLike(v) && !isLabelLike(v);

  const n = lines.length || 1;
  const headerEnd = Math.floor(n * 0.24);
  const nameEnd = Math.floor(n * 0.60);
  const detailEnd = Math.floor(n * 0.78);
  const nameRegion = lines.slice(headerEnd, nameEnd);
  const detailRegion = lines.slice(Math.max(headerEnd, nameEnd - 2), Math.min(n, detailEnd + 2));
  const addressRegion = lines.slice(Math.max(0, detailEnd - 1));

  const nameCandidates = dedupe(
    nameRegion
      .map((v) => sanitizeNameField(v))
      .filter((v) => isNameToken(v))
      .filter((v) => v.length >= 2 && v.length <= 20),
  );
  console.debug("[UMID Parser] detected name candidates:", nameCandidates);
  const selectedNameLines = nameCandidates.slice(0, 4);
  console.debug("[UMID Parser] selected name lines:", selectedNameLines);

  let lastName = "";
  let firstName = "";
  let middleName = "";
  if (selectedNameLines.length >= 3) {
    lastName = selectedNameLines[0];
    firstName = selectedNameLines[1];
    middleName = selectedNameLines[2];
  } else if (selectedNameLines.length === 2) {
    lastName = selectedNameLines[0];
    firstName = selectedNameLines[1];
  }

  let birthday = parseLabeledDate(upper, ["DATE OF BIRTH", "BIRTH DATE", "DOB"]);
  if (!birthday) {
    const dobHint = detailRegion.find((v) => /\b(DATE OF BIRTH|BIRTH DATE|DOB)\b/.test(v)) || "";
    if (dobHint) {
      const dobInline = parseDateTokenToYmd(dobHint);
      if (dobInline) birthday = dobInline;
    }
  }

  const gender = (() => {
    const joined = detailRegion.join(" ");
    if (/\bSEX\b|\bGENDER\b/.test(joined)) {
      if (/\bFEMALE\b|\bF\b/.test(joined)) return "Female" as const;
      if (/\bMALE\b|\bM\b/.test(joined)) return "Male" as const;
    }
    return undefined;
  })();

  const addressLines = dedupe(
    addressRegion
      .map((v) => sanitizeAddressField(v))
      .filter(Boolean)
      .filter((v) => !isHeaderLike(v))
      .filter((v) => !isLabelLike(v))
      .filter((v) => !/\bCRN\b|\bCOMMON REFERENCE NUMBER\b/.test(v))
      .filter((v) => !/\d{4}[-\s]?\d{7}[-\s]?\d\b/.test(v))
      .slice(-4),
  );
  console.debug("[UMID Parser] grouped address lines:", addressLines);

  const address = sanitizeAddressField(addressLines.join(" "));
  const parsed = { lastName, firstName, middleName, birthday, gender, address };
  console.debug("[UMID Parser] detected gender:", gender || "none");
  console.debug("[UMID Parser] final parsed object:", parsed);
  return parsed;
};

const parsePostalStrictFields = (text: string) => {
  const upper = String(text || "").toUpperCase()
    .replace(/\bSUMAME\b/g, "SURNAME")
    .replace(/\bPHILIPPNE\b/g, "PHILIPPINE")
    .replace(/\bMIDDIE\b/g, "MIDDLE")
    .replace(/\bNANE\b/g, "NAME")
    .replace(/\bBIRTHOAY\b/g, "BIRTHDAY");
  const lines = upper.split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
  const orderedLines = lines.map((textLine, idx) => ({ text: textLine, idx }));
  const normalizeCandidate = (v: string) =>
    String(v || "")
      .toUpperCase()
      .replace(/[.,;:_\-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const fingerprint = (v: string) => normalizeCandidate(v).replace(/\b(JR|SR|II|III|IV)\b/g, "").trim();
  const blocked = /\b(PHILIPPINE|MIDDLE NAME|SURNAME|SUFFIX|GIVEN NAME|FIRST NAME|LAST NAME|POSTAL ID|POSTAL IDENTITY CARD|PHLPOST|REPUBLIC OF THE PHILIPPINES|NAME)\b/;
  const blockedAsValue = /\b(PHILIPPINE|REPUBLIC OF THE PHILIPPINES|POSTAL ID|POSTAL IDENTITY CARD|PHLPOST|FIRST NAME|MIDDLE NAME|SURNAME|SUFFIX|NAME|DATE|ADDRESS|VALID|EXPIRY|EXPIRATION)\b/;
  const cleanVal = (v: string) => sanitizeNameField(v.replace(/[:\-]+/g, " ").trim());
  const splitPostalNameWithCompoundSurname = (value: string) => {
    const tokens = normalizeCandidate(value).split(" ").filter(Boolean);
    if (tokens.length === 0) return { firstName: "", middleName: "", lastName: "" };
    if (tokens.length === 1) return { firstName: tokens[0], middleName: "", lastName: "" };
    if (tokens.length === 2) return { firstName: tokens[0], middleName: "", lastName: tokens[1] };

    const n = tokens.length;
    const join = (from: number, to: number) => tokens.slice(from, to).join(" ");

    // Filipino compound surnames: DELA CRUZ, DE LA ROSA, DE LOS SANTOS, DE LAS ...
    if (n >= 3 && tokens[n - 2] === "DELA") {
      return { firstName: tokens[0], middleName: join(1, n - 2), lastName: join(n - 2, n) };
    }
    if (n >= 4 && tokens[n - 3] === "DE" && (tokens[n - 2] === "LA" || tokens[n - 2] === "LOS" || tokens[n - 2] === "LAS")) {
      return { firstName: tokens[0], middleName: join(1, n - 3), lastName: join(n - 3, n) };
    }
    if (n >= 3 && ["DE", "DEL", "SAN", "SANTA", "SANTO"].includes(tokens[n - 2])) {
      return { firstName: tokens[0], middleName: join(1, n - 2), lastName: join(n - 2, n) };
    }

    // Fallback: first token as firstName, last token as surname.
    return { firstName: tokens[0], middleName: join(1, n - 1), lastName: tokens[n - 1] };
  };
  const nearestValueByLabel = (re: RegExp, stopRe?: RegExp) => {
    for (let i = 0; i < orderedLines.length; i += 1) {
      const ln = orderedLines[i].text;
      if (!re.test(ln)) continue;
      const inline = cleanVal(ln.replace(re, "").replace(/^[:\s\-]+/, ""));
      if (inline && !blocked.test(inline) && !blockedAsValue.test(inline)) return inline;
      for (let j = i + 1; j < Math.min(orderedLines.length, i + 5); j += 1) {
        const raw = orderedLines[j].text;
        if (stopRe && stopRe.test(raw)) break;
        const cand = cleanVal(raw);
        if (!cand || blocked.test(cand) || blockedAsValue.test(cand)) continue;
        if (/\b(ADDRESS|DATE OF BIRTH|BIRTH DATE|VALID|EXPIRY|EXPIRATION|SEX|GENDER|POSTAL REFERENCE|ID NO)\b/.test(cand)) break;
        return cand;
      }
    }
    return "";
  };

  const firstNameByLabel = nearestValueByLabel(/\b(FIRST NAME|GIVEN NAME)\b/, /\b(MIDDLE NAME|SURNAME|LAST NAME|SUFFIX|ADDRESS|DATE OF BIRTH)\b/);
  const middleNameByLabel = nearestValueByLabel(/\bMIDDLE NAME\b/, /\b(SURNAME|LAST NAME|SUFFIX|ADDRESS|DATE OF BIRTH)\b/);
  const lastNameByLabel = nearestValueByLabel(/\b(SURNAME|LAST NAME|APELLIDO)\b/, /\b(SUFFIX|ADDRESS|DATE OF BIRTH)\b/);

  const nameCandidatesRaw: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const ln = lines[i];
    if (/\b(FIRST NAME|GIVEN NAME|MIDDLE NAME|SURNAME|LAST NAME|APELLIDO)\b/.test(ln)) {
      const inline = cleanVal(ln.replace(/\b(FIRST NAME|GIVEN NAME|MIDDLE NAME|SURNAME|LAST NAME|APELLIDO)\b/g, "").replace(/^[:\s\-]+/, ""));
      if (inline) nameCandidatesRaw.push(inline);
      for (let j = i + 1; j < Math.min(lines.length, i + 4); j += 1) {
        const cand = cleanVal(lines[j]);
        if (!cand) continue;
        if (blocked.test(cand)) continue;
        if (/\b(ADDRESS|DATE|VALID|EXPIRY|EXPIRATION|SEX|GENDER|PHLPOST|POSTAL)\b/.test(cand)) break;
        nameCandidatesRaw.push(cand);
      }
    }
  }
  if (firstNameByLabel || middleNameByLabel || lastNameByLabel) {
    nameCandidatesRaw.push([firstNameByLabel, middleNameByLabel, lastNameByLabel].filter(Boolean).join(" ").trim());
  }

  const seen = new Set<string>();
  const deduped = nameCandidatesRaw
    .map((c) => cleanVal(c))
    .filter((c) => !!c && !blocked.test(c))
    .filter((c) => {
      const f = fingerprint(c);
      if (!f) return false;
      if (seen.has(f)) return false;
      seen.add(f);
      return true;
    });

  const best = deduped
    .filter((c) => !/\b(POSTAL|PHILIPPINE|NAME|SURNAME|MIDDLE|SUFFIX|ADDRESS|DATE|VALID|PHLPOST)\b/.test(c))
    .sort((a, b) => b.length - a.length)[0] || "";

  const fallbackLikelyName =
    lines
      .map((v) => cleanVal(v))
      .filter((v) => !!v && !blocked.test(v))
      .filter((v) => !/\b(POSTAL|PHILIPPINE|PHLPOST|REPUBLIC|IDENTITY|CARD|ADDRESS|DATE|VALID|EXPIRY|EXPIRATION|SEX|GENDER|CRN)\b/.test(v))
      .filter((v) => /^[A-Z][A-Z\s.'-]{2,}$/.test(v))
      .filter((v) => !/\d/.test(v))
      .sort((a, b) => b.length - a.length)[0] || "";

  const fullName = sanitizeNameField(
    best || fallbackLikelyName || [firstNameByLabel, middleNameByLabel, lastNameByLabel].filter(Boolean).join(" ").trim()
  );
  const compoundSplit = splitPostalNameWithCompoundSurname(fullName);
  const resolvedFirstName = sanitizeNameField(firstNameByLabel || compoundSplit.firstName);
  const resolvedMiddleName = sanitizeNameField(middleNameByLabel || compoundSplit.middleName);
  const resolvedLastName = sanitizeNameField(lastNameByLabel || compoundSplit.lastName);
  const resolvedFullName = sanitizeNameField(
    [resolvedFirstName, resolvedMiddleName, resolvedLastName].filter(Boolean).join(" ").replace(/\s+/g, " ").trim()
  );

  const sexRaw = (nearestValueByLabel(/\b(SEX|GENDER)\b/, /\b(ADDRESS|DATE OF BIRTH|VALID|EXPIRY|EXPIRATION)\b/) || "").trim().toUpperCase();
  const gender =
    sexRaw === "F" || sexRaw === "FEMALE" ? "Female" :
    sexRaw === "M" || sexRaw === "MALE" ? "Male" :
    undefined;
  const expirationRaw = nearestValueByLabel(/\b(VALID UNTIL|VALID THRU|EXPIRY DATE|EXPIRATION DATE|DATE OF EXPIRY|EXPIRY)\b/);
  const expirationDate = parseDateTokenToYmd(expirationRaw) || parseLabeledDate(upper, ["VALID UNTIL", "VALID THRU", "EXPIRY DATE", "EXPIRATION DATE", "DATE OF EXPIRY", "EXPIRY"]);
  const birthdayRaw = nearestValueByLabel(/\b(DATE OF BIRTH|BIRTH DATE|DOB|BIRTHDAY|PETSA NG KAPANGANAKAN)\b/);
  const birthday = parseDateTokenToYmd(birthdayRaw) || parseLabeledDate(upper, ["DATE OF BIRTH", "BIRTH DATE", "DOB", "BIRTHDAY", "PETSA NG KAPANGANAKAN"]);
  const addressFromLabel = (() => {
    const chunks: string[] = [];
    for (let i = 0; i < orderedLines.length; i += 1) {
      const ln = orderedLines[i].text;
      if (!/\b(ADDRESS|TIRAHAN)\b/.test(ln)) continue;
      const inline = sanitizeAddressField(ln.replace(/.*\b(ADDRESS|TIRAHAN)\b[:\-\s]*/g, "").trim());
      if (inline && !blockedAsValue.test(inline)) chunks.push(inline);
      for (let j = i + 1; j < Math.min(orderedLines.length, i + 6); j += 1) {
        const nxt = orderedLines[j].text;
        if (/\b(DATE OF BIRTH|BIRTH DATE|DOB|SEX|GENDER|VALID|EXPIRY|EXPIRATION|POSTAL REFERENCE|ID NO)\b/.test(nxt)) break;
        const c = sanitizeAddressField(nxt);
        if (!c || blockedAsValue.test(c)) continue;
        chunks.push(c);
      }
      break;
    }
    return sanitizeAddressField(Array.from(new Set(chunks)).join(" "));
  })();
  const addressRaw = parseOcrField(upper, ["ADDRESS", "TIRAHAN", "CITY/MUNICIPALITY", "CITY"]) || "";
  const address = sanitizeAddressField(addressFromLabel || addressRaw.replace(/\b(ADDRESS|TIRAHAN|CITY\/MUNICIPALITY|CITY)\b[:\-\s]*/g, "").trim());

  const dedupeNameString = (v: string) => {
    const parts = String(v || "").split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length <= 1) return v;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of parts) {
      const k = p.replace(/\s+/g, " ").toUpperCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(p);
    }
    return out.join(", ");
  };
  const finalFullName = dedupeNameString(resolvedFullName);

  console.debug("[PostalID] raw OCR boxes/lines", orderedLines);
  console.debug("[PostalID] detected label-value pairs", {
    firstNameByLabel,
    middleNameByLabel,
    lastNameByLabel,
    birthdayRaw,
    sexRaw,
    expirationRaw,
    addressFromLabel,
  });
  console.debug("[PostalID] candidate name lines", {
    raw: nameCandidatesRaw,
    deduped,
    firstName: resolvedFirstName,
    middleName: resolvedMiddleName,
    lastName: resolvedLastName,
    fullName,
    fallbackLikelyName,
    resolvedFirstName,
    resolvedMiddleName,
    resolvedLastName,
    resolvedFullName: finalFullName,
  });
  console.debug("[PostalID] detected gender", gender || "none");
  console.debug("[PostalID] detected expirationDate", expirationDate || "none");
  console.debug("[PostalID] detected address", address || "none");
  const missingPostal = [
    !finalFullName ? "name" : "",
    !birthday ? "birthday" : "",
    !address ? "address" : "",
  ].filter(Boolean);
  console.debug("[PostalID] missing required fields", missingPostal);

  return {
    firstName: resolvedFirstName,
    middleName: resolvedMiddleName,
    lastName: resolvedLastName,
    fullName: finalFullName,
    birthday,
    address,
    gender,
    expirationDate,
  };
};

const parseManilaPwdIdStrictFields = (text: string) => {
  const upper = String(text || "").toUpperCase();
  const get = (labels: string[]) => sanitizeNameField(parseOcrField(upper, labels) || "");
  const name = get(["NAME", "FULL NAME", "COMPLETE NAME"]);
  return {
    name,
    firstName: "", // PWD ID uses full name instead of separate parts
    middleName: "",
    lastName: "",
    birthday: parseLabeledDate(upper, ["DATE OF BIRTH", "BIRTH DATE", "PETSA NG KAPANGANAKAN"]),
    address: sanitizeAddressField(parseOcrField(upper, ["ADDRESS", "TIRAHAN", "CITY/MUNICIPALITY"]) || ""),
    idNumber: normalizeIdNumber(parseOcrField(upper, ["ID NO", "ID. NO", "CONTROL NO", "PWD NO", "PWD ID NO"]) || ""),
  };
};

const extractIdDetails = (rawText: string): ParsedIdData => {
  // Apply OCR cleanup to fix common character misrecognitions
  const cleanedText = cleanupOcrText(rawText);
  const text = cleanedText.toUpperCase();
  const idType = detectIdType(text) ?? undefined;
  const rule = idType ? ID_RULES[idType] : undefined;
  const dl = parsePhilippineDriversLicense(text);

  const allNameLabels = uniqueValues([
    "FIRST NAME",
    "GIVEN NAME",
    "MGA PANGALAN",
    "GIVEN NAMES",
    "MIDDLE NAME",
    "MIDDLE INITIAL",
    "LAST NAME",
    "SURNAME",
    "APELYIDO",
    ...(rule?.nameLabels || []),
  ]);

  const ruleFullName =
    parseOcrField(text, rule?.nameLabels || []) ||
    parseOcrField(text, allNameLabels) ||
    pickLikelyNameLine(text, rule || ID_RULES.DRIVERS_LICENSE);
  const parsedName = parseNameParts(ruleFullName);

  const mrzName = idType === "PASSPORT" ? parsePassportMrzName(text) : { firstName: "", middleName: "", lastName: "" };
  const passportMrz = idType === "PASSPORT"
    ? parsePassportMrzData(text)
    : { firstName: "", middleName: "", lastName: "", birthday: "", expirationDate: "", gender: undefined as ("Male" | "Female" | "Unknown" | undefined), idNumber: "" };
  const passportStrict = idType === "PASSPORT"
    ? parsePassportStrictFields(text)
    : { firstName: "", middleName: "", lastName: "", birthday: "", expirationDate: "", issueDate: "", gender: undefined as ("Male" | "Female" | "Unknown" | undefined) };
  const umidName = idType === "UMID" ? parseUmidStrictFields(text) : { firstName: "", middleName: "", lastName: "", birthday: "", gender: undefined as ("Male" | "Female" | "Unknown" | undefined), address: "" };
  const postalName = idType === "POSTAL_ID" ? parsePostalStrictFields(text) : { firstName: "", middleName: "", lastName: "", fullName: "", birthday: "", address: "", gender: undefined as ("Male" | "Female" | "Unknown" | undefined), expirationDate: "" };
  const pwdIdStrict = idType === "MANILA_PWD_ID" ? parseManilaPwdIdStrictFields(text) : { name: "", firstName: "", middleName: "", lastName: "", address: "", birthday: "", idNumber: "" };
  const seniorStrict = idType === "MANILA_SENIOR_CITIZEN_ID" ? parseSeniorStrictFields(text) : { name: "", address: "", birthday: "", idNumber: "" };
  const philSysName = idType === "PHILSYS_NATIONAL_ID"
    ? (() => {
        const byLine = parsePhilSysNameParts(text);
        const byBlock = parsePhilSysNameFromBlocks(text);
        const strict = parsePhilSysStrictFields(text);
        return {
          firstName: strict.firstName || byBlock.firstName || byLine.firstName,
          middleName: strict.middleName || byBlock.middleName || byLine.middleName,
          lastName: strict.lastName || byBlock.lastName || byLine.lastName,
          birthday: strict.birthday,
          address: strict.address,
        };
      })()
    : { firstName: "", middleName: "", lastName: "", birthday: "", address: "" };
  const firstName = idType === "PHILSYS_NATIONAL_ID"
    ? sanitizeNameField(philSysName.firstName || "")
    : idType === "UMID"
    ? sanitizeNameField(umidName.firstName || "")
    : ((idType === "PASSPORT" ? (passportStrict.firstName || passportMrz.firstName) : "") || (idType === "POSTAL_ID" ? postalName.firstName : "") || (idType === "MANILA_PWD_ID" ? pwdIdStrict.firstName : "") || dl.firstName || parseOcrField(text, ["FIRST NAME", "GIVEN NAME", "MGA PANGALAN", "GIVEN NAMES"]) || parsedName.firstName || mrzName.firstName);
  const middleName = idType === "PHILSYS_NATIONAL_ID"
    ? sanitizeNameField(philSysName.middleName || "")
    : idType === "UMID"
    ? sanitizeNameField(umidName.middleName || "")
    : ((idType === "PASSPORT" ? (passportStrict.middleName || passportMrz.middleName) : "") || (idType === "POSTAL_ID" ? postalName.middleName : "") || (idType === "MANILA_PWD_ID" ? pwdIdStrict.middleName : "") || dl.middleName || parseOcrField(text, ["MIDDLE NAME", "MIDDLE INITIAL", "GITNANG APELYIDO"]) || parsedName.middleName || mrzName.middleName);
  const lastName = idType === "PHILSYS_NATIONAL_ID"
    ? sanitizeNameField(philSysName.lastName || "")
    : idType === "UMID"
    ? sanitizeNameField(umidName.lastName || "")
    : ((idType === "PASSPORT" ? (passportStrict.lastName || passportMrz.lastName) : "") || (idType === "POSTAL_ID" ? postalName.lastName : "") || (idType === "MANILA_PWD_ID" ? pwdIdStrict.lastName : "") || dl.lastName || parseOcrField(text, ["LAST NAME", "SURNAME", "APELYIDO"]) || parsedName.lastName || mrzName.lastName);

  const postalCollapse = (() => {
    if (idType !== "POSTAL_ID") return { firstName, middleName, lastName };
    const norm = (v: string) => sanitizeNameField(v || "").replace(/\s+/g, " ").trim();
    const f = norm(firstName);
    const m = norm(middleName);
    const l = norm(lastName);
    const sameFM = !!f && !!m && f === m;
    const sameFL = !!f && !!l && f === l;
    const sameML = !!m && !!l && m === l;
    if (sameFM && sameFL && sameML) {
      return { firstName: f, middleName: "", lastName: "" };
    }
    return { firstName, middleName, lastName };
  })();

  const finalFirstName = postalCollapse.firstName;
  const finalMiddleName = postalCollapse.middleName;
  const finalLastName = postalCollapse.lastName;

  const philSysStrictFullName = sanitizeNameField([finalLastName, finalFirstName, finalMiddleName].filter(Boolean).join(" ").trim());
  const umidStrictFullName = sanitizeNameField([lastName, firstName, middleName].filter(Boolean).join(" ").trim());
  const isUmidHeaderNoiseName = (value: string) =>
    /\bUNIF[A-Z]*\b|\bUNIT[A-Z]*\b|\bMULTI?[A-Z-]*\b|\bPURPOSE\b|\bUMID\b|\bREPUBLIC\b|\bPHILIPPINES?\b/i.test(value || "");
  const fullName =
    idType === "PHILSYS_NATIONAL_ID"
      ? philSysStrictFullName
      : idType === "UMID"
      ? (isUmidHeaderNoiseName(umidStrictFullName) ? "" : umidStrictFullName)
      : idType === "MANILA_SENIOR_CITIZEN_ID"
      ? sanitizeNameField(seniorStrict.name || [lastName, firstName, middleName].filter(Boolean).join(" ").trim())
      : idType === "MANILA_PWD_ID"
      ? sanitizeNameField(pwdIdStrict.name || [lastName, firstName, middleName].filter(Boolean).join(" ").trim())
      : idType === "POSTAL_ID"
      ? sanitizeNameField(postalName.fullName || [finalFirstName, finalMiddleName, finalLastName].filter(Boolean).join(" ").trim())
      : [finalLastName, finalFirstName, finalMiddleName].filter(Boolean).join(", ").replace(/,\s*,/g, ",") || ruleFullName;

  const address =
    (idType === "PHILSYS_NATIONAL_ID" ? philSysName.address : "") ||
    (idType === "UMID" ? umidName.address : "") ||
    (idType === "POSTAL_ID" ? postalName.address : "") ||
    (idType === "MANILA_PWD_ID" ? pwdIdStrict.address : "") ||
    (idType === "MANILA_SENIOR_CITIZEN_ID" ? seniorStrict.address : "") ||
    dl.streetAddress ||
    parseOcrField(text, uniqueValues(["ADDRESS", "TIRAHAN", "CITY/MUNICIPALITY OF", "CITY/MUNICIPALITY", ...(rule?.addressLabels || [])]));

  const detectedIdNumber =
    (idType === "PASSPORT" ? passportMrz.idNumber : "") ||
    extractByPatterns(text, rule?.idPatterns || []) ||
    parseOcrField(text, uniqueValues(["LICENSE NO", "ID NO", "ID. NO", "PCN", "PRN", "POSTAL REFERENCE NO", "PASSPORT NO", "PASSPORT NUMBER", "CRN", "OSCA ID NO", "SENIOR CITIZEN ID NO", "NO", ...(rule?.idLabels || [])])) ||
    (text.match(/\b(?:[A-Z]\d{7}|[A-Z]{1,3}\d{5,}|P\d{7,}[A-Z]?|\d{6,})\b/)?.[0] || "");
  const idCandidate = idType === "MANILA_SENIOR_CITIZEN_ID" ? (seniorStrict.idNumber || detectedIdNumber) : (idType === "MANILA_PWD_ID" ? (pwdIdStrict.idNumber || detectedIdNumber) : detectedIdNumber);
  const idNumber = isValidIdNumberForRule(idCandidate, rule) ? normalizeIdNumber(idCandidate) : "";

  const birthday =
    (idType === "PHILSYS_NATIONAL_ID" ? philSysName.birthday : "") ||
    (idType === "POSTAL_ID" ? postalName.birthday : "") ||
    (idType === "PASSPORT" ? (passportMrz.birthday || passportStrict.birthday) : "") ||
    (idType === "MANILA_PWD_ID" ? pwdIdStrict.birthday : "") ||
    (idType === "MANILA_SENIOR_CITIZEN_ID" ? seniorStrict.birthday : "") ||
    dl.birthday ||
    parseLabeledDate(text, uniqueValues(["DATE OF BIRTH", "BIRTH DATE", "BIRTHDAY", "PETSA NG KAPANGANAKAN", ...(rule?.birthLabels || [])]));

  if (idType === "PASSPORT") {
    console.debug("[PassportDOB] MRZ detected:", !!passportMrz.birthday);
    console.debug("[PassportDOB] Parsed MRZ DOB:", passportMrz.birthday || "none");
    console.debug("[PassportDOB] Fallback OCR DOB candidate:", passportStrict.birthday || "none");
    console.debug("[PassportDOB] Final DOB result:", birthday || "none");
  }

  const issueDate = parseLabeledDate(text, uniqueValues(["DATE OF ISSUE", "PETSa NG PAGKAKALOOB", "ISSUE DATE", "DATE ISSUED", "ISSUED ON", ...(rule?.issueLabels || [])]));
  const expirationDate =
    (idType === "PASSPORT" ? (passportMrz.expirationDate || passportStrict.expirationDate) : "") ||
    (idType === "POSTAL_ID" ? postalName.expirationDate : "") ||
    dl.expirationDate ||
    parseLabeledDate(text, uniqueValues(["EXPIRATION DATE", "DATE OF EXPIRY", "EXPIRY DATE", "VALID UNTIL", "VALID THRU", "EXPIRY", ...(rule?.expiryLabels || [])]));
  const gender =
    (idType === "PASSPORT" ? (passportMrz.gender || passportStrict.gender || "Unknown") : undefined) ||
    (idType === "UMID" ? umidName.gender : undefined) ||
    (idType === "POSTAL_ID" ? postalName.gender : undefined) ||
    dl.gender ||
    parseOcrGender(text) ||
    (idType === "PHILSYS_NATIONAL_ID"
      ? (parseOcrField(text, ["KASARIAN/SEX", "SEX", "KASARIAN"])?.trim().toUpperCase() === "F"
          ? "Female"
          : parseOcrField(text, ["KASARIAN/SEX", "SEX", "KASARIAN"])?.trim().toUpperCase() === "M"
          ? "Male"
          : undefined)
      : undefined);

  const fallbackDates = parseAllDateTokens(text);
  const finalBirthday = (idType === "UMID" || idType === "PASSPORT") ? ((idType === "UMID" ? (umidName.birthday || birthday) : birthday) || "") : (birthday || fallbackDates[0] || "");
  const finalIssue = issueDate || "";
  const finalExpiry = expirationDate || "";

  const hasPhilSysName = idType !== "PHILSYS_NATIONAL_ID" || !!philSysStrictFullName;
  const confidencePieces = [
    idType ? 35 : 0,
    firstName || fullName ? 20 : 0,
    finalBirthday ? 15 : 0,
    gender ? 10 : 0,
    address ? 15 : 0,
  ];

  return {
    idType,
    fullName: sanitizeNameField(fullName),
    firstName: hasPhilSysName ? sanitizeNameField(finalFirstName) : "",
    middleName: hasPhilSysName ? sanitizeNameField(finalMiddleName) : "",
    lastName: hasPhilSysName ? sanitizeNameField(finalLastName) : "",
    idNumber,
    birthday: finalBirthday,
gender:
  gender === "Male" || gender === "Female"
    ? gender
    : "Unknown",    address: sanitizeAddressField(address),
    issueDate: finalIssue,
    expirationDate: finalExpiry,
    expiryPolicy: rule?.expiryPolicy,
    confidence: confidencePieces.reduce((sum, value) => sum + value, 0),
    rawText,
  };
};

const isExpiredYmd = (ymd: string) => {
  if (!ymd) return false;
  const today = new Date();
  const a = new Date(`${ymd}T00:00:00`);
  const t = new Date(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}T00:00:00`);
  return a < t;
};

const isLikelyValidName = (value: string) => {
  const v = sanitizeNameField(value || "");
  if (!v || v.length < 4) return false;
  if (/[^A-Z\s,'\.-]/i.test(v)) return false;
  if (/(?:^|\s)(?:NOUTE|AF|HIRSTH)(?:\s|$)/i.test(v)) return false;
  const alpha = (v.match(/[A-Z]/gi) || []).length;
  return alpha >= 4;
};

const validateParsedId = (data: ParsedIdData) => {
  if (!data.idType) return { ok: false, error: "Invalid or unsupported ID." };
  const rule = ID_RULES[data.idType];

  const hasAnyCore =
    !!data.firstName || !!data.lastName || !!data.fullName || !!data.idNumber || !!data.birthday;
  if (!hasAnyCore) return { ok: false, error: "Unable to read ID clearly. Please retake the photo." };

  const missingFields = rule.requiredFields.filter((field) => {
    if (field === "name") return !(data.firstName || data.fullName);
    if (field === "idNumber") return !data.idNumber || !isValidIdNumberForRule(data.idNumber, rule);
    if (field === "address") return !data.address;
    // Gender is non-blocking for OCR apply flow.
    if (field === "gender") return false;
    return !data[field];
  });
  data.missingFields = missingFields;

  const dateErrors = [
    getDateValidationError("Date of Birth", data.birthday),
    getDateValidationError("Issue Date", data.issueDate),
    getDateValidationError("Expiration Date", data.expirationDate),
  ].filter(Boolean);
  if (dateErrors.length > 0) {
    return { ok: false, error: "Required ID details could not be detected." };
  }

  if (!isLikelyValidName(data.fullName || `${data.lastName || ""} ${data.firstName || ""}`)) {
    return { ok: false, error: "Invalid or unsupported ID." };
  }

  if (missingFields.length > 0 || (data.confidence || 0) < 75) {
    return { ok: false, error: "Required ID details could not be detected." };
  }

  if (rule.expiryPolicy === "required" && !data.expirationDate) {
    return { ok: false, error: "Required ID details could not be detected." };
  }

  if (data.expirationDate && isExpiredYmd(data.expirationDate)) {
    return { ok: false, error: "ID is expired." };
  }

  return { ok: true as const };
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
    gender: "Male" as "Male" | "Female" | "Unknown",
    civilStatus: "Single",
    religion: "",
    residentType: "Resident",
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
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
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
  const [ocrReview, setOcrReview] = useState<ParsedIdData | null>(null);
  const [pendingOcrApply, setPendingOcrApply] = useState<ParsedIdData | null>(null);

  // required-field helpers
  const isBlank = (v: string) => !v || !v.trim();
  const invalidEmail = (v: string) =>
    isBlank(v) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const invalidContact = (v: string) => isBlank(v) || v.length !== 11;
  const normalizeResidentFormNameFields = (data: typeof formData) => ({
    ...data,
    firstName: normalizeNameValue(data.firstName),
    middleName: normalizeNameValue(data.middleName),
    lastName: normalizeNameValue(data.lastName),
    fatherName: normalizeNameValue(data.fatherName),
    motherName: normalizeNameValue(data.motherName),
    spouseName: normalizeNameValue(data.spouseName),
    emergencyContactName: normalizeNameValue(data.emergencyContactName),
  });
  const handleNameFieldChange = (field: ResidentNameField, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: normalizeNameInput(toUppercaseInput(value)),
    }));
  };
  const handleNameFieldBlur = (field: ResidentNameField) => {
    setFormData((prev) => ({
      ...prev,
      [field]: normalizeNameValue(prev[field]),
    }));
  };
  const handleHouseNoChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      houseNo: value.replace(/\D/g, "").slice(0, MAX_HOUSE_NO_LENGTH),
    }));
  };
  const getNameFieldError = (field: ResidentNameField, requiredMessage = "") => {
    if (hasInvalidNameValue(formData[field])) return NAME_FIELD_ERROR;
    if (requiredMessage && saveAttempted && isBlank(formData[field])) return requiredMessage;
    return "";
  };

  const contactTooLong = formData.contactNumber.length > 11;
  const contactComplete = formData.contactNumber.length === 11;

  const gmailRegex = /^[a-z0-9](\.?[a-z0-9]){5,29}@gmail\.com$/i;

  const emailInvalidFormat =
    formData.email.trim().length > 0 && !gmailRegex.test(formData.email.trim());

  const emailValidFormat =
    formData.email.trim().length > 0 && gmailRegex.test(formData.email.trim());

  const firstNameError = getNameFieldError("firstName", "First name is required.");
  const middleNameError = getNameFieldError("middleName");
  const lastNameError = getNameFieldError("lastName", "Last name is required.");
  const fatherNameError = getNameFieldError("fatherName");
  const motherNameError = getNameFieldError("motherName");
  const spouseNameError = getNameFieldError("spouseName");
  const birthdayError = saveAttempted && isBlank(formData.birthday);
  const ageError = saveAttempted && formData.birthday ? validateResidentAge(formData.age) : "";
  const contactError =
    saveAttempted &&
    (invalidContact(formData.contactNumber) || contactNumberAlreadyExists);
  const emailError =
    saveAttempted && (invalidEmail(formData.email) || emailAlreadyExists);
  // Address & Contact required fields
  const houseNoError =
    saveAttempted &&
    (isBlank(formData.houseNo) || formData.houseNo.length > MAX_HOUSE_NO_LENGTH);
  const houseNoErrorMessage = isBlank(formData.houseNo)
    ? "House number is required."
    : `House number must not exceed ${MAX_HOUSE_NO_LENGTH} digits.`;
  const streetAddressError = saveAttempted && isBlank(formData.streetAddress);
  // Emergency contact required fields
  const emergencyNameError = getNameFieldError("emergencyContactName", "Emergency contact name is required.");
  const emergencyNumberError = saveAttempted && invalidContact(formData.emergencyContactNumber);
  const emergencyAddressError = saveAttempted && isBlank(formData.emergencyContactAddress);
  const numberOfChildrenError = validateNumberOfChildren(formData.numberOfChildren);

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

    if (showDataPrivacyDialog || showPasswordDialog || isCreatingAccount) {
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
    setOcrReview(null);
    setPendingOcrApply(null);
    setProfileImagePreview("");
    setPassword("");
    setConfirmPassword("");
    setEditingResident(null);
    setResidentPrivacyAccepted(false);
    setIsCreatingAccount(false);
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

    const preparedFormData = normalizeResidentFormNameFields(formData);
    setFormData(preparedFormData);

    const errors = validateResidentForm(preparedFormData);
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
      profileImage: preparedFormData.profileImage || undefined,
      firstName: preparedFormData.firstName,
      middleName: preparedFormData.middleName,
      lastName: preparedFormData.lastName,
      age: parseInt(preparedFormData.age) || 0,
      birthday: preparedFormData.birthday,
      gender: preparedFormData.gender,
      civilStatus: preparedFormData.civilStatus,
      religion: preparedFormData.religion || undefined,
      residentType: preparedFormData.residentType || "Resident",
      voterStatus: preparedFormData.voterStatus,
      houseNo: preparedFormData.houseNo,
      streetAddress: preparedFormData.streetAddress,
      city: preparedFormData.city,
      postalCode: preparedFormData.postalCode,
      country: preparedFormData.country,
      contactNumber: preparedFormData.contactNumber,
      email: preparedFormData.email,
      fatherName: preparedFormData.fatherName,
      motherName: preparedFormData.motherName,
      spouseName: preparedFormData.spouseName || undefined,
      numberOfChildren: preparedFormData.numberOfChildren
        ? parseInt(preparedFormData.numberOfChildren)
        : undefined,
      emergencyContactName: preparedFormData.emergencyContactName,
      emergencyContactNumber: preparedFormData.emergencyContactNumber,
      emergencyContactAddress: preparedFormData.emergencyContactAddress,
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
gender: resident.gender || "Unknown",      
civilStatus: resident.civilStatus || "Single",
      religion: resident.religion || "",
      residentType: resident.residentType || "Resident",
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
      numberOfChildren:
        resident.numberOfChildren !== undefined && resident.numberOfChildren !== null
          ? String(resident.numberOfChildren)
          : "",
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
    if (isCreatingAccount) return;

    const passwordErrors = validatePassword(password, confirmPassword);
    if (Object.keys(passwordErrors).length > 0) {
      toast.error(Object.values(passwordErrors)[0]);
      return;
    }
    if (!pendingResident) return;

    try {
      setIsCreatingAccount(true);

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
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleUpdateResident = async () => {
    if (!editingResident) return;

    setSaveAttempted(true);

    const preparedFormData = normalizeResidentFormNameFields({
      ...formData,
      residentType: formData.residentType || "Resident",
    });
    setFormData(preparedFormData);

    const errors = validateResidentForm(preparedFormData);
    if (
      Object.keys(errors).length > 0 ||
      contactNumberAlreadyExists ||
      emailAlreadyExists
    ) {
      toast.error(errors.contactNumber || errors.email || Object.values(errors)[0] || "Please fill in all required fields correctly.");
      return;
    }

    try {
      const response = await api.put(`/residents/${editingResident.residentNo}`, {
          profileImage: preparedFormData.profileImage,
          firstName: preparedFormData.firstName,
          middleName: preparedFormData.middleName,
          lastName: preparedFormData.lastName,
          age: preparedFormData.age,
          birthday: preparedFormData.birthday,
          gender: preparedFormData.gender,
          civilStatus: preparedFormData.civilStatus,
          religion: preparedFormData.religion,
          residentType: preparedFormData.residentType || "Resident",
          voterStatus: preparedFormData.voterStatus,
          houseNo: preparedFormData.houseNo,
          streetAddress: preparedFormData.streetAddress,
          city: preparedFormData.city,
          zipCode: preparedFormData.postalCode,
          contactNumber: preparedFormData.contactNumber,
          email: preparedFormData.email,
          fatherName: preparedFormData.fatherName,
          motherName: preparedFormData.motherName,
          spouseName: preparedFormData.spouseName,
          numberOfChildren: preparedFormData.numberOfChildren,
          emergencyContactName: preparedFormData.emergencyContactName,
          emergencyContactNumber: preparedFormData.emergencyContactNumber,
          emergencyContactAddress: preparedFormData.emergencyContactAddress,
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

  const handleOcrData = async (extractedText: string) => {
    console.debug("[IDScanner] OCR success");
    const parsed = extractIdDetails(extractedText);
    const validation = validateParsedId(parsed);
    if (!validation.ok) {
      setOcrReview(parsed);
      setPendingOcrApply(null);
      toast.error(validation.error);
      return;
    }
    console.debug("[IDScanner] Scan validation passed");

    try {
      const backendValidation = await api.post("/api/id-ocr/validate-text", {
        text: extractedText,
        parsed,
      });
      if (!backendValidation.data?.ok) {
        setOcrReview(parsed);
        setPendingOcrApply(null);
        toast.error(backendValidation.data?.error || "Required ID details could not be detected.");
        return;
      }
    } catch (err: any) {
      if (err?.response?.data?.error) {
        setOcrReview(parsed);
        setPendingOcrApply(null);
        toast.error(err.response.data.error);
        return;
      }
      console.warn("Backend ID OCR validation unavailable; using frontend validation.", err);
    }

    const applyParsedToForm = (parsedData: ParsedIdData) => {
      console.debug("[IDScanner] Applying OCR data to form");
      const text = extractedText.toUpperCase();
      const licenseData = parsePhilippineDriversLicense(text);
      const genderRaw = parsedData.gender || licenseData.gender || parseOcrField(text, ["SEX", "GENDER"]);
      const splitAddress = splitLicenseAddress(parsedData.address || "");
      const normalizedNames = normalizeDetectedNameParts(parsedData.firstName || "", parsedData.middleName || "");
      const fallbackName = parseNameParts(parsedData.fullName || "");

      setFormData((prev) => ({
        ...prev,
        firstName: normalizedNames.firstName || prev.firstName,
        middleName: normalizedNames.middleName || prev.middleName,
        lastName: sanitizeNameField(parsedData.lastName || fallbackName.lastName || "") || prev.lastName,
        houseNo: sanitizeHouseNoField(splitAddress.houseNo || "") || prev.houseNo,
        streetAddress: sanitizeStreetAddressField(splitAddress.streetAddress || parsedData.address || "") || prev.streetAddress,
        gender:
          genderRaw === "Female" || String(genderRaw).trim().toUpperCase() === "F"
            ? "Female"
            : genderRaw === "Male" || String(genderRaw).trim().toUpperCase() === "M"
            ? "Male"
            : prev.gender,
        birthday: parsedData.birthday || prev.birthday,
        age: parsedData.birthday ? calculateAge(parsedData.birthday) : prev.age,
      }));
      console.debug("[IDScanner] Form state updated");
    };

    setOcrReview(parsed);
    // Always require explicit user confirmation before applying OCR data.
    setPendingOcrApply(parsed);

    const extractedSummary = [
      `ID Type: ${parsed.idType ? ID_TYPE_LABEL[parsed.idType] : "N/A"}`,
      `Name: ${[parsed.lastName, parsed.firstName, parsed.middleName].filter(Boolean).join(", ") || "N/A"}`,
      `Date of Birth: ${parsed.birthday || "N/A"}`,
      `Gender: ${parsed.gender || "N/A"}`,
      `Address: ${parsed.address || "N/A"}`,
      `Expiration Date: ${parsed.expirationDate || "N/A"}`,
    ].join("\n");

    toast.success(`ID text detected. Please confirm first, then apply to fields.\n${extractedSummary}`);
  };

  const handleOcrImageCaptured = (imageDataUrl: string) => {
    if (!imageDataUrl) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setProfileImagePreview(imageDataUrl);
        setFormData((prev) => ({ ...prev, profileImage: imageDataUrl }));
        return;
      }

      // ID portrait is usually on the left; crop portrait region instead of whole card.
      const sx = Math.round(img.width * 0.03);
      const sy = Math.round(img.height * 0.18);
      const sw = Math.round(img.width * 0.34);
      const sh = Math.round(img.height * 0.72);

      canvas.width = 420;
      canvas.height = 520;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      const croppedFace = canvas.toDataURL("image/jpeg", 0.95);

      setProfileImagePreview(croppedFace);
      setFormData((prev) => ({
        ...prev,
        profileImage: croppedFace,
      }));
      console.debug("[IDScanner] Photo preview updated");
    };
    img.onerror = () => {
      setProfileImagePreview(imageDataUrl);
      setFormData((prev) => ({ ...prev, profileImage: imageDataUrl }));
    };
    img.src = imageDataUrl;
  };

  const handleConfirmOcrApply = () => {
    const source = pendingOcrApply || ocrReview;
    if (!source) return;
    const splitAddress = splitLicenseAddress(source.address || "");
    const normalizedNames = normalizeDetectedNameParts(source.firstName || "", source.middleName || "");
    setFormData((prev) => ({
      ...prev,
      firstName: normalizedNames.firstName || prev.firstName,
      middleName: normalizedNames.middleName || prev.middleName,
      lastName: sanitizeNameField(source.lastName || "") || prev.lastName,
      houseNo: sanitizeHouseNoField(splitAddress.houseNo || "") || prev.houseNo,
      streetAddress: sanitizeStreetAddressField(splitAddress.streetAddress || source.address || "") || prev.streetAddress,
      gender:
        source.gender === "Female"
          ? "Female"
          : source.gender === "Male"
          ? "Male"
          : prev.gender,
      birthday: source.birthday || prev.birthday,
      age: source.birthday ? calculateAge(source.birthday) : prev.age,
    }));
    setPendingOcrApply(null);
    console.debug("[IDScanner] Form state updated");
    toast.success("OCR details confirmed and applied to the form fields.");
  };

  const normalizeProfilePhotoForSubmit = async (imageDataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      if (!imageDataUrl) return resolve("");
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 420;
        canvas.height = 520;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(imageDataUrl);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let quality = 0.9;
        let out = canvas.toDataURL("image/jpeg", quality);
        while (out.length > 320000 && quality > 0.55) {
          quality = Number((quality - 0.1).toFixed(2));
          out = canvas.toDataURL("image/jpeg", quality);
        }
        resolve(out);
      };
      img.onerror = () => resolve(imageDataUrl);
      img.src = imageDataUrl;
    });
  };

  const handleScanSuccess = async (payload: {
    ocrData: string;
    croppedPhoto: string;
    confidence: number;
    detectedIdType: string;
  }) => {
    console.debug("[IDScanner] OCR result received", payload.ocrData);
    console.debug("[IDScanner] Face crop received", payload.croppedPhoto ? "yes" : "no");
    if (payload.ocrData) {
      try {
        const parsed = extractIdDetails(payload.ocrData);
        setOcrReview(parsed);
        setPendingOcrApply(parsed);
      } catch (err) {
        console.error("[IDScanner] Failed to parse OCR payload", err);
        setOcrReview({
          fullName: "",
          firstName: "",
          middleName: "",
          lastName: "",
          birthday: "",
          address: "",
          gender: undefined,
          confidence: payload.confidence || 0,
          rawText: payload.ocrData,
          missingFields: ["name", "birthday", "address"],
        });
      }
    }
    if (payload.croppedPhoto) {
      console.debug("[IDScanner] Applying cropped photo to uploader");
      const normalizedPhoto = await normalizeProfilePhotoForSubmit(payload.croppedPhoto);
      setProfileImagePreview(normalizedPhoto);
      setFormData((prev) => ({ ...prev, profileImage: normalizedPhoto }));
      console.debug("[IDScanner] Photo preview updated");
    }
    try {
      await handleOcrData(payload.ocrData);
    } catch (err) {
      console.error("[IDScanner] handleOcrData wiring fallback hit", err);
    }
    console.debug("[IDScanner] Form state updated");
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
                    <OcrScanner
                      onDataExtracted={handleOcrData}
                      onImageCaptured={handleOcrImageCaptured}
                      onScanSuccess={handleScanSuccess}
                    />
                    <button
                      type="button"
                      onClick={() => setShowScannerInfoDialog(true)}
                      className="w-6 h-6 rounded-full border-2 border-[#2957a1] text-[#2957a1] text-xs font-bold flex items-center justify-center hover:bg-blue-50 transition-colors flex-shrink-0"
                      title="What's Camera Scanner?"
                    >
                      ?
                    </button>
                  </div>
                  {ocrReview && (
                    <div className="w-full max-w-3xl rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-sm shadow-sm">
                      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-[#2957a1]">Extracted ID details for review</p>
                          <p className="text-xs text-gray-600">
                            Please confirm these OCR details before saving the resident record.
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2957a1]">
                          Confidence: {ocrReview.confidence ?? 0}%
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {[
                          ["ID Type", ocrReview.idType ? ID_TYPE_LABEL[ocrReview.idType] : "Unsupported ID type"],
                          ["Full Name", [ocrReview.lastName, ocrReview.firstName, ocrReview.middleName].filter(Boolean).join(", ") || ocrReview.fullName || "Not detected"],
                          ["Date of Birth", ocrReview.birthday || "Not detected"],
                          ["Gender", ocrReview.gender || "Not detected"],
                          ["Address", ocrReview.address || "Not detected"],
                          [
                            "Expiration Date",
                            ocrReview.expirationDate ||
                              (ocrReview.expiryPolicy === "not_expected" ? "No expiration expected" : "Not detected"),
                          ],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-lg bg-white p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                            <p className="mt-1 break-words font-medium text-gray-900">{value}</p>
                          </div>
                        ))}
                      </div>
                      {ocrReview.missingFields && ocrReview.missingFields.length > 0 && (
                        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                          Missing required details: {ocrReview.missingFields.join(", ")}
                        </p>
                      )}
                      {(pendingOcrApply || ocrReview) && (
                        <div className="mt-3 flex justify-end">
                          <Button type="button" onClick={handleConfirmOcrApply} className="bg-[#2957a1] hover:bg-[#1f4380]">
                            Confirm & Apply To Fields
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
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
                      <li>Manila PWD ID</li>
                      <li>Manila Senior Citizen ID</li>
                    </ul>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="flex justify-center">
                <ProfileImageUpload
                  onImageReady={(imageUrl, previewUrl, imageFile) => {
                    console.debug("[ProfileImageUpload] resident form image state updated", {
                      hasImageUrl: !!imageUrl,
                      hasPreviewUrl: !!previewUrl,
                      fileType: imageFile ? (imageFile as File).type || "blob" : "none",
                      fileSize: imageFile ? (imageFile as File).size || 0 : 0,
                    });
                    setFormData({ ...formData, profileImage: imageUrl });
                    setProfileImagePreview(previewUrl);
                    console.debug("[ProfileImageUpload] image ready for submission");
                  }}
                  currentImage={profileImagePreview || undefined}
                  size="lg"
                  allowTransform={!editingResident}
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
                      onChange={(e) => handleNameFieldChange("firstName", e.target.value)}
                      onBlur={() => handleNameFieldBlur("firstName")}
                      placeholder="Enter first name"
                      className={
                        firstNameError ? "border-red-500 ring-red-500" : ""
                      }
                    />
                    {firstNameError && (
                      <p className="text-xs text-red-500 mt-1">
                        {firstNameError}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Middle Name</Label>
                    <Input
                      value={formData.middleName}
                      onChange={(e) => handleNameFieldChange("middleName", e.target.value)}
                      onBlur={() => handleNameFieldBlur("middleName")}
                      placeholder="Enter middle name"
                      className={middleNameError ? "border-red-500 ring-red-500" : ""}
                    />
                    {middleNameError && (
                      <p className="text-xs text-red-500 mt-1">
                        {middleNameError}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Last Name *</Label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) => handleNameFieldChange("lastName", e.target.value)}
                      onBlur={() => handleNameFieldBlur("lastName")}
                      placeholder="Enter last name"
                      className={
                        lastNameError ? "border-red-500 ring-red-500" : ""
                      }
                    />
                    {lastNameError && (
                      <p className="text-xs text-red-500 mt-1">
                        {lastNameError}
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
                              ? format(fromYmdLocal(formData.birthday), "MM/dd/yyyy")
                              : <span>Select date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            showOutsideDays
                            className="rounded-md"
                            classNames={{
                              day_outside: "text-gray-300 opacity-60 pointer-events-none",
                            }}
                            selected={formData.birthday ? fromYmdLocal(formData.birthday) : undefined}
                            onSelect={(date) => {
                              if (!date) return;
                              const ymd = toLocalYmd(date);
                              setFormData({ ...formData, birthday: ymd, age: calculateAge(ymd) });
                            }}
                            disabled={(date) => date > getLatestAllowedBirthDate()}
                            initialFocus
                            captionLayout="dropdown-buttons"
                            fromYear={1900}
                            toYear={new Date().getFullYear()}
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
                        className={cn(
                          "w-24 text-center bg-gray-100",
                          ageError && "border-red-500 ring-red-500"
                        )}
                      />
                      {ageError && (
                        <p className="text-xs text-red-500 mt-1">{ageError}</p>
                      )}
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
                        value={formData.residentType || "Resident"}
                        onValueChange={(v) =>
                          setFormData({ ...formData, residentType: v })
                        }
                      >
                        <SelectTrigger className="uppercase">
                          <SelectValue placeholder="RESIDENT" />
                        </SelectTrigger>
                        <SelectContent className="uppercase">
                          <SelectItem value="Resident" className="uppercase">RESIDENT</SelectItem>
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
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={formData.houseNo}
                        onChange={(e) => handleHouseNoChange(e.target.value)}
                        maxLength={MAX_HOUSE_NO_LENGTH}
                        placeholder="House number"
                        className={houseNoError ? "border-red-500 ring-red-500" : ""}
                      />
                      {houseNoError && (
                        <p className="text-xs text-red-500 mt-1">{houseNoErrorMessage}</p>
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
                        disabled
                        className="bg-gray-100 text-gray-500 cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input
                        className="uppercase bg-gray-100 text-gray-500 cursor-not-allowed"
                        value={formData.country}
                        disabled
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
                        onChange={(e) => handleNameFieldChange("fatherName", e.target.value)}
                        onBlur={() => handleNameFieldBlur("fatherName")}
                        placeholder="Father's full name"
                        className={fatherNameError ? "border-red-500 ring-red-500" : ""}
                      />
                      {fatherNameError && (
                        <p className="text-xs text-red-500 mt-1">{fatherNameError}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Mother's Name</Label>
                      <Input
                        value={formData.motherName}
                        onChange={(e) => handleNameFieldChange("motherName", e.target.value)}
                        onBlur={() => handleNameFieldBlur("motherName")}
                        placeholder="Mother's full name"
                        className={motherNameError ? "border-red-500 ring-red-500" : ""}
                      />
                      {motherNameError && (
                        <p className="text-xs text-red-500 mt-1">{motherNameError}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Spouse's Name</Label>
                      <Input
                        value={formData.spouseName}
                        onChange={(e) => handleNameFieldChange("spouseName", e.target.value)}
                        onBlur={() => handleNameFieldBlur("spouseName")}
                        placeholder="Spouse's full name"
                        className={spouseNameError ? "border-red-500 ring-red-500" : ""}
                      />
                      {spouseNameError && (
                        <p className="text-xs text-red-500 mt-1">{spouseNameError}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>No. of Children</Label>
                      <Input
                        type="number"
                        min="0"
                        max="69"
                        step="1"
                        value={formData.numberOfChildren}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            numberOfChildren: e.target.value,
                          })
                        }
                        className={numberOfChildrenError ? "border-red-500 ring-red-500" : ""}
                        placeholder="0"
                      />
                      {numberOfChildrenError && (
                        <p className="text-xs text-red-500 mt-1">
                          {numberOfChildrenError}.
                        </p>
                      )}
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
                        onChange={(e) => handleNameFieldChange("emergencyContactName", e.target.value)}
                        onBlur={() => handleNameFieldBlur("emergencyContactName")}
                        placeholder="Emergency contact name"
                        className={emergencyNameError ? "border-red-500 ring-red-500" : ""}
                      />
                      {emergencyNameError && (
                        <p className="text-xs text-red-500 mt-1">{emergencyNameError}</p>
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
      <Dialog
        open={showPasswordDialog}
        onOpenChange={(open) => {
          if (!isCreatingAccount) setShowPasswordDialog(open);
        }}
      >
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
                  disabled={isCreatingAccount}
                  className="h-10 pr-10 border-gray-200 focus:ring-1 focus:ring-[#2957a1]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isCreatingAccount}
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
                  disabled={isCreatingAccount}
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
                disabled={isCreatingAccount}
                className="h-9 px-4 text-xs font-semibold text-gray-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleFinalSubmit}
                disabled={isCreatingAccount}
                className="h-9 px-4 bg-[#2957a1] text-white text-xs font-bold rounded-md hover:bg-[#1e3f7a]"
              >
                {isCreatingAccount ? "Creating..." : "Create Account & Save"}
              </Button>
            </DialogFooter>
          </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isCreatingAccount}>
          <AlertDialogContent className="w-[95vw] max-w-sm">
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-[#2957a1]" />
              <AlertDialogHeader className="items-center text-center">
                <AlertDialogTitle>Creating Account</AlertDialogTitle>
                <AlertDialogDescription>
                  Please wait while the resident account is being saved.
                </AlertDialogDescription>
              </AlertDialogHeader>
            </div>
          </AlertDialogContent>
        </AlertDialog>

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
                      allowTransform={false}
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
                    allowTransform={false}
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
                    selected={tempCutoffDate ? fromYmdLocal(tempCutoffDate) : undefined}
                    onSelect={(date) => {
                      if (!date) return;

                      setTempCutoffDate(toLocalYmd(date));
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
