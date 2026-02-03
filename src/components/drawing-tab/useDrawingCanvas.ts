import { useState, useCallback } from 'react';
import type { CanvasState, DrawingObject, DrawingMode, Point } from './types';
import { generateId, downloadJSON } from './geometry';

export const useDrawingCanvas = () => {
  const [canvasState, setCanvasState] = useState<CanvasState>({
    objects: [],
    currentObject: null,
    selectedId: null,
  });
  const [mode, setMode] = useState<DrawingMode>(null);

  const addPoint = useCallback((point: Point) => {
    setCanvasState((prev) => {
      // If no current object exists, create a new one
      if (!prev.currentObject) {
        return {
          ...prev,
          currentObject: {
            id: generateId(),
            type: mode,
            points: [point],
            properties: {},
            timestamp: Date.now(),
          },
        };
      }

      // Add point to existing object
      return {
        ...prev,
        currentObject: {
          ...prev.currentObject,
          points: [...(prev.currentObject.points || []), point],
        },
      };
    });
  }, [mode]);

  const completeObject = useCallback(() => {
    setCanvasState((prev) => {
      // Validate that object has required data
      if (
        !prev.currentObject ||
        !prev.currentObject.points ||
        prev.currentObject.points.length === 0
      ) {
        return prev;
      }

      // Validate minimum points for each shape type
      const minPoints: Record<string, number> = {
        freeDraw: 2,
        straightLine: 2,
        rectangle: 2,
        square: 2,
        circle: 2,
        angle: 2,
        curve: 2,
      };

      const requiredPoints = minPoints[prev.currentObject.type || ''] || 2;
      if (prev.currentObject.points.length < requiredPoints) {
        return prev;
      }

      // Create new completed object
      const completedObject: DrawingObject = {
        ...prev.currentObject,
        type: prev.currentObject.type || null,
        points: prev.currentObject.points,
      } as DrawingObject;

      // Add to objects array and reset currentObject
      return {
        ...prev,
        objects: [...prev.objects, completedObject],
        currentObject: null,
      };
    });
  }, []);

  const cancelObject = useCallback(() => {
    setCanvasState((prev) => ({
      ...prev,
      currentObject: null,
    }));
  }, []);

  const clearCanvas = useCallback(() => {
    setCanvasState({
      objects: [],
      currentObject: null,
      selectedId: null,
    });
  }, []);

  const saveDrawing = useCallback(() => {
    const drawingData = {
      version: '1.0',
      timestamp: Date.now(),
      objects: canvasState.objects,
    };
    downloadJSON(drawingData, 'drawing.json');
  }, [canvasState.objects]);

  const undo = useCallback(() => {
    setCanvasState((prev) => ({
      ...prev,
      objects: prev.objects.slice(0, -1),
    }));
  }, []);

  const updateCurrentObjectPoints = useCallback((points: Point[]) => {
    setCanvasState((prev) => ({
      ...prev,
      currentObject: prev.currentObject
        ? { ...prev.currentObject, points }
        : null,
    }));
  }, []);

  const updateCurrentObjectProperties = useCallback((properties: Record<string, any>) => {
    setCanvasState((prev) => ({
      ...prev,
      currentObject: prev.currentObject
        ? { ...prev.currentObject, properties: { ...prev.currentObject.properties, ...properties } }
        : null,
    }));
  }, []);

  const deleteObject = useCallback((id: string) => {
    setCanvasState((prev) => ({
      ...prev,
      objects: prev.objects.filter((obj) => obj.id !== id),
    }));
  }, []);

  return {
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
    deleteObject,
  };
};
