import { useEffect, useState } from 'react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { validateDocumentRequestForm, type ValidationErrors } from '../../utils/validation';

type ServiceType = 'barangay-id' | 'certificate' | 'other' | null;

interface ResidentServicesProps {
  onRequestSubmit?: (requestData: any) => void; // kept (optional)
  onTrackRequest?: () => void;
}

export function ResidentServices({ onRequestSubmit, onTrackRequest }: ResidentServicesProps) {
  const [selectedService, setSelectedService] = useState<ServiceType>(null);

  return (
    <div className="pt-[73px] md:pt-[93px] min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto">
        {selectedService === null ? (
          <ServiceSelection onSelectService={setSelectedService} onTrackRequest={onTrackRequest} />
        ) : (
          <ServiceWebform
            serviceType={selectedService}
            onBack={() => setSelectedService(null)}
            onRequestSubmit={onRequestSubmit}
          />
        )}
      </div>
    </div>
  );
}

interface ServiceSelectionProps {
  onSelectService: (service: ServiceType) => void;
  onTrackRequest?: () => void;
}

function ServiceSelection({ onSelectService, onTrackRequest }: ServiceSelectionProps) {
  return (
    <div className="min-h-[calc(100vh-73px)] md:min-h-[calc(100vh-93px)] bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4 md:p-12">
      <div className="w-full max-w-[1000px]">
        <div className="text-center mb-6 md:mb-10">
          <h2 className="text-[24px] md:text-[32px] font-bold text-[#2957a1] mb-2 md:mb-3">Document Services</h2>
          <p className="text-gray-600 text-[14px] md:text-[16px]">Select a service to request your document</p>
        </div>

        <div className="space-y-4 md:space-y-5">
          <button
            onClick={() => onSelectService('barangay-id')}
            className="w-full bg-white hover:bg-gray-50 rounded-xl md:rounded-2xl p-4 md:p-8 flex items-center gap-4 md:gap-8 transition-all hover:shadow-2xl group transform hover:-translate-y-1 shadow-lg"
          >
            <div className="relative flex-shrink-0">
              <div className="w-[70px] h-[70px] md:w-[110px] md:h-[110px] bg-[#2957a1] rounded-full flex items-center justify-center shadow-lg">
                <div className="w-[55px] h-[55px] md:w-[85px] md:h-[85px] bg-[#5CE36C] rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 md:w-11 md:h-11 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-[16px] md:text-[24px] font-bold text-[#2957a1] group-hover:text-[#1e4380] transition-colors mb-1 md:mb-2">
                Barangay ID, Clearance & Certificate of Indigency
              </h3>
              <p className="text-gray-600 text-[12px] md:text-[14px]">
                Request official barangay identification documents and certificates
              </p>
            </div>
            <svg className="w-5 h-5 md:w-7 md:h-7 text-[#2957a1] group-hover:translate-x-2 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={() => onSelectService('other')}
            className="w-full bg-white hover:bg-gray-50 rounded-xl md:rounded-2xl p-4 md:p-8 flex items-center gap-4 md:gap-8 transition-all hover:shadow-2xl group transform hover:-translate-y-1 shadow-lg"
          >
            <div className="relative flex-shrink-0">
              <div className="w-[70px] h-[70px] md:w-[110px] md:h-[110px] bg-[#2957a1] rounded-full flex items-center justify-center shadow-lg">
                <div className="w-[55px] h-[55px] md:w-[85px] md:h-[85px] bg-[#EA4D48] rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 md:w-11 md:h-11 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-[16px] md:text-[24px] font-bold text-[#2957a1] group-hover:text-[#1e4380] transition-colors mb-1 md:mb-2">
                Other Documents
              </h3>
              <p className="text-gray-600 text-[12px] md:text-[14px]">
                Business permits, residency certificates, cedula, and other barangay documents
              </p>
            </div>
            <svg className="w-5 h-5 md:w-7 md:h-7 text-[#2957a1] group-hover:translate-x-2 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {onTrackRequest && (
            <button
              onClick={onTrackRequest}
              className="w-full bg-gradient-to-r from-[#2957a1] to-[#1e4380] hover:from-[#1e4380] hover:to-[#2957a1] text-white rounded-xl md:rounded-2xl p-4 md:p-6 flex items-center justify-center gap-3 transition-all hover:shadow-2xl shadow-lg transform hover:-translate-y-1"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span className="text-[16px] md:text-[18px] font-bold">Track My Requests</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface ServiceWebformProps {
  serviceType: ServiceType;
  onBack: () => void;
  onRequestSubmit?: (requestData: any) => void; // kept (optional)
}

type ResidentProfile = {
  ResidentID: string;
  FirstName: string;
  MiddleName: string;
  LastName: string;
  Age: number;
  Birthday: string; // expected: YYYY-MM-DD from backend (best)
  Gender: string;
  CivilStatus: string;
  HouseNumber: string;
  StreetAddress: string;
};

function ServiceWebform({ serviceType, onBack, onRequestSubmit }: ServiceWebformProps) {
  const API_BASE = "https://se-barangay-web-system.onrender.com";

  const [residentProfile, setResidentProfile] = useState<ResidentProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [formData, setFormData] = useState({
    documentType: '',
    customDocumentType: '',
    purpose: ''
  });

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showFinalSubmitConfirm, setShowFinalSubmitConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});


  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token =
          localStorage.getItem("token") ||
          localStorage.getItem("authToken") ||
          "";

        if (!token) {
          setResidentProfile(null);
          return;
        }

        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          setResidentProfile(null);
          return;
        }

        setResidentProfile(data as ResidentProfile);
      } catch {
        setResidentProfile(null);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationErrors(prev => {
      const next = { ...prev };
      delete next[field];
      if (field === 'documentType') delete next.customDocumentType;
      return next;
    });
  };

  const finalDocumentType =
    formData.documentType === 'Others' ? formData.customDocumentType : formData.documentType;

  const handleSubmitClick = (event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    const errors = validateDocumentRequestForm({
      documentType: formData.documentType,
      customDocumentType: formData.customDocumentType,
      purpose: formData.purpose,
    });
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) return;
    requestAnimationFrame(() => setShowSubmitConfirm(true));
  };

  //  real submit to DB + notifications
  const handleConfirmSubmit = async () => {
    const residentId = residentProfile?.ResidentID;
    if (!residentId) {
      setShowSubmitConfirm(false);
      return;
    }

    const errors = validateDocumentRequestForm({
      documentType: formData.documentType,
      customDocumentType: formData.customDocumentType,
      purpose: formData.purpose,
    });
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      setShowSubmitConfirm(false);
      return;
    }

    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      "";

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          residentId,
          requestType: finalDocumentType,
          requestPurpose: formData.purpose,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // backend sends {error, detail, code}
        console.error("Request submit failed:", data);
        setShowSubmitConfirm(false);
        return;
      }

      // optional callback to parent
      if (onRequestSubmit && residentProfile) {
        const fullName = [
          residentProfile.FirstName,
          residentProfile.MiddleName,
          residentProfile.LastName,
        ]
          .filter((part) => {
            const value = String(part ?? "").trim();
            return value && value.toLowerCase() !== "null" && value.toLowerCase() !== "undefined";
          })
          .join(" ");

        onRequestSubmit({
          residentId,
          name: fullName,
          documentType: finalDocumentType,
          purpose: formData.purpose,
          serviceType,
          dateRequested: new Date().toLocaleDateString(),
          requestId: data.requestId,
        });
      }

      // reset form
      setFormData({ documentType: "", customDocumentType: "", purpose: "" });
      setValidationErrors({});
      setShowFinalSubmitConfirm(false);
      setShowSubmitConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = () => {
    setFormData({ documentType: '', customDocumentType: '', purpose: '' });
    setValidationErrors({});
    onBack();
  };

  const nameText = residentProfile
    ? [residentProfile.FirstName, residentProfile.MiddleName, residentProfile.LastName]
        .filter((part) => {
          const value = String(part ?? '').trim();
          return value && value.toLowerCase() !== 'null' && value.toLowerCase() !== 'undefined';
        })
        .join(' ')
    : "Unknown Resident";

  return (
    <div className="min-h-[calc(100vh-73px)] md:min-h-[calc(100vh-93px)] bg-gradient-to-br from-gray-50 to-blue-50 px-3 sm:px-6 py-4 sm:py-8">
      <div className="max-w-[1200px] mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#2957a1] text-[14px] sm:text-[16px] font-semibold hover:text-[#1e4380] transition-colors mb-4 sm:mb-6"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Services
        </button>

        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-10">
          <div className="mb-4 sm:mb-6 md:mb-8 pb-4 sm:pb-6 border-b-2 border-gray-200">
            <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-[#2957a1] rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
                </svg>
              </div>
              <div>
                <h2 className="text-[20px] sm:text-[24px] md:text-[28px] text-[#2957a1] font-bold">Document Request Form</h2>
                <p className="text-gray-600 text-[12px] sm:text-[14px]">
                  {loadingProfile ? "Loading your profile..." : "Your information has been auto-filled from your profile"}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 sm:space-y-6 md:space-y-8">
            {/* Personal Information */}
            <div>
              <h3 className="text-[15px] sm:text-[18px] font-bold text-[#2957a1] mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                Personal Information
                <span className="text-[12px] text-gray-500 font-normal ml-2">(Auto-filled)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-[13px] text-gray-700 font-semibold block mb-2">Last Name</label>
                  <input
                    type="text"
                    value={residentProfile?.LastName ?? ''}
                    disabled
                    className="w-full border-2 border-gray-200 bg-gray-50 rounded-lg px-4 py-3 text-[14px] text-gray-600"
                  />
                </div>
                <div>
                  <label className="text-[13px] text-gray-700 font-semibold block mb-2">First Name</label>
                  <input
                    type="text"
                    value={residentProfile?.FirstName ?? ''}
                    disabled
                    className="w-full border-2 border-gray-200 bg-gray-50 rounded-lg px-4 py-3 text-[14px] text-gray-600"
                  />
                </div>
                <div>
                  <label className="text-[13px] text-gray-700 font-semibold block mb-2">Middle Name</label>
                  <input
                    type="text"
                    value={residentProfile?.MiddleName ?? ''}
                    disabled
                    className="w-full border-2 border-gray-200 bg-gray-50 rounded-lg px-4 py-3 text-[14px] text-gray-600"
                  />
                </div>
                <div>
                  <label className="text-[13px] text-gray-700 font-semibold block mb-2">Resident ID</label>
                  <input
                    type="text"
                    value={residentProfile?.ResidentID ?? ''}
                    disabled
                    className="w-full border-2 border-gray-200 bg-gray-50 rounded-lg px-4 py-3 text-[14px] text-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Demographics */}
            <div>
              <h3 className="text-[15px] sm:text-[18px] font-bold text-[#2957a1] mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                </svg>
                Demographics
                <span className="text-[12px] text-gray-500 font-normal ml-2">(Auto-filled)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="text-[13px] text-gray-700 font-semibold block mb-2">Age</label>
                  <input
                    type="text"
                    value={residentProfile?.Age ?? ''}
                    disabled
                    className="w-full border-2 border-gray-200 bg-gray-50 rounded-lg px-4 py-3 text-[14px] text-gray-600"
                  />
                </div>
                <div>
                  <label className="text-[13px] text-gray-700 font-semibold block mb-2">Sex</label>
                  <input
                    type="text"
                    value={residentProfile?.Gender ?? ''}
                    disabled
                    className="w-full border-2 border-gray-200 bg-gray-50 rounded-lg px-4 py-3 text-[14px] text-gray-600"
                  />
                </div>
                <div>
                  <label className="text-[13px] text-gray-700 font-semibold block mb-2">Civil Status</label>
                  <input
                    type="text"
                    value={residentProfile?.CivilStatus ?? ''}
                    disabled
                    className="w-full border-2 border-gray-200 bg-gray-50 rounded-lg px-4 py-3 text-[14px] text-gray-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                <div>
                  <label className="text-[13px] text-gray-700 font-semibold block mb-2">Birthday</label>
                  <input
                    type="date"
                    value={(residentProfile?.Birthday ?? '').slice(0, 10)}
                    disabled
                    className="w-full border-2 border-gray-200 bg-gray-50 rounded-lg px-4 py-3 text-[14px] text-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-[15px] sm:text-[18px] font-bold text-[#2957a1] mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                Address
                <span className="text-[12px] text-gray-500 font-normal ml-2">(Auto-filled)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-[13px] text-gray-700 font-semibold block mb-2">House No.</label>
                  <input
                    type="text"
                    value={residentProfile?.HouseNumber ?? ''}
                    disabled
                    className="w-full border-2 border-gray-200 bg-gray-50 rounded-lg px-4 py-3 text-[14px] text-gray-600"
                  />
                </div>
                <div>
                  <label className="text-[13px] text-gray-700 font-semibold block mb-2">Street Address</label>
                  <input
                    type="text"
                    value={residentProfile?.StreetAddress ?? ''}
                    disabled
                    className="w-full border-2 border-gray-200 bg-gray-50 rounded-lg px-4 py-3 text-[14px] text-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Document Details */}
            <div className="bg-blue-50 border-2 border-[#2957a1] rounded-xl p-4 sm:p-6">
              <h3 className="text-[15px] sm:text-[18px] font-bold text-[#2957a1] mb-4 sm:mb-6 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
                </svg>
                Document Details
                <span className="text-[12px] text-green-600 font-normal ml-2">(Required)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-[13px] text-gray-900 font-bold block mb-2">
                    Type of Document <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.documentType}
                    onChange={(e) => handleChange('documentType', e.target.value)}
                    className={`w-full rounded-lg px-4 py-3 text-[14px] text-gray-900 transition-all outline-none bg-white border-2 ${validationErrors.documentType ? 'border-red-500 focus:border-red-600' : 'border-[#2957a1] focus:border-[#1e4380]'}`}
                  >
                    <option value="">Select Document Type</option>
                    {serviceType === 'barangay-id' ? (
                      <>
                        <option value="Barangay Clearance">Barangay Clearance</option>
                        <option value="Barangay ID">Barangay ID</option>
                        <option value="Certificate of Indigency">Certificate of Indigency</option>
                      </>
                    ) : (
                      <>
                        <option value="Business Permit">Business Permit</option>
                        <option value="Cedula">Cedula</option>
                        <option value="Others">Others (Please Specify)</option>
                      </>
                    )}
                  </select>
                  {validationErrors.documentType && (
                    <p className="mt-1 text-xs font-medium text-red-600">{validationErrors.documentType}</p>
                  )}
                </div>

                {formData.documentType === 'Others' && (
                  <div>
                    <label className="text-[13px] text-gray-900 font-bold block mb-2">
                      Specify Document Type <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.customDocumentType}
                      onChange={(e) => handleChange('customDocumentType', e.target.value)}
                      maxLength={100}
                      className={`w-full rounded-lg px-4 py-3 text-[14px] text-gray-900 transition-all outline-none border-2 ${validationErrors.customDocumentType ? 'border-red-500 focus:border-red-600' : 'border-[#2957a1] focus:border-[#1e4380]'}`}
                      placeholder="Enter document type"
                    />
                    {validationErrors.customDocumentType && (
                      <p className="mt-1 text-xs font-medium text-red-600">{validationErrors.customDocumentType}</p>
                    )}
                  </div>
                )}

                <div className={formData.documentType === 'Others' ? 'md:col-span-2' : ''}>
                  <label className="text-[13px] text-gray-900 font-bold block mb-2">
                    Purpose <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.purpose}
                    onChange={(e) => handleChange('purpose', e.target.value)}
                    maxLength={200}
                    className={`w-full rounded-lg px-4 py-3 text-[14px] text-gray-900 transition-all outline-none border-2 ${validationErrors.purpose ? 'border-red-500 focus:border-red-600' : 'border-[#2957a1] focus:border-[#1e4380]'}`}
                    placeholder="e.g. Employment, School Requirements, Business Registration"
                  />
                  {validationErrors.purpose && (
                    <p className="mt-1 text-xs font-medium text-red-600">{validationErrors.purpose}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 sm:pt-6 border-t-2 border-gray-200">
              <button
                onClick={handleCancelClick}
                className="w-full sm:w-auto px-8 py-3 rounded-lg text-[14px] font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitClick}
                disabled={isSubmitting || loadingProfile || !residentProfile}
                className="w-full sm:w-auto px-10 py-3 rounded-lg text-[14px] font-bold text-white bg-[#5CE36C] hover:bg-[#4bc95b] transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Submit */}
      <ConfirmDialog
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        onConfirm={() => setShowFinalSubmitConfirm(true)}
        title="Confirm Document Request"
        message="Please review your request details before submitting:"
        confirmText="Continue"
        cancelText="Cancel"
        closeOnConfirm={false}
      >
        <div className="bg-blue-50 border-2 border-[#2957a1] rounded-lg p-4 space-y-2">
          <div className="flex justify-between">
            <span className="font-semibold text-gray-700">Name:</span>
            <span className="text-gray-900">{nameText}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-gray-700">Document Type:</span>
            <span className="text-gray-900">{finalDocumentType}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-gray-700">Purpose:</span>
            <span className="text-gray-900">{formData.purpose}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-gray-700">Date:</span>
            <span className="text-gray-900">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={showFinalSubmitConfirm}
        onClose={() => setShowFinalSubmitConfirm(false)}
        onConfirm={handleConfirmSubmit}
        title="Submit Request?"
        message="Are you sure you want to submit this document request? This action will send your request to the barangay for processing."
        confirmText={isSubmitting ? "Submitting..." : "Yes, Submit Request"}
        cancelText="Go Back"
        type="warning"
        closeOnConfirm={false}
      />

      {/* Confirm Cancel */}
      <ConfirmDialog
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel Request Form"
        message="Are you sure you want to cancel? All entered information will be lost."
        confirmText="Yes, Cancel"
        cancelText="No, Go Back"
        type="warning"
      />
    </div>
  );
}
