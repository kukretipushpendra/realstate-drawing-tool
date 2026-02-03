export type DrawingMode = 
  | 'freeDraw' 
  | 'straightLine' 
  | 'orthoLine'
  | 'square' 
  | 'rectangle' 
  | 'angle' 
  | 'curve' 
  | 'circle' 
  | null;

export interface Point {
  x: number;
  y: number;
}

export interface DrawingObject {
  id: string;
  type: DrawingMode;
  points: Point[];
  properties: Record<string, any>;
  timestamp: number;
}

export interface CanvasState {
  objects: DrawingObject[];
  currentObject: Partial<DrawingObject> | null;
  selectedId: string | null;
}
