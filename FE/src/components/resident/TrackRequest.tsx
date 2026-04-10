import { useEffect, useMemo, useState } from "react";
import { FileText, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { api } from "../../utils/api";

type DBRequest = {
  RequestID: number;
  ResidentID: string;
  RequestDate: string;
  PickupDate?: string | null;
  CompletionDate?: string | null;
  RequestType: string;
  RequestStatus: string;
  RequestPurpose: string;
  Remarks?: string | null;
  AppointmentDate?: string | null;
  AppointmentTime?: string | null;
  AppointmentRequirements?: string | null;
  AppointmentNotes?: string | null;
  AppointmentSetByAdmin?: string | null;
};

type FilterStatus =
  | "All"
  | "Pending"
  | "Processing"
  | "Ready for Pickup"
  | "Completed"
  | "Denied";

const FILTER_TABS: FilterStatus[] = [
  "All",
  "Pending",
  "Processing",
  "Ready for Pickup",
  "Completed",
  "Denied",
];

function formatRequestId(id: number) {
  return `#${String(id).padStart(6, "0")}`;
}

function normalizeStatus(s: string) {
  return (s || "").trim().toLowerCase();
}

function formatAppointmentTime(value?: string | null) {
  if (!value) return "";
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return value;
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getStatusUI(statusRaw: string) {
  const s = normalizeStatus(statusRaw);
  if (s === "pickup" || s === "picked up") {
    return { label: "Pickup", color: "bg-[#5ce36c]", icon: <CheckCircle className="w-5 h-5" /> };
  }
  if (s === "ready for pickup" || s === "ready") {
    return { label: "Ready for Pickup", color: "bg-[#5ce36c]", icon: <CheckCircle className="w-5 h-5" /> };
  }
  if (s === "completed") {
    return { label: "Completed", color: "bg-[#5ce36c]", icon: <CheckCircle className="w-5 h-5" /> };
  }
  if (s === "processing") {
    return { label: "Processing", color: "bg-[#2957a1]", icon: <Clock className="w-5 h-5" /> };
  }
  if (s === "denied" || s === "rejected") {
    return { label: "Denied", color: "bg-[#ea4d48]", icon: <XCircle className="w-5 h-5" /> };
  }
  return { label: "Pending", color: "bg-[#2957a1]", icon: <Clock className="w-5 h-5" /> };
}

function matchesFilter(request: DBRequest, filter: FilterStatus): boolean {
  if (filter === "All") return true;
  const s = normalizeStatus(request.RequestStatus);
  switch (filter) {
    case "Pending":          return s === "pending";
    case "Processing":       return s === "processing";
    case "Ready for Pickup": return s === "ready for pickup" || s === "ready";
    case "Completed":        return s === "completed";
    case "Denied":           return s === "denied" || s === "rejected";
    default:                 return true;
  }
}

export function TrackRequest() {
  const [requests, setRequests] = useState<DBRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("All");

  useEffect(() => {
    const fetchMyRequests = async () => {
      try {
        setLoading(true);
        const raw = localStorage.getItem("app_user");
        const user = raw ? JSON.parse(raw) : null;
        const residentId: string | undefined =
          user?.residentId ?? user?.ResidentID ?? user?.id;

        if (!residentId) { setRequests([]); return; }

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

  const filteredRequests = useMemo(
    () => requests.filter((r) => matchesFilter(r, activeFilter)),
    [requests, activeFilter]
  );

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

    if (filteredRequests.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-md p-16 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <FileText className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-gray-500 text-lg font-medium">No {activeFilter} requests</p>
          <p className="text-gray-400 text-sm mt-1">You have no requests with this status</p>
        </div>
      );
    }

    return (
      <div className="space-y-4 md:space-y-5">
        {filteredRequests.map((request) => {
          const statusUI = getStatusUI(request.RequestStatus);
          const normalizedStatus = normalizeStatus(request.RequestStatus);
          const showPickedUpDate =
            !!request.PickupDate &&
            (normalizedStatus === "pickup" ||
              normalizedStatus === "picked up" ||
              normalizedStatus === "completed");
          const showAppointmentDetails =
            !!request.AppointmentDate ||
            !!request.AppointmentTime ||
            !!request.AppointmentSetByAdmin;

          return (
            <div
              key={request.RequestID}
              className="bg-white rounded-lg md:rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden"
            >
              <div className="p-4 md:p-6">
                {/* Card Header */}
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
                  <div className={`${statusUI.color} text-white px-4 md:px-5 py-2 rounded-full flex items-center gap-2 shadow-md self-start`}>
                    {statusUI.icon}
                    <span className="text-[13px] md:text-[14px] font-semibold">{statusUI.label}</span>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 bg-gray-50 rounded-lg">
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-[#2957a1] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <div>
                      <p className="text-[11px] md:text-[12px] text-gray-600 font-semibold">Date Requested</p>
                      <p className="text-[13px] md:text-[14px] text-gray-900">
                        {request.RequestDate
                          ? new Date(request.RequestDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                          : "—"}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {request.RequestDate
                          ? new Date(request.RequestDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                          : ""}
                      </p>
                    </div>
                  </div>

                  {showPickedUpDate && (
                    <div className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-[11px] md:text-[12px] text-green-700 font-semibold">Date Picked Up</p>
                        <p className="text-[13px] md:text-[14px] text-gray-900">
                          {new Date(request.PickupDate!).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {new Date(request.PickupDate!).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  )}

                  {request.CompletionDate && (
                    <div className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-[11px] md:text-[12px] text-blue-700 font-semibold">Date Completed</p>
                        <p className="text-[13px] md:text-[14px] text-gray-900">
                          {new Date(request.CompletionDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {new Date(request.CompletionDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  )}

                  {showAppointmentDetails && (
                    <div className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 bg-[#eef4ff] rounded-lg border border-[#c7d8ff]">
                      <Clock className="w-4 h-4 md:w-5 md:h-5 text-[#2957a1] flex-shrink-0" />
                      <div>
                        <p className="text-[11px] md:text-[12px] text-[#2957a1] font-semibold">Appointment Set by Admin</p>
                        <p className="text-[13px] md:text-[14px] text-gray-900">
                          {request.AppointmentDate
                            ? new Date(request.AppointmentDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                            : "Date to be announced"}
                          {request.AppointmentTime ? ` at ${formatAppointmentTime(request.AppointmentTime)}` : ""}
                        </p>
                        {request.AppointmentSetByAdmin && (
                          <p className="text-[11px] text-gray-500">Set by {request.AppointmentSetByAdmin}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 bg-gray-50 rounded-lg">
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-[#2957a1] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                    <div>
                      <p className="text-[11px] md:text-[12px] text-gray-600 font-semibold">Requested By</p>
                      <p className="text-[13px] md:text-[14px] text-gray-900">{request.ResidentID}</p>
                    </div>
                  </div>
                </div>

                {/* Purpose */}
                {request.RequestPurpose && (
                  <div className="mt-2 p-3 md:p-4 bg-blue-50 border-l-4 border-[#2957a1] rounded-lg">
                    <div className="flex items-start gap-2 md:gap-3">
                      <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-[#2957a1] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[12px] md:text-[13px] font-bold text-[#2957a1] mb-1">Purpose:</p>
                        <p className="text-[13px] md:text-[14px] text-gray-700 leading-relaxed">{request.RequestPurpose}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Appointment Requirements */}
                {request.AppointmentRequirements && (
                  <div className="mt-4 p-3 md:p-4 bg-indigo-50 border-l-4 border-indigo-500 rounded-lg">
                    <div className="flex items-start gap-2 md:gap-3">
                      <Clock className="w-4 h-4 md:w-5 md:h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[12px] md:text-[13px] font-bold text-indigo-700 mb-1">Required Documents to Bring:</p>
                        <p className="text-[13px] md:text-[14px] text-gray-700 leading-relaxed">{request.AppointmentRequirements}</p>
                        {request.AppointmentNotes && (
                          <p className="mt-2 text-[12px] md:text-[13px] text-gray-600">
                            Note from admin: {request.AppointmentNotes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Remarks */}
                {request.Remarks && (
                  <div className="mt-4 p-3 md:p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                    <div className="flex items-start gap-2 md:gap-3">
                      <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[12px] md:text-[13px] font-bold text-red-700 mb-1">Remarks:</p>
                        <p className="text-[13px] md:text-[14px] text-gray-700 leading-relaxed">{request.Remarks}</p>
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
  }, [loading, requests, filteredRequests, activeFilter]);

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

        {/* Filter Bar — matches Announcements page style */}
        <div className="bg-white rounded-xl shadow-sm px-4 md:px-6 py-3 md:py-4 mb-6 md:mb-8 flex flex-wrap items-center gap-2 md:gap-3">
          <span className="text-[12px] md:text-[13px] font-bold text-[#2957a1] tracking-widest uppercase mr-1">
            Filter By:
          </span>
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`
                  px-4 py-1.5 rounded-full text-[13px] md:text-[14px] font-medium border transition-all duration-150 cursor-pointer
                  ${isActive
                    ? "bg-[#2957a1] text-white border-[#2957a1] shadow-sm"
                    : "bg-white text-gray-600 border-gray-300 hover:border-[#2957a1] hover:text-[#2957a1]"
                  }
                `}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {content}
      </div>
    </div>
  );
}