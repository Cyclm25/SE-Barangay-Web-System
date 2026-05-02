export type ValidationErrors = Record<string, string>;

const NAME_REGEX = /^[A-Za-z\s]+$/;
const USERNAME_REGEX = /^[A-Za-z0-9_]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PH_MOBILE_REGEX = /^(09\d{9}|639\d{9})$/;
const HOUSE_NO_REGEX = /^[A-Za-z0-9\s#-]+$/;
const ADDRESS_TEXT_REGEX = /^[A-Za-z0-9\s.,#-]+$/;
const RESIDENT_TYPES = new Set(["Student", "Senior Citizen", "PWD", "Indigenous", "Resident"]);
const CIVIL_STATUSES = new Set(["Single", "Married", "Widowed", "Separated"]);
const SEX_OPTIONS = new Set(["Male", "Female"]);
const VOTER_STATUSES = new Set(["Voter", "Non-Voter"]);
const MAX_NUMBER_OF_CHILDREN = 69;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function addError(errors: ValidationErrors, field: string, message: string) {
  if (!errors[field]) {
    errors[field] = message;
  }
}

export function validateNumberOfChildren(value: unknown) {
  const rawValue = clean(value);

  if (!rawValue) return "";
  if (/^-/.test(rawValue)) return "Number of children cannot be negative";
  if (!/^\d+$/.test(rawValue)) return "Number of children must be a whole number";

  const numberOfChildren = Number(rawValue);
  if (numberOfChildren > MAX_NUMBER_OF_CHILDREN) {
    return `Number of children cannot exceed ${MAX_NUMBER_OF_CHILDREN}`;
  }

  return "";
}

function normalizePhMobile(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

export function validatePassword(password: unknown, confirmPassword?: unknown) {
  const errors: ValidationErrors = {};
  const passwordValue = clean(password);
  const confirmValue = clean(confirmPassword);

  if (!passwordValue) addError(errors, "password", "Password is required");
  else {
    if (passwordValue.length < 8) addError(errors, "password", "Password must be at least 8 characters");
    if (passwordValue.length > 64) addError(errors, "password", "Password must not exceed 64 characters");
  }

  if (confirmPassword !== undefined) {
    if (!confirmValue) addError(errors, "confirmPassword", "Confirm Password is required");
    else if (passwordValue !== confirmValue) addError(errors, "confirmPassword", "Confirm Password must match Password");
  }

  return errors;
}

export function validateResidentForm(payload: Record<string, unknown>) {
  const errors: ValidationErrors = {};
  const firstName = clean(payload.firstName);
  const middleName = clean(payload.middleName);
  const lastName = clean(payload.lastName);
  const birthday = clean(payload.birthday ?? payload.birthdate);
  const ageValue = clean(payload.age);
  const gender = clean(payload.gender ?? payload.sex);
  const civilStatus = clean(payload.civilStatus);
  const residentType = clean(payload.residentType);
  const houseNo = clean(payload.houseNo);
  const streetAddress = clean(payload.streetAddress ?? payload.street);
  const email = clean(payload.email);
  const contactNumber = normalizePhMobile(payload.contactNumber);
  const emergencyContactName = clean(payload.emergencyContactName);
  const emergencyContactNumber = normalizePhMobile(payload.emergencyContactNumber);
  const emergencyContactAddress = clean(payload.emergencyContactAddress);
  const numberOfChildrenError = validateNumberOfChildren(payload.numberOfChildren);

  if (!firstName) addError(errors, "firstName", "First Name is required");
  else {
    if (firstName.length < 2) addError(errors, "firstName", "First Name must be at least 2 characters");
    if (firstName.length > 50) addError(errors, "firstName", "First Name must not exceed 50 characters");
    if (!NAME_REGEX.test(firstName)) addError(errors, "firstName", "First Name must contain letters and spaces only");
  }

  if (middleName) {
    if (middleName.length > 50) addError(errors, "middleName", "Middle Name must not exceed 50 characters");
    if (!NAME_REGEX.test(middleName)) addError(errors, "middleName", "Middle Name must contain letters and spaces only");
  }

  if (!lastName) addError(errors, "lastName", "Last Name is required");
  else {
    if (lastName.length < 2) addError(errors, "lastName", "Last Name must be at least 2 characters");
    if (lastName.length > 50) addError(errors, "lastName", "Last Name must not exceed 50 characters");
    if (!NAME_REGEX.test(lastName)) addError(errors, "lastName", "Last Name must contain letters and spaces only");
  }

  if (!birthday) addError(errors, "birthday", "Birth Date is required");
  else {
    const birthDate = new Date(`${birthday}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(birthDate.getTime())) addError(errors, "birthday", "Birth Date must be valid");
    else if (birthDate >= today) addError(errors, "birthday", "Birth Date must be in the past");
  }

  if (!ageValue) addError(errors, "age", "Age is required");
  else {
    const age = Number(ageValue);
    if (!Number.isInteger(age) || age < 1 || age > 120) addError(errors, "age", "Age must be between 1 and 120");
  }

  if (!gender) addError(errors, "gender", "Sex is required");
  else if (!SEX_OPTIONS.has(gender)) addError(errors, "gender", "Sex must be one of the available options");
  if (!civilStatus) addError(errors, "civilStatus", "Civil Status is required");
  else if (!CIVIL_STATUSES.has(civilStatus)) addError(errors, "civilStatus", "Civil Status must be one of the available options");
  if (!residentType) addError(errors, "residentType", "Resident Type is required");
  else if (!RESIDENT_TYPES.has(residentType)) addError(errors, "residentType", "Resident Type must be one of the available options");

  if (!houseNo) addError(errors, "houseNo", "House No. is required");
  else if (!HOUSE_NO_REGEX.test(houseNo)) addError(errors, "houseNo", "House No. must only contain letters, numbers, spaces, #, and -");
  if (!streetAddress) addError(errors, "streetAddress", "Address is required");
  else {
    if (`${houseNo} ${streetAddress}`.trim().length < 5) addError(errors, "streetAddress", "Address must be at least 5 characters");
    if (streetAddress.length > 150) addError(errors, "streetAddress", "Address must not exceed 150 characters");
    if (!ADDRESS_TEXT_REGEX.test(streetAddress)) addError(errors, "streetAddress", "Address contains invalid characters");
  }

  if (!PH_MOBILE_REGEX.test(contactNumber)) {
    addError(errors, "contactNumber", "Contact number must be a valid Philippine mobile number");
  }

  if (!email) addError(errors, "email", "Email is required");
  else {
    if (email.length > 100) addError(errors, "email", "Email must not exceed 100 characters");
    if (!EMAIL_REGEX.test(email)) addError(errors, "email", "Email must be a valid email address");
  }

  if (!emergencyContactName) addError(errors, "emergencyContactName", "Emergency Contact Name is required");
  else {
    if (emergencyContactName.length < 2) addError(errors, "emergencyContactName", "Emergency Contact Name must be at least 2 characters");
    if (emergencyContactName.length > 50) addError(errors, "emergencyContactName", "Emergency Contact Name must not exceed 50 characters");
    if (!NAME_REGEX.test(emergencyContactName)) addError(errors, "emergencyContactName", "Emergency Contact Name must contain letters and spaces only");
  }
  if (!PH_MOBILE_REGEX.test(emergencyContactNumber)) {
    addError(errors, "emergencyContactNumber", "Emergency Contact Number must be a valid Philippine mobile number");
  }
  if (!emergencyContactAddress) addError(errors, "emergencyContactAddress", "Emergency Contact Address is required");
  else {
    if (emergencyContactAddress.length > 150) addError(errors, "emergencyContactAddress", "Emergency Contact Address must not exceed 150 characters");
    if (!ADDRESS_TEXT_REGEX.test(emergencyContactAddress)) addError(errors, "emergencyContactAddress", "Emergency Contact Address contains invalid characters");
  }
  if (numberOfChildrenError) addError(errors, "numberOfChildren", numberOfChildrenError);

  return errors;
}

export function validateOfficialForm(payload: Record<string, unknown>) {
  const errors: ValidationErrors = {};
  const name = clean(payload.name ?? payload.adminname);
  const email = clean(payload.email);
  const position = clean(payload.position);
  const contactNumber = normalizePhMobile(payload.contactNumber ?? payload.contactnumber);

  if (!name) addError(errors, "name", "Admin Name is required");
  else {
    if (name.length < 2) addError(errors, "name", "Admin Name must be at least 2 characters");
    if (name.length > 100) addError(errors, "name", "Admin Name must not exceed 100 characters");
    if (!NAME_REGEX.test(name)) addError(errors, "name", "Admin Name must contain letters and spaces only");
  }

  if (!position) addError(errors, "position", "Position is required");

  if (!email) addError(errors, "email", "Email is required");
  else {
    if (email.length > 100) addError(errors, "email", "Email must not exceed 100 characters");
    if (!EMAIL_REGEX.test(email)) addError(errors, "email", "Email must be a valid email address");
  }

  if (!PH_MOBILE_REGEX.test(contactNumber)) {
    addError(errors, "contactNumber", "Contact number must be a valid Philippine mobile number");
  }

  return errors;
}

export function validateAnnouncementForm(payload: Record<string, unknown>) {
  const errors: ValidationErrors = {};
  const title = clean(payload.title);
  const content = clean(payload.content ?? payload.body);
  const targetAudience = Array.isArray(payload.targetAudience) ? payload.targetAudience : [];
  const isScheduled = Boolean(payload.isScheduled);
  const scheduledDate = clean(payload.scheduledDate ?? payload.scheduledPublishDate);

  if (!title) addError(errors, "title", "Title is required");
  else {
    if (title.length < 5) addError(errors, "title", "Title must be at least 5 characters");
    if (title.length > 100) addError(errors, "title", "Title must not exceed 100 characters");
  }

  if (!content) addError(errors, "content", "Content is required");
  else {
    if (content.length < 10) addError(errors, "content", "Content must be at least 10 characters");
    if (content.length > 1000) addError(errors, "content", "Content must not exceed 1000 characters");
  }

  if (targetAudience.length === 0) {
    addError(errors, "targetAudience", "Target Audience is required");
  }

  if (isScheduled) {
    if (!scheduledDate) addError(errors, "scheduledDate", "Schedule Date is required");
    else if (Number.isNaN(new Date(scheduledDate).getTime()) || new Date(scheduledDate) <= new Date()) {
      addError(errors, "scheduledDate", "Schedule Date must be in the future");
    }
  }

  return errors;
}

export function validateDocumentRequestForm(payload: Record<string, unknown>) {
  const errors: ValidationErrors = {};
  const documentType = clean(payload.documentType);
  const customDocumentType = clean(payload.customDocumentType);
  const purpose = clean(payload.purpose ?? payload.requestPurpose);

  if (!documentType) addError(errors, "documentType", "Document Type is required");
  if (documentType.toLowerCase() === "others" && !customDocumentType) {
    addError(errors, "customDocumentType", "Please specify the Document Type");
  }

  const effectiveType = documentType.toLowerCase() === "others" ? customDocumentType : documentType;
  if (effectiveType && effectiveType.length > 100) {
    addError(errors, "documentType", "Document Type must not exceed 100 characters");
  }

  if (!purpose) addError(errors, "purpose", "Purpose is required");
  else {
    if (purpose.length < 5) addError(errors, "purpose", "Purpose must be at least 5 characters");
    if (purpose.length > 200) addError(errors, "purpose", "Purpose must not exceed 200 characters");
    if (!/[A-Za-z]/.test(purpose)) addError(errors, "purpose", "Purpose must include letters");
  }

  return errors;
}

export { EMAIL_REGEX, NAME_REGEX, PH_MOBILE_REGEX, USERNAME_REGEX, clean, normalizePhMobile };
