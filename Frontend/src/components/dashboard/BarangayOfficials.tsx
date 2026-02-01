import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Trash2, Edit, User, Search, Upload } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Official {
  id: string;
  officialNo: string;
  profileImage?: string;
  name: string;
  position: string;
  contactNumber: string;
  email: string;
  termStart: string;
  termEnd: string;
  status: 'Active' | 'Inactive';
}

export function BarangayOfficials() {
  const [officials, setOfficials] = useState<Official[]>([
    {
      id: '1',
      officialNo: 'OFF-2025-001',
      name: 'Captain Maria Santos',
      position: 'Barangay Captain',
      contactNumber: '09171234567',
      email: 'maria.santos@barangay.gov.ph',
      termStart: '2023-07-01',
      termEnd: '2026-06-30',
      status: 'Active'
    },
    {
      id: '2',
      officialNo: 'OFF-2025-002',
      name: 'Juan Dela Cruz',
      position: 'Kagawad',
      contactNumber: '09187654321',
      email: 'juan.delacruz@barangay.gov.ph',
      termStart: '2023-07-01',
      termEnd: '2026-06-30',
      status: 'Active'
    },
    {
      id: '3',
      officialNo: 'OFF-2025-003',
      name: 'Ana Reyes',
      position: 'Kagawad',
      contactNumber: '09191234567',
      email: 'ana.reyes@barangay.gov.ph',
      termStart: '2023-07-01',
      termEnd: '2026-06-30',
      status: 'Active'
    },
    {
      id: '4',
      officialNo: 'OFF-2025-004',
      name: 'Pedro Garcia',
      position: 'SK Chairman',
      contactNumber: '09201234567',
      email: 'pedro.garcia@barangay.gov.ph',
      termStart: '2023-07-01',
      termEnd: '2026-06-30',
      status: 'Active'
    },
    {
      id: '5',
      officialNo: 'OFF-2025-005',
      name: 'Rosa Martinez',
      position: 'Secretary',
      contactNumber: '09211234567',
      email: 'rosa.martinez@barangay.gov.ph',
      termStart: '2023-07-01',
      termEnd: '2026-06-30',
      status: 'Active'
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [profileImagePreview, setProfileImagePreview] = useState<string>('');
  const [formData, setFormData] = useState({
    profileImage: '',
    name: '',
    position: 'Kagawad',
    contactNumber: '',
    email: '',
    termStart: '',
    termEnd: '',
    status: 'Active' as 'Active' | 'Inactive'
  });

  const resetForm = () => {
    setFormData({
      profileImage: '',
      name: '',
      position: 'Kagawad',
      contactNumber: '',
      email: '',
      termStart: '',
      termEnd: '',
      status: 'Active'
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

  const handleAddOfficial = () => {
    if (!formData.name || !formData.contactNumber) {
      toast.error('Please fill in required fields');
      return;
    }

    const newOfficial: Official = {
      id: Date.now().toString(),
      officialNo: `OFF-2025-${String(officials.length + 1).padStart(3, '0')}`,
      profileImage: formData.profileImage || undefined,
      name: formData.name,
      position: formData.position,
      contactNumber: formData.contactNumber,
      email: formData.email,
      termStart: formData.termStart,
      termEnd: formData.termEnd,
      status: formData.status
    };

    setOfficials([newOfficial, ...officials]);
    setIsDialogOpen(false);
    resetForm();
    
    // Show confirmation toast
    toast.success('Barangay official successfully added!', {
      description: `${newOfficial.name} has been registered as ${newOfficial.position}.`
    });
  };

  const handleInactivate = (id: string) => {
    const official = officials.find(o => o.id === id);
    if (official) {
      setOfficials(officials.map(o => 
        o.id === id ? { ...o, status: 'Inactive' as const } : o
      ));
      toast.success('Official record inactivated', {
        description: `${official.name}'s record has been marked as inactive.`
      });
    }
  };

  const handleReactivate = (id: string) => {
    const official = officials.find(o => o.id === id);
    if (official) {
      setOfficials(officials.map(o => 
        o.id === id ? { ...o, status: 'Active' as const } : o
      ));
      toast.success('Official record reactivated', {
        description: `${official.name}'s record has been reactivated.`
      });
    }
  };

  const filteredOfficials = officials.filter(official =>
    official.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    official.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
    official.officialNo.includes(searchTerm)
  );

  return (
    <div className="p-12 space-y-12 bg-gray-50 min-h-full max-w-[1920px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-6xl font-bold text-gray-900">Barangay Officials ({officials.length})</h1>
          <p className="text-gray-600 mt-4 text-2xl">Manage barangay officials and positions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#2957a1] hover:bg-[#1e3f7a] text-white">
              ADD NEW OFFICIAL
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Official</DialogTitle>
            </DialogHeader>
            <DialogDescription>
              Add a new barangay official to the system.
            </DialogDescription>
            <div className="space-y-4 py-4">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position *</Label>
                  <Select
                    value={formData.position}
                    onValueChange={(value) => setFormData({ ...formData, position: value })}
                  >
                    <SelectTrigger id="position">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Barangay Captain">Barangay Captain</SelectItem>
                      <SelectItem value="Kagawad">Kagawad</SelectItem>
                      <SelectItem value="SK Chairman">SK Chairman</SelectItem>
                      <SelectItem value="Secretary">Secretary</SelectItem>
                      <SelectItem value="Treasurer">Treasurer</SelectItem>
                    </SelectContent>
                  </Select>
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

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="termStart">Term Start</Label>
                  <Input
                    id="termStart"
                    type="date"
                    value={formData.termStart}
                    onChange={(e) => setFormData({ ...formData, termStart: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="termEnd">Term End</Label>
                  <Input
                    id="termEnd"
                    type="date"
                    value={formData.termEnd}
                    onChange={(e) => setFormData({ ...formData, termEnd: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as 'Active' | 'Inactive' })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddOfficial} className="bg-[#2957a1] hover:bg-[#1e3f7a]">
                Add Official
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Officials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOfficials.map((official) => (
          <Card key={official.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 bg-[#2957a1] rounded-full flex items-center justify-center overflow-hidden">
                  {official.profileImage ? (
                    <img src={official.profileImage} alt={official.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-white" />
                  )}
                </div>
                <div className="flex gap-2">
                  {official.status === 'Active' ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-3 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        >
                          Inactivate
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Inactivate Official?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to inactivate {official.name}'s record? 
                            This will mark the official as inactive but the data will be preserved.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleInactivate(official.id)}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            Inactivate
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleReactivate(official.id)}
                      className="h-8 px-3 text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      Reactivate
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-lg text-gray-900">{official.name}</h3>
                <p className="text-sm font-semibold text-[#2957a1]">{official.position}</p>
                <p className="text-xs text-gray-500">{official.officialNo}</p>
                <div className="pt-2 space-y-1">
                  <p className="text-xs text-gray-600">📞 {official.contactNumber}</p>
                  {official.email && <p className="text-xs text-gray-600">📧 {official.email}</p>}
                  <p className="text-xs text-gray-600">
                    📅 {new Date(official.termStart).toLocaleDateString()} - {new Date(official.termEnd).toLocaleDateString()}
                  </p>
                </div>
                <div className="pt-2">
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    official.status === 'Active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {official.status}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredOfficials.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No officials found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}