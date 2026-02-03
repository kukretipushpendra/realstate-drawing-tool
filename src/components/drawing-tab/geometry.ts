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
