// OnlineRequests.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { FileText, Clock, CheckCircle, XCircle, Eye, Search, AlertCircle, Mail, Calendar } from 'lucide-react';
import { toast } from 'sonner';

type RequestStatus = 'Pending' | 'Processing' | 'Ready for Pickup' | 'Completed' | 'Rejected';

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
}

export function OnlineRequests({
  initialFilter = 'all',
  initialTab = 'certificates',
  onFilterChange,
  onTabChange,
}: OnlineRequestsProps = {}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'certificates' | 'other'>(initialTab);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>(
    initialFilter === 'pending' ? 'Pending' :
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
  const [viewingDenialReason, setViewingDenialReason] = useState<string | null>(null);
  const [appointmentRequest, setAppointmentRequest] = useState<Request | null>(null);
  const [appointmentDetails, setAppointmentDetails] = useState({
    date: '',
    time: '',
    requirements: '',
    additionalNotes: ''
  });
  const [appointmentAttempted, setAppointmentAttempted] = useState(false);
  const appointmentDateInputRef = useRef<HTMLInputElement | null>(null);
  const appointmentTimeInputRef = useRef<HTMLInputElement | null>(null);
  const [confirmAction, setConfirmAction] = useState<null | {
    request: Request;
    kind: 'process' | 'ready' | 'complete';
    isOtherDocuments: boolean;
  }>(null);

  const API_BASE = "http://localhost:5001";

  const isKnownStatus = (s: string): s is RequestStatus => {
    return ['Pending', 'Processing', 'Ready for Pickup', 'Completed', 'Rejected'].includes(s);
  };

  const buildResidentName = (row: InboxRow) => {
    const full = `${row.FirstName ?? ''} ${row.MiddleName ?? ''} ${row.LastName ?? ''}`.replace(/\s+/g, ' ').trim();
    return full || row.ResidentID; // fallback to ID if name missing
  };

  const normalizeStatus = (status: string): RequestStatus => {
    const s = status?.trim().toLowerCase();

    if (s === "pending") return "Pending";
    if (s === "processing") return "Processing";
    if (s === "ready for pickup") return "Ready for Pickup";
    if (s === "completed") return "Completed";
    if (s === "rejected") return "Rejected";

    return "Pending"; // safe fallback
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

      // COUNT HERE (Pending only)
      const certificates = (data as any[]).filter(
        (r) =>
          r.RequestStatus === "Pending" &&
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
        (r) => r.RequestStatus === "Pending" && !certificateTypes.includes(r.RequestType)
      ).length;

      setCertificateCount(certificates);
      setOtherCount(others);

      const mapped = (data as InboxRow[]).map(toUIRequest);
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
    } else if (initialFilter === 'pickup') {
      setStatusFilter('Ready for Pickup');
      setActiveTab('certificates');
    }
  }, [initialFilter]);

  // Sync tab changes with parent
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleStatusChange = async (id: string, newStatus: RequestStatus) => {
    try {
      // Optimistic update
      setRequests(prev =>
        prev.map(req =>
          req.id === id ? { ...req, status: newStatus } : req
        )
      );

      const res = await fetch(`${API_BASE}/requests/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to update status");
        await loadInbox(false); // Revert on error
        return;
      }

      await loadInbox(false);

      toast.success(`Moved to ${newStatus}`);

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
        headers: { "Content-Type": "application/json" },
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
      const rawUser = localStorage.getItem("app_user");
      const currentUser = rawUser ? JSON.parse(rawUser) : null;
      const setByAdmin = String(currentUser?.name || currentUser?.id || "Barangay Admin").trim();

      setRequests(prev =>
        prev.map(req => (req.id === appointmentRequest.id ? { ...req, status: 'Processing' } : req))
      );

      const res = await fetch(`${API_BASE}/requests/${appointmentRequest.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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
      case 'Ready for Pickup': return 'bg-green-100 text-green-800';
      case 'Completed': return 'bg-gray-100 text-gray-800';
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
      case 'Rejected':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-red-600 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return <Clock className="w-4 h-4" />;
      case 'Processing': return <FileText className="w-4 h-4" />;
      case 'Ready for Pickup': return <CheckCircle className="w-4 h-4" />;
      case 'Completed': return <CheckCircle className="w-4 h-4" />;
      case 'Rejected': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
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

  const renderRequestTable = (requestList: Request[], isOtherDocuments = false) => (
    <Table>
      <TableHeader className="bg-[#2957a1]">
        <TableRow className="hover:bg-[#2957a1]">
          <TableHead className="text-white font-bold">Request No.</TableHead>
          <TableHead className="text-white font-bold">Resident</TableHead>
          <TableHead className="text-white font-bold">Document Type</TableHead>
          {!isOtherDocuments && <TableHead className="text-white font-bold">Purpose</TableHead>}
          <TableHead className="text-white font-bold">Date Requested</TableHead>
          <TableHead className="text-white font-bold">Status</TableHead>
          <TableHead className="text-white font-bold">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requestList.map((request) => (
          <TableRow key={request.id} className="hover:bg-gray-50">
            <TableCell className="font-medium">{request.requestNo}</TableCell>
            <TableCell>
              <div className="flex flex-col">
                <span>{request.residentName}</span>
                <span className="text-xs text-gray-500">{request.residentId}</span>
              </div>
            </TableCell>
            <TableCell>{request.documentType}</TableCell>
            {!isOtherDocuments && <TableCell>{request.purpose}</TableCell>}
            <TableCell>{new Date(request.dateRequested).toLocaleDateString()}</TableCell>
            <TableCell>
              <Badge className={getStatusColor(request.status)}>
                <span className="flex items-center gap-1">
                  {getStatusIcon(request.status)}
                  {request.status}
                </span>
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2 text-gray-400 hover:text-gray-600">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="flex items-center gap-2 bg-gray-100 text-black hover:bg-gray-300 transition-colors"
                    onClick={() => setViewingRequest(request)}
                  >
                    <Eye className="w-6 h-6" />
                    <span>View Info</span>
                  </Button>

                  {request.status === 'Rejected' && (
                    <Button
                      size="sm"
                      className="flex items-center gap-2 bg-white text-red-600 border border-red-200 hover:bg-red-50"
                      onClick={() => setViewingDenialReason(request.rejectionReason ?? 'No reason provided')}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>View Reason</span>
                    </Button>
                  )}
                </div>

                {request.status === 'Pending' && (
                  <>
                    {isOtherDocuments ? (
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => setConfirmAction({ request, kind: 'process', isOtherDocuments: true })}
                      >
                        Process
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => setConfirmAction({ request, kind: 'process', isOtherDocuments: false })}
                      >
                        Process
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => setDenyingRequest(request)}>
                      Deny
                    </Button>
                  </>
                )}

                {request.status === 'Processing' && (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setConfirmAction({ request, kind: 'ready', isOtherDocuments })}
                  >
                    Ready
                  </Button>
                )}

                {request.status === 'Ready for Pickup' && (
                  <Button
                    size="sm"
                    className="bg-gray-600 hover:bg-gray-700 text-white"
                    onClick={() => setConfirmAction({ request, kind: 'complete', isOtherDocuments })}
                  >
                    Complete
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}

        {requestList.length === 0 && (
          <TableRow>
            <TableCell colSpan={isOtherDocuments ? 6 : 7} className="text-center text-gray-500 py-8">
              {isLoading ? "Loading..." : "No requests found"}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
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
                <>This will move the request from Processing to Ready for Pickup.</>
              ) : (
                <>This will mark the request as Completed.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#2957a1] hover:bg-[#1e3f7a]"
              onClick={() => {
                const action = confirmAction;
                setConfirmAction(null);
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
                  handleStatusChange(action.request.id, 'Ready for Pickup');
                  return;
                }

                handleStatusChange(action.request.id, 'Completed');
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Online Requests</h1>
          <p className="text-gray-600 mt-1">Manage document requests from residents</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => loadInbox(false)} disabled={isLoading}>
            Refresh
          </Button>

          <div className="flex items-center gap-2">
            <Label className="text-sm">Search:</Label>
            <div className="relative w-80">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card
          className={`border-yellow-400 transition-all ${statusFilter === 'Pending' ? 'cursor-default' : 'cursor-pointer hover:shadow-md'}`}
          onClick={() => {
            if (statusFilter !== 'Pending') {
              setStatusFilter('Pending');
              onFilterChange?.('pending');
            }
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">{pendingRequests.length}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`border-blue-400 transition-all ${statusFilter === 'Processing' ? 'cursor-default' : 'cursor-pointer hover:shadow-md'}`}
          onClick={() => {
            if (statusFilter !== 'Processing') {
              setStatusFilter('Processing');
              onFilterChange?.('processing');
            }
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Processing</p>
                <p className="text-2xl font-semibold text-gray-900">{processingRequests.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`border-green-400 transition-all ${statusFilter === 'Ready for Pickup' ? 'cursor-default' : 'cursor-pointer hover:shadow-md'}`}
          onClick={() => {
            if (statusFilter !== 'Ready for Pickup') {
              setStatusFilter('Ready for Pickup');
              onFilterChange?.('pickup');
            }
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ready for Pickup</p>
                <p className="text-2xl font-semibold text-gray-900">{readyRequests.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`border-gray-400 transition-all ${statusFilter === 'Completed' ? 'cursor-default' : 'cursor-pointer hover:shadow-md'}`}
          onClick={() => statusFilter !== 'Completed' && setStatusFilter('Completed')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">{completedRequests.length}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`border-2 border-red-500 transition-all ${statusFilter === 'Rejected' ? 'border-red-500 cursor-default' : 'cursor-pointer hover:shadow-md'}`}
          onClick={() =>
            statusFilter !== 'Rejected' && setStatusFilter('Rejected')
          }
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Denied</p>
                <p className="text-2xl font-semibold text-gray-900">{deniedRequests.length}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
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
                        <Badge className={getStatusColor(viewingRequest.status)}>{viewingRequest.status}</Badge>
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
                            <Badge className={getStatusColor(viewingRequest.status)}>{viewingRequest.status}</Badge>
                          </div>
                        </div>
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
                  <div className="rounded-[28px] border border-red-200 bg-white p-6 shadow-sm">
                    <div className="rounded-3xl border border-red-100 bg-red-50 p-5">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-700" />
                        <Label className="text-xs font-semibold uppercase tracking-wide text-red-700">Rejection Reason</Label>
                      </div>
                      <p className="mt-3 text-base font-medium text-red-700">{viewingRequest.rejectionReason}</p>
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
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          {appointmentRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  Schedule Appointment
                </DialogTitle>
                <DialogDescription>
                  Set the appointment details for this request and move it to processing.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2">
                  <div className="space-y-1 text-left">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Request Number</Label>
                    <p className="text-lg font-semibold text-gray-900">{appointmentRequest.requestNo}</p>
                  </div>
                  <div className="space-y-1 text-left">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Document Type</Label>
                    <p className="text-lg font-semibold text-gray-900">{appointmentRequest.documentType}</p>
                  </div>
                  <div className="space-y-1 text-left sm:col-span-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Resident</Label>
                    <p className="text-lg font-semibold leading-snug text-gray-900 break-words">{appointmentRequest.residentName}</p>
                    <p className="text-sm text-gray-500">{appointmentRequest.residentId}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="appointmentDate" className="font-semibold">Appointment Date *</Label>
                    <div className="relative">
                      <Input
                        ref={appointmentDateInputRef}
                        id="appointmentDate"
                        type="date"
                        value={appointmentDetails.date}
                        onChange={(e) => setAppointmentDetails({ ...appointmentDetails, date: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        className={appointmentAttempted && !appointmentDetails.date
                          ? 'border-red-500 pr-12 text-left [color-scheme:light] focus-visible:ring-red-500 [&::-webkit-calendar-picker-indicator]:opacity-0'
                          : 'pr-12 text-left [color-scheme:light] [&::-webkit-calendar-picker-indicator]:opacity-0'}
                      />
                      <button
                        type="button"
                        aria-label="Open appointment date picker"
                        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-gray-700 hover:text-[#2957a1]"
                        onClick={() => {
                          appointmentDateInputRef.current?.showPicker?.();
                          appointmentDateInputRef.current?.focus();
                        }}
                      >
                        <Calendar className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appointmentTime" className="font-semibold">Appointment Time *</Label>
                    <div className="relative">
                      <Input
                        ref={appointmentTimeInputRef}
                        id="appointmentTime"
                        type="time"
                        value={appointmentDetails.time}
                        onChange={(e) => setAppointmentDetails({ ...appointmentDetails, time: e.target.value })}
                        className={appointmentAttempted && !appointmentDetails.time
                          ? 'border-red-500 pr-12 text-left [color-scheme:light] focus-visible:ring-red-500 [&::-webkit-calendar-picker-indicator]:opacity-0'
                          : 'pr-12 text-left [color-scheme:light] [&::-webkit-calendar-picker-indicator]:opacity-0'}
                      />
                      <button
                        type="button"
                        aria-label="Open appointment time picker"
                        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-gray-700 hover:text-[#2957a1]"
                        onClick={() => {
                          appointmentTimeInputRef.current?.showPicker?.();
                          appointmentTimeInputRef.current?.focus();
                        }}
                      >
                        <Clock className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requirements" className="font-semibold">Required Documents to Bring *</Label>
                  <Textarea
                    id="requirements"
                    value={appointmentDetails.requirements}
                    onChange={(e) => setAppointmentDetails({ ...appointmentDetails, requirements: e.target.value })}
                    placeholder="e.g., Valid ID, Proof of Residency, etc."
                    rows={4}
                    className={`resize-none ${appointmentAttempted && !appointmentDetails.requirements.trim() ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additionalNotes" className="font-semibold">Additional Notes (Optional)</Label>
                  <Textarea
                    id="additionalNotes"
                    value={appointmentDetails.additionalNotes}
                    onChange={(e) => setAppointmentDetails({ ...appointmentDetails, additionalNotes: e.target.value })}
                    placeholder="Any additional instructions..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>

              <DialogFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500">
                  Sending the appointment will move this request to the Processing tab.
                </p>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAppointmentRequest(null);
                      setAppointmentDetails({ date: '', time: '', requirements: '', additionalNotes: '' });
                      setAppointmentAttempted(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSendAppointment}>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Appointment
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* View Denial Reason Dialog */}
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

