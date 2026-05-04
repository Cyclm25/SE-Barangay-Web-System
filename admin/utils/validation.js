const NAME_FIELD_ERROR = "Name fields must contain letters only and must not include numbers.";
const AGE_FIELD_ERROR = "Please enter a valid age.";
const NAME_REGEX = /^[A-Za-z\u00D1\u00F1]+(?:[ '\u2019-][A-Za-z\u00D1\u00F1]+)*$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PH_MOBILE_REGEX = /^(09\d{9}|639\d{9})$/;
const HOUSE_NO_REGEX = /^\d{1,5}$/;
const ADDRESS_TEXT_REGEX = /^[A-Za-z0-9Ññ\s.,#-]+$/;
const RESIDENT_TYPES = new Set(["Student", "Senior Citizen", "PWD", "Indigenous", "Resident"]);
const CIVIL_STATUSES = new Set(["Single", "Married", "Widowed", "Separated"]);
const SEX_OPTIONS = new Set(["Male", "Female"]);
const MIN_RESIDENT_AGE = 12;
const MAX_RESIDENT_AGE = 120;
const MAX_HOUSE_NO_LENGTH = 5;
const MAX_NUMBER_OF_CHILDREN = 69;

function cleanString(value) {
  return String(value ?? "").trim();
}

function normalizeNameValue(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeDigits(value) {
  return String(value ?? "").replace(/\D/g, "").trim();
}

function normalizePhMobile(value) {
  const digits = normalizeDigits(value);
  if (digits.startsWith("63") && digits.length === 12) return digits;
  if (digits.startsWith("09") && digits.length === 11) return digits;
  return digits;
}

function validateResidentAge(value) {
  const ageValue = cleanString(value);
  if (!ageValue) return "Age is required";

  const age = Number(ageValue);
  if (!Number.isInteger(age) || age < MIN_RESIDENT_AGE || age > MAX_RESIDENT_AGE) {
    return AGE_FIELD_ERROR;
  }

  return "";
}

function addError(errors, field, message) {
  if (!errors[field]) errors[field] = message;
}

function buildResult(errors) {
  const fields = Object.keys(errors);
  if (fields.length === 0) return null;
  return { message: errors[fields[0]], errors };
}

function validateResidentPayload(payload, { requirePassword = false } = {}) {
  const errors = {};
  const firstName = normalizeNameValue(payload.firstName);
  const middleName = normalizeNameValue(payload.middleName);
  const lastName = normalizeNameValue(payload.lastName);
  const birthday = cleanString(payload.birthday);
  const ageValue = cleanString(payload.age);
  const gender = cleanString(payload.gender);
  const civilStatus = cleanString(payload.civilStatus);
  const residentType = cleanString(payload.residentType) || "Resident";
  const houseNo = cleanString(payload.houseNo);
  const streetAddress = cleanString(payload.streetAddress);
  const contactNumber = normalizePhMobile(payload.contactNumber);
  const email = cleanString(payload.email).toLowerCase();
  const fatherName = normalizeNameValue(payload.fatherName);
  const motherName = normalizeNameValue(payload.motherName);
  const spouseName = normalizeNameValue(payload.spouseName);
  const emergencyContactName = normalizeNameValue(payload.emergencyContactName);
  const emergencyContactNumber = normalizePhMobile(payload.emergencyContactNumber);
  const emergencyContactAddress = cleanString(payload.emergencyContactAddress);
  const password = cleanString(payload.password);

  if (!firstName) addError(errors, "firstName", "First Name is required");
  else {
    if (firstName.length < 2) addError(errors, "firstName", "First Name must be at least 2 characters");
    if (firstName.length > 50) addError(errors, "firstName", "First Name must not exceed 50 characters");
    if (!NAME_REGEX.test(firstName)) addError(errors, "firstName", NAME_FIELD_ERROR);
  }

  if (middleName) {
    if (middleName.length > 50) addError(errors, "middleName", "Middle Name must not exceed 50 characters");
    if (!NAME_REGEX.test(middleName)) addError(errors, "middleName", NAME_FIELD_ERROR);
  }

  if (!lastName) addError(errors, "lastName", "Last Name is required");
  else {
    if (lastName.length < 2) addError(errors, "lastName", "Last Name must be at least 2 characters");
    if (lastName.length > 50) addError(errors, "lastName", "Last Name must not exceed 50 characters");
    if (!NAME_REGEX.test(lastName)) addError(errors, "lastName", NAME_FIELD_ERROR);
  }

  if (fatherName) {
    if (fatherName.length > 50) addError(errors, "fatherName", "Father's Name must not exceed 50 characters");
    if (!NAME_REGEX.test(fatherName)) addError(errors, "fatherName", NAME_FIELD_ERROR);
  }

  if (motherName) {
    if (motherName.length > 50) addError(errors, "motherName", "Mother's Name must not exceed 50 characters");
    if (!NAME_REGEX.test(motherName)) addError(errors, "motherName", NAME_FIELD_ERROR);
  }

  if (spouseName) {
    if (spouseName.length > 50) addError(errors, "spouseName", "Spouse's Name must not exceed 50 characters");
    if (!NAME_REGEX.test(spouseName)) addError(errors, "spouseName", NAME_FIELD_ERROR);
  }

  if (!birthday) addError(errors, "birthday", "Birth Date is required");
  else {
    const parsed = new Date(`${birthday}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(parsed.getTime())) addError(errors, "birthday", "Birth Date must be valid");
    else if (parsed >= today) addError(errors, "birthday", "Birth Date must be in the past");
  }

  const ageError = validateResidentAge(ageValue);
  if (ageError) addError(errors, "age", ageError);

  if (!gender) addError(errors, "gender", "Sex is required");
  else if (!SEX_OPTIONS.has(gender)) addError(errors, "gender", "Sex must be one of the available options");
  if (!civilStatus) addError(errors, "civilStatus", "Civil Status is required");
  else if (!CIVIL_STATUSES.has(civilStatus)) addError(errors, "civilStatus", "Civil Status must be one of the available options");
  if (!residentType) addError(errors, "residentType", "Resident Type is required");
  else if (!RESIDENT_TYPES.has(residentType)) addError(errors, "residentType", "Resident Type must be one of the available options");
  if (!houseNo) addError(errors, "houseNo", "House No. is required");
  else if (!HOUSE_NO_REGEX.test(houseNo)) addError(errors, "houseNo", "House No. must be digits only and must not exceed 5 digits");
  if (!streetAddress) addError(errors, "streetAddress", "Address is required");
  else {
    if (`${houseNo} ${streetAddress}`.trim().length < 5) addError(errors, "streetAddress", "Address must be at least 5 characters");
    if (streetAddress.length > 150) addError(errors, "streetAddress", "Address must not exceed 150 characters");
    if (!ADDRESS_TEXT_REGEX.test(streetAddress)) addError(errors, "streetAddress", "Address contains invalid characters");
  }

  if (!PH_MOBILE_REGEX.test(contactNumber)) addError(errors, "contactNumber", "Contact number must be a valid Philippine mobile number");
  if (!email) addError(errors, "email", "Email is required");
  else {
    if (email.length > 100) addError(errors, "email", "Email must not exceed 100 characters");
    if (!EMAIL_REGEX.test(email)) addError(errors, "email", "Email must be a valid email address");
  }

  if (!emergencyContactName) addError(errors, "emergencyContactName", "Emergency Contact Name is required");
  else {
    if (emergencyContactName.length < 2) addError(errors, "emergencyContactName", "Emergency Contact Name must be at least 2 characters");
    if (emergencyContactName.length > 50) addError(errors, "emergencyContactName", "Emergency Contact Name must not exceed 50 characters");
    if (!NAME_REGEX.test(emergencyContactName)) addError(errors, "emergencyContactName", NAME_FIELD_ERROR);
  }
  if (!PH_MOBILE_REGEX.test(emergencyContactNumber)) addError(errors, "emergencyContactNumber", "Emergency Contact Number must be a valid Philippine mobile number");
  if (!emergencyContactAddress) addError(errors, "emergencyContactAddress", "Emergency Contact Address is required");
  else {
    if (emergencyContactAddress.length > 150) addError(errors, "emergencyContactAddress", "Emergency Contact Address must not exceed 150 characters");
    if (!ADDRESS_TEXT_REGEX.test(emergencyContactAddress)) addError(errors, "emergencyContactAddress", "Emergency Contact Address contains invalid characters");
  }

  if (requirePassword) {
    if (!password) addError(errors, "password", "Password is required");
    else {
      if (password.length < 8) addError(errors, "password", "Password must be at least 8 characters");
      if (password.length > 64) addError(errors, "password", "Password must not exceed 64 characters");
    }
  }

  // Validate number of children
  const numberOfChildren = payload.numberOfChildren;
  if (numberOfChildren !== undefined && numberOfChildren !== null && numberOfChildren !== "") {
    const rawNumberOfChildren = cleanString(numberOfChildren);
    if (/^-/.test(rawNumberOfChildren)) {
      addError(errors, "numberOfChildren", "Number of children cannot be negative");
    } else if (!/^\d+$/.test(rawNumberOfChildren)) {
      addError(errors, "numberOfChildren", "Number of children must be a whole number");
    } else if (Number(rawNumberOfChildren) > MAX_NUMBER_OF_CHILDREN) {
      addError(errors, "numberOfChildren", `Number of children cannot exceed ${MAX_NUMBER_OF_CHILDREN}`);
    }
  }

  return buildResult(errors);
}

function validateResidentSelfProfilePayload(payload) {
  return validateResidentPayload(
    {
      ...payload,
      gender: payload.gender ?? "Resident",
      residentType: payload.residentType ?? "Resident",
      emergencyContactName: payload.emergencyContactName ?? payload.contactPerson,
      emergencyContactNumber: payload.emergencyContactNumber ?? payload.contactPersonNo,
      emergencyContactAddress: payload.emergencyContactAddress ?? payload.contactPersonAddress,
      houseNo: payload.houseNo ?? "0",
      streetAddress: payload.streetAddress ?? "Resident Address",
      age: payload.age ?? 18,
      birthday: payload.birthday ?? "2000-01-01",
      firstName: payload.firstName ?? "Resident",
      lastName: payload.lastName ?? "Resident",
    },
    { requirePassword: false }
  );
}

function validateOfficialPayload(payload, { requirePassword = false, allowedPositions = [] } = {}) {
  const errors = {};
  const adminName = cleanString(payload.adminName ?? payload.adminname);
  const position = cleanString(payload.position);
  const email = cleanString(payload.email).toLowerCase();
  const contactnumber = normalizePhMobile(payload.contactnumber ?? payload.contactNumber);
  const password = cleanString(payload.password);

  if (!adminName) addError(errors, "adminname", "Admin Name is required");
  else {
    if (adminName.length < 2) addError(errors, "adminname", "Admin Name must be at least 2 characters");
    if (adminName.length > 50) addError(errors, "adminname", "Admin Name must not exceed 50 characters");
    if (!NAME_REGEX.test(adminName)) addError(errors, "adminname", "Admin Name must contain letters and spaces only");
  }

  if (!position) addError(errors, "position", "Position is required");
  else if (allowedPositions.length > 0 && !allowedPositions.includes(position)) addError(errors, "position", "Position is invalid");

  if (!email) addError(errors, "email", "Email is required");
  else {
    if (email.length > 100) addError(errors, "email", "Email must not exceed 100 characters");
    if (!EMAIL_REGEX.test(email)) addError(errors, "email", "Email must be a valid email address");
  }

  if (!PH_MOBILE_REGEX.test(contactnumber)) addError(errors, "contactnumber", "Contact number must be a valid Philippine mobile number");

  if (requirePassword) {
    if (!password) addError(errors, "password", "Password is required");
    else {
      if (password.length < 8) addError(errors, "password", "Password must be at least 8 characters");
      if (password.length > 64) addError(errors, "password", "Password must not exceed 64 characters");
    }
  }

  return buildResult(errors);
}

function validateAnnouncementPayload(payload) {
  const errors = {};
  const title = cleanString(payload.title);
  const body = cleanString(payload.body);
  const audiences = Array.isArray(payload.targetAudience) ? payload.targetAudience : [];

  if (!title) addError(errors, "title", "Title is required");
  else {
    if (title.length < 5) addError(errors, "title", "Title must be at least 5 characters");
    if (title.length > 100) addError(errors, "title", "Title must not exceed 100 characters");
  }

  if (!body) addError(errors, "body", "Content is required");
  else {
    if (body.length < 10) addError(errors, "body", "Content must be at least 10 characters");
    if (body.length > 1000) addError(errors, "body", "Content must not exceed 1000 characters");
  }

  if (audiences.length === 0 && cleanString(payload.targetAudience) === "") {
    addError(errors, "targetAudience", "Target Audience is required");
  }

  if (payload.isScheduled) {
    const schedule = cleanString(payload.scheduledPublishDate);
    if (!schedule) addError(errors, "scheduledPublishDate", "Schedule Date is required");
    else if (Number.isNaN(new Date(schedule).getTime()) || new Date(schedule) <= new Date()) {
      addError(errors, "scheduledPublishDate", "Schedule Date must be in the future");
    }
  }

  return buildResult(errors);
}

function validateRequestPayload(payload) {
  const errors = {};
  const residentId = cleanString(payload.residentId);
  const requestType = cleanString(payload.requestType);
  const requestPurpose = cleanString(payload.requestPurpose);

  if (!residentId) addError(errors, "residentId", "Resident is required");
  if (!requestType) addError(errors, "requestType", "Document Type is required");
  else if (requestType.length > 100) addError(errors, "requestType", "Document Type must not exceed 100 characters");

  if (!requestPurpose) addError(errors, "requestPurpose", "Purpose is required");
  else {
    if (requestPurpose.length < 5) addError(errors, "requestPurpose", "Purpose must be at least 5 characters");
    if (requestPurpose.length > 200) addError(errors, "requestPurpose", "Purpose must not exceed 200 characters");
    if (!/[A-Za-z]/.test(requestPurpose)) addError(errors, "requestPurpose", "Purpose must include letters");
  }

  return buildResult(errors);
}

module.exports = {
  AGE_FIELD_ERROR,
  MAX_HOUSE_NO_LENGTH,
  MAX_RESIDENT_AGE,
  MIN_RESIDENT_AGE,
  cleanString,
  normalizeNameValue,
  normalizeDigits,
  normalizePhMobile,
  validateResidentPayload,
  validateResidentSelfProfilePayload,
  validateOfficialPayload,
  validateAnnouncementPayload,
  validateRequestPayload,
};
