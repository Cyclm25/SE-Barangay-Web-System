import { FileText, Calendar, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

export function TrackRequest() {
  const requests = [
    {
      id: '1',
      documentType: 'Barangay Clearance',
      name: 'Juan Dela Cruz',
      dateRequested: 'September 14, 2025',
      status: 'Pickup',
      statusColor: 'bg-[#5ce36c]',
      statusIcon: <CheckCircle className="w-5 h-5" />
    },
    {
      id: '2',
      documentType: 'Barangay Clearance',
      name: 'Juan Dela Cruz',
      dateRequested: 'September 24, 2025',
      status: 'Pending',
      statusColor: 'bg-[#2957a1]',
      statusIcon: <Clock className="w-5 h-5" />
    },
    {
      id: '3',
      documentType: 'Barangay Clearance',
      name: 'Juan Dela Cruz',
      dateRequested: 'December 14, 2025',
      status: 'Denied',
      statusColor: 'bg-[#ea4d48]',
      statusIcon: <XCircle className="w-5 h-5" />,
      remarks: 'The provided details (e.g., name, birthday, address) do not match our records.'
    }
  ];

  return (
    <div className="pt-[73px] md:pt-[93px] min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6 md:py-10">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-[24px] md:text-[32px] text-[#2957a1] font-bold mb-2">Track My Requests</h1>
          <p className="text-gray-600 text-[13px] md:text-[14px]">Monitor the status of your document requests</p>
        </div>

        {/* Requests List */}
        <div className="space-y-4 md:space-y-5">
          {requests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-lg md:rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden"
            >
              <div className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between mb-4 gap-3">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-[#2957a1] to-[#1e4380] rounded-full flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 md:w-7 md:h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-[18px] md:text-[22px] text-[#2957a1] font-bold">
                        {request.documentType}
                      </h3>
                      <p className="text-[13px] md:text-[14px] text-gray-600 mt-0.5">Request ID: #{request.id.padStart(6, '0')}</p>
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  <div className={`${request.statusColor} text-white px-4 md:px-5 py-2 rounded-full flex items-center gap-2 shadow-md self-start`}>
                    {request.statusIcon}
                    <span className="text-[13px] md:text-[14px] font-bold">{request.status}</span>
                  </div>
                </div>

                {/* Request Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4">
                  <div className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-4 h-4 md:w-5 md:h-5 text-[#2957a1] flex-shrink-0" />
                    <div>
                      <p className="text-[11px] md:text-[12px] text-gray-600 font-semibold">Date Requested</p>
                      <p className="text-[13px] md:text-[14px] text-gray-900">{request.dateRequested}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 bg-gray-50 rounded-lg">
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-[#2957a1] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                    <div>
                      <p className="text-[11px] md:text-[12px] text-gray-600 font-semibold">Requested By</p>
                      <p className="text-[13px] md:text-[14px] text-gray-900">{request.name}</p>
                    </div>
                  </div>
                </div>

                {/* Remarks */}
                {request.remarks && (
                  <div className="mt-4 p-3 md:p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                    <div className="flex items-start gap-2 md:gap-3">
                      <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[12px] md:text-[13px] font-bold text-red-700 mb-1">Remarks:</p>
                        <p className="text-[13px] md:text-[14px] text-gray-700 leading-relaxed">{request.remarks}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {requests.length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-16 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg font-medium">No requests found</p>
            <p className="text-gray-400 text-sm mt-1">Your document requests will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}