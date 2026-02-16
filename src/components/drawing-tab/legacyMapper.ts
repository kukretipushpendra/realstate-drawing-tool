/**
 * LEGACY DATA MAPPER
 * Phase 8.5: Legacy Drawing Objects Compatibility
 * 
 * Maps between legacy .NET BuildingDrawing entities and modern React DrawingObjects.
 * Ensures all properties, calculations, and data types match perfectly.
 */

import {
  DrawingObject,
  DrawingObjectProperties,
  DrawingMode,
  LegacyBuildingDrawingData,
  Point,
  DrawingObjectWithMetrics,
} from './types';
import { DRAWING_CONSTANTS } from './technicalDebt';

// ============================================================================
// 1. LEGACY TYPE CONVERSIONS
// ============================================================================

export class LegacyDrawingTypeMapper {
  /**
   * Maps legacy DrawingType enum to modern DrawingMode
   */
  static toLegacyType(mode: DrawingMode): string {
    const mapping: Record<string, string> = {
      freeDraw: 'FreeHand',
      straightLine: 'Line',
      orthoLine: 'OrthoLine',
      square: 'Square',
      rectangle: 'Rectangle',
      angle: 'Angle',
      curve: 'Curve',
      circle: 'Circle',
    };
    return mapping[mode as string] || 'Unknown';
  }

  /**
   * Maps legacy DrawingType string to modern DrawingMode
   */
  static fromLegacyType(legacyType: string): DrawingMode {
    const mapping: Record<string, DrawingMode> = {
      FreeHand: 'freeDraw',
      Line: 'straightLine',
      StraightLine: 'straightLine',
      OrthoLine: 'orthoLine',
      Square: 'square',
      Rectangle: 'rectangle',
      Angle: 'angle',
      Curve: 'curve',
      Circle: 'circle',
    };
    return mapping[legacyType] || null;
  }

  /**
   * Maps legacy SweepDirection to normalized value
   */
  static normalizeSweepDirection(direction?: string): string {
    if (!direction) return 'counterclockwise';
    return direction.toLowerCase().includes('clock') ? 'clockwise' : 'counterclockwise';
  }
}

// ============================================================================
// 2. PRECISION CONVERSION (Feet/Tenth conversion)
// ============================================================================

export class PrecisionConverter {
  /**
   * Converts string foot value (stored with precision in legacy)
   * Legacy stores as string: "123.45" or "123 1/2" or "0.5"
   */
  static fromLegacyFeetString(value: string | number | undefined): number {
    if (value === undefined || value === null) return 0;
    
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;

    // Handle fraction notation: "123 1/2"
    if (value.includes(' ')) {
      const [whole, fraction] = value.split(' ');
      const wholeNum = parseFloat(whole) || 0;
      const [numerator, denominator] = fraction.split('/').map(n => parseFloat(n) || 0);
      return wholeNum + (denominator ? numerator / denominator : 0);
    }

    // Handle decimal notation: "123.45"
    return parseFloat(value) || 0;
  }

  /**
   * Converts modern number to legacy feet format (with optional fraction)
   */
  static toLegacyFeetString(value: number, useFraction: boolean = false): string {
    if (!useFraction) return value.toString();

    const whole = Math.floor(value);
    const decimal = value - whole;

    if (decimal === 0) return whole.toString();
    if (Math.abs(decimal - 0.5) < 0.01) return `${whole} 1/2`;
    if (Math.abs(decimal - 0.25) < 0.01) return `${whole} 1/4`;
    if (Math.abs(decimal - 0.75) < 0.01) return `${whole} 3/4`;

    return value.toString();
  }

  /**
   * Converts pixel coordinates to foot coordinates
   */
  static pixelsToFeet(pixels: number, pixelsPerFoot: number = DRAWING_CONSTANTS.PIXELS_PER_FOOT): number {
    return pixels / pixelsPerFoot;
  }

  /**
   * Converts foot coordinates to pixel coordinates
   */
  static feetToPixels(feet: number, pixelsPerFoot: number = DRAWING_CONSTANTS.PIXELS_PER_FOOT): number {
    return feet * pixelsPerFoot;
  }
}

// ============================================================================
// 3. LEGACY OBJECT CONVERSION
// ============================================================================

export class LegacyObjectConverter {
  /**
   * Converts legacy BuildingDrawing business object to modern DrawingObject
   */
  static fromLegacy(legacy: LegacyBuildingDrawingData, id?: string): DrawingObject {
    const points = this.extractPointsFromLegacy(legacy);
    const properties = this.extractPropertiesFromLegacy(legacy);

    return {
      id: id || `drawing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: LegacyDrawingTypeMapper.fromLegacyType(legacy.drawingType || ''),
      points,
      properties,
      timestamp: legacy.modifiedDate 
        ? new Date(legacy.modifiedDate).getTime() 
        : Date.now(),
      legacyData: legacy,
    };
  }

  /**
   * Converts modern DrawingObject to legacy BuildingDrawing format
   */
  static toLegacy(drawing: DrawingObject): LegacyBuildingDrawingData {
    return {
      buildingId: drawing.properties.buildingId,
      name: drawing.properties.name,
      tag: drawing.properties.tag,
      text: drawing.properties.text,
      groupName: drawing.properties.groupName,
      sequence: drawing.properties.sequence,

      // Position and size
      footX: this.pointToLegacyFeetString(drawing.points[0]?.x),
      footY: this.pointToLegacyFeetString(drawing.points[0]?.y),
      footWidth: this.dimensionToLegacyFeetString(drawing.properties.width),
      footHeight: this.dimensionToLegacyFeetString(drawing.properties.height),
      rotatedAngle: drawing.properties.angle || 0,

      // Styling
      penOrFontSize: drawing.properties.penOrFontSize,
      penOrFontColor: drawing.properties.penOrFontColor,

      // Drawing type
      drawingType: LegacyDrawingTypeMapper.toLegacyType(drawing.type),

      // Line properties
      lineFootX1: drawing.properties.lineFootX1,
      lineFootX2: drawing.properties.lineFootX2,
      lineFootY1: drawing.properties.lineFootY1,
      lineFootY2: drawing.properties.lineFootY2,

      // Arc properties
      arcRadius: drawing.properties.arcRadius,
      arcStartFootX: drawing.properties.arcStartFootX,
      arcStartFootY: drawing.properties.arcStartFootY,
      arcPointFootX: drawing.properties.arcPointFootX,
      arcPointFootY: drawing.properties.arcPointFootY,
      arcMouseEndFootX: drawing.properties.arcMouseEndFootX,
      arcMouseEndFootY: drawing.properties.arcMouseEndFootY,
      sweepDirection: drawing.properties.sweepDirection,
      isClosed: drawing.properties.isClosed || drawing.properties.closed,
      isCurveClosed: drawing.properties.isCurveClosed || drawing.properties.closed,

      // Adjustments
      drawingAdjustments: drawing.properties.drawingAdjustments,

      // Building context
      buildingPhysicalGood: drawing.properties.buildingPhysicalGood,
      buildingClass: drawing.properties.buildingClass,
      buildingSqft: drawing.properties.buildingSqft,
      buildingNewSqft: drawing.properties.buildingNewSqft,
      buildingTotalSqft: drawing.properties.buildingTotalSqft,
      buildingCalls: drawing.properties.buildingCalls,
      buildingNotes: drawing.properties.buildingNotes,
      buildingPage: drawing.properties.buildingPage,
      isDrawingByTenth: drawing.properties.isDrawingByTenth,

      // Audit
      modifiedBy: drawing.properties.modifiedBy,
      modifiedDate: drawing.properties.modifiedDate,
      version: drawing.properties.version,
      isActive: drawing.properties.isActive !== false,
    };
  }

  /**
   * Extracts points array from legacy drawing object
   */
  private static extractPointsFromLegacy(legacy: LegacyBuildingDrawingData): Point[] {
    const points: Point[] = [];

    // Base position point
    const x = PrecisionConverter.fromLegacyFeetString(legacy.footX);
    const y = PrecisionConverter.fromLegacyFeetString(legacy.footY);
    if (x !== undefined || y !== undefined) {
      points.push({ x: x || 0, y: y || 0 });
    }

    // Handle different drawing types
    if (legacy.drawingType === 'Line' || legacy.drawingType === 'StraightLine') {
      // Line endpoints
      if (legacy.lineFootX1 !== undefined && legacy.lineFootY1 !== undefined) {
        points.push({ x: legacy.lineFootX1, y: legacy.lineFootY1 });
      }
      if (legacy.lineFootX2 !== undefined && legacy.lineFootY2 !== undefined) {
        points.push({ x: legacy.lineFootX2, y: legacy.lineFootY2 });
      }
    } else if (legacy.drawingType === 'Circle' || legacy.drawingType === 'Curve') {
      // Arc control points
      if (legacy.arcStartFootX !== undefined && legacy.arcStartFootY !== undefined) {
        points.push({ x: legacy.arcStartFootX, y: legacy.arcStartFootY });
      }
      if (legacy.arcPointFootX !== undefined && legacy.arcPointFootY !== undefined) {
        points.push({ x: legacy.arcPointFootX, y: legacy.arcPointFootY });
      }
      if (legacy.arcMouseEndFootX !== undefined && legacy.arcMouseEndFootY !== undefined) {
        points.push({ x: legacy.arcMouseEndFootX, y: legacy.arcMouseEndFootY });
      }
    }

    return points.length > 0 ? points : [{ x: 0, y: 0 }];
  }

  /**
   * Extracts properties from legacy object
   */
  private static extractPropertiesFromLegacy(legacy: LegacyBuildingDrawingData): DrawingObjectProperties {
    return {
      // Metadata
      buildingId: legacy.buildingId,
      name: legacy.name,
      tag: legacy.tag,
      text: legacy.text,
      groupName: legacy.groupName,
      sequence: legacy.sequence,

      // Positioning
      footX: PrecisionConverter.fromLegacyFeetString(legacy.footX),
      footY: PrecisionConverter.fromLegacyFeetString(legacy.footY),
      width: PrecisionConverter.fromLegacyFeetString(legacy.footWidth),
      height: PrecisionConverter.fromLegacyFeetString(legacy.footHeight),
      angle: legacy.rotatedAngle || 0,

      // Styling
      penOrFontSize: legacy.penOrFontSize,
      penOrFontColor: legacy.penOrFontColor,

      // Arc/Curve
      radius: legacy.arcRadius,
      arcRadius: legacy.arcRadius,
      arcStartFootX: legacy.arcStartFootX,
      arcStartFootY: legacy.arcStartFootY,
      arcPointFootX: legacy.arcPointFootX,
      arcPointFootY: legacy.arcPointFootY,
      sweepDirection: LegacyDrawingTypeMapper.normalizeSweepDirection(legacy.sweepDirection),

      // Closure
      closed: legacy.isClosed || legacy.isCurveClosed,
      isClosed: legacy.isClosed,
      isCurveClosed: legacy.isCurveClosed,

      // Building context
      buildingPhysicalGood: legacy.buildingPhysicalGood,
      buildingClass: legacy.buildingClass,
      buildingSqft: legacy.buildingSqft,
      buildingNewSqft: legacy.buildingNewSqft,
      buildingTotalSqft: legacy.buildingTotalSqft,
      buildingCalls: legacy.buildingCalls,
      buildingNotes: legacy.buildingNotes,
      buildingPage: legacy.buildingPage,
      isDrawingByTenth: legacy.isDrawingByTenth || false,

      // Adjustments
      drawingAdjustments: legacy.drawingAdjustments,

      // Audit
      modifiedBy: legacy.modifiedBy,
      modifiedDate: legacy.modifiedDate,
      version: legacy.version || 1,
      isActive: legacy.isActive !== false,

      // Line properties (if applicable)
      lineFootX1: legacy.lineFootX1,
      lineFootX2: legacy.lineFootX2,
      lineFootY1: legacy.lineFootY1,
      lineFootY2: legacy.lineFootY2,
    };
  }

  private static pointToLegacyFeetString(value: number | undefined): string | number {
    if (value === undefined) return '';
    return PrecisionConverter.toLegacyFeetString(value);
  }

  private static dimensionToLegacyFeetString(value: number | undefined): string | number {
    if (value === undefined) return '';
    return PrecisionConverter.toLegacyFeetString(value);
  }
}

// ============================================================================
// 4. MEASUREMENT CALCULATIONS (matching legacy formulas)
// ============================================================================

export class LegacyMeasurementCalculator {
  /**
   * Calculate square footage from drawing coordinates (using shoelace formula)
   * Matches legacy OnGetBuildingArea calculation
   */
  static calculateSqft(points: Point[], pixelsPerFoot: number = DRAWING_CONSTANTS.PIXELS_PER_FOOT): number {
    if (points.length < 3) return 0;

    try {
      // Convert pixels to feet
      const feetPoints = points.map(p => ({
        x: PrecisionConverter.pixelsToFeet(p.x, pixelsPerFoot),
        y: PrecisionConverter.pixelsToFeet(p.y, pixelsPerFoot),
      }));

      // Shoelace formula for polygon area
      let area = 0;
      for (let i = 0; i < feetPoints.length; i++) {
        const current = feetPoints[i];
        const next = feetPoints[(i + 1) % feetPoints.length];
        area += current.x * next.y - next.x * current.y;
      }

      const sqft = Math.abs(area) / 2;
      return Math.round(sqft * 100) / 100; // Round to 2 decimals
    } catch (error) {
      console.error('Error calculating sqft:', error);
      return 0;
    }
  }

  /**
   * Calculate circle area from radius
   * Used in legacy GetCircleArea method
   */
  static calculateCircleArea(radiusFeet: number): number {
    if (radiusFeet <= 0) return 0;
    const area = Math.PI * radiusFeet * radiusFeet;
    return Math.round(area * 100) / 100;
  }

  /**
   * Calculate arc radius from three points (start, control, end)
   * Matches legacy circle calculation
   */
  static calculateArcRadius(startPoint: Point, controlPoint: Point, _endPoint: Point, pixelsPerFoot: number = DRAWING_CONSTANTS.PIXELS_PER_FOOT): number {
    try {
      // Convert to feet
      const s = {
        x: PrecisionConverter.pixelsToFeet(startPoint.x, pixelsPerFoot),
        y: PrecisionConverter.pixelsToFeet(startPoint.y, pixelsPerFoot),
      };
      const c = {
        x: PrecisionConverter.pixelsToFeet(controlPoint.x, pixelsPerFoot),
        y: PrecisionConverter.pixelsToFeet(controlPoint.y, pixelsPerFoot),
      };
      // const e = {
      //   x: PrecisionConverter.pixelsToFeet(endPoint.x, pixelsPerFoot),
      //   y: PrecisionConverter.pixelsToFeet(endPoint.y, pixelsPerFoot),
      // };

      // Distance from start to control point = radius
      const dx = c.x - s.x;
      const dy = c.y - s.y;
      const radius = Math.sqrt(dx * dx + dy * dy);

      return Math.round(radius * 100) / 100;
    } catch (error) {
      console.error('Error calculating arc radius:', error);
      return 0;
    }
  }

  /**
   * Calculate perimeter from points
   */
  static calculatePerimeter(points: Point[], pixelsPerFoot: number = DRAWING_CONSTANTS.PIXELS_PER_FOOT): number {
    if (points.length < 2) return 0;

    try {
      let perimeter = 0;
      for (let i = 0; i < points.length; i++) {
        const current = points[i];
        const next = points[(i + 1) % points.length];
        const dx = PrecisionConverter.pixelsToFeet(next.x - current.x, pixelsPerFoot);
        const dy = PrecisionConverter.pixelsToFeet(next.y - current.y, pixelsPerFoot);
        perimeter += Math.sqrt(dx * dx + dy * dy);
      }
      return Math.round(perimeter * 100) / 100;
    } catch (error) {
      console.error('Error calculating perimeter:', error);
      return 0;
    }
  }
}

// ============================================================================
// 5. BATCH OPERATIONS
// ============================================================================

export class LegacyBatchProcessor {
  /**
   * Convert multiple legacy objects to modern format
   */
  static fromLegacyBatch(legacyObjects: LegacyBuildingDrawingData[]): DrawingObject[] {
    return legacyObjects.map((obj, index) =>
      LegacyObjectConverter.fromLegacy(obj, `drawing-${index}`)
    );
  }

  /**
   * Convert multiple modern objects to legacy format
   */
  static toLegacyBatch(drawings: DrawingObject[]): LegacyBuildingDrawingData[] {
    return drawings.map(drawing => LegacyObjectConverter.toLegacy(drawing));
  }

  /**
   * Enrich drawings with calculated metrics
   */
  static enrichWithMetrics(drawing: DrawingObject): DrawingObjectWithMetrics {
    const metrics: DrawingObjectWithMetrics = drawing as DrawingObjectWithMetrics;

    try {
      const pixelsPerFoot = drawing.properties.isDrawingByTenth 
        ? DRAWING_CONSTANTS.PIXELS_PER_FOOT * 10 
        : DRAWING_CONSTANTS.PIXELS_PER_FOOT;

      metrics.calculatedSqft = LegacyMeasurementCalculator.calculateSqft(drawing.points, pixelsPerFoot);
      metrics.calculatedArea = metrics.calculatedSqft;
      metrics.calculatedPerimeter = LegacyMeasurementCalculator.calculatePerimeter(drawing.points, pixelsPerFoot);

      // Arc details if applicable
      if (drawing.properties.arcRadius || (drawing.points.length >= 3 && drawing.type === 'circle')) {
        metrics.arcDetails = {
          startPoint: drawing.points[0] || { x: 0, y: 0 },
          arcPoint: drawing.points[1] || { x: 0, y: 0 },
          endPoint: drawing.points[2] || { x: 0, y: 0 },
          radius: drawing.properties.arcRadius || 0,
          sweepDirection: drawing.properties.sweepDirection || 'counterclockwise',
        };
      }
    } catch (error) {
      console.error('Error enriching with metrics:', error);
    }

    return metrics;
  }
}
