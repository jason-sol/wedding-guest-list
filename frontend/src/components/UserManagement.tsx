/**
 * User Management Modal using MUI Dialog
 * Manage users and their event permissions
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  TextField,
  Paper,
  Stack,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { Event, PermissionLevel, UserEventPermission } from '../types';
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  fetchEvents,
  fetchEventPermissions,
  setEventPermission,
} from '../api';

interface SafeUser {
  id: string;
  username: string;
  isOwner: boolean;
  createdAt: number;
  createdBy: string;
}

interface UserManagementProps {
  onClose: () => void;
}

export default function UserManagement({ onClose }: UserManagementProps) {
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [permissions, setPermissions] = useState<Map<string, Map<string, PermissionLevel>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, eventsData] = await Promise.all([
        fetchUsers(),
        fetchEvents(),
      ]);
      setUsers(usersData);
      setEvents(eventsData);

      const permMap = new Map<string, Map<string, PermissionLevel>>();
      for (const event of eventsData) {
        try {
          const eventPerms = await fetchEventPermissions(event.id);
          const userPermMap = new Map<string, PermissionLevel>();
          eventPerms.forEach((p: UserEventPermission) => {
            userPermMap.set(p.userId, p.permission);
          });
          permMap.set(event.id, userPermMap);
        } catch {
          permMap.set(event.id, new Map());
        }
      }
      setPermissions(permMap);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      alert('Please enter both username and password');
      return;
    }

    setIsCreating(true);
    try {
      await createUser(newUsername.trim(), newPassword);
      setNewUsername('');
      setNewPassword('');
      setShowNewUserForm(false);
      await loadData();
    } catch (err) {
      console.error('Failed to create user:', err);
      alert(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdatePassword = async (userId: string) => {
    if (!editPassword.trim()) {
      alert('Please enter a new password');
      return;
    }

    setIsUpdating(true);
    try {
      await updateUser(userId, editPassword);
      setEditingUserId(null);
      setEditPassword('');
      alert('Password updated successfully');
    } catch (err) {
      console.error('Failed to update password:', err);
      alert(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setIsDeleting(true);
    try {
      await deleteUser(userId);
      setDeletingUserId(null);
      await loadData();
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePermissionChange = async (
    eventId: string,
    userId: string,
    permission: PermissionLevel
  ) => {
    try {
      await setEventPermission(eventId, userId, permission);
      setPermissions(prev => {
        const newMap = new Map(prev);
        const eventMap = new Map(newMap.get(eventId) || new Map());
        eventMap.set(userId, permission);
        newMap.set(eventId, eventMap);
        return newMap;
      });
    } catch (err) {
      console.error('Failed to update permission:', err);
      alert(err instanceof Error ? err.message : 'Failed to update permission');
    }
  };

  const getPermission = (eventId: string, userId: string): PermissionLevel => {
    return permissions.get(eventId)?.get(userId) || 'viewer';
  };

  const nonOwnerUsers = users.filter(u => !u.isOwner);

  if (loading) {
    return (
      <Dialog open onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AdminPanelSettingsIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>User Management</Typography>
          </Box>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AdminPanelSettingsIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>User Management</Typography>
          </Box>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" action={<Button onClick={loadData}>Retry</Button>}>{error}</Alert>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AdminPanelSettingsIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            User Management
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ maxHeight: '70vh' }}>
        {/* Users Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600}>Users</Typography>
            {!showNewUserForm && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<PersonAddIcon />}
                onClick={() => setShowNewUserForm(true)}
              >
                Add User
              </Button>
            )}
          </Box>

          {showNewUserForm && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Box component="form" onSubmit={handleCreateUser} sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                <TextField
                  size="small"
                  label="Username"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  disabled={isCreating}
                  autoFocus
                  slotProps={{ htmlInput: { maxLength: 50 } }}
                />
                <TextField
                  size="small"
                  label="Password"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  disabled={isCreating}
                  slotProps={{ htmlInput: { maxLength: 100 } }}
                />
                <Button type="submit" variant="contained" disabled={isCreating}>
                  {isCreating ? <CircularProgress size={20} /> : 'Create'}
                </Button>
                <Button
                  onClick={() => {
                    setShowNewUserForm(false);
                    setNewUsername('');
                    setNewPassword('');
                  }}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
              </Box>
            </Paper>
          )}

          {nonOwnerUsers.length === 0 ? (
            <Alert severity="info">No users created yet. Click "Add User" to create one.</Alert>
          ) : (
            <Stack spacing={1}>
              {nonOwnerUsers.map(user => (
                <Paper key={user.id} variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography fontWeight={600}>{user.username}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Created by {user.createdBy} on {new Date(user.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      {editingUserId === user.id ? (
                        <>
                          <TextField
                            size="small"
                            type="password"
                            placeholder="New password"
                            value={editPassword}
                            onChange={e => setEditPassword(e.target.value)}
                            disabled={isUpdating}
                            slotProps={{ htmlInput: { maxLength: 100 } }}
                          />
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleUpdatePassword(user.id)}
                            disabled={isUpdating}
                          >
                            {isUpdating ? <CircularProgress size={16} /> : 'Save'}
                          </Button>
                          <Button
                            size="small"
                            onClick={() => {
                              setEditingUserId(null);
                              setEditPassword('');
                            }}
                            disabled={isUpdating}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : deletingUserId === user.id ? (
                        <>
                          <Typography variant="body2" sx={{ alignSelf: 'center' }}>Delete user?</Typography>
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? <CircularProgress size={16} /> : 'Yes'}
                          </Button>
                          <Button
                            size="small"
                            onClick={() => setDeletingUserId(null)}
                            disabled={isDeleting}
                          >
                            No
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => setEditingUserId(user.id)}
                          >
                            Password
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => setDeletingUserId(user.id)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </Stack>
                  </Box>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>

        {/* Permissions Section */}
        {nonOwnerUsers.length > 0 && events.length > 0 && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                Permissions
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Set each user's access level for each event. "Admin" can edit, "Viewer" is read-only, "None" blocks access.
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                      {events.map(event => (
                        <TableCell key={event.id} sx={{ fontWeight: 600 }}>{event.name}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {nonOwnerUsers.map(user => (
                      <TableRow key={user.id}>
                        <TableCell>{user.username}</TableCell>
                        {events.map(event => (
                          <TableCell key={event.id}>
                            <FormControl size="small" fullWidth>
                              <Select
                                value={getPermission(event.id, user.id)}
                                onChange={e =>
                                  handlePermissionChange(event.id, user.id, e.target.value as PermissionLevel)
                                }
                              >
                                <MenuItem value="admin">Admin</MenuItem>
                                <MenuItem value="viewer">Viewer</MenuItem>
                                <MenuItem value="none">None</MenuItem>
                              </Select>
                            </FormControl>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
