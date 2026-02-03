import React from 'react';
import { Circle, Text } from 'react-konva';
import type { Point } from '../types';
import { getDistance } from '../geometry';
import { pixelsToFeet } from '../unitConversion';

interface CircleShapeProps {
  points: Point[];
}

export const CircleShape: React.FC<CircleShapeProps> = ({ points }) => {
  if (points.length < 2) return null;

  const center = points[0];
  const radiusPixels = getDistance(center, points[points.length - 1]);
  const radiusFeet = pixelsToFeet(radiusPixels);
  const diameterFeet = radiusFeet * 2;

  return (
    <>
      <Circle
        x={center.x}
        y={center.y}
        radius={radiusPixels}
        stroke="#486180"
        strokeWidth={2}
        fill="transparent"
      />
      {/* Radius label */}
      <Text
        x={center.x - 20}
        y={center.y - radiusPixels / 2 - 15}
        text={`R: ${radiusFeet.toFixed(0)}`}
        fontSize={11}
        fill="#486180"
        fontStyle="bold"
      />
      {/* Diameter label */}
      <Text
        x={center.x - 30}
        y={center.y + 5}
        text={`D: ${diameterFeet.toFixed(0)}`}
        fontSize={11}
        fill="#486180"
        fontStyle="bold"
      />
    </>
  );
};
