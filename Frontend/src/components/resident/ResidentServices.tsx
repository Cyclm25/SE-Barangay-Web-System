import { useState } from 'react';
import imgBarangayLogo from "figma:asset/7511a4e875c007913e79ed3aaafb18e5fbc9b003.png";
import { ImageWithFallback } from '../figma/ImageWithFallback';

type ServiceType = 'barangay-id' | 'certificate' | 'other' | null;

interface ResidentServicesProps {
  onRequestSubmit?: (requestData: any) => void;
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
          {/* Barangay ID / Certificate Service */}
          <button
            onClick={() => onSelectService('barangay-id')}
            className="w-full bg-white hover:bg-gray-50 rounded-xl md:rounded-2xl p-4 md:p-8 flex items-center gap-4 md:gap-8 transition-all hover:shadow-2xl group transform hover:-translate-y-1 shadow-lg"
          >
            <div className="relative flex-shrink-0">
              <div className="w-[70px] h-[70px] md:w-[110px] md:h-[110px] bg-[#2957a1] rounded-full flex items-center justify-center shadow-lg">
                <div className="w-[55px] h-[55px] md:w-[85px] md:h-[85px] bg-[#5CE36C] rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 md:w-11 md:h-11 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              </div>
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-[16px] md:text-[24px] font-bold text-[#2957a1] group-hover:text-[#1e4380] transition-colors mb-1 md:mb-2">
                Barangay ID, Clearance & Certificate of Indigency
              </h3>
              <p className="text-gray-600 text-[12px] md:text-[14px]">Request official barangay identification documents and certificates</p>
            </div>
            <svg className="w-5 h-5 md:w-7 md:h-7 text-[#2957a1] group-hover:translate-x-2 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Other Documents Service */}
          <button
            onClick={() => onSelectService('other')}
            className="w-full bg-white hover:bg-gray-50 rounded-xl md:rounded-2xl p-4 md:p-8 flex items-center gap-4 md:gap-8 transition-all hover:shadow-2xl group transform hover:-translate-y-1 shadow-lg"
          >
            <div className="relative flex-shrink-0">
              <div className="w-[70px] h-[70px] md:w-[110px] md:h-[110px] bg-[#2957a1] rounded-full flex items-center justify-center shadow-lg">
                <div className="w-[55px] h-[55px] md:w-[85px] md:h-[85px] bg-[#EA4D48] rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 md:w-11 md:h-11 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
                  </svg>
                </div>
              </div>
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-[16px] md:text-[24px] font-bold text-[#2957a1] group-hover:text-[#1e4380] transition-colors mb-1 md:mb-2">
                Other Documents
              </h3>
              <p className="text-gray-600 text-[12px] md:text-[14px]">Business permits, residency certificates, cedula, and other barangay documents</p>
            </div>
            <svg className="w-5 h-5 md:w-7 md:h-7 text-[#2957a1] group-hover:translate-x-2 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Track Request Button */}
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
  onRequestSubmit?: (requestData: any) => void;
}

function ServiceWebform({ serviceType, onBack, onRequestSubmit }: ServiceWebformProps) {
  // Auto-filled data from logged-in resident profile
  const residentData = {
    lastName: 'Dela Cruz',
    firstName: 'Juan',
    middleName: 'Campos',
    suffix: '',
    age: '20',
    sex: 'Male',
    civilStatus: 'Single',
    birthday: '2004-10-30',
    houseNo: '15',
    streetAddress: 'Yuseco Street'
  };

  const [formData, setFormData] = useState({
    documentType: '',
    customDocumentType: '', // For "Others" option
    purpose: ''
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    const finalDocumentType = formData.documentType === 'Others' 
      ? formData.customDocumentType 
      : formData.documentType;

    if (onRequestSubmit) {
      onRequestSubmit({
        ...residentData,
        documentType: finalDocumentType,
        purpose: formData.purpose,
        serviceType,
        dateRequested: new Date().toLocaleDateString()
      });
    }
    // Reset form
    setFormData({
      documentType: '',
      customDocumentType: '',
      purpose: ''
    });
  };

  return (
    <div className="min-h-[calc(100vh-73px)] md:min-h-[calc(100vh-93px)] bg-gradient-to-br from-gray-50 to-blue-50 px-4 md:px-8 py-6 md:py-10">
      <div className="max-w-[1200px] mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#2957a1] text-[14px] md:text-[16px] font-semibold hover:text-[#1e4380] transition-colors mb-6 md:mb-8"
        >
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Services
        </button>

        <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-5 md:p-10">
          {/* Header */}
          <div className="mb-6 md:mb-8 pb-4 md:pb-6 border-b-2 border-gray-200">
            <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-[#2957a1] rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 md:w-8 md:h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-[20px] md:text-[28px] text-[#2957a1] font-bold">Document Request Form</h2>
                <p className="text-gray-600 text-[12px] md:text-[14px]">Your information has been auto-filled from your profile</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 md:space-y-8">
            {/* Personal Information Section - Read Only */}
            <div>
              <h3 className="text-[18px] font-bold text-[#2957a1] mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                Personal Information
                <span className="text-[12px] text-gray-500 font-normal ml-2">(Auto-filled)</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-[13px] text-gray-700 font-semibold block mb-2">Last Name</label>
                  <input
                    type="text"
                    value={residentData.lastName}
                    disabled
                    className="w-full border-2 border-gray-200 bg-gray-50 rounded-lg px-4 py-3 text-[14px] text-gray-600"
                  />
                </div>
                <div>
                  <label className="text-[13px] text-gray-700 font-semibold block mb-2">First Name</label>
                  <input
                    type="text"
                    value={residentData.firstName}
                    disabled
                    className="w-full border-2 border-gray-200 bg-gray-50 rounded-lg px-4 py-3 text-[14px] text-gray-600"
                  />
                </div>
                <div>
                  <label className="text-[13px] text-gray-700 font-semibold block mb-2">Middle Name</label>
                  <input
                    type="text"
                    value={residentData.middleName}
                    disabled
                    className="w-full border-2 border-gray-200 bg-gray-50 rounded-lg px-4 py-3 text-[14px] text-gray-600"
                  />
                </div>
                <div>
                  <label className="text-[13px] text-gray-700 font-semibold block mb-2">Suffix</label>
                  <input
                    type="text"
                    value={residentData.suffix || 'N/A'}
                    disabled
                    className="w-full border-2 border-gray-200 bg-gray-50 rounded-lg px-4 py-3 text-[14px] text-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Demographics Section - Read Only */}
            <div>
              <h3 className="text-[18px] font-bold text-[#2957a1] mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                </svg>
                Demographics
                <span className="text-[12px] text-gray-500 font-normal ml-2">(Auto-filled)</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="text-[13px] text-gray-700 font-semibold block mb-2">Age</label>
                  <input
                    type="text"
                    value={residentData.age}
                    disabled
                    className="w-full border-2 border-gray-200 bg-gray-50 rounded-lg px-4 py-3 text-[14px] text-gray-600"
                  />
                </div>
                <div>
                  <label className="text-[13px] text-gray-700 font-semibold block mb-2">Sex</label>
                  <input
                    type="text"
                    value={residentData.sex}
                    disabled
                    className="w-full border-2 border-gray-200 bg-gray-50 rounded-lg px-4 py-3 text-[14px] text-gray-600"
                  />
                </div>
                <div>
                  <label className="text-[13px] text-gray-700 font-semibold block mb-2">Civil Status</label>
                  <input
                    type="text"
                    value={residentData.civilStatus}
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
                    value={residentData.birthday}
                    disabled
                    className="w-full border-2 border-gray-200 bg-gray-50 rounded-lg px-4 py-3 text-[14px] text-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Address Section - Read Only */}
            <div>
              <h3 className="text-[18px] font-bold text-[#2957a1] mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                Address
                <span className="text-[12px] text-gray-500 font-normal ml-2">(Auto-filled)</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-[13px] text-gray-700 font-semibold block mb-2">House No.</label>
                  <input
                    type="text"
                    value={residentData.houseNo}
                    disabled
                    className="w-full border-2 border-gray-200 bg-gray-50 rounded-lg px-4 py-3 text-[14px] text-gray-600"
                  />
                </div>
                <div>
                  <label className="text-[13px] text-gray-700 font-semibold block mb-2">Street Address</label>
                  <input
                    type="text"
                    value={residentData.streetAddress}
                    disabled
                    className="w-full border-2 border-gray-200 bg-gray-50 rounded-lg px-4 py-3 text-[14px] text-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Document Request Section - Editable */}
            <div className="bg-blue-50 border-2 border-[#2957a1] rounded-xl p-6">
              <h3 className="text-[18px] font-bold text-[#2957a1] mb-6 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
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
                    className="w-full border-2 border-[#2957a1] focus:border-[#1e4380] rounded-lg px-4 py-3 text-[14px] text-gray-900 transition-all outline-none bg-white"
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
                </div>
                
                {/* Custom Document Type Input - Show only when "Others" is selected */}
                {formData.documentType === 'Others' && (
                  <div>
                    <label className="text-[13px] text-gray-900 font-bold block mb-2">
                      Specify Document Type <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.customDocumentType}
                      onChange={(e) => handleChange('customDocumentType', e.target.value)}
                      className="w-full border-2 border-[#2957a1] focus:border-[#1e4380] rounded-lg px-4 py-3 text-[14px] text-gray-900 transition-all outline-none"
                      placeholder="Enter document type"
                    />
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
                    className="w-full border-2 border-[#2957a1] focus:border-[#1e4380] rounded-lg px-4 py-3 text-[14px] text-gray-900 transition-all outline-none"
                    placeholder="e.g. Employment, School Requirements, Business Registration"
                  />
                </div>
              </div>
            </div>

            {/* Submit Section */}
            <div className="flex justify-end gap-4 pt-6 border-t-2 border-gray-200">
              <button
                onClick={onBack}
                className="px-8 py-3 rounded-lg text-[14px] font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-10 py-3 rounded-lg text-[14px] font-bold text-white bg-[#5CE36C] hover:bg-[#4bc95b] transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}