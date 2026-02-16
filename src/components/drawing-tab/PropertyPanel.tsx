import React, { useState, useEffect } from 'react';
import type { DrawingObject } from './types';
import { pixelsToFeet } from './unitConversion';
import type { GridSettings } from './useGridSettings';
import { GridSettingsPanel } from './GridSettingsPanel';
import './PropertyPanel.css';

interface PropertyPanelProps {
  selectedObject: DrawingObject | null;
  onPropertyChange: (properties: Record<string, any>) => void;
  gridSettings?: GridSettings;
  onGridSettingsChange?: (updates: Partial<GridSettings>) => void;
  // Max height in pixels to constrain the panel (matches canvas height)
  maxHeight?: number;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  selectedObject,
  onPropertyChange,
  gridSettings,
  onGridSettingsChange,
  maxHeight,
}) => {
  const [properties, setProperties] = useState<Record<string, any>>({});

  useEffect(() => {
    if (selectedObject) {
      setProperties(selectedObject.properties || {});
    }
  }, [selectedObject]);

  const handlePropertyChange = (key: string, value: any) => {
    const updated = { ...properties, [key]: value };
    setProperties(updated);
    onPropertyChange(updated);
  };

  const rootStyle: React.CSSProperties | undefined = maxHeight ? { maxHeight: `${maxHeight}px`, overflowY: 'auto' } : undefined;

  if (!selectedObject) {
    return (
      <div className="property-panel" style={rootStyle}>
        {gridSettings && onGridSettingsChange && (
          <div className="property-panel-grid-settings">
            <GridSettingsPanel
              gridSettings={gridSettings}
              onGridSettingsChange={onGridSettingsChange}
            />
          </div>
        )}
        <div className="property-panel-empty">
          <p>No shape selected</p>
          <p className="hint">Select a shape from the canvas or table to view/edit properties</p>
        </div>
        </div>
      );
    }

  const shapeType = selectedObject.type;

  return (
    <div className="property-panel" style={rootStyle}>
      <div className="property-panel-header">
        <h3>Shape Properties</h3>
        <span className="shape-type-badge">{shapeType}</span>
      </div>

      <div className="property-panel-content">
        {/* Common Properties */}
        <div className="property-section">
          <h4>Common</h4>
          <div className="property-field">
            <label>ID</label>
            <input
              type="text"
              value={selectedObject.id}
              disabled
              className="property-input disabled"
            />
          </div>
          <div className="property-field">
            <label>Points</label>
            <input
              type="text"
              value={selectedObject.points.length}
              disabled
              className="property-input disabled"
            />
          </div>
          {selectedObject.points && selectedObject.points.length > 0 && (
            <div className="property-field">
              <label>Coordinates (first point)</label>
              <input
                type="text"
                value={`${(pixelsToFeet(selectedObject.points[0].x)).toFixed(2)} ft, ${(-pixelsToFeet(selectedObject.points[0].y)).toFixed(2)} ft  —  ${selectedObject.points[0].x.toFixed(1)} px, ${selectedObject.points[0].y.toFixed(1)} px`}
                disabled
                className="property-input disabled"
                title="World coordinates: feet (x,y) and pixels (x,y)"
              />
            </div>
          )}
        </div>

        {/* Angle Shape Properties */}
        {shapeType === 'angle' && (
          <div className="property-section">
            <h4>Angle Properties</h4>
            <div className="property-field">
              <label>Angle (auto-calculated, degrees)</label>
              <input
                type="number"
                value={properties.angleDegree?.toFixed(1) || 0}
                onChange={(e) => handlePropertyChange('angleDegree', parseFloat(e.target.value))}
                className="property-input"
                step="0.5"
                title="Auto-calculated from points (editable)"
              />
            </div>
            <div className="property-field">
              <label>Line Length (auto-calculated)</label>
              <input
                type="number"
                value={properties.lineLength?.toFixed(2) || properties.length?.toFixed(2) || 100}
                onChange={(e) => handlePropertyChange('lineLength', parseFloat(e.target.value))}
                className="property-input"
                step="0.5"
                title="Auto-calculated from points (editable)"
              />
            </div>
          </div>
        )}

        {/* Circle/Arc Properties */}
        {(shapeType === 'circle' || shapeType === 'curve') && (
          <div className="property-section">
            <h4>Circle Properties</h4>
            <div className="property-field">
              <label>Radius (auto-calculated)</label>
              <input
                type="number"
                value={properties.radius?.toFixed(2) || 0}
                onChange={(e) => handlePropertyChange('radius', parseFloat(e.target.value))}
                className="property-input"
                step="0.5"
                title="Auto-calculated from center and edge points (editable)"
              />
            </div>
            {shapeType === 'curve' && (
              <div className="property-field">
                <label>Arc Angle (degrees)</label>
                <input
                  type="number"
                  value={properties.arcAngle || 0}
                  onChange={(e) => handlePropertyChange('arcAngle', parseFloat(e.target.value))}
                  className="property-input"
                  step="0.5"
                />
              </div>
            )}
          </div>
        )}

        {/* Rectangle/Square Properties */}
        {(shapeType === 'rectangle' || shapeType === 'square') && (
          <div className="property-section">
            <h4>Dimension Properties</h4>
            <div className="property-field">
              <label>Width (auto-calculated)</label>
              <input
                type="number"
                value={properties.width?.toFixed(2) || 0}
                onChange={(e) => handlePropertyChange('width', parseFloat(e.target.value))}
                className="property-input"
                step="0.5"
                title="Auto-calculated from corner points (editable)"
              />
            </div>
            <div className="property-field">
              <label>Height (auto-calculated)</label>
              <input
                type="number"
                value={properties.height?.toFixed(2) || 0}
                onChange={(e) => handlePropertyChange('height', parseFloat(e.target.value))}
                className="property-input"
                step="0.5"
                title="Auto-calculated from corner points (editable)"
              />
            </div>
          </div>
        )}

        {/* Line Properties */}
        {(shapeType === 'straightLine' || shapeType === 'orthoLine' || shapeType === 'freeDraw') && (
          <div className="property-section">
            <h4>Line Properties</h4>
            <div className="property-field">
              <label>Angle (auto-calculated, degrees)</label>
              <input
                type="number"
                value={properties.angleDegree?.toFixed(1) || 0}
                onChange={(e) => handlePropertyChange('angleDegree', parseFloat(e.target.value))}
                className="property-input"
                step="0.5"
                title="Auto-calculated from points (editable)"
              />
            </div>
            <div className="property-field">
              <label>Length (auto-calculated)</label>
              <input
                type="number"
                value={properties.length?.toFixed(2) || 0}
                onChange={(e) => handlePropertyChange('length', parseFloat(e.target.value))}
                className="property-input"
                step="0.5"
                title="Auto-calculated from points (editable)"
              />
            </div>
          </div>
        )}

        {/* Appearance Properties */}
        <div className="property-section">
          <h4>Appearance</h4>
          <div className="property-field">
            <label>Stroke Color</label>
            <div className="color-input-group">
              <input
                type="color"
                value={properties.strokeColor || '#000000'}
                onChange={(e) => handlePropertyChange('strokeColor', e.target.value)}
                className="color-input"
              />
              <span className="color-value">{properties.strokeColor || '#000000'}</span>
            </div>
          </div>
          <div className="property-field">
            <label>Stroke Width</label>
            <input
              type="number"
              value={properties.strokeWidth || 2}
              onChange={(e) => handlePropertyChange('strokeWidth', parseFloat(e.target.value))}
              className="property-input"
              min="0.5"
              max="20"
              step="0.5"
            />
          </div>
          <div className="property-field">
            <label>Fill Color</label>
            <div className="color-input-group">
              <input
                type="color"
                value={properties.fillColor || '#ffffff'}
                onChange={(e) => handlePropertyChange('fillColor', e.target.value)}
                className="color-input"
              />
              <span className="color-value">{properties.fillColor || '#ffffff'}</span>
            </div>
          </div>
          <div className="property-field">
            <label>Fill Opacity</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={properties.fillOpacity || 0}
              onChange={(e) => handlePropertyChange('fillOpacity', parseFloat(e.target.value))}
              className="property-slider"
            />
            <span className="opacity-value">{Math.round((properties.fillOpacity || 0) * 100)}%</span>
          </div>
        </div>

        {/* User Notes */}
        <div className="property-section">
          <h4>Notes</h4>
          <textarea
            value={properties.notes || ''}
            onChange={(e) => handlePropertyChange('notes', e.target.value)}
            className="property-textarea"
            placeholder="Add notes for this shape..."
            rows={3}
          />
        </div>
      </div>
    </div>
  );
};
