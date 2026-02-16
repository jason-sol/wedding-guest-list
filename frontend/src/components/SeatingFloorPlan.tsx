/**
 * Seating Floor Plan - SVG-based visual layout with draggable tables.
 * Tables are rendered as shapes (circles/rectangles) color-coded by fill ratio.
 * Guest names displayed around tables. Zoom in/out with controls or scroll wheel.
 * Click to open assign popover. Drag to reposition.
 */

import { useState, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Popover,
  Chip,
  Checkbox,
  FormControlLabel,
  IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import { Guest, Table } from '../types';

interface SeatingFloorPlanProps {
  guests: Guest[];
  tables: Table[];
  onUpdateTablePosition: (tableId: string, x: number, y: number) => void;
  onAssignGuests: (tableId: string, guestIds: string[]) => void;
  onEditTable: (table: Table) => void;
  onDeleteTable: (tableId: string) => void;
}

function getFillColor(seated: number, capacity: number): string {
  const ratio = seated / capacity;
  if (ratio >= 1) return '#ef5350';     // red
  if (ratio >= 0.75) return '#ff9800';  // orange
  if (ratio > 0) return '#4caf50';      // green
  return '#9e9e9e';                      // grey (empty)
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

export default function SeatingFloorPlan({
  guests,
  tables,
  onUpdateTablePosition,
  onAssignGuests,
  onEditTable,
  onDeleteTable,
}: SeatingFloorPlanProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{ tableId: string; offsetX: number; offsetY: number } | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [anchorPosition, setAnchorPosition] = useState<{ top: number; left: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);

  const guestMap = useMemo(() => {
    const map = new Map<string, Guest>();
    guests.forEach(g => map.set(g.id, g));
    return map;
  }, [guests]);

  const seatedGuestIds = useMemo(() => {
    const set = new Set<string>();
    for (const table of tables) {
      for (const guestId of table.seats) {
        set.add(guestId);
      }
    }
    return set;
  }, [tables]);

  const unassignedGuests = useMemo(() => {
    return guests
      .filter(g => !seatedGuestIds.has(g.id))
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [guests, seatedGuestIds]);

  // Wide viewBox so the grid uses the full screen width (16:9-ish ratio)
  const VB_WIDTH = 160;
  const VB_HEIGHT = 100;

  // Compute the SVG viewBox based on zoom and pan
  const viewBox = useMemo(() => {
    const w = VB_WIDTH / zoom;
    const h = VB_HEIGHT / zoom;
    const cx = VB_WIDTH / 2 + pan.x;
    const cy = VB_HEIGHT / 2 + pan.y;
    return `${cx - w / 2} ${cy - h / 2} ${w} ${h}`;
  }, [zoom, pan]);

  // Use SVG's native getScreenCTM for pixel-perfect cursor-to-SVG mapping
  const getSvgCoords = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const inv = ctm.inverse();
    return {
      x: inv.a * e.clientX + inv.c * e.clientY + inv.e,
      y: inv.b * e.clientX + inv.d * e.clientY + inv.f,
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, table: Table) => {
    e.preventDefault();
    e.stopPropagation();
    const coords = getSvgCoords(e);
    setDragging({
      tableId: table.id,
      offsetX: coords.x - table.x,
      offsetY: coords.y - table.y,
    });
  }, [getSvgCoords]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      const coords = getSvgCoords(e);
      const newX = Math.max(5, Math.min(VB_WIDTH - 5, coords.x - dragging.offsetX));
      const newY = Math.max(5, Math.min(VB_HEIGHT - 5, coords.y - dragging.offsetY));
      onUpdateTablePosition(dragging.tableId, newX, newY);
      return;
    }
    if (panning) {
      // Convert pixel delta to SVG units using getScreenCTM scale
      const svg = svgRef.current;
      const ctm = svg?.getScreenCTM();
      const scaleX = ctm ? 1 / ctm.a : 1;
      const scaleY = ctm ? 1 / ctm.d : 1;
      const dx = (e.clientX - panning.startX) * scaleX;
      const dy = (e.clientY - panning.startY) * scaleY;
      setPan({
        x: panning.startPanX - dx,
        y: panning.startPanY - dy,
      });
    }
  }, [dragging, panning, getSvgCoords, onUpdateTablePosition]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setPanning(null);
  }, []);

  const handleSvgMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start panning if clicking on the SVG background (not a table)
    if ((e.target as Element).tagName === 'svg' || (e.target as Element).tagName === 'line') {
      setPanning({
        startX: e.clientX,
        startY: e.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      });
    }
  }, [pan]);

  const handleTableClick = useCallback((e: React.MouseEvent, table: Table) => {
    if (dragging) return;
    setSelectedTableId(table.id);
    setAnchorPosition({ top: e.clientY, left: e.clientX });
  }, [dragging]);

  // BUG FIX: Use the live table from `tables` prop, not stale `selectedTable` state
  const handleToggleGuest = useCallback((guestId: string) => {
    if (!selectedTableId) return;
    const currentTable = tables.find(t => t.id === selectedTableId);
    if (!currentTable) return;
    const isSeated = currentTable.seats.includes(guestId);
    if (isSeated) {
      onAssignGuests(currentTable.id, currentTable.seats.filter(id => id !== guestId));
    } else if (currentTable.seats.length < currentTable.capacity) {
      onAssignGuests(currentTable.id, [...currentTable.seats, guestId]);
    }
  }, [selectedTableId, tables, onAssignGuests]);

  const handleClosePopover = useCallback(() => {
    setSelectedTableId(null);
    setAnchorPosition(null);
  }, []);

  // Look up the live table from the tables prop
  const currentSelectedTable = selectedTableId ? tables.find(t => t.id === selectedTableId) ?? null : null;

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(MAX_ZOOM, z + ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(MIN_ZOOM, z - ZOOM_STEP));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom(z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta)));
  }, []);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper
        variant="outlined"
        sx={{ flex: 1, position: 'relative', overflow: 'hidden', bgcolor: 'grey.50', minHeight: 0 }}
      >
        {/* Zoom controls */}
        <Box sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          bgcolor: 'background.paper',
          borderRadius: 1,
          boxShadow: 1,
          p: 0.5,
        }}>
          <IconButton size="small" onClick={handleZoomIn} title="Zoom in">
            <ZoomInIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={handleZoomReset} title="Reset zoom">
            <FitScreenIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={handleZoomOut} title="Zoom out">
            <ZoomOutIcon fontSize="small" />
          </IconButton>
          <Typography variant="caption" sx={{ textAlign: 'center', fontSize: '0.65rem', color: 'text.secondary' }}>
            {Math.round(zoom * 100)}%
          </Typography>
        </Box>

        <svg
          ref={svgRef}
          viewBox={viewBox}
          width="100%"
          height="100%"
          style={{ display: 'block', cursor: dragging ? 'grabbing' : panning ? 'grabbing' : 'default' }}
          onMouseDown={handleSvgMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* Grid lines covering the full wide viewBox */}
          {Array.from({ length: 15 }, (_, i) => (i + 1) * 10).map(v => (
            <line key={`v${v}`} x1={v} y1={0} x2={v} y2={VB_HEIGHT} stroke="#e0e0e0" strokeWidth={0.1} />
          ))}
          {Array.from({ length: 9 }, (_, i) => (i + 1) * 10).map(v => (
            <line key={`h${v}`} x1={0} y1={v} x2={VB_WIDTH} y2={v} stroke="#e0e0e0" strokeWidth={0.1} />
          ))}

          {/* Tables */}
          {tables.map(table => {
            const fillColor = getFillColor(table.seats.length, table.capacity);
            const isRound = table.shape === 'round' || table.shape === 'custom';

            // Resolve seated guests for name display
            const seatedGuests = table.seats
              .map(id => guestMap.get(id))
              .filter((g): g is Guest => g != null);

            const fontSize = 1.4;
            const lineHeight = 1.9;
            const padding = 1.2;

            // Determine columns needed: use 2 columns for 9+ guests, 3 for 19+
            const numCols = seatedGuests.length >= 19 ? 3 : seatedGuests.length >= 9 ? 2 : 1;
            const rowsNeeded = Math.ceil(seatedGuests.length / numCols);

            // Size the table to fit all names
            const minContentHeight = rowsNeeded * lineHeight + padding * 2;
            const colWidth = 10; // SVG units per column
            const minContentWidth = numCols * colWidth + padding * 2;

            let shapeW: number, shapeH: number;
            if (isRound) {
              // Radius must encompass all content
              const minRadius = Math.max(minContentHeight / 2 + 1, minContentWidth / 2, 5);
              const baseRadius = Math.max(5, 3 + table.capacity * 0.4);
              const r = Math.max(baseRadius, minRadius);
              shapeW = r; // for round, shapeW = radius
              shapeH = r;
            } else {
              // Rectangular: half-width and half-height
              const baseHalfW = Math.max(6, 3 + table.capacity * 0.3);
              const baseHalfH = Math.max(4, 2 + table.capacity * 0.25);
              shapeW = Math.max(baseHalfW, minContentWidth / 2 + 0.5);
              shapeH = Math.max(baseHalfH, minContentHeight / 2 + 0.5);
            }

            // Label positioning above the shape (with clear gap)
            const shapeTop = isRound ? table.y - shapeW : table.y - shapeH;
            const countY = shapeTop - 1.0;
            const labelY = countY - 2.2;

            // Name area: top of shape interior
            const nameAreaTop = isRound
              ? table.y - shapeW + padding + 1
              : table.y - shapeH + padding + 0.8;

            return (
              <g
                key={table.id}
                style={{ cursor: dragging?.tableId === table.id ? 'grabbing' : 'grab' }}
                onMouseDown={(e) => handleMouseDown(e as unknown as React.MouseEvent, table)}
                onClick={(e) => handleTableClick(e as unknown as React.MouseEvent, table)}
              >
                {isRound ? (
                  <circle
                    cx={table.x}
                    cy={table.y}
                    r={shapeW}
                    fill={fillColor}
                    fillOpacity={0.15}
                    stroke={fillColor}
                    strokeWidth={0.4}
                  />
                ) : (
                  <rect
                    x={table.x - shapeW}
                    y={table.y - shapeH}
                    width={shapeW * 2}
                    height={shapeH * 2}
                    rx={0.5}
                    fill={fillColor}
                    fillOpacity={0.15}
                    stroke={fillColor}
                    strokeWidth={0.4}
                  />
                )}

                {/* Table name — above the shape */}
                <text
                  x={table.x}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="auto"
                  fontSize={2.0}
                  fontWeight={700}
                  fill="#333"
                >
                  {table.name}
                </text>
                {/* Capacity indicator — above the shape, below name */}
                <text
                  x={table.x}
                  y={countY}
                  textAnchor="middle"
                  dominantBaseline="auto"
                  fontSize={1.3}
                  fill="#666"
                >
                  {table.seats.length}/{table.capacity}
                </text>

                {/* Guest names filling the table interior in columns */}
                {seatedGuests.map((guest, i) => {
                  const col = i % numCols;
                  const row = Math.floor(i / numCols);
                  const totalWidth = numCols * colWidth;
                  const xOffset = table.x - totalWidth / 2 + col * colWidth + colWidth / 2;
                  const yPos = nameAreaTop + row * lineHeight;
                  return (
                    <text
                      key={guest.id}
                      x={xOffset}
                      y={yPos}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={fontSize}
                      fill="#444"
                    >
                      {guest.firstName} {guest.lastName.charAt(0)}.
                    </text>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </Paper>

      {/* Table Popover */}
      <Popover
        open={Boolean(currentSelectedTable && anchorPosition)}
        anchorReference="anchorPosition"
        anchorPosition={anchorPosition || undefined}
        onClose={handleClosePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        {currentSelectedTable && (
          <Box sx={{ p: 2, minWidth: 280, maxHeight: 400, overflow: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {currentSelectedTable.name}
              </Typography>
              <Box>
                <IconButton size="small" onClick={() => { handleClosePopover(); onEditTable(currentSelectedTable); }}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => { handleClosePopover(); onDeleteTable(currentSelectedTable.id); }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            <Chip
              label={`${currentSelectedTable.seats.length}/${currentSelectedTable.capacity} seated`}
              size="small"
              color={currentSelectedTable.seats.length >= currentSelectedTable.capacity ? 'error' : 'success'}
              sx={{ mb: 1 }}
            />

            {/* Currently seated */}
            {currentSelectedTable.seats.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" fontWeight={500} color="text.secondary" sx={{ mb: 0.5 }}>
                  Seated:
                </Typography>
                {currentSelectedTable.seats.map(guestId => {
                  const guest = guestMap.get(guestId);
                  if (!guest) return null;
                  return (
                    <FormControlLabel
                      key={guestId}
                      control={
                        <Checkbox
                          checked
                          size="small"
                          onChange={() => handleToggleGuest(guestId)}
                        />
                      }
                      label={`${guest.firstName} ${guest.lastName}`}
                      sx={{ display: 'block', '& .MuiTypography-root': { fontSize: '0.85rem' } }}
                    />
                  );
                })}
              </Box>
            )}

            {/* Available to add */}
            {unassignedGuests.length > 0 && currentSelectedTable.seats.length < currentSelectedTable.capacity && (
              <Box>
                <Typography variant="body2" fontWeight={500} color="text.secondary" sx={{ mb: 0.5 }}>
                  Add guests:
                </Typography>
                {unassignedGuests.slice(0, 20).map(guest => (
                  <FormControlLabel
                    key={guest.id}
                    control={
                      <Checkbox
                        checked={false}
                        size="small"
                        onChange={() => handleToggleGuest(guest.id)}
                      />
                    }
                    label={`${guest.firstName} ${guest.lastName}`}
                    sx={{ display: 'block', '& .MuiTypography-root': { fontSize: '0.85rem' } }}
                  />
                ))}
                {unassignedGuests.length > 20 && (
                  <Typography variant="caption" color="text.secondary">
                    ...and {unassignedGuests.length - 20} more
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        )}
      </Popover>
    </Box>
  );
}
