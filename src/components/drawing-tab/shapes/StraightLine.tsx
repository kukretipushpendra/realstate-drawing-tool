import React from 'react';
import { Line, Text } from 'react-konva';
import type { Point } from '../types';
import { getDistance } from '../geometry';
import { pixelsToFeet } from '../unitConversion';

interface StraightLineProps {
  points: Point[];
  isOrtho?: boolean; // New prop to indicate orthogonal mode
}

export const StraightLine: React.FC<StraightLineProps> = ({ points, isOrtho }) => {
  if (points.length < 2) return null;

  let start = points[0];
  let end = points[points.length - 1];

  // Apply orthogonal constraint if needed
  if (isOrtho) {
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);

    if (dx > dy) {
      // Horizontal line - keep same Y
      end = { x: end.x, y: start.y };
    } else {
      // Vertical line - keep same X
      end = { x: start.x, y: end.y };
    }
  }

  const flattenedPoints = [start.x, start.y, end.x, end.y];
  const distancePixels = getDistance(start, end);
  const distanceFeet = pixelsToFeet(distancePixels);
  
  // Calculate midpoint for label
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;

  return (
    <>
      <Line
        points={flattenedPoints}
        stroke="#486180"
        strokeWidth={2}
        lineCap="round"
      />
      <Text
        x={midX - 20}
        y={midY - 15}
        text={`${distanceFeet.toFixed(0)}`}
        fontSize={12}
        fill="#486180"
        fontStyle="bold"
        background="white"
        padding={2}
      />
    </>
  );
};
