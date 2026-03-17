import { useEffect, useMemo, useState } from "react";
import { FileText, Calendar, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { api } from "../../utils/api";

type DBRequest = {
  RequestID: number;
  ResidentID: string;
  RequestDate: string;      // ISO/timestamp
  PickupDate?: string | null;     // When picked up
  CompletionDate?: string | null; // When completed
  RequestType: string;
  RequestStatus: string;    // Pending / Processing / Ready for Pickup / Pickup / Completed / Denied
  RequestPurpose: string;
  Remarks?: string | null;  // optional if you add it later in DB
};

function formatRequestId(id: number) {
  return `#${String(id).padStart(6, "0")}`;
}

function normalizeStatus(s: string) {
  return (s || "").trim().toLowerCase();
}

function getStatusUI(statusRaw: string) {
  const s = normalizeStatus(statusRaw);

  // Map your DB values to UI label + colors + icon
  if (s === "pickup" || s === "picked up") {
    return {
      label: "Pickup",
      color: "bg-[#5ce36c]",
      icon: <CheckCircle className="w-5 h-5" />,
    };
  }

  if (s === "ready for pickup" || s === "ready") {
    return {
      label: "Ready for Pickup",
      color: "bg-[#5ce36c]",
      icon: <CheckCircle className="w-5 h-5" />,
    };
  }

  if (s === "completed") {
    return {
      label: "Completed",
      color: "bg-[#5ce36c]",
      icon: <CheckCircle className="w-5 h-5" />,
    };
  }

  if (s === "processing") {
    return {
      label: "Processing",
      color: "bg-[#2957a1]",
      icon: <Clock className="w-5 h-5" />,
    };
  }

  if (s === "denied" || s === "rejected") {
    return {
      label: "Denied",
      color: "bg-[#ea4d48]",
      icon: <XCircle className="w-5 h-5" />,
    };
  }

  // default
  return {
    label: "Pending",
    color: "bg-[#2957a1]",
    icon: <Clock className="w-5 h-5" />,
  };
}

export function TrackRequest() {
  const [requests, setRequests] = useState<DBRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMyRequests = async () => {
      try {
        setLoading(true);

        // Adjust based on what you store in localStorage
        const raw = localStorage.getItem("app_user");
        const user = raw ? JSON.parse(raw) : null;

        // Common possibilities: residentId, ResidentID, id
        const residentId: string | undefined =
          user?.residentId ?? user?.ResidentID ?? user?.id;

        if (!residentId) {
          setRequests([]);
          return;
        }

        // Backend should be: GET /requests/resident/:residentId
        const res = await api.get(`/requests/resident/${residentId}`);
        setRequests(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to load resident requests", err);
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMyRequests();
  }, []);

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="bg-white rounded-xl shadow-md p-10 text-center">
          <p className="text-gray-600 font-medium">Loading requests…</p>
        </div>
      );
    }

    if (!requests || requests.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-md p-16 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <FileText className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-gray-500 text-lg font-medium">No requests found</p>
          <p className="text-gray-400 text-sm mt-1">Your document requests will appear here</p>
        </div>
      );
    }

    return (
      <div className="space-y-4 md:space-y-5">
        {requests.map((request) => {
          const statusUI = getStatusUI(request.RequestStatus);
          const normalizedStatus = normalizeStatus(request.RequestStatus);
          const showPickedUpDate =
            !!request.PickupDate &&
            (normalizedStatus === "pickup" ||
              normalizedStatus === "picked up" ||
              normalizedStatus === "completed");

          return (
            <div
              key={request.RequestID}
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
                        {request.RequestType}
                      </h3>
                      <p className="text-[13px] md:text-[14px] text-gray-600 mt-0.5">
                        Request ID: {formatRequestId(request.RequestID)}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div
                    className={`${statusUI.color} text-white px-4 md:px-5 py-2 rounded-full flex items-center gap-2 shadow-md self-start`}
                  >
                    {statusUI.icon}
                    <span className="text-[13px] md:text-[14px] font-bold">{statusUI.label}</span>
                  </div>
                </div>

                {/* Request Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4">
                  <div className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-4 h-4 md:w-5 md:h-5 text-[#2957a1] flex-shrink-0" />
                    <div>
                      <p className="text-[11px] md:text-[12px] text-gray-600 font-semibold">
                        Date Requested
                      </p>
                      <p className="text-[13px] md:text-[14px] text-gray-900">
                        {request.RequestDate
                          ? new Date(request.RequestDate).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "—"}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {request.RequestDate
                          ? new Date(request.RequestDate).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </p>
                    </div>
                  </div>

                  {showPickedUpDate && (
                    <div className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-[11px] md:text-[12px] text-green-700 font-semibold">
                          Date Picked Up
                        </p>
                        <p className="text-[13px] md:text-[14px] text-gray-900">
                          {new Date(request.PickupDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {new Date(request.PickupDate).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  )}

                  {request.CompletionDate && (
                    <div className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-[11px] md:text-[12px] text-blue-700 font-semibold">
                          Date Completed
                        </p>
                        <p className="text-[13px] md:text-[14px] text-gray-900">
                          {new Date(request.CompletionDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {new Date(request.CompletionDate).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 bg-gray-50 rounded-lg">
                    <svg
                      className="w-4 h-4 md:w-5 md:h-5 text-[#2957a1] flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                    <div>
                      <p className="text-[11px] md:text-[12px] text-gray-600 font-semibold">
                        Requested By
                      </p>
                      {/* You don't have Name in request table; use ResidentID or pull name from resident table later */}
                      <p className="text-[13px] md:text-[14px] text-gray-900">
                        {request.ResidentID}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Purpose (optional display) */}
                {request.RequestPurpose && (
                  <div className="mt-2 p-3 md:p-4 bg-blue-50 border-l-4 border-[#2957a1] rounded-lg">
                    <div className="flex items-start gap-2 md:gap-3">
                      <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-[#2957a1] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[12px] md:text-[13px] font-bold text-[#2957a1] mb-1">
                          Purpose:
                        </p>
                        <p className="text-[13px] md:text-[14px] text-gray-700 leading-relaxed">
                          {request.RequestPurpose}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Remarks (only if you later add a Remarks column or join another table) */}
                {request.Remarks && (
                  <div className="mt-4 p-3 md:p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                    <div className="flex items-start gap-2 md:gap-3">
                      <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[12px] md:text-[13px] font-bold text-red-700 mb-1">
                          Remarks:
                        </p>
                        <p className="text-[13px] md:text-[14px] text-gray-700 leading-relaxed">
                          {request.Remarks}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }, [loading, requests]);

  return (
    <div className="pt-[73px] md:pt-[93px] min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6 md:py-10">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-[24px] md:text-[32px] text-[#2957a1] font-bold mb-2">
            Track My Requests
          </h1>
          <p className="text-gray-600 text-[13px] md:text-[14px]">
            Monitor the status of your document requests
          </p>
        </div>

        {content}
      </div>
    </div>
  );
}
