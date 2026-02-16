import { renderHook, act } from '@testing-library/react';
import { useDrawingCanvas } from '../useDrawingCanvas';
import { DrawingMode, DrawingObject, Point } from '../types';

describe('useDrawingCanvas Hook', () => {
  describe('Initialization', () => {
    it('should initialize with empty canvas state', () => {
      const { result } = renderHook(() => useDrawingCanvas());
      expect(result.current.canvasState.objects).toEqual([]);
      expect(result.current.canvasState.selectedId).toBeNull();
    });

    it('should initialize mode to null', () => {
      const { result } = renderHook(() => useDrawingCanvas());
      expect(result.current.mode).toBeNull();
    });

    it('should allow setting initial drawing mode', () => {
      const { result } = renderHook(() => useDrawingCanvas());
      act(() => {
        result.current.setMode('straightLine');
      });
      expect(result.current.mode).toBe('straightLine');
    });
  });

  describe('setMode', () => {
    it('should change drawing mode', () => {
      const { result } = renderHook(() => useDrawingCanvas());
      act(() => {
        result.current.setMode('straightLine');
      });
      expect(result.current.mode).toBe('straightLine');
    });

    it('should accept valid drawing modes', () => {
      const { result } = renderHook(() => useDrawingCanvas());
      const modes: DrawingMode[] = [
        'freeDraw',
        'straightLine',
        'orthoLine',
        'rectangle',
        'square',
        'circle',
        'angle',
        'curve',
      ];

      modes.forEach((mode) => {
        act(() => {
          result.current.setMode(mode);
        });
        expect(result.current.mode).toBe(mode);
      });
    });
  });

  describe('addPoint', () => {
    it('should create new object with first point', () => {
      const { result } = renderHook(() => useDrawingCanvas());
      const point: Point = { x: 10, y: 20 };

      act(() => {
        result.current.setDrawingMode('freeDraw');
        result.current.addPoint(point);
      });

      expect(result.current.canvasState.currentObject).toBeDefined();
      expect(result.current.canvasState.currentObject?.points).toContainEqual(point);
    });

    it('should add multiple points to current object', () => {
      const { result } = renderHook(() => useDrawingCanvas());
      const p1: Point = { x: 10, y: 20 };
      const p2: Point = { x: 30, y: 40 };
      const p3: Point = { x: 50, y: 60 };

      act(() => {
        result.current.setDrawingMode('freeDraw');
        result.current.addPoint(p1);
        result.current.addPoint(p2);
        result.current.addPoint(p3);
      });

      expect(result.current.canvasState.currentObject?.points).toEqual([p1, p2, p3]);
    });

    it('should preserve existing object data', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      act(() => {
        result.current.setDrawingMode('straightLine');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 10, y: 10 });
      });

      expect(result.current.canvasState.currentObject?.mode).toBe('straightLine');
      expect(result.current.canvasState.currentObject?.points.length).toBe(2);
    });
  });

  describe('completeObject', () => {
    it('should add object to canvas when complete', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      act(() => {
        result.current.setDrawingMode('straightLine');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 10, y: 10 });
        result.current.completeObject();
      });

      expect(result.current.canvasState.objects.length).toBe(1);
      expect(result.current.canvasState.currentObject).toBeNull();
    });

    it('should auto-calculate properties on completion', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      act(() => {
        result.current.setDrawingMode('straightLine');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 10, y: 10 });
        result.current.completeObject();
      });

      const obj = result.current.canvasState.objects[0];
      expect(obj.properties).toBeDefined();
      expect(obj.properties?.angle).toBeDefined();
      expect(obj.properties?.distance).toBeDefined();
    });

    it('should not add object if fewer than minimum required points', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      act(() => {
        result.current.setDrawingMode('straightLine');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.completeObject();
      });

      // Should fail validation - straightLine needs 2 points
      expect(result.current.canvasState.objects.length).toBe(0);
    });

    it('should record history on completion', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      act(() => {
        result.current.setDrawingMode('straightLine');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 10, y: 10 });
        result.current.completeObject();
      });

      expect(result.current.canvasState.past.length).toBeGreaterThan(0);
    });

    it('should clear future stack on completion', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      act(() => {
        // Draw first object
        result.current.setDrawingMode('straightLine');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 10, y: 10 });
        result.current.completeObject();

        // Undo
        result.current.undo();

        // Draw second object (creates future)
        result.current.setDrawingMode('rectangle');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 20, y: 30 });
        result.current.completeObject();
      });

      expect(result.current.canvasState.future.length).toBe(0);
    });
  });

  describe('undo/redo', () => {
    it('should undo last object addition', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      act(() => {
        result.current.setDrawingMode('rectangle');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 10, y: 10 });
        result.current.completeObject();
      });

      expect(result.current.canvasState.objects.length).toBe(1);

      act(() => {
        result.current.undo();
      });

      expect(result.current.canvasState.objects.length).toBe(0);
    });

    it('should redo after undo', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      act(() => {
        result.current.setDrawingMode('rectangle');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 10, y: 10 });
        result.current.completeObject();
        result.current.undo();
      });

      expect(result.current.canvasState.objects.length).toBe(0);

      act(() => {
        result.current.redo();
      });

      expect(result.current.canvasState.objects.length).toBe(1);
    });

    it('should not undo when history is empty', () => {
      const { result } = renderHook(() => useDrawingCanvas());
      act(() => {
        result.current.undo();
      });
      expect(result.current.canvasState.objects.length).toBe(0);
    });

    it('should not redo when future is empty', () => {
      const { result } = renderHook(() => useDrawingCanvas());
      act(() => {
        result.current.setDrawingMode('rectangle');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 10, y: 10 });
        result.current.completeObject();
        result.current.redo(); // should be no-op
      });
      expect(result.current.canvasState.objects.length).toBe(1);
    });

    it('should maintain undo/redo across multiple operations', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      // Add 3 objects
      act(() => {
        for (let i = 0; i < 3; i++) {
          result.current.setDrawingMode('rectangle');
          result.current.addPoint({ x: 0, y: 0 });
          result.current.addPoint({ x: 10, y: 10 });
          result.current.completeObject();
        }
      });

      expect(result.current.canvasState.objects.length).toBe(3);

      // Undo all
      act(() => {
        result.current.undo();
        result.current.undo();
        result.current.undo();
      });

      expect(result.current.canvasState.objects.length).toBe(0);

      // Redo all
      act(() => {
        result.current.redo();
        result.current.redo();
        result.current.redo();
      });

      expect(result.current.canvasState.objects.length).toBe(3);
    });
  });

  describe('selectObject', () => {
    it('should select object by id', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      let objectId = '';
      act(() => {
        result.current.setDrawingMode('rectangle');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 10, y: 10 });
        result.current.completeObject();
        objectId = result.current.canvasState.objects[0].id;
      });

      act(() => {
        result.current.selectObject(objectId);
      });

      expect(result.current.canvasState.selectedId).toBe(objectId);
    });

    it('should deselect when passed null', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      let objectId = '';
      act(() => {
        result.current.setDrawingMode('rectangle');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 10, y: 10 });
        result.current.completeObject();
        objectId = result.current.canvasState.objects[0].id;
        result.current.selectObject(objectId);
      });

      expect(result.current.canvasState.selectedId).toBe(objectId);

      act(() => {
        result.current.selectObject(null);
      });

      expect(result.current.canvasState.selectedId).toBeNull();
    });

    it('should not record history when selecting', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      let objectId = '';
      act(() => {
        result.current.setDrawingMode('rectangle');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 10, y: 10 });
        result.current.completeObject();
        objectId = result.current.canvasState.objects[0].id;
        const historyLength = result.current.canvasState.past.length;

        result.current.selectObject(objectId);

        // History should not change
        expect(result.current.canvasState.past.length).toBe(historyLength);
      });
    });
  });

  describe('moveObjectByDelta', () => {
    it('should move object by delta and record history', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      let objectId = '';
      act(() => {
        result.current.setDrawingMode('straightLine');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 10, y: 10 });
        result.current.completeObject();
        objectId = result.current.canvasState.objects[0].id;
      });

      const originalPoints = [...result.current.canvasState.objects[0].points];
      const historyLength = result.current.canvasState.past.length;

      act(() => {
        result.current.moveObjectByDelta(objectId, 5, 5);
      });

      const newPoints = result.current.canvasState.objects[0].points;
      expect(newPoints[0].x).toBe(originalPoints[0].x + 5);
      expect(newPoints[0].y).toBe(originalPoints[0].y + 5);
      expect(newPoints[1].x).toBe(originalPoints[1].x + 5);
      expect(newPoints[1].y).toBe(originalPoints[1].y + 5);
      expect(result.current.canvasState.past.length).toBe(historyLength + 1);
    });

    it('should handle negative delta (move left/down)', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      let objectId = '';
      act(() => {
        result.current.setDrawingMode('rectangle');
        result.current.addPoint({ x: 20, y: 20 });
        result.current.addPoint({ x: 30, y: 30 });
        result.current.completeObject();
        objectId = result.current.canvasState.objects[0].id;
      });

      act(() => {
        result.current.moveObjectByDelta(objectId, -10, -10);
      });

      const points = result.current.canvasState.objects[0].points;
      expect(points[0].x).toBe(10);
      expect(points[0].y).toBe(10);
      expect(points[1].x).toBe(20);
      expect(points[1].y).toBe(20);
    });

    it('should not affect other objects', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      let obj1Id = '';
      let obj2Id = '';
      act(() => {
        result.current.setDrawingMode('rectangle');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 10, y: 10 });
        result.current.completeObject();
        obj1Id = result.current.canvasState.objects[0].id;

        result.current.addPoint({ x: 50, y: 50 });
        result.current.addPoint({ x: 60, y: 60 });
        result.current.completeObject();
        obj2Id = result.current.canvasState.objects[1].id;

        const obj2OriginalPoints = [...result.current.canvasState.objects[1].points];

        result.current.moveObjectByDelta(obj1Id, 5, 5);

        // Verify obj2 points didn't change
        expect(result.current.canvasState.objects[1].points).toEqual(obj2OriginalPoints);
      });
    });
  });

  describe('deleteObject', () => {
    it('should remove object from canvas', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      let objectId = '';
      act(() => {
        result.current.setDrawingMode('rectangle');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 10, y: 10 });
        result.current.completeObject();
        objectId = result.current.canvasState.objects[0].id;
      });

      expect(result.current.canvasState.objects.length).toBe(1);

      act(() => {
        result.current.deleteObject(objectId);
      });

      expect(result.current.canvasState.objects.length).toBe(0);
    });

    it('should record history on delete', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      let objectId = '';
      act(() => {
        result.current.setDrawingMode('rectangle');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 10, y: 10 });
        result.current.completeObject();
        objectId = result.current.canvasState.objects[0].id;
        const beforeDelete = result.current.canvasState.past.length;

        result.current.deleteObject(objectId);

        expect(result.current.canvasState.past.length).toBe(beforeDelete + 1);
      });
    });

    it('should allow undo after delete', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      let objectId = '';
      act(() => {
        result.current.setDrawingMode('rectangle');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 10, y: 10 });
        result.current.completeObject();
        objectId = result.current.canvasState.objects[0].id;
      });

      act(() => {
        result.current.deleteObject(objectId);
      });

      expect(result.current.canvasState.objects.length).toBe(0);

      act(() => {
        result.current.undo();
      });

      expect(result.current.canvasState.objects.length).toBe(1);
    });
  });

  describe('Property Auto-calculation', () => {
    it('should calculate distance for line', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      act(() => {
        result.current.setDrawingMode('straightLine');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 3, y: 4 });
        result.current.completeObject();
      });

      const obj = result.current.canvasState.objects[0];
      expect(obj.properties?.distance).toBe(5); // 3-4-5 triangle
    });

    it('should calculate angle for line', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      act(() => {
        result.current.setDrawingMode('straightLine');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 10, y: 0 });
        result.current.completeObject();
      });

      const obj = result.current.canvasState.objects[0];
      expect(obj.properties?.angle).toBe(0); // horizontal
    });

    it('should calculate radius for circle', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      act(() => {
        result.current.setDrawingMode('circle');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 5, y: 0 });
        result.current.completeObject();
      });

      const obj = result.current.canvasState.objects[0];
      expect(obj.properties?.radius).toBe(5);
    });

    it('should calculate width/height for rectangle', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      act(() => {
        result.current.setDrawingMode('rectangle');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 15, y: 25 });
        result.current.completeObject();
      });

      const obj = result.current.canvasState.objects[0];
      expect(obj.properties?.width).toBe(15);
      expect(obj.properties?.height).toBe(25);
    });
  });

  describe('Complex Workflows', () => {
    it('should handle draw-select-move-delete workflow', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      let objectId = '';

      // Draw
      act(() => {
        result.current.setDrawingMode('rectangle');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 10, y: 10 });
        result.current.completeObject();
        objectId = result.current.canvasState.objects[0].id;
      });

      expect(result.current.canvasState.objects.length).toBe(1);

      // Select
      act(() => {
        result.current.selectObject(objectId);
      });

      expect(result.current.canvasState.selectedId).toBe(objectId);

      // Move
      act(() => {
        result.current.moveObjectByDelta(objectId, 5, 5);
      });

      const points = result.current.canvasState.objects[0].points;
      expect(points[0]).toEqual({ x: 5, y: 5 });

      // Delete
      act(() => {
        result.current.deleteObject(objectId);
      });

      expect(result.current.canvasState.objects.length).toBe(0);
    });

    it('should handle undo through entire workflow', () => {
      const { result } = renderHook(() => useDrawingCanvas());

      let objectId = '';

      act(() => {
        result.current.setDrawingMode('rectangle');
        result.current.addPoint({ x: 0, y: 0 });
        result.current.addPoint({ x: 10, y: 10 });
        result.current.completeObject();
        objectId = result.current.canvasState.objects[0].id;

        result.current.moveObjectByDelta(objectId, 5, 5);
        result.current.deleteObject(objectId);
      });

      expect(result.current.canvasState.objects.length).toBe(0);

      // Undo delete
      act(() => {
        result.current.undo();
      });

      expect(result.current.canvasState.objects.length).toBe(1);

      // Undo move
      act(() => {
        result.current.undo();
      });

      const points = result.current.canvasState.objects[0].points;
      expect(points[0]).toEqual({ x: 0, y: 0 });

      // Undo draw
      act(() => {
        result.current.undo();
      });

      expect(result.current.canvasState.objects.length).toBe(0);
    });
  });
});
