export type DrawingMode = 
  | 'freeDraw' 
  | 'straightLine' 
  | 'orthoLine'
  | 'square' 
  | 'rectangle' 
  | 'angle' 
  | 'curve' 
  | 'circle'
  | 'centerView'
  | 'zoomToFit'
  | null;

export interface Point {
  x: number;
  y: number;
}

/**
 * Legacy building drawing compatibility
 * Maps to BuildingDrawing.xml.cs in legacy .NET system
 */
export interface LegacyBuildingDrawingData {
  // Drawing metadata
  buildingId?: string;
  name?: string;
  tag?: string;
  text?: string;
  groupName?: string;
  sequence?: number;
  
  // Positioning (stored as strings in legacy for precision)
  footX?: string | number;
  footY?: string | number;
  footWidth?: string | number;
  footHeight?: string | number;
  rotatedAngle?: number;
  
  // Pen/Font styling
  penOrFontSize?: number;
  penOrFontColor?: string;
  
  // Line-specific properties
  lineFootX1?: number;
  lineFootX2?: number;
  lineFootY1?: number;
  lineFootY2?: number;
  
  // Arc/Curve properties
  arcRadius?: number;
  arcStartFootX?: number;
  arcStartFootY?: number;
  arcPointFootX?: number;
  arcPointFootY?: number;
  arcMouseEndFootX?: number;
  arcMouseEndFootY?: number;
  sweepDirection?: string;
  isClosed?: boolean;
  isCurveClosed?: boolean;
  
  // Drawing adjustments and measurements
  drawingAdjustments?: string;
  
  // Building context (for calculations)
  buildingPhysicalGood?: number;
  buildingClass?: string;
  buildingSqft?: number;
  buildingNewSqft?: number;
  buildingTotalSqft?: number;
  buildingCalls?: string;
  buildingNotes?: string;
  buildingPage?: number;
  isDrawingByTenth?: boolean;
  
  // Audit trail
  modifiedBy?: string;
  modifiedDate?: Date | string;
  version?: number;
  isActive?: boolean;
}

export interface DrawingObjectProperties extends LegacyBuildingDrawingData {
  // Modern computed properties
  radius?: number;
  width?: number;
  height?: number;
  angle?: number;
  closed?: boolean;
  [key: string]: any;
}

export interface DrawingObject {
  id: string;
  type: DrawingMode;
  points: Point[];
  properties: DrawingObjectProperties;
  timestamp: number;
  
  // Legacy serialization support
  legacyData?: LegacyBuildingDrawingData;
}

export interface DrawingObjectWithMetrics extends DrawingObject {
  // Calculated metrics
  calculatedSqft?: number;
  calculatedArea?: number;
  calculatedPerimeter?: number;
  calculatedRadius?: number;
  arcDetails?: {
    startPoint: Point;
    arcPoint: Point;
    endPoint: Point;
    radius: number;
    sweepDirection: string;
  };
}

export interface CanvasState {
  objects: DrawingObject[];
  currentObject: Partial<DrawingObject> | null;
  selectedId: string | null;
  
  // Building context
  buildingId?: string;
  buildingContext?: {
    sqft?: number;
    newSqft?: number;
    totalSqft?: number;
    physicalGood?: number;
    calls?: string;
    notes?: string;
    class?: string;
    page?: number;
  };
}
