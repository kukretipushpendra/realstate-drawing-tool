import { renderHook, act } from '@testing-library/react';
import { useDrawingCanvas } from '../useDrawingCanvas';
import type { Point, DrawingObject } from '../types';

describe('Drawing Tab Integration Tests', () => {
  describe('Complete Drawing Workflow', () => {
    it('should support full draw-complete-select-move-delete cycle', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      // Step 1: Draw a line
      act(() => {
        result.current.setMode('straightLine');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 10, y: 10 });
      });

      expect(result.current.canvasState.currentObject?.points.length).toBe(2);

      // Step 2: Complete the object
      act(() => {
        result.current.completeObject();
      });

      expect(result.current.canvasState.objects.length).toBe(1);
      expect(result.current.canvasState.currentObject).toBeNull();

      const drawnObject = result.current.canvasState.objects[0];
      expect(drawnObject.type).toBe('straightLine');
      expect(drawnObject.points).toEqual([
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ]);

      // Step 3: Select the object
      act(() => {
        result.current.selectObject(drawnObject.id);
      });

      expect(result.current.canvasState.selectedId).toBe(drawnObject.id);

      // Step 4: Move the object
      act(() => {
        result.current.moveObjectByDelta(drawnObject.id, 5, 5);
      });

      const movedObject = result.current.canvasState.objects[0];
      expect(movedObject.points[0]).toEqual({ x: 5, y: 5 });
      expect(movedObject.points[1]).toEqual({ x: 15, y: 15 });

      // Step 5: Delete the object
      act(() => {
        result.current.deleteObject(drawnObject.id);
      });

      expect(result.current.canvasState.objects.length).toBe(0);
    });

    it('should handle multiple objects on same canvas', () => {
      const { result } = renderHook(() => useDrawingCanvas());
      const drawnObjects: DrawingObject[] = [];

      // Draw 3 different shapes
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.setMode(i === 0 ? 'straightLine' : i === 1 ? 'rectangle' : 'circle');
          result.current.addPoint({ x: i * 20, y: 0 });
          result.current.addPoint({ x: i * 20 + 10, y: 10 });
          result.current.completeObject();
        });
      }

      expect(result.current.canvasState.objects.length).toBe(3);
      expect(result.current.canvasState.objects[0].type).toBe('straightLine');
      expect(result.current.canvasState.objects[1].type).toBe('rectangle');
      expect(result.current.canvasState.objects[2].type).toBe('circle');
    });

    it('should maintain object properties through move operations', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      act(() => {
        result.current.setMode('rectangle');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 20, y: 30 });
        result.current.completeObject();
      });

      const originalObject = result.current.canvasState.objects[0];
      const originalId = originalObject.id;
      const originalType = originalObject.type;

      act(() => {
        result.current.moveObjectByDelta(originalId, 10, 15);
      });

      const movedObject = result.current.canvasState.objects[0];
      expect(movedObject.id).toBe(originalId);
      expect(movedObject.type).toBe(originalType);
      expect(movedObject.properties).toBeDefined();
    });
  });

  describe('Undo/Redo Integration', () => {
    it('should undo through complete workflow', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      // Draw and complete
      act(() => {
        result.current.setMode('straightLine');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 10, y: 10 });
        result.current.completeObject();
      });

      expect(result.current.canvasState.objects.length).toBe(1);
      const objectId = result.current.canvasState.objects[0].id;

      // Move
      act(() => {
        result.current.moveObjectByDelta(objectId, 5, 5);
      });

      const movedPoints = result.current.canvasState.objects[0].points;
      expect(movedPoints[0]).toEqual({ x: 5, y: 5 });

      // Undo move
      act(() => {
        result.current.undo();
      });

      const unmovedPoints = result.current.canvasState.objects[0].points;
      expect(unmovedPoints[0]).toEqual({ x: 0, y: 0 });

      // Undo complete
      act(() => {
        result.current.undo();
      });

      expect(result.current.canvasState.objects.length).toBe(0);
      expect(result.current.canvasState.currentObject).toBeDefined();
      expect(result.current.canvasState.currentObject?.points.length).toBe(2);
    });

    it('should redo after undo in workflow', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      act(() => {
        result.current.setMode('rectangle');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 15, y: 25 });
        result.current.completeObject();

        const objId = result.current.canvasState.objects[0].id;
        result.current.moveObjectByDelta(objId, 10, 10);
        result.current.undo();
      });

      expect(result.current.canvasState.objects[0].points[0]).toEqual({ x: 0, y: 0 });

      act(() => {
        result.current.redo();
      });

      expect(result.current.canvasState.objects[0].points[0]).toEqual({ x: 10, y: 10 });
    });

    it('should clear future on new action after undo', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      // Create and move object
      act(() => {
        result.current.setMode('circle');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 5, y: 0 });
        result.current.completeObject();

        const objId = result.current.canvasState.objects[0].id;
        result.current.moveObjectByDelta(objId, 5, 5);
        result.current.undo();
      });

      expect(result.current.canRedo).toBe(true);

      // Draw new object (should clear redo stack)
      act(() => {
        result.current.setMode('straightLine');
        result.current.addPoint({ x: 20, y: 20 });
        result.current.addPoint({ x: 30, y: 30 });
        result.current.completeObject();
      });

      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('Selection and Manipulation', () => {
    it('should maintain selection across operations', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      act(() => {
        result.current.setMode('rectangle');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 20, y: 20 });
        result.current.completeObject();
      });

      const objectId = result.current.canvasState.objects[0].id;

      // Select and move without deselecting
      act(() => {
        result.current.selectObject(objectId);
        result.current.moveObjectByDelta(objectId, 5, 5);
      });

      expect(result.current.canvasState.selectedId).toBe(objectId);

      // Move again
      act(() => {
        result.current.moveObjectByDelta(objectId, 3, 3);
      });

      expect(result.current.canvasState.selectedId).toBe(objectId);
    });

    it('should support switching selection between objects', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      // Draw two objects
      act(() => {
        result.current.setMode('straightLine');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 10, y: 10 });
        result.current.completeObject();

        result.current.setMode('circle');
        result.current.addPoint({ x: 30, y: 30 });
        result.current.addPoint({ x: 35, y: 35 });
        result.current.completeObject();
      });

      const obj1Id = result.current.canvasState.objects[0].id;
      const obj2Id = result.current.canvasState.objects[1].id;

      // Select first
      act(() => {
        result.current.selectObject(obj1Id);
      });

      expect(result.current.canvasState.selectedId).toBe(obj1Id);

      // Switch to second
      act(() => {
        result.current.selectObject(obj2Id);
      });

      expect(result.current.canvasState.selectedId).toBe(obj2Id);

      // Deselect
      act(() => {
        result.current.selectObject(null);
      });

      expect(result.current.canvasState.selectedId).toBeNull();
    });
  });

  describe('Drawing Mode Transitions', () => {
    it('should handle mode changes mid-draw', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      act(() => {
        result.current.setMode('straightLine');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 10, y: 10 });
      });

      expect(result.current.canvasState.currentObject?.mode).toBe('straightLine');

      // Cancel and switch mode
      act(() => {
        result.current.cancelObject();
      });

      expect(result.current.canvasState.currentObject).toBeNull();

      // Start new shape with different mode
      act(() => {
        result.current.setMode('rectangle');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 20, y: 20 });
        result.current.completeObject();
      });

      expect(result.current.canvasState.objects[0].mode).toBe('rectangle');
    });

    it('should validate minimum points for each mode before completion', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      // Lines need at least 2 points
      act(() => {
        result.current.setMode('straightLine');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.completeObject();
      });

      expect(result.current.canvasState.objects.length).toBe(0); // Should not add with only 1 point

      // Add second point and complete
      act(() => {
        result.current.addPoint({ x: 10, y: 10 });
        result.current.completeObject();
      });

      expect(result.current.canvasState.objects.length).toBe(1);
    });
  });

  describe('Property Auto-Calculation in Workflow', () => {
    it('should calculate all properties on completion', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      act(() => {
        result.current.setMode('straightLine');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 3, y: 4 });
        result.current.completeObject();
      });

      const obj = result.current.canvasState.objects[0];
      expect(obj.properties).toBeDefined();
      expect(obj.properties?.distance).toBe(5); // 3-4-5 triangle
      expect(obj.properties?.angle).toBeDefined();
    });

    it('should preserve properties through move operations', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      act(() => {
        result.current.setMode('rectangle');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 20, y: 30 });
        result.current.completeObject();
      });

      const originalWidth = result.current.canvasState.objects[0].properties?.width;
      const originalHeight = result.current.canvasState.objects[0].properties?.height;

      act(() => {
        const objId = result.current.canvasState.objects[0].id;
        result.current.moveObjectByDelta(objId, 100, 50);
      });

      const movedObj = result.current.canvasState.objects[0];
      expect(movedObj.properties?.width).toBe(originalWidth);
      expect(movedObj.properties?.height).toBe(originalHeight);
    });
  });

  describe('Complex Multi-Object Scenarios', () => {
    it('should handle drawing, moving, and deleting multiple objects', () => {
      const { result } = renderHook(() => useDrawingCanvas());
      const objectIds: string[] = [];

      // Draw 5 objects
      for (let i = 0; i < 5; i++) {
        act(() => {
          const modes = ['straightLine', 'rectangle', 'circle'] as const;
          result.current.setMode(modes[i % 3]);
          result.current.addPoint({ x: i * 15, y: 0 });
          result.current.addPoint({ x: i * 15 + 10, y: 10 });
          result.current.completeObject();
        });
        objectIds.push(result.current.canvasState.objects[i].id);
      }

      expect(result.current.canvasState.objects.length).toBe(5);

      // Move every other object
      act(() => {
        for (let i = 0; i < 5; i += 2) {
          result.current.moveObjectByDelta(objectIds[i], 5, 5);
        }
      });

      expect(result.current.canvasState.objects.length).toBe(5);
      expect(result.current.canvasState.objects[0].points[0]).toEqual({ x: 5, y: 5 });
      expect(result.current.canvasState.objects[1].points[0]).toEqual({ x: 15, y: 0 }); // Unmoved

      // Delete objects 1 and 3
      act(() => {
        result.current.deleteObject(objectIds[1]);
        result.current.deleteObject(objectIds[3]);
      });

      expect(result.current.canvasState.objects.length).toBe(3);
    });

    it('should handle rapid draw-complete cycles', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.setMode('circle');
          result.current.addPoint({ x: i * 10, y: 0 });
          result.current.addPoint({ x: i * 10 + 5, y: 5 });
          result.current.completeObject();
        }
      });

      expect(result.current.canvasState.objects.length).toBe(10);
      expect(result.current.canvasState.currentObject).toBeNull();

      // Verify all have unique IDs
      const ids = new Set(result.current.canvasState.objects.map((o) => o.id));
      expect(ids.size).toBe(10);
    });
  });

  describe('State Consistency', () => {
    it('should maintain valid state after every operation', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      const validateState = () => {
        const { objects, currentObject, selectedId, mode } = result.current.canvasState;
        // If currentObject exists, it shouldn't be in objects array
        if (currentObject) {
          expect(objects.find((o) => o.id === currentObject.id)).toBeUndefined();
        }
        // If selectedId, that object must exist
        if (selectedId) {
          expect(objects.find((o) => o.id === selectedId)).toBeDefined();
        }
        // All objects must have required fields
        objects.forEach((obj) => {
          expect(obj.id).toBeDefined();
          expect(obj.mode).toBeDefined();
          expect(obj.points).toBeDefined();
          expect(obj.points.length).toBeGreaterThan(0);
        });
      };

      // Validate after draw
      act(() => {
        result.current.setMode('straightLine');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 10, y: 10 });
      });
      validateState();

      // Validate after complete
      act(() => {
        result.current.completeObject();
      });
      validateState();

      // Validate after select
      const objId = result.current.canvasState.objects[0].id;
      act(() => {
        result.current.selectObject(objId);
      });
      validateState();

      // Validate after move
      act(() => {
        result.current.moveObjectByDelta(objId, 5, 5);
      });
      validateState();

      // Validate after undo
      act(() => {
        result.current.undo();
      });
      validateState();
    });

    it('should sync selectedId with available objects', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      // Draw and select
      act(() => {
        result.current.setMode('circle');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 10, y: 10 });
        result.current.completeObject();

        const objId = result.current.canvasState.objects[0].id;
        result.current.selectObject(objId);
      });

      expect(result.current.canvasState.selectedId).not.toBeNull();

      // Delete selected object
      const selectedId = result.current.canvasState.selectedId;
      act(() => {
        result.current.deleteObject(selectedId!);
      });

      // selectedId should not point to deleted object
      const stillExists = result.current.canvasState.objects.some((o) => o.id === selectedId);
      expect(stillExists).toBe(false);
    });
  });

  describe('Mode Isolation', () => {
    it('should not mix drawing from different modes unintentionally', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      act(() => {
        result.current.setMode('straightLine');
        result.current.addPoint({ x: 0, y: 0 });
      });

      expect(result.current.canvasState.currentObject?.mode).toBe('straightLine');

      // Complete without finishing
      act(() => {
        result.current.completeObject();
      });

      expect(result.current.canvasState.objects.length).toBe(0); // Incomplete object not added

      // New mode starts fresh
      act(() => {
        result.current.setMode('rectangle');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 20, y: 20 });
        result.current.completeObject();
      });

      expect(result.current.canvasState.objects[0].mode).toBe('rectangle');
    });
  });
});
