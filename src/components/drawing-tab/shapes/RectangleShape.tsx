import React from 'react';
import { Rect, Text } from 'react-konva';
import type { Point } from '../types';
import { getRectangleBounds } from '../geometry';
import { pixelsToFeet } from '../unitConversion';

interface RectangleShapeProps {
  points: Point[];
}

export const RectangleShape: React.FC<RectangleShapeProps> = ({ points }) => {
  if (points.length < 2) return null;

  const bounds = getRectangleBounds(points[0], points[points.length - 1]);
  const widthFeet = pixelsToFeet(bounds.width);
  const heightFeet = pixelsToFeet(bounds.height);

  return (
    <>
      <Rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        stroke="#486180"
        strokeWidth={2}
        fill="transparent"
      />
      {/* Width label */}
      <Text
        x={bounds.x + bounds.width / 2 - 25}
        y={bounds.y - 20}
        text={`W: ${widthFeet.toFixed(0)}`}
        fontSize={11}
        fill="#486180"
        fontStyle="bold"
      />
      {/* Height label */}
      <Text
        x={bounds.x - 50}
        y={bounds.y + bounds.height / 2 - 8}
        text={`H: ${heightFeet.toFixed(0)}`}
        fontSize={11}
        fill="#486180"
        fontStyle="bold"
      />
    </>
  );
};
