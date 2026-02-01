import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Edit, 
  Eye, 
  Archive, 
  Clock,
  User,
  Calendar,
  Send,
  ImageIcon,
  Upload
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Announcement {
  id: string;
  title: string;
  content: string;
  images: string[];
  targetAudience: string;
  dateCreated: string;
  datePosted?: string;
  postedBy: string;
  status: 'draft' | 'posted' | 'archived';
  tags: string[];
}

export function AnnouncementManagement() {
  // State for custom target audiences (can be saved to database)
  const [customTargetAudiences, setCustomTargetAudiences] = useState<string[]>([
    'Primary 4A',
    'Primary 4B',
    'Primary 5A',
    'Primary 5B',
    'SS1',
    'SS2',
    'SS3'
  ]);

  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: '1',
      title: 'Community Clean-Up Drive',
      content: 'All residents are invited to join our monthly community clean-up drive this Saturday, January 27, 2025, at 7:00 AM. Meeting point: Barangay Hall. Let\'s work together to keep our community clean and green!',
      images: ['https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400'],
      targetAudience: 'all',
      dateCreated: '2025-01-20T10:30:00',
      datePosted: '2025-01-20T11:00:00',
      postedBy: 'Admin Office',
      status: 'posted',
      tags: ['community', 'clean-up', 'drive']
    },
    {
      id: '2',
      title: 'Barangay Assembly Meeting',
      content: 'A mandatory barangay assembly will be held on January 30, 2025, at 3:00 PM at the Barangay Covered Court. Agenda includes budget presentation and community projects for 2025. All household representatives are required to attend.',
      targetAudience: 'all',
      dateCreated: '2025-01-18T14:20:00',
      datePosted: '2025-01-18T15:00:00',
      postedBy: 'Barangay Captain',
      status: 'posted',
      tags: ['assembly', 'budget', 'projects']
    },
    {
      id: '3',
      title: 'Free Medical Mission',
      content: 'Free medical and dental check-up for all residents on February 5, 2025, from 8:00 AM to 2:00 PM. Bring your barangay ID. Senior citizens and PWDs will be given priority.',
      images: ['https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400'],
      targetAudience: 'all',
      dateCreated: '2025-01-15T09:15:00',
      status: 'draft',
      postedBy: 'Maria Santos',
      tags: ['medical', 'dental', 'check-up']
    },
    {
      id: '4',
      title: 'Fiesta Celebration 2025',
      content: 'Save the date! Our annual barangay fiesta will be celebrated on March 15-17, 2025. Various activities including sports fest, cultural shows, and community dinner. More details to follow.',
      targetAudience: 'all',
      dateCreated: '2024-12-20T08:00:00',
      datePosted: '2024-12-20T09:00:00',
      postedBy: 'Events Committee',
      status: 'archived',
      tags: ['fiesta', 'sports', 'cultural', 'dinner']
    }
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [viewingAnnouncement, setViewingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    images: [] as string[],
    targetAudience: 'all' as Announcement['targetAudience'],
    tags: [] as string[]
  });
  const [newCustomAudience, setNewCustomAudience] = useState('');

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      images: [],
      targetAudience: 'all',
      tags: []
    });
    setEditingAnnouncement(null);
    setNewCustomAudience('');
  };

  const handleAddCustomAudience = () => {
    if (!newCustomAudience.trim()) {
      toast.error('Please enter a custom target audience');
      return;
    }
    
    // Check if already exists
    if (customTargetAudiences.includes(newCustomAudience.trim())) {
      toast.error('This target audience already exists');
      return;
    }
    
    // Add to custom audiences
    setCustomTargetAudiences([...customTargetAudiences, newCustomAudience.trim()]);
    setFormData({ ...formData, targetAudience: newCustomAudience.trim() });
    toast.success(`Added "${newCustomAudience.trim()}" to target audiences`);
    setNewCustomAudience('');
  };

  const handleCreateOrUpdate = (saveAsDraft: boolean = false) => {
    if (!formData.title || !formData.content) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newAnnouncement: Announcement = {
      id: editingAnnouncement?.id || Date.now().toString(),
      title: formData.title,
      content: formData.content,
      images: formData.images,
      targetAudience: formData.targetAudience,
      dateCreated: editingAnnouncement?.dateCreated || new Date().toISOString(),
      datePosted: saveAsDraft ? undefined : new Date().toISOString(),
      postedBy: 'John Adebayo',
      status: saveAsDraft ? 'draft' : 'posted',
      tags: formData.tags
    };

    if (editingAnnouncement) {
      setAnnouncements(announcements.map(a => 
        a.id === editingAnnouncement.id ? newAnnouncement : a
      ));
      toast.success('Announcement updated successfully');
    } else {
      setAnnouncements([newAnnouncement, ...announcements]);
      toast.success(saveAsDraft ? 'Announcement saved as draft' : 'Announcement posted successfully');
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      images: announcement.images,
      targetAudience: announcement.targetAudience,
      tags: announcement.tags
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setAnnouncements(announcements.filter(a => a.id !== id));
    toast.success('Announcement deleted successfully');
  };

  const handleArchive = (id: string) => {
    setAnnouncements(announcements.map(a =>
      a.id === id ? { ...a, status: 'archived' as const } : a
    ));
    toast.success('Announcement archived successfully');
  };

  const handlePublish = (id: string) => {
    setAnnouncements(announcements.map(a =>
      a.id === id ? { ...a, status: 'posted' as const, datePosted: new Date().toISOString() } : a
    ));
    toast.success('Announcement published successfully');
  };

  const postedAnnouncements = announcements.filter(a => a.status === 'posted');
  const draftAnnouncements = announcements.filter(a => a.status === 'draft');
  const archivedAnnouncements = announcements.filter(a => a.status === 'archived');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'important': return 'default';
      case 'normal': return 'secondary';
      default: return 'secondary';
    }
  };

  const getTargetAudienceBadge = (targetAudience: string) => {
    switch (targetAudience) {
      case 'all': return 'All';
      case 'students': return 'Students';
      case 'senior-citizens': return 'Senior Citizens';
      case 'pwd': return 'PWD';
      case 'events': return 'Events';
      case 'health': return 'Health';
      default: return targetAudience;
    }
  };

  const AnnouncementCard = ({ announcement }: { announcement: Announcement }) => (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="flex gap-4 p-4">
          {/* Image Thumbnail */}
          <div className="flex-shrink-0">
            {announcement.images && announcement.images.length > 0 ? (
              <div className="relative">
                <img
                  src={announcement.images[0]}
                  alt={announcement.title}
                  className="w-32 h-32 object-cover rounded-lg"
                />
                {announcement.images.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    +{announcement.images.length - 1}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 line-clamp-1">{announcement.title}</h3>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Badge variant="outline" className="text-xs">
                  {getTargetAudienceBadge(announcement.targetAudience)}
                </Badge>
              </div>
            </div>

            <p className="text-sm text-gray-600 line-clamp-2 mb-3">{announcement.content}</p>

            <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>Posted by: {announcement.postedBy}</span>
              </div>
              {announcement.datePosted && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(announcement.datePosted).toLocaleDateString()}</span>
                </div>
              )}
              {!announcement.datePosted && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Created: {new Date(announcement.dateCreated).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingAnnouncement(announcement)}
                className="gap-1"
              >
                <Eye className="w-3 h-3" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(announcement)}
                className="gap-1"
              >
                <Edit className="w-3 h-3" />
                Edit
              </Button>
              {announcement.status === 'draft' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handlePublish(announcement.id)}
                  className="gap-1"
                >
                  <Send className="w-3 h-3" />
                  Publish
                </Button>
              )}
              {announcement.status === 'posted' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleArchive(announcement.id)}
                  className="gap-1"
                >
                  <Archive className="w-3 h-3" />
                  Archive
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 text-red-600 hover:text-red-700">
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Announcement?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the announcement.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(announcement.id)} className="bg-red-600 hover:bg-red-700">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-12 space-y-12 bg-gray-50 min-h-full max-w-[1920px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-6xl font-bold text-gray-900 flex items-center gap-4">
            <Megaphone className="w-12 h-12" />
            Announcements
          </h1>
          <p className="text-gray-600 mt-4 text-2xl">Create and manage school announcements</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
              </DialogTitle>
              <DialogDescription>
                {editingAnnouncement ? 'Update the announcement details below.' : 'Fill in the details to create a new announcement for the community.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter announcement title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter announcement content"
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label>Images (Optional, Max 5)</Label>
                <div className="space-y-2">
                  {[0, 1, 2, 3, 4].map((index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={formData.images[index] || ''}
                        onChange={(e) => {
                          const newImages = [...formData.images];
                          if (e.target.value) {
                            newImages[index] = e.target.value;
                          } else {
                            newImages.splice(index, 1);
                          }
                          setFormData({ ...formData, images: newImages.filter(img => img) });
                        }}
                        placeholder={`Image ${index + 1} URL`}
                      />
                      {index === 0 && (
                        <Button variant="outline" size="icon" type="button">
                          <Upload className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {formData.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetAudience">Target Audience</Label>
                <Select
                  value={formData.targetAudience}
                  onValueChange={(value) => setFormData({ ...formData, targetAudience: value as Announcement['targetAudience'] })}
                >
                  <SelectTrigger id="targetAudience">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="students">Students</SelectItem>
                    <SelectItem value="senior-citizens">Senior Citizens</SelectItem>
                    <SelectItem value="pwd">PWD</SelectItem>
                    <SelectItem value="events">Events</SelectItem>
                    <SelectItem value="health">Health</SelectItem>
                    {customTargetAudiences.map(audience => (
                      <SelectItem key={audience} value={audience}>{audience}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Add Custom Target Audience</Label>
                <div className="flex gap-2">
                  <Input
                    value={newCustomAudience}
                    onChange={(e) => setNewCustomAudience(e.target.value)}
                    placeholder="Enter new target audience"
                  />
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleAddCustomAudience}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="outline" onClick={() => handleCreateOrUpdate(true)}>
                Save as Draft
              </Button>
              <Button onClick={() => handleCreateOrUpdate(false)}>
                {editingAnnouncement ? 'Update & Publish' : 'Post Announcement'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Posted Announcements</p>
                <p className="text-2xl font-semibold text-gray-900">{postedAnnouncements.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Send className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Draft Announcements</p>
                <p className="text-2xl font-semibold text-gray-900">{draftAnnouncements.length}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Edit className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Archived</p>
                <p className="text-2xl font-semibold text-gray-900">{archivedAnnouncements.length}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Archive className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Announcements Tabs */}
      <Tabs defaultValue="posted" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="posted">Posted</TabsTrigger>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value="posted" className="space-y-4">
          {postedAnnouncements.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Megaphone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No posted announcements yet</p>
              </CardContent>
            </Card>
          ) : (
            postedAnnouncements.map(announcement => (
              <AnnouncementCard key={announcement.id} announcement={announcement} />
            ))
          )}
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          {draftAnnouncements.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Edit className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No draft announcements</p>
              </CardContent>
            </Card>
          ) : (
            draftAnnouncements.map(announcement => (
              <AnnouncementCard key={announcement.id} announcement={announcement} />
            ))
          )}
        </TabsContent>

        <TabsContent value="archived" className="space-y-4">
          {archivedAnnouncements.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Archive className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No archived announcements</p>
              </CardContent>
            </Card>
          ) : (
            archivedAnnouncements.map(announcement => (
              <AnnouncementCard key={announcement.id} announcement={announcement} />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* View Announcement Dialog */}
      <Dialog open={!!viewingAnnouncement} onOpenChange={(open) => !open && setViewingAnnouncement(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {viewingAnnouncement && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {viewingAnnouncement.title}
                </DialogTitle>
                <DialogDescription>
                  View announcement details and content
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Display all images if there are multiple */}
                {viewingAnnouncement.images && viewingAnnouncement.images.length > 0 && (
                  <div className={`grid ${viewingAnnouncement.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                    {viewingAnnouncement.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`${viewingAnnouncement.title} - Image ${idx + 1}`}
                        className="w-full h-64 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}
                
                {/* Tags */}
                {viewingAnnouncement.tags && viewingAnnouncement.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {viewingAnnouncement.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap text-base leading-relaxed">{viewingAnnouncement.content}</p>
                </div>
                
                <div className="border-t pt-4 space-y-3 bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span className="font-medium">Posted by:</span> {viewingAnnouncement.postedBy}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">
                      {viewingAnnouncement.datePosted 
                        ? `Posted: ${new Date(viewingAnnouncement.datePosted).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
                        : `Created: ${new Date(viewingAnnouncement.dateCreated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Megaphone className="w-4 h-4" />
                    <span className="font-medium">Target Audience:</span>
                    <span>{getTargetAudienceBadge(viewingAnnouncement.targetAudience)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}