/**
 * Backup Management Modal using MUI Dialog
 * Settings, manual backup, backup list with restore/delete actions
 */

import { useState, useEffect } from 'react';
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
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BackupIcon from '@mui/icons-material/Backup';
import RestoreIcon from '@mui/icons-material/Restore';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { BackupSettings } from '../types';
import {
  fetchBackups,
  createBackup,
  restoreBackup,
  deleteBackupFile,
  fetchBackupSettings,
  updateBackupSettings,
  BackupInfo,
} from '../api';
import { useToast } from './Toast';

interface BackupManagementProps {
  onClose: () => void;
  onDataRestored: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

export default function BackupManagement({ onClose, onDataRestored }: BackupManagementProps) {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [settings, setSettings] = useState<BackupSettings>({ enabled: true, maxBackups: 5, backupTime: '02:00' });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsChanged, setSettingsChanged] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { showSuccess, showError } = useToast();

  const refreshBackups = async () => {
    const backupList = await fetchBackups();
    setBackups(backupList);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchBackups(), fetchBackupSettings()])
      .then(([backupList, backupSettings]) => {
        if (cancelled) return;
        setBackups(backupList);
        setSettings(backupSettings);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load backup data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      await createBackup();
      showSuccess('Backup created successfully');
      await refreshBackups();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (filename: string) => {
    setRestoring(filename);
    setConfirmRestore(null);
    try {
      await restoreBackup(filename);
      showSuccess('Data restored successfully. A safety backup was created.');
      await refreshBackups();
      onDataRestored();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to restore backup');
    } finally {
      setRestoring(null);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!window.confirm(`Delete backup "${filename}"? This cannot be undone.`)) return;

    setDeleting(filename);
    try {
      await deleteBackupFile(filename);
      setBackups(prev => prev.filter(b => b.filename !== filename));
      showSuccess('Backup deleted');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete backup');
    } finally {
      setDeleting(null);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const updated = await updateBackupSettings(settings);
      setSettings(updated);
      setSettingsChanged(false);
      showSuccess('Backup settings saved');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const updateSetting = <K extends keyof BackupSettings>(key: K, value: BackupSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSettingsChanged(true);
  };

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle component="div">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BackupIcon />
              <Typography variant="h6" fontWeight={600}>Backup Management</Typography>
            </Box>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          ) : (
            <>
              {/* Settings Section */}
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                Automatic Backup Settings
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Stack spacing={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.enabled}
                        onChange={(e) => updateSetting('enabled', e.target.checked)}
                      />
                    }
                    label="Enable automatic daily backups"
                  />
                  <Stack direction="row" spacing={2} alignItems="center">
                    <TextField
                      label="Backup Time"
                      type="time"
                      value={settings.backupTime}
                      onChange={(e) => updateSetting('backupTime', e.target.value)}
                      size="small"
                      disabled={!settings.enabled}
                      sx={{ width: 150 }}
                      slotProps={{ htmlInput: { step: 60 } }}
                    />
                    <TextField
                      label="Max Backups"
                      type="number"
                      value={settings.maxBackups}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (val >= 1 && val <= 10) updateSetting('maxBackups', val);
                      }}
                      size="small"
                      sx={{ width: 120 }}
                      slotProps={{ htmlInput: { min: 1, max: 10 } }}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={savingSettings ? <CircularProgress size={16} /> : <SaveIcon />}
                      onClick={handleSaveSettings}
                      disabled={!settingsChanged || savingSettings}
                    >
                      Save
                    </Button>
                  </Stack>
                </Stack>
              </Paper>

              <Divider sx={{ my: 2 }} />

              {/* Manual Backup */}
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Backups ({backups.length})
                </Typography>
                <Button
                  variant="contained"
                  startIcon={creating ? <CircularProgress size={16} /> : <BackupIcon />}
                  onClick={handleCreateBackup}
                  disabled={creating}
                  size="small"
                >
                  {creating ? 'Creating...' : 'Backup Now'}
                </Button>
              </Stack>

              {/* Backup List */}
              {backups.length === 0 ? (
                <Alert severity="info">No backups yet. Click "Backup Now" to create one.</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Filename</TableCell>
                        <TableCell>Timestamp</TableCell>
                        <TableCell>Size</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {backups.map((backup) => (
                        <TableRow key={backup.filename}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                              {backup.filename}
                            </Typography>
                          </TableCell>
                          <TableCell>{formatTimestamp(backup.timestamp)}</TableCell>
                          <TableCell>{formatFileSize(backup.size)}</TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Button
                                size="small"
                                startIcon={restoring === backup.filename ? <CircularProgress size={14} /> : <RestoreIcon />}
                                onClick={() => setConfirmRestore(backup.filename)}
                                disabled={restoring !== null || deleting !== null}
                                color="warning"
                              >
                                Restore
                              </Button>
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(backup.filename)}
                                disabled={restoring !== null || deleting === backup.filename}
                                color="error"
                              >
                                {deleting === backup.filename ? <CircularProgress size={16} /> : <DeleteIcon fontSize="small" />}
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog
        open={confirmRestore !== null}
        onClose={() => setConfirmRestore(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle component="div">
          <Typography variant="h6" fontWeight={600}>Confirm Restore</Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will replace all current data with the backup data. A safety backup of the current data will be created automatically before restoring.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Restore from: <strong>{confirmRestore}</strong>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setConfirmRestore(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => confirmRestore && handleRestore(confirmRestore)}
            disabled={restoring !== null}
            startIcon={restoring ? <CircularProgress size={16} /> : <RestoreIcon />}
          >
            Restore
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
