import type { Point } from './types';

export const getDistance = (p1: Point, p2: Point): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const getAngle = (p1: Point, p2: Point): number => {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
};

export const getRectangleBounds = (p1: Point, p2: Point) => {
  return {
    x: Math.min(p1.x, p2.x),
    y: Math.min(p1.y, p2.y),
    width: Math.abs(p2.x - p1.x),
    height: Math.abs(p2.y - p1.y),
  };
};

export const getSquareBounds = (p1: Point, p2: Point) => {
  const distance = Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
  const isNegX = p2.x < p1.x;
  const isNegY = p2.y < p1.y;
  
  return {
    x: isNegX ? p1.x - distance : p1.x,
    y: isNegY ? p1.y - distance : p1.y,
    size: distance,
  };
};

export const generateId = (): string => {
  return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const downloadJSON = (data: any, filename: string) => {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2)));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

export const smoothPath = (points: Point[]): Point[] => {
  if (points.length < 3) return points;
  
  const smoothed: Point[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    smoothed.push(points[i]);
    const p1 = points[i];
    const p2 = points[i + 1];
    smoothed.push({
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    });
  }
  smoothed.push(points[points.length - 1]);
  return smoothed;
};

/**
 * Calculate radius from circle points (center and edge point)
 * Points: [center, radiusPoint]
 */
export const calculateRadius = (points: Point[]): number => {
  if (points.length < 2) return 0;
  return getDistance(points[0], points[1]);
};

/**
 * Calculate dimensions (width and height) from rectangle corner points
 * Points: [corner1, corner2]
 */
export const calculateDimensions = (points: Point[]): { width: number; height: number } => {
  if (points.length < 2) return { width: 0, height: 0 };
  const bounds = getRectangleBounds(points[0], points[1]);
  return { width: bounds.width, height: bounds.height };
};

/**
 * Calculate angle in degrees from two points
 * Points: [startPoint, endPoint]
 * Returns angle in degrees (0-360)
 */
export const calculateAngleDegrees = (points: Point[]): number => {
  if (points.length < 2) return 0;
  const radians = getAngle(points[0], points[1]);
  let degrees = (radians * 180) / Math.PI;
  // Normalize to 0-360 range
  if (degrees < 0) degrees += 360;
  return degrees;
};

/**
 * Find alignment snap points for smart alignment to neighboring objects
 * Returns the x or y coordinate to snap to if within threshold
 */
export const findAlignmentSnaps = (
  boundingBox: { minX: number; maxX: number; minY: number; maxY: number },
  allObjects: Array<{ points: Point[] }>,
  threshold: number = 10
): { x?: number; y?: number; alignToX: Point[]; alignToY: Point[] } => {
  const result: { x?: number; y?: number; alignToX: Point[]; alignToY: Point[] } = {
    alignToX: [],
    alignToY: [],
  };

  // Collect all x and y coordinates from other objects
  const xCoords: number[] = [];
  const yCoords: number[] = [];

  allObjects.forEach((obj) => {
    obj.points.forEach((p) => {
      xCoords.push(p.x);
      yCoords.push(p.y);
    });
  });

  // Find closest X alignment
  const centerX = (boundingBox.minX + boundingBox.maxX) / 2;
  let closestX = Infinity;
  xCoords.forEach((x) => {
    const dist = Math.abs(centerX - x);
    if (dist < closestX && dist < threshold) {
      closestX = dist;
      result.x = x;
    }
  });

  // Find closest Y alignment
  const centerY = (boundingBox.minY + boundingBox.maxY) / 2;
  let closestY = Infinity;
  yCoords.forEach((y) => {
    const dist = Math.abs(centerY - y);
    if (dist < closestY && dist < threshold) {
      closestY = dist;
      result.y = y;
    }
  });

  return result;
};

