import React from 'react';
import './KeyboardHelpModal.css';

interface KeyboardHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardHelpModal: React.FC<KeyboardHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="keyboard-help-overlay" onClick={onClose}>
      <div className="keyboard-help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="keyboard-help-header">
          <h2>Keyboard Shortcuts</h2>
          <button
            className="close-button"
            onClick={onClose}
            title="Close help (Esc)"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="keyboard-help-content">
          <div className="shortcut-section">
            <h3>Canvas Navigation</h3>
            <div className="shortcut-list">
              <div className="shortcut-item">
                <kbd>+</kbd> or <kbd>Ctrl</kbd> + <kbd>↑</kbd>
                <span>Zoom In</span>
              </div>
              <div className="shortcut-item">
                <kbd>-</kbd> or <kbd>Ctrl</kbd> + <kbd>↓</kbd>
                <span>Zoom Out</span>
              </div>
              <div className="shortcut-item">
                <kbd>Mouse Wheel</kbd>
                <span>Zoom In/Out</span>
              </div>
              <div className="shortcut-item">
                <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd>
                <span>Pan Canvas</span>
              </div>
              <div className="shortcut-item">
                <kbd>Middle Click</kbd> + Drag
                <span>Pan Canvas</span>
              </div>
              <div className="shortcut-item">
                <kbd>0</kbd>
                <span>Center View on Origin (0,0)</span>
              </div>
              <div className="shortcut-item">
                <kbd>C</kbd>
                <span>Clear Canvas (with confirmation)</span>
              </div>
            </div>
          </div>

          <div className="shortcut-section">
            <h3>Editing</h3>
            <div className="shortcut-list">
              <div className="shortcut-item">
                <kbd>Ctrl</kbd> + <kbd>Z</kbd>
                <span>Undo Last Action</span>
              </div>
              <div className="shortcut-item">
                <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd>
                <span>Redo Last Action</span>
              </div>
              <div className="shortcut-item">
                <kbd>Delete</kbd>
                <span>Delete Selected Shape</span>
              </div>
              <div className="shortcut-item">
                <kbd>Esc</kbd>
                <span>Cancel Current Drawing / Deselect</span>
              </div>
              <div className="shortcut-item">
                <kbd>Right Click</kbd> (while drawing)
                <span>Finish Drawing</span>
              </div>
            </div>
          </div>

          <div className="shortcut-section">
            <h3>Tools (Click toolbar buttons)</h3>
            <div className="shortcut-list">
              <div className="shortcut-item">
                <span>Drawing Tools</span>
                <span>Click to draw shapes on canvas</span>
              </div>
              <div className="shortcut-item">
                <span>✏️ Free Draw • 📏 Line • ⊞ Ortho</span>
                <span>Basic drawing tools</span>
              </div>
              <div className="shortcut-item">
                <span>▭ Rectangle • ◻️ Square • ○ Circle</span>
                <span>Geometric shape tools</span>
              </div>
              <div className="shortcut-item">
                <span>∠ Angle • ↪️ Curve</span>
                <span>Specialized tools with dialogs</span>
              </div>
              <div className="shortcut-item">
                <span>Navigation Tools</span>
                <span>View and canvas control</span>
              </div>
              <div className="shortcut-item">
                <span>⊕ Center View • ⊡ Zoom to Fit</span>
                <span>Viewport navigation</span>
              </div>
            </div>
          </div>

          <div className="shortcut-section">
            <h3>UI & Display</h3>
            <div className="shortcut-list">
              <div className="shortcut-item">
                <span>💾 Save</span>
                <span>Save drawing to JSON file</span>
              </div>
              <div className="shortcut-item">
                <span>↶ Undo</span>
                <span>Undo last action</span>
              </div>
              <div className="shortcut-item">
                <span>🗑️ Clear</span>
                <span>Clear entire canvas with confirmation</span>
              </div>
              <div className="shortcut-item">
                <kbd>?</kbd> <span>Help</span>
                <span>Show this keyboard shortcuts modal</span>
              </div>
              <div className="shortcut-item">
                <span>🏢 Add Building</span>
                <span>Add a new building to the parcel</span>
              </div>
            </div>
          </div>

          <div className="shortcut-section tips">
            <h3>💡 Shape Selection & Editing</h3>
            <ul>
              <li><strong>Click on any shape</strong> on the canvas to select it</li>
              <li>Selected shapes show a <strong>blue dotted border</strong> with resize handles</li>
              <li>Resize handles appear at corners - <strong>drag to resize</strong> the shape</li>
              <li>Edit shape properties in the <strong>Properties Panel</strong> on the right sidebar</li>
              <li>Press <strong>Delete</strong> to remove the selected shape</li>
              <li>Press <strong>Escape</strong> to deselect and cancel drawing</li>
              <li>Table shows all shapes - click row to select it on canvas</li>
              <li><strong>Zoom in</strong> for precise selection of overlapping shapes</li>
            </ul>
          </div>
        </div>

        <div className="keyboard-help-footer">
          <small>Press <kbd>Esc</kbd> or click outside to close</small>
        </div>
      </div>
    </div>
  );
};
