import React from 'react';
import { Line, Text } from 'react-konva';
import type { Point } from '../types';
import { pixelsToFeet } from '../unitConversion';

interface AngleLineProps {
  points: Point[];
  angleDegree?: number;
  lineLength?: number;
}

export const AngleLine: React.FC<AngleLineProps> = ({ points, angleDegree = 45, lineLength = 100 }) => {
  if (points.length < 1) return null;

  const vertex = points[0];
  const lineLengthFeet = pixelsToFeet(lineLength);

  // Convert degrees to radians and negate to fix reverse order
  const angleRad = (-(angleDegree * Math.PI) / 180);

  // Calculate endpoint for the angled line only
  const p3 = {
    x: vertex.x + lineLength * Math.cos(angleRad),
    y: vertex.y + lineLength * Math.sin(angleRad),
  };

  // Calculate arc center and radius for angle arc
  const arcRadius = 30;

  // Generate arc points for visual angle indicator
  const arcPoints: Point[] = [];
  const startAngle = 0;
  const endAngle = angleRad;
  const steps = Math.abs(Math.round(angleRad * 180 / Math.PI / 2)) || 1;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const currentAngle = startAngle + (endAngle - startAngle) * t;
    arcPoints.push({
      x: vertex.x + arcRadius * Math.cos(currentAngle),
      y: vertex.y + arcRadius * Math.sin(currentAngle),
    });
  }

  const arcFlattened = arcPoints.flatMap((p) => [p.x, p.y]);

  // Calculate angle label position
  const labelAngle = angleRad / 2;
  const labelDist = arcRadius + 15;
  const labelX = vertex.x + labelDist * Math.cos(labelAngle);
  const labelY = vertex.y + labelDist * Math.sin(labelAngle);

  return (
    <>
      {/* Angled line only */}
      <Line
        points={[vertex.x, vertex.y, p3.x, p3.y]}
        stroke="#3a4d66"
        strokeWidth={2.5}
        lineCap="round"
      />

      {/* Arc indicator */}
      {arcFlattened.length > 0 && (
        <Line
          points={arcFlattened}
          stroke="#486180"
          strokeWidth={1.5}
          lineCap="round"
          opacity={0.7}
        />
      )}

      {/* Angle label */}
      <Text
        x={labelX - 15}
        y={labelY - 10}
        text={`${angleDegree}°`}
        fontSize={12}
        fill="#486180"
        fontStyle="bold"
      />

      {/* Length label */}
      <Text
        x={p3.x / 2 + vertex.x / 2 - 15}
        y={p3.y / 2 + vertex.y / 2 - 15}
        text={`${lineLengthFeet.toFixed(0)}`}
        fontSize={10}
        fill="#666"
      />
    </>
  );
};
