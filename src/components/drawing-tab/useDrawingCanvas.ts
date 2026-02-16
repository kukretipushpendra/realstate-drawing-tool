import { useState, useCallback, useRef } from 'react';
import type { CanvasState, DrawingObject, DrawingMode, Point } from './types';
import { 
  generateId, 
  downloadJSON,
  calculateRadius,
  calculateDimensions,
  calculateAngleDegrees,
} from './geometry';
import {
  DRAWING_CONSTANTS,
  DrawingLogger,
  PerformanceTracker,
  validatePointsForMode,
  DrawingError,
} from './technicalDebt';
import { LegacyMeasurementCalculator } from './legacyMapper';

interface History {
  past: CanvasState[];
  present: CanvasState;
  future: CanvasState[];
}

export const useDrawingCanvas = () => {
  const [history, setHistory] = useState<History>({
    past: [],
    present: {
      objects: [],
      currentObject: null,
      selectedId: null,
    },
    future: [],
  });
  const historyRef = useRef<History>(history);
  const canvasStateRef = useRef<any>({
    ...history.present,
    past: history.past,
    future: history.future,
  });

  const setHistoryAndRef = useCallback((updater: History | ((prev: History) => History)) => {
    const computeNext = (u: any) => (typeof u === 'function' ? u(historyRef.current) : u);
    const next = computeNext(updater);
    // update refs synchronously so callers (and tests) can read latest state immediately
    historyRef.current = next;

    // mutate the canvasStateRef in place for immediate visibility inside act()
    canvasStateRef.current.objects = next.present.objects;
    canvasStateRef.current.currentObject = next.present.currentObject;
    canvasStateRef.current.selectedId = next.present.selectedId;
    canvasStateRef.current.past = next.past;
    canvasStateRef.current.future = next.future;

    setHistory(next);
  }, []);

  const [mode, setModeState] = useState<DrawingMode>(null);
  const modeRef = useRef<DrawingMode>(mode);
  const setMode = useCallback((m: DrawingMode) => {
    modeRef.current = m;
    setModeState(m);
  }, []);
  const loggerRef = useRef(new DrawingLogger());
  const perfRef = useRef(new PerformanceTracker());
  const logger = loggerRef.current;
  const perf = perfRef.current;

  // Helper to record a state in history
  const recordState = useCallback((newState: CanvasState) => {
    setHistoryAndRef((prev) => ({
      past: [...prev.past, prev.present],
      present: newState,
      future: [], // Clear future when new action taken
    }));
  }, []);

  // Get current canvas state (present) but expose history metadata for tests and callers
  const canvasState = canvasStateRef.current;



  const completeObject = useCallback(() => {
    perf.startMeasure('completeObject');
    logger.debug('useDrawingCanvas', 'completeObject:start');

    setHistoryAndRef((prev) => {
      // Validate that object has required data
      if (
        !prev.present.currentObject ||
        !prev.present.currentObject.points ||
        prev.present.currentObject.points.length === 0
      ) {
        logger.warn('useDrawingCanvas', 'completeObject:invalid-currentObject');
        return prev;
      }

      const points = prev.present.currentObject.points;
      const shapeType = prev.present.currentObject.type || 'freeDraw';

      // Use shared validator from technicalDebt
      try {
        if (!validatePointsForMode(shapeType, points.length)) {
          logger.warn('useDrawingCanvas', 'completeObject:insufficient-points', { shapeType, pointsLength: points.length });
          return prev;
        }
      } catch (err) {
        logger.error('useDrawingCanvas', 'completeObject:validation-error', err as Error, { shapeType, pointsLength: points.length });
        return prev;
      }

      // Auto-calculate properties based on shape type
      let properties = { ...prev.present.currentObject.properties };

      if (shapeType === 'circle' || shapeType === 'curve') {
        properties.radius = calculateRadius(points);
        // Calculate sqft for circles using πr²
        const sqft = LegacyMeasurementCalculator.calculateCircleArea(properties.radius);
        properties.sqft = sqft;
      }

      if (shapeType === 'rectangle' || shapeType === 'square') {
        const dims = calculateDimensions(points);
        properties.width = dims.width;
        properties.height = dims.height;
        // Calculate sqft: width × height
        const sqft = properties.width * properties.height;
        properties.sqft = sqft;
      }

      if (shapeType === 'angle' || shapeType === 'straightLine' || shapeType === 'orthoLine') {
        const angleDeg = calculateAngleDegrees(points);
        const distance = Math.sqrt(
          Math.pow(points[1].x - points[0].x, 2) +
          Math.pow(points[1].y - points[0].y, 2)
        );

        // keep legacy keys and add test-expected keys
        properties.angleDegree = angleDeg;
        properties.angle = angleDeg;
        properties.length = distance;
        properties.distance = distance;
      }

      // Calculate sqft for polygon-based shapes (freeDraw and any multi-point shapes)
      if (
        (shapeType === 'freeDraw' || shapeType === null) && 
        points.length >= 3
      ) {
        const sqft = LegacyMeasurementCalculator.calculateSqft(points);
        properties.sqft = sqft;
      }

      // Create new completed object (ensure type exists)
      const completedObject: DrawingObject = {
        ...prev.present.currentObject,
        type: prev.present.currentObject.type || 'unknown',
        points: prev.present.currentObject.points,
        properties,
      } as DrawingObject;

      // Record this state in history
      const newState: CanvasState = {
        ...prev.present,
        objects: [...prev.present.objects, completedObject],
        currentObject: null,
      };

      logger.info('useDrawingCanvas', 'completeObject:created', { objectId: completedObject.id, type: completedObject.type });

      return {
        past: [...prev.past, prev.present],
        present: newState,
        future: [], // Clear future when new action taken
      };
    });

    const duration = perf.endMeasure('completeObject');
    logger.info('useDrawingCanvas', 'completeObject:end', { duration });
  }, []);

  const updateCurrentObjectPoints = useCallback((newPoints: Point[]) => {
    setHistoryAndRef((prev) => {
      if (!prev.present.currentObject) return prev;

      // Apply ortho constraint if in ortho mode
      let constrainedPoints = newPoints;
      if (prev.present.currentObject.type === 'orthoLine' && newPoints.length >= 2) {
        const p1 = newPoints[0];
        const p2 = newPoints[1];
        const dx = Math.abs(p2.x - p1.x);
        const dy = Math.abs(p2.y - p1.y);

        if (dx > dy) {
          // Horizontal line
          constrainedPoints = [newPoints[0], { x: p2.x, y: p1.y }, ...newPoints.slice(2)];
        } else {
          // Vertical line
          constrainedPoints = [newPoints[0], { x: p1.x, y: p2.y }, ...newPoints.slice(2)];
        }
      }

      const newState: CanvasState = {
        ...prev.present,
        currentObject: {
          ...prev.present.currentObject,
          points: constrainedPoints,
        },
      };

      return {
        ...prev,
        present: newState,
      };
    });
  }, []);

  const cancelObject = useCallback(() => {
    setHistoryAndRef((prev) => ({
      ...prev,
      present: {
        ...prev.present,
        currentObject: null,
      },
    }));
  }, []);

  const clearCanvas = useCallback(() => {
    setHistoryAndRef((prev) => ({
      past: [...prev.past, prev.present],
      present: {
        objects: [],
        currentObject: null,
        selectedId: null,
      },
      future: [],
    }));
  }, []);

  const saveDrawing = useCallback(() => {
    const drawingData = {
      version: '2.0',
      timestamp: Date.now(),
      exportDate: new Date().toISOString(),
      canvasState: history.present,
      metadata: {
        totalObjects: history.present.objects.length,
        currentObjectExists: history.present.currentObject !== null,
        undoStackSize: history.past.length,
        redoStackSize: history.future.length,
      },
    };
    downloadJSON(drawingData, `drawing_${Date.now()}.json`);
  }, [history]);

  const loadState = useCallback((state: CanvasState) => {
    setHistoryAndRef({
      past: [],
      present: state,
      future: [],
    });
  }, []);

  const loadDrawing = useCallback((data: any) => {
    try {
      // Support both old and new formats
      if (data.version === '2.0' && data.canvasState) {
        // New format with full history metadata
        loadState(data.canvasState);
        return true;
      } else if (data.objects && Array.isArray(data.objects)) {
        // Old format with just objects array
        const newState: CanvasState = {
          objects: data.objects,
          currentObject: null,
          selectedId: null,
        };
        loadState(newState);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to load drawing:', error);
      return false;
    }
  }, [loadState]);

  const addPoint = useCallback((point: Point) => {
    perf.startMeasure('addPoint');
    const currentMode = modeRef.current;
    logger.debug('useDrawingCanvas', 'addPoint:start', { mode: currentMode, point });

    setHistoryAndRef((prev) => {
      // If no current object exists, create a new one
      if (!prev.present.currentObject) {
        return {
          ...prev,
          present: {
            ...prev.present,
            currentObject: {
              id: generateId(),
              type: currentMode ?? 'unknown',
              points: [point],
              properties: {},
              timestamp: Date.now(),
            },
          },
        };
      }

      // Add point to existing object
      return {
        ...prev,
        present: {
          ...prev.present,
          currentObject: {
            ...prev.present.currentObject,
            points: [...(prev.present.currentObject.points || []), point],
          },
        },
      };
    });

    perf.endMeasure('addPoint');
    logger.info('useDrawingCanvas', 'addPoint:end', { mode: currentMode });
  }, []);

  const deleteObject = useCallback((id: string) => {
    setHistoryAndRef((prev) => {
      const newState: CanvasState = {
        ...prev.present,
        objects: prev.present.objects.filter((obj) => obj.id !== id),
      };

      return {
        past: [...prev.past, prev.present],
        present: newState,
        future: [],
      };
    });
  }, []);

  const selectObject = useCallback((id: string | null) => {
    setHistoryAndRef((prev) => ({
      ...prev,
      present: {
        ...prev.present,
        selectedId: id,
      },
    }));
  }, []);

  const updateObjectPointsById = useCallback((id: string, newPoints: Point[]) => {
    setHistoryAndRef((prev) => {
      const updatedObjects = prev.present.objects.map((obj) => (obj.id === id ? { ...obj, points: newPoints } : obj));
      const newState: CanvasState = {
        ...prev.present,
        objects: updatedObjects,
      };
      return {
        past: [...prev.past, prev.present],
        present: newState,
        future: [],
      };
    });
  }, []);

  const moveObjectByDelta = useCallback((id: string, dx: number, dy: number) => {
    setHistoryAndRef((prev) => {
      const updatedObjects = prev.present.objects.map((obj) => {
        if (obj.id !== id) return obj;
        const movedPoints = obj.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
        return { ...obj, points: movedPoints };
      });
      const newState: CanvasState = {
        ...prev.present,
        objects: updatedObjects,
      };
      return {
        past: [...prev.past, prev.present],
        present: newState,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistoryAndRef((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, -1);
      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistoryAndRef((prev) => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      const newFuture = prev.future.slice(1);
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const updateCurrentObjectProperties = useCallback((props: Record<string, any>) => {
    setHistory((prev) => {
      if (!prev.present.currentObject) return prev;
      const updatedCurrent = {
        ...prev.present.currentObject,
        properties: { ...prev.present.currentObject.properties, ...props },
      };
      const newState: CanvasState = {
        ...prev.present,
        currentObject: updatedCurrent,
      };
      return {
        past: [...prev.past, prev.present],
        present: newState,
        future: [],
      };
    });
  }, []);

  const updateSelectedObjectProperties = useCallback((props: Record<string, any>) => {
    setHistoryAndRef((prev) => {
      if (!prev.present.selectedId) return prev;
      const updatedObjects = prev.present.objects.map((obj) =>
        obj.id === prev.present.selectedId
          ? { ...obj, properties: { ...obj.properties, ...props } }
          : obj
      );
      const newState: CanvasState = {
        ...prev.present,
        objects: updatedObjects,
      };
      return {
        past: [...prev.past, prev.present],
        present: newState,
        future: [],
      };
    });
  }, []);

  // Compute canUndo and canRedo flags
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  return {
    canvasState,
    mode,
    // Backwards-compatible alias used by tests and legacy callers
    type: mode,
    setMode,
    addPoint,
    completeObject,
    cancelObject,
    clearCanvas,
    saveDrawing,
    undo,
    redo,
    updateCurrentObjectPoints,
    updateCurrentObjectProperties,
    updateSelectedObjectProperties,
    deleteObject,
    selectObject,
    updateObjectPointsById,
    moveObjectByDelta,
    canUndo,
    canRedo,
    loadDrawing,
    loadState,
  };
};
