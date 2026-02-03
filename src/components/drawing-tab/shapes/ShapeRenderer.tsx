import React from 'react';
import type { DrawingObject } from '../types';
import { FreeDrawLine } from './FreeDrawLine';
import { StraightLine } from './StraightLine';
import { RectangleShape } from './RectangleShape';
import { SquareShape } from './SquareShape';
import { CircleShape } from './CircleShape';
import { AngleLine } from './AngleLine';
import { CurveLine } from './CurveLine';

interface ShapeRendererProps {
  object: DrawingObject;
}

export const ShapeRenderer: React.FC<ShapeRendererProps> = ({ object }) => {
  switch (object.type) {
    case 'freeDraw':
      return <FreeDrawLine points={object.points} />;
    case 'straightLine':
      return <StraightLine points={object.points} />;
    case 'orthoLine':
      return <StraightLine points={object.points} />;
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
