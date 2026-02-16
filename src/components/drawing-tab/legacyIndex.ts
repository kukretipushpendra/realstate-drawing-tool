/**
 * LEGACY DRAWING OBJECTS COMPATIBILITY INDEX
 * Phase 8.5: Complete Legacy Data Integration
 * 
 * This module provides full compatibility between modern React/Konva DrawingObjects
 * and legacy .NET BuildingDrawing entities, ensuring:
 * 
 * 1. Data type compatibility (string foot values, precision conversion)
 * 2. Property mapping (all legacy properties preserved)
 * 3. Calculation compatibility (sqft, perimeter, arc details)
 * 4. Building context (class, physical good, sqft, notes, page)
 * 5. Serialization (JSON, XML, CSV export/import)
 * 6. Import/export workflows (batch operations, validation)
 */

// ============================================================================
// TYPES
// ============================================================================

export type {
  DrawingMode,
  Point,
  DrawingObject,
  DrawingObjectProperties,
  DrawingObjectWithMetrics,
  LegacyBuildingDrawingData,
  CanvasState,
} from './types';

// ============================================================================
// LEGACY MAPPER (Type conversions, precision, conversions)
// ============================================================================

export {
  LegacyDrawingTypeMapper,
  PrecisionConverter,
  LegacyObjectConverter,
  LegacyMeasurementCalculator,
  LegacyBatchProcessor,
} from './legacyMapper';

// ============================================================================
// LEGACY SERIALIZER (Import/Export formats)
// ============================================================================

export {
  DrawingJSONSerializer,
  DrawingXMLSerializer,
  DrawingCSVSerializer,
} from './legacySerializer';

// ============================================================================
// BUILDING CONTEXT (Building-drawing relationships)
// ============================================================================

export type {
  BuildingDrawingContext,
  DrawingAdjustment,
  SqftReconciliation,
} from './buildingContext';

export {
  BuildingContextManager,
  DrawingAdjustmentManager,
  SqftReconciliationManager,
  BuildingPropertyManager,
} from './buildingContext';

// ============================================================================
// TECHNICAL UTILITIES (Constants, helpers, validators)
// ============================================================================

export {
  DRAWING_CONSTANTS,
  DrawingError,
  safeDistance,
  getPointSafe,
  DrawingLogger,
  PerformanceTracker,
  validatePointsForMode,
} from './technicalDebt';

// ============================================================================
// USAGE EXAMPLES & PATTERNS
// ============================================================================

/**
 * EXAMPLE 1: Convert legacy BuildingDrawing to modern DrawingObject
 * 
 * const legacyDrawing = {
 *   buildingId: '123',
 *   name: 'Drawing 1',
 *   drawingType: 'Rectangle',
 *   footX: '10.5',
 *   footY: '20',
 *   footWidth: '50',
 *   footHeight: '30',
 *   arcRadius: undefined,
 * };
 * 
 * const modernDrawing = LegacyObjectConverter.fromLegacy(legacyDrawing);
 * console.log(modernDrawing); // DrawingObject with converted properties
 */

/**
 * EXAMPLE 2: Calculate sqft from drawing points
 * 
 * const points = [
 *   { x: 0, y: 0 },
 *   { x: 100, y: 0 },
 *   { x: 100, y: 100 },
 *   { x: 0, y: 100 }
 * ];
 * 
 * const sqft = LegacyMeasurementCalculator.calculateSqft(points);
 * console.log(sqft); // 400 (in feet squared)
 */

/**
 * EXAMPLE 3: Serialize drawings to JSON for API
 * 
 * const drawings = [...]; // DrawingObject[]
 * const json = DrawingJSONSerializer.serializeArray(drawings);
 * // Send json to legacy API
 * 
 * // Later, import:
 * const importedDrawings = DrawingJSONSerializer.deserializeArray(json);
 */

/**
 * EXAMPLE 4: Export to CSV for reports
 * 
 * const csv = DrawingCSVSerializer.serialize(drawings);
 * // Download or print csv
 */

/**
 * EXAMPLE 5: Manage building-drawing context
 * 
 * const context = BuildingContextManager.createContext('BLDG-001', 1, drawings);
 * const calculated = BuildingContextManager.calculateTotalSqft(drawings);
 * 
 * const reconciliation = SqftReconciliationManager.reconcile(
 *   legacySqft,
 *   calculated
 * );
 * 
 * console.log(reconciliation.recommendation);
 */

/**
 * EXAMPLE 6: Batch import legacy drawings
 * 
 * const legacyArray = [
 *   { buildingId: '1', name: 'A', drawingType: 'Rectangle', ... },
 *   { buildingId: '2', name: 'B', drawingType: 'Circle', ... },
 * ];
 * 
 * const modernDrawings = LegacyBatchProcessor.fromLegacyBatch(legacyArray);
 * // Use modernDrawings in React components
 */

/**
 * EXAMPLE 7: Validate sqft reconciliation
 * 
 * const legacy = 1000;
 * const calculated = 1010;
 * 
 * const result = BuildingContextManager.validateSqft(calculated, legacy, 0.05);
 * if (!result.valid) {
 *   console.warn(`Sqft mismatch: ${result.percentDifference * 100}% difference`);
 * }
 */

/**
 * EXAMPLE 8: Import XML from legacy system
 * 
 * const legacyXML = `
 *   <BuildingDrawing Id="123" BuildingId="B1" FootX="10.5" ... />
 * `;
 * 
 * const drawing = DrawingXMLSerializer.deserialize(legacyXML);
 * // drawing is now a modern DrawingObject
 */

/**
 * EXAMPLE 9: Parse and apply drawing adjustments
 * 
 * const legacy = {
 *   drawingAdjustments: 'Offset: +0.5, Scale: 1.1, Rotation: 45'
 * };
 * 
 * const adjustments = DrawingAdjustmentManager.parseAdjustments(
 *   legacy.drawingAdjustments
 * );
 * 
 * const adjusted = DrawingAdjustmentManager.applyAdjustments(
 *   drawing.points,
 *   adjustments
 * );
 */

// ============================================================================
// MIGRATION CHECKLIST
// ============================================================================

/**
 * LEGACY TO MODERN MIGRATION STEPS:
 * 
 * ✓ 1. Extended DrawingObject types with legacy properties
 * ✓ 2. Created type mappers for DrawingType conversion
 * ✓ 3. Implemented precision converters (feet/function/fraction notation)
 * ✓ 4. Built object converters (legacy ↔ modern)
 * ✓ 5. Implemented measurement calculations (sqft, perimeter, arc)
 * ✓ 6. Created batch processors
 * ✓ 7. Added JSON serialization
 * ✓ 8. Added XML serialization (for database)
 * ✓ 9. Added CSV export (for reports)
 * ✓ 10. Created building context management
 * ✓ 11. Added drawing adjustments handling
 * ✓ 12. Created sqft reconciliation
 * ✓ 13. Building class & physical good management
 * 
 * TODO:
 * - [ ] Update useDrawingCanvas hook to support legacy data import
 * - [ ] Add validation/audit logging
 * - [ ] Create migration tests (fixtures from actual legacy data)
 * - [ ] Update UI components to display legacy metadata
 * - [ ] Create legacy data import dialog
 * - [ ] Add reconciliation reporting
 */

// ============================================================================
// DATA QUALITY GUIDELINES
// ============================================================================

/**
 * IMPORTANT: Data type conversions and validations
 * 
 * FOOT VALUES (Legacy stores as strings with precision):
 * - Legacy: "123.45" or "123 1/2"
 * - Modern: 123.45 (number)
 * - Use PrecisionConverter.fromLegacyFeetString() to parse
 * - Use PrecisionConverter.toLegacyFeetString() to format for storage
 * 
 * PIXELS vs FEET:
 * - Modern coordinate system uses pixels (for screen rendering)
 * - Legacy coordinate system uses feet (for real-world measurements)
 * - Use DRAWING_CONSTANTS.PIXELS_PER_FOOT for conversion
 * - For tenth-based drawings: PIXELS_PER_FOOT * 10
 * 
 * DRAWING TYPES:
 * - Legacy: "Rectangle", "Line", "Circle", "Curve", etc. (title case)
 * - Modern: "rectangle", "straightLine", "circle", "curve", etc. (camelCase)
 * - Use LegacyDrawingTypeMapper for safe conversion
 * 
 * SQFT CALCULATIONS:
 * - Always use LegacyMeasurementCalculator for consistency
 * - Tolerance: 5% by default (configurable)
 * - Reconcile with legacy sqft if available
 * - Log discrepancies for audit
 * 
 * SWEEP DIRECTION:
 * - Legacy: "Clockwise", "CounterClockwise"
 * - Modern: "clockwise", "counterclockwise"
 * - Normalized via LegacyDrawingTypeMapper
 */
