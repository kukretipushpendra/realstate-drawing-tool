import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Line, Circle } from 'react-konva';
import Konva from 'konva';
import type { Point, DrawingMode, DrawingObject } from './types';
import { useDrawingCanvas } from './useDrawingCanvas';
import { useGridSettings } from './useGridSettings';
import { ShapeRenderer } from './shapes/ShapeRenderer';
import { PropertyPanel } from './PropertyPanel';
import { AddBuildingButton } from './AddBuildingButton';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, RowStyle } from 'ag-grid-community';
import { AngleInputDialog } from './dialogs/AngleInputDialog';
import { KeyboardHelpModal } from './dialogs/KeyboardHelpModal';
import { PIXELS_PER_FOOT, pixelsToFeet, feetToPixels } from './unitConversion';
import { findAlignmentSnaps } from './geometry';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import './DrawingTabContainer.css';
// TODO: Create drawingCalculations utility module
// import {
//   calculateSquareFootage,
//   generateDrawingCalls,
//   generateArcDetails,
//   extractMeasurements,
//   hasMeasurementsChanged,
// } from '../../../utils/drawingCalculations';
// TODO: Create tableExport utility module
// import { exportAndDownload } from '../../../utils/tableExport';

// Placeholder implementations - replace with actual utility functions
const calculateSquareFootage = (_width?: number, _height?: number) => _width && _height ? `${(_width * _height).toFixed(2)}` : '';
const generateDrawingCalls = (_type: DrawingMode, _width?: number, _height?: number, _radius?: number, _angle?: number, _lineLength?: number) => 'Drawing shape';
const generateArcDetails = (_radius?: number, angle?: number) => angle ? `${angle}°` : '';
const extractMeasurements = (props?: Record<string, any>) => ({
  width: props?.width,
  height: props?.height,
  radius: props?.radius,
  angle: props?.angle,
  lineLength: props?.lineLength,
});
const hasMeasurementsChanged = (newMeasurements: any, oldMeasurements: any) => {
  return JSON.stringify(newMeasurements) !== JSON.stringify(oldMeasurements);
};




const GRID_CELL_SIZE_PIXELS = PIXELS_PER_FOOT * 10; // Grid cell size: 10x10 feet = 80 pixels

type TableRow = {
  id: string;
  sequence: number;
  shapeType: DrawingMode;
  class: string;
  adjustments: string;
  drawingCalls: string;
  arcDetails: string;
  sqft: string;
  physicalGood: string;
  buildingNotes: string;
  page: string;
  // Raw measurement data for recalculation and updates
  _width?: number;      // Width in feet
  _height?: number;     // Height in feet
  _radius?: number;     // Arc radius in feet
  _angle?: number;      // Angle in degrees
  _lineLength?: number; // Line length in feet
};

const TOOL_CONFIG: Record<string, { label: string; icon: string }> = {
  freeDraw: { label: 'Free Draw', icon: '✏️' },
  straightLine: { label: 'Line', icon: '📏' },
  orthoLine: { label: 'Vertical/Horizontal Line', icon: '⊞' },
  rectangle: { label: 'Rectangle', icon: '▭' },
  square: { label: 'Square', icon: '◻️' },
  circle: { label: 'Circle', icon: '○' },
  angle: { label: 'Angle', icon: '∠' },
  curve: { label: 'Curve', icon: '↪️' },
  centerView: { label: 'Center View', icon: '⊕' },
  zoomToFit: { label: 'Zoom to Fit', icon: '⊡' },
};

const TOOL_INSTRUCTIONS: Record<string, string> = {
  freeDraw: 'Free Draw Line - click and drag to draw freely, right-click to finish.',
  straightLine: 'Draw Straight Line - click and drag from start point to end point, right-click to cancel.',
  orthoLine: 'Draw Vertical/Horizontal Line - drag horizontally for horizontal line or vertically for vertical line, left-click to submit, right-click to finish.',
  square: 'Draw Square - click and drag from first corner to opposite corner, right-click to cancel.',
  rectangle: 'Draw Rectangle - click and drag from first corner to opposite corner, right-click to cancel.',
  angle: 'Draw Angle - left-click to place angle point.',
  curve: 'Draw Curve Line - click and drag from start point to end point, right-click to cancel.',
  circle: 'Draw Circle - click and drag from center to radius point, right-click to cancel.',
  centerView: 'Center View - left-click on canvas area to center it, right-click to disable.',
  zoomToFit: 'Zoom to Fit - click to automatically zoom and pan to show all buildings.',
};

// Helper function to create a new table row with all required fields
const createTableRow = (
  id: string,
  sequence: number,
  shapeType: DrawingMode,
  options: {
    class?: string;
    adjustments?: string;
    drawingCalls?: string;
    arcDetails?: string;
    sqft?: string;
    physicalGood?: string;
    buildingNotes?: string;
    page?: string;
    // Raw measurements for auto-calculation of derived fields
    width?: number;
    height?: number;
    radius?: number;
    angle?: number;
    lineLength?: number;
  } = {}
): TableRow => {
  // Extract measurements from options
  const measurements = {
    width: options.width,
    height: options.height,
    radius: options.radius,
    angle: options.angle,
    lineLength: options.lineLength,
  };
  
  // Auto-calculate derived fields from measurements if not provided
  const autoSqft = 
    options.sqft || 
    calculateSquareFootage(options.width, options.height);
  
  const autoDrawingCalls = 
    options.drawingCalls || 
    generateDrawingCalls(
      shapeType,
      options.width,
      options.height,
      options.radius,
      options.angle,
      options.lineLength
    );
  
  const autoArcDetails = 
    options.arcDetails || 
    generateArcDetails(options.radius, options.angle);

  return {
    id,
    sequence,
    shapeType,
    class: options.class || '',
    adjustments: options.adjustments || '',
    drawingCalls: autoDrawingCalls,
    arcDetails: autoArcDetails,
    sqft: autoSqft,
    physicalGood: options.physicalGood || '',
    buildingNotes: options.buildingNotes || '',
    page: options.page || '',
    // Store raw measurements for later updates and recalculation
    _width: measurements.width,
    _height: measurements.height,
    _radius: measurements.radius,
    _angle: measurements.angle,
    _lineLength: measurements.lineLength,
  };
};

/**
 * Format measurements from drawing object properties
 * Extracts width, height, radius, angle from properties and formats them
 * for use in table rows.
 */
const formatMeasurements = (
  props?: Record<string, any>
): {
  sqft?: string;
  arcDetails?: string;
  width?: number;
  height?: number;
  radius?: number;
  angle?: number;
  lineLength?: number;
} => {
  if (!props) return {};

  const measurements = extractMeasurements(props);
  
  return {
    sqft: calculateSquareFootage(measurements.width, measurements.height),
    arcDetails: generateArcDetails(measurements.radius, measurements.angle),
    width: measurements.width,
    height: measurements.height,
    radius: measurements.radius,
    angle: measurements.angle,
    lineLength: measurements.lineLength,
  };
};

// Generate grid lines dynamically based on visible area
const generateInfiniteGridLines = (stageX: number, stageY: number, stageWidth: number, stageHeight: number, cellSize: number, zoom: number) => {
  const verticalLines: Array<{ points: number[] }> = [];
  const horizontalLines: Array<{ points: number[] }> = [];

  // Calculate the visible world bounds
  const visibleStartX = -stageX / zoom;
  const visibleEndX = visibleStartX + stageWidth / zoom;
  const visibleStartY = -stageY / zoom;
  const visibleEndY = visibleStartY + stageHeight / zoom;

  // Find the starting grid line positions
  const startX = Math.floor(visibleStartX / cellSize) * cellSize;
  const startY = Math.floor(visibleStartY / cellSize) * cellSize;

  // Generate vertical lines
  for (let x = startX; x <= visibleEndX; x += cellSize) {
    verticalLines.push({
      points: [x, visibleStartY - cellSize, x, visibleEndY + cellSize],
    });
  }

  // Generate horizontal lines
  for (let y = startY; y <= visibleEndY; y += cellSize) {
    horizontalLines.push({
      points: [visibleStartX - cellSize, y, visibleEndX + cellSize, y],
    });
  }

  return { verticalLines, horizontalLines };
};

const DrawingTabContainer: React.FC = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const isDrawing = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const panStart = useRef<{ stageX: number; stageY: number; clientX: number; clientY: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    canvasState,
    mode,
    setMode: hookSetMode,
    addPoint,
    completeObject,
    cancelObject,
    clearCanvas,
    saveDrawing,
    loadDrawing,
    undo,
    redo,
    deleteObject,
    selectObject,
    moveObjectByDelta,
    updateCurrentObjectPoints,
    updateCurrentObjectProperties,
    updateSelectedObjectProperties,
    canUndo,
    canRedo,
  } = useDrawingCanvas();

  const { gridSettings, updateGridSettings, snapPoint, getSnapIndicator } = useGridSettings();

  // Custom setMode that also deselects shapes when a tool is activated
  const setMode = useCallback(
    (newMode: DrawingMode) => {
      hookSetMode(newMode);
      // Deselect any selected shape when activating a drawing tool
      if (newMode !== null) {
        selectObject(null);
      }
    },
    [hookSetMode, selectObject]
  );

  // State for building management (no Redux dependency for standalone component)
  const [buildingList] = useState<any[]>([]);
  const [parcelId] = useState<string>(''); // Empty string if not provided (no Redux)
  const [isEditingAllowed] = useState(true);

  const [tableRows, setTableRows] = useState<TableRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [selectedObject, setSelectedObject] = useState<DrawingObject | null>(null);
  const [hint, setHint] = useState<string>('Select a drawing tool to begin');
  const [zoom, setZoom] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [showAngleDialog, setShowAngleDialog] = useState(false);
  const [angleDialogPos, setAngleDialogPos] = useState<{ x: number; y: number } | undefined>();
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [currentCoords, setCurrentCoords] = useState({ xPx: 0, yPx: 0, xFt: 0, yFt: 0 });
  const [snapIndicator, setSnapIndicator] = useState<{ x: number; y: number; visible: boolean } | null>(null);
  const [alignmentGuides, setAlignmentGuides] = useState<{ x?: number; y?: number }>({});
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false); // Sidebar is hidden by default
  const [localBuildingsAdded, setLocalBuildingsAdded] = useState(0); // Track locally-added buildings for UI updates
  const lastEndpointRef = useRef<{ x: number; y: number } | null>(null);
  const lastAngleEndpointRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [windowSize, setWindowSize] = useState({ width: typeof window !== 'undefined' ? window.innerWidth : 1000, height: typeof window !== 'undefined' ? window.innerHeight : 600 });

  // Handle window resize to update canvas dimensions
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate canvas dimensions based on fullscreen state
  const canvasWidth = isFullscreen ? windowSize.width : windowSize.width - 40;
  const canvasHeight = isFullscreen ? windowSize.height - 120 : windowSize.height - 320;

  // Calculate initial position with -2 feet margin from left and bottom
  const marginFeetPixels = 2 * PIXELS_PER_FOOT; // 2 feet margin = 8 pixels
  const initialStageX = marginFeetPixels;
  const initialStageY = canvasHeight - marginFeetPixels;

  const gridLines = generateInfiniteGridLines(stagePos.x, stagePos.y, canvasWidth, canvasHeight, GRID_CELL_SIZE_PIXELS, zoom);

  // Initialize stage position to show (0,0) at bottom-left on load
  useEffect(() => {
    setStagePos({
      x: initialStageX,
      y: initialStageY,
    });
  }, []);

  // Reset local buildings counter when parcel changes
  useEffect(() => {
    setLocalBuildingsAdded(0);
  }, [parcelId]);

  // Update stage position when canvas dimensions change (e.g., fullscreen toggle)
  useEffect(() => {
    // When fullscreen state changes, recalculate and update stage position
    // This ensures axes appear at correct position with new canvas dimensions
    setStagePos({
      x: initialStageX,
      y: initialStageY,
    });
    setZoom(1);
  }, [initialStageX, initialStageY, isFullscreen]);

  const handleToggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        // Enter fullscreen
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        } else if ((containerRef.current as any)?.webkitRequestFullscreen) {
          // Safari support
          (containerRef.current as any).webkitRequestFullscreen();
          setIsFullscreen(true);
        } else if ((containerRef.current as any)?.msRequestFullscreen) {
          // IE11 support
          (containerRef.current as any).msRequestFullscreen();
          setIsFullscreen(true);
        }
      } else {
        // Exit fullscreen
        if (document.fullscreenElement) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        } else if ((document as any).webkitFullscreenElement) {
          (document as any).webkitExitFullscreen();
          setIsFullscreen(false);
        } else if ((document as any).msFullscreenElement) {
          (document as any).msExitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  };

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).msFullscreenElement);
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const getHintText = (): string => {
    if (!mode) return 'Select a tool to start drawing';
    
    // Return tool-specific instruction
    const instruction = TOOL_INSTRUCTIONS[mode];
    if (instruction) return instruction;
    
    return `${mode}: Click to start drawing`;
  };

  // ============================================================
  // Phase 2: Real-Time Property Synchronization (Methods)
  // ============================================================
  
  /**
   * Update a table row when its canvas object properties change
   * This is called when the user modifies a shape after creation
   */
  const updateTableRowFromCanvas = useCallback((objectId: string) => {
    const canvasObject = canvasState.objects.find((obj: any) => obj.id === objectId);
    const tableRow = tableRows.find((r) => r.id === objectId);
    
    if (!canvasObject || !tableRow) return;
    
    const measurements = extractMeasurements(canvasObject.properties);
    
    // Check if any measurements actually changed
    if (!hasMeasurementsChanged(measurements, {
      width: tableRow._width,
      height: tableRow._height,
      radius: tableRow._radius,
      angle: tableRow._angle,
      lineLength: tableRow._lineLength,
    })) {
      return; // No changes, skip update
    }
    
    // Update the row with new measurements
    const updatedRow: TableRow = {
      ...tableRow,
      drawingCalls: generateDrawingCalls(
        tableRow.shapeType,
        measurements.width,
        measurements.height,
        measurements.radius,
        measurements.angle,
        measurements.lineLength
      ),
      arcDetails: generateArcDetails(measurements.radius, measurements.angle),
      sqft: calculateSquareFootage(measurements.width, measurements.height),
      _width: measurements.width,
      _height: measurements.height,
      _radius: measurements.radius,
      _angle: measurements.angle,
      _lineLength: measurements.lineLength,
    };
    
    setTableRows((rows) =>
      rows.map((r) => (r.id === objectId ? updatedRow : r))
    );
  }, [canvasState.objects, tableRows]);

  // ============================================================
  // Phase 3: Enhanced CRUD Operations (Methods)
  // ============================================================

  // Note: handleDeleteWithResequencing functionality is handled by handleDelete instead

  // Note: moveRow functionality can be implemented when drag-and-drop table reordering is needed

  // ============================================================
  // Phase 4: Table Editing Support (Methods)
  // ============================================================

  // Note: handleTableCellChange can be implemented for editable table cells

  // ============================================================
  // Phase 6: Export Support (Methods)
  // ============================================================

  // Note: handleExport can be implemented when export functionality is needed

  useEffect(() => {
    if (isFirstLoad && !mode) {
      setHint('Select a tool to start drawing');
    } else if (mode) {
      const instruction = TOOL_INSTRUCTIONS[mode];
      if (instruction) {
        setHint(instruction);
      } else {
        setHint(`${mode}: Click to start drawing`);
      }
    }
  }, [mode, isFirstLoad]);

  // Open angle dialog immediately when angle tool is selected
  useEffect(() => {
    if (mode === 'angle') {
      // Use last angle endpoint if available, otherwise use last endpoint of any shape
      let dialogPos = lastAngleEndpointRef.current || lastEndpointRef.current;
      if (!dialogPos) {
        // Default to center of canvas if no previous shape
        dialogPos = { x: 0, y: 0 };
      }
      setAngleDialogPos(dialogPos);
      setShowAngleDialog(true);
    }
  }, [mode]);

  // Clean up when tool/mode changes: cancel incomplete drawing, deselect shapes
  useEffect(() => {
    // This is the cleanup when mode changes (tool switching)
    // Note: This effect runs when mode changes, but we're inside the effect
    // to handle the transition between tools
    // If user is switching FROM a tool (mode was something, now it's null or different)
    // we should reset drawing state, but we let the mouse handlers manage that
    // The key is just ensuring ShapeRenderer won't interfere with the new tool
  }, [mode]);

  // Phase 2: Watch canvas object property changes and sync to table row
  useEffect(() => {
    if (canvasState.selectedId && selectedRow === canvasState.selectedId) {
      const selectedCanvasObject = canvasState.objects.find((obj: any) => obj.id === canvasState.selectedId);
      if (selectedCanvasObject) {
        updateTableRowFromCanvas(canvasState.selectedId);
      }
    }
  }, [canvasState.selectedId, canvasState.currentObject?.properties, updateTableRowFromCanvas, selectedRow, canvasState.objects]);

  // Keyboard listener for zoom, pan, and undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show keyboard help with ? key
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowKeyboardHelp(true);
      }
      // Close keyboard help with Escape
      else if (e.key === 'Escape') {
        e.preventDefault();
        // Close help modal if open
        if (showKeyboardHelp) {
          setShowKeyboardHelp(false);
        }
        // Cancel current drawing if in drawing mode
        else if (mode && mode !== 'centerView') {
          setMode(null);
        }
        // Deselect shape if any is selected
        else if (canvasState.selectedId) {
          selectObject(null);
          setSelectedRow(null);
        }
      }
      // Undo with Ctrl+Z
      else if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Redo with Ctrl+Y or Ctrl+Shift+Z
      else if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        redo();
      }
      // Zoom in with +/= key or Ctrl+Arrow Up
      else if ((e.key === '+' || e.key === '=') || (e.ctrlKey && e.key === 'ArrowUp')) {
        e.preventDefault();
        setZoom((prev) => Math.min(prev * 1.2, 5));
      }
      // Zoom out with - key or Ctrl+Arrow Down
      else if (e.key === '-' || (e.ctrlKey && e.key === 'ArrowDown')) {
        e.preventDefault();
        setZoom((prev) => Math.max(prev / 1.2, 0.1));
      }
      // Pan with arrow keys
      else if (e.key === 'ArrowUp' && !e.ctrlKey) {
        e.preventDefault();
        setStagePos((prev) => ({ ...prev, y: prev.y + 30 }));
      } else if (e.key === 'ArrowDown' && !e.ctrlKey) {
        e.preventDefault();
        setStagePos((prev) => ({ ...prev, y: prev.y - 30 }));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setStagePos((prev) => ({ ...prev, x: prev.x + 30 }));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setStagePos((prev) => ({ ...prev, x: prev.x - 30 }));
      }
      // Delete selected object
      else if (e.key === 'Delete' || e.key === 'Del') {
        if (canvasState.selectedId) {
          e.preventDefault();
          deleteObject(canvasState.selectedId);
          // remove from table rows
          setTableRows((rows) => rows.filter((r) => r.id !== canvasState.selectedId));
          setSelectedRow(null);
          selectObject(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, deleteObject, canvasState.selectedId, selectObject, showKeyboardHelp, mode, setMode]);

  // Sync selectedObject with selectedRow and canvasState
  // Auto-show sidebar when shape is selected, auto-hide when deselected
  useEffect(() => {
    if (selectedRow && canvasState.objects) {
      const obj = canvasState.objects.find((o: any) => o.id === selectedRow);
      setSelectedObject(obj || null);
      // Auto-show sidebar when a shape is selected
      if (obj) {
        setSidebarVisible(true);
      }
    } else {
      setSelectedObject(null);
      // Auto-hide sidebar when no shape is selected
      setSidebarVisible(false);
      // Clear alignment guides when deselecting
      setAlignmentGuides({});
    }
  }, [selectedRow, canvasState.objects]);

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const event = e.evt;

    // Handle middle-click pan start (button 1)
    if (event.button === 1) {
      e.evt.preventDefault();
      panStart.current = {
        stageX: stagePos.x,
        stageY: stagePos.y,
        clientX: event.clientX,
        clientY: event.clientY,
      };
      return;
    }

    // Deselect shape on left-click in empty canvas area (when no tool is active)
    if (!mode && event.button === 0) {
      // Check if click was on stage background (not on a shape)
      const stage = stageRef.current;
      if (stage) {
        const pointerPos = stage.getPointerPosition();
        if (pointerPos) {
          const clickedShape = stage.getIntersection(pointerPos);
          // If no shape was clicked (clicked on empty canvas), deselect
          if (!clickedShape || clickedShape.name() === '') {
            selectObject(null);
            setSelectedRow(null);
          }
        }
      }
      return;
    }

    // Allow shape selection clicks via ShapeRenderer even if no tool is active
    if (!mode) {
      // Don't prevent propagation - let shape clicks through
      return;
    }

    // Mark that we've moved past the first load
    if (isFirstLoad) {
      setIsFirstLoad(false);
    }

    const stage = stageRef.current;
    if (!stage) return;

    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    // Convert screen coordinates to world coordinates
    let worldX = (pointerPos.x - stagePos.x) / zoom;
    let worldY = (pointerPos.y - stagePos.y) / zoom;
    
    // Apply snap-to-grid if enabled
    const snappedPoint = snapPoint({ x: worldX, y: worldY });
    const worldPoint = snappedPoint;

    if (event.button === 0) {
      // Left click
      if (mode === 'centerView') {
        // Center View tool - center the canvas on the clicked point
        // Get the actual container dimensions accounting for all offsets
        const stage = stageRef.current;
        if (!stage) return;
        
        const canvasContainer = stage.getStage().container();
        if (!canvasContainer) return;
        
        const rect = canvasContainer.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        
        // Calculate new stage position to center the clicked point
        const newStageX = -(worldX * zoom) + width / 2;
        const newStageY = -(worldY * zoom) + height / 2;
        
        setStagePos({ x: newStageX, y: newStageY });
        
        // Keep the tool enabled for next click
        return;
      } else if (mode === 'freeDraw') {
        // Free draw - start continuous drawing
        if (!isDrawing.current) {
          isDrawing.current = true;
          lastPointRef.current = worldPoint;
          addPoint(worldPoint);
        }
      } else if (mode === 'angle') {
        // Angle tool - modal already opened, ignore clicks
        return;
      } else {
        // For geometric shapes - check if this is a submission or start of new shape
        if (isDrawing.current) {
          // Check if we should submit based on current points
          const pointsCount = canvasState.currentObject?.points?.length || 0;
          
          // For curve tool: submit when we have 3 points (baseline + control point)
          // For other tools: submit when we have 2 points
          const shouldSubmit = (mode === 'curve' && pointsCount === 3) || 
                              (mode !== 'curve' && pointsCount === 2);
          
          if (shouldSubmit) {
            // Capture endpoint BEFORE completing the shape
            const endpoint = canvasState.currentObject?.points?.[1] || 
                           canvasState.currentObject?.points?.[canvasState.currentObject.points.length - 1];
            
            // Submit current shape and prepare for next one
            completeObject();
            
            // Store the endpoint for next tool (angle tool, etc.) - ALWAYS store endpoint, never startpoint
            // Note: Curves don't use endpoint memory - each curve is independent
            if (mode !== 'curve' && endpoint) {
              lastEndpointRef.current = endpoint;
            }
            if (mode === 'orthoLine') {
              lastAngleEndpointRef.current = null; // Reset angle endpoint when new shape is created
            }
            
            // Add to table
            setTimeout(() => {
              if (canvasState.currentObject) {
                const measurements = formatMeasurements(canvasState.currentObject.properties);
                const newRow: TableRow = createTableRow(
                  canvasState.currentObject.id || `row_${Date.now()}`,
                  tableRows.length + 1,
                  mode,
                  {
                    adjustments: '',
                    drawingCalls: `${TOOL_CONFIG[mode]?.label || mode} completed`,
                    ...measurements,
                  }
                );
                setTableRows((rows) => [...rows, newRow]);
                setSelectedRow(newRow.id);
              }
            }, 0);

            // For ortho lines, store the endpoint and start from there
            if (mode === 'orthoLine' && endpoint) {
              isDrawing.current = true;
              lastPointRef.current = endpoint;
              addPoint(endpoint);
            } else {
              // For curves and other shapes, start new shape from the current click point
              isDrawing.current = true;
              lastPointRef.current = worldPoint;
              addPoint(worldPoint);
            }
          } else {
            // Not ready to submit yet, continue adding points
            if (mode === 'curve' && pointsCount === 2) {
              // Curve tool: after baseline is set, ensure p2 is exactly at cursor before adding control point
              // This eliminates any gap between cursor and curve endpoint
              const currentPoints = [...(canvasState.currentObject?.points || [])];
              if (currentPoints.length >= 2) {
                currentPoints[1] = { x: worldX, y: worldY };
                updateCurrentObjectPoints(currentPoints);
              }
              // Now add the control point
              addPoint(worldPoint);
            } else if (pointsCount === 1) {
              // Regular tools: add second point
              addPoint(worldPoint);
            }
          }
        } else if (!isDrawing.current) {
          // Start new shape
          isDrawing.current = true;
          lastPointRef.current = worldPoint;
          addPoint(worldPoint);
        }
      }
    } else if (event.button === 2) {
      // Right click - stop shape generation or disable centerView tool
      event.preventDefault();
      
      if (mode === 'centerView') {
        // Disable centerView tool
        setMode(null);
        setHint('Ready');
        return;
      } else if (mode === 'freeDraw') {
        // For free draw, complete the current shape if it has points
        if (canvasState.currentObject?.points?.length) {
          // Capture endpoint (last point) BEFORE completing
          const points = canvasState.currentObject.points;
          const endpoint = points[points.length - 1];
          
          completeObject();
          
          // Store the endpoint for next tool
          lastEndpointRef.current = endpoint;
          lastAngleEndpointRef.current = null; // Reset angle endpoint when new shape is created
          
          // Add to table
          setTimeout(() => {
            if (canvasState.currentObject) {
              const measurements = formatMeasurements(canvasState.currentObject.properties);
              const newRow: TableRow = createTableRow(
                canvasState.currentObject.id || `row_${Date.now()}`,
                tableRows.length + 1,
                mode,
                {
                  adjustments: '',
                  drawingCalls: 'Free Draw completed',
                  ...measurements,
                }
              );
              setTableRows((rows) => [...rows, newRow]);
              setSelectedRow(newRow.id);
            }
          }, 0);
        }
      } else {
        // For geometric shapes, cancel any incomplete shape
        if (canvasState.currentObject?.points?.length) {
          cancelObject();
        }
      }
      
      isDrawing.current = false;
      lastPointRef.current = null;
      // Don't clear lastEndpointRef - keep it for next tool
      // But reset angle endpoint since we're stopping drawing mode
      lastAngleEndpointRef.current = null;
      setMode(null);
      setHint('Ready');
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Handle middle-click pan
    if (panStart.current) {
      const dx = e.evt.clientX - panStart.current.clientX;
      const dy = e.evt.clientY - panStart.current.clientY;

      setStagePos({
        x: panStart.current.stageX + dx,
        y: panStart.current.stageY + dy,
      });
      return;
    }
    const stage = stageRef.current;
    if (!stage) return;

    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    // Convert screen coordinates to world coordinates
    let worldX = (pointerPos.x - stagePos.x) / zoom;
    let worldY = (pointerPos.y - stagePos.y) / zoom;

    // Provide snap indicator based on the original world coords
    try {
      const indicator = getSnapIndicator({ x: worldX, y: worldY });
      setSnapIndicator(indicator);
    } catch (err) {
      setSnapIndicator(null);
    }

    // Apply snap-to-grid if enabled
    const snappedPoint = snapPoint({ x: worldX, y: worldY });
    worldX = snappedPoint.x;
    worldY = snappedPoint.y;

    // Update current coordinates in both pixels and feet
    setCurrentCoords({
      xPx: Math.round(worldX * 10) / 10,
      yPx: Math.round(worldY * 10) / 10,
      xFt: Math.round(pixelsToFeet(worldX) * 10) / 10,
      yFt: -Math.round(pixelsToFeet(worldY) * 10) / 10,
    });

    if (!isDrawing.current || mode === 'angle' || !mode) return;
    if (!lastPointRef.current) return;

    if (mode === 'freeDraw') {
      // Free draw - add points with minimum distance threshold
      const dx = worldX - lastPointRef.current.x;
      const dy = worldY - lastPointRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 3) {
        lastPointRef.current = { x: worldX, y: worldY };
        addPoint({ x: worldX, y: worldY });
      }
    } else if (mode === 'orthoLine') {
      // Ortho line - constrain to horizontal or vertical based on movement direction
      if (canvasState.currentObject?.points?.length === 1) {
        const startPoint = canvasState.currentObject.points[0];
        const dx = Math.abs(worldX - startPoint.x);
        const dy = Math.abs(worldY - startPoint.y);
        
        // Determine if horizontal or vertical based on which delta is larger
        let endPoint: { x: number; y: number };
        if (dx > dy) {
          // Horizontal line - keep Y the same
          endPoint = { x: worldX, y: startPoint.y };
        } else {
          // Vertical line - keep X the same
          endPoint = { x: startPoint.x, y: worldY };
        }
        
        const currentPoints = [...(canvasState.currentObject.points || [])];
        currentPoints.push(endPoint);
        updateCurrentObjectPoints(currentPoints);
      } else if (canvasState.currentObject?.points?.length === 2) {
        const startPoint = canvasState.currentObject.points[0];
        const dx = Math.abs(worldX - startPoint.x);
        const dy = Math.abs(worldY - startPoint.y);
        
        let endPoint: { x: number; y: number };
        if (dx > dy) {
          endPoint = { x: worldX, y: startPoint.y };
        } else {
          endPoint = { x: startPoint.x, y: worldY };
        }
        
        const currentPoints = [...(canvasState.currentObject.points || [])];
        currentPoints[1] = endPoint;
        updateCurrentObjectPoints(currentPoints);
      }
    } else if (mode === 'curve') {
      // Curve tool - baseline first, then control point for curve
      if (canvasState.currentObject?.points?.length === 1) {
        // Show baseline as second point (user dragging to set baseline endpoint)
        const currentPoints = [...(canvasState.currentObject.points || [])];
        if (currentPoints.length === 1) {
          currentPoints.push({ x: worldX, y: worldY });
        } else {
          currentPoints[1] = { x: worldX, y: worldY };
        }
        updateCurrentObjectPoints(currentPoints);
      } else if (canvasState.currentObject?.points?.length === 2) {
        // Update baseline endpoint as user continues dragging before clicking
        const currentPoints = [...(canvasState.currentObject.points || [])];
        currentPoints[1] = { x: worldX, y: worldY };
        updateCurrentObjectPoints(currentPoints);
      } else if (canvasState.currentObject?.points?.length === 3) {
        // Update the control point as user continues to drag
        const currentPoints = [...(canvasState.currentObject.points || [])];
        currentPoints[2] = { x: worldX, y: worldY };
        updateCurrentObjectPoints(currentPoints);
      }
    } else {
      // For all other geometric shapes - update preview with second point
      if (canvasState.currentObject?.points?.length === 1) {
        const currentPoints = [...(canvasState.currentObject.points || [])];
        currentPoints.push({ x: worldX, y: worldY });
        updateCurrentObjectPoints(currentPoints);
      } else if (canvasState.currentObject?.points?.length === 2) {
        const currentPoints = [...(canvasState.currentObject.points || [])];
        currentPoints[1] = { x: worldX, y: worldY };
        updateCurrentObjectPoints(currentPoints);
      }
    }
  };

  const handleMouseUp = () => {
    // Reset middle-click pan state
    if (panStart.current) {
      panStart.current = null;
      return;
    }

    // For the new behavior, shape submission happens on left click (in handleMouseDown)
    // So we don't need to do anything on mouse up
    // The isDrawing flag remains true to allow continuous drawing
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    const wheelEvent = e.evt as WheelEvent;
    e.evt.preventDefault();
    // e.stopPropagation();

    const stage = stageRef.current;
    if (!stage) return;

    // Calculate zoom factor based on scroll direction
    const scaleBy = 1.15;
    const oldScale = zoom;
    const newScale = wheelEvent.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const constrainedZoom = Math.max(0.1, Math.min(5, newScale));

    // Get pointer position for zoom-to-cursor effect
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) {
      setZoom(constrainedZoom);
      return;
    }

    // Calculate new stage position to keep the cursor point stable during zoom
    const mouseWorldX = (pointerPos.x - stagePos.x) / oldScale;
    const mouseWorldY = (pointerPos.y - stagePos.y) / oldScale;

    const newStageX = pointerPos.x - mouseWorldX * constrainedZoom;
    const newStageY = pointerPos.y - mouseWorldY * constrainedZoom;

    setZoom(constrainedZoom);
    setStagePos({ x: newStageX, y: newStageY });
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev * 1.2, 5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev / 1.2, 0.1));
  const handleZoomReset = () => {
    setZoom(1);
    setStagePos({
      x: initialStageX,
      y: initialStageY,
    });
  };

  const handleZoomToFit = () => {
    // If no objects on canvas, reset to initial view
    if (canvasState.objects.length === 0) {
      handleZoomReset();
      setHint('No buildings on canvas - showing default view');
      return;
    }

    // Calculate bounding box of all objects
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    canvasState.objects.forEach((obj: any) => {
      obj.points.forEach((point: any) => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });
    });

    // Handle case where minX/maxX or minY/maxY are still Infinity (no valid points)
    if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) {
      handleZoomReset();
      setHint('No valid shapes on canvas');
      return;
    }

    // If all points are the same (single point), add padding
    let width = maxX - minX;
    let height = maxY - minY;

    if (width === 0 && height === 0) {
      minX -= 100;
      minY -= 100;
      maxX += 100;
      maxY += 100;
      width = 200;
      height = 200;
    } else if (width === 0) {
      minX -= 50;
      maxX += 50;
      width = 100;
    } else if (height === 0) {
      minY -= 50;
      maxY += 50;
      height = 100;
    }

    // Add 15% padding around the bounding box for better visibility
    const paddingPercent = 0.15;
    const paddingX = width * paddingPercent;
    const paddingY = height * paddingPercent;

    const boundingBox = {
      x: minX - paddingX,
      y: minY - paddingY,
      width: width + paddingX * 2,
      height: height + paddingY * 2,
    };

    // Get canvas dimensions
    const canvasWidth2D = isFullscreen ? windowSize.width : windowSize.width - 40;
    const canvasHeight2D = isFullscreen ? windowSize.height - 120 : windowSize.height - 320;

    // Calculate zoom to fit bounding box in canvas, ensuring we can see all in both directions
    const scaleX = canvasWidth2D / boundingBox.width;
    const scaleY = canvasHeight2D / boundingBox.height;
    // Use the smaller scale to ensure everything fits, don't cap zoom too low
    const newZoom = Math.min(scaleX, scaleY);
    // Cap at reasonable limits
    const constrainedZoom = Math.max(0.1, Math.min(newZoom, 3));

    // Calculate center of bounding box
    const centerX = boundingBox.x + boundingBox.width / 2;
    const centerY = boundingBox.y + boundingBox.height / 2;

    // Calculate new stage position to center the bounding box in the canvas
    const newStageX = -centerX * constrainedZoom + canvasWidth2D / 2;
    const newStageY = -centerY * constrainedZoom + canvasHeight2D / 2;

    setZoom(constrainedZoom);
    setStagePos({ x: newStageX, y: newStageY });
    setHint(`Zoomed to fit all ${canvasState.objects.length} building(s)`);
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all drawings?')) {
      clearCanvas();
      setTableRows([]);
      setSelectedRow(null);
      setHint('Canvas cleared');
    }
  };

  const handleSave = () => {
    saveDrawing();
    setHint('Drawing saved!');
    setTimeout(() => {
      setHint(getHintText());
    }, 2000);
  };

  const handleLoad = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const success = loadDrawing(data);
        
        if (success) {
          setHint('Drawing loaded successfully!');
          setTableRows([]);
          setSelectedRow(null);
          
          // Extract objects from loaded data
          const objects = data.canvasState?.objects || data.objects || [];
          
          // Rebuild table rows from loaded objects
          objects.forEach((obj: any, index: number) => {
            const measurements = extractMeasurements(obj.properties);
            const newRow: TableRow = createTableRow(
              obj.id,
              index + 1,
              obj.type,
              {
                class: obj.properties?.class || '',
                adjustments: obj.properties?.adjustments || '',
                width: measurements.width,
                height: measurements.height,
                radius: measurements.radius,
                angle: measurements.angle,
                lineLength: measurements.lineLength,
                physicalGood: obj.properties?.physicalGood || '',
                buildingNotes: obj.properties?.buildingNotes || '',
                page: obj.properties?.page || '',
              }
            );
            setTableRows((rows) => [...rows, newRow]);
          });

          setTimeout(() => {
            setHint(getHintText());
          }, 2000);
        } else {
          setHint('Failed to load drawing - invalid format');
          setTimeout(() => {
            setHint(getHintText());
          }, 3000);
        }
      } catch (error) {
        setHint('Error loading file: ' + (error instanceof Error ? error.message : 'Unknown error'));
        setTimeout(() => {
          setHint(getHintText());
        }, 3000);
      }
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAngleDialogDraw = (angleDegree: number, lineLengthFeet: number) => {
    // Always use angleDialogPos as the start point - it's already set correctly by the useEffect
    // to either the last angle endpoint or the last shape startpoint
    const startPoint = angleDialogPos;
    if (!startPoint) return;

    // Convert line length from feet to pixels
    const lineLength = feetToPixels(lineLengthFeet);

    // Calculate the endpoint of the angle line for future tool usage
    // Same calculation as in AngleLine component (angle is negated)
    const angleRad = (-(angleDegree * Math.PI) / 180);
    const endPoint = {
      x: startPoint.x + lineLength * Math.cos(angleRad),
      y: startPoint.y + lineLength * Math.sin(angleRad),
    };

    // Create angle object with properties using world coordinates
    addPoint(startPoint);
    setTimeout(() => {
      updateCurrentObjectProperties({
        angleDegree,
        lineLength,
      });
      completeObject();
      
      // Store the endpoint of the angle line ONLY in lastAngleEndpointRef
      // Also update lastEndpointRef so next regular shape knows where we ended
      lastEndpointRef.current = endPoint;
      lastAngleEndpointRef.current = endPoint;
      
      // Add to table
      setTimeout(() => {
        if (canvasState.currentObject) {
          const measurements = formatMeasurements(canvasState.currentObject.properties);
          const newRow: TableRow = createTableRow(
            canvasState.currentObject.id || `row_${Date.now()}`,
            tableRows.length + 1,
            mode,
            {
              adjustments: '',
              drawingCalls: `Angle: ${angleDegree}°, Length: ${(lineLengthFeet).toFixed(2)} ft`,
              arcDetails: `${angleDegree}°`,
              ...measurements,
            }
          );
          setTableRows((rows) => [...rows, newRow]);
          setSelectedRow(newRow.id);
        }
      }, 0);
    }, 0);

    setShowAngleDialog(false);
    setAngleDialogPos(undefined);
    // Reset mode after successful angle draw so next angle tool click opens dialog immediately
    setMode(null);
    setHint('Ready');
  };

  const handleAngleDialogCancel = () => {
    setShowAngleDialog(false);
    setAngleDialogPos(undefined);
    setMode(null);
    setHint('Ready');
  };

  const handlePropertyChange = (properties: Record<string, any>) => {
    if (selectedObject && canvasState.selectedId) {
      // Update the selected completed object, not the current drawing
      updateSelectedObjectProperties(properties);
    }
  };

  const handleDelete = () => {
    if (selectedRow) {
      // Find the index of the selected row
      const selectedIndex = tableRows.findIndex((r) => r.id === selectedRow);
      
      // Delete from table
      const updatedRows = tableRows.filter((r) => r.id !== selectedRow);
      setTableRows(updatedRows);
      
      // Delete from canvas
      deleteObject(selectedRow);
      
      // Determine which row to select next
      if (updatedRows.length === 0) {
        // No rows left, clear selection
        setSelectedRow(null);
      } else if (selectedIndex >= updatedRows.length) {
        // Deleted row was the last one, select the new last row
        setSelectedRow(updatedRows[updatedRows.length - 1].id);
      } else {
        // Deleted row was first or middle, select the next row
        setSelectedRow(updatedRows[selectedIndex].id);
      }
    }
  };

  const columnDefs: ColDef<TableRow>[] = [
    { headerName: 'Seq', field: 'sequence', flex: 0.4, minWidth: 50 },
    { headerName: 'Type', field: 'shapeType', flex: 0.6, minWidth: 80 },
    { headerName: 'Class', field: 'class', flex: 0.7, minWidth: 100 },
    { headerName: 'Drawing Adjustments', field: 'adjustments', flex: 1, minWidth: 120 },
    { headerName: 'Drawing Calls', field: 'drawingCalls', flex: 1.2, minWidth: 150 },
    { headerName: 'Arc Details', field: 'arcDetails', flex: 1, minWidth: 120 },
    { 
      headerName: 'Sqft', 
      field: 'sqft', 
      flex: 0.6, 
      minWidth: 100,
      valueFormatter: (params) => params.value ? `${params.value} sq ft` : '-',
    },
    { headerName: 'Physical Good', field: 'physicalGood', flex: 0.8, minWidth: 100 },
    { headerName: 'Building Notes', field: 'buildingNotes', flex: 1, minWidth: 120 },
    { headerName: 'Page', field: 'page', flex: 0.5, minWidth: 60 },
  ];

  /**
   * Handle new building addition
   * Called after a new building is created via AddBuildingButton
   */
  const handleBuildingAdded = (buildingId: string, buildingSequence: number) => {
    setHint(`Building ${buildingSequence} added successfully!`);
    
    // Increment local buildings counter for UI display
    setLocalBuildingsAdded((prev) => prev + 1);
    
    // Add building to table rows if needed
    const newRow: TableRow = createTableRow(
      buildingId,
      buildingSequence,
      'building' as DrawingMode,
      {
        class: '',
        adjustments: '',
        drawingCalls: '',
        arcDetails: '',
        sqft: '',
        physicalGood: '85',
        buildingNotes: 'New building',
        page: '1',
      }
    );
    setTableRows((prev) => [...prev, newRow]);
    setTimeout(() => {
      setHint(getHintText());
    }, 3000);
  };

  return (
    <div className="drawing-tab-container" ref={containerRef}>
      {/* Top Toolbar */}
      <div className="drawing-toolbar">
        {/* Drawing Tools */}
        <div className="toolbar-center" style={{ flex: 1 }}>
          <div className="tool-buttons">
            {Object.entries(TOOL_CONFIG).map(([toolKey, config]) => (
              <button
                key={toolKey}
                className={`tool-button ${mode === toolKey ? 'active' : ''}`}
                onClick={() => {
                  // Handle zoomToFit as a one-click action, not a persistent mode
                  if (toolKey === 'zoomToFit') {
                    handleZoomToFit();
                  } else {
                    setMode(mode === toolKey ? null : (toolKey as DrawingMode));
                  }
                }}
                title={config.label}
              >
                <span>{config.icon}</span>
              </button>
            ))}
              {/* Fullscreen Toggle */}
              <button
                className="tool-button"
                onClick={handleToggleFullscreen}
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? '⛶' : '◲'}
              </button>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button
              className="action-button"
              onClick={handleSave}
              title="Save Drawing"
            >
              💾
            </button>
            <button
              className="action-button"
              onClick={undo}
              title="Undo Last Action"
            >
              ↶
            </button>
            <button
              className="action-button"
              onClick={handleClear}
              title="Clear Canvas"
            >
              🗑️
            </button>
            <button
              className="action-button"
              onClick={() => setShowKeyboardHelp(true)}
              title="Keyboard Help (?)  "
            >
              ?
            </button>
            <AddBuildingButton
              parcelId={parcelId}
              existingBuildingCount={(buildingList?.length || 0) + localBuildingsAdded}
              onBuildingAdded={handleBuildingAdded}
              disabled={!parcelId}
              isEditingAllowed={isEditingAllowed}
            />
          </div>

          {/* Zoom Controls */}
          <div className="zoom-controls">
            <button
              className="zoom-button"
              onClick={handleZoomOut}
              title="Zoom Out"
            >
              −
            </button>
            <span className="zoom-display">{(zoom * 100).toFixed(0)}%</span>
            <button
              className="zoom-button"
              onClick={handleZoomIn}
              title="Zoom In"
            >
              +
            </button>
            <button
              className="zoom-button"
              onClick={handleZoomReset}
              title="Reset Zoom"
            >
              ↺
            </button>
          </div>

          {/* Current Coordinates Display */}
          <div className="coordinates-display">
            <span className="coordinates-label">Feet:</span>
            <span className="coordinates-value">({currentCoords.xFt.toFixed(1)}, {currentCoords.yFt.toFixed(1)})</span>
            {/* <span style={{ margin: '0 8px' }}>—</span>
            <span className="coordinates-label">Pixels:</span>
            <span className="coordinates-value">({currentCoords.xPx.toFixed(1)}, {currentCoords.yPx.toFixed(1)})</span> */}
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="canvas-wrapper" data-sidebar-visible={sidebarVisible}>
        {/* Main Canvas Section */}
        <div className="canvas-main">
          {/* Hint Bar */}
          <div className="canvas-hint">
            {hint}
          </div>

          {/* Drawing Canvas */}
          <div className="canvas-container">
            <Stage
              key={`stage-${isFullscreen ? 'fullscreen' : 'normal'}`}
              ref={stageRef}
              width={canvasWidth}
              height={canvasHeight}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => { panStart.current = null; }}
              onContextMenu={(e) => e.evt.preventDefault()}
              onWheel={handleWheel}
              scale={{ x: zoom, y: zoom }}
              position={stagePos}
              style={{ cursor: 'default' }}
            >
              <Layer>
                {/* Grid */}
                {gridSettings.enabled && gridSettings.visible && (
                  <>
                    {gridLines.verticalLines.map((line, idx) => (
                      <Line key={`v-${idx}`} points={line.points} stroke={gridSettings.gridColor} strokeWidth={0.5} dash={[3, 3]} />
                    ))}
                    {gridLines.horizontalLines.map((line, idx) => (
                      <Line key={`h-${idx}`} points={line.points} stroke={gridSettings.gridColor} strokeWidth={0.5} dash={[3, 3]} />
                    ))}
                  </>
                )}

                {/* Snap indicator (when close to a snap point) */}
                {snapIndicator && snapIndicator.visible && (
                  <Circle
                    x={snapIndicator.x}
                    y={snapIndicator.y}
                    radius={6}
                    stroke="#ff9900"
                    strokeWidth={2}
                    fill="rgba(255,165,0,0.12)"
                    listening={false}
                  />
                )}

                {/* Alignment guides (for object alignment snapping) */}
                {alignmentGuides.x !== undefined && (
                  <Line
                    points={[alignmentGuides.x, -10000, alignmentGuides.x, 10000]}
                    stroke="#e91e63"
                    strokeWidth={1}
                    dash={[3, 3]}
                    listening={false}
                  />
                )}
                {alignmentGuides.y !== undefined && (
                  <Line
                    points={[-10000, alignmentGuides.y, 10000, alignmentGuides.y]}
                    stroke="#e91e63"
                    strokeWidth={1}
                    dash={[3, 3]}
                    listening={false}
                  />
                )}

                {/* Axes - X axis (horizontal) - extends infinitely */}
                <Line 
                  points={[-100000, 0, 100000, 0]} 
                  stroke="#808080" 
                  strokeWidth={2.5}
                  dash={[5, 5]}
                />
                {/* Axes - Y axis (vertical) - extends infinitely */}
                <Line 
                  points={[0, -100000, 0, 100000]} 
                  stroke="#808080" 
                  strokeWidth={2.5}
                  dash={[5, 5]}
                />

                {/* Completed shapes */}
                {canvasState.objects.map((obj: any) => (
                  <ShapeRenderer
                    key={obj.id}
                    object={obj}
                    isSelected={canvasState.selectedId === obj.id}
                    mode={mode}
                    onSelect={(id) => {
                      // Update selection in both canvas state and table
                      selectObject(id);
                      setSelectedRow(id);
                    }}
                    onMove={(id, dx, dy) => {
                      // Move object points by delta (dx,dy) in world pixels
                      moveObjectByDelta(id, dx, dy);
                      
                      // Compute alignment guides for object snapping
                      const obj = canvasState.objects.find((o: any) => o.id === id);
                      if (obj) {
                        const movedPoints = obj.points.map((p: any) => ({ x: p.x + dx, y: p.y + dy }));
                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                        movedPoints.forEach((p: any) => {
                          minX = Math.min(minX, p.x);
                          minY = Math.min(minY, p.y);
                          maxX = Math.max(maxX, p.x);
                          maxY = Math.max(maxY, p.y);
                        });
                        const otherObjects = canvasState.objects.filter((o: any) => o.id !== id);
                        const snaps = findAlignmentSnaps({ minX, maxX, minY, maxY }, otherObjects, 15);
                        setAlignmentGuides(snaps);
                      }
                    }}
                    onResize={(id, newPoints) => {
                      // Update object points when handles are dragged to resize
                      // Note: ShapeRenderer handles the visual update; alignment guides below compute snap positions
                      
                      // Compute alignment guides for object snapping during resize
                      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                      newPoints.forEach((p: any) => {
                        minX = Math.min(minX, p.x);
                        minY = Math.min(minY, p.y);
                        maxX = Math.max(maxX, p.x);
                        maxY = Math.max(maxY, p.y);
                      });
                      const otherObjects = canvasState.objects.filter((o: any) => o.id !== id);
                      const snaps = findAlignmentSnaps({ minX, maxX, minY, maxY }, otherObjects, 15);
                      setAlignmentGuides(snaps);
                    }}
                  />
                ))}

              {/* Current shape being drawn */}
              {canvasState.currentObject && <ShapeRenderer object={canvasState.currentObject as any} mode={mode} />}
            </Layer>
          </Stage>
          </div>
        </div>

        {/* Sidebar Toggle Button */}
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarVisible(!sidebarVisible)}
          title={sidebarVisible ? 'Hide Properties' : 'Show Properties'}
          aria-label={sidebarVisible ? 'Hide Properties' : 'Show Properties'}
        >
          {sidebarVisible ? '→' : '←'}
        </button>

        {/* Property Panel */}
        {sidebarVisible && (
          <PropertyPanel
            selectedObject={selectedObject}
            onPropertyChange={handlePropertyChange}
            gridSettings={gridSettings}
            onGridSettingsChange={updateGridSettings}
            maxHeight={canvasHeight}
          />
        )}
      </div>

      {/* Data Table Section */}
      <div className="table-section">
        <div className="table-header">
          Drawing Objects
        </div>
        <div className="table-content ag-theme-alpine">
          <AgGridReact
            rowData={tableRows}
            columnDefs={columnDefs}
            domLayout="autoHeight"
            rowSelection="single"
            onRowClicked={(params) => {
              if (params.data) {
                setSelectedRow(params.data.id);
              }
            }}
            getRowStyle={(params): RowStyle | undefined => {
              if (params.data && params.data.id === selectedRow) {
                return { background: '#e3f2fd' };
              }
              return undefined;
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="action-buttons-section">
          <div className="action-button-group">
            <button className="btn-action primary" onClick={handleSave} title="Save Drawing">
              💾 Save
            </button>
            <button className="btn-action primary" onClick={handleLoad} title="Load Drawing from File">
              📂 Load
            </button>
            <button className="btn-action danger" onClick={handleDelete} disabled={!selectedRow} title="Delete Selected Row">
              🗑️ Delete Row
            </button>
            <button className="btn-action warning" onClick={undo} disabled={!canUndo} title="Undo Last Action">
              ↶ Undo
            </button>
            <button className="btn-action warning" onClick={redo} disabled={!canRedo} title="Redo Last Undone Action">
              ↷ Redo
            </button>
          </div>
        </div>

        {/* Hidden file input for loading drawings */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      {/* Angle Input Dialog */}
      <AngleInputDialog
        isOpen={showAngleDialog}
        onDraw={handleAngleDialogDraw}
        onCancel={handleAngleDialogCancel}
        position={angleDialogPos}
      />

      {/* Keyboard Help Modal */}
      <KeyboardHelpModal
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />
    </div>
  );
};

export default DrawingTabContainer;
