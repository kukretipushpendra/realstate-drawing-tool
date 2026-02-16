import { useState, useCallback } from 'react';
import type { Point } from './types';
import { feetToPixels } from './unitConversion';

export interface GridSettings {
  enabled: boolean;
  visible: boolean;
  snapToGrid: boolean;
  gridSize: number; // in pixels
  gridColor: string;
  snapThreshold: number; // distance in pixels to snap
  snapIncrementFeet: number; // snap increment in feet (if > 0 it'll be used instead of gridSize)
}

const DEFAULT_GRID_SETTINGS: GridSettings = {
  enabled: true,
  visible: true,
  snapToGrid: true,
  gridSize: 20, // 20px = 4 feet (PIXELS_PER_FOOT = 5)
  gridColor: '#22c55e',
  snapThreshold: 10,
  snapIncrementFeet: 0.5,
};

export const useGridSettings = () => {
  const [gridSettings, setGridSettings] = useState<GridSettings>(DEFAULT_GRID_SETTINGS);

  const updateGridSettings = useCallback((updates: Partial<GridSettings>) => {
    setGridSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Snap a point to the nearest grid intersection
   * Returns the original point if snap is disabled or threshold not met
   */
  const snapPoint = useCallback(
    (point: Point): Point => {
      if (!gridSettings.snapToGrid || !gridSettings.enabled) {
        return point;
      }

      const { gridSize, snapThreshold, snapIncrementFeet } = gridSettings;
      const snapSize = snapIncrementFeet && snapIncrementFeet > 0 ? feetToPixels(snapIncrementFeet) : gridSize;
      const snappedX = Math.round(point.x / snapSize) * snapSize;
      const snappedY = Math.round(point.y / snapSize) * snapSize;

      const distToSnap = Math.sqrt(
        Math.pow(point.x - snappedX, 2) + Math.pow(point.y - snappedY, 2)
      );

      // Only snap if within threshold
      if (distToSnap <= snapThreshold) {
        return { x: snappedX, y: snappedY };
      }

      return point;
    },
    [gridSettings]
  );

  /**
   * Snap an array of points to the grid
   */
  const snapPoints = useCallback(
    (points: Point[]): Point[] => {
      return points.map((point) => snapPoint(point));
    },
    [snapPoint]
  );

  /**
   * Get visual feedback for snap point (shows indicator at snap position)
   */
  const getSnapIndicator = useCallback(
    (point: Point): { x: number; y: number; visible: boolean } | null => {
      if (!gridSettings.snapToGrid || !gridSettings.enabled) {
        return null;
      }

      const { gridSize, snapThreshold, snapIncrementFeet } = gridSettings;
      const snapSize = snapIncrementFeet && snapIncrementFeet > 0 ? feetToPixels(snapIncrementFeet) : gridSize;
      const snappedX = Math.round(point.x / snapSize) * snapSize;
      const snappedY = Math.round(point.y / snapSize) * snapSize;

      const distToSnap = Math.sqrt(
        Math.pow(point.x - snappedX, 2) + Math.pow(point.y - snappedY, 2)
      );

      // Show indicator only if within threshold
      if (distToSnap <= snapThreshold) {
        return { x: snappedX, y: snappedY, visible: true };
      }

      return null;
    },
    [gridSettings]
  );

  return {
    gridSettings,
    updateGridSettings,
    snapPoint,
    snapPoints,
    getSnapIndicator,
  };
};
