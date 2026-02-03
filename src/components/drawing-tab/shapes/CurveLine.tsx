import React from 'react';
import { Line, Text } from 'react-konva';
import type { Point } from '../types';
import { getDistance } from '../geometry';
import { pixelsToFeet } from '../unitConversion';

interface CurveLineProps {
  points: Point[];
}

export const CurveLine: React.FC<CurveLineProps> = ({ points }) => {
  if (points.length < 2) return null;

  const p1 = points[0];
  const p2 = points[1];
  
  // Create a curved path using quadratic bezier
  const baselineDistance = getDistance(p1, p2);
  const baselineFeet = pixelsToFeet(baselineDistance);
  
  // If there's a third point, use it as control point for the curve
  let controlX = (p1.x + p2.x) / 2;
  let controlY = (p1.y + p2.y) / 2;
  
  if (points.length >= 3) {
    // Use the third point to determine curve control point
    const p3 = points[2];
    // Control point is offset perpendicular to the baseline
    controlX = (p1.x + p2.x) / 2 + (p3.x - (p1.x + p2.x) / 2) * 0.5;
    controlY = (p1.y + p2.y) / 2 + (p3.y - (p1.y + p2.y) / 2);
  } else {
    // During dragging, create an upward curve
    controlY = Math.min(p1.y, p2.y) - Math.abs(p2.x - p1.x) * 0.3;
  }
  
  const steps = Math.ceil(baselineDistance / 5);
  const curvePoints: Point[] = [];
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.pow(1 - t, 2) * p1.x + 2 * (1 - t) * t * controlX + Math.pow(t, 2) * p2.x;
    const y = Math.pow(1 - t, 2) * p1.y + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * p2.y;
    curvePoints.push({ x, y });
  }
  
  // Ensure the last point is exactly at p2 to eliminate gaps
  if (curvePoints.length > 0) {
    curvePoints[curvePoints.length - 1] = { x: p2.x, y: p2.y };
  }

  const flattenedPoints = curvePoints.flatMap((p) => [p.x, p.y]);
  
  // Calculate midpoint for label
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;

  return (
    <>
      {/* Baseline (straight line) */}
      <Line
        points={[p1.x, p1.y, p2.x, p2.y]}
        stroke="#999"
        strokeWidth={1}
        dash={[3, 3]}
        opacity={0.5}
      />
      
      {/* Curve */}
      <Line
        points={flattenedPoints}
        stroke="#e91e63"
        strokeWidth={2.5}
        lineCap="round"
        lineJoin="round"
      />
      
      {/* Distance label */}
      <Text
        x={midX - 20}
        y={midY - 15}
        text={`${baselineFeet.toFixed(0)}`}
        fontSize={12}
        fill="#e91e63"
        fontStyle="bold"
        background="white"
        padding={2}
      />
    </>
  );
};
