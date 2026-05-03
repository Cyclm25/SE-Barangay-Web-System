import { useState, useEffect } from 'react';
import { Camera, Edit2, CreditCard } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { toast } from 'sonner';
import { ViewBarangayID } from './ViewBarangayID';
import {
  MAX_HOUSE_NO_LENGTH,
  validateResidentForm,
  type ValidationErrors,
} from '../../utils/validation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

const createDefaultProfileData = () => ({
  firstName: 'First Name',
  middleName: 'Middle Name',
  lastName: 'Last Name',
  suffix: '',
  birthdate: '1990-01-01',
  age: '34',
  sex: 'Sex',
  civilStatus: 'Single',
  nationality: 'Filipino',
  religion: 'Roman Catholic',
  contactNumber: '09123456789',
  email: 'example@email.com',
  houseNo: '15',
  street: 'Yuseco Street',
  barangay: 'Barangay 160',
  city: 'Manila',
  province: 'Metro Manila',
  zipCode: '1013',
  emergencyContactName: 'Contact Name',
  emergencyContactRelation: '',
  emergencyContactAddress: '',
  emergencyContactNumber: '09123456789',
});

const RELIGION_OPTIONS = [
  'Roman Catholic',
  'Islam',
  'Iglesia ni Cristo',
  'Aglipayan',
  'Seventh-day Adventist',
  'Bible Baptist Church',
  'United Church of Christ',
  "Jehovah's Witnesses",
  'The Church of Jesus Christ',
  'Born Again Christian',
  'Dating Daan',
  'Buddhism',
  'Hinduism',
  'None',
  'Other',
];

type ResidentProfileData = ReturnType<typeof createDefaultProfileData>;

type ResidentDbSnapshot = {
  residentType: string;
  voterStatus: boolean | string;
  fatherName: string;
  motherName: string;
  spouseName: string;
  numberOfChildren: number;
  emergencyContactAddress: string;
  profileImagePath: string | null;
};

export function ResidentProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [showBarangayID, setShowBarangayID] = useState(false);
  const [profileData, setProfileData] = useState<ResidentProfileData>(createDefaultProfileData);
  const [draftProfileData, setDraftProfileData] = useState<ResidentProfileData | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [residentDbSnapshot, setResidentDbSnapshot] = useState<ResidentDbSnapshot | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    const userType = localStorage.getItem("userType");
    const residentId = localStorage.getItem("residentId");

    console.log("🧾 ResidentProfile mounted");
    console.log("userType =", userType);
    console.log("residentId =", residentId);

    if (userType !== "resident" || !residentId) {
      console.warn("⛔ Skipping fetch: userType not resident OR residentId missing");
      return;
    }

    (async () => {
      const url = `http://localhost:5001/residents/${encodeURIComponent(residentId)}`;
      console.log("➡️ Fetching:", url);

      try {
        const res = await fetch(url, {
          method: "GET",
          headers: { "Accept": "application/json" },
        });

        const raw = await res.text();
        console.log("✅ Response status:", res.status);
        console.log("✅ Raw response:", raw);

        let data: any = null;
        try {
          data = JSON.parse(raw);
        } catch {
          // backend returned HTML or plain text
        }

        if (!res.ok) {
          toast.error(data?.error || `Failed to load profile (HTTP ${res.status})`);
          return;
        }

        if (!data) {
          toast.error("Backend did not return JSON. Check your route / server.");
          return;
        }

        // Load profile image from backend
        if (data.ProfileImage) {
          const imgUrl = data.ProfileImage.startsWith('data:')
            ? data.ProfileImage  // base64
            : `http://localhost:5001${data.ProfileImage}`;  // file path
          setProfileImage(imgUrl);
        }

        setProfileData({
          firstName: data.FirstName || '',
          middleName: data.MiddleName || '',
          lastName: data.LastName || '',
          suffix: '',
          birthdate: data.Birthday || '',
          age: data.Age != null ? String(data.Age) : '',
          sex: data.Gender || '',
          civilStatus: data.CivilStatus ?? data.civilStatus ?? data.civilstatus ?? '',
          nationality: 'Filipino',
          religion: data.Religion || data.religion || 'Roman Catholic',
          contactNumber: data.ContactNumber || '',
          email: data.Email || '',
          houseNo: data.HouseNumber || '',
          street: data.StreetAddress || '',
          barangay: 'Barangay 160',
          city: data.City || data.city || 'Manila',
          province: data.Province || data.province || 'Metro Manila',
          zipCode: data.ZipCode || data.zipcode || '',
          emergencyContactName: data.ContactPerson || '',
          emergencyContactRelation: '',
          emergencyContactNumber: data.ContactPersonNo || '',
          emergencyContactAddress: data.ContactPersonAddress || ''
        });
        setResidentDbSnapshot({
          residentType: data.ResidentType || 'Resident',
          voterStatus: data.VoterStatus ?? false,
          fatherName: data.FatherName || '',
          motherName: data.MotherName || '',
          spouseName: data.SpouseName || '',
          numberOfChildren: Number(data.NoOfChildren ?? 0),
          emergencyContactAddress: data.ContactPersonAddress || '',
          profileImagePath: data.ProfileImage || null,
        });
      } catch (err) {
        console.error("❌ Fetch failed:", err);
        toast.error("Could not connect to server.");
      }
    })();
  }, []);

  // keep the contact number in local PH mobile format: 09XXXXXXXXX
  useEffect(() => {
    const sourceNumber = isEditing
      ? draftProfileData?.contactNumber || profileData.contactNumber || ''
      : profileData.contactNumber || '';
    const digitsOnly = (sourceNumber.match(/\d+/g) || []).join('');

    let normalized = digitsOnly;
    if (digitsOnly.startsWith('63') && digitsOnly.length >= 12) {
      normalized = `0${digitsOnly.slice(2)}`;
    } else if (digitsOnly.startsWith('9') && digitsOnly.length === 10) {
      normalized = `0${digitsOnly}`;
    }

    setContactLocal(normalized.slice(0, 11));
  }, [profileData.contactNumber, draftProfileData?.contactNumber, isEditing]);

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [contactLocal, setContactLocal] = useState('');
  const [contactError, setContactError] = useState('');
  const voterStatusText =
    residentDbSnapshot?.voterStatus === true ||
    String(residentDbSnapshot?.voterStatus ?? '').trim().toLowerCase() === 'true' ||
    String(residentDbSnapshot?.voterStatus ?? '').trim() === '1'
      ? 'VOTER'
      : 'NON-VOTER';

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const residentId = localStorage.getItem("residentId");
    let token = localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("jwt") || null;

    if (token) {
      token = token.replace(/^"|"$/g, ''); // Strip accidental quotes
    }

    if (!residentId || !token) {
      toast.error("Session expired. Please log in again.");
      return;
    }

    const loadingId = toast.loading("Uploading profile picture...");

    try {
      const formData = new FormData();
      formData.append("profileImage", file, file.name);

      const response = await fetch(`http://localhost:5001/api/upload/profile-picture/${residentId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Upload failed");
      }

      const fullUrl = `http://localhost:5001${data.imageUrl}`;
      setProfileImage(fullUrl);
      toast.success("Profile picture updated successfully!", { id: loadingId });

    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload image.", { id: loadingId });
    }
  };

  const handleEditStart = () => {
    setDraftProfileData({ ...profileData });
    setContactError('');
    setValidationErrors({});
    setIsEditing(true);
  };

  const handleChange = (field: keyof ResidentProfileData, value: string) => {
    if (!isEditing) return;
    const nextValue =
      field === 'houseNo'
        ? value.toUpperCase().slice(0, MAX_HOUSE_NO_LENGTH)
        : value;
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      if (field === 'birthdate') delete next.birthday;
      if (field === 'sex') delete next.gender;
      if (field === 'street') delete next.streetAddress;
      return next;
    });
    setDraftProfileData(prev => ({ ...(prev ?? profileData), [field]: nextValue }));
  };

  const handleCancel = () => {
    if (!isEditing) return;
    const hasChanges = JSON.stringify(draftProfileData ?? profileData) !== JSON.stringify(profileData);
    if (!hasChanges) {
      setDraftProfileData(null);
      setContactError('');
      setIsEditing(false);
      return;
    }
    setShowCancelConfirm(true);
  };

  const handleSaveClick = () => {
    if (!isEditing || !draftProfileData) return;

    const local = (contactLocal || '').trim();
    const errors = validateResidentForm({
      ...draftProfileData,
      birthdate: draftProfileData.birthdate,
      sex: draftProfileData.sex,
      street: draftProfileData.street,
      residentType: residentDbSnapshot?.residentType || 'Resident',
      emergencyContactNumber: draftProfileData.emergencyContactNumber,
      contactNumber: local,
    });
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      setContactError(errors.contactNumber || '');
      toast.error(Object.values(errors)[0]);
      return;
    }

    setContactError('');
    setShowSaveConfirm(true);
  };

  const handleConfirmCancel = () => {
    setDraftProfileData(null);
    setContactError('');
    setShowCancelConfirm(false);
    setIsEditing(false);
  };

  const handleConfirmSave = async () => {
    if (!draftProfileData) {
      setShowSaveConfirm(false);
      setIsEditing(false);
      return;
    }

    const residentId = localStorage.getItem('residentId');
    if (!residentId) {
      toast.error('Resident session not found.');
      return;
    }

    const local = (contactLocal || '').trim();
    const errors = validateResidentForm({
      ...draftProfileData,
      birthdate: draftProfileData.birthdate,
      sex: draftProfileData.sex,
      street: draftProfileData.street,
      residentType: residentDbSnapshot?.residentType || 'Resident',
      emergencyContactNumber: draftProfileData.emergencyContactNumber,
      contactNumber: local,
    });
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      setContactError(errors.contactNumber || '');
      toast.error(Object.values(errors)[0]);
      return;
    }

    setIsSaving(true);

    try {
      const updatedProfile: ResidentProfileData = {
        ...draftProfileData,
        contactNumber: local,
        emergencyContactAddress:
          draftProfileData.emergencyContactAddress || residentDbSnapshot?.emergencyContactAddress || '',
      };

      const payload = {
        firstName: updatedProfile.firstName.trim(),
        middleName: updatedProfile.middleName.trim(),
        lastName: updatedProfile.lastName.trim(),
        age: updatedProfile.age.trim(),
        birthday: updatedProfile.birthdate,
        gender: updatedProfile.sex.trim(),
        civilStatus: updatedProfile.civilStatus.trim(),
        nationality: updatedProfile.nationality.trim(),
        religion: updatedProfile.religion.trim(),
        contactNumber: updatedProfile.contactNumber.trim(),
        email: updatedProfile.email.trim(),
        houseNo: updatedProfile.houseNo.trim(),
        streetAddress: updatedProfile.street.trim(),
        city: updatedProfile.city.trim(),
        province: updatedProfile.province.trim(),
        zipCode: updatedProfile.zipCode.trim(),
        voterStatus: residentDbSnapshot?.voterStatus,
        residentType: residentDbSnapshot?.residentType,
        fatherName: residentDbSnapshot?.fatherName || '',
        motherName: residentDbSnapshot?.motherName || '',
        spouseName: residentDbSnapshot?.spouseName || '',
        numberOfChildren: residentDbSnapshot?.numberOfChildren ?? 0,
        emergencyContactName: updatedProfile.emergencyContactName.trim(),
        emergencyContactNumber: updatedProfile.emergencyContactNumber.trim(),
        emergencyContactAddress: updatedProfile.emergencyContactAddress.trim(),
      };

      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5001/residents/${encodeURIComponent(residentId)}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();
      let responseData: any = null;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = null;
      }

      if (!res.ok) {
        throw new Error(responseData?.error || `Failed to update profile (HTTP ${res.status})`);
      }

      setProfileData(updatedProfile);
      setDraftProfileData(null);
      setShowSaveConfirm(false);
      setShowCancelConfirm(false);
      setIsEditing(false);
      setContactError('');
      toast.success('Profile information updated successfully!');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const visibleProfileData = isEditing && draftProfileData ? draftProfileData : profileData;

  return (
    <div className="pt-[73px] md:pt-[93px] min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6 md:py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4">
          <div>
            <h1 className="text-[24px] md:text-[32px] text-[#2957a1] font-bold">
              Personal Information
            </h1>
            <p className="text-gray-600 text-[13px] md:text-[14px] mt-1">Manage your profile details</p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl md:rounded-2xl shadow-lg overflow-hidden">
          {/* Profile Header with Image */}
          <div className="bg-gradient-to-r from-[#2957a1] to-[#1e4380] p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
              <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
                {/* Profile Picture */}
                <div className="relative group">
                  <div className="w-[120px] h-[120px] md:w-[160px] md:h-[160px] rounded-full overflow-hidden border-4 border-white shadow-lg bg-white">
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <span className="text-4xl md:text-6xl text-gray-500 font-bold">
                          {profileData.firstName.charAt(0)}{profileData.lastName.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-[#5CE36C] hover:bg-[#4bc95b] p-2.5 md:p-3 rounded-full cursor-pointer shadow-lg transition-colors">
                    <Camera className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>

                {/* Name and Basic Info */}
                <div className="flex-1 text-white text-center md:text-left">
                  <h2 className="text-[24px] md:text-[36px] font-bold mb-2">
                    {profileData.firstName} {profileData.middleName} {profileData.lastName} {profileData.suffix}
                  </h2>
                  <div className="flex flex-col md:flex-row gap-2 md:gap-6 text-[14px] md:text-[16px] opacity-90">
                    <p><strong>Age:</strong> {profileData.age}</p>
                    <p><strong>Sex:</strong> {profileData.sex}</p>
                    <p><strong>Civil Status:</strong> {profileData.civilStatus}</p>
                    <p><strong>Voter:</strong> {voterStatusText}</p>
                  </div>
                  <p className="mt-2 text-[14px] opacity-80">
                    Resident ID: {localStorage.getItem("residentId") || "-"}
                  </p>
                </div>
              </div>

              {/* View Barangay ID Button */}
              <button
                onClick={() => setShowBarangayID(true)}
                className="flex items-center justify-center gap-2 bg-[#5CE36C] hover:bg-[#4bc95b] text-white px-5 md:px-6 py-2.5 md:py-3 rounded-lg text-[14px] md:text-[16px] font-semibold transition-colors shadow-md hover:shadow-lg"
              >
                <CreditCard className="w-4 h-4 md:w-5 md:h-5" />
                View Barangay ID
              </button>
            </div>
          </div>

          {/* Form Sections */}
          <div className="p-4 md:p-8 space-y-6 md:space-y-8">
            {/* Personal Information */}
            <div>
              <div className="flex items-center justify-between mb-4 md:mb-6 pb-2 border-b-2 border-[#2957a1]">
                <h3 className="text-[20px] md:text-[24px] text-[#2957a1] font-bold">
                  Personal Details
                </h3>
                {!isEditing ? (
                  <button
                    onClick={handleEditStart}
                    className="flex items-center justify-center bg-[#2957a1] hover:bg-[#1e4380] text-white p-2 md:p-2.5 rounded-lg transition-colors shadow-md hover:shadow-lg"
                    title="Edit Profile"
                  >
                    <Edit2 className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancel}
                      className="px-3 md:px-4 py-1.5 md:py-2 border-2 border-gray-300 text-gray-700 rounded-lg text-[12px] md:text-[13px] font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveClick}
                      className="px-3 md:px-4 py-1.5 md:py-2 bg-[#5CE36C] hover:bg-[#4bc95b] text-white rounded-lg text-[12px] md:text-[13px] font-semibold transition-colors shadow-md"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField
                  label="First Name"
                  value={visibleProfileData.firstName}
                  onChange={(value) => handleChange('firstName', value)}
                  isEditing={false}
                />
                <FormField
                  label="Middle Name"
                  value={visibleProfileData.middleName}
                  onChange={(value) => handleChange('middleName', value)}
                  isEditing={false}
                />
                <FormField
                  label="Last Name"
                  value={visibleProfileData.lastName}
                  onChange={(value) => handleChange('lastName', value)}
                  isEditing={false}
                />
                {/* <FormField
                  label="Suffix"
                  value={visibleProfileData.suffix}
                  onChange={(value) => handleChange('suffix', value)}
                  isEditing={false}
                  placeholder="Jr., Sr., III"
                /> ADD NALANG KAPAG NAKALAGAY NA SA DATABASE*/}
                <FormField
                  label="Birthdate"
                  type="date"
                  value={visibleProfileData.birthdate}
                  onChange={(value) => handleChange('birthdate', value)}
                  isEditing={false}
                />
                <FormField
                  label="Age"
                  type="number"
                  value={visibleProfileData.age}
                  onChange={(value) => handleChange('age', value)}
                  isEditing={false}
                />
                <FormField
                  label="Sex"
                  type="select"
                  value={visibleProfileData.sex}
                  onChange={(value) => handleChange('sex', value)}
                  isEditing={false}
                  options={['Male', 'Female']}
                />
                <FormField
                  label="Civil Status"
                  type="select"
                  value={visibleProfileData.civilStatus}
                  onChange={(value) => handleChange('civilStatus', value)}
                  isEditing={isEditing}
                  options={['Single', 'Married', 'Widowed', 'Separated']}
                />
                {/* <FormField
                  label="Nationality"
                  value={visibleProfileData.nationality}
                  onChange={(value) => handleChange('nationality', value)}
                  isEditing={isEditing}
                /> */}
                <FormField
                  label="Religion"
                  type="select"
                  value={visibleProfileData.religion}
                  onChange={(value) => handleChange('religion', value)}
                  isEditing={isEditing}
                  options={RELIGION_OPTIONS}
                />
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-[20px] md:text-[24px] text-[#2957a1] font-bold mb-4 md:mb-6 pb-2 border-b-2 border-[#2957a1]">
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[12px] md:text-[13px] text-gray-700 font-semibold mb-2">Contact Number</label>
                  {isEditing ? (
                    <div>
                      <div className="flex items-center">
                        <div className="flex items-center border-2 border-[#2957a1] rounded-lg overflow-hidden w-full">
                          <span className="inline-flex items-center px-3 py-2 text-sm">+63</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={contactLocal}
                            onChange={(e) => {
                              const cleaned = (e.target.value || '').replace(/\D/g, '').slice(0, 11);
                              setContactLocal(cleaned);
                              if (!cleaned) {
                                setContactError('');
                              } else if (/^09\d{9}$/.test(cleaned)) {
                                setContactError('');
                              } else {
                                setContactError('Enter 11 digits starting with 09');
                              }
                            }}
                            placeholder="09123456789"
                            className="w-full px-3 md:px-4 py-2 md:py-2.5 text-[14px] md:text-[15px] focus:outline-none"
                          />
                        </div>
                      </div>
                      {contactError && <p className="text-sm text-red-600 mt-1">{contactError}</p>}
                      <p className="text-xs text-gray-500 mt-1">Enter 10 digits (must start with 9). Country code <strong>+63</strong> is applied automatically.</p>
                    </div>
                  ) : (
                    <div className="w-full bg-gray-50 border-2 border-gray-200 rounded-lg px-3 md:px-4 py-2 md:py-2.5 text-[14px] md:text-[15px] text-gray-700">
                      {profileData.contactNumber || '-'}
                    </div>
                  )}
                </div>
                <div>
                  <FormField
                    label="Email Address"
                    type="email"
                    value={visibleProfileData.email}
                    onChange={(value) => handleChange('email', value)}
                    isEditing={isEditing}
                  />
                  {isEditing && (
                    <p className="text-sm text-gray-500 mt-1">
                      Please use a valid Gmail address for your email information.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h3 className="text-[20px] md:text-[24px] text-[#2957a1] font-bold mb-4 md:mb-6 pb-2 border-b-2 border-[#2957a1]">
                Address
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField
                  label="House No."
                  value={visibleProfileData.houseNo}
                  onChange={(value) => handleChange('houseNo', value)}
                  isEditing={isEditing}
                  maxLength={MAX_HOUSE_NO_LENGTH}
                />
                <FormField
                  label="Street"
                  value={visibleProfileData.street}
                  onChange={(value) => handleChange('street', value)}
                  isEditing={isEditing}
                />
                <FormField
                  label="Barangay"
                  value={visibleProfileData.barangay}
                  onChange={(value) => handleChange('barangay', value)}
                  isEditing={false}
                />
                <FormField
                  label="City"
                  value={visibleProfileData.city}
                  onChange={(value) => handleChange('city', value)}
                  isEditing={false}
                />
                <FormField
                  label="Province"
                  value={visibleProfileData.province}
                  onChange={(value) => handleChange('province', value)}
                  isEditing={false}
                />
                <FormField
                  label="Zip Code"
                  value={visibleProfileData.zipCode}
                  onChange={(value) => handleChange('zipCode', value)}
                  isEditing={false}
                />
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <h3 className="text-[20px] md:text-[24px] text-[#2957a1] font-bold mb-4 md:mb-6 pb-2 border-b-2 border-[#2957a1]">
                Emergency Contact
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* FIXED: isEditing prop is now dynamic instead of false */}
                <FormField
                  label="Contact Name"
                  value={visibleProfileData.emergencyContactName}
                  onChange={(value) => handleChange('emergencyContactName', value)}
                  isEditing={isEditing} 
                />
                <FormField
                  label="Relationship"
                  value={profileData.emergencyContactRelation}
                  onChange={(value) => handleChange('emergencyContactRelation', value)}
                  isEditing={false}
                />
                <FormField
                  label="Contact Number"
                  type="tel"
                  value={visibleProfileData.emergencyContactNumber}
                  onChange={(value) => handleChange('emergencyContactNumber', value)}
                  isEditing={isEditing}
                />
              </div>
              {/* Added the emergency address field so they can actually edit it */}
              <div className="mt-6">
                 <FormField
                  label="Emergency Contact Address"
                  value={profileData.emergencyContactAddress}
                  onChange={(value) => handleChange('emergencyContactAddress', value)}
                  isEditing={isEditing}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Barangay ID Modal */}
        {showBarangayID && (
          <ViewBarangayID
            onClose={() => setShowBarangayID(false)}
            profileData={profileData}
          />
        )}

        <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Save profile changes?</AlertDialogTitle>
              <AlertDialogDescription>
                Your resident information will only be updated after you confirm this action.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Confirm Save'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard profile changes?</AlertDialogTitle>
              <AlertDialogDescription>
                If you continue, your unsaved resident information changes will be discarded.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Editing</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmCancel}>
                Discard Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isEditing: boolean;
  type?: 'text' | 'number' | 'date' | 'tel' | 'email' | 'select';
  placeholder?: string;
  options?: string[];
  isEditable?: boolean;
  maxLength?: number;
}

function FormField({ label, value, onChange, isEditing, type = 'text', placeholder, options, isEditable = false, maxLength }: FormFieldProps) {
  const shouldUppercase = type !== 'email';
  const displayValue = value ? (shouldUppercase ? value.toUpperCase() : value) : '-';
  return (
    <div>
      <label className="block text-[12px] md:text-[13px] text-gray-700 font-semibold mb-2">
        {label}
        {isEditable && isEditing && <span className="text-green-600 text-[11px] ml-2">(Editable)</span>}
      </label>
      {isEditing ? (
        type === 'select' ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full border-2 border-[#2957a1] rounded-lg px-3 md:px-4 py-2 md:py-2.5 text-[14px] md:text-[15px] uppercase focus:outline-none focus:ring-2 focus:ring-[#2957a1]/50 bg-white"
          >
            {/* <option value="">Select...</option> */}
            {options?.map((option) => (
              <option key={option} value={option}>{option.toUpperCase()}</option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            className={`w-full border-2 border-[#2957a1] rounded-lg px-3 md:px-4 py-2 md:py-2.5 text-[14px] md:text-[15px] focus:outline-none focus:ring-2 focus:ring-[#2957a1]/50 ${shouldUppercase ? 'uppercase' : ''}`}
          />
        )
      ) : (
        <div className={`w-full bg-gray-50 border-2 border-gray-200 rounded-lg px-3 md:px-4 py-2 md:py-2.5 text-[14px] md:text-[15px] text-gray-700 ${shouldUppercase ? 'uppercase' : ''}`}>
          {displayValue}
        </div>
      )}
    </div>
  );
}
