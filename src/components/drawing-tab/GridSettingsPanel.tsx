import React from 'react';
import type { GridSettings } from './useGridSettings';
import { feetToPixels } from './unitConversion';
import './GridSettingsPanel.css';

interface GridSettingsPanelProps {
  gridSettings: GridSettings;
  onGridSettingsChange: (updates: Partial<GridSettings>) => void;
}

export const GridSettingsPanel: React.FC<GridSettingsPanelProps> = ({
  gridSettings,
  onGridSettingsChange,
}) => {
  return (
    <div className="grid-settings-panel">
      <div className="grid-settings-header">
        <h3>Grid Settings</h3>
      </div>

      <div className="grid-settings-content">
        {/* Grid Enabled Toggle */}
        <div className="grid-setting-field">
          <label className="grid-checkbox-label">
            <input
              type="checkbox"
              checked={gridSettings.enabled}
              onChange={(e) => onGridSettingsChange({ enabled: e.target.checked })}
              className="grid-checkbox"
            />
            <span>Enable Grid</span>
          </label>
        </div>

        {gridSettings.enabled && (
          <>
            {/* Grid Visible Toggle */}
            <div className="grid-setting-field">
              <label className="grid-checkbox-label">
                <input
                  type="checkbox"
                  checked={gridSettings.visible}
                  onChange={(e) => onGridSettingsChange({ visible: e.target.checked })}
                  className="grid-checkbox"
                />
                <span>Show Grid</span>
              </label>
            </div>

            {/* Snap to Grid Toggle */}
            <div className="grid-setting-field">
              <label className="grid-checkbox-label">
                <input
                  type="checkbox"
                  checked={gridSettings.snapToGrid}
                  onChange={(e) => onGridSettingsChange({ snapToGrid: e.target.checked })}
                  className="grid-checkbox"
                />
                <span>Snap to Grid</span>
              </label>
            </div>

            {/* Grid Size */}
            <div className="grid-setting-field">
              <label htmlFor="gridSize" className="grid-setting-label">
                Grid Size (pixels)
              </label>
              <div className="grid-setting-input-group">
                <input
                  id="gridSize"
                  type="number"
                  min="5"
                  max="100"
                  step="5"
                  value={gridSettings.gridSize}
                  onChange={(e) => onGridSettingsChange({ gridSize: parseFloat(e.target.value) })}
                  className="grid-setting-input"
                />
                <span className="grid-setting-value">{gridSettings.gridSize}px</span>
              </div>
              <small className="grid-setting-hint">
                Current: {(gridSettings.gridSize / 5).toFixed(1)} feet
              </small>
            </div>

            {/* Snap Threshold */}
            <div className="grid-setting-field">
              <label htmlFor="snapThreshold" className="grid-setting-label">
                Snap Threshold (pixels)
              </label>
              <div className="grid-setting-input-group">
                <input
                  id="snapThreshold"
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={gridSettings.snapThreshold}
                  onChange={(e) =>
                    onGridSettingsChange({ snapThreshold: parseFloat(e.target.value) })
                  }
                  className="grid-setting-slider"
                />
                <span className="grid-setting-value">{gridSettings.snapThreshold}px</span>
              </div>
              <small className="grid-setting-hint">
                Distance to snap to nearest grid point
              </small>
            </div>

            {/* Snap Increment (feet) */}
            <div className="grid-setting-field">
              <label htmlFor="snapIncrementFeet" className="grid-setting-label">
                Snap Increment
              </label>
              <div className="grid-setting-input-group">
                <select
                  id="snapIncrementFeet"
                  value={gridSettings.snapIncrementFeet}
                  onChange={(e) =>
                    onGridSettingsChange({ snapIncrementFeet: parseFloat(e.target.value) })
                  }
                  className="grid-setting-select"
                >
                  <option value={0.25}>0.25 ft</option>
                  <option value={0.5}>0.5 ft</option>
                  <option value={1}>1 ft</option>
                  <option value={2}>2 ft</option>
                  <option value={5}>5 ft</option>
                </select>
                <span className="grid-setting-value">{gridSettings.snapIncrementFeet} ft</span>
              </div>
              <small className="grid-setting-hint">
                Snap interval in feet — {feetToPixels(gridSettings.snapIncrementFeet)} px
              </small>
            </div>

            {/* Grid Color */}
            <div className="grid-setting-field">
              <label htmlFor="gridColor" className="grid-setting-label">
                Grid Color
              </label>
              <div className="grid-color-input-group">
                <input
                  id="gridColor"
                  type="color"
                  value={gridSettings.gridColor}
                  onChange={(e) => onGridSettingsChange({ gridColor: e.target.value })}
                  className="grid-color-input"
                />
                <span className="grid-color-value">{gridSettings.gridColor}</span>
              </div>
            </div>

            {/* Reset to Defaults */}
            <div className="grid-setting-field">
              <button
                className="grid-reset-button"
                onClick={() =>
                  onGridSettingsChange({
                    gridSize: 20,
                    snapThreshold: 10,
                    gridColor: '#22c55e',
                    snapIncrementFeet: 0.5,
                  })
                }
              >
                Reset to Defaults
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
