/**
 * DRAWING & BUILDING CONTEXT
 * Phase 8.5: Building-Drawing Relationships
 * 
 * Manages the relationship between buildings and their drawing objects,
 * including sqft calculations, adjustments, class, physical good, and notes.
 */

import { DrawingObject, DrawingObjectWithMetrics, CanvasState } from './types';
import { LegacyMeasurementCalculator } from './legacyMapper';
import { DRAWING_CONSTANTS } from './technicalDebt';

// ============================================================================
// 1. BUILDING DRAWING CONTEXT
// ============================================================================

export interface BuildingDrawingContext {
  buildingId: string;
  buildingSequence: number;
  categoryCode?: string;
  class?: string;
  physicalGood?: number; // Percentage: 0-100
  sqft?: number; // Current sqft
  newSqft?: number; // New/future sqft
  totalSqft?: number; // Total calculated
  calls?: string; // Drawing calls/notes
  notes?: string; // Building notes
  page?: number; // Page number for multi-page drawings
  permitYear?: number;
  permitAmount?: number;
  yearBuilt?: number;
  effectiveYear?: number;
  isDrawingByTenth?: boolean;
  isHomesite?: boolean;
  isNew?: boolean;
  
  // Calculated metrics
  calculatedTotalSqft?: number;
  drawingArea?: number;
  perimeter?: number;
}

export class BuildingContextManager {
  /**
   * Create a building context from drawing objects
   */
  static createContext(
    buildingId: string,
    buildingSequence: number,
    drawings: DrawingObject[]
  ): BuildingDrawingContext {
    const context: BuildingDrawingContext = {
      buildingId,
      buildingSequence,
    };

    // Extract building properties from first drawing if available
    if (drawings.length > 0) {
      const firstDrawing = drawings[0];
      const props = firstDrawing.properties;

      context.categoryCode = props.buildingClass;
      context.class = props.buildingClass;
      context.physicalGood = props.buildingPhysicalGood;
      context.sqft = props.buildingSqft;
      context.newSqft = props.buildingNewSqft;
      context.totalSqft = props.buildingTotalSqft;
      context.calls = props.buildingCalls;
      context.notes = props.buildingNotes;
      context.page = props.buildingPage;
      context.isDrawingByTenth = props.isDrawingByTenth;
    }

    // Calculate totals
    context.calculatedTotalSqft = this.calculateTotalSqft(drawings, context.isDrawingByTenth);
    context.drawingArea = context.calculatedTotalSqft;

    return context;
  }

  /**
   * Apply building context to canvas state
   */
  static applyContextToCanvasState(state: CanvasState, context: BuildingDrawingContext): CanvasState {
    return {
      ...state,
      buildingId: context.buildingId,
      buildingContext: {
        sqft: context.sqft,
        newSqft: context.newSqft,
        totalSqft: context.totalSqft,
        physicalGood: context.physicalGood,
        calls: context.calls,
        notes: context.notes,
        class: context.class,
        page: context.page,
      },
    };
  }

  /**
   * Calculate total sqft from all drawing objects
   * Combines multiple drawing areas (handles composite drawings)
   */
  static calculateTotalSqft(drawings: DrawingObject[], isDrawingByTenth: boolean = false): number {
    try {
      const pixelsPerFoot = isDrawingByTenth
        ? DRAWING_CONSTANTS.PIXELS_PER_FOOT * 10
        : DRAWING_CONSTANTS.PIXELS_PER_FOOT;

      let totalSqft = 0;

      for (const drawing of drawings) {
        // Skip labels and non-area drawings
        if (drawing.type === null || drawing.properties.text) continue;

        const sqft = this.getDrawingSqft(drawing, pixelsPerFoot);
        if (sqft > 0) {
          totalSqft += sqft;
        }
      }

      return Math.round(totalSqft * 100) / 100;
    } catch (error) {
      console.error('Error calculating total sqft:', error);
      return 0;
    }
  }

  /**
   * Get sqft for a single drawing object
   */
  static getDrawingSqft(drawing: DrawingObject, pixelsPerFoot: number = DRAWING_CONSTANTS.PIXELS_PER_FOOT): number {
    try {
      // Check if already calculated
      const metricsDrawing = drawing as DrawingObjectWithMetrics;
      if (metricsDrawing.calculatedSqft) {
        return metricsDrawing.calculatedSqft;
      }

      // Polygon-based calculation
      if (drawing.points && drawing.points.length >= 3) {
        return LegacyMeasurementCalculator.calculateSqft(drawing.points, pixelsPerFoot);
      }

      // Circle-based calculation
      if (drawing.type === 'circle' && drawing.properties.arcRadius) {
        const radiusFeet = drawing.properties.arcRadius;
        return LegacyMeasurementCalculator.calculateCircleArea(radiusFeet);
      }

      // Rectangle calculation
      if ((drawing.type === 'rectangle' || drawing.type === 'square') && drawing.properties.width && drawing.properties.height) {
        return drawing.properties.width * drawing.properties.height;
      }

      return 0;
    } catch (error) {
      console.error('Error getting drawing sqft:', error);
      return 0;
    }
  }

  /**
   * Validate sqft calculations against expected values
   */
  static validateSqft(
    calculatedSqft: number,
    expectedLegacySqft?: number,
    tolerance: number = 0.05 // 5% tolerance
  ): { valid: boolean; difference: number; percentDifference: number } {
    if (!expectedLegacySqft) {
      return {
        valid: true,
        difference: 0,
        percentDifference: 0,
      };
    }

    const difference = Math.abs(calculatedSqft - expectedLegacySqft);
    const percentDifference = difference / expectedLegacySqft;

    return {
      valid: percentDifference <= tolerance,
      difference,
      percentDifference,
    };
  }

  /**
   * Update building context with new drawing measurements
   */
  static updateContextWithDrawings(
    context: BuildingDrawingContext,
    drawings: DrawingObject[]
  ): BuildingDrawingContext {
    const updated = { ...context };

    updated.calculatedTotalSqft = this.calculateTotalSqft(drawings, context.isDrawingByTenth);
    updated.drawingArea = updated.calculatedTotalSqft;

    // Calculate perimeter if drawings available
    if (drawings.length > 0 && drawings[0].points) {
      updated.perimeter = LegacyMeasurementCalculator.calculatePerimeter(
        drawings[0].points,
        context.isDrawingByTenth ? DRAWING_CONSTANTS.PIXELS_PER_FOOT * 10 : DRAWING_CONSTANTS.PIXELS_PER_FOOT
      );
    }

    return updated;
  }
}

// ============================================================================
// 2. DRAWING ADJUSTMENTS & MEASUREMENTS
// ============================================================================

export interface DrawingAdjustment {
  type: 'offset' | 'scale' | 'rotation' | 'skew' | 'custom';
  value: number;
  description?: string;
}

export class DrawingAdjustmentManager {
  /**
   * Parse drawing adjustments from legacy string format
   * Legacy format: "Offset: +0.5, Scale: 1.1, Rotation: 45"
   */
  static parseAdjustments(adjustmentString?: string): DrawingAdjustment[] {
    if (!adjustmentString) return [];

    const adjustments: DrawingAdjustment[] = [];
    const parts = adjustmentString.split(',');

    for (const part of parts) {
      const trimmed = part.trim();
      const match = trimmed.match(/^(\w+):\s*([+-]?\d+\.?\d*)/);
      
      if (match) {
        const type = match[1].toLowerCase() as DrawingAdjustment['type'];
        const value = parseFloat(match[2]);
        
        if (['offset', 'scale', 'rotation', 'skew'].includes(type)) {
          adjustments.push({
            type: type as DrawingAdjustment['type'],
            value,
            description: trimmed,
          });
        }
      }
    }

    return adjustments;
  }

  /**
   * Apply adjustments to drawing points
   */
  static applyAdjustments(
    points: Array<{ x: number; y: number }>,
    adjustments: DrawingAdjustment[]
  ): Array<{ x: number; y: number }> {
    if (adjustments.length === 0) return points;

    let adjusted = [...points];

    for (const adjustment of adjustments) {
      switch (adjustment.type) {
        case 'offset':
          adjusted = adjusted.map(p => ({
            x: p.x + adjustment.value,
            y: p.y + adjustment.value,
          }));
          break;

        case 'scale':
          adjusted = adjusted.map(p => ({
            x: p.x * adjustment.value,
            y: p.y * adjustment.value,
          }));
          break;

        case 'rotation':
          const angleRad = (adjustment.value * Math.PI) / 180;
          adjusted = adjusted.map(p => ({
            x: p.x * Math.cos(angleRad) - p.y * Math.sin(angleRad),
            y: p.x * Math.sin(angleRad) + p.y * Math.cos(angleRad),
          }));
          break;

        case 'skew':
          adjusted = adjusted.map(p => ({
            x: p.x + p.y * Math.tan((adjustment.value * Math.PI) / 180),
            y: p.y,
          }));
          break;
      }
    }

    return adjusted;
  }

  /**
   * Serialize adjustments to legacy string format
   */
  static serializeAdjustments(adjustments: DrawingAdjustment[]): string {
    return adjustments.map(a => `${a.type}: ${a.value}`).join(', ');
  }
}

// ============================================================================
// 3. SQFT VALIDATION & RECONCILIATION
// ============================================================================

export interface SqftReconciliation {
  legacySqft: number;
  calculatedSqft: number;
  difference: number;
  percentDifference: number;
  isValid: boolean;
  adjustmentNeeded: number;
  recommendation: string;
}

export class SqftReconciliationManager {
  /**
   * Reconcile legacy sqft with calculated sqft
   */
  static reconcile(
    legacySqft: number,
    calculatedSqft: number,
    tolerance: number = 0.05
  ): SqftReconciliation {
    const difference = calculatedSqft - legacySqft;
    const percentDifference = Math.abs(difference) / legacySqft;
    const isValid = percentDifference <= tolerance;

    let recommendation = '';
    if (isValid) {
      recommendation = 'Drawings match legacy sqft within tolerance.';
    } else if (percentDifference < 0.1) {
      recommendation = 'Minor discrepancy (< 10%). Drawings likely accurate.';
    } else if (percentDifference < 0.2) {
      recommendation = 'Moderate discrepancy (10-20%). Review drawing adjustments.';
    } else {
      recommendation = 'Major discrepancy (> 20%). Drawing may need revision.';
    }

    return {
      legacySqft,
      calculatedSqft,
      difference,
      percentDifference,
      isValid,
      adjustmentNeeded: difference,
      recommendation,
    };
  }

  /**
   * Generate resolution report
   */
  static generateResolutionReport(reconciliation: SqftReconciliation): string {
    return `
SQFT Reconciliation Report
==========================

Legacy System SQFT:       ${reconciliation.legacySqft.toFixed(2)} sq ft
Calculated SQFT:         ${reconciliation.calculatedSqft.toFixed(2)} sq ft
Difference:              ${reconciliation.difference > 0 ? '+' : ''}${reconciliation.difference.toFixed(2)} sq ft
Percent Difference:      ${(reconciliation.percentDifference * 100).toFixed(2)}%

Status:                  ${reconciliation.isValid ? '✓ VALID' : '✗ REQUIRES ATTENTION'}
Recommendation:          ${reconciliation.recommendation}

If adjustment needed:    ${reconciliation.adjustmentNeeded > 0 ? '+' : ''}${reconciliation.adjustmentNeeded.toFixed(2)} sq ft
`;
  }
}

// ============================================================================
// 4. BUILDING CLASS & PHYSICAL GOOD MANAGEMENT
// ============================================================================

export class BuildingPropertyManager {
  /**
   * Standard building classes (typical real estate classifications)
   */
  static readonly BUILDING_CLASSES = [
    'Residential',
    'Commercial',
    'Industrial',
    'Agricultural',
    'Utility',
    'Exempt',
    'Other',
  ];

  /**
   * Physical good condition percentages (0-100%)
   */
  static readonly PHYSICAL_GOOD_RANGES = {
    'Like New': 95,
    'Excellent': 90,
    'Good': 80,
    'Average': 70,
    'Fair': 60,
    'Poor': 40,
    'Very Poor': 20,
    'Salvage': 5,
  };

  /**
   * Update physical good value
   */
  static updatePhysicalGood(
    context: BuildingDrawingContext,
    condition: keyof typeof BuildingPropertyManager.PHYSICAL_GOOD_RANGES
  ): BuildingDrawingContext {
    const updated = { ...context };
    updated.physicalGood = this.PHYSICAL_GOOD_RANGES[condition];
    return updated;
  }

  /**
   * Validate building class
   */
  static isValidClass(classCode?: string): boolean {
    if (!classCode) return true;
    return this.BUILDING_CLASSES.some(c => c.toLowerCase() === classCode.toLowerCase());
  }

  /**
   * Get condition description from physical good percentage
   */
  static getConditionDescription(percentGood?: number): string {
    if (!percentGood) return 'Unknown';

    for (const [condition, threshold] of Object.entries(this.PHYSICAL_GOOD_RANGES)) {
      if (percentGood >= threshold) return condition;
    }

    return 'Salvage';
  }
}
