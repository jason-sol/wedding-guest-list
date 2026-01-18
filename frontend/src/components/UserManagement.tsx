import { useState, useEffect, useCallback } from 'react';
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
import './UserManagement.css';

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

  // New user form
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Edit user
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete confirmation
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

      // Load permissions for each event
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
          // Event might not have permissions yet
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
      // Update local state
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
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content user-management-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>User Management</h2>
            <button className="close-button" onClick={onClose}>x</button>
          </div>
          <div className="loading-state">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content user-management-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>User Management</h2>
            <button className="close-button" onClick={onClose}>x</button>
          </div>
          <div className="error-state">
            <p>{error}</p>
            <button onClick={loadData}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content user-management-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>User Management</h2>
          <button className="close-button" onClick={onClose}>x</button>
        </div>

        <div className="user-management-content">
          {/* Add User Section */}
          <div className="section">
            <div className="section-header">
              <h3>Users</h3>
              {!showNewUserForm && (
                <button
                  className="add-user-button"
                  onClick={() => setShowNewUserForm(true)}
                >
                  + Add User
                </button>
              )}
            </div>

            {showNewUserForm && (
              <form className="new-user-form" onSubmit={handleCreateUser}>
                <div className="form-row">
                  <input
                    type="text"
                    placeholder="Username"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    disabled={isCreating}
                    autoFocus
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    disabled={isCreating}
                  />
                  <button type="submit" disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewUserForm(false);
                      setNewUsername('');
                      setNewPassword('');
                    }}
                    disabled={isCreating}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* User List */}
            <div className="user-list">
              {nonOwnerUsers.length === 0 ? (
                <p className="no-users">No users created yet. Click "+ Add User" to create one.</p>
              ) : (
                nonOwnerUsers.map(user => (
                  <div key={user.id} className="user-item">
                    <div className="user-info">
                      <span className="username">{user.username}</span>
                      <span className="user-meta">
                        Created by {user.createdBy} on{' '}
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="user-actions">
                      {editingUserId === user.id ? (
                        <div className="edit-password-form">
                          <input
                            type="password"
                            placeholder="New password"
                            value={editPassword}
                            onChange={e => setEditPassword(e.target.value)}
                            disabled={isUpdating}
                          />
                          <button
                            onClick={() => handleUpdatePassword(user.id)}
                            disabled={isUpdating}
                          >
                            {isUpdating ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingUserId(null);
                              setEditPassword('');
                            }}
                            disabled={isUpdating}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : deletingUserId === user.id ? (
                        <div className="delete-confirm">
                          <span>Delete this user?</span>
                          <button
                            className="confirm-delete"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                          </button>
                          <button
                            onClick={() => setDeletingUserId(null)}
                            disabled={isDeleting}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => setEditingUserId(user.id)}>
                            Change Password
                          </button>
                          <button
                            className="delete-button"
                            onClick={() => setDeletingUserId(user.id)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Permissions Section */}
          {nonOwnerUsers.length > 0 && events.length > 0 && (
            <div className="section">
              <h3>Permissions</h3>
              <p className="section-description">
                Set each user's access level for each event. "Admin" can edit, "Viewer" is read-only, "None" blocks access.
              </p>
              <div className="permissions-table-container">
                <table className="permissions-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      {events.map(event => (
                        <th key={event.id}>{event.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {nonOwnerUsers.map(user => (
                      <tr key={user.id}>
                        <td className="user-cell">{user.username}</td>
                        {events.map(event => (
                          <td key={event.id} className="permission-cell">
                            <select
                              value={getPermission(event.id, user.id)}
                              onChange={e =>
                                handlePermissionChange(
                                  event.id,
                                  user.id,
                                  e.target.value as PermissionLevel
                                )
                              }
                            >
                              <option value="admin">Admin</option>
                              <option value="viewer">Viewer</option>
                              <option value="none">None</option>
                            </select>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
