import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Info, Search, ChevronLeft, ChevronRight, UserX, Eye, Upload, User } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';
import { formatId } from '../../utils/formatId';

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
  // Address
  houseNo: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  country: string;
  // Contact
  contactNumber: string;
  email: string;
  // Family
  fatherName: string;
  motherName: string;
  spouseName?: string;
  numberOfChildren?: number;
  // Emergency Contact
  emergencyContactName: string;
  emergencyContactNumber: string;
  emergencyContactAddress: string;
  dateRegistered: string;
  status: 'Active' | 'Inactive';
}

export function ResidentRecords() {
  const [residents, setResidents] = useState<Resident[]>([
    {
      id: '1',
      residentNo: 'RS20260002',
      firstName: 'Gabriel',
      middleName: 'Siang',
      lastName: 'Chua',
      age: 22,
      birthday: '2002-03-15',
      gender: 'Female',
      civilStatus: 'Single',
      residentType: 'Student',
      voterStatus: 'Yes',
      houseNo: '123',
      streetAddress: 'Main Street',
      city: 'Caloocan City',
      postalCode: '1400',
      country: 'Philippines',
      contactNumber: '09171234567',
      email: 'gabriel.chua@email.com',
      fatherName: 'Roberto Chua',
      motherName: 'Linda Chua',
      emergencyContactName: 'Roberto Chua',
      emergencyContactNumber: '09181234567',
      emergencyContactAddress: '123 Main Street, Caloocan City',
      dateRegistered: '2025-01-15',
      status: 'Active'
    },
    {
      id: '2',
      residentNo: 'RS20260003',
      firstName: 'Robert',
      middleName: 'Wey',
      lastName: 'Poresa',
      age: 68,
      birthday: '1956-11-20',
      gender: 'Male',
      civilStatus: 'Married',
      residentType: 'Senior Citizen',
      voterStatus: 'Yes',
      houseNo: '456',
      streetAddress: 'Second Avenue',
      city: 'Caloocan City',
      postalCode: '1400',
      country: 'Philippines',
      contactNumber: '09187654321',
      email: 'robert.poresa@email.com',
      fatherName: 'Juan Poresa',
      motherName: 'Maria Poresa',
      spouseName: 'Elena Poresa',
      numberOfChildren: 3,
      emergencyContactName: 'Elena Poresa',
      emergencyContactNumber: '09197654321',
      emergencyContactAddress: '456 Second Avenue, Caloocan City',
      dateRegistered: '2025-01-14',
      status: 'Active'
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [viewingResident, setViewingResident] = useState<Resident | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDataPrivacyDialog, setShowDataPrivacyDialog] = useState(false);
  const [pendingResident, setPendingResident] = useState<Resident | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>('');
  const [formData, setFormData] = useState({
    profileImage: '',
    firstName: '',
    middleName: '',
    lastName: '',
    age: '',
    birthday: '',
    gender: 'Male' as 'Male' | 'Female',
    civilStatus: 'Single',
    residentType: 'Resident',
    voterStatus: 'No' as 'Yes' | 'No',
    houseNo: '',
    streetAddress: '',
    city: 'Caloocan City',
    postalCode: '1400',
    country: 'Philippines',
    contactNumber: '',
    email: '',
    fatherName: '',
    motherName: '',
    spouseName: '',
    numberOfChildren: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    emergencyContactAddress: ''
  });

  const resetForm = () => {
    setFormData({
      profileImage: '',
      firstName: '',
      middleName: '',
      lastName: '',
      age: '',
      birthday: '',
      gender: 'Male',
      civilStatus: 'Single',
      residentType: 'Resident',
      voterStatus: 'No',
      houseNo: '',
      streetAddress: '',
      city: 'Caloocan City',
      postalCode: '1400',
      country: 'Philippines',
      contactNumber: '',
      email: '',
      fatherName: '',
      motherName: '',
      spouseName: '',
      numberOfChildren: '',
      emergencyContactName: '',
      emergencyContactNumber: '',
      emergencyContactAddress: ''
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
      id: Date.now().toString(),
      residentNo: `RS2026${String(residents.length + 4).padStart(4, '0')}`,
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

  const handleConfirmAddResident = () => {
    if (pendingResident) {
      setResidents([pendingResident, ...residents]);
      toast.success('Resident record successfully added!', {
        description: `${pendingResident.firstName} ${pendingResident.lastName} has been registered.`
      });
      setShowDataPrivacyDialog(false);
      setPendingResident(null);
      resetForm();
    }
  };

  const handleCancelDataPrivacy = () => {
    setShowDataPrivacyDialog(false);
    setPendingResident(null);
    resetForm();
  };

  const handleInactivate = (id: string) => {
    const resident = residents.find(r => r.id === id);
    if (resident) {
      setResidents(residents.map(r => 
        r.id === id ? { ...r, status: 'Inactive' as const } : r
      ));
      toast.success('Resident record inactivated', {
        description: `${resident.firstName} ${resident.lastName}'s record has been marked as inactive.`
      });
    }
  };

  const handleReactivate = (id: string) => {
    const resident = residents.find(r => r.id === id);
    if (resident) {
      setResidents(residents.map(r => 
        r.id === id ? { ...r, status: 'Active' as const } : r
      ));
      toast.success('Resident record reactivated', {
        description: `${resident.firstName} ${resident.lastName}'s record has been reactivated.`
      });
    }
  };

  const filteredResidents = residents.filter(resident =>
    resident.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resident.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resident.residentNo.includes(searchTerm)
  );

  const totalPages = 22; // Mock data for pagination

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resident Records ({residents.filter(r => r.status === 'Active').length})</h1>
          <p className="text-gray-600 mt-1">Manage all registered residents</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          if (!open) {
            resetForm();
          }
          setIsAddDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#2957a1] hover:bg-[#1e3f7a] text-white">
              ADD NEW RESIDENT
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[1200px] w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">Add New Resident</DialogTitle>
              <DialogDescription>
                Fill in the resident's information to register them in the system.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Profile Image Upload */}
              <div className="flex justify-center">
                <div className="space-y-2 text-center">
                  <div className="w-32 h-32 mx-auto rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-[#2957a1]">
                    {profileImagePreview ? (
                      <img src={profileImagePreview} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-16 h-16 text-gray-400" />
                    )}
                  </div>
                  <Label htmlFor="profileImage" className="cursor-pointer">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#2957a1] text-white rounded-md hover:bg-[#1e3f7a] transition-colors">
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">Upload Profile Picture</span>
                    </div>
                    <Input
                      id="profileImage"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </Label>
                </div>
              </div>

              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#2957a1] border-b pb-2">Personal Information</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="middleName">Middle Name</Label>
                    <Input
                      id="middleName"
                      value={formData.middleName}
                      onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                      placeholder="Enter middle name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      placeholder="Age"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => setFormData({ ...formData, gender: value as 'Male' | 'Female' })}
                    >
                      <SelectTrigger id="gender">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="civilStatus">Civil Status</Label>
                    <Select
                      value={formData.civilStatus}
                      onValueChange={(value) => setFormData({ ...formData, civilStatus: value })}
                    >
                      <SelectTrigger id="civilStatus">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Single">Single</SelectItem>
                        <SelectItem value="Married">Married</SelectItem>
                        <SelectItem value="Widowed">Widowed</SelectItem>
                        <SelectItem value="Separated">Separated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birthday">Birthday *</Label>
                    <Input
                      id="birthday"
                      type="date"
                      value={formData.birthday}
                      onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="residentType">Resident Type</Label>
                    <Select
                      value={formData.residentType}
                      onValueChange={(value) => setFormData({ ...formData, residentType: value })}
                    >
                      <SelectTrigger id="residentType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Resident">Resident</SelectItem>
                        <SelectItem value="Student">Student</SelectItem>
                        <SelectItem value="Senior Citizen">Senior Citizen</SelectItem>
                        <SelectItem value="PWD">PWD</SelectItem>
                        <SelectItem value="Indigenous">Indigenous</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="voterStatus">Voter Status</Label>
                    <Select
                      value={formData.voterStatus}
                      onValueChange={(value) => setFormData({ ...formData, voterStatus: value as 'Yes' | 'No' })}
                    >
                      <SelectTrigger id="voterStatus">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Address & Contact */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#2957a1] border-b pb-2">Address & Contact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="houseNo">House No.</Label>
                    <Input
                      id="houseNo"
                      value={formData.houseNo}
                      onChange={(e) => setFormData({ ...formData, houseNo: e.target.value })}
                      placeholder="House number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="streetAddress">Street Address</Label>
                    <Input
                      id="streetAddress"
                      value={formData.streetAddress}
                      onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                      placeholder="Street address"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactNumber">Contact Number *</Label>
                    <Input
                      id="contactNumber"
                      value={formData.contactNumber}
                      onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                      placeholder="09XX XXX XXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Family Background */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#2957a1] border-b pb-2">Family Background</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fatherName">Father's Name</Label>
                    <Input
                      id="fatherName"
                      value={formData.fatherName}
                      onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                      placeholder="Father's full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="motherName">Mother's Name</Label>
                    <Input
                      id="motherName"
                      value={formData.motherName}
                      onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                      placeholder="Mother's full name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="spouseName">Spouse's Name</Label>
                    <Input
                      id="spouseName"
                      value={formData.spouseName}
                      onChange={(e) => setFormData({ ...formData, spouseName: e.target.value })}
                      placeholder="Spouse's full name (if married)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numberOfChildren">No. of Children</Label>
                    <Input
                      id="numberOfChildren"
                      type="number"
                      value={formData.numberOfChildren}
                      onChange={(e) => setFormData({ ...formData, numberOfChildren: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#2957a1] border-b pb-2">Person to Contact in Case of Emergency</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactName">Name</Label>
                    <Input
                      id="emergencyContactName"
                      value={formData.emergencyContactName}
                      onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                      placeholder="Emergency contact name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactNumber">Contact No.</Label>
                    <Input
                      id="emergencyContactNumber"
                      value={formData.emergencyContactNumber}
                      onChange={(e) => setFormData({ ...formData, emergencyContactNumber: e.target.value })}
                      placeholder="09XX XXX XXXX"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContactAddress">Address</Label>
                  <Input
                    id="emergencyContactAddress"
                    value={formData.emergencyContactAddress}
                    onChange={(e) => setFormData({ ...formData, emergencyContactAddress: e.target.value })}
                    placeholder="Emergency contact address"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveResident} className="bg-[#2957a1] hover:bg-[#1e3f7a]">
                Save Resident
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table Card */}
      <Card className="border border-gray-300 shadow-sm">
        <CardContent className="p-4">
          {/* Search */}
          <div className="p-4 flex justify-end items-center gap-2 border-b bg-gray-50 -m-4 mb-4">
            <Label className="font-semibold text-sm">Search:</Label>
            <div className="relative w-48">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search residents..."
                className="pr-8 h-9"
              />
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* Table */}
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
                <TableRow 
                  key={resident.id} 
                  className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                >
                  <TableCell className="font-medium text-xs py-3">{formatId(resident.residentNo)}</TableCell>
                  <TableCell className="text-xs py-3">{resident.firstName}</TableCell>
                  <TableCell className="text-xs py-3">{resident.middleName}</TableCell>
                  <TableCell className="text-xs py-3">{resident.lastName}</TableCell>
                  <TableCell className="text-xs py-3">{resident.residentType}</TableCell>
                  <TableCell className="text-xs py-3">{resident.gender}</TableCell>
                  <TableCell className="text-xs py-3">{resident.voterStatus}</TableCell>
                  <TableCell className="text-xs py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      resident.status === 'Active' 
                        ? 'bg-green-100 text-green-700 border border-green-300' 
                        : 'bg-gray-100 text-gray-700 border border-gray-300'
                    }`}>
                      {resident.status}
                    </span>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0"
                        onClick={() => setViewingResident(resident)}
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                      </Button>
                      {resident.status === 'Active' ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              size="sm" 
                              className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] h-7 px-2"
                            >
                              INACTIVATE
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Inactivate Resident?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to inactivate {resident.firstName} {resident.lastName}'s record? 
                                This will mark the resident as inactive but the data will be preserved.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleInactivate(resident.id)}
                                className="bg-orange-600 hover:bg-orange-700"
                              >
                                Inactivate
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <Button 
                          size="sm" 
                          onClick={() => handleReactivate(resident.id)}
                          className="bg-green-500 hover:bg-green-600 text-white text-[10px] h-7 px-2"
                        >
                          REACTIVATE
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="p-3 flex justify-end items-center gap-2 border-t bg-gray-50">
            <Button 
              variant="ghost" 
              size="sm" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="text-xs h-7 px-3"
            >
              <ChevronLeft className="w-3 h-3 mr-1" />
              Previous
            </Button>
            <Button 
              size="sm" 
              className="bg-black text-white hover:bg-gray-800 h-7 w-7 p-0 text-xs"
            >
              {currentPage}
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="h-7 w-7 p-0 text-xs"
            >
              {totalPages}
            </Button>
            <Button 
              size="sm" 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="bg-gray-300 hover:bg-gray-400 text-black text-xs h-7 px-3"
            >
              Next
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* View Resident Dialog */}
      <Dialog open={!!viewingResident} onOpenChange={(open) => !open && setViewingResident(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {viewingResident && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">Resident Information</DialogTitle>
                <DialogDescription>
                  Detailed information for {viewingResident.firstName} {viewingResident.lastName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {/* Personal Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-[#2957a1] mb-3">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium">Resident No:</span> {formatId(viewingResident.residentNo)}</div>
                    <div><span className="font-medium">Status:</span> <span className={viewingResident.status === 'Active' ? 'text-green-600' : 'text-gray-600'}>{viewingResident.status}</span></div>
                    <div><span className="font-medium">Full Name:</span> {viewingResident.firstName} {viewingResident.middleName} {viewingResident.lastName}</div>
                    <div><span className="font-medium">Birthday:</span> {new Date(viewingResident.birthday).toLocaleDateString()}</div>
                    <div><span className="font-medium">Age:</span> {viewingResident.age}</div>
                    <div><span className="font-medium">Gender:</span> {viewingResident.gender}</div>
                    <div><span className="font-medium">Civil Status:</span> {viewingResident.civilStatus}</div>
                    <div><span className="font-medium">Resident Type:</span> {viewingResident.residentType}</div>
                    <div><span className="font-medium">Voter:</span> {viewingResident.voterStatus}</div>
                  </div>
                </div>

                {/* Address & Contact */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-[#2957a1] mb-3">Address & Contact</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium">House No:</span> {viewingResident.houseNo}</div>
                    <div><span className="font-medium">Street:</span> {viewingResident.streetAddress}</div>
                    <div><span className="font-medium">City:</span> {viewingResident.city}</div>
                    <div><span className="font-medium">Postal Code:</span> {viewingResident.postalCode}</div>
                    <div><span className="font-medium">Country:</span> {viewingResident.country}</div>
                    <div><span className="font-medium">Contact:</span> {viewingResident.contactNumber}</div>
                    <div className="col-span-2"><span className="font-medium">Email:</span> {viewingResident.email}</div>
                  </div>
                </div>

                {/* Family Background */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-[#2957a1] mb-3">Family Background</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium">Father's Name:</span> {viewingResident.fatherName}</div>
                    <div><span className="font-medium">Mother's Name:</span> {viewingResident.motherName}</div>
                    {viewingResident.spouseName && <div><span className="font-medium">Spouse's Name:</span> {viewingResident.spouseName}</div>}
                    {viewingResident.numberOfChildren && <div><span className="font-medium">No. of Children:</span> {viewingResident.numberOfChildren}</div>}
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-[#2957a1] mb-3">Emergency Contact</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium">Name:</span> {viewingResident.emergencyContactName}</div>
                    <div><span className="font-medium">Contact:</span> {viewingResident.emergencyContactNumber}</div>
                    <div className="col-span-2"><span className="font-medium">Address:</span> {viewingResident.emergencyContactAddress}</div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 border-t pt-3">
                  Date Registered: {new Date(viewingResident.dateRegistered).toLocaleDateString()}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Data Privacy Dialog */}
      <AlertDialog open={showDataPrivacyDialog} onOpenChange={setShowDataPrivacyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Data Privacy Agreement</AlertDialogTitle>
            <AlertDialogDescription>
              I hereby authorize Barangay 160 to collect, use, and process my personal information for the purpose of 
              barangay records management, issuance of certifications, and delivery of barangay services. I understand 
              that my information will be kept confidential and will be protected in accordance with the Data Privacy Act of 2012.
            </AlertDialogDescription>
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