const SUPPORTED_ID_TYPES = {
  PHILSYS_NATIONAL_ID: {
    label: "PhilSys National ID",
    keywords: ["REPUBLIKA NG PILIPINAS", "PHILIPPINE IDENTIFICATION CARD", "PAMBANSANG PAGKAKAKILANLAN", "PHILSYS", "PSN", "PCN", "PHILID"],
    idPatterns: [/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/],
    expiryPolicy: "optional",
    requiredFields: ["name", "idNumber", "birthday", "gender", "address"],
  },
  UMID: {
    label: "UMID",
    keywords: ["UNIFIED MULTI-PURPOSE ID", "UNITED MULTI-PURPOSE ID", "UMID", "CRN", "COMMON REFERENCE NUMBER"],
    expiryPolicy: "optional",
    requiredFields: ["name", "birthday", "gender", "address"],
  },
  DRIVERS_LICENSE: {
    label: "Driver's License",
    keywords: ["DRIVER'S LICENSE", "DRIVER LICENSE", "LAND TRANSPORTATION OFFICE", "LTO"],
    expiryPolicy: "optional",
    requiredFields: ["name", "birthday", "gender", "address"],
  },
  PASSPORT: {
    label: "Passport",
    keywords: ["PASSPORT", "PASAPORTE", "DEPARTMENT OF FOREIGN AFFAIRS", "REPUBLIC OF THE PHILIPPINES", "P<PHL"],
    idPatterns: [/\b[A-Z]\d{7}\b/, /\bP[A-Z0-9]{7,8}\b/],
    expiryPolicy: "optional",
    requiredFields: ["name", "idNumber", "birthday", "gender", "address"],
  },
  POSTAL_ID: {
    label: "Postal ID",
    keywords: ["POSTAL IDENTITY CARD", "POSTAL ID", "PHILPOST", "PHILIPPINE POSTAL CORPORATION"],
    idPatterns: [/\bPRN[-\s]?[A-Z0-9]{6,14}\b/, /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, /\b\d{12,15}\b/],
    expiryPolicy: "optional",
    requiredFields: ["name", "birthday", "address"],
  },
  MANILA_PWD_ID: {
    label: "Manila PWD ID",
    keywords: ["PERSON WITH DISABILITY", "PWD", "TYPE OF DISABILITY", "CITY OF MANILA", "MANILA"],
    idPatterns: [/\b\d{5,8}\b/, /\bPWD[-\s]?[A-Z0-9-]{5,}\b/],
    expiryPolicy: "optional",
    requiredFields: ["name", "birthday", "address"],
  },
  MANILA_SENIOR_CITIZEN_ID: {
    label: "Manila Senior Citizen ID",
    keywords: ["OFFICE FOR SENIOR CITIZENS AFFAIRS", "SENIOR CITIZEN", "SENIOR ID", "OSCA", "CITY OF MANILA", "MANILA"],
    idPatterns: [/\b(?:OSCA[-\s]?)?\d{2,4}[-\s]?\d{2,4}[-\s]?\d{2,6}\b/, /\b(?:OSCA[-\s]?)?[A-Z0-9]{2,6}[-\s]?\d{4,8}\b/, /\b\d{5,8}\b/],
    expiryPolicy: "optional",
    requiredFields: ["name", "birthday", "address"],
  },
};

const MIN_RESIDENT_AGE = 12;
const MAX_RESIDENT_AGE = 120;

function detectIdType(text) {
  const normalized = String(text || "").toUpperCase();
  let best = null;
  let bestScore = 0;

  for (const [idType, rule] of Object.entries(SUPPORTED_ID_TYPES)) {
    const score = rule.keywords.filter((keyword) => normalized.includes(keyword)).length;
    if (score > bestScore) {
      best = idType;
      bestScore = score;
    }
  }

  return bestScore > 0 ? best : null;
}

function isExpiredYmd(ymd) {
  if (!ymd) return false;
  if (!isRealYmd(ymd)) return false;
  const parsed = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return parsed < today;
}

function isRealYmd(ymd) {
  const match = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function calculateAge(ymd) {
  if (!isRealYmd(ymd)) return NaN;
  const [year, month, day] = ymd.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) {
    age -= 1;
  }
  return age;
}

function getDateValidationError(label, ymd) {
  if (!ymd) return "";
  if (!isRealYmd(ymd)) return `${label} is invalid`;
  const today = new Date();
  const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (label === "Date of Birth") {
    const age = calculateAge(ymd);
    if (ymd > todayYmd || !Number.isFinite(age) || age < MIN_RESIDENT_AGE || age > MAX_RESIDENT_AGE) return "Date of Birth is invalid";
  }
  if (label === "Issue Date" && ymd > todayYmd) return "Issue Date is invalid";
  return "";
}

function hasValidIdNumberShape(value) {
  const normalized = String(value || "").toUpperCase().replace(/[^A-Z0-9-]/g, "");
  return normalized.length >= 5 && /^[A-Z0-9-]+$/.test(normalized);
}

function normalizeIdNumber(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/\b(?:LICENSE|PASSPORT|NUMBER|NO|ID|CRN|PRN|PWD|OSCA|VALID|UNTIL|DATE|BIRTH)\b/g, " ")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}

function hasValidIdNumberForRule(value, rule) {
  const normalized = normalizeIdNumber(value);
  if (!hasValidIdNumberShape(normalized)) return false;
  if (!rule.idPatterns) return true;
  return rule.idPatterns.some((pattern) => pattern.test(normalized) || pattern.test(String(value || "").toUpperCase()));
}

function validateParsedId(parsed = {}, rawText = "") {
  const text = String(rawText || parsed.rawText || "").trim();
  if (!text || text.length < 20) {
    return { ok: false, error: "ID image is unreadable" };
  }

  const idType = parsed.idType || detectIdType(text);
  if (!idType || !SUPPORTED_ID_TYPES[idType]) {
    return { ok: false, error: "Unsupported ID type" };
  }

  const rule = SUPPORTED_ID_TYPES[idType];
  const hasName = Boolean(parsed.fullName || parsed.firstName || parsed.lastName);
  const hasIdNumber = hasValidIdNumberForRule(parsed.idNumber, rule);
  const hasBirthday = Boolean(parsed.birthday);
  const hasGender = parsed.gender === "Male" || parsed.gender === "Female";
  const hasAddress = Boolean(parsed.address);

  const missingFields = rule.requiredFields.filter((field) => {
    if (field === "name") return !hasName;
    if (field === "idNumber") return !hasIdNumber;
    if (field === "birthday") return !hasBirthday;
    if (field === "gender") return !hasGender;
    if (field === "address") return !hasAddress;
    return false;
  });

  if (missingFields.length > 0) {
    return { ok: false, error: "Required ID details could not be detected", missingFields };
  }

  const dateErrors = [
    getDateValidationError("Date of Birth", parsed.birthday),
    getDateValidationError("Issue Date", parsed.issueDate),
    getDateValidationError("Expiration Date", parsed.expirationDate),
  ].filter(Boolean);
  if (dateErrors.length > 0) {
    return { ok: false, error: dateErrors[0] };
  }

  if (parsed.expirationDate && isExpiredYmd(parsed.expirationDate)) {
    return { ok: false, error: "ID is expired" };
  }

  return {
    ok: true,
    idType,
    idTypeLabel: rule.label,
    expiryPolicy: rule.expiryPolicy,
  };
}

module.exports = {
  SUPPORTED_ID_TYPES,
  detectIdType,
  isExpiredYmd,
  validateParsedId,
};
