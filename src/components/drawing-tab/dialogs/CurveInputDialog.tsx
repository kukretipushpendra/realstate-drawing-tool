import React, { useState } from 'react';
import './CurveInputDialog.css';

interface CurveInputDialogProps {
  isOpen: boolean;
  onDraw: (controlDistance: number, curveLength: number) => void;
  onCancel: () => void;
  position?: { x: number; y: number };
}

export const CurveInputDialog: React.FC<CurveInputDialogProps> = ({
  isOpen,
  onDraw,
  onCancel,
  position,
}) => {
  const [controlDistance, setControlDistance] = useState<string>('50');
  const [curveLength, setCurveLength] = useState<string>('30');
  const [error, setError] = useState<string>('');

  const handleDraw = () => {
    setError('');

    // Validation
    const control = parseFloat(controlDistance);
    const length = parseFloat(curveLength);

    if (isNaN(control) || control <= 0) {
      setError('Please enter a valid control distance (must be > 0)');
      return;
    }

    if (isNaN(length) || length <= 0) {
      setError('Please enter a valid curve length (must be > 0)');
      return;
    }

    onDraw(control, length);
    // Reset form
    setControlDistance('50');
    setCurveLength('30');
  };

  const handleCancel = () => {
    setError('');
    setControlDistance('50');
    setCurveLength('30');
    onCancel();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleDraw();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="curve-dialog-overlay">
      <div className="curve-dialog">
        <div className="curve-dialog-header">
          <h2>Draw Curve</h2>
          <button className="close-btn" onClick={handleCancel}>
            ×
          </button>
        </div>

        <div className="curve-dialog-content">
          {position && (
            <div className="position-info">
              Position: ({Math.round(position.x)}, {Math.round(position.y)})
            </div>
          )}

          <div className="form-group">
            <label htmlFor="controlDistance">
              Control Distance (Feet) <span className="required">*</span>
            </label>
            <input
              id="controlDistance"
              type="number"
              min="0.1"
              step="0.1"
              value={controlDistance}
              onChange={(e) => setControlDistance(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter control distance in feet"
              className="input-field"
              autoFocus
            />
            <span className="help-text">Controls curve bend (higher = more bend)</span>
          </div>

          <div className="form-group">
            <label htmlFor="curveLength">
              Curve Length (Feet) <span className="required">*</span>
            </label>
            <input
              id="curveLength"
              type="number"
              min="0.1"
              step="0.1"
              value={curveLength}
              onChange={(e) => setCurveLength(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter curve length in feet"
              className="input-field"
            />
            <span className="help-text">Horizontal distance of curve endpoint</span>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="preview-info">
            <p>
              Preview: Drawing a curve with <strong>{controlDistance}ft</strong> bend and{' '}
              <strong>{curveLength}ft</strong> length
            </p>
          </div>
        </div>

        <div className="curve-dialog-footer">
          <button
            className="btn btn-cancel"
            onClick={handleCancel}
            onKeyPress={handleKeyPress}
          >
            Cancel
          </button>
          <button
            className="btn btn-draw"
            onClick={handleDraw}
            onKeyPress={handleKeyPress}
          >
            Draw
          </button>
        </div>
      </div>
    </div>
  );
};
