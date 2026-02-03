import React from 'react';
import { Rect, Text } from 'react-konva';
import type { Point } from '../types';
import { getSquareBounds } from '../geometry';
import { pixelsToFeet } from '../unitConversion';

interface SquareShapeProps {
  points: Point[];
}

export const SquareShape: React.FC<SquareShapeProps> = ({ points }) => {
  if (points.length < 2) return null;

  const bounds = getSquareBounds(points[0], points[points.length - 1]);
  const sideLengthFeet = pixelsToFeet(bounds.size);

  return (
    <>
      <Rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.size}
        height={bounds.size}
        stroke="#486180"
        strokeWidth={2}
        fill="transparent"
      />
      {/* Side length label */}
      <Text
        x={bounds.x + bounds.size / 2 - 20}
        y={bounds.y - 20}
        text={`${sideLengthFeet.toFixed(0)}`}
        fontSize={11}
        fill="#486180"
        fontStyle="bold"
      />
    </>
  );
};
