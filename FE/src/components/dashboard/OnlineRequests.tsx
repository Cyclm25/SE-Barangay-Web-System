// OnlineRequests.tsx
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { FileText, Clock, CheckCircle, XCircle, Eye, Search, AlertCircle, Mail } from 'lucide-react';
import { toast } from 'sonner';

type RequestStatus = 'Pending' | 'Processing' | 'Ready for Pickup' | 'Completed' | 'Rejected';

interface Request {
  id: string;                 // NotificationID
  requestNo: string;          // RequestID formatted
  residentName: string;       // now full name (from JOIN resident)
  residentId: string;         // ResidentID
  documentType: string;       // RequestType
  purpose: string;            // RequestPurpose
  dateRequested: string;      // RequestDate
  dateCompleted?: string;     // not in DB yet
  status: RequestStatus;      // RequestStatus
  contactNumber: string;      // from resident table (JOIN)
  email?: string;             // from resident table (JOIN)
  rejectionReason?: string;   // UI only
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
}

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
    };
  };

  /**
   * ✅ loadInbox(silent?)
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

  const handleSendAppointment = () => {
    if (!appointmentRequest) return;

    if (!appointmentDetails.date || !appointmentDetails.time || !appointmentDetails.requirements.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setRequests(prev =>
      prev.map(req => (req.id === appointmentRequest.id ? { ...req, status: 'Processing' } : req))
    );

    toast.success(`Appointment scheduled! (UI only)`, { duration: 4000 });

    setAppointmentRequest(null);
    setAppointmentDetails({ date: '', time: '', requirements: '', additionalNotes: '' });
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
                        onClick={() => setAppointmentRequest(request)}
                      >
                        Process
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => handleStatusChange(request.id, 'Processing')}
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
                    onClick={() => handleStatusChange(request.id, 'Ready for Pickup')}
                  >
                    Ready
                  </Button>
                )}

                {request.status === 'Ready for Pickup' && (
                  <Button
                    size="sm"
                    className="bg-gray-600 hover:bg-gray-700 text-white"
                    onClick={() => handleStatusChange(request.id, 'Completed')}
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
          className={`border-yellow-400 transition-all ${statusFilter === 'Pending' ? 'ring-2 ring-yellow-400 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}`}
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
          className={`border-blue-400 transition-all ${statusFilter === 'Processing' ? 'ring-2 ring-blue-400 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}`}
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
          className={`border-green-400 transition-all ${statusFilter === 'Ready for Pickup' ? 'ring-2 ring-green-400 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}`}
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
          className={`border-gray-400 transition-all ${statusFilter === 'Completed' ? 'ring-2 ring-gray-400 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}`}
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
          className={`border-2 border-red-500 transition-all ${statusFilter === 'Rejected' ? 'border-red-500 ring-2 ring-red-500 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}`}
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
                <span className="min-w-[26px] h-6 px-2 rounded-full bg-red-600 text-white text-sm font-semibold flex items-center justify-center">
                  {certificateCount}
                </span>
              )}
            </div>
          </TabsTrigger>

          <TabsTrigger value="other">
            <div className="flex items-center gap-2">
              <span>Other Documents</span>
              {otherCount > 0 && (
                <span className="min-w-[26px] h-6 px-2 rounded-full bg-red-600 text-white text-sm font-semibold flex items-center justify-center">
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
        <DialogContent>
          {viewingRequest && (
            <>
              <DialogHeader>
                <DialogTitle>Request Details</DialogTitle>
                <DialogDescription>View the details of the request</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-gray-500">Request Number</Label>
                  <p className="font-semibold">{viewingRequest.requestNo}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Resident</Label>
                  <p className="font-semibold">{viewingRequest.residentName}</p>
                  <p className="text-xs text-gray-500">{viewingRequest.residentId}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">Contact Number</Label>
                    <p className="font-semibold">{viewingRequest.contactNumber}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Email</Label>
                    <p className="font-semibold">{viewingRequest.email}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Document Type</Label>
                  <p className="font-semibold">{viewingRequest.documentType}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Purpose</Label>
                  <p>{viewingRequest.purpose}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Date Requested</Label>
                  <p>{new Date(viewingRequest.dateRequested).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Status</Label>
                  <Badge className={getStatusColor(viewingRequest.status)}>{viewingRequest.status}</Badge>
                </div>
                {viewingRequest.rejectionReason && (
                  <div>
                    <Label className="text-xs text-gray-500">Rejection Reason</Label>
                    <p className="text-red-600">{viewingRequest.rejectionReason}</p>
                  </div>
                )}
              </div>
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
                  Set appointment details for the resident (UI only).
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="text-xs text-gray-500">Request Number</Label>
                    <p className="font-semibold">{appointmentRequest.requestNo}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Document Type</Label>
                    <p className="font-semibold">{appointmentRequest.documentType}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Resident</Label>
                    <p className="font-semibold">{appointmentRequest.residentName}</p>
                    <p className="text-xs text-gray-500">{appointmentRequest.residentId}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="appointmentDate">Appointment Date *</Label>
                    <Input
                      id="appointmentDate"
                      type="date"
                      value={appointmentDetails.date}
                      onChange={(e) => setAppointmentDetails({ ...appointmentDetails, date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="appointmentTime">Appointment Time *</Label>
                    <Input
                      id="appointmentTime"
                      type="time"
                      value={appointmentDetails.time}
                      onChange={(e) => setAppointmentDetails({ ...appointmentDetails, time: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="requirements">Required Documents to Bring *</Label>
                  <Textarea
                    id="requirements"
                    value={appointmentDetails.requirements}
                    onChange={(e) => setAppointmentDetails({ ...appointmentDetails, requirements: e.target.value })}
                    placeholder="e.g., Valid ID, Proof of Residency, etc."
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div>
                  <Label htmlFor="additionalNotes">Additional Notes (Optional)</Label>
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

              <DialogFooter>
                <Button variant="outline" onClick={() => { setAppointmentRequest(null); setAppointmentDetails({ date: '', time: '', requirements: '', additionalNotes: '' }); }}>
                  Cancel
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSendAppointment}>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Appointment
                </Button>
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

