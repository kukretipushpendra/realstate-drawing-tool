import {
  getDistance,
  getAngle,
  getRectangleBounds,
  getSquareBounds,
  calculateRadius,
  calculateDimensions,
  calculateAngleDegrees,
  findAlignmentSnaps,
} from '../geometry';
import type { Point } from '../types';

describe('Geometry Utilities', () => {
  describe('getDistance', () => {
    it('should calculate distance between two points', () => {
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 3, y: 4 };
      expect(getDistance(p1, p2)).toBe(5); // 3-4-5 triangle
    });

    it('should return 0 for same points', () => {
      const p: Point = { x: 5, y: 5 };
      expect(getDistance(p, p)).toBe(0);
    });

    it('should calculate distance with negative coordinates', () => {
      const p1: Point = { x: -3, y: -4 };
      const p2: Point = { x: 0, y: 0 };
      expect(getDistance(p1, p2)).toBe(5);
    });
  });

  describe('getAngle', () => {
    it('should calculate angle for horizontal line (0 degrees)', () => {
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 10, y: 0 };
      expect(getAngle(p1, p2)).toBe(0);
    });

    it('should calculate angle for vertical line (90 degrees)', () => {
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 0, y: 10 };
      const angle = getAngle(p1, p2);
      expect(Math.abs(angle - Math.PI / 2) < 0.001).toBe(true);
    });

    it('should calculate diagonal angle (45 degrees)', () => {
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 10, y: 10 };
      const angle = getAngle(p1, p2);
      expect(Math.abs(angle - Math.PI / 4) < 0.001).toBe(true);
    });
  });

  describe('getRectangleBounds', () => {
    it('should calculate bounds for normal rectangle', () => {
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 10, y: 20 };
      const bounds = getRectangleBounds(p1, p2);
      expect(bounds).toEqual({ x: 0, y: 0, width: 10, height: 20 });
    });

    it('should handle reversed coordinates', () => {
      const p1: Point = { x: 10, y: 20 };
      const p2: Point = { x: 0, y: 0 };
      const bounds = getRectangleBounds(p1, p2);
      expect(bounds).toEqual({ x: 0, y: 0, width: 10, height: 20 });
    });

    it('should handle negative coordinates', () => {
      const p1: Point = { x: -5, y: -10 };
      const p2: Point = { x: 5, y: 10 };
      const bounds = getRectangleBounds(p1, p2);
      expect(bounds).toEqual({ x: -5, y: -10, width: 10, height: 20 });
    });
  });

  describe('getSquareBounds', () => {
    it('should create square with equal dimensions', () => {
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 10, y: 10 };
      const bounds = getSquareBounds(p1, p2);
      expect(bounds.size).toBe(10);
    });

    it('should use max dimension when dragging rectangle', () => {
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 20, y: 5 };
      const bounds = getSquareBounds(p1, p2);
      expect(bounds.size).toBe(20); // max of 20 and 5
    });

    it('should handle negative direction', () => {
      const p1: Point = { x: 10, y: 10 };
      const p2: Point = { x: 0, y: 0 };
      const bounds = getSquareBounds(p1, p2);
      expect(bounds.size).toBe(10);
      expect(bounds.x).toBe(0);
      expect(bounds.y).toBe(0);
    });
  });

  describe('calculateRadius', () => {
    it('should calculate circle radius from center and edge point', () => {
      const center: Point = { x: 0, y: 0 };
      const edge: Point = { x: 5, y: 0 };
      expect(calculateRadius([center, edge])).toBe(5);
    });

    it('should return 0 for single point', () => {
      const center: Point = { x: 0, y: 0 };
      expect(calculateRadius([center])).toBe(0);
    });

    it('should handle diagonal radius', () => {
      const center: Point = { x: 0, y: 0 };
      const edge: Point = { x: 3, y: 4 };
      expect(calculateRadius([center, edge])).toBe(5);
    });
  });

  describe('calculateDimensions', () => {
    it('should calculate width and height from rectangle corners', () => {
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 15, y: 25 };
      const dims = calculateDimensions([p1, p2]);
      expect(dims).toEqual({ width: 15, height: 25 });
    });

    it('should return zero dimensions for single point', () => {
      const p: Point = { x: 5, y: 5 };
      const dims = calculateDimensions([p]);
      expect(dims).toEqual({ width: 0, height: 0 });
    });

    it('should handle negative coordinates', () => {
      const p1: Point = { x: -10, y: -20 };
      const p2: Point = { x: 10, y: 20 };
      const dims = calculateDimensions([p1, p2]);
      expect(dims).toEqual({ width: 20, height: 40 });
    });
  });

  describe('calculateAngleDegrees', () => {
    it('should calculate 0 degrees for horizontal line pointing right', () => {
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 10, y: 0 };
      const angle = calculateAngleDegrees([p1, p2]);
      expect(Math.abs(angle - 0) < 0.1).toBe(true);
    });

    it('should calculate 90 degrees for vertical line pointing up', () => {
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 0, y: 10 };
      const angle = calculateAngleDegrees([p1, p2]);
      expect(Math.abs(angle - 90) < 0.1).toBe(true);
    });

    it('should calculate 45 degrees for diagonal line', () => {
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 10, y: 10 };
      const angle = calculateAngleDegrees([p1, p2]);
      expect(Math.abs(angle - 45) < 0.1).toBe(true);
    });

    it('should normalize negative angles to 0-360 range', () => {
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: -10, y: 0 };
      const angle = calculateAngleDegrees([p1, p2]);
      expect(angle).toBeGreaterThanOrEqual(0);
      expect(angle).toBeLessThanOrEqual(360);
    });

    it('should return 0 for empty points', () => {
      expect(calculateAngleDegrees([])).toBe(0);
    });
  });

  describe('findAlignmentSnaps', () => {
    it('should find X alignment when centered objects align', () => {
      const boundingBox = { minX: 0, maxX: 20, minY: 0, maxY: 10 };
      const otherObjects = [
        { points: [{ x: 10, y: 30 }, { x: 10, y: 50 }] }, // vertical line at x=10
      ];
      const snaps = findAlignmentSnaps(boundingBox, otherObjects, 15);
      expect(snaps.x).toBe(10);
    });

    it('should find Y alignment when centered objects align', () => {
      const boundingBox = { minX: 0, maxX: 10, minY: 0, maxY: 20 };
      const otherObjects = [
        { points: [{ x: 30, y: 10 }, { x: 50, y: 10 }] }, // horizontal line at y=10
      ];
      const snaps = findAlignmentSnaps(boundingBox, otherObjects, 15);
      expect(snaps.y).toBe(10);
    });

    it('should not snap if distance exceeds threshold', () => {
      const boundingBox = { minX: 0, maxX: 20, minY: 0, maxY: 10 };
      const otherObjects = [
        { points: [{ x: 100, y: 100 }, { x: 100, y: 200 }] },
      ];
      const snaps = findAlignmentSnaps(boundingBox, otherObjects, 15);
      expect(snaps.x).toBeUndefined();
      expect(snaps.y).toBeUndefined();
    });

    it('should handle multiple objects and pick closest', () => {
      const boundingBox = { minX: 0, maxX: 20, minY: 0, maxY: 10 };
      const otherObjects = [
        { points: [{ x: 5, y: 0 }, { x: 5, y: 100 }] }, // x=5, center is 10, dist=5
        { points: [{ x: 30, y: 0 }, { x: 30, y: 100 }] }, // x=30, center is 10, dist=20 (too far)
      ];
      const snaps = findAlignmentSnaps(boundingBox, otherObjects, 10);
      expect(snaps.x).toBe(5); // closer one is picked
    });

    it('should return empty alignments for single object', () => {
      const boundingBox = { minX: 0, maxX: 20, minY: 0, maxY: 10 };
      const snaps = findAlignmentSnaps(boundingBox, [], 15);
      expect(snaps.x).toBeUndefined();
      expect(snaps.y).toBeUndefined();
    });
  });
});
