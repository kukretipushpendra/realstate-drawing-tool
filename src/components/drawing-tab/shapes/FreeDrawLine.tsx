import React from 'react';
import { Line, Text } from 'react-konva';
import type { Point } from '../types';
import { getDistance } from '../geometry';
import { pixelsToFeet } from '../unitConversion';

interface FreeDrawLineProps {
  points: Point[];
}

export const FreeDrawLine: React.FC<FreeDrawLineProps> = ({ points }) => {
  if (points.length < 2) return null;

  const flattenedPoints = points.flatMap((p) => [p.x, p.y]);
  
  // Calculate total path length
  let totalDistance = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalDistance += getDistance(points[i], points[i + 1]);
  }
  
  const totalDistanceFeet = pixelsToFeet(totalDistance);
  
  // Get first and last point for label positioning
  const startPoint = points[0];
  const endPoint = points[points.length - 1];
  const midX = (startPoint.x + endPoint.x) / 2;
  const midY = (startPoint.y + endPoint.y) / 2;

  return (
    <>
      <Line
        points={flattenedPoints}
        stroke="#486180"
        strokeWidth={2}
        lineCap="round"
        lineJoin="round"
        tension={0.5}
      />
      <Text
        x={midX - 25}
        y={midY - 15}
        text={`${totalDistanceFeet.toFixed(0)}`}
        fontSize={12}
        fill="#486180"
        fontStyle="bold"
        background="white"
        padding={2}
      />
    </>
  );
};
