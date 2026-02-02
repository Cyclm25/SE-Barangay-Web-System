import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { FileText, Clock, CheckCircle, XCircle, Eye, Download, Search, AlertCircle, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface Request {
  id: string;
  requestNo: string;
  residentName: string;
  documentType: string;
  purpose: string;
  dateRequested: string;
  dateCompleted?: string;
  status: 'Pending' | 'Processing' | 'Ready for Pickup' | 'Completed' | 'Rejected';
  contactNumber: string;
  email?: string;
  rejectionReason?: string;
}

export function OnlineRequests() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'certificates' | 'other'>('certificates');
  const [statusFilter, setStatusFilter] = useState<Request['status'] | 'all'>('all');
  const [requests, setRequests] = useState<Request[]>([
    {
      id: '1',
      requestNo: 'REQ-2025-001',
      residentName: 'Gabriel Siang Chua',
      documentType: 'Barangay Clearance',
      purpose: 'Employment',
      dateRequested: '2025-01-20',
      status: 'Pending',
      contactNumber: '09171234567',
      email: 'gabriel.chua@email.com'
    },
    {
      id: '2',
      requestNo: 'REQ-2025-002',
      residentName: 'Robert Wey Poresa',
      documentType: 'Barangay Certificate',
      purpose: 'School Requirement',
      dateRequested: '2025-01-19',
      status: 'Processing',
      contactNumber: '09181234567',
      email: 'robert.poresa@email.com'
    },
    {
      id: '3',
      requestNo: 'REQ-2025-003',
      residentName: 'Rain Tirpo Talaum',
      documentType: 'Barangay ID',
      purpose: 'Personal Use',
      dateRequested: '2025-01-18',
      status: 'Ready for Pickup',
      contactNumber: '09191234567',
      email: 'rain.talaum@email.com'
    },
    {
      id: '4',
      requestNo: 'REQ-2025-004',
      residentName: 'Fred Rollan Dizon',
      documentType: 'Certificate of Indigency',
      purpose: 'Medical Assistance',
      dateRequested: '2025-01-17',
      status: 'Ready for Pickup',
      contactNumber: '09201234567',
      email: 'fred.dizon@email.com'
    },
    {
      id: '5',
      requestNo: 'REQ-2025-005',
      residentName: 'Dany Rey Dizon',
      documentType: 'Business Permit',
      purpose: 'Business Registration',
      dateRequested: '2025-01-15',
      dateCompleted: '2025-01-22',
      status: 'Completed',
      contactNumber: '09211234567',
      email: 'dany.dizon@email.com'
    },
    {
      id: '6',
      requestNo: 'REQ-2025-006',
      residentName: 'Maria Santos Cruz',
      documentType: 'Community Tax Certificate',
      purpose: 'Business Requirements',
      dateRequested: '2025-01-24',
      status: 'Pending',
      contactNumber: '09221234567',
      email: 'maria.cruz@email.com'
    },
  ]);

  const [viewingRequest, setViewingRequest] = useState<Request | null>(null);
  const [denyingRequest, setDenyingRequest] = useState<Request | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [appointmentRequest, setAppointmentRequest] = useState<Request | null>(null);
  const [appointmentDetails, setAppointmentDetails] = useState({
    date: '',
    time: '',
    requirements: '',
    additionalNotes: ''
  });

  const handleStatusChange = (id: string, newStatus: Request['status']) => {
    setRequests(requests.map(req =>
      req.id === id ? { 
        ...req, 
        status: newStatus,
        dateCompleted: (newStatus === 'Completed' || newStatus === 'Rejected') ? new Date().toISOString() : req.dateCompleted
      } : req
    ));
    toast.success(`Request status updated to ${newStatus}`);
  };

  const handleDenyRequest = () => {
    if (!denyingRequest || !denyReason.trim()) {
      toast.error('Please provide a reason for denying this request');
      return;
    }

    setRequests(requests.map(req =>
      req.id === denyingRequest.id 
        ? { ...req, status: 'Rejected', rejectionReason: denyReason, dateCompleted: new Date().toISOString() } 
        : req
    ));

    // Simulate sending notification
    toast.success(
      `Request denied. Notification sent to ${denyingRequest.residentName} via Email/SMS`,
      { duration: 5000 }
    );

    setDenyingRequest(null);
    setDenyReason('');
  };

  const handleSendAppointment = () => {
    if (!appointmentRequest) return;

    if (!appointmentDetails.date || !appointmentDetails.time || !appointmentDetails.requirements.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Update request status to Processing
    setRequests(requests.map(req =>
      req.id === appointmentRequest.id ? { ...req, status: 'Processing' } : req
    ));

    // Simulate sending appointment notification
    const message = `
Dear ${appointmentRequest.residentName},

Your request for ${appointmentRequest.documentType} (${appointmentRequest.requestNo}) is being processed.

Please visit our barangay office for an appointment on:
📅 Date: ${appointmentDetails.date}
🕐 Time: ${appointmentDetails.time}

📋 Required Documents to Bring:
${appointmentDetails.requirements}

${appointmentDetails.additionalNotes ? `Additional Notes:\n${appointmentDetails.additionalNotes}` : ''}

We look forward to seeing you!

Barangay Management
    `.trim();

    console.log('Appointment notification:', message);
    
    toast.success(
      <div className="space-y-1">
        <p className="font-semibold">Appointment scheduled!</p>
        <p className="text-sm">Notification sent to {appointmentRequest.email} and {appointmentRequest.contactNumber}</p>
      </div>,
      { duration: 5000 }
    );

    setAppointmentRequest(null);
    setAppointmentDetails({
      date: '',
      time: '',
      requirements: '',
      additionalNotes: ''
    });
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

  // Filter requests by document type
  const certificateRequests = requests.filter(r => 
    ['Barangay Clearance', 'Certificate of Indigency', 'Barangay ID', 'Barangay Certificate'].includes(r.documentType)
  );
  const otherDocumentsRequests = requests.filter(r => 
    !['Barangay Clearance', 'Certificate of Indigency', 'Barangay ID', 'Barangay Certificate'].includes(r.documentType)
  );

  const pendingRequests = requests.filter(r => r.status === 'Pending');
  const processingRequests = requests.filter(r => r.status === 'Processing');
  const readyRequests = requests.filter(r => r.status === 'Ready for Pickup');
  const completedRequests = requests.filter(r => r.status === 'Completed');

  // Get filtered requests based on active tab and status filter
  const getCurrentTabRequests = () => {
    const baseRequests = activeTab === 'certificates' ? certificateRequests : otherDocumentsRequests;
    if (statusFilter === 'all') return baseRequests;
    return baseRequests.filter(r => r.status === statusFilter);
  };

  const currentRequests = getCurrentTabRequests();

  // Filter requests based on search term (applied to current tab)
  const filteredRequests = currentRequests.filter(req =>
    req.requestNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.residentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.documentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.purpose.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderRequestTable = (requestList: Request[], isOtherDocuments = false) => (
    <Table>
      <TableHeader className="bg-[#2957a1]">
        <TableRow className="hover:bg-[#2957a1]">
          <TableHead className="text-white font-bold">Request No.</TableHead>
          <TableHead className="text-white font-bold">Resident Name</TableHead>
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
            <TableCell>{request.residentName}</TableCell>
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
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewingRequest(request)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
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
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDenyingRequest(request)}
                    >
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
              No requests found
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
        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <Label className="text-sm">Search:</Label>
          <div className="relative w-80">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by request no., name, doc type, purpose..."
              className="pr-8"
            />
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className={`border-yellow-400 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'Pending' ? 'ring-2 ring-yellow-400' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'Pending' ? 'all' : 'Pending')}
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
          className={`border-blue-400 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'Processing' ? 'ring-2 ring-blue-400' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'Processing' ? 'all' : 'Processing')}
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
          className={`border-green-400 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'Ready for Pickup' ? 'ring-2 ring-green-400' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'Ready for Pickup' ? 'all' : 'Ready for Pickup')}
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
          className={`border-gray-400 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'Completed' ? 'ring-2 ring-gray-400' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'Completed' ? 'all' : 'Completed')}
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
      </div>

      {/* Requests Tabs by Document Type */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'certificates' | 'other')} className="space-y-4">
        <TabsList>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
          <TabsTrigger value="other">Other Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="certificates">
          <Card>
            <CardHeader>
              <CardTitle>
                Certificate Requests
                {statusFilter !== 'all' && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    - Showing {statusFilter} only
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {renderRequestTable(filteredRequests, false)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="other">
          <Card>
            <CardHeader>
              <CardTitle>
                Other Documents (Business Permit, etc.)
                {statusFilter !== 'all' && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    - Showing {statusFilter} only
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {renderRequestTable(filteredRequests, true)}
            </CardContent>
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
                  <Label className="text-xs text-gray-500">Resident Name</Label>
                  <p className="font-semibold">{viewingRequest.residentName}</p>
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
                  <Label className="text-xs text-gray-500">Contact Number</Label>
                  <p>{viewingRequest.contactNumber}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Email</Label>
                  <p>{viewingRequest.email || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Date Requested</Label>
                  <p>{new Date(viewingRequest.dateRequested).toLocaleDateString()}</p>
                </div>
                {viewingRequest.dateCompleted && (
                  <div>
                    <Label className="text-xs text-gray-500">Date {viewingRequest.status === 'Rejected' ? 'Rejected' : 'Completed'}</Label>
                    <p>{new Date(viewingRequest.dateCompleted).toLocaleDateString()}</p>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-gray-500">Status</Label>
                  <Badge className={getStatusColor(viewingRequest.status)}>
                    {viewingRequest.status}
                  </Badge>
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
      <Dialog open={!!denyingRequest} onOpenChange={(open) => {
        if (!open) {
          setDenyingRequest(null);
          setDenyReason('');
        }
      }}>
        <DialogContent>
          {denyingRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Deny Request
                </DialogTitle>
                <DialogDescription>
                  Provide a reason for denying this request. The resident will be notified via Email/SMS.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-gray-500">Request Number</Label>
                  <p className="font-semibold">{denyingRequest.requestNo}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Resident Name</Label>
                  <p className="font-semibold">{denyingRequest.residentName}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Document Type</Label>
                  <p className="font-semibold">{denyingRequest.documentType}</p>
                </div>
                <div>
                  <Label htmlFor="denyReason">Reason for Denial *</Label>
                  <Textarea
                    id="denyReason"
                    value={denyReason}
                    onChange={(e) => setDenyReason(e.target.value)}
                    placeholder="Enter the reason for denying this request..."
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDenyingRequest(null);
                    setDenyReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDenyRequest}
                >
                  Deny Request
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Appointment Dialog for Other Documents */}
      <Dialog open={!!appointmentRequest} onOpenChange={(open) => {
        if (!open) {
          setAppointmentRequest(null);
          setAppointmentDetails({
            date: '',
            time: '',
            requirements: '',
            additionalNotes: ''
          });
        }
      }}>
        <DialogContent className="max-w-2xl">
          {appointmentRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  Schedule Appointment
                </DialogTitle>
                <DialogDescription>
                  Set appointment details for the resident to visit the barangay. A notification will be sent via Email/SMS.
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
                    <Label className="text-xs text-gray-500">Resident Name</Label>
                    <p className="font-semibold">{appointmentRequest.residentName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Contact</Label>
                    <p className="text-sm">{appointmentRequest.contactNumber}</p>
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
                    placeholder="e.g., Valid ID, Proof of Residency, 2x2 ID Picture, etc."
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
                    placeholder="Any additional instructions or information for the resident..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    📧 The resident will receive a notification with the appointment details via Email ({appointmentRequest.email}) and SMS ({appointmentRequest.contactNumber}).
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAppointmentRequest(null);
                    setAppointmentDetails({
                      date: '',
                      time: '',
                      requirements: '',
                      additionalNotes: ''
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleSendAppointment}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Appointment
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}