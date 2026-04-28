// OnlineRequests.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { FileText, Clock, CheckCircle, XCircle, Eye, Search, AlertCircle, Mail, Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { toast } from 'sonner';

type RequestStatus = 'Pending' | 'Processing' | 'Processing Completion' | 'Ready for Pickup' | 'Completed' | 'Rejected';

interface Request {
  id: string;                 
  requestNo: string;         
  residentName: string;       
  residentId: string;         
  documentType: string;       
  purpose: string;           
  dateRequested: string;      
  dateCompleted?: string;     
  status: RequestStatus;      
  contactNumber: string;      
  email?: string;             
  rejectionReason?: string;  
  appointmentDate?: string | null;
  appointmentTime?: string | null;
  appointmentSetByAdmin?: string | null;
  receiverName?: string | null;
}

interface InboxRow {
  RequestID: number;
  RequestDate: string;
  RequestType: string;
  RequestStatus: string;
  RequestPurpose: string;
  ResidentID: string;

  FirstName: string;
  MiddleName?: string;
  LastName: string;
  ContactNumber?: string;
  Email?: string;
  RejectionReason?: string;
  AppointmentDate?: string | null;
  AppointmentTime?: string | null;
  AppointmentSetByAdmin?: string | null;
  ReceiverName?: string | null;
}

const formatAppointmentTime = (value?: string | null) => {
  if (!value) return '';

  const [hourText, minuteText] = value.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return value;
  }

  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatWordDate = (value?: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

interface OnlineRequestsProps {
  initialFilter?: string;
  initialTab?: 'certificates' | 'other';
  onFilterChange?: (filter: string) => void;
  onTabChange?: (tab: 'certificates' | 'other') => void;
  userRole?: 'admin' | 'official' | 'sk_kagawad';
}

export function OnlineRequests({
  initialFilter = 'all',
  initialTab = 'certificates',
  onFilterChange,
  onTabChange,
  userRole = 'admin',
}: OnlineRequestsProps = {}) {
  // SK Kagawad is view-only: cannot process, deny, or complete any requests
  // Dual-check: prop takes priority, but also verify via localStorage as a safety net
  const isReadOnly = userRole === 'sk_kagawad' || (() => {
    try {
      const appUser = JSON.parse(localStorage.getItem('app_user') || '{}');
      return appUser?.role === 'sk_kagawad';
    } catch { return false; }
  })();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'certificates' | 'other'>(initialTab);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>(
    initialFilter === 'pending' ? 'Pending' :
    initialFilter === 'returned' ? 'Processing Completion' :
    initialFilter === 'pickup' ? 'Ready for Pickup' :
    'Pending'
  );

  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [certificateCount, setCertificateCount] = useState(0);
  const [otherCount, setOtherCount] = useState(0);

  const [viewingRequest, setViewingRequest] = useState<Request | null>(null);
  const [denyingRequest, setDenyingRequest] = useState<Request | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [returningRequest, setReturningRequest] = useState<Request | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [viewingDenialReason, setViewingDenialReason] = useState<string | null>(null);
  const [appointmentRequest, setAppointmentRequest] = useState<Request | null>(null);
  const [appointmentDetails, setAppointmentDetails] = useState({
    date: '',
    time: '',
    requirements: '',
    additionalNotes: ''
  });
  const [appointmentAttempted, setAppointmentAttempted] = useState(false);
  const [confirmSendAppointmentOpen, setConfirmSendAppointmentOpen] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tpHour, setTpHour] = useState('08');
  const [tpMinute, setTpMinute] = useState('00');
  const [tpPeriod, setTpPeriod] = useState<'AM' | 'PM'>('AM');
  const timePickerRef = useRef<HTMLDivElement | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement | null>(null);
  const [calViewYear, setCalViewYear] = useState(new Date().getFullYear());
  const [calViewMonth, setCalViewMonth] = useState(new Date().getMonth());
  const [confirmAction, setConfirmAction] = useState<null | {
    request: Request;
    kind: 'process' | 'ready' | 'complete';
    isOtherDocuments: boolean;
  }>(null);
  const [receiverName, setReceiverName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const API_BASE = "http://localhost:5001";

  const isKnownStatus = (s: string): s is RequestStatus => {
    return ['Pending', 'Processing', 'Processing Completion', 'Ready for Pickup', 'Completed', 'Rejected'].includes(s);
  };

  const buildResidentName = (row: InboxRow) => {
    const full = `${row.FirstName ?? ''} ${row.MiddleName ?? ''} ${row.LastName ?? ''}`.replace(/\s+/g, ' ').trim();
    return full || row.ResidentID; // fallback to ID if name missing
  };

  const normalizeStatus = (status: string): RequestStatus => {
    const s = status?.trim().toLowerCase();

    if (s === "pending") return "Pending";
    if (s === "processing") return "Processing";
    if (s === "returned for completion") return "Processing Completion";
    if (s === "ready for pickup") return "Ready for Pickup";
    if (s === "completed") return "Completed";
    if (s === "rejected") return "Rejected";

    return "Pending"; // safe fallback
  };

  const handleReturnForCompletion = async () => {
    if (!returningRequest || !returnReason.trim()) {
      toast.error('Please provide the missing requirement reason');
      return;
    }
    try {
      const token = localStorage.getItem("token") || "";
      setRequests(prev =>
        prev.map(req =>
          req.id === returningRequest.id
            ? { ...req, status: 'Processing Completion', rejectionReason: returnReason.trim() }
            : req
        )
      );

      const res = await fetch(`${API_BASE}/requests/${returningRequest.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        // Backend expects the DB status label; UI maps this to "Processing Completion".
        body: JSON.stringify({ status: 'Returned for Completion', reason: returnReason.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        const message = String(data?.error || "").toLowerCase();
        if (message.includes("invalid status")) {
          toast.error("Unable to return request: status mapping mismatch between app and server.");
        } else {
          toast.error(data.error || "Failed to return request for completion");
        }
        await loadInbox(false);
        return;
      }
      await loadInbox(false);
      setReturningRequest(null);
      setReturnReason('');
      toast.success("Request returned for completion.");
    } catch {
      toast.error("Server error while returning request.");
      await loadInbox(false);
    }
  };

  const toUIRequest = (row: InboxRow): Request => {
    console.log("DB STATUS:", row.RequestStatus);

    return {
      id: String(row.RequestID),
      requestNo: `REQ-${row.RequestID}`,
      residentName: buildResidentName(row),
      residentId: row.ResidentID,
      documentType: row.RequestType,
      purpose: row.RequestPurpose,
      dateRequested: row.RequestDate,
      status: normalizeStatus(row.RequestStatus),
      contactNumber: row.ContactNumber || 'N/A',
      email: row.Email || 'N/A',
      rejectionReason: (row as any).RejectionReason || (row as any).rejectionReason || undefined,
      appointmentDate: row.AppointmentDate ?? null,
      appointmentTime: row.AppointmentTime ?? null,
      appointmentSetByAdmin: row.AppointmentSetByAdmin ?? null,
      receiverName: (row as any).ReceiverName ?? null,
    };
  };

  /**
   * loadInbox(silent?)
   * - silent=false: shows toast errors
   * - silent=true: used by polling (prevents toast spam)
   */
  const loadInbox = async (silent: boolean = false) => {
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/requests/admin/all`);
      const data = await res.json();

      if (!res.ok) {
        if (!silent) toast.error(data?.detail || data?.error || "Failed to load requests");
        setRequests([]);
        setCertificateCount(0);
        setOtherCount(0);
        return;
      }

      // COUNT HERE (active status filter, not hard-linked to Pending)
      const mapped = (data as InboxRow[]).map(toUIRequest);
      const filterStatus = statusFilter === 'all' ? undefined : statusFilter;

      const certificates = (data as any[]).filter(
        (r) =>
          (filterStatus ? normalizeStatus(r.RequestStatus) === filterStatus : true) &&
          (r.RequestType === "Barangay Clearance" ||
            r.RequestType === "Certificate of Indigency" ||
            r.RequestType === "Barangay ID")
      ).length;

      const certificateTypes = [
        "Barangay Clearance",
        "Certificate of Indigency",
        "Barangay ID",
        "Barangay Certificate",
        "Certificate",
      ];

      const others = (data as any[]).filter(
        (r) =>
          (filterStatus ? normalizeStatus(r.RequestStatus) === filterStatus : true) &&
          !certificateTypes.includes(r.RequestType)
      ).length;

      setCertificateCount(certificates);
      setOtherCount(others);
      setRequests(mapped);
    } catch (e) {
      if (!silent) toast.error("Could not connect to backend.");
      setRequests([]);
      setCertificateCount(0);
      setOtherCount(0);
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (timePickerRef.current && !timePickerRef.current.contains(e.target as Node))
        setShowTimePicker(false);
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node))
        setShowDatePicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    loadInbox(false);

    const interval = setInterval(() => {
      loadInbox(true);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Update counts whenever requests or statusFilter change
  useEffect(() => {
    const certificateTypes = ['Barangay Clearance', 'Certificate of Indigency', 'Barangay ID', 'Barangay Certificate', 'Certificate'];

    const filterStatus = statusFilter === 'all' ? undefined : statusFilter;

    const newCertificateCount = requests.filter(
      (r) =>
        (filterStatus ? r.status === filterStatus : true) &&
        certificateTypes.includes(r.documentType)
    ).length;

    const newOtherCount = requests.filter(
      (r) =>
        (filterStatus ? r.status === filterStatus : true) &&
        !certificateTypes.includes(r.documentType)
    ).length;

    setCertificateCount(newCertificateCount);
    setOtherCount(newOtherCount);
  }, [requests, statusFilter]);

  // Handle initial filter from dashboard navigation
  useEffect(() => {
    if (initialFilter === 'pending') {
      setStatusFilter('Pending');
      setActiveTab('certificates');
    } else if (initialFilter === 'returned') {
      setStatusFilter('Processing Completion');
      setActiveTab('other');
    } else if (initialFilter === 'pickup') {
      setStatusFilter('Ready for Pickup');
      setActiveTab('certificates');
    }
  }, [initialFilter]);

  // Sync tab changes with parent
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Reset to page 1 when tab, filter or search changes
  useEffect(() => { setCurrentPage(1); }, [activeTab, statusFilter, searchTerm]);

  const handleStatusChange = async (id: string, newStatus: RequestStatus, receiver?: string) => {
    try {
      const token = localStorage.getItem("token") || "";

      // Optimistic update
      setRequests(prev =>
        prev.map(req =>
          req.id === id ? { ...req, status: newStatus } : req
        )
      );

      const res = await fetch(`${API_BASE}/requests/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus, ...(newStatus === 'Completed' ? { receiver_name: receiver } : {}) })
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to update status");
        await loadInbox(false); // Revert on error
        return;
      }

      await loadInbox(false);

      if (newStatus === 'Ready for Pickup') {
        const emailStatus = data?.email;
        const smsStatus = data?.sms;
        const emailOk = !!emailStatus?.success;
        const smsOk = !!smsStatus?.success;

        if (emailOk && smsOk) {
          toast.success(`Moved to ${newStatus}. Email and SMS sent successfully.`);
        } else if (emailOk && !smsOk && smsStatus?.attempted) {
          toast.warning(`Moved to ${newStatus}. Email sent, but SMS failed: ${smsStatus.error || 'Unknown SMS error'}`);
        } else if (!emailOk && emailStatus?.attempted && smsOk) {
          toast.warning(`Moved to ${newStatus}. SMS sent, but email failed: ${emailStatus.error || 'Unknown email error'}`);
        } else if (emailStatus?.attempted || smsStatus?.attempted) {
          const issues = [
            emailStatus?.attempted && !emailOk ? `Email failed: ${emailStatus.error || 'Unknown email error'}` : null,
            smsStatus?.attempted && !smsOk ? `SMS failed: ${smsStatus.error || 'Unknown SMS error'}` : null,
          ].filter(Boolean).join(' ');
          toast.warning(`Moved to ${newStatus}, but notifications had issues. ${issues}`);
        } else {
          toast.success(`Moved to ${newStatus}`);
        }
      } else {
        toast.success(`Moved to ${newStatus}`);
      }

    } catch {
      toast.error("Server error while updating.");
      await loadInbox(false); // Revert on error
    }
  };
  const handleDenyRequest = async () => {
    if (!denyingRequest || !denyReason.trim()) {
      toast.error('Please provide a reason for denying this request');
      return;
    }

    try {
      const token = localStorage.getItem("token") || "";

      // Optimistic update
      setRequests(prev =>
        prev.map(req =>
          req.id === denyingRequest.id
            ? { ...req, status: 'Rejected', rejectionReason: denyReason, dateCompleted: new Date().toISOString() }
            : req
        )
      );

      const res = await fetch(`${API_BASE}/requests/${denyingRequest.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: 'Rejected', reason: denyReason })
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to deny request");
        await loadInbox(false); // Revert on error
        return;
      }

      await loadInbox(false);

      toast.success(`Request denied.`, { duration: 4000 });

      setDenyingRequest(null);
      setDenyReason('');

    } catch {
      toast.error("Server error while denying request.");
      await loadInbox(false); // Revert on error
    }
  };

  const handleSendAppointment = async () => {
    if (!appointmentRequest) return;
    setAppointmentAttempted(true);

    if (!appointmentDetails.date || !appointmentDetails.time || !appointmentDetails.requirements.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem("token") || "";
      const rawUser = localStorage.getItem("app_user");
      const currentUser = rawUser ? JSON.parse(rawUser) : null;
      const setByAdmin = String(currentUser?.name || currentUser?.id || "Barangay Admin").trim();

      setRequests(prev =>
        prev.map(req => (req.id === appointmentRequest.id ? { ...req, status: 'Processing' } : req))
      );

      const res = await fetch(`${API_BASE}/requests/${appointmentRequest.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status: "Processing",
          appointmentDate: appointmentDetails.date,
          appointmentTime: appointmentDetails.time,
          requirements: appointmentDetails.requirements.trim(),
          additionalNotes: appointmentDetails.additionalNotes.trim(),
          setByAdmin,
        })
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to send appointment");
        await loadInbox(false);
        return;
      }

      await loadInbox(false);
      setActiveTab(certificateDocTypes.includes(appointmentRequest.documentType) ? 'certificates' : 'other');
      setStatusFilter('Processing');
      onFilterChange?.('processing');

      toast.success("Appointment sent successfully.", { duration: 4000 });
      setAppointmentRequest(null);
      setAppointmentDetails({ date: '', time: '', requirements: '', additionalNotes: '' });
      setAppointmentAttempted(false);
    } catch {
      toast.error("Server error while sending appointment.");
      await loadInbox(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Processing': return 'bg-blue-100 text-blue-800';
      case 'Processing Completion': return 'bg-orange-100 text-orange-800';
      case 'Ready for Pickup': return 'bg-green-100 text-green-800';
      case 'Completed': return 'bg-emerald-100 text-emerald-900';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTabCountColor = () => {
    switch (statusFilter) {
      case 'Pending':
        return 'bg-red-600 text-white';
      case 'Processing':
        return 'bg-blue-600 text-white';
      case 'Ready for Pickup':
        return 'bg-green-600 text-white';
      case 'Completed':
        return 'bg-emerald-800 text-white';
      case 'Rejected':
        return 'bg-red-600 text-white';
      default:
        return 'bg-red-600 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return <Clock className="w-4 h-4" />;
      case 'Processing': return <FileText className="w-4 h-4" />;
      case 'Processing Completion': return <AlertCircle className="w-4 h-4" />;
      case 'Ready for Pickup': return <CheckCircle className="w-4 h-4" />;
      case 'Completed': return <CheckCircle className="w-4 h-4" />;
      case 'Rejected': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'Rejected') return 'Denied';
    return status;
  };

  const certificateDocTypes = useMemo(() => ([
    'Barangay Clearance',
    'Certificate of Indigency',
    'Barangay ID',
    'Barangay Certificate',
    'Certificate',
  ]), []);

  const certificateRequests = requests.filter(r => certificateDocTypes.includes(r.documentType));
  const otherDocumentsRequests = requests.filter(r => !certificateDocTypes.includes(r.documentType));

  const pendingRequests = requests.filter(r => r.status === 'Pending');
  const processingRequests = requests.filter(r => r.status === 'Processing');
  const returnedRequests = requests.filter(r => r.status === 'Processing Completion');
  const readyRequests = requests.filter(r => r.status === 'Ready for Pickup');
  const completedRequests = requests.filter(r => r.status === 'Completed');
  const deniedRequests = requests.filter(r => r.status === 'Rejected');

  // show the first available denial reason on the Denied card (if any)
  const firstDenialReason = deniedRequests.find(r => r.rejectionReason)?.rejectionReason || '';

  const getCurrentTabRequests = () => {
    const base = activeTab === 'certificates' ? certificateRequests : otherDocumentsRequests;
    if (statusFilter === 'all') return base;
    return base.filter(r => r.status === statusFilter);
  };

  const currentRequests = getCurrentTabRequests();

  const filteredRequests = currentRequests.filter(req =>
    req.requestNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.residentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.residentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.documentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.purpose.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = filteredRequests.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredRequests.length);

  const renderRequestTable = (requestList: Request[], isOtherDocuments = false) => {
    const totalPgs = Math.max(1, Math.ceil(requestList.length / pageSize));
    const paginated = requestList.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const rStart = requestList.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const rEnd = Math.min(currentPage * pageSize, requestList.length);

    return (
    <div className="space-y-3">
      {/* ── DESKTOP TABLE (hidden on mobile) ── */}
      <div className="hidden sm:block overflow-x-auto">
        <Table>
          <TableHeader className="bg-[#2957a1]">
            <TableRow className="hover:bg-[#2957a1]">
              <TableHead className="text-white font-bold text-xs">Request No.</TableHead>
              <TableHead className="text-white font-bold text-xs">Resident</TableHead>
              <TableHead className="text-white font-bold text-xs">Document Type</TableHead>
              {!isOtherDocuments && <TableHead className="text-white font-bold text-xs">Purpose</TableHead>}
              <TableHead className="text-white font-bold text-xs">Date Requested</TableHead>
              <TableHead className="text-white font-bold text-xs">Status</TableHead>
              <TableHead className="text-white font-bold text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isOtherDocuments ? 6 : 7} className="text-center text-gray-500 py-8">
                  {isLoading ? "Loading..." : "No requests found"}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((request) => (
                <TableRow key={request.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-xs">{request.requestNo}</TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-col">
                      <span>{request.residentName}</span>
                      <span className="text-[10px] text-gray-500">{request.residentId}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{request.documentType}</TableCell>
                  {!isOtherDocuments && <TableCell className="text-xs">{request.purpose}</TableCell>}
                  <TableCell className="text-xs">{new Date(request.dateRequested).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(request.status)}>
                      <span className="flex items-center gap-1 text-xs">{getStatusIcon(request.status)}{getStatusLabel(request.status)}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="flex items-center gap-1.5 bg-gray-100 text-black hover:bg-gray-300 text-xs" onClick={() => setViewingRequest(request)}>
                        <Eye className="w-3.5 h-3.5" /><span>View</span>
                      </Button>
                      {request.status === 'Rejected' && (
                        <Button size="sm" className="flex items-center gap-1.5 bg-white text-red-600 border border-red-200 hover:bg-red-50 text-xs" onClick={() => setViewingDenialReason(request.rejectionReason ?? 'No reason provided')}>
                          <XCircle className="w-3.5 h-3.5" /><span>Reason</span>
                        </Button>
                      )}
                      {request.status === 'Pending' && !isReadOnly && (
                        <>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs" onClick={() => setConfirmAction({ request, kind: 'process', isOtherDocuments })}>Process</Button>
                          {isOtherDocuments && (
                            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white text-xs" onClick={() => setReturningRequest(request)}>Process for Completion</Button>
                          )}
                          <Button size="sm" variant="destructive" className="text-xs" onClick={() => setDenyingRequest(request)}>Deny</Button>
                        </>
                      )}
                      {request.status === 'Processing' && !isReadOnly && (
                        <>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs" onClick={() => setConfirmAction({ request, kind: 'ready', isOtherDocuments })}>Ready</Button>
                        </>
                      )}
                      {request.status === 'Processing Completion' && isOtherDocuments && !isReadOnly && (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs" onClick={() => setAppointmentRequest(request)}>Process</Button>
                      )}
                      {request.status === 'Ready for Pickup' && !isReadOnly && (
                        <Button size="sm" className="bg-gray-600 hover:bg-gray-700 text-white text-xs" onClick={() => setConfirmAction({ request, kind: 'complete', isOtherDocuments })}>Complete</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── MOBILE CARDS (visible only on mobile) ── */}
      <div className="sm:hidden space-y-3">
        {paginated.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">{isLoading ? "Loading..." : "No requests found"}</p>
          </div>
        ) : (
          paginated.map((request) => (
            <div key={request.id} className="rounded-lg border bg-white p-3 shadow-sm space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm text-[#2957a1]">{request.requestNo}</p>
                  <p className="text-xs text-gray-700 font-medium">{request.residentName}</p>
                  <p className="text-[10px] text-gray-400">{request.residentId}</p>
                </div>
                <Badge className={`${getStatusColor(request.status)} shrink-0 text-[10px]`}>
                  <span className="flex items-center gap-1">{getStatusIcon(request.status)}{getStatusLabel(request.status)}</span>
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
                <span className="col-span-2"><span className="font-medium text-gray-500">Doc:</span> {request.documentType}</span>
                {!isOtherDocuments && <span className="col-span-2 truncate"><span className="font-medium text-gray-500">Purpose:</span> {request.purpose}</span>}
                <span><span className="font-medium text-gray-500">Date:</span> {new Date(request.dateRequested).toLocaleDateString()}</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1 border-t">
                <Button size="sm" className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 text-black hover:bg-gray-200 text-xs h-8" onClick={() => setViewingRequest(request)}>
                  <Eye className="w-3.5 h-3.5" />View Info
                </Button>
                {request.status === 'Rejected' && (
                  <Button size="sm" className="flex-1 bg-white text-red-600 border border-red-200 hover:bg-red-50 text-xs h-8" onClick={() => setViewingDenialReason(request.rejectionReason ?? 'No reason provided')}>
                    <XCircle className="w-3.5 h-3.5 mr-1" />Reason
                  </Button>
                )}
                {request.status === 'Pending' && !isReadOnly && (
                  <>
                    <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs h-8" onClick={() => setConfirmAction({ request, kind: 'process', isOtherDocuments })}>Process</Button>
                    {isOtherDocuments && (
                      <Button size="sm" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs h-8" onClick={() => setReturningRequest(request)}>Process for Completion</Button>
                    )}
                    <Button size="sm" variant="destructive" className="flex-1 text-xs h-8" onClick={() => setDenyingRequest(request)}>Deny</Button>
                  </>
                )}
                {request.status === 'Processing' && !isReadOnly && (
                  <>
                    <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs h-8" onClick={() => setConfirmAction({ request, kind: 'ready', isOtherDocuments })}>Ready for Pickup</Button>
                  </>
                )}
                {request.status === 'Processing Completion' && isOtherDocuments && !isReadOnly && (
                  <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs h-8" onClick={() => setAppointmentRequest(request)}>Process</Button>
                )}
                {request.status === 'Ready for Pickup' && !isReadOnly && (
                  <Button size="sm" className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-xs h-8" onClick={() => setConfirmAction({ request, kind: 'complete', isOtherDocuments })}>Complete</Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── PAGINATION FOOTER ── */}
      {requestList.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 shrink-0">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#2957a1]"
              >
                {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <span className="text-xs text-gray-500">{rStart}–{rEnd} of {requestList.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition-colors" aria-label="First page"><ChevronsLeft className="w-3.5 h-3.5" /></button>
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition-colors" aria-label="Previous page"><ChevronLeft className="w-3.5 h-3.5" /></button>
            {Array.from({ length: Math.min(5, totalPgs) }, (_, i) => {
              const start = Math.max(1, Math.min(currentPage - 2, totalPgs - 4));
              const page = start + i;
              return page <= totalPgs ? (
                <button key={page} onClick={() => setCurrentPage(page)} className={`w-7 h-7 rounded border text-xs font-semibold transition-colors ${page === currentPage ? "bg-[#2957a1] text-white border-[#2957a1]" : "border-gray-300 hover:bg-gray-100"}`}>{page}</button>
              ) : null;
            })}
            <button onClick={() => setCurrentPage((p) => Math.min(totalPgs, p + 1))} disabled={currentPage === totalPgs} className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition-colors" aria-label="Next page"><ChevronRight className="w-3.5 h-3.5" /></button>
            <button onClick={() => setCurrentPage(totalPgs)} disabled={currentPage === totalPgs} className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition-colors" aria-label="Last page"><ChevronsRight className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}
    </div>
    );
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 bg-gray-50 min-h-full">
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent className="max-w-[420px]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.kind === 'process'
                ? 'Process this request?'
                : confirmAction?.kind === 'ready'
                  ? 'Mark as Ready for Pickup?'
                  : 'Mark as Completed?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.kind === 'process' ? (
                confirmAction?.isOtherDocuments ? (
                  <>This will open the appointment scheduler. Sending the appointment will move the request to Processing.</>
                ) : (
                  <>This will move the request from Pending to Processing.</>
                )
                ) : confirmAction?.kind === 'ready' ? (
                <>This will move the request from Processing to Ready for Pickup. The resident will be notified via email and SMS.</>
                ) : (
                  <>This will mark the request as Completed.</>
                )}
            </AlertDialogDescription>
            {confirmAction?.kind === 'complete' && (
              <div className="pt-2 space-y-1">
                <Label htmlFor="receiverName" className="text-sm font-medium text-gray-700">Name of Receiver</Label>
                <Input
                  id="receiverName"
                  value={receiverName}
                  onChange={(e) => {
                    const lettersOnly = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                    setReceiverName(lettersOnly.toUpperCase());
                  }}
                  placeholder="Enter receiver name"
                />
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReceiverName('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#2957a1] hover:bg-[#1e3f7a]"
              onClick={() => {
                const action = confirmAction;
                if (!action) return;

                if (action.kind === 'process') {
                  if (action.isOtherDocuments) {
                    setAppointmentRequest(action.request);
                    return;
                  }
                  handleStatusChange(action.request.id, 'Processing');
                  return;
                }

                if (action.kind === 'ready') {
                  setConfirmAction(null);
                  handleStatusChange(action.request.id, 'Ready for Pickup');
                  return;
                }
                if (!receiverName.trim()) {
                  toast.error('Name of Receiver is required');
                  return;
                }
                if (!/^[A-Za-z\s]+$/.test(receiverName.trim())) {
                  toast.error('Name of Receiver must contain letters only');
                  return;
                }
                setConfirmAction(null);
                handleStatusChange(action.request.id, 'Completed', receiverName.trim());
                setReceiverName('');
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Online Requests</h1>
          <p className="text-gray-600 mt-1">Manage document requests from residents</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => loadInbox(false)} disabled={isLoading}>
            Refresh
          </Button>

          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <Label className="text-sm shrink-0">Search:</Label>
            <div className="relative flex-1 sm:w-80">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by request no., name, ID, doc type, purpose..."
                className="pr-8"
              />
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 auto-rows-fr">
        <Card
          className={`h-full border-yellow-400 bg-white transition-all ${statusFilter === 'Pending' ? 'border-yellow-500 ring-2 ring-yellow-300 shadow-sm cursor-default' : 'cursor-pointer hover:shadow-md'}`}
          onClick={() => {
            if (statusFilter !== 'Pending') {
              setStatusFilter('Pending');
              onFilterChange?.('pending');
            }
          }}
        >
          <CardContent className={`h-full p-3 sm:p-4 rounded-[inherit] flex items-center ${statusFilter === 'Pending' ? 'bg-yellow-100' : 'bg-yellow-50/30'}`}>            <div className="w-full flex items-center justify-between gap-2">              <div className="min-w-0">                <p className={`text-base sm:text-lg font-bold ${statusFilter === 'Pending' ? 'text-yellow-900' : 'text-yellow-800'}`}>Pending</p>
                <p className="text-xl sm:text-2xl leading-tight font-semibold text-yellow-900">{pendingRequests.length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`h-full border-blue-400 bg-white transition-all ${statusFilter === 'Processing' ? 'border-blue-500 ring-2 ring-blue-300 shadow-sm cursor-default' : 'cursor-pointer hover:shadow-md'}`}
          onClick={() => {
            if (statusFilter !== 'Processing') {
              setStatusFilter('Processing');
              onFilterChange?.('processing');
            }
          }}
        >
          <CardContent className={`h-full p-3 sm:p-4 rounded-[inherit] flex items-center ${statusFilter === 'Processing' ? 'bg-blue-100' : 'bg-blue-50/30'}`}>            <div className="w-full flex items-center justify-between gap-2">              <div className="min-w-0">                <p className={`text-base sm:text-lg font-bold ${statusFilter === 'Processing' ? 'text-blue-900' : 'text-blue-800'}`}>Processing</p>
                <p className="text-xl sm:text-2xl leading-tight font-semibold text-blue-900">{processingRequests.length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`h-full border-green-400 bg-white transition-all ${statusFilter === 'Ready for Pickup' ? 'border-green-500 ring-2 ring-green-300 shadow-sm cursor-default' : 'cursor-pointer hover:shadow-md'}`}
          onClick={() => {
            if (statusFilter !== 'Ready for Pickup') {
              setStatusFilter('Ready for Pickup');
              onFilterChange?.('pickup');
            }
          }}
        >
          <CardContent className={`h-full p-3 sm:p-4 rounded-[inherit] flex items-center ${statusFilter === 'Ready for Pickup' ? 'bg-green-100' : 'bg-green-50/30'}`}>            <div className="w-full flex items-center justify-between gap-2">              <div className="min-w-0">                <p className={`text-base sm:text-lg font-bold ${statusFilter === 'Ready for Pickup' ? 'text-green-900' : 'text-green-800'}`}>Ready for Pickup</p>
                <p className="text-xl sm:text-2xl leading-tight font-semibold text-green-900">{readyRequests.length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`h-full border-emerald-700 bg-white transition-all ${statusFilter === 'Completed' ? 'border-emerald-700 ring-2 ring-emerald-400 shadow-sm cursor-default' : 'cursor-pointer hover:shadow-md'}`}
          onClick={() => statusFilter !== 'Completed' && setStatusFilter('Completed')}
        >
          <CardContent className={`h-full p-3 sm:p-4 rounded-[inherit] flex items-center ${statusFilter === 'Completed' ? 'bg-emerald-100' : 'bg-emerald-50/30'}`}>
            <div className="w-full flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className={`text-base sm:text-lg font-bold ${statusFilter === 'Completed' ? 'text-emerald-900' : 'text-emerald-800'}`}>Completed</p>
                <p className="text-xl sm:text-2xl leading-tight font-semibold text-emerald-900">{completedRequests.length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-700" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`h-full border-red-500 bg-white transition-all ${statusFilter === 'Rejected' ? 'border-red-600 ring-2 ring-red-300 shadow-sm cursor-default' : 'cursor-pointer hover:shadow-md'}`}
          onClick={() =>
            statusFilter !== 'Rejected' && setStatusFilter('Rejected')
          }
        >
          <CardContent className={`h-full p-3 sm:p-4 rounded-[inherit] flex items-center ${statusFilter === 'Rejected' ? 'bg-red-100' : 'bg-red-50/30'}`}>            <div className="w-full flex items-center justify-between gap-2">              <div className="min-w-0">                <p className={`text-base sm:text-lg font-bold ${statusFilter === 'Rejected' ? 'text-red-900' : 'text-red-800'}`}>Denied</p>
                <p className="text-xl sm:text-2xl leading-tight font-semibold text-red-900">{deniedRequests.length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`h-full border-orange-400 bg-white transition-all ${statusFilter === 'Processing Completion' ? 'border-orange-500 ring-2 ring-orange-300 shadow-sm cursor-default' : 'cursor-pointer hover:shadow-md'}`}
          onClick={() => {
            if (statusFilter !== 'Processing Completion') setStatusFilter('Processing Completion');
            if (activeTab !== 'other') {
              setActiveTab('other');
              onTabChange?.('other');
            }
          }}
        >
          <CardContent className={`h-full p-3 sm:p-4 rounded-[inherit] flex items-center ${statusFilter === 'Processing Completion' ? 'bg-orange-100' : 'bg-orange-50/30'}`}>            <div className="w-full flex items-center justify-between gap-2">              <div className="min-w-0">                <p className={`text-base sm:text-lg font-bold ${statusFilter === 'Processing Completion' ? 'text-orange-900' : 'text-orange-800'}`}>Processing Completion</p>
                <p className="text-xl sm:text-2xl leading-tight font-semibold text-orange-900">{returnedRequests.length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => {
        const newTab = v as 'certificates' | 'other';
        setActiveTab(newTab);
        onTabChange?.(newTab);
      }} className="space-y-4">
        <TabsList>
          <TabsTrigger value="certificates">
            <div className="flex items-center gap-2">
              <span>Certificates</span>
              {certificateCount > 0 && (
                <span className={`min-w-[26px] h-6 px-2 rounded-full text-sm font-semibold flex items-center justify-center ${getTabCountColor()}`}>
                  {certificateCount}
                </span>
              )}
            </div>
          </TabsTrigger>

          <TabsTrigger value="other">
            <div className="flex items-center gap-2">
              <span>Other Documents</span>
              {otherCount > 0 && (
                <span className={`min-w-[26px] h-6 px-2 rounded-full text-sm font-semibold flex items-center justify-center ${getTabCountColor()}`}>
                  {otherCount}
                </span>
              )}
            </div>
          </TabsTrigger>
        </TabsList>



        <TabsContent value="certificates">
          <Card>
            <CardHeader>
              <CardTitle>
                Certificate Requests
                {statusFilter !== 'all' && (
                  <span className="text-sm font-normal text-gray-500 ml-2">- Showing {statusFilter} only</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">{renderRequestTable(filteredRequests, false)}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="other">
          <Card>
            <CardHeader>
              <CardTitle>
                Other Documents (Business Permit, etc.)
                {statusFilter !== 'all' && (
                  <span className="text-sm font-normal text-gray-500 ml-2">- Showing {statusFilter} only</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">{renderRequestTable(filteredRequests, true)}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Request Dialog */}
      <Dialog open={!!viewingRequest} onOpenChange={(open) => !open && setViewingRequest(null)}>
        <DialogContent className="w-[95vw] sm:max-w-[700px] md:max-w-[850px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto">
          {viewingRequest && (
            <>
              <DialogHeader className="-mx-6 -mt-6 border-b px-6 py-5 text-left">
                <DialogTitle className="text-[18px] font-bold text-gray-900">Request Details</DialogTitle>
                <DialogDescription className="text-[14px] text-gray-500">
                  Review the submitted request information and current processing status.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 pt-2">
                <div className="flex flex-col gap-5 rounded-[28px] border border-gray-200 bg-white px-6 py-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-5">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#2957a1] bg-[#2957a1]/10 shadow-sm">
                      <FileText className="h-10 w-10 text-[#2957a1]" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex rounded-full bg-blue-50 px-4 py-1 text-sm font-semibold text-[#2957a1]">
                          Request No: {viewingRequest.requestNo}
                        </span>
                        <Badge className={getStatusColor(viewingRequest.status)}>{getStatusLabel(viewingRequest.status)}</Badge>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Document Type</p>
                        <p className="mt-1 text-[30px] font-bold leading-tight text-gray-900 break-words">
                          {viewingRequest.documentType}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:min-w-[360px]">
                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Date Requested</p>
                      <p className="mt-1 text-base font-semibold text-gray-900">
                        {formatWordDate(viewingRequest.dateRequested)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Resident ID</p>
                      <p className="mt-1 text-base font-semibold text-gray-900">{viewingRequest.residentId}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.08fr_0.92fr]">
                  <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-[15px] font-bold text-[#2957a1]">Resident Information</h3>
                    <div className="rounded-3xl bg-gray-50 p-5">
                      <div className="mb-5">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Resident</Label>
                        <p className="mt-2 text-[30px] font-bold leading-tight text-gray-900 break-words">
                          {viewingRequest.residentName}
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-500">{viewingRequest.residentId}</p>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Contact Number</Label>
                          <p className="mt-2 text-lg font-semibold text-gray-900">{viewingRequest.contactNumber || 'Not provided'}</p>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email</Label>
                          <p className="mt-2 text-sm font-medium text-gray-900 break-all">
                            {viewingRequest.email || 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-[15px] font-bold text-[#2957a1]">Request Information</h3>
                    <div className="rounded-3xl bg-gray-50 p-5 space-y-5">
                      <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Purpose</Label>
                        <p className="mt-2 text-lg font-semibold text-gray-900 break-words">
                          {viewingRequest.purpose || 'No purpose provided'}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Request Type</Label>
                          <p className="mt-2 text-lg font-semibold text-gray-900">{viewingRequest.documentType}</p>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current Status</Label>
                          <div className="mt-2">
                            <Badge className={getStatusColor(viewingRequest.status)}>{getStatusLabel(viewingRequest.status)}</Badge>
                          </div>
                        </div>
                        {viewingRequest.status === 'Completed' && (
                          <div className="rounded-2xl bg-white px-4 py-4 shadow-sm sm:col-span-2">
                            <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Received By</Label>
                            <p className="mt-2 text-lg font-semibold text-gray-900 break-words">
                              {viewingRequest.receiverName || 'NOT SPECIFIED'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {activeTab === 'other' && viewingRequest.status === 'Processing' && (
                  <div className="rounded-[28px] border border-blue-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[#2957a1]" />
                      <p className="text-[15px] font-bold text-[#2957a1]">Appointment Details</p>
                    </div>
                    <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="rounded-2xl bg-white/80 px-4 py-4 shadow-sm">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-blue-700">Appointment Date</Label>
                          <p className="mt-2 text-lg font-semibold text-gray-900">
                            {viewingRequest.appointmentDate ? formatWordDate(viewingRequest.appointmentDate) : 'Not set'}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white/80 px-4 py-4 shadow-sm">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-blue-700">Appointment Time</Label>
                          <p className="mt-2 text-lg font-semibold text-gray-900">
                            {viewingRequest.appointmentTime ? formatAppointmentTime(viewingRequest.appointmentTime) : 'Not set'}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white/80 px-4 py-4 shadow-sm">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-blue-700">Set By</Label>
                          <p className="mt-2 text-lg font-semibold text-gray-900">
                            {viewingRequest.appointmentSetByAdmin || 'Barangay Admin'}
                          </p>
                        </div>
                      </div>
                      {!viewingRequest.appointmentDate && !viewingRequest.appointmentTime && (
                        <p className="mt-4 text-sm font-medium text-blue-900/80">
                          No appointment date and time have been recorded for this request yet.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {viewingRequest.rejectionReason && (
                  <div className={`rounded-[28px] bg-white p-6 shadow-sm ${
                    viewingRequest.status === 'Processing Completion' ? 'border border-orange-200' : 'border border-red-200'
                  }`}>
                    <div className={`rounded-3xl p-5 ${
                      viewingRequest.status === 'Processing Completion'
                        ? 'border border-orange-100 bg-orange-50'
                        : 'border border-red-100 bg-red-50'
                    }`}>
                      <div className="flex items-center gap-2">
                        <AlertCircle className={`h-4 w-4 ${
                          viewingRequest.status === 'Processing Completion' ? 'text-orange-700' : 'text-red-700'
                        }`} />
                        <Label className={`text-xs font-semibold uppercase tracking-wide ${
                          viewingRequest.status === 'Processing Completion' ? 'text-orange-700' : 'text-red-700'
                        }`}>
                          {viewingRequest.status === 'Processing Completion' ? 'Missing Requirement Reason' : 'Denial Reason'}
                        </Label>
                      </div>
                      <p className={`mt-3 text-base font-medium ${
                        viewingRequest.status === 'Processing Completion' ? 'text-orange-700' : 'text-red-700'
                      }`}>
                        {viewingRequest.rejectionReason}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="-mx-6 -mb-6 mt-6 border-t bg-gray-50 px-6 py-4 rounded-b-[inherit]">
                <Button variant="outline" onClick={() => setViewingRequest(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Deny Request Dialog */}
      <Dialog
        open={!!denyingRequest}
        onOpenChange={(open) => {
          if (!open) {
            setDenyingRequest(null);
            setDenyReason('');
          }
        }}
      >
        <DialogContent>
          {denyingRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Deny Request
                </DialogTitle>
                <DialogDescription>
                  Provide a reason for denying this request (max of 60 characters).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-gray-500">Request Number</Label>
                  <p className="font-semibold">{denyingRequest.requestNo}</p>
                </div>
                <div className="space-y-2 w-full">
                  <Label htmlFor="denyReason">Reason for Denial *</Label>

                  <div className="w-full">
                    <Textarea
                      id="denyReason"
                      value={denyReason}
                      onChange={(e) => setDenyReason(e.target.value)}
                      placeholder="Enter the reason for denying this request..."
                      rows={4}
                      maxLength={30}
                      className="w-full max-w-full resize-none overflow-hidden break-all whitespace-pre-wrap"
                    />
                  </div>

                  <div className="flex justify-end">
                    <span
                      className={`text-xs ${denyReason.length >= 60 ? "text-red-600" : "text-gray-500"
                        }`}
                    >
                      {denyReason.length}/30 characters
                    </span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setDenyingRequest(null); setDenyReason(''); }}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDenyRequest}>
                  Deny Request
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Appointment Dialog */}
      <Dialog
        open={!!appointmentRequest}
        onOpenChange={(open) => {
          if (!open) {
            setAppointmentRequest(null);
            setAppointmentDetails({ date: '', time: '', requirements: '', additionalNotes: '' });
            setAppointmentAttempted(false);
            setConfirmSendAppointmentOpen(false);
          }
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-[680px] md:max-w-[800px]">
          {appointmentRequest && (
            <>
              {/* ── Header ── */}
              <DialogHeader className="pb-2 border-b border-gray-100">
                <DialogTitle className="flex items-center gap-2 text-[#2957a1] text-xl font-bold">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2957a1]/10">
                    <Mail className="w-4 h-4 text-[#2957a1]" />
                  </div>
                  Schedule Appointment
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-1">
                  Set the appointment details for this request and move it to processing.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 pt-1">
                {/* ── Request info card ── */}
                <div className="rounded-xl border border-[#2957a1]/15 bg-[#f4f7fc] p-4">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#2957a1]/60 mb-0.5">Request No.</p>
                      <p className="text-sm font-bold text-gray-800">{appointmentRequest.requestNo}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#2957a1]/60 mb-0.5">Document Type</p>
                      <p className="text-sm font-bold text-gray-800">{appointmentRequest.documentType}</p>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-[#2957a1]/10">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#2957a1]/60 mb-0.5">Resident</p>
                      <p className="text-sm font-bold text-gray-800">{appointmentRequest.residentName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{appointmentRequest.residentId}</p>
                    </div>
                  </div>
                </div>

                {/* ── Date & Time row ── */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                  {/* ── Custom Date Picker ── */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">
                      Appointment Date <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative" ref={datePickerRef}>
                      <button
                        type="button"
                        onClick={() => { setShowDatePicker((v) => !v); setShowTimePicker(false); }}
                        className={`flex h-10 w-full items-center justify-between rounded-md border px-3 text-sm bg-white transition-colors ${
                          appointmentAttempted && !appointmentDetails.date
                            ? 'border-red-400 ring-1 ring-red-400'
                            : showDatePicker
                            ? 'border-[#2957a1] ring-1 ring-[#2957a1]/40'
                            : 'border-input hover:border-[#2957a1]/50'
                        }`}
                      >
                        <span className={appointmentDetails.date ? 'text-gray-800 font-medium' : 'text-gray-400'}>
                          {appointmentDetails.date
                            ? new Date(appointmentDetails.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'Select date'}
                        </span>
                        <Calendar className="h-4 w-4 text-gray-400" />
                      </button>

                      {showDatePicker && (
                        <div className="absolute left-0 z-50 mt-1.5 w-72 rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">
                          {/* Month nav */}
                          <div className="flex items-center justify-between px-5 pt-5 pb-3">
                            <button
                              type="button"
                              onClick={() => {
                                if (calViewMonth === 0) { setCalViewMonth(11); setCalViewYear(y => y - 1); }
                                else setCalViewMonth(m => m - 1);
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors text-base"
                            >‹</button>
                            <span className="text-sm font-semibold text-gray-800">
                              {new Date(calViewYear, calViewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (calViewMonth === 11) { setCalViewMonth(0); setCalViewYear(y => y + 1); }
                                else setCalViewMonth(m => m + 1);
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors text-base"
                            >›</button>
                          </div>
                          {/* Day headers */}
                          <div className="grid grid-cols-7 px-3 pb-1">
                            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                              <p key={d} className="text-center text-[11px] font-medium text-gray-400 py-1">{d}</p>
                            ))}
                          </div>
                          {/* Days */}
                          <div className="px-3 pb-3">
                            {(() => {
                              const today = new Date(); today.setHours(0,0,0,0);
                              const firstDay = new Date(calViewYear, calViewMonth, 1).getDay();
                              const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
                              const cells: React.ReactNode[] = [];
                              for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />);
                              for (let d = 1; d <= daysInMonth; d++) {
                                const dateObj = new Date(calViewYear, calViewMonth, d);
                                const isPast = dateObj < today;
                                const iso = `${calViewYear}-${String(calViewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                                const isSelected = appointmentDetails.date === iso;
                                const isToday = dateObj.getTime() === today.getTime();
                                cells.push(
                                  <button
                                    key={d}
                                    type="button"
                                    disabled={isPast}
                                    onClick={() => { setAppointmentDetails({ ...appointmentDetails, date: iso }); setShowDatePicker(false); }}
                                    className={`w-full aspect-square flex items-center justify-center rounded-full text-sm transition-colors
                                      ${isPast ? 'text-gray-300 cursor-not-allowed' :
                                        isSelected ? 'bg-[#2957a1] text-white font-semibold' :
                                        isToday ? 'text-[#2957a1] font-semibold hover:bg-gray-100' :
                                        'text-gray-700 hover:bg-gray-100'
                                      }`}
                                  >{d}</button>
                                );
                              }
                              return <div className="grid grid-cols-7 gap-0.5">{cells}</div>;
                            })()}
                          </div>
                          {/* Footer */}
                          <div className="border-t border-gray-100 px-5 py-3 flex justify-end">
                            <button
                              type="button"
                              onClick={() => { setAppointmentDetails({ ...appointmentDetails, date: '' }); setShowDatePicker(false); }}
                              className="text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors"
                            >Clear</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Custom Time Picker ── */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">
                      Appointment Time <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative" ref={timePickerRef}>
                      <button
                        type="button"
                        onClick={() => { setShowTimePicker((v) => !v); setShowDatePicker(false); }}
                        className={`flex h-10 w-full items-center justify-between rounded-md border px-3 text-sm bg-white transition-colors ${
                          appointmentAttempted && !appointmentDetails.time
                            ? 'border-red-400 ring-1 ring-red-400'
                            : showTimePicker
                            ? 'border-[#2957a1] ring-1 ring-[#2957a1]/40'
                            : 'border-input hover:border-[#2957a1]/50'
                        }`}
                      >
                        <span className={appointmentDetails.time ? 'text-gray-800 font-medium' : 'text-gray-400'}>
                          {appointmentDetails.time
                            ? (() => {
                                const [h, m] = appointmentDetails.time.split(':');
                                const hNum = parseInt(h, 10);
                                const period = hNum >= 12 ? 'PM' : 'AM';
                                const h12 = hNum % 12 === 0 ? 12 : hNum % 12;
                                return `${String(h12).padStart(2,'0')}:${m} ${period}`;
                              })()
                            : 'Select time'}
                        </span>
                        <Clock className="h-4 w-4 text-gray-400" />
                      </button>

                      {showTimePicker && (
                        <div className="absolute left-0 right-0 z-50 mt-1.5 rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">
                          {/* Title */}
                          <div className="px-5 pt-5 pb-4 border-b border-gray-100">
                            <p className="text-sm font-semibold text-gray-800">Select Time</p>
                          </div>
                          {/* Controls */}
                          <div className="flex items-center gap-2 px-5 py-4">
                            {/* Hour select */}
                            <div className="relative">
                              <select
                                value={tpHour}
                                onChange={e => setTpHour(e.target.value)}
                                className="appearance-none h-9 pl-3 pr-7 rounded-lg border border-gray-200 text-sm font-semibold text-gray-800 bg-white focus:outline-none focus:border-[#2957a1] focus:ring-1 focus:ring-[#2957a1]/30 cursor-pointer"
                              >
                                {['01','02','03','04','05','06','07','08','09','10','11','12'].map(h => (
                                  <option key={h} value={h}>{h}</option>
                                ))}
                              </select>
                              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-400 text-xs">▾</span>
                            </div>
                            <span className="text-lg font-bold text-gray-500">:</span>
                            {/* Minute select */}
                            <div className="relative">
                              <select
                                value={tpMinute}
                                onChange={e => setTpMinute(e.target.value)}
                                className="appearance-none h-9 pl-3 pr-7 rounded-lg border border-gray-200 text-sm font-semibold text-gray-800 bg-white focus:outline-none focus:border-[#2957a1] focus:ring-1 focus:ring-[#2957a1]/30 cursor-pointer"
                              >
                                {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
                                  <option key={m} value={m}>{m}</option>
                                ))}
                              </select>
                              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-400 text-xs">▾</span>
                            </div>
                            {/* AM/PM toggle */}
                            <div className="ml-1 flex items-center gap-1">
                              {(['AM','PM'] as const).map(p => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => setTpPeriod(p)}
                                  className={`px-2.5 py-1 rounded-md text-sm font-semibold transition-colors ${
                                    tpPeriod === p ? 'text-[#2957a1] font-bold' : 'text-gray-400 hover:text-gray-600'
                                  }`}
                                >{p}</button>
                              ))}
                            </div>
                          </div>
                          {/* Footer */}
                          <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => setShowTimePicker(false)}
                              className="text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
                            >Cancel</button>
                            <button
                              type="button"
                              onClick={() => {
                                const hNum = parseInt(tpHour, 10);
                                const h24 = tpPeriod === 'AM' ? (hNum === 12 ? 0 : hNum) : (hNum === 12 ? 12 : hNum + 12);
                                setAppointmentDetails({ ...appointmentDetails, time: `${String(h24).padStart(2,'0')}:${tpMinute}` });
                                setShowTimePicker(false);
                              }}
                              className="px-5 py-1.5 rounded-full bg-[#2957a1] text-sm font-semibold text-white hover:bg-[#1e4080] active:scale-[0.98] transition-all"
                            >Apply</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Required Documents ── */}
                <div className="space-y-1.5">
                  <Label htmlFor="requirements" className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    Required Documents to Bring <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="requirements"
                    value={appointmentDetails.requirements}
                    onChange={(e) => setAppointmentDetails({ ...appointmentDetails, requirements: e.target.value })}
                    placeholder="e.g., Valid ID, Proof of Residency, etc."
                    rows={3}
                    className={`resize-none text-sm ${appointmentAttempted && !appointmentDetails.requirements.trim() ? 'border-red-400 focus-visible:ring-red-400' : 'focus-visible:ring-[#2957a1]/40 focus-visible:border-[#2957a1]'}`}
                  />
                </div>

                {/* ── Additional Notes ── */}
                <div className="space-y-1.5">
                  <Label htmlFor="additionalNotes" className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    Additional Notes <span className="text-gray-400 font-normal normal-case tracking-normal">(Optional)</span>
                  </Label>
                  <Textarea
                    id="additionalNotes"
                    value={appointmentDetails.additionalNotes}
                    onChange={(e) => setAppointmentDetails({ ...appointmentDetails, additionalNotes: e.target.value })}
                    placeholder="Any additional instructions..."
                    rows={2}
                    className="resize-none text-sm focus-visible:ring-[#2957a1]/40 focus-visible:border-[#2957a1]"
                  />
                </div>
              </div>

              {/* ── Footer ── */}
              <DialogFooter className="pt-2 border-t border-gray-100 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-400">
                  Sending the appointment will move this request to the <span className="font-semibold text-gray-500">Processing</span> tab.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="text-sm border-gray-200 text-gray-600 hover:bg-gray-50"
                    onClick={() => {
                      setAppointmentRequest(null);
                      setAppointmentDetails({ date: '', time: '', requirements: '', additionalNotes: '' });
                      setAppointmentAttempted(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button className="bg-[#2957a1] hover:bg-[#1e4080] text-sm font-semibold" onClick={() => setConfirmSendAppointmentOpen(true)}>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Appointment
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmSendAppointmentOpen} onOpenChange={setConfirmSendAppointmentOpen}>
        <AlertDialogContent className="max-w-[420px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Send this appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send the appointment details to the resident and move this request to the Processing tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmSendAppointmentOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmSendAppointmentOpen(false);
                handleSendAppointment();
              }}
            >
              Yes, send appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Denial Reason Dialog */}
      <Dialog
        open={!!returningRequest}
        onOpenChange={(open) => {
          if (!open) {
            setReturningRequest(null);
            setReturnReason('');
          }
        }}
      >
        <DialogContent>
          {returningRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  Return for Completion
                </DialogTitle>
                <DialogDescription>
                  Provide the missing requirement reason for this request.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="returnReason">Missing Requirement Reason *</Label>
                <Textarea
                  id="returnReason"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  rows={4}
                  maxLength={30}
                />
                <div className="flex justify-end">
                  <span className={`text-xs ${returnReason.length >= 30 ? 'text-red-600' : 'text-gray-500'}`}>
                    {returnReason.length}/30 characters
                  </span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setReturningRequest(null); setReturnReason(''); }}>
                  Cancel
                </Button>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleReturnForCompletion}>
                  Return Request
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!viewingDenialReason}
        onOpenChange={(open) => !open && setViewingDenialReason(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Denial Reason
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-gray-700 whitespace-pre-wrap">{viewingDenialReason}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingDenialReason(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}






