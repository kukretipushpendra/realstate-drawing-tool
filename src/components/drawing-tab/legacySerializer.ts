/**
 * LEGACY DATA SERIALIZER
 * Phase 8.5: Import/Export Legacy Drawing Data
 * 
 * Serializes and deserializes drawing objects to/from JSON and XML formats
 * compatible with legacy .NET BuildingDrawing storage format.
 */

import { DrawingObject, LegacyBuildingDrawingData, CanvasState } from './types';
import {
  LegacyObjectConverter,
  LegacyBatchProcessor,
} from './legacyMapper';

// ============================================================================
// 1. JSON SERIALIZATION (for API/storage)
// ============================================================================

export class DrawingJSONSerializer {
  /**
   * Serialize DrawingObject to JSON with legacy compatibility
   */
  static serialize(drawing: DrawingObject): string {
    const legacyData = LegacyObjectConverter.toLegacy(drawing);
    return JSON.stringify(legacyData, this.replacer, 2);
  }

  /**
   * Serialize array of drawings
   */
  static serializeArray(drawings: DrawingObject[]): string {
    const legacyArray = LegacyBatchProcessor.toLegacyBatch(drawings);
    return JSON.stringify(legacyArray, this.replacer, 2);
  }

  /**
   * Serialize full canvas state
   */
  static serializeCanvasState(state: CanvasState): string {
    const representation = {
      buildingId: state.buildingId,
      buildingContext: state.buildingContext,
      objects: LegacyBatchProcessor.toLegacyBatch(state.objects),
      currentObject: state.currentObject
        ? LegacyObjectConverter.toLegacy(state.currentObject as DrawingObject)
        : null,
      selectedId: state.selectedId,
      timestamp: Date.now(),
    };
    return JSON.stringify(representation, this.replacer, 2);
  }

  /**
   * Deserialize JSON to DrawingObject
   */
  static deserialize(json: string): DrawingObject {
    try {
      const data = JSON.parse(json) as LegacyBuildingDrawingData;
      return LegacyObjectConverter.fromLegacy(data);
    } catch (error) {
      console.error('JSON deserialization failed:', error);
      throw new Error(`Failed to deserialize drawing: ${error}`);
    }
  }

  /**
   * Deserialize array of drawings
   */
  static deserializeArray(json: string): DrawingObject[] {
    try {
      const array = JSON.parse(json) as LegacyBuildingDrawingData[];
      return LegacyBatchProcessor.fromLegacyBatch(array);
    } catch (error) {
      console.error('JSON array deserialization failed:', error);
      throw new Error(`Failed to deserialize drawings: ${error}`);
    }
  }

  /**
   * Deserialize canvas state
   */
  static deserializeCanvasState(json: string): CanvasState {
    try {
      const data = JSON.parse(json);
      const objects = LegacyBatchProcessor.fromLegacyBatch(data.objects || []);
      
      return {
        objects,
        currentObject: data.currentObject
          ? LegacyObjectConverter.fromLegacy(data.currentObject)
          : null,
        selectedId: data.selectedId || null,
        buildingId: data.buildingId,
        buildingContext: data.buildingContext,
      };
    } catch (error) {
      console.error('Canvas state deserialization failed:', error);
      throw new Error(`Failed to deserialize canvas state: ${error}`);
    }
  }

  private static replacer = (_key: string, value: any) => {
    // Handle Date serialization
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  };
}

// ============================================================================
// 2. XML SERIALIZATION (for legacy database compatibility)
// ============================================================================

export class DrawingXMLSerializer {
  /**
   * Serialize DrawingObject to XML format matching legacy database schema
   */
  static serialize(drawing: DrawingObject): string {
    const legacy = LegacyObjectConverter.toLegacy(drawing);
    return this.toXmlElement(legacy, drawing.id);
  }

  /**
   * Serialize array to XML collection
   */
  static serializeArray(drawings: DrawingObject[]): string {
    const xmlElements = drawings.map(d => {
      const legacy = LegacyObjectConverter.toLegacy(d);
      return this.toXmlElement(legacy, d.id);
    });

    return `<?xml version="1.0" encoding="utf-8"?>
<BuildingDrawings>
${xmlElements.map(xml => this.indent(xml, 2)).join('\n')}
</BuildingDrawings>`;
  }

  /**
   * Deserialize XML to DrawingObject
   */
  static deserialize(xml: string): DrawingObject {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      
      if (doc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('XML parsing error');
      }

      const elem = doc.documentElement;
      const legacy = this.fromXmlElement(elem);
      return LegacyObjectConverter.fromLegacy(legacy, elem.getAttribute('Id') || undefined);
    } catch (error) {
      console.error('XML deserialization failed:', error);
      throw new Error(`Failed to deserialize XML: ${error}`);
    }
  }

  /**
   * Deserialize XML array
   */
  static deserializeArray(xml: string): DrawingObject[] {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      
      if (doc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('XML parsing error');
      }

      const drawings: DrawingObject[] = [];
      const elements = doc.getElementsByTagName('BuildingDrawing');
      
      for (let i = 0; i < elements.length; i++) {
        const elem = elements[i] as Element;
        const legacy = this.fromXmlElement(elem);
        drawings.push(LegacyObjectConverter.fromLegacy(legacy, elem.getAttribute('Id') || undefined));
      }

      return drawings;
    } catch (error) {
      console.error('XML array deserialization failed:', error);
      throw new Error(`Failed to deserialize XML array: ${error}`);
    }
  }

  private static toXmlElement(legacy: LegacyBuildingDrawingData, id: string): string {
    const attrs = [
      `Id="${this.escapeXml(id)}"`,
      legacy.buildingId && `BuildingId="${this.escapeXml(legacy.buildingId)}"`,
      legacy.name && `Name="${this.escapeXml(legacy.name)}"`,
      legacy.tag && `Tag="${this.escapeXml(legacy.tag)}"`,
      legacy.text && `Text="${this.escapeXml(legacy.text)}"`,
      legacy.groupName && `GroupName="${this.escapeXml(legacy.groupName)}"`,
      legacy.sequence && `Sequence="${legacy.sequence}"`,
      legacy.footX && `FootX="${legacy.footX}"`,
      legacy.footY && `FootY="${legacy.footY}"`,
      legacy.footWidth && `FootWidth="${legacy.footWidth}"`,
      legacy.footHeight && `FootHeight="${legacy.footHeight}"`,
      legacy.rotatedAngle && `RotatedAngle="${legacy.rotatedAngle}"`,
      legacy.penOrFontSize && `PenOrFontSize="${legacy.penOrFontSize}"`,
      legacy.penOrFontColor && `PenOrFontColor="${this.escapeXml(legacy.penOrFontColor)}"`,
      legacy.lineFootX1 && `LineFootX1="${legacy.lineFootX1}"`,
      legacy.lineFootX2 && `LineFootX2="${legacy.lineFootX2}"`,
      legacy.lineFootY1 && `LineFootY1="${legacy.lineFootY1}"`,
      legacy.lineFootY2 && `LineFootY2="${legacy.lineFootY2}"`,
      legacy.arcRadius && `ArcRadius="${legacy.arcRadius}"`,
      legacy.arcStartFootX && `ArcStartFootX="${legacy.arcStartFootX}"`,
      legacy.arcStartFootY && `ArcStartFootY="${legacy.arcStartFootY}"`,
      legacy.arcPointFootX && `ArcPointFootX="${legacy.arcPointFootX}"`,
      legacy.arcPointFootY && `ArcPointFootY="${legacy.arcPointFootY}"`,
      legacy.sweepDirection && `SweepDirection="${this.escapeXml(legacy.sweepDirection)}"`,
      `IsClosed="${legacy.isClosed || false}"`,
      `IsCurveClosed="${legacy.isCurveClosed || false}"`,
      legacy.modifiedBy && `ModifiedBy="${this.escapeXml(legacy.modifiedBy)}"`,
      legacy.modifiedDate && `ModifiedDate="${this.escapeXml(legacy.modifiedDate.toString())}"`,
      legacy.version && `Version="${legacy.version}"`,
      `IsActive="${legacy.isActive !== false}"`,
    ]
      .filter(Boolean)
      .join(' ');

    return `<BuildingDrawing ${attrs}>${legacy.drawingAdjustments ? `<DrawingAdjustments>${this.escapeXml(legacy.drawingAdjustments)}</DrawingAdjustments>` : ''}</BuildingDrawing>`;
  }

  private static fromXmlElement(elem: Element): LegacyBuildingDrawingData {
    return {
      buildingId: elem.getAttribute('BuildingId') || undefined,
      name: elem.getAttribute('Name') || undefined,
      tag: elem.getAttribute('Tag') || undefined,
      text: elem.getAttribute('Text') || undefined,
      groupName: elem.getAttribute('GroupName') || undefined,
      sequence: elem.getAttribute('Sequence') ? parseInt(elem.getAttribute('Sequence')!) : undefined,

      footX: elem.getAttribute('FootX') || undefined,
      footY: elem.getAttribute('FootY') || undefined,
      footWidth: elem.getAttribute('FootWidth') || undefined,
      footHeight: elem.getAttribute('FootHeight') || undefined,
      rotatedAngle: elem.getAttribute('RotatedAngle') ? parseFloat(elem.getAttribute('RotatedAngle')!) : undefined,

      penOrFontSize: elem.getAttribute('PenOrFontSize') ? parseFloat(elem.getAttribute('PenOrFontSize')!) : undefined,
      penOrFontColor: elem.getAttribute('PenOrFontColor') || undefined,

      drawingType: elem.getAttribute('DrawingType') || undefined,

      lineFootX1: elem.getAttribute('LineFootX1') ? parseFloat(elem.getAttribute('LineFootX1')!) : undefined,
      lineFootX2: elem.getAttribute('LineFootX2') ? parseFloat(elem.getAttribute('LineFootX2')!) : undefined,
      lineFootY1: elem.getAttribute('LineFootY1') ? parseFloat(elem.getAttribute('LineFootY1')!) : undefined,
      lineFootY2: elem.getAttribute('LineFootY2') ? parseFloat(elem.getAttribute('LineFootY2')!) : undefined,

      arcRadius: elem.getAttribute('ArcRadius') ? parseFloat(elem.getAttribute('ArcRadius')!) : undefined,
      arcStartFootX: elem.getAttribute('ArcStartFootX') ? parseFloat(elem.getAttribute('ArcStartFootX')!) : undefined,
      arcStartFootY: elem.getAttribute('ArcStartFootY') ? parseFloat(elem.getAttribute('ArcStartFootY')!) : undefined,
      arcPointFootX: elem.getAttribute('ArcPointFootX') ? parseFloat(elem.getAttribute('ArcPointFootX')!) : undefined,
      arcPointFootY: elem.getAttribute('ArcPointFootY') ? parseFloat(elem.getAttribute('ArcPointFootY')!) : undefined,
      sweepDirection: elem.getAttribute('SweepDirection') || undefined,
      isClosed: elem.getAttribute('IsClosed') === 'true',
      isCurveClosed: elem.getAttribute('IsCurveClosed') === 'true',

      drawingAdjustments: elem.textContent || undefined,

      modifiedBy: elem.getAttribute('ModifiedBy') || undefined,
      modifiedDate: elem.getAttribute('ModifiedDate') ? new Date(elem.getAttribute('ModifiedDate')!) : undefined,
      version: elem.getAttribute('Version') ? parseInt(elem.getAttribute('Version')!) : undefined,
      isActive: elem.getAttribute('IsActive') !== 'false',
    };
  }

  private static escapeXml(str: string | Date): string {
    if (str instanceof Date) {
      str = str.toISOString();
    }
    return String(str).replace(/[<>&'"]/g, c => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case "'": return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  private static indent(str: string, spaces: number): string {
    const indent = ' '.repeat(spaces);
    return str.split('\n').map(line => indent + line).join('\n');
  }
}

// ============================================================================
// 3. CSV EXPORT (for reports and bulk operations)
// ============================================================================

export class DrawingCSVSerializer {
  /**
   * Export drawings to CSV format
   */
  static serialize(drawings: DrawingObject[]): string {
    const headers = [
      'ID',
      'Building ID',
      'Name',
      'Tag',
      'Type',
      'Foot X',
      'Foot Y',
      'Foot Width',
      'Foot Height',
      'Rotated Angle',
      'Arc Radius',
      'Arc Start X',
      'Arc Start Y',
      'Arc Point X',
      'Arc Point Y',
      'Sweep Direction',
      'Is Closed',
      'Pen/Font Size',
      'Pen/Font Color',
      'Building Sqft',
      'Calculated Sqft',
      'Modified Date',
      'Modified By',
    ];

    const rows = drawings.map(drawing => {
      const legacy = LegacyObjectConverter.toLegacy(drawing);
      return [
        drawing.id,
        legacy.buildingId || '',
        legacy.name || '',
        legacy.tag || '',
        legacy.drawingType || '',
        legacy.footX || '',
        legacy.footY || '',
        legacy.footWidth || '',
        legacy.footHeight || '',
        legacy.rotatedAngle || '',
        legacy.arcRadius || '',
        legacy.arcStartFootX || '',
        legacy.arcStartFootY || '',
        legacy.arcPointFootX || '',
        legacy.arcPointFootY || '',
        legacy.sweepDirection || '',
        legacy.isClosed ? 'Yes' : 'No',
        legacy.penOrFontSize || '',
        legacy.penOrFontColor || '',
        legacy.buildingSqft || '',
        drawing.properties.calculatedSqft || '',
        legacy.modifiedDate || '',
        legacy.modifiedBy || '',
      ].map(v => this.escapeCSV(v));
    });

    return [
      headers.map(h => this.escapeCSV(h)).join(','),
      ...rows.map(r => r.join(',')),
    ].join('\n');
  }

  private static escapeCSV(value: any): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}
