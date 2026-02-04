import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Search, Eye, Upload, User } from 'lucide-react';
import { toast } from 'sonner';
import { formatId } from '../../utils/formatId';

// Interface remains same
interface Resident {
  id: string;
  residentNo: string;
  profileImage?: string;
  firstName: string;
  middleName: string;
  lastName: string;
  age: number;
  birthday: string;
  gender: 'Male' | 'Female';
  civilStatus: string;
  residentType: string;
  voterStatus: 'Yes' | 'No';
  houseNo: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  country: string;
  contactNumber: string;
  email: string;
  fatherName: string;
  motherName: string;
  spouseName?: string;
  numberOfChildren?: number;
  emergencyContactName: string;
  emergencyContactNumber: string;
  emergencyContactAddress: string;
  dateRegistered: string;
  status: 'Active' | 'Inactive';
}

export function ResidentRecords() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [viewingResident, setViewingResident] = useState<Resident | null>(null);
  const [showDataPrivacyDialog, setShowDataPrivacyDialog] = useState(false);
  const [pendingResident, setPendingResident] = useState<Resident | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>('');
  
  const [formData, setFormData] = useState({
    profileImage: '', firstName: '', middleName: '', lastName: '',
    age: '', birthday: '', gender: 'Male' as 'Male' | 'Female',
    civilStatus: 'Single', residentType: 'Resident', voterStatus: 'No' as 'Yes' | 'No',
    houseNo: '', streetAddress: '', city: 'Caloocan City', postalCode: '1400',
    country: 'Philippines', contactNumber: '', email: '', fatherName: '',
    motherName: '', spouseName: '', numberOfChildren: '',
    emergencyContactName: '', emergencyContactNumber: '', emergencyContactAddress: ''
  });

  // FETCH & MAP DATA
  const loadResidents = async () => {
    try {
      const response = await fetch("http://localhost:5001/residents");
      if (response.ok) {
        const data = await response.json();
        // Mapping PascalCase DB columns to camelCase UI properties
        const mappedData = data.map((r: any) => ({
          id: r.ResidentID,
          residentNo: r.ResidentID,
          firstName: r.FirstName,
          middleName: r.MiddleName,
          lastName: r.LastName,
          age: r.Age,
          birthday: r.Birthday,
          gender: r.Gender,
          civilStatus: r.CivilStatus,
          residentType: r.ResidentType,
          voterStatus: r.VoterStatus,
          houseNo: r.HouseNumber,
          streetAddress: r.StreetAddress,
          contactNumber: r.ContactNumber,
          email: r.Email,
          fatherName: r.FatherName,
          motherName: r.MotherName,
          spouseName: r.SpouseName,
          numberOfChildren: r.NoOfChildren,
          emergencyContactName: r.ContactPerson,
          emergencyContactNumber: r.ContactPersonNo,
          emergencyContactAddress: r.ContactPersonAddress,
          status: r.status,
          dateRegistered: r.dateRegistered
        }));
        setResidents(mappedData);
      }
    } catch (err) {
      toast.error("Could not connect to database server.");
    }
  };

  useEffect(() => { loadResidents(); }, []);

  const resetForm = () => {
    setFormData({
      profileImage: '', firstName: '', middleName: '', lastName: '', age: '', birthday: '', 
      gender: 'Male', civilStatus: 'Single', residentType: 'Resident', voterStatus: 'No',
      houseNo: '', streetAddress: '', city: 'Caloocan City', postalCode: '1400',
      country: 'Philippines', contactNumber: '', email: '', fatherName: '',
      motherName: '', spouseName: '', numberOfChildren: '',
      emergencyContactName: '', emergencyContactNumber: '', emergencyContactAddress: ''
    });
    setProfileImagePreview('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setProfileImagePreview(result);
        setFormData({ ...formData, profileImage: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveResident = () => {
    if (!formData.firstName || !formData.lastName || !formData.birthday || !formData.contactNumber) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newResident: Resident = {
      id: `RS2026${String(residents.length + 1).padStart(4, '0')}`,
      residentNo: `RS2026${String(residents.length + 1).padStart(4, '0')}`,
      profileImage: formData.profileImage || undefined,
      firstName: formData.firstName,
      middleName: formData.middleName,
      lastName: formData.lastName,
      age: parseInt(formData.age) || 0,
      birthday: formData.birthday,
      gender: formData.gender,
      civilStatus: formData.civilStatus,
      residentType: formData.residentType,
      voterStatus: formData.voterStatus,
      houseNo: formData.houseNo,
      streetAddress: formData.streetAddress,
      city: formData.city,
      postalCode: formData.postalCode,
      country: formData.country,
      contactNumber: formData.contactNumber,
      email: formData.email,
      fatherName: formData.fatherName,
      motherName: formData.motherName,
      spouseName: formData.spouseName || undefined,
      numberOfChildren: formData.numberOfChildren ? parseInt(formData.numberOfChildren) : undefined,
      emergencyContactName: formData.emergencyContactName,
      emergencyContactNumber: formData.emergencyContactNumber,
      emergencyContactAddress: formData.emergencyContactAddress,
      dateRegistered: new Date().toISOString().split('T')[0],
      status: 'Active'
    };

    setPendingResident(newResident);
    setIsAddDialogOpen(false);
    setShowDataPrivacyDialog(true);
  };

  const handleConfirmAddResident = async () => {
    if (pendingResident) {
      try {
        const response = await fetch("http://localhost:5001/residents/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pendingResident),
        });

        if (response.ok) {
          toast.success('Resident record successfully saved!');
          loadResidents();
          setShowDataPrivacyDialog(false);
          setPendingResident(null);
          resetForm();
        } else {
          toast.error('Database failed to save record.');
        }
      } catch (err) {
        toast.error('Could not reach backend server.');
      }
    }
  };

  const handleCancelDataPrivacy = () => {
    setShowDataPrivacyDialog(false);
    setPendingResident(null);
    resetForm();
  };

  const handleInactivate = async (id: string) => {
    try {
        const response = await fetch(`http://localhost:5001/residents/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Inactive' })
        });
        if (response.ok) {
            loadResidents();
            toast.success('Record updated to Inactive');
        }
    } catch (err) { toast.error("Update failed."); }
  };

  const handleReactivate = async (id: string) => {
    try {
        const response = await fetch(`http://localhost:5001/residents/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Active' })
        });
        if (response.ok) {
            loadResidents();
            toast.success('Record reactivated');
        }
    } catch (err) { toast.error("Reactivation failed."); }
  };

  const filteredResidents = residents.filter(resident =>
    resident.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resident.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resident.residentNo.includes(searchTerm)
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resident Records ({residents.filter(r => r.status === 'Active').length})</h1>
          <p className="text-gray-600 mt-1">Manage all registered residents</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsAddDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button className="bg-[#2957a1] hover:bg-[#1e3f7a] text-white">ADD NEW RESIDENT</Button>
          </DialogTrigger>
          <DialogContent className="max-w-[1200px] w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">Add New Resident</DialogTitle>
              <DialogDescription>Fill in the resident's information to register them in the system.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="flex justify-center">
                <div className="space-y-2 text-center">
                  <div className="w-32 h-32 mx-auto rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-[#2957a1]">
                    {profileImagePreview ? <img src={profileImagePreview} alt="Profile" className="w-full h-full object-cover" /> : <User className="w-16 h-16 text-gray-400" />}
                  </div>
                  <Label htmlFor="profileImage" className="cursor-pointer">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#2957a1] text-white rounded-md hover:bg-[#1e3f7a] transition-colors">
                      <Upload className="w-4 h-4" /> <span className="text-sm">Upload Profile Picture</span>
                    </div>
                    <Input id="profileImage" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </Label>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#2957a1] border-b pb-2">Personal Information</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>First Name *</Label><Input value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="Enter first name" /></div>
                  <div className="space-y-2"><Label>Middle Name</Label><Input value={formData.middleName} onChange={(e) => setFormData({ ...formData, middleName: e.target.value })} placeholder="Enter middle name" /></div>
                  <div className="space-y-2"><Label>Last Name *</Label><Input value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="Enter last name" /></div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2"><Label>Age</Label><Input type="number" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} placeholder="Age" /></div>
                  <div className="space-y-2"><Label>Gender</Label><Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v as any })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Civil Status</Label><Select value={formData.civilStatus} onValueChange={(v) => setFormData({ ...formData, civilStatus: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Single">Single</SelectItem><SelectItem value="Married">Married</SelectItem><SelectItem value="Widowed">Widowed</SelectItem><SelectItem value="Separated">Separated</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Birthday *</Label><Input type="date" value={formData.birthday} onChange={(e) => setFormData({ ...formData, birthday: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Resident Type</Label><Select value={formData.residentType} onValueChange={(v) => setFormData({ ...formData, residentType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Resident">Resident</SelectItem><SelectItem value="Student">Student</SelectItem><SelectItem value="Senior Citizen">Senior Citizen</SelectItem><SelectItem value="PWD">PWD</SelectItem><SelectItem value="Indigenous">Indigenous</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Voter Status</Label><Select value={formData.voterStatus} onValueChange={(v) => setFormData({ ...formData, voterStatus: v as any })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent></Select></div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#2957a1] border-b pb-2">Address & Contact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>House No.</Label><Input value={formData.houseNo} onChange={(e) => setFormData({ ...formData, houseNo: e.target.value })} placeholder="House number" /></div>
                  <div className="space-y-2"><Label>Street Address</Label><Input value={formData.streetAddress} onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })} placeholder="Street address" /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>City</Label><Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Postal Code</Label><Input value={formData.postalCode} onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Country</Label><Input value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Contact Number *</Label><Input value={formData.contactNumber} onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })} placeholder="09XX XXX XXXX" /></div>
                  <div className="space-y-2"><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" /></div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#2957a1] border-b pb-2">Family Background</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Father's Name</Label><Input value={formData.fatherName} onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })} placeholder="Father's full name" /></div>
                  <div className="space-y-2"><Label>Mother's Name</Label><Input value={formData.motherName} onChange={(e) => setFormData({ ...formData, motherName: e.target.value })} placeholder="Mother's full name" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Spouse's Name</Label><Input value={formData.spouseName} onChange={(e) => setFormData({ ...formData, spouseName: e.target.value })} placeholder="Spouse's full name" /></div>
                  <div className="space-y-2"><Label>No. of Children</Label><Input type="number" value={formData.numberOfChildren} onChange={(e) => setFormData({ ...formData, numberOfChildren: e.target.value })} placeholder="0" /></div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#2957a1] border-b pb-2">Person to Contact in Case of Emergency</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Name</Label><Input value={formData.emergencyContactName} onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })} placeholder="Emergency contact name" /></div>
                  <div className="space-y-2"><Label>Contact No.</Label><Input value={formData.emergencyContactNumber} onChange={(e) => setFormData({ ...formData, emergencyContactNumber: e.target.value })} placeholder="09XX XXX XXXX" /></div>
                </div>
                <div className="space-y-2"><Label>Address</Label><Input value={formData.emergencyContactAddress} onChange={(e) => setFormData({ ...formData, emergencyContactAddress: e.target.value })} placeholder="Emergency contact address" /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveResident} className="bg-[#2957a1] hover:bg-[#1e3f7a]">Save Resident</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border border-gray-300 shadow-sm">
        <CardContent className="p-4">
          <div className="p-4 flex justify-end items-center gap-2 border-b bg-gray-50 -m-4 mb-4">
            <Label className="font-semibold text-sm">Search:</Label>
            <div className="relative w-48">
              <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="pr-8 h-9" />
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>
          <Table>
            <TableHeader className="bg-[#2957a1]">
              <TableRow className="hover:bg-[#2957a1] border-b-0">
                <TableHead className="text-white font-bold text-xs h-10">RESIDENT NO.</TableHead>
                <TableHead className="text-white font-bold text-xs h-10">FIRST NAME</TableHead>
                <TableHead className="text-white font-bold text-xs h-10">MIDDLE NAME</TableHead>
                <TableHead className="text-white font-bold text-xs h-10">LAST NAME</TableHead>
                <TableHead className="text-white font-bold text-xs h-10">RESIDENT TYPE</TableHead>
                <TableHead className="text-white font-bold text-xs h-10">GENDER</TableHead>
                <TableHead className="text-white font-bold text-xs h-10">VOTER STATUS</TableHead>
                <TableHead className="text-white font-bold text-xs h-10">STATUS</TableHead>
                <TableHead className="text-white font-bold text-xs h-10">ACTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResidents.map((resident, index) => (
                <TableRow key={resident.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                  <TableCell className="font-medium text-xs py-3">{formatId(resident.residentNo)}</TableCell>
                  <TableCell className="text-xs py-3">{resident.firstName}</TableCell>
                  <TableCell className="text-xs py-3">{resident.middleName}</TableCell>
                  <TableCell className="text-xs py-3">{resident.lastName}</TableCell>
                  <TableCell className="text-xs py-3">{resident.residentType}</TableCell>
                  <TableCell className="text-xs py-3">{resident.gender}</TableCell>
                  <TableCell className="text-xs py-3">{resident.voterStatus}</TableCell>
                  <TableCell className="text-xs py-3"><span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${resident.status === 'Active' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-gray-100 text-gray-700 border border-gray-300'}`}>{resident.status}</span></TableCell>
                  <TableCell className="py-3"><div className="flex items-center gap-1"><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setViewingResident(resident)}><Eye className="w-3.5 h-3.5 text-blue-600" /></Button>{resident.status === 'Active' ? <AlertDialog><AlertDialogTrigger asChild><Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] h-7 px-2">INACTIVATE</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Inactivate?</AlertDialogTitle><AlertDialogDescription>Mark {resident.firstName} {resident.lastName} as inactive?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleInactivate(resident.residentNo)} className="bg-orange-600">Inactivate</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog> : <Button size="sm" onClick={() => handleReactivate(resident.residentNo)} className="bg-green-500 hover:bg-green-600 text-white text-[10px] h-7 px-2">REACTIVATE</Button>}</div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={showDataPrivacyDialog} onOpenChange={setShowDataPrivacyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Data Privacy Agreement</AlertDialogTitle>
            <AlertDialogDescription>Agree to process information for management purposes?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDataPrivacy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAddResident}>Agree and Add Resident</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}