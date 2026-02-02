import { Download, X } from 'lucide-react';
import imgBarangayLogo from "../../assets/barangaylogo.png";

interface ViewBarangayIDProps {
  onClose: () => void;
  profileData: any;
}

export function ViewBarangayID({ onClose, profileData }: ViewBarangayIDProps) {
  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl max-w-[900px] w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between rounded-t-2xl">
            <div>
              <h1 className="text-[24px] text-[#2957a1] font-bold">Digital Barangay ID</h1>
              <p className="text-gray-600 text-[13px]">Your official digital identification card</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* ID Card Container */}
          <div className="p-8">
            {/* ID Card */}
            <div className="relative w-full max-w-[600px] mx-auto aspect-[1.586/1] bg-gradient-to-br from-[#2957a1] to-[#1e4380] rounded-2xl shadow-xl overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.1) 35px, rgba(255,255,255,.1) 70px)`
                }}></div>
              </div>

              {/* ID Content */}
              <div className="relative h-full p-8 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <img 
                      src={imgBarangayLogo} 
                      alt="Barangay Logo" 
                      className="w-16 h-16 bg-white rounded-full p-2"
                    />
                    <div className="text-white">
                      <p className="text-[11px] font-semibold opacity-90">Republic of the Philippines</p>
                      <p className="text-[16px] font-bold">BARANGAY 160</p>
                      <p className="text-[10px] opacity-80">Zone 14, District 2, Tondo, Manila</p>
                    </div>
                  </div>
                  <div className="text-white text-right">
                    <p className="text-[10px] opacity-80">Valid Until</p>
                    <p className="text-[14px] font-bold">Dec 31, 2026</p>
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex gap-6">
                  {/* Profile Picture */}
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 bg-white rounded-lg overflow-hidden border-4 border-white/30 shadow-lg">
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <span className="text-5xl text-gray-500 font-bold">
                          {profileData.firstName.charAt(0)}{profileData.lastName.charAt(0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="flex-1 text-white space-y-3">
                    <div>
                      <p className="text-[10px] opacity-70 font-semibold">FULL NAME</p>
                      <p className="text-[18px] font-bold uppercase">
                        {profileData.firstName} {profileData.middleName} {profileData.lastName}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[9px] opacity-70 font-semibold">DATE OF BIRTH</p>
                        <p className="text-[13px] font-bold">
                          {new Date(profileData.birthdate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] opacity-70 font-semibold">SEX</p>
                        <p className="text-[13px] font-bold">{profileData.sex}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[9px] opacity-70 font-semibold">ADDRESS</p>
                      <p className="text-[12px] font-semibold">
                        {profileData.houseNo} {profileData.street}, {profileData.barangay}
                      </p>
                      <p className="text-[12px] font-semibold">
                        Zone 14, District 2, Tondo, {profileData.city}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] opacity-70 font-semibold">CONTACT NUMBER</p>
                      <p className="text-[13px] font-bold">{profileData.contactNumber}</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-white/20 flex items-center justify-between">
                  <div className="text-white">
                    <p className="text-[9px] opacity-70 font-semibold">RESIDENT ID</p>
                    <p className="text-[16px] font-bold tracking-wider">RES2026-0123</p>
                  </div>
                  <div className="text-right text-white">
                    <p className="text-[8px] opacity-70">Signature</p>
                    <div className="h-8 flex items-end">
                      <p className="text-[14px] font-signature italic">
                        {profileData.firstName} {profileData.lastName}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex justify-center gap-4">
              <button className="flex items-center gap-2 bg-[#2957a1] hover:bg-[#1e4380] text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-md">
                <Download className="w-5 h-5" />
                Download ID
              </button>
              <button className="flex items-center gap-2 border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share ID
              </button>
            </div>

            {/* Info Notice */}
            <div className="mt-6 p-4 bg-blue-50 border-l-4 border-[#2957a1] rounded-lg">
              <p className="text-[13px] text-gray-700 leading-relaxed">
                <strong className="text-[#2957a1]">Note:</strong> This is your official digital barangay identification card. 
                Please present this ID when availing barangay services or during community activities. Keep this ID secure and do not share with unauthorized individuals.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}