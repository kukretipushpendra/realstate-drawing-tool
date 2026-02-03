import React, { useState } from 'react';
import './AngleInputDialog.css';

interface AngleInputDialogProps {
  isOpen: boolean;
  onDraw: (angleDegree: number, lineLength: number) => void;
  onCancel: () => void;
  position?: { x: number; y: number };
}

export const AngleInputDialog: React.FC<AngleInputDialogProps> = ({
  isOpen,
  onDraw,
  onCancel,
  position,
}) => {
  const [angleDegree, setAngleDegree] = useState<string>('45');
  const [lineLength, setLineLength] = useState<string>('100');
  const [error, setError] = useState<string>('');

  const handleDraw = () => {
    setError('');

    // Validation
    const angle = parseFloat(angleDegree);
    const length = parseFloat(lineLength);

    if (isNaN(angle)) {
      setError('Please enter a valid angle degree');
      return;
    }

    if (isNaN(length) || length <= 0) {
      setError('Please enter a valid line length (must be > 0)');
      return;
    }

    if (angle < -360 || angle > 360) {
      setError('Angle must be between -360 and 360 degrees');
      return;
    }

    onDraw(angle, length);
    // Reset form
    setAngleDegree('45');
    setLineLength('100');
  };

  const handleCancel = () => {
    setError('');
    setAngleDegree('45');
    setLineLength('100');
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
    <div className="angle-dialog-overlay">
      <div className="angle-dialog">
        <div className="angle-dialog-header">
          <h2>Draw Angle</h2>
          <button className="close-btn" onClick={handleCancel}>
            ×
          </button>
        </div>

        <div className="angle-dialog-content">
          {position && (
            <div className="position-info">
              Position: ({Math.round(position.x)}, {Math.round(position.y)})
            </div>
          )}

          <div className="form-group">
            <label htmlFor="angleDegree">
              Angle Degree <span className="required">*</span>
            </label>
            <input
              id="angleDegree"
              type="number"
              min="-360"
              max="360"
              step="1"
              value={angleDegree}
              onChange={(e) => setAngleDegree(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter angle in degrees"
              className="input-field"
              autoFocus
            />
            <span className="help-text">Range: -360 to 360 degrees</span>
          </div>

          <div className="form-group">
            <label htmlFor="lineLength">
              Line Length (Feet) <span className="required">*</span>
            </label>
            <input
              id="lineLength"
              type="number"
              min="0.1"
              step="0.1"
              value={lineLength}
              onChange={(e) => setLineLength(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter line length in feet"
              className="input-field"
            />
            <span className="help-text">Must be greater than 0</span>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="preview-info">
            <p>
              Preview: Drawing an angle of <strong>{angleDegree}°</strong> with{' '}
              <strong>{lineLength}ft</strong> line length
            </p>
          </div>
        </div>

        <div className="angle-dialog-footer">
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
