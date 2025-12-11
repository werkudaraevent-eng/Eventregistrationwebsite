/**
 * User Management Component
 * 
 * Allows Super Admins to manage users, roles, and event access.
 */

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Card, CardContent } from './ui/card';
import { 
  Users, UserPlus, Shield, Eye, Edit2, UserX, Search, 
  Calendar, Mail, Clock, AlertCircle, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '../utils/PermissionContext';
import { 
  getUsersWithAccessCounts, 
  updateUserProfile, 
  deactivateUser, 
  reactivateUser,
  getUserEventAccess,
  updateUserEventAccess,
  canDemoteSuperAdmin,
} from '../utils/userDataLayer';
import { 
  UserProfile, 
  UserRole, 
  Permission,
  getRoleLabel, 
} from '../utils/permissions';
import { getAllEvents } from '../utils/supabaseDataLayer';
import type { Event } from '../utils/supabaseDataLayer';

// ============================================
// TYPES
// ============================================

interface UserWithCount extends UserProfile {
  event_count: number;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function UserManagement() {
  const { currentUser, canManageUsers } = usePermissions();
  const [users, setUsers] = useState<UserWithCount[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [selectedUser, setSelectedUser] = useState<UserWithCount | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);

  // Check permission
  if (!canManageUsers()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">You don't have permission to manage users.</p>
        </div>
      </div>
    );
  }

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [usersData, eventsData] = await Promise.all([
        getUsersWithAccessCounts(),
        getAllEvents(),
      ]);
      setUsers(usersData);
      setEvents(eventsData);
    } catch (error: any) {
      toast.error('Failed to load users: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter users by search
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getRoleLabel(user.role).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Role badge color
  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800';
      case 'event_admin': return 'bg-blue-100 text-blue-800';
      case 'event_viewer': return 'bg-green-100 text-green-800';
      case 'checkin_operator': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Users className="h-6 w-6" />
            User Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage user accounts and event access permissions
          </p>
        </div>
        <Button onClick={() => toast.info('Invite user feature coming soon')}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-sm text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'super_admin').length}
            </div>
            <p className="text-sm text-muted-foreground">Super Admins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {users.filter(u => u.is_active).length}
            </div>
            <p className="text-sm text-muted-foreground">Active Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{events.length}</div>
            <p className="text-sm text-muted-foreground">Total Events</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users by name, email, or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className={!user.is_active ? 'opacity-50' : ''}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.name || 'No name'}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {user.role === 'super_admin' ? 'All' : user.event_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.is_active ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          Inactive
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.last_login_at ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(user.last_login_at).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {user.role !== 'super_admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowAccessDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowEditDialog(true);
                          }}
                          disabled={user.id === currentUser?.id}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeactivateDialog(true);
                          }}
                          disabled={user.id === currentUser?.id}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <EditUserDialog
        user={selectedUser}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSave={loadData}
        currentUserId={currentUser?.id || ''}
      />

      {/* Event Access Dialog */}
      <EventAccessDialog
        user={selectedUser}
        events={events}
        open={showAccessDialog}
        onOpenChange={setShowAccessDialog}
        onSave={loadData}
        currentUserId={currentUser?.id || ''}
      />

      {/* Deactivate Dialog */}
      <DeactivateUserDialog
        user={selectedUser}
        open={showDeactivateDialog}
        onOpenChange={setShowDeactivateDialog}
        onConfirm={loadData}
        currentUserId={currentUser?.id || ''}
      />
    </div>
  );
}


// ============================================
// EDIT USER DIALOG
// ============================================

interface EditUserDialogProps {
  user: UserWithCount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  currentUserId: string;
}

function EditUserDialog({ user, open, onOpenChange, onSave, currentUserId }: EditUserDialogProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('event_viewer');
  const [isSaving, setIsSaving] = useState(false);
  const [canDemote, setCanDemote] = useState(true);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setRole(user.role);
      
      // Check if can demote super admin
      if (user.role === 'super_admin') {
        canDemoteSuperAdmin(user.id).then(setCanDemote);
      } else {
        setCanDemote(true);
      }
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    
    try {
      setIsSaving(true);
      await updateUserProfile(user.id, { name, role }, currentUserId);
      toast.success('User updated successfully');
      onOpenChange(false);
      onSave();
    } catch (error: any) {
      toast.error('Failed to update user: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information and role
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ''} disabled />
          </div>
          
          <div className="space-y-2">
            <Label>Name</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter user name"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin" disabled={!canDemote && user?.role === 'super_admin'}>
                  Super Admin - Full system access
                </SelectItem>
                <SelectItem value="event_admin">
                  Event Admin - Edit assigned events
                </SelectItem>
                <SelectItem value="event_viewer">
                  Event Viewer - View assigned events
                </SelectItem>
                <SelectItem value="checkin_operator">
                  Check-in Operator - Check-in only
                </SelectItem>
              </SelectContent>
            </Select>
            {!canDemote && user?.role === 'super_admin' && (
              <p className="text-sm text-orange-600">
                Cannot demote the last super admin
              </p>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// EVENT ACCESS DIALOG
// ============================================

interface EventAccessDialogProps {
  user: UserWithCount | null;
  events: Event[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  currentUserId: string;
}

interface EventAccessItem {
  event_id: string;
  permission: Permission;
  enabled: boolean;
}

function EventAccessDialog({ user, events, open, onOpenChange, onSave, currentUserId }: EventAccessDialogProps) {
  const [accessList, setAccessList] = useState<EventAccessItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && open) {
      loadAccess();
    }
  }, [user, open]);

  const loadAccess = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const currentAccess = await getUserEventAccess(user.id);
      const accessMap = new Map(currentAccess.map(a => [a.event_id, a.permission]));
      
      setAccessList(events.map(event => ({
        event_id: event.id,
        permission: accessMap.get(event.id) || 'view',
        enabled: accessMap.has(event.id),
      })));
    } catch (error: any) {
      toast.error('Failed to load access: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAccess = (eventId: string) => {
    setAccessList(prev => prev.map(item => 
      item.event_id === eventId 
        ? { ...item, enabled: !item.enabled }
        : item
    ));
  };

  const setPermission = (eventId: string, permission: Permission) => {
    setAccessList(prev => prev.map(item => 
      item.event_id === eventId 
        ? { ...item, permission }
        : item
    ));
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      setIsSaving(true);
      const enabledAccess = accessList
        .filter(item => item.enabled)
        .map(item => ({ event_id: item.event_id, permission: item.permission }));
      
      await updateUserEventAccess(user.id, enabledAccess, currentUserId);
      toast.success('Event access updated');
      onOpenChange(false);
      onSave();
    } catch (error: any) {
      toast.error('Failed to update access: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Event Access - {user?.name || user?.email}</DialogTitle>
          <DialogDescription>
            Select which events this user can access and their permission level
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="space-y-2">
              {accessList.map((item) => {
                const event = events.find(e => e.id === item.event_id);
                if (!event) return null;
                
                return (
                  <div 
                    key={item.event_id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      item.enabled ? 'bg-primary-50 border-primary-200' : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={item.enabled}
                        onCheckedChange={() => toggleAccess(item.event_id)}
                      />
                      <div>
                        <div className="font-medium">{event.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {event.startDate} • {event.location}
                        </div>
                      </div>
                    </div>
                    
                    {item.enabled && (
                      <Select 
                        value={item.permission} 
                        onValueChange={(v) => setPermission(item.event_id, v as Permission)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">View Only</SelectItem>
                          <SelectItem value="edit">Edit</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                );
              })}
              
              {events.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No events available
                </div>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Access'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// DEACTIVATE USER DIALOG
// ============================================

interface DeactivateUserDialogProps {
  user: UserWithCount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  currentUserId: string;
}

function DeactivateUserDialog({ user, open, onOpenChange, onConfirm, currentUserId }: DeactivateUserDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async () => {
    if (!user) return;
    
    try {
      setIsProcessing(true);
      
      if (user.is_active) {
        await deactivateUser(user.id, currentUserId);
        toast.success('User deactivated');
      } else {
        await reactivateUser(user.id, currentUserId);
        toast.success('User reactivated');
      }
      
      onOpenChange(false);
      onConfirm();
    } catch (error: any) {
      toast.error('Failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {user?.is_active ? 'Deactivate User' : 'Reactivate User'}
          </DialogTitle>
          <DialogDescription>
            {user?.is_active 
              ? 'This will prevent the user from logging in. Their data will be preserved.'
              : 'This will allow the user to log in again.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="font-medium">{user?.name || 'No name'}</div>
            <div className="text-sm text-muted-foreground">{user?.email}</div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant={user?.is_active ? 'destructive' : 'default'}
            onClick={handleAction}
            disabled={isProcessing}
          >
            {isProcessing 
              ? 'Processing...' 
              : user?.is_active ? 'Deactivate' : 'Reactivate'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default UserManagement;
