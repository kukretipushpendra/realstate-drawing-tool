import React from 'react';
import { Line, Text } from 'react-konva';
import type { Point } from '../types';
import { getDistance } from '../geometry';
import { pixelsToFeet } from '../unitConversion';

interface StraightLineProps {
  points: Point[];
}

export const StraightLine: React.FC<StraightLineProps> = ({ points }) => {
  if (points.length < 2) return null;

  const start = points[0];
  const end = points[points.length - 1];
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
