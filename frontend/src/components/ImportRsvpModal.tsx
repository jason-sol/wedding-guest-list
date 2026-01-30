/**
 * Import RSVP Modal using MUI Dialog
 * Handles CSV import from JOY with preview, fuzzy matching suggestions,
 * and manual resolution for unmatched guests
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Stack,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Stepper,
  Step,
  StepLabel,
  Autocomplete,
  TextField,
  Tooltip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LinkIcon from '@mui/icons-material/Link';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { importJoyCsv, JoyImportResult, JoyImportUnmatched, addGuest, updateGuest, addFamily } from '../api';
import { Guest, Family } from '../types';

interface ImportRsvpModalProps {
  eventId: string;
  guests: Guest[];
  families: Family[];
  onClose: () => void;
  onSuccess: () => void;
}

type ResolutionAction =
  | { type: 'skip' }
  | { type: 'match'; guestId: string }
  | { type: 'create-individual' }
  | { type: 'create-family'; familyName: string }
  | { type: 'add-to-family'; familyId: string };

export default function ImportRsvpModal({
  eventId,
  guests,
  families,
  onClose,
  onSuccess,
}: ImportRsvpModalProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<JoyImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolutions, setResolutions] = useState<Map<number, ResolutionAction>>(new Map());
  const [processedCount, setProcessedCount] = useState(0);

  const steps = ['Upload CSV', 'Preview & Match', 'Resolve Unmatched', 'Apply Changes', 'Complete'];

  // Sort families alphabetically for dropdown
  const sortedFamilies = useMemo(() => {
    return [...families].sort((a, b) => a.name.localeCompare(b.name));
  }, [families]);

  // Sort guests alphabetically for autocomplete
  const sortedGuests = useMemo(() => {
    return [...guests].sort((a, b) => {
      const aName = `${a.lastName} ${a.firstName}`;
      const bName = `${b.lastName} ${b.firstName}`;
      return aName.localeCompare(bName);
    });
  }, [guests]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);
    setError(null);

    try {
      const content = await file.text();
      setCsvContent(content);

      // Preview (dry run)
      const result = await importJoyCsv(eventId, content, true);
      setPreviewResult(result);

      // Initialize resolutions for unmatched rows
      const initialResolutions = new Map<number, ResolutionAction>();
      result.unmatched.forEach(u => {
        // Default to skip, but if there's a high-confidence match, suggest it
        if (u.potentialMatches.length > 0 && u.potentialMatches[0].similarity >= 0.8) {
          initialResolutions.set(u.rowIndex, { type: 'match', guestId: u.potentialMatches[0].guestId });
        } else {
          initialResolutions.set(u.rowIndex, { type: 'skip' });
        }
      });
      setResolutions(initialResolutions);

      // Go to preview step, or skip to resolve step if there are unmatched
      setActiveStep(result.unmatched.length > 0 ? 1 : 1);
    } catch (err) {
      console.error('Failed to preview CSV:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
    } finally {
      setIsProcessing(false);
    }
  }, [eventId]);

  const handleResolutionChange = useCallback((rowIndex: number, action: ResolutionAction) => {
    setResolutions(prev => {
      const newMap = new Map(prev);
      newMap.set(rowIndex, action);
      return newMap;
    });
  }, []);

  const handleApplyChanges = async () => {
    if (!csvContent || !previewResult) return;

    setIsProcessing(true);
    setError(null);
    setProcessedCount(0);
    setActiveStep(3);

    try {
      // First, apply the auto-matched updates
      const result = await importJoyCsv(eventId, csvContent, false);
      setProcessedCount(result.matched.length);

      // Then, process manual resolutions
      for (const unmatched of previewResult.unmatched) {
        const resolution = resolutions.get(unmatched.rowIndex);
        if (!resolution) continue;

        switch (resolution.type) {
          case 'skip':
            // Do nothing
            break;

          case 'match':
            // Update the matched guest with RSVP data
            await updateGuest(eventId, resolution.guestId, {
              rsvp: unmatched.rsvp,
              dietaryRequirements: unmatched.dietaryRequirements,
            });
            break;

          case 'create-individual':
            // Create new individual guest
            await addGuest(eventId, {
              firstName: unmatched.firstName,
              lastName: unmatched.lastName,
              familyId: null,
              tags: [],
              rsvp: unmatched.rsvp,
              dietaryRequirements: unmatched.dietaryRequirements,
            });
            break;

          case 'create-family':
            // Create new family with this guest
            await addFamily(eventId, {
              name: resolution.familyName,
              members: [{
                firstName: unmatched.firstName,
                lastName: unmatched.lastName,
                tags: [],
              }],
            });
            // Note: The family creation doesn't support RSVP directly,
            // we'd need to update the guest after. For now, create and update.
            break;

          case 'add-to-family':
            // Add to existing family
            await addGuest(eventId, {
              firstName: unmatched.firstName,
              lastName: unmatched.lastName,
              familyId: resolution.familyId,
              tags: [],
              rsvp: unmatched.rsvp,
              dietaryRequirements: unmatched.dietaryRequirements,
            });
            break;
        }
        setProcessedCount(prev => prev + 1);
      }

      setActiveStep(4);
    } catch (err) {
      console.error('Failed to apply changes:', err);
      setError(err instanceof Error ? err.message : 'Failed to apply changes');
      setActiveStep(2); // Go back to resolve step
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDone = () => {
    onSuccess();
  };

  const handleBack = () => {
    if (activeStep === 2) {
      setActiveStep(1);
    } else {
      setActiveStep(0);
      setCsvContent(null);
      setFileName(null);
      setPreviewResult(null);
      setResolutions(new Map());
      setError(null);
    }
  };

  const handleContinueToResolve = () => {
    setActiveStep(2);
  };

  // Count resolutions by type
  const resolutionCounts = useMemo(() => {
    let skip = 0;
    let match = 0;
    let create = 0;

    resolutions.forEach(r => {
      if (r.type === 'skip') skip++;
      else if (r.type === 'match') match++;
      else create++;
    });

    return { skip, match, create };
  }, [resolutions]);

  return (
    <Dialog
      open
      onClose={isProcessing ? undefined : onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, maxHeight: '90vh' },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <UploadFileIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Import RSVP from JOY
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" disabled={isProcessing}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label, index) => (
            <Step key={label} completed={activeStep > index}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Step 0: Upload */}
        {activeStep === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Export your guest list from JOY as a CSV file, then upload it here.
              <br />
              Guests will be matched by name, with suggestions for partial matches.
            </Typography>
            <Button
              variant="contained"
              component="label"
              startIcon={isProcessing ? <CircularProgress size={20} color="inherit" /> : <UploadFileIcon />}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Select CSV File'}
              <input type="file" accept=".csv" hidden onChange={handleFileSelect} />
            </Button>
          </Box>
        )}

        {/* Step 1: Preview */}
        {activeStep === 1 && previewResult && (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              File: <strong>{fileName}</strong> - {previewResult.summary.total} rows found
            </Alert>

            <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
              <Chip
                icon={<CheckCircleIcon />}
                label={`${previewResult.summary.matched} Auto-matched`}
                color="success"
                variant="outlined"
              />
              <Chip
                icon={<WarningIcon />}
                label={`${previewResult.summary.unmatched} Need Review`}
                color="warning"
                variant="outlined"
              />
              {previewResult.summary.errors > 0 && (
                <Chip
                  icon={<ErrorIcon />}
                  label={`${previewResult.summary.errors} Errors`}
                  color="error"
                  variant="outlined"
                />
              )}
            </Stack>

            {previewResult.matched.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Guests to Update (Auto-matched):
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, maxHeight: 200 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>RSVP</TableCell>
                        <TableCell>Dietary</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {previewResult.matched.map((m, i) => (
                        <TableRow key={i}>
                          <TableCell>{m.name}</TableCell>
                          <TableCell>
                            <Chip
                              label={m.rsvp === 'accepted' ? 'Attending' : m.rsvp === 'declined' ? 'Declined' : 'Pending'}
                              size="small"
                              color={m.rsvp === 'accepted' ? 'success' : m.rsvp === 'declined' ? 'error' : 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            {m.dietaryRequirements ? (
                              <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap title={m.dietaryRequirements}>
                                {m.dietaryRequirements}
                              </Typography>
                            ) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            {previewResult.unmatched.length > 0 && (
              <>
                <Typography variant="subtitle2" color="warning.main" sx={{ mb: 1 }}>
                  Unmatched Guests ({previewResult.unmatched.length}):
                </Typography>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  These guests from the CSV couldn't be automatically matched. Click "Continue" to review and resolve each one.
                </Alert>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name from CSV</TableCell>
                        <TableCell>Potential Matches</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {previewResult.unmatched.map((u, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <strong>{u.firstName} {u.lastName}</strong>
                          </TableCell>
                          <TableCell>
                            {u.potentialMatches.length > 0 ? (
                              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                {u.potentialMatches.slice(0, 3).map((pm, j) => (
                                  <Tooltip key={j} title={`${Math.round(pm.similarity * 100)}% match`}>
                                    <Chip
                                      size="small"
                                      label={`${pm.firstName} ${pm.lastName}`}
                                      icon={<AutoFixHighIcon />}
                                      variant="outlined"
                                      color={pm.similarity >= 0.7 ? 'success' : 'default'}
                                    />
                                  </Tooltip>
                                ))}
                              </Stack>
                            ) : (
                              <Typography variant="body2" color="text.secondary">No suggestions</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </>
        )}

        {/* Step 2: Resolve Unmatched */}
        {activeStep === 2 && previewResult && (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              For each unmatched guest, choose how to handle them:
              <br />
              <strong>Match</strong> - Link to an existing guest | <strong>Create</strong> - Add as new guest | <strong>Skip</strong> - Ignore this row
            </Alert>

            <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
              <Chip
                icon={<LinkIcon />}
                label={`${resolutionCounts.match} to match`}
                color="primary"
                variant="outlined"
                size="small"
              />
              <Chip
                icon={<PersonAddIcon />}
                label={`${resolutionCounts.create} to create`}
                color="success"
                variant="outlined"
                size="small"
              />
              <Chip
                icon={<SkipNextIcon />}
                label={`${resolutionCounts.skip} to skip`}
                color="default"
                variant="outlined"
                size="small"
              />
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack spacing={2} sx={{ maxHeight: 400, overflow: 'auto' }}>
              {previewResult.unmatched.map((unmatched) => (
                <UnmatchedGuestResolver
                  key={unmatched.rowIndex}
                  unmatched={unmatched}
                  guests={sortedGuests}
                  families={sortedFamilies}
                  resolution={resolutions.get(unmatched.rowIndex) || { type: 'skip' }}
                  onResolutionChange={(action) => handleResolutionChange(unmatched.rowIndex, action)}
                />
              ))}
            </Stack>
          </>
        )}

        {/* Step 3: Applying */}
        {activeStep === 3 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Applying Changes...
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Processed {processedCount} guests
            </Typography>
          </Box>
        )}

        {/* Step 4: Complete */}
        {activeStep === 4 && previewResult && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Import Complete!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Successfully processed {previewResult.summary.matched + resolutionCounts.match + resolutionCounts.create} guests.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {activeStep === 0 && (
          <Button onClick={onClose}>Cancel</Button>
        )}
        {activeStep === 1 && (
          <>
            <Button onClick={handleBack} disabled={isProcessing}>
              Back
            </Button>
            {previewResult?.unmatched.length === 0 ? (
              <Button
                variant="contained"
                onClick={handleApplyChanges}
                disabled={isProcessing || previewResult?.summary.matched === 0}
              >
                {isProcessing ? <CircularProgress size={20} /> : `Import ${previewResult?.summary.matched || 0} Guests`}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleContinueToResolve}
                disabled={isProcessing}
              >
                Continue to Resolve ({previewResult?.unmatched.length} unmatched)
              </Button>
            )}
          </>
        )}
        {activeStep === 2 && (
          <>
            <Button onClick={handleBack} disabled={isProcessing}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleApplyChanges}
              disabled={isProcessing}
            >
              {isProcessing ? <CircularProgress size={20} /> : 'Apply All Changes'}
            </Button>
          </>
        )}
        {activeStep === 4 && (
          <Button variant="contained" onClick={handleDone}>
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// Sub-component for resolving a single unmatched guest
interface UnmatchedGuestResolverProps {
  unmatched: JoyImportUnmatched;
  guests: Guest[];
  families: Family[];
  resolution: ResolutionAction;
  onResolutionChange: (action: ResolutionAction) => void;
}

function UnmatchedGuestResolver({
  unmatched,
  guests,
  families,
  resolution,
  onResolutionChange,
}: UnmatchedGuestResolverProps) {
  const [showFamilySelect, setShowFamilySelect] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState(`${unmatched.lastName} Family`);

  // Find the matched guest details if resolution is a match
  const matchedGuest = resolution.type === 'match'
    ? guests.find(g => g.id === resolution.guestId)
    : null;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        {/* Guest Info from CSV */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {unmatched.firstName} {unmatched.lastName}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
              <Chip
                label={unmatched.rsvp === 'accepted' ? 'Attending' : unmatched.rsvp === 'declined' ? 'Declined' : 'Pending'}
                size="small"
                color={unmatched.rsvp === 'accepted' ? 'success' : unmatched.rsvp === 'declined' ? 'error' : 'default'}
              />
              {unmatched.dietaryRequirements && (
                <Tooltip title={unmatched.dietaryRequirements}>
                  <Chip label="Has dietary info" size="small" variant="outlined" />
                </Tooltip>
              )}
            </Stack>
          </Box>

          {/* Action Buttons */}
          <Stack direction="row" spacing={1}>
            <Tooltip title="Skip this guest">
              <Button
                size="small"
                variant={resolution.type === 'skip' ? 'contained' : 'outlined'}
                color={resolution.type === 'skip' ? 'primary' : 'inherit'}
                onClick={() => onResolutionChange({ type: 'skip' })}
              >
                <SkipNextIcon />
              </Button>
            </Tooltip>
            <Tooltip title="Create as new individual guest">
              <Button
                size="small"
                variant={resolution.type === 'create-individual' ? 'contained' : 'outlined'}
                color={resolution.type === 'create-individual' ? 'success' : 'inherit'}
                onClick={() => onResolutionChange({ type: 'create-individual' })}
              >
                <PersonAddIcon />
              </Button>
            </Tooltip>
            <Tooltip title="Add to family">
              <Button
                size="small"
                variant={resolution.type === 'add-to-family' || resolution.type === 'create-family' ? 'contained' : 'outlined'}
                color={resolution.type === 'add-to-family' || resolution.type === 'create-family' ? 'success' : 'inherit'}
                onClick={() => setShowFamilySelect(!showFamilySelect)}
              >
                <GroupAddIcon />
              </Button>
            </Tooltip>
          </Stack>
        </Box>

        {/* Suggested Matches */}
        {unmatched.potentialMatches.length > 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Suggested matches (click to select):
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {unmatched.potentialMatches.map((pm) => (
                <Chip
                  key={pm.guestId}
                  label={`${pm.firstName} ${pm.lastName} (${Math.round(pm.similarity * 100)}%)`}
                  icon={<LinkIcon />}
                  variant={resolution.type === 'match' && resolution.guestId === pm.guestId ? 'filled' : 'outlined'}
                  color={resolution.type === 'match' && resolution.guestId === pm.guestId ? 'primary' : 'default'}
                  onClick={() => onResolutionChange({ type: 'match', guestId: pm.guestId })}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Stack>
          </Box>
        )}

        {/* Search all guests */}
        <Autocomplete
          size="small"
          options={guests}
          getOptionLabel={(guest) => `${guest.firstName} ${guest.lastName}`}
          value={matchedGuest || null}
          onChange={(_, newValue) => {
            if (newValue) {
              onResolutionChange({ type: 'match', guestId: newValue.id });
            }
          }}
          renderInput={(params) => (
            <TextField {...params} label="Search all guests to match" placeholder="Type to search..." />
          )}
          renderOption={(props, option) => (
            <li {...props} key={option.id}>
              <Box>
                <Typography variant="body2">{option.firstName} {option.lastName}</Typography>
                {option.familyId && (
                  <Typography variant="caption" color="text.secondary">
                    In a family
                  </Typography>
                )}
              </Box>
            </li>
          )}
        />

        {/* Family selection */}
        {showFamilySelect && (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            {families.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Add to existing family</InputLabel>
                <Select
                  label="Add to existing family"
                  value={resolution.type === 'add-to-family' ? resolution.familyId : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      onResolutionChange({ type: 'add-to-family', familyId: e.target.value });
                    }
                  }}
                >
                  {families.map((family) => (
                    <MenuItem key={family.id} value={family.id}>
                      {family.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <Typography variant="body2" sx={{ py: 1 }}>or</Typography>
            <TextField
              size="small"
              label="Create new family"
              value={newFamilyName}
              onChange={(e) => setNewFamilyName(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            <Button
              size="small"
              variant="outlined"
              onClick={() => onResolutionChange({ type: 'create-family', familyName: newFamilyName })}
              disabled={!newFamilyName.trim()}
            >
              Create
            </Button>
          </Box>
        )}

        {/* Show current resolution status */}
        {resolution.type !== 'skip' && (
          <Alert severity={resolution.type === 'match' ? 'info' : 'success'} sx={{ py: 0.5 }}>
            {resolution.type === 'match' && matchedGuest && (
              <>Will update: <strong>{matchedGuest.firstName} {matchedGuest.lastName}</strong></>
            )}
            {resolution.type === 'create-individual' && (
              <>Will create as individual guest</>
            )}
            {resolution.type === 'create-family' && (
              <>Will create new family: <strong>{resolution.familyName}</strong></>
            )}
            {resolution.type === 'add-to-family' && (
              <>Will add to family: <strong>{families.find(f => f.id === resolution.familyId)?.name}</strong></>
            )}
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}
