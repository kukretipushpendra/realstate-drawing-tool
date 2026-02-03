import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import Konva from 'konva';
import type { Point, DrawingMode } from './types';
import { useDrawingCanvas } from './useDrawingCanvas';
import { ShapeRenderer } from './shapes/ShapeRenderer';
import { AngleInputDialog } from './dialogs/AngleInputDialog';
import { PIXELS_PER_FOOT, pixelsToFeet, feetToPixels } from './unitConversion';
import './DrawingTabContainer.css';

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
  } = {}
): TableRow => {
  return {
    id,
    sequence,
    shapeType,
    class: options.class || '',
    adjustments: options.adjustments || '',
    drawingCalls: options.drawingCalls || '',
    arcDetails: options.arcDetails || '',
    sqft: options.sqft || '',
    physicalGood: options.physicalGood || '',
    buildingNotes: options.buildingNotes || '',
    page: options.page || '',
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

  const {
    canvasState,
    mode,
    setMode,
    addPoint,
    completeObject,
    cancelObject,
    clearCanvas,
    saveDrawing,
    undo,
    updateCurrentObjectPoints,
    updateCurrentObjectProperties,
  } = useDrawingCanvas();

  const [tableRows, setTableRows] = useState<TableRow[]>([]);
  const [hint, setHint] = useState<string>('Select a drawing tool to begin');
  const [zoom, setZoom] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [showAngleDialog, setShowAngleDialog] = useState(false);
  const [angleDialogPos, setAngleDialogPos] = useState<{ x: number; y: number } | undefined>();
  const [currentCoords, setCurrentCoords] = useState({ x: 0, y: 0 });
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
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
  const canvasWidth = windowSize.width;
  const toolbarHeight = 80;
  const hintBarHeight = 10;
  const canvasHeight = isFullscreen ? windowSize.height - toolbarHeight : windowSize.height - toolbarHeight - hintBarHeight;

  // Calculate initial position with 1% margin from left and 10% margin from bottom for axis visibility
  const marginLeftPixels = Math.max(canvasWidth, canvasHeight) * 0.01; // 1% margin from left
  const marginBottomPixels = canvasHeight * 0.05; // 10% margin from bottom
  const initialStageX = marginLeftPixels;
  const initialStageY = canvasHeight - marginBottomPixels;

  const gridLines = generateInfiniteGridLines(stagePos.x, stagePos.y, canvasWidth, canvasHeight, GRID_CELL_SIZE_PIXELS, zoom);

  // Initialize stage position to show (0,0) at bottom-left on load
  useEffect(() => {
    setStagePos({
      x: initialStageX,
      y: initialStageY,
    });
  }, []);

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

  // Keyboard listener for zoom and pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Zoom in with +/= key or Ctrl+Arrow Up
      if ((e.key === '+' || e.key === '=') || (e.ctrlKey && e.key === 'ArrowUp')) {
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!mode) return;

    // Mark that we've moved past the first load
    if (isFirstLoad) {
      setIsFirstLoad(false);
    }

    const event = e.evt;
    const stage = stageRef.current;
    if (!stage) return;

    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    // Convert screen coordinates to world coordinates
    const worldX = (pointerPos.x - stagePos.x) / zoom;
    const worldY = (pointerPos.y - stagePos.y) / zoom;
    const worldPoint = { x: worldX, y: worldY };

    if (event.button === 0) {
      // Left click
      if (mode === 'freeDraw') {
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
                const newRow: TableRow = createTableRow(
                  canvasState.currentObject.id || `row_${Date.now()}`,
                  tableRows.length + 1,
                  mode,
                  {
                    adjustments: '',
                    drawingCalls: `${TOOL_CONFIG[mode]?.label || mode} completed`,
                  }
                );
                setTableRows((rows) => [...rows, newRow]);
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
      // Right click - stop shape generation
      event.preventDefault();
      
      if (mode === 'freeDraw') {
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
              const newRow: TableRow = createTableRow(
                canvasState.currentObject.id || `row_${Date.now()}`,
                tableRows.length + 1,
                mode,
                {
                  adjustments: '',
                  drawingCalls: 'Free Draw completed',
                }
              );
              setTableRows((rows) => [...rows, newRow]);
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

  const handleMouseMove = (_e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    // Convert screen coordinates to world coordinates
    const worldX = (pointerPos.x - stagePos.x) / zoom;
    const worldY = (pointerPos.y - stagePos.y) / zoom;

    // Update current coordinates in feet
    setCurrentCoords({
      x: Math.round(pixelsToFeet(worldX) * 10) / 10,
      y: -Math.round(pixelsToFeet(worldY) * 10) / 10,
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
    // For the new behavior, shape submission happens on left click (in handleMouseDown)
    // So we don't need to do anything on mouse up
    // The isDrawing flag remains true to allow continuous drawing
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    const wheelEvent = e.evt as WheelEvent;
    
    // Only zoom if Ctrl key is pressed, otherwise allow default scroll
    if (!wheelEvent.ctrlKey) return;

    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const scaleBy = 1.1;
    const oldScale = zoom;
    const newScale = wheelEvent.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

    setZoom(Math.max(0.2, Math.min(5, newScale)));
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

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all drawings?')) {
      clearCanvas();
      setTableRows([]);
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
          const newRow: TableRow = createTableRow(
            canvasState.currentObject.id || `row_${Date.now()}`,
            tableRows.length + 1,
            mode,
            {
              adjustments: '',
              drawingCalls: `Angle: ${angleDegree}°, Length: ${(lineLengthFeet).toFixed(2)} ft`,
              arcDetails: `${angleDegree}°`,
            }
          );
          setTableRows((rows) => [...rows, newRow]);
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
                onClick={() => setMode(mode === toolKey ? null : (toolKey as DrawingMode))}
                title={config.label}
              >
                <span>{config.icon}</span>
              </button>
            ))}
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

          {/* Fullscreen Toggle */}
          <div className="fullscreen-controls">
            <button
              className="fullscreen-button"
              onClick={handleToggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? '◲' : '⛶'}
            </button>
          </div>

          {/* Current Coordinates Display */}
          <div className="coordinates-display">
            <span className="coordinates-label">Feet:</span>
            <span className="coordinates-value">({currentCoords.x.toFixed(1)}, {currentCoords.y.toFixed(1)})</span>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="canvas-wrapper">
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
            onContextMenu={(e) => e.evt.preventDefault()}
            onWheel={handleWheel}
            scale={{ x: zoom, y: zoom }}
            position={stagePos}
            style={{ cursor: 'default' }}
          >
            <Layer>
              {/* Grid */}
              {gridLines.verticalLines.map((line, idx) => (
                <Line key={`v-${idx}`} points={line.points} stroke="#22c55e" strokeWidth={0.5} dash={[3, 3]} />
              ))}
              {gridLines.horizontalLines.map((line, idx) => (
                <Line key={`h-${idx}`} points={line.points} stroke="#22c55e" strokeWidth={0.5} dash={[3, 3]} />
              ))}

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
              {canvasState.objects.map((obj) => (
                <ShapeRenderer key={obj.id} object={obj} />
              ))}

              {/* Current shape being drawn */}
              {canvasState.currentObject && <ShapeRenderer object={canvasState.currentObject as any} />}
            </Layer>
          </Stage>
        </div>
      </div>

      {/* Angle Input Dialog */}
      <AngleInputDialog
        isOpen={showAngleDialog}
        onDraw={handleAngleDialogDraw}
        onCancel={handleAngleDialogCancel}
        position={angleDialogPos}
      />
    </div>
  );
};

export default DrawingTabContainer;