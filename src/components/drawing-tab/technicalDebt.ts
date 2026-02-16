/**
 * TECHNICAL DEBT RESOLUTION LOG
 * Phase 8.3: Drawing Tab Quality Improvements
 */

// ============================================================================
// 1. MAGIC NUMBERS → CONSTANTS
// ============================================================================

export const DRAWING_CONSTANTS = {
  // Grid & Snap Settings
  DEFAULT_GRID_SIZE: 20, // pixels (4 feet at 5px/ft)
  DEFAULT_SNAP_THRESHOLD: 10, // pixels
  DEFAULT_SNAP_INCREMENT_FEET: 0.5,
  ALIGNMENT_SNAP_THRESHOLD: 15, // pixels for object alignment
  
  // Canvas Settings
  DEFAULT_ZOOM_MIN: 0.1,
  DEFAULT_ZOOM_MAX: 5,
  ZOOM_STEP: 0.1,
  
  // Shape Rendering
  HANDLE_RADIUS: 5, // pixels
  GUIDE_LINE_WIDTH: 3, // pixels
  SELECTION_BOX_PADDING: 6, // pixels
  
  // Appearance
  GRID_COLOR: '#ccc',
  GUIDE_COLOR: '#e91e63', // Magenta
  SNAP_INDICATOR_COLOR: '#ff9800', // Orange
  SELECTION_COLOR: '#1976d2', // Blue
  HANDLE_COLOR: '#1e90ff', // Bright blue
  
  // Conversion
  PIXELS_PER_FOOT: 5,
  FEET_SNAP_OPTIONS: [0.25, 0.5, 1, 2, 5],
  
  // Drawing Constraints
  MIN_POINTS_PER_SHAPE: {
    freeDraw: 2,
    straightLine: 2,
    orthoLine: 2,
    rectangle: 2,
    square: 2,
    circle: 2,
    angle: 2,
    curve: 3,
  },
};

// ============================================================================
// 2. ERROR BOUNDARIES & ERROR HANDLING
// ============================================================================

/**
 * Custom error class for drawing operations
 */
export class DrawingError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'DrawingError';
  }
}

/**
 * Safe wrapper for geometry calculations
 * Prevents NaN/Infinity propagation
 */
export function safeDistance(p1: any, p2: any): number {
  try {
    if (!p1 || !p2 || typeof p1.x !== 'number' || typeof p2.x !== 'number') {
      throw new DrawingError('Invalid points for distance', 'INVALID_POINTS', { p1, p2 });
    }
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (!isFinite(distance)) {
      throw new DrawingError('Invalid distance calculation', 'CALC_ERROR', { dx, dy });
    }
    return distance;
  } catch (error) {
    console.error('Distance calculation error:', error);
    return 0;
  }
}

/**
 * Safe array access with bounds checking
 */
export function getPointSafe(points: any[], index: number, defaultValue: any = null) {
  if (!Array.isArray(points) || index < 0 || index >= points.length) {
    return defaultValue;
  }
  return points[index];
}

// ============================================================================
// 3. STRUCTURED LOGGING
// ============================================================================

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  module: string;
  action: string;
  data?: Record<string, any>;
  error?: Error;
}

/**
 * Drawing operation logger
 * Tracks all canvas operations for debugging
 */
export class DrawingLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  log(level: LogLevel, module: string, action: string, data?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      module,
      action,
      data,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output based on level
    const logFn = {
      [LogLevel.DEBUG]: console.debug,
      [LogLevel.INFO]: console.info,
      [LogLevel.WARN]: console.warn,
      [LogLevel.ERROR]: console.error,
    }[level];

    logFn(`[${module}] ${action}`, data);
  }

  debug(module: string, action: string, data?: Record<string, any>) {
    this.log(LogLevel.DEBUG, module, action, data);
  }

  info(module: string, action: string, data?: Record<string, any>) {
    this.log(LogLevel.INFO, module, action, data);
  }

  warn(module: string, action: string, data?: Record<string, any>) {
    this.log(LogLevel.WARN, module, action, data);
  }

  error(module: string, action: string, error: Error, data?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level: LogLevel.ERROR,
      module,
      action,
      error,
      data,
    };
    this.logs.push(entry);
    console.error(`[${module}] ${action}`, error, data);
  }

  getLogs(filter?: { level?: LogLevel; module?: string }): LogEntry[] {
    return this.logs.filter((log) => {
      if (filter?.level && log.level !== filter.level) return false;
      if (filter?.module && log.module !== filter.module) return false;
      return true;
    });
  }

  clear() {
    this.logs = [];
  }

  export(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// ============================================================================
// 4. TYPE SAFETY IMPROVEMENTS
// ============================================================================

/**
 * TypeGuard: Verify DrawingObject integrity
 */
export function isValidDrawingObject(obj: any): obj is any {
  return (
    obj &&
    typeof obj.id === 'string' &&
    Array.isArray(obj.points) &&
    obj.points.length > 0 &&
    obj.points.every((p: any) => typeof p.x === 'number' && typeof p.y === 'number') &&
    typeof obj.type === 'string' &&
    obj.properties !== undefined
  );
}

/**
 * TypeGuard: Verify CanvasState integrity
 */
export function isValidCanvasState(state: any): boolean {
  return (
    state &&
    Array.isArray(state.objects) &&
    state.objects.every(isValidDrawingObject) &&
    (state.selectedId === null || typeof state.selectedId === 'string') &&
    (state.currentObject === null ||
      state.currentObject.type === undefined ||
      typeof state.currentObject.type === 'string')
  );
}

/**
 * Validate points array for shape type
 */
export function validatePointsForMode(mode: string, pointsLength: number): boolean {
  const minPoints: Record<string, number> = {
    freeDraw: 2,
    straightLine: 2,
    orthoLine: 2,
    rectangle: 2,
    square: 2,
    circle: 2,
    angle: 2,
    curve: 3,
  };
  return pointsLength >= (minPoints[mode] || 2);
}

// ============================================================================
// 5. PERFORMANCE INSTRUMENTATION
// ============================================================================

/**
 * Performance metrics tracker for drawing operations
 */
export class PerformanceTracker {
  private marks: Map<string, number> = new Map();
  private measures: Map<string, number[]> = new Map();

  startMeasure(label: string) {
    this.marks.set(label, performance.now());
  }

  endMeasure(label: string): number {
    const start = this.marks.get(label);
    if (!start) {
      console.warn(`No start mark for: ${label}`);
      return 0;
    }

    const duration = performance.now() - start;
    const measures = this.measures.get(label) || [];
    measures.push(duration);
    this.measures.set(label, measures);
    this.marks.delete(label);

    return duration;
  }

  getMetrics(label: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
  } | null {
    const measures = this.measures.get(label);
    if (!measures || measures.length === 0) return null;

    return {
      count: measures.length,
      avg: measures.reduce((a, b) => a + b, 0) / measures.length,
      min: Math.min(...measures),
      max: Math.max(...measures),
    };
  }

  getAllMetrics() {
    const result: Record<string, any> = {};
    this.measures.forEach((_, label) => {
      result[label] = this.getMetrics(label);
    });
    return result;
  }

  clear() {
    this.marks.clear();
    this.measures.clear();
  }
}

// ============================================================================
// 6. DOCUMENTATION & EXAMPLES
// ============================================================================

/**
 * USAGE EXAMPLES:
 * 
 * // 1. Use constants instead of magic numbers
 * const gridSize = DRAWING_CONSTANTS.DEFAULT_GRID_SIZE; // 20px
 * 
 * // 2. Use safe operations
 * const dist = safeDistance(point1, point2); // Returns 0 on error
 * 
 * // 3. Structured logging
 * const logger = new DrawingLogger();
 * logger.info('DrawingCanvas', 'Object added', { objectId, points: 5 });
 * 
 * // 4. Type validation
 * if (isValidDrawingObject(obj)) {
 *   // Safe to use obj
 * }
 * 
 * // 5. Performance tracking
 * const tracker = new PerformanceTracker();
 * tracker.startMeasure('addPoint');
 * // ... operation ...
 * const duration = tracker.endMeasure('addPoint');
 * console.log('Add point took:', duration, 'ms');
 */

// ============================================================================
// 7. REFACTORING CHECKLIST
// ============================================================================

/**
NEXT STEPS FOR TECHNICAL DEBT REMOVAL:

[x] 1. Extract magic numbers to DRAWING_CONSTANTS enum
[x] 2. Implement DrawingError custom error class
[x] 3. Add safeDistance() and error handling utilities
[x] 4. Create DrawingLogger for structured logging
[x] 5. Add TypeGuards for DrawingObject and CanvasState
[x] 6. Create validatePointsForMode() validator
[x] 7. Add PerformanceTracker for metrics

[] 8. UPDATE COMPONENTS TO USE:
    - useGridSettings.ts: Replace magic (15, 10) with constants
    - DrawingTabContainer.tsx: Add DrawingLogger, PerformanceTracker
    - ShapeRenderer.tsx: Add isValidDrawingObject checks
    - geometry.ts: Replace with safe* versions

[] 9. ADD ERROR BOUNDARIES:
    - DrawingTabContainer.tsx: Wrap in <ErrorBoundary>
    - useDrawingCanvas.ts: Try-catch in state updates
    - handlers: Add validation before operations

[] 10. REMOVE ANY TYPES:
    - ShapeRenderer.tsx dialogs
    - Event handlers in DrawingTabContainer.tsx
    - Model definitions in useDrawingCanvas.ts
*/
