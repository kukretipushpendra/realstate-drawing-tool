import React from 'react';
import type { DrawingObject, Point } from '../types';
import { Group, Rect, Circle } from 'react-konva';
import { FreeDrawLine } from './FreeDrawLine';
import { StraightLine } from './StraightLine';
import { RectangleShape } from './RectangleShape';
import { SquareShape } from './SquareShape';
import { CircleShape } from './CircleShape';
import { AngleLine } from './AngleLine';
import { CurveLine } from './CurveLine';

interface ShapeRendererProps {
  object: DrawingObject;
  isSelected?: boolean;
  mode?: string | null; // Active drawing tool mode - if set, shapes should not intercept events
  onSelect?: (id: string) => void;
  onMove?: (id: string, dx: number, dy: number) => void;
  onResize?: (id: string, newPoints: Point[]) => void;
}

export const ShapeRenderer: React.FC<ShapeRendererProps> = ({ object, isSelected, mode, onSelect, onMove, onResize }) => {
  // Track if current drag is from left mouse button
  const [isDraggingWithLeftClick, setIsDraggingWithLeftClick] = React.useState(false);

  // Ensure drag only happens with left mouse button (button 0)
  const handleMouseDown = (e: any) => {
    // Only allow dragging with left mouse button (button 0)
    // Middle button (button 1) and right button (button 2) are reserved for canvas actions
    if (e.evt && e.evt.button === 0) {
      setIsDraggingWithLeftClick(true);
      // Auto-select if not already selected
      if (!isSelected && onSelect) {
        onSelect(object.id);
      }
    } else {
      setIsDraggingWithLeftClick(false);
    }
    e.cancelBubble = true;
  };

  // Ensure selection before allowing drag
  const handleDragStart = (e: any) => {
    e.cancelBubble = true;
    // Only allow drag if left mouse button started the drag
    if (!isDraggingWithLeftClick) {
      e.preventDefault?.();
      return;
    }
    // Auto-select if not already selected
    if (!isSelected && onSelect) {
      onSelect(object.id);
    }
  };

  const handleDragEnd = (e: any) => {
    setIsDraggingWithLeftClick(false);
    
    const node = e.target;
    const dx = node.x();
    const dy = node.y();
    
    // Debug logging
    console.debug(`Dragging shape ${object.id}: dx=${dx}, dy=${dy}`);
    
    if (dx === 0 && dy === 0) {
      // Reset position if no movement
      node.getLayer()?.batchDraw();
      return;
    }
    
    // Reset position to origin (shape position is already updated in canvas state)
    node.position({ x: 0, y: 0 });
    node.getLayer()?.batchDraw();
    
    // Notify parent of the move
    if (onMove) onMove(object.id, dx, dy);
  };

  const handleClick = (e: any) => {
    e.cancelBubble = true;
    // Only select on left click
    if (e.evt && e.evt.button === 0 && onSelect) {
      console.debug(`Selecting shape ${object.id}`);
      onSelect(object.id);
    }
  };

  // Handle resize: moves endpoint for lines, opposite corner for rectangles
  const makeHandleResizer = (cornerName: string) => (e: any) => {
    e.cancelBubble = true;
    const node = e.target;
    const newX = node.x();
    const newY = node.y();
    node.position({ x: 0, y: 0 });
    node.getLayer()?.batchDraw();

    if (!onResize || object.points.length < 2) return;

    let newPoints = [...object.points];
    const shapeType = object.type;

    // For lines (straightLine, orthoLine, angle): move endpoint
    if (shapeType === 'straightLine' || shapeType === 'orthoLine' || shapeType === 'angle') {
      newPoints[newPoints.length - 1] = { x: newX, y: newY };
    }
    // For circles: move radius edge
    else if (shapeType === 'circle' || shapeType === 'curve') {
      newPoints[newPoints.length - 1] = { x: newX, y: newY };
    }
    // For rectangles/squares: move opposite corner
    else if (shapeType === 'rectangle' || shapeType === 'square') {
      newPoints[newPoints.length - 1] = { x: newX, y: newY };
    }

    onResize(object.id, newPoints);
  };

  const renderShape = () => {
    switch (object.type) {
      case 'freeDraw':
        return <FreeDrawLine points={object.points} />;
      case 'straightLine':
        return <StraightLine points={object.points} />;
      case 'orthoLine':
        return <StraightLine points={object.points} isOrtho={true} />;
      case 'rectangle':
        return <RectangleShape points={object.points} />;
      case 'square':
        return <SquareShape points={object.points} />;
      case 'circle':
        return <CircleShape points={object.points} />;
      case 'angle':
        return (
          <AngleLine
            points={object.points}
            angleDegree={(object.properties as any)?.angleDegree}
            lineLength={(object.properties as any)?.lineLength}
          />
        );
      case 'curve':
        return <CurveLine points={object.points} />;
      default:
        return null;
    }
  };

  // Compute bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  object.points.forEach((p) => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });

  const width = isFinite(minX) ? Math.max(4, maxX - minX) : 0;
  const height = isFinite(minY) ? Math.max(4, maxY - minY) : 0;

  // Resize handle positions at corners
  const handles = isSelected && isFinite(minX) ? [
    { name: 'NW', x: minX, y: minY },
    { name: 'NE', x: maxX, y: minY },
    { name: 'SE', x: maxX, y: maxY },
    { name: 'SW', x: minX, y: maxY },
  ] : [];

  // Render shape-specific selection border
  const renderSelectionBorder = () => {
    if (!isSelected || !isFinite(minX)) return null;

    // For circle shapes, render a circular selection border
    if (object.type === 'circle') {
      const radius = width / 2; // Assume circle, width ~= diameter
      const centerX = minX + radius;
      const centerY = minY + radius;
      return (
        <Circle
          x={centerX}
          y={centerY}
          radius={radius + 6}
          stroke="#1e90ff"
          dash={[6, 4]}
          strokeWidth={1}
          listening={false}
        />
      );
    }

    // For all other shapes, render a rectangular selection border
    return (
      <Rect
        x={minX - 6}
        y={minY - 6}
        width={width + 12}
        height={height + 12}
        stroke="#1e90ff"
        dash={[6, 4]}
        strokeWidth={1}
        listening={false}
      />
    );
  };

  return (
    <Group
      name={object.id}
      draggable={!!isSelected && isDraggingWithLeftClick && !mode}
      onMouseDown={handleMouseDown}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
      listening={!mode}
      onMouseEnter={(e) => {
        const stage = e.target.getStage();
        if (stage && stage.container()) {
          stage.container().style.cursor = isSelected ? 'grabbing' : 'pointer';
        }
      }}
      onMouseLeave={(e) => {
        const stage = e.target.getStage();
        if (stage && stage.container()) {
          stage.container().style.cursor = 'default';
        }
      }}
    >
      {renderShape()}
      {isSelected && isFinite(minX) && (
        <>
          {renderSelectionBorder()}
          {/* Resize handles at corners */}
          {handles.map((handle) => (
            <Circle
              key={handle.name}
              x={handle.x}
              y={handle.y}
              radius={5}
              fill="#1e90ff"
              stroke="#ffffff"
              strokeWidth={1}
              draggable
              onDragEnd={makeHandleResizer(handle.name)}
              onMouseEnter={(e) => {
                e.target.getStage()!.container().style.cursor = 'pointer';
              }}
              onMouseLeave={(e) => {
                e.target.getStage()!.container().style.cursor = 'default';
              }}
            />
          ))}
        </>
      )}
    </Group>
  );
};
